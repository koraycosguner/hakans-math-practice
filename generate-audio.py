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
    s = re.sub(r"[^\w\s]", " ", s)        # space, not empty (matches JS)
    s = re.sub(r"\s+", " ", s).strip()
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
