// ===== Clip-based audio playback =====
// Loads audio/manifest.json at startup and serves clips for spoken text.
// Falls back to Web Speech API for anything not in the manifest.
//
// Sequence playback uses Web Audio API for gapless concatenation
// (e.g. "5 plus 3" plays without audible silence between atoms).
//
// game.js's speak() calls tryPlayClip(text) before doing TTS — if that
// returns true, the TTS path is skipped.

let CLIP_MANIFEST = {};
let CLIP_MANIFEST_LOADED = false;

(async function loadClipManifest() {
    try {
        const res = await fetch('audio/manifest.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        CLIP_MANIFEST = await res.json();
        CLIP_MANIFEST_LOADED = true;
        console.log('Audio clips loaded:', Object.keys(CLIP_MANIFEST).length);
    } catch (e) {
        console.log('No clip manifest (will use Web Speech API only):', e.message);
        CLIP_MANIFEST_LOADED = false;
    }
})();

// ---------- Number → words (so "10 ones" matches recorded "ten ones") ----------
const __NUM_WORDS = {
    0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen',
    15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
    20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
    60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety',
};
function __numToWords(n) {
    if (n in __NUM_WORDS) return __NUM_WORDS[n];
    if (n > 0 && n < 100) {
        const t = Math.floor(n / 10) * 10;
        const o = n % 10;
        return __NUM_WORDS[t] + ' ' + __NUM_WORDS[o];
    }
    return String(n);
}

function __normalizeForLookup(text) {
    let s = String(text || '')
        .toLowerCase()
        .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[‍️]/gu, '')
        .replace(/[−–—]/g, 'minus')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    // Convert standalone integers 0-99 to word form so digit-source text
    // matches word-source recordings (e.g. "10 ones" -> "ten ones").
    s = s.replace(/\b(\d{1,2})\b/g, (_, d) => {
        const n = parseInt(d, 10);
        return (n >= 0 && n < 100) ? __numToWords(n) : d;
    });
    return s;
}

// ---------- Web Audio API for gapless sequence playback ----------
let __audioCtx = null;
function __getCtx() {
    if (!__audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        __audioCtx = new Ctx();
    }
    return __audioCtx;
}

const __decodedCache = new Map();   // filename -> AudioBuffer
let __activeSources = [];

async function __decodeClip(filename) {
    if (__decodedCache.has(filename)) return __decodedCache.get(filename);
    const ctx = __getCtx();
    if (!ctx) throw new Error('No AudioContext');
    const res = await fetch('audio/' + filename);
    if (!res.ok) throw new Error('clip fetch failed: ' + filename);
    const buf = await res.arrayBuffer();
    // Safari: decodeAudioData uses callback API
    const decoded = await new Promise((resolve, reject) => {
        try {
            const p = ctx.decodeAudioData(buf, resolve, reject);
            if (p && p.then) p.then(resolve, reject);
        } catch (e) { reject(e); }
    });
    __decodedCache.set(filename, decoded);
    return decoded;
}

function __cancelAll() {
    for (const src of __activeSources) {
        try { src.stop(); } catch (e) {}
        try { src.disconnect(); } catch (e) {}
    }
    __activeSources = [];
}

async function __playClips(filenames) {
    const ctx = __getCtx();
    if (!ctx) {
        // Fallback: HTMLAudio sequential (used if Web Audio unavailable)
        for (const f of filenames) {
            await new Promise((res) => {
                const a = new Audio('audio/' + f);
                a.onended = res;
                a.onerror = res;
                a.play().catch(res);
            });
        }
        return;
    }
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) {}
    }
    // Decode all in parallel, then schedule back-to-back at sample-accurate
    // start times so there's no silence between clips.
    let buffers;
    try {
        buffers = await Promise.all(filenames.map(__decodeClip));
    } catch (e) {
        console.warn('decode failed, falling back to sequential:', e);
        return;
    }
    const sources = [];
    let t = ctx.currentTime + 0.04;       // tiny headroom
    const TRIM_END = 0.07;                 // drop trailing silence per clip (s)
    for (const buf of buffers) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const dur = Math.max(0.05, buf.duration - TRIM_END);
        src.start(t);
        src.stop(t + dur + 0.02);
        t += dur;
        sources.push(src);
    }
    __activeSources = sources;
}

// ---------- Lookup (exact + greedy compose) ----------
function __findExactClip(text) {
    if (!CLIP_MANIFEST_LOADED) return null;
    const key = __normalizeForLookup(text);
    return CLIP_MANIFEST[key] || null;
}

function __composeClips(text) {
    if (!CLIP_MANIFEST_LOADED) return null;
    const norm = __normalizeForLookup(text);
    if (!norm) return null;
    const tokens = norm.split(' ');
    const out = [];
    let i = 0;
    while (i < tokens.length) {
        let matched = false;
        // longest-match: try the longest possible n-gram from i first
        for (let j = tokens.length; j > i; j--) {
            const candidate = tokens.slice(i, j).join(' ');
            const file = CLIP_MANIFEST[candidate];
            if (file) {
                out.push(file);
                i = j;
                matched = true;
                break;
            }
        }
        if (!matched) return null;
    }
    return out.length ? out : null;
}

/**
 * Public entry: returns true if a clip (or sequence) was started.
 * Caller should skip its TTS fallback when true is returned.
 */
function tryPlayClip(text) {
    if (!CLIP_MANIFEST_LOADED) return false;
    if (typeof speechEnabled !== 'undefined' && !speechEnabled) return true; // muted

    // Stop anything already playing
    if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    __cancelAll();

    // 1) Exact match (full sentence in the library)
    const exact = __findExactClip(text);
    if (exact) {
        __playClips([exact]);
        return true;
    }

    // 2) Compose from atoms
    const composed = __composeClips(text);
    if (composed && composed.length) {
        __playClips(composed);
        return true;
    }

    return false;
}

// Allow other modules to silence playback
function cancelAllAudio() {
    __cancelAll();
    if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
}
