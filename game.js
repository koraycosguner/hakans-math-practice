// ===== User & Robux =====
let currentUser = null; // 'hakan' or 'koray'
const ROBUX_BY_LEVEL = {
    easy: 0.50,
    medium: 0.50,
};
const ROBUX_STORAGE_KEY = 'hakans-math-robux';

function loadRobux() {
    try {
        const data = JSON.parse(localStorage.getItem(ROBUX_STORAGE_KEY));
        return data ? data.robux : 0;
    } catch (e) {
        return 0;
    }
}

function saveRobux(amount) {
    localStorage.setItem(ROBUX_STORAGE_KEY, JSON.stringify({ robux: amount }));
}

function selectUser(name) {
    currentUser = name;
    playSound('click');

    // Update start screen for this user
    const titleName = document.getElementById('start-title-name');
    titleName.textContent = name === 'hakan' ? "Hakan's" : "Koray's";

    const robuxBanner = document.getElementById('robux-banner');
    const adminSection = document.getElementById('admin-section');
    const robuxDisplay = document.getElementById('robux-display');

    if (name === 'hakan') {
        // Show Robux banner, hide admin
        const robux = loadRobux();
        document.getElementById('robux-total').textContent = robux.toFixed(2);
        robuxBanner.style.display = '';
        adminSection.style.display = 'none';
        robuxDisplay.style.display = '';
        document.getElementById('robux-game').textContent = robux.toFixed(2);
    } else {
        // Koray: show admin section, hide Robux banner
        const robux = loadRobux();
        document.getElementById('admin-robux').textContent = robux.toFixed(2);
        robuxBanner.style.display = 'none';
        adminSection.style.display = '';
        robuxDisplay.style.display = 'none';
    }

    showScreen('start-screen');
}

function switchUser() {
    playSound('click');
    showScreen('user-screen');
}

function resetRobux() {
    if (confirm('Reset Hakan\'s Robux to 0? (Do this after buying Robux)')) {
        saveRobux(0);
        document.getElementById('admin-robux').textContent = '0.0';
        alert('Robux reset to 0!');
    }
}

function updateRobuxDisplay() {
    if (currentUser !== 'hakan') return;
    const robux = loadRobux();
    document.getElementById('robux-game').textContent = robux.toFixed(2);
}

// ===== Game State =====
const state = {
    mode: 'addition',        // addition, subtraction, mixed
    difficulty: 'easy',      // easy (1-10), medium (1-50), hard (1-99)
    currentProblem: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    questionNumber: 0,
    totalQuestions: 10,
    correctAnswers: 0,
    attempts: 0,             // attempts for current problem
    hintStep: 0,             // current hint step shown (0 = none)
    hintSteps: [],           // array of hint strings for current problem
    sessionRobux: 0,         // Robux earned this game session
    usedNumberLine: false,   // whether number line was used for current problem
    usedTenFrames: false,    // whether ten frames was used for current problem
};

// ===== Difficulty Ranges =====
const RANGES = {
    easy:   { min: 1, max: 9 },
    medium: { min: 1, max: 99 },
};

// ===== Encouraging Messages =====
const MESSAGES = {
    correct: [
        "Amazing! 🌟", "Awesome! 🎉", "You're a star! ⭐",
        "Super smart! 🧠", "Fantastic! 🚀", "Wonderful! 💫",
        "You rock! 🎸", "Brilliant! 💡", "Keep it up! 🔥",
        "Math wizard! 🧙", "So cool! 😎", "Incredible! 🏆",
    ],
    wrong: [
        "Almost! Try again! 💪", "So close! One more try! 🤔",
        "Not quite, you got this! 🌈", "Keep trying! 💪",
        "Hmm, try another number! 🤓",
    ],
    streak: [
        "🔥 You're on fire!", "⚡ Unstoppable!", "🌟 Star streak!",
        "🚀 Blasting off!", "💎 Diamond brain!",
    ],
    start: [
        "You can do it! 💪", "Let's go! 🚀", "I believe in you! 🌟",
        "Math time! 🧮", "Ready? Let's roll! 🎲",
    ],
};

// ===== Sound Effects (Web Audio API) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
    return audioCtx;
}

function playSound(type) {
    try {
        const ctx = getAudioCtx();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);

        if (type === 'correct') {
            oscillator.frequency.setValueAtTime(523, ctx.currentTime);     // C5
            oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);
        } else if (type === 'wrong') {
            oscillator.frequency.setValueAtTime(300, ctx.currentTime);
            oscillator.frequency.setValueAtTime(250, ctx.currentTime + 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
        } else if (type === 'click') {
            oscillator.frequency.setValueAtTime(600, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.08);
        } else if (type === 'hop') {
            oscillator.frequency.setValueAtTime(440, ctx.currentTime);
            oscillator.frequency.setValueAtTime(587, ctx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
        } else if (type === 'win') {
            const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
                gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
                osc.start(ctx.currentTime + i * 0.1);
                osc.stop(ctx.currentTime + i * 0.1 + 0.3);
            });
            return; // Already handled multiple oscillators
        }
    } catch (e) {
        // Audio not available, silently continue
    }
}

// ===== Text-to-Speech (Fox Talks!) =====
let speechEnabled = true;

function speak(text) {
    if (!speechEnabled || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip emojis and special chars for cleaner speech
    const cleanText = text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u200D\uFE0F]/gu, '')
                          .replace(/[−–—]/g, 'minus')  // speak math minus signs
                          .trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;   // Slightly slower for kids
    utterance.pitch = 0.95; // Slightly lower for a deeper male sound
    utterance.volume = 0.85;

    const voice = pickVoice();
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
}

let cachedVoice = null;
let voiceCacheReady = false;

