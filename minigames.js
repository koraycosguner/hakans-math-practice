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
// Power-up state: while active, score gains are multiplied. Refreshed on
// every game start.
let _powerupTimers = [];
let _scoreMultiplier = 1;
let _powerupSpawnTimer = null;

// ===== Phaser loader =====
// Phaser is a ~1MB HTML5 game framework. We lazy-load it on first use of
// a Phaser-based game (only the proper "console-style" games need it —
// the CSS+emoji games don't).
let _phaserLoading = null;
function _ensurePhaser() {
    if (window.Phaser) return Promise.resolve(window.Phaser);
    if (_phaserLoading) return _phaserLoading;
    _phaserLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js';
        s.onload = () => resolve(window.Phaser);
        s.onerror = () => reject(new Error('Failed to load Phaser'));
        document.head.appendChild(s);
    });
    return _phaserLoading;
}

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
    const emojis = ['🎉','⭐','✨','💎','🌟','🎊','💫'];
    const n = count || 10;
    for (let i = 0; i < n; i++) {
        const p = document.createElement('span');
        p.className = 'mg-confetti';
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        const angle = (Math.PI * 2 / n) * i + (Math.random() - 0.5) * 0.5;
        const speed = 80 + Math.random() * 80;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        p.style.setProperty('--dx', dx + 'px');
        p.style.setProperty('--dy', dy + 'px');
        host.appendChild(p);
        setTimeout(() => p.remove(), 1100);
    }

    // Mario-style coin pop alongside the confetti — gives every right answer
    // in every game that satisfying "pop a brick, get a coin" feedback.
    const coin = document.createElement('span');
    coin.className = 'mg-mario-pickup-coin';
    coin.textContent = '🪙';
    coin.style.left = cx + 'px';
    coin.style.top = cy + 'px';
    host.appendChild(coin);
    setTimeout(() => coin.remove(), 1000);
}

// Full-screen confetti shower for game wins. Spawns 36 particles across the
// top of the play area that rain down with varied speeds.
function mgVictoryShower() {
    const host = document.getElementById('mg-play-area');
    if (!host) return;
    const r = host.getBoundingClientRect();
    const emojis = ['🎉','🎊','⭐','🌟','✨','💎','🏆','🥳'];
    for (let i = 0; i < 36; i++) {
        const p = document.createElement('span');
        p.className = 'mg-victory-confetti';
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.left = (Math.random() * r.width) + 'px';
        p.style.top = '-30px';
        p.style.setProperty('--vy', (r.height + 80) + 'px');
        p.style.setProperty('--vrot', (Math.random() * 720 - 360) + 'deg');
        p.style.animationDelay = (Math.random() * 600) + 'ms';
        p.style.animationDuration = (1800 + Math.random() * 800) + 'ms';
        host.appendChild(p);
        setTimeout(() => p.remove(), 3000);
    }
}

function _flashCombo() {
    if (_gameCombo < 3) return;
    const el = document.getElementById('mg-play-score');
    if (!el) return;
    el.classList.add('mg-combo-flash');
    setTimeout(() => el.classList.remove('mg-combo-flash'), 600);
    // At milestone combos, show a big floating overlay — Mario-Kart style.
    if ([3, 5, 7, 10, 15, 20].includes(_gameCombo)) {
        _showComboOverlay(_gameCombo);
    }
}

// Visible combo escalation overlay — a big floating chip that pops in
// from the centre on streak milestones. Different tier = different vibe.
function _showComboOverlay(n) {
    const host = document.getElementById('mg-play-area');
    if (!host) return;
    const tiers = {
        3:  { text: 'COMBO x3!',     emoji: '🔥', tier: 'bronze'    },
        5:  { text: 'COMBO x5!',     emoji: '⚡', tier: 'silver'    },
        7:  { text: 'AWESOME x7!',   emoji: '🌟', tier: 'gold'      },
        10: { text: 'ON FIRE x10!',  emoji: '🤩', tier: 'fire'      },
        15: { text: 'MEGA x15!',     emoji: '🚀', tier: 'mega'      },
        20: { text: 'LEGENDARY x20!', emoji: '👑', tier: 'legendary' },
    };
    const t = tiers[n];
    if (!t) return;
    const chip = document.createElement('div');
    chip.className = 'mg-combo-overlay mg-combo-tier-' + t.tier;
    chip.innerHTML = `
        <span class="mg-combo-overlay-emoji">${t.emoji}</span>
        <span class="mg-combo-overlay-text">${t.text}</span>
    `;
    host.appendChild(chip);
    setTimeout(() => chip.classList.add('mg-combo-overlay-show'), 20);
    setTimeout(() => {
        chip.classList.remove('mg-combo-overlay-show');
        setTimeout(() => chip.remove(), 400);
    }, 1200);
    if (typeof speak === 'function') speak(t.text);
    mgVibrate([40, 30, 40, 30, 60]);
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

// ===== Mid-game milestone toasts =====
// Watch for score crossings of 5/10/20/30/50 and the moment Hakan beats
// his previous best in this game. Each fires a small floating toast.
let _bestBeatenFiredThisRound = false;
function _checkMidGameMilestones(prev, now, g) {
    const milestones = [
        { at: 5,  text: 'NICE! 5 in the bag!',  emoji: '👏' },
        { at: 10, text: 'GREAT! Halfway hero!', emoji: '🙌' },
        { at: 20, text: 'AMAZING — 20 points!', emoji: '🤩' },
        { at: 30, text: 'WOW, 30!',             emoji: '🌟' },
        { at: 50, text: 'INCREDIBLE 50!',       emoji: '🏆' },
    ];
    for (const m of milestones) {
        if (prev < m.at && now >= m.at) {
            _showMidGameToast(m.emoji, m.text);
            return;
        }
    }
    // Beat your record — fires once per round when Hakan crosses prev best
    try {
        if (!_bestBeatenFiredThisRound && g && g.id) {
            const bests = _loadBests();
            const prevBest = bests[g.id] && bests[g.id].score;
            if (prevBest != null && prev <= prevBest && now > prevBest) {
                _bestBeatenFiredThisRound = true;
                _showMidGameToast('🏆', 'NEW BEST! Keep going!');
            }
        }
    } catch (e) {}
}
function _showMidGameToast(emoji, text) {
    const host = document.getElementById('mg-play-area');
    if (!host) return;
    const t = document.createElement('div');
    t.className = 'mg-mid-toast';
    t.innerHTML = `<span class="mg-mid-toast-emoji">${emoji}</span><span class="mg-mid-toast-text">${text}</span>`;
    host.appendChild(t);
    setTimeout(() => t.classList.add('mg-mid-toast-show'), 20);
    setTimeout(() => {
        t.classList.remove('mg-mid-toast-show');
        setTimeout(() => t.remove(), 400);
    }, 1400);
    if (typeof speak === 'function') speak(text);
}

// ===== First-time tutorial overlay =====
// Shows once per game (per-user, persisted in localStorage). Lists the
// game's rules with a friendly mascot + dismiss button. Designed for a
// Grade-1 reader: short rules, big buttons.
const MG_TUTORIAL_KEY = 'hakans-math-game-tutorial-seen';
function _seenGameTutorial(id) {
    try {
        const raw = localStorage.getItem(MG_TUTORIAL_KEY);
        if (!raw) return false;
        const seen = JSON.parse(raw);
        return !!seen[id];
    } catch (e) { return false; }
}
function _markGameTutorialSeen(id) {
    try {
        const raw = localStorage.getItem(MG_TUTORIAL_KEY);
        const seen = raw ? JSON.parse(raw) : {};
        seen[id] = Date.now();
        localStorage.setItem(MG_TUTORIAL_KEY, JSON.stringify(seen));
    } catch (e) {}
}
function _maybeShowFirstTimeTutorial(g) {
    if (!g || !g.id) return;
    if (_seenGameTutorial(g.id)) return;
    if (!g.rules || !g.rules.length) { _markGameTutorialSeen(g.id); return; }
    // Pause the game while the overlay shows
    if (typeof pauseMiniGame === 'function' && !_gamePaused) pauseMiniGame();
    const overlay = document.createElement('div');
    overlay.className = 'mg-tutorial-overlay';
    overlay.innerHTML = `
        <div class="mg-tutorial-card">
            <div class="mg-tutorial-icon">${g.emoji || '🎮'}</div>
            <div class="mg-tutorial-title">How to play</div>
            <div class="mg-tutorial-subtitle">${g.title || ''}</div>
            <ul class="mg-tutorial-rules">
                ${g.rules.slice(0, 5).map((r) => `<li>${r}</li>`).join('')}
            </ul>
            <button class="mg-tutorial-btn">Got it! Let's play 🚀</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.mg-tutorial-btn').addEventListener('click', () => {
        _markGameTutorialSeen(g.id);
        overlay.remove();
        if (typeof resumeMiniGame === 'function' && _gamePaused) resumeMiniGame();
    });
}

// ===== Power-up pickups =====
// Random rare drops that float across the play area. Tap to collect for
// an in-game bonus. Spawned by a background timer started in launchMiniGame.
const POWERUPS = [
    { id: 'time',  emoji: '⏰', label: '+5s',     color: '#3b82f6', apply: () => { _gameDeadlineMs += 5000; }},
    { id: 'mult',  emoji: '⭐', label: '2x for 5s', color: '#fbbf24', apply: () => { _scoreMultiplier = 2; setTimeout(() => { _scoreMultiplier = 1; }, 5000); }},
    { id: 'coin',  emoji: '💎', label: '+5 pts',  color: '#10b981', apply: () => { _gameScore += 5; const el = document.getElementById('mg-play-score'); if (el) el.textContent = 'Score: ' + _gameScore; }},
    { id: 'freeze', emoji: '❄️', label: 'Freeze 3s', color: '#06b6d4', apply: () => { _gameDeadlineMs += 3000; }},
];
function _clearPowerups() {
    if (_powerupSpawnTimer) { clearTimeout(_powerupSpawnTimer); _powerupSpawnTimer = null; }
    _powerupTimers.forEach((t) => clearTimeout(t));
    _powerupTimers = [];
    _scoreMultiplier = 1;
    const host = document.getElementById('mg-play-area');
    if (host) host.querySelectorAll('.mg-powerup').forEach((p) => p.remove());
}
function _schedulePowerupSpawn() {
    if (_powerupSpawnTimer) clearTimeout(_powerupSpawnTimer);
    // Wait 10-22 seconds between drops — rare so they feel special.
    const delay = 10000 + Math.random() * 12000;
    _powerupSpawnTimer = setTimeout(_spawnPowerup, delay);
}
function _spawnPowerup() {
    const host = document.getElementById('mg-play-area');
    if (!host || _gamePaused || !_gameTimer) { _schedulePowerupSpawn(); return; }
    const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    const r = host.getBoundingClientRect();
    const el = document.createElement('button');
    el.className = 'mg-powerup';
    el.style.setProperty('--pu-color', pu.color);
    el.innerHTML = `<span class="mg-powerup-emoji">${pu.emoji}</span><span class="mg-powerup-label">${pu.label}</span>`;
    // Random vertical, drift left-to-right
    el.style.top = (30 + Math.random() * 40) + '%';
    el.style.left = '-12%';
    host.appendChild(el);
    // After 8s, remove if not collected
    const removeTimer = setTimeout(() => { try { el.remove(); } catch {} }, 8400);
    _powerupTimers.push(removeTimer);
    el.addEventListener('click', (e) => {
        if (el.classList.contains('mg-powerup-claimed')) return;
        el.classList.add('mg-powerup-claimed');
        pu.apply();
        try { mgScorePopup(pu.label, e.clientX, e.clientY, 'mg-popup-good'); } catch {}
        try { mgConfettiBurst(e.clientX, e.clientY, 14); } catch {}
        if (typeof playSound === 'function') playSound('correct');
        setTimeout(() => el.remove(), 400);
    });
    _schedulePowerupSpawn();
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
    _bestBeatenFiredThisRound = false;
    _clearPowerups();
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
    // Schedule the first power-up drop. Subsequent drops are scheduled
    // from inside _spawnPowerup after each spawn.
    _schedulePowerupSpawn();

    // Effective config = game config plus current difficulty preference
    const effectiveConfig = Object.assign({}, g.config || {}, { difficulty: loadDifficulty() });

    // First-time tutorial: on Hakan's very first launch of a game, show a
    // friendly "How to play" overlay sourced from the game's `rules` array.
    _maybeShowFirstTimeTutorial(g);

    _activeGame = impl.start({
        area,
        onScore: (delta, opts) => {
            if (_gamePaused) return;
            // Apply active power-up multiplier
            const effective = (delta > 0) ? delta * _scoreMultiplier : delta;
            const prevScore = _gameScore;
            _gameScore += effective;
            if (delta > 0) {
                _gameCombo += 1;
                _flashCombo();
                const multiplierText = _scoreMultiplier > 1 ? ' ⭐2x' : '';
                const comboText = _gameCombo >= 3 ? ` 🔥${_gameCombo}` : '';
                document.getElementById('mg-play-score').textContent = 'Score: ' + _gameScore + comboText + multiplierText;
                const opt = opts || {};
                const showDelta = effective !== delta ? effective : delta;
                mgScorePopup('+' + showDelta, opt.x, opt.y, 'mg-popup-good');
                if (opt.x != null && opt.y != null) {
                    // Scale burst size by combo: 10 normal / 16 hot streak / 22 on fire
                    const burstCount = _gameCombo >= 5 ? 22 : _gameCombo >= 3 ? 16 : 10;
                    mgConfettiBurst(opt.x, opt.y, burstCount);
                }
                if (typeof playSound === 'function') playSound('correct');
                mgVibrate(_gameCombo >= 3 ? [40, 20, 40] : 25);
                // Mid-game milestone toasts
                _checkMidGameMilestones(prevScore, _gameScore, g);
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
            // Show BOTH the time loss AND a quick encouraging chip
            mgScorePopup('-' + seconds + 's', o.x, o.y, 'mg-popup-bad');
            const encouragePool = ['Try again!', 'Almost!', 'Keep going!', 'Hmm…', 'You got this!'];
            const msg = encouragePool[Math.floor(Math.random() * encouragePool.length)];
            // Floats from a little above the tap point so it doesn't overlap
            // the time-loss chip
            mgScorePopup(msg,
                o.x != null ? o.x : null,
                o.y != null ? o.y - 36 : null,
                'mg-popup-encourage'
            );
            if (typeof playSound === 'function') playSound('wrong');
            mgVibrate(80);
            // brief area shake
            const area = document.getElementById('mg-play-area');
            if (area) {
                area.classList.remove('mg-shake'); void area.offsetWidth;
                area.classList.add('mg-shake');
            }
        },
        onWin: () => {
            // Visual reward: full-screen confetti shower over the play area
            // before the game-over modal appears.
            mgVictoryShower();
            _endMiniGame(true);
        },
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
    _clearPowerups();
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

    // Animated stats reveal — each stat counts up / pops in over ~1.5s so the
    // result screen feels like a real video-game results card.
    const scoreEl = document.getElementById('mg-over-score-text');
    const robuxEl = document.getElementById('mg-over-robux');
    const bestScore = prev ? Math.max(_gameScore, prev.score) : _gameScore;
    scoreEl.innerHTML = `<span class="mg-over-stat-label">SCORE</span><span class="mg-over-stat-num" id="mg-over-score-num">0</span>${prev ? `<span class="mg-over-stat-best">best ${bestScore}</span>` : ''}`;
    robuxEl.innerHTML = robuxAwarded > 0
        ? `<span class="mg-over-stat-label">💎 EARNED</span><span class="mg-over-stat-num mg-over-stat-robux" id="mg-over-robux-num">+0</span>`
        : '';
    document.getElementById('mg-play-over').style.display = '';

    // Count up the score
    const scoreNumEl = document.getElementById('mg-over-score-num');
    if (scoreNumEl) {
        const targetScore = _gameScore;
        const startTs = performance.now();
        const dur = 900;
        const step = (now) => {
            const t = Math.min(1, (now - startTs) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            scoreNumEl.textContent = Math.round(targetScore * eased);
            if (t < 1) requestAnimationFrame(step);
            else scoreNumEl.classList.add('mg-over-stat-pop');
        };
        requestAnimationFrame(step);
    }
    // Count up robux after a short delay
    const robuxNumEl = document.getElementById('mg-over-robux-num');
    if (robuxNumEl && robuxAwarded > 0) {
        setTimeout(() => {
            const startTs = performance.now();
            const dur = 700;
            const step = (now) => {
                const t = Math.min(1, (now - startTs) / dur);
                const eased = 1 - Math.pow(1 - t, 3);
                robuxNumEl.textContent = '+' + Math.round(robuxAwarded * eased);
                if (t < 1) requestAnimationFrame(step);
                else robuxNumEl.classList.add('mg-over-stat-pop');
            };
            requestAnimationFrame(step);
        }, 1000);
    }

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

// =====================================================================
// 28. BEE HIVE — Fill the honeycombs! 🐝
// Bees zip out one by one as Hakan solves math; correct answer fills
// one honeycomb cell. Fill all cells → hive complete + bee swarm
// celebration + +5💎.
// =====================================================================
GAME_IMPLS['bee-hive'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const cellCount = diff === 'easy' ? 6 : diff === 'hard' ? 12 : 9;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-bee-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-bee-q';
        wrap.appendChild(qBox);

        // Hive scene
        const scene = document.createElement('div');
        scene.className = 'mg-bee-scene';
        // Flying bees decoration
        for (let i = 0; i < 3; i++) {
            const bee = document.createElement('div');
            bee.className = `mg-bee-fly mg-bee-fly-${i + 1}`;
            bee.textContent = '🐝';
            scene.appendChild(bee);
        }
        // Honeycomb grid
        const comb = document.createElement('div');
        comb.className = 'mg-bee-comb';
        // Pick grid columns by count
        const cols = cellCount <= 6 ? 3 : cellCount <= 9 ? 3 : 4;
        comb.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        const cells = [];
        for (let i = 0; i < cellCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'mg-bee-cell';
            cell.innerHTML = '<div class="mg-bee-hex"></div>';
            comb.appendChild(cell);
            cells.push(cell);
        }
        scene.appendChild(comb);
        wrap.appendChild(scene);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-bee-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-bee-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let filled = 0;

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
            qBox.innerHTML = `<div class="mg-bee-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-bee-eqs">=</span><span class="mg-bee-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-bee-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-bee-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function fillNextCell() {
            // Find first non-filled cell and fill it with honey + bee
            const next = cells.find((c) => !c.classList.contains('mg-bee-cell-full'));
            if (!next) return;
            next.classList.add('mg-bee-cell-full');
            next.innerHTML = '<div class="mg-bee-hex mg-bee-hex-honey"></div><div class="mg-bee-cell-bee">🐝</div>';
            filled += 1;
            prog.innerHTML = `<b>${filled}</b> / ${cellCount} honeycombs filled 🍯`;
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-bee-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                fillNextCell();
                if (filled >= cellCount) {
                    qBox.innerHTML = `<div class="mg-bee-win">🍯 HIVE COMPLETE! +5 💎</div>`;
                    opts.innerHTML = '';
                    scene.classList.add('mg-bee-scene-buzz');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2700);
                    return;
                }
                setTimeout(nextProblem, 600);
            } else {
                btn.classList.add('mg-bee-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-bee-wrong'), 400);
            }
        }

        function reset() {
            filled = 0;
            cells.forEach((c) => {
                c.classList.remove('mg-bee-cell-full');
                c.innerHTML = '<div class="mg-bee-hex"></div>';
            });
            scene.classList.remove('mg-bee-scene-buzz');
            prog.innerHTML = `<b>0</b> / ${cellCount} honeycombs filled 🍯`;
            nextProblem();
        }

        prog.innerHTML = `<b>0</b> / ${cellCount} honeycombs filled 🍯`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 29. ICE CREAM STACK — Stack ice-cream scoops by solving math! 🍦
