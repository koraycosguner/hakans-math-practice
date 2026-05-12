// ===== User & Robux =====
let currentUser = null; // 'hakan' or 'koray'
const ROBUX_BY_LEVEL = {
    easy: 2,
    medium: 2,
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
    const prev = loadRobux();
    localStorage.setItem(ROBUX_STORAGE_KEY, JSON.stringify({ robux: amount }));
    const delta = amount - prev;
    if (delta > 0 && delta < 1000 && typeof _showRobuxFloat === 'function') {
        _showRobuxFloat(delta);
    }
    // Log today's earnings so Hakan can see his receipt.
    if (delta > 0) {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const raw = localStorage.getItem('hakans-math-robux-log');
            const log = raw ? JSON.parse(raw) : {};
            if (log.day !== today) { log.day = today; log.amount = 0; }
            log.amount = (log.amount || 0) + delta;
            localStorage.setItem('hakans-math-robux-log', JSON.stringify(log));
        } catch (e) {}
    }
    // Milestone celebrations
    const milestones = [50, 100, 250, 500, 1000];
    for (const m of milestones) {
        if (prev < m && amount >= m) {
            if (typeof _robuxMilestone === 'function') _robuxMilestone(m);
            break;
        }
    }
}

function _robuxMilestone(n) {
    const el = document.createElement('div');
    el.className = 'robux-milestone';
    el.innerHTML = `<div class="rm-emoji">💎</div><div class="rm-text">${n} ROBUX!</div><div class="rm-sub">Look at your stash, Hakan!</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('rm-show'), 50);
    if (typeof launchConfetti === 'function') launchConfetti();
    setTimeout(() => {
        el.classList.remove('rm-show');
        setTimeout(() => el.remove(), 400);
    }, 2400);
}

// Show today's earned Robux summary when banner is tapped.
function openRobuxReceipt() {
    try {
        const raw = localStorage.getItem('hakans-math-robux-log');
        const log = raw ? JSON.parse(raw) : {};
        const today = new Date().toISOString().slice(0, 10);
        const todayAmount = (log.day === today ? log.amount || 0 : 0);
        const total = loadRobux();
        playSound('click');
        const overlay = document.createElement('div');
        overlay.className = 'potd-overlay';
        overlay.innerHTML = `<div class="potd-card">
            <h2>💎 Your Robux</h2>
            <div class="rr-total">${total.toFixed(2)}</div>
            <div class="rr-today">Earned today: <b>+${todayAmount.toFixed(1)}</b></div>
            <div class="potd-sub" style="margin-top:8px;font-size:0.85rem;color:#475569;">Keep saving for cool pet outfits, Hakan!</div>
            <button class="potd-close">Close</button>
        </div>`;
        overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    } catch (e) {}
}

function _showRobuxFloat(delta) {
    // Anchor to whichever Robux display is currently visible.
    const targets = ['robux-total', 'mg-robux-game', 'ff-robux-game'];
    let anchor = null;
    for (const id of targets) {
        const el = document.getElementById(id);
        if (el && el.offsetParent !== null) { anchor = el; break; }
    }
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'robux-float';
    f.textContent = `+${(delta % 1 === 0 ? delta : delta.toFixed(1))} 💎`;
    f.style.left = `${rect.left + rect.width / 2}px`;
    f.style.top  = `${rect.top - 6}px`;
    document.body.appendChild(f);
    requestAnimationFrame(() => f.classList.add('rf-go'));
    setTimeout(() => f.remove(), 1100);
}

// ===== Robux Savings Goal =====
// Hakan can pick a savings target (e.g., "100 💎 for a new outfit"). The home
// shows a progress bar so the goal feels tangible.
const SAVINGS_GOAL_KEY = 'hakans-math-savings-goal';
const SAVINGS_PRESETS = [
    { target: 25,  label: '🎩 New hat',        emoji: '🎩' },
    { target: 50,  label: '🕶️ Cool shades',   emoji: '🕶️' },
    { target: 100, label: '🪄 Magic outfit',   emoji: '🪄' },
    { target: 200, label: '👑 Royal upgrade',  emoji: '👑' },
];
function loadSavingsGoal() {
    try {
        const raw = localStorage.getItem(SAVINGS_GOAL_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}
function saveSavingsGoal(goal) {
    try { localStorage.setItem(SAVINGS_GOAL_KEY, JSON.stringify(goal)); } catch (e) {}
}
function openSavingsGoalPicker() {
    playSound('click');
    const current = loadSavingsGoal();
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    let opts = '';
    SAVINGS_PRESETS.forEach((p) => {
        const isCur = current && current.target === p.target;
        opts += `<button class="sound-opt ${isCur ? 'sound-current' : ''}" data-t="${p.target}" data-l="${p.label}">
            <div class="sound-emoji">${p.emoji}</div>
            <div class="sound-name">${p.target} 💎</div>
            <div class="sound-desc">${p.label.replace(p.emoji, '').trim()}</div>
        </button>`;
    });
    overlay.innerHTML = `<div class="sound-card">
        <h2>💰 Set a Goal</h2>
        <div class="sound-sub">Save up Robux for something fun!</div>
        <div class="sound-options" style="grid-template-columns: repeat(2, 1fr);">${opts}</div>
        <button class="goal-clear">Remove goal</button>
        <button class="sound-close">Done</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelectorAll('[data-t]').forEach((b) => {
        b.addEventListener('click', () => {
            saveSavingsGoal({
                target: parseInt(b.getAttribute('data-t'), 10),
                label: b.getAttribute('data-l'),
            });
            overlay.remove();
            if (typeof renderHomeModules === 'function') renderHomeModules();
        });
    });
    overlay.querySelector('.goal-clear').addEventListener('click', () => {
        try { localStorage.removeItem(SAVINGS_GOAL_KEY); } catch (e) {}
        overlay.remove();
        if (typeof renderHomeModules === 'function') renderHomeModules();
    });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// ===== Module progress (per-quiz best stars) =====
const PROGRESS_STORAGE_KEY = 'hakans-math-progress';

function loadAllProgress() {
    try {
        const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveModuleProgress(moduleId, stars) {
    if (!moduleId) return;
    const all = loadAllProgress();
    const prev = all[moduleId];
    // Only upgrade — never downgrade a previous best score.
    const best = prev && prev.stars > stars ? prev.stars : stars;
    const beforeCount = Object.keys(all).length;
    const wasNewModule = !prev;
    all[moduleId] = { stars: best, lastCompleted: Date.now() };
    try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
    // Milestone confetti at 10 / 25 / 50 / 100 / 150 modules.
    if (wasNewModule) {
        const after = beforeCount + 1;
        const milestones = [10, 25, 50, 100, 150, 200];
        if (milestones.includes(after) && typeof _milestoneConfetti === 'function') {
            _milestoneConfetti(after);
        }
    }
}

function _milestoneConfetti(count) {
    // Schedule slightly after the results screen settles.
    setTimeout(() => {
        const overlay = document.createElement('div');
        overlay.className = 'milestone-overlay';
        overlay.innerHTML = `<div class="milestone-card">
            <div class="milestone-emoji">🎊</div>
            <div class="milestone-num">${count}</div>
            <div class="milestone-text">modules visited, Hakan!</div>
            <div class="milestone-sub">Look how far you've come 🌟</div>
            <button class="milestone-close">Awesome!</button>
        </div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('.milestone-close').addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
        if (typeof launchConfetti === 'function') launchConfetti();
    }, 1200);
}

function resetProgress() {
    if (confirm("Reset Hakan's module progress (stars)? This won't change Robux.")) {
        try { localStorage.removeItem(PROGRESS_STORAGE_KEY); } catch (e) {}
        alert('Progress reset.');
        if (typeof renderHomeModules === 'function') renderHomeModules();
    }
}

// ===== Module favorites — Hakan can pin his favorites to the top =====
const FAVORITES_KEY = 'hakans-math-favorites';
function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function saveFavorites(map) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(map)); } catch (e) {}
}
function toggleFavorite(moduleId, ev) {
    if (ev) { ev.stopPropagation(); ev.preventDefault(); }
    const favs = loadFavorites();
    if (favs[moduleId]) { delete favs[moduleId]; }
    else { favs[moduleId] = Date.now(); }
    saveFavorites(favs);
    if (typeof renderHomeModules === 'function') renderHomeModules();
    playSound('click');
}

// ===== Module visit tracking (every lesson/practice/quiz start) =====
// Used to show "you've worked on this N times" badges and a Recently
// Played section on the home grid. Independent from PROGRESS so we can
// surface modules Hakan opened but hasn't yet aced.
const VISITS_STORAGE_KEY = 'hakans-math-visits';

function loadAllVisits() {
    try {
        const raw = localStorage.getItem(VISITS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function recordModuleVisit(moduleId) {
    if (!moduleId) return;
    const all = loadAllVisits();
    const prev = all[moduleId];
    const todayKey = _todayKey();
    let visitStreak = (prev && prev.visitStreak) || 0;
    const lastDay = prev && prev.lastDay;
    if (lastDay === todayKey) {
        // Same day — no change to streak.
    } else if (lastDay) {
        const gap = _daysBetween(lastDay, todayKey);
        if (gap === 1) visitStreak += 1;
        else visitStreak = 1;
    } else {
        visitStreak = 1;
    }
    all[moduleId] = {
        count: (prev && prev.count ? prev.count : 0) + 1,
        lastVisited: Date.now(),
        lastDay: todayKey,
        visitStreak,
    };
    try {
        localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
    // Daily streak: any visit on a new day extends the streak.
    bumpDailyStreak();
}

// ===== Daily streak =====
const STREAK_STORAGE_KEY = 'hakans-math-streak';

function _todayKey() {
    // Local-time YYYY-MM-DD
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function _daysBetween(aKey, bKey) {
    const a = new Date(aKey + 'T00:00:00');
    const b = new Date(bKey + 'T00:00:00');
    return Math.round((b - a) / 86400000);
}

function loadStreak() {
    try {
        const raw = localStorage.getItem(STREAK_STORAGE_KEY);
        return raw ? JSON.parse(raw) : { current: 0, longest: 0, last: null };
    } catch (e) {
        return { current: 0, longest: 0, last: null };
    }
}

function bumpDailyStreak() {
    const today = _todayKey();
    const s = loadStreak();
    // Record the day in a rolling history so we can render a calendar.
    s.history = s.history || [];
    if (!s.history.includes(today)) {
        s.history.push(today);
        // Keep just the last 30 days worth.
        if (s.history.length > 30) s.history = s.history.slice(-30);
    }
    if (s.last === today) {
        try { localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
        return s.current;
    }
    if (s.last == null) {
        s.current = 1;
    } else {
        const gap = _daysBetween(s.last, today);
        if (gap === 1) {
            s.current = (s.current || 0) + 1;
        } else if (gap === 2 && s.insuranceUsedWeek !== _isoWeekTag()) {
            // Streak insurance: 1 free skip per ISO week.
            s.current = (s.current || 0) + 1;
            s.insuranceUsedWeek = _isoWeekTag();
            s._comebackFreebie = true;
        } else if (gap > 1) {
            s.current = 1;
            // Big comeback bonus: returning after 3+ days
            if (gap >= 3) s._comebackGap = gap;
        } else {
            s.current = s.current || 1;
        }
    }
    if (s.current > (s.longest || 0)) s.longest = s.current;
    s.last = today;
    try { localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
    return s.current;
}

// Return last 30 days as [{date, key, practiced}, ...] from oldest to newest.
function lastThirtyDays() {
    const s = loadStreak();
    const hist = (s.history || []);
    const out = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        out.push({ key, day: d.getDate(), practiced: hist.includes(key) });
    }
    return out;
}

// Return last 7 days as [{date, key, practiced}, ...] from oldest to newest.
function lastSevenDays() {
    const s = loadStreak();
    const hist = (s.history || []);
    const out = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        out.push({ key, label: labels[d.getDay()].slice(0, 1), practiced: hist.includes(key) });
    }
    return out;
}

function _isoWeekTag() {
    const d = new Date();
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() + '-W' + weekNum;
}

// ===== Per-problem struggle tracking =====
const PROBLEM_STATS_KEY = 'hakans-math-problems';

function loadProblemStats() {
    try {
        const raw = localStorage.getItem(PROBLEM_STATS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function recordProblemAttempt(moduleId, activity, idx, isCorrect) {
    if (!moduleId || idx == null || activity == null) return;
    const all = loadProblemStats();
    const key = `${moduleId}::${activity}::${idx}`;
    const prev = all[key] || { attempts: 0, correct: 0 };
    prev.attempts += 1;
    if (isCorrect) prev.correct += 1;
    prev.last = Date.now();
    all[key] = prev;
    try { localStorage.setItem(PROBLEM_STATS_KEY, JSON.stringify(all)); } catch (e) {}
}

// Adaptive review: return list of practice/quiz problem indices Hakan
// has gotten wrong on this module (accuracy < 100%). Used by the
// "Review Missed" button on the module detail screen.
function getMissedProblems(moduleId) {
    if (!moduleId) return [];
    const all = loadProblemStats();
    const out = [];
    for (const key of Object.keys(all)) {
        const [mid, activity, idxStr] = key.split('::');
        if (mid !== moduleId) continue;
        const s = all[key];
        if (!s || s.attempts < 1) continue;
        if (s.correct >= s.attempts) continue;  // never wrong
        out.push({ activity, idx: parseInt(idxStr, 10), accuracy: s.correct / s.attempts });
    }
    out.sort((a, b) => a.accuracy - b.accuracy);
    return out;
}

// Mark missed problems as "reviewed" — clear their stats so they don't
// keep appearing. (Called when the review activity finishes.)
function clearReviewedProblems(moduleId, items) {
    if (!moduleId || !items) return;
    const all = loadProblemStats();
    for (const it of items) {
        const key = `${moduleId}::${it.activity}::${it.idx}`;
        delete all[key];
    }
    try { localStorage.setItem(PROBLEM_STATS_KEY, JSON.stringify(all)); } catch (e) {}
}

// ===== Achievement badges =====
let BADGES_CATALOG = [];
(async function loadBadgesCatalog() {
    try {
        const res = await fetch('badges.json?v=' + (typeof AUDIO_VERSION !== 'undefined' ? AUDIO_VERSION : 1));
        if (res.ok) BADGES_CATALOG = await res.json();
    } catch (e) {}
})();

const BADGES_EARNED_KEY = 'hakans-math-badges';
function loadEarnedBadges() {
    try {
        const raw = localStorage.getItem(BADGES_EARNED_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function saveEarnedBadges(map) {
    try { localStorage.setItem(BADGES_EARNED_KEY, JSON.stringify(map)); } catch (e) {}
}

function _gatherBadgeState() {
    const progress = loadAllProgress();
    const visits = loadAllVisits();
    const streak = loadStreak();
    const stats = loadProblemStats();
    const robux = loadRobux();
    const earned = loadEarnedBadges();
    let totalStars = 0, modulesCompleted = 0, perfectModules = 0;
    let quizzes = 0, lessons = 0, plays = 0, correctTotal = 0;
    for (const id of Object.keys(progress)) {
        const p = progress[id];
        totalStars += p.stars || 0;
        modulesCompleted += 1;
        if (p.stars === 3) perfectModules += 1;
    }
    for (const id of Object.keys(visits)) {
        plays += (visits[id].count || 1);
    }
    // Quizzes ~= modulesCompleted (each progress entry came from quiz)
    quizzes = modulesCompleted;
    // Approx lessons completed: count of visits where Hakan went to lesson
    // (we don't separately track this; use plays as rough proxy)
    lessons = Math.max(0, plays - quizzes);
    for (const key of Object.keys(stats)) {
        correctTotal += (stats[key].correct || 0);
    }
    // Per-category mastery
    const catStart = {}, catMaster = {};
    if (typeof MODULES !== 'undefined') {
        for (const m of MODULES) {
            const p = progress[m.id];
            const cat = m.category;
            if (!cat) continue;
            if (catStart[cat] == null) catStart[cat] = { total: 0, started: 0, mastered: 0 };
            catStart[cat].total += 1;
            if (p) {
                catStart[cat].started += 1;
                if (p.stars === 3) catStart[cat].mastered += 1;
            }
        }
    }
    // Mini-game stats from localStorage
    let gameBests = {};
    let gamesTotal = 0, gamesAnyScored = 0, gamesDistinct = 0;
    try {
        const raw = localStorage.getItem('hakans-math-game-bests');
        if (raw) gameBests = JSON.parse(raw) || {};
    } catch (e) {}
    gamesDistinct = Object.keys(gameBests).length;
    gamesAnyScored = Object.values(gameBests).filter((b) => (b && b.score > 0)).length;
    try {
        const raw = localStorage.getItem('hakans-math-game-rounds');
        gamesTotal = raw ? (JSON.parse(raw).count || 0) : 0;
    } catch (e) {}
    // Daily challenge streak
    let dailyStreak = 0;
    try {
        const raw = localStorage.getItem('hakans-math-game-daily-streak');
        if (raw) dailyStreak = JSON.parse(raw).current || 0;
    } catch (e) {}

    return {
        progress, visits, streak, stats, robux, earned,
        totalStars, modulesCompleted, perfectModules,
        quizzes, lessons, plays, correctTotal, catStart, catMaster,
        gameBests, gamesTotal, gamesAnyScored, gamesDistinct, dailyStreak,
    };
}

function evaluateBadge(badge, st) {
    const c = badge.criteria || {};
    switch (c.type) {
        case 'quiz-completed':       return st.quizzes >= (c.threshold || 1);
        case 'streak':               return (st.streak.current || 0) >= (c.threshold || 1);
        case 'streak-best':          return (st.streak.longest || 0) >= (c.threshold || 1);
        case 'total-stars':          return st.totalStars >= (c.threshold || 1);
        case 'modules-completed':    return st.modulesCompleted >= (c.threshold || 1);
        case 'perfect-quiz':         return st.perfectModules >= (c.threshold || 1);
        case 'correct-answers':      return st.correctTotal >= (c.threshold || 1);
        case 'robux-earned-total':   return st.robux >= (c.threshold || 1);
        case 'play-count':           return st.plays >= (c.threshold || 1);
        case 'lesson-completed':     return st.lessons >= (c.threshold || 1);
        case 'category-complete': {
            const cat = st.catStart[c.category];
            return !!cat && cat.started === cat.total && cat.total > 0;
        }
        case 'category-mastered': {
            const cat = st.catStart[c.category];
            return !!cat && cat.mastered === cat.total && cat.total > 0;
        }
        case 'module-mastered': {
            const p = st.progress[c.moduleId];
            return !!p && p.stars === 3;
        }
        // Mini-game criteria — use mini-game bests + the global play-count
        // counter (we don't track per-game plays separately).
        case 'game-played':  return st.gamesAnyScored >= (c.threshold || 1);
        case 'games-distinct': return st.gamesDistinct >= (c.threshold || 1);
        case 'games-total':  return st.gamesTotal >= (c.threshold || 1);
        case 'game-best': {
            const b = st.gameBests[c.gameId];
            return !!b && b.score >= (c.threshold || 1);
        }
        case 'daily-streak': return (st.dailyStreak || 0) >= (c.threshold || 1);
    }
    return false;
}

// Award any newly-earned badges and return the list (for UI notification).
function checkAndAwardBadges() {
    if (!BADGES_CATALOG.length) return [];
    const st = _gatherBadgeState();
    const newly = [];
    let robuxToAdd = 0;
    for (const b of BADGES_CATALOG) {
        if (st.earned[b.id]) continue;
        if (evaluateBadge(b, st)) {
            st.earned[b.id] = { when: Date.now() };
            newly.push(b);
            if (b.robux) robuxToAdd += b.robux;
        }
    }
    if (newly.length) {
        saveEarnedBadges(st.earned);
        if (robuxToAdd > 0) saveRobux(loadRobux() + robuxToAdd);
    }
    return newly;
}

// Floating badge toast — shows briefly when a badge is earned.
function showBadgeToasts(badges) {
    if (!badges || !badges.length) return;
    badges.forEach((b, i) => {
        setTimeout(() => {
            const t = document.createElement('div');
            t.className = 'badge-toast badge-toast-' + (b.tier || 'bronze');
            t.innerHTML = `
                <div class="bt-emoji">${b.emoji || '🏅'}</div>
                <div class="bt-body">
                    <div class="bt-name">${b.name}</div>
                    <div class="bt-desc">${b.description || ''}</div>
                    ${b.robux ? `<div class="bt-robux">+${b.robux} 💎</div>` : ''}
                </div>`;
            document.body.appendChild(t);
            setTimeout(() => t.classList.add('bt-show'), 50);
            setTimeout(() => {
                t.classList.remove('bt-show');
                setTimeout(() => t.remove(), 600);
            }, 3500);
        }, i * 600);
    });
}

function openTrophyRoom() {
    if (typeof playSound === 'function') playSound('click');
    renderTrophyRoom();
    showScreen('trophy-room-screen');
}

function renderTrophyRoom() {
    const body = document.getElementById('trophy-room-body');
    if (!body) return;
    const earned = loadEarnedBadges();
    const st = _gatherBadgeState();
    const byTier = {};
    for (const b of BADGES_CATALOG) {
        const t = b.tier || 'bronze';
        byTier[t] = byTier[t] || [];
        byTier[t].push(b);
    }
    const order = ['diamond', 'platinum', 'gold', 'silver', 'bronze'];
    let html = `<div class="tr-stats">
        <div class="tr-stat-num">${Object.keys(earned).length}</div>
        <div class="tr-stat-label">of ${BADGES_CATALOG.length} badges</div>
    </div>`;
    // Hall of fame highlights
    html += `<div class="tr-hof">
        <div class="hof-tile"><div class="hof-num">${st.streak.longest || 0}</div><div class="hof-lbl">🔥 best streak</div></div>
        <div class="hof-tile"><div class="hof-num">${st.totalStars}</div><div class="hof-lbl">⭐ stars total</div></div>
        <div class="hof-tile"><div class="hof-num">${st.perfectModules || 0}</div><div class="hof-lbl">💯 perfect quizzes</div></div>
    </div>`;
    // Closest badge to earn (highest progress %)
    let bestNext = null, bestPct = -1;
    for (const b of BADGES_CATALOG) {
        if (earned[b.id]) continue;
        const pct = _badgeProgressPct(b, st);
        if (pct > bestPct && pct < 100) { bestPct = pct; bestNext = b; }
    }
    if (bestNext) {
        html += `<div class="tr-next">
            <div class="tr-next-label">🎯 Closest to earning</div>
            <div class="tr-next-row">
                <div class="tr-next-emoji">${bestNext.emoji || '🏅'}</div>
                <div class="tr-next-body">
                    <div class="tr-next-name">${bestNext.name}</div>
                    <div class="tr-next-desc">${bestNext.description || ''}</div>
                    <div class="tr-next-bar"><div class="tr-next-fill" style="width:${Math.round(bestPct)}%"></div></div>
                    <div class="tr-next-progress">${badgeProgressString(bestNext, st)} (${Math.round(bestPct)}%)</div>
                </div>
            </div>
        </div>`;
    }
    for (const t of order) {
        const tierBadges = byTier[t] || [];
        if (!tierBadges.length) continue;
        const got = tierBadges.filter((b) => earned[b.id]).length;
        html += `<h3 class="tr-tier-heading tr-tier-${t}">${t.toUpperCase()} ${got}/${tierBadges.length}</h3>`;
        html += `<div class="tr-grid">`;
        for (const b of tierBadges) {
            const got = !!earned[b.id];
            const progress = badgeProgressString(b, st);
            html += `<div class="tr-card ${got ? 'tr-card-earned' : 'tr-card-locked'}">
                <div class="tr-card-emoji">${b.emoji || '🏅'}</div>
                <div class="tr-card-name">${b.name}</div>
                <div class="tr-card-desc">${b.description || ''}</div>
                ${got ? '<div class="tr-card-tag">✓ Earned</div>' : `<div class="tr-card-progress">${progress}</div>`}
            </div>`;
        }
        html += `</div>`;
    }
    body.innerHTML = html;
}

function _badgeProgressPct(b, st) {
    const c = b.criteria || {};
    if (!c.threshold) return 0;
    let cur = 0;
    switch (c.type) {
        case 'quiz-completed':     cur = st.quizzes; break;
        case 'streak':             cur = st.streak.current || 0; break;
        case 'total-stars':        cur = st.totalStars; break;
        case 'modules-completed':  cur = st.modulesCompleted; break;
        case 'perfect-quiz':       cur = st.perfectModules; break;
        case 'correct-answers':    cur = st.correctTotal; break;
        case 'robux-earned-total': cur = st.robux; break;
        case 'play-count':         cur = st.plays; break;
        case 'lesson-completed':   cur = st.lessons; break;
        default:                   return 0;
    }
    return Math.min(100, Math.round((cur / c.threshold) * 100));
}

function badgeProgressString(b, st) {
    const c = b.criteria || {};
    const get = (k, def) => (k != null ? k : def);
    switch (c.type) {
        case 'quiz-completed':     return `${st.quizzes} / ${c.threshold}`;
        case 'streak':             return `${st.streak.current} / ${c.threshold} days`;
        case 'total-stars':        return `${st.totalStars} / ${c.threshold} ⭐`;
        case 'modules-completed':  return `${st.modulesCompleted} / ${c.threshold}`;
        case 'perfect-quiz':       return `${st.perfectModules} / ${c.threshold} perfect`;
        case 'correct-answers':    return `${st.correctTotal} / ${c.threshold}`;
        case 'robux-earned-total': return `${st.robux.toFixed(0)} / ${c.threshold} 💎`;
        case 'play-count':         return `${st.plays} / ${c.threshold}`;
        case 'lesson-completed':   return `${st.lessons} / ${c.threshold}`;
        case 'category-complete':
        case 'category-mastered': {
            const cat = st.catStart[c.category];
            const key = c.type === 'category-complete' ? 'started' : 'mastered';
            return cat ? `${cat[key]} / ${cat.total}` : 'Locked';
        }
        case 'module-mastered':    return 'Locked';
    }
    return '';
}

// ===== Math Pet =====
let MATH_PET_CATALOG = null;
(async function loadMathPetCatalog() {
    try {
        const res = await fetch('math-pet.json?v=' + (typeof AUDIO_VERSION !== 'undefined' ? AUDIO_VERSION : 1));
        if (res.ok) MATH_PET_CATALOG = await res.json();
    } catch (e) {}
})();

const PET_STORAGE_KEY = 'hakans-math-pet';
function loadPetState() {
    try {
        const raw = localStorage.getItem(PET_STORAGE_KEY);
        return raw ? JSON.parse(raw) : { petId: null };
    } catch (e) { return { petId: null }; }
}
function savePetState(state) {
    try { localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

// Pet mood based on time since last app open. Pure read — no side effects.
function petMood() {
    // If recently fed, override with happy.
    const ps = loadPetState();
    if (ps && ps.lastFed && (Date.now() - ps.lastFed < 30 * 60 * 1000)) {
        return { mood: 'fed', emoji: '😋', text: 'Yum, thank you!' };
    }
    const visits = loadAllVisits();
    let lastVisit = 0;
    for (const id of Object.keys(visits)) {
        const t = visits[id].lastVisited || 0;
        if (t > lastVisit) lastVisit = t;
    }
    if (!lastVisit) return { mood: 'fresh', emoji: '✨', text: "Let's play!" };
    const days = (Date.now() - lastVisit) / 86400000;
    if (days >= 3) return { mood: 'sad',     emoji: '😢', text: 'Missed you!' };
    if (days >= 1) return { mood: 'hungry',  emoji: '😋', text: 'Hungry for math!' };
    const hours = (Date.now() - lastVisit) / 3600000;
    if (hours >= 8)  return { mood: 'happy', emoji: '😊', text: 'Ready to learn!' };
    if (hours >= 2)  return { mood: 'curious', emoji: '🤔', text: 'Another round?' };
    return { mood: 'energized', emoji: '⚡', text: "Let's go!" };
}

function getPetStageForStars(pet, totalStars) {
    if (!pet || !pet.stages) return null;
    let current = pet.stages[0];
    for (const s of pet.stages) {
        if (totalStars >= (s.unlockAt || 0)) current = s;
        else break;
    }
    return current;
}

function currentPetStage() {
    if (!MATH_PET_CATALOG) return null;
    const state = loadPetState();
    const petId = state.petId || (MATH_PET_CATALOG.pets[0] && MATH_PET_CATALOG.pets[0].id);
    const pet = MATH_PET_CATALOG.pets.find((p) => p.id === petId) || MATH_PET_CATALOG.pets[0];
    if (!pet) return null;
    const progress = loadAllProgress();
    const totalStars = Object.values(progress).reduce((s, p) => s + (p.stars || 0), 0);
    return { pet, stage: getPetStageForStars(pet, totalStars), totalStars };
}

// Pet Outfit Shop — buy accessories with Robux, equip onto your pet.
const PET_OUTFITS = [
    { id: 'hat-wizard',   slot: 'hat',  emoji: '🧙', name: 'Wizard Hat',   price: 20 },
    { id: 'hat-crown',    slot: 'hat',  emoji: '👑', name: 'Crown',        price: 50 },
    { id: 'hat-cap',      slot: 'hat',  emoji: '🧢', name: 'Baseball Cap', price: 15 },
    { id: 'hat-grad',     slot: 'hat',  emoji: '🎓', name: 'Grad Cap',     price: 25 },
    { id: 'hat-party',    slot: 'hat',  emoji: '🎉', name: 'Party Hat',    price: 30 },
    { id: 'hat-cowboy',   slot: 'hat',  emoji: '🤠', name: 'Cowboy Hat',   price: 22 },
    { id: 'hat-helmet',   slot: 'hat',  emoji: '⛑️', name: 'Builder Hat',  price: 28 },
    { id: 'hat-fire',     slot: 'hat',  emoji: '🔥', name: 'Fire Crown',   price: 80 },
    { id: 'acc-glasses',  slot: 'acc',  emoji: '👓', name: 'Cool Glasses', price: 25 },
    { id: 'acc-sunglasses', slot: 'acc', emoji: '😎', name: 'Sunglasses',  price: 35 },
    { id: 'acc-bowtie',   slot: 'acc',  emoji: '🎀', name: 'Bow Tie',      price: 18 },
    { id: 'acc-cape',     slot: 'acc',  emoji: '🦸', name: 'Hero Cape',    price: 60 },
    { id: 'acc-star',     slot: 'acc',  emoji: '⭐', name: 'Star Sticker', price: 12 },
    { id: 'acc-rainbow',  slot: 'acc',  emoji: '🌈', name: 'Rainbow Aura', price: 75 },
    { id: 'acc-rocket',   slot: 'acc',  emoji: '🚀', name: 'Rocket Boost', price: 100 },
    { id: 'hat-pirate',   slot: 'hat',  emoji: '🏴‍☠️', name: 'Pirate Hat',   price: 40 },
    { id: 'hat-santa',    slot: 'hat',  emoji: '🎅', name: 'Santa Hat',     price: 30 },
    { id: 'acc-medal',    slot: 'acc',  emoji: '🥇', name: 'Gold Medal',    price: 45 },
    { id: 'acc-balloon',  slot: 'acc',  emoji: '🎈', name: 'Party Balloon', price: 16 },
    { id: 'acc-flower',   slot: 'acc',  emoji: '🌸', name: 'Cherry Bloom',  price: 14 },
];

const PET_OUTFIT_KEY = 'hakans-math-pet-outfits';
function loadPetOutfits() {
    try { return JSON.parse(localStorage.getItem(PET_OUTFIT_KEY)) || { owned: [], equipped: {} }; }
    catch (e) { return { owned: [], equipped: {} }; }
}
function savePetOutfits(data) {
    try { localStorage.setItem(PET_OUTFIT_KEY, JSON.stringify(data)); } catch (e) {}
}

function buyPetOutfit(id) {
    const item = PET_OUTFITS.find((o) => o.id === id);
    if (!item) return;
    const data = loadPetOutfits();
    if (data.owned.indexOf(id) >= 0) return;
    const balance = loadRobux();
    if (balance < item.price) {
        alert(`You need ${item.price} 💎 to buy ${item.name}. Keep playing to earn more!`);
        return;
    }
    saveRobux(balance - item.price);
    data.owned.push(id);
    savePetOutfits(data);
    if (typeof playSound === 'function') playSound('correct');
    renderPetShop();
    if (typeof updateRobuxDisplay === 'function') updateRobuxDisplay();
}

function equipPetOutfit(id) {
    const item = PET_OUTFITS.find((o) => o.id === id);
    if (!item) return;
    const data = loadPetOutfits();
    if (data.owned.indexOf(id) < 0) return;
    // Toggle equip (tapping equipped = unequip)
    if (data.equipped[item.slot] === id) {
        delete data.equipped[item.slot];
    } else {
        data.equipped[item.slot] = id;
    }
    savePetOutfits(data);
    if (typeof playSound === 'function') playSound('click');
    renderPetShop();
    if (typeof renderHomeModules === 'function') renderHomeModules();
}

function openPetShop() {
    if (typeof playSound === 'function') playSound('click');
    renderPetShop();
    showScreen('pet-shop-screen');
}

function renderPetShop() {
    const body = document.getElementById('pet-shop-body');
    if (!body) return;
    const data = loadPetOutfits();
    const balance = loadRobux();
    // Pet preview
    const petInfo = (typeof currentPetStage === 'function') ? currentPetStage() : null;
    const equipped = data.equipped || {};
    const hatItem = equipped.hat ? PET_OUTFITS.find((o) => o.id === equipped.hat) : null;
    const accItem = equipped.acc ? PET_OUTFITS.find((o) => o.id === equipped.acc) : null;
    let html = `<div class="ps-balance">💎 ${balance.toFixed(0)} Robux</div>`;
    html += `<div class="ps-preview">
        ${hatItem ? `<div class="ps-preview-hat">${hatItem.emoji}</div>` : ''}
        <div class="ps-preview-pet">${(petInfo && petInfo.stage && petInfo.stage.emoji) || '🐾'}</div>
        ${accItem ? `<div class="ps-preview-acc">${accItem.emoji}</div>` : ''}
        <div class="ps-preview-name">${(petInfo && petInfo.pet && petInfo.pet.name) || 'My Pet'}</div>
    </div>`;
    html += `<h3 class="ps-section">🎩 Hats</h3><div class="ps-grid">`;
    PET_OUTFITS.filter((o) => o.slot === 'hat').forEach((o) => {
        html += renderShopItem(o, data);
    });
    html += `</div><h3 class="ps-section">✨ Accessories</h3><div class="ps-grid">`;
    PET_OUTFITS.filter((o) => o.slot === 'acc').forEach((o) => {
        html += renderShopItem(o, data);
    });
    html += `</div>`;
    body.innerHTML = html;
    body.querySelectorAll('.ps-card').forEach((card) => {
        const id = card.getAttribute('data-id');
        const isOwned = data.owned.indexOf(id) >= 0;
        card.addEventListener('click', () => {
            if (isOwned) equipPetOutfit(id);
            else buyPetOutfit(id);
        });
    });
}
function renderShopItem(o, data) {
    const owned = data.owned.indexOf(o.id) >= 0;
    const equipped = data.equipped && data.equipped[o.slot] === o.id;
    const cls = equipped ? 'ps-card ps-equipped' : owned ? 'ps-card ps-owned' : 'ps-card';
    const label = equipped ? '✓ Equipped' : owned ? 'Tap to equip' : `${o.price} 💎`;
    return `<button class="${cls}" data-id="${o.id}">
        <div class="ps-emoji">${o.emoji}</div>
        <div class="ps-name">${o.name}</div>
        <div class="ps-price">${label}</div>
    </button>`;
}

function choosePet(id) {
    const s = loadPetState();
    s.petId = id;
    savePetState(s);
    // Mark the time so we can show pet age.
    try {
        const map = JSON.parse(localStorage.getItem('hakans-math-pet-chosen-times') || '{}');
        if (!map[id]) {
            map[id] = Date.now();
            localStorage.setItem('hakans-math-pet-chosen-times', JSON.stringify(map));
        }
    } catch (e) {}
    if (typeof renderHomeModules === 'function') renderHomeModules();
}

function petAgeDays() {
    try {
        const map = JSON.parse(localStorage.getItem('hakans-math-pet-chosen-times') || '{}');
        const s = loadPetState();
        const petId = s.petId || (MATH_PET_CATALOG && MATH_PET_CATALOG.pets[0] && MATH_PET_CATALOG.pets[0].id);
        const t = map[petId];
        if (!t) return 0;
        return Math.floor((Date.now() - t) / 86400000);
    } catch (e) { return 0; }
}

// Pet birthday party — at 7/30/60/100 day milestones, big celebration once.
function checkPetBirthday() {
    if (typeof currentUser === 'undefined' || currentUser !== 'hakan') return;
    const age = petAgeDays();
    const milestones = [7, 30, 60, 100, 365];
    if (!milestones.includes(age)) return;
    try {
        const key = 'hakans-math-pet-birthdays';
        const map = JSON.parse(localStorage.getItem(key) || '{}');
        const ps = loadPetState();
        const id = ps.petId || 'default';
        const seen = (map[id] || []).includes(age);
        if (seen) return;
        map[id] = (map[id] || []).concat(age);
        localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {}
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card">
        <div style="font-size:4rem;">🎂🐾</div>
        <h2>Pet Birthday!</h2>
        <div class="qm-score">${age} days together!</div>
        <div class="qm-reward">+${age} 💎 gift!</div>
        <button class="potd-close">Yay!</button>
    </div>`;
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
    saveRobux(loadRobux() + age);
    if (typeof launchConfetti === 'function') launchConfetti();
    if (typeof speak === 'function') speak("It's your pet's birthday, Hakan!");
}

// Toggle a focus mode that hides score/streak chips during practice.
function toggleFocusMode() {
    document.documentElement.classList.toggle('focus-mode');
    playSound('click');
}

// ===== Per-problem timer (optional, via Comfort settings) =====
let _problemTimerStart = 0;
let _problemTimerId = null;
function _startProblemTimer() {
    if (_problemTimerId) { clearInterval(_problemTimerId); _problemTimerId = null; }
    _problemTimerStart = Date.now();
    const el = document.getElementById('mg-timer');
    if (el) el.textContent = '0s';
    _problemTimerId = setInterval(() => {
        const t = Math.floor((Date.now() - _problemTimerStart) / 1000);
        const e = document.getElementById('mg-timer');
        if (e) e.textContent = `${t}s`;
    }, 500);
}
function _stopProblemTimer() {
    if (_problemTimerId) { clearInterval(_problemTimerId); _problemTimerId = null; }
}

// ===== Keyboard input — types numbers and submits across screens =====
// Listens once globally. Each screen has its own numpad routing.
function _activeScreenId() {
    const s = document.querySelector('.screen.active');
    return s ? s.id : null;
}
function _hasActiveOverlay() {
    // Any open modal (POTD, sound, comfort, fact-family, quick math)
    return !!document.querySelector('.potd-overlay, .sound-overlay, .pet-picker-overlay, .cert-overlay, .ff-overlay, .qm-overlay');
}
function _initKeyboardInput() {
    if (window._kbInited) return;
    window._kbInited = true;
    document.addEventListener('keydown', (e) => {
        // Ignore when user is typing in an input/textarea (our own overlays
        // have their own listeners and shouldn't double-fire).
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (_hasActiveOverlay()) return;
        const id = _activeScreenId();
        const isDigit = /^[0-9]$/.test(e.key);
        const isEnter = (e.key === 'Enter');
        const isBack  = (e.key === 'Backspace' || e.key === 'Delete');
        if (!isDigit && !isEnter && !isBack) return;
        if (id === 'module-game-screen' && typeof mgTypeNumber === 'function') {
            if (isDigit) mgTypeNumber(e.key);
            else if (isEnter && typeof mgCheckAnswer === 'function') mgCheckAnswer();
            else if (isBack && typeof mgDeleteNumber === 'function') mgDeleteNumber();
        } else if (id === 'game-screen' && typeof typeNumber === 'function') {
            if (isDigit) typeNumber(e.key);
            else if (isEnter && typeof checkAnswer === 'function') checkAnswer();
            else if (isBack && typeof deleteNumber === 'function') deleteNumber();
        } else if (id === 'factfamily-screen' && typeof ffTypeNumber === 'function') {
            if (isDigit) ffTypeNumber(e.key);
            else if (isEnter && typeof ffCheckAnswer === 'function') ffCheckAnswer();
            else if (isBack && typeof ffDeleteNumber === 'function') ffDeleteNumber();
        } else {
            return;
        }
        e.preventDefault();
    });
}
_initKeyboardInput();

// Fun facts (kid-friendly mix of math + nature)
const FUN_FACTS = [
    "Did you know? Octopuses have 3 hearts! 🐙",
    "Did you know? A baby kangaroo is the size of a jelly bean! 🦘",
    "Did you know? Honey never goes bad! 🍯",
    "Did you know? Cows have BEST FRIENDS! 🐮",
    "Did you know? A snail can sleep for 3 years! 🐌",
    "Did you know? Bananas grow upside down! 🍌",
    "Did you know? Penguins propose with a pebble! 🐧",
    "Did you know? Your tongue print is unique like your fingerprint! 👅",
    "Did you know? A group of flamingos is called a 'flamboyance'! 🦩",
    "Did you know? The shortest war in history lasted 38 minutes! ⚔️",
    "Did you know? Sharks are older than trees! 🦈",
    "Did you know? An ostrich's eye is bigger than its brain! 🦴",
    "Did you know? Octopuses can squeeze through ANY hole bigger than their beak! 🐙",
    "Did you know? Bees can recognize human faces! 🐝",
    "Did you know? Butterflies taste with their feet! 🦋",
    "Did you know? A group of owls is called a 'parliament'! 🦉",
    "Did you know? Hummingbirds are the only birds that fly backwards! 🐦",
    "Did you know? Frogs can't swallow with their eyes open! 🐸",
    "Did you know? Pineapples take 2 years to grow! 🍍",
    "Did you know? You're taller in the morning than at night! 📏",
    "Did you know? A cloud can weigh 1 million pounds! ☁️",
    "Did you know? Cats sleep 12-16 hours a day! 🐱",
    "Did you know? Wombats poop in CUBES! 🟫",
    "Did you know? Dolphins have names for each other! 🐬",
    "Did you know? The Eiffel Tower grows 15cm taller in summer! 🗼",
];
function todaysFunFact() {
    const dayKey = new Date().toISOString().slice(0, 10);
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return FUN_FACTS[(seed * 7) % FUN_FACTS.length];
}

// Idle encouragement: if Hakan hasn't entered an answer in 12 seconds during
// a module problem, the mascot offers a friendly nudge.
let _idleCoachTimer = null;
function _startIdleCoach() {
    if (_idleCoachTimer) clearTimeout(_idleCoachTimer);
    _idleCoachTimer = setTimeout(() => {
        const screen = document.querySelector('.screen.active');
        if (!screen || (screen.id !== 'module-game-screen' && screen.id !== 'game-screen')) return;
        // Skip if locked, an overlay is up, or hint has been seen
        if (typeof moduleState !== 'undefined' && moduleState.locked) return;
        if (_hasActiveOverlay()) return;
        const msgs = [
            "Take your time, Hakan! 🧠",
            "You can think this one through!",
            "Try counting on your fingers, Hakan!",
            "What number comes next? You got this!",
            "Look at the picture for a clue! 👀",
        ];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        if (typeof setMascotMessage === 'function') setMascotMessage(msg, true);
    }, 12000);
}
function _stopIdleCoach() {
    if (_idleCoachTimer) { clearTimeout(_idleCoachTimer); _idleCoachTimer = null; }
}

// Pick a random splash sub-message on load.
(function _randomSplashSub() {
    const msgs = [
        "Getting your numbers ready...",
        "Polishing the stars...",
        "Feeding your pet some math snacks...",
        "Counting all the way to ten...",
        "Sharpening pencils...",
        "Warming up the calculator...",
        "Waking up the mascot...",
        "Stirring the Robux pot...",
    ];
    const el = document.getElementById('splash-sub');
    if (el) el.textContent = msgs[Math.floor(Math.random() * msgs.length)];
})();

// Day-of-week flair + seasonal flair.
function dayOfWeekFlair() {
    const d = new Date();
    const day = d.getDay();
    const tags = [
        { emoji: '☀️', name: 'Sunday Fun-day!' },
        { emoji: '💪', name: 'Marvelous Monday!' },
        { emoji: '🌮', name: 'Terrific Tuesday!' },
        { emoji: '🐺', name: 'Wonder Wednesday!' },
        { emoji: '🌟', name: 'Thoughtful Thursday!' },
        { emoji: '🎉', name: 'Fantastic Friday!' },
        { emoji: '🌈', name: 'Super Saturday!' },
    ];
    return tags[day];
}
function seasonalEmoji() {
    const m = new Date().getMonth();
    return [
        '⛄', '💕', '🌸', '🌷', '🌼', '☀️',
        '🏖️', '🌻', '🍂', '🎃', '🦃', '🎄',
    ][m] || '✨';
}

// Daily affirmation card content
const AFFIRMATIONS = [
    "Hakan, you are SMART! 🧠",
    "Hakan, your brain GROWS every day! 🌱",
    "Hakan, you are KIND and STRONG! 💪",
    "Hakan, mistakes are how you LEARN! 🌈",
    "Hakan, your math superpowers are GROWING! ⚡",
    "Hakan, you can do HARD things! 🦁",
    "Hakan, you are NUMBER ONE! 1️⃣",
    "Hakan, your effort makes you AMAZING! 🌟",
    "Hakan, your family LOVES you so much! 💖",
    "Hakan, you make every day BRIGHTER! ☀️",
    "Hakan, your CURIOSITY is your superpower! 🔍",
    "Hakan, you are BRAVE to try new things! 🦁",
    "Hakan, your patience makes you POWERFUL! 🧘",
    "Hakan, you are a GOOD friend! 🤗",
    "Hakan, every challenge is your CHANCE to grow! 🌳",
];
function todaysAffirmation() {
    const dayKey = new Date().toISOString().slice(0, 10);
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return AFFIRMATIONS[seed % AFFIRMATIONS.length];
}

// Brain teasers (Grade 1 friendly)
const BRAIN_TEASERS = [
    { q: "I'm a number bigger than 5 and smaller than 7. Who am I?", a: "6" },
    { q: "What number do you get if you double 4?", a: "8" },
    { q: "I have 2 ones and 1 ten. What number am I?", a: "12" },
    { q: "What's the next number after 9?", a: "10" },
    { q: "If I have 3 apples and you give me 2 more, how many?", a: "5" },
    { q: "How many sides does a triangle have?", a: "3" },
    { q: "I'm an even number between 6 and 10. Who am I?", a: "8" },
    { q: "If you take 4 away from 10, what's left?", a: "6" },
    { q: "What number comes right BEFORE 15?", a: "14" },
    { q: "How many minutes are in half an hour?", a: "30" },
    { q: "Three friends each have 2 candies. Total candies?", a: "6" },
    { q: "I'm bigger than 19 but I'm only 2 tens. Who am I?", a: "20" },
    { q: "What number has a 0 in it but is between 1 and 100?", a: "10" },
    { q: "Bobby has 4 toes on each foot (silly!). How many toes total?", a: "8" },
    { q: "There are 5 fingers on a hand. How many on TWO hands?", a: "10" },
    { q: "If you skip-count by 5: 5, 10, 15... what's next?", a: "20" },
    { q: "I have 1 ten and 5 ones. What number am I?", a: "15" },
    { q: "What number is exactly half of 6?", a: "3" },
    { q: "What number is exactly half of 20?", a: "10" },
    { q: "What's the biggest number with just one digit?", a: "9" },
];
function todaysBrainTeaser() {
    const dayKey = new Date().toISOString().slice(0, 10);
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return BRAIN_TEASERS[(seed * 11) % BRAIN_TEASERS.length];
}

function openBrainTeaser() {
    playSound('click');
    const t = todaysBrainTeaser();
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card">
        <h2>🧩 Brain Teaser</h2>
        <div class="potd-question">${t.q}</div>
        <input type="text" class="potd-input" autocomplete="off" />
        <div class="potd-actions">
            <button class="potd-check">Check</button>
            <button class="qm-skip">Show Answer</button>
        </div>
        <div class="potd-feedback"></div>
    </div>`;
    const input = overlay.querySelector('.potd-input');
    const fb = overlay.querySelector('.potd-feedback');
    const submit = () => {
        const val = (input.value || '').trim();
        if (!val) return;
        if (val === t.a) {
            fb.innerHTML = `<div class="potd-correct">🎉 Got it!</div>`;
            playSound('correct');
            saveRobux(loadRobux() + 3);
            if (typeof launchConfetti === 'function') launchConfetti();
            setTimeout(() => overlay.remove(), 1200);
        } else {
            fb.innerHTML = `<div class="potd-wrong">Try again!</div>`;
            playSound('wrong');
        }
    };
    overlay.querySelector('.potd-check').addEventListener('click', submit);
    overlay.querySelector('.qm-skip').addEventListener('click', () => {
        fb.innerHTML = `<div class="potd-correct">Answer: ${t.a}</div>`;
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 50);
}

// Secret "hakan" keyword: type the letters anywhere on the keyboard to fire a celebration.
let _typedBuffer = '';
function _initSecretWord() {
    if (window._secretWordSetup) return;
    window._secretWordSetup = true;
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key && e.key.length === 1) {
            _typedBuffer = (_typedBuffer + e.key.toLowerCase()).slice(-10);
            if (_typedBuffer.endsWith('hakan')) {
                _typedBuffer = '';
                if (typeof launchConfetti === 'function') launchConfetti();
                if (typeof emojiRain === 'function') emojiRain(['🌟','💎','🎉','🚀','⭐'], 30);
                if (typeof speak === 'function') speak("Yes! It's Hakan time!");
            }
        }
    });
}
_initSecretWord();

// Lucky color of the day
const LUCKY_COLORS = [
    { name: 'Sunny Yellow', hex: '#fbbf24', emoji: '💛' },
    { name: 'Hero Red',     hex: '#ef4444', emoji: '❤️' },
    { name: 'Ocean Blue',   hex: '#3b82f6', emoji: '💙' },
    { name: 'Grass Green',  hex: '#10b981', emoji: '💚' },
    { name: 'Royal Purple', hex: '#8b5cf6', emoji: '💜' },
    { name: 'Bright Pink',  hex: '#ec4899', emoji: '💗' },
    { name: 'Pumpkin Orange', hex: '#f97316', emoji: '🧡' },
];
function todaysLuckyColor() {
    const dayKey = new Date().toISOString().slice(0, 10);
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return LUCKY_COLORS[seed % LUCKY_COLORS.length];
}

// ===== Story Mode — Grade 1 math adventures =====
const STORIES = [
    {
        id: 'birthday-party',
        title: 'Hakan\'s Birthday Party',
        emoji: '🎂',
        pages: [
            { text: "It's Hakan's birthday! Mom invited 4 friends over.", art: '🎂🎈🎈' },
            { type: 'q', q: "Hakan + 4 friends = how many kids at the party?", a: 5, hint: "Don't forget to count Hakan!" },
            { text: "Mom got 12 cupcakes for the party!", art: '🧁🧁🧁🧁🧁🧁' },
            { type: 'q', q: "If 5 kids each take 2 cupcakes, how many cupcakes? (5+5)", a: 10, hint: "Double 5." },
            { text: "2 cupcakes left! Hakan gave them to Mom and Dad. 💕", art: '🧁🧁' },
        ],
        reward: 8,
    },
    {
        id: 'cookie-jar',
        title: 'The Cookie Jar',
        emoji: '🍪',
        pages: [
            { text: "Hakan found a cookie jar with 10 cookies! 🍪", art: '🍪🍪🍪🍪🍪🍪🍪🍪🍪🍪' },
            { text: "He ate 3 for snack.", art: '😋' },
            { type: 'q', q: "How many cookies are left? (10 - 3)", a: 7, hint: "Count back 3 from 10." },
            { text: "Later he shared 2 with his little sister.", art: '🤝' },
            { type: 'q', q: "Now how many left? (7 - 2)", a: 5, hint: "Count back 2 from 7." },
            { text: "5 cookies left for tomorrow's lunch box. Smart kid! 📦", art: '🍪🍪🍪🍪🍪' },
        ],
        reward: 8,
    },
    {
        id: 'magic-garden',
        title: 'The Magic Garden',
        emoji: '🌻',
        pages: [
            { text: "Hakan planted 6 sunflower seeds in the garden 🌱.", art: '🌱🌱🌱🌱🌱🌱' },
            { text: "After many days, 4 grew tall and bloomed! 🌻", art: '🌻🌻🌻🌻🌱🌱' },
            { type: 'q', q: "How many seeds still haven't bloomed?", a: 2, hint: "6 - 4." },
            { text: "Then a butterfly brought 3 more seeds.", art: '🦋' },
            { type: 'q', q: "Now Hakan has 2 + 3 seeds and 4 sunflowers. How many things total?", a: 9, hint: "2+3=5, then +4." },
            { text: "Hakan's garden was the best on the street! 🌻🌻🌻🌻", art: '🌻🦋🌻' },
        ],
        reward: 8,
    },
    {
        id: 'lost-puppy',
        title: 'The Lost Puppy',
        emoji: '🐶',
        pages: [
            { text: "Hakan found a sad puppy in the park 🐶.", art: '🐶😢' },
            { text: "The collar said: 'I live at house number 14.'", art: '🏠' },
            { type: 'q', q: "Hakan is at house 8. How many houses to walk to 14?", a: 6, hint: "14 - 8 = ?" },
            { text: "Hakan walked 6 houses and rang the bell 🔔!", art: '🚶🚶🚶🚶🚶🚶' },
            { text: "The owner was SO happy and gave Hakan 5 dog treats for his pet.", art: '🦴🦴🦴🦴🦴' },
            { text: "Best day ever! 🐶❤️", art: '🐶❤️' },
        ],
        reward: 8,
    },
    {
        id: 'snow-day',
        title: 'Snow Day Adventure',
        emoji: '⛄',
        pages: [
            { text: "It snowed all night! Hakan built 3 snowmen ⛄⛄⛄.", art: '⛄⛄⛄' },
            { text: "Each snowman needs 2 buttons.", art: '🔵🔵' },
            { type: 'q', q: "How many buttons in total? (3 sets of 2)", a: 6, hint: "2+2+2 or 3 doubled." },
            { text: "Hakan also made 4 snowballs.", art: '⚪⚪⚪⚪' },
            { type: 'q', q: "He threw 1 at a tree. How many snowballs left?", a: 3, hint: "4 - 1." },
            { text: "Then he made hot cocoa with 5 marshmallows! 🍫", art: '☕' },
        ],
        reward: 8,
    },
    {
        id: 'robot-friend',
        title: 'Hakan\'s Robot Friend',
        emoji: '🤖',
        pages: [
            { text: "Hakan built a math robot named ZIP 🤖.", art: '🤖' },
            { text: "ZIP can count, but only by 2s!", art: '2️⃣4️⃣6️⃣' },
            { type: 'q', q: "If ZIP counts 2, 4, 6, what comes next?", a: 8, hint: "Skip count by 2s." },
            { text: "ZIP fired 10 lasers! 5 hit the moon.", art: '🌝' },
            { type: 'q', q: "How many missed?", a: 5, hint: "10 - 5." },
            { text: "Hakan and ZIP became best friends. 🤖❤️", art: '🤖❤️' },
        ],
        reward: 8,
    },
    {
        id: 'pirate-treasure',
        title: 'Captain Hakan and the Treasure',
        emoji: '🏴‍☠️',
        pages: [
            { text: "Captain Hakan sailed the seas in his red boat ⛵!", art: '⛵🌊' },
            { text: "He found a treasure map with 3 X marks. 'Treasure!' he shouted!", art: '🗺️❌❌❌' },
            { text: "At the first X, he dug up 5 gold coins.", art: '🟡🟡🟡🟡🟡' },
            { type: 'q', q: "At the second X, he found 4 more. How many coins total?", a: 9, hint: "5 + 4 = ?" },
            { text: "He had 9 coins! At the last X, he found 2 more.", art: '🟡🟡' },
            { type: 'q', q: "9 + 2 = ?", a: 11, hint: "Count up 2 from 9." },
            { text: "11 coins! Captain Hakan, you're rich! 🏆", art: '🏆💰' },
        ],
        reward: 8,
    },
    {
        id: 'pizza-party',
        title: 'Hakan\'s Pizza Party',
        emoji: '🍕',
        pages: [
            { text: "Hakan invited 6 friends to his pizza party 🎉!", art: '🎉👦👧👦👧👦👧' },
            { text: "Mom ordered 2 pizzas. Each had 8 slices.", art: '🍕🍕' },
            { type: 'q', q: "How many slices total? (Hint: 8 + 8)", a: 16, hint: "Double 8 is 16." },
            { text: "Each friend ate 2 slices. Hakan ate 2 too.", art: '🍕🍕' },
            { type: 'q', q: "Hakan + 6 friends = 7 kids. 7 × 2 is the same as 7 + 7. How many slices eaten?", a: 14, hint: "Double 7." },
            { text: "Two slices left! Hakan saved them for tomorrow. Smart kid!", art: '🍕🍕' },
        ],
        reward: 8,
    },
    {
        id: 'space-rocket',
        title: 'Hakan in Space',
        emoji: '🚀',
        pages: [
            { text: "Astronaut Hakan blasted off in his rocket 🚀!", art: '🚀⭐⭐⭐' },
            { text: "He counted 10 stars on the way to the moon.", art: '⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐' },
            { type: 'q', q: "Halfway there, 5 stars zoomed by. How many stars left?", a: 5, hint: "10 - 5." },
            { text: "On the moon, he met 3 friendly aliens 👽👽👽.", art: '👽👽👽' },
            { text: "Each alien gave him 2 moon rocks.", art: '🪨🪨🪨🪨🪨🪨' },
            { type: 'q', q: "3 aliens × 2 rocks = same as 2+2+2. How many rocks?", a: 6, hint: "Three 2s." },
            { text: "Hakan flew home with 6 moon rocks. What a day! 🌙", art: '🌙' },
        ],
        reward: 8,
    },
];

function openStoryHub() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    const progress = (typeof loadStoryProgress === 'function') ? loadStoryProgress() : {};
    let opts = '';
    STORIES.forEach((s) => {
        const sp = progress[s.id] || {};
        const done = sp.completed;
        opts += `<button class="sound-opt story-opt ${done?'story-done':''}" onclick="openStory('${s.id}')">
            <div class="sound-emoji" style="font-size:2.4rem;">${s.emoji}</div>
            <div class="sound-name">${s.title}</div>
            <div class="sound-desc">${done ? '✓ Done · ' + s.pages.length + ' pages' : s.pages.length + ' pages · +' + s.reward + ' 💎'}</div>
        </button>`;
    });
    overlay.innerHTML = `<div class="sound-card story-hub">
        <h2>📚 Hakan's Stories</h2>
        <div class="sound-sub">Short adventures with math sprinkled in!</div>
        <div class="sound-options">${opts}</div>
        <button class="sound-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

const STORY_PROG_KEY = 'hakans-math-stories';
function loadStoryProgress() {
    try { return JSON.parse(localStorage.getItem(STORY_PROG_KEY)) || {}; }
    catch (e) { return {}; }
}
function saveStoryProgress(map) {
    try { localStorage.setItem(STORY_PROG_KEY, JSON.stringify(map)); } catch (e) {}
}

function openStory(id) {
    document.querySelectorAll('.sound-overlay').forEach((o) => o.remove());
    const story = STORIES.find((s) => s.id === id);
    if (!story) return;
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay story-overlay';
    const progress = loadStoryProgress();
    let idx = (progress[id] && progress[id].page && !progress[id].completed) ? progress[id].page : 0;
    function render() {
        if (idx >= story.pages.length) {
            // Done
            const sp = progress;
            sp[id] = { completed: true, page: 0, at: Date.now() };
            saveStoryProgress(sp);
            saveRobux(loadRobux() + story.reward);
            overlay.innerHTML = `<div class="potd-card story-card">
                <div class="story-end-emoji">🎉</div>
                <h2>The End!</h2>
                <div class="qm-score">${story.title}</div>
                <div class="qm-reward">+${story.reward} 💎</div>
                <button class="potd-close">Awesome</button>
            </div>`;
            overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
            if (typeof launchConfetti === 'function') launchConfetti();
            return;
        }
        const p = story.pages[idx];
        const navBtns = idx > 0
            ? `<button class="story-nav-back" onclick="this.parentElement.parentElement.dispatchEvent(new CustomEvent('story-prev'))">⬅️ Back</button>`
            : '';
        if (p.type === 'q') {
            overlay.innerHTML = `<div class="potd-card story-card">
                <div class="story-pages">📖 Page ${idx + 1} / ${story.pages.length}</div>
                <h2>${story.emoji} ${story.title}</h2>
                <div class="story-q">${p.q}</div>
                <input type="number" class="potd-input" autocomplete="off" inputmode="numeric" />
                <div class="potd-actions">
                    <button class="story-hint-btn">💡 Hint</button>
                    <button class="potd-check">Check</button>
                </div>
                <div class="story-hint" style="display:none;">${p.hint}</div>
                <div class="potd-feedback"></div>
                <div class="story-nav">${navBtns}</div>
            </div>`;
            const input = overlay.querySelector('.potd-input');
            const fb = overlay.querySelector('.potd-feedback');
            overlay.querySelector('.story-hint-btn').addEventListener('click', () => {
                overlay.querySelector('.story-hint').style.display = '';
            });
            const submit = () => {
                const val = parseInt(input.value, 10);
                if (Number.isNaN(val)) return;
                if (val === p.a) {
                    fb.innerHTML = `<div class="potd-correct">✨ Yes!</div>`;
                    playSound('correct');
                    setTimeout(() => { idx++; saveStoryProgress({ ...loadStoryProgress(), [id]: { page: idx } }); render(); }, 900);
                } else {
                    fb.innerHTML = `<div class="potd-wrong">Try once more!</div>`;
                    playSound('wrong');
                    input.value = '';
                }
            };
            overlay.querySelector('.potd-check').addEventListener('click', submit);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
            setTimeout(() => input.focus(), 50);
        } else {
            overlay.innerHTML = `<div class="potd-card story-card">
                <div class="story-pages">📖 Page ${idx + 1} / ${story.pages.length}</div>
                <h2>${story.emoji} ${story.title}</h2>
                <div class="story-art">${p.art || ''}</div>
                <div class="story-text">${p.text}</div>
                <div class="story-nav">
                    ${navBtns}
                    <button class="story-nav-next">Next ➡️</button>
                </div>
            </div>`;
            overlay.querySelector('.story-nav-next').addEventListener('click', () => {
                idx++;
                saveStoryProgress({ ...loadStoryProgress(), [id]: { page: idx } });
                render();
            });
            if (typeof speak === 'function') speak(p.text);
        }
        overlay.addEventListener('story-prev', () => {
            idx = Math.max(0, idx - 1);
            saveStoryProgress({ ...loadStoryProgress(), [id]: { page: idx } });
            render();
        }, { once: true });
    }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    render();
}

// ===== Math Toys — interactive sandboxes =====

// Hundred Chart 1-100. Tap a number to hear it; tap two to see difference.
function openHundredChart() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    let cells = '';
    for (let n = 1; n <= 100; n++) {
        cells += `<button class="hc-cell" data-n="${n}">${n}</button>`;
    }
    overlay.innerHTML = `<div class="potd-card hc-card">
        <h2>💯 Hundred Chart</h2>
        <div class="sound-sub">Tap a number to hear it. Tap two to see the difference!</div>
        <div class="hc-grid">${cells}</div>
        <div class="hc-info" id="hc-info">Tap any number, Hakan!</div>
        <button class="potd-close">Close</button>
    </div>`;
    let first = null;
    overlay.querySelectorAll('.hc-cell').forEach((btn) => {
        btn.addEventListener('click', () => {
            const n = parseInt(btn.getAttribute('data-n'), 10);
            if (typeof speak === 'function') speak(String(n));
            if (first == null) {
                first = n;
                btn.classList.add('hc-pick1');
                document.getElementById('hc-info').textContent = `${n} picked. Pick another to compare!`;
            } else if (first === n) {
                btn.classList.remove('hc-pick1');
                first = null;
                document.getElementById('hc-info').textContent = 'Tap any number, Hakan!';
            } else {
                btn.classList.add('hc-pick2');
                const big = Math.max(first, n);
                const small = Math.min(first, n);
                const diff = big - small;
                document.getElementById('hc-info').innerHTML = `${big} - ${small} = <b>${diff}</b>`;
                setTimeout(() => {
                    overlay.querySelectorAll('.hc-cell').forEach((c) => {
                        c.classList.remove('hc-pick1', 'hc-pick2');
                    });
                    first = null;
                    document.getElementById('hc-info').textContent = 'Tap any number, Hakan!';
                }, 2200);
            }
        });
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// Today's "Number Friend" — facts about a featured number 1-30.
const NUMBER_FRIEND_FACTS = {
    1: ['🌟 The smallest counting number!', 'You + me = team of 2, but each of us is 1.'],
    2: ['👯 A pair! Two eyes, two hands.', '1 + 1 = 2 (smallest even)'],
    3: ['📐 A triangle has 3 sides.', '3 is the first odd number after 1.'],
    4: ['🟦 A square has 4 sides.', '2 + 2 = 4 (smallest double)'],
    5: ['🖐️ Five fingers on one hand!', '5 + 5 = 10'],
    6: ['🎲 Sides on a die!', '3 + 3 = 6 (double of 3)'],
    7: ['🌈 Days in a week!', '7 days = 1 week'],
    8: ['🐙 An octopus has 8 arms!', '4 + 4 = 8 (double of 4)'],
    9: ['🐱 Some say cats have 9 lives!', '10 - 1 = 9'],
    10: ['🔟 Ten fingers, ten toes!', '5 + 5 = 10'],
    11: ['⚽ Players on a soccer team!', '10 + 1 = 11'],
    12: ['🕐 Hours on a clock!', '6 + 6 = 12'],
    13: ['🍪 A baker\'s dozen!', '10 + 3 = 13'],
    15: ['🪙 Pennies in 3 nickels!', '5 + 5 + 5 = 15'],
    20: ['🦶 Fingers + toes!', '10 + 10 = 20'],
    25: ['🪙 A quarter is 25 cents!', '20 + 5 = 25'],
    30: ['📅 Days in many months!', '10 + 10 + 10 = 30'],
};

function openNumberFriend() {
    playSound('click');
    const dayKey = new Date().toISOString().slice(0, 10);
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const keys = Object.keys(NUMBER_FRIEND_FACTS).map(Number);
    const n = keys[seed % keys.length];
    const facts = NUMBER_FRIEND_FACTS[n];
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card nf-card">
        <div class="nf-num">${n}</div>
        <h2>🤝 Number Friend</h2>
        <div class="nf-sub">Today, let's get to know ${n}!</div>
        <ul class="nf-facts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul>
        <button class="potd-close">Cool!</button>
    </div>`;
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    if (typeof speak === 'function') speak(`Today's number is ${n}.`);
    document.body.appendChild(overlay);
}

// Clock face: kid drags hour/minute hands to set a target.
function openClockToy() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card clock-card">
        <h2>🕐 Clock Toy</h2>
        <div class="sound-sub">Tap the buttons to move the hour hand. Read the time!</div>
        <div class="clock-face">
            ${[12,1,2,3,4,5,6,7,8,9,10,11].map((h, i) => {
                const ang = (i * 30) - 90;
                const x = 50 + 42 * Math.cos(ang * Math.PI / 180);
                const y = 50 + 42 * Math.sin(ang * Math.PI / 180);
                return `<span class="clock-num" style="left:${x}%;top:${y}%;">${h}</span>`;
            }).join('')}
            <div class="clock-hour-hand" id="ch-hour" style="transform:translate(-50%,-100%) rotate(0deg)"></div>
            <div class="clock-minute-hand" id="ch-min"></div>
            <div class="clock-center"></div>
        </div>
        <div class="clock-readout" id="clock-readout">12 o'clock</div>
        <div class="clock-controls">
            <button class="clock-ctrl" onclick="bumpClock(-1)">⬅️ Hour-</button>
            <button class="clock-ctrl" onclick="bumpClock(1)">Hour+ ➡️</button>
            <button class="clock-ctrl" onclick="toggleHalf()">½ Toggle</button>
        </div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    window._clockHr = 12;
    window._clockHalf = false;
    document.body.appendChild(overlay);
}

function bumpClock(delta) {
    let h = (window._clockHr || 12) + delta;
    if (h < 1) h = 12;
    if (h > 12) h = 1;
    window._clockHr = h;
    _renderClock();
}
function toggleHalf() {
    window._clockHalf = !window._clockHalf;
    _renderClock();
}
function _renderClock() {
    const h = window._clockHr || 12;
    const half = !!window._clockHalf;
    const hourEl = document.getElementById('ch-hour');
    const minEl  = document.getElementById('ch-min');
    const out    = document.getElementById('clock-readout');
    if (!hourEl || !minEl || !out) return;
    // Hour hand at h + (half ? 0.5 : 0).
    const hourAng = ((h % 12) + (half ? 0.5 : 0)) * 30;
    hourEl.style.transform = `translate(-50%, -100%) rotate(${hourAng}deg)`;
    minEl.style.transform = `translate(-50%, -100%) rotate(${half ? 180 : 0}deg)`;
    out.textContent = half ? `Half past ${h}` : `${h} o'clock`;
    if (typeof speak === 'function') speak(out.textContent);
}

// Coin Sorter: drag coins to their value bin (no real drag — tap to assign).
const COIN_VALUES = [
    { id: 'penny',  emoji: '🟤', name: 'Penny',  value: 1 },
    { id: 'nickel', emoji: '⚪', name: 'Nickel', value: 5 },
    { id: 'dime',   emoji: '🪙', name: 'Dime',   value: 10 },
    { id: 'quarter', emoji: '🥈', name: 'Quarter', value: 25 },
];
function openCoinSorter() {
    playSound('click');
    const target = [10, 25, 30, 50][Math.floor(Math.random() * 4)];
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card coin-card">
        <h2>🪙 Make ${target}¢</h2>
        <div class="sound-sub">Tap coins to add them up to ${target}¢!</div>
        <div class="coin-sum" id="coin-sum">0¢</div>
        <div class="coin-picker">
            ${COIN_VALUES.map((c) => `<button class="coin-btn" onclick="addCoin(${c.value})">${c.emoji}<br><b>${c.value}¢</b><br>${c.name}</button>`).join('')}
        </div>
        <div class="coin-actions">
            <button class="coin-reset" onclick="resetCoinSum()">↺ Reset</button>
            <button class="coin-check" onclick="checkCoinSum(${target})">Check</button>
        </div>
        <div class="potd-feedback" id="coin-fb"></div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    window._coinSum = 0;
    document.body.appendChild(overlay);
}
function addCoin(v) {
    window._coinSum = (window._coinSum || 0) + v;
    document.getElementById('coin-sum').textContent = window._coinSum + '¢';
    playSound('hop');
}
function resetCoinSum() {
    window._coinSum = 0;
    document.getElementById('coin-sum').textContent = '0¢';
    const fb = document.getElementById('coin-fb');
    if (fb) fb.innerHTML = '';
}
function checkCoinSum(target) {
    const fb = document.getElementById('coin-fb');
    if (window._coinSum === target) {
        fb.innerHTML = `<div class="potd-correct">✅ ${target}¢ exactly!</div>`;
        playSound('correct');
        saveRobux(loadRobux() + 2);
        if (typeof launchConfetti === 'function') launchConfetti();
    } else if (window._coinSum > target) {
        fb.innerHTML = `<div class="potd-wrong">Too much! You have ${window._coinSum}¢, need ${target}¢. Try reset.</div>`;
        playSound('wrong');
    } else {
        fb.innerHTML = `<div class="potd-wrong">Not yet! ${window._coinSum}¢ / ${target}¢.</div>`;
    }
}

// Hop Counter: a quick number-line widget for counting on/back.
function openHopCounter() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card hop-card">
        <h2>🐸 Hop Counter</h2>
        <div class="sound-sub">Hop forward and backward on the number line!</div>
        <div class="hop-pos" id="hop-pos">5</div>
        <div class="hop-controls">
            <button class="hop-back" onclick="hopBy(-1)">⬅️ Back 1</button>
            <button class="hop-fwd" onclick="hopBy(1)">Forward 1 ➡️</button>
        </div>
        <div class="hop-controls">
            <button class="hop-back" onclick="hopBy(-5)">⬅️⬅️ Back 5</button>
            <button class="hop-fwd" onclick="hopBy(5)">Forward 5 ➡️➡️</button>
        </div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    window._hopPos = 5;
    document.body.appendChild(overlay);
}
function hopBy(d) {
    window._hopPos = Math.max(0, Math.min(100, (window._hopPos || 5) + d));
    document.getElementById('hop-pos').textContent = window._hopPos;
    playSound('hop');
    if (typeof speak === 'function') speak(String(window._hopPos));
}

// Counting Song: animated count 1-10 with voice.
function openCountingSong() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card count-card">
        <h2>🎵 Counting Song</h2>
        <div class="sound-sub">Tap a row to hear it!</div>
        <div class="count-grid" id="count-grid"></div>
        <div class="count-controls">
            <button class="count-play" onclick="playCountingSong(1, 10)">▶ 1 to 10</button>
            <button class="count-play" onclick="playCountingSong(1, 20)">▶ 1 to 20</button>
            <button class="count-play" onclick="playCountingSong(20, 1)">◀ 20 to 1</button>
        </div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
    // Pre-render 1-20 dots
    const grid = document.getElementById('count-grid');
    let g = '';
    for (let n = 1; n <= 20; n++) {
        const dots = '🟡'.repeat(Math.min(n, 10)) + (n > 10 ? '<br>' + '🟡'.repeat(n - 10) : '');
        g += `<button class="count-row" onclick="speak('${n}');playSound('hop')">
            <span class="cr-num">${n}</span>
            <span class="cr-dots">${dots}</span>
        </button>`;
    }
    grid.innerHTML = g;
}

let _countingSongTimer = null;
function playCountingSong(from, to) {
    if (_countingSongTimer) clearTimeout(_countingSongTimer);
    const dir = from < to ? 1 : -1;
    let n = from;
    const step = () => {
        const row = document.querySelectorAll('.count-row')[n - 1];
        if (row) {
            row.classList.add('cr-active');
            setTimeout(() => row && row.classList.remove('cr-active'), 700);
        }
        if (typeof speak === 'function') speak(String(n));
        if (n === to) return;
        n += dir;
        _countingSongTimer = setTimeout(step, 850);
    };
    step();
}

// Skip-Count Chant: count by 2s, 5s, 10s with auto-play.
function openSkipChant() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card chant-card">
        <h2>⏭️ Skip Count!</h2>
        <div class="sound-sub">Count by 2s, 5s, or 10s. Tap to play!</div>
        <div class="chant-row" id="chant-row"></div>
        <div class="count-controls">
            <button class="count-play" onclick="playSkipChant(2)">By 2s</button>
            <button class="count-play" onclick="playSkipChant(5)">By 5s</button>
            <button class="count-play" onclick="playSkipChant(10)">By 10s</button>
        </div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}
function playSkipChant(by) {
    const row = document.getElementById('chant-row');
    if (!row) return;
    row.innerHTML = '';
    let n = by;
    const max = 100;
    const tick = () => {
        const cell = document.createElement('span');
        cell.className = 'chant-cell';
        cell.textContent = n;
        row.appendChild(cell);
        if (typeof speak === 'function') speak(String(n));
        playSound('hop');
        n += by;
        if (n <= max) setTimeout(tick, 700);
    };
    tick();
}

// Fingers visual: show N fingers (1-10) using emoji.
function openFingerCount() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    const FINGER_LAYOUTS = {
        1: '☝️', 2: '✌️', 3: '🤟', 4: '🖖', 5: '🖐️',
        6: '🖐️☝️', 7: '🖐️✌️', 8: '🖐️🤟', 9: '🖐️🖖', 10: '🖐️🖐️',
    };
    overlay.innerHTML = `<div class="potd-card finger-card">
        <h2>✋ Show Me Fingers!</h2>
        <div class="sound-sub">Click a number to see fingers!</div>
        <div class="finger-display" id="finger-display">5 = 🖐️</div>
        <div class="finger-grid">
            ${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `
                <button class="finger-btn" data-n="${n}">${n}</button>
            `).join('')}
        </div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.querySelectorAll('.finger-btn').forEach((b) => {
        b.addEventListener('click', () => {
            const n = parseInt(b.getAttribute('data-n'), 10);
            document.getElementById('finger-display').innerHTML = `${n} = ${FINGER_LAYOUTS[n] || '🖐️'.repeat(Math.floor(n / 5)) + '☝️'.repeat(n % 5)}`;
            if (typeof speak === 'function') speak(String(n));
        });
    });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// Speak the full equation for an add/sub correct answer.
function _speakFullAnswer(p) {
    if (!p || typeof speak !== 'function') return;
    if (p.type === 'addition' && p.a != null && p.b != null && p.answer != null) {
        // 50% chance to skip so it doesn't get spammy
        if (Math.random() < 0.5) speak(`${p.a} plus ${p.b} is ${p.answer}`);
    } else if (p.type === 'subtraction' && p.a != null && p.b != null && p.answer != null) {
        if (Math.random() < 0.5) speak(`${p.a} minus ${p.b} is ${p.answer}`);
    }
}

// Cookie easter egg button — adds a sticker
function _initCookieEgg() {
    if (window._cookieEggSet) return;
    window._cookieEggSet = true;
    // Cookies appear in console for the curious
    if (typeof console !== 'undefined') console.log("🍪 Hakan, type the word 'cookie' for a treat!");
    let buf = '';
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key && e.key.length === 1) {
            buf = (buf + e.key.toLowerCase()).slice(-6);
            if (buf.endsWith('cookie')) {
                buf = '';
                if (typeof STICKER_POOL !== 'undefined') {
                    const arr = loadStickers();
                    arr.push({ sticker: '🍪', when: Date.now(), bonus: true });
                    saveStickers(arr);
                }
                if (typeof emojiRain === 'function') emojiRain(['🍪','🥛','🧁'], 20);
                if (typeof speak === 'function') speak('You found a secret cookie!');
                playSound('sparkle');
            }
        }
    });
}
_initCookieEgg();

// First-of-day voice greeting on app open (Hakan only).
function _firstOfDayGreeting() {
    if (typeof currentUser === 'undefined' || currentUser !== 'hakan') return;
    try {
        const key = 'hakans-math-fod-voice';
        const today = new Date().toISOString().slice(0, 10);
        const last = localStorage.getItem(key);
        if (last === today) return;
        localStorage.setItem(key, today);
        // Slight delay so audio doesn't collide with daily-bonus
        setTimeout(() => {
            if (typeof speak === 'function') speak("Hello Hakan! Ready to play math?");
        }, 1800);
    } catch (e) {}
}

// ===== Drawing Pad =====
let _doodleCount = 0;
function openDrawPad() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card draw-card">
        <h2>✏️ Drawing Pad</h2>
        <div class="sound-sub">Draw whatever you want, Hakan!</div>
        <div class="draw-tools">
            <div class="draw-colors">
                <button class="dc-color dc-on" data-c="#1f2937" style="background:#1f2937"></button>
                <button class="dc-color" data-c="#ef4444" style="background:#ef4444"></button>
                <button class="dc-color" data-c="#f97316" style="background:#f97316"></button>
                <button class="dc-color" data-c="#fbbf24" style="background:#fbbf24"></button>
                <button class="dc-color" data-c="#10b981" style="background:#10b981"></button>
                <button class="dc-color" data-c="#3b82f6" style="background:#3b82f6"></button>
                <button class="dc-color" data-c="#8b5cf6" style="background:#8b5cf6"></button>
                <button class="dc-color" data-c="#ec4899" style="background:#ec4899"></button>
            </div>
            <div class="draw-sizes">
                <button class="dc-size dc-on" data-s="3">·</button>
                <button class="dc-size" data-s="6">•</button>
                <button class="dc-size" data-s="12">●</button>
                <button class="dc-size dc-eraser" data-s="20" data-c="#ffffff">🧽</button>
            </div>
        </div>
        <canvas id="draw-canvas" width="340" height="320"></canvas>
        <div class="draw-actions">
            <button class="draw-clear">🗑️ Clear</button>
            <button class="potd-close">Done</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    const canvas = overlay.querySelector('#draw-canvas');
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let drawing = false;
    let color = '#1f2937';
    let size = 3;
    function pos(e) {
        const r = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
        return { x: x * (canvas.width / r.width), y: y * (canvas.height / r.height) };
    }
    function start(e) { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
    function move(e) {
        if (!drawing) return;
        const p = pos(e);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        e.preventDefault();
    }
    function end() { drawing = false; }
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move,  { passive: false });
    canvas.addEventListener('touchend', end);
    overlay.querySelectorAll('.dc-color').forEach((b) => {
        b.addEventListener('click', () => {
            overlay.querySelectorAll('.dc-color').forEach((x) => x.classList.remove('dc-on'));
            b.classList.add('dc-on');
            color = b.getAttribute('data-c');
        });
    });
    overlay.querySelectorAll('.dc-size').forEach((b) => {
        b.addEventListener('click', () => {
            overlay.querySelectorAll('.dc-size').forEach((x) => x.classList.remove('dc-on'));
            b.classList.add('dc-on');
            size = parseInt(b.getAttribute('data-s'), 10);
            const c = b.getAttribute('data-c');
            if (c) color = c;
        });
    });
    overlay.querySelector('.draw-clear').addEventListener('click', () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    overlay.querySelector('.potd-close').addEventListener('click', () => {
        _doodleCount++;
        // Reward Hakan with a small thanks for creating
        if (_doodleCount === 1) saveRobux(loadRobux() + 1);
        overlay.remove();
    });
}

// ===== Daily Spin Wheel — one spin per day for a bonus =====
const SPIN_PRIZES = [
    { label: '+2 💎', kind: 'robux', val: 2,  color: '#fbbf24' },
    { label: '+5 💎', kind: 'robux', val: 5,  color: '#34d399' },
    { label: '🌟 Bonus sticker', kind: 'sticker', color: '#a78bfa' },
    { label: '+10 💎', kind: 'robux', val: 10, color: '#f97316' },
    { label: '+3 💎', kind: 'robux', val: 3,  color: '#60a5fa' },
    { label: '🎉 Try again tomorrow!', kind: 'msg', color: '#94a3b8' },
    { label: '+15 💎', kind: 'robux', val: 15, color: '#ec4899' },
    { label: '+1 💎', kind: 'robux', val: 1,  color: '#cbd5e1' },
];
function _spinUsedToday() {
    try { return localStorage.getItem('hakans-math-spin') === new Date().toISOString().slice(0, 10); }
    catch (e) { return false; }
}
function _markSpinUsed() {
    try { localStorage.setItem('hakans-math-spin', new Date().toISOString().slice(0, 10)); } catch (e) {}
}

function openDailySpin() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    const used = _spinUsedToday();
    const slices = SPIN_PRIZES.map((p, i) => {
        const angle = (i / SPIN_PRIZES.length) * 360;
        return `<div class="spin-slice" style="background:${p.color};transform:rotate(${angle}deg) skewY(${90 - 360 / SPIN_PRIZES.length}deg);">
            <span class="spin-label" style="transform:skewY(${360 / SPIN_PRIZES.length - 90}deg) rotate(${360 / SPIN_PRIZES.length / 2}deg);">${p.label}</span>
        </div>`;
    }).join('');
    overlay.innerHTML = `<div class="potd-card spin-card">
        <h2>🎡 Daily Spin</h2>
        <div class="sound-sub">${used ? "You already spun today, Hakan!" : "Spin for a prize!"}</div>
        <div class="spin-wheel-wrap">
            <div class="spin-pointer">▼</div>
            <div class="spin-wheel" id="spin-wheel">${slices}</div>
        </div>
        <button class="spin-go" id="spin-go" ${used ? 'disabled' : ''}>${used ? 'Come back tomorrow' : 'SPIN!'}</button>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    if (used) return;
    const spinBtn = overlay.querySelector('#spin-go');
    spinBtn.addEventListener('click', () => {
        spinBtn.disabled = true;
        const idx = Math.floor(Math.random() * SPIN_PRIZES.length);
        const stops = 5;  // full rotations
        const baseDeg = stops * 360;
        const sliceDeg = 360 / SPIN_PRIZES.length;
        const targetDeg = baseDeg + (360 - idx * sliceDeg) - sliceDeg / 2;
        const wheel = overlay.querySelector('#spin-wheel');
        wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        wheel.style.transform = `rotate(${targetDeg}deg)`;
        playSound('whoosh');
        _markSpinUsed();
        setTimeout(() => {
            const prize = SPIN_PRIZES[idx];
            const fb = document.createElement('div');
            fb.className = 'spin-result';
            fb.textContent = '🎉 ' + prize.label;
            overlay.querySelector('.spin-card').appendChild(fb);
            if (prize.kind === 'robux') saveRobux(loadRobux() + prize.val);
            else if (prize.kind === 'sticker' && typeof STICKER_POOL !== 'undefined') {
                const arr = loadStickers();
                const s = STICKER_POOL[Math.floor(Math.random() * STICKER_POOL.length)];
                arr.push({ sticker: s, when: Date.now(), bonus: true });
                saveStickers(arr);
            }
            playSound('win');
            if (typeof launchConfetti === 'function') launchConfetti();
        }, 3100);
    });
}

// ===== Math Genie — magic 8-ball with kid-friendly answers =====
const GENIE_ANSWERS = [
    "YES, Hakan! ✅", "Definitely! 🌟", "Without a doubt! 💯",
    "I think so! 🤔", "Maybe! Try it! 🚀", "Ask again later! 🔮",
    "Hmm, not today! 🌧️", "Probably not! ❌", "You'll find out soon! ⭐",
    "Your guess is right! 🎯", "The stars say yes! ✨", "Sleep on it! 😴",
];
function openMathGenie() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    overlay.innerHTML = `<div class="potd-card genie-card">
        <h2>🔮 Math Genie</h2>
        <div class="sound-sub">Ask a yes/no question. Tap the ball!</div>
        <div class="genie-ball" id="genie-ball">8</div>
        <div class="genie-answer" id="genie-answer">Tap the ball, Hakan!</div>
        <button class="potd-close">Close</button>
    </div>`;
    const ball = overlay.querySelector('#genie-ball');
    const ans = overlay.querySelector('#genie-answer');
    ball.addEventListener('click', () => {
        ball.classList.remove('genie-shake');
        void ball.offsetWidth;
        ball.classList.add('genie-shake');
        playSound('whoosh');
        ans.textContent = '...';
        setTimeout(() => {
            ans.textContent = GENIE_ANSWERS[Math.floor(Math.random() * GENIE_ANSWERS.length)];
            playSound('sparkle');
        }, 1000);
    });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// ===== Music Maker — tap notes to play a tune =====
function openMusicMaker() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    const notes = [
        { name: 'C', freq: 261.63, color: '#fbbf24' },
        { name: 'D', freq: 293.66, color: '#f97316' },
        { name: 'E', freq: 329.63, color: '#ef4444' },
        { name: 'F', freq: 349.23, color: '#ec4899' },
        { name: 'G', freq: 391.99, color: '#8b5cf6' },
        { name: 'A', freq: 440.00, color: '#3b82f6' },
        { name: 'B', freq: 493.88, color: '#10b981' },
        { name: "C'", freq: 523.25, color: '#fde047' },
    ];
    overlay.innerHTML = `<div class="potd-card music-card">
        <h2>🎼 Music Maker</h2>
        <div class="sound-sub">Tap the keys! Make your own tune.</div>
        <div class="music-keys">
            ${notes.map((n) => `<button class="mk-key" data-f="${n.freq}" style="background:${n.color}">${n.name}</button>`).join('')}
        </div>
        <div class="music-tunes">
            <button class="mk-tune" data-t="twinkle">⭐ Twinkle</button>
            <button class="mk-tune" data-t="happy">🎂 Birthday</button>
            <button class="mk-tune" data-t="mary">🐑 Mary</button>
        </div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.querySelectorAll('.mk-key').forEach((b) => {
        b.addEventListener('click', () => {
            const f = parseFloat(b.getAttribute('data-f'));
            _playNote(f, 0.4);
            b.classList.add('mk-press');
            setTimeout(() => b.classList.remove('mk-press'), 300);
        });
    });
    overlay.querySelectorAll('.mk-tune').forEach((b) => {
        b.addEventListener('click', () => _playTune(b.getAttribute('data-t')));
    });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}
function _playNote(freq, dur) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(_soundGain(0.15), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    } catch (e) {}
}
function _playTune(name) {
    const tunes = {
        twinkle: [[262, 0.4], [262, 0.4], [392, 0.4], [392, 0.4], [440, 0.4], [440, 0.4], [392, 0.8]],
        happy:   [[262, 0.3], [262, 0.3], [294, 0.5], [262, 0.5], [349, 0.5], [330, 1.0]],
        mary:    [[330, 0.4], [294, 0.4], [262, 0.4], [294, 0.4], [330, 0.4], [330, 0.4], [330, 0.8]],
    };
    const seq = tunes[name];
    if (!seq) return;
    let t = 0;
    for (const [freq, dur] of seq) {
        setTimeout(() => _playNote(freq, dur), t * 1000);
        t += dur;
    }
}

// Soundboard: emojis Hakan can tap to hear sounds.
function openSoundboard() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    const sounds = [
        { e: '🐶', s: 'correct',  t: 'Woof!' },
        { e: '🐱', s: 'hop',      t: 'Meow!' },
        { e: '🐮', s: 'win',      t: 'Moo!' },
        { e: '🐸', s: 'hop',      t: 'Ribbit!' },
        { e: '🚗', s: 'click',    t: 'Beep!' },
        { e: '🎺', s: 'win',      t: 'Toot!' },
        { e: '🔔', s: 'correct',  t: 'Ding!' },
        { e: '💥', s: 'wrong',    t: 'BOOM!' },
    ];
    overlay.innerHTML = `<div class="potd-card soundboard">
        <h2>🎹 Soundboard</h2>
        <div class="sound-sub">Tap each emoji to hear a sound!</div>
        <div class="sb-row">
            ${sounds.map((x) => `<button class="sb-key" data-s="${x.s}" data-t="${x.t}">${x.e}<span class="sb-label">${x.t}</span></button>`).join('')}
        </div>
        <button class="potd-close">Close</button>
    </div>`;
    overlay.querySelectorAll('.sb-key').forEach((b) => {
        b.addEventListener('click', () => {
            const s = b.getAttribute('data-s');
            const t = b.getAttribute('data-t');
            playSound(s);
            if (typeof speak === 'function') speak(t);
            b.classList.add('sb-pop');
            setTimeout(() => b.classList.remove('sb-pop'), 400);
        });
    });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// Math Toys hub picker
function openMathToys() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    overlay.innerHTML = `<div class="sound-card hub-card">
        <h2>🧰 Math Toys</h2>
        <div class="sound-sub">Play, explore, and have fun with numbers!</div>
        <div class="hub-section-label">🎯 Quick Practice</div>
        <div class="sound-options" style="grid-template-columns:repeat(3,1fr);">
            <button class="sound-opt" onclick="openBrainDrills();closeSoundOverlay()"><div class="sound-emoji">🧠</div><div class="sound-name">Brain Drills</div></button>
            <button class="sound-opt" onclick="openBrainTeaser();closeSoundOverlay()"><div class="sound-emoji">🧩</div><div class="sound-name">Teaser</div></button>
            <button class="sound-opt" onclick="openDailySpin();closeSoundOverlay()"><div class="sound-emoji">🎡</div><div class="sound-name">Daily Spin</div></button>
        </div>
        <div class="hub-section-label">🔢 Number Tools</div>
        <div class="sound-options" style="grid-template-columns:repeat(3,1fr);">
            <button class="sound-opt" onclick="openHundredChart();closeSoundOverlay()"><div class="sound-emoji">💯</div><div class="sound-name">Hundred Chart</div></button>
            <button class="sound-opt" onclick="openNumberFriend();closeSoundOverlay()"><div class="sound-emoji">🤝</div><div class="sound-name">Number Friend</div></button>
            <button class="sound-opt" onclick="openHopCounter();closeSoundOverlay()"><div class="sound-emoji">🐸</div><div class="sound-name">Hop Counter</div></button>
            <button class="sound-opt" onclick="openCountingSong();closeSoundOverlay()"><div class="sound-emoji">🎵</div><div class="sound-name">Count Song</div></button>
            <button class="sound-opt" onclick="openSkipChant();closeSoundOverlay()"><div class="sound-emoji">⏭️</div><div class="sound-name">Skip Count</div></button>
            <button class="sound-opt" onclick="openFingerCount();closeSoundOverlay()"><div class="sound-emoji">✋</div><div class="sound-name">Fingers</div></button>
        </div>
        <div class="hub-section-label">🕐 Real Life</div>
        <div class="sound-options" style="grid-template-columns:repeat(3,1fr);">
            <button class="sound-opt" onclick="openClockToy();closeSoundOverlay()"><div class="sound-emoji">🕐</div><div class="sound-name">Clock Toy</div></button>
            <button class="sound-opt" onclick="openCoinSorter();closeSoundOverlay()"><div class="sound-emoji">🪙</div><div class="sound-name">Coin Maker</div></button>
            <button class="sound-opt" onclick="openMathGenie();closeSoundOverlay()"><div class="sound-emoji">🔮</div><div class="sound-name">Math Genie</div></button>
        </div>
        <div class="hub-section-label">🎨 Creative</div>
        <div class="sound-options" style="grid-template-columns:repeat(3,1fr);">
            <button class="sound-opt" onclick="openDrawPad();closeSoundOverlay()"><div class="sound-emoji">✏️</div><div class="sound-name">Drawing Pad</div></button>
            <button class="sound-opt" onclick="openMusicMaker();closeSoundOverlay()"><div class="sound-emoji">🎼</div><div class="sound-name">Music Maker</div></button>
            <button class="sound-opt" onclick="openSoundboard();closeSoundOverlay()"><div class="sound-emoji">🎹</div><div class="sound-name">Sounds</div></button>
        </div>
        <button class="sound-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// Consolidated "More" menu for less-used controls
function openMoreMenu() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    const sp = (typeof loadSoundProfile === 'function') ? loadSoundProfile() : 'cheerful';
    const spEmoji = sp === 'silent' ? '🤫' : sp === 'gentle' ? '🍃' : '🎉';
    overlay.innerHTML = `<div class="sound-card hub-card">
        <h2>⋯ More</h2>
        <div class="sound-sub">Collections, settings, and surprises.</div>
        <div class="hub-section-label">🗺️ Explore</div>
        <div class="sound-options" style="grid-template-columns:repeat(3,1fr);">
            <button class="sound-opt" onclick="openTrophyRoom();closeSoundOverlay()"><div class="sound-emoji">🏆</div><div class="sound-name">Trophies</div></button>
            <button class="sound-opt" onclick="openProgressMap();closeSoundOverlay()"><div class="sound-emoji">🗺️</div><div class="sound-name">Journey</div></button>
            <button class="sound-opt" onclick="openStoryHub();closeSoundOverlay()"><div class="sound-emoji">📚</div><div class="sound-name">Stories</div></button>
            <button class="sound-opt" onclick="openMathToys();closeSoundOverlay()"><div class="sound-emoji">🧰</div><div class="sound-name">Toys</div></button>
            <button class="sound-opt" onclick="openScrapbook();closeSoundOverlay()"><div class="sound-emoji">📖</div><div class="sound-name">Stickers</div></button>
            <button class="sound-opt" onclick="openGlossary();closeSoundOverlay()"><div class="sound-emoji">📚</div><div class="sound-name">Words</div></button>
        </div>
        <div class="hub-section-label">💰 Goals & Surprises</div>
        <div class="sound-options" style="grid-template-columns:repeat(2,1fr);">
            <button class="sound-opt" onclick="openSavingsGoalPicker();closeSoundOverlay()"><div class="sound-emoji">💰</div><div class="sound-name">Set a Goal</div></button>
            <button class="sound-opt" onclick="surpriseMe();closeSoundOverlay()"><div class="sound-emoji">🎲</div><div class="sound-name">Surprise</div></button>
        </div>
        <div class="hub-section-label">💬 Voice</div>
        <div class="sound-options" style="grid-template-columns:repeat(2,1fr);">
            <button class="sound-opt" onclick="hakanSays();closeSoundOverlay()"><div class="sound-emoji">🎤</div><div class="sound-name">Hakan Says</div></button>
            <button class="sound-opt" onclick="openSoundProfilePicker();closeSoundOverlay()"><div class="sound-emoji">${spEmoji}</div><div class="sound-name">Sound</div></button>
        </div>
        <div class="hub-section-label">⚙️ Settings</div>
        <div class="sound-options" style="grid-template-columns:repeat(3,1fr);">
            <button class="sound-opt" onclick="openComfortPicker();closeSoundOverlay()"><div class="sound-emoji">🅰️</div><div class="sound-name">Comfort</div></button>
            <button class="sound-opt" onclick="openThemePicker();closeSoundOverlay()"><div class="sound-emoji">🎨</div><div class="sound-name">Theme</div></button>
            <button class="sound-opt" onclick="openHelpScreen();closeSoundOverlay()"><div class="sound-emoji">❓</div><div class="sound-name">Help</div></button>
        </div>
        <button class="sound-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// "🎁 Today" hub — bundles the daily extras that used to clutter the home
// page: POTD, Daily Spin, Quick Math, Quests, lucky color/number, math joke,
// fun fact, daily tip. One tap from home, easy to find, easy to dismiss.
function openTodayHub() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay today-overlay';
    const spinUsed = (typeof _spinUsedToday === 'function') ? _spinUsedToday() : true;
    const lucky = (typeof todaysLuckyColor === 'function') ? todaysLuckyColor() : null;
    const luckyNum = (typeof todaysLuckyNumber === 'function') ? todaysLuckyNumber() : null;
    const joke = (typeof todaysMathJoke === 'function') ? todaysMathJoke() : null;
    const fact = (typeof todaysFunFact === 'function') ? todaysFunFact() : null;
    const aff = (typeof todaysAffirmation === 'function') ? todaysAffirmation() : null;

    // POTD chip
    let potdHTML = '';
    if (typeof _potdToday === 'function' && typeof POTD_POOL !== 'undefined') {
        const potd = _potdToday();
        const prob = POTD_POOL[potd.idx];
        if (prob) {
            potdHTML = `<button class="today-tile today-potd ${potd.solved ? 'today-done' : ''}" onclick="closeSoundOverlay(); openProblemOfTheDay();">
                <div class="today-tile-label">🎯 Problem of the Day</div>
                <div class="today-tile-body">${potd.solved ? '✅ Solved!' : prob.q}</div>
                <div class="today-tile-prize">${potd.solved ? 'Back tomorrow!' : '+5 💎'}</div>
            </button>`;
        }
    }

    // Daily quests block
    let questsHTML = '';
    if (typeof loadDailyQuests === 'function') {
        const qs = loadDailyQuests();
        if (qs && qs.quests && qs.quests.length) {
            const rerollDone = (typeof _todayRerolled === 'function' && _todayRerolled());
            questsHTML = `<section class="quests-panel today-quests">
                <div class="qp-header">
                    <div class="qp-label">📋 Today's Quests</div>
                    <button class="qp-reroll ${rerollDone ? 'qp-reroll-used' : ''}" onclick="rerollDailyQuests(); openTodayHub();" ${rerollDone ? 'disabled' : ''}>🎲 ${rerollDone ? 'Used' : 'Reroll'}</button>
                </div>
                <div class="qp-list">
                ${qs.quests.map((q) => {
                    const pct = Math.min(100, Math.round(((q.progress || 0) / q.target) * 100));
                    const done = q.claimed;
                    return `<div class="qp-item ${done ? 'qp-done' : ''}">
                        <div class="qp-row1">
                            <span class="qp-text">${q.text}</span>
                            <span class="qp-robux">${done ? '✓' : '+' + q.robux + ' 💎'}</span>
                        </div>
                        <div class="qp-bar"><div class="qp-fill" style="width:${pct}%"></div></div>
                        <div class="qp-progress">${q.progress || 0} / ${q.target}</div>
                    </div>`;
                }).join('')}
                </div>
            </section>`;
        }
    }

    overlay.innerHTML = `<div class="sound-card today-card">
        <h2>🎁 Today</h2>
        <div class="sound-sub">Bonuses, surprises, and the day's fun stuff.</div>
        ${aff ? `<div class="affirmation-card today-affirm">${aff}</div>` : ''}
        <div class="today-grid">
            <button class="today-tile today-spin ${spinUsed ? 'today-done' : ''}" onclick="closeSoundOverlay(); openDailySpin();">
                <div class="today-tile-label">🎡 Daily Spin</div>
                <div class="today-tile-body">${spinUsed ? '✅ Used today!' : 'Spin for a prize!'}</div>
                <div class="today-tile-prize">${spinUsed ? 'Back tomorrow!' : 'Tap to spin'}</div>
            </button>
            ${potdHTML}
            <button class="today-tile today-quickmath" onclick="closeSoundOverlay(); openQuickMath();">
                <div class="today-tile-label">⚡ Quick Math</div>
                <div class="today-tile-body">5 quick problems</div>
                <div class="today-tile-prize">+5 💎 max</div>
            </button>
            <button class="today-tile today-teaser" onclick="closeSoundOverlay(); openBrainTeaser();">
                <div class="today-tile-label">🧩 Brain Teaser</div>
                <div class="today-tile-body">A puzzle for today</div>
                <div class="today-tile-prize">+3 💎</div>
            </button>
        </div>
        ${questsHTML}
        <div class="today-row">
            ${lucky ? `<div class="today-chip today-lucky"><span class="lc-swatch" style="background:${lucky.hex}"></span> Lucky color: <b style="color:${lucky.hex}">${lucky.name}</b> ${lucky.emoji}</div>` : ''}
            ${luckyNum != null ? `<div class="today-chip today-luckynum">🍀 Lucky number: <b>${luckyNum}</b></div>` : ''}
        </div>
        ${joke ? `<div class="joke-card today-joke" onclick="this.classList.toggle('joke-open')">
            <div class="joke-label">😂 Math Joke</div>
            <div class="joke-q">${joke.q}</div>
            <div class="joke-a">${joke.a}</div>
            <div class="joke-hint">Tap to flip</div>
        </div>` : ''}
        ${fact ? `<div class="funfact today-fact">🧠 ${fact}</div>` : ''}
        <button class="sound-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}
function closeSoundOverlay() {
    document.querySelectorAll('.sound-overlay').forEach((o) => o.remove());
}

// ===== Brain Drills — quick math drills via simple overlays =====
function openBrainDrills() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    overlay.innerHTML = `<div class="sound-card">
        <h2>🧠 Brain Drills</h2>
        <div class="sound-sub">Quick math workouts, +1 💎 each.</div>
        <div class="sound-options" style="grid-template-columns:repeat(2,1fr);">
            <button class="sound-opt" onclick="runDrill('numberbond')"><div class="sound-emoji">🔟</div><div class="sound-name">Friends of 10</div><div class="sound-desc">What makes 10?</div></button>
            <button class="sound-opt" onclick="runDrill('doubles')"><div class="sound-emoji">👯</div><div class="sound-name">Doubles</div><div class="sound-desc">2+2, 5+5, 9+9</div></button>
            <button class="sound-opt" onclick="runDrill('counton')"><div class="sound-emoji">⬆️</div><div class="sound-name">Count On</div><div class="sound-desc">Count up by 1</div></button>
            <button class="sound-opt" onclick="runDrill('skipcount')"><div class="sound-emoji">⏭️</div><div class="sound-name">Skip Count</div><div class="sound-desc">By 2s, 5s, 10s</div></button>
            <button class="sound-opt" onclick="runDrill('compare')"><div class="sound-emoji">⚖️</div><div class="sound-name">Bigger?</div><div class="sound-desc">Pick bigger #</div></button>
            <button class="sound-opt" onclick="runDrill('mixed')"><div class="sound-emoji">🎲</div><div class="sound-name">Mixed</div><div class="sound-desc">A bit of all</div></button>
        </div>
        <button class="sound-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

function runDrill(type) {
    document.querySelectorAll('.sound-overlay').forEach((o) => o.remove());
    const probs = _generateDrillProblems(type, 5);
    let idx = 0, correct = 0;
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    function renderQ() {
        if (idx >= probs.length) {
            const reward = correct;
            if (reward > 0) saveRobux(loadRobux() + reward);
            overlay.innerHTML = `<div class="potd-card">
                <h2>🧠 Drill done!</h2>
                <div class="qm-score">${correct} / ${probs.length}</div>
                <div class="qm-reward">+${reward} 💎</div>
                <button class="potd-close">Awesome</button>
            </div>`;
            overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
            if (correct === probs.length && typeof launchConfetti === 'function') launchConfetti();
            return;
        }
        const cur = probs[idx];
        if (cur.type === 'compare') {
            overlay.innerHTML = `<div class="potd-card">
                <h2>⚖️ Which is bigger?</h2>
                <div class="qm-progress">${idx + 1} of ${probs.length}</div>
                <div class="drill-compare">
                    <button class="dc-btn" data-pick="${cur.a}">${cur.a}</button>
                    <span class="dc-vs">vs</span>
                    <button class="dc-btn" data-pick="${cur.b}">${cur.b}</button>
                </div>
                <div class="potd-feedback"></div>
            </div>`;
            const fb = overlay.querySelector('.potd-feedback');
            overlay.querySelectorAll('.dc-btn').forEach((b) => {
                b.addEventListener('click', () => {
                    const pick = parseInt(b.getAttribute('data-pick'), 10);
                    if (pick === cur.answer) {
                        correct++;
                        fb.innerHTML = '<div class="potd-correct">✅ Yes!</div>';
                        playSound('correct');
                    } else {
                        fb.innerHTML = '<div class="potd-wrong">Other one was bigger!</div>';
                        playSound('wrong');
                    }
                    setTimeout(() => { idx++; renderQ(); }, 700);
                });
            });
        } else {
            overlay.innerHTML = `<div class="potd-card">
                <h2>${cur.title || '🧠 Quick!'}</h2>
                <div class="qm-progress">${idx + 1} of ${probs.length}</div>
                <div class="potd-question">${cur.q}</div>
                <input type="number" class="potd-input" autocomplete="off" inputmode="numeric" />
                <div class="potd-actions">
                    <button class="potd-check">Check</button>
                    <button class="qm-skip">Skip</button>
                </div>
                <div class="potd-feedback"></div>
            </div>`;
            const input = overlay.querySelector('.potd-input');
            const fb = overlay.querySelector('.potd-feedback');
            const submit = () => {
                const val = parseInt(input.value, 10);
                if (Number.isNaN(val)) return;
                if (val === cur.a) {
                    correct++;
                    fb.innerHTML = `<div class="potd-correct">✅ ${cur.q.replace('?', cur.a)}</div>`;
                    playSound('correct');
                    setTimeout(() => { idx++; renderQ(); }, 700);
                } else {
                    fb.innerHTML = `<div class="potd-wrong">Answer was ${cur.a}.</div>`;
                    playSound('wrong');
                    setTimeout(() => { idx++; renderQ(); }, 1000);
                }
            };
            overlay.querySelector('.potd-check').addEventListener('click', submit);
            overlay.querySelector('.qm-skip').addEventListener('click', () => { idx++; renderQ(); });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
            setTimeout(() => input.focus(), 50);
        }
    }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    renderQ();
}

function _generateDrillProblems(type, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
        if (type === 'numberbond') {
            const target = 10;
            const a = 1 + Math.floor(Math.random() * 9);
            out.push({ q: `${a} + ? = ${target}`, a: target - a });
        } else if (type === 'doubles') {
            const x = 1 + Math.floor(Math.random() * 10);
            out.push({ q: `${x} + ${x} = ?`, a: x + x });
        } else if (type === 'counton') {
            const x = 5 + Math.floor(Math.random() * 14);
            const c = 1 + Math.floor(Math.random() * 3);
            out.push({ q: `${x} + ${c} = ?`, a: x + c });
        } else if (type === 'skipcount') {
            const by = [2, 5, 10][Math.floor(Math.random() * 3)];
            const start = by * (1 + Math.floor(Math.random() * 4));
            out.push({ q: `${start}, ${start + by}, ?`, a: start + 2 * by, title: `⏭️ Skip by ${by}` });
        } else if (type === 'compare') {
            let a, b;
            do {
                a = 1 + Math.floor(Math.random() * 50);
                b = 1 + Math.floor(Math.random() * 50);
            } while (a === b);
            out.push({ type: 'compare', a, b, answer: Math.max(a, b) });
        } else {
            // mixed
            const k = ['numberbond', 'doubles', 'counton', 'skipcount', 'compare'][Math.floor(Math.random() * 5)];
            out.push.apply(out, _generateDrillProblems(k, 1));
        }
    }
    return out.slice(0, n);
}

// ===== Math jokes (Grade 1 friendly) =====
const MATH_JOKES = [
    { q: "Why was 6 afraid of 7?", a: "Because 7, 8, 9! 😂" },
    { q: "What did 0 say to 8?", a: "Nice belt! 🎀" },
    { q: "Why don't math books smile?", a: "They have too many problems! 📚" },
    { q: "What's a math teacher's favorite snack?", a: "Pi! 🥧" },
    { q: "How do you make 7 even?", a: "Take away the S! ✨" },
    { q: "What did 5 say to 10?", a: "Wow, you're TWICE me! 🙌" },
    { q: "Why was the math book sad?", a: "It had too many problems to solve!" },
    { q: "What goes up but never comes down?", a: "Your age! 🎂" },
    { q: "What did 2 say to 4?", a: "I'm half the kid you are! 🤝" },
    { q: "Why did the triangle play sports?", a: "It had the best angles! 📐" },
    { q: "How does a math teacher say goodbye?", a: "See you 'later'-al! 👋" },
    { q: "What's a number's favorite drink?", a: "Eight juice (juice of 8s)! 🧃" },
    { q: "What kind of tree do math kids climb?", a: "A geome-TREE! 🌳" },
    { q: "What do you call 2 friends who love math?", a: "Algeb-buddies! 👯" },
    { q: "What's a vampire's favorite fraction?", a: "TWO-thirds! 🧛" },
    { q: "Why did 9 break up with 10?", a: "9 was just too odd! 😄" },
    { q: "Why is six scared of seven?", a: "Because 7 ATE 9 (and 6 was next)! 😱" },
    { q: "What's the king of the school supplies?", a: "The ruler! 📏" },
    { q: "What's a math teacher's favorite ice cream?", a: "Sum-thing tasty! 🍦" },
    { q: "What do you call a math test that argues?", a: "A SUM problem! 🥊" },
    { q: "Why was the equal sign so humble?", a: "It wasn't more, it wasn't less! ⚖️" },
    { q: "What kind of dance do numbers do?", a: "The cha-cha-cha (3-3-3)! 💃" },
    { q: "Why was 11 left out?", a: "Because 10, 12 was a pair! 👯" },
    { q: "What do you get when you cross a math book and a poet?", a: "Lots of poetry-tics! 📖" },
    { q: "What's a number's favorite vacation?", a: "Going on a sum-mer trip! ☀️" },
    { q: "Why was the math student wet?", a: "Their work had so many problems, it rained! 🌧️" },
];

function todaysMathJoke() {
    const dayKey = new Date().toISOString().slice(0, 10);
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return MATH_JOKES[seed % MATH_JOKES.length];
}

// ===== Lucky number of the day =====
function todaysLuckyNumber() {
    const dayKey = new Date().toISOString().slice(0, 10);
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return (seed % 20) + 1;  // 1-20
}

// ===== Mascot wink + tap-counter for rainbow easter egg =====
let _mascotTapCount = 0;
let _mascotTapTimer = null;
function _wrapMascotForWink() {
    if (window._mascotWinkSetup) return;
    window._mascotWinkSetup = true;
    document.addEventListener('click', (e) => {
        const m = e.target.closest('.game-mascot, .mascot');
        if (!m) return;
        // Wink animation
        m.classList.remove('mascot-wink');
        void m.offsetWidth;
        m.classList.add('mascot-wink');
        setTimeout(() => m.classList.remove('mascot-wink'), 600);
        // Tap counter for rainbow easter egg
        _mascotTapCount++;
        if (_mascotTapTimer) clearTimeout(_mascotTapTimer);
        _mascotTapTimer = setTimeout(() => { _mascotTapCount = 0; }, 2000);
        if (_mascotTapCount >= 5) {
            _mascotTapCount = 0;
            _triggerRainbowMode();
        }
    });
}
_wrapMascotForWink();

// Click ripple effect on important buttons (gentle visual response).
function _initClickRipple() {
    if (window._rippleSetup) return;
    window._rippleSetup = true;
    document.addEventListener('click', (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('back-btn') || t.classList.contains('num-key')) return;
        const r = document.createElement('span');
        r.className = 'click-ripple';
        r.style.left = e.clientX + 'px';
        r.style.top = e.clientY + 'px';
        r.style.width = '20px';
        r.style.height = '20px';
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 700);
    });
}
_initClickRipple();

function _triggerRainbowMode() {
    document.documentElement.classList.add('rainbow-mode');
    if (typeof launchConfetti === 'function') launchConfetti();
    if (typeof speak === 'function') speak("Rainbow mode, Hakan!");
    setTimeout(() => {
        document.documentElement.classList.remove('rainbow-mode');
    }, 8000);
}

// ===== Emoji rain for big moments =====
function emojiRain(emojis, count) {
    const list = emojis || ['🌟', '✨', '💫', '🎉', '🎊'];
    count = count || 20;
    for (let i = 0; i < count; i++) {
        const e = document.createElement('div');
        e.className = 'emoji-rain';
        e.textContent = list[Math.floor(Math.random() * list.length)];
        e.style.left = (Math.random() * 100) + '%';
        e.style.animationDelay = (Math.random() * 0.8) + 's';
        e.style.animationDuration = (2 + Math.random() * 1.5) + 's';
        document.body.appendChild(e);
        setTimeout(() => e.remove(), 4000);
    }
}

// Kid-friendly help screen showing what each button does.
function openHelpScreen() {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'cert-overlay help-overlay';
    overlay.innerHTML = `<div class="cert-card help-card">
        <h2 style="text-align:center;color:var(--primary);margin:0 0 12px;">❓ How to Play</h2>
        <div class="help-list">
            <div class="help-row"><span class="help-icon">🎯</span><div><b>Practice</b> — Try problems with hints! Make mistakes, that's how brains grow.</div></div>
            <div class="help-row"><span class="help-icon">⭐</span><div><b>Quiz</b> — No hints, but you earn stars (1, 2, or 3) and 💎 Robux!</div></div>
            <div class="help-row"><span class="help-icon">📚</span><div><b>Lesson</b> — Read or listen to the idea before practice. Tap 🔊 to hear it again.</div></div>
            <div class="help-row"><span class="help-icon">💡</span><div><b>Hint</b> — Stuck? Wait a few seconds, then tap. Hints don't change your score.</div></div>
            <div class="help-row"><span class="help-icon">🔥</span><div><b>Streak</b> — Practice each day to grow your streak. 🛡️ One free skip per week!</div></div>
            <div class="help-row"><span class="help-icon">🐾</span><div><b>Pet</b> — Your math buddy grows as you earn stars. Tap to change.</div></div>
            <div class="help-row"><span class="help-icon">🏆</span><div><b>Trophies</b> — Earn badges for big achievements. There are over 90!</div></div>
            <div class="help-row"><span class="help-icon">🎮</span><div><b>Games</b> — Mini-games to make math fast and fun.</div></div>
            <div class="help-row"><span class="help-icon">💎</span><div><b>Robux</b> — Earn them by doing quizzes, daily bonuses, and mini-games.</div></div>
            <div class="help-row"><span class="help-icon">🅰️</span><div><b>Comfort</b> — Change text size, motion, voice speed, or use easy-read font.</div></div>
        </div>
        <button class="help-close">Got it!</button>
    </div>`;
    overlay.querySelector('.help-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// One-tap encouragement: speak a random Hakan-shoutout.
function hakanSays() {
    const pool = MESSAGES.correct.concat(MESSAGES.start || []);
    const msg = pool[Math.floor(Math.random() * pool.length)];
    playSound('click');
    if (typeof speak === 'function') speak(msg);
    // Tiny floating bubble for visual feedback.
    const el = document.createElement('div');
    el.className = 'hakansays-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('hs-show'), 30);
    setTimeout(() => {
        el.classList.remove('hs-show');
        setTimeout(() => el.remove(), 400);
    }, 2400);
}

// Tap the mascot photo to replay the current speech-bubble text.
function _initMascotTap() {
    document.addEventListener('click', (e) => {
        const m = e.target.closest('.game-mascot, .mascot');
        if (!m) return;
        const bubble = m.parentElement && m.parentElement.querySelector('.speech-bubble');
        if (!bubble) return;
        const text = bubble.textContent.trim();
        if (text && typeof speak === 'function') {
            playSound('click');
            speak(text);
        }
    });
}
_initMascotTap();

// ===== Quick Math — 5 mixed problems in a focused overlay =====
function openQuickMath() {
    playSound('click');
    const probs = _generateQuickMathProblems(5);
    let idx = 0, correct = 0, attempts = 0;
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay qm-overlay';
    function render() {
        if (idx >= probs.length) {
            const reward = correct * 1;  // 1 robux per right (5 max)
            if (reward > 0 && typeof saveRobux === 'function' && typeof loadRobux === 'function') {
                saveRobux(loadRobux() + reward);
            }
            overlay.innerHTML = `<div class="potd-card qm-card">
                <h2>⚡ Quick Math done!</h2>
                <div class="qm-score">You got <b>${correct} / ${probs.length}</b></div>
                <div class="qm-reward">+${reward} 💎</div>
                <button class="potd-close">Awesome</button>
            </div>`;
            overlay.querySelector('.potd-close').addEventListener('click', () => {
                overlay.remove();
                if (typeof renderHomeModules === 'function') renderHomeModules();
            });
            return;
        }
        const cur = probs[idx];
        overlay.innerHTML = `<div class="potd-card qm-card">
            <h2>⚡ Quick Math</h2>
            <div class="qm-progress">Question ${idx + 1} of ${probs.length}</div>
            <div class="potd-question">${cur.q}</div>
            <input type="number" class="potd-input" autocomplete="off" inputmode="numeric" />
            <div class="potd-actions">
                <button class="potd-check">Check</button>
                <button class="qm-skip">Skip</button>
            </div>
            <div class="potd-feedback"></div>
        </div>`;
        const input = overlay.querySelector('.potd-input');
        const fb = overlay.querySelector('.potd-feedback');
        const submit = () => {
            const val = parseInt(input.value, 10);
            if (Number.isNaN(val)) return;
            attempts++;
            if (val === cur.a) {
                correct++;
                fb.innerHTML = `<div class="potd-correct">✅ ${cur.q.replace('?', cur.a)}</div>`;
                playSound('correct');
                setTimeout(() => { idx++; render(); }, 700);
            } else {
                fb.innerHTML = `<div class="potd-wrong">Answer: ${cur.a}. Onward!</div>`;
                playSound('wrong');
                setTimeout(() => { idx++; render(); }, 1100);
            }
        };
        overlay.querySelector('.potd-check').addEventListener('click', submit);
        overlay.querySelector('.qm-skip').addEventListener('click', () => { idx++; render(); });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        setTimeout(() => input.focus(), 50);
    }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    render();
}

function _generateQuickMathProblems(n) {
    const out = [];
    const types = ['add', 'sub', 'add', 'missing', 'sub'];
    for (let i = 0; i < n; i++) {
        const t = types[i % types.length];
        let a, b, ans, q;
        if (t === 'add') {
            a = 1 + Math.floor(Math.random() * 10);
            b = 1 + Math.floor(Math.random() * 10);
            ans = a + b;
            q = `${a} + ${b} = ?`;
        } else if (t === 'sub') {
            a = 5 + Math.floor(Math.random() * 14);
            b = 1 + Math.floor(Math.random() * Math.min(a - 1, 9));
            ans = a - b;
            q = `${a} - ${b} = ?`;
        } else {
            // Missing addend: a + ? = c
            a = 1 + Math.floor(Math.random() * 9);
            ans = 1 + Math.floor(Math.random() * 9);
            const c = a + ans;
            q = `${a} + ? = ${c}`;
        }
        out.push({ q, a: ans });
    }
    return out;
}

// MEGA 10-in-a-row celebration
function _mega10() {
    const overlay = document.createElement('div');
    overlay.className = 'mega10-overlay';
    overlay.innerHTML = `<div class="mega10-text">10 IN A ROW!</div>
                         <div class="mega10-sub">YOU'RE ON FIRE, HAKAN! 🔥🔥🔥</div>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('mega10-show'), 30);
    if (typeof launchConfetti === 'function') launchConfetti();
    if (typeof emojiRain === 'function') emojiRain(['🔥','⭐','🎉','💫','🏆','🚀'], 40);
    playSound('win');
    if (typeof speak === 'function') speak("Ten in a row, Hakan! Amazing!");
    saveRobux(loadRobux() + 10);
    setTimeout(() => {
        overlay.classList.remove('mega10-show');
        setTimeout(() => overlay.remove(), 400);
    }, 2800);
}

// "Ready Set Go" countdown when entering a fresh module session
function _readyCountdown(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'ready-overlay';
    document.body.appendChild(overlay);
    const steps = ['Ready?', 'Set...', 'GO! 🚀'];
    let i = 0;
    const tick = () => {
        if (i >= steps.length) {
            overlay.remove();
            if (callback) callback();
            return;
        }
        overlay.innerHTML = `<div class="ready-text">${steps[i]}</div>`;
        playSound(i === 2 ? 'win' : 'click');
        i++;
        setTimeout(tick, 600);
    };
    tick();
}

// Snack-break suggestion after long sessions.
function _showSnackBreak() {
    const tips = [
        "Take a sip of water, Hakan! 💧",
        "Look out the window for 10 seconds — let your eyes rest! 👀",
        "Stand up and stretch! 🙆",
        "Do 5 jumping jacks! 🦘",
        "Take 3 deep breaths! 🌬️",
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    const el = document.createElement('div');
    el.className = 'snack-break';
    el.innerHTML = `<div class="sbk-emoji">🧃</div>
                    <div class="sbk-title">Snack break!</div>
                    <div class="sbk-tip">${tip}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('sbk-show'), 50);
    setTimeout(() => {
        el.classList.remove('sbk-show');
        setTimeout(() => el.remove(), 400);
    }, 3500);
}

// Tiny pet-happy heart that floats up briefly when Hakan gets an answer right.
function _petHappyHeart() {
    const h = document.createElement('div');
    h.className = 'pet-happy-heart';
    h.textContent = '💕';
    h.style.left = (40 + Math.random() * 20) + 'vw';
    document.body.appendChild(h);
    setTimeout(() => h.classList.add('ph-go'), 30);
    setTimeout(() => h.remove(), 1200);
}

// First-correct-in-session celebration: a quick burst of stars
function _firstCorrectCelebration() {
    if (typeof spawnFloatingStars === 'function') spawnFloatingStars(6);
    const el = document.createElement('div');
    el.className = 'first-correct-toast';
    el.innerHTML = `<div class="fc-emoji">🌟</div><div class="fc-text">Great start, Hakan!</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('fc-show'), 30);
    setTimeout(() => {
        el.classList.remove('fc-show');
        setTimeout(() => el.remove(), 400);
    }, 1500);
}

// "NEW BEST!" splash for mini-game records.
function _showNewBestSplash(name, score, prevBest) {
    const el = document.createElement('div');
    el.className = 'newbest-splash';
    el.innerHTML = `<div class="nb-emoji">🏅</div>
                    <div class="nb-text">NEW BEST!</div>
                    <div class="nb-sub">${score}${prevBest ? ` (was ${prevBest})` : ''} · ${name}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('nb-show'), 30);
    setTimeout(() => {
        el.classList.remove('nb-show');
        setTimeout(() => el.remove(), 400);
    }, 2200);
}

// Mystery box reward: random chance after a session, tap to reveal.
function showMysteryBox() {
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay mystery-overlay';
    overlay.innerHTML = `<div class="potd-card mystery-card">
        <div class="mystery-box">📦</div>
        <h2>Mystery Box, Hakan!</h2>
        <div class="mystery-sub">Tap to open!</div>
        <button class="mystery-open">Open it!</button>
    </div>`;
    overlay.querySelector('.mystery-open').addEventListener('click', () => {
        // Pick the reward
        const rewards = [
            { kind: 'robux', n: 5,  emoji: '💎', text: '+5 Robux' },
            { kind: 'robux', n: 3,  emoji: '💎', text: '+3 Robux' },
            { kind: 'robux', n: 10, emoji: '💎', text: '+10 Robux!' },
            { kind: 'sticker',     emoji: '🌟', text: 'Bonus sticker!' },
            { kind: 'robux', n: 2,  emoji: '💎', text: '+2 Robux' },
        ];
        const r = rewards[Math.floor(Math.random() * rewards.length)];
        if (r.kind === 'robux') saveRobux(loadRobux() + r.n);
        else if (r.kind === 'sticker') {
            // Add a random sticker from STICKER_POOL if available
            if (typeof STICKER_POOL !== 'undefined' && typeof loadStickers === 'function' && typeof saveStickers === 'function') {
                const arr = loadStickers();
                const s = STICKER_POOL[Math.floor(Math.random() * STICKER_POOL.length)];
                arr.push({ sticker: s, when: Date.now(), bonus: true });
                saveStickers(arr);
            }
        }
        overlay.innerHTML = `<div class="potd-card mystery-card">
            <div class="mystery-reveal">${r.emoji}</div>
            <h2>${r.text}</h2>
            <div class="mystery-sub">Awesome work, Hakan!</div>
            <button class="potd-close">Sweet!</button>
        </div>`;
        overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
        if (typeof launchConfetti === 'function') launchConfetti();
        playSound('win');
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// Big "PERFECT!" splash when Hakan 3-stars a quiz.
function showPerfectSplash(mod) {
    const overlay = document.createElement('div');
    overlay.className = 'perfect-overlay';
    overlay.innerHTML = `<div class="perfect-card">
        <div class="perfect-emoji">🏆</div>
        <div class="perfect-text">PERFECT!</div>
        <div class="perfect-sub">${mod ? mod.title : ''}</div>
        <div class="perfect-stars">⭐⭐⭐</div>
        <button class="perfect-close">Awesome!</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.perfect-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
    if (typeof launchConfetti === 'function') {
        launchConfetti();
        setTimeout(launchConfetti, 800);
    }
    playSound('win');
}

// Persistent hot-streak banner during the current session.
function showHotStreakBanner(streak) {
    let el = document.getElementById('hot-streak-banner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'hot-streak-banner';
        el.className = 'hot-streak-banner';
        document.body.appendChild(el);
    }
    el.innerHTML = `<span class="hsb-flame">🔥</span> Hot streak — <b>${streak}</b> in a row, Hakan!`;
    el.classList.remove('hsb-pulse');
    void el.offsetWidth;
    el.classList.add('hsb-pulse');
}

// Floating high-five popup — fires every 3 in a row.
function showHighFive(streak) {
    const emojis = ['🙌', '🎯', '⚡', '🚀', '🌟'];
    const e = emojis[Math.floor(Math.random() * emojis.length)];
    const el = document.createElement('div');
    el.className = 'highfive-toast';
    el.innerHTML = `<div class="hf-emoji">${e}</div>
                    <div class="hf-text">${streak} in a row, Hakan!</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('hf-show'), 30);
    playSound('sparkle');
    setTimeout(() => {
        el.classList.remove('hf-show');
        setTimeout(() => el.remove(), 400);
    }, 1400);
}

// ===== Comfort settings (text size + motion) =====
const TEXT_SIZE_KEY = 'hakans-math-text-size';
const MOTION_KEY    = 'hakans-math-motion';

function loadTextSize() {
    try { return localStorage.getItem(TEXT_SIZE_KEY) || 'medium'; }
    catch (e) { return 'medium'; }
}
function saveTextSize(s) {
    try { localStorage.setItem(TEXT_SIZE_KEY, s); } catch (e) {}
    applyComfortSettings();
}
function loadMotion() {
    try {
        const v = localStorage.getItem(MOTION_KEY);
        if (v) return v;
    } catch (e) {}
    // Default: honor the OS-level reduce-motion setting.
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return 'reduced';
        }
    } catch (e) {}
    return 'full';
}
function saveMotion(m) {
    try { localStorage.setItem(MOTION_KEY, m); } catch (e) {}
    applyComfortSettings();
}

function loadFontStyle() {
    try { return localStorage.getItem('hakans-math-font') || 'default'; }
    catch (e) { return 'default'; }
}
function saveFontStyle(s) {
    try { localStorage.setItem('hakans-math-font', s); } catch (e) {}
    applyComfortSettings();
}
function loadShowTimer() {
    try { return localStorage.getItem('hakans-math-timer') === 'on'; }
    catch (e) { return false; }
}
function saveShowTimer(on) {
    try { localStorage.setItem('hakans-math-timer', on ? 'on' : 'off'); } catch (e) {}
    applyComfortSettings();
}
function loadVoiceSpeed() {
    try { return localStorage.getItem('hakans-math-voice-speed') || 'normal'; }
    catch (e) { return 'normal'; }
}
function saveVoiceSpeed(s) {
    try { localStorage.setItem('hakans-math-voice-speed', s); } catch (e) {}
}
function loadTheme() {
    try { return localStorage.getItem('hakans-math-theme') || 'default'; }
    catch (e) { return 'default'; }
}
function saveTheme(t) {
    try { localStorage.setItem('hakans-math-theme', t); } catch (e) {}
    applyComfortSettings();
}

function openThemePicker() {
    playSound('click');
    const cur = loadTheme();
    const themes = [
        { id: 'default', emoji: '🟣', name: 'Classic' },
        { id: 'sky',     emoji: '☁️',  name: 'Sky' },
        { id: 'ocean',   emoji: '🌊', name: 'Ocean' },
        { id: 'jungle',  emoji: '🌴', name: 'Jungle' },
        { id: 'space',   emoji: '🚀', name: 'Space' },
        { id: 'candy',   emoji: '🍬', name: 'Candy' },
    ];
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    overlay.innerHTML = `<div class="sound-card">
        <h2>🎨 Theme</h2>
        <div class="sound-sub">Pick how the app looks.</div>
        <div class="sound-options" style="grid-template-columns:repeat(3,1fr);">
            ${themes.map((t) => `<button class="sound-opt ${cur===t.id?'sound-current':''} theme-preview-${t.id}" data-t="${t.id}">
                <div class="sound-emoji">${t.emoji}</div>
                <div class="sound-name">${t.name}</div>
            </button>`).join('')}
        </div>
        <button class="sound-close">Done</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelectorAll('[data-t]').forEach((b) => {
        b.addEventListener('click', () => {
            saveTheme(b.getAttribute('data-t'));
            overlay.remove();
            if (typeof renderHomeModules === 'function') renderHomeModules();
        });
    });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

function loadFeedbackIntensity() {
    try { return localStorage.getItem('hakans-math-feedback') || 'normal'; }
    catch (e) { return 'normal'; }
}
function saveFeedbackIntensity(v) {
    try { localStorage.setItem('hakans-math-feedback', v); } catch (e) {}
    applyComfortSettings();
}

function applyComfortSettings() {
    const root = document.documentElement;
    const size = loadTextSize();
    root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    root.classList.add(`text-size-${size}`);
    const motion = loadMotion();
    root.classList.remove('motion-full', 'motion-reduced');
    root.classList.add(`motion-${motion}`);
    const font = loadFontStyle();
    root.classList.remove('font-default', 'font-dyslexic');
    root.classList.add(`font-${font}`);
    const timer = loadShowTimer();
    root.classList.toggle('show-timer', timer);
    const fb = loadFeedbackIntensity();
    root.classList.remove('feedback-normal', 'feedback-gentle');
    root.classList.add(`feedback-${fb}`);
    const th = loadTheme();
    root.classList.remove('theme-default','theme-sky','theme-ocean','theme-jungle','theme-space','theme-candy');
    root.classList.add(`theme-${th}`);
}

function openComfortPicker() {
    playSound('click');
    const sz = loadTextSize();
    const mt = loadMotion();
    const ft = loadFontStyle();
    const tm = loadShowTimer();
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    overlay.innerHTML = `<div class="sound-card">
        <h2>🅰️ Comfort</h2>
        <div class="sound-sub">Pick what feels nice for you.</div>
        <div class="comfort-row-label">Text size</div>
        <div class="sound-options">
            <button class="sound-opt ${sz==='small'?'sound-current':''}"  data-sz="small"><div class="sound-emoji">a</div><div class="sound-name">Small</div></button>
            <button class="sound-opt ${sz==='medium'?'sound-current':''}" data-sz="medium"><div class="sound-emoji">A</div><div class="sound-name">Medium</div></button>
            <button class="sound-opt ${sz==='large'?'sound-current':''}"  data-sz="large"><div class="sound-emoji" style="font-size:2.4rem;">A</div><div class="sound-name">Large</div></button>
        </div>
        <div class="comfort-row-label">Motion</div>
        <div class="sound-options">
            <button class="sound-opt ${mt==='full'?'sound-current':''}"    data-mt="full"><div class="sound-emoji">🎉</div><div class="sound-name">Full</div><div class="sound-desc">Confetti &amp; bounce</div></button>
            <button class="sound-opt ${mt==='reduced'?'sound-current':''}" data-mt="reduced"><div class="sound-emoji">🧘</div><div class="sound-name">Calm</div><div class="sound-desc">Less wiggle</div></button>
        </div>
        <div class="comfort-row-label">Reading</div>
        <div class="sound-options">
            <button class="sound-opt ${ft==='default'?'sound-current':''}"  data-ft="default"><div class="sound-emoji">Aa</div><div class="sound-name">Default</div></button>
            <button class="sound-opt ${ft==='dyslexic'?'sound-current':''}" data-ft="dyslexic"><div class="sound-emoji" style="font-family:'Comic Sans MS','Verdana',sans-serif;">A b</div><div class="sound-name">Easy-read</div><div class="sound-desc">Verdana style</div></button>
        </div>
        <div class="comfort-row-label">Timer</div>
        <div class="sound-options" style="grid-template-columns: repeat(2, 1fr);">
            <button class="sound-opt ${!tm?'sound-current':''}" data-tm="off"><div class="sound-emoji">⏱️</div><div class="sound-name">Off</div><div class="sound-desc">No clock</div></button>
            <button class="sound-opt ${tm?'sound-current':''}"  data-tm="on"><div class="sound-emoji">⏱️</div><div class="sound-name">On</div><div class="sound-desc">Show seconds</div></button>
        </div>
        <div class="comfort-row-label">Voice speed</div>
        <div class="sound-options">
            <button class="sound-opt ${loadVoiceSpeed()==='slow'?'sound-current':''}"   data-vs="slow"><div class="sound-emoji">🐢</div><div class="sound-name">Slow</div></button>
            <button class="sound-opt ${loadVoiceSpeed()==='normal'?'sound-current':''}" data-vs="normal"><div class="sound-emoji">🚶</div><div class="sound-name">Normal</div></button>
            <button class="sound-opt ${loadVoiceSpeed()==='fast'?'sound-current':''}"   data-vs="fast"><div class="sound-emoji">🐇</div><div class="sound-name">Fast</div></button>
        </div>
        <div class="comfort-row-label">Wrong-answer feedback</div>
        <div class="sound-options" style="grid-template-columns: repeat(2, 1fr);">
            <button class="sound-opt ${loadFeedbackIntensity()==='normal'?'sound-current':''}" data-fb="normal"><div class="sound-emoji">🎯</div><div class="sound-name">Normal</div><div class="sound-desc">Red shake</div></button>
            <button class="sound-opt ${loadFeedbackIntensity()==='gentle'?'sound-current':''}" data-fb="gentle"><div class="sound-emoji">🌿</div><div class="sound-name">Gentle</div><div class="sound-desc">Soft fade</div></button>
        </div>
        <div class="comfort-credits">v59 · Made with ❤️ for Hakan</div>
        <button class="sound-close">Done</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelectorAll('[data-sz]').forEach((b) => {
        b.addEventListener('click', () => {
            saveTextSize(b.getAttribute('data-sz'));
            overlay.remove();
            openComfortPicker();
        });
    });
    overlay.querySelectorAll('[data-mt]').forEach((b) => {
        b.addEventListener('click', () => {
            saveMotion(b.getAttribute('data-mt'));
            overlay.remove();
            openComfortPicker();
        });
    });
    overlay.querySelectorAll('[data-ft]').forEach((b) => {
        b.addEventListener('click', () => {
            saveFontStyle(b.getAttribute('data-ft'));
            overlay.remove();
            openComfortPicker();
        });
    });
    overlay.querySelectorAll('[data-tm]').forEach((b) => {
        b.addEventListener('click', () => {
            saveShowTimer(b.getAttribute('data-tm') === 'on');
            overlay.remove();
            openComfortPicker();
        });
    });
    overlay.querySelectorAll('[data-vs]').forEach((b) => {
        b.addEventListener('click', () => {
            saveVoiceSpeed(b.getAttribute('data-vs'));
            overlay.remove();
            // Demo the new speed.
            if (typeof speak === 'function') speak("This is my voice now, Hakan!");
            openComfortPicker();
        });
    });
    overlay.querySelectorAll('[data-fb]').forEach((b) => {
        b.addEventListener('click', () => {
            saveFeedbackIntensity(b.getAttribute('data-fb'));
            overlay.remove();
            openComfortPicker();
        });
    });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// Sound profile picker — gentle / cheerful / silent. Tappable card on home.
function openSoundProfilePicker() {
    playSound('click');
    const current = loadSoundProfile();
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    overlay.innerHTML = `<div class="sound-card">
        <h2>🔊 Sound</h2>
        <div class="sound-sub">Pick how loud the app should be.</div>
        <div class="sound-options">
            <button class="sound-opt ${current==='cheerful'?'sound-current':''}" data-p="cheerful">
                <div class="sound-emoji">🎉</div>
                <div class="sound-name">Cheerful</div>
                <div class="sound-desc">Full sound &amp; chimes</div>
            </button>
            <button class="sound-opt ${current==='gentle'?'sound-current':''}" data-p="gentle">
                <div class="sound-emoji">🍃</div>
                <div class="sound-name">Gentle</div>
                <div class="sound-desc">Quieter, no fanfare</div>
            </button>
            <button class="sound-opt ${current==='silent'?'sound-current':''}" data-p="silent">
                <div class="sound-emoji">🤫</div>
                <div class="sound-name">Silent</div>
                <div class="sound-desc">No sound effects</div>
            </button>
        </div>
        <button class="sound-close">Close</button>
    </div>`;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    overlay.querySelectorAll('.sound-opt').forEach((btn) => {
        btn.addEventListener('click', () => {
            const p = btn.getAttribute('data-p');
            saveSoundProfile(p);
            // Preview: play a sample chime so Hakan hears the difference.
            if (p !== 'silent') {
                playSound('correct');
                if (p === 'cheerful') setTimeout(() => playSound('win'), 300);
            }
            overlay.remove();
        });
    });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// Pet treats catalog. Cheap → tasty → fancy.
const PET_TREATS = [
    { id: 'apple',  emoji: '🍎', name: 'Apple',  price: 5,  msg: 'Yum, an apple!' },
    { id: 'cookie', emoji: '🍪', name: 'Cookie', price: 8,  msg: 'Sweet treat!' },
    { id: 'pizza',  emoji: '🍕', name: 'Pizza',  price: 15, msg: 'PIZZA party!' },
    { id: 'cake',   emoji: '🎂', name: 'Cake',   price: 25, msg: 'Birthday vibes!' },
];

// Track feed history (last 10 treats)
function _logFeed(treat) {
    try {
        const raw = localStorage.getItem('hakans-math-feed-log');
        const log = raw ? JSON.parse(raw) : [];
        log.unshift({ t: treat, at: Date.now() });
        const trimmed = log.slice(0, 10);
        localStorage.setItem('hakans-math-feed-log', JSON.stringify(trimmed));
    } catch (e) {}
}
function loadFeedLog() {
    try { return JSON.parse(localStorage.getItem('hakans-math-feed-log')) || []; }
    catch (e) { return []; }
}

// Pet park: show all pets in the catalog with their current stage emoji.
function openPetPark() {
    playSound('click');
    if (!MATH_PET_CATALOG) return;
    const state = loadPetState();
    const progress = loadAllProgress();
    const totalStars = Object.values(progress).reduce((s, p) => s + (p.stars || 0), 0);
    const log = loadFeedLog();
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    let pets = '';
    for (const p of MATH_PET_CATALOG.pets) {
        const stage = getPetStageForStars(p, totalStars);
        const isCur = state.petId === p.id;
        pets += `<div class="park-pet ${isCur ? 'park-current' : ''}">
            <div class="park-pet-emoji">${stage ? stage.emoji : '🐾'}</div>
            <div class="park-pet-name">${p.name}</div>
            ${isCur ? '<div class="park-pet-tag">⭐ Active</div>' : ''}
        </div>`;
    }
    const recent = log.slice(0, 5).map((entry) => {
        const t = PET_TREATS.find((x) => x.id === entry.t);
        return `<span class="park-treat">${t ? t.emoji : '🍪'}</span>`;
    }).join('');
    overlay.innerHTML = `<div class="potd-card park-card">
        <h2>🏞️ Pet Park</h2>
        <div class="sound-sub">Where all your buddies hang out!</div>
        <div class="park-grid">${pets}</div>
        ${recent ? `<div class="park-log"><span class="park-log-label">Recent treats:</span> ${recent}</div>` : ''}
        <button class="potd-close">Close</button>
    </div>`;
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// Open a treat picker so Hakan chooses the food.
function openTreatPicker() {
    playSound('click');
    const balance = loadRobux();
    const overlay = document.createElement('div');
    overlay.className = 'sound-overlay';
    let opts = '';
    PET_TREATS.forEach((t) => {
        const can = balance >= t.price;
        opts += `<button class="sound-opt treat-opt${can?'':' treat-disabled'}" data-id="${t.id}">
            <div class="sound-emoji">${t.emoji}</div>
            <div class="sound-name">${t.name}</div>
            <div class="sound-desc">${t.price} 💎</div>
        </button>`;
    });
    overlay.innerHTML = `<div class="sound-card">
        <h2>🍽️ Feed Your Pet</h2>
        <div class="sound-sub">Balance: ${balance.toFixed(0)} 💎</div>
        <div class="sound-options">${opts}</div>
        <button class="sound-close">Maybe later</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelectorAll('[data-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const t = PET_TREATS.find((x) => x.id === btn.getAttribute('data-id'));
            if (!t || loadRobux() < t.price) return;
            saveRobux(loadRobux() - t.price);
            const s = loadPetState();
            s.lastFed = Date.now();
            s.lastTreat = t.id;
            savePetState(s);
            _logFeed(t.id);
            // Multiple floating treat icons
            for (let i = 0; i < 8; i++) {
                const h = document.createElement('div');
                h.className = 'feed-pet-heart';
                h.textContent = (Math.random() < 0.5) ? t.emoji : '❤️';
                h.style.left = (50 + (Math.random() - 0.5) * 20) + '%';
                h.style.animationDelay = (i * 0.1) + 's';
                document.body.appendChild(h);
                setTimeout(() => h.classList.add('fp-go'), 30 + i * 100);
                setTimeout(() => h.remove(), 1800 + i * 100);
            }
            playSound('correct');
            overlay.remove();
            if (typeof renderHomeModules === 'function') renderHomeModules();
        });
    });
    overlay.querySelector('.sound-close').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// Feed your pet for 5 Robux — resets mood and shows a happy animation.
function feedPet() {
    // Route through the treat picker instead of a flat 5-robux feed.
    openTreatPicker();
}

// Pet nickname — Hakan can rename his buddy.
function renamePet() {
    const s = loadPetState();
    const current = (typeof currentPetStage === 'function') ? currentPetStage() : null;
    const defaultName = current && current.pet ? current.pet.name.split(' ')[0] : 'Buddy';
    const newName = prompt("What's your buddy's name?", s.nickname || defaultName);
    if (newName && newName.trim()) {
        s.nickname = newName.trim().slice(0, 20);
        savePetState(s);
        if (typeof renderHomeModules === 'function') renderHomeModules();
    }
}

function openPetPicker() {
    if (!MATH_PET_CATALOG) return;
    if (typeof playSound === 'function') playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'pet-picker-overlay';
    const state = loadPetState();
    const age = petAgeDays();
    const ageStr = age > 0 ? `<div class="pp-age">🎂 With you for ${age} day${age === 1 ? '' : 's'}</div>` : '';
    let html = `<div class="pet-picker">
        <h2>Choose your math buddy!</h2>
        ${ageStr}
        <div class="pet-picker-grid">`;
    for (const p of MATH_PET_CATALOG.pets) {
        const stage0 = p.stages[0] || {};
        const isCurrent = (state.petId === p.id);
        html += `<button class="pet-picker-card ${isCurrent ? 'pp-current' : ''}" data-id="${p.id}">
            <div class="pp-emoji">${stage0.emoji || '🐾'}</div>
            <div class="pp-name">${p.name}</div>
            <div class="pp-desc">${p.description || ''}</div>
        </button>`;
    }
    html += `</div>
        <button class="pet-picker-shop" onclick="openPetShop()">🛍️ Pet Shop</button>
        <button class="pet-picker-rename" onclick="renamePet()">✏️ Rename Pet</button>
        <button class="pet-picker-feed" onclick="feedPet()">🍎 Feed (5 💎)</button>
        <button class="pet-picker-park" onclick="openPetPark()">🏞️ Pet Park</button>
        <button class="pet-picker-close">Cancel</button>
    </div>`;
    overlay.innerHTML = html;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    overlay.querySelectorAll('.pet-picker-card').forEach((c) => {
        c.addEventListener('click', () => {
            const id = c.getAttribute('data-id');
            choosePet(id);
            overlay.remove();
        });
    });
    const close = overlay.querySelector('.pet-picker-close');
    if (close) close.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// "Practice this again" — modules where the most-recent quiz finish was
// under 70% accuracy. We track per-module aggregate via PROGRESS (stars) +
// problem stats — but for simplicity, surface modules where progress < 3
// stars AND a quiz has been attempted (so the suggestion is targeted).
function findStrugglingModuleIds() {
    const progress = loadAllProgress();
    const visits = loadAllVisits();
    const out = [];
    for (const id of Object.keys(progress)) {
        const p = progress[id];
        const v = visits[id];
        if (!p || !v) continue;
        if (p.stars < 2) {                        // 1 star = struggled
            out.push({ id, lastVisited: v.lastVisited || 0, stars: p.stars });
        }
    }
    out.sort((a, b) => b.lastVisited - a.lastVisited);
    return out.map((x) => x.id).slice(0, 6);
}

// "Review time" — modules Hakan completed (any stars) but hasn't visited
// in 7+ days. Shown as a gentle nudge.
function findReviewModuleIds() {
    const progress = loadAllProgress();
    const visits = loadAllVisits();
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const out = [];
    for (const id of Object.keys(progress)) {
        const v = visits[id];
        if (!v) continue;
        if (v.lastVisited < sevenDaysAgo) {
            out.push({ id, lastVisited: v.lastVisited, stars: progress[id].stars });
        }
    }
    out.sort((a, b) => a.lastVisited - b.lastVisited);  // oldest first
    return out.map((x) => x.id).slice(0, 5);
}

// ===== Parent Dashboard (Koray view of Hakan's progress) =====

function openParentDashboard() {
    if (typeof playSound === 'function') playSound('click');
    renderParentDashboard();
    showScreen('parent-dashboard-screen');
}

// ===== Weekly goals (Koray-settable) =====
const GOALS_KEY = 'hakans-math-goals';
function loadGoals() {
    try {
        const raw = localStorage.getItem(GOALS_KEY);
        return raw ? JSON.parse(raw) : { modulesPerWeek: 5, starsPerWeek: 12 };
    } catch (e) { return { modulesPerWeek: 5, starsPerWeek: 12 }; }
}
function saveGoals(g) {
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(g)); } catch (e) {}
}
function adjustGoal(key, delta) {
    const g = loadGoals();
    g[key] = Math.max(1, (g[key] || 0) + delta);
    saveGoals(g);
    renderParentDashboard();
}

