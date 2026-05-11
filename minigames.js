/* Hakan's Math Practice — Mini-Games
 *
 * 8 quick-play games. Each game implements a small lifecycle:
 *   start({area, hud, onScore, onEnd}) -> returns { stop, tick? }
 *
 * The framework handles the timer, score display, end-screen, Robux award,
 * and best-score tracking in localStorage.
 */

let MINI_GAMES_CATALOG = [];
let _activeGame = null;
let _gameTimer = null;
let _gameDeadlineMs = 0;
let _gameScore = 0;
let _activeGameId = null;
let _gameCombo = 0;

// ----------------------------------------------------------------------
// "Juice" helpers — floating popups, particle bursts, pulse effects
// ----------------------------------------------------------------------

function mgScorePopup(text, x, y, cls) {
    const host = document.getElementById('mg-play-area');
    if (!host) return;
    const r = host.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'mg-popup ' + (cls || '');
    el.textContent = text;
    el.style.left = ((x - r.left) || (r.width / 2)) + 'px';
    el.style.top  = ((y - r.top)  || (r.height / 2)) + 'px';
    host.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

function mgConfettiBurst(x, y, count) {
    const host = document.getElementById('mg-play-area');
    if (!host) return;
    const r = host.getBoundingClientRect();
    const cx = (x - r.left) || (r.width / 2);
    const cy = (y - r.top)  || (r.height / 2);
    const emojis = ['🎉','⭐','✨','💎','🌟'];
    const n = count || 8;
    for (let i = 0; i < n; i++) {
        const p = document.createElement('span');
        p.className = 'mg-confetti';
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        const angle = (Math.PI * 2 / n) * i + (Math.random() - 0.5) * 0.5;
        const speed = 60 + Math.random() * 60;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        p.style.setProperty('--dx', dx + 'px');
        p.style.setProperty('--dy', dy + 'px');
        host.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
}

function _flashCombo() {
    if (_gameCombo < 3) return;
    const el = document.getElementById('mg-play-score');
    if (!el) return;
    el.classList.add('mg-combo-flash');
    setTimeout(() => el.classList.remove('mg-combo-flash'), 600);
}

function _pulseTimerIfLow() {
    const timerEl = document.getElementById('mg-play-timer');
    if (!timerEl) return;
    const remaining = Math.ceil((_gameDeadlineMs - Date.now()) / 1000);
    if (remaining <= 5 && remaining > 0) {
        timerEl.classList.add('mg-timer-low');
    } else {
        timerEl.classList.remove('mg-timer-low');
    }
}

// Haptic feedback — short pulse on most browsers/devices that support it.
// Silent failure on unsupported devices (desktop browsers etc.).
function mgVibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

// Pause state — when paused, timer freezes and game inputs are blocked.
let _gamePaused = false;
let _gamePauseAt = 0;
function pauseMiniGame() {
    if (!_gameTimer || _gamePaused) return;
    _gamePaused = true;
    _gamePauseAt = Date.now();
    document.getElementById('mg-play-area').classList.add('mg-paused');
    const btn = document.getElementById('mg-pause-btn');
    if (btn) btn.textContent = '▶ Resume';
}
function resumeMiniGame() {
    if (!_gamePaused) return;
    const pausedFor = Date.now() - _gamePauseAt;
    _gameDeadlineMs += pausedFor;  // extend deadline by paused time
    _gamePaused = false;
    document.getElementById('mg-play-area').classList.remove('mg-paused');
    const btn = document.getElementById('mg-pause-btn');
    if (btn) btn.textContent = '⏸ Pause';
}
function toggleMiniGamePause() {
    if (_gamePaused) resumeMiniGame();
    else pauseMiniGame();
}

// Auto-pause when tab becomes inactive so the timer doesn't burn down
// while Hakan is on another tab/app.
document.addEventListener('visibilitychange', () => {
    if (document.hidden && _gameTimer && !_gamePaused) pauseMiniGame();
});

const MG_BEST_KEY = 'hakans-math-game-bests';

function _loadBests() {
    try {
        const raw = localStorage.getItem(MG_BEST_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function _saveBests(bests) {
    try { localStorage.setItem(MG_BEST_KEY, JSON.stringify(bests)); } catch (e) {}
}

(async function loadMiniGamesCatalog() {
    try {
        const res = await fetch('minigames.json?v=' + (typeof AUDIO_VERSION !== 'undefined' ? AUDIO_VERSION : 1));
        if (res.ok) MINI_GAMES_CATALOG = await res.json();
    } catch (e) {}
})();

// ----------------------------------------------------------------------
// HUB
// ----------------------------------------------------------------------

// Daily challenge — deterministic pick from the catalog based on today's
// date. Earns 2x Robux on completion.
const MG_DAILY_KEY = 'hakans-math-game-daily';
function _todayKeyForGames() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function getDailyChallenge() {
    if (!MINI_GAMES_CATALOG.length) return null;
    const key = _todayKeyForGames();
    const seed = key.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return MINI_GAMES_CATALOG[seed % MINI_GAMES_CATALOG.length];
}

// Weekly Challenge — one harder game per week, 5x Robux reward.
// Stable Mon-Sun (uses ISO week number).
function _isoWeekKey() {
    const d = new Date();
    // Set to nearest Thursday: current date + 4 - current day number
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() + '-W' + weekNum;
}
function getWeeklyChallenge() {
    if (!MINI_GAMES_CATALOG.length) return null;
    const key = _isoWeekKey();
    const seed = key.split('').reduce((s, c) => s + c.charCodeAt(0), 0) + 7;
    // Prefer harder games (medium/hard) for the weekly
    const pool = MINI_GAMES_CATALOG.filter((g) => g.difficulty === 'medium' || g.difficulty === 'hard');
    const candidates = pool.length ? pool : MINI_GAMES_CATALOG;
    return candidates[seed % candidates.length];
}
function isWeeklyChallenge(id) {
    const wc = getWeeklyChallenge();
    return !!wc && wc.id === id;
}
const MG_WEEKLY_KEY = 'hakans-math-game-weekly';
function isWeeklyCompletedThisWeek(id) {
    try {
        const raw = localStorage.getItem(MG_WEEKLY_KEY);
        if (!raw) return false;
        const m = JSON.parse(raw);
        return m && m.id === id && m.week === _isoWeekKey();
    } catch (e) { return false; }
}
function markWeeklyCompleted(id) {
    try {
        localStorage.setItem(MG_WEEKLY_KEY, JSON.stringify({ id, week: _isoWeekKey() }));
    } catch (e) {}
}
function isDailyChallenge(id) {
    const dc = getDailyChallenge();
    return !!dc && dc.id === id;
}
function isDailyCompletedToday(id) {
    try {
        const raw = localStorage.getItem(MG_DAILY_KEY);
        if (!raw) return false;
        const m = JSON.parse(raw);
        return m && m.id === id && m.day === _todayKeyForGames();
    } catch (e) { return false; }
}
function markDailyCompleted(id) {
    try {
        localStorage.setItem(MG_DAILY_KEY, JSON.stringify({ id, day: _todayKeyForGames() }));
    } catch (e) {}
}

// Difficulty selector — global preference saved in localStorage.
// Each game reads ctx.config plus the current difficulty to adjust spawn
// rates, number ranges, etc.
const MG_DIFF_KEY = 'hakans-math-game-diff';
function loadDifficulty() {
    try { return localStorage.getItem(MG_DIFF_KEY) || 'normal'; } catch (e) { return 'normal'; }
}
function setDifficulty(d) {
    try { localStorage.setItem(MG_DIFF_KEY, d); } catch (e) {}
    if (document.getElementById('minigames-grid')) openMiniGamesHub();
}

function openMiniGamesHub() {
    if (typeof playSound === 'function') playSound('click');
    const grid = document.getElementById('minigames-grid');
    if (!grid) return;
    const bests = _loadBests();
    const dc = getDailyChallenge();
    const diff = loadDifficulty();

    let html = '';

    // Weekly Challenge banner (above daily — bigger prize)
    const wc = getWeeklyChallenge();
    if (wc) {
        const wcDone = isWeeklyCompletedThisWeek(wc.id);
        html += `<section class="mg-weekly" onclick="launchMiniGame('${wc.id}')">
            <div class="mg-weekly-label">⚡ Weekly Challenge ⚡</div>
            <div class="mg-weekly-row">
                <span class="mg-weekly-icon">${wc.emoji || '🎮'}</span>
                <div class="mg-weekly-info">
                    <div class="mg-weekly-title">${wc.title}</div>
                    <div class="mg-weekly-sub">${wcDone ? '✓ Conquered this week!' : 'Win it = 5× 💎 mega-bonus!'}</div>
                </div>
                <span class="mg-weekly-arrow">→</span>
            </div>
        </section>`;
    }

    // Daily Challenge banner
    if (dc) {
        const doneToday = isDailyCompletedToday(dc.id);
        html += `<section class="mg-daily" onclick="launchMiniGame('${dc.id}')">
            <div class="mg-daily-label">🎯 Today's Challenge</div>
            <div class="mg-daily-row">
                <span class="mg-daily-icon">${dc.emoji || '🎮'}</span>
                <div class="mg-daily-info">
                    <div class="mg-daily-title">${dc.title}</div>
                    <div class="mg-daily-sub">${doneToday ? '✓ Done today!' : 'Win 2× 💎 Robux today!'}</div>
                </div>
                <span class="mg-daily-arrow">→</span>
            </div>
        </section>`;
    }

    // Difficulty pills
    html += `<div class="mg-diff-row">
        <span class="mg-diff-label">Difficulty:</span>
        <button class="mg-diff-btn ${diff === 'easy' ? 'mg-diff-on' : ''}" onclick="setDifficulty('easy')">🟢 Easy</button>
        <button class="mg-diff-btn ${diff === 'normal' ? 'mg-diff-on' : ''}" onclick="setDifficulty('normal')">🟡 Normal</button>
        <button class="mg-diff-btn ${diff === 'hard' ? 'mg-diff-on' : ''}" onclick="setDifficulty('hard')">🔴 Hard</button>
    </div>`;

    // Game grid
    html += `<div class="mg-grid">` + MINI_GAMES_CATALOG.map((g) => {
        const best = bests[g.id];
        const bestLine = best
            ? `<div class="mgs-card-best">⭐ Best: ${best.score}</div>`
            : `<div class="mgs-card-best mgs-card-best-empty">Try it!</div>`;
        const dcBadge = (dc && dc.id === g.id) ? `<span class="mgs-card-daily">🎯 Daily!</span>` : '';
        const wcBadge = (wc && wc.id === g.id) ? `<span class="mgs-card-weekly">⚡ Weekly!</span>` : '';
        return `<button class="mgs-card mgs-card-${g.difficulty || 'easy'}" onclick="launchMiniGame('${g.id}')">
            ${wcBadge}
            ${dcBadge}
            <span class="mgs-card-icon">${g.emoji || '🎮'}</span>
            <span class="mgs-card-title">${g.title}</span>
            <span class="mgs-card-desc">${g.description || ''}</span>
            <span class="mgs-card-meta">⏱ ${g.duration || 30}s · 💎 ${(g.rewards && g.rewards.robuxPerWin) || 3}</span>
            ${bestLine}
        </button>`;
    }).join('') + `</div>`;

    grid.innerHTML = html;
    showScreen('minigames-screen');
}

function launchMiniGame(id) {
    const g = MINI_GAMES_CATALOG.find((x) => x.id === id);
    if (!g) return;
    if (typeof playSound === 'function') playSound('click');
    _activeGameId = id;
    _gameScore = 0;
    _gameCombo = 0;
    _gamePaused = false;
    const pauseBtn = document.getElementById('mg-pause-btn');
    if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
    document.getElementById('mg-play-over').style.display = 'none';
    document.getElementById('mg-play-instr').textContent = g.objective || '';
    document.getElementById('mg-play-score').textContent = 'Score: 0';
    document.getElementById('mg-play-timer').classList.remove('mg-timer-low');
    const area = document.getElementById('mg-play-area');
    area.innerHTML = '';
    // Each game gets a themed body class so backgrounds/decorations match
    area.className = 'mg-play-area mg-theme-' + id;

    showScreen('minigame-play-screen');

    const impl = GAME_IMPLS[id];
    if (!impl) {
        area.innerHTML = `<div class="mg-empty">This game is coming soon!</div>`;
        return;
    }

    const duration = g.duration || 30;
    _gameDeadlineMs = Date.now() + duration * 1000;
    _updateTimer();
    _gameTimer = setInterval(_updateTimer, 200);

    // Effective config = game config plus current difficulty preference
    const effectiveConfig = Object.assign({}, g.config || {}, { difficulty: loadDifficulty() });

    _activeGame = impl.start({
        area,
        onScore: (delta, opts) => {
            if (_gamePaused) return;
            _gameScore += delta;
            if (delta > 0) {
                _gameCombo += 1;
                _flashCombo();
                const comboText = _gameCombo >= 3 ? ` 🔥${_gameCombo}` : '';
                document.getElementById('mg-play-score').textContent = 'Score: ' + _gameScore + comboText;
                const opt = opts || {};
                mgScorePopup('+' + delta, opt.x, opt.y, 'mg-popup-good');
                if (opt.x != null && opt.y != null) {
                    mgConfettiBurst(opt.x, opt.y, _gameCombo >= 3 ? 12 : 6);
                }
                if (typeof playSound === 'function') playSound('correct');
                mgVibrate(_gameCombo >= 3 ? [40, 20, 40] : 25);
            } else {
                document.getElementById('mg-play-score').textContent = 'Score: ' + _gameScore;
            }
        },
        onPenalty: (seconds, opts) => {
            if (_gamePaused) return;
            // Add penalty time to deadline (shorten remaining)
            _gameDeadlineMs -= seconds * 1000;
            _gameCombo = 0;
            const o = opts || {};
            mgScorePopup('-' + seconds + 's', o.x, o.y, 'mg-popup-bad');
            if (typeof playSound === 'function') playSound('wrong');
            mgVibrate(80);
            // brief area shake
            const area = document.getElementById('mg-play-area');
            if (area) {
                area.classList.remove('mg-shake'); void area.offsetWidth;
                area.classList.add('mg-shake');
            }
        },
        onWin: () => _endMiniGame(true),
        config: effectiveConfig,
    });
}

function _updateTimer() {
    if (_gamePaused) return;        // freeze countdown while paused
    const remaining = Math.max(0, Math.ceil((_gameDeadlineMs - Date.now()) / 1000));
    document.getElementById('mg-play-timer').textContent = remaining + 's';
    _pulseTimerIfLow();
    if (remaining <= 0) {
        _endMiniGame(false);
    }
}

function _endMiniGame(isWin) {
    if (_gameTimer) { clearInterval(_gameTimer); _gameTimer = null; }
    if (_activeGame && _activeGame.stop) {
        try { _activeGame.stop(); } catch (e) {}
    }
    _activeGame = null;

    const g = MINI_GAMES_CATALOG.find((x) => x.id === _activeGameId);
    if (!g) { exitMiniGame(); return; }

    // Compute Robux reward
    const baseReward = (g.rewards && g.rewards.robuxPerWin) || 3;
    const newRecordBonus = (g.rewards && g.rewards.bonusForRecord) || 0;
    const bests = _loadBests();
    const prev = bests[g.id];
    const isNewRecord = !prev || _gameScore > prev.score;
    const isDaily = isDailyChallenge(g.id) && !isDailyCompletedToday(g.id);
    const isWeekly = isWeeklyChallenge(g.id) && !isWeeklyCompletedThisWeek(g.id);
    let robuxAwarded = 0;

    if (_gameScore > 0 && typeof currentUser !== 'undefined' && currentUser === 'hakan') {
        robuxAwarded = baseReward;
        if (isNewRecord) robuxAwarded += newRecordBonus;
        if (isDaily) {
            robuxAwarded *= 2;            // 2x Robux for completing daily challenge
            markDailyCompleted(g.id);
        }
        if (isWeekly) {
            robuxAwarded *= 5;            // 5x Robux for the weekly challenge
            markWeeklyCompleted(g.id);
        }
        if (typeof saveRobux === 'function' && typeof loadRobux === 'function') {
            saveRobux(loadRobux() + robuxAwarded);
        }
    }

    if (isNewRecord && _gameScore > 0) {
        bests[g.id] = { score: _gameScore, when: Date.now() };
        _saveBests(bests);
    }

    // Track total mini-game rounds played for badges
    try {
        const raw = localStorage.getItem('hakans-math-game-rounds');
        const t = raw ? (JSON.parse(raw).count || 0) : 0;
        localStorage.setItem('hakans-math-game-rounds', JSON.stringify({ count: t + 1 }));
    } catch (e) {}

    // Daily-streak: if Hakan completed today's daily and yesterday's, extend
    if (isDaily) {
        try {
            const today = _todayKeyForGames();
            const raw = localStorage.getItem('hakans-math-game-daily-streak');
            const s = raw ? JSON.parse(raw) : { current: 0, last: null, longest: 0 };
            if (s.last === today) {
                // already counted today (shouldn't happen with isDaily=true but safe)
            } else if (s.last == null) {
                s.current = 1;
            } else {
                const y = new Date(today + 'T00:00:00');
                const lastD = new Date(s.last + 'T00:00:00');
                const gap = Math.round((y - lastD) / 86400000);
                if (gap === 1) s.current += 1;
                else s.current = 1;
            }
            s.last = today;
            s.longest = Math.max(s.longest || 0, s.current);
            localStorage.setItem('hakans-math-game-daily-streak', JSON.stringify(s));
        } catch (e) {}
    }

    document.getElementById('mg-over-title').textContent =
        _gameScore <= 0 ? "Better luck next time, Hakan!" :
        isNewRecord ? "🏅 New Record, Hakan!" :
        isWin ? "🎉 You won, Hakan!" : "⏰ Time's Up!";

    if (isNewRecord && _gameScore > 0 && typeof launchConfetti === 'function') {
        launchConfetti();
        if (typeof _showNewBestSplash === 'function') {
            _showNewBestSplash(g.name || 'Mini-Game', _gameScore, prev ? prev.score : 0);
        }
    }
    document.getElementById('mg-over-score-text').textContent = `Score: ${_gameScore}${prev ? `  (best ${Math.max(_gameScore, prev.score)})` : ''}`;
    document.getElementById('mg-over-robux').textContent = robuxAwarded > 0
        ? `+${robuxAwarded} 💎 Robux earned!`
        : '';
    document.getElementById('mg-play-over').style.display = '';

    // Quest bumps: any positive score = mini-game win toward quest
    if (_gameScore > 0 && typeof bumpQuests === 'function') {
        const claimed = bumpQuests('minigames', 1);
        if (isDaily) {
            const dc = bumpQuests('daily-game', 1);
            claimed.push.apply(claimed, dc);
        }
        if (claimed.length && typeof showQuestClaimedToasts === 'function') {
            showQuestClaimedToasts(claimed);
        }
    }

    // Check badge progression after a game
    if (typeof checkAndAwardBadges === 'function') {
        const earned = checkAndAwardBadges();
        if (earned && earned.length && typeof showBadgeToasts === 'function') {
            showBadgeToasts(earned);
        }
    }
}

function playMiniGameAgain() {
    if (_activeGameId) launchMiniGame(_activeGameId);
}

function exitMiniGame() {
    if (_gameTimer) { clearInterval(_gameTimer); _gameTimer = null; }
    if (_activeGame && _activeGame.stop) {
        try { _activeGame.stop(); } catch (e) {}
    }
    _activeGame = null;
    _activeGameId = null;
    openMiniGamesHub();
}

// ----------------------------------------------------------------------
// GAME IMPLEMENTATIONS
// Each game = a { start(ctx) -> { stop } } object.
// ctx.area is the DOM container to render into.
// ctx.onScore(delta), ctx.onPenalty(seconds), ctx.onWin() are callbacks.
// ----------------------------------------------------------------------

const GAME_IMPLS = {};

// Difficulty scale helpers. Each game reads its own values via ctx.config.difficulty.
function _diffVal(diff, easy, normal, hard) {
    if (diff === 'easy')   return easy;
    if (diff === 'hard')   return hard;
    return normal;
}

// 1. Number Tap Rush — tap numbers 1-10 in order, randomly placed,
// gently floating. Vibrant per-number colors. Wrong = shake + penalty.
GAME_IMPLS['number-tap-rush'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const maxN = _diffVal(diff, 5, 10, 15);
        const nums = Array.from({length: maxN}, (_, i) => i + 1);
        let next = nums[0];
        const board = document.createElement('div');
        board.className = 'mg-ntr-board';
        const instr = document.createElement('div');
        instr.className = 'mg-ntr-target';
        instr.innerHTML = `<span class="mg-ntr-prefix">Tap</span><span class="mg-ntr-target-num">${next}</span>`;
        ctx.area.appendChild(instr);
        ctx.area.appendChild(board);

        // Place numbers in non-overlapping randomized spots
        const placed = [];
        function pick() {
            for (let tries = 0; tries < 30; tries++) {
                const x = Math.random() * 78 + 5;
                const y = Math.random() * 78 + 5;
                let ok = true;
                for (const p of placed) {
                    if (Math.hypot(x - p.x, y - p.y) < 16) { ok = false; break; }
                }
                if (ok) { placed.push({x,y}); return [x,y]; }
            }
            return [Math.random() * 78 + 5, Math.random() * 78 + 5];
        }
        nums.forEach((n, i) => {
            const [x, y] = pick();
            const btn = document.createElement('button');
            btn.className = 'mg-ntr-num';
            btn.textContent = n;
            btn.style.left = x + '%';
            btn.style.top  = y + '%';
            btn.style.animationDelay = (i * 0.2) + 's';
            // Color by ROYGBIV-ish hue per number
            const hue = (n - 1) * 36;
            btn.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 85%, 70%), hsl(${hue}, 80%, 50%))`;
            btn.style.boxShadow = `0 6px 18px hsla(${hue}, 70%, 50%, 0.55), inset 0 0 0 2px rgba(255,255,255,0.7)`;
            btn.addEventListener('click', (e) => {
                if (btn.classList.contains('done')) return;
                const val = parseInt(btn.textContent, 10);
                if (val === next) {
                    btn.classList.add('done');
                    ctx.onScore(1, { x: e.clientX, y: e.clientY });
                    const idx = nums.indexOf(next);
                    if (idx === nums.length - 1) {
                        instr.innerHTML = '<span class="mg-ntr-prefix">🎉</span><span class="mg-ntr-target-num">DONE!</span>';
                        ctx.onWin();
                        return;
                    }
                    next = nums[idx + 1];
                    instr.querySelector('.mg-ntr-target-num').textContent = next;
                    instr.classList.remove('mg-ntr-bump'); void instr.offsetWidth;
                    instr.classList.add('mg-ntr-bump');
                } else {
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 400);
                    ctx.onPenalty(2, { x: e.clientX, y: e.clientY });
                }
            });
            board.appendChild(btn);
        });
        return { stop() {} };
    }
};

// 2. Bubble Pop Math — colorful, vibrant bubbles with target equation up top.
// Each bubble has its own color. Wrong = pop animation. Background has
// passive ambient bubbles for atmosphere.
GAME_IMPLS['bubble-pop-math'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-bubble-wrap';
        const target = document.createElement('div');
        target.className = 'mg-bubble-target';
        const field = document.createElement('div');
        field.className = 'mg-bubble-field';
        // Ambient background bubbles (purely decorative)
        const ambient = document.createElement('div');
        ambient.className = 'mg-bubble-ambient';
        for (let i = 0; i < 6; i++) {
            const a = document.createElement('span');
            a.className = 'mg-bubble-amb';
            a.style.left = (Math.random() * 100) + '%';
            a.style.animationDelay = (Math.random() * 4) + 's';
            a.style.animationDuration = (8 + Math.random() * 6) + 's';
            ambient.appendChild(a);
        }
        wrap.appendChild(target);
        wrap.appendChild(ambient);
        wrap.appendChild(field);
        ctx.area.appendChild(wrap);

        let currentAns = null;
        const HUES = [10, 45, 110, 180, 220, 270, 320];
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Bubble-pop = SUBTRACTION focused (was duplicate of speed-add).
        // easy: simple a-b. normal: a-b. hard: 3-operand a+b-c.
        const bRange = _diffVal(diff, 5, 9, 12);
        const hard3op = diff === 'hard';

        function nextProblem() {
            let a, b, c, equation;
            if (hard3op && Math.random() < 0.6) {
                // a + b - c on hard
                a = Math.floor(Math.random() * bRange) + 1;
                b = Math.floor(Math.random() * bRange) + 1;
                const cMax = a + b;
                c = Math.floor(Math.random() * Math.min(cMax, 9)) + 1;
                currentAns = a + b - c;
                equation = `<span class="mg-b-op">${a}</span><span class="mg-b-plus">+</span><span class="mg-b-op">${b}</span><span class="mg-b-plus mg-b-minus">−</span><span class="mg-b-op">${c}</span><span class="mg-b-eq">=</span><span class="mg-b-q">?</span>`;
            } else {
                // Subtraction: a - b with a >= b so answer >= 0
                a = Math.floor(Math.random() * bRange) + 3;
                b = Math.floor(Math.random() * a) + 1;
                currentAns = a - b;
                equation = `<span class="mg-b-op">${a}</span><span class="mg-b-plus mg-b-minus">−</span><span class="mg-b-op">${b}</span><span class="mg-b-eq">=</span><span class="mg-b-q">?</span>`;
            }
            target.innerHTML = equation;
            target.classList.remove('mg-b-pulse'); void target.offsetWidth;
            target.classList.add('mg-b-pulse');
            field.innerHTML = '';
            const wrong1 = currentAns + (Math.random() < 0.5 ? 1 : -1);
            const wrong2 = currentAns + (Math.random() < 0.5 ? 2 : -2);
            const all = [currentAns, Math.max(0, wrong1), Math.max(0, wrong2)];
            // Add an extra distractor sometimes for variety
            if (Math.random() < 0.4) all.push(Math.max(0, currentAns + (Math.random() < 0.5 ? 3 : -3)));
            all.sort(() => Math.random() - 0.5);
            all.forEach((n, i) => {
                const b = document.createElement('button');
                b.className = 'mg-bubble';
                b.textContent = n;
                const xPct = 10 + (i + 0.5) * (80 / all.length);
                b.style.left = xPct + '%';
                b.style.animationDuration = (4 + Math.random() * 2) + 's';
                const hue = HUES[Math.floor(Math.random() * HUES.length)];
                b.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 90%, 80%), hsl(${hue}, 75%, 55%))`;
                b.style.boxShadow = `inset 0 0 0 2px rgba(255,255,255,0.5), 0 6px 16px hsla(${hue}, 70%, 50%, 0.4)`;
                b.addEventListener('click', (e) => {
                    if (b.classList.contains('mg-b-done')) return;
                    if (parseInt(b.textContent, 10) === currentAns) {
                        b.classList.add('mg-b-done');
                        ctx.onScore(1, { x: e.clientX, y: e.clientY });
                        setTimeout(nextProblem, 200);
                    } else {
                        b.classList.add('wrong');
                        ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                        setTimeout(() => b.remove(), 400);
                    }
                });
                field.appendChild(b);
            });
        }
        nextProblem();
        return { stop() {} };
    }
};

// 3. Make 10 Match — vibrant gradient cards, per-number color tints,
// pair sparkles when matched and shrinks away. Board refills with new
// pair sets so the puzzle never feels stale.
GAME_IMPLS['make-10-match'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Difficulty scales the target sum + pair count
        // easy: make 10 (5 pairs), normal: make 10 (6 pairs), hard: make 20 (6 pairs)
        const TARGET = diff === 'hard' ? 20 : 10;
        const PAIRS = diff === 'easy' ? 5 : 6;

        const wrap = document.createElement('div');
        wrap.className = 'mg-m10-wrap';
        const header = document.createElement('div');
        header.className = 'mg-m10-header';
        header.textContent = `🎯 Find pairs that make ${TARGET}`;
        const board = document.createElement('div');
        board.className = 'mg-m10-board';
        wrap.appendChild(header);
        wrap.appendChild(board);
        ctx.area.appendChild(wrap);

        let selected = null;

        function genPairs() {
            // Generate fresh pair pool every round so the same set never repeats
            const out = [];
            const seen = new Set();
            while (out.length < PAIRS) {
                const a = 1 + Math.floor(Math.random() * (TARGET - 1));
                const b = TARGET - a;
                const key = Math.min(a, b) + ':' + Math.max(a, b);
                if (seen.has(key) && out.length < PAIRS - 1) continue;
                seen.add(key);
                out.push([a, b]);
            }
            return out;
        }

        function refill() {
            board.innerHTML = '';
            const pairs = genPairs();
            const cards = [];
            pairs.forEach((p) => { cards.push(p[0]); cards.push(p[1]); });
            cards.sort(() => Math.random() - 0.5);
            cards.forEach((n, i) => {
                const c = document.createElement('button');
                c.className = 'mg-m10-card';
                c.dataset.val = n;
                // Each number has a stable color so kids can pattern-match visually
                const hue = (n * 36) % 360;
                c.style.background = `linear-gradient(135deg, hsl(${hue}, 80%, 90%), hsl(${hue}, 70%, 70%))`;
                c.style.borderColor = `hsl(${hue}, 70%, 45%)`;
                c.style.color = `hsl(${hue}, 80%, 25%)`;
                c.style.animationDelay = (i * 0.04) + 's';
                c.innerHTML = `<span class="mg-m10-val">${n}</span>`;
                c.addEventListener('click', (e) => {
                    if (c.classList.contains('done') || c.classList.contains('selected')) return;
                    if (!selected) {
                        selected = c;
                        c.classList.add('selected');
                        return;
                    }
                    const a = parseInt(selected.dataset.val, 10);
                    const b = parseInt(c.dataset.val, 10);
                    if (a + b === TARGET) {
                        selected.classList.add('done');
                        c.classList.add('done');
                        selected.classList.remove('selected');
                        ctx.onScore(1, { x: e.clientX, y: e.clientY });
                        selected = null;
                        if (board.querySelectorAll('.mg-m10-card:not(.done)').length === 0) {
                            setTimeout(refill, 700);
                        }
                    } else {
                        c.classList.add('wrong');
                        selected.classList.add('wrong');
                        ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                        const prevSel = selected;
                        setTimeout(() => {
                            c.classList.remove('wrong', 'selected');
                            prevSel.classList.remove('wrong', 'selected');
                            selected = null;
                        }, 500);
                    }
                });
                board.appendChild(c);
            });
        }
        refill();
        return { stop() {} };
    }
};