// Each correct answer adds a scoop in a random colour/flavour on top of
// the cone. Build a tower of 4 / 6 / 8 scoops without dropping it.
// Wrong answer wobbles the tower — too many wrongs and it topples!
// =====================================================================
GAME_IMPLS['ice-cream-stack'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const targetScoops = diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;
        const maxWobble = 3; // allowed wrongs before topple

        const FLAVORS = [
            { name: 'Vanilla',    color: '#fef3c7', dark: '#d6c189' },
            { name: 'Strawberry', color: '#fda4af', dark: '#e11d48' },
            { name: 'Chocolate',  color: '#92400e', dark: '#451a03' },
            { name: 'Mint',       color: '#86efac', dark: '#16a34a' },
            { name: 'Bubblegum',  color: '#f0abfc', dark: '#a21caf' },
            { name: 'Blueberry',  color: '#93c5fd', dark: '#1e40af' },
            { name: 'Lemon',      color: '#fde047', dark: '#a16207' },
        ];

        const wrap = document.createElement('div');
        wrap.className = 'mg-ice-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-ice-q';
        wrap.appendChild(qBox);

        // Stack scene
        const scene = document.createElement('div');
        scene.className = 'mg-ice-scene';
        const stack = document.createElement('div');
        stack.className = 'mg-ice-stack';
        // Cone sits at the bottom
        const cone = document.createElement('div');
        cone.className = 'mg-ice-cone';
        cone.textContent = '🍦';
        // Scoops layer (we'll prepend scoops so the newest is on top)
        const scoops = document.createElement('div');
        scoops.className = 'mg-ice-scoops';
        stack.appendChild(scoops);
        stack.appendChild(cone);
        scene.appendChild(stack);

        // Wobble counter visual
        const wobbleBar = document.createElement('div');
        wobbleBar.className = 'mg-ice-wobble';
        wrap.appendChild(scene);
        wrap.appendChild(wobbleBar);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-ice-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-ice-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let stacked = 0;
        let wobbles = 0;
        const usedFlavors = [];

        function renderWobble() {
            wobbleBar.innerHTML = '';
            for (let i = 0; i < maxWobble; i++) {
                const dot = document.createElement('span');
                dot.className = 'mg-ice-wobble-dot' + (i < wobbles ? ' mg-ice-wobble-dot-on' : '');
                dot.textContent = i < wobbles ? '💔' : '💖';
                wobbleBar.appendChild(dot);
            }
        }

        function addScoop() {
            // Pick a flavour not used immediately above (for visual variety)
            let f;
            do { f = FLAVORS[Math.floor(Math.random() * FLAVORS.length)]; }
            while (usedFlavors[usedFlavors.length - 1] && usedFlavors[usedFlavors.length - 1].name === f.name && FLAVORS.length > 1);
            usedFlavors.push(f);
            const scoop = document.createElement('div');
            scoop.className = 'mg-ice-scoop';
            scoop.style.background = `radial-gradient(circle at 30% 30%, ${f.color} 0%, ${f.dark} 100%)`;
            scoop.style.boxShadow = `inset 0 -6px 0 ${f.dark}66, 0 4px 8px rgba(0,0,0,0.15)`;
            scoop.title = f.name;
            // Insert at top so newest is on top of the stack
            scoops.insertBefore(scoop, scoops.firstChild);
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
            qBox.innerHTML = `<div class="mg-ice-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-ice-eqs">=</span><span class="mg-ice-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-ice-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-ice-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-ice-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                addScoop();
                stacked += 1;
                prog.innerHTML = `<b>${stacked}</b> / ${targetScoops} scoops 🍨`;
                if (stacked >= targetScoops) {
                    qBox.innerHTML = `<div class="mg-ice-win">🍦 TOWER COMPLETE! +5 💎</div>`;
                    opts.innerHTML = '';
                    stack.classList.add('mg-ice-stack-win');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2800);
                    return;
                }
                setTimeout(nextProblem, 600);
            } else {
                btn.classList.add('mg-ice-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                wobbles += 1;
                renderWobble();
                stack.classList.add('mg-ice-stack-wobble');
                setTimeout(() => stack.classList.remove('mg-ice-stack-wobble'), 700);
                if (wobbles >= maxWobble) {
                    // Topple!
                    stack.classList.add('mg-ice-stack-topple');
                    qBox.innerHTML = `<div class="mg-ice-lose">😵 Tower toppled! Try again…</div>`;
                    opts.innerHTML = '';
                    setTimeout(reset, 2200);
                } else {
                    setTimeout(() => btn.classList.remove('mg-ice-wrong'), 400);
                }
            }
        }

        function reset() {
            stacked = 0;
            wobbles = 0;
            usedFlavors.length = 0;
            scoops.innerHTML = '';
            stack.classList.remove('mg-ice-stack-win', 'mg-ice-stack-topple');
            renderWobble();
            prog.innerHTML = `<b>0</b> / ${targetScoops} scoops 🍨`;
            nextProblem();
        }

        renderWobble();
        prog.innerHTML = `<b>0</b> / ${targetScoops} scoops 🍨`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 30. TORTOISE & HARE — 🐢 vs 🐰 race!
// Hakan plays the hare. Each right answer hops the hare forward (3 steps).
// Each wrong answer gives the tortoise a steady plod (1 step). First to
// cross the finish line wins. Track length scales by difficulty.
// =====================================================================
GAME_IMPLS['tortoise-hare'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const trackLen = diff === 'easy' ? 12 : diff === 'hard' ? 24 : 18;
        const hopSize = 3;
        const plodSize = 1;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-trh-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-trh-q';
        wrap.appendChild(qBox);

        // Race scene
        const scene = document.createElement('div');
        scene.className = 'mg-trh-scene';
        scene.innerHTML = `
            <div class="mg-trh-sky">
                <span class="mg-trh-cloud mg-trh-cloud-1">☁️</span>
                <span class="mg-trh-cloud mg-trh-cloud-2">☁️</span>
            </div>
            <div class="mg-trh-track">
                <div class="mg-trh-lane mg-trh-lane-hare">
                    <div class="mg-trh-runner mg-trh-hare">🐰</div>
                </div>
                <div class="mg-trh-lane mg-trh-lane-tort">
                    <div class="mg-trh-runner mg-trh-tort">🐢</div>
                </div>
                <div class="mg-trh-finish">🏁</div>
            </div>
        `;
        wrap.appendChild(scene);

        const hareEl = scene.querySelector('.mg-trh-hare');
        const tortEl = scene.querySelector('.mg-trh-tort');

        const prog = document.createElement('div');
        prog.className = 'mg-trh-prog';
        wrap.appendChild(prog);

        const opts = document.createElement('div');
        opts.className = 'mg-trh-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let harePos = 0;
        let tortPos = 0;
        let done = false;

        function placeRunner(el, pos) {
            const pct = Math.min(100, (pos / trackLen) * 100);
            el.style.left = `${pct}%`;
        }

        function updateProg() {
            prog.innerHTML = `🐰 <b>${harePos}</b> / ${trackLen} &nbsp;&nbsp; 🐢 <b>${tortPos}</b> / ${trackLen}`;
        }

        function genProblem() {
            const op = Math.random() < 0.55 ? '+' : '-';
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
            qBox.innerHTML = `<div class="mg-trh-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-trh-eqs">=</span><span class="mg-trh-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-trh-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-trh-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function checkFinish() {
            if (harePos >= trackLen) {
                done = true;
                qBox.innerHTML = `<div class="mg-trh-win">🐰 HARE WINS! +5 💎</div>`;
                opts.innerHTML = '';
                hareEl.classList.add('mg-trh-hare-cheer');
                ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                ctx.onWin();
                setTimeout(reset, 2800);
                return true;
            }
            if (tortPos >= trackLen) {
                done = true;
                qBox.innerHTML = `<div class="mg-trh-lose">🐢 The tortoise won this round… try again!</div>`;
                opts.innerHTML = '';
                tortEl.classList.add('mg-trh-tort-cheer');
                setTimeout(reset, 2400);
                return true;
            }
            return false;
        }

        function onAnswer(btn, e) {
            if (done) return;
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-trh-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                harePos += hopSize;
                hareEl.classList.add('mg-trh-hare-hop');
                placeRunner(hareEl, harePos);
                setTimeout(() => hareEl.classList.remove('mg-trh-hare-hop'), 400);
                updateProg();
                if (checkFinish()) return;
                setTimeout(nextProblem, 500);
            } else {
                btn.classList.add('mg-trh-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                tortPos += plodSize;
                placeRunner(tortEl, tortPos);
                updateProg();
                if (checkFinish()) return;
                setTimeout(() => btn.classList.remove('mg-trh-wrong'), 400);
            }
        }

        function reset() {
            harePos = 0;
            tortPos = 0;
            done = false;
            placeRunner(hareEl, 0);
            placeRunner(tortEl, 0);
            hareEl.classList.remove('mg-trh-hare-cheer');
            tortEl.classList.remove('mg-trh-tort-cheer');
            updateProg();
            nextProblem();
        }

        placeRunner(hareEl, 0);
        placeRunner(tortEl, 0);
        updateProg();
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 31. SUBMARINE DIVE — Dive deeper to find treasure! 🚢
// Submarine starts at the surface. Each right answer dives one layer
// deeper, passing fish, jellyfish, octopus, then the treasure chest at
// the bottom. Reach the bottom → +5 💎 + treasure burst.
// =====================================================================
GAME_IMPLS['submarine-dive'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const totalLayers = diff === 'easy' ? 5 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        // Ocean creatures per layer (top → bottom)
        const SEA = [
            { emoji: '🐠', name: 'fish' },
            { emoji: '🐡', name: 'puffer fish' },
            { emoji: '🪼', name: 'jellyfish' },
            { emoji: '🐙', name: 'octopus' },
            { emoji: '🦑', name: 'squid' },
            { emoji: '🦐', name: 'shrimp' },
            { emoji: '🦀', name: 'crab' },
            { emoji: '🐚', name: 'shell' },
        ];

        const wrap = document.createElement('div');
        wrap.className = 'mg-sub-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-sub-q';
        wrap.appendChild(qBox);

        // Ocean scene
        const scene = document.createElement('div');
        scene.className = 'mg-sub-scene';
        // Sun
        const sun = document.createElement('div');
        sun.className = 'mg-sub-sun';
        sun.textContent = '☀️';
        scene.appendChild(sun);
        // Layers (built top → bottom)
        const layers = [];
        for (let i = 0; i < totalLayers; i++) {
            const layer = document.createElement('div');
            layer.className = 'mg-sub-layer';
            // Bottom is the darkest
            const shadeT = i / Math.max(1, totalLayers - 1); // 0 → 1
            const lightness = 60 - shadeT * 38;             // 60% → 22%
            layer.style.background = `linear-gradient(180deg, hsl(200 70% ${lightness + 4}%), hsl(210 70% ${lightness - 4}%))`;
            // Decorative creature
            const c = SEA[Math.min(i, SEA.length - 1)];
            const dec = document.createElement('span');
            dec.className = 'mg-sub-dec mg-sub-dec-' + (i % 2 === 0 ? 'l' : 'r');
            dec.textContent = c.emoji;
            layer.appendChild(dec);
            scene.appendChild(layer);
            layers.push(layer);
        }
        // Treasure chest at the bottom
        const treasure = document.createElement('div');
        treasure.className = 'mg-sub-treasure';
        treasure.innerHTML = '💎';
        scene.appendChild(treasure);
        // Submarine (positioned absolutely on top)
        const sub = document.createElement('div');
        sub.className = 'mg-sub-vehicle';
        sub.innerHTML = '🚢';
        scene.appendChild(sub);

        wrap.appendChild(scene);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-sub-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-sub-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let depth = 0;
        const layerHeight = 100 / (totalLayers + 1);

        function placeSub() {
            // The sub sits between layers: depth = 0 means above layer[0]
            const top = depth * layerHeight;
            sub.style.top = `${top}%`;
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
            const nextCreature = SEA[Math.min(depth, SEA.length - 1)];
            qBox.innerHTML =
                `<div class="mg-sub-task">Dive past the ${nextCreature.emoji} ${nextCreature.name}</div>` +
                `<div class="mg-sub-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-sub-eqs">=</span><span class="mg-sub-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-sub-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-sub-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-sub-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                depth += 1;
                placeSub();
                prog.innerHTML = `🌊 Depth: <b>${depth}</b> / ${totalLayers}`;
                if (depth >= totalLayers) {
                    qBox.innerHTML = `<div class="mg-sub-win">💎 TREASURE FOUND! +5 💎</div>`;
                    opts.innerHTML = '';
                    treasure.classList.add('mg-sub-treasure-pop');
                    // Bubble burst
                    for (let i = 0; i < 12; i++) {
                        const bub = document.createElement('span');
                        bub.className = 'mg-sub-bubble';
                        bub.textContent = '🫧';
                        bub.style.left = `${30 + Math.random() * 40}%`;
                        bub.style.animationDelay = `${i * 60}ms`;
                        scene.appendChild(bub);
                        setTimeout(() => bub.remove(), 2400);
                    }
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2800);
                    return;
                }
                setTimeout(nextProblem, 600);
            } else {
                btn.classList.add('mg-sub-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-sub-wrong'), 400);
            }
        }

        function reset() {
            depth = 0;
            placeSub();
            treasure.classList.remove('mg-sub-treasure-pop');
            scene.querySelectorAll('.mg-sub-bubble').forEach((b) => b.remove());
            prog.innerHTML = `🌊 Depth: <b>0</b> / ${totalLayers}`;
            nextProblem();
        }

        placeSub();
        prog.innerHTML = `🌊 Depth: <b>0</b> / ${totalLayers}`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 32. BULLSEYE — Throw the dart at the right answer! 🎯
// Classic dartboard with 4 segments around a bullseye. Each segment has
// a number — Hakan picks the right one. Bullseye on streak 3 = perfect
// throw → +5💎. Combo system: consecutive bullseyes multiply score.
// =====================================================================
GAME_IMPLS['bullseye-darts'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const targetStreak = diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-dart-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-dart-q';
        wrap.appendChild(qBox);

        // Dartboard scene
        const scene = document.createElement('div');
        scene.className = 'mg-dart-scene';
        // Dartboard SVG
        const boardSvg = document.createElement('div');
        boardSvg.className = 'mg-dart-board';
        boardSvg.innerHTML = `
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="95" fill="#0a0a0a" stroke="#1f2937" stroke-width="2"/>
                <circle cx="100" cy="100" r="85" fill="#1e3a8a"/>
                <circle cx="100" cy="100" r="70" fill="#dc2626"/>
                <circle cx="100" cy="100" r="55" fill="#fbbf24"/>
                <circle cx="100" cy="100" r="38" fill="#15803d"/>
                <circle cx="100" cy="100" r="22" fill="#dc2626"/>
                <circle cx="100" cy="100" r="10" fill="#fff"/>
                <circle cx="100" cy="100" r="4" fill="#dc2626"/>
            </svg>
        `;
        scene.appendChild(boardSvg);
        // Dart, hidden until thrown
        const dart = document.createElement('div');
        dart.className = 'mg-dart-dart';
        dart.textContent = '🎯';
        scene.appendChild(dart);
        wrap.appendChild(scene);

        // Streak HUD
        const streakBar = document.createElement('div');
        streakBar.className = 'mg-dart-streak';
        wrap.appendChild(streakBar);

        // Options (4 segments — corresponding to colour zones)
        const opts = document.createElement('div');
        opts.className = 'mg-dart-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let bullseyes = 0;
        let combo = 0;

        function renderStreak() {
            streakBar.innerHTML = '';
            for (let i = 0; i < targetStreak; i++) {
                const dot = document.createElement('span');
                dot.className = 'mg-dart-dot' + (i < bullseyes ? ' mg-dart-dot-on' : '');
                dot.textContent = i < bullseyes ? '🎯' : '⚪';
                streakBar.appendChild(dot);
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
            qBox.innerHTML =
                `<div class="mg-dart-task">Throw the dart at the right answer!</div>` +
                `<div class="mg-dart-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-dart-eqs">=</span><span class="mg-dart-qmark">?</span></div>`;

            // 4 options — bullseye, red ring, green ring, blue ring (visual hint via class)
            const ZONES = ['mg-dart-zone-bullseye', 'mg-dart-zone-red', 'mg-dart-zone-green', 'mg-dart-zone-blue'];
            const set = new Set([target.ans]);
            while (set.size < 4) {
                const d = (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v, i) =>
                `<button class="mg-dart-opt ${ZONES[i]}" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-dart-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function throwDart(success) {
            // Animate dart from off-screen to centre (success) or somewhere off (miss)
            dart.classList.remove('mg-dart-fly-in', 'mg-dart-miss');
            void dart.offsetWidth; // restart animation
            dart.classList.add(success ? 'mg-dart-fly-in' : 'mg-dart-miss');
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-dart-right');
                ctx.onScore(1 + Math.floor(combo / 3), { x: e.clientX, y: e.clientY });
                throwDart(true);
                bullseyes += 1;
                combo += 1;
                renderStreak();
                if (combo >= 3) {
                    qBox.innerHTML += `<div class="mg-dart-combo">🔥 Combo x${combo}!</div>`;
                }
                if (bullseyes >= targetStreak) {
                    setTimeout(() => {
                        qBox.innerHTML = `<div class="mg-dart-win">🎯 PERFECT STREAK! +5 💎</div>`;
                        opts.innerHTML = '';
                        boardSvg.classList.add('mg-dart-board-spin');
                        ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                        ctx.onWin();
                        setTimeout(reset, 2700);
                    }, 500);
                    return;
                }
                setTimeout(nextProblem, 700);
            } else {
                btn.classList.add('mg-dart-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                combo = 0;
                throwDart(false);
                setTimeout(() => btn.classList.remove('mg-dart-wrong'), 400);
            }
        }

        function reset() {
            bullseyes = 0;
            combo = 0;
            boardSvg.classList.remove('mg-dart-board-spin');
            renderStreak();
            nextProblem();
        }

        renderStreak();
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 33. HOT AIR BALLOON — Ride high through the sky! 🎈
// Balloon starts on the meadow. Each right answer rises through one
// atmospheric layer (treetops → birds → clouds → mountain peaks →
// space). Reach the rainbow at the top → +5 💎 + balloon dances.
// =====================================================================
GAME_IMPLS['hot-air-balloon'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const totalLayers = diff === 'easy' ? 5 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        // Layers top → bottom, each describes the scene at this altitude
        const SKY_LAYERS = [
            { name: 'space',     gradient: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', deco: '⭐🪐🌙' },
            { name: 'rainbow',   gradient: 'linear-gradient(180deg, #f9a8d4 0%, #93c5fd 100%)', deco: '🌈' },
            { name: 'peaks',     gradient: 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)', deco: '⛰️🦅' },
            { name: 'high sky',  gradient: 'linear-gradient(180deg, #bfdbfe 0%, #93c5fd 100%)', deco: '☁️☁️' },
            { name: 'clouds',    gradient: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)', deco: '☁️🐦' },
            { name: 'birds',     gradient: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)', deco: '🐦🦜' },
            { name: 'treetops',  gradient: 'linear-gradient(180deg, #d9f99d 0%, #86efac 100%)', deco: '🌳🌲' },
            { name: 'meadow',    gradient: 'linear-gradient(180deg, #bef264 0%, #84cc16 100%)', deco: '🌻🌷' },
        ];
        // Use the last N layers (bottom-anchored), reversed for top → bottom order
        const layers = SKY_LAYERS.slice(-Math.min(totalLayers + 1, SKY_LAYERS.length));

        const wrap = document.createElement('div');
        wrap.className = 'mg-bal-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-bal-q';
        wrap.appendChild(qBox);

        // Sky scene
        const scene = document.createElement('div');
        scene.className = 'mg-bal-scene';
        layers.forEach((l, i) => {
            const layer = document.createElement('div');
            layer.className = 'mg-bal-layer';
            layer.style.background = l.gradient;
            layer.dataset.name = l.name;
            // Spread the decorations
            const decs = l.deco.split('');
            decs.forEach((d, j) => {
                const dec = document.createElement('span');
                dec.className = 'mg-bal-dec';
                dec.textContent = d;
                dec.style.left = `${10 + (j * 28) % 80}%`;
                dec.style.top = `${20 + (j % 2) * 30}%`;
                dec.style.animationDelay = `${j * 700}ms`;
                layer.appendChild(dec);
            });
            scene.appendChild(layer);
        });
        // Trophy at the very top
        const trophy = document.createElement('div');
        trophy.className = 'mg-bal-trophy';
        trophy.textContent = '🏆';
        scene.appendChild(trophy);
        // Balloon (positioned absolutely, animates between bottom and top)
        const balloon = document.createElement('div');
        balloon.className = 'mg-bal-balloon';
        balloon.textContent = '🎈';
        scene.appendChild(balloon);

        wrap.appendChild(scene);

        const prog = document.createElement('div');
        prog.className = 'mg-bal-prog';
        wrap.appendChild(prog);

        const opts = document.createElement('div');
        opts.className = 'mg-bal-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let altitude = 0;

        function placeBalloon() {
            // bottom: 100% (lowest), top: 0%
            const pct = 100 - (altitude / totalLayers) * 95;
            balloon.style.top = `${pct}%`;
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
            const nextLayer = layers[Math.max(0, layers.length - 1 - altitude - 1)];
            qBox.innerHTML =
                (nextLayer ? `<div class="mg-bal-task">Rise up to the ${nextLayer.name}</div>` : '') +
                `<div class="mg-bal-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-bal-eqs">=</span><span class="mg-bal-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-bal-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-bal-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-bal-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                altitude += 1;
                placeBalloon();
                prog.innerHTML = `🎈 Altitude: <b>${altitude}</b> / ${totalLayers}`;
                if (altitude >= totalLayers) {
                    qBox.innerHTML = `<div class="mg-bal-win">🏆 TOP REACHED! +5 💎</div>`;
                    opts.innerHTML = '';
                    balloon.classList.add('mg-bal-balloon-dance');
                    trophy.classList.add('mg-bal-trophy-glow');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2800);
                    return;
                }
                setTimeout(nextProblem, 650);
            } else {
                btn.classList.add('mg-bal-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-bal-wrong'), 400);
            }
        }

        function reset() {
            altitude = 0;
            placeBalloon();
            balloon.classList.remove('mg-bal-balloon-dance');
            trophy.classList.remove('mg-bal-trophy-glow');
            prog.innerHTML = `🎈 Altitude: <b>0</b> / ${totalLayers}`;
            nextProblem();
        }

        placeBalloon();
        prog.innerHTML = `🎈 Altitude: <b>0</b> / ${totalLayers}`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 34. COOKIE BAKER — Bake the right number of cookies! 🍪
// Each round, a baking sheet pre-shows a row of N cookies. Hakan has
// to recognize how many are on the sheet AND match that to the math
// answer. Bake 4/6/8 sheets to fill the bakery shelf. Concrete counting!
// =====================================================================
GAME_IMPLS['cookie-baker'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const trayCount = diff === 'easy' ? 4 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-cook-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-cook-q';
        wrap.appendChild(qBox);

        // Bakery scene: oven + tray + shelf
        const scene = document.createElement('div');
        scene.className = 'mg-cook-scene';
        // Shelf at top — gets filled with baked trays
        const shelf = document.createElement('div');
        shelf.className = 'mg-cook-shelf';
        for (let i = 0; i < trayCount; i++) {
            const slot = document.createElement('div');
            slot.className = 'mg-cook-shelf-slot';
            slot.textContent = '·';
            shelf.appendChild(slot);
        }
        scene.appendChild(shelf);
        // Tray
        const tray = document.createElement('div');
        tray.className = 'mg-cook-tray';
        scene.appendChild(tray);
        // Oven below tray (decorative)
        const oven = document.createElement('div');
        oven.className = 'mg-cook-oven';
        oven.innerHTML = '<span class="mg-cook-oven-fire">🔥</span><span class="mg-cook-oven-door">🚪</span>';
        scene.appendChild(oven);

        wrap.appendChild(scene);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-cook-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-cook-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let trays = 0;
        const slots = shelf.querySelectorAll('.mg-cook-shelf-slot');

        function showCookies(n) {
            tray.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const c = document.createElement('span');
                c.className = 'mg-cook-cookie';
                c.textContent = '🍪';
                c.style.animationDelay = `${i * 60}ms`;
                tray.appendChild(c);
            }
        }

        function genProblem() {
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                const a = 1 + Math.floor(Math.random() * Math.min(maxA, 6));
                const b = 1 + Math.floor(Math.random() * Math.min(maxA, 6));
                return { a, b, ans: a + b, op };
            }
            const a = 3 + Math.floor(Math.random() * maxA);
            const b = 1 + Math.floor(Math.random() * Math.min(a - 1, 5));
            return { a, b, ans: a - b, op };
        }

        function nextProblem() {
            target = genProblem();
            showCookies(target.ans);
            qBox.innerHTML =
                `<div class="mg-cook-task">Count the cookies & pick the math problem 🍪</div>` +
                `<div class="mg-cook-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-cook-eqs">=</span><span class="mg-cook-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-cook-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-cook-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-cook-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                tray.classList.add('mg-cook-tray-bake');
                oven.classList.add('mg-cook-oven-burn');
                setTimeout(() => {
                    tray.classList.remove('mg-cook-tray-bake');
                    oven.classList.remove('mg-cook-oven-burn');
                    // Place a baked tray on the shelf
                    if (trays < slots.length) {
                        slots[trays].classList.add('mg-cook-shelf-slot-full');
                        slots[trays].textContent = '🍪';
                    }
                    trays += 1;
                    prog.innerHTML = `<b>${trays}</b> / ${trayCount} trays baked 🍞`;
                    if (trays >= trayCount) {
                        qBox.innerHTML = `<div class="mg-cook-win">🍞 BAKERY OPEN! +5 💎</div>`;
                        opts.innerHTML = '';
                        scene.classList.add('mg-cook-scene-cheer');
                        ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                        ctx.onWin();
                        setTimeout(reset, 2700);
                        return;
                    }
                    nextProblem();
                }, 700);
            } else {
                btn.classList.add('mg-cook-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-cook-wrong'), 400);
            }
        }

        function reset() {
            trays = 0;
            slots.forEach((s) => {
                s.classList.remove('mg-cook-shelf-slot-full');
                s.textContent = '·';
            });
            scene.classList.remove('mg-cook-scene-cheer');
            prog.innerHTML = `<b>0</b> / ${trayCount} trays baked 🍞`;
            nextProblem();
        }

        prog.innerHTML = `<b>0</b> / ${trayCount} trays baked 🍞`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 35. DINO DIG — Uncover the dinosaur tile by tile! 🦖
// 5x4 grid of dirt tiles hiding a giant dino emoji. Each right answer
// chips away one tile (in scan order) to reveal more of the dino. Reveal
// the whole grid = dino roars + +5 💎.
// =====================================================================
GAME_IMPLS['dino-dig'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const cols = diff === 'easy' ? 4 : diff === 'hard' ? 6 : 5;
        const rows = diff === 'easy' ? 3 : diff === 'hard' ? 5 : 4;
        const totalTiles = cols * rows;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const DINOS = ['🦖', '🦕', '🦎'];
        const dinoEmoji = DINOS[Math.floor(Math.random() * DINOS.length)];

        const wrap = document.createElement('div');
        wrap.className = 'mg-dino-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-dino-q';
        wrap.appendChild(qBox);

        // Dig site: tiles overlaid on big dino
        const site = document.createElement('div');
        site.className = 'mg-dino-site';
        const dinoLayer = document.createElement('div');
        dinoLayer.className = 'mg-dino-figure';
        dinoLayer.textContent = dinoEmoji;
        site.appendChild(dinoLayer);
        const tilesLayer = document.createElement('div');
        tilesLayer.className = 'mg-dino-tiles';
        tilesLayer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        tilesLayer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        const tiles = [];
        const dirtChars = ['🟫', '🪨', '🟫', '🟫', '🪨'];
        for (let i = 0; i < totalTiles; i++) {
            const tile = document.createElement('div');
            tile.className = 'mg-dino-tile';
            tile.textContent = dirtChars[i % dirtChars.length];
            tilesLayer.appendChild(tile);
            tiles.push(tile);
        }
        site.appendChild(tilesLayer);

        wrap.appendChild(site);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-dino-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-dino-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let chipped = 0;

        // Pre-shuffle the reveal order so the dino emerges in a fun pattern
        const revealOrder = [];
        for (let i = 0; i < totalTiles; i++) revealOrder.push(i);
        revealOrder.sort(() => Math.random() - 0.5);

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
            qBox.innerHTML =
                `<div class="mg-dino-task">⛏️ Chip away the dirt!</div>` +
                `<div class="mg-dino-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-dino-eqs">=</span><span class="mg-dino-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-dino-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-dino-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function chipTile() {
            if (chipped >= totalTiles) return;
            const idx = revealOrder[chipped];
            tiles[idx].classList.add('mg-dino-tile-gone');
            // Brief chip-spark
            const spark = document.createElement('span');
            spark.className = 'mg-dino-spark';
            spark.textContent = '✨';
            tiles[idx].appendChild(spark);
            setTimeout(() => spark.remove(), 600);
            chipped += 1;
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-dino-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                chipTile();
                prog.innerHTML = `⛏️ <b>${chipped}</b> / ${totalTiles} tiles chipped`;
                if (chipped >= totalTiles) {
                    qBox.innerHTML = `<div class="mg-dino-win">${dinoEmoji} DINO UNCOVERED! +5 💎</div>`;
                    opts.innerHTML = '';
                    dinoLayer.classList.add('mg-dino-figure-roar');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2700);
                    return;
                }
                setTimeout(nextProblem, 550);
            } else {
                btn.classList.add('mg-dino-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-dino-wrong'), 400);
            }
        }

        function reset() {
            chipped = 0;
            tiles.forEach((t, i) => {
                t.classList.remove('mg-dino-tile-gone');
                t.textContent = dirtChars[i % dirtChars.length];
            });
            // New reveal order each round for replay value
            revealOrder.sort(() => Math.random() - 0.5);
            dinoLayer.classList.remove('mg-dino-figure-roar');
            prog.innerHTML = `⛏️ <b>0</b> / ${totalTiles} tiles chipped`;
            nextProblem();
        }

        prog.innerHTML = `⛏️ <b>0</b> / ${totalTiles} tiles chipped`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 36. MOUNTAIN CLIMB — Climb to the summit! 🏔️
// Climber zigzags up mountain ledges by solving math. Each right answer
// scales one ledge (alternating left/right). Pass alpine creatures along
// the way (goats, eagles). Reach the flag at the summit → +5💎.
// =====================================================================
GAME_IMPLS['mountain-climb'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const totalLedges = diff === 'easy' ? 5 : diff === 'hard' ? 9 : 7;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-mc-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-mc-q';
        wrap.appendChild(qBox);

        // Mountain scene — SVG triangle silhouette + ledges
        const scene = document.createElement('div');
        scene.className = 'mg-mc-scene';
        scene.innerHTML = `
            <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" class="mg-mc-svg" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="mc-sky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#7dd3fc"/>
                        <stop offset="100%" stop-color="#dbeafe"/>
                    </linearGradient>
                    <linearGradient id="mc-rock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#fafaf9"/>
                        <stop offset="40%" stop-color="#a8a29e"/>
                        <stop offset="100%" stop-color="#57534e"/>
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width="200" height="240" fill="url(#mc-sky)"/>
                <polygon points="100,20 175,210 25,210" fill="url(#mc-rock)"/>
                <polygon points="100,20 130,75 70,75" fill="#fff"/>
                <text x="100" y="14" text-anchor="middle" font-size="14">🏁</text>
                <text x="40" y="60" font-size="14">☁️</text>
                <text x="160" y="80" font-size="14">☁️</text>
                <text x="150" y="120" font-size="16">🦅</text>
                <text x="60" y="160" font-size="16">🐐</text>
            </svg>
            <div class="mg-mc-climber">🧗</div>
        `;
        wrap.appendChild(scene);

        const climber = scene.querySelector('.mg-mc-climber');

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-mc-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-mc-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let ledge = 0;

        function placeClimber() {
            // Ledge 0 = base (bottom), ledge totalLedges = summit
            const t = ledge / totalLedges; // 0 → 1
            // bottom edge: y=87%, top edge: y=8%
            const yPct = 87 - t * 79;
            // Alternate left-right as we climb
            const zigzag = (ledge % 2 === 0) ? -1 : 1;
            // The mountain narrows toward the top; horizontal range decreases too
            const horizRange = (1 - t) * 35; // 35% at bottom, 0% at top
            const xPct = 50 + zigzag * horizRange;
            climber.style.top = `${yPct}%`;
            climber.style.left = `${xPct}%`;
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
            qBox.innerHTML =
                `<div class="mg-mc-task">⛰️ Climb up to the next ledge!</div>` +
                `<div class="mg-mc-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-mc-eqs">=</span><span class="mg-mc-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-mc-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-mc-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-mc-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                ledge += 1;
                climber.classList.add('mg-mc-climber-hop');
                placeClimber();
                setTimeout(() => climber.classList.remove('mg-mc-climber-hop'), 600);
                prog.innerHTML = `⛰️ Ledge: <b>${ledge}</b> / ${totalLedges}`;
                if (ledge >= totalLedges) {
                    qBox.innerHTML = `<div class="mg-mc-win">🏁 SUMMIT REACHED! +5 💎</div>`;
                    opts.innerHTML = '';
                    climber.classList.add('mg-mc-climber-cheer');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2800);
                    return;
                }
                setTimeout(nextProblem, 700);
            } else {
                btn.classList.add('mg-mc-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-mc-wrong'), 400);
            }
        }

        function reset() {
            ledge = 0;
            placeClimber();
            climber.classList.remove('mg-mc-climber-cheer');
            prog.innerHTML = `⛰️ Ledge: <b>0</b> / ${totalLedges}`;
            nextProblem();
        }

        placeClimber();
        prog.innerHTML = `⛰️ Ledge: <b>0</b> / ${totalLedges}`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 37. SPACESHIP REPAIR — Fix the panels & launch! 🚀
