// ===== Lessons / Modules System =====
// Each module = lesson screens → guided practice (with hints) → quiz (scored)
// Re-uses Robux + sound + speech infrastructure from game.js.

// ---------- Module: Grade 1 — Place Value (Tens & Ones) ----------
const PLACE_VALUE_MODULE = {
    id: 'g1-place-value',
    title: 'Place Value: Tens & Ones',
    grade: 1,
    lesson: [
        {
            title: "Meet the Tens! 🧱",
            visual: { type: 'blocks', tens: 1, ones: 0 },
            text: "When you have <b>10</b> ones all together, you can group them into <b>1 TEN</b>. The tall blue bar is one ten — it has 10 little squares stacked up.",
            caption: "1 ten = 10 ones",
        },
        {
            title: "Tens and Ones Together",
            visual: { type: 'blocks', tens: 2, ones: 3 },
            text: "Two-digit numbers have <b>tens</b> and <b>ones</b>.<br>This picture shows <b>2 tens</b> and <b>3 ones</b>.",
            caption: "2 tens + 3 ones = 23",
        },
        {
            title: "Reading the Number",
            visual: { type: 'blocks', tens: 4, ones: 7 },
            text: "Count the <b>TENS</b> first, then the <b>ONES</b>.<br>4 tens make 40. Then add 7 more.",
            caption: "40 + 7 = 47",
        },
        {
            title: "What about zero ones?",
            visual: { type: 'blocks', tens: 6, ones: 0 },
            text: "If there are no orange ones, the number ends in <b>0</b>.<br>6 tens with 0 ones is just <b>60</b>.",
            caption: "6 tens + 0 ones = 60",
        },
    ],
    guided: [
        { type: 'whatNumber',   tens: 3, ones: 5,           answer: 35, hint: "3 tens makes 30. Add 5 more ones." },
        { type: 'whatNumber',   tens: 2, ones: 8,           answer: 28, hint: "2 tens = 20. Plus 8 ones …" },
        { type: 'howManyTens',  number: 47,                  answer: 4,  hint: "The TENS digit is the FIRST digit." },
        { type: 'howManyOnes',  number: 82,                  answer: 2,  hint: "The ONES digit is the LAST digit." },
        { type: 'whatNumber',   tens: 6, ones: 0,           answer: 60, hint: "6 tens with 0 ones is just 60." },
    ],
    quiz: [
        { type: 'whatNumber',   tens: 2, ones: 4, answer: 24 },
        { type: 'howManyTens',  number: 38,        answer: 3 },
        { type: 'whatNumber',   tens: 5, ones: 1, answer: 51 },
        { type: 'howManyOnes',  number: 56,        answer: 6 },
        { type: 'whatNumber',   tens: 7, ones: 6, answer: 76 },
        { type: 'howManyTens',  number: 90,        answer: 9 },
        { type: 'whatNumber',   tens: 4, ones: 0, answer: 40 },
        { type: 'howManyOnes',  number: 73,        answer: 3 },
        { type: 'whatNumber',   tens: 9, ones: 9, answer: 99 },
        { type: 'howManyTens',  number: 24,        answer: 2 },
    ],
};

const PV_ROBUX_PER_CORRECT = 4;

// ---------- Module State ----------
const pvState = {
    phase: null,          // 'lesson' | 'guided' | 'quiz' | 'transition'
    lessonIndex: 0,
    problemIndex: 0,
    answer: '',
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    sessionRobux: 0,
    hintShown: false,
    locked: false,        // ignore input while feedback animates
};

// ---------- Entry ----------
function startPlaceValueModule() {
    if (typeof playSound === 'function') playSound('click');
    if (typeof initSpeechOnGesture === 'function') initSpeechOnGesture();

    pvState.phase = 'lesson';
    pvState.lessonIndex = 0;
    pvState.problemIndex = 0;
    pvState.answer = '';
    pvState.score = 0;
    pvState.streak = 0;
    pvState.bestStreak = 0;
    pvState.correct = 0;
    pvState.sessionRobux = 0;
    pvState.hintShown = false;
    pvState.locked = false;

    showScreen('lesson-screen');
    renderLessonPage();
}

