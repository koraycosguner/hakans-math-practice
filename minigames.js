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
    document.getElementById('mg-play-over').style.display = 'none';
    document.getElementById('mg-play-instr').textContent = g.objective || '';
    document.getElementById('mg-play-score').textContent = 'Score: 0';
    const area = document.getElementById('mg-play-area');
    area.innerHTML = '';

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
        onScore: (delta) => {
            _gameScore += delta;
            document.getElementById('mg-play-score').textContent = 'Score: ' + _gameScore;
            if (delta > 0 && typeof playSound === 'function') playSound('correct');
        },
        onPenalty: (seconds) => {
            // Add penalty time to deadline (shorten remaining)
            _gameDeadlineMs -= seconds * 1000;
            if (typeof playSound === 'function') playSound('wrong');
        },
        onWin: () => _endMiniGame(true),
        config: g.config || {},
    });
}

function _updateTimer() {
    const remaining = Math.max(0, Math.ceil((_gameDeadlineMs - Date.now()) / 1000));
    document.getElementById('mg-play-timer').textContent = remaining + 's';
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

// 1. Number Tap Rush — tap numbers 1-10 in order, randomly placed
GAME_IMPLS['number-tap-rush'] = {
    start(ctx) {
        const nums = (ctx.config && ctx.config.numbers) || [1,2,3,4,5,6,7,8,9,10];
        let next = nums[0];
        const target = nums[nums.length - 1];
        const board = document.createElement('div');
        board.className = 'mg-ntr-board';
        ctx.area.appendChild(board);
        // Render the instruction
        const instr = document.createElement('div');
        instr.className = 'mg-instr-line';
        instr.textContent = `Tap ${next}!`;
        ctx.area.insertBefore(instr, board);
        // Place numbers randomly
        nums.forEach((n) => {
            const btn = document.createElement('button');
            btn.className = 'mg-ntr-num';
            btn.textContent = n;
            btn.style.left = (Math.random() * 80 + 5) + '%';
            btn.style.top  = (Math.random() * 80 + 5) + '%';
            btn.style.background = `hsl(${(n * 36) % 360}, 70%, 60%)`;
            btn.addEventListener('click', () => {
                if (btn.classList.contains('done')) return;
                const val = parseInt(btn.textContent, 10);
                if (val === next) {
                    btn.classList.add('done');
                    ctx.onScore(1);
                    const i = nums.indexOf(next);
                    if (i === nums.length - 1) {
                        instr.textContent = 'All done!';
                        ctx.onWin();
                        return;
                    }
                    next = nums[i + 1];
                    instr.textContent = `Tap ${next}!`;
                } else {
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 400);
                    ctx.onPenalty(2);  // 2-second penalty
                }
            });
            board.appendChild(btn);
        });
        return { stop() {} };
    }
};