// ===== Daily login bonus =====
// First visit each calendar day awards a flat Robux bonus.
const DAILY_BONUS_KEY = 'hakans-math-daily-bonus';
const DAILY_BONUS_AMOUNT = 3;

// Daily bonus scales with current streak length — rewards consistency.
function _dailyBonusForStreak(streakDays) {
    if (streakDays >= 30) return 20;
    if (streakDays >= 14) return 12;
    if (streakDays >= 7)  return 8;
    if (streakDays >= 3)  return 5;
    return DAILY_BONUS_AMOUNT;
}

function _todayKeyForBonus() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ===== Sticker Scrapbook =====
// Every daily visit awards a random sticker. Stickers stack up in
// Hakan's scrapbook (no duplicates count toward unique-collection).
const STICKER_POOL = [
    '🦄','🐉','🐢','🐬','🦋','🐝','🐳','🦊','🐼','🐨','🦁','🐯',
    '🍓','🍒','🍎','🍌','🥝','🍇','🍕','🍪','🧁','🍩','🍫','🍰',
    '⚽','🏀','🚀','🛸','🎮','🎨','🎸','🎺','🎯','🎲','🎁','🎉',
    '⭐','🌟','💎','🌈','🌸','🌺','🌻','🌷','🌙','☀️','⚡','🔥',
    '🦖','🦕','🐙','🦑','🦀','🐠','🐢','🪼','🦩','🦚','🦜','🐧',
];
const STICKERS_KEY = 'hakans-math-stickers';
const STICKER_DAILY_KEY = 'hakans-math-sticker-daily';