// Hakan repairs N broken panels on a spaceship by solving math. Each
// right answer fixes one panel (broken → gold). When all panels are
// fixed, countdown to launch → blast off + +5💎.
// =====================================================================
GAME_IMPLS['spaceship-repair'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const panelCount = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 8;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-ship-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-ship-q';
        wrap.appendChild(qBox);

        // Spaceship + panels
        const scene = document.createElement('div');
        scene.className = 'mg-ship-scene';
        // Stars in the background
        for (let i = 0; i < 14; i++) {
            const star = document.createElement('span');
            star.className = 'mg-ship-star';
            star.textContent = '✦';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 3}s`;
            scene.appendChild(star);
        }
        const ship = document.createElement('div');
        ship.className = 'mg-ship-craft';
        ship.innerHTML = '🚀';
        scene.appendChild(ship);
        // Panel grid laid out as a 2-wide column (could be the body of the ship)
        const panelGrid = document.createElement('div');
        panelGrid.className = 'mg-ship-panels';
        const cols = Math.min(4, Math.ceil(panelCount / 2));
        panelGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        const panels = [];
        const BROKEN = ['💥', '⚡', '🔥', '⚙️'];
        for (let i = 0; i < panelCount; i++) {
            const panel = document.createElement('div');
            panel.className = 'mg-ship-panel';
            panel.textContent = BROKEN[i % BROKEN.length];
            panelGrid.appendChild(panel);
            panels.push(panel);
        }
        scene.appendChild(panelGrid);
        wrap.appendChild(scene);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-ship-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-ship-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let repaired = 0;

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
            qBox.innerHTML =
                `<div class="mg-ship-task">🔧 Fix the next panel!</div>` +
                `<div class="mg-ship-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-ship-eqs">=</span><span class="mg-ship-qmark">?</span></div>`;
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const arr = Array.from(set).sort(() => Math.random() - 0.5);
            opts.innerHTML = arr.map((v) =>
                `<button class="mg-ship-opt" data-correct="${v === target.ans ? '1' : '0'}">${v}</button>`
            ).join('');
            opts.querySelectorAll('.mg-ship-opt').forEach((b) => {
                b.addEventListener('click', (e) => onAnswer(b, e));
            });
        }

        function repairNextPanel() {
            const next = panels.find((p) => !p.classList.contains('mg-ship-panel-fixed'));
            if (!next) return;
            next.classList.add('mg-ship-panel-fixed');
            next.textContent = '✅';
            repaired += 1;
        }

        function launchCountdown(then) {
            const seq = ['3…', '2…', '1…', '🚀 LIFTOFF! 🔥'];
            let i = 0;
            const interval = setInterval(() => {
                qBox.innerHTML = `<div class="mg-ship-countdown">${seq[i]}</div>`;
                i += 1;
                if (i >= seq.length) {
                    clearInterval(interval);
                    setTimeout(then, 500);
                }
            }, 600);
        }

        function onAnswer(btn, e) {
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                btn.classList.add('mg-ship-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                repairNextPanel();
                prog.innerHTML = `🔧 <b>${repaired}</b> / ${panelCount} panels fixed`;
                if (repaired >= panelCount) {
                    opts.innerHTML = '';
                    launchCountdown(() => {
                        ship.classList.add('mg-ship-craft-launch');
                        ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                        ctx.onWin();
                        setTimeout(reset, 2200);
                    });
                    return;
                }
                setTimeout(nextProblem, 550);
            } else {
                btn.classList.add('mg-ship-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => btn.classList.remove('mg-ship-wrong'), 400);
            }
        }

        function reset() {
            repaired = 0;
            panels.forEach((p, i) => {
                p.classList.remove('mg-ship-panel-fixed');
                p.textContent = BROKEN[i % BROKEN.length];
            });
            ship.classList.remove('mg-ship-craft-launch');
            prog.innerHTML = `🔧 <b>0</b> / ${panelCount} panels fixed`;
            nextProblem();
        }

        prog.innerHTML = `🔧 <b>0</b> / ${panelCount} panels fixed`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 38. MUSIC NOTE MATCH — Play the song one note at a time! 🎹
// Piano keyboard (C major: C D E F G A B C). Each round shows a math
// problem and 3 keys lit with numbers; tap the right key to play that
// note. Build up 8 notes to play the full scale & win.
// =====================================================================
GAME_IMPLS['music-note-match'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const totalNotes = diff === 'easy' ? 5 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        // C major scale frequencies (Hz)
        const SCALE = [
            { name: 'C', freq: 261.63 },
            { name: 'D', freq: 293.66 },
            { name: 'E', freq: 329.63 },
            { name: 'F', freq: 349.23 },
            { name: 'G', freq: 392.00 },
            { name: 'A', freq: 440.00 },
            { name: 'B', freq: 493.88 },
            { name: 'C2', freq: 523.25 },
        ];

        // Lazy-init audio context (browsers need a gesture)
        let audioCtx = null;
        function playNote(freq, dur = 0.45) {
            try {
                if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + dur);
            } catch {}
        }

        const wrap = document.createElement('div');
        wrap.className = 'mg-mus-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-mus-q';
        wrap.appendChild(qBox);

        // Piano
        const piano = document.createElement('div');
        piano.className = 'mg-mus-piano';
        const noteSlots = [];
        SCALE.forEach((note, i) => {
            const key = document.createElement('div');
            key.className = 'mg-mus-key';
            key.dataset.idx = i;
            const label = document.createElement('span');
            label.className = 'mg-mus-key-label';
            label.textContent = note.name;
            key.appendChild(label);
            piano.appendChild(key);
            noteSlots.push(key);
        });
        wrap.appendChild(piano);

        // Sequence of notes played so far
        const seq = document.createElement('div');
        seq.className = 'mg-mus-seq';
        wrap.appendChild(seq);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-mus-prog';
        wrap.appendChild(prog);

        // Options
        const opts = document.createElement('div');
        opts.className = 'mg-mus-opts';
        wrap.appendChild(opts);

        ctx.area.appendChild(wrap);

        let target = null;
        let played = 0;
        let currentLitKey = null;

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
            // The current "song position" maps to one of the scale keys.
            // Light up that key with the correct answer, plus 2 distractors elsewhere.
            const currentNote = Math.min(played, SCALE.length - 1);
            // Reset all keys
            noteSlots.forEach((k) => {
                k.classList.remove('mg-mus-key-lit', 'mg-mus-key-correct');
                const oldLabel = k.querySelector('.mg-mus-key-num');
                if (oldLabel) oldLabel.remove();
            });

            // Pick 2 distractor positions
            const taken = new Set([currentNote]);
            while (taken.size < 3) {
                taken.add(Math.floor(Math.random() * SCALE.length));
            }
            const positions = Array.from(taken);

            // Build the numbers to display
            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const nums = Array.from(set).sort(() => Math.random() - 0.5);
            // Make sure the answer is on `currentNote`
            if (nums[0] !== target.ans) {
                const idx = nums.indexOf(target.ans);
                [nums[0], nums[idx]] = [nums[idx], nums[0]];
            }
            currentLitKey = currentNote;

            positions.forEach((pos, j) => {
                const key = noteSlots[pos];
                key.classList.add('mg-mus-key-lit');
                const num = document.createElement('span');
                num.className = 'mg-mus-key-num';
                num.textContent = nums[j];
                num.dataset.correct = (pos === currentNote && nums[j] === target.ans) ? '1' : '0';
                num.dataset.note = pos;
                key.appendChild(num);
                key.onclick = (e) => onKeyTap(key, num, e);
            });

            qBox.innerHTML =
                `<div class="mg-mus-task">🎼 Tap the right key to play the next note</div>` +
                `<div class="mg-mus-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-mus-eqs">=</span><span class="mg-mus-qmark">?</span></div>`;
            opts.innerHTML = '';
        }

        function onKeyTap(key, num, e) {
            const correct = num.dataset.correct === '1';
            const noteIdx = parseInt(num.dataset.note, 10);
            if (correct) {
                playNote(SCALE[noteIdx].freq);
                key.classList.add('mg-mus-key-correct');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                // Add to song sequence
                const tag = document.createElement('span');
                tag.className = 'mg-mus-seq-note';
                tag.textContent = SCALE[noteIdx].name;
                seq.appendChild(tag);
                played += 1;
                prog.innerHTML = `🎼 <b>${played}</b> / ${totalNotes} notes played`;
                if (played >= totalNotes) {
                    qBox.innerHTML = `<div class="mg-mus-win">🎵 SONG COMPLETE! +5 💎</div>`;
                    // Play the scale as celebration
                    for (let i = 0; i < SCALE.length; i++) {
                        setTimeout(() => playNote(SCALE[i].freq, 0.35), i * 200);
                    }
                    piano.classList.add('mg-mus-piano-cheer');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2800);
                    return;
                }
                setTimeout(nextProblem, 650);
            } else {
                key.classList.add('mg-mus-key-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => key.classList.remove('mg-mus-key-wrong'), 400);
            }
        }

        function reset() {
            played = 0;
            seq.innerHTML = '';
            piano.classList.remove('mg-mus-piano-cheer');
            noteSlots.forEach((k) => {
                k.classList.remove('mg-mus-key-lit', 'mg-mus-key-correct', 'mg-mus-key-wrong');
                const oldNum = k.querySelector('.mg-mus-key-num');
                if (oldNum) oldNum.remove();
            });
            prog.innerHTML = `🎼 <b>0</b> / ${totalNotes} notes played`;
            nextProblem();
        }

        prog.innerHTML = `🎼 <b>0</b> / ${totalNotes} notes played`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 39. FROG POND — Hop across lily pads to the other side! 🐸
// Frog stands on one shore of a pond. Several lily pads float across,
// each with a number. Tap the lily pad with the right answer → frog
// hops to it (water ripple). Reach the far shore (5/6/8 hops) → win.
// =====================================================================
GAME_IMPLS['frog-pond'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const totalHops = diff === 'easy' ? 5 : diff === 'hard' ? 8 : 6;
        const padsPerRow = 3;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-frog-wrap';

        const qBox = document.createElement('div');
        qBox.className = 'mg-frog-q';
        wrap.appendChild(qBox);

        // Pond scene
        const scene = document.createElement('div');
        scene.className = 'mg-frog-scene';
        // Shore (top)
        const farShore = document.createElement('div');
        farShore.className = 'mg-frog-shore mg-frog-shore-far';
        farShore.innerHTML = '🌳 🌷 🌳 🌷 🌳';
        scene.appendChild(farShore);
        // Pond water
        const pond = document.createElement('div');
        pond.className = 'mg-frog-pond';
        scene.appendChild(pond);
        // Home shore (bottom)
        const homeShore = document.createElement('div');
        homeShore.className = 'mg-frog-shore mg-frog-shore-home';
        homeShore.innerHTML = '🪨 🌿 🪨 🌿 🪨';
        scene.appendChild(homeShore);
        // Frog
        const frog = document.createElement('div');
        frog.className = 'mg-frog-frog';
        frog.textContent = '🐸';
        scene.appendChild(frog);

        wrap.appendChild(scene);

        // Progress
        const prog = document.createElement('div');
        prog.className = 'mg-frog-prog';
        wrap.appendChild(prog);

        // (Options live as lily pads inside the pond)
        ctx.area.appendChild(wrap);

        let target = null;
        let hops = 0;

        function placeFrog() {
            // hops 0 = home shore (bottom), hops totalHops = far shore (top)
            const t = hops / totalHops;
            const bottomPct = 4 + t * 84; // 4% above home → 88% near far shore
            frog.style.bottom = `${bottomPct}%`;
            frog.style.left = '50%';
        }

        function clearPads() {
            pond.querySelectorAll('.mg-frog-pad').forEach((p) => p.remove());
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
            qBox.innerHTML =
                `<div class="mg-frog-task">🐸 Hop to the next lily pad!</div>` +
                `<div class="mg-frog-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-frog-eqs">=</span><span class="mg-frog-qmark">?</span></div>`;
            // Build pads
            clearPads();
            const set = new Set([target.ans]);
            while (set.size < padsPerRow) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const nums = Array.from(set).sort(() => Math.random() - 0.5);
            nums.forEach((n, i) => {
                const pad = document.createElement('div');
                pad.className = 'mg-frog-pad';
                pad.innerHTML = `<span class="mg-frog-pad-lily">🪷</span><span class="mg-frog-pad-num">${n}</span>`;
                pad.style.left = `${15 + i * 32}%`;
                pad.style.animationDelay = `${i * 400}ms`;
                pad.dataset.correct = (n === target.ans) ? '1' : '0';
                pad.onclick = (e) => onPadTap(pad, e);
                pond.appendChild(pad);
            });
        }

        function makeRipple(x, y) {
            const ripple = document.createElement('span');
            ripple.className = 'mg-frog-ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            pond.appendChild(ripple);
            setTimeout(() => ripple.remove(), 1100);
        }

        function onPadTap(pad, e) {
            const correct = pad.dataset.correct === '1';
            const padRect = pad.getBoundingClientRect();
            const pondRect = pond.getBoundingClientRect();
            const rx = padRect.left - pondRect.left + padRect.width / 2;
            const ry = padRect.top - pondRect.top + padRect.height / 2;
            if (correct) {
                pad.classList.add('mg-frog-pad-right');
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                makeRipple(rx, ry);
                hops += 1;
                frog.classList.add('mg-frog-frog-hop');
                placeFrog();
                setTimeout(() => frog.classList.remove('mg-frog-frog-hop'), 600);
                prog.innerHTML = `🐸 Hops: <b>${hops}</b> / ${totalHops}`;
                if (hops >= totalHops) {
                    qBox.innerHTML = `<div class="mg-frog-win">🌳 FAR SHORE! +5 💎</div>`;
                    clearPads();
                    frog.classList.add('mg-frog-frog-cheer');
                    ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    ctx.onWin();
                    setTimeout(reset, 2700);
                    return;
                }
                setTimeout(nextProblem, 700);
            } else {
                pad.classList.add('mg-frog-pad-wrong');
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => pad.classList.remove('mg-frog-pad-wrong'), 400);
            }
        }

        function reset() {
            hops = 0;
            placeFrog();
            frog.classList.remove('mg-frog-frog-cheer');
            prog.innerHTML = `🐸 Hops: <b>0</b> / ${totalHops}`;
            nextProblem();
        }

        placeFrog();
        prog.innerHTML = `🐸 Hops: <b>0</b> / ${totalHops}`;
        nextProblem();
        return { stop() {} };
    }
};

// =====================================================================
// 40. MATH ADVENTURE — Mario-style side-scroller platformer! 🍄
// Hakan-character stands at left on a grassy platform. Sky + clouds +
// distant hills behind, brick-block ground in front. To advance, tap
// the platform with the right math answer. Character jumps up, arcs to
// the platform, lands with a thud. Reach the 🚩 flagpole at the far
// right to clear the level. Wrong = bumps back. Coins spin out of the
// platform on a hit. Lives counter (3 ❤). Game world world: "1-1".
// =====================================================================
GAME_IMPLS['math-adventure'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const totalLevels = diff === 'easy' ? 5 : diff === 'hard' ? 8 : 6;
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-mario-wrap';

        // ===== Mario-style HUD on top =====
        const hud = document.createElement('div');
        hud.className = 'mg-mario-hud';
        hud.innerHTML = `
            <div class="mg-mario-hud-item"><span class="mg-mario-hud-label">WORLD</span><span class="mg-mario-hud-val" id="mario-world">1-1</span></div>
            <div class="mg-mario-hud-item"><span class="mg-mario-hud-label">🪙 COINS</span><span class="mg-mario-hud-val" id="mario-coins">0</span></div>
            <div class="mg-mario-hud-item"><span class="mg-mario-hud-label">❤️ LIVES</span><span class="mg-mario-hud-val" id="mario-lives">3</span></div>
        `;
        wrap.appendChild(hud);

        // ===== Question chip =====
        const qBox = document.createElement('div');
        qBox.className = 'mg-mario-q';
        wrap.appendChild(qBox);

        // ===== Side-scrolling scene =====
        const scene = document.createElement('div');
        scene.className = 'mg-mario-scene';
        scene.innerHTML = `
            <div class="mg-mario-sky">
                <div class="mg-mario-sun">☀️</div>
                <div class="mg-mario-cloud mg-mario-cloud-1">☁️</div>
                <div class="mg-mario-cloud mg-mario-cloud-2">☁️</div>
                <div class="mg-mario-cloud mg-mario-cloud-3">☁️</div>
            </div>
            <div class="mg-mario-hills"></div>
            <div class="mg-mario-bushes">
                <span class="mg-mario-bush" style="left:18%">🌳</span>
                <span class="mg-mario-bush" style="left:48%">🌲</span>
                <span class="mg-mario-bush" style="left:78%">🌳</span>
            </div>
            <div class="mg-mario-track">
                <div class="mg-mario-character" id="mario-hero">🧒</div>
                <div class="mg-mario-platforms" id="mario-platforms"></div>
                <div class="mg-mario-flag">
                    <div class="mg-mario-flag-pole"></div>
                    <div class="mg-mario-flag-banner">🚩</div>
                </div>
            </div>
            <div class="mg-mario-ground"></div>
        `;
        wrap.appendChild(scene);

        ctx.area.appendChild(wrap);

        const hero = scene.querySelector('#mario-hero');
        const platformsEl = scene.querySelector('#mario-platforms');
        const coinsEl = hud.querySelector('#mario-coins');
        const livesEl = hud.querySelector('#mario-lives');
        const worldEl = hud.querySelector('#mario-world');

        let target = null;
        let level = 0;
        let lives = 3;
        let coins = 0;
        let busy = false;

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

        function buildPlatforms() {
            target = genProblem();
            qBox.innerHTML = `<div class="mg-mario-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}<span class="mg-mario-eqs">=</span><span class="mg-mario-qmark">?</span></div>`;

            const set = new Set([target.ans]);
            while (set.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                set.add(Math.max(0, target.ans + d));
            }
            const opts = Array.from(set).sort(() => Math.random() - 0.5);
            platformsEl.innerHTML = opts.map((v, i) =>
                `<button class="mg-mario-platform" data-correct="${v === target.ans ? '1' : '0'}" data-val="${v}" style="--p-i: ${i}">
                    <span class="mg-mario-block">${v}</span>
                </button>`
            ).join('');
            platformsEl.querySelectorAll('.mg-mario-platform').forEach((b) => {
                b.addEventListener('click', (e) => onPick(b, e));
            });
        }

        function spawnCoin(fromEl) {
            const r = fromEl.getBoundingClientRect();
            const sr = scene.getBoundingClientRect();
            const x = r.left + r.width / 2 - sr.left;
            const y = r.top - sr.top;
            const c = document.createElement('span');
            c.className = 'mg-mario-coin';
            c.textContent = '🪙';
            c.style.left = x + 'px';
            c.style.top = y + 'px';
            scene.appendChild(c);
            setTimeout(() => c.remove(), 900);
        }

        function updateHud() {
            coinsEl.textContent = coins;
            livesEl.textContent = lives;
            worldEl.textContent = `1-${level + 1}`;
        }

        function onPick(btn, e) {
            if (busy) return;
            const correct = btn.getAttribute('data-correct') === '1';
            if (correct) {
                busy = true;
                btn.classList.add('mg-mario-platform-hit');
                hero.classList.add('mg-mario-hero-jump');
                spawnCoin(btn);
                coins += 1;
                ctx.onScore(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => hero.classList.remove('mg-mario-hero-jump'), 700);
                setTimeout(() => {
                    level += 1;
                    updateHud();
                    if (level >= totalLevels) {
                        // Reached the flag!
                        scene.classList.add('mg-mario-scene-clear');
                        const heroSlide = document.createElement('div');
                        heroSlide.className = 'mg-mario-hero-slide';
                        heroSlide.textContent = '🧒';
                        scene.appendChild(heroSlide);
                        hero.style.opacity = '0';
                        qBox.innerHTML = `<div class="mg-mario-win">🚩 LEVEL CLEAR! +5 💎</div>`;
                        platformsEl.innerHTML = '';
                        ctx.onScore(5, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                        ctx.onWin();
                        setTimeout(reset, 3000);
                        return;
                    }
                    busy = false;
                    buildPlatforms();
                }, 800);
            } else {
                btn.classList.add('mg-mario-platform-wrong');
                hero.classList.add('mg-mario-hero-bump');
                lives -= 1;
                updateHud();
                ctx.onPenalty(1, { x: e.clientX, y: e.clientY });
                setTimeout(() => {
                    btn.classList.remove('mg-mario-platform-wrong');
                    hero.classList.remove('mg-mario-hero-bump');
                }, 500);
                if (lives <= 0) {
                    qBox.innerHTML = `<div class="mg-mario-lose">💀 GAME OVER — try again!</div>`;
                    platformsEl.innerHTML = '';
                    setTimeout(reset, 2200);
                }
            }
        }

        function reset() {
            level = 0;
            lives = 3;
            coins = 0;
            busy = false;
            scene.classList.remove('mg-mario-scene-clear');
            scene.querySelectorAll('.mg-mario-hero-slide').forEach((e) => e.remove());
            hero.style.opacity = '';
            updateHud();
            buildPlatforms();
        }

        updateHud();
        buildPlatforms();
        return { stop() {} };
    }
};