function pickVoice() {
    if (voiceCacheReady && cachedVoice) return cachedVoice;

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Log available voices for debugging (only once)
    if (!voiceCacheReady) {
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    }

    // Male voice names to look for (in priority order)
    // Excludes novelty/robotic voices (Fred, Albert, Junior, Ralph)
    const maleNames = ['Nathan', 'Daniel', 'Aaron', 'Tom', 'Arthur', 'Guy', 'James',
                        'Alex', 'Oliver', 'Gordon', 'Malcolm', 'Martin', 'Rishi', 'Reed'];

    // Novelty/robotic voices to AVOID (sound terrible for kids)
    const noveltyNames = ['Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles',
                           'Cellos', 'Good News', 'Jester', 'Organ', 'Trinoids',
                           'Whisper', 'Wobble', 'Zarvox', 'Fred', 'Junior', 'Ralph',
                           'Superstar', 'Rocko', 'Grandma', 'Grandpa', 'Sandy'];

    // Known female voice names
    const femaleNames = ['Samantha', 'Karen', 'Victoria', 'Tessa', 'Moira', 'Fiona',
                          'Kate', 'Serena', 'Veena', 'Allison', 'Ava', 'Susan', 'Zoe',
                          'Nicky', 'Joelle', 'Satu', 'Sara', 'Ellen', 'Martha',
                          'Flo', 'Kathy'];

    function isEnglish(v) {
        return v.lang.startsWith('en');
    }

    function isMaleName(v) {
        return maleNames.some(n => v.name.includes(n));
    }

    function isFemaleName(v) {
        return femaleNames.some(n => v.name.includes(n));
    }

    function isNovelty(v) {
        return noveltyNames.some(n => v.name.includes(n));
    }

    let matchStep = 'none';

    // 1. Best: Premium male English voice
    cachedVoice = voices.find(v =>
        isEnglish(v) && v.name.includes('(Premium)') && isMaleName(v)
    );
    if (cachedVoice) matchStep = '1-premium-male';

    // 2. Good: Enhanced male English voice
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            isEnglish(v) && v.name.includes('(Enhanced)') && isMaleName(v)
        );
        if (cachedVoice) matchStep = '2-enhanced-male';
    }

    // 3. Standard male voice by name — search in OUR priority order
    if (!cachedVoice) {
        for (const name of maleNames) {
            cachedVoice = voices.find(v => isEnglish(v) && v.name.includes(name));
            if (cachedVoice) { matchStep = '3-standard-' + name; break; }
        }
    }

    // 4. Google UK English Male
    if (!cachedVoice) {
        cachedVoice = voices.find(v => v.name.includes('Google UK English Male'));
        if (cachedVoice) matchStep = '4-google-male';
    }

    // 5. Any voice with "Male" in the name
    if (!cachedVoice) {
        cachedVoice = voices.find(v => isEnglish(v) && /male/i.test(v.name));
        if (cachedVoice) matchStep = '5-male-keyword';
    }

    // 6. Any Enhanced/Premium English voice (non-novelty)
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            isEnglish(v) && (v.name.includes('(Premium)') || v.name.includes('(Enhanced)')) && !isNovelty(v)
        );
        if (cachedVoice) matchStep = '6-enhanced-any';
    }

    // 7. Any normal English voice (not novelty, not female)
    if (!cachedVoice) {
        cachedVoice = voices.find(v => isEnglish(v) && !isFemaleName(v) && !isNovelty(v));
        if (cachedVoice) matchStep = '7-normal-male';
    }

    // 8. Any normal English voice (even female — better than novelty)
    if (!cachedVoice) {
        cachedVoice = voices.find(v => isEnglish(v) && !isNovelty(v));
        if (cachedVoice) matchStep = '8-any-normal';
    }

    // 9. Last fallback: anything English
    if (!cachedVoice) {
        cachedVoice = voices.find(v => isEnglish(v));
        if (cachedVoice) matchStep = '9-fallback';
    }

    console.log('Selected voice:', cachedVoice?.name, cachedVoice?.lang, 'step:', matchStep);

    voiceCacheReady = true;
    return cachedVoice;
}

// Preload voices — on iOS/Safari, voices load lazily and may require retries
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        voiceCacheReady = false; // Reset cache when voices change
        pickVoice();             // Re-pick best voice
    };

    // On Safari/iOS, onvoiceschanged may not fire. Retry a few times.
    let retries = 0;
    const retryVoices = setInterval(() => {
        const voices = window.speechSynthesis.getVoices();
        retries++;
        if (voices.length > 0 || retries > 10) {
            clearInterval(retryVoices);
            if (!voiceCacheReady && voices.length > 0) {
                pickVoice();
            }
        }
    }, 300);
}

function toggleSpeech() {
    speechEnabled = !speechEnabled;
    document.getElementById('sound-btn').textContent = speechEnabled ? '🔊' : '🔇';
    if (!speechEnabled) window.speechSynthesis.cancel();
    playSound('click');
}

// ===== Utility Functions =====
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ===== Mental Math Strategy Hints =====
function getHints(problem) {
    const { a, b, answer, type } = problem;

    if (type === 'addition') {
        return getAdditionHints(a, b, answer);
    } else {
        return getSubtractionHints(a, b, answer);
    }
}

function getAdditionHints(a, b, answer) {
    // Plus 0
    if (b === 0) {
        return [
            `Adding 0 means nothing changes!`,
            `So ${a} + 0 = ${a} ✨`,
        ];
    }
    if (a === 0) {
        return [
            `Adding 0 means nothing changes!`,
            `So 0 + ${b} = ${b} ✨`,
        ];
    }

    // Plus 1
    if (b === 1) {
        return [
            `Adding 1 is easy — just the next number!`,
            `Count one up from ${a}: ${answer}! 🎯`,
        ];
    }
    if (a === 1) {
        return [
            `Adding 1 is easy — just the next number!`,
            `Count one up from ${b}: ${answer}! 🎯`,
        ];
    }

    // Plus 2
    if (b === 2) {
        return [
            `Adding 2? Count up two!`,
            `${a}... ${a + 1}... ${a + 2}! 🎯`,
        ];
    }
    if (a === 2) {
        return [
            `Adding 2? Count up two!`,
            `${b}... ${b + 1}... ${b + 2}! 🎯`,
        ];
    }

    // Doubles (a === b)
    if (a === b) {
        return [
            `This is a double! 🔢`,
            `${a} + ${a} = ? Think of ${a} groups of 2!`,
            `${a} + ${a} = ${answer}! Remember this one! 🧠`,
        ];
    }

    // Near doubles (differ by 1)
    if (Math.abs(a - b) === 1) {
        const smaller = Math.min(a, b);
        const bigger = Math.max(a, b);
        const double = smaller * 2;
        return [
            `Almost a double! Think: what is ${smaller} + ${smaller}? 🤔`,
            `${smaller} + ${smaller} = ${double}`,
            `${bigger} is 1 more than ${smaller}, so add 1 more: ${double} + 1 = ${answer}! 🌟`,
        ];
    }

    // Near doubles (differ by 2)
    if (Math.abs(a - b) === 2) {
        const smaller = Math.min(a, b);
        const bigger = Math.max(a, b);
        const double = smaller * 2;
        return [
            `Close to a double! Think: what is ${smaller} + ${smaller}? 🤔`,
            `${smaller} + ${smaller} = ${double}`,
            `${bigger} is 2 more than ${smaller}, so add 2 more: ${double} + 2 = ${answer}! 🌟`,
        ];
    }

    // Make 10 — one number is 9
    if (a === 9 || b === 9) {
        const other = a === 9 ? b : a;
        const leftover = other - 1;
        return [
            `One number is 9 — almost 10! Let's make 10 first 🎯`,
            `Take 1 from ${other} to make 9 into 10. Now it's 10 + ${leftover}`,
            `10 + ${leftover} = ${answer}! 🚀`,
        ];
    }

    // Make 10 — one number is 8
    if (a === 8 || b === 8) {
        const other = a === 8 ? b : a;
        const leftover = other - 2;
        if (leftover >= 0) {
            return [
                `One number is 8 — close to 10! Let's make 10 🎯`,
                `Take 2 from ${other} to make 8 into 10. Now it's 10 + ${leftover}`,
                `10 + ${leftover} = ${answer}! 🚀`,
            ];
        }
    }

    // Add 10
    if (a === 10) {
        return [
            `Adding 10 is easy!`,
            `Just put a 1 in the tens place: 10 + ${b} = ${answer}! ⚡`,
        ];
    }
    if (b === 10) {
        return [
            `Adding 10 is easy!`,
            `Just put a 1 in the tens place: ${a} + 10 = ${answer}! ⚡`,
        ];
    }

    // Count on (one number is small, ≤ 3)
    if (b <= 3) {
        const steps = [];
        let counting = '';
        for (let i = 1; i <= b; i++) {
            counting += (a + i) + (i < b ? '... ' : '!');
        }
        return [
            `Start at ${a} and count up ${b}!`,
            `${a}... ${counting} 🎯`,
        ];
    }
    if (a <= 3) {
        const steps = [];
        let counting = '';
        for (let i = 1; i <= a; i++) {
            counting += (b + i) + (i < a ? '... ' : '!');
        }
        return [
            `Start at ${b} (the bigger number) and count up ${a}!`,
            `${b}... ${counting} 🎯`,
        ];
    }

    // 2-digit + 1-digit: no carrying (ones digits don't exceed 9)
    // e.g. 43 + 5 = 48 → just add the ones
    if (a >= 10 && b <= 9) {
        const addAOnes = a % 10;
        const addATens = Math.floor(a / 10) * 10;
        if (addAOnes + b <= 9) {
            return [
                `Look at the ones: ${addAOnes} + ${b} = ${addAOnes + b} 🔢`,
                `The tens stay the same: ${addATens}`,
                `So ${a} + ${b} = ${answer}! ✨`,
            ];
        } else {
            // Carrying: ones overflow past 9
            // e.g. 47 + 6 → 7+6=13, carry the 1 → 53
            const onesSum = addAOnes + b;
            const newOnes = onesSum % 10;
            return [
                `Add the ones: ${addAOnes} + ${b} = ${onesSum}. That's more than 9! 🤔`,
                `Write down ${newOnes} and carry the 1 to the tens ✋`,
                `Tens: ${Math.floor(a / 10)} + 1 = ${Math.floor(a / 10) + 1}, so the answer is ${answer}! 🌟`,
            ];
        }
    }

    // Bigger numbers: break apart strategy
    if (a > 10 || b > 10) {
        const bTens = Math.floor(b / 10) * 10;
        const bOnes = b % 10;
        if (bTens > 0 && bOnes > 0) {
            const step1 = a + bTens;
            return [
                `Break ${b} into ${bTens} + ${bOnes} 🧩`,
                `First: ${a} + ${bTens} = ${step1}`,
                `Then: ${step1} + ${bOnes} = ${answer}! 🎉`,
            ];
        }
    }

    // Default: friendly general hint
    return [
        `Try counting up from ${Math.max(a, b)}! Start at ${Math.max(a, b)} and count ${Math.min(a, b)} more 🤔`,
        `The answer is between ${answer - 3} and ${answer + 3}. You're close! 💪`,
    ];
}