// ---------- Lesson Screens ----------
function renderLessonPage() {
    const total = PLACE_VALUE_MODULE.lesson.length;
    const page = PLACE_VALUE_MODULE.lesson[pvState.lessonIndex];
    const isFirst = pvState.lessonIndex === 0;
    const isLast = pvState.lessonIndex === total - 1;

    document.getElementById('lesson-title').textContent = page.title;
    document.getElementById('lesson-visual').innerHTML = renderVisual(page.visual);
    document.getElementById('lesson-text').innerHTML = page.text;
    document.getElementById('lesson-caption').textContent = page.caption;
    document.getElementById('lesson-progress').textContent = `Lesson ${pvState.lessonIndex + 1} / ${total}`;

    // Progress dots
    const dots = [];
    for (let i = 0; i < total; i++) {
        dots.push(`<span class="dot ${i === pvState.lessonIndex ? 'active' : i < pvState.lessonIndex ? 'done' : ''}"></span>`);
    }
    document.getElementById('lesson-dots').innerHTML = dots.join('');

    document.getElementById('lesson-back-btn').style.visibility = isFirst ? 'hidden' : '';
    document.getElementById('lesson-next-btn').textContent = isLast ? "Let's Practice! 🎯" : "Next ➡️";

    // Speak the lesson
    const plainText = page.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (typeof speak === 'function') speak(plainText);
}

function nextLessonPage() {
    if (typeof playSound === 'function') playSound('click');
    if (pvState.lessonIndex < PLACE_VALUE_MODULE.lesson.length - 1) {
        pvState.lessonIndex++;
        renderLessonPage();
    } else {
        startPlaceValueGuided();
    }
}

function prevLessonPage() {
    if (typeof playSound === 'function') playSound('click');
    if (pvState.lessonIndex > 0) {
        pvState.lessonIndex--;
        renderLessonPage();
    }
}

// ---------- Guided Practice ----------
function startPlaceValueGuided() {
    pvState.phase = 'guided';
    pvState.problemIndex = 0;
    pvState.streak = 0;
    showScreen('pv-game-screen');
    renderPVProblem();
}

// ---------- Quiz ----------
function startPlaceValueQuiz() {
    pvState.phase = 'quiz';
    pvState.problemIndex = 0;
    pvState.score = 0;
    pvState.streak = 0;
    pvState.bestStreak = 0;
    pvState.correct = 0;
    pvState.sessionRobux = 0;
    renderPVProblem();
}

// ---------- Problem rendering (shared by guided + quiz) ----------
function renderPVProblem() {
    const problems = pvState.phase === 'guided' ? PLACE_VALUE_MODULE.guided : PLACE_VALUE_MODULE.quiz;
    const problem = problems[pvState.problemIndex];
    const total = problems.length;

    pvState.answer = '';
    pvState.hintShown = false;
    pvState.locked = false;

    let visualHTML, questionText, spokenQuestion;

    if (problem.type === 'whatNumber') {
        visualHTML = renderBlocks(problem.tens, problem.ones);
        questionText = "What number is this?";
        spokenQuestion = `What number is this? It has ${problem.tens} tens and ${problem.ones} ones.`;
    } else if (problem.type === 'howManyTens') {
        visualHTML = renderTwoDigitNumber(problem.number, 'tens');
        questionText = "How many TENS?";
        spokenQuestion = `Look at ${problem.number}. How many tens?`;
    } else if (problem.type === 'howManyOnes') {
        visualHTML = renderTwoDigitNumber(problem.number, 'ones');
        questionText = "How many ONES?";
        spokenQuestion = `Look at ${problem.number}. How many ones?`;
    }

    document.getElementById('pv-question').textContent = questionText;
    document.getElementById('pv-visual').innerHTML = visualHTML;
    document.getElementById('pv-answer').textContent = '';

    // Phase indicator
    const phaseLabel = pvState.phase === 'guided' ? '🎯 Practice' : '⭐ Quiz';
    document.getElementById('pv-phase').textContent = phaseLabel;

    // Progress
    document.getElementById('pv-progress-text').textContent = `${pvState.problemIndex + 1} / ${total}`;
    document.getElementById('pv-progress-fill').style.width = `${(pvState.problemIndex / total) * 100}%`;

    // Score
    document.getElementById('pv-score').textContent = pvState.score;
    document.getElementById('pv-streak').textContent = `🔥 ${pvState.streak}`;

    // Robux display (Hakan only)
    const robuxDisplay = document.getElementById('pv-robux-display');
    if (typeof currentUser !== 'undefined' && currentUser === 'hakan') {
        robuxDisplay.style.display = '';
        const total = (typeof loadRobux === 'function' ? loadRobux() : 0);
        document.getElementById('pv-robux-game').textContent = total.toFixed(2);
    } else {
        robuxDisplay.style.display = 'none';
    }

    // Hint button visibility
    const hintBtn = document.getElementById('pv-hint-btn');
    if (pvState.phase === 'guided' && problem.hint) {
        hintBtn.style.display = '';
        hintBtn.classList.remove('exhausted');
    } else {
        hintBtn.style.display = 'none';
    }
    document.getElementById('pv-hint-text').textContent = '';

    if (typeof speak === 'function') speak(spokenQuestion);
}

