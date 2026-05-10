#!/usr/bin/env python3
"""
Auto-generate audio for ALL phrases referenced by modules.js.

Reads modules.js, extracts every lesson `text`, lesson `caption`, practice/quiz
`prompt`, and practice `hint`, generates an MP3 per unique normalized phrase
via edge-tts, and updates audio/manifest.json.

Skips phrases already in the manifest (and whose MP3 file exists).

Usage:
    python3 generate-audio-auto.py
"""

import asyncio
import json
import os
import re
import subprocess
import sys

try:
    import edge_tts
except ImportError:
    print("Missing edge_tts. Install with: pip3 install edge-tts")
    raise SystemExit(1)

ROOT = os.path.dirname(os.path.abspath(__file__))
MODULES_JS = os.path.join(ROOT, "modules.js")
OUT_DIR = os.path.join(ROOT, "audio")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")

VOICE = "en-US-GuyNeural"
RATE = "-10%"
PITCH = "+0Hz"
CONCURRENT = 8


# ---------- normalize / slugify (must match audio.js) ----------

NUM_WORDS = {
    0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen',
    15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
    20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
    60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety',
}


def num_to_words(n: int) -> str:
    if n in NUM_WORDS:
        return NUM_WORDS[n]
    if 0 < n < 100:
        t = (n // 10) * 10
        o = n % 10
        return NUM_WORDS[t] + ' ' + NUM_WORDS[o]
    return str(n)


def normalize(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[\U0001F000-\U0001FFFF]|[☀-➿]|[︀-﻿]", "", s)
    s = re.sub(r"[−–—]", "minus", s)
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()

    def _w(m):
        n = int(m.group(1))
        return num_to_words(n) if 0 <= n < 100 else m.group(0)
    s = re.sub(r"\b(\d{1,2})\b", _w, s)
    return s


def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s-]+", "-", s).strip("-")
    return s[:60] or "untitled"


# ---------- extract phrases from modules.js ----------

def extract_phrases() -> list[str]:
    """Pull every text/caption/prompt/hint string from modules.js."""
    src = open(MODULES_JS, "r", encoding="utf-8").read()

    # Boundaries: [const MODULES = [, matching ]]
    m = re.search(r"const\s+MODULES\s*=\s*\[", src)
    if not m:
        raise SystemExit("Could not locate const MODULES")
    i = m.end() - 1
    depth = 0
    j = i
    while j < len(src):
        c = src[j]
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                break
        j += 1
    section = src[m.start():j+1]

    keys = ("text", "caption", "prompt", "hint")
    phrases: list[str] = []
    for key in keys:
        # JSON-style: "key": "value"
        for v in re.findall(rf'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)"', section):
            phrases.append(v.replace("\\\"", "\"").replace("\\\\", "\\"))
        # JS-style: key: 'value'  or  key: "value"
        for v in re.findall(rf"\b{key}:\s*'((?:[^'\\]|\\.)*)'", section):
            phrases.append(v.replace("\\'", "'").replace("\\\\", "\\"))
        for v in re.findall(rf'\b{key}:\s*"((?:[^"\\]|\\.)*)"', section):
            phrases.append(v.replace("\\\"", "\"").replace("\\\\", "\\"))

    # Title strings are short labels — skip (they're not normally spoken).
    # Extract lesson titles separately if needed (currently spoken as page titles).
    for v in re.findall(r'"title"\s*:\s*"((?:[^"\\]|\\.)*)"', section):
        phrases.append(v.replace("\\\"", "\"").replace("\\\\", "\\"))
    for v in re.findall(r"\btitle:\s*'((?:[^'\\]|\\.)*)'", section):
        phrases.append(v.replace("\\'", "'").replace("\\\\", "\\"))
    for v in re.findall(r'\btitle:\s*"((?:[^"\\]|\\.)*)"', section):
        phrases.append(v.replace("\\\"", "\"").replace("\\\\", "\\"))

    return phrases


def load_manifest() -> dict:
    if os.path.exists(MANIFEST):
        try:
            return json.load(open(MANIFEST, "r", encoding="utf-8"))
        except Exception:
            return {}
    return {}


# ---------- generation ----------

def transform_for_speech(text: str) -> str:
    """Apply substitutions only to the text passed to edge-tts (NOT to the
    manifest key). 'Hakan' is a Turkish name; the en-US voice's default
    pronunciation ('HAY-kuhn') is anglicized. Respelling as 'Hah-Kahn'
    (with a hyphen between the two syllables) gives en-US-GuyNeural a
    pronunciation much closer to Turkish /haˈkan/."""
    return re.sub(r"\bHakan\b", "Hah-Kahn", text)


async def gen_one(spoken: str, out_path: str, sem: asyncio.Semaphore):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return True
    async with sem:
        try:
            spoken_for_tts = transform_for_speech(spoken)
            comm = edge_tts.Communicate(spoken_for_tts, VOICE, rate=RATE, pitch=PITCH)
            await comm.save(out_path)
            return True
        except Exception as e:
            sys.stderr.write(f"[fail] {spoken[:40]}... {e}\n")
            return False


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = load_manifest()

    raw_phrases = extract_phrases()
    print(f"Extracted {len(raw_phrases)} raw phrases from modules.js")

    # Dedupe by normalized form
    seen = {}
    for p in raw_phrases:
        nk = normalize(p)
        if not nk:
            continue
        if nk in seen:
            continue
        seen[nk] = p
    print(f"Unique normalized phrases: {len(seen)}")

    # Determine which need to be generated
    todo = []
    for nk, original in seen.items():
        if nk in manifest:
            existing = os.path.join(OUT_DIR, manifest[nk])
            if os.path.exists(existing) and os.path.getsize(existing) > 0:
                continue
        slug = "auto-" + slugify(nk)[:50]
        fname = slug + ".mp3"
        out_path = os.path.join(OUT_DIR, fname)
        todo.append((nk, original, fname, out_path))
    print(f"To generate: {len(todo)} new clips ({len(seen)-len(todo)} already exist)")

    if not todo:
        print("Nothing new to generate.")
        return

    sem = asyncio.Semaphore(CONCURRENT)
    tasks = [gen_one(orig, path, sem) for nk, orig, fname, path in todo]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Update manifest with successful entries
    success = 0
    for (nk, orig, fname, path), result in zip(todo, results):
        if result is True and os.path.exists(path) and os.path.getsize(path) > 0:
            manifest[nk] = fname
            success += 1
    print(f"Generated {success}/{len(todo)} new clips")

    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), indent=0,
              ensure_ascii=False, sort_keys=True)
    print(f"Manifest: {len(manifest)} entries")


if __name__ == "__main__":
    asyncio.run(main())