// =====================================================================
// 41. MATH RUNNER — Temple-Run-style auto-runner! 🏃
// Hakan-character sprints down a 3-lane scrolling road. Coins fly past.
// "Math gates" descend at speed, each gate is split into 3 lanes with
// number signs. To pass the gate cleanly, Hakan has to be in the lane
// with the right answer at the moment it arrives. Wrong lane = crash =
// lose a heart. 3 hearts. Speed ramps up over time. Coins boost score.
// =====================================================================
GAME_IMPLS['math-runner'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;
        const startSpeed = diff === 'easy' ? 90 : diff === 'hard' ? 160 : 120; // px/sec

        // ===== UI: HUD, scene, controls =====
        const wrap = document.createElement('div');
        wrap.className = 'mg-run-wrap';

        const hud = document.createElement('div');
        hud.className = 'mg-run-hud';
        hud.innerHTML = `
            <div class="mg-run-hud-item"><span class="mg-run-hud-label">❤️</span><span class="mg-run-hud-val" id="run-lives">3</span></div>
            <div class="mg-run-hud-item"><span class="mg-run-hud-label">🪙</span><span class="mg-run-hud-val" id="run-coins">0</span></div>
            <div class="mg-run-hud-item"><span class="mg-run-hud-label">⚡</span><span class="mg-run-hud-val" id="run-speed">1x</span></div>
        `;
        wrap.appendChild(hud);

        const qBox = document.createElement('div');
        qBox.className = 'mg-run-q';
        wrap.appendChild(qBox);

        const scene = document.createElement('div');
        scene.className = 'mg-run-scene';
        scene.innerHTML = `
            <div class="mg-run-sky">
                <span class="mg-run-cloud mg-run-cloud-1">☁️</span>
                <span class="mg-run-cloud mg-run-cloud-2">☁️</span>
                <span class="mg-run-cloud mg-run-cloud-3">☁️</span>
            </div>
            <div class="mg-run-road">
                <div class="mg-run-lane-divider mg-run-divider-1"></div>
                <div class="mg-run-lane-divider mg-run-divider-2"></div>
                <div class="mg-run-spawner" id="run-spawner"></div>
                <div class="mg-run-hero" id="run-hero" data-lane="1">🏃</div>
            </div>
        `;
        wrap.appendChild(scene);

        const controls = document.createElement('div');
        controls.className = 'mg-run-controls';
        controls.innerHTML = `
            <button class="mg-run-ctrl mg-run-ctrl-left">⬅️</button>
            <button class="mg-run-ctrl mg-run-ctrl-right">➡️</button>
        `;
        wrap.appendChild(controls);

        ctx.area.appendChild(wrap);

        const heroEl = scene.querySelector('#run-hero');
        const spawner = scene.querySelector('#run-spawner');
        const livesEl = hud.querySelector('#run-lives');
        const coinsEl = hud.querySelector('#run-coins');
        const speedEl = hud.querySelector('#run-speed');

        let lane = 1; // 0,1,2
        let lives = 3;
        let coins = 0;
        let speed = startSpeed;
        let lastSpawnAt = 0;
        let lastTs = 0;
        let raf = null;
        let target = null;
        let stopped = false;
        // Active obstacles: { el, kind: 'gate' | 'coin', y, speed, value, lane, passed, gateGroup }
        const objs = [];

        function setLane(l) {
            lane = Math.max(0, Math.min(2, l));
            heroEl.dataset.lane = String(lane);
        }
        controls.querySelector('.mg-run-ctrl-left').addEventListener('click', () => setLane(lane - 1));
        controls.querySelector('.mg-run-ctrl-right').addEventListener('click', () => setLane(lane + 1));
        // Keyboard support (desktop play)
        const keyHandler = (e) => {
            if (e.key === 'ArrowLeft')  setLane(lane - 1);
            if (e.key === 'ArrowRight') setLane(lane + 1);
        };
        document.addEventListener('keydown', keyHandler);
        // Tap on lanes to switch
        scene.addEventListener('click', (e) => {
            const r = scene.getBoundingClientRect();
            const x = e.clientX - r.left;
            const w = r.width;
            if (x < w / 3) setLane(0);
            else if (x < 2 * w / 3) setLane(1);
            else setLane(2);
        });

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

        function setProblem() {
            target = genProblem();
            qBox.innerHTML = `<span class="mg-run-q-eq">${target.a} ${target.op === '-' ? '−' : '+'} ${target.b} = ?</span>`;
        }

        function spawnGate() {
            const correctLane = Math.floor(Math.random() * 3);
            const ans = target.ans;
            const distractors = new Set([ans]);
            while (distractors.size < 3) {
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                distractors.add(Math.max(0, ans + d));
            }
            const nums = Array.from(distractors).sort(() => Math.random() - 0.5);
            // Make sure the answer lands on `correctLane`
            const ansIdx = nums.indexOf(ans);
            if (ansIdx !== correctLane) {
                [nums[correctLane], nums[ansIdx]] = [nums[ansIdx], nums[correctLane]];
            }
            const gateGroup = {};
            for (let i = 0; i < 3; i++) {
                const el = document.createElement('div');
                el.className = 'mg-run-gate mg-run-gate-l' + i + (nums[i] === ans ? ' mg-run-gate-correct' : '');
                el.textContent = nums[i];
                spawner.appendChild(el);
                objs.push({ el, kind: 'gate', y: -20, lane: i, value: nums[i], correct: nums[i] === ans, passed: false, group: gateGroup });
            }
        }

        function spawnCoin() {
            const l = Math.floor(Math.random() * 3);
            const el = document.createElement('div');
            el.className = 'mg-run-coin mg-run-coin-l' + l;
            el.textContent = '🪙';
            spawner.appendChild(el);
            objs.push({ el, kind: 'coin', y: -20, lane: l, collected: false });
        }

        function loop(ts) {
            if (stopped) return;
            if (!lastTs) lastTs = ts;
            const dt = Math.min(50, ts - lastTs) / 1000;
            lastTs = ts;

            // Slowly ramp up speed
            speed = Math.min(startSpeed * 2.2, speed + dt * 4);
            speedEl.textContent = (speed / startSpeed).toFixed(1) + 'x';

            // Spawn cadence: every ~1.4s minus speed factor
            const interval = Math.max(900, 2200 - (speed - startSpeed) * 6);
            if (ts - lastSpawnAt > interval) {
                lastSpawnAt = ts;
                // 60% chance of gate, 40% coin
                if (Math.random() < 0.6) {
                    if (!target) setProblem();
                    spawnGate();
                } else {
                    spawnCoin();
                }
            }

            // Move objects + check collisions
            const sceneRect = scene.getBoundingClientRect();
            const heroBottom = 16; // px from bottom
            const collideY = sceneRect.height - heroBottom - 70; // hero is ~70px tall
            for (const o of objs) {
                o.y += speed * dt;
                o.el.style.top = o.y + 'px';
                if (!o.passed && o.y > collideY && o.y < collideY + 70) {
                    if (o.lane === lane) {
                        // Collision with hero
                        if (o.kind === 'coin') {
                            o.collected = true;
                            coins += 1;
                            coinsEl.textContent = coins;
                            ctx.onScore(1, {
                                x: sceneRect.left + (sceneRect.width / 3) * (lane + 0.5),
                                y: sceneRect.top + collideY
                            });
                            o.el.classList.add('mg-run-coin-pop');
                            o.passed = true;
                            setTimeout(() => { try { o.el.remove(); } catch {} }, 300);
                        } else if (o.kind === 'gate') {
                            // Only score on the gate the hero hits.
                            // Other gates of this group are skipped.
                            const group = o.group;
                            // Mark whole group as passed
                            objs.forEach((x) => { if (x.group === group) x.passed = true; });
                            if (o.correct) {
                                ctx.onScore(2, {
                                    x: sceneRect.left + (sceneRect.width / 3) * (lane + 0.5),
                                    y: sceneRect.top + collideY
                                });
                                heroEl.classList.add('mg-run-hero-cheer');
                                setTimeout(() => heroEl.classList.remove('mg-run-hero-cheer'), 500);
                                objs.forEach((x) => { if (x.group === group) x.el.classList.add('mg-run-gate-pass'); });
                                // After clearing this problem, set a new one
                                setProblem();
                            } else {
                                lives -= 1;
                                livesEl.textContent = lives;
                                ctx.onPenalty(2, {
                                    x: sceneRect.left + (sceneRect.width / 3) * (lane + 0.5),
                                    y: sceneRect.top + collideY
                                });
                                heroEl.classList.add('mg-run-hero-crash');
                                setTimeout(() => heroEl.classList.remove('mg-run-hero-crash'), 600);
                                objs.forEach((x) => { if (x.group === group) x.el.classList.add('mg-run-gate-bad'); });
                                if (lives <= 0) {
                                    stopped = true;
                                    qBox.innerHTML = '<span class="mg-run-gameover">💀 GAME OVER!</span>';
                                    setTimeout(() => ctx.onWin(), 1400);
                                    return;
                                }
                                setProblem();
                            }
                        }
                    }
                }
            }
            // Remove off-screen objects
            for (let i = objs.length - 1; i >= 0; i--) {
                const o = objs[i];
                if (o.y > sceneRect.height + 40) {
                    try { o.el.remove(); } catch {}
                    objs.splice(i, 1);
                }
            }

            raf = requestAnimationFrame(loop);
        }

        // Boot
        setProblem();
        raf = requestAnimationFrame(loop);

        return {
            stop() {
                stopped = true;
                if (raf) cancelAnimationFrame(raf);
                document.removeEventListener('keydown', keyHandler);
            }
        };
    }
};