// 4. Speed Add — large pulsing equation, big bouncy answer chips.
// Each new problem fades in. Wrong answers shake. Correct = chip flies
// up and burst at the equation.
GAME_IMPLS['speed-add'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-sa-wrap';
        const eq = document.createElement('div');
        eq.className = 'mg-sa-eq';
        const pad = document.createElement('div');
        pad.className = 'mg-sa-pad';
        wrap.appendChild(eq);
        wrap.appendChild(pad);
        ctx.area.appendChild(wrap);

        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const range = _diffVal(diff, 5, 9, 12);
        // speed-add = ADDITION focused. easy 2 addends. normal 2-3. hard 2-4.
        const minOps = 2;
        const maxOps = diff === 'easy' ? 2 : diff === 'normal' ? 3 : 4;
        let answer = 0;
        function next() {
            const k = minOps + Math.floor(Math.random() * (maxOps - minOps + 1));
            const operands = Array.from({ length: k }, () => 1 + Math.floor(Math.random() * range));
            answer = operands.reduce((s, v) => s + v, 0);
            const eqHtml = operands.map((v, i) =>
                (i ? '<span class="mg-sa-op">+</span>' : '') + `<span class="mg-sa-a">${v}</span>`
            ).join('');
            eq.innerHTML = eqHtml + `<span class="mg-sa-eqs">=</span><span class="mg-sa-q">?</span>`;
            eq.classList.remove('mg-sa-bump'); void eq.offsetWidth;
            eq.classList.add('mg-sa-bump');
            pad.innerHTML = '';
            const opts = new Set([answer]);
            while (opts.size < 4) {
                opts.add(Math.max(0, answer + Math.floor(Math.random() * 7) - 3));
            }
            Array.from(opts).sort(() => Math.random() - 0.5).forEach((o, i) => {
                const btn = document.createElement('button');
                btn.className = 'mg-sa-opt';
                btn.textContent = o;
                btn.style.animationDelay = (i * 0.06) + 's';
                // Tint each option a different soft pastel
                const hue = (o * 47) % 360;
                btn.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 88%), hsl(${hue}, 65%, 75%))`;
                btn.style.borderColor = `hsl(${hue}, 60%, 45%)`;
                btn.style.color = `hsl(${hue}, 80%, 25%)`;
                btn.addEventListener('click', (e) => {
                    if (parseInt(btn.textContent, 10) === answer) {
                        btn.classList.add('mg-sa-correct');
                        ctx.onScore(1, { x: e.clientX, y: e.clientY });
                        setTimeout(next, 250);
                    } else {
                        btn.classList.add('wrong');
                        ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                        setTimeout(() => btn.classList.remove('wrong'), 400);
                    }
                });
                pad.appendChild(btn);
            });
        }
        next();
        return { stop() {} };
    }
};

// 5. Memory Numbers — concentration with digit↔word pairs.
// Card backs have a fun pattern; per-number color when revealed.
GAME_IMPLS['memory-numbers'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Mode rotation: each round uses a different pairing concept
        // - 'digit-word': 7 ↔ "seven"
        // - 'sum-result': "3+2" ↔ "5"  (Grade-1 add)
        // - 'tens-frame': "8" ↔ ten-frame with 8 dots
        const modes = ['digit-word', 'sum-result', 'tens-frame'];
        let modeIdx = Math.floor(Math.random() * modes.length);
        // Pair count scales with difficulty: easy 4, normal 6, hard 8
        const pairCount = diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6;

        const root = document.createElement('div');
        root.className = 'mg-mem-root';
        const modeBanner = document.createElement('div');
        modeBanner.className = 'mg-mem-mode';
        const board = document.createElement('div');
        board.className = 'mg-mem-board';
        board.dataset.size = String(pairCount);
        root.appendChild(modeBanner);
        root.appendChild(board);
        ctx.area.appendChild(root);

        const WORDS = ['one','two','three','four','five','six','seven','eight','nine','ten'];

        function tenFrameSvg(n) {
            const cell = 14, gap = 2, w = 5 * cell + 4 * gap, h = 2 * cell + gap;
            const parts = [`<rect x="0" y="0" width="${w}" height="${h}" fill="white" stroke="#1f2937" stroke-width="1.5" rx="2"/>`];
            for (let r = 0; r < 2; r++) {
                for (let c = 0; c < 5; c++) {
                    const idx = r * 5 + c;
                    const x = c * (cell + gap), y = r * (cell + gap);
                    parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="white" stroke="#1f2937" stroke-width="1"/>`);
                    if (idx < n) parts.push(`<circle cx="${x + cell/2}" cy="${y + cell/2}" r="${cell/2 - 2}" fill="#ef4444"/>`);
                }
            }
            return `<svg viewBox="-1 -1 ${w + 2} ${h + 2}" width="${w + 2}" height="${h + 2}">${parts.join('')}</svg>`;
        }

        function buildPairs(mode, count) {
            // Returns array of {kind, val, key, display} where matching kinds key=val
            const out = [];
            if (mode === 'digit-word') {
                for (let i = 1; i <= count; i++) {
                    out.push({ kind: 'digit', key: i, display: String(i) });
                    out.push({ kind: 'word',  key: i, display: WORDS[i-1] });
                }
            } else if (mode === 'sum-result') {
                const used = new Set();
                const pairs = [];
                while (pairs.length < count) {
                    const a = Math.floor(Math.random() * 9) + 1;
                    const b = Math.floor(Math.random() * 9) + 1;
                    const s = a + b;
                    if (s > 18 || used.has(s)) continue;
                    used.add(s);
                    pairs.push({ a, b, s });
                }
                for (const p of pairs) {
                    out.push({ kind: 'sum',   key: p.s, display: `${p.a}+${p.b}` });
                    out.push({ kind: 'val',   key: p.s, display: String(p.s) });
                }
            } else { // tens-frame
                const taken = new Set();
                const nums = [];
                while (nums.length < count) {
                    const n = Math.floor(Math.random() * 10) + 1;
                    if (!taken.has(n)) { taken.add(n); nums.push(n); }
                }
                for (const n of nums) {
                    out.push({ kind: 'frame', key: n, display: tenFrameSvg(n), html: true });
                    out.push({ kind: 'digit', key: n, display: String(n) });
                }
            }
            return out;
        }

        let flipped = [];
        let matched = 0;
        let combo = 0;
        let activePairs = [];

        function setupRound() {
            const mode = modes[modeIdx % modes.length];
            modeBanner.textContent =
                mode === 'digit-word' ? '🔢 Match number to word' :
                mode === 'sum-result' ? '➕ Match sum to total' :
                                        '🎯 Match number to ten-frame';
            const pairs = buildPairs(mode, pairCount);
            pairs.sort(() => Math.random() - 0.5);
            activePairs = pairs;
            flipped = [];
            matched = 0;
            board.innerHTML = '';
            pairs.forEach((p, i) => {
                const c = document.createElement('button');
                c.className = 'mg-mem-card';
                c.dataset.kind = p.kind;
                c.dataset.key = String(p.key);
                const hue = (p.key * 47) % 360;
                c.style.setProperty('--cardHue', hue);
                c.innerHTML =
                    `<span class="face front"><span class="mg-mem-pattern">?</span></span>` +
                    `<span class="face back">${p.display}</span>`;
                c.style.animationDelay = (i * 0.04) + 's';
                c.addEventListener('click', () => {
                    if (c.classList.contains('matched') || c.classList.contains('flipped')) return;
                    if (flipped.length >= 2) return;
                    c.classList.add('flipped');
                    flipped.push(c);
                    if (flipped.length === 2) {
                        const [a, b] = flipped;
                        if (a.dataset.key === b.dataset.key && a.dataset.kind !== b.dataset.kind) {
                            setTimeout(() => {
                                a.classList.add('matched');
                                b.classList.add('matched');
                                const r = a.getBoundingClientRect();
                                const r2 = b.getBoundingClientRect();
                                combo += 1;
                                const pts = combo >= 3 ? 2 : 1;
                                ctx.onScore(pts, { x: (r.x + r2.x) / 2 + 30, y: (r.y + r2.y) / 2 + 30 });
                                flipped = [];
                                matched += 1;
                                if (matched >= pairCount) {
                                    // Round complete — next mode
                                    modeIdx += 1;
                                    setTimeout(setupRound, 800);
                                }
                            }, 300);
                        } else {
                            combo = 0;
                            setTimeout(() => {
                                a.classList.remove('flipped');
                                b.classList.remove('flipped');
                                flipped = [];
                            }, 900);
                        }
                    }
                });
                board.appendChild(c);
            });
        }
        setupRound();
        return { stop() {} };
    }
};