// ---------- Hint ----------
function pvShowHint() {
    if (pvState.phase !== 'guided' || pvState.hintShown) return;
    const problem = PLACE_VALUE_MODULE.guided[pvState.problemIndex];
    if (!problem.hint) return;

    pvState.hintShown = true;
    document.getElementById('pv-hint-text').textContent = '💡 ' + problem.hint;
    document.getElementById('pv-hint-btn').classList.add('exhausted');
    if (typeof speak === 'function') speak(problem.hint);
    if (typeof playSound === 'function') playSound('click');
}

// ---------- Number pad ----------
function pvTypeNumber(digit) {
    if (pvState.locked) return;
    if (pvState.answer.length < 2) {
        pvState.answer += digit;
        document.getElementById('pv-answer').textContent = pvState.answer;
    }
}

function pvDeleteNumber() {
    if (pvState.locked) return;
    pvState.answer = pvState.answer.slice(0, -1);
    document.getElementById('pv-answer').textContent = pvState.answer;
}

function pvHandleKeyPress(e) {
    if (pvState.locked) return;
    if (e.key >= '0' && e.key <= '9') {
        pvTypeNumber(e.key);
        e.preventDefault();
    } else if (e.key === 'Backspace') {
        pvDeleteNumber();
        e.preventDefault();
    } else if (e.key === 'Enter') {
        pvCheckAnswer();
        e.preventDefault();
    }
}

// ---------- Check answer ----------
function pvCheckAnswer() {
    if (pvState.locked || pvState.answer === '') return;

    const problems = pvState.phase === 'guided' ? PLACE_VALUE_MODULE.guided : PLACE_VALUE_MODULE.quiz;
    const problem = problems[pvState.problemIndex];
    const userAnswer = parseInt(pvState.answer, 10);
    const correct = userAnswer === problem.answer;

    if (correct) {
        if (typeof playSound === 'function') playSound('correct');
        pvState.streak++;
        pvState.bestStreak = Math.max(pvState.bestStreak, pvState.streak);
        pvState.correct++;
        pvState.score += 10;

        // Award Robux for quiz only (matches existing modes — practice is free play)
        if (pvState.phase === 'quiz' && typeof currentUser !== 'undefined' && currentUser === 'hakan') {
            pvState.sessionRobux += PV_ROBUX_PER_CORRECT;
            if (typeof saveRobux === 'function' && typeof loadRobux === 'function') {
                saveRobux(loadRobux() + PV_ROBUX_PER_CORRECT);
            }
        }

        const msg = (typeof MESSAGES !== 'undefined') ? randomChoice(MESSAGES.correct) : 'Great!';
        showPVFeedback('correct', msg);
        if (typeof speak === 'function') speak(msg.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, '').trim());
        pvState.locked = true;
        setTimeout(() => advancePV(), 1500);

    } else {
        if (typeof playSound === 'function') playSound('wrong');
        pvState.streak = 0;
        const msg = (typeof MESSAGES !== 'undefined') ? randomChoice(MESSAGES.wrong) : 'Try again!';
        showPVFeedback('wrong', msg);
        if (typeof speak === 'function') speak(msg.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]/gu, '').trim());
        // Wrong answers don't advance — child retries
        pvState.answer = '';
        document.getElementById('pv-answer').textContent = '';
    }
}

function showPVFeedback(kind, msg) {
    const overlay = document.getElementById('pv-feedback-overlay');
    const content = document.getElementById('pv-feedback-content');
    if (!overlay || !content) return;
    content.textContent = (kind === 'correct' ? '✅ ' : '🤔 ') + msg;
    content.className = 'feedback-content ' + (kind === 'correct' ? 'fb-correct' : 'fb-wrong');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 1200);
}

// ---------- Advance ----------
function advancePV() {
    const problems = pvState.phase === 'guided' ? PLACE_VALUE_MODULE.guided : PLACE_VALUE_MODULE.quiz;
    pvState.problemIndex++;
    pvState.locked = false;

    if (pvState.problemIndex >= problems.length) {
        if (pvState.phase === 'guided') {
            showPVPhaseTransition();
        } else {
            showPVResults();
        }
    } else {
        renderPVProblem();
    }
}

