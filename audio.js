// ===== Clip-based audio playback =====
// Loads audio/manifest.json at startup and serves clips for spoken text.
// Falls back to Web Speech API for anything not in the manifest.
//
// game.js's speak() calls tryPlayClip(text) before doing TTS — if that
// returns true, the TTS path is skipped.

let CLIP_MANIFEST = {};
let CLIP_MANIFEST_LOADED = false;
const __clipCache = new Map();
let __currentClipAudio = null;

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

function __normalizeForLookup(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[‍️]/gu, '')
        .replace(/[−–—]/g, 'minus')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function __getCachedAudio(filename) {
    let a = __clipCache.get(filename);
    if (!a) {
        a = new Audio('audio/' + filename);
        a.preload = 'auto';
        __clipCache.set(filename, a);
    }
    return a;
}

function __playSingle(filename) {
    return new Promise((resolve, reject) => {
        // clone so overlapping calls don't fight over one Audio element
        const src = __getCachedAudio(filename);
        const a = src.cloneNode();
        a.volume = 0.95;
        __currentClipAudio = a;
        a.onended = () => { if (__currentClipAudio === a) __currentClipAudio = null; resolve(); };
        a.onerror = (e) => { if (__currentClipAudio === a) __currentClipAudio = null; reject(e); };
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(reject);
    });
}

async function __playSequence(filenames) {
    for (const f of filenames) {
        try { await __playSingle(f); }
        catch (e) { /* skip and continue */ }
    }
}

function __cancelClip() {
    if (__currentClipAudio) {
        try { __currentClipAudio.pause(); } catch (e) {}
        __currentClipAudio = null;
    }
}

// Try to find a single clip whose normalized key matches the entire input.
function __findExactClip(text) {
    if (!CLIP_MANIFEST_LOADED) return null;
    const key = __normalizeForLookup(text);
    return CLIP_MANIFEST[key] || null;
}

// Try to break input into tokens that all match the manifest.
// Greedy left-to-right: longest available phrase wins.
function __composeClips(text) {
    if (!CLIP_MANIFEST_LOADED) return null;
    const norm = __normalizeForLookup(text);
    if (!norm) return null;
    const tokens = norm.split(' ');
    const out = [];
    let i = 0;
    while (i < tokens.length) {
        // Try longest possible n-gram from tokens[i..]
        let matched = false;
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
        if (!matched) return null; // unknown token — composition fails
    }
    return out.length ? out : null;
}

/**
 * Public entry point used by speak() in game.js.
 * Returns true if a clip (or sequence) was started; the caller should
 * skip its TTS fallback in that case.
 */
function tryPlayClip(text) {
    if (!CLIP_MANIFEST_LOADED) return false;
    if (typeof speechEnabled !== 'undefined' && !speechEnabled) return true; // muted

    // Stop anything already speaking (TTS or clip)
    if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    __cancelClip();

    // Exact match first
    const exact = __findExactClip(text);
    if (exact) {
        __playSingle(exact).catch(() => {});
        return true;
    }

    // Compositional match
    const composed = __composeClips(text);
    if (composed && composed.length) {
        __playSequence(composed);
        return true;
    }

    return false;
}