// 2. Bubble Pop Math — math problem at top, answers float as bubbles
GAME_IMPLS['bubble-pop-math'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-bubble-wrap';
        const target = document.createElement('div');
        target.className = 'mg-bubble-target';
        const field = document.createElement('div');
        field.className = 'mg-bubble-field';
        wrap.appendChild(target);
        wrap.appendChild(field);
        ctx.area.appendChild(wrap);

        let currentAns = null;
        let activeIds = [];

        function nextProblem() {
            const a = Math.floor(Math.random() * 9) + 1;
            const b = Math.floor(Math.random() * 9) + 1;
            currentAns = a + b;
            target.textContent = `${a} + ${b} = ?`;
            // Spawn bubbles
            field.innerHTML = '';
            activeIds = [];
            const wrong1 = currentAns + (Math.random() < 0.5 ? 1 : -1);
            const wrong2 = currentAns + (Math.random() < 0.5 ? 2 : -2);
            const all = [currentAns, Math.max(0, wrong1), Math.max(0, wrong2)];
            all.sort(() => Math.random() - 0.5);
            all.forEach((n, i) => {
                const b = document.createElement('button');
                b.className = 'mg-bubble';
                b.textContent = n;
                b.style.left = (15 + i * 30) + '%';
                b.style.animationDuration = (4 + Math.random() * 2) + 's';
                b.addEventListener('click', () => {
                    if (parseInt(b.textContent, 10) === currentAns) {
                        ctx.onScore(1);
                        nextProblem();
                    } else {
                        b.classList.add('wrong');
                        ctx.onPenalty(1);
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

// 3. Make 10 Match — pairs that sum to 10
GAME_IMPLS['make-10-match'] = {
    start(ctx) {
        const board = document.createElement('div');
        board.className = 'mg-m10-board';
        ctx.area.appendChild(board);
        let selected = null;

        function refill() {
            board.innerHTML = '';
            // 6 pairs that sum to 10, shuffled
            const pairs = [[1,9],[2,8],[3,7],[4,6],[5,5],[1,9]];
            const cards = [];
            pairs.forEach((p) => { cards.push(p[0]); cards.push(p[1]); });
            cards.sort(() => Math.random() - 0.5);
            cards.forEach((n) => {
                const c = document.createElement('button');
                c.className = 'mg-m10-card';
                c.textContent = n;
                c.dataset.val = n;
                c.addEventListener('click', () => {
                    if (c.classList.contains('done') || c.classList.contains('selected')) return;
                    if (!selected) {
                        selected = c;
                        c.classList.add('selected');
                    } else {
                        const a = parseInt(selected.dataset.val, 10);
                        const b = parseInt(c.dataset.val, 10);
                        if (a + b === 10) {
                            selected.classList.add('done');
                            c.classList.add('done');
                            selected.classList.remove('selected');
                            selected = null;
                            ctx.onScore(1);
                            // If all done, refill
                            if (board.querySelectorAll('.mg-m10-card:not(.done)').length === 0) {
                                setTimeout(refill, 600);
                            }
                        } else {
                            c.classList.add('wrong');
                            selected.classList.add('wrong');
                            setTimeout(() => {
                                c.classList.remove('wrong', 'selected');
                                if (selected) selected.classList.remove('wrong', 'selected');
                                selected = null;
                            }, 500);
                            ctx.onPenalty(1);
                        }
                    }
                });
                board.appendChild(c);
            });
        }
        refill();
        return { stop() {} };
    }
};

// 4. Speed Add — rapid-fire single-digit additions
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
            eq.innerHTML = `<span>${a}</span><span>+</span><span>${b}</span><span>=</span><span>?</span>`;
            pad.innerHTML = '';
            // 4 options including the correct answer
            const opts = new Set([answer]);
            while (opts.size < 4) {
                opts.add(Math.max(0, answer + Math.floor(Math.random() * 7) - 3));
            }
            Array.from(opts).sort(() => Math.random() - 0.5).forEach((o) => {
                const b = document.createElement('button');
                b.className = 'mg-sa-opt';
                b.textContent = o;
                b.addEventListener('click', () => {
                    if (parseInt(b.textContent, 10) === answer) {
                        ctx.onScore(1);
                        next();
                    } else {
                        b.classList.add('wrong');
                        ctx.onPenalty(1);
                        setTimeout(() => b.classList.remove('wrong'), 400);
                    }
                });
                pad.appendChild(b);
            });
        }
        next();
        return { stop() {} };
    }
};

// 5. Memory Numbers — concentration with digit/word pairs
GAME_IMPLS['memory-numbers'] = {
    start(ctx) {
        const board = document.createElement('div');
        board.className = 'mg-mem-board';
        ctx.area.appendChild(board);
        const WORDS = ['one','two','three','four','five','six'];
        const pairs = WORDS.map((w, i) => [{ kind: 'digit', val: i+1 }, { kind: 'word', val: w }]).flat();
        pairs.sort(() => Math.random() - 0.5);
        let flipped = [];
        let matched = 0;
        pairs.forEach((p, i) => {
            const c = document.createElement('button');
            c.className = 'mg-mem-card';
            c.dataset.kind = p.kind;
            c.dataset.val = p.val;
            c.dataset.idx = i;
            c.innerHTML = `<span class="face front">?</span><span class="face back">${p.val}</span>`;
            c.addEventListener('click', () => {
                if (c.classList.contains('matched') || c.classList.contains('flipped')) return;
                if (flipped.length >= 2) return;
                c.classList.add('flipped');
                flipped.push(c);
                if (flipped.length === 2) {
                    const [a, b] = flipped;
                    const av = a.dataset.val, bv = b.dataset.val;
                    // Match: same number (1<->one, 2<->two, ...)
                    const norm = (x) => isNaN(parseInt(x, 10)) ? WORDS.indexOf(x) + 1 : parseInt(x, 10);
                    if (norm(av) === norm(bv) && a.dataset.kind !== b.dataset.kind) {
                        setTimeout(() => {
                            a.classList.add('matched');
                            b.classList.add('matched');
                            flipped = [];
                            matched += 1;
                            ctx.onScore(1);
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

// 6. Falling Numbers — tap numbers matching a rule before they hit bottom
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
            { label: 'Tap EVEN numbers', test: (n) => n % 2 === 0 },
            { label: 'Tap ODD numbers',  test: (n) => n % 2 === 1 },
            { label: 'Tap numbers > 5',  test: (n) => n > 5 },
            { label: 'Tap numbers < 5',  test: (n) => n < 5 },
            { label: 'Tap multiples of 3', test: (n) => n % 3 === 0 && n > 0 },
        ];
        let rule = rules[Math.floor(Math.random() * rules.length)];
        ruleEl.textContent = rule.label;

        function rotateRule() {
            rule = rules[Math.floor(Math.random() * rules.length)];
            ruleEl.textContent = rule.label;
        }
        const ruleTimer = setInterval(rotateRule, 8000);

        function spawn() {
            const n = Math.floor(Math.random() * 10) + 1;
            const el = document.createElement('button');
            el.className = 'mg-falling-num';
            el.textContent = n;
            el.style.left = Math.random() * 80 + 5 + '%';
            field.appendChild(el);
            // animate from top to bottom
            const duration = 4000 + Math.random() * 2000;
            const startT = Date.now();
            function step() {
                if (!el.parentNode) return;
                const t = (Date.now() - startT) / duration;
                if (t >= 1) {
                    if (rule.test(n)) {
                        // missed a target — penalty
                        ctx.onPenalty(0.5);
                    }
                    el.remove();
                    return;
                }
                el.style.top = (t * 90) + '%';
                requestAnimationFrame(step);
            }
            step();
            el.addEventListener('click', () => {
                if (el.classList.contains('done')) return;
                el.classList.add('done');
                if (rule.test(n)) {
                    ctx.onScore(1);
                } else {
                    ctx.onPenalty(1);
                }
                setTimeout(() => el.remove(), 300);
            });
        }
        const spawnTimer = setInterval(spawn, 700);

        return {
            stop() {
                clearInterval(ruleTimer);
                clearInterval(spawnTimer);
            }
        };
    }
};

// 7. Shape Sorter — tap a shape, then tap its bucket
GAME_IMPLS['shape-sorter'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-shape-wrap';
        const shapesRow = document.createElement('div');
        shapesRow.className = 'mg-shape-shapes';
        const buckets = document.createElement('div');
        buckets.className = 'mg-shape-buckets';
        wrap.appendChild(shapesRow);
        wrap.appendChild(buckets);
        ctx.area.appendChild(wrap);

        const shapes = ['circle','square','triangle','rectangle'];
        let selected = null;
        // Render buckets
        shapes.forEach((s) => {
            const b = document.createElement('button');
            b.className = 'mg-shape-bucket';
            b.dataset.kind = s;
            b.innerHTML = `<span class="mg-shape-bucket-label">${s}</span>`;
            b.addEventListener('click', () => {
                if (!selected) return;
                if (selected.dataset.kind === s) {
                    selected.classList.add('matched');
                    ctx.onScore(1);
                    setTimeout(() => selected.remove(), 200);
                    selected = null;
                    setTimeout(spawn, 300);
                } else {
                    b.classList.add('wrong');
                    setTimeout(() => b.classList.remove('wrong'), 400);
                    ctx.onPenalty(1);
                }
            });
            buckets.appendChild(b);
        });
        function spawn() {
            if (selected) return;
            const kind = shapes[Math.floor(Math.random() * shapes.length)];
            const el = document.createElement('button');
            el.className = `mg-shape-piece mg-shape-piece-${kind}`;
            el.dataset.kind = kind;
            el.textContent = kind;
            el.addEventListener('click', () => {
                if (selected) selected.classList.remove('selected');
                selected = el;
                el.classList.add('selected');
            });
            shapesRow.innerHTML = '';
            shapesRow.appendChild(el);
        }
        spawn();
        return { stop() {} };
    }
};

// 8. Counting Race — N items shown, tap the count before timer
GAME_IMPLS['counting-race'] = {
    start(ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'mg-count-wrap';
        const items = document.createElement('div');
        items.className = 'mg-count-items';
        const pad = document.createElement('div');
        pad.className = 'mg-count-pad';
        wrap.appendChild(items);
        wrap.appendChild(pad);
        ctx.area.appendChild(wrap);

        const emojis = ['⭐','🍎','🐠','🐝','🍪','🦋','🚗','🎈'];
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
                items.appendChild(s);
            }
            // Digit pad 1-10
            pad.innerHTML = '';
            for (let d = 1; d <= 10; d++) {
                const b = document.createElement('button');
                b.className = 'mg-count-digit';
                b.textContent = d;
                b.addEventListener('click', () => {
                    if (parseInt(b.textContent, 10) === correct) {
                        ctx.onScore(1);
                        nextRound();
                    } else {
                        b.classList.add('wrong');
                        ctx.onPenalty(1);
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
