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

function openMiniGamesHub() {
    if (typeof playSound === 'function') playSound('click');
    const grid = document.getElementById('minigames-grid');
    if (!grid) return;
    const bests = _loadBests();
    grid.innerHTML = MINI_GAMES_CATALOG.map((g) => {
        const best = bests[g.id];
        const bestLine = best
            ? `<div class="mgs-card-best">⭐ Best: ${best.score}</div>`
            : `<div class="mgs-card-best mgs-card-best-empty">Try it!</div>`;
        return `<button class="mgs-card mgs-card-${g.difficulty || 'easy'}" onclick="launchMiniGame('${g.id}')">
            <span class="mgs-card-icon">${g.emoji || '🎮'}</span>
            <span class="mgs-card-title">${g.title}</span>
            <span class="mgs-card-desc">${g.description || ''}</span>
            <span class="mgs-card-meta">⏱ ${g.duration || 30}s · 💎 ${(g.rewards && g.rewards.robuxPerWin) || 3}</span>
            ${bestLine}
        </button>`;
    }).join('');
    showScreen('minigames-screen');
}

function launchMiniGame(id) {
    const g = MINI_GAMES_CATALOG.find((x) => x.id === id);
    if (!g) return;
    if (typeof playSound === 'function') playSound('click');
    _activeGameId = id;
    _gameScore = 0;
    _gameCombo = 0;
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

    _activeGame = impl.start({
        area,
        onScore: (delta, opts) => {
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
            } else {
                document.getElementById('mg-play-score').textContent = 'Score: ' + _gameScore;
            }
        },
        onPenalty: (seconds, opts) => {
            // Add penalty time to deadline (shorten remaining)
            _gameDeadlineMs -= seconds * 1000;
            _gameCombo = 0;
            const o = opts || {};
            mgScorePopup('-' + seconds + 's', o.x, o.y, 'mg-popup-bad');
            if (typeof playSound === 'function') playSound('wrong');
            // brief area shake
            const area = document.getElementById('mg-play-area');
            if (area) {
                area.classList.remove('mg-shake'); void area.offsetWidth;
                area.classList.add('mg-shake');
            }
        },
        onWin: () => _endMiniGame(true),
        config: g.config || {},
    });
}

function _updateTimer() {
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
    let robuxAwarded = 0;

    if (_gameScore > 0 && typeof currentUser !== 'undefined' && currentUser === 'hakan') {
        robuxAwarded = baseReward;
        if (isNewRecord) robuxAwarded += newRecordBonus;
        if (typeof saveRobux === 'function' && typeof loadRobux === 'function') {
            saveRobux(loadRobux() + robuxAwarded);
        }
    }

    if (isNewRecord && _gameScore > 0) {
        bests[g.id] = { score: _gameScore, when: Date.now() };
        _saveBests(bests);
    }

    document.getElementById('mg-over-title').textContent =
        _gameScore <= 0 ? "Better luck next time, Hakan!" :
        isNewRecord ? "🏅 New Record, Hakan!" :
        isWin ? "🎉 You won, Hakan!" : "⏰ Time's Up!";
    document.getElementById('mg-over-score-text').textContent = `Score: ${_gameScore}${prev ? `  (best ${Math.max(_gameScore, prev.score)})` : ''}`;
    document.getElementById('mg-over-robux').textContent = robuxAwarded > 0
        ? `+${robuxAwarded} 💎 Robux earned!`
        : '';
    document.getElementById('mg-play-over').style.display = '';

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

// 1. Number Tap Rush — tap numbers 1-10 in order, randomly placed,
// gently floating. Vibrant per-number colors. Wrong = shake + penalty.
GAME_IMPLS['number-tap-rush'] = {
    start(ctx) {
        const nums = (ctx.config && ctx.config.numbers) || [1,2,3,4,5,6,7,8,9,10];
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

        function nextProblem() {
            const a = Math.floor(Math.random() * 9) + 1;
            const b = Math.floor(Math.random() * 9) + 1;
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

        let answer = 0;
        function next() {
            const a = Math.floor(Math.random() * 9) + 1;
            const b = Math.floor(Math.random() * 9) + 1;
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
        const wrap = document.createElement('div');
        wrap.className = 'mg-shape-wrap';
        const shapesRow = document.createElement('div');
        shapesRow.className = 'mg-shape-shapes';
        const prompt = document.createElement('div');
        prompt.className = 'mg-shape-prompt';
        prompt.textContent = 'Tap the right bucket!';
        const buckets = document.createElement('div');
        buckets.className = 'mg-shape-buckets';
        wrap.appendChild(prompt);
        wrap.appendChild(shapesRow);
        wrap.appendChild(buckets);
        ctx.area.appendChild(wrap);

        const shapes = ['circle','square','triangle','rectangle'];
        const counts = { circle: 0, square: 0, triangle: 0, rectangle: 0 };

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
            return '';
        }
        const shapeColors = {
            circle:    '#3b82f6',
            square:    '#f59e0b',
            triangle:  '#ef4444',
            rectangle: '#10b981',
        };

        let active = null;
        function spawn() {
            const kind = shapes[Math.floor(Math.random() * shapes.length)];
            active = { kind };
            shapesRow.innerHTML = `<div class="mg-shape-piece" data-kind="${kind}">${shapeSvg(kind, 80, shapeColors[kind])}</div>`;
        }
        // Render buckets
        shapes.forEach((s) => {
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
                    ctx.onScore(1, { x: e.clientX, y: e.clientY });
                    active = null;
                    shapesRow.innerHTML = '';
                    setTimeout(spawn, 250);
                } else {
                    b.classList.add('wrong');
                    setTimeout(() => b.classList.remove('wrong'), 400);
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