function getSubtractionHints(a, b, answer) {
    // Minus 0
    if (b === 0) {
        return [
            `Taking away 0? Nothing changes!`,
            `${a} − 0 = ${a} ✨`,
        ];
    }

    // Minus itself
    if (a === b) {
        return [
            `Both numbers are the same! 🤔`,
            `When you take away the same number, you always get 0!`,
            `${a} − ${a} = 0 ✨`,
        ];
    }

    // Minus 1
    if (b === 1) {
        return [
            `Subtracting 1 is easy — just the number before!`,
            `Count one back from ${a}: ${answer}! 🎯`,
        ];
    }

    // Minus 2
    if (b === 2) {
        return [
            `Subtracting 2? Count back two!`,
            `${a}... ${a - 1}... ${a - 2}! 🎯`,
        ];
    }

    // Subtract from 10 (a is 10)
    if (a === 10) {
        return [
            `${a} − ${b}? Think about 10-facts! 🧠`,
            `${b} + ? = 10. What number goes with ${b} to make 10?`,
            `${b} + ${answer} = 10, so 10 − ${b} = ${answer}! ⭐`,
        ];
    }

    // Near 10 — subtracting 9
    if (b === 9) {
        return [
            `Subtracting 9 is close to subtracting 10! 🎯`,
            `${a} − 10 would be ${a - 10}`,
            `But we only subtract 9, so it's 1 MORE: ${a - 10} + 1 = ${answer}! 🌟`,
        ];
    }

    // Near 10 — subtracting 8
    if (b === 8) {
        return [
            `Subtracting 8 is close to subtracting 10! 🎯`,
            `${a} − 10 would be ${a - 10}`,
            `But we only subtract 8, so it's 2 MORE: ${a - 10} + 2 = ${answer}! 🌟`,
        ];
    }

    // Count back (small subtrahend ≤ 3)
    if (b <= 3) {
        let counting = '';
        for (let i = 1; i <= b; i++) {
            counting += (a - i) + (i < b ? '... ' : '!');
        }
        return [
            `Start at ${a} and count back ${b}!`,
            `${a}... ${counting} 🎯`,
        ];
    }

    // 2-digit minus 1-digit: ones digit is big enough (no borrowing)
    // e.g. 46 − 3 → just subtract the ones: 6 − 3 = 3, answer is 43
    const aOnes = a % 10;
    const aTens = Math.floor(a / 10) * 10;
    if (a >= 10 && b <= 9 && aOnes >= b) {
        return [
            `Look at the ones digit: ${aOnes} − ${b} = ${aOnes - b} 🔢`,
            `The tens stay the same: ${aTens}`,
            `So ${a} − ${b} = ${aTens + (aOnes - b)}! ✨`,
        ];
    }

    // 2-digit minus 1-digit: need to borrow (ones digit too small)
    // e.g. 43 − 7 → take away 3 to get to 40, then take away 4 more = 36
    if (a >= 10 && b <= 9 && aOnes < b) {
        const remaining = b - aOnes;
        return [
            `The ones digit ${aOnes} is smaller than ${b}... let's go through the tens! 🎯`,
            `First take away ${aOnes} to get to ${aTens}: ${a} − ${aOnes} = ${aTens}`,
            `Still need to take away ${remaining} more: ${aTens} − ${remaining} = ${answer}! 🌟`,
        ];
    }

    // Think addition (works well for single digits)
    if (b <= 10 && a <= 20) {
        return [
            `Think addition! ${b} + ? = ${a} 🤔`,
            `What number do you add to ${b} to get ${a}?`,
            `${b} + ${answer} = ${a}, so ${a} − ${b} = ${answer}! 💡`,
        ];
    }

    // Bigger numbers: break apart
    if (b > 10) {
        const bTens = Math.floor(b / 10) * 10;
        const bOnes = b % 10;
        if (bTens > 0 && bOnes > 0) {
            const step1 = a - bTens;
            return [
                `Break ${b} into ${bTens} + ${bOnes} 🧩`,
                `First: ${a} − ${bTens} = ${step1}`,
                `Then: ${step1} − ${bOnes} = ${answer}! 🎉`,
            ];
        }
    }

    // Default: think addition fallback
    return [
        `Think addition! ${b} + ? = ${a} 🤔`,
        `What number added to ${b} gives you ${a}?`,
    ];
}

// ===== Hint UI =====
function showHint() {
    if (state.hintStep >= state.hintSteps.length) return;

    playSound('click');
    const stepsContainer = document.getElementById('hint-steps');
    const hintBtn = document.getElementById('hint-btn');

    // Reveal next hint step
    const stepDiv = document.createElement('div');
    stepDiv.className = 'hint-step';
    const stepLabel = document.createElement('span');
    stepLabel.className = 'hint-label';
    stepLabel.textContent = state.hintStep === 0 ? 'Hint' : `Step ${state.hintStep + 1}`;
    stepDiv.appendChild(stepLabel);
    stepDiv.appendChild(document.createTextNode(state.hintSteps[state.hintStep]));
    stepsContainer.appendChild(stepDiv);

    state.hintStep++;

    // Update button text
    if (state.hintStep >= state.hintSteps.length) {
        hintBtn.textContent = '💡 No more hints';
        hintBtn.classList.add('exhausted');
    } else {
        hintBtn.textContent = '💡 Next Hint';
    }

    // Update mascot (don't double-speak; speak the hint content instead)
    setMascotMessage("Let me help you think! 🧠", false);
    speak(state.hintSteps[state.hintStep - 1]);
}