function loadStickers() {
    try { return JSON.parse(localStorage.getItem(STICKERS_KEY)) || []; } catch (e) { return []; }
}
function saveStickers(arr) {
    try { localStorage.setItem(STICKERS_KEY, JSON.stringify(arr)); } catch (e) {}
}

function checkDailyStickerBonus() {
    if (typeof currentUser === 'undefined' || currentUser !== 'hakan') return null;
    let last = null;
    try { last = localStorage.getItem(STICKER_DAILY_KEY); } catch (e) {}
    const today = _todayKeyForBonus();
    if (last === today) return null;
    try { localStorage.setItem(STICKER_DAILY_KEY, today); } catch (e) {}
    // Pick a random sticker; allow duplicates over time for collection count
    const s = STICKER_POOL[Math.floor(Math.random() * STICKER_POOL.length)];
    const arr = loadStickers();
    arr.push({ sticker: s, when: Date.now() });
    saveStickers(arr);
    return s;
}

// ===== Math Glossary =====
// Kid-friendly definitions in Grade-1 language. No jargon.
const GLOSSARY = [
    { word: 'Plus',       emoji: '➕', meaning: 'A word that means ADD.', example: '3 plus 2 means 3 + 2 = 5.' },
    { word: 'Minus',      emoji: '➖', meaning: 'A word that means TAKE AWAY.', example: '5 minus 2 means 5 − 2 = 3.' },
    { word: 'Equals',     emoji: '🟰', meaning: 'A word that means "is the same as".', example: '3 + 2 equals 5.' },
    { word: 'Sum',        emoji: '🟢', meaning: 'The answer when you ADD.', example: 'The sum of 4 and 3 is 7.' },
    { word: 'Add',        emoji: '🍎', meaning: 'To put things together to find how many in all.', example: 'If you add 2 apples and 1 apple, you have 3 apples.' },
    { word: 'Subtract',   emoji: '🍪', meaning: 'To take some away from a group.', example: 'If you have 5 cookies and eat 2, you subtract 2.' },
    { word: 'Greater than', emoji: '🔼', meaning: 'When one number is BIGGER than another.', example: '7 is greater than 4.' },
    { word: 'Less than',  emoji: '🔽', meaning: 'When one number is SMALLER than another.', example: '3 is less than 8.' },
    { word: 'Pair',       emoji: '🥿', meaning: 'A group of TWO things.', example: 'You have a pair of shoes!' },
    { word: 'Double',     emoji: '🎯', meaning: 'When you add a number to itself.', example: 'Double 3 means 3 + 3 = 6.' },
    { word: 'Half',       emoji: '🥧', meaning: 'One of two EQUAL parts.', example: 'Cut a pizza in half = 2 pieces the same size.' },
    { word: 'Fourth',     emoji: '🍕', meaning: 'One of four EQUAL parts.', example: 'A pizza cut into 4 equal slices = each is a fourth.' },
    { word: 'Tens',       emoji: '🔟', meaning: 'A group of 10 ones.', example: '20 is 2 tens.' },
    { word: 'Ones',       emoji: '1️⃣', meaning: 'Single units.', example: '23 has 3 ones.' },
    { word: 'Odd',        emoji: '🎲', meaning: 'A number that can\'t make pairs without a leftover.', example: '5 is odd: ●● ●● ● (one leftover).' },
    { word: 'Even',       emoji: '🎯', meaning: 'A number that makes pairs with NO leftover.', example: '6 is even: ●● ●● ●●.' },
    { word: 'Skip count', emoji: '🦘', meaning: 'Count by jumps, not one at a time.', example: 'Skip count by 5: 5, 10, 15, 20.' },
    { word: 'Number bond', emoji: '🤝', meaning: 'Two numbers that make a target when added.', example: '6 and 4 are a bond of 10.' },
    { word: 'Ten frame',  emoji: '🔲', meaning: 'A grid of 10 boxes to show numbers.', example: 'Fill 7 boxes to show 7.' },
    { word: 'Half past',  emoji: '🕞', meaning: 'When the long hand is on 6 — half past the hour.', example: 'When it\'s 3:30, we say "half past 3".' },
    { word: 'O\'clock',   emoji: '🕒', meaning: 'When the long hand is on 12 — exact hour.', example: 'When it\'s 3:00, we say "3 o\'clock".' },
    { word: 'Penny',      emoji: '🟤', meaning: 'A coin worth 1 cent.', example: '5 pennies = 5 cents.' },
    { word: 'Nickel',     emoji: '⚪', meaning: 'A coin worth 5 cents.', example: '2 nickels = 10 cents.' },
    { word: 'Dime',       emoji: '🪙', meaning: 'A coin worth 10 cents.', example: '3 dimes = 30 cents.' },
];