// 6. Falling Numbers — tap numbers matching the active rule before they
// hit the bottom. Rule rotates with a banner pulse. Numbers gently
// rotate as they fall, with per-number color.
GAME_IMPLS['falling-numbers'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-falling-wrap';
        const ruleEl = document.createElement('div');
        ruleEl.className = 'mg-falling-rule';
        const field = document.createElement('div');
        field.className = 'mg-falling-field';
        wrap.appendChild(ruleEl);
        wrap.appendChild(field);
        ctx.area.appendChild(wrap);

        const rules = [
            { label: '🟢 Tap EVEN numbers', test: (n) => n % 2 === 0 },
            { label: '🟠 Tap ODD numbers',  test: (n) => n % 2 === 1 },
            { label: '⬆️  Tap numbers > 5', test: (n) => n > 5 },
            { label: '⬇️  Tap numbers < 5', test: (n) => n < 5 },
            { label: '🎯 Tap multiples of 3', test: (n) => n % 3 === 0 && n > 0 },
        ];
        let rule = rules[Math.floor(Math.random() * rules.length)];
        ruleEl.textContent = rule.label;

        function rotateRule() {
            rule = rules[Math.floor(Math.random() * rules.length)];
            ruleEl.textContent = rule.label;
            ruleEl.classList.remove('mg-rule-pulse'); void ruleEl.offsetWidth;
            ruleEl.classList.add('mg-rule-pulse');
        }
        const ruleTimer = setInterval(rotateRule, 8000);

        function spawn() {
            const n = Math.floor(Math.random() * 10) + 1;
            const el = document.createElement('button');
            el.className = 'mg-falling-num';
            el.textContent = n;
            el.style.left = Math.random() * 80 + 5 + '%';
            const hue = (n * 36) % 360;
            el.style.background = `radial-gradient(circle at 30% 30%, hsl(${hue}, 90%, 75%), hsl(${hue}, 75%, 50%))`;
            el.style.boxShadow = `0 4px 12px hsla(${hue}, 70%, 50%, 0.5), inset 0 0 0 2px rgba(255,255,255,0.6)`;
            const rotDir = Math.random() < 0.5 ? -1 : 1;
            field.appendChild(el);
            const duration = 4500 + Math.random() * 2000;
            const startT = Date.now();
            function step() {
                if (!el.parentNode) return;
                const t = (Date.now() - startT) / duration;
                if (t >= 1) {
                    if (rule.test(n)) ctx.onPenalty(0.5);
                    el.remove();
                    return;
                }
                el.style.top = (t * 88) + '%';
                el.style.transform = `rotate(${rotDir * t * 360}deg)`;
                requestAnimationFrame(step);
            }
            step();
            el.addEventListener('click', (e) => {
                if (el.classList.contains('done')) return;
                el.classList.add('done');
                if (rule.test(n)) {
                    ctx.onScore(1, { x: e.clientX, y: e.clientY });
                } else {
                    ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                }
                setTimeout(() => el.remove(), 300);
            });
        }
        const spawnTimer = setInterval(spawn, 650);

        return {
            stop() {
                clearInterval(ruleTimer);
                clearInterval(spawnTimer);
            }
        };
    }
};