function resetHints() {
    state.hintStep = 0;
    const stepsContainer = document.getElementById('hint-steps');
    stepsContainer.innerHTML = '';
    const hintBtn = document.getElementById('hint-btn');
    hintBtn.textContent = '💡 Hint';
    hintBtn.classList.remove('exhausted');
}

// ===== Interactive Number Line =====
// Kid taps each number to hop along the line — they do the counting!
let nlState = null; // number line state for current problem
let tfState = null; // ten frame state for current problem

function showNumberLine() {
    if (state.usedNumberLine) return;

    playSound('click');
    state.usedNumberLine = true;

    // Compact the problem card to make room
    document.getElementById('problem-card').classList.add('compact');
    document.getElementById('mascot-speech').classList.add('compact-hidden');

    const btn = document.getElementById('numberline-btn');
    btn.textContent = '📏 Tap to count!';
    btn.classList.add('used');

    const problem = state.currentProblem;
    const isAddition = problem.type === 'addition';
    const startAt = isAddition ? Math.max(problem.a, problem.b) : problem.a;
    const hopCount = isAddition ? Math.min(problem.a, problem.b) : problem.b;

    nlState = {
        isAddition,
        startAt,
        hopCount,
        currentPos: startAt,  // where we are now
        hopsCompleted: 0,
        answer: problem.answer,
        rangeMin: 0,
        rangeMax: 20,
    };

    // Calculate range
    if (state.difficulty === 'easy') {
        nlState.rangeMin = 0;
        nlState.rangeMax = 20;
    } else {
        const lo = Math.min(startAt, problem.answer);
        const hi = Math.max(startAt, problem.answer);
        nlState.rangeMin = Math.max(0, lo - 3);
        nlState.rangeMax = hi + 3;
        if (nlState.rangeMax - nlState.rangeMin < 12) nlState.rangeMax = nlState.rangeMin + 12;
    }

    const area = document.getElementById('numberline-area');
    area.style.display = '';
    area.innerHTML = '';

    const svg = buildNumberLineSVG();
    area.appendChild(svg);

    const direction = isAddition ? 'Count forward! Tap the next number →' : 'Count backward! Tap the next number ←';
    setMascotMessage(direction + ' 🐸', false);
}

function resetNumberLine() {
    state.usedNumberLine = false;
    nlState = null;
    const area = document.getElementById('numberline-area');
    if (area) {
        area.style.display = 'none';
        area.innerHTML = '';
    }
    const btn = document.getElementById('numberline-btn');
    if (btn) {
        btn.textContent = '📏 Number Line';
        btn.classList.remove('used');
    }
    // Remove compact mode
    document.getElementById('problem-card').classList.remove('compact');
    document.getElementById('mascot-speech').classList.remove('compact-hidden');
}

function buildNumberLineSVG() {
    const { isAddition, startAt, rangeMin, rangeMax } = nlState;
    const W = 750, PAD = 35, usable = W - 2 * PAD;
    const BASELINE = isAddition ? 120 : 50;
    const H = 170;
    const NS = 'http://www.w3.org/2000/svg';

    function nx(n) {
        return PAD + ((n - rangeMin) / (rangeMax - rangeMin)) * usable;
    }

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'number-line-svg');

    // Main horizontal line
    const mainLine = document.createElementNS(NS, 'line');
    mainLine.setAttribute('x1', PAD);
    mainLine.setAttribute('y1', BASELINE);
    mainLine.setAttribute('x2', W - PAD);
    mainLine.setAttribute('y2', BASELINE);
    mainLine.setAttribute('stroke', '#6C63FF');
    mainLine.setAttribute('stroke-width', '3.5');
    mainLine.setAttribute('stroke-linecap', 'round');
    svg.appendChild(mainLine);

    // Tick marks, labels, and tap targets
    const labelSize = (rangeMax - rangeMin) > 15 ? '14' : '17';
    for (let n = rangeMin; n <= rangeMax; n++) {
        const x = nx(n);

        // Tick mark
        const tick = document.createElementNS(NS, 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', BASELINE - 10);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', BASELINE + 10);
        tick.setAttribute('stroke', '#6C63FF');
        tick.setAttribute('stroke-width', '2.5');
        svg.appendChild(tick);

        // Label (below for addition, above for subtraction)
        const labelY = isAddition ? BASELINE + 30 : BASELINE - 18;
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', labelY);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', labelSize);
        label.setAttribute('font-weight', n === startAt ? '800' : '600');
        label.setAttribute('fill', n === startAt ? '#FF914D' : '#636E72');
        label.setAttribute('data-nl-num', n);
        label.setAttribute('cursor', 'pointer');
        label.setAttribute('style', 'user-select: none; -webkit-user-select: none;');
        label.textContent = n;
        label.addEventListener('click', () => handleNumberLineTap(n));
        label.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleNumberLineTap(n);
        });
        svg.appendChild(label);

        // Invisible tap target (larger hit area)
        const tapTarget = document.createElementNS(NS, 'circle');
        tapTarget.setAttribute('cx', x);
        tapTarget.setAttribute('cy', BASELINE);
        tapTarget.setAttribute('r', '22');
        tapTarget.setAttribute('fill', 'transparent');
        tapTarget.setAttribute('cursor', 'pointer');
        tapTarget.setAttribute('data-nl-tap', n);
        tapTarget.addEventListener('click', () => handleNumberLineTap(n));
        tapTarget.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleNumberLineTap(n);
        });
        svg.appendChild(tapTarget);
    }

    // Starting point marker (orange)
    const startMarker = document.createElementNS(NS, 'circle');
    startMarker.setAttribute('cx', nx(startAt));
    startMarker.setAttribute('cy', BASELINE);
    startMarker.setAttribute('r', '9');
    startMarker.setAttribute('fill', '#FF914D');
    startMarker.setAttribute('stroke', '#fff');
    startMarker.setAttribute('stroke-width', '2.5');
    startMarker.id = 'nl-current-marker';
    svg.appendChild(startMarker);

    return svg;
}

function handleNumberLineTap(n) {
    if (!nlState || nlState.hopsCompleted >= nlState.hopCount) return;

    const { isAddition, currentPos, hopCount, rangeMin, rangeMax } = nlState;
    const expectedNext = isAddition ? currentPos + 1 : currentPos - 1;

    if (n === expectedNext) {
        // Correct tap! Draw arc and advance
        nlState.hopsCompleted++;
        nlState.currentPos = n;

        playSound('hop');
        drawHopArc(currentPos, n);
        moveMarker(n);

        // Update hop counter in mascot
        const remaining = hopCount - nlState.hopsCompleted;
        if (remaining > 0) {
            setMascotMessage(`${nlState.hopsCompleted} hop${nlState.hopsCompleted > 1 ? 's' : ''}! ${remaining} more to go! 🐸`, false);
        }

        // Check if done
        if (nlState.hopsCompleted >= hopCount) {
            // All hops complete — show green answer marker
            setTimeout(() => {
                const marker = document.getElementById('nl-current-marker');
                if (marker) {
                    marker.setAttribute('fill', '#43e97b');
                    marker.setAttribute('r', '9');
                    marker.classList.add('visible');
                }
                // Highlight answer label green
                document.querySelectorAll('[data-nl-num]').forEach(el => {
                    if (parseInt(el.getAttribute('data-nl-num')) === n) {
                        el.setAttribute('fill', '#2E7D32');
                        el.setAttribute('font-weight', '800');
                    }
                });
                setMascotMessage(`You got to ${n}! Now type your answer! 🎉`, false);
                speak(`${n}!`);
            }, 200);
        }
    } else {
        // Wrong tap — reset back to start!
        playSound('wrong');
        const svg = document.querySelector('.number-line-svg');
        if (svg) {
            svg.classList.add('nl-shake');
            setTimeout(() => svg.classList.remove('nl-shake'), 400);
        }

        // Remove all drawn arcs and labels
        document.querySelectorAll('.hop-arc, .hop-label').forEach(el => el.remove());

        // Reset state back to beginning
        nlState.currentPos = nlState.startAt;
        nlState.hopsCompleted = 0;

        // Move marker back to start
        moveMarker(nlState.startAt);

        const direction = isAddition ? 'forward' : 'backward';
        setMascotMessage(`Oops! Back to ${nlState.startAt}. Count ${direction}! 🤔`, false);
    }
}

