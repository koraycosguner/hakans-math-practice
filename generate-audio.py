#!/usr/bin/env python3
"""
Generate audio clips for Hakan's Math Practice using edge-tts.

Usage:
    pip install edge-tts
    python3 generate-audio.py

Output:
    audio/<slug>.mp3 for each phrase
    audio/manifest.json mapping normalized text -> filename

The runtime clip player (audio.js) loads the manifest and plays clips
in place of Web Speech API for the spoken text it covers.
"""

import asyncio
import json
import os
import re

try:
    import edge_tts
except ImportError:
    print("Missing dependency. Run:  pip install edge-tts")
    raise SystemExit(1)


# Pick the voice here. en-US-GuyNeural is a warm, kid-friendly male voice.
# Alternatives:
#   en-US-AriaNeural  (warm female)
#   en-US-DavisNeural (calmer male)
#   en-US-JennyNeural (very friendly female)
#   en-GB-RyanNeural  (British male)
VOICE = "en-US-GuyNeural"
RATE  = "-10%"   # slightly slower for first-grader pacing
PITCH = "+0Hz"

OUT_DIR = "audio"


# ---------- helpers ----------

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s-]+", "-", s).strip("-")
    return s[:60] or "untitled"


def normalize(text: str) -> str:
    """Match how audio.js will normalize incoming speak() text."""
    s = text.lower()
    # Strip emoji ranges (Python re uses \uXXXX, not \u{XXXX})
    s = re.sub(r"[\U0001F000-\U0001FFFF]|[☀-➿]", "", s)
    s = re.sub(r"[−–—]", "minus", s)
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    # Convert standalone integers 0-99 to word form (matches JS audio.js).
    def _w(m):
        n = int(m.group(1))
        return number_to_words(n) if 0 <= n < 100 else m.group(1)
    s = re.sub(r"\b(\d{1,2})\b", _w, s)
    return s


# ---------- phrase list ----------

NUMBER_WORDS = {
    0: "zero",  1: "one",  2: "two",  3: "three",  4: "four",  5: "five",
    6: "six",   7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
    15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen",
    20: "twenty", 30: "thirty", 40: "forty", 50: "fifty",
    60: "sixty",  70: "seventy", 80: "eighty", 90: "ninety",
}

def number_to_words(n: int) -> str:
    if n in NUMBER_WORDS:
        return NUMBER_WORDS[n]
    if 20 <= n < 100:
        return f"{NUMBER_WORDS[(n // 10) * 10]} {NUMBER_WORDS[n % 10]}"
    return str(n)


# (lookup_key, spoken_text, file_slug)
PHRASES: list[tuple[str, str, str]] = []


# Numbers 0-99 — register both digit form ("5") AND word form ("five") as
# manifest keys for the same MP3, so digit-source text and word-source text
# both find the right clip.
for n in range(0, 100):
    word = number_to_words(n)
    PHRASES.append((str(n), word, f"num-{n:02d}"))   # digit key
    if word != str(n):
        PHRASES.append((word, word, f"num-{n:02d}")) # word-form key (alias)


# Operator and structural words
OPERATORS = [
    ("plus",       "plus"),
    ("minus",      "minus"),
    ("equals",     "equals"),
    ("is",         "is"),
    ("and",        "and"),
    ("makes",      "makes"),
    ("the",        "the"),
    ("a",          "a"),
    ("ten",        "ten"),
    ("tens",       "tens"),
    ("one",        "one"),
    ("ones",       "ones"),
    ("hop",        "hop"),
    ("hops",       "hops"),
    ("count up",   "count up"),
    ("count down", "count down"),
    ("start at",   "start at"),
    ("look at",    "look at"),
    ("it has",     "it has"),
    ("how many",   "how many"),
    ("more to go", "more to go"),
    ("first",      "first"),
    ("then",       "then"),
]
for key, spoken in OPERATORS:
    PHRASES.append((key, spoken, "op-" + slugify(key)))