// =====================================================================
// 42. MATH DEFENDER — Galaga-style space shooter! 🚀
// Hakan's spaceship at the bottom. Enemy invaders fly down in waves,
// each labelled with a number. Math problem at the top. Tap (or use
// arrows + spacebar) to fire at enemies. Hit the enemy whose number
// matches the answer → BOOM, +2 pts. Wrong = laser passes through.
// Enemy reaches the bottom = -1 life. 3 lives. Star field scrolls.
// =====================================================================
GAME_IMPLS['math-defender'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;
        const startSpeed = diff === 'easy' ? 50 : diff === 'hard' ? 90 : 70;

        const wrap = document.createElement('div');
        wrap.className = 'mg-def-wrap';

        const hud = document.createElement('div');
        hud.className = 'mg-def-hud';
        hud.innerHTML = `
            <div class="mg-def-hud-item"><span class="mg-def-hud-label">❤️</span><span class="mg-def-hud-val" id="def-lives">3</span></div>
            <div class="mg-def-hud-item"><span class="mg-def-hud-label">⚔️</span><span class="mg-def-hud-val" id="def-kills">0</span></div>
            <div class="mg-def-hud-item"><span class="mg-def-hud-label">🌊</span><span class="mg-def-hud-val" id="def-wave">1</span></div>
        `;
        wrap.appendChild(hud);

        const qBox = document.createElement('div');
        qBox.className = 'mg-def-q';
        wrap.appendChild(qBox);

        const scene = document.createElement('div');
        scene.className = 'mg-def-scene';
        scene.innerHTML = `
            <div class="mg-def-stars"></div>
            <div class="mg-def-stars mg-def-stars-2"></div>
            <div class="mg-def-enemies" id="def-enemies"></div>
            <div class="mg-def-lasers" id="def-lasers"></div>
            <div class="mg-def-ship" id="def-ship">🚀</div>
        `;
        wrap.appendChild(scene);

        ctx.area.appendChild(wrap);

        const ship = scene.querySelector('#def-ship');
        const enemiesEl = scene.querySelector('#def-enemies');
        const lasersEl = scene.querySelector('#def-lasers');
        const livesEl = hud.querySelector('#def-lives');
        const killsEl = hud.querySelector('#def-kills');
        const waveEl = hud.querySelector('#def-wave');

        let lives = 3;
        let kills = 0;
        let wave = 1;
        let speed = startSpeed;
        let target = null;
        let lastSpawnAt = 0;
        let lastTs = 0;
        let raf = null;
        let stopped = false;
        let shipX = 50; // percent of scene width
        const enemies = [];   // { el, x, y, value, alive }
        const lasers = [];    // { el, x, y, dir: -1 (up) }
        let lastFireAt = 0;

        function setShipX(pct) {
            shipX = Math.max(8, Math.min(92, pct));
            ship.style.left = shipX + '%';
        }
        setShipX(50);

        // Controls: tap on scene to fire laser from current ship X.
        // Keyboard: arrow keys move, space fires.
        scene.addEventListener('click', (e) => {
            const r = scene.getBoundingClientRect();
            const pct = ((e.clientX - r.left) / r.width) * 100;
            setShipX(pct);
            fireLaser();
        });
        const keyHandler = (e) => {
            if (e.key === 'ArrowLeft')  setShipX(shipX - 8);
            if (e.key === 'ArrowRight') setShipX(shipX + 8);
            if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); fireLaser(); }
        };
        document.addEventListener('keydown', keyHandler);

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
        function setProblem() {
            target = genProblem();
            qBox.innerHTML = `<span class="mg-def-q-eq">⚔️ Target: ${target.a} ${target.op === '-' ? '−' : '+'} ${target.b} = ?</span>`;
        }

        function fireLaser() {
            const now = performance.now();
            if (now - lastFireAt < 220) return; // rate limit
            lastFireAt = now;
            const el = document.createElement('div');
            el.className = 'mg-def-laser';
            const r = scene.getBoundingClientRect();
            el.style.left = shipX + '%';
            // start laser just above ship
            const startY = r.height - 80;
            el.style.top = startY + 'px';
            lasersEl.appendChild(el);
            lasers.push({ el, x: shipX, y: startY });
            if (typeof playSound === 'function') playSound('hop');
        }

        function spawnEnemy() {
            // Wave 1: one enemy at a time. Each wave adds difficulty.
            const xPct = 10 + Math.random() * 80;
            const isTarget = !target ? false : (Math.random() < 0.55 || enemies.filter((e) => e.value === target.ans && e.alive).length === 0);
            let value;
            if (isTarget && target) {
                value = target.ans;
            } else {
                // pick a wrong but plausible number
                const d = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
                value = Math.max(0, (target ? target.ans : 5) + d);
                if (value === (target && target.ans)) value += 1;
            }
            const el = document.createElement('div');
            el.className = 'mg-def-enemy';
            el.innerHTML = `<span class="mg-def-enemy-emoji">${['👾','👽','🛸','👻'][Math.floor(Math.random()*4)]}</span><span class="mg-def-enemy-num">${value}</span>`;
            el.style.left = xPct + '%';
            el.style.top = '-60px';
            enemiesEl.appendChild(el);
            enemies.push({ el, x: xPct, y: -60, value, alive: true });
        }

        function explode(el) {
            const x = el.offsetLeft + el.offsetWidth / 2;
            const y = el.offsetTop + el.offsetHeight / 2;
            const boom = document.createElement('div');
            boom.className = 'mg-def-boom';
            boom.style.left = x + 'px';
            boom.style.top = y + 'px';
            boom.textContent = '💥';
            scene.appendChild(boom);
            setTimeout(() => boom.remove(), 500);
            try { el.remove(); } catch {}
        }

        function loop(ts) {
            if (stopped) return;
            if (!lastTs) lastTs = ts;
            const dt = Math.min(50, ts - lastTs) / 1000;
            lastTs = ts;
            // Slowly ramp speed
            speed = Math.min(startSpeed * 2, speed + dt * 3);

            // Spawn enemies
            const interval = Math.max(800, 2000 - (wave - 1) * 200);
            if (ts - lastSpawnAt > interval) {
                lastSpawnAt = ts;
                spawnEnemy();
                // Every 8 kills, advance wave
                if (kills > 0 && kills % 8 === 0 && parseInt(waveEl.textContent, 10) === wave) {
                    wave += 1;
                    waveEl.textContent = wave;
                    _showMidGameToast('🌊', 'WAVE ' + wave + '!');
                }
            }

            // Move enemies down
            const sceneRect = scene.getBoundingClientRect();
            for (const e of enemies) {
                if (!e.alive) continue;
                e.y += speed * dt;
                e.el.style.top = e.y + 'px';
                // Reached bottom?
                if (e.y > sceneRect.height - 80) {
                    e.alive = false;
                    e.el.classList.add('mg-def-enemy-gone');
                    setTimeout(() => { try { e.el.remove(); } catch {} }, 400);
                    if (e.value === (target && target.ans)) {
                        // Missed the right answer
                        lives -= 1;
                        livesEl.textContent = lives;
                        ctx.onPenalty(2, { x: sceneRect.left + sceneRect.width / 2, y: sceneRect.top + sceneRect.height - 40 });
                        ship.classList.add('mg-def-ship-hit');
                        setTimeout(() => ship.classList.remove('mg-def-ship-hit'), 500);
                        if (lives <= 0) {
                            stopped = true;
                            qBox.innerHTML = '<span class="mg-def-gameover">💀 GAME OVER!</span>';
                            setTimeout(() => ctx.onWin(), 1400);
                            return;
                        }
                        // Pick a new problem when an answer-enemy gets through
                        setProblem();
                    }
                }
            }

            // Move lasers up + check hits
            for (const L of lasers) {
                L.y -= 600 * dt;
                L.el.style.top = L.y + 'px';
                if (L.y < -20) {
                    try { L.el.remove(); } catch {}
                    L.dead = true;
                    continue;
                }
                // Hit detection: laser X close to enemy X, laser Y close to enemy Y
                for (const e of enemies) {
                    if (!e.alive) continue;
                    const ePct = e.x;
                    const dx = Math.abs(L.x - ePct);
                    const eYpx = e.y + 28;
                    const dy = Math.abs(L.y - eYpx);
                    if (dx < 7 && dy < 30) {
                        // Hit!
                        e.alive = false;
                        if (e.value === (target && target.ans)) {
                            ctx.onScore(2, { x: sceneRect.left + (ePct / 100) * sceneRect.width, y: sceneRect.top + eYpx });
                            kills += 1;
                            killsEl.textContent = kills;
                            setProblem();
                        } else {
                            ctx.onPenalty(1, { x: sceneRect.left + (ePct / 100) * sceneRect.width, y: sceneRect.top + eYpx });
                        }
                        explode(e.el);
                        try { L.el.remove(); } catch {}
                        L.dead = true;
                        break;
                    }
                }
            }
            // Cull dead lasers
            for (let i = lasers.length - 1; i >= 0; i--) {
                if (lasers[i].dead) lasers.splice(i, 1);
            }
            // Cull off-screen enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
                if (!enemies[i].alive && !document.body.contains(enemies[i].el)) enemies.splice(i, 1);
            }

            raf = requestAnimationFrame(loop);
        }

        setProblem();
        raf = requestAnimationFrame(loop);

        return {
            stop() {
                stopped = true;
                if (raf) cancelAnimationFrame(raf);
                document.removeEventListener('keydown', keyHandler);
            }
        };
    }
};

// =====================================================================
// 43. DINO MATH JUMP — Chrome-dinosaur-style endless runner! 🦖
// Hakan-character runs across a desert. Obstacles approach from the
// right, each labelled with a number. The math problem at the top picks
// ONE correct answer — Hakan must jump over THAT obstacle. Missing it
// = bump + lose heart. Speed ramps up; distance is the score.
// =====================================================================
GAME_IMPLS['dino-math-jump'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;
        const startSpeed = diff === 'easy' ? 110 : diff === 'hard' ? 200 : 150;

        const wrap = document.createElement('div');
        wrap.className = 'mg-dino2-wrap';

        const hud = document.createElement('div');
        hud.className = 'mg-dino2-hud';
        hud.innerHTML = `
            <div class="mg-dino2-hud-item"><span class="mg-dino2-hud-label">❤️</span><span class="mg-dino2-hud-val" id="d2-lives">3</span></div>
            <div class="mg-dino2-hud-item"><span class="mg-dino2-hud-label">🏆</span><span class="mg-dino2-hud-val" id="d2-distance">0m</span></div>
            <div class="mg-dino2-hud-item"><span class="mg-dino2-hud-label">⚡</span><span class="mg-dino2-hud-val" id="d2-speed">1x</span></div>
        `;
        wrap.appendChild(hud);

        const qBox = document.createElement('div');
        qBox.className = 'mg-dino2-q';
        wrap.appendChild(qBox);

        const scene = document.createElement('div');
        scene.className = 'mg-dino2-scene';
        scene.innerHTML = `
            <div class="mg-dino2-sky">
                <span class="mg-dino2-sun">☀️</span>
                <span class="mg-dino2-cloud mg-dino2-cloud-1">☁️</span>
                <span class="mg-dino2-cloud mg-dino2-cloud-2">☁️</span>
            </div>
            <div class="mg-dino2-mountains"></div>
            <div class="mg-dino2-ground"></div>
            <div class="mg-dino2-obstacles" id="d2-obstacles"></div>
            <div class="mg-dino2-dino" id="d2-dino">🦖</div>
        `;
        wrap.appendChild(scene);

        const ctrl = document.createElement('div');
        ctrl.className = 'mg-dino2-controls';
        ctrl.innerHTML = `<button class="mg-dino2-jump">⬆️ JUMP</button>`;
        wrap.appendChild(ctrl);

        ctx.area.appendChild(wrap);

        const dino = scene.querySelector('#d2-dino');
        const obsEl = scene.querySelector('#d2-obstacles');
        const livesEl = hud.querySelector('#d2-lives');
        const distEl = hud.querySelector('#d2-distance');
        const speedEl = hud.querySelector('#d2-speed');

        let lives = 3;
        let distance = 0;
        let speed = startSpeed;
        let lastSpawnAt = 0;
        let lastTs = 0;
        let raf = null;
        let stopped = false;
        let target = null;
        let isJumping = false;
        const obs = [];

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
        function setProblem() {
            target = genProblem();
            qBox.innerHTML = `<span class="mg-dino2-q-eq">Jump over: <b>${target.a} ${target.op === '-' ? '−' : '+'} ${target.b}</b></span>`;
        }

        function jump() {
            if (isJumping) return;
            isJumping = true;
            dino.classList.add('mg-dino2-dino-jump');
            setTimeout(() => {
                dino.classList.remove('mg-dino2-dino-jump');
                isJumping = false;
            }, 700);
        }
        scene.addEventListener('click', jump);
        ctrl.querySelector('.mg-dino2-jump').addEventListener('click', (e) => { e.stopPropagation(); jump(); });
        const dinoKey = (e) => {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Spacebar') {
                e.preventDefault();
                jump();
            }
        };
        document.addEventListener('keydown', dinoKey);

        const OBSTACLE_EMOJI = ['🌵', '🪨', '🦂', '🌵'];
        function spawnObstacle() {
            const ans = target ? target.ans : 5;
            const isAnswer = Math.random() < 0.5;
            const value = isAnswer ? ans : Math.max(0, ans + (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1));
            const el = document.createElement('div');
            el.className = 'mg-dino2-obstacle';
            el.innerHTML = `<span class="mg-dino2-obs-emoji">${OBSTACLE_EMOJI[Math.floor(Math.random() * OBSTACLE_EMOJI.length)]}</span><span class="mg-dino2-obs-num">${value}</span>`;
            el.style.right = '-60px';
            obsEl.appendChild(el);
            obs.push({ el, x: 0, value, passed: false, isAnswer: value === ans });
        }

        function loop2(ts) {
            if (stopped) return;
            if (!lastTs) lastTs = ts;
            const dt = Math.min(50, ts - lastTs) / 1000;
            lastTs = ts;
            speed = Math.min(startSpeed * 2.5, speed + dt * 5);
            distance += speed * dt * 0.1;
            distEl.textContent = Math.round(distance) + 'm';
            speedEl.textContent = (speed / startSpeed).toFixed(1) + 'x';

            const interval = Math.max(900, 2100 - (speed - startSpeed) * 4);
            if (ts - lastSpawnAt > interval) {
                lastSpawnAt = ts;
                spawnObstacle();
            }

            const sceneRect = scene.getBoundingClientRect();
            const dinoLeft = 14;
            const dinoWidth = 10;
            for (const o of obs) {
                o.x += speed * dt;
                o.el.style.right = (o.x - 60) + 'px';
                const obsRightPx = sceneRect.width - (o.x - 60);
                const obsRightPct = (obsRightPx / sceneRect.width) * 100;
                if (!o.passed && obsRightPct < dinoLeft + dinoWidth && obsRightPct > dinoLeft - 4) {
                    o.passed = true;
                    if (o.isAnswer) {
                        if (isJumping) {
                            ctx.onScore(2, {
                                x: sceneRect.left + (dinoLeft / 100) * sceneRect.width,
                                y: sceneRect.top + sceneRect.height - 80,
                            });
                            o.el.classList.add('mg-dino2-obs-cleared');
                            setProblem();
                        } else {
                            lives -= 1;
                            livesEl.textContent = lives;
                            ctx.onPenalty(2, {
                                x: sceneRect.left + (dinoLeft / 100) * sceneRect.width,
                                y: sceneRect.top + sceneRect.height - 80,
                            });
                            dino.classList.add('mg-dino2-dino-hit');
                            setTimeout(() => dino.classList.remove('mg-dino2-dino-hit'), 600);
                            o.el.classList.add('mg-dino2-obs-hit');
                            if (lives <= 0) {
                                stopped = true;
                                qBox.innerHTML = '<span class="mg-dino2-gameover">💀 GAME OVER — ' + Math.round(distance) + 'm</span>';
                                setTimeout(() => ctx.onWin(), 1400);
                                return;
                            }
                            setProblem();
                        }
                    } else {
                        if (isJumping) o.el.classList.add('mg-dino2-obs-cleared');
                    }
                }
            }
            for (let i = obs.length - 1; i >= 0; i--) {
                if (obs[i].x > sceneRect.width + 100) {
                    try { obs[i].el.remove(); } catch {}
                    obs.splice(i, 1);
                }
            }
            raf = requestAnimationFrame(loop2);
        }

        setProblem();
        raf = requestAnimationFrame(loop2);

        return {
            stop() {
                stopped = true;
                if (raf) cancelAnimationFrame(raf);
                document.removeEventListener('keydown', dinoKey);
            }
        };
    }
};