function drawHopArc(fromN, toN) {
    const { isAddition, rangeMin, rangeMax } = nlState;
    const svg = document.querySelector('.number-line-svg');
    if (!svg) return;

    const W = 750, PAD = 35, usable = W - 2 * PAD;
    const BASELINE = isAddition ? 120 : 50;
    const arcHeight = state.difficulty === 'easy' ? 42 : 38;
    const NS = 'http://www.w3.org/2000/svg';

    function nx(n) {
        return PAD + ((n - rangeMin) / (rangeMax - rangeMin)) * usable;
    }

    const x1 = nx(fromN);
    const x2 = nx(toN);
    const cx = (x1 + x2) / 2;
    const cy = isAddition ? BASELINE - arcHeight : BASELINE + arcHeight;

    // Draw arc
    const arc = document.createElementNS(NS, 'path');
    arc.setAttribute('d', `M ${x1} ${BASELINE} Q ${cx} ${cy} ${x2} ${BASELINE}`);
    arc.setAttribute('class', 'hop-arc visible');
    arc.setAttribute('stroke', '#6C63FF');
    arc.setAttribute('stroke-width', '3');
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke-linecap', 'round');

    // Insert arc BEFORE the current marker so marker stays on top
    const marker = document.getElementById('nl-current-marker');
    svg.insertBefore(arc, marker);

    // Hop count label at apex
    const hopLabel = document.createElementNS(NS, 'text');
    hopLabel.setAttribute('x', cx);
    hopLabel.setAttribute('y', isAddition ? cy - 5 : cy + 16);
    hopLabel.setAttribute('text-anchor', 'middle');
    hopLabel.setAttribute('font-size', '13');
    hopLabel.setAttribute('font-weight', '700');
    hopLabel.setAttribute('fill', '#6C63FF');
    hopLabel.setAttribute('class', 'hop-label visible');
    hopLabel.textContent = nlState.hopsCompleted;
    svg.insertBefore(hopLabel, marker);
}

function moveMarker(toN) {
    const { rangeMin, rangeMax } = nlState;
    const W = 750, PAD = 35, usable = W - 2 * PAD;

    function nx(n) {
        return PAD + ((n - rangeMin) / (rangeMax - rangeMin)) * usable;
    }

    const marker = document.getElementById('nl-current-marker');
    if (marker) {
        marker.setAttribute('cx', nx(toN));
    }
}

// ===== Interactive Ten Frames =====
// Kid taps cells to add or remove dots — visual counting aid!

function showTenFrames() {
    if (state.usedTenFrames) return;

    playSound('click');
    state.usedTenFrames = true;

    // Compact the problem card to make room
    document.getElementById('problem-card').classList.add('compact');
    document.getElementById('mascot-speech').classList.add('compact-hidden');

    const btn = document.getElementById('tenframe-btn');
    btn.textContent = '🔟 Tap cells!';
    btn.classList.add('used');

    const problem = state.currentProblem;
    const isAddition = problem.type === 'addition';
    const isLevel2 = (state.difficulty === 'medium');

    let firstNum, secondNum, tensCarry;

    if (isLevel2) {
        firstNum = problem.a % 10;
        tensCarry = Math.floor(problem.a / 10) * 10;
        secondNum = problem.b;

        // Skip ten frames for Level 2 subtraction with borrowing
        if (!isAddition && firstNum < secondNum) {
            state.usedTenFrames = false;
            btn.textContent = '🔟 Ten Frame';
            btn.classList.remove('used');
            document.getElementById('problem-card').classList.remove('compact');
            document.getElementById('mascot-speech').classList.remove('compact-hidden');
            setMascotMessage("This one needs borrowing — try the hint! 💡", true);
            return;
        }
    } else {
        firstNum = problem.a;
        secondNum = problem.b;
        tensCarry = 0;
    }

    const needsTwoFrames = isAddition && (firstNum + secondNum > 10);

    tfState = {
        isAddition,
        firstNum,
        secondNum,
        answer: problem.answer,
        tapsCompleted: 0,
        targetTaps: secondNum,
        cellStates: [],
        needsTwoFrames,
        isLevel2,
        tensCarry,
    };

    // Initialize cell states
    const totalCells = needsTwoFrames ? 20 : 10;
    tfState.cellStates = new Array(totalCells).fill('empty');

    // Fill first number's dots (blue)
    for (let i = 0; i < firstNum; i++) {
        tfState.cellStates[i] = 'filled-blue';
    }

    const area = document.getElementById('tenframes-area');
    area.style.display = '';
    area.innerHTML = '';

    const svg = buildTenFramesSVG();
    area.appendChild(svg);

    // Status text
    const statusDiv = document.createElement('div');
    statusDiv.className = 'tf-status';
    statusDiv.id = 'tf-status';
    if (isLevel2) {
        if (isAddition) {
            statusDiv.textContent = `${tensCarry} + ones → Tap ${secondNum} empty cells!`;
        } else {
            statusDiv.textContent = `${tensCarry} + ones → Tap ${secondNum} dots to remove!`;
        }
    }
    if (isLevel2) area.appendChild(statusDiv);

    // Mascot instruction
    if (isAddition) {
        setMascotMessage(`Tap ${secondNum} empty cells to add dots! 🟠`, false);
    } else {
        setMascotMessage(`Tap ${secondNum} blue dots to take away! ❌`, false);
    }
}

