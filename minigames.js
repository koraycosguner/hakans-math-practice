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
        const bRange = _diffVal(diff, 5, 9, 14);

        function nextProblem() {
            const a = Math.floor(Math.random() * bRange) + 1;
            const b = Math.floor(Math.random() * bRange) + 1;
            currentAns = a + b;
            target.innerHTML = `<span class="mg-b-op">${a}</span><span class="mg-b-plus">+</span><span class="mg-b-op">${b}</span><span class="mg-b-eq">=</span><span class="mg-b-q">?</span>`;
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
        const wrap = document.createElement('div');
        wrap.className = 'mg-m10-wrap';
        const header = document.createElement('div');
        header.className = 'mg-m10-header';
        header.textContent = '🎯 Find pairs that make 10';
        const board = document.createElement('div');
        board.className = 'mg-m10-board';
        wrap.appendChild(header);
        wrap.appendChild(board);
        ctx.area.appendChild(wrap);

        let selected = null;
        const POOL_SETS = [
            [[1,9],[2,8],[3,7],[4,6],[5,5],[1,9]],
            [[2,8],[3,7],[4,6],[1,9],[5,5],[2,8]],
            [[3,7],[6,4],[1,9],[5,5],[8,2],[7,3]],
        ];
        let poolIdx = 0;

        function refill() {
            board.innerHTML = '';
            const pairs = POOL_SETS[poolIdx % POOL_SETS.length];
            poolIdx += 1;
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
                    if (a + b === 10) {
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
        const range = _diffVal(diff, 5, 9, 15);
        let answer = 0;
        function next() {
            const a = Math.floor(Math.random() * range) + 1;
            const b = Math.floor(Math.random() * range) + 1;
            answer = a + b;
            eq.innerHTML =
                `<span class="mg-sa-a">${a}</span>` +
                `<span class="mg-sa-op">+</span>` +
                `<span class="mg-sa-b">${b}</span>` +
                `<span class="mg-sa-eqs">=</span>` +
                `<span class="mg-sa-q">?</span>`;
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
        const board = document.createElement('div');
        board.className = 'mg-mem-board';
        ctx.area.appendChild(board);
        const WORDS = ['one','two','three','four','five','six'];
        const pairs = WORDS.map((w, i) => [
            { kind: 'digit', val: i+1, n: i+1 },
            { kind: 'word',  val: w,   n: i+1 },
        ]).flat();
        pairs.sort(() => Math.random() - 0.5);
        let flipped = [];
        let matched = 0;
        pairs.forEach((p, i) => {
            const c = document.createElement('button');
            c.className = 'mg-mem-card';
            c.dataset.kind = p.kind;
            c.dataset.val = p.val;
            const hue = (p.n * 47) % 360;
            c.style.setProperty('--cardHue', hue);
            c.innerHTML =
                `<span class="face front"><span class="mg-mem-pattern">?</span></span>` +
                `<span class="face back">${p.val}</span>`;
            c.style.animationDelay = (i * 0.05) + 's';
            c.addEventListener('click', () => {
                if (c.classList.contains('matched') || c.classList.contains('flipped')) return;
                if (flipped.length >= 2) return;
                c.classList.add('flipped');
                flipped.push(c);
                if (flipped.length === 2) {
                    const [a, b] = flipped;
                    const av = a.dataset.val, bv = b.dataset.val;
                    const norm = (x) => isNaN(parseInt(x, 10)) ? WORDS.indexOf(x) + 1 : parseInt(x, 10);
                    if (norm(av) === norm(bv) && a.dataset.kind !== b.dataset.kind) {
                        setTimeout(() => {
                            a.classList.add('matched');
                            b.classList.add('matched');
                            const r = a.getBoundingClientRect();
                            const r2 = b.getBoundingClientRect();
                            ctx.onScore(1, { x: (r.x + r2.x) / 2 + 30, y: (r.y + r2.y) / 2 + 30 });
                            flipped = [];
                            matched += 1;
                            if (matched >= WORDS.length) ctx.onWin();
                        }, 300);
                    } else {
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
// Bigger digit pad with per-number tints. Each round resets cleanly.
GAME_IMPLS['counting-race'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-count-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-count-prompt';
        prompt.textContent = 'How many?';
        const items = document.createElement('div');
        items.className = 'mg-count-items';
        const pad = document.createElement('div');
        pad.className = 'mg-count-pad';
        wrap.appendChild(prompt);
        wrap.appendChild(items);
        wrap.appendChild(pad);
        ctx.area.appendChild(wrap);

        const emojis = ['⭐','🍎','🐠','🐝','🍪','🦋','🚗','🎈','🌸','🐢','🪁','🍓'];
        let correct = 0;
        function nextRound() {
            const n = Math.floor(Math.random() * 9) + 1;
            const e = emojis[Math.floor(Math.random() * emojis.length)];
            correct = n;
            items.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const s = document.createElement('span');
                s.className = 'mg-count-item';
                s.textContent = e;
                s.style.animationDelay = (i * 0.06) + 's';
                items.appendChild(s);
            }
            pad.innerHTML = '';
            for (let d = 1; d <= 10; d++) {
                const b = document.createElement('button');
                b.className = 'mg-count-digit';
                b.textContent = d;
                const hue = (d * 36) % 360;
                b.style.background = `linear-gradient(135deg, hsl(${hue}, 80%, 88%), hsl(${hue}, 70%, 75%))`;
                b.style.borderColor = `hsl(${hue}, 60%, 45%)`;
                b.style.color = `hsl(${hue}, 80%, 25%)`;
                b.addEventListener('click', (ev) => {
                    if (parseInt(b.textContent, 10) === correct) {
                        b.classList.add('right');
                        ctx.onScore(1, { x: ev.clientX, y: ev.clientY });
                        setTimeout(nextRound, 220);
                    } else {
                        b.classList.add('wrong');
                        ctx.onPenalty(1, { x: ev.clientX, y: ev.clientY });
                        setTimeout(() => b.classList.remove('wrong'), 400);
                    }
                });
                pad.appendChild(b);
            }
        }
        nextRound();
        return { stop() {} };
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
        const wrap = document.createElement('div');
        wrap.className = 'mg-coin-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-coin-prompt';
        prompt.textContent = 'How many cents?';
        const coins = document.createElement('div');
        coins.className = 'mg-coin-coins';
        const opts = document.createElement('div');
        opts.className = 'mg-coin-opts';
        wrap.appendChild(prompt);
        wrap.appendChild(coins);
        wrap.appendChild(opts);
        ctx.area.appendChild(wrap);

        const COIN_TYPES = [
            { name: 'penny',   value: 1,  emoji: '🟤', cls: 'mg-coin-penny' },
            { name: 'nickel',  value: 5,  emoji: '⚪', cls: 'mg-coin-nickel' },
            { name: 'dime',    value: 10, emoji: '🪙', cls: 'mg-coin-dime' },
            { name: 'quarter', value: 25, emoji: '🟡', cls: 'mg-coin-quarter' },
        ];

        function nextProblem() {
            // Generate 2-5 coins, total <= ~50
            const n = Math.floor(Math.random() * 4) + 2;
            const used = [];
            let total = 0;
            for (let i = 0; i < n; i++) {
                // bias toward lower-value coins for kid-friendly totals
                const idx = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
                const c = COIN_TYPES[idx];
                if (total + c.value > 60) continue;
                used.push(c);
                total += c.value;
            }
            if (total === 0) { used.push(COIN_TYPES[0]); total = 1; }
            coins.innerHTML = used.map((c) =>
                `<span class="mg-coin ${c.cls}" title="${c.name}">${c.emoji}<span class="mg-coin-val">${c.value}¢</span></span>`
            ).join('');
            // Options
            const set = new Set([total]);
            while (set.size < 3) {
                const delta = (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1) * 5;
                set.add(Math.max(1, total + delta));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-coin-opt" data-correct="${v === total ? '1' : '0'}">${v}¢</button>`
            ).join('');
            opts.querySelectorAll('.mg-coin-opt').forEach((b) => {
                b.addEventListener('click', (e) => {
                    if (b.getAttribute('data-correct') === '1') {
                        b.classList.add('mg-coin-right');
                        ctx.onScore(1, { x: e.clientX, y: e.clientY });
                        setTimeout(nextProblem, 350);
                    } else {
                        b.classList.add('mg-coin-wrong');
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
        const wrap = document.createElement('div');
        wrap.className = 'mg-pv-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-pv-prompt';
        const built = document.createElement('div');
        built.className = 'mg-pv-built';
        const pad = document.createElement('div');
        pad.className = 'mg-pv-pad';
        pad.innerHTML = `
            <button class="mg-pv-btn mg-pv-tens" data-add="10"><span>+10</span><span class="mg-pv-block-bar"></span></button>
            <button class="mg-pv-btn mg-pv-ones" data-add="1"><span>+1</span><span class="mg-pv-block-dot"></span></button>
            <button class="mg-pv-btn mg-pv-clear">Clear</button>
            <button class="mg-pv-btn mg-pv-check">Check ✓</button>
        `;
        wrap.appendChild(prompt);
        wrap.appendChild(built);
        wrap.appendChild(pad);
        ctx.area.appendChild(wrap);

        let target = 0;
        let current = 0;
        let tens = 0, ones = 0;

        function render() {
            built.innerHTML = `
                <div class="mg-pv-stack mg-pv-stack-tens">${'<span class="mg-pv-bar"></span>'.repeat(tens)}</div>
                <div class="mg-pv-stack mg-pv-stack-ones">${'<span class="mg-pv-dot"></span>'.repeat(ones)}</div>
                <div class="mg-pv-current">Current: ${current}</div>
            `;
        }

        function nextProblem() {
            target = Math.floor(Math.random() * 89) + 11;  // 11-99
            tens = 0; ones = 0;
            current = 0;
            prompt.innerHTML = `Build <span class="mg-pv-target">${target}</span> with tens & ones!`;
            render();
        }

        pad.querySelector('.mg-pv-tens').addEventListener('click', (e) => {
            if (tens < 9) { tens += 1; current = tens * 10 + ones; render(); ctx.onScore(0); }
        });
        pad.querySelector('.mg-pv-ones').addEventListener('click', (e) => {
            if (ones < 9) { ones += 1; current = tens * 10 + ones; render(); ctx.onScore(0); }
        });
        pad.querySelector('.mg-pv-clear').addEventListener('click', () => {
            tens = 0; ones = 0; current = 0; render();
        });
        pad.querySelector('.mg-pv-check').addEventListener('click', (e) => {
            if (current === target) {
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                setTimeout(nextProblem, 400);
            } else {
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
            }
        });

        nextProblem();
        return { stop() {} };
    }
};

// 16. Pattern Catcher — sequence with a missing slot, pick the answer.
GAME_IMPLS['pattern-catcher'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-pat-wrap';
        const prompt = document.createElement('div');
        prompt.className = 'mg-pat-prompt';
        prompt.textContent = 'What number is missing?';
        const seq = document.createElement('div');
        seq.className = 'mg-pat-seq';
        const opts = document.createElement('div');
        opts.className = 'mg-pat-opts';
        wrap.appendChild(prompt);
        wrap.appendChild(seq);
        wrap.appendChild(opts);
        ctx.area.appendChild(wrap);

        function nextProblem() {
            // Pick step: 1, 2, 5, or 10
            const step = [1, 2, 2, 5, 5, 10][Math.floor(Math.random() * 6)];
            const start = Math.floor(Math.random() * 8) + 1;
            const nums = [start, start + step, start + step * 2, start + step * 3, start + step * 4];
            const missingIdx = 1 + Math.floor(Math.random() * 3);  // not first or last
            const correct = nums[missingIdx];
            seq.innerHTML = nums.map((n, i) =>
                i === missingIdx ? `<span class="mg-pat-slot">?</span>` : `<span class="mg-pat-num">${n}</span>`
            ).join('<span class="mg-pat-comma">,</span>');
            // Options
            const set = new Set([correct]);
            while (set.size < 3) {
                set.add(Math.max(0, correct + Math.floor(Math.random() * 5) - 2));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-pat-opt" data-correct="${v === correct ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-pat-opt').forEach((b) => {
                b.addEventListener('click', (e) => {
                    if (b.getAttribute('data-correct') === '1') {
                        b.classList.add('mg-pat-right');
                        ctx.onScore(1, { x: e.clientX, y: e.clientY });
                        setTimeout(nextProblem, 350);
                    } else {
                        b.classList.add('mg-pat-wrong');
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