// 7. Shape Sorter — a real SVG shape spawns at top; tap a bucket.
// Bucket fills with a mini shape on each correct match (counter).
GAME_IMPLS['shape-sorter'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Difficulty: pool of shapes + spawn cadence
        // easy: 2 shapes (circle, square)
        // normal: 4 shapes (all basic)
        // hard: 6 shapes (+ pentagon, hexagon) — exposes Hakan to less-common ones
        const POOL = diff === 'easy' ? ['circle','square']
                   : diff === 'hard' ? ['circle','square','triangle','rectangle','pentagon','hexagon']
                   : ['circle','square','triangle','rectangle'];

        const wrap = document.createElement('div');
        wrap.className = 'mg-shape-wrap';
        const header = document.createElement('div');
        header.className = 'mg-shape-header';
        const prompt = document.createElement('div');
        prompt.className = 'mg-shape-prompt';
        prompt.textContent = 'Sort the shape!';
        const comboEl = document.createElement('div');
        comboEl.className = 'mg-shape-combo';
        comboEl.textContent = 'Combo x1';
        header.appendChild(prompt);
        header.appendChild(comboEl);
        const shapesRow = document.createElement('div');
        shapesRow.className = 'mg-shape-shapes';
        const buckets = document.createElement('div');
        buckets.className = 'mg-shape-buckets';
        wrap.appendChild(header);
        wrap.appendChild(shapesRow);
        wrap.appendChild(buckets);
        ctx.area.appendChild(wrap);

        function shapeSvg(kind, size, color) {
            const c = color || '#6c63ff';
            const s = size || 64;
            if (kind === 'circle') {
                return `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="${c}" stroke="#fff" stroke-width="3"/></svg>`;
            }
            if (kind === 'square') {
                return `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="4" fill="${c}" stroke="#fff" stroke-width="3"/></svg>`;
            }
            if (kind === 'triangle') {
                return `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><polygon points="32,8 58,56 6,56" fill="${c}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
            }
            if (kind === 'rectangle') {
                return `<svg width="${s}" height="${s * 0.7}" viewBox="0 0 64 44"><rect x="4" y="6" width="56" height="32" rx="4" fill="${c}" stroke="#fff" stroke-width="3"/></svg>`;
            }
            if (kind === 'pentagon') {
                return `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><polygon points="32,8 58,28 48,58 16,58 6,28" fill="${c}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
            }
            if (kind === 'hexagon') {
                return `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><polygon points="32,8 56,22 56,42 32,56 8,42 8,22" fill="${c}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
            }
            return '';
        }
        const shapeColors = {
            circle:    '#3b82f6',
            square:    '#f59e0b',
            triangle:  '#ef4444',
            rectangle: '#10b981',
            pentagon:  '#8b5cf6',
            hexagon:   '#ec4899',
        };

        const counts = {};
        POOL.forEach((s) => counts[s] = 0);
        let active = null;
        let combo = 0;

        // Randomized non-repeating spawn so Hakan can't memorize sequence
        let lastKind = null;
        function spawn() {
            let kind;
            for (let tries = 0; tries < 5; tries++) {
                kind = POOL[Math.floor(Math.random() * POOL.length)];
                if (kind !== lastKind) break;
            }
            lastKind = kind;
            active = { kind };
            shapesRow.innerHTML = `<div class="mg-shape-piece mg-shape-piece-spawn" data-kind="${kind}">${shapeSvg(kind, 80, shapeColors[kind])}</div>`;
        }

        function updateCombo() {
            const mult = 1 + Math.floor(combo / 3);
            comboEl.textContent = combo > 0 ? `🔥 Combo ${combo} · x${mult}` : 'Combo x1';
            if (combo > 0 && combo % 3 === 0) {
                comboEl.classList.remove('mg-shape-combo-bump');
                void comboEl.offsetWidth;
                comboEl.classList.add('mg-shape-combo-bump');
            }
        }

        // Render buckets
        POOL.forEach((s) => {
            const b = document.createElement('button');
            b.className = 'mg-shape-bucket';
            b.dataset.kind = s;
            b.innerHTML = `
                <span class="mg-shape-bucket-svg">${shapeSvg(s, 38, shapeColors[s])}</span>
                <span class="mg-shape-bucket-label">${s}</span>
                <span class="mg-shape-bucket-count" data-c="${s}">0</span>`;
            b.addEventListener('click', (e) => {
                if (!active) return;
                if (active.kind === s) {
                    counts[s] += 1;
                    const cntEl = b.querySelector('.mg-shape-bucket-count');
                    if (cntEl) cntEl.textContent = counts[s];
                    b.classList.remove('right'); void b.offsetWidth;
                    b.classList.add('right');
                    combo += 1;
                    const mult = 1 + Math.floor(combo / 3);
                    ctx.onScore(mult, { x: e.clientX, y: e.clientY });
                    updateCombo();
                    // Bucket-tipover celebration when bucket reaches 5
                    if (counts[s] === 5) {
                        b.classList.add('mg-shape-bucket-tip');
                        setTimeout(() => b.classList.remove('mg-shape-bucket-tip'), 800);
                    }
                    active = null;
                    shapesRow.innerHTML = '';
                    setTimeout(spawn, 250);
                } else {
                    b.classList.add('wrong');
                    setTimeout(() => b.classList.remove('wrong'), 400);
                    combo = 0;
                    updateCombo();
                    ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                }
            });
            buckets.appendChild(b);
        });
        spawn();
        return { stop() {} };
    }
};

// 8. Counting Race — items pop in one at a time with a tiny stagger.
// Difficulty-scaled max count + per-question speed timer.
// easy: 1-5 items, 7s timer. normal: 1-12 items, 5s. hard: 1-20 items, 3.5s.
GAME_IMPLS['counting-race'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const maxN  = diff === 'easy' ? 5  : diff === 'hard' ? 20 : 12;
        const padN  = diff === 'easy' ? 6  : diff === 'hard' ? 20 : 12;
        const timeBudget = diff === 'easy' ? 7000 : diff === 'hard' ? 3500 : 5000;

        const wrap = document.createElement('div');
        wrap.className = 'mg-count-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-count-prompt';
        prompt.textContent = 'How many?';
        const timerBar = document.createElement('div');
        timerBar.className = 'mg-count-timerbar';
        const timerFill = document.createElement('div');
        timerFill.className = 'mg-count-timerfill';
        timerBar.appendChild(timerFill);
        const items = document.createElement('div');
        items.className = 'mg-count-items';
        const pad = document.createElement('div');
        pad.className = 'mg-count-pad';
        const combo = document.createElement('div');
        combo.className = 'mg-count-combo';
        combo.textContent = '';
        wrap.appendChild(prompt);
        wrap.appendChild(timerBar);
        wrap.appendChild(items);
        wrap.appendChild(pad);
        wrap.appendChild(combo);
        ctx.area.appendChild(wrap);

        const emojis = ['⭐','🍎','🐠','🐝','🍪','🦋','🚗','🎈','🌸','🐢','🪁','🍓','🐞','🌻','🪐'];
        let correct = 0;
        let lastN = 0, lastEmoji = '';
        let timerId = null;
        let timerStart = 0;
        let streak = 0;

        function killTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
        function startTimer() {
            killTimer();
            timerStart = Date.now();
            timerFill.style.transition = 'none';
            timerFill.style.width = '100%';
            timerFill.style.background = 'linear-gradient(90deg, #34d399, #10b981)';
            void timerFill.offsetWidth;
            timerFill.style.transition = `width ${timeBudget}ms linear, background ${timeBudget}ms linear`;
            timerFill.style.width = '0%';
            timerFill.style.background = 'linear-gradient(90deg, #ef4444, #b91c1c)';
            timerId = setInterval(() => {
                if (Date.now() - timerStart >= timeBudget) {
                    killTimer();
                    // Time's up — count as wrong
                    streak = 0;
                    combo.textContent = '⏱️ Too slow!';
                    ctx.onPenalty(1, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    setTimeout(nextRound, 700);
                }
            }, 100);
        }

        function nextRound() {
            // Don't repeat the same count + emoji combo back-to-back
            let n, e, tries = 0;
            do {
                n = Math.floor(Math.random() * maxN) + 1;
                e = emojis[Math.floor(Math.random() * emojis.length)];
            } while ((n === lastN && e === lastEmoji) && tries++ < 5);
            lastN = n; lastEmoji = e;
            correct = n;

            items.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const s = document.createElement('span');
                s.className = 'mg-count-item';
                s.textContent = e;
                s.style.animationDelay = (i * 0.04) + 's';
                items.appendChild(s);
            }
            pad.innerHTML = '';
            for (let d = 1; d <= padN; d++) {
                const b = document.createElement('button');
                b.className = 'mg-count-digit';
                b.textContent = d;
                const hue = (d * 36) % 360;
                b.style.background = `linear-gradient(135deg, hsl(${hue}, 80%, 88%), hsl(${hue}, 70%, 75%))`;
                b.style.borderColor = `hsl(${hue}, 60%, 45%)`;
                b.style.color = `hsl(${hue}, 80%, 25%)`;
                b.addEventListener('click', (ev) => {
                    if (parseInt(b.textContent, 10) === correct) {
                        killTimer();
                        b.classList.add('right');
                        streak += 1;
                        // Speed bonus: more points if answered in first half
                        const elapsed = Date.now() - timerStart;
                        const fast = elapsed < timeBudget / 2;
                        const pts = fast ? 2 : 1;
                        if (streak >= 3) combo.textContent = `🔥 ${streak} in a row!`;
                        else if (fast) combo.textContent = '⚡ Fast! +2';
                        else combo.textContent = '';
                        ctx.onScore(pts, { x: ev.clientX, y: ev.clientY });
                        setTimeout(nextRound, 280);
                    } else {
                        b.classList.add('wrong');
                        streak = 0;
                        combo.textContent = '';
                        ctx.onPenalty(1, { x: ev.clientX, y: ev.clientY });
                        setTimeout(() => b.classList.remove('wrong'), 400);
                    }
                });
                pad.appendChild(b);
            }
            startTimer();
        }
        nextRound();
        return { stop() { killTimer(); } };
    }
};

// 9. Tic Tac Toe — classic 3x3, Hakan as X, computer as O.
// Difficulty is a smartness factor (0..1) that controls how often the AI
// plays optimally vs. randomly. Each round (win/loss/draw) resets the board.
// 10. Math Maze — cross 6 stepping stones by answering each one.
// Wrong answer = step back one. Reach the end = +1 score, new maze.
GAME_IMPLS['math-maze'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const stoneCount = 6;
        const range = _diffVal(diff, 5, 9, 12);
        const wrap = document.createElement('div');
        wrap.className = 'mg-maze-wrap';
        const status = document.createElement('div');
        status.className = 'mg-maze-status';
        const trail = document.createElement('div');
        trail.className = 'mg-maze-trail';
        const probArea = document.createElement('div');
        probArea.className = 'mg-maze-prob';
        wrap.appendChild(status);
        wrap.appendChild(trail);
        wrap.appendChild(probArea);
        ctx.area.appendChild(wrap);

        let stones = [];
        let pos = 0;

        function buildMaze() {
            stones = [];
            for (let i = 0; i < stoneCount; i++) {
                const a = Math.floor(Math.random() * range) + 1;
                const b = Math.floor(Math.random() * range) + 1;
                stones.push({ a, b, answer: a + b });
            }
            pos = 0;
            renderTrail();
            renderProblem();
        }

        function renderTrail() {
            trail.innerHTML = '';
            for (let i = 0; i < stoneCount; i++) {
                const stone = document.createElement('div');
                stone.className = 'mg-maze-stone';
                if (i < pos) stone.classList.add('mg-maze-stone-done');
                if (i === pos) stone.classList.add('mg-maze-stone-here');
                stone.innerHTML = i === pos ? '🟢' : (i < pos ? '✓' : '');
                trail.appendChild(stone);
                if (i < stoneCount - 1) {
                    const arrow = document.createElement('div');
                    arrow.className = 'mg-maze-arrow';
                    arrow.textContent = '→';
                    trail.appendChild(arrow);
                }
            }
        }

        function renderProblem() {
            if (pos >= stoneCount) {
                status.textContent = '🎉 You crossed the maze!';
                probArea.innerHTML = '';
                return;
            }
            const s = stones[pos];
            status.textContent = `Stone ${pos + 1} of ${stoneCount} — solve to step forward!`;
            // Generate 3 options
            const opts = new Set([s.answer]);
            while (opts.size < 3) {
                opts.add(Math.max(0, s.answer + Math.floor(Math.random() * 5) - 2));
            }
            const arr = Array.from(opts).sort(() => Math.random() - 0.5);
            probArea.innerHTML =
                `<div class="mg-maze-eq"><span class="mg-maze-num">${s.a}</span><span class="mg-maze-op">+</span><span class="mg-maze-num">${s.b}</span><span class="mg-maze-op">=</span><span class="mg-maze-q">?</span></div>` +
                `<div class="mg-maze-opts">${arr.map((o) => `<button class="mg-maze-opt" data-v="${o}">${o}</button>`).join('')}</div>`;
            probArea.querySelectorAll('.mg-maze-opt').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const v = parseInt(btn.getAttribute('data-v'), 10);
                    if (v === s.answer) {
                        btn.classList.add('mg-maze-opt-right');
                        pos += 1;
                        setTimeout(() => {
                            if (pos >= stoneCount) {
                                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                                setTimeout(buildMaze, 500);
                            } else {
                                renderTrail();
                                renderProblem();
                            }
                        }, 300);
                    } else {
                        btn.classList.add('mg-maze-opt-wrong');
                        ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                        if (pos > 0) pos -= 1;
                        setTimeout(() => {
                            renderTrail();
                            renderProblem();
                        }, 500);
                    }
                });
            });
        }
        buildMaze();
        return { stop() {} };
    }
};

// 11. Math Snake — classic snake on a 10x10 grid. Math problem at the top.
// Multiple numbered food items on the grid; eat the correct answer to grow.
// Wrong food = no growth + penalty. Wall = reset position + penalty.
GAME_IMPLS['math-snake'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const tickMs = _diffVal(diff, 300, 220, 170);
        const W = 10, H = 10;

        const wrap = document.createElement('div');
        wrap.className = 'mg-snake-wrap';
        const probEl = document.createElement('div');
        probEl.className = 'mg-snake-prob';
        const boardEl = document.createElement('div');
        boardEl.className = 'mg-snake-board';
        boardEl.style.setProperty('--snake-w', W);
        boardEl.style.setProperty('--snake-h', H);
        const ctrlsEl = document.createElement('div');
        ctrlsEl.className = 'mg-snake-ctrls';
        ctrlsEl.innerHTML =
            '<button class="mg-snake-btn" data-dir="up">⬆️</button>' +
            '<div class="mg-snake-row">' +
              '<button class="mg-snake-btn" data-dir="left">⬅️</button>' +
              '<button class="mg-snake-btn" data-dir="down">⬇️</button>' +
              '<button class="mg-snake-btn" data-dir="right">➡️</button>' +
            '</div>';
        wrap.appendChild(probEl);
        wrap.appendChild(boardEl);
        wrap.appendChild(ctrlsEl);
        ctx.area.appendChild(wrap);

        // State
        let snake = [{x:3,y:5},{x:2,y:5},{x:1,y:5}];
        let dir = 'right';
        let nextDir = 'right';
        let foods = [];   // {x, y, val}
        let target = 0;   // current math target
        let problem = null;
        let alive = true;

        function nextProblem() {
            const a = Math.floor(Math.random() * 9) + 1;
            const b = Math.floor(Math.random() * 9) + 1;
            target = a + b;
            problem = { a, b, target };
            probEl.innerHTML =
                `<span class="mg-snake-eq">${a} + ${b} = ?</span>` +
                `<span class="mg-snake-hint">Eat ${target}!</span>`;
            spawnFoods();
        }

        function isOccupied(x, y) {
            for (const s of snake) if (s.x === x && s.y === y) return true;
            for (const f of foods) if (f.x === x && f.y === y) return true;
            return false;
        }
        function randomFreeCell() {
            for (let tries = 0; tries < 50; tries++) {
                const x = Math.floor(Math.random() * W);
                const y = Math.floor(Math.random() * H);
                if (!isOccupied(x, y)) return { x, y };
            }
            return null;
        }
        function spawnFoods() {
            foods = [];
            // 1 correct + 2 wrong nearby numbers
            const correctPos = randomFreeCell();
            if (correctPos) foods.push({ ...correctPos, val: target, correct: true });
            const wrongs = new Set();
            while (wrongs.size < 2) {
                const w = Math.max(0, target + Math.floor(Math.random() * 5) - 2);
                if (w !== target) wrongs.add(w);
            }
            for (const w of wrongs) {
                const c = randomFreeCell();
                if (c) foods.push({ ...c, val: w, correct: false });
            }
        }

        function draw() {
            const cells = new Array(W * H).fill('');
            // snake body
            snake.forEach((s, i) => {
                cells[s.y * W + s.x] = i === 0 ? 'head' : 'body';
            });
            let html = '';
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const food = foods.find((f) => f.x === x && f.y === y);
                    const c = cells[y * W + x];
                    if (food) {
                        html += `<div class="mg-snake-cell mg-snake-food"><span>${food.val}</span></div>`;
                    } else if (c === 'head') {
                        html += `<div class="mg-snake-cell mg-snake-head"></div>`;
                    } else if (c === 'body') {
                        html += `<div class="mg-snake-cell mg-snake-body"></div>`;
                    } else {
                        html += `<div class="mg-snake-cell"></div>`;
                    }
                }
            }
            boardEl.innerHTML = html;
        }

        function step() {
            if (!alive || _gamePaused) return;
            dir = nextDir;
            const head = snake[0];
            const nx = head.x + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
            const ny = head.y + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
            // Wall collision = reset position + penalty
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) {
                ctx.onPenalty(2);
                snake = [{x:5,y:5},{x:4,y:5},{x:3,y:5}];
                dir = 'right';
                nextDir = 'right';
                draw();
                return;
            }
            // Self-collision
            const selfHit = snake.some((s) => s.x === nx && s.y === ny);
            if (selfHit) {
                ctx.onPenalty(2);
                snake = [{x:5,y:5},{x:4,y:5},{x:3,y:5}];
                dir = 'right';
                nextDir = 'right';
                draw();
                return;
            }
            // Move
            snake.unshift({ x: nx, y: ny });
            // Food check
            const foodIdx = foods.findIndex((f) => f.x === nx && f.y === ny);
            let grow = false;
            if (foodIdx >= 0) {
                const f = foods[foodIdx];
                if (f.correct) {
                    ctx.onScore(1);
                    grow = true;
                    nextProblem();   // new problem + foods
                } else {
                    ctx.onPenalty(1);
                    foods.splice(foodIdx, 1);
                }
            }
            if (!grow) snake.pop();
            draw();
        }

        ctrlsEl.querySelectorAll('.mg-snake-btn').forEach((b) => {
            b.addEventListener('click', () => {
                const d = b.getAttribute('data-dir');
                // Can't reverse direction immediately
                if (d === 'up' && dir === 'down') return;
                if (d === 'down' && dir === 'up') return;
                if (d === 'left' && dir === 'right') return;
                if (d === 'right' && dir === 'left') return;
                nextDir = d;
            });
        });

        // Swipe support
        let touchX = null, touchY = null;
        boardEl.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            touchX = t.clientX; touchY = t.clientY;
        });
        boardEl.addEventListener('touchend', (e) => {
            if (touchX == null) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - touchX, dy = t.clientY - touchY;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
            let d;
            if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? 'right' : 'left';
            else d = dy > 0 ? 'down' : 'up';
            if (d === 'up' && dir === 'down') return;
            if (d === 'down' && dir === 'up') return;
            if (d === 'left' && dir === 'right') return;
            if (d === 'right' && dir === 'left') return;
            nextDir = d;
            touchX = null;
        });

        nextProblem();
        draw();
        const tickTimer = setInterval(step, tickMs);

        return { stop() { alive = false; clearInterval(tickTimer); } };
    }
};

// 12. Math Battle — turn-based duel against a monster. Solve math = attack.
// Wrong = monster hits you back. First to 0 HP loses; if Hakan defeats it,
// a stronger monster spawns. Each defeat = +1 score.
GAME_IMPLS['math-battle'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const range = _diffVal(diff, 6, 10, 15);
        const MONSTERS = ['👹','👺','🦂','🐲','👽','🧌','🦖','🐉'];
        let monsterIdx = 0;
        let playerHP = 5, playerMaxHP = 5;
        let monsterHP = 4, monsterMaxHP = 4;
        let currentAns = 0;

        const wrap = document.createElement('div');
        wrap.className = 'mg-battle-wrap';
        const arena = document.createElement('div');
        arena.className = 'mg-battle-arena';
        arena.innerHTML = `
            <div class="mg-battle-side mg-battle-hero">
                <div class="mg-battle-avatar">🧑‍🎓</div>
                <div class="mg-battle-name">Hakan</div>
                <div class="mg-battle-hp"><div class="mg-battle-hp-fill mg-battle-hp-hero" id="mg-battle-hp-hero"></div></div>
                <div class="mg-battle-hp-text" id="mg-battle-hp-hero-text">5/5</div>
            </div>
            <div class="mg-battle-vs">VS</div>
            <div class="mg-battle-side mg-battle-monster">
                <div class="mg-battle-avatar" id="mg-battle-monster-emoji">${MONSTERS[0]}</div>
                <div class="mg-battle-name" id="mg-battle-monster-name">Math Goblin</div>
                <div class="mg-battle-hp"><div class="mg-battle-hp-fill mg-battle-hp-monster" id="mg-battle-hp-mon"></div></div>
                <div class="mg-battle-hp-text" id="mg-battle-hp-mon-text">4/4</div>
            </div>
        `;
        const prob = document.createElement('div');
        prob.className = 'mg-battle-prob';
        const opts = document.createElement('div');
        opts.className = 'mg-battle-opts';
        const log = document.createElement('div');
        log.className = 'mg-battle-log';
        wrap.appendChild(arena);
        wrap.appendChild(prob);
        wrap.appendChild(opts);
        wrap.appendChild(log);
        ctx.area.appendChild(wrap);

        function setHP() {
            document.getElementById('mg-battle-hp-hero').style.width = (playerHP/playerMaxHP*100) + '%';
            document.getElementById('mg-battle-hp-mon').style.width = (monsterHP/monsterMaxHP*100) + '%';
            document.getElementById('mg-battle-hp-hero-text').textContent = playerHP + '/' + playerMaxHP;
            document.getElementById('mg-battle-hp-mon-text').textContent = monsterHP + '/' + monsterMaxHP;
        }

        function spawnMonster() {
            monsterIdx = (monsterIdx + 1) % MONSTERS.length;
            monsterMaxHP = 4 + Math.floor(monsterIdx / 2);
            monsterHP = monsterMaxHP;
            playerHP = playerMaxHP;
            document.getElementById('mg-battle-monster-emoji').textContent = MONSTERS[monsterIdx];
            document.getElementById('mg-battle-monster-name').textContent = 'Monster Lv ' + (monsterIdx + 1);
            setHP();
            log.textContent = "A new monster appears! Solve math to attack!";
        }

        function nextProblem() {
            const isAdd = Math.random() < 0.7;
            let a, b, ans;
            if (isAdd) {
                a = Math.floor(Math.random() * range) + 1;
                b = Math.floor(Math.random() * range) + 1;
                ans = a + b;
                prob.innerHTML = `<span class="mg-battle-eq">${a} + ${b} = ?</span>`;
            } else {
                a = Math.floor(Math.random() * range) + 5;
                b = Math.floor(Math.random() * Math.min(a, range)) + 1;
                ans = a - b;
                prob.innerHTML = `<span class="mg-battle-eq">${a} − ${b} = ?</span>`;
            }
            currentAns = ans;
            const set = new Set([ans]);
            while (set.size < 3) set.add(Math.max(0, ans + Math.floor(Math.random() * 5) - 2));
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((o) => `<button class="mg-battle-opt">${o}</button>`).join('');
            opts.querySelectorAll('.mg-battle-opt').forEach((b, i) => {
                b.addEventListener('click', (ev) => onAnswer(parseInt(b.textContent, 10), b, ev));
            });
        }

        function onAnswer(val, btnEl, ev) {
            if (val === currentAns) {
                monsterHP -= 1;
                btnEl.classList.add('mg-battle-correct');
                if (monsterHP <= 0) {
                    ctx.onScore(1, { x: ev.clientX, y: ev.clientY });
                    log.textContent = "🎉 Monster defeated! Next one...";
                    setHP();
                    setTimeout(() => { spawnMonster(); nextProblem(); }, 900);
                    return;
                }
                log.textContent = "💥 Hakan attacks! Monster HP: " + monsterHP;
                setHP();
                setTimeout(nextProblem, 600);
            } else {
                playerHP -= 1;
                btnEl.classList.add('mg-battle-wrong');
                if (playerHP <= 0) {
                    ctx.onPenalty(3, { x: ev.clientX, y: ev.clientY });
                    log.textContent = "Oof! Reset...";
                    playerHP = playerMaxHP;
                    setHP();
                    setTimeout(nextProblem, 800);
                    return;
                }
                ctx.onPenalty(1, { x: ev.clientX, y: ev.clientY });
                log.textContent = "Ouch! Monster hits back. HP: " + playerHP;
                setHP();
                setTimeout(nextProblem, 600);
            }
        }

        setHP();
        nextProblem();
        return { stop() {} };
    }
};

// 13. Clock Quiz — analog clock face, pick the right time string.
GAME_IMPLS['clock-quiz'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Easy: o'clock + half-past only (1-12 hours)
        // Normal: + quarter past / quarter to
        // Hard: any minute multiple of 5
        const wrap = document.createElement('div');
        wrap.className = 'mg-clock-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-clock-prompt';
        prompt.textContent = '🕐 Read the clock!';
        const face = document.createElement('div');
        face.className = 'mg-clock-face';
        const opts = document.createElement('div');
        opts.className = 'mg-clock-opts';
        const combo = document.createElement('div');
        combo.className = 'mg-clock-combo';
        combo.textContent = '';
        wrap.appendChild(prompt);
        wrap.appendChild(face);
        wrap.appendChild(opts);
        wrap.appendChild(combo);
        ctx.area.appendChild(wrap);

        let streak = 0;

        function pickMinute() {
            if (diff === 'easy')   return Math.random() < 0.5 ? 0 : 30;
            if (diff === 'normal') return [0, 15, 30, 45][Math.floor(Math.random() * 4)];
            // hard: every 5 minutes
            return Math.floor(Math.random() * 12) * 5;
        }

        function timeLabel(h, m) {
            if (m === 0)  return h + ":00";
            if (m === 30) return h + ":30";
            return h + ":" + String(m).padStart(2, '0');
        }
        function wordLabel(h, m) {
            if (m === 0)  return h + " o'clock";
            if (m === 15) return "quarter past " + h;
            if (m === 30) return "half past " + h;
            if (m === 45) {
                const next = h === 12 ? 1 : h + 1;
                return "quarter to " + next;
            }
            return timeLabel(h, m);
        }

        function nextProblem() {
            const h = Math.floor(Math.random() * 12) + 1;
            const m = pickMinute();
            const showWords = diff !== 'hard' && Math.random() < 0.5;
            const correct = showWords ? wordLabel(h, m) : timeLabel(h, m);

            // Build wrong options that are plausible
            const wrongs = new Set();
            let tries = 0;
            while (wrongs.size < 3 && tries++ < 30) {
                const wh = Math.floor(Math.random() * 12) + 1;
                const wm = pickMinute();
                const wlabel = showWords ? wordLabel(wh, wm) : timeLabel(wh, wm);
                if (wlabel !== correct) wrongs.add(wlabel);
            }
            // Render clock with the minute hand visible
            if (typeof renderClock === 'function') {
                face.innerHTML = renderClock(h, m);
            } else {
                face.innerHTML = '<div class="mg-clock-fallback">' + timeLabel(h, m) + '</div>';
            }
            const arr = [correct, ...Array.from(wrongs)].sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((o) =>
                `<button class="mg-clock-opt" data-correct="${o === correct ? '1' : '0'}">${o}</button>`
            ).join('');
            opts.querySelectorAll('.mg-clock-opt').forEach((b) => {
                b.addEventListener('click', (e) => {
                    if (b.getAttribute('data-correct') === '1') {
                        b.classList.add('mg-clock-right');
                        streak += 1;
                        // Combo multiplier: +1 base, +1 bonus every 3 in a row
                        const bonus = Math.floor(streak / 3);
                        const pts = 1 + bonus;
                        ctx.onScore(pts, { x: e.clientX, y: e.clientY });
                        if (streak >= 3) {
                            combo.textContent = `🔥 ${streak} streak! +${bonus} bonus`;
                            combo.classList.add('mg-clock-combo-pulse');
                            setTimeout(() => combo.classList.remove('mg-clock-combo-pulse'), 400);
                        }
                        setTimeout(nextProblem, 380);
                    } else {
                        b.classList.add('mg-clock-wrong');
                        streak = 0;
                        combo.textContent = '';
                        ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                        setTimeout(() => b.classList.remove('mg-clock-wrong'), 400);
                    }
                });
            });
        }
        nextProblem();
        return { stop() {} };
    }
};

// 14. Coin Counter — coins shown, pick the total cents from options.
GAME_IMPLS['coin-counter'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Difficulty-scaled coin pools:
        // easy: pennies + nickels only (low cap)
        // normal: + dimes (medium cap)
        // hard: all 4 coin types, larger range
        const COIN_TYPES_ALL = [
            { name: 'penny',   value: 1,  emoji: '🟤', cls: 'mg-coin-penny' },
            { name: 'nickel',  value: 5,  emoji: '⚪', cls: 'mg-coin-nickel' },
            { name: 'dime',    value: 10, emoji: '🪙', cls: 'mg-coin-dime' },
            { name: 'quarter', value: 25, emoji: '🟡', cls: 'mg-coin-quarter' },
        ];
        const POOL = diff === 'easy'   ? COIN_TYPES_ALL.slice(0, 2)
                   : diff === 'normal' ? COIN_TYPES_ALL.slice(0, 3)
                                       : COIN_TYPES_ALL;
        const MAX_TOTAL = diff === 'easy' ? 20 : diff === 'hard' ? 100 : 50;
        const MIN_COINS = diff === 'easy' ? 2 : 3;
        const MAX_COINS = diff === 'easy' ? 5 : diff === 'hard' ? 8 : 6;

        const wrap = document.createElement('div');
        wrap.className = 'mg-coin-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-coin-prompt';
        prompt.textContent = 'How many cents in total?';
        const groupsWrap = document.createElement('div');
        groupsWrap.className = 'mg-coin-groups';
        const opts = document.createElement('div');
        opts.className = 'mg-coin-opts';
        const feedback = document.createElement('div');
        feedback.className = 'mg-coin-feedback';
        wrap.appendChild(prompt);
        wrap.appendChild(groupsWrap);
        wrap.appendChild(opts);
        wrap.appendChild(feedback);
        ctx.area.appendChild(wrap);

        let streak = 0;

        function nextProblem() {
            // Generate 3-MAX coins from pool
            const n = MIN_COINS + Math.floor(Math.random() * (MAX_COINS - MIN_COINS + 1));
            const used = [];
            let total = 0;
            for (let i = 0; i < n; i++) {
                const c = POOL[Math.floor(Math.random() * POOL.length)];
                if (total + c.value > MAX_TOTAL) {
                    // pick a smaller coin instead
                    const cheap = POOL[0];
                    if (total + cheap.value <= MAX_TOTAL) {
                        used.push(cheap); total += cheap.value;
                    }
                    continue;
                }
                used.push(c); total += c.value;
            }
            if (total === 0) { used.push(POOL[0]); total = POOL[0].value; }

            // Group coins by type so Hakan sees them in stacks (skip-counting affordance)
            const grouped = {};
            for (const c of used) {
                grouped[c.value] = grouped[c.value] || { coin: c, count: 0 };
                grouped[c.value].count += 1;
            }
            const sortedGroups = Object.values(grouped).sort((a, b) => b.coin.value - a.coin.value);
            groupsWrap.innerHTML = sortedGroups.map((g) => {
                const coinBits = [];
                for (let i = 0; i < g.count; i++) {
                    coinBits.push(`<span class="mg-coin ${g.coin.cls}" title="${g.coin.name}">${g.coin.emoji}<span class="mg-coin-val">${g.coin.value}¢</span></span>`);
                }
                const subtotal = g.coin.value * g.count;
                return `<div class="mg-coin-group">
                    <div class="mg-coin-group-row">${coinBits.join('')}</div>
                    <div class="mg-coin-group-sub">${g.count} × ${g.coin.value}¢ = ${subtotal}¢</div>
                </div>`;
            }).join('');

            // Options: total + 3 distractors (different magnitudes)
            const set = new Set([total]);
            const deltas = diff === 'hard'
                ? [-15, -10, -5, 5, 10, 15, 20, 25]
                : [-10, -5, 5, 10, 15];
            while (set.size < 4) {
                const d = deltas[Math.floor(Math.random() * deltas.length)];
                const v = Math.max(1, total + d);
                set.add(v);
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-coin-opt" data-correct="${v === total ? '1' : '0'}" data-val="${v}">${v}¢</button>`
            ).join('');
            feedback.textContent = '';
            opts.querySelectorAll('.mg-coin-opt').forEach((b) => {
                b.addEventListener('click', (e) => {
                    if (b.getAttribute('data-correct') === '1') {
                        b.classList.add('mg-coin-right');
                        streak += 1;
                        const pts = streak >= 3 ? 2 : 1;
                        ctx.onScore(pts, { x: e.clientX, y: e.clientY });
                        feedback.textContent = streak >= 3 ? `🔥 ${streak} streak! +${pts}` : '';
                        setTimeout(nextProblem, 400);
                    } else {
                        b.classList.add('mg-coin-wrong');
                        streak = 0;
                        const v = parseInt(b.getAttribute('data-val'), 10);
                        const diff_abs = Math.abs(v - total);
                        feedback.textContent = diff_abs <= 10
                            ? `So close! Off by ${diff_abs}¢.`
                            : `Try again — count the groups!`;
                        ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                        setTimeout(() => b.classList.remove('mg-coin-wrong'), 400);
                    }
                });
            });
        }
        nextProblem();
        return { stop() {} };
    }
};