// ===== First-time onboarding tour =====
// 4 friendly tooltips on first visit pointing at key features.
const ONBOARDING_KEY = 'hakans-math-onboarded';
function maybeStartOnboarding() {
    if (typeof currentUser === 'undefined' || currentUser !== 'hakan') return;
    let seen = null;
    try { seen = localStorage.getItem(ONBOARDING_KEY); } catch (e) {}
    if (seen) return;
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch (e) {}
    setTimeout(startOnboardingTour, 1200);
}
function startOnboardingTour() {
    const steps = [
        { text: "Hi Hakan! Tap a module below to start learning math! 📚", target: '#module-grid', position: 'top' },
        { text: "Try the Mini-Games! 🎮 Fun ways to practice math.", target: '.minigames-btn', position: 'bottom' },
        { text: "See your math journey on the Map! 🗺️", target: '.journey-btn', position: 'bottom' },
        { text: "Earn stars, badges & stickers as you play! ⭐🏆📖", target: '.trophy-btn', position: 'bottom' },
    ];
    showOnboardingStep(steps, 0);
}
function showOnboardingStep(steps, idx) {
    if (idx >= steps.length) return;
    const s = steps[idx];
    const target = document.querySelector(s.target);
    if (!target) { showOnboardingStep(steps, idx + 1); return; }
    const overlay = document.createElement('div');
    overlay.className = 'ob-overlay';
    const tip = document.createElement('div');
    tip.className = 'ob-tip ob-tip-' + (s.position || 'top');
    const owls = ['🦉', '🐻', '🦊', '🐰'];
    const mascot = owls[idx % owls.length];
    // Progress dots
    const dots = Array.from({ length: steps.length }, (_, i) =>
        `<span class="ob-dot${i === idx ? ' ob-dot-on' : ''}${i < idx ? ' ob-dot-done' : ''}"></span>`
    ).join('');
    const isLast = (idx === steps.length - 1);
    tip.innerHTML = `
        <div class="ob-mascot">${mascot}</div>
        <div class="ob-text">${s.text}</div>
        <div class="ob-dots">${dots}</div>
        <div class="ob-actions">
            ${isLast ? '' : '<button class="ob-skip-btn">Skip tour</button>'}
            <button class="ob-next-btn">${isLast ? "🎉 Let's play!" : 'Next ➡'}</button>
        </div>
    `;
    overlay.appendChild(tip);
    document.body.appendChild(overlay);
    const rect = target.getBoundingClientRect();
    requestAnimationFrame(() => {
        const tRect = tip.getBoundingClientRect();
        let top = rect.top - tRect.height - 16;
        if (s.position === 'bottom') top = rect.bottom + 16;
        if (top < 16) top = Math.min(window.innerHeight - tRect.height - 16, rect.bottom + 16);
        let left = rect.left + (rect.width / 2) - (tRect.width / 2);
        left = Math.max(12, Math.min(window.innerWidth - tRect.width - 12, left));
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
        target.classList.add('ob-highlighted');
    });
    overlay.querySelector('.ob-next-btn').addEventListener('click', () => {
        target.classList.remove('ob-highlighted');
        overlay.remove();
        showOnboardingStep(steps, idx + 1);
    });
    const skipBtn = overlay.querySelector('.ob-skip-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            target.classList.remove('ob-highlighted');
            overlay.remove();
        });
    }
}

