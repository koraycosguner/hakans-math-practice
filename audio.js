// ===== Clip-based audio playback =====
// Loads audio/manifest.json at startup and serves clips for spoken text.
// Composed phrases are concatenated into a single AudioBuffer (with
// silence trimming) so playback flows smoothly without scheduling gaps.

const AUDIO_VERSION = 4;
let CLIP_MANIFEST = {};
let CLIP_MANIFEST_LOADED = false;

(async function loadClipManifest() {
    try {
        const res = await fetch('audio/manifest.json?v=' + AUDIO_VERSION, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        CLIP_MANIFEST = await res.json();
        CLIP_MANIFEST_LOADED = true;
        console.log('[audio v' + AUDIO_VERSION + '] manifest loaded —', Object.keys(CLIP_MANIFEST).length, 'keys');
    } catch (e) {
        console.log('[audio v' + AUDIO_VERSION + '] no manifest, will use Web Speech API:', e.message);
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
    s = s.replace(/\b(\d{1,2})\b/g, (_, d) => {
        const n = parseInt(d, 10);
        return (n >= 0 && n < 100) ? __numToWords(n) : d;
    });
    return s;
}

// ---------- Web Audio context + clip cache ----------
let __audioCtx = null;
function __getCtx() {
    if (!__audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        __audioCtx = new Ctx();
    }
    return __audioCtx;
}

const __decodedCache = new Map();
let __activeSources = [];

async function __decodeClip(filename) {
    if (__decodedCache.has(filename)) return __decodedCache.get(filename);
    const ctx = __getCtx();
    if (!ctx) throw new Error('No AudioContext');
    const res = await fetch('audio/' + filename + '?v=' + AUDIO_VERSION);
    if (!res.ok) throw new Error('clip fetch failed: ' + filename);
    const buf = await res.arrayBuffer();
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

// Find first/last sample whose abs value exceeds the silence threshold,
// then add a small pre/post-roll so we don't clip phoneme onsets/offsets.
function __findSpeechRange(channelData, sampleRate) {
    const SILENCE = 0.012;          // ~ -38 dBFS
    const PRE_ROLL  = Math.floor(sampleRate * 0.005); // 5 ms
    const POST_ROLL = Math.floor(sampleRate * 0.012); // 12 ms (a touch more)
    const len = channelData.length;
    let s = 0;
    while (s < len && Math.abs(channelData[s]) < SILENCE) s++;
    if (s === len) return { start: 0, end: len };
    let e = len - 1;
    while (e > s && Math.abs(channelData[e]) < SILENCE) e--;
    return {
        start: Math.max(0, s - PRE_ROLL),
        end: Math.min(len, e + 1 + POST_ROLL),
    };
}

// Concatenate decoded buffers into a single AudioBuffer with silence
// trimming, so playback is one continuous source — no scheduling gaps,
// no MP3 padding showing through.
function __concatBuffers(ctx, buffers) {
    const sampleRate = buffers[0].sampleRate;
    const numChannels = Math.min(2, Math.max(1, ...buffers.map(b => b.numberOfChannels)));

    // Compute the trimmed range of each buffer once.
    const ranges = buffers.map(b => __findSpeechRange(b.getChannelData(0), b.sampleRate));
    const totalLen = ranges.reduce((sum, r) => sum + (r.end - r.start), 0);
    if (totalLen === 0) return null;

    const out = ctx.createBuffer(numChannels, totalLen, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
        const outData = out.getChannelData(ch);
        let offset = 0;
        for (let i = 0; i < buffers.length; i++) {
            const buf = buffers[i];
            const range = ranges[i];
            const sourceCh = Math.min(ch, buf.numberOfChannels - 1);
            const inData = buf.getChannelData(sourceCh);
            const len = range.end - range.start;
            outData.set(inData.subarray(range.start, range.end), offset);
            offset += len;
        }
    }
    return out;
}

async function __playClips(filenames) {
    const ctx = __getCtx();
    if (!ctx) {
        for (const f of filenames) {
            await new Promise((res) => {
                const a = new Audio('audio/' + f + '?v=' + AUDIO_VERSION);
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

    let buffers;
    try {
        buffers = await Promise.all(filenames.map(__decodeClip));
    } catch (e) {
        console.warn('[audio] decode failed:', e);
        return;
    }

    let toPlay;
    if (buffers.length === 1) {
        toPlay = buffers[0];
    } else {
        toPlay = __concatBuffers(ctx, buffers);
        if (!toPlay) return;
    }

    const src = ctx.createBufferSource();
    src.buffer = toPlay;
    src.connect(ctx.destination);
    src.start();
    __activeSources = [src];
}

// ---------- Lookup ----------
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

// ---------- Public ----------
const __missingPhrases = new Set();

function tryPlayClip(text) {
    if (!CLIP_MANIFEST_LOADED) return false;
    if (typeof speechEnabled !== 'undefined' && !speechEnabled) return true;

    if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    __cancelAll();

    const exact = __findExactClip(text);
    if (exact) { __playClips([exact]); return true; }

    const composed = __composeClips(text);
    if (composed && composed.length) { __playClips(composed); return true; }

    if (!__missingPhrases.has(text)) {
        __missingPhrases.add(text);
        console.warn('[audio] no clip for:', JSON.stringify(text));
    }
    return true; // silence-on-miss (no TTS fallback)
}

function cancelAllAudio() {
    __cancelAll();
    if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
}

// ---------- Debug helpers ----------
window.audioReport = function () {
    if (__missingPhrases.size === 0) {
        console.log('[audio] no missing phrases — full coverage');
        return [];
    }
    const list = Array.from(__missingPhrases);
    console.log('[audio] phrases without clips (' + list.length + '):');
    list.forEach((p) => console.log('  ' + JSON.stringify(p)));
    return list;
};

window.debugLookup = function (text) {
    if (!CLIP_MANIFEST_LOADED) {
        console.log('manifest not loaded yet');
        return;
    }
    const norm = __normalizeForLookup(text);
    const exact = CLIP_MANIFEST[norm];
    const composed = __composeClips(text);
    console.log('input:     ', JSON.stringify(text));
    console.log('normalized:', JSON.stringify(norm));
    console.log('exact:     ', exact || '(none)');
    console.log('composed:  ', composed || '(cannot compose)');
    return { norm, exact, composed };
};