function showPVPhaseTransition() {
    document.getElementById('pv-question').textContent = "Great practice! 🎉";
    document.getElementById('pv-visual').innerHTML = '<div class="pv-transition">Now the QUIZ.<br>10 questions, no hints —<br>earn 💎 4 each!</div>';
    document.getElementById('pv-answer').textContent = '';
    document.getElementById('pv-hint-text').textContent = '';
    document.getElementById('pv-hint-btn').style.display = 'none';
    if (typeof speak === 'function') speak("Great practice! Ready for the quiz?");
    pvState.locked = true;
    setTimeout(() => startPlaceValueQuiz(), 2500);
}

function showPVResults() {
    document.getElementById('results-title').textContent = '🎉 Module Complete! 🎉';
    document.getElementById('final-score').textContent = pvState.score;
    document.getElementById('final-correct').textContent = `${pvState.correct} / ${PLACE_VALUE_MODULE.quiz.length}`;
    document.getElementById('final-streak').textContent = pvState.bestStreak;

    const accuracy = pvState.correct / PLACE_VALUE_MODULE.quiz.length;
    const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    document.getElementById('star-rating').innerHTML = '⭐'.repeat(stars) + '<span class="dim-star">⭐</span>'.repeat(3 - stars);

    if (typeof currentUser !== 'undefined' && currentUser === 'hakan' && pvState.sessionRobux > 0) {
        document.getElementById('robux-results').style.display = '';
        document.getElementById('robux-session').textContent = pvState.sessionRobux.toFixed(2);
        document.getElementById('robux-total-result').textContent = (typeof loadRobux === 'function' ? loadRobux() : 0).toFixed(2);
    } else {
        document.getElementById('robux-results').style.display = 'none';
    }

    showScreen('results-screen');

    // Mark this as the last-played mode so playAgain restarts the module.
    window.__lastModuleStarter = startPlaceValueModule;
}

// ---------- Visual rendering ----------
function renderVisual(visual) {
    if (!visual) return '';
    if (visual.type === 'blocks') return renderBlocks(visual.tens || 0, visual.ones || 0);
    return '';
}

// SVG: tens as tall blue bars (10 stacked squares), ones as small orange squares (in rows of 5).
function renderBlocks(tens, ones) {
    const tenWidth = 26;
    const tenHeight = 110;
    const oneSize = 20;
    const tenGap = 6;
    const oneGap = 4;
    const groupGap = 28;

    const tensTotalWidth = tens > 0 ? tens * tenWidth + (tens - 1) * tenGap : 0;
    const onesPerRow = Math.min(ones || 1, 5);
    const onesTotalWidth = ones > 0 ? onesPerRow * oneSize + (onesPerRow - 1) * oneGap : 0;
    const onesStart = (tens > 0 && ones > 0) ? tensTotalWidth + groupGap : 0;
    const totalWidth = (tens > 0 || ones > 0) ? Math.max(onesStart + onesTotalWidth, tensTotalWidth) : 60;

    const parts = [];

    for (let i = 0; i < tens; i++) {
        const x = i * (tenWidth + tenGap);
        parts.push(`<rect x="${x}" y="0" width="${tenWidth}" height="${tenHeight}" rx="3" fill="#5B6BFF" stroke="#3D49C9" stroke-width="2"/>`);
        for (let j = 1; j < 10; j++) {
            const y = j * (tenHeight / 10);
            parts.push(`<line x1="${x}" y1="${y}" x2="${x + tenWidth}" y2="${y}" stroke="#3D49C9" stroke-width="1"/>`);
        }
    }

    for (let i = 0; i < ones; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = onesStart + col * (oneSize + oneGap);
        const y = row * (oneSize + oneGap);
        parts.push(`<rect x="${x}" y="${y}" width="${oneSize}" height="${oneSize}" rx="2" fill="#FFB74D" stroke="#E69100" stroke-width="2"/>`);
    }

    return `<svg viewBox="-5 -5 ${totalWidth + 10} ${tenHeight + 10}" xmlns="http://www.w3.org/2000/svg" class="pv-blocks" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
}

// Render a 2-digit number with the highlighted place colored.
function renderTwoDigitNumber(n, highlight) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    const tensClass = 'pv-digit pv-digit-tens' + (highlight === 'tens' ? ' pv-highlight' : '');
    const onesClass = 'pv-digit pv-digit-ones' + (highlight === 'ones' ? ' pv-highlight' : '');
    return `<div class="pv-number">
        <span class="${tensClass}">${tens}</span>
        <span class="${onesClass}">${ones}</span>
    </div>`;
}