function filterGlossary(q) {
    const term = (q || '').toLowerCase().trim();
    document.querySelectorAll('#glossary-body .glo-card').forEach((card) => {
        if (!term) { card.style.display = ''; return; }
        const word = (card.querySelector('.glo-word') || {}).textContent || '';
        const meaning = (card.querySelector('.glo-meaning') || {}).textContent || '';
        const example = (card.querySelector('.glo-example') || {}).textContent || '';
        const hit = (word + ' ' + meaning + ' ' + example).toLowerCase().includes(term);
        card.style.display = hit ? '' : 'none';
    });
}

function openGlossary() {
    if (typeof playSound === 'function') playSound('click');
    const body = document.getElementById('glossary-body');
    if (body) {
        body.innerHTML = GLOSSARY.map((g, i) => `
            <div class="glo-card" data-idx="${i}">
                <div class="glo-emoji">${g.emoji}</div>
                <div class="glo-word">${g.word}</div>
                <div class="glo-meaning">${g.meaning}</div>
                <div class="glo-example">${g.example}</div>
                <button class="glo-speak-btn" data-idx="${i}" title="Hear it!">🔊</button>
            </div>
        `).join('');
        // Wire speak buttons + whole-card tap
        body.querySelectorAll('.glo-card').forEach((card) => {
            const idx = parseInt(card.getAttribute('data-idx'), 10);
            const g = GLOSSARY[idx];
            const speak = () => {
                if (typeof window.speechSynthesis === 'undefined') return;
                try {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(`${g.word}. ${g.meaning}. ${g.example}`);
                    u.rate = 0.92;
                    u.pitch = 1.05;
                    window.speechSynthesis.speak(u);
                } catch (e) {}
            };
            card.addEventListener('click', (e) => {
                if (e.target.closest('.glo-speak-btn')) return;  // button handles itself
                if (typeof playSound === 'function') playSound('click');
                speak();
            });
            const btn = card.querySelector('.glo-speak-btn');
            if (btn) btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof playSound === 'function') playSound('click');
                speak();
            });
        });
    }
    showScreen('glossary-screen');
}