# Praise / wrong / streak / start banks (these are exact phrases the app
# selects randomly, so they need exact-match coverage).
PRAISE = [
    "Amazing!", "Awesome!", "You're a star!", "Super smart!",
    "Fantastic!", "Wonderful!", "You rock!", "Brilliant!",
    "Keep it up!", "Math wizard!", "So cool!", "Incredible!",
    "Great job!", "Perfect!", "Excellent!",
]
WRONG = [
    "Almost! Try again!", "So close! One more try!",
    "Not quite, you got this!", "Keep trying!",
    "Hmm, try another number!",
]
STREAK = [
    "You're on fire!", "Unstoppable!", "Star streak!",
    "Blasting off!", "Diamond brain!",
]
START = [
    "You can do it!", "Let's go!", "I believe in you!",
    "Math time!", "Ready? Let's roll!",
]
for msg in PRAISE: PHRASES.append((msg, msg, "praise-" + slugify(msg)))
for msg in WRONG:  PHRASES.append((msg, msg, "wrong-"  + slugify(msg)))
for msg in STREAK: PHRASES.append((msg, msg, "streak-" + slugify(msg)))
for msg in START:  PHRASES.append((msg, msg, "start-"  + slugify(msg)))


# Quiz / lesson prompts
PROMPTS = [
    "What number is this?",
    "How many tens?",
    "How many ones?",
    "Let's practice!",
    "Now the quiz! Ten questions, no hints.",
    "Great practice! Ready for the quiz?",
    "Module complete!",
    "You can do it!",
]
for msg in PROMPTS:
    PHRASES.append((msg, msg, "prompt-" + slugify(msg)))


# Place Value lesson copy (each lesson page text)
LESSON = [
    "Meet the Tens!",
    "When you have ten ones all together, you can group them into one ten. The tall blue bar is one ten — it has ten little squares stacked up.",
    "Tens and Ones Together",
    "Two-digit numbers have tens and ones. This picture shows two tens and three ones.",
    "Reading the Number",
    "Count the tens first, then the ones. Four tens make forty. Then add seven more.",
    "What about zero ones?",
    "If there are no orange ones, the number ends in zero. Six tens with zero ones is just sixty.",
]
for msg in LESSON:
    PHRASES.append((msg, msg, "lesson-" + slugify(msg)))


# Math problem phrases — pre-render for smooth single-clip playback
# Covers easy add/sub within Hakan's range. Format matches game.js:
#   speak(`${a} ${spokenOp} ${b}?`)  =>  "5 plus 3?"
MATH_RANGE_ADD = 12   # a, b in 0..12 inclusive (covers easy + confidence builders)
MATH_MAX_MINUEND = 20  # subtraction up to 20

for a in range(0, MATH_RANGE_ADD + 1):
    for b in range(0, MATH_RANGE_ADD + 1):
        # Addition
        msg = f"{number_to_words(a)} plus {number_to_words(b)}"
        PHRASES.append((msg, msg, f"math-add-{a}-{b}"))
for a in range(0, MATH_MAX_MINUEND + 1):
    for b in range(0, min(a, MATH_RANGE_ADD) + 1):
        # Subtraction (a >= b so result is non-negative)
        msg = f"{number_to_words(a)} minus {number_to_words(b)}"
        PHRASES.append((msg, msg, f"math-sub-{a}-{b}"))


# Place Value hints
HINTS = [
    "Three tens makes thirty. Add five more ones.",
    "Two tens equals twenty. Plus eight ones.",
    "The tens digit is the first digit.",
    "The ones digit is the last digit.",
    "Six tens with zero ones is just sixty.",
]
for msg in HINTS:
    PHRASES.append((msg, msg, "hint-" + slugify(msg)))


# Generic mascot
MASCOT = [
    "Let me help you think!",
    "You can do it!",
]
for msg in MASCOT:
    PHRASES.append((msg, msg, "mascot-" + slugify(msg)))