// 15. Place Value Builder — target number, tap tens-bars and ones-blocks.
GAME_IMPLS['place-value-builder'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // easy: 10-29 (mostly small tens, easy to build)
        // normal: 11-89
        // hard: 11-99 + auto-check (no Check button — must be exact)
        const range = diff === 'easy' ? [10, 29]
                    : diff === 'hard' ? [11, 99]
                    : [11, 89];
        const autoCheck = diff === 'hard';

        const wrap = document.createElement('div');
        wrap.className = 'mg-pv-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-pv-prompt';
        const built = document.createElement('div');
        built.className = 'mg-pv-built';
        const pad = document.createElement('div');
        pad.className = 'mg-pv-pad';
        const removeRow = document.createElement('div');
        removeRow.className = 'mg-pv-remove-row';
        pad.innerHTML = `
            <button class="mg-pv-btn mg-pv-tens" data-add="10"><span>+10</span><span class="mg-pv-block-bar"></span></button>
            <button class="mg-pv-btn mg-pv-ones" data-add="1"><span>+1</span><span class="mg-pv-block-dot"></span></button>
            <button class="mg-pv-btn mg-pv-clear">↺ Clear</button>
            ${autoCheck ? '' : '<button class="mg-pv-btn mg-pv-check">Check ✓</button>'}
        `;
        removeRow.innerHTML = `
            <button class="mg-pv-rem mg-pv-rem-tens">− Ten</button>
            <button class="mg-pv-rem mg-pv-rem-ones">− One</button>
        `;
        const hint = document.createElement('div');
        hint.className = 'mg-pv-hint';

        wrap.appendChild(prompt);
        wrap.appendChild(built);
        wrap.appendChild(pad);
        wrap.appendChild(removeRow);
        wrap.appendChild(hint);
        ctx.area.appendChild(wrap);

        let target = 0;
        let current = 0;
        let tens = 0, ones = 0;
        let streak = 0;

        function render() {
            built.innerHTML = `
                <div class="mg-pv-stack mg-pv-stack-tens">${'<span class="mg-pv-bar"></span>'.repeat(tens)}</div>
                <div class="mg-pv-stack mg-pv-stack-ones">${'<span class="mg-pv-dot"></span>'.repeat(ones)}</div>
                <div class="mg-pv-current">Built: <b>${current}</b> ${current === target ? '✅' : current > target ? '😬 too big' : ''}</div>
            `;
            // Update hint
            const diffNeeded = target - current;
            if (diffNeeded > 0) {
                const t = Math.floor(diffNeeded / 10);
                const o = diffNeeded % 10;
                hint.textContent = `Need ${diffNeeded} more (${t} ten${t!==1?'s':''} + ${o} one${o!==1?'s':''})`;
            } else if (diffNeeded < 0) {
                hint.textContent = `Too many! Remove some.`;
            } else {
                hint.textContent = `Perfect! ✨`;
            }
            // Auto-check on hard
            if (autoCheck && current === target) {
                streak += 1;
                ctx.onScore(streak >= 3 ? 2 : 1);
                setTimeout(nextProblem, 600);
            }
        }

        function nextProblem() {
            target = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
            tens = 0; ones = 0; current = 0;
            const targetT = Math.floor(target / 10), targetO = target % 10;
            prompt.innerHTML = `Build <span class="mg-pv-target">${target}</span> with tens & ones!`;
            render();
        }

        pad.querySelector('.mg-pv-tens').addEventListener('click', () => {
            if (tens < 9) { tens += 1; current = tens * 10 + ones; render(); }
        });
        pad.querySelector('.mg-pv-ones').addEventListener('click', () => {
            if (ones < 9) { ones += 1; current = tens * 10 + ones; render(); }
        });
        removeRow.querySelector('.mg-pv-rem-tens').addEventListener('click', () => {
            if (tens > 0) { tens -= 1; current = tens * 10 + ones; render(); }
        });
        removeRow.querySelector('.mg-pv-rem-ones').addEventListener('click', () => {
            if (ones > 0) { ones -= 1; current = tens * 10 + ones; render(); }
        });
        pad.querySelector('.mg-pv-clear').addEventListener('click', () => {
            tens = 0; ones = 0; current = 0; render();
        });
        const checkBtn = pad.querySelector('.mg-pv-check');
        if (checkBtn) {
            checkBtn.addEventListener('click', (e) => {
                if (current === target) {
                    streak += 1;
                    ctx.onScore(streak >= 3 ? 2 : 1, { x: e.clientX, y: e.clientY });
                    setTimeout(nextProblem, 500);
                } else {
                    streak = 0;
                    ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                }
            });
        }

        nextProblem();
        return { stop() {} };
    }
};

// 16. Pattern Catcher — sequence with a missing slot, pick the answer.
GAME_IMPLS['pattern-catcher'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Difficulty: which step sizes appear, where the blank lands, and
        // whether decreasing patterns are mixed in.
        const STEPS = diff === 'easy' ? [1, 2]
                    : diff === 'normal' ? [1, 2, 5]
                    : [1, 2, 5, 10];
        const allowDescending = diff !== 'easy';

        const wrap = document.createElement('div');
        wrap.className = 'mg-pat-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-pat-prompt';
        prompt.textContent = '🔢 What number fits the pattern?';
        const seq = document.createElement('div');
        seq.className = 'mg-pat-seq';
        const opts = document.createElement('div');
        opts.className = 'mg-pat-opts';
        const combo = document.createElement('div');
        combo.className = 'mg-pat-combo';
        combo.textContent = '';
        wrap.appendChild(prompt);
        wrap.appendChild(seq);
        wrap.appendChild(opts);
        wrap.appendChild(combo);
        ctx.area.appendChild(wrap);

        let streak = 0;

        function genPattern() {
            const step = STEPS[Math.floor(Math.random() * STEPS.length)];
            const dir = (allowDescending && Math.random() < 0.35) ? -1 : 1;
            // Pick start so the sequence stays in 0-100
            const stepAbs = step * dir;
            const need = 4 * Math.abs(stepAbs);
            const start = dir > 0
                ? Math.floor(Math.random() * Math.max(1, 100 - need))
                : Math.max(need, Math.floor(Math.random() * (99 - need)) + need);
            const nums = [];
            for (let i = 0; i < 5; i++) nums.push(start + stepAbs * i);
            // Don't put blank at first or last (gives clearer pattern cue)
            const missingIdx = 1 + Math.floor(Math.random() * 3);
            return { nums, missingIdx, step, dir };
        }

        function nextProblem() {
            const p = genPattern();
            const correct = p.nums[p.missingIdx];
            // Hint chip about direction + step
            const arrow = p.dir > 0 ? '↑' : '↓';
            seq.innerHTML =
                `<div class="mg-pat-row">` +
                p.nums.map((n, i) =>
                    i === p.missingIdx ? `<span class="mg-pat-slot">?</span>` : `<span class="mg-pat-num">${n}</span>`
                ).join('<span class="mg-pat-arrow">' + (p.dir > 0 ? '→' : '←') + '</span>') +
                `</div>` +
                `<div class="mg-pat-hint">${arrow} ${Math.abs(p.step) === 1 ? 'count by 1' : 'skip by ' + Math.abs(p.step)}</div>`;
            // Options: 4 plausible distractors
            const set = new Set([correct]);
            while (set.size < 4) {
                const off = (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1) * Math.max(1, Math.floor(Math.abs(p.step) / 2));
                set.add(Math.max(0, correct + off));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-pat-opt" data-correct="${v === correct ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-pat-opt').forEach((b) => {
                b.addEventListener('click', (e) => {
                    if (b.getAttribute('data-correct') === '1') {
                        b.classList.add('mg-pat-right');
                        streak += 1;
                        const pts = streak >= 3 ? 2 : 1;
                        ctx.onScore(pts, { x: e.clientX, y: e.clientY });
                        combo.textContent = streak >= 3 ? `🔥 ${streak} streak · +${pts}` : '';
                        setTimeout(nextProblem, 380);
                    } else {
                        b.classList.add('mg-pat-wrong');
                        streak = 0;
                        combo.textContent = '';
                        ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                        setTimeout(() => b.classList.remove('mg-pat-wrong'), 400);
                    }
                });
            });
        }
        nextProblem();
        return { stop() {} };
    }
};

GAME_IMPLS['tic-tac-toe'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-ttt-wrap';
        // Mode toggle: 'cpu' (vs computer) or 'two' (Hakan vs friend/sister)
        let mode = 'cpu';
        const modeRow = document.createElement('div');
        modeRow.className = 'mg-ttt-mode';
        modeRow.innerHTML =
            '<button class="mg-ttt-mode-btn mg-ttt-mode-on" data-mode="cpu">🤖 vs Computer</button>' +
            '<button class="mg-ttt-mode-btn" data-mode="two">👫 2-Player</button>';
        const status = document.createElement('div');
        status.className = 'mg-ttt-status';
        status.textContent = "Your turn — you're X!";
        const board = document.createElement('div');
        board.className = 'mg-ttt-board';
        const tally = document.createElement('div');
        tally.className = 'mg-ttt-tally';
        tally.innerHTML = `<span class="mg-ttt-tally-x">❌ <b id="mg-ttt-wx">0</b></span><span class="mg-ttt-tally-o" id="mg-ttt-o-label">⭕ CPU: <b id="mg-ttt-wo">0</b></span><span class="mg-ttt-tally-d">🤝 Ties: <b id="mg-ttt-wd">0</b></span>`;
        wrap.appendChild(modeRow);
        wrap.appendChild(status);
        wrap.appendChild(board);
        wrap.appendChild(tally);
        ctx.area.appendChild(wrap);

        modeRow.querySelectorAll('.mg-ttt-mode-btn').forEach((b) => {
            b.addEventListener('click', () => {
                mode = b.getAttribute('data-mode');
                modeRow.querySelectorAll('.mg-ttt-mode-btn').forEach((x) => x.classList.toggle('mg-ttt-mode-on', x === b));
                cells = ['','','','','','','','',''];
                turn = 'X';
                locked = false;
                const oLbl = document.getElementById('mg-ttt-o-label');
                if (oLbl) oLbl.innerHTML = (mode === 'cpu' ? '⭕ CPU: ' : '⭕ ') + '<b id="mg-ttt-wo">' + oWins + '</b>';
                status.textContent = mode === 'two' ? 'Player 1 — tap a square (you\'re X)' : "Your turn — you're X!";
                renderBoard();
            });
        });

        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Difficulty maps to AI smartness; can still override via ctx.config.aiSmartness
        const aiSmartness = (ctx.config && typeof ctx.config.aiSmartness === 'number')
            ? ctx.config.aiSmartness
            : _diffVal(diff, 0.4, 0.7, 0.95);
        let cells = ['','','','','','','','',''];
        let turn = 'X';
        let locked = false;
        let xWins = 0, oWins = 0, draws = 0;

        const LINES = [
            [0,1,2],[3,4,5],[6,7,8],  // rows
            [0,3,6],[1,4,7],[2,5,8],  // cols
            [0,4,8],[2,4,6],          // diagonals
        ];

        function winnerOf(s) {
            for (const ln of LINES) {
                const [a,b,c] = ln;
                if (s[a] && s[a] === s[b] && s[a] === s[c]) return { who: s[a], line: ln };
            }
            if (s.every((v) => v)) return { who: 'draw' };
            return null;
        }

        // AI returns the cell index to play
        function aiMove() {
            // 1. If smart roll, find a winning move
            if (Math.random() < aiSmartness) {
                for (let i = 0; i < 9; i++) {
                    if (cells[i]) continue;
                    cells[i] = 'O';
                    if (winnerOf(cells) && winnerOf(cells).who === 'O') {
                        cells[i] = '';
                        return i;
                    }
                    cells[i] = '';
                }
                // 2. Block X from winning
                for (let i = 0; i < 9; i++) {
                    if (cells[i]) continue;
                    cells[i] = 'X';
                    if (winnerOf(cells) && winnerOf(cells).who === 'X') {
                        cells[i] = '';
                        return i;
                    }
                    cells[i] = '';
                }
                // 3. Take center
                if (!cells[4]) return 4;
                // 4. Take a corner
                const corners = [0, 2, 6, 8].filter((i) => !cells[i]);
                if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
            }
            // Random fallback
            const empties = cells.map((v, i) => v ? null : i).filter((i) => i !== null);
            return empties[Math.floor(Math.random() * empties.length)];
        }

        function renderBoard(highlightLine) {
            board.innerHTML = '';
            cells.forEach((c, i) => {
                const cell = document.createElement('button');
                cell.className = 'mg-ttt-cell';
                if (c) cell.classList.add('mg-ttt-cell-' + c.toLowerCase(), 'mg-ttt-filled');
                if (highlightLine && highlightLine.indexOf(i) >= 0) cell.classList.add('mg-ttt-cell-win');
                cell.textContent = c === 'X' ? '❌' : c === 'O' ? '⭕' : '';
                cell.addEventListener('click', () => onCellClick(i));
                board.appendChild(cell);
            });
        }

        function updateTally() {
            const wx = document.getElementById('mg-ttt-wx');
            const wo = document.getElementById('mg-ttt-wo');
            const wd = document.getElementById('mg-ttt-wd');
            if (wx) wx.textContent = xWins;
            if (wo) wo.textContent = oWins;
            if (wd) wd.textContent = draws;
        }

        function checkAndEndRound() {
            const w = winnerOf(cells);
            if (!w) return false;
            locked = true;
            if (w.who === 'X') {
                xWins += 1;
                status.textContent = "🎉 You win!";
                ctx.onScore(1);
                renderBoard(w.line);
            } else if (w.who === 'O') {
                oWins += 1;
                status.textContent = "Computer wins this round — try again!";
                renderBoard(w.line);
            } else {
                draws += 1;
                status.textContent = "🤝 It's a tie!";
                renderBoard(null);
            }
            updateTally();
            setTimeout(() => {
                cells = ['','','','','','','','',''];
                turn = 'X';
                locked = false;
                status.textContent = "Your turn — you're X!";
                renderBoard();
            }, 1500);
            return true;
        }

        function onCellClick(i) {
            if (locked || cells[i]) return;
            if (mode === 'two') {
                // 2-player mode: alternating taps, no AI
                cells[i] = turn;
                renderBoard();
                if (checkAndEndRound()) return;
                turn = (turn === 'X' ? 'O' : 'X');
                status.textContent = (turn === 'X' ? "Player 1's turn — tap a square (X)" : "Player 2's turn — tap a square (O)");
                return;
            }
            // vs CPU
            if (turn !== 'X') return;
            cells[i] = 'X';
            renderBoard();
            if (checkAndEndRound()) return;
            turn = 'O';
            status.textContent = "Computer's turn...";
            locked = true;
            setTimeout(() => {
                const move = aiMove();
                if (move != null) {
                    cells[move] = 'O';
                    renderBoard();
                }
                if (checkAndEndRound()) return;
                turn = 'X';
                locked = false;
                status.textContent = "Your turn — go again!";
            }, 500);
        }

        renderBoard();
        return { stop() {} };
    }
};