function openScrapbook() {
    if (typeof playSound === 'function') playSound('click');
    renderScrapbook();
    showScreen('scrapbook-screen');
}
// Categorize each sticker by its position in STICKER_POOL.
const STICKER_CATEGORIES = [
    { name: '🐾 Animals',  range: [0, 12],  emoji: '🐾' },
    { name: '🍎 Food',     range: [12, 24], emoji: '🍎' },
    { name: '🎮 Fun',      range: [24, 36], emoji: '🎮' },
    { name: '⭐ Sparkle',  range: [36, 48], emoji: '⭐' },
    { name: '🌊 Ocean',    range: [48, 60], emoji: '🌊' },
];
function _stickerCategory(emoji) {
    const i = STICKER_POOL.indexOf(emoji);
    for (const c of STICKER_CATEGORIES) {
        if (i >= c.range[0] && i < c.range[1]) return c.name;
    }
    return '🎁 Bonus';
}

function renderScrapbook() {
    const body = document.getElementById('scrapbook-body');
    if (!body) return;
    const arr = loadStickers();
    if (arr.length === 0) {
        body.innerHTML = `<div class="sb-empty-hero">
            <div class="sb-empty-emoji">🎁</div>
            <div class="sb-empty-title">No stickers yet!</div>
            <div class="sb-empty-sub">Open the app every day to collect a new sticker, Hakan. They live forever on this page!</div>
            <div class="sb-empty-preview">${['🐶','🐱','🦄','🌈','🚀','⭐','🍕','🎂','🌟','🎮'].map((e) => `<span>${e}</span>`).join('')}</div>
        </div>`;
        return;
    }
    const unique = new Set(arr.map((x) => x.sticker)).size;
    let html = `<div class="sb-stats">
        <div class="sb-stat-num">${arr.length}</div>
        <div class="sb-stat-label">stickers · ${unique} of ${STICKER_POOL.length} unique</div>
        <div class="sb-completion">
            <div class="sb-completion-bar"><div class="sb-completion-fill" style="width:${Math.round((unique / STICKER_POOL.length) * 100)}%"></div></div>
        </div>
    </div>`;
    // Group by category
    const byCat = {};
    const seen = {};
    arr.slice().reverse().forEach((s) => {
        const cat = _stickerCategory(s.sticker);
        (byCat[cat] = byCat[cat] || []).push(s);
        seen[s.sticker] = true;
    });
    // Render each category as a "page"
    STICKER_CATEGORIES.forEach((cat) => {
        const got = (byCat[cat.name] || []).length;
        const total = cat.range[1] - cat.range[0];
        const uniqueInCat = new Set((byCat[cat.name] || []).map((s) => s.sticker)).size;
        html += `<div class="sb-cat">
            <div class="sb-cat-header">${cat.name} <span class="sb-cat-count">${uniqueInCat} / ${total}</span></div>
            <div class="sb-grid">`;
        for (let i = cat.range[0]; i < cat.range[1]; i++) {
            const emoji = STICKER_POOL[i];
            const have = seen[emoji];
            html += `<div class="sb-sticker ${have ? '' : 'sb-sticker-missing'}" onclick="${have ? `zoomSticker('${emoji}')` : ''}">${have ? emoji : '?'}</div>`;
        }
        html += '</div></div>';
    });
    body.innerHTML = html;
}

function zoomSticker(emoji) {
    playSound('click');
    const overlay = document.createElement('div');
    overlay.className = 'sb-zoom-overlay';
    overlay.innerHTML = `<div class="sb-zoom">${emoji}</div>`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('sbz-show'), 30);
}

// Weekly recap: Monday morning summary of last week's wins.
function checkWeeklyRecap() {
    if (typeof currentUser === 'undefined' || currentUser !== 'hakan') return;
    const today = new Date();
    if (today.getDay() !== 1) return;  // Only Monday
    const todayKey = today.toISOString().slice(0, 10);
    let last = null;
    try { last = localStorage.getItem('hakans-math-weekly-recap'); } catch (e) {}
    if (last === todayKey) return;
    try { localStorage.setItem('hakans-math-weekly-recap', todayKey); } catch (e) {}
    // Calculate last 7 days stats
    const wkAgo = Date.now() - 7 * 86400000;
    const visits = loadAllVisits();
    const progress = loadAllProgress();
    const stats = loadProblemStats();
    let wkVisits = 0, wkStars = 0, wkCorrect = 0;
    for (const id of Object.keys(visits)) {
        if ((visits[id].lastVisited || 0) >= wkAgo) wkVisits += (visits[id].count || 1);
    }
    for (const id of Object.keys(progress)) {
        if ((progress[id].lastCompleted || 0) >= wkAgo) wkStars += progress[id].stars || 0;
    }
    for (const k of Object.keys(stats)) {
        const s = stats[k];
        if ((s.last || 0) >= wkAgo) wkCorrect += (s.correct || 0);
    }
    if (wkVisits === 0 && wkStars === 0 && wkCorrect === 0) return;
    setTimeout(() => {
        const overlay = document.createElement('div');
        overlay.className = 'cert-overlay wr-overlay';
        overlay.innerHTML = `<div class="cert-card wr-card">
            <div class="wr-title">📊 Last Week, Hakan!</div>
            <div class="wr-grid">
                <div class="wr-tile"><div class="wr-num">${wkVisits}</div><div class="wr-lbl">module plays</div></div>
                <div class="wr-tile"><div class="wr-num">${wkStars}</div><div class="wr-lbl">⭐ earned</div></div>
                <div class="wr-tile"><div class="wr-num">${wkCorrect}</div><div class="wr-lbl">correct answers</div></div>
            </div>
            <div class="wr-msg">Great week! Let's make this one even better. 🚀</div>
            <button class="wr-close">Let's go!</button>
        </div>`;
        overlay.querySelector('.wr-close').addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }, 800);
}

function checkDailyBonus() {
    if (typeof currentUser === 'undefined' || currentUser !== 'hakan') return;
    let last = null;
    try { last = localStorage.getItem(DAILY_BONUS_KEY); } catch (e) {}
    const today = _todayKeyForBonus();
    if (last === today) return;
    // First-of-day wave: extra confetti.
    if (typeof launchConfetti === 'function') launchConfetti();
    try { localStorage.setItem(DAILY_BONUS_KEY, today); } catch (e) {}
    const s = (typeof loadStreak === 'function') ? loadStreak() : { current: 0 };
    let amount = _dailyBonusForStreak(s.current || 1);
    // Comeback bonus: returning after a gap of 3+ days
    let comebackBonus = 0;
    if (s._comebackGap) {
        comebackBonus = Math.min(15, s._comebackGap * 3);
        amount += comebackBonus;
        delete s._comebackGap;
        try { localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
    }
    saveRobux(loadRobux() + amount);
    showDailyBonusPopup(amount, s.current || 1, comebackBonus, s._comebackFreebie);
}

function showDailyBonusPopup(amount, streakDays, comebackBonus, usedInsurance) {
    // Also award a daily sticker
    const sticker = (typeof checkDailyStickerBonus === 'function') ? checkDailyStickerBonus() : null;
    const robux = (amount != null) ? amount : DAILY_BONUS_AMOUNT;
    let streakLine = '';
    if (usedInsurance) {
        streakLine = `<div class="db-streak-bonus">🛡️ Streak saved! Free skip used.</div>`;
    } else if (comebackBonus && comebackBonus > 0) {
        streakLine = `<div class="db-streak-bonus">👋 Welcome back! +${comebackBonus} comeback bonus!</div>`;
    } else if (streakDays >= 3) {
        streakLine = `<div class="db-streak-bonus">🔥 ${streakDays}-day streak bonus!</div>`;
    }
    const overlay = document.createElement('div');
    overlay.className = 'daily-bonus-overlay';
    overlay.innerHTML = `
        <div class="daily-bonus-card">
            <div class="db-emoji">${sticker ? sticker : '🎁'}</div>
            <div class="db-title">Welcome back, Hakan!</div>
            <div class="db-msg">${sticker ? "Today's sticker is yours!" : 'Daily bonus unlocked!'}</div>
            ${streakLine}
            <div class="db-amount">+${robux} 💎</div>
            ${sticker ? '<div class="db-sticker-note">Find it in your Scrapbook!</div>' : ''}
            <button class="db-btn">Awesome!</button>
        </div>
    `;
    const close = () => {
        overlay.classList.remove('db-show');
        setTimeout(() => overlay.remove(), 400);
        if (typeof updateRobuxDisplay === 'function') updateRobuxDisplay();
    };
    overlay.querySelector('.db-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('db-show'), 50);
}

// ===== Problem of the Day =====
// One bite-sized Grade-1 problem per day. Click the home card → modal →
// pick an answer → +5 Robux if correct. Resets at midnight.
const POTD_KEY = 'hakans-math-potd';
const POTD_POOL = [
    { q: '5 + 3 = ?',     a: 8,  hint: 'Count up from 5: 6, 7, 8.' },
    { q: '9 - 4 = ?',     a: 5,  hint: 'Count back 4 from 9.' },
    { q: '6 + 6 = ?',     a: 12, hint: 'Doubles! 6 and 6 make a dozen.' },
    { q: '10 - 7 = ?',    a: 3,  hint: 'How many to add to 7 to make 10?' },
    { q: '4 + 7 = ?',     a: 11, hint: 'Make 10 first: 4+6=10, then +1.' },
    { q: '8 + 2 = ?',     a: 10, hint: '8 needs 2 more friends to be 10.' },
    { q: '12 - 5 = ?',    a: 7,  hint: 'Break 5 into 2 and 3: 12-2-3.' },
    { q: '3 + 3 + 3 = ?', a: 9,  hint: 'Three 3s make 9.' },
    { q: 'How many sides does a triangle have?', a: 3, hint: 'Tri means 3!' },
    { q: '20 + 5 = ?',    a: 25, hint: 'Add to the ones place.' },
    { q: 'Half of 10 is...', a: 5, hint: 'Split 10 fairly into 2 groups.' },
    { q: 'What comes after 19?', a: 20, hint: 'Twenty!' },
    { q: '7 + 0 = ?',     a: 7,  hint: 'Adding zero changes nothing.' },
    { q: '15 - 10 = ?',   a: 5,  hint: 'Take away one ten from 15.' },
    { q: '6 + 5 = ?',     a: 11, hint: 'Make 10: 6+4=10, then +1.' },
    { q: 'Sides on a square?', a: 4, hint: 'Four equal sides!' },
    { q: '9 + 9 = ?',     a: 18, hint: 'Double 9.' },
    { q: '13 - 6 = ?',    a: 7,  hint: 'Count back 6 from 13.' },
    { q: '4 + 4 + 2 = ?', a: 10, hint: '4+4=8, then +2.' },
    { q: '5 dimes = ? cents', a: 50, hint: 'Each dime is 10 cents.' },
    { q: 'Sides on a hexagon?', a: 6, hint: 'Hex means 6.' },
    { q: '11 + 11 = ?',   a: 22, hint: 'Double 11.' },
    { q: '50 + 50 = ?',   a: 100, hint: 'Two halves of 100.' },
    { q: '17 - 9 = ?',    a: 8,  hint: 'Take 9 from 17.' },
    { q: '2 + 2 + 2 + 2 = ?', a: 8, hint: 'Four twos.' },
    { q: '8 + 7 = ?',     a: 15, hint: 'Make 10: 8+2=10, then +5.' },
    { q: 'Hours on a clock face?', a: 12, hint: '1 through 12.' },
    { q: '30 - 10 = ?',   a: 20, hint: 'Take one ten away from 30.' },
    { q: '7 + 7 = ?',     a: 14, hint: 'Doubles!' },
    { q: '1 + 9 = ?',     a: 10, hint: 'Friends of 10.' },
];

function _potdToday() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(POTD_KEY)); } catch (e) {}
    const today = _todayKeyForBonus();
    if (saved && saved.day === today) return saved;
    // Seed by date
    const seed = today.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const idx = seed % POTD_POOL.length;
    const fresh = { day: today, idx, solved: false };
    try { localStorage.setItem(POTD_KEY, JSON.stringify(fresh)); } catch (e) {}
    return fresh;
}

function openProblemOfTheDay() {
    playSound('click');
    const today = _potdToday();
    const prob = POTD_POOL[today.idx];
    if (!prob) return;
    const overlay = document.createElement('div');
    overlay.className = 'potd-overlay';
    if (today.solved) {
        overlay.innerHTML = `<div class="potd-card">
            <h2>🎯 Problem of the Day</h2>
            <div class="potd-question">${prob.q}</div>
            <div class="potd-answer">Answer: ${prob.a}</div>
            <div class="potd-done">✅ You solved it today, Hakan!</div>
            <button class="potd-close">Awesome</button>
        </div>`;
    } else {
        overlay.innerHTML = `<div class="potd-card">
            <h2>🎯 Problem of the Day</h2>
            <div class="potd-question">${prob.q}</div>
            <div class="potd-hint" style="display:none;">💡 ${prob.hint}</div>
            <input type="number" class="potd-input" placeholder="Your answer" autocomplete="off" inputmode="numeric" />
            <div class="potd-actions">
                <button class="potd-hint-btn">💡 Hint</button>
                <button class="potd-check">Check (+5 💎)</button>
            </div>
            <div class="potd-feedback"></div>
            <button class="potd-close">Maybe later</button>
        </div>`;
    }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.potd-close').addEventListener('click', () => overlay.remove());
    if (!today.solved) {
        const input = overlay.querySelector('.potd-input');
        const fb = overlay.querySelector('.potd-feedback');
        const check = overlay.querySelector('.potd-check');
        const hintBtn = overlay.querySelector('.potd-hint-btn');
        hintBtn.addEventListener('click', () => {
            overlay.querySelector('.potd-hint').style.display = '';
        });
        const submit = () => {
            const val = parseInt(input.value, 10);
            if (Number.isNaN(val)) return;
            if (val === prob.a) {
                today.solved = true;
                try { localStorage.setItem(POTD_KEY, JSON.stringify(today)); } catch (e) {}
                if (typeof saveRobux === 'function' && typeof loadRobux === 'function') {
                    saveRobux(loadRobux() + 5);
                }
                fb.innerHTML = `<div class="potd-correct">🎉 Yes! +5 💎</div>`;
                playSound('correct');
                if (typeof launchConfetti === 'function') launchConfetti();
                setTimeout(() => {
                    overlay.remove();
                    if (typeof renderHomeModules === 'function') renderHomeModules();
                }, 1500);
            } else {
                fb.innerHTML = `<div class="potd-wrong">Try once more, Hakan!</div>`;
                playSound('wrong');
                input.value = '';
                input.focus();
            }
        };
        check.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        setTimeout(() => input.focus(), 50);
    }
    document.body.appendChild(overlay);
}

// ===== Daily Quests =====
// Three daily goals. Reroll each day. Completing = Robux reward.
const QUESTS_KEY = 'hakans-math-quests';

function _generateDailyQuests() {
    const all = [
        { id: 'play-2',  text: 'Play 2 modules',      target: 2,  type: 'plays',   robux: 5 },
        { id: 'play-3',  text: 'Play 3 modules',      target: 3,  type: 'plays',   robux: 7 },
        { id: 'star-3',  text: 'Earn 3 stars',        target: 3,  type: 'stars',   robux: 6 },
        { id: 'star-5',  text: 'Earn 5 stars',        target: 5,  type: 'stars',   robux: 9 },
        { id: 'star-1-three',  text: 'Get a 3-star quiz!', target: 1, type: 'perfect', robux: 8 },
        { id: 'mini-2',  text: 'Win 2 mini-games',     target: 2,  type: 'minigames', robux: 6 },
        { id: 'correct-15', text: 'Answer 15 questions correctly', target: 15, type: 'correct', robux: 8 },
        { id: 'correct-25', text: 'Answer 25 questions correctly', target: 25, type: 'correct', robux: 12 },
        { id: 'lesson-1', text: 'Read 1 lesson',       target: 1,  type: 'lessons', robux: 4 },
        { id: 'daily-game', text: "Win today's Daily Challenge", target: 1, type: 'daily-game', robux: 10 },
    ];
    // Pick 3 distinct, seeded by today's date so quests are stable
    const dayKey = _todayKeyForBonus();
    const seed = dayKey.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const shuffled = all.slice().sort((a, b) => {
        return (((a.id.charCodeAt(0) + seed) % 13) - ((b.id.charCodeAt(0) + seed) % 13));
    });
    return shuffled.slice(0, 3).map((q) => ({ ...q, progress: 0, claimed: false }));
}