function buildTenFramesSVG() {
    const NS = 'http://www.w3.org/2000/svg';
    const CELL = 54;
    const GAP = 6;
    const PAD = 15;
    const COLS = 5;
    const ROWS = 2;
    const FRAME_GAP = 24;
    const CORNER_R = 8;

    const frameW = COLS * (CELL + GAP) - GAP;
    const frameH = ROWS * (CELL + GAP) - GAP;

    const twoFrames = tfState.needsTwoFrames;
    const svgW = twoFrames
        ? 2 * frameW + FRAME_GAP + 2 * PAD
        : frameW + 2 * PAD;

    const labelH = tfState.isLevel2 ? 30 : 0;
    const svgH = frameH + 2 * PAD + labelH;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.setAttribute('class', 'ten-frame-svg');

    // Level 2 label
    if (tfState.isLevel2) {
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', svgW / 2);
        label.setAttribute('y', 22);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '18');
        label.setAttribute('font-weight', '700');
        label.setAttribute('fill', '#6C63FF');
        label.textContent = `${tfState.tensCarry} + ones:`;
        svg.appendChild(label);
    }

    const yOff = labelH;

    for (let frame = 0; frame < (twoFrames ? 2 : 1); frame++) {
        const fxOff = frame === 0
            ? PAD
            : PAD + frameW + FRAME_GAP;

        // Frame border
        const border = document.createElementNS(NS, 'rect');
        border.setAttribute('x', fxOff - 4);
        border.setAttribute('y', yOff + PAD - 4);
        border.setAttribute('width', frameW + 8);
        border.setAttribute('height', frameH + 8);
        border.setAttribute('rx', '12');
        border.setAttribute('ry', '12');
        border.setAttribute('fill', 'none');
        border.setAttribute('stroke', '#6C63FF');
        border.setAttribute('stroke-width', '3');
        border.setAttribute('opacity', '0.25');
        svg.appendChild(border);

        // Draw 10 cells
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const idx = frame * 10 + row * COLS + col;
                const cx = fxOff + col * (CELL + GAP) + CELL / 2;
                const cy = yOff + PAD + row * (CELL + GAP) + CELL / 2;
                const rx = fxOff + col * (CELL + GAP);
                const ry = yOff + PAD + row * (CELL + GAP);

                // Cell background
                const cellRect = document.createElementNS(NS, 'rect');
                cellRect.setAttribute('x', rx);
                cellRect.setAttribute('y', ry);
                cellRect.setAttribute('width', CELL);
                cellRect.setAttribute('height', CELL);
                cellRect.setAttribute('rx', CORNER_R);
                cellRect.setAttribute('ry', CORNER_R);
                cellRect.setAttribute('fill', '#f0f0f0');
                cellRect.setAttribute('stroke', '#ddd');
                cellRect.setAttribute('stroke-width', '1.5');
                cellRect.setAttribute('data-tf-cell', idx);
                svg.appendChild(cellRect);

                // Pre-filled blue dot
                if (tfState.cellStates[idx] === 'filled-blue') {
                    const dot = document.createElementNS(NS, 'circle');
                    dot.setAttribute('cx', cx);
                    dot.setAttribute('cy', cy);
                    dot.setAttribute('r', '20');
                    dot.setAttribute('fill', '#4A90D9');
                    dot.setAttribute('data-tf-dot', idx);
                    svg.appendChild(dot);
                }

                // Tap target (full cell)
                const tap = document.createElementNS(NS, 'rect');
                tap.setAttribute('x', rx);
                tap.setAttribute('y', ry);
                tap.setAttribute('width', CELL);
                tap.setAttribute('height', CELL);
                tap.setAttribute('fill', 'transparent');
                tap.setAttribute('cursor', 'pointer');
                tap.setAttribute('style', 'user-select: none; -webkit-user-select: none;');
                tap.setAttribute('data-tf-tap', idx);
                tap.addEventListener('click', () => handleTenFrameTap(idx));
                tap.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    handleTenFrameTap(idx);
                });
                svg.appendChild(tap);
            }
        }
    }

    return svg;
}

function handleTenFrameTap(cellIndex) {
    if (!tfState || tfState.tapsCompleted >= tfState.targetTaps) return;

    const cellState = tfState.cellStates[cellIndex];

    if (tfState.isAddition) {
        // Addition: tap empty cells to place orange dots
        if (cellState !== 'empty') return; // silently ignore filled cells

        tfState.cellStates[cellIndex] = 'filled-orange';
        tfState.tapsCompleted++;
        playSound('hop');
        drawTenFrameDot(cellIndex, '#FF914D');

        if (tfState.tapsCompleted >= tfState.targetTaps) {
            handleTenFrameComplete();
        } else {
            const rem = tfState.targetTaps - tfState.tapsCompleted;
            setMascotMessage(`${tfState.tapsCompleted} added! ${rem} more! 🟠`, false);
        }
    } else {
        // Subtraction: tap blue dots to remove them
        if (cellState !== 'filled-blue') return; // ignore empty/already removed

        tfState.cellStates[cellIndex] = 'removed';
        tfState.tapsCompleted++;
        playSound('hop');
        removeTenFrameDot(cellIndex);

        if (tfState.tapsCompleted >= tfState.targetTaps) {
            handleTenFrameComplete();
        } else {
            const rem = tfState.targetTaps - tfState.tapsCompleted;
            setMascotMessage(`${tfState.tapsCompleted} removed! ${rem} more! ❌`, false);
        }
    }
}

function drawTenFrameDot(cellIndex, color) {
    const svg = document.querySelector('.ten-frame-svg');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';

    const cellRect = svg.querySelector(`[data-tf-cell="${cellIndex}"]`);
    if (!cellRect) return;

    const x = parseFloat(cellRect.getAttribute('x')) + 27; // center of 54px cell
    const y = parseFloat(cellRect.getAttribute('y')) + 27;

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', '20');
    dot.setAttribute('fill', color);
    dot.setAttribute('data-tf-dot', cellIndex);
    dot.classList.add('tf-dot-appear');

    const tapTarget = svg.querySelector(`[data-tf-tap="${cellIndex}"]`);
    svg.insertBefore(dot, tapTarget);
}

function removeTenFrameDot(cellIndex) {
    const svg = document.querySelector('.ten-frame-svg');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';

    const dot = svg.querySelector(`[data-tf-dot="${cellIndex}"]`);
    if (!dot) return;

    dot.classList.add('tf-dot-remove');
    dot.setAttribute('fill', '#ccc');

    const cx = parseFloat(dot.getAttribute('cx'));
    const cy = parseFloat(dot.getAttribute('cy'));
    const xMark = document.createElementNS(NS, 'text');
    xMark.setAttribute('x', cx);
    xMark.setAttribute('y', cy + 7);
    xMark.setAttribute('text-anchor', 'middle');
    xMark.setAttribute('font-size', '30');
    xMark.setAttribute('font-weight', '800');
    xMark.setAttribute('fill', '#FF6B6B');
    xMark.textContent = '✕';
    xMark.classList.add('tf-dot-appear');

    const tapTarget = svg.querySelector(`[data-tf-tap="${cellIndex}"]`);
    svg.insertBefore(xMark, tapTarget);
}

function handleTenFrameComplete() {
    setTimeout(() => {
        const resultNum = tfState.answer;

        const statusEl = document.getElementById('tf-status');
        if (statusEl) {
            statusEl.textContent = `You got ${resultNum}! Now type your answer! 🎉`;
        } else {
            // Create status if not Level 2
            const area = document.getElementById('tenframes-area');
            const statusDiv = document.createElement('div');
            statusDiv.className = 'tf-status';
            statusDiv.id = 'tf-status';
            statusDiv.textContent = `You got ${resultNum}! Now type your answer! 🎉`;
            area.appendChild(statusDiv);
        }

        setMascotMessage(`You got ${resultNum}! Now type your answer! 🎉`, false);

        const svg = document.querySelector('.ten-frame-svg');
        if (svg) {
            svg.style.boxShadow = '0 4px 15px rgba(0, 184, 148, 0.4)';
            svg.style.border = '2px solid #00b894';
        }
    }, 300);
}

function resetTenFrames() {
    state.usedTenFrames = false;
    tfState = null;
    const area = document.getElementById('tenframes-area');
    if (area) {
        area.style.display = 'none';
        area.innerHTML = '';
    }
    const btn = document.getElementById('tenframe-btn');
    if (btn) {
        btn.textContent = '🔟 Ten Frame';
        btn.classList.remove('used');
    }
    // Remove compact mode
    document.getElementById('problem-card').classList.remove('compact');
    document.getElementById('mascot-speech').classList.remove('compact-hidden');
}