// =====================================================================
// 27. RAINBOW BUILDER — Build a rainbow ROYGBIV stripe by stripe!
// Each correct math answer adds the next stripe to the rainbow.
// =====================================================================
GAME_IMPLS['rainbow-builder'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const colors = diff === 'easy'
            ? [['Red','#ef4444'], ['Yellow','#fbbf24'], ['Green','#16a34a'], ['Blue','#2563eb'], ['Purple','#8b5cf6']]
            : [
                ['Red',    '#ef4444'],
                ['Orange', '#f97316'],
                ['Yellow', '#fbbf24'],
                ['Green',  '#16a34a'],
                ['Blue',   '#2563eb'],
                ['Indigo', '#4338ca'],
                ['Violet', '#8b5cf6'],
              ];
        const totalStripes = colors.length;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-rainbow-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-rainbow-q';
        wrap.appendChild(qBox);

        // Scene: sky + sun + rainbow arc
        const scene = document.createElement('div');
        scene.className = 'mg-rainbow-scene';
        const sun = document.createElement('div');
        sun.className = 'mg-rainbow-sun';
        sun.textContent = '☀️';
        scene.appendChild(sun);
        const cloud1 = document.createElement('div');
        cloud1.className = 'mg-rainbow-cloud mg-rainbow-cloud-l';
        cloud1.textContent = '☁️';
        scene.appendChild(cloud1);
        const cloud2 = document.createElement('div');
        cloud2.className = 'mg-rainbow-cloud mg-rainbow-cloud-r';
        cloud2.textContent = '☁️';
        scene.appendChild(cloud2);
        // The rainbow itself — SVG with N concentric arcs
        const rainbowSvg = document.createElement('div');
        rainbowSvg.className = 'mg-rainbow-arc';
        rainbowSvg.innerHTML = buildRainbowSvg(colors, 0);
        scene.appendChild(rainbowSvg);
        wrap.appendChild(scene);

        // Status + next color cue
        const cue = document.createElement('div');
        cue.className = 'mg-rainbow-cue';
        wrap.appendChild(cue);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-rainbow-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let stripes = 0;

        function buildRainbowSvg(colors, stripesShown) {
            const cx = 200, cy = 150, base = 130;
            const stripeWidth = 16;
            let svgInner = '';
            for (let i = 0; i < colors.length; i++) {
                const r = base - i * stripeWidth;
                const visible = i < stripesShown;
                const color = visible ? colors[i][1] : 'rgba(255,255,255,0.15)';
                const strokeWidth = visible ? stripeWidth : 1;
                svgInner += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" stroke="${color}" stroke-width="${stripeWidth}" fill="none" stroke-linecap="round" opacity="${visible ? 1 : 0.3}"/>`;
            }
            return `<svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${svgInner}</svg>`;
        }

        function updateRainbow() {
            rainbowSvg.innerHTML = buildRainbowSvg(colors, stripes);
            if (stripes < totalStripes) {
                const nextColor = colors[stripes];
                cue.innerHTML = `Solve to add the <b style="color:${nextColor[1]}">${nextColor[0]}</b> stripe! (${stripes} / ${totalStripes})`;
            }
        }

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * maxA);
                return { a, b, ans: a + b, op };
            }
            const a = 2 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * a);
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            target = genProblem();
            qBox.innerHTML = `<div class="mg-rainbow-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-rainbow-eqs">=</span><span class="mg-rainbow-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-rainbow-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-rainbow-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-rainbow-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                stripes += 1;
                updateRainbow();
                if (stripes >= totalStripes) {
                    qBox.innerHTML = `<div class="mg-rainbow-win">🌈 FULL RAINBOW! +5 💎</div>`;
                    opts.innerHTML = '';
                    cue.textContent = '';
                    rainbowSvg.classList.add('mg-rainbow-shine');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2600);
                    return;
                }
                setTimeout(nextProblem, 600);
            } else {
                btn.classList.add('mg-rainbow-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-rainbow-wrong'), 400);
            }
        }

        function reset() {
            stripes = 0;
            updateRainbow();
            rainbowSvg.classList.remove('mg-rainbow-shine');
            nextProblem();
        }

        updateRainbow();
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 26. BIRTHDAY CANDLES — Light all the candles by solving math!
// Each correct answer lights one candle. All candles lit → cake glows
// + sparkles + happy-birthday celebration.
// =====================================================================
GAME_IMPLS['birthday-candles'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const candleCount = diff === 'easy' ? 4 : diff === 'hard' ? 10 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-cake-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-cake-q';
        wrap.appendChild(qBox);

        // Cake scene
        const scene = document.createElement('div');
        scene.className = 'mg-cake-scene';
        // Streamers
        const streamers = document.createElement('div');
        streamers.className = 'mg-cake-streamers';
        for (let i = 0; i < 5; i++) {
            const c = document.createElement('span');
            c.className = 'mg-cake-streamer';
            c.style.left = (10 + i * 20) + '%';
            c.style.color = ['#fbbf24', '#ec4899', '#3b82f6', '#10b981', '#f97316'][i];
            c.textContent = '🎉';
            streamers.appendChild(c);
        }
        scene.appendChild(streamers);

        // Cake
        const cake = document.createElement('div');
        cake.className = 'mg-cake';

        // Candle row (sits on top of cake)
        const candleRow = document.createElement('div');
        candleRow.className = 'mg-cake-candles';
        const candles = [];
        for (let i = 0; i < candleCount; i++) {
            const c = document.createElement('div');
            c.className = 'mg-cake-candle';
            c.innerHTML = `<span class="mg-cake-flame">🔥</span><span class="mg-cake-stick"></span>`;
            candleRow.appendChild(c);
            candles.push({ el: c, lit: false });
        }
        cake.appendChild(candleRow);

        // Cake body
        const body = document.createElement('div');
        body.className = 'mg-cake-body';
        body.innerHTML = `
            <div class="mg-cake-tier-top"></div>
            <div class="mg-cake-tier-mid"></div>
            <div class="mg-cake-tier-bot"></div>
        `;
        cake.appendChild(body);
        scene.appendChild(cake);
        wrap.appendChild(scene);

        const status = document.createElement('div');
        status.className = 'mg-cake-status';
        status.textContent = `0 / ${candleCount} candles lit`;
        wrap.appendChild(status);

        const opts = document.createElement('div');
        opts.className = 'mg-cake-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let lit = 0;
        let target = null;

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * maxA);
                return { a, b, ans: a + b, op };
            }
            const a = 2 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * a);
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            target = genProblem();
            qBox.innerHTML = `<div class="mg-cake-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-cake-eqs">=</span><span class="mg-cake-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-cake-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-cake-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function lightCandle() {
            const c = candles.find((x) => !x.lit);
            if (!c) return;
            c.lit = true;
            c.el.classList.add('mg-cake-candle-lit');
            lit += 1;
            status.textContent = `${lit} / ${candleCount} candles lit`;
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-cake-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                lightCandle();
                if (lit >= candleCount) {
                    happyBirthday();
                    return;
                }
                setTimeout(nextProblem, 500);
            } else {
                btn.classList.add('mg-cake-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-cake-wrong'), 400);
            }
        }

        function happyBirthday() {
            qBox.innerHTML = `<div class="mg-cake-win">🎂 HAPPY BIRTHDAY, HAKAN! +5 💎</div>`;
            opts.innerHTML = '';
            cake.classList.add('mg-cake-glow');
            // Burst of confetti emojis
            for (let i = 0; i < 14; i++) {
                const sp = document.createElement('div');
                sp.className = 'mg-cake-confetti';
                sp.textContent = ['🎊', '🎉', '⭐', '✨', '🎈'][Math.floor(Math.random() * 5)];
                sp.style.left = (Math.random() * 100) + '%';
                sp.style.animationDelay = (Math.random() * 0.4) + 's';
                scene.appendChild(sp);
                setTimeout(() => { try { sp.remove(); } catch (e) {} }, 2500);
            }
            ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
            ctx.onWin();
            setTimeout(reset, 2800);
        }

        function reset() {
            lit = 0;
            candles.forEach((c) => {
                c.lit = false;
                c.el.classList.remove('mg-cake-candle-lit');
            });
            status.textContent = `0 / ${candleCount} candles lit`;
            cake.classList.remove('mg-cake-glow');
            nextProblem();
        }

        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 25. WIZARD SPELL — Hakan is a wizard! Cast a spell by collecting
// magical ingredients. Each correct math answer adds one ingredient
// to the cauldron. Fill the cauldron → spell casts with sparkles!
// =====================================================================
GAME_IMPLS['wizard-spell'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const ingredientCount = diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;
        const INGREDIENTS = ['🍄', '🦴', '🌿', '🦎', '🕷️', '🌶️', '🦋', '⭐', '🌙', '🦇'];

        const wrap = document.createElement('div');
        wrap.className = 'mg-wizard-wrap';

        // Spell recipe card
        const recipe = document.createElement('div');
        recipe.className = 'mg-wizard-recipe';
        recipe.innerHTML = `<div class="mg-wizard-recipe-label">📜 Spell Recipe</div><div class="mg-wizard-recipe-line">Cauldron needs <b>${ingredientCount}</b> magic items!</div>`;
        wrap.appendChild(recipe);

        // Scene: wizard + cauldron
        const scene = document.createElement('div');
        scene.className = 'mg-wizard-scene';
        // Stars in the background
        const stars = document.createElement('div');
        stars.className = 'mg-wizard-stars';
        for (let i = 0; i < 18; i++) {
            const s = document.createElement('span');
            s.style.left = (Math.random() * 100) + '%';
            s.style.top = (Math.random() * 75) + '%';
            s.style.animationDelay = (Math.random() * 3) + 's';
            s.textContent = '✨';
            s.className = 'mg-wizard-twinkle';
            stars.appendChild(s);
        }
        scene.appendChild(stars);
        // Wizard character
        const wizard = document.createElement('div');
        wizard.className = 'mg-wizard-char';
        wizard.textContent = '🧙';
        scene.appendChild(wizard);
        // Cauldron
        const cauldron = document.createElement('div');
        cauldron.className = 'mg-wizard-cauldron';
        cauldron.innerHTML = `
            <div class="mg-wizard-cauldron-body">🍯</div>
            <div class="mg-wizard-bubbles"></div>
            <div class="mg-wizard-cauldron-label">${0} / ${ingredientCount}</div>
        `;
        scene.appendChild(cauldron);
        wrap.appendChild(scene);

        // Question + options
        const qBox = document.createElement('div');
        qBox.className = 'mg-wizard-q';
        wrap.appendChild(qBox);
        const opts = document.createElement('div');
        opts.className = 'mg-wizard-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let added = 0;
        let target = null;

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * maxA);
                return { a, b, ans: a + b, op };
            }
            const a = 2 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * a);
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            target = genProblem();
            qBox.innerHTML = `<div class="mg-wizard-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-wizard-eqs">=</span><span class="mg-wizard-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-wizard-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-wizard-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function addIngredient() {
            // Floating ingredient drops from the wizard's wand into the cauldron
            const ing = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
            const flyer = document.createElement('div');
            flyer.className = 'mg-wizard-flyer';
            flyer.textContent = ing;
            scene.appendChild(flyer);
            requestAnimationFrame(() => flyer.classList.add('mg-wizard-flyer-go'));
            setTimeout(() => { try { flyer.remove(); } catch (e) {} }, 900);
            // Bubble in the cauldron
            const b = document.createElement('span');
            b.className = 'mg-wizard-bubble';
            b.style.left = (40 + Math.random() * 30) + '%';
            b.style.animationDelay = '0s';
            cauldron.querySelector('.mg-wizard-bubbles').appendChild(b);
            setTimeout(() => { try { b.remove(); } catch (e) {} }, 1500);
            added += 1;
            cauldron.querySelector('.mg-wizard-cauldron-label').textContent = `${added} / ${ingredientCount}`;
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-wizard-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                addIngredient();
                if (added >= ingredientCount) {
                    castSpell();
                    return;
                }
                setTimeout(nextProblem, 720);
            } else {
                btn.classList.add('mg-wizard-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-wizard-wrong'), 400);
            }
        }

        function castSpell() {
            qBox.innerHTML = `<div class="mg-wizard-cast">✨🪄 SPELL CAST! ✨</div>`;
            opts.innerHTML = '';
            // Burst of sparkle emojis
            for (let i = 0; i < 18; i++) {
                const sp = document.createElement('div');
                sp.className = 'mg-wizard-sparkle';
                sp.textContent = ['✨', '🌟', '💫', '⚡', '🪄'][Math.floor(Math.random() * 5)];
                sp.style.left = (Math.random() * 100) + '%';
                sp.style.animationDelay = (Math.random() * 0.4) + 's';
                scene.appendChild(sp);
                setTimeout(() => { try { sp.remove(); } catch (e) {} }, 2200);
            }
            ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
            ctx.onWin();
            setTimeout(reset, 2400);
        }

        function reset() {
            added = 0;
            cauldron.querySelector('.mg-wizard-cauldron-label').textContent = `0 / ${ingredientCount}`;
            cauldron.querySelector('.mg-wizard-bubbles').innerHTML = '';
            nextProblem();
        }

        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 24. MATH RACE — Hakan races a computer car. Each correct math
// answer pushes his car forward. Computer car moves at a steady pace.
// First to finish wins.
// =====================================================================
GAME_IMPLS['math-race'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const trackSteps = diff === 'easy' ? 6 : diff === 'hard' ? 10 : 8;
        // Computer pace: ms per step. Lower = faster.
        const cpuMs = diff === 'easy' ? 5000 : diff === 'hard' ? 2800 : 4000;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-race-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-race-q';
        wrap.appendChild(qBox);

        const track = document.createElement('div');
        track.className = 'mg-race-track';

        // Two lanes
        const laneHakan = document.createElement('div');
        laneHakan.className = 'mg-race-lane mg-race-lane-h';
        const carHakan = document.createElement('div');
        carHakan.className = 'mg-race-car mg-race-car-h';
        carHakan.textContent = '🟪';  // placeholder, replaced by emoji
        carHakan.innerHTML = '🏎️<span class="mg-race-label">YOU</span>';
        laneHakan.appendChild(carHakan);
        track.appendChild(laneHakan);

        const laneCpu = document.createElement('div');
        laneCpu.className = 'mg-race-lane mg-race-lane-c';
        const carCpu = document.createElement('div');
        carCpu.className = 'mg-race-car mg-race-car-c';
        carCpu.innerHTML = '🚗<span class="mg-race-label">CPU</span>';
        laneCpu.appendChild(carCpu);
        track.appendChild(laneCpu);

        // Finish line
        const finish = document.createElement('div');
        finish.className = 'mg-race-finish';
        finish.textContent = '🏁';
        track.appendChild(finish);

        wrap.appendChild(track);

        const opts = document.createElement('div');
        opts.className = 'mg-race-opts';
        wrap.appendChild(opts);

        const status = document.createElement('div');
        status.className = 'mg-race-status';
        wrap.appendChild(status);

        ctx.area.appendChild(wrap);

        let target = null;
        let hakanPos = 0;
        let cpuPos = 0;
        let raceOver = false;
        let cpuTimer = null;
        const startedAt = Date.now();

        function placeCars() {
            const hPct = (hakanPos / trackSteps) * 88;
            const cPct = (cpuPos / trackSteps) * 88;
            carHakan.style.left = hPct + '%';
            carCpu.style.left = cPct + '%';
        }

        function updateStatus() {
            status.textContent = `YOU: ${hakanPos}/${trackSteps}  ·  CPU: ${cpuPos}/${trackSteps}`;
        }

        function tickCpu() {
            if (raceOver) return;
            cpuPos += 1;
            placeCars();
            updateStatus();
            if (cpuPos >= trackSteps) {
                endRace(false);
                return;
            }
            cpuTimer = setTimeout(tickCpu, cpuMs);
        }

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * maxA);
                return { a, b, ans: a + b, op };
            }
            const a = 2 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * a);
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            if (raceOver) return;
            target = genProblem();
            qBox.innerHTML = `<div class="mg-race-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-race-eqs">=</span><span class="mg-race-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-race-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-race-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            if (raceOver) return;
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-race-right');
                hakanPos += 1;
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                placeCars();
                updateStatus();
                carHakan.classList.add('mg-race-vroom');
                setTimeout(() => carHakan.classList.remove('mg-race-vroom'), 350);
                if (hakanPos >= trackSteps) {
                    endRace(true);
                    return;
                }
                setTimeout(nextProblem, 420);
            } else {
                btn.classList.add('mg-race-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-race-wrong'), 400);
            }
        }

        function endRace(youWon) {
            raceOver = true;
            if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = null; }
            if (youWon) {
                qBox.innerHTML = `<div class="mg-race-win">🏁 YOU WIN! +5 💎</div>`;
                opts.innerHTML = '';
                ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                ctx.onWin();
            } else {
                qBox.innerHTML = `<div class="mg-race-lose">🚗 CPU got there first... rematch!</div>`;
                opts.innerHTML = '';
            }
            setTimeout(reset, 2400);
        }

        function reset() {
            raceOver = false;
            hakanPos = 0;
            cpuPos = 0;
            placeCars();
            updateStatus();
            nextProblem();
            cpuTimer = setTimeout(tickCpu, cpuMs);
        }

        placeCars();
        updateStatus();
        nextProblem();
        cpuTimer = setTimeout(tickCpu, cpuMs);

        return { stop() { if (cpuTimer) clearTimeout(cpuTimer); } };
    }
};