// Reroll today's quests — Hakan gets one reroll per day.
const QUEST_REROLL_KEY = 'hakans-math-quest-reroll';
function _todayRerolled() {
    try {
        const last = localStorage.getItem(QUEST_REROLL_KEY);
        return last === _todayKeyForBonus();
    } catch (e) { return false; }
}
function rerollDailyQuests() {
    if (_todayRerolled()) return;
    if (!confirm("Reroll today's quests? You can only reroll once per day, Hakan!")) return;
    const today = _todayKeyForBonus();
    const fresh = { day: today, quests: _generateDailyQuests() };
    // Slight randomization to actually pick different quests on reroll.
    fresh.quests = fresh.quests.map((q) => ({ ...q, _r: Math.random() }))
                               .sort((a, b) => a._r - b._r)
                               .slice(0, 3)
                               .map(({ _r, ...rest }) => rest);
    saveDailyQuests(fresh);
    try { localStorage.setItem(QUEST_REROLL_KEY, today); } catch (e) {}
    if (typeof renderHomeModules === 'function') renderHomeModules();
    playSound('click');
}

function loadDailyQuests() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(QUESTS_KEY)); } catch (e) {}
    const today = _todayKeyForBonus();
    if (!data || data.day !== today) {
        data = { day: today, quests: _generateDailyQuests() };
        try { localStorage.setItem(QUESTS_KEY, JSON.stringify(data)); } catch (e) {}
    }
    return data;
}
function saveDailyQuests(data) {
    try { localStorage.setItem(QUESTS_KEY, JSON.stringify(data)); } catch (e) {}
}

// Bump quest progress when relevant events occur.
function bumpQuests(type, delta) {
    if (typeof currentUser === 'undefined' || currentUser !== 'hakan') return [];
    const data = loadDailyQuests();
    const claimed = [];
    let anyChanged = false;
    for (const q of data.quests) {
        if (q.claimed || q.type !== type) continue;
        q.progress = Math.min(q.target, (q.progress || 0) + (delta || 1));
        anyChanged = true;
        if (q.progress >= q.target && !q.claimed) {
            q.claimed = true;
            claimed.push(q);
            saveRobux(loadRobux() + q.robux);
        }
    }
    if (anyChanged) saveDailyQuests(data);
    return claimed;
}
function showQuestClaimedToasts(quests) {
    if (!quests || !quests.length) return;
    quests.forEach((q, i) => {
        setTimeout(() => {
            const t = document.createElement('div');
            t.className = 'quest-toast';
            t.innerHTML = `<div class="qt-emoji">✅</div><div class="qt-body"><div class="qt-name">Quest done!</div><div class="qt-desc">${q.text}</div><div class="qt-robux">+${q.robux} 💎</div></div>`;
            document.body.appendChild(t);
            setTimeout(() => t.classList.add('qt-show'), 50);
            setTimeout(() => { t.classList.remove('qt-show'); setTimeout(() => t.remove(), 400); }, 3500);
        }, i * 600);
    });
}

function renderParentDashboard() {
    const body = document.getElementById('parent-dashboard-body');
    if (!body) return;

    const progress = loadAllProgress();
    const visits   = loadAllVisits();
    const streak   = loadStreak();
    const stats    = loadProblemStats();
    const robux    = loadRobux();

    const totalStars = Object.values(progress).reduce((s, p) => s + (p.stars || 0), 0);
    const completed = Object.keys(progress).length;
    const visited   = Object.keys(visits).length;
    const totalMods = (typeof MODULES !== 'undefined') ? MODULES.length : 0;

    // Per-category breakdown
    const byCat = {};
    if (typeof MODULES !== 'undefined' && typeof CATEGORIES !== 'undefined') {
        for (const cat of CATEGORIES) byCat[cat.id] = { cat, total: 0, done: 0, stars: 0 };
        for (const m of MODULES) {
            const slot = byCat[m.category];
            if (!slot) continue;
            slot.total++;
            const p = progress[m.id];
            if (p) {
                slot.done++;
                slot.stars += p.stars || 0;
            }
        }
    }

    // Aggregate per-module stats from problem-level data
    const moduleAccuracy = {};
    for (const key of Object.keys(stats)) {
        const [mid] = key.split('::');
        if (!mid) continue;
        const s = stats[key];
        const slot = moduleAccuracy[mid] || { attempts: 0, correct: 0 };
        slot.attempts += s.attempts;
        slot.correct  += s.correct;
        moduleAccuracy[mid] = slot;
    }

    // Modules where Hakan struggled (lowest accuracy first, min 3 attempts)
    const struggling = [];
    for (const id of Object.keys(moduleAccuracy)) {
        const a = moduleAccuracy[id];
        if (a.attempts < 3) continue;
        const acc = a.correct / a.attempts;
        struggling.push({ id, acc, attempts: a.attempts });
    }
    struggling.sort((a, b) => a.acc - b.acc);

    // Recent activity — last 10 visits
    const recent = Object.entries(visits)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0))
        .slice(0, 10);

    function modTitle(id) {
        const m = (typeof MODULES_BY_ID !== 'undefined') ? MODULES_BY_ID[id] : null;
        return m ? `${m.emoji} ${m.title}` : id;
    }

    function timeAgo(ts) {
        const days = Math.floor((Date.now() - ts) / 86400000);
        if (days === 0) return 'today';
        if (days === 1) return 'yesterday';
        if (days < 7) return days + ' days ago';
        if (days < 14) return '1 week ago';
        if (days < 30) return Math.floor(days / 7) + ' weeks ago';
        return Math.floor(days / 30) + ' months ago';
    }

    let html = '';

    // Top stat tiles
    html += `<div class="pd-stats-row">
        <div class="pd-tile"><div class="pd-tile-num">${streak.current}</div><div class="pd-tile-label">🔥 day streak</div><div class="pd-tile-sub">best: ${streak.longest}</div></div>
        <div class="pd-tile"><div class="pd-tile-num">${completed}/${totalMods}</div><div class="pd-tile-label">✅ modules done</div><div class="pd-tile-sub">${visited} visited</div></div>
        <div class="pd-tile"><div class="pd-tile-num">${totalStars}</div><div class="pd-tile-label">⭐ total stars</div><div class="pd-tile-sub">max ${totalMods * 3}</div></div>
        <div class="pd-tile"><div class="pd-tile-num">💎 ${robux.toFixed(1)}</div><div class="pd-tile-label">Robux earned</div></div>
    </div>`;

    // === This week's snapshot ===
    const wkAgo = Date.now() - 7 * 86400000;
    let wkVisits = 0, wkStars = 0, wkCorrect = 0;
    for (const id of Object.keys(visits)) {
        if ((visits[id].lastVisited || 0) >= wkAgo) wkVisits += (visits[id].count || 1);
    }
    for (const id of Object.keys(progress)) {
        if ((progress[id].lastCompleted || 0) >= wkAgo) wkStars += progress[id].stars || 0;
    }
    for (const key of Object.keys(stats)) {
        const s = stats[key];
        if ((s.last || 0) >= wkAgo) wkCorrect += (s.correct || 0);
    }
    html += `<h2 class="pd-section">This Week</h2>`;
    html += `<div class="pd-stats-row">
        <div class="pd-tile"><div class="pd-tile-num">${wkVisits}</div><div class="pd-tile-label">module plays</div></div>
        <div class="pd-tile"><div class="pd-tile-num">${wkStars}</div><div class="pd-tile-label">⭐ earned</div></div>
        <div class="pd-tile"><div class="pd-tile-num">${wkCorrect}</div><div class="pd-tile-label">correct answers</div></div>
    </div>`;

    // === Last 30 days snapshot ===
    const moAgo = Date.now() - 30 * 86400000;
    let moVisits = 0, moStars = 0, moCorrect = 0;
    for (const id of Object.keys(visits)) {
        if ((visits[id].lastVisited || 0) >= moAgo) moVisits += (visits[id].count || 1);
    }
    for (const id of Object.keys(progress)) {
        if ((progress[id].lastCompleted || 0) >= moAgo) moStars += progress[id].stars || 0;
    }
    for (const k of Object.keys(stats)) {
        const s = stats[k];
        if ((s.last || 0) >= moAgo) moCorrect += (s.correct || 0);
    }
    const sHist = (streak.history || []);
    const moActiveDays = sHist.filter((d) => {
        const t = new Date(d + 'T00:00:00').getTime();
        return t >= moAgo;
    }).length;
    html += `<h2 class="pd-section">Last 30 Days</h2>`;
    html += `<div class="pd-stats-row">
        <div class="pd-tile"><div class="pd-tile-num">${moVisits}</div><div class="pd-tile-label">module plays</div></div>
        <div class="pd-tile"><div class="pd-tile-num">${moStars}</div><div class="pd-tile-label">⭐ earned</div></div>
        <div class="pd-tile"><div class="pd-tile-num">${moCorrect}</div><div class="pd-tile-label">correct answers</div></div>
        <div class="pd-tile"><div class="pd-tile-num">${moActiveDays}</div><div class="pd-tile-label">active days</div></div>
    </div>`;

    // === Daily activity chart (last 7 days) ===
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    const dayBuckets = [];
    for (let d = 6; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(today.getDate() - d);
        date.setHours(0, 0, 0, 0);
        const start = date.getTime();
        const end = start + 86400000;
        let correct = 0;
        for (const k of Object.keys(stats)) {
            const s = stats[k];
            if ((s.last || 0) >= start && s.last < end) correct += (s.correct || 0);
        }
        dayBuckets.push({
            label: dayLabels[date.getDay()],
            correct,
            isToday: (d === 0),
        });
    }
    const maxBar = Math.max(1, ...dayBuckets.map((b) => b.correct));
    html += `<h2 class="pd-section">Daily Activity (Last 7 Days)</h2>`;
    html += `<div class="pd-chart"><div class="pd-chart-bars">`;
    for (const b of dayBuckets) {
        const heightPct = Math.max(2, (b.correct / maxBar) * 100);
        const cls = b.correct === 0 ? 'pd-chart-bar-empty' :
                    b.isToday ? 'pd-chart-bar-today' : '';
        html += `<div class="pd-chart-bar-col">
            <div class="pd-chart-bar ${cls}" style="height:${heightPct}%">
                ${b.correct > 0 ? `<span class="pd-chart-val">${b.correct}</span>` : ''}
            </div>
            <div class="pd-chart-day">${b.label}</div>
        </div>`;
    }
    html += `</div></div>`;

    // === Accuracy trend (week-over-week) ===
    const wkAccs = [];
    for (let weekOffset = 3; weekOffset >= 0; weekOffset--) {
        const wkStart = Date.now() - (weekOffset + 1) * 7 * 86400000;
        const wkEnd   = Date.now() - weekOffset * 7 * 86400000;
        let attempts = 0, correct = 0;
        for (const k of Object.keys(stats)) {
            const s = stats[k];
            if ((s.last || 0) >= wkStart && (s.last || 0) < wkEnd) {
                attempts += (s.attempts || 0);
                correct  += (s.correct || 0);
            }
        }
        const acc = attempts > 0 ? Math.round((correct / attempts) * 100) : null;
        wkAccs.push({ acc, label: weekOffset === 0 ? 'This wk' : `${weekOffset}wk ago` });
    }
    if (wkAccs.some((w) => w.acc != null)) {
        html += `<h2 class="pd-section">Accuracy Trend (Last 4 Weeks)</h2>`;
        html += `<div class="pd-acc-trend">`;
        for (const w of wkAccs) {
            const h = w.acc != null ? Math.max(6, w.acc) : 6;
            html += `<div class="pd-acc-col">
                <div class="pd-acc-val">${w.acc != null ? w.acc + '%' : '–'}</div>
                <div class="pd-acc-bar" style="height:${h}%"></div>
                <div class="pd-acc-label">${w.label}</div>
            </div>`;
        }
        html += `</div>`;
    }

    // === Streak heatmap (last 30 days) ===
    const days30 = (typeof lastThirtyDays === 'function') ? lastThirtyDays() : [];
    if (days30.length) {
        html += `<h2 class="pd-section">Streak Heatmap (Last 30 Days)</h2>`;
        html += `<div class="pd-heatmap">`;
        for (const d of days30) {
            html += `<div class="pd-hm-cell ${d.practiced ? 'pd-hm-on' : ''}" title="${d.key}">${d.day}</div>`;
        }
        html += `</div>`;
    }

    // === Goals (Koray-settable) ===
    const goal = loadGoals();
    const moduleGoal = goal.modulesPerWeek || 5;
    const starGoal = goal.starsPerWeek || 12;
    const modPct = Math.min(100, Math.round((wkVisits / moduleGoal) * 100));
    const starPct = Math.min(100, Math.round((wkStars / starGoal) * 100));
    html += `<h2 class="pd-section">Weekly Goals</h2>
        <div class="pd-goals">
            <div class="pd-goal">
                <div class="pd-goal-label">Modules played: ${wkVisits} / ${moduleGoal}</div>
                <div class="pd-goal-bar"><div class="pd-goal-fill" style="width:${modPct}%"></div></div>
                <div class="pd-goal-edit">
                    <button onclick="adjustGoal('modulesPerWeek',-1)">−</button>
                    <span>Goal: ${moduleGoal}</span>
                    <button onclick="adjustGoal('modulesPerWeek',1)">+</button>
                </div>
            </div>
            <div class="pd-goal">
                <div class="pd-goal-label">Stars earned: ${wkStars} / ${starGoal}</div>
                <div class="pd-goal-bar"><div class="pd-goal-fill" style="width:${starPct}%"></div></div>
                <div class="pd-goal-edit">
                    <button onclick="adjustGoal('starsPerWeek',-1)">−</button>
                    <span>Goal: ${starGoal}</span>
                    <button onclick="adjustGoal('starsPerWeek',1)">+</button>
                </div>
            </div>
        </div>`;

    // Per-category breakdown
    html += `<h2 class="pd-section">Categories</h2>`;
    html += `<div class="pd-cats">`;
    for (const c of Object.values(byCat).filter((x) => x.total > 0)) {
        const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
        const fillCls = pct === 100 ? 'pd-cat-bar-full' : '';
        html += `<div class="pd-cat">
            <div class="pd-cat-name">${c.cat.emoji} ${c.cat.title}</div>
            <div class="pd-cat-numbers">${c.done}/${c.total} · ${c.stars}⭐</div>
            <div class="pd-cat-bar"><div class="pd-cat-bar-fill ${fillCls}" style="width:${pct}%"></div></div>
        </div>`;
    }
    html += `</div>`;

    // Struggling modules
    html += `<h2 class="pd-section">Where Hakan Needs Help</h2>`;
    if (struggling.length === 0) {
        html += `<p class="pd-empty">Not enough data yet. Once Hakan completes more quizzes, his trouble spots will show here.</p>`;
    } else {
        html += `<table class="pd-table">
            <thead><tr><th>Module</th><th>Accuracy</th><th>Attempts</th></tr></thead>
            <tbody>`;
        for (const s of struggling.slice(0, 8)) {
            const accPct = Math.round(s.acc * 100);
            const cls = s.acc < 0.5 ? 'pd-acc-low' : (s.acc < 0.7 ? 'pd-acc-mid' : 'pd-acc-ok');
            html += `<tr>
                <td>${modTitle(s.id)}</td>
                <td><span class="pd-acc ${cls}">${accPct}%</span></td>
                <td>${s.attempts}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
    }

    // Recent activity
    html += `<h2 class="pd-section">Recent Activity</h2>`;
    if (recent.length === 0) {
        html += `<p class="pd-empty">No activity yet.</p>`;
    } else {
        html += `<table class="pd-table">
            <thead><tr><th>Module</th><th>Plays</th><th>Last</th></tr></thead>
            <tbody>`;
        for (const r of recent) {
            html += `<tr>
                <td>${modTitle(r.id)}</td>
                <td>${r.count || 1}</td>
                <td>${timeAgo(r.lastVisited)}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
    }

    body.innerHTML = html;
}

function selectUser(name) {
    currentUser = name;
    // Daily bonus check happens when Hakan selects himself.
    if (name === 'hakan') {
        setTimeout(() => {
            if (typeof checkDailyBonus === 'function') checkDailyBonus();
            if (typeof checkWeeklyRecap === 'function') checkWeeklyRecap();
            if (typeof _firstOfDayGreeting === 'function') _firstOfDayGreeting();
            if (typeof checkPetBirthday === 'function') checkPetBirthday();
        }, 400);
        setTimeout(() => { if (typeof maybeStartOnboarding === 'function') maybeStartOnboarding(); }, 1600);
    }
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
        // Quick stats row
        const statsEl = document.getElementById('start-stats');
        if (statsEl) {
            const progress = loadAllProgress();
            const totalStars = Object.values(progress).reduce((s, p) => s + (p.stars || 0), 0);
            const earned = loadEarnedBadges();
            const streak = loadStreak();
            document.getElementById('ss-stars').textContent = totalStars;
            document.getElementById('ss-badges').textContent = Object.keys(earned).length;
            document.getElementById('ss-streak').textContent = (streak.current || 0);
            statsEl.style.display = '';
            // Most recently earned badge.
            const lb = document.getElementById('latest-badge');
            if (lb && Object.keys(earned).length && BADGES_CATALOG.length) {
                let mostRecent = null, mostRecentTs = 0;
                for (const id of Object.keys(earned)) {
                    const e = earned[id];
                    const ts = (typeof e === 'number') ? e : (e && e.when) || 0;
                    if (ts > mostRecentTs) {
                        const b = BADGES_CATALOG.find((x) => x.id === id);
                        if (b) { mostRecent = b; mostRecentTs = ts; }
                    }
                }
                if (mostRecent) {
                    lb.innerHTML = `<span class="lb-label">🏆 Most recent:</span>
                        <span class="lb-emoji">${mostRecent.emoji || '🏅'}</span>
                        <span class="lb-name">${mostRecent.name}</span>`;
                    lb.style.display = '';
                } else { lb.style.display = 'none'; }
            } else if (lb) { lb.style.display = 'none'; }
        }
    } else {
        // Koray: show admin section, hide Robux banner
        const robux = loadRobux();
        document.getElementById('admin-robux').textContent = robux.toFixed(2);
        robuxBanner.style.display = 'none';
        adminSection.style.display = '';
        robuxDisplay.style.display = 'none';
        const statsEl = document.getElementById('start-stats');
        if (statsEl) statsEl.style.display = 'none';
    }

    // Re-render the module grid now that we know which user is playing.
    // Without this, the home grid keeps the no-user version rendered at
    // boot (no greeting, no top row, no Today's Adventure), so the page
    // looks different from what Home returns to later.
    if (typeof renderHomeModules === 'function') renderHomeModules();

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
    hintCooldownAt: 0,       // ms timestamp when hint button unlocks
    problemShownAt: 0,       // ms timestamp when current problem was rendered
    sessionRobux: 0,         // Robux earned this game session
    usedNumberLine: false,   // whether number line was used for current problem
    usedTenFrames: false,    // whether ten frames was used for current problem
    sessionMessagesUsed: [], // praise indices used in current session (avoid repeat)
};

// ===== Difficulty Ranges =====
const RANGES = {
    easy:   { min: 1, max: 9 },
    medium: { min: 1, max: 99 },
};

// ===== Encouraging Messages =====
const MESSAGES = {
    correct: [
        "Amazing, Hakan! 🌟", "Awesome work, Hakan! 🎉", "You're a star, Hakan! ⭐",
        "Super smart, Hakan! 🧠", "Fantastic, Hakan! 🚀", "Wonderful, Hakan! 💫",
        "You rock, Hakan! 🎸", "Brilliant, Hakan! 💡", "Keep it up, Hakan! 🔥",
        "Math wizard Hakan! 🧙", "So cool, Hakan! 😎", "Incredible, Hakan! 🏆",
        "Hakan, you are NUMBER ONE! 1️⃣", "Hakan, you are SO smart! 🧠✨",
        "Hakan, you got it! 🎯", "Way to go, Hakan! 👏",
        "Hakan, you're a math GENIUS! 🤓", "Yes Hakan! 💯",
        "Hakan, you are AMAZING! 🤩", "That's my smart Hakan! 🥰",
        "Hakan, you're unstoppable! ⚡", "Look at you go, Hakan! 🚀",
        "Hakan, you nailed it! 🎯", "Hakan, you're a champion! 🏆",
        "Hakan, you make math look easy! ✨", "Bravo Hakan! 👏",
        "Hakan, you're on a roll! 🎲", "Hakan, you are awesome! 🌈",
        "I knew you could do it, Hakan! 💪", "Hakan, you're a superstar! ⭐",
    ],
    wrong: [
        "Almost, Hakan! Try again! 💪", "So close, Hakan! One more try! 🤔",
        "Not quite, Hakan — you got this! 🌈", "Keep trying, Hakan! You're learning! 💪",
        "Hmm, try another number, Hakan! 🤓", "Hakan, every try makes you smarter! 🧠",
        "It's okay, Hakan! Mistakes help us grow! 🌱", "Try again, Hakan — I believe in you! 🌟",
        "You're SO close, Hakan! 💫", "Take another look, Hakan! 👀",
        "Don't give up, Hakan! You can do it! 💪", "Almost there, Hakan! 🎯",
    ],
    streak: [
        "🔥 Hakan, you're on fire!", "⚡ Hakan, unstoppable!", "🌟 Hakan, star streak!",
        "🚀 Hakan, blasting off!", "💎 Diamond brain, Hakan!",
        "🏆 Hakan, you're a champion!", "✨ Hakan is amazing!",
        "🎯 Hakan, perfect aim!", "🧙 Math wizard Hakan strikes again!",
        "👑 King Hakan of math!",
    ],
    start: [
        "You can do it, Hakan! 💪", "Let's go, Hakan! 🚀", "I believe in you, Hakan! 🌟",
        "Math time, Hakan! 🧮", "Ready Hakan? Let's roll! 🎲",
        "Hakan, you've got this! 💯", "Show 'em what you know, Hakan! 🧠",
        "Hakan the smart, let's start! ⭐",
    ],
    // Skill-specific praise — picks based on the problem operation when known.
    addition: [
        "Great adding, Hakan! ➕", "Perfect plus, Hakan! ✨",
        "You added it like a pro, Hakan! 🎯", "Smart sum, Hakan! 🧠",
        "That's how we add, Hakan! 🌟",
    ],
    subtraction: [
        "Subtract champ, Hakan! ➖", "Take-away wizard, Hakan! 🧙",
        "Crisp subtraction, Hakan! ⚡", "You found the difference, Hakan! 🎯",
        "Smart minus, Hakan! 🌟",
    ],
    counting: [
        "Super counting, Hakan! 🔢", "One, two, you knew, Hakan! 🎯",
        "Counted just right, Hakan! 🌟", "Eagle eyes, Hakan! 👀",
    ],
    shapes: [
        "Shape expert, Hakan! 🔷", "You see shapes everywhere, Hakan! 👁️",
        "Geometry star, Hakan! ⭐",
    ],
    time: [
        "On time, Hakan! 🕐", "Clock master, Hakan! ⏰",
        "Time wizard, Hakan! 🧙‍♂️",
    ],
    money: [
        "Coin pro, Hakan! 🪙", "Money smart, Hakan! 💰",
        "Cha-ching, Hakan! 🤑",
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

// ===== Sound profile (cheerful / gentle / silent) =====
const SOUND_PROFILE_KEY = 'hakans-math-sound-profile';
function loadSoundProfile() {
    try { return localStorage.getItem(SOUND_PROFILE_KEY) || 'cheerful'; }
    catch (e) { return 'cheerful'; }
}
function saveSoundProfile(p) {
    try { localStorage.setItem(SOUND_PROFILE_KEY, p); } catch (e) {}
    if (typeof renderHomeModules === 'function') renderHomeModules();
}
function _soundGain(base) {
    const p = loadSoundProfile();
    if (p === 'silent') return 0;
    if (p === 'gentle') return base * 0.4;
    return base;
}

// Win sound variants — picked at random for variety.
function _playWinVariant(variant) {
    const ctx = getAudioCtx();
    const variants = {
        cascade: [523, 587, 659, 698, 784, 880, 988, 1047],
        arpeggio: [523, 659, 784, 1047],
        triplet: [523, 659, 784, 523, 659, 784, 1047],
        ladder: [392, 440, 494, 523, 587, 659, 784],
    };
    const notes = variants[variant] || variants.cascade;
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(_soundGain(0.12), ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.3);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.3);
    });
}