// ===== Screen Management =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ===== Difficulty Selection =====
function setDifficulty(diff, btn) {
    state.difficulty = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playSound('click');
}

// ===== Start Game =====
function startGame(mode) {
    playSound('click');

    // iOS Safari: voices only load after user gesture.
    // Force re-detection and kick-start speech engine with a silent utterance.
    if ('speechSynthesis' in window) {
        voiceCacheReady = false;
        cachedVoice = null;
        window.speechSynthesis.getVoices(); // trigger load
        pickVoice();

        // Silent utterance to unlock speech on iOS
        const silent = new SpeechSynthesisUtterance('');
        silent.volume = 0;
        window.speechSynthesis.speak(silent);

        // Retry voice pick after a short delay (iOS may need time)
        setTimeout(() => {
            voiceCacheReady = false;
            cachedVoice = null;
            pickVoice();
        }, 500);
    }

    state.mode = mode;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.questionNumber = 0;
    state.correctAnswers = 0;
    state.sessionRobux = 0;

    updateScoreDisplay();
    updateStreakDisplay();
    updateProgress();
    updateRobuxDisplay();

    showScreen('game-screen');
    setMascotMessage(randomChoice(MESSAGES.start));
    nextProblem();
}

// ===== Problem Generation with Confidence-Building Bias =====
// On easy mode, ~60% of problems are "confidence builders" (doubles, +1, +2, 10+X)
// This helps build familiarity with key patterns before harder problems.

const CONFIDENCE_PATTERNS = {
    addition: [
        // Doubles: 1+1 through 10+10
        () => { const n = randomInt(1, 10); return { a: n, b: n }; },
        // Plus 1
        () => { const n = randomInt(1, 9); return { a: n, b: 1 }; },
        // Plus 2
        () => { const n = randomInt(1, 8); return { a: n, b: 2 }; },
        // 10 + X
        () => ({ a: 10, b: randomInt(1, 9) }),
        // Near doubles (differ by 1)
        () => { const n = randomInt(2, 9); return { a: n, b: n - 1 }; },
        // Make 10 with 9
        () => ({ a: 9, b: randomInt(1, 9) }),
    ],
    subtraction: [
        // Minus 1
        () => { const n = randomInt(2, 10); return { a: n, b: 1 }; },
        // Minus 2
        () => { const n = randomInt(3, 10); return { a: n, b: 2 }; },
        // Minus itself (= 0)
        () => { const n = randomInt(1, 10); return { a: n, b: n }; },
        // From 10
        () => ({ a: 10, b: randomInt(1, 9) }),
        // Minus 9 (near 10)
        () => ({ a: randomInt(10, 18), b: 9 }),
    ],
};

function generateProblem() {
    const range = RANGES[state.difficulty];
    let type = state.mode;

    if (type === 'mixed') {
        type = Math.random() < 0.5 ? 'addition' : 'subtraction';
    }

    let a, b, answer, operator;

    // On easy, 60% chance of confidence-building patterns
    const useConfidence = (state.difficulty === 'easy' && Math.random() < 0.6);

    if (useConfidence) {
        const patterns = CONFIDENCE_PATTERNS[type];
        const pattern = randomChoice(patterns);
        ({ a, b } = pattern());

        if (type === 'addition') {
            answer = a + b;
            operator = '+';
        } else {
            // Ensure a >= b
            if (a < b) [a, b] = [b, a];
            answer = a - b;
            operator = '−';
        }
    } else if (state.difficulty === 'medium') {
        // Level 2: one 1-2 digit number and one 1-digit number
        const big = randomInt(10, 99);  // 1-2 digit number (10-99)
        const small = randomInt(1, 9);  // single digit

        if (type === 'addition') {
            a = big;
            b = small;
            answer = a + b;
            operator = '+';
        } else {
            a = big;
            b = small;
            answer = a - b;
            operator = '−';
        }
    } else if (type === 'addition') {
        // Easy: single digits
        a = randomInt(range.min, range.max);
        b = randomInt(range.min, range.max);
        answer = a + b;
        operator = '+';
    } else {
        // Easy subtraction: ensure a >= b so no negative results
        a = randomInt(range.min, range.max);
        b = randomInt(range.min, a);
        answer = a - b;
        operator = '−';
    }

    return { a, b, answer, operator, type };
}

// ===== Next Problem =====
function nextProblem() {
    if (state.questionNumber >= state.totalQuestions) {
        showResults();
        return;
    }

    state.questionNumber++;
    state.attempts = 0;
    state.currentProblem = generateProblem();
    state.hintSteps = getHints(state.currentProblem);
    resetHints();
    resetNumberLine();
    resetTenFrames();

    const { a, b, operator } = state.currentProblem;

    document.getElementById('num1').textContent = a;
    document.getElementById('operator').textContent = operator;
    document.getElementById('num2').textContent = b;

    const input = document.getElementById('answer-input');
    input.value = '';
    input.focus();

    const card = document.getElementById('problem-card');
    card.classList.remove('correct', 'wrong');
    hideCorrectAnswer();

    updateProgress();

    // Slide-in animation
    card.style.animation = 'none';
    card.offsetHeight; // trigger reflow
    card.style.animation = 'fadeIn 0.4s ease';

    // Read the problem aloud
    const spokenOp = state.currentProblem.type === 'addition' ? 'plus' : 'minus';
    speak(`${a} ${spokenOp} ${b}?`);
}

// ===== Check Answer =====
function checkAnswer() {
    const input = document.getElementById('answer-input');
    const userAnswer = parseInt(input.value);

    if (isNaN(userAnswer) || input.value === '') {
        // Shake the input if empty
        input.style.animation = 'none';
        input.offsetHeight;
        input.style.animation = 'shake 0.4s ease';
        return;
    }

    const card = document.getElementById('problem-card');
    state.attempts++;

    if (userAnswer === state.currentProblem.answer) {
        // Correct! Points decrease with hints used and retry attempts
        const hintPenalty = [10, 7, 5, 3];
        const basePoints = hintPenalty[Math.min(state.hintStep, hintPenalty.length - 1)];
        const points = state.attempts === 1 ? basePoints : Math.max(Math.floor(basePoints / 2), 1);
        state.score += points;
        state.streak++;
        state.correctAnswers++;
        if (state.streak > state.bestStreak) {
            state.bestStreak = state.streak;
        }

        // Robux reward for Hakan (no reward if hints or number line were used)
        if (currentUser === 'hakan' && state.hintStep === 0 && !state.usedNumberLine && !state.usedTenFrames) {
            const robuxEarned = ROBUX_BY_LEVEL[state.difficulty] || 0.50;

            const currentRobux = loadRobux();
            const newRobux = Math.round((currentRobux + robuxEarned) * 100) / 100;
            saveRobux(newRobux);
            state.sessionRobux = Math.round((state.sessionRobux + robuxEarned) * 100) / 100;
            updateRobuxDisplay();
        }

        card.classList.add('correct');
        playSound('correct');

        // Show encouragement
        let message;
        if (state.streak >= 3 && state.streak % 3 === 0) {
            message = randomChoice(MESSAGES.streak) + ` (${state.streak} in a row!)`;
        } else {
            message = randomChoice(MESSAGES.correct);
        }
        setMascotMessage(message);

        // Floating stars
        spawnFloatingStars(3);

        // Show the correct answer celebration underneath the problem
        showCorrectAnswer(state.currentProblem, points);

        updateScoreDisplay();
        updateStreakDisplay();

        // Move to next problem after a delay so they can see the answer
        setTimeout(() => {
            hideCorrectAnswer();
            nextProblem();
        }, 2800);
    } else {
        // Wrong
        card.classList.add('wrong');
        playSound('wrong');
        state.streak = 0;
        updateStreakDisplay();

        setMascotMessage(randomChoice(MESSAGES.wrong));
        showFeedback('❌');

        // Clear input for retry
        setTimeout(() => {
            card.classList.remove('wrong');
            input.value = '';
            input.focus();
        }, 800);

        // After 3 wrong attempts, show the answer
        if (state.attempts >= 3) {
            setMascotMessage(`The answer is ${state.currentProblem.answer}. Let's try the next one! 📖`);
            setTimeout(() => {
                nextProblem();
            }, 2500);
        }
    }
}

