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
};

// ===== Difficulty Ranges =====
const RANGES = {
    easy:   { min: 1, max: 10 },
    medium: { min: 1, max: 50 },
    hard:   { min: 1, max: 99 },
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
    utterance.pitch = 1.0;  // Natural pitch for male voice
    utterance.volume = 0.85;

    // Pick the best available male voice
    // Priority: Premium > Enhanced > Standard quality
    // Preferred male voices on Apple: Daniel, Aaron, Tom
    // On other platforms: Google UK English Male, Microsoft Guy, etc.
    const voice = pickVoice();
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
}

let cachedVoice = null;
let voiceCacheReady = false;

function pickVoice() {
    if (voiceCacheReady) return cachedVoice;

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Male voice names to look for (in priority order)
    const maleNames = ['Daniel', 'Aaron', 'Tom', 'Arthur', 'Ralph', 'Guy', 'James'];

    // 1. Best: Premium male English voice
    cachedVoice = voices.find(v =>
        v.lang.startsWith('en') && v.name.includes('(Premium)') &&
        maleNames.some(n => v.name.includes(n))
    );

    // 2. Good: Enhanced male English voice
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            v.lang.startsWith('en') && v.name.includes('(Enhanced)') &&
            maleNames.some(n => v.name.includes(n))
        );
    }

    // 3. Decent: Any Premium English voice
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            v.lang.startsWith('en') && v.name.includes('(Premium)')
        );
    }

    // 4. Any Enhanced English voice
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            v.lang.startsWith('en') && v.name.includes('(Enhanced)')
        );
    }

    // 5. Standard male voice by name (Daniel is Apple's best default male)
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            v.lang.startsWith('en') &&
            maleNames.some(n => v.name.includes(n))
        );
    }

    // 6. Google UK English Male (Chrome on any platform)
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            v.name.includes('Google UK English Male')
        );
    }

    // 7. Any voice with "Male" in the name
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            v.lang.startsWith('en') && /male/i.test(v.name)
        );
    }

    // 8. Fallback: any English voice
    if (!cachedVoice) {
        cachedVoice = voices.find(v => v.lang.startsWith('en'));
    }

    voiceCacheReady = true;
    return cachedVoice;
}

// Preload voices (some browsers load them async)
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        voiceCacheReady = false; // Reset cache when voices change
        pickVoice();             // Re-pick best voice
    };
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

    // Think addition
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
    state.mode = mode;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.questionNumber = 0;
    state.correctAnswers = 0;

    updateScoreDisplay();
    updateStreakDisplay();
    updateProgress();

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

    // On easy/medium, 50% chance of a confidence-building pattern
    const useConfidence = (state.difficulty === 'easy' && Math.random() < 0.6)
                       || (state.difficulty === 'medium' && Math.random() < 0.3);

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
    } else if (type === 'addition') {
        a = randomInt(range.min, range.max);
        b = randomInt(range.min, range.max);
        if (state.difficulty === 'easy' && a + b > 20) {
            b = randomInt(range.min, 10 - a > 0 ? 10 - a : range.min);
        }
        answer = a + b;
        operator = '+';
    } else {
        // Subtraction: ensure a >= b so no negative results
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

    const { a, b, operator } = state.currentProblem;

    document.getElementById('num1').textContent = a;
    document.getElementById('operator').textContent = operator;
    document.getElementById('num2').textContent = b;

    const input = document.getElementById('answer-input');
    input.value = '';
    input.focus();

    const card = document.getElementById('problem-card');
    card.classList.remove('correct', 'wrong');

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

        // Show feedback
        showFeedback('✅ ' + (state.attempts === 1 ? '+10' : '+5'));

        updateScoreDisplay();
        updateStreakDisplay();

        // Move to next problem after a short delay
        setTimeout(() => {
            nextProblem();
        }, 1200);
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
    let title, mascotEmoji;
    if (pct === 1) {
        title = "🏆 PERFECT SCORE! 🏆";
        mascotEmoji = "🦊🎓";
    } else if (pct >= 0.8) {
        title = "🎉 Great Job! 🎉";
        mascotEmoji = "🦊👏";
    } else if (pct >= 0.5) {
        title = "👍 Good Try! 👍";
        mascotEmoji = "🦊💪";
    } else {
        title = "Keep Practicing! 📚";
        mascotEmoji = "🦊🤗";
    }

    document.getElementById('results-title').textContent = title;
    document.getElementById('results-mascot').textContent = mascotEmoji;
    document.getElementById('final-score').textContent = state.score;
    document.getElementById('final-correct').textContent =
        `${state.correctAnswers} / ${state.totalQuestions}`;
    document.getElementById('final-streak').textContent = state.bestStreak;

    // Star rating
    const stars = Math.ceil(pct * 5);
    const starRating = document.getElementById('star-rating');
    starRating.textContent = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

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