// =====================================================================
// 23. DINO EGG HATCH — Hakan helps eggs hatch by solving math.
// Each egg shows a number. The math problem's answer matches one egg.
// Tap that egg → it cracks open → a baby dino emerges.
// Hatch all eggs to win the round.
// =====================================================================
GAME_IMPLS['dino-eggs'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const eggCount = diff === 'easy' ? 4 : diff === 'hard' ? 7 : 5;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;
        const DINO_EMOJIS = ['🦕', '🦖', '🐲', '🐊', '🦎'];

        const wrap = document.createElement('div');
        wrap.className = 'mg-egg-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-egg-q';
        wrap.appendChild(qBox);

        // Nest with eggs
        const nest = document.createElement('div');
        nest.className = 'mg-egg-nest';
        // Decorative grass blades
        const grass = document.createElement('div');
        grass.className = 'mg-egg-grass';
        grass.innerHTML = '🌿🌱🌿🌱🌿🌱🌿🌱';
        nest.appendChild(grass);

        const eggRow = document.createElement('div');
        eggRow.className = 'mg-egg-row';
        const eggs = [];
        for (let i = 0; i < eggCount; i++) {
            const egg = document.createElement('div');
            egg.className = 'mg-egg';
            const val = 1 + Math.floor(Math.random() * 18);
            egg.dataset.val = String(val);
            egg.innerHTML = `<span class="mg-egg-shell">🥚</span><span class="mg-egg-num">${val}</span><span class="mg-egg-dino" style="display:none;">${DINO_EMOJIS[i % DINO_EMOJIS.length]}</span>`;
            eggRow.appendChild(egg);
            eggs.push({ el: egg, val, hatched: false });
        }
        nest.appendChild(eggRow);
        wrap.appendChild(nest);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-egg-opts';
        wrap.appendChild(opts);

        const status = document.createElement('div');
        status.className = 'mg-egg-status';
        status.textContent = `0 / ${eggCount} hatched`;
        wrap.appendChild(status);

        ctx.area.appendChild(wrap);

        let target = null;
        let hatched = 0;

        function genProblem() {
            // Find an egg that hasn't hatched yet, then craft a math problem
            // whose answer is that egg's number.
            const unhatched = eggs.filter((e) => !e.hatched);
            if (unhatched.length === 0) return null;
            const tEgg = unhatched[Math.floor(Math.random() * unhatched.length)];
            const ans = tEgg.val;
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = Math.max(1, Math.floor(Math.random() * Math.max(1, ans - 1)) + 1);
                const b = ans - a;
                if (b < 0) return { a: ans, b: 0, op: '+', ans };
                return { a, b, op, ans };
            }
            const b = 1 + Math.floor(Math.random() * Math.min(maxA, ans + 3));
            const a = ans + b;
            return { a, b, op, ans };
        }

        function nextProblem() {
            target = genProblem();
            if (!target) return;
            qBox.innerHTML = `<div class="mg-egg-eq">Find egg <b>${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}</b></div>`;
            // 3 options
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-egg-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-egg-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-egg-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                // Find the egg with that value and hatch it
                const tEgg = eggs.find((eg) => !eg.hatched && eg.val === target.ans);
                if (tEgg) hatchEgg(tEgg);
                if (hatched >= eggCount) {
                    qBox.innerHTML = `<div class="mg-egg-win">🦖 All eggs hatched! +5 💎</div>`;
                    opts.innerHTML = '';
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2500);
                    return;
                }
                setTimeout(nextProblem, 700);
            } else {
                btn.classList.add('mg-egg-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-egg-wrong'), 400);
            }
        }

        function hatchEgg(eggObj) {
            eggObj.hatched = true;
            const el = eggObj.el;
            el.classList.add('mg-egg-hatching');
            const shell = el.querySelector('.mg-egg-shell');
            const num = el.querySelector('.mg-egg-num');
            const dino = el.querySelector('.mg-egg-dino');
            setTimeout(() => {
                if (shell) shell.style.display = 'none';
                if (num) num.style.display = 'none';
                if (dino) {
                    dino.style.display = '';
                    dino.classList.add('mg-egg-dino-show');
                }
            }, 350);
            hatched += 1;
            status.textContent = `${hatched} / ${eggCount} hatched`;
        }

        function reset() {
            eggs.forEach((e) => {
                e.hatched = false;
                e.val = 1 + Math.floor(Math.random() * 18);
                e.el.classList.remove('mg-egg-hatching');
                const shell = e.el.querySelector('.mg-egg-shell');
                const num = e.el.querySelector('.mg-egg-num');
                const dino = e.el.querySelector('.mg-egg-dino');
                if (shell) shell.style.display = '';
                if (num) { num.style.display = ''; num.textContent = String(e.val); }
                if (dino) { dino.style.display = 'none'; dino.classList.remove('mg-egg-dino-show'); }
            });
            hatched = 0;
            status.textContent = `0 / ${eggCount} hatched`;
            nextProblem();
        }

        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 22. ROCKET LAUNCH — Hakan fuels a rocket by solving math problems.
// Each correct answer fills the fuel bar. Reach 100% → BLAST OFF!
// =====================================================================
GAME_IMPLS['rocket-launch'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const fuelTarget = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 8;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-rocket-wrap';

        // Launchpad scene
        const stage = document.createElement('div');
        stage.className = 'mg-rocket-stage';
        // Stars background
        const stars = document.createElement('div');
        stars.className = 'mg-rocket-stars';
        for (let i = 0; i < 24; i++) {
            const s = document.createElement('span');
            s.style.left = (Math.random() * 100) + '%';
            s.style.top = (Math.random() * 60) + '%';
            s.style.animationDelay = (Math.random() * 3) + 's';
            s.style.fontSize = (0.5 + Math.random() * 0.5) + 'rem';
            s.textContent = '⭐';
            s.className = 'mg-rocket-star';
            stars.appendChild(s);
        }
        stage.appendChild(stars);
        // Ground
        const ground = document.createElement('div');
        ground.className = 'mg-rocket-ground';
        stage.appendChild(ground);
        // Rocket
        const rocket = document.createElement('div');
        rocket.className = 'mg-rocket';
        rocket.textContent = '🚀';
        // Flames (hidden until launch)
        const flames = document.createElement('div');
        flames.className = 'mg-rocket-flames';
        flames.textContent = '🔥';
        rocket.appendChild(flames);
        stage.appendChild(rocket);
        wrap.appendChild(stage);

        // Fuel meter
        const fuelWrap = document.createElement('div');
        fuelWrap.className = 'mg-rocket-fuel-wrap';
        fuelWrap.innerHTML = `
            <span class="mg-rocket-fuel-label">⛽ FUEL</span>
            <div class="mg-rocket-fuel-track"><div class="mg-rocket-fuel-fill"></div></div>
            <span class="mg-rocket-fuel-pct">0%</span>
        `;
        wrap.appendChild(fuelWrap);

        // Question + options
        const qBox = document.createElement('div');
        qBox.className = 'mg-rocket-q';
        wrap.appendChild(qBox);
        const opts = document.createElement('div');
        opts.className = 'mg-rocket-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        const fuelFill = wrap.querySelector('.mg-rocket-fuel-fill');
        const fuelPct = wrap.querySelector('.mg-rocket-fuel-pct');
        let fuel = 0;
        let target = null;

        function updateFuel() {
            const pct = Math.round((fuel / fuelTarget) * 100);
            fuelFill.style.width = pct + '%';
            fuelPct.textContent = pct + '%';
        }

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * maxA);
                return { a, b, ans: a + b, op };
            }
            const a = 2 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * a);
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            target = genProblem();
            qBox.innerHTML = `<div class="mg-rocket-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-rocket-eqs">=</span><span class="mg-rocket-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-rocket-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-rocket-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-rocket-right');
                fuel += 1;
                updateFuel();
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                if (fuel >= fuelTarget) {
                    launch();
                    return;
                }
                setTimeout(nextProblem, 420);
            } else {
                btn.classList.add('mg-rocket-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-rocket-wrong'), 400);
            }
        }

        function launch() {
            qBox.innerHTML = `<div class="mg-rocket-launch-text">3... 2... 1... 🚀 LIFTOFF!</div>`;
            opts.innerHTML = '';
            rocket.classList.add('mg-rocket-blast');
            flames.classList.add('mg-rocket-flames-on');
            ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
            ctx.onWin();
            setTimeout(reset, 3000);
        }

        function reset() {
            fuel = 0;
            updateFuel();
            rocket.classList.remove('mg-rocket-blast');
            flames.classList.remove('mg-rocket-flames-on');
            nextProblem();
        }

        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 21. MATH EXPRESS — Hakan builds a train! Each correct math answer
// connects a new car to the engine. Build a full train to win.
// =====================================================================
GAME_IMPLS['math-express'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const totalCars = diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-train-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-train-q';
        wrap.appendChild(qBox);

        // Track + train
        const track = document.createElement('div');
        track.className = 'mg-train-track';
        // Sky + clouds + sun
        const sky = document.createElement('div');
        sky.className = 'mg-train-sky';
        sky.innerHTML = `
            <span class="mg-train-sun">☀️</span>
            <span class="mg-train-cloud mg-train-cloud-1">☁️</span>
            <span class="mg-train-cloud mg-train-cloud-2">☁️</span>
        `;
        const trainRow = document.createElement('div');
        trainRow.className = 'mg-train-row';
        // Engine
        const engine = document.createElement('div');
        engine.className = 'mg-train-engine';
        engine.textContent = '🚂';
        trainRow.appendChild(engine);
        // Cars (initially hidden, revealed as Hakan solves)
        const cars = [];
        const CAR_EMOJI = ['🚃', '🚋', '🚞', '🛺', '🚆'];
        for (let i = 0; i < totalCars; i++) {
            const car = document.createElement('div');
            car.className = 'mg-train-car mg-train-car-hidden';
            car.dataset.idx = String(i);
            car.innerHTML = `<span class="mg-train-car-emoji">${CAR_EMOJI[i % CAR_EMOJI.length]}</span><span class="mg-train-car-num">?</span>`;
            trainRow.appendChild(car);
            cars.push(car);
        }
        // Tracks rail
        const rail = document.createElement('div');
        rail.className = 'mg-train-rail';
        track.appendChild(sky);
        track.appendChild(trainRow);
        track.appendChild(rail);
        wrap.appendChild(track);

        const opts = document.createElement('div');
        opts.className = 'mg-train-opts';
        wrap.appendChild(opts);

        const status = document.createElement('div');
        status.className = 'mg-train-status';
        status.textContent = `Train: 0 / ${totalCars} cars`;
        wrap.appendChild(status);

        ctx.area.appendChild(wrap);

        let attached = 0;
        let target = null;

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * maxA);
                return { a, b, ans: a + b, op };
            }
            const a = 2 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * a);
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            target = genProblem();
            qBox.innerHTML = `<div class="mg-train-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-train-eqs">=</span><span class="mg-train-qmark">?</span></div>`;
            // Build 3 options
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-train-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-train-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-train-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                // Reveal next car with the answer
                if (attached < totalCars) {
                    const car = cars[attached];
                    car.classList.remove('mg-train-car-hidden');
                    car.classList.add('mg-train-car-attach');
                    car.querySelector('.mg-train-car-num').textContent = String(target.ans);
                    attached += 1;
                    status.textContent = `Train: ${attached} / ${totalCars} cars`;
                    if (attached >= totalCars) {
                        // Full train! Choo choo win
                        qBox.innerHTML = `<div class="mg-train-win">🚂💨 ALL ABOARD!</div>`;
                        opts.innerHTML = '';
                        ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                        ctx.onWin();
                        trainRow.classList.add('mg-train-row-go');
                        setTimeout(reset, 2500);
                        return;
                    }
                }
                setTimeout(nextProblem, 420);
            } else {
                btn.classList.add('mg-train-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-train-wrong'), 400);
            }
        }

        function reset() {
            attached = 0;
            cars.forEach((c) => {
                c.classList.add('mg-train-car-hidden');
                c.classList.remove('mg-train-car-attach');
                c.querySelector('.mg-train-car-num').textContent = '?';
            });
            trainRow.classList.remove('mg-train-row-go');
            status.textContent = `Train: 0 / ${totalCars} cars`;
            nextProblem();
        }

        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 20. COLOR MATH — paint-by-numbers grid revealed by math answers.
// Each grid cell has a number 1-4. Hakan must solve a math problem
// whose answer matches one of those numbers — tapping a matching cell
// fills it in. When all cells of every number are filled, the picture
// is "revealed" (rainbow celebration).
// =====================================================================
GAME_IMPLS['color-math'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const gridSize = diff === 'easy' ? 5 : diff === 'hard' ? 7 : 6;
        // Color palette indexed by answer value
        const PALETTE = {
            1: { fill: '#fbbf24', name: 'Sunny Yellow' },
            2: { fill: '#3b82f6', name: 'Ocean Blue' },
            3: { fill: '#16a34a', name: 'Grass Green' },
            4: { fill: '#dc2626', name: 'Hero Red' },
        };
        const COLORS = diff === 'easy' ? [1, 2] : diff === 'hard' ? [1, 2, 3, 4] : [1, 2, 3];

        const wrap = document.createElement('div');
        wrap.className = 'mg-color-wrap';

        const prompt = document.createElement('div');
        prompt.className = 'mg-color-prompt';
        wrap.appendChild(prompt);

        const grid = document.createElement('div');
        grid.className = 'mg-color-grid';
        grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        wrap.appendChild(grid);

        const opts = document.createElement('div');
        opts.className = 'mg-color-opts';
        wrap.appendChild(opts);

        const status = document.createElement('div');
        status.className = 'mg-color-status';
        wrap.appendChild(status);

        ctx.area.appendChild(wrap);

        // Build cells: each gets a random color value from COLORS
        const cells = [];
        let totalCells = gridSize * gridSize;
        for (let i = 0; i < totalCells; i++) {
            const colorVal = COLORS[Math.floor(Math.random() * COLORS.length)];
            const cell = document.createElement('button');
            cell.className = 'mg-color-cell';
            cell.dataset.val = String(colorVal);
            cell.textContent = String(colorVal);
            grid.appendChild(cell);
            cells.push({ el: cell, val: colorVal, painted: false });
        }

        let currentAns = null;
        let totalPainted = 0;

        function paintCell(cell) {
            if (cell.painted) return false;
            cell.painted = true;
            cell.el.classList.add('mg-color-painted');
            cell.el.style.background = PALETTE[cell.val].fill;
            cell.el.textContent = '';
            totalPainted += 1;
            updateStatus();
            return true;
        }

        function updateStatus() {
            const remaining = totalCells - totalPainted;
            if (remaining === 0) {
                status.innerHTML = `🎨 Picture revealed! +5 💎 bonus!`;
                ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                ctx.onWin();
                setTimeout(resetGrid, 2200);
            } else {
                status.textContent = `${totalPainted} / ${totalCells} cells painted`;
            }
        }

        function genProblem() {
            // Pick an answer that matches a number visible on the grid
            const unpainted = cells.filter((c) => !c.painted);
            if (unpainted.length === 0) return null;
            const targetCell = unpainted[Math.floor(Math.random() * unpainted.length)];
            const ans = targetCell.val;
            const op = Math.random() < 0.5 ? '+' : '-';
            let a, b;
            if (op === '+') {
                a = Math.floor(Math.random() * Math.max(1, ans - 1)) + 1;
                b = ans - a;
                if (b < 1) { a = 1; b = ans - 1; }
            } else {
                b = Math.floor(Math.random() * 5) + 1;
                a = ans + b;
            }
            if (a < 1 || b < 1) {
                // fallback: just say "X" if it's hard to phrase
                return { a: ans, b: 0, op: '+', ans };
            }
            return { a, b, op, ans };
        }

        function nextProblem() {
            const p = genProblem();
            if (!p) return;
            currentAns = p.ans;
            // Show problem + which color to look for
            const pal = PALETTE[p.ans];
            prompt.innerHTML = `
                <div class="mg-color-eq">${p.a} ${p.op === '-' ? '−' : '+'} ${p.b === 0 ? '' : p.b}<span class="mg-color-eqs">=</span><span class="mg-color-q">?</span></div>
                <div class="mg-color-cue">Find a <b style="color:${pal.fill}">${p.ans}</b> cell — paint it ${pal.name}!</div>
            `;
            // Build options
            const set = new Set([p.ans]);
            while (set.size < Math.min(4, COLORS.length + 1)) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(1, p.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-color-opt" data-correct="${v === p.ans ? '1' : '0'}" data-val="${v}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-color-opt').forEach((b) => {
                b.addEventListener('click', () => {
                    const val = parseInt(b.getAttribute('data-val'), 10);
                    if (val === currentAns) {
                        // Find an unpainted cell with this value and paint it
                        const target = cells.find((c) => !c.painted && c.val === val);
                        if (target) {
                            paintCell(target);
                            ctx.onScore(1);
                            setTimeout(nextProblem, 380);
                        }
                    } else {
                        b.classList.add('mg-color-wrong');
                        ctx.onPenalty(1);
                        setTimeout(() => b.classList.remove('mg-color-wrong'), 400);
                    }
                });
            });
        }

        function resetGrid() {
            cells.forEach((c) => {
                c.painted = false;
                c.el.style.background = '';
                c.el.classList.remove('mg-color-painted');
                c.el.textContent = String(c.val);
            });
            totalPainted = 0;
            updateStatus();
            nextProblem();
        }

        updateStatus();
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 19. MATH FISHING — fish swim across a pond with numbers on them.
// Hakan must catch the fish whose number matches the answer to a math
// problem. Reel-in animation, score per fish, splash effects.
// =====================================================================
GAME_IMPLS['math-fishing'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const fishCount = diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-fish-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-fish-q';
        wrap.appendChild(qBox);

        const caughtRow = document.createElement('div');
        caughtRow.className = 'mg-fish-bucket';
        caughtRow.textContent = '🪣 0';
        wrap.appendChild(caughtRow);

        const pond = document.createElement('div');
        pond.className = 'mg-fish-pond';

        // Sun / cloud decorations
        const sun = document.createElement('div');
        sun.className = 'mg-fish-sun';
        sun.textContent = '☀️';
        pond.appendChild(sun);
        const cloud = document.createElement('div');
        cloud.className = 'mg-fish-cloud';
        cloud.textContent = '☁️';
        pond.appendChild(cloud);

        wrap.appendChild(pond);

        // Hook
        const hook = document.createElement('div');
        hook.className = 'mg-fish-hook';
        hook.innerHTML = `<div class="mg-fish-line"></div><div class="mg-fish-bait">🪝</div>`;
        pond.appendChild(hook);

        ctx.area.appendChild(wrap);

        let targetAns = null;
        let activeFish = [];
        let caught = 0;
        let combo = 0;

        const fishEmojis = ['🐟', '🐠', '🐡', '🦈'];

        function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = rand(1, maxA), b = rand(1, maxA);
                return { a, b, op, ans: a + b };
            }
            const a = rand(2, maxA);
            const b = rand(1, a);
            return { a, b, op, ans: a - b };
        }

        function clearFish() {
            activeFish.forEach((f) => { try { f.remove(); } catch (e) {} });
            activeFish = [];
        }

        function spawnFish() {
            clearFish();
            // Build set of numbers to display: include answer, fill with plausible wrongs
            const nums = new Set([targetAns]);
            while (nums.size < fishCount) {
                const d = rand(-4, 4);
                const v = Math.max(0, targetAns + d);
                if (v !== targetAns || nums.size === 0) nums.add(v);
            }
            const arr = Array.from(nums).sort(() => Math.random() - 0.5);
            arr.forEach((n, i) => {
                const f = document.createElement('button');
                f.className = 'mg-fish';
                f.dataset.val = String(n);
                // Random lane (Y) and starting X, direction
                const lane = (i % 4);
                const fromLeft = Math.random() < 0.5;
                const emoji = fishEmojis[Math.floor(Math.random() * fishEmojis.length)];
                f.innerHTML = `<span class="mg-fish-body ${fromLeft ? '' : 'mg-fish-flip'}">${emoji}</span><span class="mg-fish-num">${n}</span>`;
                f.style.top = (12 + lane * 18) + '%';
                f.style.left = fromLeft ? '-15%' : '110%';
                const dur = 4 + Math.random() * 3;  // seconds across pond
                f.style.animationDuration = dur + 's';
                f.style.animationDelay = (Math.random() * 1.2) + 's';
                f.classList.add(fromLeft ? 'mg-fish-swim-r' : 'mg-fish-swim-l');
                pond.appendChild(f);
                activeFish.push(f);
                f.addEventListener('click', (e) => onCatch(f, n, e));
            });
        }

        function onCatch(f, n, e) {
            if (f.classList.contains('mg-fish-caught')) return;
            if (n === targetAns) {
                f.classList.add('mg-fish-caught');
                // Hook reels up to the fish then both go to bucket
                const rect = f.getBoundingClientRect();
                const pondRect = pond.getBoundingClientRect();
                const x = ((rect.left + rect.width / 2) - pondRect.left) / pondRect.width * 100;
                const y = ((rect.top  + rect.height / 2) - pondRect.top)  / pondRect.height * 100;
                hook.style.transition = 'left 0.3s ease, top 0.3s ease';
                hook.style.left = x + '%';
                hook.style.top  = y + '%';
                caught += 1; combo += 1;
                const pts = combo >= 3 ? 2 : 1;
                ctx.onScore(pts, { x: e.clientX, y: e.clientY });
                caughtRow.textContent = '🪣 ' + caught + (combo >= 3 ? ` · 🔥 ${combo}` : '');
                setTimeout(() => {
                    try { f.remove(); } catch (err) {}
                    activeFish = activeFish.filter((x) => x !== f);
                    hook.style.transition = 'left 0.3s ease, top 0.3s ease';
                    hook.style.left = '50%';
                    hook.style.top  = '8%';
                    setTimeout(nextProblem, 400);
                }, 350);
            } else {
                f.classList.add('mg-fish-miss');
                setTimeout(() => f.classList.remove('mg-fish-miss'), 400);
                combo = 0;
                caughtRow.textContent = '🪣 ' + caught;
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
            }
        }

        function nextProblem() {
            const p = genProblem();
            targetAns = p.ans;
            qBox.innerHTML = `Catch the fish that says: <b>${p.a} ${p.op === '-' ? '−' : '+'} ${p.b}</b>`;
            spawnFish();
        }

        nextProblem();
        return { stop() { clearFish(); } };
    }
};

// =====================================================================
// 18. TREASURE MAP — pirate adventure on a path of math stones.
// Hakan controls a pirate that hops along stepping stones. Each stone
// has a math problem; correct = +1 step, wrong = stay. Reach the X to
// open the treasure chest and harvest jewels.
// =====================================================================
GAME_IMPLS['treasure-map'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Path length scales with difficulty
        const STONES = diff === 'easy' ? 5 : diff === 'hard' ? 9 : 7;
        // Math range
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;
        // Wrong = step back? Only on hard
        const stepBackOnWrong = diff === 'hard';

        const wrap = document.createElement('div');
        wrap.className = 'mg-tmap-wrap';

        // Top: question + position indicator
        const hud = document.createElement('div');
        hud.className = 'mg-tmap-hud';
        const qBox = document.createElement('div');
        qBox.className = 'mg-tmap-q';
        const stepLbl = document.createElement('div');
        stepLbl.className = 'mg-tmap-step';
        hud.appendChild(qBox);
        hud.appendChild(stepLbl);
        wrap.appendChild(hud);

        // The map path
        const path = document.createElement('div');
        path.className = 'mg-tmap-path';
        // Render stones + pirate + chest
        const stones = [];
        for (let i = 0; i < STONES; i++) {
            const s = document.createElement('div');
            s.className = 'mg-tmap-stone';
            s.style.left = `${(i / (STONES - 1)) * 100}%`;
            s.textContent = String(i + 1);
            path.appendChild(s);
            stones.push(s);
        }
        const chest = document.createElement('div');
        chest.className = 'mg-tmap-chest';
        chest.textContent = '🟫';
        chest.style.left = '100%';
        path.appendChild(chest);

        const pirate = document.createElement('div');
        pirate.className = 'mg-tmap-pirate';
        pirate.textContent = '🏴‍☠️';
        pirate.style.left = '0%';
        path.appendChild(pirate);

        // Dotted line
        const line = document.createElement('div');
        line.className = 'mg-tmap-line';
        path.appendChild(line);

        wrap.appendChild(path);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-tmap-opts';
        wrap.appendChild(opts);

        const feedback = document.createElement('div');
        feedback.className = 'mg-tmap-feedback';
        wrap.appendChild(feedback);

        ctx.area.appendChild(wrap);

        let pos = 0;       // index of stone pirate is on (0 = start)
        let target = null; // {a, b, op, ans}
        let totalRuns = 0;

        function genProblem(stepIdx) {
            // Problems get slightly harder as Hakan progresses through the path
            const range = Math.min(maxA, Math.max(3, maxA - 4 + Math.floor(stepIdx)));
            const op = Math.random() < 0.5 ? 'add' : 'sub';
            if (op === 'add') {
                const a = 1 + Math.floor(Math.random() * range);
                const b = 1 + Math.floor(Math.random() * range);
                return { a, b, ans: a + b, op: '+' };
            }
            const a = 2 + Math.floor(Math.random() * range);
            const b = 1 + Math.floor(Math.random() * a);
            return { a, b, ans: a - b, op: '−' };
        }

        function setPiratePos(idx) {
            pos = Math.max(0, Math.min(STONES, idx));
            const pct = (pos / (STONES - 1)) * 100;
            pirate.style.left = Math.min(100, pct) + '%';
            pirate.classList.remove('mg-tmap-hop');
            void pirate.offsetWidth;
            pirate.classList.add('mg-tmap-hop');
            stones.forEach((s, i) => {
                s.classList.toggle('mg-tmap-stone-done', i < pos);
                s.classList.toggle('mg-tmap-stone-active', i === pos);
            });
        }

        function nextProblem() {
            stepLbl.textContent = `Step ${pos + 1} of ${STONES}`;
            target = genProblem(pos);
            qBox.textContent = `${target.a} ${target.op} ${target.b} = ?`;
            // 3 options
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-tmap-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-tmap-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function openChest() {
            chest.textContent = '💎';
            chest.classList.add('mg-tmap-chest-open');
            qBox.textContent = '🏆 TREASURE!';
            opts.innerHTML = '';
            feedback.textContent = '+5 💎 jackpot!';
            ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
            ctx.onWin();
            totalRuns += 1;
            setTimeout(reset, 2500);
        }

        function reset() {
            setPiratePos(0);
            chest.classList.remove('mg-tmap-chest-open');
            chest.textContent = '🟫';
            feedback.textContent = '';
            nextProblem();
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-tmap-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                setPiratePos(pos + 1);
                feedback.textContent = '⛵ Onward!';
                if (pos >= STONES - 1) {
                    setTimeout(openChest, 600);
                } else {
                    setTimeout(nextProblem, 500);
                }
            } else {
                btn.classList.add('mg-tmap-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                if (stepBackOnWrong && pos > 0) {
                    setPiratePos(pos - 1);
                    feedback.textContent = '🌊 Slipped back!';
                } else {
                    feedback.textContent = '🤔 Try the right step!';
                }
                setTimeout(() => btn.classList.remove('mg-tmap-wrong'), 400);
            }
        }

        setPiratePos(0);
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 17. NUMBER GARDEN — big-box new game
// Plot grid where each correct answer grows a plant through 4 stages.
// Fill all plots to "harvest" the garden for a big bonus.
// =====================================================================
GAME_IMPLS['number-garden'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        // Difficulty: grid size + math range
        const cols = diff === 'easy' ? 2 : diff === 'hard' ? 4 : 3;
        const rows = diff === 'easy' ? 2 : diff === 'hard' ? 3 : 3;
        const slotCount = rows * cols;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        // Plant stages and their emoji
        const STAGES = ['🌱', '🌿', '🌸', '🌻'];
        // Pool of "harvest" emoji at full bloom — variety so each plot looks unique
        const HARVEST = ['🌻','🌷','🌹','🌺','🌼','🍓','🍎','🍅','🥕','🌽','🍇'];

        const wrap = document.createElement('div');
        wrap.className = 'mg-garden-wrap';

        const header = document.createElement('div');
        header.className = 'mg-garden-header';
        const qBox = document.createElement('div');
        qBox.className = 'mg-garden-q';
        qBox.textContent = '...';
        const progLabel = document.createElement('div');
        progLabel.className = 'mg-garden-prog';
        progLabel.textContent = `0 / ${slotCount} plants grown`;
        header.appendChild(qBox);
        header.appendChild(progLabel);
        wrap.appendChild(header);

        // Garden grid
        const garden = document.createElement('div');
        garden.className = 'mg-garden-grid';
        garden.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        const plots = [];
        for (let i = 0; i < slotCount; i++) {
            const plot = document.createElement('div');
            plot.className = 'mg-garden-plot';
            plot.dataset.stage = '0';
            const dirt = document.createElement('div');
            dirt.className = 'mg-garden-dirt';
            const plant = document.createElement('div');
            plant.className = 'mg-garden-plant';
            plant.textContent = '';
            const cap = document.createElement('div');
            cap.className = 'mg-garden-cap';
            cap.textContent = '0/4';
            plot.appendChild(dirt);
            plot.appendChild(plant);
            plot.appendChild(cap);
            garden.appendChild(plot);
            plots.push({ el: plot, plantEl: plant, capEl: cap, stage: 0, harvest: HARVEST[Math.floor(Math.random() * HARVEST.length)] });
        }
        wrap.appendChild(garden);

        // Options row
        const optsRow = document.createElement('div');
        optsRow.className = 'mg-garden-opts';
        wrap.appendChild(optsRow);

        // Watering can floats over to the active plot
        const can = document.createElement('div');
        can.className = 'mg-garden-can';
        can.textContent = '💧';
        wrap.appendChild(can);

        ctx.area.appendChild(wrap);

        let currentTarget = null; // {a, b, sum, type}
        let activePlot = 0;
        let totalGrown = 0;

        function genProblem() {
            // Mix of addition + subtraction at this level
            const op = Math.random() < 0.5 ? 'add' : 'sub';
            if (op === 'add') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * maxA);
                return { a, b, ans: a + b, op: '+' };
            } else {
                const a = 2 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * a);
                return { a, b, ans: a - b, op: '−' };
            }
        }

        function pickActivePlot() {
            // Prefer a plot that's not fully grown; cycle through
            for (let attempt = 0; attempt < plots.length; attempt++) {
                const idx = (activePlot + attempt) % plots.length;
                if (plots[idx].stage < STAGES.length) {
                    activePlot = idx;
                    plots.forEach((p, i) => p.el.classList.toggle('mg-garden-plot-active', i === idx));
                    return idx;
                }
            }
            return -1;
        }

        function nextProblem() {
            currentTarget = genProblem();
            qBox.textContent = `${currentTarget.a} ${currentTarget.op} ${currentTarget.b} = ?`;
            // 3 options including correct
            const set = new Set([currentTarget.ans]);
            while (set.size < 3) {
                const delta = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, currentTarget.ans + delta));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            optsRow.innerHTML = arr.map((v) =>
                `<button class="mg-garden-opt" data-correct="${v === currentTarget.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            optsRow.querySelectorAll('.mg-garden-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
            pickActivePlot();
            // Move watering can over the active plot
            const plot = plots[activePlot].el;
            const rect = plot.getBoundingClientRect();
            const wrapRect = wrap.getBoundingClientRect();
            can.style.transition = 'transform 0.5s ease';
            can.style.transform = `translate(${rect.left - wrapRect.left + rect.width / 2 - 24}px, ${rect.top - wrapRect.top - 20}px)`;
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-garden-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                // Grow active plant
                const slot = plots[activePlot];
                slot.stage += 1;
                slot.capEl.textContent = `${slot.stage}/4`;
                const isFull = slot.stage >= STAGES.length;
                slot.plantEl.classList.remove('mg-garden-grow');
                void slot.plantEl.offsetWidth;
                slot.plantEl.classList.add('mg-garden-grow');
                slot.plantEl.textContent = isFull ? slot.harvest : STAGES[slot.stage - 1];
                if (isFull) {
                    slot.el.classList.add('mg-garden-plot-full');
                    totalGrown += 1;
                    progLabel.textContent = `${totalGrown} / ${slotCount} plants grown`;
                    // Bonus for each full bloom
                    ctx.onScore(2, { x: e.clientX, y: e.clientY });
                    if (totalGrown >= slotCount) {
                        // Harvest! Win the round
                        qBox.textContent = '🌟 Garden full! Amazing harvest!';
                        optsRow.innerHTML = '';
                        ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                        ctx.onWin();
                        // Reset for another round
                        setTimeout(resetGarden, 2500);
                        return;
                    }
                }
                setTimeout(nextProblem, 450);
            } else {
                btn.classList.add('mg-garden-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-garden-wrong'), 400);
            }
        }

        function resetGarden() {
            plots.forEach((p) => {
                p.stage = 0;
                p.plantEl.textContent = '';
                p.el.classList.remove('mg-garden-plot-full');
                p.capEl.textContent = '0/4';
                p.harvest = HARVEST[Math.floor(Math.random() * HARVEST.length)];
            });
            totalGrown = 0;
            progLabel.textContent = `0 / ${slotCount} plants grown`;
            activePlot = 0;
            nextProblem();
        }

        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 27. PIZZA MAKER — Top the pizza with the right number of ingredients!