// ===== UI Updates =====
function updateScoreDisplay() {
    document.getElementById('score').textContent = state.score;
}

function updateStreakDisplay() {
    document.getElementById('streak-text').textContent = `🔥 ${state.streak}`;
}

function updateProgress() {
    const pct = ((state.questionNumber - 1) / state.totalQuestions) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-text').textContent =
        `${state.questionNumber} / ${state.totalQuestions}`;
}

function setMascotMessage(msg, alsoSpeak = true) {
    document.getElementById('mascot-message').textContent = msg;
    if (alsoSpeak) speak(msg);
}

// ===== Feedback Popup =====
function showFeedback(content) {
    const overlay = document.getElementById('feedback-overlay');
    const contentEl = document.getElementById('feedback-content');
    contentEl.textContent = content;
    overlay.classList.remove('hidden');

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 1000);
}

// ===== Correct Answer Celebration =====
function showCorrectAnswer(problem, points) {
    const input = document.getElementById('answer-input');
    const answerBox = input.closest('.answer-box');
    const display = document.getElementById('correct-answer-display');
    const eqSpan = document.getElementById('correct-eq');

    // Hide the input and show the big animated answer in its place
    input.style.display = 'none';

    // Create the answer number that replaces the input
    const answerNum = document.createElement('span');
    answerNum.id = 'answer-revealed';
    answerNum.className = 'answer-revealed';
    answerNum.textContent = problem.answer;
    answerBox.appendChild(answerNum);

    // Show the celebration display underneath with points
    eqSpan.textContent = `${problem.a} ${problem.operator} ${problem.b} = ${problem.answer}`;
    const starsDiv = display.querySelector('.correct-answer-stars');
    if (points >= 10) {
        starsDiv.textContent = '🌟 Perfect! +' + points + ' 🌟';
    } else if (points >= 5) {
        starsDiv.textContent = '⭐ Great! +' + points;
    } else {
        starsDiv.textContent = '✨ +' + points;
    }

    // Force reflow to restart animation, then show
    display.classList.remove('show');
    void display.offsetWidth;
    display.classList.add('show');
}

function hideCorrectAnswer() {
    const input = document.getElementById('answer-input');
    const display = document.getElementById('correct-answer-display');
    const existing = document.getElementById('answer-revealed');

    // Remove the revealed answer and restore input
    if (existing) existing.remove();
    input.style.display = '';
    display.classList.remove('show');
}

// ===== Floating Stars =====
function spawnFloatingStars(count) {
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'floating-star';
        star.textContent = randomChoice(['⭐', '🌟', '✨', '💫']);
        star.style.left = (Math.random() * 80 + 10) + '%';
        star.style.top = (Math.random() * 40 + 30) + '%';
        document.body.appendChild(star);

        setTimeout(() => star.remove(), 1500);
    }
}

// ===== Number Pad =====
function typeNumber(num) {
    playSound('click');
    const input = document.getElementById('answer-input');
    if (input.value.length < 3) {
        input.value += num;
    }
}

function deleteNumber() {
    playSound('click');
    const input = document.getElementById('answer-input');
    input.value = input.value.slice(0, -1);
}

// ===== Keyboard Support =====
function handleKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
    }
}

// ===== Navigation =====
function goHome() {
    playSound('click');
    // Refresh Robux displays on start screen
    if (currentUser === 'hakan') {
        const robux = loadRobux();
        document.getElementById('robux-total').textContent = robux.toFixed(2);
    } else if (currentUser === 'koray') {
        document.getElementById('admin-robux').textContent = loadRobux().toFixed(2);
    }
    showScreen('start-screen');
}

function playAgain() {
    playSound('click');
    startGame(state.mode);
}

// ===== Results Screen =====
function showResults() {
    playSound('win');

    const pct = state.correctAnswers / state.totalQuestions;

    // Title based on performance
    let title, badgeEmoji;
    if (pct === 1) {
        title = "🏆 PERFECT SCORE! 🏆";
        badgeEmoji = "🎓";
    } else if (pct >= 0.8) {
        title = "🎉 Great Job! 🎉";
        badgeEmoji = "👏";
    } else if (pct >= 0.5) {
        title = "👍 Good Try! 👍";
        badgeEmoji = "💪";
    } else {
        title = "Keep Practicing! 📚";
        badgeEmoji = "🤗";
    }

    document.getElementById('results-title').textContent = title;
    // Keep the photo, just update the badge
    const resultsMascot = document.getElementById('results-mascot');
    const existingBadge = resultsMascot.querySelector('.results-badge');
    if (existingBadge) existingBadge.remove();
    const badge = document.createElement('span');
    badge.className = 'results-badge';
    badge.textContent = badgeEmoji;
    resultsMascot.appendChild(badge);
    document.getElementById('final-score').textContent = state.score;
    document.getElementById('final-correct').textContent =
        `${state.correctAnswers} / ${state.totalQuestions}`;
    document.getElementById('final-streak').textContent = state.bestStreak;

    // Star rating
    const stars = Math.ceil(pct * 5);
    const starRating = document.getElementById('star-rating');
    starRating.textContent = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

    // Robux results (Hakan only)
    const robuxResults = document.getElementById('robux-results');
    if (currentUser === 'hakan') {
        document.getElementById('robux-session').textContent = state.sessionRobux.toFixed(2);
        document.getElementById('robux-total-result').textContent = loadRobux().toFixed(2);
        robuxResults.style.display = '';
    } else {
        robuxResults.style.display = 'none';
    }

    // Update progress to 100%
    document.getElementById('progress-fill').style.width = '100%';

    showScreen('results-screen');

    // Confetti!
    if (pct >= 0.5) {
        launchConfetti();
    }
}

// ===== Confetti =====
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                     '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                     '#BB8FCE', '#85C1E9'];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 6 + 3,
            color: randomChoice(colors),
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 6 - 3,
        });
    }

    let frame = 0;
    const maxFrames = 180; // ~3 seconds

    function animate() {
        if (frame >= maxFrames) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        frame++;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        // Fade out in last 30 frames
        if (frame > maxFrames - 30) {
            ctx.fillStyle = `rgba(0, 0, 0, ${(frame - (maxFrames - 30)) / 60})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        requestAnimationFrame(animate);
    }

    animate();
}

// ===== Resize confetti canvas on window resize =====
window.addEventListener('resize', () => {
    const canvas = document.getElementById('confetti-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