# =====================================================================
# Module lesson + prompt audio (Grade 1 modules in modules.js)
# =====================================================================
# Lesson body texts — record each as one full natural-flowing clip.
LESSON_BODIES = [
    # Counting
    "When we count, each new number is one more than the last. One, two, three, four, five.",
    "We can count by tens to reach big numbers fast. Ten, twenty, thirty, forty, fifty.",
    "Sometimes a number is missing in a row. Look at the numbers around it. Four, five, six, seven, eight.",
    "We can count backwards too. Each number is one less than the last. Ten, nine, eight, seven.",
    # Addition
    "When we add, we put two groups together. Three apples and two more apples make five apples.",
    "The plus sign means and. Three plus two is five.",
    "When we add, we can start with the bigger number and count up. Five plus three. Five, six, seven, eight.",
    "Doubles are easy to remember. Five plus five is ten. Six plus six is twelve.",
    # Subtraction
    "When we take some away, we subtract. Five cookies. Two are eaten. Three are left.",
    "The minus sign means take away. Five minus two is three.",
    "Start at the big number and count back. Eight minus three. Eight, seven, six, five.",
    "Adding and subtracting are opposites. If three plus five is eight, then eight minus five is three.",
    # Fact Families
    "Three numbers can make a fact family. Three, five, and eight all go together.",
    "Each family makes four math facts. Three plus five is eight. Five plus three is eight. Eight minus three is five. Eight minus five is three.",
    "We can draw a fact family in a triangle. The big number sits at the top. The two small numbers sit at the bottom.",
    "If you know one fact in a family, you know them all. That is a math superpower!",
    # Place Value (re-stated to match new lesson copy in modules.js)
    "When you have ten ones all together, you can group them into one ten. The tall blue bar is one ten. It has ten little squares stacked up.",
    "Two-digit numbers have tens and ones. This picture shows two tens and three ones.",
    "Count the tens first, then the ones. Four tens make forty. Then add seven more.",
    "If there are no orange ones, the number ends in zero. Six tens with zero ones is just sixty.",
    # Compare
    "When we compare numbers, we find which is bigger, smaller, or the same. Seven is bigger than three.",
    "The greater than sign looks like an alligator mouth. The mouth always opens to eat the bigger number. Seven is greater than three.",
    "Same alligator, opposite direction. Three is less than seven.",
    "When two numbers are the same, we use the equal sign. Five equals five.",
    # Two-digit add
    "We can add a small number to a bigger one. Twenty-three plus five.",
    "Look at the ones place. Twenty-three has three ones. Three plus five is eight.",
    "The tens stay the same. Twenty-three plus five is twenty-eight.",
    # Time
    "A clock has two hands. The short hand shows the hour. The long hand shows the minutes.",
    "When the long hand points to twelve, we say o clock. This shows three o clock.",
    "When the long hand points to six, we say half past. This shows half past three.",
    "First look at the short hand for the hour. Then look at the long hand. This is half past seven.",
    # Shapes
    "A circle is round. A square has four equal sides. A triangle has three sides. Shapes are everywhere!",
    "When we cut something into two equal parts, each part is one half.",
    "When we cut something into four equal parts, each part is one fourth. Some people call them quarters.",
    "Halves and fourths must always be the same size. Equal parts!",
    # Word problems
    "Hakan has three apples. He gets two more. How many in all? That is a math story.",
    "Look for the numbers in the story. Three and two. Those are our numbers.",
    "Did Hakan get more apples or lose some? Got more means add. Lost means subtract. Three plus two is five!",
]
for msg in LESSON_BODIES:
    PHRASES.append((msg, msg, "lesson-" + slugify(msg)))


# Question prompts (every prompt the modules call speak() with)
PROMPTS_MODULE = [
    # Counting
    "What number comes after four?",
    "What number comes after five?",
    "What number comes after nine?",
    "What number comes after eleven?",
    "What number comes after fourteen?",
    "What number comes after ninety nine?",
    "What number comes before seven?",
    "What number comes before nine?",
    "What number comes before twenty?",
    "What is the missing number?",
    "Counting by tens. What is the missing number?",
    # Compare
    "Five compared to eight?",
    "Twelve compared to seven?",
    "Six compared to six?",
    "Nine compared to eleven?",
    "Fifteen compared to five?",
    "Four compared to nine?",
    "Thirteen compared to ten?",
    "Seven compared to seven?",
    "Eleven compared to eight?",
    "Three compared to eighteen?",
    "Twenty compared to twenty?",
    "Six compared to sixteen?",
    "Fourteen compared to four?",
    "Seventeen compared to twelve?",
    "Nine compared to nine?",
    # Two-digit add prompts
    "Twenty-three plus five?",
    "Forty-one plus six?",
    "Thirty-five plus four?",
    "Twelve plus seven?",
    "Fifty-six plus three?",
    "Twenty-one plus four?",
    "Thirty-three plus six?",
    "Forty-five plus two?",
    "Seventeen plus two?",
    "Sixty-two plus five?",
    "Seventy-four plus three?",
    "Fifty-one plus eight?",
    "Twenty-four plus five?",
    "Thirteen plus six?",
    "Eighty-two plus four?",
    # Time / shapes
    "What time is this?",
    "What shape is this?",
    "A shape with no corners?",
    "A shape with three sides?",
    "How many equal parts?",
    # Generic
    "What number is this?",
    "How many tens?",
    "How many ones?",
    # Word problems
    "Hakan has four dogs. Two more come. How many dogs in all?",
    "There are eight cookies. Hakan eats three. How many are left?",
    "Hakan has seven stars. He gets two more. How many stars?",
    "Ten balloons. Six pop. How many are left?",
    "Five fish in a tank. Seven more are added. How many fish?",
    "Three apples. Four more apples. How many in all?",
    "Nine cats. Five run away. How many cats are left?",
    "Six balls. Five more balls. How many in all?",
    "Twelve butterflies. Four fly away. How many are left?",
    "Two fish. Eight more fish. How many in all?",
    "Hakan has fifteen strawberries. He eats ten. How many are left?",
    "Four ducks. Five more come. How many ducks?",
    "Eleven bunnies. Eight hop away. How many are left?",
    "Eight stars. Six more stars. How many in all?",
    "Twenty turtles. Fourteen swim away. How many are left?",
]
for msg in PROMPTS_MODULE:
    PHRASES.append((msg, msg, "qp-" + slugify(msg)))