// Each round shows a topping (pepperoni, olive, mushroom, etc.) and
// asks how many to put on the pizza. Solve math → toppings drop onto
// the pizza slice-by-slice. Complete the pizza → +5 💎 + chef cheer.
// =====================================================================
GAME_IMPLS['pizza-maker'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const roundsToWin = diff === 'easy' ? 3 : diff === 'hard' ? 6 : 4;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 8;

        const TOPPINGS = [
            { name: 'Pepperoni', emoji: '🍕', dot: '🔴' },
            { name: 'Olive',     emoji: '🫒', dot: '🫒' },
            { name: 'Mushroom',  emoji: '🍄', dot: '🍄' },
            { name: 'Pepper',    emoji: '🫑', dot: '🫑' },
            { name: 'Tomato',    emoji: '🍅', dot: '🍅' },
            { name: 'Cheese',    emoji: '🧀', dot: '🧀' },
        ];

        const wrap = document.createElement('div');
        wrap.className = 'mg-pizza-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-pizza-q';
        wrap.appendChild(qBox);

        // Chef + pizza scene
        const scene = document.createElement('div');
        scene.className = 'mg-pizza-scene';
        const chef = document.createElement('div');
        chef.className = 'mg-pizza-chef';
        chef.textContent = '👨‍🍳';
        scene.appendChild(chef);
        const pizzaBase = document.createElement('div');
        pizzaBase.className = 'mg-pizza-base';
        const crust = document.createElement('div');
        crust.className = 'mg-pizza-crust';
        pizzaBase.appendChild(crust);
        const sauce = document.createElement('div');
        sauce.className = 'mg-pizza-sauce';
        pizzaBase.appendChild(sauce);
        const toppingsLayer = document.createElement('div');
        toppingsLayer.className = 'mg-pizza-toppings';
        pizzaBase.appendChild(toppingsLayer);
        scene.appendChild(pizzaBase);
        wrap.appendChild(scene);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-pizza-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-pizza-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let currentTopping = null;
        let roundsDone = 0;

        function dropToppings(topping, count) {
            // Drop `count` topping emojis at randomized positions in toppingsLayer
            for (let i = 0; i < count; i++) {
                const drop = document.createElement('div');
                drop.className = 'mg-pizza-drop';
                drop.textContent = topping.emoji;
                // Random angle + radius within pizza circle
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 50 + 10;
                const x = 50 + Math.cos(angle) * radius;
                const y = 50 + Math.sin(angle) * radius;
                drop.style.left = `${x}%`;
                drop.style.top = `${y}%`;
                drop.style.animationDelay = `${i * 80}ms`;
                toppingsLayer.appendChild(drop);
            }
        }

        function clearToppings() {
            toppingsLayer.innerHTML = '';
        }

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * maxA);
                const b = 1 + Math.floor(Math.random() * Math.min(maxA, 6));
                return { a, b, ans: a + b, op };
            }
            const a = 3 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * Math.min(a - 1, 5));
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            currentTopping = TOPPINGS[Math.floor(Math.random() * TOPPINGS.length)];
            target = genProblem();
            qBox.innerHTML =
                `<div class="mg-pizza-task">Add ${currentTopping.emoji} <b>${currentTopping.name}</b></div>` +
                `<div class="mg-pizza-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-pizza-eqs">=</span><span class="mg-pizza-qmark">?</span></div>`;
            // Build 3 options
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-pizza-opt" data-correct="${v === target.ans ? '1' : '0'}" data-val="${v}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-pizza-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-pizza-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                // Drop the answer-many toppings onto the pizza
                const count = parseInt(btn.getAttribute('data-val'), 10);
                dropToppings(currentTopping, Math.min(count, 12));
                roundsDone += 1;
                prog.innerHTML = `<b>${roundsDone}</b> / ${roundsToWin} toppings added 🍕`;

                if (roundsDone >= roundsToWin) {
                    qBox.innerHTML = `<div class="mg-pizza-win">🍕 PIZZA READY! +5 💎</div>`;
                    opts.innerHTML = '';
                    chef.classList.add('mg-pizza-chef-cheer');
                    pizzaBase.classList.add('mg-pizza-base-done');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2800);
                    return;
                }
                setTimeout(nextProblem, 700);
            } else {
                btn.classList.add('mg-pizza-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-pizza-wrong'), 400);
            }
        }

        function reset() {
            roundsDone = 0;
            clearToppings();
            chef.classList.remove('mg-pizza-chef-cheer');
            pizzaBase.classList.remove('mg-pizza-base-done');
            prog.innerHTML = `<b>0</b> / ${roundsToWin} toppings added 🍕`;
            nextProblem();
        }

        prog.innerHTML = `<b>0</b> / ${roundsToWin} toppings added 🍕`;
        nextProblem();
        return { stop() {} };
    }
};