// =====================================================================
// 44. MATH PLATFORMER PRO — Real game-engine platformer using Phaser! 🎮
// Hand-coded animated character (no emoji), real arcade physics (gravity
// + jumps + collisions), side-scrolling camera, tile-based ground.
// Built as a proof-of-concept that CSS+emoji games hit a ceiling and
// real-game look needs canvas + game-engine.
// =====================================================================
GAME_IMPLS['math-platformer-pro'] = {
    start(ctx) {
        const diff = (ctx.config && ctx.config.difficulty) || 'normal';
        const maxA = diff === 'easy' ? 5 : diff === 'hard' ? 10 : 9;

        const wrap = document.createElement('div');
        wrap.className = 'mg-pp-wrap';

        // HUD (DOM overlay — drawn on top of the Phaser canvas)
        const hud = document.createElement('div');
        hud.className = 'mg-pp-hud';
        hud.innerHTML = `
            <div class="mg-pp-hud-item mg-pp-hud-hearts" id="pp-hearts">
                <span class="mg-pp-heart mg-pp-heart-full">❤️</span>
                <span class="mg-pp-heart mg-pp-heart-full">❤️</span>
                <span class="mg-pp-heart mg-pp-heart-full">❤️</span>
                <span class="mg-pp-heart mg-pp-heart-empty">🤍</span>
                <span class="mg-pp-heart mg-pp-heart-empty">🤍</span>
            </div>
            <div class="mg-pp-hud-item"><span class="mg-pp-hud-label">🪙</span><span class="mg-pp-hud-val" id="pp-coins">0</span></div>
            <div class="mg-pp-hud-item"><span class="mg-pp-hud-label">📍</span><span class="mg-pp-hud-val" id="pp-dist">0m</span></div>
        `;
        wrap.appendChild(hud);

        const canvasHost = document.createElement('div');
        canvasHost.className = 'mg-pp-canvas-host';
        canvasHost.id = 'mg-pp-canvas-' + Date.now();
        // Question banner + fullscreen button live INSIDE the canvas host so
        // they remain visible when the host goes fullscreen.
        canvasHost.innerHTML = `
            <div class="mg-pp-q-overlay" id="pp-q-overlay">
                <span class="mg-pp-q-label">JUMP THE BRICK THAT EQUALS:</span>
                <span class="mg-pp-q-eq" id="pp-q-text">Loading…</span>
            </div>
            <button class="mg-pp-fs-btn" id="pp-fs-btn" title="Fullscreen">⛶ Fullscreen</button>
        `;
        wrap.appendChild(canvasHost);

        const ctrlBar = document.createElement('div');
        ctrlBar.className = 'mg-pp-controls';
        ctrlBar.innerHTML = `<button class="mg-pp-jump-btn">⬆️ JUMP / DOUBLE-JUMP</button>`;
        wrap.appendChild(ctrlBar);

        ctx.area.appendChild(wrap);

        // Heart HUD renderer: visualises lives as ❤️ + 🤍 placeholders. Adds
        // pop classes for the most-recently-changed slot. On 'gain' also
        // flashes the entire HUD gold so the change is unmissable, even when
        // Hakan's eyes are on the bricks.
        function _renderHearts(current, max, change) {
            const wrap = document.getElementById('pp-hearts');
            if (!wrap) return;
            let html = '';
            for (let i = 0; i < max; i++) {
                if (i < current) {
                    const popCls = change === 'gain' && i === current - 1 ? ' mg-pp-heart-gain' : '';
                    html += `<span class="mg-pp-heart mg-pp-heart-full${popCls}">❤️</span>`;
                } else {
                    const popCls = change === 'lose' && i === current ? ' mg-pp-heart-lose' : '';
                    html += `<span class="mg-pp-heart mg-pp-heart-empty${popCls}">🤍</span>`;
                }
            }
            wrap.innerHTML = html;
            // Whole-HUD gold pulse on gain (force animation restart by
            // toggling the class with a reflow in between)
            if (change === 'gain' || change === 'max') {
                const hud = wrap.closest('.mg-pp-hud');
                if (hud) {
                    hud.classList.remove('mg-pp-hud-flash');
                    void hud.offsetWidth;
                    hud.classList.add('mg-pp-hud-flash');
                }
            }
        }

        // Web Audio synth for game SFX — short generated tones, no asset files.
        let _audioCtx = null;
        function _ac() {
            if (!_audioCtx) {
                try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
            }
            return _audioCtx;
        }
        function _sfx(type) {
            const ac = _ac();
            if (!ac) return;
            const t0 = ac.currentTime;
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain).connect(ac.destination);
            gain.gain.setValueAtTime(0.0001, t0);
            if (type === 'jump') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(280, t0);
                osc.frequency.exponentialRampToValueAtTime(540, t0 + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
                osc.start(t0); osc.stop(t0 + 0.2);
            } else if (type === 'coin') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(880, t0);
                osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
                osc.start(t0); osc.stop(t0 + 0.24);
            } else if (type === 'bonk') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(160, t0);
                osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.12);
                gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
                osc.start(t0); osc.stop(t0 + 0.2);
            } else if (type === 'wrong') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, t0);
                osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
                osc.start(t0); osc.stop(t0 + 0.34);
            } else if (type === 'win') {
                // ascending arpeggio
                const notes = [523, 659, 784, 1046];
                notes.forEach((f, i) => {
                    const o2 = ac.createOscillator();
                    const g2 = ac.createGain();
                    o2.connect(g2).connect(ac.destination);
                    o2.type = 'square';
                    o2.frequency.value = f;
                    const start = t0 + i * 0.12;
                    g2.gain.setValueAtTime(0.0001, start);
                    g2.gain.exponentialRampToValueAtTime(0.16, start + 0.01);
                    g2.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
                    o2.start(start); o2.stop(start + 0.2);
                });
                osc.stop(t0);
            }
        }

        // Loading state while Phaser loads
        const loadingEl = document.createElement('div');
        loadingEl.className = 'mg-pp-loading';
        loadingEl.textContent = '⚙️ Loading game engine…';
        canvasHost.appendChild(loadingEl);

        let game = null;
        let sceneRef = null;
        let stopped = false;

        _ensurePhaser().then((Phaser) => {
            if (stopped) return;
            loadingEl.remove();

            // ===== Phaser scene =====
            class PlatformScene extends Phaser.Scene {
                constructor() { super('platform'); }
                init() {
                    this.lives = 3;
                    this.maxLives = 5;
                    this.coins = 0;
                    this.distance = 0;
                    this.target = null;
                    this.problemQ = '';
                    this.acceptingHit = true;
                    this.jumpsRemaining = 0;
                    this.endHandled = false;
                    // Grace timer to keep auto-miss from firing while Hakan
                    // is still leaving a brick he just answered.
                    this._lastHitAt = 0;
                    // Combo streak for consecutive correct answers
                    this.streak = 0;
                    // Invulnerability frames after enemy damage
                    this.isInvulnerable = false;
                }
                preload() {
                    // No external assets — we build everything procedurally.
                }
                create() {
                    const W = this.scale.width;
                    const H = this.scale.height;
                    const WORLD_W = 7200;

                    // === Sky gradient (the camera scroll-factors below give parallax) ===
                    const skyGfx = this.add.graphics();
                    skyGfx.fillGradientStyle(0x60a5fa, 0x60a5fa, 0xa5b4fc, 0xa5b4fc, 1);
                    skyGfx.fillRect(0, 0, WORLD_W, H);
                    skyGfx.setScrollFactor(0);

                    // === Sun ===
                    const sun = this.add.circle(140, 90, 32, 0xfde047);
                    sun.setScrollFactor(0.1);
                    const sunHalo = this.add.circle(140, 90, 48, 0xfde047, 0.3);
                    sunHalo.setScrollFactor(0.1);

                    // Subtle distant mountains
                    const farHills = this.add.graphics();
                    farHills.fillStyle(0x64748b, 0.55);
                    for (let x = 0; x < WORLD_W; x += 360) {
                        farHills.fillTriangle(x, H - 90, x + 180, H - 200, x + 360, H - 90);
                    }
                    farHills.setScrollFactor(0.3);

                    // Mid hills (green)
                    const midHills = this.add.graphics();
                    midHills.fillStyle(0x16a34a, 0.85);
                    for (let x = 0; x < WORLD_W; x += 280) {
                        midHills.fillEllipse(x + 140, H - 70, 280, 130);
                    }
                    midHills.setScrollFactor(0.5);

                    // Drifting clouds (manual movement so they always face forward)
                    this.cloudsGroup = this.add.group();
                    for (let i = 0; i < 10; i++) {
                        const cx = 200 + Math.random() * (WORLD_W - 400);
                        const cy = 50 + Math.random() * 80;
                        const cloud = this.add.graphics();
                        cloud.fillStyle(0xffffff, 0.92);
                        cloud.fillCircle(0, 0, 20);
                        cloud.fillCircle(18, -7, 16);
                        cloud.fillCircle(32, 3, 18);
                        cloud.fillCircle(-14, 5, 14);
                        cloud.setPosition(cx, cy);
                        cloud.setScrollFactor(0.4);
                        cloud.driftSpeed = 0.08 + Math.random() * 0.12;
                        this.cloudsGroup.add(cloud);
                    }

                    // === Decorative bushes + mushrooms on the grass line ===
                    const decor = this.add.graphics();
                    decor.setScrollFactor(1);
                    const groundY = H - 60;
                    // Bushes (rounded green clumps)
                    decor.fillStyle(0x14532d);
                    for (let x = 120; x < WORLD_W; x += 200 + Math.random() * 160) {
                        const bx = x;
                        const by = groundY - 16;
                        decor.fillCircle(bx, by, 14);
                        decor.fillCircle(bx + 12, by - 3, 12);
                        decor.fillCircle(bx + 24, by, 14);
                    }
                    // Mushrooms (red caps)
                    decor.fillStyle(0xdc2626);
                    decor.lineStyle(2, 0x7f1d1d, 1);
                    for (let x = 90; x < WORLD_W; x += 320 + Math.random() * 200) {
                        const mx = x;
                        const my = groundY - 6;
                        decor.fillTriangle(mx - 10, my, mx + 10, my, mx, my - 16);
                    }

                    // === Ground tiles (visual + physics) ===
                    this.ground = this.physics.add.staticGroup();
                    for (let x = 0; x < WORLD_W; x += 40) {
                        // Dirt body
                        const t = this.add.rectangle(x + 20, groundY + 30, 40, 60, 0x92400e);
                        t.setStrokeStyle(2, 0x78350f);
                        // Random lighter dirt blotch for texture
                        if (Math.random() < 0.35) {
                            this.add.circle(x + 20 + (Math.random() - 0.5) * 20, groundY + 30 + (Math.random() - 0.5) * 30, 3, 0xb45309, 0.55);
                        }
                        // Grass top cap
                        this.add.rectangle(x + 20, groundY, 40, 10, 0x16a34a);
                        // Grass tufts
                        if (Math.random() < 0.3) {
                            this.add.triangle(x + 10 + Math.random() * 20, groundY - 4, 0, 0, 4, -8, 8, 0, 0x166534);
                        }
                        this.physics.add.existing(t, true);
                        this.ground.add(t);
                    }

                    // === Player Character (Mario-style: bigger, cuter, more detail) ===
                    const player = this.add.container(80, groundY - 50);

                    // Drawing order: back-to-front. Larger overall sprite so
                    // details read at a distance.
                    // ARMS (behind body), red sleeve color
                    const armL  = this.add.rectangle(-13, -8, 6, 18, 0xef4444).setOrigin(0.5, 0);
                    const armR  = this.add.rectangle( 13, -8, 6, 18, 0xef4444).setOrigin(0.5, 0);
                    armL.setStrokeStyle(1, 0x991b1b);
                    armR.setStrokeStyle(1, 0x991b1b);
                    // GLOVES (white circles at the end of arms)
                    const handL = this.add.circle(-13, 12, 5, 0xffffff);
                    const handR = this.add.circle( 13, 12, 5, 0xffffff);
                    handL.setStrokeStyle(1.5, 0x4b5563);
                    handR.setStrokeStyle(1.5, 0x4b5563);

                    // BODY/SHIRT (red, visible top portion)
                    const shirt = this.add.rectangle(0, -8, 26, 16, 0xef4444);
                    shirt.setStrokeStyle(2, 0x991b1b);

                    // OVERALLS (blue, lower body + 2 straps)
                    const overalls = this.add.rectangle(0, 8, 26, 22, 0x2563eb);
                    overalls.setStrokeStyle(2, 0x1e3a8a);
                    const strapL = this.add.rectangle(-7, -6, 4, 16, 0x2563eb);
                    const strapR = this.add.rectangle( 7, -6, 4, 16, 0x2563eb);
                    strapL.setStrokeStyle(1, 0x1e3a8a);
                    strapR.setStrokeStyle(1, 0x1e3a8a);
                    // Big yellow buttons (gold) on the straps
                    const buttonL = this.add.circle(-7, 0, 2.4, 0xfbbf24);
                    const buttonR = this.add.circle( 7, 0, 2.4, 0xfbbf24);
                    buttonL.setStrokeStyle(1, 0xb45309);
                    buttonR.setStrokeStyle(1, 0xb45309);

                    // LEGS (blue) — origin at top so they swing from the hip
                    const legL = this.add.rectangle(-6, 18, 8, 16, 0x1e3a8a).setOrigin(0.5, 0);
                    const legR = this.add.rectangle( 6, 18, 8, 16, 0x1e3a8a).setOrigin(0.5, 0);
                    legL.setStrokeStyle(1, 0x172554);
                    legR.setStrokeStyle(1, 0x172554);
                    // SHOES (brown rectangles at the end of the legs)
                    const shoeL = this.add.rectangle(-6, 34, 12, 6, 0x4a2c1a).setOrigin(0.5, 0);
                    const shoeR = this.add.rectangle( 6, 34, 12, 6, 0x4a2c1a).setOrigin(0.5, 0);
                    shoeL.setStrokeStyle(1, 0x1f1308);
                    shoeR.setStrokeStyle(1, 0x1f1308);

                    // HEAD (bigger, rounder)
                    const head = this.add.circle(0, -24, 14, 0xfcd5b4);
                    head.setStrokeStyle(2, 0xc6a087);
                    // EARS
                    const earL = this.add.circle(-13, -22, 3, 0xfcd5b4);
                    const earR = this.add.circle( 13, -22, 3, 0xfcd5b4);
                    // EYES — white sclera + black pupil
                    const eyeWL = this.add.ellipse(-4, -26, 5, 6, 0xffffff);
                    const eyeWR = this.add.ellipse( 4, -26, 5, 6, 0xffffff);
                    const eyeL  = this.add.circle(-4, -25, 2, 0x000000);
                    const eyeR  = this.add.circle( 4, -25, 2, 0x000000);
                    // NOSE (round, slightly down)
                    const nose = this.add.circle(0, -21, 3.2, 0xf9a474);
                    nose.setStrokeStyle(1, 0xc6a087);
                    // MUSTACHE — a single curved-ish shape made of two rectangles
                    const stachL = this.add.rectangle(-4, -17, 7, 3, 0x3b1f10);
                    const stachR = this.add.rectangle( 4, -17, 7, 3, 0x3b1f10);
                    // MOUTH (small dark smile under mustache)
                    const mouth = this.add.rectangle(0, -14, 6, 1.5, 0x3b1f10);
                    // SIDEBURNS (small brown patches by ears)
                    const sideL = this.add.rectangle(-12, -22, 4, 5, 0x3b1f10);
                    const sideR = this.add.rectangle( 12, -22, 4, 5, 0x3b1f10);

                    // CAP — red with white "M" logo circle at front
                    const cap = this.add.rectangle(0, -34, 28, 10, 0xdc2626);
                    cap.setStrokeStyle(2, 0x7f1d1d);
                    const capBrim = this.add.rectangle(7, -29, 16, 4, 0xdc2626);
                    capBrim.setStrokeStyle(1, 0x7f1d1d);
                    // White circle on the cap front, with red "M" inside
                    const capDisc = this.add.circle(2, -33, 5, 0xffffff);
                    capDisc.setStrokeStyle(1, 0x7f1d1d);
                    const capLogo = this.add.text(2, -33, 'M', {
                        fontFamily: 'Courier New, monospace',
                        fontSize: '8px',
                        fontStyle: 'bold',
                        color: '#dc2626',
                    }).setOrigin(0.5);

                    player.add([
                        // back layer (limbs behind body)
                        armL, armR, handL, handR,
                        legL, legR, shoeL, shoeR,
                        // body
                        shirt, overalls, strapL, strapR, buttonL, buttonR,
                        // head
                        earL, earR, head,
                        sideL, sideR,
                        eyeWL, eyeWR, eyeL, eyeR,
                        nose, stachL, stachR, mouth,
                        // cap (in front of head)
                        cap, capBrim, capDisc, capLogo,
                    ]);

                    this.physics.world.enable(player);
                    const body = player.body;
                    body.setSize(28, 76);
                    body.setOffset(-14, -42);
                    body.setCollideWorldBounds(false);
                    body.setMaxVelocity(280, 1200);
                    this.physics.add.collider(player, this.ground);
                    this.player = player;
                    this.playerLimbs = { armL, armR, legL, legR, shoeL, shoeR };

                    // Run-cycle: legs and arms swing in opposite phases
                    this.runTween = this.tweens.add({
                        targets: [legL, shoeL, armR],
                        rotation: { from: -0.45, to: 0.45 },
                        duration: 200, yoyo: true, repeat: -1,
                    });
                    this.runTween2 = this.tweens.add({
                        targets: [legR, shoeR, armL],
                        rotation: { from: 0.45, to: -0.45 },
                        duration: 200, yoyo: true, repeat: -1,
                    });

                    // Auto-run right — Grade-1 pace. Slower than the previous
                    // 140 px/s so a 6-year-old has time to read the math
                    // problem AND plan a jump.
                    body.setVelocityX(95);

                    // Camera follows
                    this.cameras.main.setBounds(0, 0, WORLD_W, H);
                    this.cameras.main.startFollow(player, true, 0.1, 0);

                    // Input
                    this.input.keyboard.on('keydown-SPACE', () => this.tryJump());
                    this.input.keyboard.on('keydown-UP', () => this.tryJump());
                    this.input.on('pointerdown', () => this.tryJump());
                    ctrlBar.querySelector('.mg-pp-jump-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.tryJump();
                    });

                    // === Math blocks — ordered list of question groups ===
                    // Spacing is now ~900px between triplets (was 360px) so a
                    // first-grader has ~9 seconds at 95 px/s to read the
                    // equation and time the jump.
                    this.qBlocks = this.physics.add.staticGroup();
                    this.groupList = [];
                    this.currentGroupIdx = -1;
                    const blockY = groundY - 125;
                    let idxCounter = 0;
                    for (let x = 480; x < WORLD_W - 280; x += 900) {
                        const set = this.makeQuestionGroup(x, blockY);
                        const groupEntry = { blocks: set.blocks, idx: idxCounter, cx: x };
                        set.blocks.forEach((b) => {
                            b._meta.idx = idxCounter;
                            this.qBlocks.add(b);
                        });
                        this.groupList.push(groupEntry);
                        idxCounter += 1;
                    }
                    this.physics.add.collider(this.player, this.qBlocks, (playerObj, block) => {
                        if (!block._meta) return;
                        if (block._meta.done) return;
                        if (!block._meta.canHit) return;
                        if (playerObj.body.velocity.y >= 0) return;
                        this.handleBlockHit(block);
                    });

                    // === Heart pickups in the gaps between brick groups ===
                    // Alternate single-jump-low and double-jump-high so the
                    // double-jump skill stays useful and Hakan has more chances
                    // to recover hearts mid-run.
                    this.heartPickupsGroup = this.physics.add.staticGroup();
                    for (let i = 0; i < this.groupList.length - 1; i++) {
                        // ~75% spawn rate so hearts feel like a treat, not wallpaper
                        if (Math.random() > 0.75) continue;
                        const leftG = this.groupList[i];
                        const rightG = this.groupList[i + 1];
                        const hx = (leftG.cx + rightG.cx) / 2;
                        // Alternate every other gap: low (1-jump) vs high (2-jump)
                        const isHigh = (i % 2 === 1);
                        const hy = isHigh ? (groundY - 175) : (groundY - 70);
                        // Build a chunky heart: triangle base + two round lobes
                        const heart = this.add.container(hx, hy);
                        const HC = 0xec4899; // hot pink
                        const HS = 0xbe185d; // darker stroke
                        const tip = this.add.triangle(0, 4, -14, -3, 14, -3, 0, 14, HC);
                        tip.setStrokeStyle(2, HS);
                        const lobeL = this.add.circle(-7, -4, 9, HC);
                        lobeL.setStrokeStyle(2, HS);
                        const lobeR = this.add.circle( 7, -4, 9, HC);
                        lobeR.setStrokeStyle(2, HS);
                        const shine = this.add.circle(-4, -7, 2.5, 0xffffff, 0.9);
                        heart.add([tip, lobeL, lobeR, shine]);
                        // Soft glow halo behind
                        const halo = this.add.circle(hx, hy, 22, HC, 0.2);
                        // Invisible overlap box for the static group
                        const hbox = this.add.rectangle(hx, hy, 30, 30, 0xffffff, 0);
                        this.physics.add.existing(hbox, true);
                        hbox._heart = heart;
                        hbox._halo = halo;
                        hbox._isHigh = isHigh;
                        this.heartPickupsGroup.add(hbox);
                        // Bob up/down so they look alive
                        this.tweens.add({
                            targets: [heart, halo],
                            y: { from: hy - 5, to: hy + 5 },
                            duration: 750, yoyo: true, repeat: -1,
                            ease: 'Sine.easeInOut',
                        });
                        // Gentle rock so the eye catches them
                        this.tweens.add({
                            targets: heart,
                            angle: { from: -10, to: 10 },
                            duration: 1100, yoyo: true, repeat: -1,
                            ease: 'Sine.easeInOut',
                        });
                        // Halo pulse
                        this.tweens.add({
                            targets: halo,
                            scale: { from: 0.9, to: 1.3 },
                            alpha: { from: 0.18, to: 0.34 },
                            duration: 900, yoyo: true, repeat: -1,
                        });
                        // Hint arrows under high hearts so Hakan knows to double-jump
                        if (isHigh) {
                            const hint = this.add.text(hx, hy + 32, '⬆⬆', {
                                fontFamily: 'Courier New, monospace',
                                fontSize: '12px', fontStyle: 'bold',
                                color: '#ec4899',
                                stroke: '#ffffff', strokeThickness: 2,
                            }).setOrigin(0.5);
                            this.tweens.add({
                                targets: hint,
                                alpha: { from: 0.5, to: 1 },
                                duration: 600, yoyo: true, repeat: -1,
                            });
                            hbox._hint = hint;
                        }
                    }
                    this.physics.add.overlap(this.player, this.heartPickupsGroup, (playerObj, hbox) => {
                        if (hbox._collected) return;
                        hbox._collected = true;
                        const gained = this.lives < this.maxLives;
                        if (gained) {
                            this.lives = Math.min(this.maxLives, this.lives + 1);
                            _renderHearts(this.lives, this.maxLives, 'gain');
                        }
                        _sfx('coin');
                        // Floating "+1 ❤️" (or "❤️ MAX" if we're capped) — use
                        // a system font that can fall back to emoji glyphs.
                        const gainText = this.add.text(hbox.x, hbox.y - 12, gained ? '+1 ❤️' : '❤️ MAX', {
                            fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",Arial,sans-serif',
                            fontSize: '24px', fontStyle: 'bold',
                            color: gained ? '#ec4899' : '#fbbf24',
                            stroke: '#ffffff', strokeThickness: 5,
                        }).setOrigin(0.5).setDepth(200);
                        this.tweens.add({
                            targets: gainText,
                            y: gainText.y - 50, alpha: 0, scale: 1.6,
                            duration: 900, ease: 'Quad.easeOut',
                            onComplete: () => { try { gainText.destroy(); } catch {} }
                        });
                        // 6-spark pink burst
                        for (let i = 0; i < 6; i++) {
                            const a = (Math.PI * 2 / 6) * i;
                            const sx = hbox.x + Math.cos(a) * 8;
                            const sy = hbox.y + Math.sin(a) * 8;
                            const spark = this.add.star(sx, sy, 5, 3, 6, gained ? 0xec4899 : 0xfde047);
                            this.tweens.add({
                                targets: spark,
                                x: sx + Math.cos(a) * 40,
                                y: sy + Math.sin(a) * 40,
                                alpha: 0, scale: 0, angle: 360,
                                duration: 600,
                                onComplete: () => { try { spark.destroy(); } catch {} }
                            });
                        }
                        // Pop the heart out of existence
                        this.tweens.add({
                            targets: [hbox._heart, hbox._halo],
                            scale: 2.2, alpha: 0,
                            duration: 350, ease: 'Quad.easeOut',
                            onComplete: () => {
                                try { hbox._heart.destroy(); } catch {}
                                try { hbox._halo.destroy(); } catch {}
                                try { if (hbox._hint) hbox._hint.destroy(); } catch {}
                                try { hbox.destroy(); } catch {}
                            }
                        });
                    });

                    // === Coins floating in the air ===
                    this.coinsGroup = this.physics.add.staticGroup();
                    for (let x = 220; x < WORLD_W - 100; x += 180) {
                        if (Math.random() < 0.65) {
                            const cx = x + (Math.random() - 0.5) * 60;
                            const cy = groundY - 60 - Math.random() * 60;
                            const coin = this.add.circle(cx, cy, 9, 0xfbbf24);
                            coin.setStrokeStyle(2, 0xb45309);
                            const inner = this.add.circle(cx, cy, 5, 0xfde047);
                            this.physics.add.existing(coin, true);
                            coin._inner = inner;
                            this.coinsGroup.add(coin);
                            // Coin spin (flat then full)
                            this.tweens.add({
                                targets: [coin, inner],
                                scaleX: { from: 1, to: 0.25 },
                                duration: 500, yoyo: true, repeat: -1,
                            });
                        }
                    }
                    this.physics.add.overlap(this.player, this.coinsGroup, (playerObj, coin) => {
                        if (coin._collected) return;
                        coin._collected = true;
                        this.coins += 1;
                        const el = document.getElementById('pp-coins');
                        if (el) el.textContent = this.coins;
                        try { ctx.onScore(1, { x: 0, y: 0 }); } catch {}
                        _sfx('coin');
                        this.tweens.add({
                            targets: [coin, coin._inner],
                            scale: 2,
                            alpha: 0,
                            y: '-=24',
                            duration: 350,
                            onComplete: () => { try { coin.destroy(); coin._inner.destroy(); } catch {} }
                        });
                    });

                    // === Enemies (math goblins) ===
                    // Slow patrolling goblins between brick groups. Stomp from
                    // above for coins + bounce; touch from the side and lose a
                    // heart (with 1.5s invulnerability blink). Skip the first
                    // gap so Hakan has time to settle in.
                    this.enemiesGroup = this.physics.add.group();
                    for (let i = 1; i < this.groupList.length; i++) {
                        if (Math.random() > 0.6) continue; // 60% spawn rate per gap
                        // Place 280-360px past the previous brick group's center
                        const baseX = this.groupList[i - 1].cx + 280 + Math.random() * 80;
                        const enemy = this.makeEnemy(baseX, groundY - 22);
                        this.enemiesGroup.add(enemy);
                    }
                    this.physics.add.collider(this.enemiesGroup, this.ground);
                    this.physics.add.overlap(this.player, this.enemiesGroup, (playerObj, enemy) => {
                        if (enemy._dead) return;
                        if (this.isInvulnerable) return;
                        // Stomp = player is clearly falling onto enemy from above.
                        const playerBottom = playerObj.y + 38;
                        const enemyTop = enemy.y - 16;
                        const fallingOntoEnemy = playerObj.body.velocity.y > 60 && playerBottom < enemyTop + 24;
                        if (fallingOntoEnemy) {
                            enemy._dead = true;
                            if (enemy._patrolTween) enemy._patrolTween.stop();
                            // Squish + fade
                            this.tweens.add({
                                targets: enemy,
                                scaleY: 0.2,
                                alpha: 0,
                                y: enemy.y + 14,
                                duration: 320,
                                onComplete: () => { try { enemy.destroy(); } catch {} }
                            });
                            // Bounce player up
                            playerObj.body.setVelocityY(-360);
                            // Reward: 3 coins + score
                            this.coins += 3;
                            const el = document.getElementById('pp-coins');
                            if (el) el.textContent = this.coins;
                            try { ctx.onScore(3, { x: 0, y: 0 }); } catch {}
                            _sfx('bonk'); _sfx('coin');
                            // Floating "+3 🪙" text
                            const t = this.add.text(enemy.x, enemy.y - 30, '+3 🪙', {
                                fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",Arial,sans-serif',
                                fontSize: '22px', fontStyle: 'bold',
                                color: '#fbbf24',
                                stroke: '#7c2d12', strokeThickness: 5,
                            }).setOrigin(0.5).setDepth(200);
                            this.tweens.add({
                                targets: t,
                                y: t.y - 60, alpha: 0, scale: 1.4,
                                duration: 800,
                                onComplete: () => { try { t.destroy(); } catch {} }
                            });
                            // Tiny star burst for the stomp
                            for (let s = 0; s < 5; s++) {
                                const a = (Math.PI * 2 / 5) * s;
                                const spark = this.add.star(enemy.x, enemy.y - 6, 5, 3, 6, 0xfde047);
                                this.tweens.add({
                                    targets: spark,
                                    x: enemy.x + Math.cos(a) * 30,
                                    y: enemy.y - 6 + Math.sin(a) * 30,
                                    alpha: 0, scale: 0, angle: 360,
                                    duration: 500,
                                    onComplete: () => { try { spark.destroy(); } catch {} }
                                });
                            }
                        } else {
                            // DAMAGE: lose a heart with iframes + knockback
                            this.isInvulnerable = true;
                            this.lives -= 1;
                            _renderHearts(this.lives, this.maxLives, 'lose');
                            this.streak = 0; // breaks the combo too
                            _sfx('wrong');
                            try { ctx.onPenalty(2, { x: 0, y: 0 }); } catch {}
                            // Knockback (sideways + up)
                            const kbDir = playerObj.x < enemy.x ? -1 : 1;
                            playerObj.body.setVelocityX(kbDir * 220);
                            playerObj.body.setVelocityY(-260);
                            // Red flash overlay (Container can't be tinted directly)
                            const dmgFlash = this.add.rectangle(playerObj.x, playerObj.y, 50, 80, 0xef4444, 0.55);
                            dmgFlash.setDepth(150);
                            this.tweens.add({
                                targets: dmgFlash,
                                alpha: 0, duration: 350,
                                onComplete: () => { try { dmgFlash.destroy(); } catch {} }
                            });
                            // Blink: alternate alpha for 1.5s
                            this.tweens.add({
                                targets: playerObj,
                                alpha: 0.3,
                                duration: 100, yoyo: true, repeat: 7,
                                onComplete: () => { try { playerObj.alpha = 1; } catch {} }
                            });
                            this.time.delayedCall(1500, () => {
                                this.isInvulnerable = false;
                                try { playerObj.alpha = 1; } catch {}
                            });
                            if (this.lives <= 0) this.handleGameOver();
                        }
                    });

                    // === Flag at the end ===
                    const flagX = WORLD_W - 80;
                    // Tall metal pole
                    const pole = this.add.rectangle(flagX, groundY - 60, 4, 120, 0xcbd5e1);
                    pole.setStrokeStyle(1, 0x64748b);
                    // Ball on top
                    this.add.circle(flagX, groundY - 122, 6, 0xfbbf24);
                    // Triangle banner
                    const banner = this.add.triangle(
                        flagX + 16, groundY - 110,
                        0, 0,  28, 10,  0, 22,
                        0xef4444
                    );
                    banner.setStrokeStyle(1, 0x991b1b);
                    this.tweens.add({
                        targets: banner,
                        scaleX: { from: 1, to: 0.7 },
                        duration: 700, yoyo: true, repeat: -1,
                    });
                    // Trigger zone — a wider invisible rect just in front of the pole
                    this.flag = this.add.rectangle(flagX, groundY - 60, 12, 120, 0xffffff, 0);
                    this.physics.add.existing(this.flag, true);
                    this.physics.add.overlap(this.player, this.flag, () => this.handleFlagReached(), null, this);

                    // Question banner lives in the DOM overlay (visible in
                    // fullscreen). this.bannerEq stays null — nextProblem()
                    // handles a missing banner.
                    this.bannerEq = null;

                    // First problem
                    this.nextProblem();
                }

                makeQuestionGroup(cx, cy) {
                    // 3 Mario ? blocks side-by-side. Bigger and more detailed
                    // than the first revision: outer gold square + brown stroke,
                    // inset for 3D, 4 corner studs, big number text.
                    const blocks = [];
                    const SIZE = 56;
                    const SPACING = 64;
                    const group = []; // shared array reference for the triplet
                    for (let i = 0; i < 3; i++) {
                        const bx = cx + (i - 1) * SPACING;
                        const outer = this.add.rectangle(bx, cy, SIZE, SIZE, 0xfbbf24);
                        outer.setStrokeStyle(4, 0x7c2d12);
                        const inset = this.add.rectangle(bx, cy, SIZE - 10, SIZE - 10, 0xf59e0b, 1);
                        inset.setStrokeStyle(2, 0xb45309, 0.85);
                        // Inner highlight (top-left subtle gloss)
                        const gloss = this.add.rectangle(bx - SIZE / 4, cy - SIZE / 4, SIZE / 3, 4, 0xfde047, 0.7);
                        // Corner studs (rivets)
                        const studs = [
                            this.add.circle(bx - SIZE / 2 + 8, cy - SIZE / 2 + 8, 2.5, 0x7c2d12),
                            this.add.circle(bx + SIZE / 2 - 8, cy - SIZE / 2 + 8, 2.5, 0x7c2d12),
                            this.add.circle(bx - SIZE / 2 + 8, cy + SIZE / 2 - 8, 2.5, 0x7c2d12),
                            this.add.circle(bx + SIZE / 2 - 8, cy + SIZE / 2 - 8, 2.5, 0x7c2d12),
                        ];
                        const txt = this.add.text(bx, cy, '?', {
                            fontFamily: 'Courier New, monospace',
                            fontSize: '30px',
                            fontStyle: 'bold',
                            color: '#7c2d12',
                            stroke: '#fde047',
                            strokeThickness: 3,
                        }).setOrigin(0.5);
                        // Pulse animation while alive
                        const pulse = this.tweens.add({
                            targets: outer,
                            scale: { from: 1, to: 1.05 },
                            duration: 700, yoyo: true, repeat: -1,
                        });
                        this.physics.add.existing(outer, true);
                        outer._numText = txt;
                        outer._inset = inset;
                        outer._gloss = gloss;
                        outer._studs = studs;
                        outer._pulse = pulse;
                        outer._meta = { laneIdx: i, canHit: false, group, cx: bx, cy: cy, done: false };
                        group.push(outer);
                        blocks.push(outer);
                    }
                    return { blocks };
                }

                // Procedural "math goblin" — purple body, white eyes, brown brow
                // and feet. Dynamic physics, gravity, walks back and forth.
                makeEnemy(x, y) {
                    const c = this.add.container(x, y);
                    const body = this.add.rectangle(0, 0, 28, 28, 0x6d28d9);
                    body.setStrokeStyle(2, 0x4c1d95);
                    const eyeL = this.add.circle(-6, -4, 4, 0xffffff);
                    const eyeR = this.add.circle( 6, -4, 4, 0xffffff);
                    const pupilL = this.add.circle(-6, -4, 2, 0x000000);
                    const pupilR = this.add.circle( 6, -4, 2, 0x000000);
                    // Angry brow
                    const browL = this.add.rectangle(-7, -11, 7, 2.5, 0x3b1f10);
                    const browR = this.add.rectangle( 7, -11, 7, 2.5, 0x3b1f10);
                    browL.setRotation(-0.3);
                    browR.setRotation(0.3);
                    // Mouth (small jagged line)
                    const mouth = this.add.rectangle(0, 6, 10, 2.5, 0x3b1f10);
                    // Feet
                    const footL = this.add.rectangle(-7, 15, 7, 5, 0x3b1f10);
                    const footR = this.add.rectangle( 7, 15, 7, 5, 0x3b1f10);
                    // Two tiny horns on top for that goblin look
                    const hornL = this.add.triangle(-9, -16, 0, 0, 5, 0, 2, -6, 0x4c1d95);
                    const hornR = this.add.triangle( 9, -16, 0, 0, 5, 0, 2, -6, 0x4c1d95);
                    c.add([hornL, hornR, body, browL, browR, eyeL, eyeR, pupilL, pupilR, mouth, footL, footR]);
                    this.physics.world.enable(c);
                    const b = c.body;
                    b.setSize(28, 36);
                    b.setOffset(-14, -18);
                    b.setVelocityX(-30);
                    b.setCollideWorldBounds(false);
                    c._patrolDir = -1;
                    c._patrolMinX = x - 70;
                    c._patrolMaxX = x + 70;
                    // Subtle walk-cycle: alternate foot lift
                    c._patrolTween = this.tweens.add({
                        targets: footL, y: { from: 15, to: 11 },
                        duration: 260, yoyo: true, repeat: -1,
                    });
                    this.tweens.add({
                        targets: footR, y: { from: 11, to: 15 },
                        duration: 260, yoyo: true, repeat: -1,
                    });
                    // Body bob in time with feet
                    this.tweens.add({
                        targets: body, y: { from: 0, to: -1 },
                        duration: 260, yoyo: true, repeat: -1,
                    });
                    return c;
                }

                tryJump() {
                    if (!this.player) return;
                    const body = this.player.body;
                    const grounded = body.blocked.down || body.touching.down;
                    if (grounded) {
                        // First (ground) jump
                        body.setVelocityY(-460);
                        this.jumpsRemaining = 1; // one more in the air
                        _sfx('jump');
                        this.tweens.add({
                            targets: [this.playerLimbs.legL, this.playerLimbs.legR, this.playerLimbs.shoeL, this.playerLimbs.shoeR],
                            rotation: 0, duration: 120, yoyo: true,
                        });
                    } else if (this.jumpsRemaining > 0) {
                        // Double-jump in mid-air — slightly weaker, with a
                        // visible spin so it feels intentional.
                        body.setVelocityY(-380);
                        this.jumpsRemaining -= 1;
                        _sfx('jump');
                        // Full backflip spin on the whole player
                        this.tweens.add({
                            targets: this.player,
                            angle: { from: 0, to: 360 },
                            duration: 360,
                            ease: 'Cubic.easeOut',
                            onComplete: () => { try { this.player.angle = 0; } catch {} },
                        });
                        // Burst a few sparkles where the double-jump fired
                        for (let i = 0; i < 5; i++) {
                            const px = this.player.x + (Math.random() - 0.5) * 30;
                            const py = this.player.y + 18 + Math.random() * 6;
                            const spark = this.add.circle(px, py, 3, 0xfde047);
                            this.tweens.add({
                                targets: spark,
                                y: '+=24', alpha: 0,
                                duration: 350,
                                onComplete: () => spark.destroy(),
                            });
                        }
                    }
                }

                // Dynamic difficulty: scale problem range based on remaining
                // hearts so Hakan never gets stuck — easier when he's hurting,
                // harder when he's healthy.
                currentMaxA() {
                    // baseline `maxA` comes from the closure
                    const base = maxA;
                    const lives = this.lives;
                    if (lives <= 1) return Math.max(2, Math.floor(base * 0.4));   // 40% of base
                    if (lives <= 2) return Math.max(3, Math.floor(base * 0.65));  // 65% of base
                    if (lives >= 5) return Math.min(12, base + 2);                // bonus difficulty
                    if (lives >= 4) return Math.min(11, base + 1);
                    return base;
                }
                nextProblem() {
                    const mA = this.currentMaxA();
                    // When hurting badly (1 ❤️), only use addition — subtraction
                    // is harder mentally for first-graders.
                    const op = (this.lives <= 1 ? '+' : (Math.random() < 0.5 ? '+' : '-'));
                    let a, b, ans;
                    if (op === '+') {
                        a = 1 + Math.floor(Math.random() * mA);
                        b = 1 + Math.floor(Math.random() * mA);
                        ans = a + b;
                    } else {
                        a = 2 + Math.floor(Math.random() * mA);
                        b = 1 + Math.floor(Math.random() * a);
                        ans = a - b;
                    }
                    this.target = { a, b, op, ans };
                    const eqStr = `${a} ${op === '-' ? '−' : '+'} ${b} = ?`;
                    if (this.bannerEq) this.bannerEq.setText(eqStr);
                    const qEl = document.getElementById('pp-q-text');
                    if (qEl) qEl.textContent = eqStr;

                    // === Deterministic next-group lookup ===
                    // Pick the FIRST group in the ordered list whose idx is past
                    // the current one AND whose center is in front of the player.
                    const playerX = this.player ? this.player.x : 0;
                    let pickedGroup = null;
                    for (const g of this.groupList) {
                        if (g.idx <= this.currentGroupIdx) continue;
                        if (g.blocks.some((bl) => bl._meta.done)) continue;
                        if (g.cx <= playerX + 60) continue; // already past it
                        pickedGroup = g;
                        break;
                    }
                    if (pickedGroup) {
                        this.currentGroupIdx = pickedGroup.idx;
                        // 3 candidate numbers — one is the right answer
                        const set = new Set([ans]);
                        let safety = 0;
                        while (set.size < 3 && safety < 30) {
                            const d = (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
                            set.add(Math.max(0, ans + d));
                            safety += 1;
                        }
                        // Backfill if RNG was unlucky
                        let backfill = 0;
                        while (set.size < 3) { set.add(ans + 10 + backfill); backfill += 1; }
                        const nums = Array.from(set).slice(0, 3).sort((a, b) => a - b);
                        pickedGroup.blocks.forEach((blk, i) => {
                            blk._meta.canHit = true;
                            blk._meta.value = nums[i];
                            blk._meta.correct = nums[i] === ans;
                            blk._meta.done = false;
                            blk._numText.setText(String(nums[i]));
                            blk._numText.setColor('#7c2d12');
                            blk.setFillStyle(0xfbbf24);
                            if (blk._inset) blk._inset.setFillStyle(0xf59e0b);
                            // Brighten the gloss too in case it was cleared
                            if (blk._gloss) blk._gloss.setAlpha(0.7);
                        });
                    } else {
                        const msg = '🏁 Run to the flag!';
                        if (qEl) qEl.textContent = msg;
                        if (this.bannerEq) this.bannerEq.setText(msg);
                    }
                }

                handleBlockHit(block) {
                    if (!block._meta || block._meta.done) return;
                    // Record the hit time so the auto-miss check in update()
                    // can't fire during the cooldown window — this avoids any
                    // frame-order race where Hakan answers correctly, gains a
                    // heart, then the auto-miss fires on the same brick before
                    // he's clear of it.
                    this._lastHitAt = this.time.now;
                    // Mark whole group done IMMEDIATELY so collider won't re-fire.
                    const group = block._meta.group;
                    if (group) group.forEach((b) => { b._meta.done = true; b._meta.canHit = false; if (b._pulse) b._pulse.stop(); });

                    const origY = block.y;
                    const isCorrect = block._meta.correct;

                    if (isCorrect) {
                        // === HUGE GREEN CELEBRATION ===
                        // 0. Gain a heart (capped at maxLives). Even when
                        // capped we flash the HUD gold + show "❤️ MAX!" so
                        // Hakan can see the system did respond.
                        const heartGained = this.lives < this.maxLives;
                        if (heartGained) this.lives = Math.min(this.maxLives, this.lives + 1);
                        _renderHearts(this.lives, this.maxLives, heartGained ? 'gain' : 'max');

                        // 1. Block instantly flashes BRIGHT GREEN
                        block.setFillStyle(0x22c55e);
                        if (block._inset) block._inset.setFillStyle(0x16a34a);
                        block._numText.setText('✓');
                        block._numText.setColor('#ffffff');
                        block._numText.setStroke('#14532d', 4);
                        // 2. Bump UP big and back down with squash-and-stretch.
                        // Use RELATIVE deltas (`-=N`) so the inset/studs/gloss
                        // each move by the same amount from their own y —
                        // otherwise they all converge to one y and the bump
                        // visually flattens.
                        const targets = [block, block._inset, block._numText, ...(block._studs || [])];
                        if (block._gloss) targets.push(block._gloss);
                        // Reset scale (the idle pulse tween may have left it slightly enlarged)
                        block.setScale(1);
                        this.tweens.add({
                            targets, y: '-=48', duration: 200,
                            ease: 'Quad.easeOut', yoyo: true, hold: 40,
                        });
                        // Mario-punch squash on the outer block
                        this.tweens.add({
                            targets: block,
                            scaleY: { from: 1, to: 0.78 },
                            scaleX: { from: 1, to: 1.2 },
                            duration: 100, yoyo: true,
                            onComplete: () => { try { block.setScale(1); } catch {} }
                        });
                        // 3. Big floating green text rising up. We split it
                        // so the "+1 ❤️" half uses a system sans-serif (which
                        // *can* render emoji); the "+3 ✓" half can stay in
                        // monospace for game feel.
                        const plus = this.add.text(block.x, origY - 30, '+3 ✓', {
                            fontFamily: 'Courier New, monospace',
                            fontSize: '24px', fontStyle: 'bold',
                            color: '#22c55e',
                            stroke: '#ffffff', strokeThickness: 5,
                        }).setOrigin(0.5).setDepth(200);
                        let heartFloater = null;
                        if (heartGained) {
                            heartFloater = this.add.text(block.x, origY - 4, '+1 ❤️', {
                                fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",Arial,sans-serif',
                                fontSize: '26px', fontStyle: 'bold',
                                color: '#ec4899',
                                stroke: '#ffffff', strokeThickness: 6,
                            }).setOrigin(0.5).setDepth(200);
                            this.tweens.add({
                                targets: heartFloater,
                                y: origY - 90, alpha: 0, scale: 1.6,
                                duration: 1100, ease: 'Quad.easeOut',
                                onComplete: () => { try { heartFloater.destroy(); } catch {} }
                            });
                        } else if (this.lives === this.maxLives) {
                            // Capped: explain why hearts didn't grow
                            const maxLabel = this.add.text(block.x, origY - 4, '❤️ MAX!', {
                                fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",Arial,sans-serif',
                                fontSize: '22px', fontStyle: 'bold',
                                color: '#fbbf24',
                                stroke: '#7c2d12', strokeThickness: 5,
                            }).setOrigin(0.5).setDepth(200);
                            this.tweens.add({
                                targets: maxLabel,
                                y: origY - 80, alpha: 0, scale: 1.4,
                                duration: 900, ease: 'Quad.easeOut',
                                onComplete: () => { try { maxLabel.destroy(); } catch {} }
                            });
                        }
                        this.tweens.add({
                            targets: plus,
                            y: origY - 110, alpha: 0, scale: 1.5,
                            duration: 900, ease: 'Quad.easeOut',
                            onComplete: () => { try { plus.destroy(); } catch {} }
                        });
                        // 4. Sparkle burst — 8 yellow stars exploding outward
                        for (let i = 0; i < 8; i++) {
                            const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.3;
                            const dist = 40 + Math.random() * 20;
                            const sx = block.x + Math.cos(angle) * 12;
                            const sy = origY - 16 + Math.sin(angle) * 12;
                            const sparkle = this.add.star(sx, sy, 5, 4, 8, 0xfde047);
                            this.tweens.add({
                                targets: sparkle,
                                x: sx + Math.cos(angle) * dist,
                                y: sy + Math.sin(angle) * dist - 20,
                                alpha: 0,
                                scale: 0,
                                angle: 360,
                                duration: 700,
                                ease: 'Quad.easeOut',
                                onComplete: () => { try { sparkle.destroy(); } catch {} }
                            });
                        }
                        // 5. Coin pop
                        const popCoin = this.add.circle(block.x, origY - 28, 10, 0xfbbf24);
                        popCoin.setStrokeStyle(2, 0xb45309);
                        const popInner = this.add.circle(block.x, origY - 28, 6, 0xfde047);
                        this.tweens.add({
                            targets: [popCoin, popInner],
                            y: origY - 90, alpha: 0, scale: 1.5,
                            duration: 700, ease: 'Quad.easeOut',
                            onComplete: () => { try { popCoin.destroy(); popInner.destroy(); } catch {} }
                        });
                        // 6. Tiny camera zoom-pulse (celebration shake)
                        this.cameras.main.zoomTo(1.05, 80, 'Quad.easeOut', false, (cam, prog) => {
                            if (prog >= 1) this.cameras.main.zoomTo(1, 200);
                        });
                        // 7. Player happy hop
                        const playerY = this.player.y;
                        this.tweens.add({
                            targets: this.player,
                            angle: { from: -10, to: 10 },
                            duration: 100, yoyo: true, repeat: 1,
                            onComplete: () => { try { this.player.angle = 0; } catch {} }
                        });
                        // 8. After 250ms, transition block to "used" brick
                        this.time.delayedCall(280, () => {
                            block.setFillStyle(0x92400e);
                            if (block._inset) block._inset.setFillStyle(0x78350f);
                            if (block._gloss) block._gloss.setAlpha(0.2);
                            block._numText.setColor('#fde047');
                            block._numText.setStroke('#7c2d12', 2);
                        });
                        _sfx('bonk'); _sfx('coin');
                        try { ctx.onScore(3, { x: 0, y: 0 }); } catch {}
                        // === Combo / streak ===
                        // Every correct answer grows the streak. Milestones
                        // throw an extra reward so Hakan feels the snowball.
                        this.streak += 1;
                        if (this.streak >= 3) {
                            const fireText = this.add.text(block.x, origY - 70,
                                this.streak >= 5 ? `🔥🔥 ON FIRE x${this.streak}!` : `🔥 COMBO x${this.streak}!`,
                                {
                                    fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",Arial,sans-serif',
                                    fontSize: this.streak >= 5 ? '28px' : '22px',
                                    fontStyle: 'bold',
                                    color: this.streak >= 5 ? '#dc2626' : '#f97316',
                                    stroke: '#ffffff', strokeThickness: 5,
                                }
                            ).setOrigin(0.5).setDepth(210);
                            this.tweens.add({
                                targets: fireText,
                                y: fireText.y - 70, alpha: 0, scale: 1.6,
                                duration: 1100, ease: 'Quad.easeOut',
                                onComplete: () => { try { fireText.destroy(); } catch {} }
                            });
                        }
                        // Streak of 5 = bonus heart (if not capped) + extra coin shower
                        if (this.streak === 5) {
                            if (this.lives < this.maxLives) {
                                this.lives = Math.min(this.maxLives, this.lives + 1);
                                _renderHearts(this.lives, this.maxLives, 'gain');
                            }
                            this.coins += 5;
                            const cel = document.getElementById('pp-coins');
                            if (cel) cel.textContent = this.coins;
                            try { ctx.onScore(5, { x: 0, y: 0 }); } catch {}
                            // Coin shower: 10 little coins burst up + outward
                            for (let i = 0; i < 10; i++) {
                                const ang = (Math.PI / 10) * i - Math.PI / 2;
                                const cx = block.x + Math.cos(ang) * 14;
                                const cy = origY - 40 + Math.sin(ang) * 14;
                                const tinyCoin = this.add.circle(cx, cy, 6, 0xfbbf24);
                                tinyCoin.setStrokeStyle(2, 0xb45309);
                                this.tweens.add({
                                    targets: tinyCoin,
                                    x: cx + Math.cos(ang) * 80,
                                    y: cy + Math.sin(ang) * 80 + 60,
                                    alpha: 0, scale: 0.4,
                                    duration: 900,
                                    onComplete: () => { try { tinyCoin.destroy(); } catch {} }
                                });
                            }
                            _sfx('win');
                        }
                        this.nextProblem();
                    } else {
                        // === HUGE RED FAILURE ===
                        // 1. Block flashes BRIGHT RED immediately
                        block.setFillStyle(0xef4444);
                        if (block._inset) block._inset.setFillStyle(0xb91c1c);
                        block._numText.setText('✕');
                        block._numText.setColor('#ffffff');
                        block._numText.setStroke('#7f1d1d', 4);
                        // 2. Block bumps SLIGHTLY (small bump — wrong feel).
                        // Relative deltas so all the inner pieces move uniformly.
                        const targets = [block, block._inset, block._numText, ...(block._studs || [])];
                        if (block._gloss) targets.push(block._gloss);
                        block.setScale(1);
                        this.tweens.add({
                            targets, y: '-=14', duration: 110, yoyo: true,
                        });
                        // 3. Camera SHAKE — big juicy feedback for "you missed"
                        this.cameras.main.shake(280, 0.012);
                        // 4. Big floating "-1 ❤️" RED text
                        const lossText = this.add.text(block.x, origY - 30, '-1 ❤️', {
                            fontFamily: 'Courier New, monospace',
                            fontSize: '26px', fontStyle: 'bold',
                            color: '#ef4444',
                            stroke: '#ffffff', strokeThickness: 5,
                        }).setOrigin(0.5).setDepth(200);
                        this.tweens.add({
                            targets: lossText,
                            y: origY - 100, alpha: 0,
                            duration: 900, ease: 'Quad.easeOut',
                            onComplete: () => { try { lossText.destroy(); } catch {} }
                        });
                        // 5. Player tint red briefly + stagger shake
                        const heartParts = this.player.list;
                        // Use a flash effect via setTint won't work on Container,
                        // so we briefly add a red overlay rectangle that fades.
                        const flash = this.add.rectangle(this.player.x, this.player.y, 50, 80, 0xef4444, 0.5);
                        this.tweens.add({
                            targets: flash,
                            alpha: 0, duration: 450,
                            onComplete: () => { try { flash.destroy(); } catch {} }
                        });
                        flash.setDepth(150);
                        this.tweens.add({
                            targets: this.player,
                            x: { from: this.player.x - 6, to: this.player.x + 6 },
                            duration: 60, yoyo: true, repeat: 3,
                        });
                        _sfx('bonk'); _sfx('wrong');
                        this.lives -= 1;
                        this.streak = 0; // wrong answer breaks the combo
                        _renderHearts(this.lives, this.maxLives, 'lose');
                        try { ctx.onPenalty(2, { x: 0, y: 0 }); } catch {}
                        if (this.lives <= 0) { this.handleGameOver(); return; }
                        this.nextProblem();
                    }
                }

                handleFlagReached() {
                    if (this.endHandled) return;
                    this.endHandled = true;
                    const qEl = document.getElementById('pp-q-text');
                    if (qEl) qEl.innerHTML = '<b>🏁 LEVEL CLEAR!</b>';
                    _sfx('win');
                    try { ctx.onScore(10, { x: 0, y: 0 }); } catch {}
                    setTimeout(() => { try { ctx.onWin(); } catch {} }, 1200);
                }
                handleGameOver() {
                    if (this.endHandled) return;
                    this.endHandled = true;
                    const qEl = document.getElementById('pp-q-text');
                    if (qEl) qEl.innerHTML = '<b>💀 GAME OVER!</b>';
                    _sfx('wrong');
                    setTimeout(() => { try { ctx.onWin(); } catch {} }, 1400);
                }

                update(time, dt) {
                    if (!this.player) return;
                    const body = this.player.body;
                    // Update distance HUD
                    this.distance = Math.max(0, Math.floor(this.player.x / 32));
                    const distEl = document.getElementById('pp-dist');
                    if (distEl) distEl.textContent = this.distance + 'm';
                    // Maintain forward speed — but NOT while knocked back from
                    // an enemy hit (iframes window), so the knockback velocity
                    // actually moves Hakan visibly.
                    if (!this.isInvulnerable && body.velocity.x < 85) body.setVelocityX(95);

                    // Enemy patrol AI — reverse at patrol bounds
                    if (this.enemiesGroup) {
                        this.enemiesGroup.children.iterate((e) => {
                            if (!e || !e.body || e._dead) return;
                            if (e.x <= e._patrolMinX && e._patrolDir < 0) {
                                e._patrolDir = 1;
                                e.body.setVelocityX(30);
                            } else if (e.x >= e._patrolMaxX && e._patrolDir > 0) {
                                e._patrolDir = -1;
                                e.body.setVelocityX(-30);
                            }
                        });
                    }

                    // Reset double-jump when we land back on the ground
                    if (body.blocked.down) {
                        this.jumpsRemaining = 0;
                    }

                    // Adjust limb tween speed based on grounded state
                    if (body.blocked.down) {
                        if (this.runTween && this.runTween.timeScale !== 1) this.runTween.timeScale = 1;
                        if (this.runTween2 && this.runTween2.timeScale !== 1) this.runTween2.timeScale = 1;
                    } else {
                        if (this.runTween && this.runTween.timeScale !== 0.2) this.runTween.timeScale = 0.2;
                        if (this.runTween2 && this.runTween2.timeScale !== 0.2) this.runTween2.timeScale = 0.2;
                    }

                    // Drift clouds (each cloud has its own driftSpeed)
                    if (this.cloudsGroup) {
                        this.cloudsGroup.children.iterate((c) => {
                            if (c) c.x += c.driftSpeed * (dt / 16);
                        });
                    }

                    // === Auto-miss detection (deterministic via currentGroupIdx) ===
                    // If we have a live group and the player has run past it
                    // without bumping any brick, treat it as a miss.
                    //
                    // Two safety guards layered in here:
                    //   1. 1200ms cooldown after any hit — blocks any
                    //      frame-order race that could let auto-miss fire on
                    //      the brick Hakan just answered.
                    //   2. Threshold is the rightmost brick's RIGHT EDGE
                    //      (cx + 92) plus a 60px buffer — previously it was
                    //      cx + 64, which is the *center* of the rightmost
                    //      brick, so the check could trip while Hakan was
                    //      still horizontally inside the group.
                    const sinceHit = this.time.now - (this._lastHitAt || 0);
                    if (sinceHit > 1200 && this.target && !this.endHandled && this.currentGroupIdx >= 0) {
                        const liveGroup = this.groupList[this.currentGroupIdx];
                        if (liveGroup && !liveGroup.blocks[0]._meta.done) {
                            // Rightmost brick: bx = cx + 64, half-width 28 → right edge = cx + 92
                            const rightEdge = liveGroup.cx + 92;
                            if (this.player.x > rightEdge + 60) {
                                // Visually fade the missed group to grey
                                liveGroup.blocks.forEach((b) => {
                                    b._meta.done = true;
                                    b._meta.canHit = false;
                                    if (b._pulse) b._pulse.stop();
                                    b.setFillStyle(0x6b7280);
                                    if (b._inset) b._inset.setFillStyle(0x4b5563);
                                    if (b._gloss) b._gloss.setAlpha(0.15);
                                    b._numText.setText('—');
                                    b._numText.setColor('#e5e7eb');
                                });
                                // Floating "missed!" indicator
                                const missText = this.add.text(liveGroup.cx, this.scale.height / 2 - 60, 'MISSED!', {
                                    fontFamily: 'Courier New, monospace',
                                    fontSize: '22px', fontStyle: 'bold',
                                    color: '#9ca3af',
                                    stroke: '#ffffff', strokeThickness: 3,
                                }).setOrigin(0.5);
                                this.tweens.add({
                                    targets: missText,
                                    y: missText.y - 40, alpha: 0,
                                    duration: 900,
                                    onComplete: () => { try { missText.destroy(); } catch {} }
                                });
                                this.lives -= 1;
                                this.streak = 0; // missing the group breaks the combo
                                _renderHearts(this.lives, this.maxLives, 'lose');
                                _sfx('wrong');
                                try { ctx.onPenalty(2, { x: 0, y: 0 }); } catch {}
                                if (this.lives <= 0) { this.handleGameOver(); return; }
                                this.nextProblem();
                            }
                        }
                    }

                    // Off-world respawn
                    if (this.player.y > this.scale.height + 100) {
                        this.player.setPosition(80, 100);
                        body.setVelocity(0, 0);
                        this.lives -= 1;
                        _renderHearts(this.lives, this.maxLives, 'lose');
                        try { ctx.onPenalty(3, { x: 0, y: 0 }); } catch {}
                        if (this.lives <= 0) this.handleGameOver();
                    }
                }
            }

            const config = {
                type: Phaser.AUTO,
                parent: canvasHost.id,
                width: 800,
                height: 420,
                backgroundColor: '#87ceeb',
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: 'arcade',
                    arcade: { gravity: { y: 900 }, debug: false },
                },
                scene: PlatformScene,
            };
            game = new Phaser.Game(config);

            // Fullscreen button (wired after Phaser boots so the canvas exists)
            const fsBtn = document.getElementById('pp-fs-btn');
            if (fsBtn) {
                fsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const target = canvasHost; // request fullscreen on the canvas host
                    const isFs = document.fullscreenElement === target;
                    if (isFs) {
                        if (document.exitFullscreen) document.exitFullscreen();
                        wrap.classList.remove('mg-pp-fullscreen');
                    } else {
                        if (target.requestFullscreen) target.requestFullscreen();
                        else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
                        wrap.classList.add('mg-pp-fullscreen');
                    }
                });
                document.addEventListener('fullscreenchange', () => {
                    if (!document.fullscreenElement) {
                        wrap.classList.remove('mg-pp-fullscreen');
                    }
                });
            }
        }).catch((err) => {
            loadingEl.innerHTML = '⚠️ Couldn\'t load game engine. Try refreshing.';
            console.error('Phaser load failed:', err);
        });

        return {
            stop() {
                stopped = true;
                if (game) {
                    try { game.destroy(true); } catch {}
                    game = null;
                }
            }
        };
    }
};