function playSound(type) {
    if (loadSoundProfile() === 'silent') return;
    // Gentle mode: skip the multi-note win fanfare to keep things low-key.
    if (loadSoundProfile() === 'gentle' && type === 'win') return;
    try {
        if (type === 'win') {
            const variants = ['cascade', 'arpeggio', 'triplet', 'ladder'];
            _playWinVariant(variants[Math.floor(Math.random() * variants.length)]);
            return;
        }
        const ctx = getAudioCtx();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(_soundGain(0.15), ctx.currentTime);

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
            // Slight pitch variety for clicks (550-700Hz) so taps don't feel monotone.
            const pitch = 550 + Math.floor(Math.random() * 150);
            oscillator.frequency.setValueAtTime(pitch, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.08);
        } else if (type === 'whoosh') {
            // Quick sweep for unique moments
            oscillator.frequency.setValueAtTime(220, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.25);
        } else if (type === 'sparkle') {
            // Light twinkle for special moments
            const tone = 1200 + Math.floor(Math.random() * 400);
            oscillator.frequency.setValueAtTime(tone, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            oscillator.type = 'triangle';
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
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
    if (!speechEnabled) return;

    // Strip emojis and special chars for cleaner speech
    const cleanText = text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u200D\uFE0F]/gu, '')
                          .replace(/[−–—]/g, 'minus')  // speak math minus signs
                          .trim();
    if (!cleanText) return;

    // Prefer pre-recorded MP3 clips (cross-browser, neural-quality voice).
    // tryPlayClip is defined in audio.js; returns true when it served the request.
    if (typeof tryPlayClip === 'function' && tryPlayClip(cleanText)) {
        return;
    }

    // Fallback: Web Speech API (depends on what's installed in the browser/OS)
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    // Voice rate from Comfort settings (slow/normal/fast).
    const speed = (typeof loadVoiceSpeed === 'function') ? loadVoiceSpeed() : 'normal';
    utterance.rate = speed === 'slow' ? 0.75 : speed === 'fast' ? 1.05 : 0.9;
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

    // 0. Best on iOS/iPadOS: Siri voices (Siri Voice 1, Siri Voice 2, etc.)
    //    These are the highest-quality voices Apple ships and are downloaded
    //    via Settings → Accessibility → Spoken Content → Voices.
    cachedVoice = voices.find(v =>
        isEnglish(v) && /siri/i.test(v.name)
    );
    if (cachedVoice) matchStep = '0-siri';

    // 1. Best (desktop / older iOS): Premium male English voice
    if (!cachedVoice) {
        cachedVoice = voices.find(v =>
            isEnglish(v) && v.name.includes('(Premium)') && isMaleName(v)
        );
        if (cachedVoice) matchStep = '1-premium-male';
    }

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
    const icon = speechEnabled ? '🔊' : '🔇';
    document.getElementById('sound-btn').textContent = icon;
    const ffBtn = document.getElementById('ff-sound-btn');
    if (ffBtn) ffBtn.textContent = icon;
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

// Pick praise that avoids the last few used in this session, and mixes in
// operation-specific messages when an op hint is provided.
function pickPraise(op) {
    const recent = state.sessionMessagesUsed || [];
    let pool = MESSAGES.correct.slice();
    // If we have op-specific praise, mix in with a 35% chance.
    if (op && MESSAGES[op] && Math.random() < 0.35) {
        pool = MESSAGES[op];
    }
    // Filter recents
    let avail = pool.filter((m) => !recent.includes(m));
    if (avail.length === 0) avail = pool;
    const choice = avail[Math.floor(Math.random() * avail.length)];
    state.sessionMessagesUsed = (recent.concat([choice])).slice(-8);
    return choice;
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
// Hint cooldown: encourages "think first" before peeking at help. The
// button is disabled for HINT_COOLDOWN_MS after each problem is shown,
// with a countdown clock so Hakan knows it's coming.
const HINT_COOLDOWN_MS = 6000;

function startHintCooldown() {
    const hintBtn = document.getElementById('hint-btn');
    if (!hintBtn) return;
    // Skip cooldown when Hakan re-read the lesson recently.
    if (typeof lessonViewedRecently === 'function' && typeof moduleState !== 'undefined' &&
        lessonViewedRecently(moduleState.moduleId)) {
        state.hintCooldownAt = 0;
        hintBtn.classList.remove('hint-cooling');
        hintBtn.disabled = false;
        hintBtn.textContent = '💡 Hint';
        return;
    }
    state.hintCooldownAt = Date.now() + HINT_COOLDOWN_MS;
    hintBtn.classList.add('hint-cooling');
    hintBtn.disabled = true;
    _tickHintCooldown();
}

function _tickHintCooldown() {
    const hintBtn = document.getElementById('hint-btn');
    if (!hintBtn) return;
    const remaining = state.hintCooldownAt - Date.now();
    if (remaining <= 0) {
        hintBtn.classList.remove('hint-cooling');
        hintBtn.disabled = false;
        hintBtn.textContent = '💡 Hint';
        return;
    }
    const secs = Math.ceil(remaining / 1000);
    hintBtn.textContent = `🤔 Think first (${secs})`;
    setTimeout(_tickHintCooldown, 250);
}

function showHint() {
    if (state.hintCooldownAt && Date.now() < state.hintCooldownAt) return;
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
    state.problemShownAt = Date.now();
    const stepsContainer = document.getElementById('hint-steps');
    stepsContainer.innerHTML = '';
    const hintBtn = document.getElementById('hint-btn');
    hintBtn.textContent = '💡 Hint';
    hintBtn.classList.remove('exhausted');
    startHintCooldown();
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

    let firstNum = problem.a;
    let secondNum = problem.b;
    let tensCarry = 0;

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
        isLevel2: false,
        tensCarry: 0,
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

// ===== Mode Selection =====
let selectedMode = 'addsub'; // 'addsub' or 'factfamily'
let activeGameMode = 'addsub'; // which mode is currently running

// (Old mode-button flow removed — replaced by module grid in modules.js)

// ===== Start Game =====
function initSpeechOnGesture() {
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
}

function startGame(mode, isPractice) {
    playSound('click');
    initSpeechOnGesture();

    activeGameMode = 'addsub';
    state.mode = mode;
    state.difficulty = 'easy'; // hardcoded — Level 2 removed
    state.isPractice = !!isPractice;        // shorter session, no Robux
    state.totalQuestions = state.isPractice ? 5 : 10;
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

        // Robux reward for Hakan (no reward in practice, or if hints/number line were used)
        if (currentUser === 'hakan' && !state.isPractice && state.hintStep === 0 && !state.usedNumberLine && !state.usedTenFrames) {
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
            const op = state.currentProblem && state.currentProblem.type;
            message = pickPraise(op);
        }
        setMascotMessage(message);

        // Floating stars (varied count for streak tier)
        spawnFloatingStars(state.streak >= 5 ? 6 : 3);

        // Streak milestone celebration — fires once each at 3/5/10/15/20.
        if ([3, 5, 10, 15, 20].includes(state.streak)) {
            celebrateStreakMilestone(state.streak);
        }

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
        // Mix in encouraging emojis with the X so wrong doesn't feel
        // harsh — 6 of 10 times Hakan sees a "keep trying" face.
        const wrongFeedback = ['❌', '🤔', '💪', '🙃', '😅', '🌱', '❌', '🤔', '💪', '❌'];
        showFeedback(randomChoice(wrongFeedback));

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
    const el = document.getElementById('mascot-message');
    if (!el) return;
    el.textContent = msg;
    const bubble = el.closest('.speech-bubble');
    if (bubble) {
        bubble.classList.remove('bubble-pop');
        // Force reflow so the animation re-triggers reliably.
        void bubble.offsetWidth;
        bubble.classList.add('bubble-pop');
    }
    // Add a mood emoji overlay near the mascot photo, picked from the message.
    _setMascotMood(_inferMood(msg));
    if (alsoSpeak) speak(msg);
}

function _inferMood(msg) {
    if (!msg) return '';
    const m = msg.toLowerCase();
    if (/wrong|try again|almost|oops|hmm|don't give up|keep trying/.test(m)) return '🤔';
    if (/streak|fire|on a roll|hot|in a row/.test(m)) return '🔥';
    if (/win|perfect|amazing|wow|champion|wizard|genius|aced/.test(m)) return '🎉';
    if (/think|hint|let me help|figure out/.test(m)) return '💡';
    if (/welcome|hello|hi |good morning|good afternoon|evening/.test(m)) return '👋';
    return '😄';
}

function _setMascotMood(emoji) {
    const mascotEls = document.querySelectorAll('.game-mascot, .results-mascot, .mascot');
    mascotEls.forEach((mascot) => {
        let mood = mascot.querySelector('.mascot-mood');
        if (!mood) {
            mood = document.createElement('span');
            mood.className = 'mascot-mood';
            mascot.appendChild(mood);
        }
        mood.textContent = emoji;
    });
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

    // Confetti burst from the revealed answer position
    burstConfettiAt(answerNum);
}

// Spawn a 14-piece emoji burst at the center of `el`. Decorative; particles
// auto-remove after 1.2s. Used on right answer + streak milestones.
function burstConfettiAt(el, opts) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const emojis = (opts && opts.emojis) || ['🎉','⭐','✨','💎','🌟','🎊'];
    const count = (opts && opts.count) || 14;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'celeb-burst-particle';
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.4;
        const speed = 80 + Math.random() * 80;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed - 20;
        p.style.setProperty('--cb-dx', dx + 'px');
        p.style.setProperty('--cb-dy', dy + 'px');
        p.style.setProperty('--cb-rot', (Math.random() * 720 - 360) + 'deg');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
    }
}

// Streak milestone toast. Fires when Hakan hits 3, 5, 10, 15, 20 in a row.
// Bigger overlay + screen-wide confetti shower for big streaks.
function celebrateStreakMilestone(n) {
    const tiers = {
        3:  { emoji: '🔥', text: '3 in a row!',      sub: "You're on fire, Hakan!"  },
        5:  { emoji: '🎉', text: 'STREAK x5!',       sub: 'Five perfect answers!'    },
        10: { emoji: '🤩', text: 'AMAZING x10!',     sub: 'Ten in a row, Hakan!'     },
        15: { emoji: '👑', text: 'CHAMPION x15!',    sub: 'Fifteen perfect — wow!'   },
        20: { emoji: '🌟', text: 'LEGENDARY x20!',   sub: "You're a math wizard!"    },
    };
    const tier = tiers[n];
    if (!tier) return;
    const toast = document.createElement('div');
    toast.className = 'streak-toast';
    toast.innerHTML = `
        <div class="streak-toast-emoji">${tier.emoji}</div>
        <div class="streak-toast-text">${tier.text}</div>
        <div class="streak-toast-sub">${tier.sub}</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('streak-toast-show'), 20);
    // Spawn a 24-piece confetti shower from the toast center
    setTimeout(() => burstConfettiAt(toast, { count: 24 }), 280);
    if (n >= 10 && typeof launchConfetti === 'function') {
        launchConfetti();
        setTimeout(launchConfetti, 600);
    }
    setTimeout(() => {
        toast.classList.remove('streak-toast-show');
        setTimeout(() => toast.remove(), 400);
    }, 2200);
    if (typeof speak === 'function') speak(tier.text);
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
    // If Hakan is mid-quiz, confirm so he doesn't lose progress.
    const id = (document.querySelector('.screen.active') || {}).id;
    if (id === 'module-game-screen' && typeof moduleState !== 'undefined' &&
        moduleState.activity === 'quiz' && moduleState.problemIndex > 0 &&
        moduleState.problemIndex < (getCurrentProblems() || []).length) {
        const ok = confirm("You're in the middle of a quiz, Hakan! Leave anyway?");
        if (!ok) return;
    }
    playSound('click');
    // Refresh Robux displays on start screen
    if (currentUser === 'hakan') {
        const robux = loadRobux();
        document.getElementById('robux-total').textContent = robux.toFixed(2);
    } else if (currentUser === 'koray') {
        document.getElementById('admin-robux').textContent = loadRobux().toFixed(2);
    }
    // Re-render the module grid so freshly-earned stars show up.
    if (typeof renderHomeModules === 'function') renderHomeModules();
    showScreen('start-screen');
    // Tiny wave goodbye if Hakan did some work
    if (currentUser === 'hakan' && typeof state !== 'undefined' && state.correctAnswers > 0) {
        _waveGoodbye(state.correctAnswers);
    }
}

function _waveGoodbye(correct) {
    const el = document.createElement('div');
    el.className = 'goodbye-toast';
    el.innerHTML = `<div class="gb-emoji">👋</div><div class="gb-text">Nice work, Hakan! +${correct} correct this game.</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('gb-show'), 50);
    setTimeout(() => {
        el.classList.remove('gb-show');
        setTimeout(() => el.remove(), 400);
    }, 1800);
}

function playAgain() {
    playSound('click');
    if (typeof window.__lastModuleStarter === 'function') {
        const fn = window.__lastModuleStarter;
        window.__lastModuleStarter = null;
        fn();
        return;
    }
    if (activeGameMode === 'factfamily') {
        startFactFamilyGame();
    } else {
        startGame(state.mode);
    }
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

    // Star rating — animate stars in one-by-one with staggered delays so it
    // feels like a real "rating reveal" rather than a flat text string.
    const stars = Math.ceil(pct * 5);
    const starRating = document.getElementById('star-rating');
    starRating.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const s = document.createElement('span');
        const lit = i < stars;
        s.className = 'star-anim ' + (lit ? 'star-lit' : 'dim-star');
        s.textContent = lit ? '⭐' : '☆';
        s.style.animationDelay = (200 + i * 180) + 'ms';
        starRating.appendChild(s);
    }
    // After the last star lands, fire a confetti burst from it.
    if (stars >= 4 && typeof burstConfettiAt === 'function') {
        setTimeout(() => {
            const lastLit = starRating.querySelector('.star-anim.star-lit:last-of-type');
            if (lastLit) burstConfettiAt(lastLit, { count: 18 });
        }, 200 + stars * 180 + 100);
    }
    if (stars === 5 && typeof burstConfettiAt === 'function') {
        setTimeout(() => {
            const mascot = document.getElementById('results-mascot');
            if (mascot) burstConfettiAt(mascot, { count: 24, emojis: ['🏆','🌟','🎉','💎','👑','🎊'] });
        }, 1100);
    }

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

    _renderResultsRecap();

    showScreen('results-screen');

    // Confetti! Stacked bursts so perfect scores feel truly epic.
    if (pct === 1) {
        launchConfetti();
        setTimeout(launchConfetti, 500);
        setTimeout(launchConfetti, 1000);
    } else if (pct >= 0.8) {
        launchConfetti();
        setTimeout(launchConfetti, 600);
    } else if (pct >= 0.5) {
        launchConfetti();
    }
}

// Growth-mindset quotes for end-of-session encouragement.
const GROWTH_QUOTES = [
    "Mistakes mean your brain is growing! 🧠",
    "Practice today makes easy tomorrow! 🌱",
    "Every try makes you stronger, Hakan! 💪",
    "Smart kids ask questions — keep going! ❓",
    "You're not done — you're just getting started! 🚀",
    "When it's hard, that's when you're learning most! 🌟",
    "Champions try, fail, and try again! 🏆",
    "You can do hard things, Hakan! 🦁",
    "The brain LOVES a challenge! 🧠",
    "Brave brains make mistakes — keep going! 🦸",
    "Every problem you solve adds to your math superpower! ⚡",
    "I'm proud of you for trying, Hakan! 🥰",
];
function pickGrowthQuote() {
    return GROWTH_QUOTES[Math.floor(Math.random() * GROWTH_QUOTES.length)];
}

// Populate "skills practiced" + "what's next" on the results screen. Pulls
// the current module from state (set by startGenericProblems) when available
// and otherwise falls back to a generic recap.
function _renderResultsRecap() {
    const recap = document.getElementById('results-recap');
    const nextEl = document.getElementById('results-next');
    const quoteEl = document.getElementById('results-quote');
    if (quoteEl) {
        quoteEl.textContent = pickGrowthQuote();
        quoteEl.style.display = '';
    }
    if (!recap || !nextEl) return;
    const mod = state.currentModule || null;
    if (mod) {
        const skill = mod.title || 'math';
        // Prefer game state, but fall back to moduleState (which the module path uses).
        const ms = (typeof moduleState !== 'undefined') ? moduleState : null;
        const correct = state.totalQuestions ? state.correctAnswers : (ms ? ms.correct : 0);
        const total = state.totalQuestions || (ms && ms.activity ? ((ms.activity === 'quiz' ? (mod.quiz || []).length : (mod.practice || []).length)) : 0);
        const accuracy = total ? Math.round((correct / total) * 100) : 0;
        let line = `<div class="rr-row"><span class="rr-icon">${mod.emoji || '📚'}</span><span class="rr-text">You practiced <b>${skill}</b> — ${accuracy}% accuracy.</span></div>`;
        if (accuracy === 100) line += `<div class="rr-row rr-good">🌟 You aced it, Hakan!</div>`;
        else if (accuracy >= 80) line += `<div class="rr-row rr-good">💪 Great progress on this skill!</div>`;
        else line += `<div class="rr-row rr-coach">🌱 Practice this one again — you'll get it!</div>`;
        const hintsUsed = ms && ms.hintsUsed;
        if (hintsUsed > 0) {
            line += `<div class="rr-row"><span class="rr-icon">💡</span><span class="rr-text">Hints used: ${hintsUsed} — smart move to ask!</span></div>`;
        } else if (total > 0) {
            line += `<div class="rr-row"><span class="rr-icon">🧠</span><span class="rr-text">No hints needed — independent thinking!</span></div>`;
        }
        if (ms && ms._newPersonalBest) {
            line += `<div class="rr-row rr-pb">🥇 NEW PERSONAL BEST!</div>`;
        }
        recap.innerHTML = line;
        recap.style.display = '';
        // Next module suggestion: pick next module in the same category
        // that hasn't earned 3 stars yet.
        const next = _suggestNextModule(mod);
        if (next) {
            nextEl.innerHTML = `<div class="rn-label">Up next:</div>
                <button class="rn-btn" onclick="selectModule('${next.id}')">${next.emoji || '➡️'} ${next.title}</button>`;
            nextEl.style.display = '';
        } else {
            nextEl.style.display = 'none';
        }
    } else {
        recap.style.display = 'none';
        nextEl.style.display = 'none';
    }
}

function _suggestNextModule(mod) {
    if (typeof MODULES === 'undefined' || !mod) return null;
    const progress = (typeof loadAllProgress === 'function') ? loadAllProgress() : {};
    const sameCat = MODULES.filter((m) => (m.category || 'A') === (mod.category || 'A'));
    const idx = sameCat.findIndex((m) => m.id === mod.id);
    if (idx < 0) return null;
    // First, try a module after the current one in the same category.
    for (let i = idx + 1; i < sameCat.length; i++) {
        const cand = sameCat[i];
        const p = progress[cand.id];
        if (!p || p.stars < 3) return cand;
    }
    // Then, try one before that's not yet mastered.
    for (let i = 0; i < idx; i++) {
        const cand = sameCat[i];
        const p = progress[cand.id];
        if (!p || p.stars < 3) return cand;
    }
    // Otherwise look across all modules.
    for (const cand of MODULES) {
        if (cand.id === mod.id) continue;
        const p = progress[cand.id];
        if (!p) return cand;
    }
    return null;
}

// ===== Confetti =====
function launchConfetti() {
    // Calm motion: skip the big particle storm; a few stars do the job.
    if (typeof loadMotion === 'function' && loadMotion() === 'reduced') {
        if (typeof spawnFloatingStars === 'function') spawnFloatingStars(6);
        return;
    }
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                     '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                     '#BB8FCE', '#85C1E9'];

    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
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

// ===== Fact Family Practice Mode =====
const ffGameState = {
    familyNumber: 0,
    totalFamilies: 5,
    equationIndex: 0,
    totalEquations: 4,
    currentFamily: null,     // { a, b, sum, equations: [...] }
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctAnswers: 0,
    totalAnswered: 0,
    attempts: 0,             // attempts for current equation
    sessionRobux: 0,
    waiting: false,          // prevent double-taps during transitions
};

function startFactFamilyGame(isPractice) {
    playSound('click');
    initSpeechOnGesture();

    activeGameMode = 'factfamily';

    // Reset state
    ffGameState.familyNumber = 0;
    ffGameState.equationIndex = 0;
    ffGameState.currentFamily = null;
    ffGameState.score = 0;
    ffGameState.streak = 0;
    ffGameState.bestStreak = 0;
    ffGameState.correctAnswers = 0;
    ffGameState.totalAnswered = 0;
    ffGameState.attempts = 0;
    ffGameState.sessionRobux = 0;
    ffGameState.waiting = false;
    ffGameState.isPractice = !!isPractice;

    // Show Robux display for Hakan
    const ffRobux = document.getElementById('ff-robux-display');
    if (currentUser === 'hakan') {
        ffRobux.style.display = '';
        document.getElementById('ff-robux-game').textContent = loadRobux().toFixed(2);
    } else {
        ffRobux.style.display = 'none';
    }

    ffUpdateScoreDisplay();
    ffUpdateStreakDisplay();

    showScreen('factfamily-screen');
    ffSetMascotMessage(randomChoice(MESSAGES.start));
    ffNextFamily();
}

function generateFactFamily() {
    // Generate two distinct single-digit numbers (1-9)
    let a = randomInt(1, 9);
    let b = randomInt(1, 8);
    if (b >= a) b++; // ensure distinct

    // Always make a < b for consistency (smaller first)
    if (a > b) [a, b] = [b, a];

    const sum = a + b;

    // Build 4 equations with metadata for coloring
    const equations = [
        { parts: [a, '+', b], answer: sum, display: `${a} + ${b} = ?`, colors: ['a', 'op', 'b'], answerColor: 'sum' },
        { parts: [b, '+', a], answer: sum, display: `${b} + ${a} = ?`, colors: ['b', 'op', 'a'], answerColor: 'sum' },
        { parts: [sum, '−', a], answer: b, display: `${sum} − ${a} = ?`, colors: ['sum', 'op', 'a'], answerColor: 'b' },
        { parts: [sum, '−', b], answer: a, display: `${sum} − ${b} = ?`, colors: ['sum', 'op', 'b'], answerColor: 'a' },
    ];

    return { a, b, sum, equations };
}

function buildFFTriangleSVG(family) {
    const NS = 'http://www.w3.org/2000/svg';
    const W = 320, H = 180;

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'ff-triangle-svg');

    // Triangle vertices (compact)
    const topX = 160, topY = 35;
    const blX = 60, blY = 140;
    const brX = 260, brY = 140;

    // Draw triangle lines
    [[topX, topY, blX, blY], [topX, topY, brX, brY], [blX, blY, brX, brY]].forEach(([x1, y1, x2, y2]) => {
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#6C63FF');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('opacity', '0.25');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);
    });

    const circleR = family.sum >= 10 ? 28 : 24;
    const fontSize = family.sum >= 10 ? '18' : '22';

    function drawCircle(cx, cy, num, fill) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy);
        c.setAttribute('r', circleR);
        c.setAttribute('fill', fill);
        c.setAttribute('stroke', 'white');
        c.setAttribute('stroke-width', '3');
        svg.appendChild(c);

        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', cx); t.setAttribute('y', cy + 7);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', fontSize);
        t.setAttribute('font-weight', '800');
        t.setAttribute('fill', 'white');
        t.textContent = num;
        svg.appendChild(t);
    }

    // Sum at top (orange), A bottom-left (blue), B bottom-right (green)
    drawCircle(topX, topY, family.sum, '#FF914D');
    drawCircle(blX, blY, family.a, '#4A90D9');
    drawCircle(brX, brY, family.b, '#43e97b');

    // "+" label between bottom
    const plus = document.createElementNS(NS, 'text');
    plus.setAttribute('x', (blX + brX) / 2);
    plus.setAttribute('y', blY + 7);
    plus.setAttribute('text-anchor', 'middle');
    plus.setAttribute('font-size', '18');
    plus.setAttribute('font-weight', '700');
    plus.setAttribute('fill', '#6C63FF');
    plus.setAttribute('opacity', '0.4');
    plus.textContent = '+';
    svg.appendChild(plus);

    // "=" on left edge
    const eq = document.createElementNS(NS, 'text');
    eq.setAttribute('x', (topX + blX) / 2 - 12);
    eq.setAttribute('y', (topY + blY) / 2 + 5);
    eq.setAttribute('text-anchor', 'middle');
    eq.setAttribute('font-size', '16');
    eq.setAttribute('font-weight', '700');
    eq.setAttribute('fill', '#6C63FF');
    eq.setAttribute('opacity', '0.4');
    eq.textContent = '=';
    svg.appendChild(eq);

    return svg;
}

function ffNextFamily() {
    if (ffGameState.familyNumber >= ffGameState.totalFamilies) {
        ffShowResults();
        return;
    }

    ffGameState.familyNumber++;
    ffGameState.equationIndex = 0;
    ffGameState.currentFamily = generateFactFamily();

    // Draw triangle
    const area = document.getElementById('ff-triangle-area');
    area.innerHTML = '';
    const svg = buildFFTriangleSVG(ffGameState.currentFamily);
    area.appendChild(svg);

    ffUpdateProgress();
    ffSetMascotMessage(`Family ${ffGameState.familyNumber}: ${ffGameState.currentFamily.a}, ${ffGameState.currentFamily.b}, ${ffGameState.currentFamily.sum}! 🔺`);

    ffNextEquation();
}

function ffNextEquation() {
    if (ffGameState.equationIndex >= ffGameState.totalEquations) {
        // All 4 equations done for this family — celebrate and move on
        ffGameState.waiting = true;
        ffSetMascotMessage('Great family! 🎉 Next one coming!');
        playSound('correct');
        spawnFloatingStars(3);

        setTimeout(() => {
            ffGameState.waiting = false;
            ffNextFamily();
        }, 2000);
        return;
    }

    ffGameState.attempts = 0;
    const family = ffGameState.currentFamily;
    const eq = family.equations[ffGameState.equationIndex];

    // Color mapping
    const colorMap = { sum: 'highlight-sum', a: 'highlight-a', b: 'highlight-b' };

    // Update equation display
    const part1El = document.getElementById('ff-eq-part1');
    const opEl = document.getElementById('ff-eq-operator');
    const part2El = document.getElementById('ff-eq-part2');

    part1El.textContent = eq.parts[0];
    opEl.textContent = eq.parts[1];
    part2El.textContent = eq.parts[2];

    // Apply color classes
    part1El.className = 'ff-eq-number ' + (colorMap[eq.colors[0]] || '');
    part2El.className = 'ff-eq-number ' + (colorMap[eq.colors[2]] || '');

    // Clear answer input
    const input = document.getElementById('ff-answer-input');
    const answerBox = input.closest('.ff-answer-box') || input.parentElement;
    // Remove any revealed answer
    const revealed = answerBox.querySelector('.ff-answer-revealed');
    if (revealed) revealed.remove();
    input.style.display = '';
    input.value = '';
    input.focus();

    // Update equation progress
    document.getElementById('ff-equation-progress').textContent =
        `Equation ${ffGameState.equationIndex + 1} / ${ffGameState.totalEquations}`;

    // Card animation
    const card = document.getElementById('ff-equation-card');
    card.classList.remove('correct', 'wrong');
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'fadeIn 0.4s ease';

    // Speak the equation
    const spokenOp = eq.parts[1] === '+' ? 'plus' : 'minus';
    speak(`${eq.parts[0]} ${spokenOp} ${eq.parts[2]}?`);
}

function ffCheckAnswer() {
    if (ffGameState.waiting) return;

    const input = document.getElementById('ff-answer-input');
    const userAnswer = parseInt(input.value);
    const card = document.getElementById('ff-equation-card');

    if (isNaN(userAnswer) || input.value === '') {
        input.style.animation = 'none';
        input.offsetHeight;
        input.style.animation = 'shake 0.4s ease';
        return;
    }

    const eq = ffGameState.currentFamily.equations[ffGameState.equationIndex];
    ffGameState.attempts++;
    ffGameState.totalAnswered++;

    if (userAnswer === eq.answer) {
        // Correct!
        const points = ffGameState.attempts === 1 ? 10 : Math.max(5, 10 - ffGameState.attempts * 2);
        ffGameState.score += points;
        ffGameState.streak++;
        ffGameState.correctAnswers++;
        if (ffGameState.streak > ffGameState.bestStreak) {
            ffGameState.bestStreak = ffGameState.streak;
        }

        // Robux for Hakan (first attempt only, 2 per equation; not in practice)
        if (currentUser === 'hakan' && !ffGameState.isPractice && ffGameState.attempts === 1) {
            const robuxEarned = 2;
            const current = loadRobux();
            const newTotal = Math.round((current + robuxEarned) * 100) / 100;
            saveRobux(newTotal);
            ffGameState.sessionRobux = Math.round((ffGameState.sessionRobux + robuxEarned) * 100) / 100;
            document.getElementById('ff-robux-game').textContent = newTotal.toFixed(2);
        }

        card.classList.add('correct');
        playSound('correct');

        // Show the answer replacing input
        ffGameState.waiting = true;
        input.style.display = 'none';
        const answerBox = input.parentElement;
        const ansNum = document.createElement('span');
        ansNum.className = 'ff-answer-revealed';
        ansNum.textContent = eq.answer;
        answerBox.appendChild(ansNum);

        let message;
        if (ffGameState.streak >= 3 && ffGameState.streak % 3 === 0) {
            message = randomChoice(MESSAGES.streak) + ` (${ffGameState.streak} in a row!)`;
        } else {
            message = pickPraise('addition');
        }
        ffSetMascotMessage(message);
        spawnFloatingStars(2);

        ffUpdateScoreDisplay();
        ffUpdateStreakDisplay();

        setTimeout(() => {
            ffGameState.waiting = false;
            ffGameState.equationIndex++;
            ffNextEquation();
        }, 1800);
    } else {
        // Wrong
        card.classList.add('wrong');
        playSound('wrong');
        ffGameState.streak = 0;
        ffUpdateStreakDisplay();

        ffSetMascotMessage(randomChoice(MESSAGES.wrong));
        ffShowFeedback('❌');

        setTimeout(() => {
            card.classList.remove('wrong');
            input.value = '';
            input.focus();
        }, 800);

        // After 3 wrong attempts, reveal and move on
        if (ffGameState.attempts >= 3) {
            ffGameState.waiting = true;
            ffSetMascotMessage(`The answer is ${eq.answer}. Let's keep going! 📖`);

            input.style.display = 'none';
            const answerBox = input.parentElement;
            const ansNum = document.createElement('span');
            ansNum.className = 'ff-answer-revealed';
            ansNum.textContent = eq.answer;
            answerBox.appendChild(ansNum);

            setTimeout(() => {
                ffGameState.waiting = false;
                ffGameState.equationIndex++;
                ffNextEquation();
            }, 2500);
        }
    }
}

// ===== Fact Family UI Helpers =====
function ffTypeNumber(num) {
    playSound('click');
    const input = document.getElementById('ff-answer-input');
    if (input.value.length < 3) {
        input.value += num;
    }
}

function ffDeleteNumber() {
    playSound('click');
    const input = document.getElementById('ff-answer-input');
    input.value = input.value.slice(0, -1);
}

function handleFFKeyPress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        ffCheckAnswer();
    }
}

function ffUpdateScoreDisplay() {
    document.getElementById('ff-score').textContent = ffGameState.score;
}

function ffUpdateStreakDisplay() {
    document.getElementById('ff-streak-text').textContent = `🔥 ${ffGameState.streak}`;
}

function ffUpdateProgress() {
    const total = ffGameState.totalFamilies;
    const current = ffGameState.familyNumber;
    const pct = ((current - 1) / total) * 100;
    document.getElementById('ff-progress-fill').style.width = pct + '%';
    document.getElementById('ff-progress-text').textContent = `Family ${current} / ${total}`;
}

function ffSetMascotMessage(msg, alsoSpeak = true) {
    document.getElementById('ff-mascot-message').textContent = msg;
    if (alsoSpeak) speak(msg);
}

function ffShowFeedback(content) {
    const overlay = document.getElementById('ff-feedback-overlay');
    const contentEl = document.getElementById('ff-feedback-content');
    contentEl.textContent = content;
    overlay.classList.remove('hidden');

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 1000);
}

function ffShowResults() {
    playSound('win');

    const totalEqs = ffGameState.totalFamilies * ffGameState.totalEquations; // 20
    const pct = ffGameState.correctAnswers / totalEqs;

    let title;
    if (pct === 1) title = "🏆 PERFECT SCORE! 🏆";
    else if (pct >= 0.8) title = "🎉 Great Job! 🎉";
    else if (pct >= 0.5) title = "👍 Good Try! 👍";
    else title = "Keep Practicing! 📚";

    document.getElementById('results-title').textContent = title;

    const resultsMascot = document.getElementById('results-mascot');
    const existingBadge = resultsMascot.querySelector('.results-badge');
    if (existingBadge) existingBadge.remove();
    const badge = document.createElement('span');
    badge.className = 'results-badge';
    badge.textContent = pct === 1 ? '🎓' : pct >= 0.8 ? '👏' : pct >= 0.5 ? '💪' : '🤗';
    resultsMascot.appendChild(badge);

    document.getElementById('final-score').textContent = ffGameState.score;
    document.getElementById('final-correct').textContent = `${ffGameState.correctAnswers} / ${totalEqs}`;
    document.getElementById('final-streak').textContent = ffGameState.bestStreak;

    const stars = Math.ceil(pct * 5);
    document.getElementById('star-rating').textContent = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

    // Robux results
    const robuxResults = document.getElementById('robux-results');
    if (currentUser === 'hakan') {
        document.getElementById('robux-session').textContent = ffGameState.sessionRobux.toFixed(2);
        document.getElementById('robux-total-result').textContent = loadRobux().toFixed(2);
        robuxResults.style.display = '';
    } else {
        robuxResults.style.display = 'none';
    }

    // Progress to 100%
    document.getElementById('ff-progress-fill').style.width = '100%';

    showScreen('results-screen');

    if (pct >= 0.5) launchConfetti();
}