# Practice hints (used in practice mode)
HINTS_MODULE = [
    # Counting
    "Look at the number line. The next number after four is one more.",
    "Nine plus one more is ten.",
    "One less than seven.",
    "Between seven and nine is eight.",
    "After ten and before twelve.",
    # Compare
    "Five is smaller than eight, so it is less than.",
    "Twelve is bigger than seven, so it is greater than.",
    "Same numbers means equal.",
    "Nine is less than eleven.",
    "Fifteen is much bigger than five.",
    # Two-digit
    "Three plus five is eight. Tens stay at twenty.",
    "One plus six is seven. Plus forty.",
    "Five plus four is nine. Plus thirty.",
    "Two plus seven is nine. Plus ten.",
    "Six plus three is nine. Plus fifty.",
    # Time
    "Long hand on twelve, short hand on four.",
    "Long hand on six means half past.",
    "Long hand on twelve, short hand on nine.",
    "Half past two!",
    "Both hands at the top!",
    # Shapes
    "Round and no corners!",
    "Four equal sides!",
    "Three sides!",
    "Count the slices!",
    "Two by two!",
    # Word problem hints
    "Four plus two.",
    "Eight minus three.",
    "Seven plus two.",
    "Ten minus six.",
    "Five plus seven.",
]
for msg in HINTS_MODULE:
    PHRASES.append((msg, msg, "h-" + slugify(msg)))


# ---------- generate ----------

async def gen_one(spoken: str, slug: str, out_path: str) -> None:
    if os.path.exists(out_path):
        return
    comm = edge_tts.Communicate(spoken, VOICE, rate=RATE, pitch=PITCH)
    await comm.save(out_path)


async def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)

    # Dedupe by lookup key, keeping the first occurrence
    seen: set[str] = set()
    unique: list[tuple[str, str, str]] = []
    for key, spoken, slug in PHRASES:
        nk = normalize(key)
        if nk in seen:
            continue
        seen.add(nk)
        unique.append((key, spoken, slug))

    print(f"Generating {len(unique)} clips with voice {VOICE}...")
    print(f"Output: {OUT_DIR}/")
    print()

    manifest: dict[str, str] = {}
    failed: list[tuple[str, str]] = []

    for i, (key, spoken, slug) in enumerate(unique, 1):
        filename = slug + ".mp3"
        out_path = os.path.join(OUT_DIR, filename)
        preview = spoken if len(spoken) <= 60 else spoken[:57] + "..."
        print(f"  [{i:3d}/{len(unique)}] {filename:40s}  {preview}")
        try:
            await gen_one(spoken, slug, out_path)
            manifest[normalize(key)] = filename
        except Exception as e:
            print(f"      ERROR: {e}")
            failed.append((key, str(e)))

    manifest_path = os.path.join(OUT_DIR, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)

    print()
    print(f"Done. {len(manifest)} clips OK, {len(failed)} failed.")
    print(f"Manifest: {manifest_path}")
    if failed:
        print()
        print("Failed phrases:")
        for k, e in failed:
            print(f"  {k!r}: {e}")


if __name__ == "__main__":
    asyncio.run(main())
