// ===== Grade 1 Math Modules =====
// 10 modules. Each has: lesson pages → guided practice → scored quiz.
// New modules use the generic problem renderer below; the existing
// Add/Sub and Fact Family games are delegated to game.js so the
// Practice/Quiz buttons just route to them.

// ----------------------------------------------------------------------
// Visual helpers (SVG; iOS Safari needs explicit width/height attrs).
// ----------------------------------------------------------------------

function renderBlocks(tens, ones) {
    const tenW = 26, tenH = 110, oneSz = 20, tenGap = 6, oneGap = 4, groupGap = 28;
    const tensW = tens > 0 ? tens * tenW + (tens - 1) * tenGap : 0;
    const onesPerRow = Math.min(ones || 1, 5);
    const onesW = ones > 0 ? onesPerRow * oneSz + (onesPerRow - 1) * oneGap : 0;
    const onesStart = (tens > 0 && ones > 0) ? tensW + groupGap : 0;
    const totalW = (tens > 0 || ones > 0) ? Math.max(onesStart + onesW, tensW) : 60;
    const parts = [];
    for (let i = 0; i < tens; i++) {
        const x = i * (tenW + tenGap);
        parts.push(`<rect x="${x}" y="0" width="${tenW}" height="${tenH}" rx="3" fill="#5B6BFF" stroke="#3D49C9" stroke-width="2"/>`);
        for (let j = 1; j < 10; j++) {
            const y = j * (tenH / 10);
            parts.push(`<line x1="${x}" y1="${y}" x2="${x + tenW}" y2="${y}" stroke="#3D49C9" stroke-width="1"/>`);
        }
    }
    for (let i = 0; i < ones; i++) {
        const col = i % 5, row = Math.floor(i / 5);
        const x = onesStart + col * (oneSz + oneGap);
        const y = row * (oneSz + oneGap);
        parts.push(`<rect x="${x}" y="${y}" width="${oneSz}" height="${oneSz}" rx="2" fill="#FFB74D" stroke="#E69100" stroke-width="2"/>`);
    }
    const vbW = totalW + 10, vbH = tenH + 10;
    return `<svg viewBox="-5 -5 ${vbW} ${vbH}" width="${vbW}" height="${vbH}" xmlns="http://www.w3.org/2000/svg" class="m-svg pv-blocks" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
}

function renderTwoDigitNumber(n, highlight) {
    const tens = Math.floor(n / 10), ones = n % 10;
    const tC = 'pv-digit pv-digit-tens' + (highlight === 'tens' ? ' pv-highlight' : '');
    const oC = 'pv-digit pv-digit-ones' + (highlight === 'ones' ? ' pv-highlight' : '');
    return `<div class="pv-number"><span class="${tC}">${tens}</span><span class="${oC}">${ones}</span></div>`;
}

// Number line from..to with optional markedNumber. Used in Counting + hints.
function renderNumberLine(from, to, mark) {
    const stepX = 36, padL = 24, padR = 24, baseY = 50;
    const count = to - from + 1;
    const w = padL + padR + (count - 1) * stepX;
    const h = 80;
    const parts = [];
    parts.push(`<line x1="${padL}" y1="${baseY}" x2="${padL + (count - 1) * stepX}" y2="${baseY}" stroke="#9aa1b3" stroke-width="2"/>`);
    for (let i = 0; i < count; i++) {
        const x = padL + i * stepX, n = from + i;
        const isMark = (mark === n);
        parts.push(`<line x1="${x}" y1="${baseY - 6}" x2="${x}" y2="${baseY + 6}" stroke="#9aa1b3" stroke-width="2"/>`);
        parts.push(`<text x="${x}" y="${baseY + 24}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="16" font-weight="700" fill="${isMark ? '#FF6B6B' : '#2D3436'}">${n}</text>`);
        if (isMark) parts.push(`<circle cx="${x}" cy="${baseY}" r="9" fill="#FF6B6B" stroke="white" stroke-width="3"/>`);
    }
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" class="m-svg" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
}

// Big bold number (e.g. for "what comes after 5?")
function renderBigNumber(n, color) {
    return `<div class="m-big-number" style="${color ? 'color:' + color : ''}">${n}</div>`;
}

// Two numbers side by side for comparison: "5  ?  8"
function renderComparePair(a, b) {
    return `<div class="m-compare-row">
        <span class="m-compare-num">${a}</span>
        <span class="m-compare-q">?</span>
        <span class="m-compare-num">${b}</span>
    </div>`;
}

// Sequence with a missing number, e.g. "5, 6, ?, 8"
function renderSequence(numbers, missingIndex) {
    const items = numbers.map((n, i) => {
        if (i === missingIndex) return `<span class="m-seq-blank">?</span>`;
        return `<span class="m-seq-num">${n}</span>`;
    });
    return `<div class="m-sequence">${items.join('<span class="m-seq-comma">,</span>')}</div>`;
}

// Clock face (analog). Hour 1..12, minute 0..59 (we use 0 or 30).
function renderClock(hour, minute) {
    const cx = 120, cy = 120, r = 100;
    const parts = [];
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFCF2" stroke="#2D3436" stroke-width="4"/>`);
    // Hour numerals
    for (let h = 1; h <= 12; h++) {
        const a = (h * 30 - 90) * Math.PI / 180;
        const x = cx + (r - 22) * Math.cos(a);
        const y = cy + (r - 22) * Math.sin(a) + 7;
        parts.push(`<text x="${x}" y="${y}" text-anchor="middle" font-family="Outfit,sans-serif" font-size="20" font-weight="800" fill="#2D3436">${h}</text>`);
    }
    // Tick marks (only at hours)
    for (let h = 0; h < 12; h++) {
        const a = (h * 30 - 90) * Math.PI / 180;
        const x1 = cx + (r - 6) * Math.cos(a), y1 = cy + (r - 6) * Math.sin(a);
        const x2 = cx + r * Math.cos(a), y2 = cy + r * Math.sin(a);
        parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2D3436" stroke-width="3"/>`);
    }
    // Hour hand (visual hour considers minutes for half-past)
    const visualHour = hour + (minute / 60);
    const hourAng = (visualHour * 30 - 90) * Math.PI / 180;
    const hourLen = 50;
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx + hourLen * Math.cos(hourAng)}" y2="${cy + hourLen * Math.sin(hourAng)}" stroke="#6C63FF" stroke-width="7" stroke-linecap="round"/>`);
    // Minute hand
    const minAng = (minute * 6 - 90) * Math.PI / 180;
    const minLen = 80;
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx + minLen * Math.cos(minAng)}" y2="${cy + minLen * Math.sin(minAng)}" stroke="#FF6B6B" stroke-width="5" stroke-linecap="round"/>`);
    // Center dot
    parts.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="#2D3436"/>`);
    return `<svg viewBox="0 0 240 240" width="240" height="240" xmlns="http://www.w3.org/2000/svg" class="m-svg" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
}

// Simple shape SVG for shape lessons & quiz.
function renderShape(name) {
    const svgs = {
        circle:    '<circle cx="80" cy="80" r="65" fill="#FFD93D" stroke="#B8860B" stroke-width="4"/>',
        square:    '<rect x="20" y="20" width="120" height="120" fill="#43E97B" stroke="#1A8C42" stroke-width="4"/>',
        triangle:  '<polygon points="80,15 145,140 15,140" fill="#FF6B6B" stroke="#9B2C2C" stroke-width="4"/>',
        rectangle: '<rect x="10" y="35" width="140" height="90" fill="#6C63FF" stroke="#3A36A0" stroke-width="4"/>',
    };
    const path = svgs[name] || '';
    return `<svg viewBox="0 0 160 160" width="160" height="160" xmlns="http://www.w3.org/2000/svg" class="m-svg">${path}</svg>`;
}

// Fraction visual: a circle/square divided into N equal parts, P filled.
function renderFraction(shape, parts, filled) {
    const cx = 90, cy = 90, r = 70;
    const out = [];
    if (shape === 'circle') {
        out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="#2D3436" stroke-width="3"/>`);
        const angle = 2 * Math.PI / parts;
        for (let i = 0; i < parts; i++) {
            const a1 = i * angle - Math.PI / 2;
            const a2 = (i + 1) * angle - Math.PI / 2;
            const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
            const large = angle > Math.PI ? 1 : 0;
            const fill = i < filled ? '#FF6B6B' : 'white';
            out.push(`<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${fill}" stroke="#2D3436" stroke-width="2"/>`);
        }
    } else { // square / rectangle
        out.push(`<rect x="20" y="20" width="140" height="140" fill="white" stroke="#2D3436" stroke-width="3"/>`);
        if (parts === 2) {
            out.push(`<rect x="20" y="20" width="70" height="140" fill="${filled >= 1 ? '#FF6B6B' : 'white'}" stroke="#2D3436" stroke-width="2"/>`);
            out.push(`<rect x="90" y="20" width="70" height="140" fill="${filled >= 2 ? '#FF6B6B' : 'white'}" stroke="#2D3436" stroke-width="2"/>`);
        } else if (parts === 4) {
            out.push(`<rect x="20" y="20"  width="70" height="70" fill="${filled >= 1 ? '#FF6B6B' : 'white'}" stroke="#2D3436" stroke-width="2"/>`);
            out.push(`<rect x="90" y="20"  width="70" height="70" fill="${filled >= 2 ? '#FF6B6B' : 'white'}" stroke="#2D3436" stroke-width="2"/>`);
            out.push(`<rect x="20" y="90"  width="70" height="70" fill="${filled >= 3 ? '#FF6B6B' : 'white'}" stroke="#2D3436" stroke-width="2"/>`);
            out.push(`<rect x="90" y="90"  width="70" height="70" fill="${filled >= 4 ? '#FF6B6B' : 'white'}" stroke="#2D3436" stroke-width="2"/>`);
        }
    }
    return `<svg viewBox="0 0 180 180" width="180" height="180" xmlns="http://www.w3.org/2000/svg" class="m-svg">${out.join('')}</svg>`;
}

// Repeated emoji for word problems / counting visuals.
function renderObjects(count, emoji) {
    return `<div class="m-objects">${(emoji + ' ').repeat(count).trim()}</div>`;
}

// Subtraction visual: N objects total, first K marked with a strike-through ❌
// to illustrate "taking away". Example: renderTakeAway(5, 2, '🍪') shows
// 5 cookies, the first 2 with a red X over them.
function renderTakeAway(total, taken, emoji) {
    const items = [];
    for (let i = 0; i < total; i++) {
        if (i < taken) {
            items.push(`<span class="m-take-item m-take-removed">
                <span class="m-take-emoji">${emoji}</span>
                <span class="m-take-x">✖</span>
            </span>`);
        } else {
            items.push(`<span class="m-take-item">
                <span class="m-take-emoji">${emoji}</span>
            </span>`);
        }
    }
    return `<div class="m-take-row">${items.join('')}</div>`;
}

// Two-group "joining" visual for addition: shows group A + group B.
// renderAddGroups(3, 2, '🍎') -> 🍎🍎🍎  ➕  🍎🍎
function renderAddGroups(a, b, emoji) {
    const left = [];
    for (let i = 0; i < a; i++) left.push(`<span class="m-take-emoji">${emoji}</span>`);
    const right = [];
    for (let i = 0; i < b; i++) right.push(`<span class="m-take-emoji">${emoji}</span>`);
    return `<div class="m-addgroups-row">
        <div class="m-addgroups-side">${left.join('')}</div>
        <div class="m-addgroups-plus">➕</div>
        <div class="m-addgroups-side">${right.join('')}</div>
    </div>`;
}

// Ten-frame: 10 cells in a 2x5 grid, the first N filled.
// Crucial visual for first-grade composing/decomposing tens.
function renderTenFrame(filled, color) {
    const cell = 38, gap = 4, w = 5 * cell + 4 * gap, h = 2 * cell + gap;
    const fill = color || '#FF6B6B';
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="white" stroke="#2D3436" stroke-width="3" rx="4"/>`);
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 5; c++) {
            const idx = r * 5 + c;
            const x = c * (cell + gap), y = r * (cell + gap);
            parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="white" stroke="#2D3436" stroke-width="1.5"/>`);
            if (idx < filled) {
                parts.push(`<circle cx="${x + cell/2}" cy="${y + cell/2}" r="${cell/2 - 5}" fill="${fill}" stroke="#9B2C2C" stroke-width="2"/>`);
            }
        }
    }
    return `<svg viewBox="-2 -2 ${w + 4} ${h + 4}" width="${w + 4}" height="${h + 4}" xmlns="http://www.w3.org/2000/svg" class="m-svg">${parts.join('')}</svg>`;
}

// Two ten-frames side by side: useful for sums >10 or for showing "make 10" strategy.
function renderTwoTenFrames(filledA, filledB, colorA, colorB) {
    const cell = 32, gap = 3, oneW = 5 * cell + 4 * gap, h = 2 * cell + gap, sep = 16;
    const w = 2 * oneW + sep;
    const fillA = colorA || '#FF6B6B', fillB = colorB || '#43E97B';
    const parts = [];
    function frame(offsetX, filled, fill) {
        parts.push(`<rect x="${offsetX}" y="0" width="${oneW}" height="${h}" fill="white" stroke="#2D3436" stroke-width="2.5" rx="3"/>`);
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 5; c++) {
                const idx = r * 5 + c;
                const x = offsetX + c * (cell + gap), y = r * (cell + gap);
                parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="white" stroke="#2D3436" stroke-width="1"/>`);
                if (idx < filled) {
                    parts.push(`<circle cx="${x + cell/2}" cy="${y + cell/2}" r="${cell/2 - 4}" fill="${fill}" stroke="#1a1a1a" stroke-width="1.5"/>`);
                }
            }
        }
    }
    frame(0, filledA, fillA);
    frame(oneW + sep, filledB, fillB);
    return `<svg viewBox="-2 -2 ${w + 4} ${h + 4}" width="${w + 4}" height="${h + 4}" xmlns="http://www.w3.org/2000/svg" class="m-svg">${parts.join('')}</svg>`;
}

// 2-digit add visual: "23 + 5" with the ones boxed.
function renderTwoDigitAdd(a, b) {
    return `<div class="m-add-2d">
        <span class="m-add-num">${a}</span>
        <span class="m-add-op">+</span>
        <span class="m-add-num">${b}</span>
    </div>`;
}

// Generic visual dispatcher used by lessons + problems.
function renderVisual(visual) {
    if (!visual) return '';
    switch (visual.type) {
        case 'blocks':       return renderBlocks(visual.tens || 0, visual.ones || 0);
        case 'numberline':   return renderNumberLine(visual.from, visual.to, visual.mark);
        case 'bignum':       return renderBigNumber(visual.n, visual.color);
        case 'compare-pair': return renderComparePair(visual.a, visual.b);
        case 'sequence':     return renderSequence(visual.nums, visual.missingIndex);
        case 'clock':        return renderClock(visual.hour, visual.minute);
        case 'shape':        return renderShape(visual.name);
        case 'fraction':     return renderFraction(visual.shape || 'circle', visual.parts, visual.filled || 0);
        case 'objects':      return renderObjects(visual.count, visual.emoji);
        case 'take-away':    return renderTakeAway(visual.total, visual.taken, visual.emoji);
        case 'add-groups':   return renderAddGroups(visual.a, visual.b, visual.emoji);
        case 'ten-frame':    return renderTenFrame(visual.filled || 0, visual.color);
        case 'two-ten-frames': return renderTwoTenFrames(visual.filledA || 0, visual.filledB || 0, visual.colorA, visual.colorB);
        case 'two-digit-add': return renderTwoDigitAdd(visual.a, visual.b);
        case 'two-digit-num': return renderTwoDigitNumber(visual.n, visual.highlight);
    }
    return '';
}

// ----------------------------------------------------------------------
// MODULE DATA
// All Grade 1 modules. Lesson copy is short, kid-friendly, and recorded
// as a single audio clip. Practice/quiz problems use the generic renderer.
// ----------------------------------------------------------------------

const MODULES = [
    // -------- 1. COUNTING TO 120 --------
    {
        id: 'counting',
        title: 'Counting to 120',
        emoji: '🔢',
        order: 1,
        category: 'A',
        kind: 'generic',
        description: 'Count up, count down, and find missing numbers.',
        lesson: [
            // CONCRETE — count real objects
            {
                title: 'What is Counting?',
                visual: { type: 'objects', count: 5, emoji: '🍎' },
                text: 'Counting tells us HOW MANY. Touch each apple and say a number: one, two, three, four, five!',
                caption: 'Touch and count!',
            },
            // CONCRETE — fingers
            {
                title: 'Use Your Fingers',
                visual: { type: 'objects', count: 5, emoji: '✋' },
                text: 'You have 5 fingers on each hand. That makes counting easy! 1, 2, 3, 4, 5.',
                caption: 'Five fingers!',
            },
            // PICTORIAL — number line
            {
                title: 'The Number Line',
                visual: { type: 'numberline', from: 1, to: 10, mark: 5 },
                text: 'Numbers live in order on a line. Each step on the number line is ONE MORE.',
                caption: 'One more = +1',
            },
            // PICTORIAL — ten-frame
            {
                title: 'Ten in a Frame',
                visual: { type: 'ten-frame', filled: 10 },
                text: 'A ten-frame holds 10 dots. When all cells are full, we have ten!',
                caption: '10 dots = a full frame',
            },
            // STRATEGY — counting by tens
            {
                title: 'Counting by Tens',
                visual: { type: 'numberline', from: 10, to: 100 },
                text: 'For big numbers, count by tens. 10, 20, 30, 40, 50, 60, 70, 80, 90, 100. Fast!',
                caption: '+10 each step',
            },
            // STRATEGY — counting by fives
            {
                title: 'Counting by Fives',
                visual: { type: 'add-groups', a: 5, b: 5, emoji: '✋' },
                text: 'Skip count by fives like fingers on hands: 5, 10, 15, 20, 25.',
                caption: '+5 each step',
            },
            // PRACTICE — find missing
            {
                title: 'What is Missing?',
                visual: { type: 'sequence', nums: [4, 5, 6, 7, 8], missingIndex: 2 },
                text: 'When a number is missing, look at the numbers around it. After 5 comes 6, then 7. The missing number is 6!',
                caption: 'Use neighbors!',
            },
            // STRATEGY — counting backwards
            {
                title: 'Counting Backwards',
                visual: { type: 'numberline', from: 1, to: 10, mark: 5 },
                text: 'We can also count DOWN. Each step is ONE LESS. Try: 10, 9, 8, 7, 6, 5...',
                caption: 'One less = −1',
            },
            // APPLY — count to 120 hint
            {
                title: 'All the Way to 120',
                visual: { type: 'bignum', n: 120 },
                text: 'You can count up to 120 by ones. After 99 comes 100. After 109 comes 110. After 119 comes 120!',
                caption: '99 → 100 → 110 → 120',
            },
        ],
        practice: [
            { type: 'numeric', visual: { type: 'numberline', from: 1, to: 10, mark: 4 }, prompt: 'What number comes after four?', answer: 5, hint: 'Look at the number line. The next number after four is one more.' },
            { type: 'numeric', visual: { type: 'numberline', from: 5, to: 14, mark: 9 }, prompt: 'What number comes after nine?', answer: 10, hint: 'Nine plus one more is ten.' },
            { type: 'numeric', visual: { type: 'numberline', from: 1, to: 10, mark: 7 }, prompt: 'What number comes before seven?', answer: 6, hint: 'One less than seven.' },
            { type: 'numeric', visual: { type: 'sequence', nums: [6, 7, 8, 9], missingIndex: 2 }, prompt: 'What is the missing number?', answer: 8, hint: 'Between seven and nine is eight.' },
            { type: 'numeric', visual: { type: 'sequence', nums: [10, 11, 12, 13, 14], missingIndex: 1 }, prompt: 'What is the missing number?', answer: 11, hint: 'After ten and before twelve.' },
        ],
        quiz: [
            { type: 'numeric', visual: { type: 'numberline', from: 1, to: 10, mark: 5 }, prompt: 'What number comes after five?', answer: 6 },
            { type: 'numeric', visual: { type: 'numberline', from: 5, to: 14, mark: 11 }, prompt: 'What number comes after eleven?', answer: 12 },
            { type: 'numeric', visual: { type: 'numberline', from: 1, to: 10, mark: 9 }, prompt: 'What number comes before nine?', answer: 8 },
            { type: 'numeric', visual: { type: 'sequence', nums: [11, 12, 13, 14, 15], missingIndex: 2 }, prompt: 'What is the missing number?', answer: 13 },
            { type: 'numeric', visual: { type: 'sequence', nums: [17, 18, 19, 20], missingIndex: 1 }, prompt: 'What is the missing number?', answer: 18 },
            { type: 'numeric', visual: { type: 'bignum', n: 14 }, prompt: 'What number comes after fourteen?', answer: 15 },
            { type: 'numeric', visual: { type: 'bignum', n: 20 }, prompt: 'What number comes before twenty?', answer: 19 },
            { type: 'numeric', visual: { type: 'sequence', nums: [10, 20, 30, 40], missingIndex: 2 }, prompt: 'Counting by tens. What is the missing number?', answer: 30 },
            { type: 'numeric', visual: { type: 'sequence', nums: [50, 60, 70, 80], missingIndex: 1 }, prompt: 'Counting by tens. What is the missing number?', answer: 60 },
            { type: 'numeric', visual: { type: 'bignum', n: 99 }, prompt: 'What number comes after ninety-nine?', answer: 100 },
        ],
    },

    // -------- 2. ADDITION (delegates to existing addsub) --------
    {
        id: 'addition',
        title: 'Addition within 20',
        emoji: '➕',
        order: 2,
        category: 'B',
        kind: 'addsub',
        gameMode: 'addition',
        description: 'Put numbers together. Plus, count on, doubles!',
        lesson: [
            // CONCRETE — joining two groups
            {
                title: 'Putting Together',
                visual: { type: 'add-groups', a: 3, b: 2, emoji: '🍎' },
                text: 'Hakan has 3 apples. He gets 2 more. Now he has 5 apples in all! When we put two groups together, we ADD.',
                caption: '3 + 2 = 5',
            },
            // CONCRETE — another example
            {
                title: 'More Joining',
                visual: { type: 'add-groups', a: 4, b: 3, emoji: '🐶' },
                text: 'Four dogs in the park. Three more come to play. Now there are 7 dogs total!',
                caption: '4 + 3 = 7',
            },
            // PICTORIAL — ten-frame
            {
                title: 'Use a Ten-Frame!',
                visual: { type: 'ten-frame', filled: 6 },
                text: 'A ten-frame holds 10 dots in two rows. Six dots fill it part way. We can see the number quickly!',
                caption: '6 dots',
            },
            // PICTORIAL — adding with ten-frame
            {
                title: 'Add with the Ten-Frame',
                visual: { type: 'two-ten-frames', filledA: 5, filledB: 3 },
                text: 'Red has 5. Green has 3. Together: 5 + 3 = 8. The ten-frames help us count.',
                caption: '5 + 3 = 8',
            },
            // ABSTRACT — the plus sign
            {
                title: 'The Plus Sign',
                visual: { type: 'two-digit-add', a: 3, b: 2 },
                text: 'The plus sign + means "and". When you see 3 + 2, it means three AND two together. The answer is 5!',
                caption: 'Plus means and!',
            },
            // STRATEGY — count on
            {
                title: 'Count On Strategy',
                visual: { type: 'numberline', from: 1, to: 10, mark: 8 },
                text: 'Start at the bigger number. Then count UP for the smaller. For 5 + 3: say 5, then 6, 7, 8. The answer is 8!',
                caption: 'Start big, count on!',
            },
            // STRATEGY — doubles
            {
                title: 'Doubles are Magic',
                visual: { type: 'add-groups', a: 5, b: 5, emoji: '⭐' },
                text: 'Doubles are when both numbers are the same. 5 + 5 = 10. 6 + 6 = 12. 7 + 7 = 14. Memorize them!',
                caption: 'Same + same = double!',
            },
            // STRATEGY — make 10
            {
                title: 'Make 10 First!',
                visual: { type: 'two-ten-frames', filledA: 9, filledB: 4 },
                text: 'For 9 + 4, take 1 from the 4 to make 10 in the first frame. Now you have 10 + 3 = 13. Easy!',
                caption: '9 + 4 = 10 + 3 = 13',
            },
            // APPLY — final encouragement
            {
                title: 'You Can Add!',
                visual: { type: 'add-groups', a: 6, b: 4, emoji: '🌟' },
                text: 'Six stars and four more stars make ten stars in all. You are an addition master!',
                caption: '6 + 4 = 10',
            },
        ],
    },

    // -------- 3. SUBTRACTION (delegates) --------
    {
        id: 'subtraction',
        title: 'Subtraction within 20',
        emoji: '➖',
        order: 3,
        category: 'C',
        kind: 'addsub',
        gameMode: 'subtraction',
        description: 'Take some away. Minus, count back!',
        lesson: [
            // CONCRETE — visual take-away with X marks (the user's specific request)
            {
                title: 'Taking Away',
                visual: { type: 'take-away', total: 5, taken: 2, emoji: '🍪' },
                text: 'Hakan has 5 cookies. He eats 2 of them. The 2 with the X are gone! How many cookies are left? Three!',
                caption: '5 − 2 = 3',
            },
            // CONCRETE — another example with different objects to reinforce
            {
                title: 'Another Take-Away',
                visual: { type: 'take-away', total: 6, taken: 4, emoji: '🐟' },
                text: 'Six fish in the pond. Four swim away. Two fish are still here.',
                caption: '6 − 4 = 2',
            },
            // PICTORIAL — bigger numbers
            {
                title: 'More Take-Away',
                visual: { type: 'take-away', total: 8, taken: 3, emoji: '🎈' },
                text: 'Eight balloons. Three pop. Five balloons are still floating!',
                caption: '8 − 3 = 5',
            },
            // ABSTRACT — the minus symbol
            {
                title: 'The Minus Sign',
                visual: { type: 'two-digit-add', a: 5, b: 2 },
                text: 'The minus sign − means "take away". When you see 5 − 2, it means start with 5 and take away 2.',
                caption: 'Minus means take away!',
            },
            // STRATEGY — count back on number line
            {
                title: 'Count Back to Subtract',
                visual: { type: 'numberline', from: 1, to: 10, mark: 5 },
                text: 'Another way: start at the big number and count BACK. For 8 − 3: say 8, then back to 7, 6, 5. The answer is 5!',
                caption: 'Hop backwards!',
            },
            // STRATEGY — using fingers
            {
                title: 'Use Your Fingers!',
                visual: { type: 'take-away', total: 7, taken: 3, emoji: '✋' },
                text: 'Hold up 7 fingers. Fold down 3. The fingers still up tell you the answer. 7 − 3 = 4.',
                caption: 'Fingers are math tools!',
            },
            // CONNECTION — fact families
            {
                title: 'Adding and Subtracting are Buddies',
                visual: { type: 'add-groups', a: 3, b: 5, emoji: '🌟' },
                text: 'If 3 + 5 = 8, then 8 − 5 = 3 and 8 − 3 = 5. They all use the same three numbers!',
                caption: 'Opposites attract!',
            },
            // APPLY — try one
            {
                title: 'You Can Do It!',
                visual: { type: 'take-away', total: 9, taken: 4, emoji: '🍎' },
                text: 'Nine apples. Four are eaten. How many left? Count the apples without the X. Five!',
                caption: '9 − 4 = 5',
            },
        ],
    },

    // -------- 4. FACT FAMILIES (delegates) --------
    {
        id: 'fact-families',
        title: 'Fact Families',
        emoji: '🔺',
        order: 4,
        category: 'N',
        kind: 'factfamily',
        description: 'Three numbers, four facts. The math superpower!',
        lesson: [
            { title: "Three Numbers, One Family", visual: { type: 'sequence', nums: [3, 5, 8], missingIndex: -1 }, text: 'Three numbers can be a fact family. Three, five, and eight all belong together.', caption: 'Family: 3, 5, 8' },
            { title: 'Two Parts Make a Whole', visual: { type: 'add-groups', a: 3, b: 5, emoji: '⭐' }, text: 'Three stars and five stars make eight stars. The two SMALL numbers make the BIG number.', caption: '3 + 5 = 8' },
            { title: 'The Other Way', visual: { type: 'add-groups', a: 5, b: 3, emoji: '⭐' }, text: 'Order does not matter for adding! Five plus three is also eight.', caption: '5 + 3 = 8' },
            { title: 'Take Some Away', visual: { type: 'take-away', total: 8, taken: 3, emoji: '⭐' }, text: 'Eight stars take away three: five left. The big number minus one small gives the other small.', caption: '8 − 3 = 5' },
            { title: 'Take the Other Away', visual: { type: 'take-away', total: 8, taken: 5, emoji: '⭐' }, text: 'Eight stars take away five: three left.', caption: '8 − 5 = 3' },
            { title: 'Four Facts!', visual: { type: 'bignum', n: 4 }, text: 'Each fact family makes 4 math facts: 3+5=8, 5+3=8, 8−3=5, 8−5=3. Same three numbers!', caption: '4 facts from 3 numbers' },
            { title: 'The Triangle Picture', visual: { type: 'shape', name: 'triangle' }, text: 'We draw fact families as triangles. The big number sits on top. The two small ones sit at the bottom corners.', caption: 'Big on top!' },
            { title: 'Another Family: 4, 6, 10', visual: { type: 'add-groups', a: 4, b: 6, emoji: '🍎' }, text: 'Try this family! 4 + 6 = 10, 6 + 4 = 10, 10 − 4 = 6, 10 − 6 = 4.', caption: '4, 6, 10' },
            { title: 'A Math Superpower', visual: { type: 'bignum', n: 8 }, text: 'If you KNOW ONE fact in a family, you know all four! That is your math superpower.', caption: 'Know 1, know 4!' },
        ],
    },

    // -------- 5. PLACE VALUE --------
    {
        id: 'place-value',
        title: 'Place Value',
        emoji: '🧱',
        order: 5,
        category: 'D',
        kind: 'generic',
        description: 'Tens and ones — what each digit means.',
        lesson: [
            { title: 'Counting Ones', visual: { type: 'blocks', tens: 0, ones: 7 }, text: 'When we have a few things, we count them as ONES. Each orange square is one.', caption: '7 ones = 7' },
            { title: 'Bundle Up to a Ten!', visual: { type: 'ten-frame', filled: 10 }, text: 'When you have 10 ones, you can put them together to make ONE TEN. Ten ones = 1 ten.', caption: '10 ones = 1 ten' },
            { title: 'Meet the Ten-Bar', visual: { type: 'blocks', tens: 1, ones: 0 }, text: 'The tall blue bar is one TEN. It has 10 little squares stacked. Use bars instead of counting 10 ones one by one!', caption: '1 ten-bar = 10' },
            { title: 'Two Tens', visual: { type: 'blocks', tens: 2, ones: 0 }, text: 'Two ten-bars together make TWENTY. 10 + 10 = 20.', caption: '2 tens = 20' },
            { title: 'Tens AND Ones', visual: { type: 'blocks', tens: 2, ones: 3 }, text: 'Mix tens and ones. Two ten-bars and three ones make 23.', caption: '20 + 3 = 23' },
            { title: 'Read 47', visual: { type: 'blocks', tens: 4, ones: 7 }, text: 'Count the tens first, then add the ones. 4 tens = 40. Plus 7 ones = 47.', caption: '40 + 7 = 47' },
            { title: 'Tens Place vs Ones Place', visual: { type: 'two-digit-num', n: 47, highlight: 'tens' }, text: 'In 47, the FIRST digit is the tens digit. Four tens! The LAST digit is the ones digit. Seven ones!', caption: 'First = tens, last = ones' },
            { title: 'No Ones?', visual: { type: 'blocks', tens: 6, ones: 0 }, text: 'If there are no orange ones, the number ends in 0. Six tens with zero ones is 60.', caption: '60 = 6 tens, 0 ones' },
            { title: 'Big Number: 99', visual: { type: 'blocks', tens: 9, ones: 9 }, text: '9 tens and 9 ones is 99 — almost a hundred! Just one more makes 100.', caption: '99 = 9 tens, 9 ones' },
        ],
        practice: [
            { type: 'numeric', visual: { type: 'blocks', tens: 3, ones: 5 }, prompt: 'What number is this?', answer: 35, hint: 'Three tens makes thirty. Add five more ones.' },
            { type: 'numeric', visual: { type: 'blocks', tens: 2, ones: 8 }, prompt: 'What number is this?', answer: 28, hint: 'Two tens equals twenty. Plus eight ones.' },
            { type: 'numeric', visual: { type: 'two-digit-num', n: 47, highlight: 'tens' }, prompt: 'How many tens?', answer: 4, hint: 'The tens digit is the first digit.' },
            { type: 'numeric', visual: { type: 'two-digit-num', n: 82, highlight: 'ones' }, prompt: 'How many ones?', answer: 2, hint: 'The ones digit is the last digit.' },
            { type: 'numeric', visual: { type: 'blocks', tens: 6, ones: 0 }, prompt: 'What number is this?', answer: 60, hint: 'Six tens with zero ones is just sixty.' },
        ],
        quiz: [
            { type: 'numeric', visual: { type: 'blocks', tens: 2, ones: 4 }, prompt: 'What number is this?', answer: 24 },
            { type: 'numeric', visual: { type: 'two-digit-num', n: 38, highlight: 'tens' }, prompt: 'How many tens?', answer: 3 },
            { type: 'numeric', visual: { type: 'blocks', tens: 5, ones: 1 }, prompt: 'What number is this?', answer: 51 },
            { type: 'numeric', visual: { type: 'two-digit-num', n: 56, highlight: 'ones' }, prompt: 'How many ones?', answer: 6 },
            { type: 'numeric', visual: { type: 'blocks', tens: 7, ones: 6 }, prompt: 'What number is this?', answer: 76 },
            { type: 'numeric', visual: { type: 'two-digit-num', n: 90, highlight: 'tens' }, prompt: 'How many tens?', answer: 9 },
            { type: 'numeric', visual: { type: 'blocks', tens: 4, ones: 0 }, prompt: 'What number is this?', answer: 40 },
            { type: 'numeric', visual: { type: 'two-digit-num', n: 73, highlight: 'ones' }, prompt: 'How many ones?', answer: 3 },
            { type: 'numeric', visual: { type: 'blocks', tens: 9, ones: 9 }, prompt: 'What number is this?', answer: 99 },
            { type: 'numeric', visual: { type: 'two-digit-num', n: 24, highlight: 'tens' }, prompt: 'How many tens?', answer: 2 },
        ],
    },

    // -------- 6. COMPARE NUMBERS --------
    {
        id: 'compare',
        title: 'Compare Numbers',
        emoji: '⚖️',
        order: 6,
        category: 'E',
        kind: 'generic',
        description: 'Greater than, less than, or equal? You decide!',
        lesson: [
            { title: 'More or Fewer?', visual: { type: 'add-groups', a: 5, b: 3, emoji: '🍎' }, text: 'When we compare, we find which group has MORE or FEWER. Five apples is more than three apples.', caption: 'Compare groups' },
            { title: 'Bigger or Smaller', visual: { type: 'compare-pair', a: 7, b: 3 }, text: 'Numbers can be compared too. Seven is BIGGER than three.', caption: '7 is bigger than 3' },
            { title: 'The Hungry Alligator', visual: { type: 'compare-pair', a: 7, b: 3 }, text: 'The > sign is like an alligator mouth. The mouth always wants to EAT the bigger number!', caption: '7 > 3' },
            { title: 'Greater Than', visual: { type: 'compare-pair', a: 9, b: 4 }, text: 'When the bigger number is on the LEFT, use >. Nine is greater than four.', caption: '9 > 4' },
            { title: 'Less Than', visual: { type: 'compare-pair', a: 3, b: 7 }, text: 'Same alligator, but pointing the OTHER way. < means LESS THAN. Three is less than seven.', caption: '3 < 7' },
            { title: 'Less Than Again', visual: { type: 'compare-pair', a: 2, b: 8 }, text: 'Two is less than eight. The mouth still eats the bigger one!', caption: '2 < 8' },
            { title: 'Equal', visual: { type: 'compare-pair', a: 5, b: 5 }, text: 'When both numbers are the SAME, we use =. Five equals five.', caption: '5 = 5' },
            { title: 'Compare Bigger Numbers', visual: { type: 'compare-pair', a: 23, b: 18 }, text: 'For two-digit numbers, check the TENS first. 2 tens is bigger than 1 ten, so 23 > 18.', caption: '23 > 18 (check tens)' },
            { title: 'Same Tens? Check Ones', visual: { type: 'compare-pair', a: 47, b: 43 }, text: 'If the tens are the SAME, look at the ones. 47 has 7 ones. 43 has 3 ones. So 47 > 43.', caption: '47 > 43 (same tens)' },
        ],
        practice: [
            { type: 'choice', visual: { type: 'compare-pair', a: 5, b: 8 }, prompt: 'Five compared to eight?', choices: ['>', '<', '='], answerIndex: 1, hint: 'Five is smaller than eight, so it is less than.' },
            { type: 'choice', visual: { type: 'compare-pair', a: 12, b: 7 }, prompt: 'Twelve compared to seven?', choices: ['>', '<', '='], answerIndex: 0, hint: 'Twelve is bigger than seven, so it is greater than.' },
            { type: 'choice', visual: { type: 'compare-pair', a: 6, b: 6 }, prompt: 'Six compared to six?', choices: ['>', '<', '='], answerIndex: 2, hint: 'Same numbers means equal.' },
            { type: 'choice', visual: { type: 'compare-pair', a: 9, b: 11 }, prompt: 'Nine compared to eleven?', choices: ['>', '<', '='], answerIndex: 1, hint: 'Nine is less than eleven.' },
            { type: 'choice', visual: { type: 'compare-pair', a: 15, b: 5 }, prompt: 'Fifteen compared to five?', choices: ['>', '<', '='], answerIndex: 0, hint: 'Fifteen is much bigger than five.' },
        ],
        quiz: [
            { type: 'choice', visual: { type: 'compare-pair', a: 4, b: 9 }, prompt: 'Four compared to nine?', choices: ['>', '<', '='], answerIndex: 1 },
            { type: 'choice', visual: { type: 'compare-pair', a: 13, b: 10 }, prompt: 'Thirteen compared to ten?', choices: ['>', '<', '='], answerIndex: 0 },
            { type: 'choice', visual: { type: 'compare-pair', a: 7, b: 7 }, prompt: 'Seven compared to seven?', choices: ['>', '<', '='], answerIndex: 2 },
            { type: 'choice', visual: { type: 'compare-pair', a: 11, b: 8 }, prompt: 'Eleven compared to eight?', choices: ['>', '<', '='], answerIndex: 0 },
            { type: 'choice', visual: { type: 'compare-pair', a: 3, b: 18 }, prompt: 'Three compared to eighteen?', choices: ['>', '<', '='], answerIndex: 1 },
            { type: 'choice', visual: { type: 'compare-pair', a: 20, b: 20 }, prompt: 'Twenty compared to twenty?', choices: ['>', '<', '='], answerIndex: 2 },
            { type: 'choice', visual: { type: 'compare-pair', a: 6, b: 16 }, prompt: 'Six compared to sixteen?', choices: ['>', '<', '='], answerIndex: 1 },
            { type: 'choice', visual: { type: 'compare-pair', a: 14, b: 4 }, prompt: 'Fourteen compared to four?', choices: ['>', '<', '='], answerIndex: 0 },
            { type: 'choice', visual: { type: 'compare-pair', a: 17, b: 12 }, prompt: 'Seventeen compared to twelve?', choices: ['>', '<', '='], answerIndex: 0 },
            { type: 'choice', visual: { type: 'compare-pair', a: 9, b: 9 }, prompt: 'Nine compared to nine?', choices: ['>', '<', '='], answerIndex: 2 },
        ],
    },

    // -------- 7. BIGGER NUMBERS (2-digit + 1-digit) --------
    {
        id: 'two-digit-plus',
        title: 'Bigger Numbers',
        emoji: '🔟',
        order: 7,
        category: 'D',
        kind: 'generic',
        description: 'Add a small number to a bigger one.',
        lesson: [
            { title: 'A New Challenge', visual: { type: 'two-digit-add', a: 23, b: 5 }, text: 'Today we will add a small number to a BIG number. Like 23 + 5. Sounds hard? It is easy!', caption: 'Big + small' },
            { title: 'See 23 with Blocks', visual: { type: 'blocks', tens: 2, ones: 3 }, text: 'First, picture 23. Two ten-bars and three little ones. That is 23!', caption: '23 = 2 tens + 3 ones' },
            { title: 'Now Add 5 More Ones', visual: { type: 'blocks', tens: 2, ones: 8 }, text: 'Adding 5 means adding 5 more orange ones. Now we have 8 ones in total.', caption: '3 + 5 = 8' },
            { title: 'Tens Stay the Same!', visual: { type: 'two-digit-num', n: 23, highlight: 'tens' }, text: 'The TENS digit does not change. Two tens stay as two tens. Only the ONES change.', caption: 'Tens never change' },
            { title: 'The Trick', visual: { type: 'two-digit-num', n: 28, highlight: 'ones' }, text: 'Just add the ones. Three plus five is eight. Put the 8 in the ones place. 23 + 5 = 28!', caption: '23 + 5 = 28' },
            { title: 'Try Another: 41 + 6', visual: { type: 'two-digit-add', a: 41, b: 6 }, text: 'Forty-one plus six. Add the ones: 1 + 6 = 7. Tens stay at 4. Answer: 47.', caption: '41 + 6 = 47' },
            { title: 'And Another: 35 + 4', visual: { type: 'two-digit-add', a: 35, b: 4 }, text: 'Thirty-five plus four. Ones: 5 + 4 = 9. Tens: still 3. Answer: 39.', caption: '35 + 4 = 39' },
            { title: 'Watch Out: Ones Plus Ones', visual: { type: 'two-digit-add', a: 56, b: 3 }, text: 'For 56 + 3: ones 6 + 3 = 9. Tens stay at 5. Answer: 59. Easy!', caption: '56 + 3 = 59' },
            { title: 'You are a Big-Number Adder', visual: { type: 'blocks', tens: 7, ones: 8 }, text: 'Just add the ones, keep the tens. You can now add to 70, 80, even 99! Great job.', caption: 'Just add the ones!' },
        ],
        practice: [
            { type: 'numeric', visual: { type: 'two-digit-add', a: 23, b: 5 }, prompt: 'Twenty-three plus five?', answer: 28, hint: 'Three plus five is eight. Tens stay at twenty.' },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 41, b: 6 }, prompt: 'Forty-one plus six?', answer: 47, hint: 'One plus six is seven. Plus forty.' },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 35, b: 4 }, prompt: 'Thirty-five plus four?', answer: 39, hint: 'Five plus four is nine. Plus thirty.' },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 12, b: 7 }, prompt: 'Twelve plus seven?', answer: 19, hint: 'Two plus seven is nine. Plus ten.' },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 56, b: 3 }, prompt: 'Fifty-six plus three?', answer: 59, hint: 'Six plus three is nine. Plus fifty.' },
        ],
        quiz: [
            { type: 'numeric', visual: { type: 'two-digit-add', a: 21, b: 4 }, prompt: 'Twenty-one plus four?', answer: 25 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 33, b: 6 }, prompt: 'Thirty-three plus six?', answer: 39 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 45, b: 2 }, prompt: 'Forty-five plus two?', answer: 47 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 17, b: 2 }, prompt: 'Seventeen plus two?', answer: 19 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 62, b: 5 }, prompt: 'Sixty-two plus five?', answer: 67 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 74, b: 3 }, prompt: 'Seventy-four plus three?', answer: 77 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 51, b: 8 }, prompt: 'Fifty-one plus eight?', answer: 59 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 24, b: 5 }, prompt: 'Twenty-four plus five?', answer: 29 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 13, b: 6 }, prompt: 'Thirteen plus six?', answer: 19 },
            { type: 'numeric', visual: { type: 'two-digit-add', a: 82, b: 4 }, prompt: 'Eighty-two plus four?', answer: 86 },
        ],
    },

    // -------- 8. TIME (HOUR & HALF-HOUR) --------
    {
        id: 'time',
        title: 'Telling Time',
        emoji: '🕐',
        order: 8,
        category: 'F',
        kind: 'generic',
        description: 'Read a clock — hour and half-hour.',
        lesson: [
            { title: 'Meet the Clock', visual: { type: 'clock', hour: 3, minute: 0 }, text: 'A clock tells time. It has two hands and the numbers 1 through 12 around the edge.', caption: '1 to 12' },
            { title: 'Two Hands', visual: { type: 'clock', hour: 6, minute: 0 }, text: 'The SHORT hand shows the HOUR. The LONG hand shows the MINUTES. Always read the short hand first!', caption: 'Short = hour' },
            { title: "O'Clock!", visual: { type: 'clock', hour: 3, minute: 0 }, text: 'When the long hand points to 12, we say "o\'clock". This is THREE O\'CLOCK.', caption: 'Long on 12 = o\'clock' },
            { title: 'More O\'Clock', visual: { type: 'clock', hour: 7, minute: 0 }, text: 'Long hand on 12, short hand on 7. Seven o\'clock!', caption: '7 o\'clock' },
            { title: '12 O\'Clock', visual: { type: 'clock', hour: 12, minute: 0 }, text: 'Both hands on 12 means 12 o\'clock. That is noon (lunch!) or midnight.', caption: '12 o\'clock' },
            { title: 'Half Past', visual: { type: 'clock', hour: 3, minute: 30 }, text: 'When the long hand points to 6, we say "half past". The clock has gone HALFWAY around.', caption: 'Long on 6 = half past' },
            { title: 'Half Past 7', visual: { type: 'clock', hour: 7, minute: 30 }, text: 'Long hand on 6, short hand BETWEEN 7 and 8. Always pick the SMALLER number: half past 7.', caption: 'Half past 7' },
            { title: 'Half Past 12', visual: { type: 'clock', hour: 12, minute: 30 }, text: 'Long hand on 6. Short hand between 12 and 1. We say "half past 12".', caption: 'Half past 12' },
            { title: 'Reading Time', visual: { type: 'clock', hour: 5, minute: 0 }, text: 'Steps: 1) Find the long hand. On 12 = o\'clock. On 6 = half past. 2) Find the short hand for the hour.', caption: 'Long first, then short' },
            { title: 'You Can Tell Time!', visual: { type: 'clock', hour: 9, minute: 30 }, text: 'Long hand on 6, short hand between 9 and 10. Half past 9!', caption: 'Half past 9' },
        ],
        practice: [
            { type: 'choice', visual: { type: 'clock', hour: 4, minute: 0 }, prompt: 'What time is this?', choices: ["3 o'clock", "4 o'clock", "Half past 3", "Half past 4"], answerIndex: 1, hint: 'Long hand on twelve, short hand on four.' },
            { type: 'choice', visual: { type: 'clock', hour: 6, minute: 30 }, prompt: 'What time is this?', choices: ["6 o'clock", "Half past 6", "Half past 7", "7 o'clock"], answerIndex: 1, hint: 'Long hand on six means half past.' },
            { type: 'choice', visual: { type: 'clock', hour: 9, minute: 0 }, prompt: 'What time is this?', choices: ["8 o'clock", "9 o'clock", "Half past 8", "Half past 9"], answerIndex: 1, hint: 'Long hand on twelve, short hand on nine.' },
            { type: 'choice', visual: { type: 'clock', hour: 2, minute: 30 }, prompt: 'What time is this?', choices: ["2 o'clock", "Half past 2", "Half past 3", "3 o'clock"], answerIndex: 1, hint: 'Half past two!' },
            { type: 'choice', visual: { type: 'clock', hour: 12, minute: 0 }, prompt: 'What time is this?', choices: ["1 o'clock", "12 o'clock", "Half past 12", "Half past 1"], answerIndex: 1, hint: 'Both hands at the top!' },
        ],
        quiz: [
            { type: 'choice', visual: { type: 'clock', hour: 5, minute: 0 }, prompt: 'What time is this?', choices: ["4 o'clock", "5 o'clock", "Half past 4", "Half past 5"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 7, minute: 30 }, prompt: 'What time is this?', choices: ["7 o'clock", "Half past 7", "Half past 8", "8 o'clock"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 10, minute: 0 }, prompt: 'What time is this?', choices: ["9 o'clock", "10 o'clock", "Half past 9", "Half past 10"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 1, minute: 30 }, prompt: 'What time is this?', choices: ["1 o'clock", "Half past 1", "Half past 2", "2 o'clock"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 8, minute: 0 }, prompt: 'What time is this?', choices: ["7 o'clock", "8 o'clock", "Half past 7", "Half past 8"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 3, minute: 30 }, prompt: 'What time is this?', choices: ["3 o'clock", "Half past 3", "Half past 4", "4 o'clock"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 11, minute: 0 }, prompt: 'What time is this?', choices: ["10 o'clock", "11 o'clock", "Half past 10", "Half past 11"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 9, minute: 30 }, prompt: 'What time is this?', choices: ["9 o'clock", "Half past 9", "Half past 10", "10 o'clock"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 6, minute: 0 }, prompt: 'What time is this?', choices: ["5 o'clock", "6 o'clock", "Half past 5", "Half past 6"], answerIndex: 1 },
            { type: 'choice', visual: { type: 'clock', hour: 4, minute: 30 }, prompt: 'What time is this?', choices: ["4 o'clock", "Half past 4", "Half past 5", "5 o'clock"], answerIndex: 1 },
        ],
    },

    // -------- 9. SHAPES & EQUAL PARTS --------
    {
        id: 'shapes',
        title: 'Shapes & Halves',
        emoji: '🔷',
        order: 9,
        category: 'H',
        kind: 'generic',
        description: 'Circles, squares, triangles — and equal parts!',
        lesson: [
            { title: 'Circle', visual: { type: 'shape', name: 'circle' }, text: 'A CIRCLE is round. No corners, no straight sides. Like a wheel or the moon!', caption: 'Round = circle' },
            { title: 'Square', visual: { type: 'shape', name: 'square' }, text: 'A SQUARE has 4 sides — and they are all the SAME LENGTH. It also has 4 corners.', caption: '4 equal sides' },
            { title: 'Triangle', visual: { type: 'shape', name: 'triangle' }, text: 'A TRIANGLE has 3 sides and 3 corners. "Tri" means three!', caption: '3 sides, 3 corners' },
            { title: 'Rectangle', visual: { type: 'shape', name: 'rectangle' }, text: 'A RECTANGLE has 4 sides too. But two are LONG and two are SHORT. Like a door.', caption: '2 long + 2 short' },
            { title: 'Shapes Around Us', visual: { type: 'shape', name: 'circle' }, text: 'Find shapes! A clock is a circle. A book is a rectangle. A pizza slice is a triangle. Look around!', caption: 'Shapes everywhere' },
            { title: 'Cutting Equal Parts', visual: { type: 'fraction', shape: 'circle', parts: 2, filled: 1 }, text: 'We can cut shapes into PIECES. When all pieces are the SAME size, they are equal.', caption: 'Equal = same size' },
            { title: 'Halves', visual: { type: 'fraction', shape: 'circle', parts: 2, filled: 1 }, text: 'Two equal parts are called HALVES. One of them is "one half". Like cutting a pizza in two.', caption: '2 equal = halves' },
            { title: 'Halves of a Square', visual: { type: 'fraction', shape: 'square', parts: 2, filled: 1 }, text: 'You can also cut a square into halves. Two equal pieces!', caption: 'Square halves' },
            { title: 'Fourths', visual: { type: 'fraction', shape: 'circle', parts: 4, filled: 1 }, text: 'Four equal parts are called FOURTHS or QUARTERS. Like cutting a pizza into 4 slices.', caption: '4 equal = fourths' },
            { title: 'Must Be Equal!', visual: { type: 'fraction', shape: 'square', parts: 4, filled: 4 }, text: 'Halves and fourths must always be the SAME size. If pieces are different sizes, they are NOT halves or fourths.', caption: 'Same size only!' },
        ],
        practice: [
            { type: 'choice', visual: { type: 'shape', name: 'circle' }, prompt: 'What shape is this?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 0, hint: 'Round and no corners!' },
            { type: 'choice', visual: { type: 'shape', name: 'square' }, prompt: 'What shape is this?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 1, hint: 'Four equal sides!' },
            { type: 'choice', visual: { type: 'shape', name: 'triangle' }, prompt: 'What shape is this?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 2, hint: 'Three sides!' },
            { type: 'choice', visual: { type: 'fraction', shape: 'circle', parts: 2, filled: 1 }, prompt: 'How many equal parts?', choices: ['Two', 'Three', 'Four', 'Five'], answerIndex: 0, hint: 'Count the slices!' },
            { type: 'choice', visual: { type: 'fraction', shape: 'square', parts: 4, filled: 2 }, prompt: 'How many equal parts?', choices: ['Two', 'Three', 'Four', 'Five'], answerIndex: 2, hint: 'Two by two!' },
        ],
        quiz: [
            { type: 'choice', visual: { type: 'shape', name: 'rectangle' }, prompt: 'What shape is this?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 3 },
            { type: 'choice', visual: { type: 'shape', name: 'triangle' }, prompt: 'What shape is this?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 2 },
            { type: 'choice', visual: { type: 'shape', name: 'circle' }, prompt: 'What shape is this?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 0 },
            { type: 'choice', visual: { type: 'shape', name: 'square' }, prompt: 'What shape is this?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 1 },
            { type: 'choice', visual: { type: 'fraction', shape: 'circle', parts: 4, filled: 1 }, prompt: 'How many equal parts?', choices: ['Two', 'Three', 'Four', 'Five'], answerIndex: 2 },
            { type: 'choice', visual: { type: 'fraction', shape: 'square', parts: 2, filled: 1 }, prompt: 'How many equal parts?', choices: ['Two', 'Three', 'Four', 'Five'], answerIndex: 0 },
            { type: 'choice', visual: { type: 'fraction', shape: 'circle', parts: 2, filled: 2 }, prompt: 'How many equal parts?', choices: ['Two', 'Three', 'Four', 'Five'], answerIndex: 0 },
            { type: 'choice', visual: { type: 'fraction', shape: 'square', parts: 4, filled: 4 }, prompt: 'How many equal parts?', choices: ['Two', 'Three', 'Four', 'Five'], answerIndex: 2 },
            { type: 'choice', visual: { type: 'shape', name: 'circle' }, prompt: 'A shape with no corners?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 0 },
            { type: 'choice', visual: { type: 'shape', name: 'triangle' }, prompt: 'A shape with three sides?', choices: ['Circle', 'Square', 'Triangle', 'Rectangle'], answerIndex: 2 },
        ],
    },

    // -------- 10. WORD PROBLEMS --------
    {
        id: 'word-problems',
        title: 'Word Problems',
        emoji: '📖',
        order: 10,
        category: 'M',
        kind: 'generic',
        description: 'Math stories. Find the numbers and solve!',
        lesson: [
            { title: 'A Math Story', visual: { type: 'objects', count: 3, emoji: '🍎' }, text: 'Hakan has 3 apples. He gets 2 more. How many in all? That is a math story — also called a word problem.', caption: 'A word problem' },
            { title: 'Step 1: Read Carefully', visual: { type: 'objects', count: 3, emoji: '🍎' }, text: 'Read the whole story slowly. Picture it in your head. Hakan starts with 3 apples.', caption: 'Read & picture' },
            { title: 'Step 2: Find the Numbers', visual: { type: 'sequence', nums: [3, 2], missingIndex: -1 }, text: 'Look for numbers in the story: 3 and 2. Underline them!', caption: 'Find: 3 and 2' },
            { title: 'Step 3: Add or Subtract?', visual: { type: 'add-groups', a: 3, b: 2, emoji: '🍎' }, text: 'Did Hakan get MORE or LOSE some? "Gets more" = ADD. Hakan ADDED 2 to his 3.', caption: 'Got more = add' },
            { title: 'Step 4: Solve!', visual: { type: 'two-digit-add', a: 3, b: 2 }, text: '3 + 2 = 5. Hakan has 5 apples in all!', caption: '3 + 2 = 5' },
            { title: 'Take-Away Story', visual: { type: 'take-away', total: 7, taken: 2, emoji: '🍪' }, text: 'Now a different story: 7 cookies. Hakan eats 2. How many left? Eating means TAKING AWAY → subtract!', caption: '7 − 2 = 5 left' },
            { title: 'Key Words for ADD', visual: { type: 'add-groups', a: 4, b: 3, emoji: '⭐' }, text: 'Words that mean ADD: "in all", "altogether", "more", "joined". When you see these, plus!', caption: 'in all = +' },
            { title: 'Key Words for SUBTRACT', visual: { type: 'take-away', total: 8, taken: 3, emoji: '🐶' }, text: 'Words that mean SUBTRACT: "left", "ate", "gave away", "fewer", "how many more". When you see these, minus!', caption: 'left = −' },
            { title: 'Compare Stories', visual: { type: 'compare-pair', a: 8, b: 5 }, text: 'Some stories ask "how many MORE?" That means subtract. Hakan has 8, Sara has 5. Hakan has 8 − 5 = 3 more.', caption: 'how many more = −' },
            { title: 'You Can Solve Stories!', visual: { type: 'objects', count: 6, emoji: '🌟' }, text: 'Read carefully, find the numbers, decide add or subtract, then solve. Easy!', caption: '4 simple steps' },
        ],
        practice: [
            { type: 'numeric', visual: { type: 'objects', count: 6, emoji: '🐶' }, prompt: 'Hakan has four dogs. Two more come. How many dogs in all?', answer: 6, hint: 'Four plus two.' },
            { type: 'numeric', visual: { type: 'objects', count: 5, emoji: '🍪' }, prompt: 'There are eight cookies. Hakan eats three. How many are left?', answer: 5, hint: 'Eight minus three.' },
            { type: 'numeric', visual: { type: 'objects', count: 9, emoji: '⭐' }, prompt: 'Hakan has seven stars. He gets two more. How many stars?', answer: 9, hint: 'Seven plus two.' },
            { type: 'numeric', visual: { type: 'objects', count: 4, emoji: '🎈' }, prompt: 'Ten balloons. Six pop. How many are left?', answer: 4, hint: 'Ten minus six.' },
            { type: 'numeric', visual: { type: 'objects', count: 12, emoji: '🐠' }, prompt: 'Five fish in a tank. Seven more are added. How many fish?', answer: 12, hint: 'Five plus seven.' },
        ],
        quiz: [
            { type: 'numeric', visual: { type: 'objects', count: 7, emoji: '🍎' }, prompt: 'Three apples. Four more apples. How many in all?', answer: 7 },
            { type: 'numeric', visual: { type: 'objects', count: 4, emoji: '🐱' }, prompt: 'Nine cats. Five run away. How many cats are left?', answer: 4 },
            { type: 'numeric', visual: { type: 'objects', count: 11, emoji: '⚽' }, prompt: 'Six balls. Five more balls. How many in all?', answer: 11 },
            { type: 'numeric', visual: { type: 'objects', count: 8, emoji: '🦋' }, prompt: 'Twelve butterflies. Four fly away. How many are left?', answer: 8 },
            { type: 'numeric', visual: { type: 'objects', count: 10, emoji: '🐟' }, prompt: 'Two fish. Eight more fish. How many in all?', answer: 10 },
            { type: 'numeric', visual: { type: 'objects', count: 5, emoji: '🍓' }, prompt: 'Hakan has fifteen strawberries. He eats ten. How many are left?', answer: 5 },
            { type: 'numeric', visual: { type: 'objects', count: 9, emoji: '🦆' }, prompt: 'Four ducks. Five more come. How many ducks?', answer: 9 },
            { type: 'numeric', visual: { type: 'objects', count: 3, emoji: '🐰' }, prompt: 'Eleven bunnies. Eight hop away. How many are left?', answer: 3 },
            { type: 'numeric', visual: { type: 'objects', count: 14, emoji: '🌟' }, prompt: 'Eight stars. Six more stars. How many in all?', answer: 14 },
            { type: 'numeric', visual: { type: 'objects', count: 6, emoji: '🐢' }, prompt: 'Twenty turtles. Fourteen swim away. How many are left?', answer: 6 },
        ],
    },
,
    // ===== BULK GENERATED MODULES =====
    {
    "id": "add-0",
    "title": "Adding 0",
    "emoji": "0",
    "category": "B",
    "description": "Add 0 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Plus Zero",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "text": "Adding 0 means NOTHING is added. The number stays the same!",
        "caption": "5 + 0 = 5"
      },
      {
        "title": "Try It",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 0
        },
        "text": "3 plus 0? Still 3. Easy!",
        "caption": "3 + 0 = 3"
      },
      {
        "title": "Big Numbers Too",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 0
        },
        "text": "17 + 0 = 17. The zero changes nothing.",
        "caption": "17 + 0 = 17"
      },
      {
        "title": "Plus Zero on Either Side",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "text": "0 + 8 also equals 8. Order does not matter for adding!",
        "caption": "0 + 8 = 8"
      },
      {
        "title": "You Got This!",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 0
        },
        "text": "Adding zero is the easiest math trick! The answer is the other number.",
        "caption": "Plus 0 = same!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 0
        },
        "prompt": "Zero plus zero?",
        "answer": 0,
        "hint": "0 plus 0: plus zero stays the same!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 0
        },
        "prompt": "One plus zero?",
        "answer": 1,
        "hint": "1 plus 0: plus zero stays the same!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 0
        },
        "prompt": "Two plus zero?",
        "answer": 2,
        "hint": "2 plus 0: plus zero stays the same!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 0
        },
        "prompt": "Three plus zero?",
        "answer": 3,
        "hint": "3 plus 0: plus zero stays the same!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 0
        },
        "prompt": "Four plus zero?",
        "answer": 4,
        "hint": "4 plus 0: plus zero stays the same!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus zero?",
        "answer": 5,
        "hint": "5 plus 0: plus zero stays the same!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus zero?",
        "answer": 6,
        "hint": "6 plus 0: plus zero stays the same!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus zero?",
        "answer": 7,
        "hint": "7 plus 0: plus zero stays the same!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 0
        },
        "prompt": "Two plus zero?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus zero?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 0
        },
        "prompt": "Eight plus zero?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 0
        },
        "prompt": "Zero plus zero?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 0
        },
        "prompt": "Three plus zero?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus zero?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 0
        },
        "prompt": "Nine plus zero?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 0
        },
        "prompt": "One plus zero?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 0
        },
        "prompt": "Four plus zero?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus zero?",
        "answer": 7
      }
    ]
  },
  {
    "id": "add-1",
    "title": "Adding 1",
    "emoji": "️",
    "category": "B",
    "description": "Add 1 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Just the Next Number",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 5
        },
        "text": "Adding 1 means going to the NEXT number. After 5 comes 6!",
        "caption": "After = +1"
      },
      {
        "title": "Count Up by One",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 1,
          "emoji": "🍊"
        },
        "text": "4 plus 1: just say the next number. 5!",
        "caption": "4 + 1 = 5"
      },
      {
        "title": "Bigger Numbers",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 1
        },
        "text": "8 + 1 = 9. After 8 comes 9.",
        "caption": "8 + 1 = 9"
      },
      {
        "title": "Even Bigger",
        "visual": {
          "type": "two-digit-add",
          "a": 19,
          "b": 1
        },
        "text": "19 + 1 = 20. After 19 comes 20!",
        "caption": "19 + 1 = 20"
      },
      {
        "title": "You Just Add 1",
        "visual": {
          "type": "numberline",
          "from": 10,
          "to": 20,
          "mark": 15
        },
        "text": "Plus one = one hop on the number line. Easy!",
        "caption": "+1 = next number"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 1
        },
        "prompt": "Zero plus one?",
        "answer": 1,
        "hint": "0 plus 1: just say the next number!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2,
        "hint": "1 plus 1: just say the next number!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 1
        },
        "prompt": "Two plus one?",
        "answer": 3,
        "hint": "2 plus 1: just say the next number!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 1
        },
        "prompt": "Three plus one?",
        "answer": 4,
        "hint": "3 plus 1: just say the next number!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four plus one?",
        "answer": 5,
        "hint": "4 plus 1: just say the next number!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 1
        },
        "prompt": "Five plus one?",
        "answer": 6,
        "hint": "5 plus 1: just say the next number!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus one?",
        "answer": 7,
        "hint": "6 plus 1: just say the next number!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven plus one?",
        "answer": 8,
        "hint": "7 plus 1: just say the next number!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 1
        },
        "prompt": "Two plus one?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 1
        },
        "prompt": "Five plus one?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 1
        },
        "prompt": "Eight plus one?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 1
        },
        "prompt": "Zero plus one?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 1
        },
        "prompt": "Three plus one?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus one?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 1
        },
        "prompt": "Nine plus one?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four plus one?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven plus one?",
        "answer": 8
      }
    ]
  },
  {
    "id": "add-2",
    "title": "Adding 2",
    "emoji": "⃣",
    "category": "B",
    "description": "Add 2 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Two Hops Up",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 5
        },
        "text": "Adding 2 means TWO hops on the number line.",
        "caption": "+2 = 2 hops"
      },
      {
        "title": "Skip One",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 2,
          "emoji": "🍋"
        },
        "text": "3 plus 2: count up two: 4, 5. Answer is 5!",
        "caption": "3 + 2 = 5"
      },
      {
        "title": "Try 6 + 2",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 2
        },
        "text": "6, then 7, then 8. So 6 + 2 = 8.",
        "caption": "6 + 2 = 8"
      },
      {
        "title": "Try 14 + 2",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 2
        },
        "text": "14, 15, 16. 14 + 2 = 16!",
        "caption": "14 + 2 = 16"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "text": "2 + 2 is a double — easy! Answer: 4.",
        "caption": "2 + 2 = 4"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 2
        },
        "prompt": "Zero plus two?",
        "answer": 2,
        "hint": "0 plus 2: count up 2: 1, 2!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "prompt": "One plus two?",
        "answer": 3,
        "hint": "1 plus 2: count up 2: 2, 3!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4,
        "hint": "2 plus 2: count up 2: 3, 4!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5,
        "hint": "3 plus 2: count up 2: 4, 5!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four plus two?",
        "answer": 6,
        "hint": "4 plus 2: count up 2: 5, 6!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five plus two?",
        "answer": 7,
        "hint": "5 plus 2: count up 2: 6, 7!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 2
        },
        "prompt": "Six plus two?",
        "answer": 8,
        "hint": "6 plus 2: count up 2: 7, 8!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "prompt": "Seven plus two?",
        "answer": 9,
        "hint": "7 plus 2: count up 2: 8, 9!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five plus two?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 2
        },
        "prompt": "Eight plus two?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 2
        },
        "prompt": "Zero plus two?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 2
        },
        "prompt": "Six plus two?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 2
        },
        "prompt": "Nine plus two?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "prompt": "One plus two?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four plus two?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "prompt": "Seven plus two?",
        "answer": 9
      }
    ]
  },
  {
    "id": "add-3",
    "title": "Adding 3",
    "emoji": "1",
    "category": "B",
    "description": "Add 3 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Adding 3",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍌"
        },
        "text": "Today we add 3. Add 3 to a number means COUNT UP by 3.",
        "caption": "+3 = count up 3"
      },
      {
        "title": "Count On",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 6
        },
        "text": "Start at 3. Count up 3. Where do you land?",
        "caption": "3 + 3 = 6"
      },
      {
        "title": "Try a Bigger Number",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "text": "5 plus 3? Count up: 6, 7… Total: 8.",
        "caption": "5 + 3 = 8"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "text": "Bonus: 3 + 3 is a double. 3+3=6.",
        "caption": "3 + 3 = 6"
      },
      {
        "title": "You Are Adding!",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍌"
        },
        "text": "Adding 3 to anything: just count up 3 times. Practice makes perfect!",
        "caption": "+3 = up 3"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 3
        },
        "prompt": "Zero plus three?",
        "answer": 3,
        "hint": "0 plus 3: count up 3: 1, 2, 3!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 3
        },
        "prompt": "One plus three?",
        "answer": 4,
        "hint": "1 plus 3: count up 3: 2, 3, 4!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5,
        "hint": "2 plus 3: count up 3: 3, 4, 5!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6,
        "hint": "3 plus 3: count up 3: 4, 5, 6!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus three?",
        "answer": 7,
        "hint": "4 plus 3: count up 3: 5, 6, 7!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus three?",
        "answer": 8,
        "hint": "5 plus 3: count up 3: 6, 7, 8!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six plus three?",
        "answer": 9,
        "hint": "6 plus 3: count up 3: 7, 8, 9!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven plus three?",
        "answer": 10,
        "hint": "7 plus 3: count up 3: 8, 9, 10!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus three?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 3
        },
        "prompt": "Zero plus three?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six plus three?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 3
        },
        "prompt": "Nine plus three?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 3
        },
        "prompt": "One plus three?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus three?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven plus three?",
        "answer": 10
      }
    ]
  },
  {
    "id": "add-4",
    "title": "Adding 4",
    "emoji": "️",
    "category": "B",
    "description": "Add 4 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Adding 4",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 4,
          "emoji": "🍇"
        },
        "text": "Today we add 4. Add 4 to a number means COUNT UP by 4.",
        "caption": "+4 = count up 4"
      },
      {
        "title": "Count On",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 7
        },
        "text": "Start at 3. Count up 4. Where do you land?",
        "caption": "3 + 4 = 7"
      },
      {
        "title": "Try a Bigger Number",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "text": "5 plus 4? Count up: 6, 7… Total: 9.",
        "caption": "5 + 4 = 9"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "text": "Bonus: 4 + 4 is a double. 4+4=8.",
        "caption": "4 + 4 = 8"
      },
      {
        "title": "You Are Adding!",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 4,
          "emoji": "🍇"
        },
        "text": "Adding 4 to anything: just count up 4 times. Practice makes perfect!",
        "caption": "+4 = up 4"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 4
        },
        "prompt": "Zero plus four?",
        "answer": 4,
        "hint": "0 plus 4: count up 4: 1, 2, 3, 4!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "prompt": "One plus four?",
        "answer": 5,
        "hint": "1 plus 4: count up 4: 2, 3, 4, 5!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus four?",
        "answer": 6,
        "hint": "2 plus 4: count up 4: 3, 4, 5, 6!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7,
        "hint": "3 plus 4: count up 4: 4, 5, 6, 7!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8,
        "hint": "4 plus 4: count up 4: 5, 6, 7, 8!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9,
        "hint": "5 plus 4: count up 4: 6, 7, 8, 9!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 4
        },
        "prompt": "Six plus four?",
        "answer": 10,
        "hint": "6 plus 4: count up 4: 7, 8, 9, 10!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "prompt": "Seven plus four?",
        "answer": 11,
        "hint": "7 plus 4: count up 4: 8, 9, 10, 11!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus four?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 4
        },
        "prompt": "Zero plus four?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 4
        },
        "prompt": "Six plus four?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "prompt": "One plus four?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "prompt": "Seven plus four?",
        "answer": 11
      }
    ]
  },
  {
    "id": "add-5",
    "title": "Adding 5",
    "emoji": "⃣",
    "category": "B",
    "description": "Add 5 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Adding 5",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 5,
          "emoji": "🍓"
        },
        "text": "Today we add 5. Add 5 to a number means COUNT UP by 5.",
        "caption": "+5 = count up 5"
      },
      {
        "title": "Count On",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 8
        },
        "text": "Start at 3. Count up 5. Where do you land?",
        "caption": "3 + 5 = 8"
      },
      {
        "title": "Try a Bigger Number",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "text": "5 plus 5? Count up: 6, 7… Total: 10.",
        "caption": "5 + 5 = 10"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "text": "Bonus: 5 + 5 is a double. 5+5=10.",
        "caption": "5 + 5 = 10"
      },
      {
        "title": "You Are Adding!",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 5,
          "emoji": "🍓"
        },
        "text": "Adding 5 to anything: just count up 5 times. Practice makes perfect!",
        "caption": "+5 = up 5"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus five?",
        "answer": 5,
        "hint": "0 plus 5: count up 5: 1, 2, 3, 4, 5!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "prompt": "One plus five?",
        "answer": 6,
        "hint": "1 plus 5: count up 5: 2, 3, 4, 5, 6!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 5
        },
        "prompt": "Two plus five?",
        "answer": 7,
        "hint": "2 plus 5: count up 5: 3, 4, 5, 6, 7!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus five?",
        "answer": 8,
        "hint": "3 plus 5: count up 5: 4, 5, 6, 7, 8!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9,
        "hint": "4 plus 5: count up 5: 5, 6, 7, 8, 9!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10,
        "hint": "5 plus 5: count up 5: 6, 7, 8, 9, 10!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11,
        "hint": "6 plus 5: count up 5: 7, 8, 9, 10, 11!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 5
        },
        "prompt": "Seven plus five?",
        "answer": 12,
        "hint": "7 plus 5: count up 5: 8, 9, 10, 11, 12!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 5
        },
        "prompt": "Two plus five?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus five?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus five?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "prompt": "One plus five?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 5
        },
        "prompt": "Seven plus five?",
        "answer": 12
      }
    ]
  },
  {
    "id": "add-6",
    "title": "Adding 6",
    "emoji": "2",
    "category": "B",
    "description": "Add 6 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Adding 6",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 6,
          "emoji": "🍒"
        },
        "text": "Today we add 6. Add 6 to a number means COUNT UP by 6.",
        "caption": "+6 = count up 6"
      },
      {
        "title": "Count On",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 9
        },
        "text": "Start at 3. Count up 6. Where do you land?",
        "caption": "3 + 6 = 9"
      },
      {
        "title": "Try a Bigger Number",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "text": "5 plus 6? Count up: 6, 7… Total: 11.",
        "caption": "5 + 6 = 11"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "text": "Bonus: 6 + 6 is a double. 6+6=12.",
        "caption": "6 + 6 = 12"
      },
      {
        "title": "You Are Adding!",
        "visual": {
          "type": "add-groups",
          "a": 6,
          "b": 6,
          "emoji": "🍒"
        },
        "text": "Adding 6 to anything: just count up 6 times. Practice makes perfect!",
        "caption": "+6 = up 6"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 6
        },
        "prompt": "Zero plus six?",
        "answer": 6,
        "hint": "0 plus 6: count up 6: 1, 2, 3, 4, 5, 6!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 6
        },
        "prompt": "One plus six?",
        "answer": 7,
        "hint": "1 plus 6: count up 6: 2, 3, 4, 5, 6, 7!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 6
        },
        "prompt": "Two plus six?",
        "answer": 8,
        "hint": "2 plus 6: count up 6: 3, 4, 5, 6, 7, 8!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 6
        },
        "prompt": "Three plus six?",
        "answer": 9,
        "hint": "3 plus 6: count up 6: 4, 5, 6, 7, 8, 9!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus six?",
        "answer": 10,
        "hint": "4 plus 6: count up 6: 5, 6, 7, 8, 9, 10!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "prompt": "Five plus six?",
        "answer": 11,
        "hint": "5 plus 6: count up 6: 6, 7, 8, 9, 10, 11!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12,
        "hint": "6 plus 6: count up 6: 7, 8, 9, 10, 11, 12!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven plus six?",
        "answer": 13,
        "hint": "7 plus 6: count up 6: 8, 9, 10, 11, 12, 13!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 6
        },
        "prompt": "Two plus six?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "prompt": "Five plus six?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 6
        },
        "prompt": "Zero plus six?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 6
        },
        "prompt": "Three plus six?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 6
        },
        "prompt": "One plus six?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus six?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven plus six?",
        "answer": 13
      }
    ]
  },
  {
    "id": "add-7",
    "title": "Adding 7",
    "emoji": "️",
    "category": "B",
    "description": "Add 7 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Adding 7",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 7,
          "emoji": "🍑"
        },
        "text": "Today we add 7. Add 7 to a number means COUNT UP by 7.",
        "caption": "+7 = count up 7"
      },
      {
        "title": "Count On",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 10
        },
        "text": "Start at 3. Count up 7. Where do you land?",
        "caption": "3 + 7 = 10"
      },
      {
        "title": "Try a Bigger Number",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 7
        },
        "text": "5 plus 7? Count up: 6, 7… Total: 12.",
        "caption": "5 + 7 = 12"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "text": "Bonus: 7 + 7 is a double. 7+7=14.",
        "caption": "7 + 7 = 14"
      },
      {
        "title": "You Are Adding!",
        "visual": {
          "type": "add-groups",
          "a": 7,
          "b": 7,
          "emoji": "🍑"
        },
        "text": "Adding 7 to anything: just count up 7 times. Practice makes perfect!",
        "caption": "+7 = up 7"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 7
        },
        "prompt": "Zero plus seven?",
        "answer": 7,
        "hint": "0 plus 7: count up 7: 1, 2, 3, 4, 5, 6, 7!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 7
        },
        "prompt": "One plus seven?",
        "answer": 8,
        "hint": "1 plus 7: count up 7: 2, 3, 4, 5, 6, 7, 8!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 7
        },
        "prompt": "Two plus seven?",
        "answer": 9,
        "hint": "2 plus 7: count up 7: 3, 4, 5, 6, 7, 8, 9!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "prompt": "Three plus seven?",
        "answer": 10,
        "hint": "3 plus 7: count up 7: 4, 5, 6, 7, 8, 9, 10!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 7
        },
        "prompt": "Four plus seven?",
        "answer": 11,
        "hint": "4 plus 7: count up 7: 5, 6, 7, 8, 9, 10, 11!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 7
        },
        "prompt": "Five plus seven?",
        "answer": 12,
        "hint": "5 plus 7: count up 7: 6, 7, 8, 9, 10, 11, 12!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13,
        "hint": "6 plus 7: count up 7: 7, 8, 9, 10, 11, 12, 13!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14,
        "hint": "7 plus 7: count up 7: 8, 9, 10, 11, 12, 13, 14!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 7
        },
        "prompt": "Two plus seven?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 7
        },
        "prompt": "Five plus seven?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight plus seven?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 7
        },
        "prompt": "Zero plus seven?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "prompt": "Three plus seven?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 7
        },
        "prompt": "One plus seven?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 7
        },
        "prompt": "Four plus seven?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      }
    ]
  },
  {
    "id": "add-8",
    "title": "Adding 8",
    "emoji": "⃣",
    "category": "B",
    "description": "Add 8 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Adding 8",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 8,
          "emoji": "🥝"
        },
        "text": "Today we add 8. Add 8 to a number means COUNT UP by 8.",
        "caption": "+8 = count up 8"
      },
      {
        "title": "Count On",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 10
        },
        "text": "Start at 3. Count up 8. Where do you land?",
        "caption": "3 + 8 = 11"
      },
      {
        "title": "Try a Bigger Number",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 8
        },
        "text": "5 plus 8? Count up: 6, 7… Total: 13.",
        "caption": "5 + 8 = 13"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "text": "Bonus: 8 + 8 is a double. 8+8=16.",
        "caption": "8 + 8 = 16"
      },
      {
        "title": "You Are Adding!",
        "visual": {
          "type": "add-groups",
          "a": 8,
          "b": 8,
          "emoji": "🥝"
        },
        "text": "Adding 8 to anything: just count up 8 times. Practice makes perfect!",
        "caption": "+8 = up 8"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "prompt": "Zero plus eight?",
        "answer": 8,
        "hint": "0 plus 8: count up 8: 1, 2, 3, 4, 5, 6, 7, 8!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 8
        },
        "prompt": "One plus eight?",
        "answer": 9,
        "hint": "1 plus 8: count up 8: 2, 3, 4, 5, 6, 7, 8, 9!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 8
        },
        "prompt": "Two plus eight?",
        "answer": 10,
        "hint": "2 plus 8: count up 8: 3, 4, 5, 6, 7, 8, 9, 10!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 8
        },
        "prompt": "Three plus eight?",
        "answer": 11,
        "hint": "3 plus 8: count up 8: 4, 5, 6, 7, 8, 9, 10, 11!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 8
        },
        "prompt": "Four plus eight?",
        "answer": 12,
        "hint": "4 plus 8: count up 8: 5, 6, 7, 8, 9, 10, 11, 12!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 8
        },
        "prompt": "Five plus eight?",
        "answer": 13,
        "hint": "5 plus 8: count up 8: 6, 7, 8, 9, 10, 11, 12, 13!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 8
        },
        "prompt": "Six plus eight?",
        "answer": 14,
        "hint": "6 plus 8: count up 8: 7, 8, 9, 10, 11, 12, 13, 14!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "prompt": "Seven plus eight?",
        "answer": 15,
        "hint": "7 plus 8: count up 8: 8, 9, 10, 11, 12, 13, 14, 15!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 8
        },
        "prompt": "Two plus eight?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 8
        },
        "prompt": "Five plus eight?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "prompt": "Zero plus eight?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 8
        },
        "prompt": "Three plus eight?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 8
        },
        "prompt": "Six plus eight?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 8
        },
        "prompt": "One plus eight?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 8
        },
        "prompt": "Four plus eight?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "prompt": "Seven plus eight?",
        "answer": 15
      }
    ]
  },
  {
    "id": "add-9",
    "title": "Adding 9",
    "emoji": "3",
    "category": "B",
    "description": "Add 9 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Adding 9",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 9,
          "emoji": "🍐"
        },
        "text": "Today we add 9. Add 9 to a number means COUNT UP by 9.",
        "caption": "+9 = count up 9"
      },
      {
        "title": "Count On",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 10
        },
        "text": "Start at 3. Count up 9. Where do you land?",
        "caption": "3 + 9 = 12"
      },
      {
        "title": "Try a Bigger Number",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 9
        },
        "text": "5 plus 9? Count up: 6, 7… Total: 14.",
        "caption": "5 + 9 = 14"
      },
      {
        "title": "Doubles Hint",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "text": "Bonus: 9 + 9 is a double. 9+9=18.",
        "caption": "9 + 9 = 18"
      },
      {
        "title": "You Are Adding!",
        "visual": {
          "type": "add-groups",
          "a": 9,
          "b": 9,
          "emoji": "🍐"
        },
        "text": "Adding 9 to anything: just count up 9 times. Practice makes perfect!",
        "caption": "+9 = up 9"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 9
        },
        "prompt": "Zero plus nine?",
        "answer": 9,
        "hint": "0 plus 9: count up 9: 1, 2, 3, 4, 5, 6, 7, 8, 9!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "prompt": "One plus nine?",
        "answer": 10,
        "hint": "1 plus 9: count up 9: 2, 3, 4, 5, 6, 7, 8, 9, 10!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 9
        },
        "prompt": "Two plus nine?",
        "answer": 11,
        "hint": "2 plus 9: count up 9: 3, 4, 5, 6, 7, 8, 9, 10, 11!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 9
        },
        "prompt": "Three plus nine?",
        "answer": 12,
        "hint": "3 plus 9: count up 9: 4, 5, 6, 7, 8, 9, 10, 11, 12!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 9
        },
        "prompt": "Four plus nine?",
        "answer": 13,
        "hint": "4 plus 9: count up 9: 5, 6, 7, 8, 9, 10, 11, 12, 13!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 9
        },
        "prompt": "Five plus nine?",
        "answer": 14,
        "hint": "5 plus 9: count up 9: 6, 7, 8, 9, 10, 11, 12, 13, 14!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 9
        },
        "prompt": "Six plus nine?",
        "answer": 15,
        "hint": "6 plus 9: count up 9: 7, 8, 9, 10, 11, 12, 13, 14, 15!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 9
        },
        "prompt": "Seven plus nine?",
        "answer": 16,
        "hint": "7 plus 9: count up 9: 8, 9, 10, 11, 12, 13, 14, 15, 16!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 9
        },
        "prompt": "Two plus nine?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 9
        },
        "prompt": "Five plus nine?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 9
        },
        "prompt": "Eight plus nine?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 9
        },
        "prompt": "Zero plus nine?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 9
        },
        "prompt": "Three plus nine?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 9
        },
        "prompt": "Six plus nine?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "prompt": "One plus nine?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 9
        },
        "prompt": "Four plus nine?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 9
        },
        "prompt": "Seven plus nine?",
        "answer": 16
      }
    ]
  },
  {
    "id": "add-10",
    "title": "Adding 10",
    "emoji": "️",
    "category": "B",
    "description": "Add 10 to any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Plus Ten Magic",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 3
        },
        "text": "Adding 10 to a small number makes a TEEN. 10 + 3 = 13!",
        "caption": "10 + small = teen"
      },
      {
        "title": "10 + 5 = 15",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 5
        },
        "text": "Add 10 to 5: a full ten-frame plus 5 more in the next frame. Fifteen!",
        "caption": "10 + 5 = 15"
      },
      {
        "title": "Plus 10 to 2-Digit",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 4
        },
        "text": "For 24 + 10: just add ONE TEN-BAR. 2 tens become 3 tens. Answer: 34.",
        "caption": "24 + 10 = 34"
      },
      {
        "title": "Tens Digit Goes Up",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "text": "When you +10, only the TENS digit changes. Ones stay the same!",
        "caption": "Tens +1, ones same"
      },
      {
        "title": "Try 50 + 10",
        "visual": {
          "type": "two-digit-add",
          "a": 50,
          "b": 10
        },
        "text": "50 + 10 = 60. Five tens become six tens.",
        "caption": "50 + 10 = 60"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 10
        },
        "prompt": "Zero plus ten?",
        "answer": 10,
        "hint": "0 plus 10: count up 10: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 10
        },
        "prompt": "One plus ten?",
        "answer": 11,
        "hint": "1 plus 10: count up 10: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 10
        },
        "prompt": "Two plus ten?",
        "answer": 12,
        "hint": "2 plus 10: count up 10: 3, 4, 5, 6, 7, 8, 9, 10, 11, 12!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 10
        },
        "prompt": "Three plus ten?",
        "answer": 13,
        "hint": "3 plus 10: count up 10: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 10
        },
        "prompt": "Four plus ten?",
        "answer": 14,
        "hint": "4 plus 10: count up 10: 5, 6, 7, 8, 9, 10, 11, 12, 13, 14!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 10
        },
        "prompt": "Five plus ten?",
        "answer": 15,
        "hint": "5 plus 10: count up 10: 6, 7, 8, 9, 10, 11, 12, 13, 14, 15!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 10
        },
        "prompt": "Six plus ten?",
        "answer": 16,
        "hint": "6 plus 10: count up 10: 7, 8, 9, 10, 11, 12, 13, 14, 15, 16!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 10
        },
        "prompt": "Seven plus ten?",
        "answer": 17,
        "hint": "7 plus 10: count up 10: 8, 9, 10, 11, 12, 13, 14, 15, 16, 17!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 10
        },
        "prompt": "Two plus ten?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 10
        },
        "prompt": "Five plus ten?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 10
        },
        "prompt": "Eight plus ten?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 10
        },
        "prompt": "Zero plus ten?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 10
        },
        "prompt": "Three plus ten?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 10
        },
        "prompt": "Six plus ten?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 10
        },
        "prompt": "Nine plus ten?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 10
        },
        "prompt": "One plus ten?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 10
        },
        "prompt": "Four plus ten?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 10
        },
        "prompt": "Seven plus ten?",
        "answer": 17
      }
    ]
  },
  {
    "id": "sub-0",
    "title": "Subtracting 0",
    "emoji": "0",
    "category": "C",
    "description": "Take away 0 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus Zero",
        "visual": {
          "type": "take-away",
          "total": 5,
          "taken": 0,
          "emoji": "🍓"
        },
        "text": "Take away 0 means NOTHING is taken. The number stays!",
        "caption": "5 − 0 = 5"
      },
      {
        "title": "Try 8 − 0",
        "visual": {
          "type": "take-away",
          "total": 8,
          "taken": 0,
          "emoji": "🍓"
        },
        "text": "8 minus 0 is still 8. Nothing left.",
        "caption": "8 − 0 = 8"
      },
      {
        "title": "Bigger Numbers",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 0
        },
        "text": "17 − 0 = 17.",
        "caption": "17 − 0 = 17"
      },
      {
        "title": "Easy!",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 0
        },
        "text": "Minus zero leaves the number alone. The easiest math!",
        "caption": "Minus 0 = same"
      },
      {
        "title": "You Got It",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 0,
          "emoji": "🍓"
        },
        "text": "When you subtract zero, the answer is just the first number. Done!",
        "caption": "−0 means no change"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 0
        },
        "prompt": "Zero minus zero?",
        "answer": 0,
        "hint": "Take away nothing — stays 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 0
        },
        "prompt": "One minus zero?",
        "answer": 1,
        "hint": "Take away nothing — stays 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 0
        },
        "prompt": "Two minus zero?",
        "answer": 2,
        "hint": "Take away nothing — stays 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 0
        },
        "prompt": "Three minus zero?",
        "answer": 3,
        "hint": "Take away nothing — stays 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 0
        },
        "prompt": "Four minus zero?",
        "answer": 4,
        "hint": "Take away nothing — stays 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five minus zero?",
        "answer": 5,
        "hint": "Take away nothing — stays 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six minus zero?",
        "answer": 6,
        "hint": "Take away nothing — stays 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven minus zero?",
        "answer": 7,
        "hint": "Take away nothing — stays 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 0
        },
        "prompt": "Zero minus zero?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 0
        },
        "prompt": "Three minus zero?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six minus zero?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 0
        },
        "prompt": "Nine minus zero?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 0
        },
        "prompt": "Twelve minus zero?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 0
        },
        "prompt": "Fifteen minus zero?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 18,
          "b": 0
        },
        "prompt": "Eighteen minus zero?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 0
        },
        "prompt": "Zero minus zero?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 0
        },
        "prompt": "Three minus zero?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six minus zero?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-1",
    "title": "Subtracting 1",
    "emoji": "️",
    "category": "C",
    "description": "Take away 1 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus One",
        "visual": {
          "type": "take-away",
          "total": 5,
          "taken": 1,
          "emoji": "🍒"
        },
        "text": "Take away 1 means ONE LESS. Hop back one step.",
        "caption": "5 − 1 = 4"
      },
      {
        "title": "8 minus 1",
        "visual": {
          "type": "take-away",
          "total": 8,
          "taken": 1,
          "emoji": "🍒"
        },
        "text": "Before 8 comes 7. So 8 − 1 = 7.",
        "caption": "8 − 1 = 7"
      },
      {
        "title": "Number Line",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 6
        },
        "text": "Hop one step LEFT on the number line. From 7 you land on 6.",
        "caption": "Hop left = −1"
      },
      {
        "title": "Big Numbers",
        "visual": {
          "type": "two-digit-add",
          "a": 20,
          "b": 1
        },
        "text": "20 − 1 = 19. The number BEFORE 20.",
        "caption": "20 − 1 = 19"
      },
      {
        "title": "You Got It",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 1,
          "emoji": "🍒"
        },
        "text": "Minus one means: say the number that comes BEFORE. Easy!",
        "caption": "−1 = before"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One minus one?",
        "answer": 0,
        "hint": "One less than 1 is 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 1
        },
        "prompt": "Two minus one?",
        "answer": 1,
        "hint": "One less than 2 is 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 1
        },
        "prompt": "Three minus one?",
        "answer": 2,
        "hint": "One less than 3 is 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four minus one?",
        "answer": 3,
        "hint": "One less than 4 is 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 1
        },
        "prompt": "Five minus one?",
        "answer": 4,
        "hint": "One less than 5 is 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six minus one?",
        "answer": 5,
        "hint": "One less than 6 is 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven minus one?",
        "answer": 6,
        "hint": "One less than 7 is 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 1
        },
        "prompt": "Eight minus one?",
        "answer": 7,
        "hint": "One less than 8 is 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One minus one?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four minus one?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven minus one?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 1
        },
        "prompt": "Ten minus one?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 1
        },
        "prompt": "Thirteen minus one?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 1
        },
        "prompt": "Sixteen minus one?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 19,
          "b": 1
        },
        "prompt": "Nineteen minus one?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One minus one?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four minus one?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven minus one?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-2",
    "title": "Subtracting 2",
    "emoji": "⃣",
    "category": "C",
    "description": "Take away 2 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 2",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 2,
          "emoji": "🍑"
        },
        "text": "Take away 2 means COUNT BACK by 2.",
        "caption": "−2 = back 2"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 8
        },
        "text": "Start at 10. Hop back 2. Where do you land? 8!",
        "caption": "10 − 2 = 8"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 2,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 2 down. The fingers up are your answer.",
        "caption": "9 − 2 = 7"
      },
      {
        "title": "Try 7 − 2",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "text": "Count back: 6, 5!",
        "caption": "7 − 2 = 5"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 2,
          "emoji": "🍑"
        },
        "text": "Subtracting 2 = counting back 2 times. Practice and you will fly!",
        "caption": "−2 = back 2"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two minus two?",
        "answer": 0,
        "hint": "Count back 2: 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three minus two?",
        "answer": 1,
        "hint": "Count back 2: 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four minus two?",
        "answer": 2,
        "hint": "Count back 2: 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five minus two?",
        "answer": 3,
        "hint": "Count back 2: 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 2
        },
        "prompt": "Six minus two?",
        "answer": 4,
        "hint": "Count back 2: 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "prompt": "Seven minus two?",
        "answer": 5,
        "hint": "Count back 2: 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 2
        },
        "prompt": "Eight minus two?",
        "answer": 6,
        "hint": "Count back 2: 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 2
        },
        "prompt": "Nine minus two?",
        "answer": 7,
        "hint": "Count back 2: 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two minus two?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five minus two?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 2
        },
        "prompt": "Eight minus two?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 2
        },
        "prompt": "Eleven minus two?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 2
        },
        "prompt": "Fourteen minus two?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 2
        },
        "prompt": "Seventeen minus two?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 20,
          "b": 2
        },
        "prompt": "Twenty minus two?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two minus two?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five minus two?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 2
        },
        "prompt": "Eight minus two?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-3",
    "title": "Subtracting 3",
    "emoji": "1",
    "category": "C",
    "description": "Take away 3 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 3",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 3,
          "emoji": "🥝"
        },
        "text": "Take away 3 means COUNT BACK by 3.",
        "caption": "−3 = back 3"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 7
        },
        "text": "Start at 10. Hop back 3. Where do you land? 7!",
        "caption": "10 − 3 = 7"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 3,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 3 down. The fingers up are your answer.",
        "caption": "9 − 3 = 6"
      },
      {
        "title": "Try 7 − 3",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "text": "Count back: 6, 5, 4!",
        "caption": "7 − 3 = 4"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 3,
          "emoji": "🥝"
        },
        "text": "Subtracting 3 = counting back 3 times. Practice and you will fly!",
        "caption": "−3 = back 3"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three minus three?",
        "answer": 0,
        "hint": "Count back 3: 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four minus three?",
        "answer": 1,
        "hint": "Count back 3: 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five minus three?",
        "answer": 2,
        "hint": "Count back 3: 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six minus three?",
        "answer": 3,
        "hint": "Count back 3: 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven minus three?",
        "answer": 4,
        "hint": "Count back 3: 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight minus three?",
        "answer": 5,
        "hint": "Count back 3: 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 3
        },
        "prompt": "Nine minus three?",
        "answer": 6,
        "hint": "Count back 3: 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 3
        },
        "prompt": "Ten minus three?",
        "answer": 7,
        "hint": "Count back 3: 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three minus three?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six minus three?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 3
        },
        "prompt": "Nine minus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 3
        },
        "prompt": "Twelve minus three?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 3
        },
        "prompt": "Fifteen minus three?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 18,
          "b": 3
        },
        "prompt": "Eighteen minus three?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three minus three?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three minus three?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six minus three?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 3
        },
        "prompt": "Nine minus three?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-4",
    "title": "Subtracting 4",
    "emoji": "️",
    "category": "C",
    "description": "Take away 4 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 4",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 4,
          "emoji": "🍐"
        },
        "text": "Take away 4 means COUNT BACK by 4.",
        "caption": "−4 = back 4"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 6
        },
        "text": "Start at 10. Hop back 4. Where do you land? 6!",
        "caption": "10 − 4 = 6"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 4,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 4 down. The fingers up are your answer.",
        "caption": "9 − 4 = 5"
      },
      {
        "title": "Try 7 − 4",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "text": "Count back: 6, 5, 4, 3!",
        "caption": "7 − 4 = 3"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 4,
          "emoji": "🍐"
        },
        "text": "Subtracting 4 = counting back 4 times. Practice and you will fly!",
        "caption": "−4 = back 4"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four minus four?",
        "answer": 0,
        "hint": "Count back 4: 3, 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five minus four?",
        "answer": 1,
        "hint": "Count back 4: 4, 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 4
        },
        "prompt": "Six minus four?",
        "answer": 2,
        "hint": "Count back 4: 5, 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "prompt": "Seven minus four?",
        "answer": 3,
        "hint": "Count back 4: 6, 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight minus four?",
        "answer": 4,
        "hint": "Count back 4: 7, 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine minus four?",
        "answer": 5,
        "hint": "Count back 4: 8, 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 4
        },
        "prompt": "Ten minus four?",
        "answer": 6,
        "hint": "Count back 4: 9, 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 4
        },
        "prompt": "Eleven minus four?",
        "answer": 7,
        "hint": "Count back 4: 10, 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four minus four?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "prompt": "Seven minus four?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 4
        },
        "prompt": "Ten minus four?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 4
        },
        "prompt": "Thirteen minus four?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 4
        },
        "prompt": "Sixteen minus four?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 19,
          "b": 4
        },
        "prompt": "Nineteen minus four?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four minus four?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four minus four?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "prompt": "Seven minus four?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 4
        },
        "prompt": "Ten minus four?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-5",
    "title": "Subtracting 5",
    "emoji": "⃣",
    "category": "C",
    "description": "Take away 5 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 5",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 5,
          "emoji": "🐶"
        },
        "text": "Take away 5 means COUNT BACK by 5.",
        "caption": "−5 = back 5"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 5
        },
        "text": "Start at 10. Hop back 5. Where do you land? 5!",
        "caption": "10 − 5 = 5"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 5,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 5 down. The fingers up are your answer.",
        "caption": "9 − 5 = 4"
      },
      {
        "title": "Try 7 − 5",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 5
        },
        "text": "Count back: 6, 5, 4, 3, 2!",
        "caption": "7 − 5 = 2"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 5,
          "emoji": "🐶"
        },
        "text": "Subtracting 5 = counting back 5 times. Practice and you will fly!",
        "caption": "−5 = back 5"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five minus five?",
        "answer": 0,
        "hint": "Count back 5: 4, 3, 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six minus five?",
        "answer": 1,
        "hint": "Count back 5: 5, 4, 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 5
        },
        "prompt": "Seven minus five?",
        "answer": 2,
        "hint": "Count back 5: 6, 5, 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight minus five?",
        "answer": 3,
        "hint": "Count back 5: 7, 6, 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine minus five?",
        "answer": 4,
        "hint": "Count back 5: 8, 7, 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 5
        },
        "prompt": "Ten minus five?",
        "answer": 5,
        "hint": "Count back 5: 9, 8, 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 5
        },
        "prompt": "Eleven minus five?",
        "answer": 6,
        "hint": "Count back 5: 10, 9, 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 5
        },
        "prompt": "Twelve minus five?",
        "answer": 7,
        "hint": "Count back 5: 11, 10, 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five minus five?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight minus five?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 5
        },
        "prompt": "Eleven minus five?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 5
        },
        "prompt": "Fourteen minus five?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 5
        },
        "prompt": "Seventeen minus five?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 20,
          "b": 5
        },
        "prompt": "Twenty minus five?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five minus five?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five minus five?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight minus five?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 5
        },
        "prompt": "Eleven minus five?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-6",
    "title": "Subtracting 6",
    "emoji": "2",
    "category": "C",
    "description": "Take away 6 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 6",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 6,
          "emoji": "🐱"
        },
        "text": "Take away 6 means COUNT BACK by 6.",
        "caption": "−6 = back 6"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 4
        },
        "text": "Start at 10. Hop back 6. Where do you land? 4!",
        "caption": "10 − 6 = 4"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 6,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 6 down. The fingers up are your answer.",
        "caption": "9 − 6 = 3"
      },
      {
        "title": "Try 7 − 6",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "text": "Count back: 6, 5, 4, 3, 2, 1!",
        "caption": "7 − 6 = 1"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 6,
          "emoji": "🐱"
        },
        "text": "Subtracting 6 = counting back 6 times. Practice and you will fly!",
        "caption": "−6 = back 6"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six minus six?",
        "answer": 0,
        "hint": "Count back 6: 5, 4, 3, 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven minus six?",
        "answer": 1,
        "hint": "Count back 6: 6, 5, 4, 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight minus six?",
        "answer": 2,
        "hint": "Count back 6: 7, 6, 5, 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine minus six?",
        "answer": 3,
        "hint": "Count back 6: 8, 7, 6, 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 6
        },
        "prompt": "Ten minus six?",
        "answer": 4,
        "hint": "Count back 6: 9, 8, 7, 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 6
        },
        "prompt": "Eleven minus six?",
        "answer": 5,
        "hint": "Count back 6: 10, 9, 8, 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 6
        },
        "prompt": "Twelve minus six?",
        "answer": 6,
        "hint": "Count back 6: 11, 10, 9, 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 6
        },
        "prompt": "Thirteen minus six?",
        "answer": 7,
        "hint": "Count back 6: 12, 11, 10, 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six minus six?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine minus six?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 6
        },
        "prompt": "Twelve minus six?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 6
        },
        "prompt": "Fifteen minus six?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 18,
          "b": 6
        },
        "prompt": "Eighteen minus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six minus six?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six minus six?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six minus six?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine minus six?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 6
        },
        "prompt": "Twelve minus six?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-7",
    "title": "Subtracting 7",
    "emoji": "️",
    "category": "C",
    "description": "Take away 7 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 7",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 7,
          "emoji": "🐰"
        },
        "text": "Take away 7 means COUNT BACK by 7.",
        "caption": "−7 = back 7"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 3
        },
        "text": "Start at 10. Hop back 7. Where do you land? 3!",
        "caption": "10 − 7 = 3"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 7,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 7 down. The fingers up are your answer.",
        "caption": "9 − 7 = 2"
      },
      {
        "title": "Try 7 − 7",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "text": "Count back: 6, 5, 4, 3, 2, 1, 0!",
        "caption": "7 − 7 = 0"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 7,
          "emoji": "🐰"
        },
        "text": "Subtracting 7 = counting back 7 times. Practice and you will fly!",
        "caption": "−7 = back 7"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven minus seven?",
        "answer": 0,
        "hint": "Count back 7: 6, 5, 4, 3, 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight minus seven?",
        "answer": 1,
        "hint": "Count back 7: 7, 6, 5, 4, 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine minus seven?",
        "answer": 2,
        "hint": "Count back 7: 8, 7, 6, 5, 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 7
        },
        "prompt": "Ten minus seven?",
        "answer": 3,
        "hint": "Count back 7: 9, 8, 7, 6, 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 7
        },
        "prompt": "Eleven minus seven?",
        "answer": 4,
        "hint": "Count back 7: 10, 9, 8, 7, 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 7
        },
        "prompt": "Twelve minus seven?",
        "answer": 5,
        "hint": "Count back 7: 11, 10, 9, 8, 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 7
        },
        "prompt": "Thirteen minus seven?",
        "answer": 6,
        "hint": "Count back 7: 12, 11, 10, 9, 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 7
        },
        "prompt": "Fourteen minus seven?",
        "answer": 7,
        "hint": "Count back 7: 13, 12, 11, 10, 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven minus seven?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 7
        },
        "prompt": "Ten minus seven?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 7
        },
        "prompt": "Thirteen minus seven?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 7
        },
        "prompt": "Sixteen minus seven?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 19,
          "b": 7
        },
        "prompt": "Nineteen minus seven?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven minus seven?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven minus seven?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven minus seven?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 7
        },
        "prompt": "Ten minus seven?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 7
        },
        "prompt": "Thirteen minus seven?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-8",
    "title": "Subtracting 8",
    "emoji": "⃣",
    "category": "C",
    "description": "Take away 8 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 8",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 8,
          "emoji": "🐻"
        },
        "text": "Take away 8 means COUNT BACK by 8.",
        "caption": "−8 = back 8"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 2
        },
        "text": "Start at 10. Hop back 8. Where do you land? 2!",
        "caption": "10 − 8 = 2"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 8,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 8 down. The fingers up are your answer.",
        "caption": "9 − 8 = 1"
      },
      {
        "title": "Try 8 − 8",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "text": "Count back: 7, 6, 5, 4, 3, 2, 1, 0!",
        "caption": "8 − 8 = 0"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 8,
          "emoji": "🐻"
        },
        "text": "Subtracting 8 = counting back 8 times. Practice and you will fly!",
        "caption": "−8 = back 8"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight minus eight?",
        "answer": 0,
        "hint": "Count back 8: 7, 6, 5, 4, 3, 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine minus eight?",
        "answer": 1,
        "hint": "Count back 8: 8, 7, 6, 5, 4, 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 8
        },
        "prompt": "Ten minus eight?",
        "answer": 2,
        "hint": "Count back 8: 9, 8, 7, 6, 5, 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 8
        },
        "prompt": "Eleven minus eight?",
        "answer": 3,
        "hint": "Count back 8: 10, 9, 8, 7, 6, 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 8
        },
        "prompt": "Twelve minus eight?",
        "answer": 4,
        "hint": "Count back 8: 11, 10, 9, 8, 7, 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 8
        },
        "prompt": "Thirteen minus eight?",
        "answer": 5,
        "hint": "Count back 8: 12, 11, 10, 9, 8, 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 8
        },
        "prompt": "Fourteen minus eight?",
        "answer": 6,
        "hint": "Count back 8: 13, 12, 11, 10, 9, 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 8
        },
        "prompt": "Fifteen minus eight?",
        "answer": 7,
        "hint": "Count back 8: 14, 13, 12, 11, 10, 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight minus eight?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 8
        },
        "prompt": "Eleven minus eight?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 8
        },
        "prompt": "Fourteen minus eight?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 8
        },
        "prompt": "Seventeen minus eight?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 20,
          "b": 8
        },
        "prompt": "Twenty minus eight?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight minus eight?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight minus eight?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight minus eight?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 8
        },
        "prompt": "Eleven minus eight?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 8
        },
        "prompt": "Fourteen minus eight?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-9",
    "title": "Subtracting 9",
    "emoji": "3",
    "category": "C",
    "description": "Take away 9 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 9",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 9,
          "emoji": "🐼"
        },
        "text": "Take away 9 means COUNT BACK by 9.",
        "caption": "−9 = back 9"
      },
      {
        "title": "Count Back",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 1
        },
        "text": "Start at 10. Hop back 9. Where do you land? 1!",
        "caption": "10 − 9 = 1"
      },
      {
        "title": "Use Fingers",
        "visual": {
          "type": "take-away",
          "total": 9,
          "taken": 9,
          "emoji": "✋"
        },
        "text": "Hold up 9 fingers. Fold 9 down. The fingers up are your answer.",
        "caption": "9 − 9 = 0"
      },
      {
        "title": "Try 9 − 9",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "text": "Count back: 8, 7, 6, 5, 4, 3, 2, 1, 0!",
        "caption": "9 − 9 = 0"
      },
      {
        "title": "You are Subtracting",
        "visual": {
          "type": "take-away",
          "total": 10,
          "taken": 9,
          "emoji": "🐼"
        },
        "text": "Subtracting 9 = counting back 9 times. Practice and you will fly!",
        "caption": "−9 = back 9"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine minus nine?",
        "answer": 0,
        "hint": "Count back 9: 8, 7, 6, 5, 4, 3, 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 9
        },
        "prompt": "Ten minus nine?",
        "answer": 1,
        "hint": "Count back 9: 9, 8, 7, 6, 5, 4, 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 9
        },
        "prompt": "Eleven minus nine?",
        "answer": 2,
        "hint": "Count back 9: 10, 9, 8, 7, 6, 5, 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 9
        },
        "prompt": "Twelve minus nine?",
        "answer": 3,
        "hint": "Count back 9: 11, 10, 9, 8, 7, 6, 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 9
        },
        "prompt": "Thirteen minus nine?",
        "answer": 4,
        "hint": "Count back 9: 12, 11, 10, 9, 8, 7, 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 9
        },
        "prompt": "Fourteen minus nine?",
        "answer": 5,
        "hint": "Count back 9: 13, 12, 11, 10, 9, 8, 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 9
        },
        "prompt": "Fifteen minus nine?",
        "answer": 6,
        "hint": "Count back 9: 14, 13, 12, 11, 10, 9, 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 9
        },
        "prompt": "Sixteen minus nine?",
        "answer": 7,
        "hint": "Count back 9: 15, 14, 13, 12, 11, 10, 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine minus nine?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 9
        },
        "prompt": "Twelve minus nine?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 9
        },
        "prompt": "Fifteen minus nine?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 18,
          "b": 9
        },
        "prompt": "Eighteen minus nine?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine minus nine?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine minus nine?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine minus nine?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine minus nine?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 9
        },
        "prompt": "Twelve minus nine?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 9
        },
        "prompt": "Fifteen minus nine?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sub-10",
    "title": "Subtracting 10",
    "emoji": "️",
    "category": "C",
    "description": "Take away 10 from any number.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Minus 10",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 4
        },
        "text": "Take away 10 means TAKE AWAY ONE TEN-BAR. 34 − 10: one less ten = 24.",
        "caption": "34 − 10 = 24"
      },
      {
        "title": "Tens Drop by 1",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "text": "Just the TENS digit changes. Ones stay the same. 47 − 10 = 37.",
        "caption": "Tens −1, ones same"
      },
      {
        "title": "Try 60 − 10",
        "visual": {
          "type": "two-digit-add",
          "a": 60,
          "b": 10
        },
        "text": "60 − 10 = 50. Six tens become five tens.",
        "caption": "60 − 10 = 50"
      },
      {
        "title": "Try 18 − 10",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 8
        },
        "text": "18 has one ten-frame full and 8 in the second. Take away the full one. 8 left!",
        "caption": "18 − 10 = 8"
      },
      {
        "title": "Master Move",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "text": "For any 2-digit number, minus 10 just drops the tens digit by 1. Master move!",
        "caption": "−10 = drop tens"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten minus ten?",
        "answer": 0,
        "hint": "Count back 10: 9, 8, 7, 6, 5, 4, 3, 2, 1, 0."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 10
        },
        "prompt": "Eleven minus ten?",
        "answer": 1,
        "hint": "Count back 10: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 10
        },
        "prompt": "Twelve minus ten?",
        "answer": 2,
        "hint": "Count back 10: 11, 10, 9, 8, 7, 6, 5, 4, 3, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 10
        },
        "prompt": "Thirteen minus ten?",
        "answer": 3,
        "hint": "Count back 10: 12, 11, 10, 9, 8, 7, 6, 5, 4, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 10
        },
        "prompt": "Fourteen minus ten?",
        "answer": 4,
        "hint": "Count back 10: 13, 12, 11, 10, 9, 8, 7, 6, 5, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 10
        },
        "prompt": "Fifteen minus ten?",
        "answer": 5,
        "hint": "Count back 10: 14, 13, 12, 11, 10, 9, 8, 7, 6, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 10
        },
        "prompt": "Sixteen minus ten?",
        "answer": 6,
        "hint": "Count back 10: 15, 14, 13, 12, 11, 10, 9, 8, 7, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 10
        },
        "prompt": "Seventeen minus ten?",
        "answer": 7,
        "hint": "Count back 10: 16, 15, 14, 13, 12, 11, 10, 9, 8, 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten minus ten?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 10
        },
        "prompt": "Thirteen minus ten?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 10
        },
        "prompt": "Sixteen minus ten?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 19,
          "b": 10
        },
        "prompt": "Nineteen minus ten?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten minus ten?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten minus ten?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten minus ten?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten minus ten?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 10
        },
        "prompt": "Thirteen minus ten?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 10
        },
        "prompt": "Sixteen minus ten?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sums-to-5",
    "title": "Sums to 5",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 5.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 5",
        "visual": {
          "type": "bignum",
          "n": 5
        },
        "text": "How many pairs of numbers add up to 5? Many ways!",
        "caption": "Make 5"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "text": "0 + 5 = 5. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 5 = 5"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "text": "1 + 4 = 5. One plus one less.",
        "caption": "1 + 4 = 5"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "text": "2 + 3 = 5. Almost a double.",
        "caption": "2 + 3 = 5"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 3,
          "emoji": "🍓"
        },
        "text": "3 + 2 also makes 5. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "text": "There are 6 pairs that make 5. Try to find them all!",
        "caption": "6 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus five?",
        "answer": 5,
        "hint": "Pair to make 5: 0 and 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "prompt": "One plus four?",
        "answer": 5,
        "hint": "Pair to make 5: 1 and 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5,
        "hint": "Pair to make 5: 2 and 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5,
        "hint": "Pair to make 5: 3 and 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four plus one?",
        "answer": 5,
        "hint": "Pair to make 5: 4 and 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus zero?",
        "answer": 5,
        "hint": "Pair to make 5: 5 and 0."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four plus one?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus five?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus zero?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four plus one?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus zero?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "prompt": "One plus four?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5
      }
    ]
  },
  {
    "id": "sums-to-6",
    "title": "Sums to 6",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 6.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 6",
        "visual": {
          "type": "bignum",
          "n": 6
        },
        "text": "How many pairs of numbers add up to 6? Many ways!",
        "caption": "Make 6"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 6
        },
        "text": "0 + 6 = 6. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 6 = 6"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "text": "1 + 5 = 6. One plus one less.",
        "caption": "1 + 5 = 6"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "text": "3 + 3 = 6. A double!",
        "caption": "3 + 3 = 6"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍒"
        },
        "text": "3 + 3 also makes 6. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "text": "There are 7 pairs that make 6. Try to find them all!",
        "caption": "7 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 6
        },
        "prompt": "Zero plus six?",
        "answer": 6,
        "hint": "Pair to make 6: 0 and 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "prompt": "One plus five?",
        "answer": 6,
        "hint": "Pair to make 6: 1 and 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus four?",
        "answer": 6,
        "hint": "Pair to make 6: 2 and 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6,
        "hint": "Pair to make 6: 3 and 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four plus two?",
        "answer": 6,
        "hint": "Pair to make 6: 4 and 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 1
        },
        "prompt": "Five plus one?",
        "answer": 6,
        "hint": "Pair to make 6: 5 and 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus zero?",
        "answer": 6,
        "hint": "Pair to make 6: 6 and 0."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 6
        },
        "prompt": "Zero plus six?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 1
        },
        "prompt": "Five plus one?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four plus two?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus zero?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus four?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four plus two?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus zero?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus zero?",
        "answer": 6
      }
    ]
  },
  {
    "id": "sums-to-7",
    "title": "Sums to 7",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 7.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 7",
        "visual": {
          "type": "bignum",
          "n": 7
        },
        "text": "How many pairs of numbers add up to 7? Many ways!",
        "caption": "Make 7"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 7
        },
        "text": "0 + 7 = 7. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 7 = 7"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 6
        },
        "text": "1 + 6 = 7. One plus one less.",
        "caption": "1 + 6 = 7"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "text": "3 + 4 = 7. Almost a double.",
        "caption": "3 + 4 = 7"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 4,
          "emoji": "🍑"
        },
        "text": "4 + 3 also makes 7. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "text": "There are 8 pairs that make 7. Try to find them all!",
        "caption": "8 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 7
        },
        "prompt": "Zero plus seven?",
        "answer": 7,
        "hint": "Pair to make 7: 0 and 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 6
        },
        "prompt": "One plus six?",
        "answer": 7,
        "hint": "Pair to make 7: 1 and 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 5
        },
        "prompt": "Two plus five?",
        "answer": 7,
        "hint": "Pair to make 7: 2 and 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7,
        "hint": "Pair to make 7: 3 and 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus three?",
        "answer": 7,
        "hint": "Pair to make 7: 4 and 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five plus two?",
        "answer": 7,
        "hint": "Pair to make 7: 5 and 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus one?",
        "answer": 7,
        "hint": "Pair to make 7: 6 and 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus zero?",
        "answer": 7,
        "hint": "Pair to make 7: 7 and 0."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five plus two?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 5
        },
        "prompt": "Two plus five?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus one?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus zero?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus zero?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus one?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus zero?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five plus two?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus one?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7
      }
    ]
  },
  {
    "id": "sums-to-8",
    "title": "Sums to 8",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 8.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 8",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "text": "How many pairs of numbers add up to 8? Many ways!",
        "caption": "Make 8"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "text": "0 + 8 = 8. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 8 = 8"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 7
        },
        "text": "1 + 7 = 8. One plus one less.",
        "caption": "1 + 7 = 8"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "text": "4 + 4 = 8. A double!",
        "caption": "4 + 4 = 8"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 4,
          "emoji": "🥝"
        },
        "text": "4 + 4 also makes 8. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "text": "There are 9 pairs that make 8. Try to find them all!",
        "caption": "9 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "prompt": "Zero plus eight?",
        "answer": 8,
        "hint": "Pair to make 8: 0 and 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 7
        },
        "prompt": "One plus seven?",
        "answer": 8,
        "hint": "Pair to make 8: 1 and 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 6
        },
        "prompt": "Two plus six?",
        "answer": 8,
        "hint": "Pair to make 8: 2 and 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus five?",
        "answer": 8,
        "hint": "Pair to make 8: 3 and 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8,
        "hint": "Pair to make 8: 4 and 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus three?",
        "answer": 8,
        "hint": "Pair to make 8: 5 and 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 2
        },
        "prompt": "Six plus two?",
        "answer": 8,
        "hint": "Pair to make 8: 6 and 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven plus one?",
        "answer": 8,
        "hint": "Pair to make 8: 7 and 1."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus five?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 6
        },
        "prompt": "Two plus six?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 7
        },
        "prompt": "One plus seven?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus three?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 0
        },
        "prompt": "Eight plus zero?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "prompt": "Zero plus eight?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus five?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus three?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 0
        },
        "prompt": "Eight plus zero?",
        "answer": 8
      }
    ]
  },
  {
    "id": "sums-to-9",
    "title": "Sums to 9",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 9.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 9",
        "visual": {
          "type": "bignum",
          "n": 9
        },
        "text": "How many pairs of numbers add up to 9? Many ways!",
        "caption": "Make 9"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 9
        },
        "text": "0 + 9 = 9. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 9 = 9"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 8
        },
        "text": "1 + 8 = 9. One plus one less.",
        "caption": "1 + 8 = 9"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "text": "4 + 5 = 9. Almost a double.",
        "caption": "4 + 5 = 9"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 5,
          "emoji": "🍐"
        },
        "text": "5 + 4 also makes 9. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "text": "There are 10 pairs that make 9. Try to find them all!",
        "caption": "10 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 9
        },
        "prompt": "Zero plus nine?",
        "answer": 9,
        "hint": "Pair to make 9: 0 and 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 8
        },
        "prompt": "One plus eight?",
        "answer": 9,
        "hint": "Pair to make 9: 1 and 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 7
        },
        "prompt": "Two plus seven?",
        "answer": 9,
        "hint": "Pair to make 9: 2 and 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 6
        },
        "prompt": "Three plus six?",
        "answer": 9,
        "hint": "Pair to make 9: 3 and 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9,
        "hint": "Pair to make 9: 4 and 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9,
        "hint": "Pair to make 9: 5 and 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six plus three?",
        "answer": 9,
        "hint": "Pair to make 9: 6 and 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "prompt": "Seven plus two?",
        "answer": 9,
        "hint": "Pair to make 9: 7 and 2."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six plus three?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 9
        },
        "prompt": "Zero plus nine?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "prompt": "Seven plus two?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 7
        },
        "prompt": "Two plus seven?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 6
        },
        "prompt": "Three plus six?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 0
        },
        "prompt": "Nine plus zero?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 1
        },
        "prompt": "Eight plus one?",
        "answer": 9
      }
    ]
  },
  {
    "id": "sums-to-10",
    "title": "Sums to 10",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 10.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 10",
        "visual": {
          "type": "bignum",
          "n": 10
        },
        "text": "How many pairs of numbers add up to 10? Many ways!",
        "caption": "Make 10"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 10
        },
        "text": "0 + 10 = 10. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 10 = 10"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "text": "1 + 9 = 10. One plus one less.",
        "caption": "1 + 9 = 10"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "text": "5 + 5 = 10. A double!",
        "caption": "5 + 5 = 10"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 5,
          "emoji": "🐶"
        },
        "text": "5 + 5 also makes 10. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 11 pairs that make 10. Try to find them all!",
        "caption": "11 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 10
        },
        "prompt": "Zero plus ten?",
        "answer": 10,
        "hint": "Pair to make 10: 0 and 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "prompt": "One plus nine?",
        "answer": 10,
        "hint": "Pair to make 10: 1 and 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 8
        },
        "prompt": "Two plus eight?",
        "answer": 10,
        "hint": "Pair to make 10: 2 and 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "prompt": "Three plus seven?",
        "answer": 10,
        "hint": "Pair to make 10: 3 and 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus six?",
        "answer": 10,
        "hint": "Pair to make 10: 4 and 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10,
        "hint": "Pair to make 10: 5 and 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 4
        },
        "prompt": "Six plus four?",
        "answer": 10,
        "hint": "Pair to make 10: 6 and 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven plus three?",
        "answer": 10,
        "hint": "Pair to make 10: 7 and 3."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "prompt": "One plus nine?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 0
        },
        "prompt": "Ten plus zero?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus six?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "prompt": "Three plus seven?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "prompt": "One plus nine?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven plus three?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 8
        },
        "prompt": "Two plus eight?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus six?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 2
        },
        "prompt": "Eight plus two?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 8
        },
        "prompt": "Two plus eight?",
        "answer": 10
      }
    ]
  },
  {
    "id": "sums-to-11",
    "title": "Sums to 11",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 11.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 11",
        "visual": {
          "type": "bignum",
          "n": 11
        },
        "text": "How many pairs of numbers add up to 11? Many ways!",
        "caption": "Make 11"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 11
        },
        "text": "0 + 11 = 11. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 11 = 11"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 10
        },
        "text": "1 + 10 = 11. One plus one less.",
        "caption": "1 + 10 = 11"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "text": "5 + 6 = 11. Almost a double.",
        "caption": "5 + 6 = 11"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 6,
          "emoji": "🐱"
        },
        "text": "6 + 5 also makes 11. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 12 pairs that make 11. Try to find them all!",
        "caption": "12 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 11
        },
        "prompt": "Zero plus eleven?",
        "answer": 11,
        "hint": "Pair to make 11: 0 and 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 10
        },
        "prompt": "One plus ten?",
        "answer": 11,
        "hint": "Pair to make 11: 1 and 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 9
        },
        "prompt": "Two plus nine?",
        "answer": 11,
        "hint": "Pair to make 11: 2 and 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 8
        },
        "prompt": "Three plus eight?",
        "answer": 11,
        "hint": "Pair to make 11: 3 and 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 7
        },
        "prompt": "Four plus seven?",
        "answer": 11,
        "hint": "Pair to make 11: 4 and 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "prompt": "Five plus six?",
        "answer": 11,
        "hint": "Pair to make 11: 5 and 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11,
        "hint": "Pair to make 11: 6 and 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "prompt": "Seven plus four?",
        "answer": 11,
        "hint": "Pair to make 11: 7 and 4."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 0
        },
        "prompt": "Eleven plus zero?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 11
        },
        "prompt": "Zero plus eleven?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 10
        },
        "prompt": "One plus ten?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 9
        },
        "prompt": "Two plus nine?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 4
        },
        "prompt": "Seven plus four?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 11
        },
        "prompt": "Zero plus eleven?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 2
        },
        "prompt": "Nine plus two?",
        "answer": 11
      }
    ]
  },
  {
    "id": "sums-to-12",
    "title": "Sums to 12",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 12.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 12",
        "visual": {
          "type": "bignum",
          "n": 12
        },
        "text": "How many pairs of numbers add up to 12? Many ways!",
        "caption": "Make 12"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 12
        },
        "text": "0 + 12 = 12. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 12 = 12"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 11
        },
        "text": "1 + 11 = 12. One plus one less.",
        "caption": "1 + 11 = 12"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "text": "6 + 6 = 12. A double!",
        "caption": "6 + 6 = 12"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 6,
          "b": 6,
          "emoji": "🐰"
        },
        "text": "6 + 6 also makes 12. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 13 pairs that make 12. Try to find them all!",
        "caption": "13 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 12
        },
        "prompt": "Zero plus twelve?",
        "answer": 12,
        "hint": "Pair to make 12: 0 and 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 11
        },
        "prompt": "One plus eleven?",
        "answer": 12,
        "hint": "Pair to make 12: 1 and 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 10
        },
        "prompt": "Two plus ten?",
        "answer": 12,
        "hint": "Pair to make 12: 2 and 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 9
        },
        "prompt": "Three plus nine?",
        "answer": 12,
        "hint": "Pair to make 12: 3 and 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 8
        },
        "prompt": "Four plus eight?",
        "answer": 12,
        "hint": "Pair to make 12: 4 and 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 7
        },
        "prompt": "Five plus seven?",
        "answer": 12,
        "hint": "Pair to make 12: 5 and 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12,
        "hint": "Pair to make 12: 6 and 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 5
        },
        "prompt": "Seven plus five?",
        "answer": 12,
        "hint": "Pair to make 12: 7 and 5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 11
        },
        "prompt": "One plus eleven?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 10
        },
        "prompt": "Two plus ten?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 10
        },
        "prompt": "Two plus ten?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 0
        },
        "prompt": "Twelve plus zero?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 0
        },
        "prompt": "Twelve plus zero?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 7
        },
        "prompt": "Five plus seven?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 9
        },
        "prompt": "Three plus nine?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 9
        },
        "prompt": "Three plus nine?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 11
        },
        "prompt": "One plus eleven?",
        "answer": 12
      }
    ]
  },
  {
    "id": "sums-to-13",
    "title": "Sums to 13",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 13.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 13",
        "visual": {
          "type": "bignum",
          "n": 13
        },
        "text": "How many pairs of numbers add up to 13? Many ways!",
        "caption": "Make 13"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 13
        },
        "text": "0 + 13 = 13. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 13 = 13"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 12
        },
        "text": "1 + 12 = 13. One plus one less.",
        "caption": "1 + 12 = 13"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "text": "6 + 7 = 13. Almost a double.",
        "caption": "6 + 7 = 13"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 6,
          "b": 7,
          "emoji": "🐻"
        },
        "text": "7 + 6 also makes 13. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 14 pairs that make 13. Try to find them all!",
        "caption": "14 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 13
        },
        "prompt": "Zero plus thirteen?",
        "answer": 13,
        "hint": "Pair to make 13: 0 and 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 12
        },
        "prompt": "One plus twelve?",
        "answer": 13,
        "hint": "Pair to make 13: 1 and 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 11
        },
        "prompt": "Two plus eleven?",
        "answer": 13,
        "hint": "Pair to make 13: 2 and 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 10
        },
        "prompt": "Three plus ten?",
        "answer": 13,
        "hint": "Pair to make 13: 3 and 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 9
        },
        "prompt": "Four plus nine?",
        "answer": 13,
        "hint": "Pair to make 13: 4 and 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 8
        },
        "prompt": "Five plus eight?",
        "answer": 13,
        "hint": "Pair to make 13: 5 and 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13,
        "hint": "Pair to make 13: 6 and 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven plus six?",
        "answer": 13,
        "hint": "Pair to make 13: 7 and 6."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 10
        },
        "prompt": "Three plus ten?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 12
        },
        "prompt": "One plus twelve?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 2
        },
        "prompt": "Eleven plus two?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 1
        },
        "prompt": "Twelve plus one?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 3
        },
        "prompt": "Ten plus three?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 0
        },
        "prompt": "Thirteen plus zero?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 12
        },
        "prompt": "One plus twelve?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 3
        },
        "prompt": "Ten plus three?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 8
        },
        "prompt": "Five plus eight?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13
      }
    ]
  },
  {
    "id": "sums-to-14",
    "title": "Sums to 14",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 14.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 14",
        "visual": {
          "type": "bignum",
          "n": 14
        },
        "text": "How many pairs of numbers add up to 14? Many ways!",
        "caption": "Make 14"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 14
        },
        "text": "0 + 14 = 14. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 14 = 14"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 13
        },
        "text": "1 + 13 = 14. One plus one less.",
        "caption": "1 + 13 = 14"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "text": "7 + 7 = 14. A double!",
        "caption": "7 + 7 = 14"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 7,
          "b": 7,
          "emoji": "🐼"
        },
        "text": "7 + 7 also makes 14. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 15 pairs that make 14. Try to find them all!",
        "caption": "15 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 14
        },
        "prompt": "Zero plus fourteen?",
        "answer": 14,
        "hint": "Pair to make 14: 0 and 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 13
        },
        "prompt": "One plus thirteen?",
        "answer": 14,
        "hint": "Pair to make 14: 1 and 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 12
        },
        "prompt": "Two plus twelve?",
        "answer": 14,
        "hint": "Pair to make 14: 2 and 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 11
        },
        "prompt": "Three plus eleven?",
        "answer": 14,
        "hint": "Pair to make 14: 3 and 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 10
        },
        "prompt": "Four plus ten?",
        "answer": 14,
        "hint": "Pair to make 14: 4 and 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 9
        },
        "prompt": "Five plus nine?",
        "answer": 14,
        "hint": "Pair to make 14: 5 and 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 8
        },
        "prompt": "Six plus eight?",
        "answer": 14,
        "hint": "Pair to make 14: 6 and 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14,
        "hint": "Pair to make 14: 7 and 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 10
        },
        "prompt": "Four plus ten?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 1
        },
        "prompt": "Thirteen plus one?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 0
        },
        "prompt": "Fourteen plus zero?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 9
        },
        "prompt": "Five plus nine?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 3
        },
        "prompt": "Eleven plus three?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 12
        },
        "prompt": "Two plus twelve?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 0
        },
        "prompt": "Fourteen plus zero?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 4
        },
        "prompt": "Ten plus four?",
        "answer": 14
      }
    ]
  },
  {
    "id": "sums-to-15",
    "title": "Sums to 15",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 15.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 15",
        "visual": {
          "type": "bignum",
          "n": 15
        },
        "text": "How many pairs of numbers add up to 15? Many ways!",
        "caption": "Make 15"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 15
        },
        "text": "0 + 15 = 15. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 15 = 15"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 14
        },
        "text": "1 + 14 = 15. One plus one less.",
        "caption": "1 + 14 = 15"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "text": "7 + 8 = 15. Almost a double.",
        "caption": "7 + 8 = 15"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 7,
          "b": 8,
          "emoji": "🐨"
        },
        "text": "8 + 7 also makes 15. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 16 pairs that make 15. Try to find them all!",
        "caption": "16 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 15
        },
        "prompt": "Zero plus fifteen?",
        "answer": 15,
        "hint": "Pair to make 15: 0 and 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 14
        },
        "prompt": "One plus fourteen?",
        "answer": 15,
        "hint": "Pair to make 15: 1 and 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 13
        },
        "prompt": "Two plus thirteen?",
        "answer": 15,
        "hint": "Pair to make 15: 2 and 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 12
        },
        "prompt": "Three plus twelve?",
        "answer": 15,
        "hint": "Pair to make 15: 3 and 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 11
        },
        "prompt": "Four plus eleven?",
        "answer": 15,
        "hint": "Pair to make 15: 4 and 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 10
        },
        "prompt": "Five plus ten?",
        "answer": 15,
        "hint": "Pair to make 15: 5 and 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 9
        },
        "prompt": "Six plus nine?",
        "answer": 15,
        "hint": "Pair to make 15: 6 and 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "prompt": "Seven plus eight?",
        "answer": 15,
        "hint": "Pair to make 15: 7 and 8."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 15
        },
        "prompt": "Zero plus fifteen?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 3
        },
        "prompt": "Twelve plus three?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 11
        },
        "prompt": "Four plus eleven?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 1
        },
        "prompt": "Fourteen plus one?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 5
        },
        "prompt": "Ten plus five?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 1
        },
        "prompt": "Fourteen plus one?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight plus seven?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight plus seven?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 0
        },
        "prompt": "Fifteen plus zero?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 3
        },
        "prompt": "Twelve plus three?",
        "answer": 15
      }
    ]
  },
  {
    "id": "sums-to-16",
    "title": "Sums to 16",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 16.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 16",
        "visual": {
          "type": "bignum",
          "n": 16
        },
        "text": "How many pairs of numbers add up to 16? Many ways!",
        "caption": "Make 16"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 16
        },
        "text": "0 + 16 = 16. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 16 = 16"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 15
        },
        "text": "1 + 15 = 16. One plus one less.",
        "caption": "1 + 15 = 16"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "text": "8 + 8 = 16. A double!",
        "caption": "8 + 8 = 16"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 8,
          "b": 8,
          "emoji": "🐯"
        },
        "text": "8 + 8 also makes 16. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 17 pairs that make 16. Try to find them all!",
        "caption": "17 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 16
        },
        "prompt": "Zero plus sixteen?",
        "answer": 16,
        "hint": "Pair to make 16: 0 and 16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 15
        },
        "prompt": "One plus fifteen?",
        "answer": 16,
        "hint": "Pair to make 16: 1 and 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 14
        },
        "prompt": "Two plus fourteen?",
        "answer": 16,
        "hint": "Pair to make 16: 2 and 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 13
        },
        "prompt": "Three plus thirteen?",
        "answer": 16,
        "hint": "Pair to make 16: 3 and 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 12
        },
        "prompt": "Four plus twelve?",
        "answer": 16,
        "hint": "Pair to make 16: 4 and 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 11
        },
        "prompt": "Five plus eleven?",
        "answer": 16,
        "hint": "Pair to make 16: 5 and 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 10
        },
        "prompt": "Six plus ten?",
        "answer": 16,
        "hint": "Pair to make 16: 6 and 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 9
        },
        "prompt": "Seven plus nine?",
        "answer": 16,
        "hint": "Pair to make 16: 7 and 9."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 6
        },
        "prompt": "Ten plus six?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 13
        },
        "prompt": "Three plus thirteen?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 10
        },
        "prompt": "Six plus ten?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 0
        },
        "prompt": "Sixteen plus zero?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 6
        },
        "prompt": "Ten plus six?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 9
        },
        "prompt": "Seven plus nine?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 9
        },
        "prompt": "Seven plus nine?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 14
        },
        "prompt": "Two plus fourteen?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 3
        },
        "prompt": "Thirteen plus three?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 16
        },
        "prompt": "Zero plus sixteen?",
        "answer": 16
      }
    ]
  },
  {
    "id": "sums-to-17",
    "title": "Sums to 17",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 17.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 17",
        "visual": {
          "type": "bignum",
          "n": 17
        },
        "text": "How many pairs of numbers add up to 17? Many ways!",
        "caption": "Make 17"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 17
        },
        "text": "0 + 17 = 17. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 17 = 17"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 16
        },
        "text": "1 + 16 = 17. One plus one less.",
        "caption": "1 + 16 = 17"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 9
        },
        "text": "8 + 9 = 17. Almost a double.",
        "caption": "8 + 9 = 17"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 8,
          "b": 9,
          "emoji": "🦊"
        },
        "text": "9 + 8 also makes 17. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 18 pairs that make 17. Try to find them all!",
        "caption": "18 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 17
        },
        "prompt": "Zero plus seventeen?",
        "answer": 17,
        "hint": "Pair to make 17: 0 and 17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 16
        },
        "prompt": "One plus sixteen?",
        "answer": 17,
        "hint": "Pair to make 17: 1 and 16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 15
        },
        "prompt": "Two plus fifteen?",
        "answer": 17,
        "hint": "Pair to make 17: 2 and 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 14
        },
        "prompt": "Three plus fourteen?",
        "answer": 17,
        "hint": "Pair to make 17: 3 and 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 13
        },
        "prompt": "Four plus thirteen?",
        "answer": 17,
        "hint": "Pair to make 17: 4 and 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 12
        },
        "prompt": "Five plus twelve?",
        "answer": 17,
        "hint": "Pair to make 17: 5 and 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 11
        },
        "prompt": "Six plus eleven?",
        "answer": 17,
        "hint": "Pair to make 17: 6 and 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 10
        },
        "prompt": "Seven plus ten?",
        "answer": 17,
        "hint": "Pair to make 17: 7 and 10."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 5
        },
        "prompt": "Twelve plus five?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 3
        },
        "prompt": "Fourteen plus three?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 6
        },
        "prompt": "Eleven plus six?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 14
        },
        "prompt": "Three plus fourteen?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 6
        },
        "prompt": "Eleven plus six?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 5
        },
        "prompt": "Twelve plus five?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 17
        },
        "prompt": "Zero plus seventeen?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 12
        },
        "prompt": "Five plus twelve?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 7
        },
        "prompt": "Ten plus seven?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 3
        },
        "prompt": "Fourteen plus three?",
        "answer": 17
      }
    ]
  },
  {
    "id": "sums-to-18",
    "title": "Sums to 18",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 18.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 18",
        "visual": {
          "type": "bignum",
          "n": 18
        },
        "text": "How many pairs of numbers add up to 18? Many ways!",
        "caption": "Make 18"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 18
        },
        "text": "0 + 18 = 18. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 18 = 18"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 17
        },
        "text": "1 + 17 = 18. One plus one less.",
        "caption": "1 + 17 = 18"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "text": "9 + 9 = 18. A double!",
        "caption": "9 + 9 = 18"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 9,
          "b": 9,
          "emoji": "🐮"
        },
        "text": "9 + 9 also makes 18. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 19 pairs that make 18. Try to find them all!",
        "caption": "19 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 18
        },
        "prompt": "Zero plus eighteen?",
        "answer": 18,
        "hint": "Pair to make 18: 0 and 18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 17
        },
        "prompt": "One plus seventeen?",
        "answer": 18,
        "hint": "Pair to make 18: 1 and 17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 16
        },
        "prompt": "Two plus sixteen?",
        "answer": 18,
        "hint": "Pair to make 18: 2 and 16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 15
        },
        "prompt": "Three plus fifteen?",
        "answer": 18,
        "hint": "Pair to make 18: 3 and 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 14
        },
        "prompt": "Four plus fourteen?",
        "answer": 18,
        "hint": "Pair to make 18: 4 and 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 13
        },
        "prompt": "Five plus thirteen?",
        "answer": 18,
        "hint": "Pair to make 18: 5 and 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 12
        },
        "prompt": "Six plus twelve?",
        "answer": 18,
        "hint": "Pair to make 18: 6 and 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 11
        },
        "prompt": "Seven plus eleven?",
        "answer": 18,
        "hint": "Pair to make 18: 7 and 11."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 17
        },
        "prompt": "One plus seventeen?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 13,
          "b": 5
        },
        "prompt": "Thirteen plus five?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 15
        },
        "prompt": "Three plus fifteen?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 16
        },
        "prompt": "Two plus sixteen?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 18
        },
        "prompt": "Zero plus eighteen?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 13
        },
        "prompt": "Five plus thirteen?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 11
        },
        "prompt": "Seven plus eleven?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 1
        },
        "prompt": "Seventeen plus one?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 14
        },
        "prompt": "Four plus fourteen?",
        "answer": 18
      }
    ]
  },
  {
    "id": "sums-to-19",
    "title": "Sums to 19",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 19.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 19",
        "visual": {
          "type": "bignum",
          "n": 19
        },
        "text": "How many pairs of numbers add up to 19? Many ways!",
        "caption": "Make 19"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 19
        },
        "text": "0 + 19 = 19. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 19 = 19"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 18
        },
        "text": "1 + 18 = 19. One plus one less.",
        "caption": "1 + 18 = 19"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 10
        },
        "text": "9 + 10 = 19. Almost a double.",
        "caption": "9 + 10 = 19"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 9,
          "b": 10,
          "emoji": "🐷"
        },
        "text": "10 + 9 also makes 19. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 20 pairs that make 19. Try to find them all!",
        "caption": "20 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 19
        },
        "prompt": "Zero plus nineteen?",
        "answer": 19,
        "hint": "Pair to make 19: 0 and 19."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 18
        },
        "prompt": "One plus eighteen?",
        "answer": 19,
        "hint": "Pair to make 19: 1 and 18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 17
        },
        "prompt": "Two plus seventeen?",
        "answer": 19,
        "hint": "Pair to make 19: 2 and 17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 16
        },
        "prompt": "Three plus sixteen?",
        "answer": 19,
        "hint": "Pair to make 19: 3 and 16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 15
        },
        "prompt": "Four plus fifteen?",
        "answer": 19,
        "hint": "Pair to make 19: 4 and 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 14
        },
        "prompt": "Five plus fourteen?",
        "answer": 19,
        "hint": "Pair to make 19: 5 and 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 13
        },
        "prompt": "Six plus thirteen?",
        "answer": 19,
        "hint": "Pair to make 19: 6 and 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 12
        },
        "prompt": "Seven plus twelve?",
        "answer": 19,
        "hint": "Pair to make 19: 7 and 12."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 11
        },
        "prompt": "Eight plus eleven?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 18
        },
        "prompt": "One plus eighteen?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 8
        },
        "prompt": "Eleven plus eight?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 5
        },
        "prompt": "Fourteen plus five?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 15,
          "b": 4
        },
        "prompt": "Fifteen plus four?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 13
        },
        "prompt": "Six plus thirteen?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 14,
          "b": 5
        },
        "prompt": "Fourteen plus five?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 8
        },
        "prompt": "Eleven plus eight?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 3
        },
        "prompt": "Sixteen plus three?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 19
        },
        "prompt": "Zero plus nineteen?",
        "answer": 19
      }
    ]
  },
  {
    "id": "sums-to-20",
    "title": "Sums to 20",
    "emoji": "🎯",
    "category": "B",
    "description": "All the pairs that add to 20.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pairs that Make 20",
        "visual": {
          "type": "bignum",
          "n": 20
        },
        "text": "How many pairs of numbers add up to 20? Many ways!",
        "caption": "Make 20"
      },
      {
        "title": "Start Small",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 20
        },
        "text": "0 + 20 = 20. Zero plus the whole number is the easiest pair.",
        "caption": "0 + 20 = 20"
      },
      {
        "title": "Next Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 19
        },
        "text": "1 + 19 = 20. One plus one less.",
        "caption": "1 + 19 = 20"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "text": "10 + 10 = 20. A double!",
        "caption": "10 + 10 = 20"
      },
      {
        "title": "Order Doesn't Matter",
        "visual": {
          "type": "add-groups",
          "a": 10,
          "b": 10,
          "emoji": "⭐"
        },
        "text": "10 + 10 also makes 20. Switching the order keeps the sum the same!",
        "caption": "Same sum either way"
      },
      {
        "title": "Try More",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 21 pairs that make 20. Try to find them all!",
        "caption": "21 pairs total"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 20
        },
        "prompt": "Zero plus twenty?",
        "answer": 20,
        "hint": "Pair to make 20: 0 and 20."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 19
        },
        "prompt": "One plus nineteen?",
        "answer": 20,
        "hint": "Pair to make 20: 1 and 19."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 18
        },
        "prompt": "Two plus eighteen?",
        "answer": 20,
        "hint": "Pair to make 20: 2 and 18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 17
        },
        "prompt": "Three plus seventeen?",
        "answer": 20,
        "hint": "Pair to make 20: 3 and 17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 16
        },
        "prompt": "Four plus sixteen?",
        "answer": 20,
        "hint": "Pair to make 20: 4 and 16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 15
        },
        "prompt": "Five plus fifteen?",
        "answer": 20,
        "hint": "Pair to make 20: 5 and 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 14
        },
        "prompt": "Six plus fourteen?",
        "answer": 20,
        "hint": "Pair to make 20: 6 and 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 13
        },
        "prompt": "Seven plus thirteen?",
        "answer": 20,
        "hint": "Pair to make 20: 7 and 13."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 19
        },
        "prompt": "One plus nineteen?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 12,
          "b": 8
        },
        "prompt": "Twelve plus eight?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 12
        },
        "prompt": "Eight plus twelve?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 16,
          "b": 4
        },
        "prompt": "Sixteen plus four?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 9
        },
        "prompt": "Eleven plus nine?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 20,
          "b": 0
        },
        "prompt": "Twenty plus zero?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 20
        },
        "prompt": "Zero plus twenty?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 20,
          "b": 0
        },
        "prompt": "Twenty plus zero?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 17,
          "b": 3
        },
        "prompt": "Seventeen plus three?",
        "answer": 20
      }
    ]
  },
  {
    "id": "double-1",
    "title": "Double of 1",
    "emoji": "👯",
    "category": "B",
    "description": "1 + 1 = 2.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 1 + 1",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 1,
          "emoji": "🍊"
        },
        "text": "A DOUBLE is the same number twice. 1 + 1 = 2.",
        "caption": "1 + 1 = 2"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "ten-frame",
          "filled": 2,
          "filledA": 1,
          "filledB": 0
        },
        "text": "Two groups of 1 make 2. Like two hands with 1 fingers each!",
        "caption": "2 groups of 1"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "text": "1 + 1 = 2. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 1+1=2"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "text": "If 1 + 1 = 2, then 1 + 2 = 3! Just one more.",
        "caption": "1 + 2 = 3"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 1,
          "emoji": "🍊"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "1+1=2"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2,
        "hint": "Doubles! 1+1=2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 1,
          "emoji": "🍊"
        },
        "prompt": "Hakan has one 🍊, gets one more. How many?",
        "answer": 2,
        "hint": "Doubles! 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "prompt": "One plus two?",
        "answer": 3,
        "hint": "Doubles plus 1: 1+1=2, plus 1 = 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 1
        },
        "prompt": "Two plus one?",
        "answer": 3,
        "hint": "Same as 1+2=3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 0
        },
        "prompt": "One plus zero?",
        "answer": 1,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "Is 1+1=2?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "Is 1+1=4?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 1+1=2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 1
        },
        "prompt": "One plus one?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "prompt": "One plus two?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "prompt": "One plus two?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "prompt": "One plus two?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 1
        },
        "prompt": "Two plus one?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 1
        },
        "prompt": "Two plus one?",
        "answer": 3
      }
    ]
  },
  {
    "id": "double-2",
    "title": "Double of 2",
    "emoji": "👯",
    "category": "B",
    "description": "2 + 2 = 4.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 2 + 2",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 2,
          "emoji": "🍋"
        },
        "text": "A DOUBLE is the same number twice. 2 + 2 = 4.",
        "caption": "2 + 2 = 4"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "ten-frame",
          "filled": 4,
          "filledA": 2,
          "filledB": 0
        },
        "text": "Two groups of 2 make 4. Like two hands with 2 fingers each!",
        "caption": "2 groups of 2"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "text": "2 + 2 = 4. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 2+2=4"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "text": "If 2 + 2 = 4, then 2 + 3 = 5! Just one more.",
        "caption": "2 + 3 = 5"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 2,
          "emoji": "🍋"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "2+2=4"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4,
        "hint": "Doubles! 2+2=4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 2,
          "emoji": "🍋"
        },
        "prompt": "Hakan has two 🍋, gets two more. How many?",
        "answer": 4,
        "hint": "Doubles! 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5,
        "hint": "Doubles plus 1: 2+2=4, plus 1 = 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5,
        "hint": "Same as 2+3=5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 1
        },
        "prompt": "Two plus one?",
        "answer": 3,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Is 2+2=4?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Is 2+2=6?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 2+2=4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5
      }
    ]
  },
  {
    "id": "double-3",
    "title": "Double of 3",
    "emoji": "👯",
    "category": "B",
    "description": "3 + 3 = 6.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 3 + 3",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍌"
        },
        "text": "A DOUBLE is the same number twice. 3 + 3 = 6.",
        "caption": "3 + 3 = 6"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "ten-frame",
          "filled": 6,
          "filledA": 3,
          "filledB": 0
        },
        "text": "Two groups of 3 make 6. Like two hands with 3 fingers each!",
        "caption": "2 groups of 3"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "text": "3 + 3 = 6. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 3+3=6"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "text": "If 3 + 3 = 6, then 3 + 4 = 7! Just one more.",
        "caption": "3 + 4 = 7"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍌"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "3+3=6"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6,
        "hint": "Doubles! 3+3=6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍌"
        },
        "prompt": "Hakan has three 🍌, gets three more. How many?",
        "answer": 6,
        "hint": "Doubles! 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7,
        "hint": "Doubles plus 1: 3+3=6, plus 1 = 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus three?",
        "answer": 7,
        "hint": "Same as 3+4=7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus two?",
        "answer": 5,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Is 3+3=6?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Is 3+3=8?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 3+3=6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus four?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus three?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus three?",
        "answer": 7
      }
    ]
  },
  {
    "id": "double-4",
    "title": "Double of 4",
    "emoji": "👯",
    "category": "B",
    "description": "4 + 4 = 8.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 4 + 4",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 4,
          "emoji": "🍇"
        },
        "text": "A DOUBLE is the same number twice. 4 + 4 = 8.",
        "caption": "4 + 4 = 8"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "ten-frame",
          "filled": 8,
          "filledA": 4,
          "filledB": 0
        },
        "text": "Two groups of 4 make 8. Like two hands with 4 fingers each!",
        "caption": "2 groups of 4"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "text": "4 + 4 = 8. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 4+4=8"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "text": "If 4 + 4 = 8, then 4 + 5 = 9! Just one more.",
        "caption": "4 + 5 = 9"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 4,
          "emoji": "🍇"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "4+4=8"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8,
        "hint": "Doubles! 4+4=8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 4,
          "emoji": "🍇"
        },
        "prompt": "Hakan has four 🍇, gets four more. How many?",
        "answer": 8,
        "hint": "Doubles! 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9,
        "hint": "Doubles plus 1: 4+4=8, plus 1 = 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9,
        "hint": "Same as 4+5=9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus three?",
        "answer": 7,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Is 4+4=8?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Is 4+4=10?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 4+4=8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus four?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus five?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9
      }
    ]
  },
  {
    "id": "double-5",
    "title": "Double of 5",
    "emoji": "👯",
    "category": "B",
    "description": "5 + 5 = 10.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 5 + 5",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 5,
          "emoji": "🍓"
        },
        "text": "A DOUBLE is the same number twice. 5 + 5 = 10.",
        "caption": "5 + 5 = 10"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "ten-frame",
          "filled": 10,
          "filledA": 5,
          "filledB": 0
        },
        "text": "Two groups of 5 make 10. Like two hands with 5 fingers each!",
        "caption": "2 groups of 5"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "text": "5 + 5 = 10. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 5+5=10"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "text": "If 5 + 5 = 10, then 5 + 6 = 11! Just one more.",
        "caption": "5 + 6 = 11"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 5,
          "emoji": "🍓"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "5+5=10"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10,
        "hint": "Doubles! 5+5=10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 5,
          "emoji": "🍓"
        },
        "prompt": "Hakan has five 🍓, gets five more. How many?",
        "answer": 10,
        "hint": "Doubles! 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "prompt": "Five plus six?",
        "answer": 11,
        "hint": "Doubles plus 1: 5+5=10, plus 1 = 11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11,
        "hint": "Same as 5+6=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus four?",
        "answer": 9,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Is 5+5=10?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Is 5+5=12?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 5+5=10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "prompt": "Five plus six?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "prompt": "Five plus six?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 6
        },
        "prompt": "Five plus six?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11
      }
    ]
  },
  {
    "id": "double-6",
    "title": "Double of 6",
    "emoji": "👯",
    "category": "B",
    "description": "6 + 6 = 12.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 6 + 6",
        "visual": {
          "type": "add-groups",
          "a": 6,
          "b": 6,
          "emoji": "🍒"
        },
        "text": "A DOUBLE is the same number twice. 6 + 6 = 12.",
        "caption": "6 + 6 = 12"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "two-ten-frames",
          "filled": 12,
          "filledA": 6,
          "filledB": 2
        },
        "text": "Two groups of 6 make 12. Like two hands with 6 fingers each!",
        "caption": "2 groups of 6"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "text": "6 + 6 = 12. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 6+6=12"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "text": "If 6 + 6 = 12, then 6 + 7 = 13! Just one more.",
        "caption": "6 + 7 = 13"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 6,
          "b": 6,
          "emoji": "🍒"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "6+6=12"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12,
        "hint": "Doubles! 6+6=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 6,
          "b": 6,
          "emoji": "🍒"
        },
        "prompt": "Hakan has six 🍒, gets six more. How many?",
        "answer": 12,
        "hint": "Doubles! 12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13,
        "hint": "Doubles plus 1: 6+6=12, plus 1 = 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven plus six?",
        "answer": 13,
        "hint": "Same as 6+7=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 5
        },
        "prompt": "Six plus five?",
        "answer": 11,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Is 6+6=12?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Is 6+6=14?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 6+6=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 6
        },
        "prompt": "Six plus six?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 7
        },
        "prompt": "Six plus seven?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven plus six?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven plus six?",
        "answer": 13
      }
    ]
  },
  {
    "id": "double-7",
    "title": "Double of 7",
    "emoji": "👯",
    "category": "B",
    "description": "7 + 7 = 14.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 7 + 7",
        "visual": {
          "type": "add-groups",
          "a": 7,
          "b": 7,
          "emoji": "🍑"
        },
        "text": "A DOUBLE is the same number twice. 7 + 7 = 14.",
        "caption": "7 + 7 = 14"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "two-ten-frames",
          "filled": 14,
          "filledA": 7,
          "filledB": 4
        },
        "text": "Two groups of 7 make 14. Like two hands with 7 fingers each!",
        "caption": "2 groups of 7"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "text": "7 + 7 = 14. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 7+7=14"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "text": "If 7 + 7 = 14, then 7 + 8 = 15! Just one more.",
        "caption": "7 + 8 = 15"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 7,
          "b": 7,
          "emoji": "🍑"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "7+7=14"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14,
        "hint": "Doubles! 7+7=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 7,
          "b": 7,
          "emoji": "🍑"
        },
        "prompt": "Hakan has seven 🍑, gets seven more. How many?",
        "answer": 14,
        "hint": "Doubles! 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "prompt": "Seven plus eight?",
        "answer": 15,
        "hint": "Doubles plus 1: 7+7=14, plus 1 = 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight plus seven?",
        "answer": 15,
        "hint": "Same as 7+8=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 6
        },
        "prompt": "Seven plus six?",
        "answer": 13,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Is 7+7=14?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Is 7+7=16?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 7+7=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 7
        },
        "prompt": "Seven plus seven?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "prompt": "Seven plus eight?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "prompt": "Seven plus eight?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 8
        },
        "prompt": "Seven plus eight?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight plus seven?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight plus seven?",
        "answer": 15
      }
    ]
  },
  {
    "id": "double-8",
    "title": "Double of 8",
    "emoji": "👯",
    "category": "B",
    "description": "8 + 8 = 16.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 8 + 8",
        "visual": {
          "type": "add-groups",
          "a": 8,
          "b": 8,
          "emoji": "🥝"
        },
        "text": "A DOUBLE is the same number twice. 8 + 8 = 16.",
        "caption": "8 + 8 = 16"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "two-ten-frames",
          "filled": 16,
          "filledA": 8,
          "filledB": 6
        },
        "text": "Two groups of 8 make 16. Like two hands with 8 fingers each!",
        "caption": "2 groups of 8"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "text": "8 + 8 = 16. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 8+8=16"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 9
        },
        "text": "If 8 + 8 = 16, then 8 + 9 = 17! Just one more.",
        "caption": "8 + 9 = 17"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 8,
          "b": 8,
          "emoji": "🥝"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "8+8=16"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16,
        "hint": "Doubles! 8+8=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 8,
          "b": 8,
          "emoji": "🥝"
        },
        "prompt": "Hakan has eight 🥝, gets eight more. How many?",
        "answer": 16,
        "hint": "Doubles! 16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 9
        },
        "prompt": "Eight plus nine?",
        "answer": 17,
        "hint": "Doubles plus 1: 8+8=16, plus 1 = 17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Same as 8+9=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 7
        },
        "prompt": "Eight plus seven?",
        "answer": 15,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Is 8+8=16?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Is 8+8=18?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 8+8=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 8
        },
        "prompt": "Eight plus eight?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 9
        },
        "prompt": "Eight plus nine?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 9
        },
        "prompt": "Eight plus nine?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 9
        },
        "prompt": "Eight plus nine?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17
      }
    ]
  },
  {
    "id": "double-9",
    "title": "Double of 9",
    "emoji": "👯",
    "category": "B",
    "description": "9 + 9 = 18.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 9 + 9",
        "visual": {
          "type": "add-groups",
          "a": 9,
          "b": 9,
          "emoji": "🍐"
        },
        "text": "A DOUBLE is the same number twice. 9 + 9 = 18.",
        "caption": "9 + 9 = 18"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "two-ten-frames",
          "filled": 18,
          "filledA": 9,
          "filledB": 8
        },
        "text": "Two groups of 9 make 18. Like two hands with 9 fingers each!",
        "caption": "2 groups of 9"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "text": "9 + 9 = 18. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 9+9=18"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 10
        },
        "text": "If 9 + 9 = 18, then 9 + 10 = 19! Just one more.",
        "caption": "9 + 10 = 19"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 9,
          "b": 9,
          "emoji": "🍐"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "9+9=18"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18,
        "hint": "Doubles! 9+9=18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 9,
          "b": 9,
          "emoji": "🍐"
        },
        "prompt": "Hakan has nine 🍐, gets nine more. How many?",
        "answer": 18,
        "hint": "Doubles! 18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 10
        },
        "prompt": "Nine plus ten?",
        "answer": 19,
        "hint": "Doubles plus 1: 9+9=18, plus 1 = 19."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 9
        },
        "prompt": "Ten plus nine?",
        "answer": 19,
        "hint": "Same as 9+10=19."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Is 9+9=18?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Is 9+9=20?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 9+9=18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 9
        },
        "prompt": "Nine plus nine?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 10
        },
        "prompt": "Nine plus ten?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 10
        },
        "prompt": "Nine plus ten?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 10
        },
        "prompt": "Nine plus ten?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 9
        },
        "prompt": "Ten plus nine?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 9
        },
        "prompt": "Ten plus nine?",
        "answer": 19
      }
    ]
  },
  {
    "id": "double-10",
    "title": "Double of 10",
    "emoji": "👯",
    "category": "B",
    "description": "10 + 10 = 20.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Doubles: 10 + 10",
        "visual": {
          "type": "add-groups",
          "a": 10,
          "b": 10,
          "emoji": "🐶"
        },
        "text": "A DOUBLE is the same number twice. 10 + 10 = 20.",
        "caption": "10 + 10 = 20"
      },
      {
        "title": "Picture It",
        "visual": {
          "type": "two-ten-frames",
          "filled": 20,
          "filledA": 10,
          "filledB": 10
        },
        "text": "Two groups of 10 make 20. Like two hands with 10 fingers each!",
        "caption": "2 groups of 10"
      },
      {
        "title": "Memorize It",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "text": "10 + 10 = 20. Memorize this fact — it makes harder problems easier later!",
        "caption": "Remember: 10+10=20"
      },
      {
        "title": "Doubles +1",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 11
        },
        "text": "If 10 + 10 = 20, then 10 + 11 = 21! Just one more.",
        "caption": "10 + 11 = 21"
      },
      {
        "title": "Doubles are Power!",
        "visual": {
          "type": "add-groups",
          "a": 10,
          "b": 10,
          "emoji": "🐶"
        },
        "text": "Doubles are the FASTEST way to add. The more you remember, the faster you become.",
        "caption": "10+10=20"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20,
        "hint": "Doubles! 10+10=20."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "add-groups",
          "a": 10,
          "b": 10,
          "emoji": "🐶"
        },
        "prompt": "Hakan has ten 🐶, gets ten more. How many?",
        "answer": 20,
        "hint": "Doubles! 20."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 11
        },
        "prompt": "Ten plus eleven?",
        "answer": 21,
        "hint": "Doubles plus 1: 10+10=20, plus 1 = 21."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 10
        },
        "prompt": "Eleven plus ten?",
        "answer": 21,
        "hint": "Same as 10+11=21."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 9
        },
        "prompt": "Ten plus nine?",
        "answer": 19,
        "hint": "Doubles minus 1 strategy."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Is 10+10=20?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 0,
        "hint": "Doubles! True."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Is 10+10=22?",
        "choices": [
          "True",
          "False"
        ],
        "answerIndex": 1,
        "hint": "Wrong! 10+10=20."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20,
        "hint": "Easy double!"
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 10
        },
        "prompt": "Ten plus ten?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 11
        },
        "prompt": "Ten plus eleven?",
        "answer": 21
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 11
        },
        "prompt": "Ten plus eleven?",
        "answer": 21
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 11
        },
        "prompt": "Ten plus eleven?",
        "answer": 21
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 10
        },
        "prompt": "Eleven plus ten?",
        "answer": 21
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 11,
          "b": 10
        },
        "prompt": "Eleven plus ten?",
        "answer": 21
      }
    ]
  },
  {
    "id": "bonds-5",
    "title": "Number Bonds for 5",
    "emoji": "🤝",
    "category": "B",
    "description": "Find partner pairs that make 5.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Bonds for 5",
        "visual": {
          "type": "bignum",
          "n": 5
        },
        "text": "Two parts always make 5. We call these \"bonds\" or \"partners\".",
        "caption": "Find pairs to 5"
      },
      {
        "title": "See It with Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "text": "Imagine 5 dots. Split them into two groups: how many ways?",
        "caption": "5 dots, many splits"
      },
      {
        "title": "First Pair",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 4,
          "emoji": "🐰"
        },
        "text": "1 and 4 are partners. 1 + 4 = 5.",
        "caption": "1 + 4 = 5"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 3,
          "emoji": "🐰"
        },
        "text": "2 and 3 are partners. Near doubles.",
        "caption": "2 + 3 = 5"
      },
      {
        "title": "Knowing Bonds Helps Math",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "text": "When you KNOW the bonds for 5, adding and subtracting up to 5 becomes super fast!",
        "caption": "Bonds are the secret"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus what equals five?",
        "answer": 5,
        "hint": "0 and 5 are partners for 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "prompt": "One plus what equals five?",
        "answer": 4,
        "hint": "1 and 4 are partners for 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus what equals five?",
        "answer": 3,
        "hint": "2 and 3 are partners for 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus what equals five?",
        "answer": 2,
        "hint": "3 and 2 are partners for 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four plus what equals five?",
        "answer": 1,
        "hint": "4 and 1 are partners for 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus what equals five?",
        "answer": 0,
        "hint": "5 and 0 are partners for 5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus what makes five?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "prompt": "One plus what makes five?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 2
        },
        "prompt": "Three plus what makes five?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus what makes five?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus what makes five?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 1
        },
        "prompt": "Four plus what makes five?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus what makes five?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus what makes five?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 5
        },
        "prompt": "Zero plus what makes five?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 0
        },
        "prompt": "Five plus what makes five?",
        "answer": 0
      }
    ]
  },
  {
    "id": "bonds-6",
    "title": "Number Bonds for 6",
    "emoji": "🤝",
    "category": "B",
    "description": "Find partner pairs that make 6.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Bonds for 6",
        "visual": {
          "type": "bignum",
          "n": 6
        },
        "text": "Two parts always make 6. We call these \"bonds\" or \"partners\".",
        "caption": "Find pairs to 6"
      },
      {
        "title": "See It with Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "text": "Imagine 6 dots. Split them into two groups: how many ways?",
        "caption": "6 dots, many splits"
      },
      {
        "title": "First Pair",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 5,
          "emoji": "🐻"
        },
        "text": "1 and 5 are partners. 1 + 5 = 6.",
        "caption": "1 + 5 = 6"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🐻"
        },
        "text": "3 and 3 are partners. A double!",
        "caption": "3 + 3 = 6"
      },
      {
        "title": "Knowing Bonds Helps Math",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "text": "When you KNOW the bonds for 6, adding and subtracting up to 6 becomes super fast!",
        "caption": "Bonds are the secret"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 6
        },
        "prompt": "Zero plus what equals six?",
        "answer": 6,
        "hint": "0 and 6 are partners for 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "prompt": "One plus what equals six?",
        "answer": 5,
        "hint": "1 and 5 are partners for 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus what equals six?",
        "answer": 4,
        "hint": "2 and 4 are partners for 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus what equals six?",
        "answer": 3,
        "hint": "3 and 3 are partners for 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four plus what equals six?",
        "answer": 2,
        "hint": "4 and 2 are partners for 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 1
        },
        "prompt": "Five plus what equals six?",
        "answer": 1,
        "hint": "5 and 1 are partners for 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus what equals six?",
        "answer": 0,
        "hint": "6 and 0 are partners for 6."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus what makes six?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "prompt": "One plus what makes six?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 2
        },
        "prompt": "Four plus what makes six?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 0
        },
        "prompt": "Six plus what makes six?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 6
        },
        "prompt": "Zero plus what makes six?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus what makes six?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 1
        },
        "prompt": "Five plus what makes six?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus what makes six?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "prompt": "One plus what makes six?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 5
        },
        "prompt": "One plus what makes six?",
        "answer": 5
      }
    ]
  },
  {
    "id": "bonds-7",
    "title": "Number Bonds for 7",
    "emoji": "🤝",
    "category": "B",
    "description": "Find partner pairs that make 7.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Bonds for 7",
        "visual": {
          "type": "bignum",
          "n": 7
        },
        "text": "Two parts always make 7. We call these \"bonds\" or \"partners\".",
        "caption": "Find pairs to 7"
      },
      {
        "title": "See It with Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "text": "Imagine 7 dots. Split them into two groups: how many ways?",
        "caption": "7 dots, many splits"
      },
      {
        "title": "First Pair",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 6,
          "emoji": "🐼"
        },
        "text": "1 and 6 are partners. 1 + 6 = 7.",
        "caption": "1 + 6 = 7"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 4,
          "emoji": "🐼"
        },
        "text": "3 and 4 are partners. Near doubles.",
        "caption": "3 + 4 = 7"
      },
      {
        "title": "Knowing Bonds Helps Math",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "text": "When you KNOW the bonds for 7, adding and subtracting up to 7 becomes super fast!",
        "caption": "Bonds are the secret"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 7
        },
        "prompt": "Zero plus what equals seven?",
        "answer": 7,
        "hint": "0 and 7 are partners for 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 6
        },
        "prompt": "One plus what equals seven?",
        "answer": 6,
        "hint": "1 and 6 are partners for 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 5
        },
        "prompt": "Two plus what equals seven?",
        "answer": 5,
        "hint": "2 and 5 are partners for 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus what equals seven?",
        "answer": 4,
        "hint": "3 and 4 are partners for 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus what equals seven?",
        "answer": 3,
        "hint": "4 and 3 are partners for 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five plus what equals seven?",
        "answer": 2,
        "hint": "5 and 2 are partners for 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus what equals seven?",
        "answer": 1,
        "hint": "6 and 1 are partners for 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus what equals seven?",
        "answer": 0,
        "hint": "7 and 0 are partners for 7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 5
        },
        "prompt": "Two plus what makes seven?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 7
        },
        "prompt": "Zero plus what makes seven?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 6
        },
        "prompt": "One plus what makes seven?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 2
        },
        "prompt": "Five plus what makes seven?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 0
        },
        "prompt": "Seven plus what makes seven?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 1
        },
        "prompt": "Six plus what makes seven?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 3
        },
        "prompt": "Four plus what makes seven?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 4
        },
        "prompt": "Three plus what makes seven?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 5
        },
        "prompt": "Two plus what makes seven?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 6
        },
        "prompt": "One plus what makes seven?",
        "answer": 6
      }
    ]
  },
  {
    "id": "bonds-8",
    "title": "Number Bonds for 8",
    "emoji": "🤝",
    "category": "B",
    "description": "Find partner pairs that make 8.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Bonds for 8",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "text": "Two parts always make 8. We call these \"bonds\" or \"partners\".",
        "caption": "Find pairs to 8"
      },
      {
        "title": "See It with Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "text": "Imagine 8 dots. Split them into two groups: how many ways?",
        "caption": "8 dots, many splits"
      },
      {
        "title": "First Pair",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 7,
          "emoji": "🐨"
        },
        "text": "1 and 7 are partners. 1 + 7 = 8.",
        "caption": "1 + 7 = 8"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 4,
          "emoji": "🐨"
        },
        "text": "4 and 4 are partners. A double!",
        "caption": "4 + 4 = 8"
      },
      {
        "title": "Knowing Bonds Helps Math",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "text": "When you KNOW the bonds for 8, adding and subtracting up to 8 becomes super fast!",
        "caption": "Bonds are the secret"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "prompt": "Zero plus what equals eight?",
        "answer": 8,
        "hint": "0 and 8 are partners for 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 7
        },
        "prompt": "One plus what equals eight?",
        "answer": 7,
        "hint": "1 and 7 are partners for 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 6
        },
        "prompt": "Two plus what equals eight?",
        "answer": 6,
        "hint": "2 and 6 are partners for 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus what equals eight?",
        "answer": 5,
        "hint": "3 and 5 are partners for 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus what equals eight?",
        "answer": 4,
        "hint": "4 and 4 are partners for 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus what equals eight?",
        "answer": 3,
        "hint": "5 and 3 are partners for 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 2
        },
        "prompt": "Six plus what equals eight?",
        "answer": 2,
        "hint": "6 and 2 are partners for 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven plus what equals eight?",
        "answer": 1,
        "hint": "7 and 1 are partners for 8."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 1
        },
        "prompt": "Seven plus what makes eight?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 4
        },
        "prompt": "Four plus what makes eight?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 8
        },
        "prompt": "Zero plus what makes eight?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 2
        },
        "prompt": "Six plus what makes eight?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 0
        },
        "prompt": "Eight plus what makes eight?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus what makes eight?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus what makes eight?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 7
        },
        "prompt": "One plus what makes eight?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 6
        },
        "prompt": "Two plus what makes eight?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 0
        },
        "prompt": "Eight plus what makes eight?",
        "answer": 0
      }
    ]
  },
  {
    "id": "bonds-9",
    "title": "Number Bonds for 9",
    "emoji": "🤝",
    "category": "B",
    "description": "Find partner pairs that make 9.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Bonds for 9",
        "visual": {
          "type": "bignum",
          "n": 9
        },
        "text": "Two parts always make 9. We call these \"bonds\" or \"partners\".",
        "caption": "Find pairs to 9"
      },
      {
        "title": "See It with Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "text": "Imagine 9 dots. Split them into two groups: how many ways?",
        "caption": "9 dots, many splits"
      },
      {
        "title": "First Pair",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 8,
          "emoji": "🐯"
        },
        "text": "1 and 8 are partners. 1 + 8 = 9.",
        "caption": "1 + 8 = 9"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "add-groups",
          "a": 4,
          "b": 5,
          "emoji": "🐯"
        },
        "text": "4 and 5 are partners. Near doubles.",
        "caption": "4 + 5 = 9"
      },
      {
        "title": "Knowing Bonds Helps Math",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "text": "When you KNOW the bonds for 9, adding and subtracting up to 9 becomes super fast!",
        "caption": "Bonds are the secret"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 9
        },
        "prompt": "Zero plus what equals nine?",
        "answer": 9,
        "hint": "0 and 9 are partners for 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 8
        },
        "prompt": "One plus what equals nine?",
        "answer": 8,
        "hint": "1 and 8 are partners for 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 7
        },
        "prompt": "Two plus what equals nine?",
        "answer": 7,
        "hint": "2 and 7 are partners for 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 6
        },
        "prompt": "Three plus what equals nine?",
        "answer": 6,
        "hint": "3 and 6 are partners for 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus what equals nine?",
        "answer": 5,
        "hint": "4 and 5 are partners for 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus what equals nine?",
        "answer": 4,
        "hint": "5 and 4 are partners for 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six plus what equals nine?",
        "answer": 3,
        "hint": "6 and 3 are partners for 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "prompt": "Seven plus what equals nine?",
        "answer": 2,
        "hint": "7 and 2 are partners for 9."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 7
        },
        "prompt": "Two plus what makes nine?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 8
        },
        "prompt": "One plus what makes nine?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 3
        },
        "prompt": "Six plus what makes nine?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "prompt": "Five plus what makes nine?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 9
        },
        "prompt": "Zero plus what makes nine?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 0
        },
        "prompt": "Nine plus what makes nine?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 1
        },
        "prompt": "Eight plus what makes nine?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 2
        },
        "prompt": "Seven plus what makes nine?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 6
        },
        "prompt": "Three plus what makes nine?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 5
        },
        "prompt": "Four plus what makes nine?",
        "answer": 5
      }
    ]
  },
  {
    "id": "bonds-10",
    "title": "Number Bonds for 10",
    "emoji": "🤝",
    "category": "B",
    "description": "Find partner pairs that make 10.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Bonds for 10",
        "visual": {
          "type": "bignum",
          "n": 10
        },
        "text": "Two parts always make 10. We call these \"bonds\" or \"partners\".",
        "caption": "Find pairs to 10"
      },
      {
        "title": "See It with Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "Imagine 10 dots. Split them into two groups: how many ways?",
        "caption": "10 dots, many splits"
      },
      {
        "title": "First Pair",
        "visual": {
          "type": "add-groups",
          "a": 1,
          "b": 9,
          "emoji": "🦊"
        },
        "text": "1 and 9 are partners. 1 + 9 = 10.",
        "caption": "1 + 9 = 10"
      },
      {
        "title": "Middle Pair",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 5,
          "emoji": "🦊"
        },
        "text": "5 and 5 are partners. A double!",
        "caption": "5 + 5 = 10"
      },
      {
        "title": "Knowing Bonds Helps Math",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "text": "When you KNOW the bonds for 10, adding and subtracting up to 10 becomes super fast!",
        "caption": "Bonds are the secret"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 10
        },
        "prompt": "Zero plus what equals ten?",
        "answer": 10,
        "hint": "0 and 10 are partners for 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "prompt": "One plus what equals ten?",
        "answer": 9,
        "hint": "1 and 9 are partners for 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 8
        },
        "prompt": "Two plus what equals ten?",
        "answer": 8,
        "hint": "2 and 8 are partners for 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "prompt": "Three plus what equals ten?",
        "answer": 7,
        "hint": "3 and 7 are partners for 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus what equals ten?",
        "answer": 6,
        "hint": "4 and 6 are partners for 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus what equals ten?",
        "answer": 5,
        "hint": "5 and 5 are partners for 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 4
        },
        "prompt": "Six plus what equals ten?",
        "answer": 4,
        "hint": "6 and 4 are partners for 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven plus what equals ten?",
        "answer": 3,
        "hint": "7 and 3 are partners for 10."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven plus what makes ten?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 9
        },
        "prompt": "One plus what makes ten?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus what makes ten?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 0,
          "b": 10
        },
        "prompt": "Zero plus what makes ten?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 8
        },
        "prompt": "Two plus what makes ten?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus what makes ten?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 2
        },
        "prompt": "Eight plus what makes ten?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 0
        },
        "prompt": "Ten plus what makes ten?",
        "answer": 0
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "prompt": "Three plus what makes ten?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 1
        },
        "prompt": "Nine plus what makes ten?",
        "answer": 1
      }
    ]
  },
  {
    "id": "compare-10",
    "title": "Compare within 10",
    "emoji": "⚖️",
    "category": "E",
    "description": "Compare numbers up to 10 using >, <, =.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Compare to 10",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 5
        },
        "text": "When we compare two numbers, we say which is BIGGER, SMALLER, or EQUAL.",
        "caption": "3 vs 5"
      },
      {
        "title": "The Alligator",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 3
        },
        "text": "The > sign is the alligator mouth — it always wants to eat the BIGGER number!",
        "caption": "7 > 3"
      },
      {
        "title": "Less Than",
        "visual": {
          "type": "compare-pair",
          "a": 2,
          "b": 8
        },
        "text": "The < sign points to the SMALLER number. 2 < 8.",
        "caption": "2 < 8"
      },
      {
        "title": "Equal",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 5
        },
        "text": "When two numbers are the SAME, use =. 5 = 5.",
        "caption": "5 = 5"
      },
      {
        "title": "Practice on Bigger Numbers",
        "visual": {
          "type": "compare-pair",
          "a": 10,
          "b": 8
        },
        "text": "Even with bigger numbers, the alligator eats the bigger one!",
        "caption": "Same rule!"
      }
    ],
    "practice": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 9,
          "b": 7
        },
        "prompt": "Compare nine and seven.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "9 is bigger than 7."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 8,
          "b": 2
        },
        "prompt": "Compare eight and two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "8 is bigger than 2."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 6,
          "b": 6
        },
        "prompt": "Compare six and six.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 2,
        "hint": "6 and 6 are equal."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 0,
          "b": 1
        },
        "prompt": "Compare zero and one.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "0 is smaller than 1."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 10,
          "b": 3
        },
        "prompt": "Compare ten and three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "10 is bigger than 3."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 4,
          "b": 1
        },
        "prompt": "Compare four and one.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "4 is bigger than 1."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 4,
          "b": 9
        },
        "prompt": "Compare four and nine.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "4 is smaller than 9."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 4
        },
        "prompt": "Compare three and four.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "3 is smaller than 4."
      }
    ],
    "quiz": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 10,
          "b": 2
        },
        "prompt": "Compare ten and two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 8
        },
        "prompt": "Compare five and eight.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 1
        },
        "prompt": "Compare five and one.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 6
        },
        "prompt": "Compare seven and six.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 8,
          "b": 5
        },
        "prompt": "Compare eight and five.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 1,
          "b": 1
        },
        "prompt": "Compare one and one.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 2
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 7
        },
        "prompt": "Compare five and seven.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 3
        },
        "prompt": "Compare seven and three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 6,
          "b": 8
        },
        "prompt": "Compare six and eight.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 0,
          "b": 2
        },
        "prompt": "Compare zero and two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      }
    ]
  },
  {
    "id": "compare-20",
    "title": "Compare within 20",
    "emoji": "⚖️",
    "category": "E",
    "description": "Compare numbers up to 20 using >, <, =.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Compare to 20",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 5
        },
        "text": "When we compare two numbers, we say which is BIGGER, SMALLER, or EQUAL.",
        "caption": "3 vs 5"
      },
      {
        "title": "The Alligator",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 3
        },
        "text": "The > sign is the alligator mouth — it always wants to eat the BIGGER number!",
        "caption": "7 > 3"
      },
      {
        "title": "Less Than",
        "visual": {
          "type": "compare-pair",
          "a": 2,
          "b": 8
        },
        "text": "The < sign points to the SMALLER number. 2 < 8.",
        "caption": "2 < 8"
      },
      {
        "title": "Equal",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 5
        },
        "text": "When two numbers are the SAME, use =. 5 = 5.",
        "caption": "5 = 5"
      },
      {
        "title": "Practice on Bigger Numbers",
        "visual": {
          "type": "compare-pair",
          "a": 15,
          "b": 8
        },
        "text": "Even with bigger numbers, the alligator eats the bigger one!",
        "caption": "Same rule!"
      }
    ],
    "practice": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 4,
          "b": 5
        },
        "prompt": "Compare four and five.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "4 is smaller than 5."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 20,
          "b": 3
        },
        "prompt": "Compare twenty and three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "20 is bigger than 3."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 16,
          "b": 17
        },
        "prompt": "Compare sixteen and seventeen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "16 is smaller than 17."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 12,
          "b": 20
        },
        "prompt": "Compare twelve and twenty.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "12 is smaller than 20."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 17,
          "b": 2
        },
        "prompt": "Compare seventeen and two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "17 is bigger than 2."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 2,
          "b": 17
        },
        "prompt": "Compare two and seventeen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "2 is smaller than 17."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 18,
          "b": 14
        },
        "prompt": "Compare eighteen and fourteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "18 is bigger than 14."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 1,
          "b": 3
        },
        "prompt": "Compare one and three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "1 is smaller than 3."
      }
    ],
    "quiz": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 19
        },
        "prompt": "Compare three and nineteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 16,
          "b": 12
        },
        "prompt": "Compare sixteen and twelve.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 4,
          "b": 17
        },
        "prompt": "Compare four and seventeen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 15,
          "b": 12
        },
        "prompt": "Compare fifteen and twelve.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 0,
          "b": 15
        },
        "prompt": "Compare zero and fifteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 6,
          "b": 17
        },
        "prompt": "Compare six and seventeen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 0,
          "b": 3
        },
        "prompt": "Compare zero and three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 0,
          "b": 3
        },
        "prompt": "Compare zero and three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 14,
          "b": 11
        },
        "prompt": "Compare fourteen and eleven.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 19,
          "b": 15
        },
        "prompt": "Compare nineteen and fifteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      }
    ]
  },
  {
    "id": "compare-50",
    "title": "Compare within 50",
    "emoji": "⚖️",
    "category": "E",
    "description": "Compare numbers up to 50 using >, <, =.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Compare to 50",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 5
        },
        "text": "When we compare two numbers, we say which is BIGGER, SMALLER, or EQUAL.",
        "caption": "3 vs 5"
      },
      {
        "title": "The Alligator",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 3
        },
        "text": "The > sign is the alligator mouth — it always wants to eat the BIGGER number!",
        "caption": "7 > 3"
      },
      {
        "title": "Less Than",
        "visual": {
          "type": "compare-pair",
          "a": 2,
          "b": 8
        },
        "text": "The < sign points to the SMALLER number. 2 < 8.",
        "caption": "2 < 8"
      },
      {
        "title": "Equal",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 5
        },
        "text": "When two numbers are the SAME, use =. 5 = 5.",
        "caption": "5 = 5"
      },
      {
        "title": "Practice on Bigger Numbers",
        "visual": {
          "type": "compare-pair",
          "a": 15,
          "b": 8
        },
        "text": "Even with bigger numbers, the alligator eats the bigger one!",
        "caption": "Same rule!"
      },
      {
        "title": "Use Place Value",
        "visual": {
          "type": "compare-pair",
          "a": 47,
          "b": 52
        },
        "text": "For two-digit numbers, check the TENS digit first. 4 tens vs 5 tens — five wins!",
        "caption": "Check tens first"
      }
    ],
    "practice": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 31,
          "b": 15
        },
        "prompt": "Compare thirty-one and fifteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "31 is bigger than 15."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 2,
          "b": 37
        },
        "prompt": "Compare two and thirty-seven.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "2 is smaller than 37."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 30,
          "b": 26
        },
        "prompt": "Compare thirty and twenty-six.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "30 is bigger than 26."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 20,
          "b": 4
        },
        "prompt": "Compare twenty and four.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "20 is bigger than 4."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 12,
          "b": 9
        },
        "prompt": "Compare twelve and nine.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "12 is bigger than 9."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 12,
          "b": 50
        },
        "prompt": "Compare twelve and fifty.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "12 is smaller than 50."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 26,
          "b": 31
        },
        "prompt": "Compare twenty-six and thirty-one.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "26 is smaller than 31."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 25,
          "b": 9
        },
        "prompt": "Compare twenty-five and nine.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "25 is bigger than 9."
      }
    ],
    "quiz": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 20,
          "b": 37
        },
        "prompt": "Compare twenty and thirty-seven.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 13
        },
        "prompt": "Compare three and thirteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 9,
          "b": 42
        },
        "prompt": "Compare nine and forty-two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 48,
          "b": 18
        },
        "prompt": "Compare forty-eight and eighteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 13
        },
        "prompt": "Compare seven and thirteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 10
        },
        "prompt": "Compare five and ten.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 32
        },
        "prompt": "Compare seven and thirty-two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 35,
          "b": 45
        },
        "prompt": "Compare thirty-five and forty-five.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 19,
          "b": 9
        },
        "prompt": "Compare nineteen and nine.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 2,
          "b": 26
        },
        "prompt": "Compare two and twenty-six.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      }
    ]
  },
  {
    "id": "compare-100",
    "title": "Compare within 100",
    "emoji": "⚖️",
    "category": "E",
    "description": "Compare numbers up to 100 using >, <, =.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Compare to 100",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 5
        },
        "text": "When we compare two numbers, we say which is BIGGER, SMALLER, or EQUAL.",
        "caption": "3 vs 5"
      },
      {
        "title": "The Alligator",
        "visual": {
          "type": "compare-pair",
          "a": 7,
          "b": 3
        },
        "text": "The > sign is the alligator mouth — it always wants to eat the BIGGER number!",
        "caption": "7 > 3"
      },
      {
        "title": "Less Than",
        "visual": {
          "type": "compare-pair",
          "a": 2,
          "b": 8
        },
        "text": "The < sign points to the SMALLER number. 2 < 8.",
        "caption": "2 < 8"
      },
      {
        "title": "Equal",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 5
        },
        "text": "When two numbers are the SAME, use =. 5 = 5.",
        "caption": "5 = 5"
      },
      {
        "title": "Practice on Bigger Numbers",
        "visual": {
          "type": "compare-pair",
          "a": 15,
          "b": 8
        },
        "text": "Even with bigger numbers, the alligator eats the bigger one!",
        "caption": "Same rule!"
      },
      {
        "title": "Use Place Value",
        "visual": {
          "type": "compare-pair",
          "a": 47,
          "b": 52
        },
        "text": "For two-digit numbers, check the TENS digit first. 4 tens vs 5 tens — five wins!",
        "caption": "Check tens first"
      }
    ],
    "practice": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 18,
          "b": 74
        },
        "prompt": "Compare eighteen and seventy-four.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "18 is smaller than 74."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 31,
          "b": 16
        },
        "prompt": "Compare thirty-one and sixteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "31 is bigger than 16."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 30,
          "b": 36
        },
        "prompt": "Compare thirty and thirty-six.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "30 is smaller than 36."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 11,
          "b": 65
        },
        "prompt": "Compare eleven and sixty-five.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "11 is smaller than 65."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 30,
          "b": 75
        },
        "prompt": "Compare thirty and seventy-five.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "30 is smaller than 75."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 85,
          "b": 73
        },
        "prompt": "Compare eighty-five and seventy-three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "85 is bigger than 73."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 74,
          "b": 23
        },
        "prompt": "Compare seventy-four and twenty-three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0,
        "hint": "74 is bigger than 23."
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 9,
          "b": 41
        },
        "prompt": "Compare nine and forty-one.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1,
        "hint": "9 is smaller than 41."
      }
    ],
    "quiz": [
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 3,
          "b": 97
        },
        "prompt": "Compare three and ninety-seven.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 45,
          "b": 92
        },
        "prompt": "Compare forty-five and ninety-two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 93,
          "b": 38
        },
        "prompt": "Compare ninety-three and thirty-eight.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 51,
          "b": 99
        },
        "prompt": "Compare fifty-one and ninety-nine.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 32,
          "b": 23
        },
        "prompt": "Compare thirty-two and twenty-three.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 97,
          "b": 18
        },
        "prompt": "Compare ninety-seven and eighteen.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 58,
          "b": 48
        },
        "prompt": "Compare fifty-eight and forty-eight.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 84,
          "b": 99
        },
        "prompt": "Compare eighty-four and ninety-nine.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 31,
          "b": 32
        },
        "prompt": "Compare thirty-one and thirty-two.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "compare-pair",
          "a": 49,
          "b": 50
        },
        "prompt": "Compare forty-nine and fifty.",
        "choices": [
          ">",
          "<",
          "="
        ],
        "answerIndex": 1
      }
    ]
  },
  {
    "id": "skip-by-2",
    "title": "Skip Count by 2",
    "emoji": "👣",
    "category": "A",
    "description": "Count by 2s up to 30.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Skip Count by 2s",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8,
            10
          ],
          "missingIndex": -1
        },
        "text": "Skip counting by 2 means jumping 2 numbers each time.",
        "caption": "+2 each step"
      },
      {
        "title": "Picture the Hops",
        "visual": {
          "type": "numberline",
          "from": 0,
          "to": 20,
          "mark": 4
        },
        "text": "On the number line, each hop is 2 steps.",
        "caption": "Hop by 2"
      },
      {
        "title": "Practice the Pattern",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8,
            10,
            12
          ],
          "missingIndex": 3
        },
        "text": "Find the missing number. Add 2 to the one before.",
        "caption": "Add 2"
      },
      {
        "title": "Real World",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 2,
          "emoji": "🍒"
        },
        "text": "Skip counting by 2s is like counting pairs of socks.",
        "caption": "Counting in groups of 2"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8,
            10,
            12,
            14
          ],
          "missingIndex": -1
        },
        "text": "Memorize the 2s up to 30. You can use this to count fast!",
        "caption": "Memorize 2s"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 6,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8,
            10
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 6,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            4,
            6,
            8,
            10,
            12
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 8,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            8,
            10,
            12,
            14
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 10,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            8,
            10,
            12,
            14,
            16
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 12,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            12,
            14,
            16,
            18
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 14,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            12,
            14,
            16,
            18,
            20
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 16,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            14,
            16,
            18,
            20,
            22
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 18,
        "hint": "Add 2 to the one before, or subtract 2 from the one after."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8,
            10
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            24,
            26,
            28,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 28
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8,
            10
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            12,
            14,
            16,
            18,
            20
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            12,
            14,
            16,
            18,
            20
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            6,
            8
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            16,
            18,
            20,
            22,
            24
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            8,
            10,
            12,
            14,
            16
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            16,
            18,
            20,
            22,
            24
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 20
      }
    ]
  },
  {
    "id": "skip-by-3",
    "title": "Skip Count by 3",
    "emoji": "🔟",
    "category": "A",
    "description": "Count by 3s up to 30.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Skip Count by 3s",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            9,
            12,
            15
          ],
          "missingIndex": -1
        },
        "text": "Skip counting by 3 means jumping 3 numbers each time.",
        "caption": "+3 each step"
      },
      {
        "title": "Picture the Hops",
        "visual": {
          "type": "numberline",
          "from": 0,
          "to": 20,
          "mark": 6
        },
        "text": "On the number line, each hop is 3 steps.",
        "caption": "Hop by 3"
      },
      {
        "title": "Practice the Pattern",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            9,
            12,
            15,
            18
          ],
          "missingIndex": 3
        },
        "text": "Find the missing number. Add 3 to the one before.",
        "caption": "Add 3"
      },
      {
        "title": "Real World",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍐"
        },
        "text": "Skip counting helps us count groups quickly.",
        "caption": "Counting in groups of 3"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            9,
            12,
            15,
            18,
            21
          ],
          "missingIndex": -1
        },
        "text": "Memorize the 3s up to 30. You can use this to count fast!",
        "caption": "Memorize 3s"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            9,
            12
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 9,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            9,
            12,
            15
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 9,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            9,
            12,
            15,
            18
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 12,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            9,
            12,
            15,
            18,
            21
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 15,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            12,
            15,
            18,
            21,
            24
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 18,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            15,
            18,
            21,
            24,
            27
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 21,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            18,
            21,
            24,
            27,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 24,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            21,
            24,
            27,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 27,
        "hint": "Add 3 to the one before, or subtract 3 from the one after."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            15,
            18,
            21,
            24,
            27
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 21
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            18,
            21,
            24,
            27,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 24
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            18,
            21,
            24,
            27,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 24
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            9,
            12
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            9,
            12,
            15,
            18
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            9,
            12,
            15,
            18
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            18,
            21,
            24,
            27,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 24
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            12,
            15,
            18,
            21,
            24
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 18
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            9,
            12,
            15,
            18
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            9,
            12,
            15
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 9
      }
    ]
  },
  {
    "id": "skip-by-5",
    "title": "Skip Count by 5",
    "emoji": "✋",
    "category": "A",
    "description": "Count by 5s up to 50.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Skip Count by 5s",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            10,
            15,
            20,
            25
          ],
          "missingIndex": -1
        },
        "text": "Skip counting by 5 means jumping 5 numbers each time.",
        "caption": "+5 each step"
      },
      {
        "title": "Picture the Hops",
        "visual": {
          "type": "numberline",
          "from": 0,
          "to": 20,
          "mark": 10
        },
        "text": "On the number line, each hop is 5 steps.",
        "caption": "Hop by 5"
      },
      {
        "title": "Practice the Pattern",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            10,
            15,
            20,
            25,
            30
          ],
          "missingIndex": 3
        },
        "text": "Find the missing number. Add 5 to the one before.",
        "caption": "Add 5"
      },
      {
        "title": "Real World",
        "visual": {
          "type": "add-groups",
          "a": 5,
          "b": 5,
          "emoji": "🐨"
        },
        "text": "Skip counting by 5s is like counting nickels.",
        "caption": "Counting in groups of 5"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            10,
            15,
            20,
            25,
            30,
            35
          ],
          "missingIndex": -1
        },
        "text": "Memorize the 5s up to 50. You can use this to count fast!",
        "caption": "Memorize 5s"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            10,
            15,
            20
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 15,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            10,
            15,
            20,
            25
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 15,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            15,
            20,
            25,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 20,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            15,
            20,
            25,
            30,
            35
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 25,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            20,
            25,
            30,
            35,
            40
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 30,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            25,
            30,
            35,
            40,
            45
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 35,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            30,
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 40,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 45,
        "hint": "Add 5 to the one before, or subtract 5 from the one after."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 45
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            20,
            25,
            30,
            35,
            40
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 30
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            25,
            30,
            35,
            40,
            45
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 35
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            15,
            20,
            25,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 45
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            15,
            20,
            25,
            30
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 45
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 45
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            30,
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 40
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            30,
            35,
            40,
            45,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 40
      }
    ]
  },
  {
    "id": "skip-by-10",
    "title": "Skip Count by 10",
    "emoji": "🔟",
    "category": "A",
    "description": "Count by 10s up to 120.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Skip Count by 10s",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            20,
            30,
            40,
            50
          ],
          "missingIndex": -1
        },
        "text": "Skip counting by 10 means jumping 10 numbers each time.",
        "caption": "+10 each step"
      },
      {
        "title": "Picture the Hops",
        "visual": {
          "type": "numberline",
          "from": 0,
          "to": 20,
          "mark": 20
        },
        "text": "On the number line, each hop is 10 steps.",
        "caption": "Hop by 10"
      },
      {
        "title": "Practice the Pattern",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            20,
            30,
            40,
            50,
            60
          ],
          "missingIndex": 3
        },
        "text": "Find the missing number. Add 10 to the one before.",
        "caption": "Add 10"
      },
      {
        "title": "Real World",
        "visual": {
          "type": "add-groups",
          "a": 10,
          "b": 10,
          "emoji": "🐝"
        },
        "text": "Skip counting by 10s is like counting dimes — or fingers across both hands!",
        "caption": "Counting in groups of 10"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            20,
            30,
            40,
            50,
            60,
            70
          ],
          "missingIndex": -1
        },
        "text": "Memorize the 10s up to 120. You can use this to count fast!",
        "caption": "Memorize 10s"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            20,
            30,
            40
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 30,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            20,
            30,
            40,
            50
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 30,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            20,
            30,
            40,
            50,
            60
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 40,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            30,
            40,
            50,
            60,
            70
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 50,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            40,
            50,
            60,
            70,
            80
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 60,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            50,
            60,
            70,
            80,
            90
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 70,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            60,
            70,
            80,
            90,
            100
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 80,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            70,
            80,
            90,
            100,
            110
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 90,
        "hint": "Add 10 to the one before, or subtract 10 from the one after."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            60,
            70,
            80,
            90,
            100
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 80
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            20,
            30,
            40
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 30
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            80,
            90,
            100,
            110,
            120
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 100
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            70,
            80,
            90,
            100,
            110
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 90
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            60,
            70,
            80,
            90,
            100
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 80
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            70,
            80,
            90,
            100,
            110
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 90
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            50,
            60,
            70,
            80,
            90
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 70
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            10,
            20,
            30,
            40
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 30
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            80,
            90,
            100,
            110,
            120
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 100
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            20,
            30,
            40,
            50,
            60
          ],
          "missingIndex": 2
        },
        "prompt": "What is the missing number?",
        "answer": 40
      }
    ]
  },
  {
    "id": "count-to-10",
    "title": "Counting to 10",
    "emoji": "🔢",
    "category": "A",
    "description": "Count from 1 to 10.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Counting 1 to 10",
        "visual": {
          "type": "bignum",
          "n": 10
        },
        "text": "Today we count from 1 to 10!",
        "caption": "1 → 10"
      },
      {
        "title": "Start at the Start",
        "visual": {
          "type": "numberline",
          "from": 1,
          "to": 10,
          "mark": 1
        },
        "text": "We begin at 1.",
        "caption": "Start = 1"
      },
      {
        "title": "Each Step is +1",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            2,
            3,
            4,
            5
          ],
          "missingIndex": -1
        },
        "text": "After 1 comes 2, then 3…",
        "caption": "+1 each step"
      },
      {
        "title": "Big Numbers Count Too",
        "visual": {
          "type": "bignum",
          "n": 5
        },
        "text": "In the middle: 5!",
        "caption": "Middle = 5"
      },
      {
        "title": "Reach 10",
        "visual": {
          "type": "bignum",
          "n": 10
        },
        "text": "Keep counting until you reach 10.",
        "caption": "Goal: 10"
      },
      {
        "title": "Use Tens for Big Numbers",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 0
        },
        "text": "Big numbers like 10 are made of tens and ones. Count tens first!",
        "caption": "10 = tens + ones"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 1
        },
        "prompt": "What number comes after one?",
        "answer": 2,
        "hint": "After 1 comes 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "prompt": "What number comes after eight?",
        "answer": 9,
        "hint": "After 8 comes 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "prompt": "What number comes after eight?",
        "answer": 9,
        "hint": "After 8 comes 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 5
        },
        "prompt": "What number comes after five?",
        "answer": 6,
        "hint": "After 5 comes 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 2
        },
        "prompt": "What number comes after two?",
        "answer": 3,
        "hint": "After 2 comes 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 4
        },
        "prompt": "What number comes after four?",
        "answer": 5,
        "hint": "After 4 comes 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 6
        },
        "prompt": "What number comes after six?",
        "answer": 7,
        "hint": "After 6 comes 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 9
        },
        "prompt": "What number comes after nine?",
        "answer": 10,
        "hint": "After 9 comes 10."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 4
        },
        "prompt": "What number comes after four?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 6
        },
        "prompt": "What number comes after six?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 6
        },
        "prompt": "What number comes after six?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "prompt": "What number comes after eight?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 9
        },
        "prompt": "What number comes after nine?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 2
        },
        "prompt": "What number comes after two?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 6
        },
        "prompt": "What number comes after six?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "prompt": "What number comes after eight?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 7
        },
        "prompt": "What number comes after seven?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 1
        },
        "prompt": "What number comes after one?",
        "answer": 2
      }
    ]
  },
  {
    "id": "count-to-20",
    "title": "Counting to 20",
    "emoji": "🔢",
    "category": "A",
    "description": "Count from 11 to 20.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Counting 11 to 20",
        "visual": {
          "type": "bignum",
          "n": 20
        },
        "text": "Today we count from 11 to 20!",
        "caption": "11 → 20"
      },
      {
        "title": "Start at the Start",
        "visual": {
          "type": "numberline",
          "from": 11,
          "to": 20,
          "mark": 11
        },
        "text": "We begin at 11.",
        "caption": "Start = 11"
      },
      {
        "title": "Each Step is +1",
        "visual": {
          "type": "sequence",
          "nums": [
            11,
            12,
            13,
            14,
            15
          ],
          "missingIndex": -1
        },
        "text": "After 11 comes 12, then 13…",
        "caption": "+1 each step"
      },
      {
        "title": "Big Numbers Count Too",
        "visual": {
          "type": "bignum",
          "n": 15
        },
        "text": "In the middle: 15!",
        "caption": "Middle = 15"
      },
      {
        "title": "Reach 20",
        "visual": {
          "type": "bignum",
          "n": 20
        },
        "text": "Keep counting until you reach 20.",
        "caption": "Goal: 20"
      },
      {
        "title": "Use Tens for Big Numbers",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 0
        },
        "text": "Big numbers like 20 are made of tens and ones. Count tens first!",
        "caption": "20 = tens + ones"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 13
        },
        "prompt": "What number comes after thirteen?",
        "answer": 14,
        "hint": "After 13 comes 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 13
        },
        "prompt": "What number comes after thirteen?",
        "answer": 14,
        "hint": "After 13 comes 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 13
        },
        "prompt": "What number comes after thirteen?",
        "answer": 14,
        "hint": "After 13 comes 14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 15
        },
        "prompt": "What number comes after fifteen?",
        "answer": 16,
        "hint": "After 15 comes 16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 17
        },
        "prompt": "What number comes after seventeen?",
        "answer": 18,
        "hint": "After 17 comes 18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 17
        },
        "prompt": "What number comes after seventeen?",
        "answer": 18,
        "hint": "After 17 comes 18."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 14
        },
        "prompt": "What number comes after fourteen?",
        "answer": 15,
        "hint": "After 14 comes 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 18
        },
        "prompt": "What number comes after eighteen?",
        "answer": 19,
        "hint": "After 18 comes 19."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 12
        },
        "prompt": "What number comes after twelve?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 19
        },
        "prompt": "What number comes after nineteen?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 13
        },
        "prompt": "What number comes after thirteen?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 18
        },
        "prompt": "What number comes after eighteen?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 11
        },
        "prompt": "What number comes after eleven?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 14
        },
        "prompt": "What number comes after fourteen?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 11
        },
        "prompt": "What number comes after eleven?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 11
        },
        "prompt": "What number comes after eleven?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 18
        },
        "prompt": "What number comes after eighteen?",
        "answer": 19
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 15
        },
        "prompt": "What number comes after fifteen?",
        "answer": 16
      }
    ]
  },
  {
    "id": "count-to-50",
    "title": "Counting to 50",
    "emoji": "🔢",
    "category": "A",
    "description": "Count from 21 to 50.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Counting 21 to 50",
        "visual": {
          "type": "bignum",
          "n": 50
        },
        "text": "Today we count from 21 to 50!",
        "caption": "21 → 50"
      },
      {
        "title": "Start at the Start",
        "visual": {
          "type": "numberline",
          "from": 21,
          "to": 31,
          "mark": 21
        },
        "text": "We begin at 21.",
        "caption": "Start = 21"
      },
      {
        "title": "Each Step is +1",
        "visual": {
          "type": "sequence",
          "nums": [
            21,
            22,
            23,
            24,
            25
          ],
          "missingIndex": -1
        },
        "text": "After 21 comes 22, then 23…",
        "caption": "+1 each step"
      },
      {
        "title": "Big Numbers Count Too",
        "visual": {
          "type": "bignum",
          "n": 35
        },
        "text": "In the middle: 35!",
        "caption": "Middle = 35"
      },
      {
        "title": "Reach 50",
        "visual": {
          "type": "bignum",
          "n": 50
        },
        "text": "Keep counting until you reach 50.",
        "caption": "Goal: 50"
      },
      {
        "title": "Use Tens for Big Numbers",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 0
        },
        "text": "Big numbers like 50 are made of tens and ones. Count tens first!",
        "caption": "50 = tens + ones"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 36
        },
        "prompt": "What number comes after thirty-six?",
        "answer": 37,
        "hint": "After 36 comes 37."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 28
        },
        "prompt": "What number comes after twenty-eight?",
        "answer": 29,
        "hint": "After 28 comes 29."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 29
        },
        "prompt": "What number comes after twenty-nine?",
        "answer": 30,
        "hint": "After 29 comes 30."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 40
        },
        "prompt": "What number comes after forty?",
        "answer": 41,
        "hint": "After 40 comes 41."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 25
        },
        "prompt": "What number comes after twenty-five?",
        "answer": 26,
        "hint": "After 25 comes 26."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 23
        },
        "prompt": "What number comes after twenty-three?",
        "answer": 24,
        "hint": "After 23 comes 24."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 48
        },
        "prompt": "What number comes after forty-eight?",
        "answer": 49,
        "hint": "After 48 comes 49."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 22
        },
        "prompt": "What number comes after twenty-two?",
        "answer": 23,
        "hint": "After 22 comes 23."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 31
        },
        "prompt": "What number comes after thirty-one?",
        "answer": 32
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 22
        },
        "prompt": "What number comes after twenty-two?",
        "answer": 23
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 25
        },
        "prompt": "What number comes after twenty-five?",
        "answer": 26
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 45
        },
        "prompt": "What number comes after forty-five?",
        "answer": 46
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 24
        },
        "prompt": "What number comes after twenty-four?",
        "answer": 25
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 23
        },
        "prompt": "What number comes after twenty-three?",
        "answer": 24
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 24
        },
        "prompt": "What number comes after twenty-four?",
        "answer": 25
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 47
        },
        "prompt": "What number comes after forty-seven?",
        "answer": 48
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 30
        },
        "prompt": "What number comes after thirty?",
        "answer": 31
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 22
        },
        "prompt": "What number comes after twenty-two?",
        "answer": 23
      }
    ]
  },
  {
    "id": "count-to-100",
    "title": "Counting to 100",
    "emoji": "🔢",
    "category": "A",
    "description": "Count from 51 to 100.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Counting 51 to 100",
        "visual": {
          "type": "bignum",
          "n": 100
        },
        "text": "Today we count from 51 to 100!",
        "caption": "51 → 100"
      },
      {
        "title": "Start at the Start",
        "visual": {
          "type": "numberline",
          "from": 51,
          "to": 61,
          "mark": 51
        },
        "text": "We begin at 51.",
        "caption": "Start = 51"
      },
      {
        "title": "Each Step is +1",
        "visual": {
          "type": "sequence",
          "nums": [
            51,
            52,
            53,
            54,
            55
          ],
          "missingIndex": -1
        },
        "text": "After 51 comes 52, then 53…",
        "caption": "+1 each step"
      },
      {
        "title": "Big Numbers Count Too",
        "visual": {
          "type": "bignum",
          "n": 75
        },
        "text": "In the middle: 75!",
        "caption": "Middle = 75"
      },
      {
        "title": "Reach 100",
        "visual": {
          "type": "bignum",
          "n": 100
        },
        "text": "Keep counting until you reach 100.",
        "caption": "Goal: 100"
      },
      {
        "title": "Use Tens for Big Numbers",
        "visual": {
          "type": "blocks",
          "tens": 10,
          "ones": 0
        },
        "text": "Big numbers like 100 are made of tens and ones. Count tens first!",
        "caption": "100 = tens + ones"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 60
        },
        "prompt": "What number comes after sixty?",
        "answer": 61,
        "hint": "After 60 comes 61."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 88
        },
        "prompt": "What number comes after eighty-eight?",
        "answer": 89,
        "hint": "After 88 comes 89."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 60
        },
        "prompt": "What number comes after sixty?",
        "answer": 61,
        "hint": "After 60 comes 61."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 96
        },
        "prompt": "What number comes after ninety-six?",
        "answer": 97,
        "hint": "After 96 comes 97."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 52
        },
        "prompt": "What number comes after fifty-two?",
        "answer": 53,
        "hint": "After 52 comes 53."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 88
        },
        "prompt": "What number comes after eighty-eight?",
        "answer": 89,
        "hint": "After 88 comes 89."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 96
        },
        "prompt": "What number comes after ninety-six?",
        "answer": 97,
        "hint": "After 96 comes 97."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 66
        },
        "prompt": "What number comes after sixty-six?",
        "answer": 67,
        "hint": "After 66 comes 67."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 52
        },
        "prompt": "What number comes after fifty-two?",
        "answer": 53
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 73
        },
        "prompt": "What number comes after seventy-three?",
        "answer": 74
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 97
        },
        "prompt": "What number comes after ninety-seven?",
        "answer": 98
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 76
        },
        "prompt": "What number comes after seventy-six?",
        "answer": 77
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 67
        },
        "prompt": "What number comes after sixty-seven?",
        "answer": 68
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 99
        },
        "prompt": "What number comes after ninety-nine?",
        "answer": 100
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 80
        },
        "prompt": "What number comes after eighty?",
        "answer": 81
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 93
        },
        "prompt": "What number comes after ninety-three?",
        "answer": 94
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 66
        },
        "prompt": "What number comes after sixty-six?",
        "answer": 67
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 75
        },
        "prompt": "What number comes after seventy-five?",
        "answer": 76
      }
    ]
  },
  {
    "id": "count-to-120",
    "title": "Counting to 120",
    "emoji": "🔢",
    "category": "A",
    "description": "Count from 101 to 120.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Counting 101 to 120",
        "visual": {
          "type": "bignum",
          "n": 120
        },
        "text": "Today we count from 101 to 120!",
        "caption": "101 → 120"
      },
      {
        "title": "Start at the Start",
        "visual": {
          "type": "numberline",
          "from": 101,
          "to": 111,
          "mark": 101
        },
        "text": "We begin at 101.",
        "caption": "Start = 101"
      },
      {
        "title": "Each Step is +1",
        "visual": {
          "type": "sequence",
          "nums": [
            101,
            102,
            103,
            104,
            105
          ],
          "missingIndex": -1
        },
        "text": "After 101 comes 102, then 103…",
        "caption": "+1 each step"
      },
      {
        "title": "Big Numbers Count Too",
        "visual": {
          "type": "bignum",
          "n": 110
        },
        "text": "In the middle: 110!",
        "caption": "Middle = 110"
      },
      {
        "title": "Reach 120",
        "visual": {
          "type": "bignum",
          "n": 120
        },
        "text": "Keep counting until you reach 120.",
        "caption": "Goal: 120"
      },
      {
        "title": "Use Tens for Big Numbers",
        "visual": {
          "type": "blocks",
          "tens": 12,
          "ones": 0
        },
        "text": "Big numbers like 120 are made of tens and ones. Count tens first!",
        "caption": "120 = tens + ones"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 117
        },
        "prompt": "What number comes after 117?",
        "answer": 118,
        "hint": "After 117 comes 118."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 103
        },
        "prompt": "What number comes after 103?",
        "answer": 104,
        "hint": "After 103 comes 104."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 117
        },
        "prompt": "What number comes after 117?",
        "answer": 118,
        "hint": "After 117 comes 118."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 102
        },
        "prompt": "What number comes after 102?",
        "answer": 103,
        "hint": "After 102 comes 103."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 109
        },
        "prompt": "What number comes after 109?",
        "answer": 110,
        "hint": "After 109 comes 110."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 108
        },
        "prompt": "What number comes after 108?",
        "answer": 109,
        "hint": "After 108 comes 109."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 119
        },
        "prompt": "What number comes after 119?",
        "answer": 120,
        "hint": "After 119 comes 120."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 102
        },
        "prompt": "What number comes after 102?",
        "answer": 103,
        "hint": "After 102 comes 103."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 104
        },
        "prompt": "What number comes after 104?",
        "answer": 105
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 119
        },
        "prompt": "What number comes after 119?",
        "answer": 120
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 115
        },
        "prompt": "What number comes after 115?",
        "answer": 116
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 109
        },
        "prompt": "What number comes after 109?",
        "answer": 110
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 102
        },
        "prompt": "What number comes after 102?",
        "answer": 103
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 105
        },
        "prompt": "What number comes after 105?",
        "answer": 106
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 109
        },
        "prompt": "What number comes after 109?",
        "answer": 110
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 116
        },
        "prompt": "What number comes after 116?",
        "answer": 117
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 103
        },
        "prompt": "What number comes after 103?",
        "answer": 104
      },
      {
        "type": "numeric",
        "visual": {
          "type": "bignum",
          "n": 116
        },
        "prompt": "What number comes after 116?",
        "answer": 117
      }
    ]
  },
  {
    "id": "make10-8-3",
    "title": "Make 10: 8 + 3",
    "emoji": "🎯",
    "category": "B",
    "description": "Use the make-10 strategy: 8 + 3 = 11.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Make 10 First",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 8,
          "filledB": 3
        },
        "text": "For 8 + 3, the trick is to MAKE 10 first.",
        "caption": "8 + 3 = ?"
      },
      {
        "title": "Move 1 or 2 Over",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 1
        },
        "text": "Take 2 from the 3 and add it to the 8. Now you have 10 + 1.",
        "caption": "10 + 1"
      },
      {
        "title": "Add the Leftover",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 1
        },
        "text": "10 + 1 is easy: just put the leftover after the 10. Answer: 11!",
        "caption": "10 + 1 = 11"
      },
      {
        "title": "So 8+3=11",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "text": "Make 10 from 8, add the 1 left = 11.",
        "caption": "8 + 3 = 11"
      },
      {
        "title": "Try Another",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 2
        },
        "text": "For 9 + 3: take 1 from 3 to make 10. Now 10 + 2 = 12.",
        "caption": "9 + 3 = 12"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 4
        },
        "prompt": "Nine plus four?",
        "answer": 13,
        "hint": "Make 10: 9+1=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 3
        },
        "prompt": "Eight plus three?",
        "answer": 11,
        "hint": "Make 10: 8+2=10, then 10+1=11."
      }
    ]
  },
  {
    "id": "make10-8-4",
    "title": "Make 10: 8 + 4",
    "emoji": "🎯",
    "category": "B",
    "description": "Use the make-10 strategy: 8 + 4 = 12.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Make 10 First",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 8,
          "filledB": 4
        },
        "text": "For 8 + 4, the trick is to MAKE 10 first.",
        "caption": "8 + 4 = ?"
      },
      {
        "title": "Move 1 or 2 Over",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 2
        },
        "text": "Take 2 from the 4 and add it to the 8. Now you have 10 + 2.",
        "caption": "10 + 2"
      },
      {
        "title": "Add the Leftover",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 2
        },
        "text": "10 + 2 is easy: just put the leftover after the 10. Answer: 12!",
        "caption": "10 + 2 = 12"
      },
      {
        "title": "So 8+4=12",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "text": "Make 10 from 8, add the 2 left = 12.",
        "caption": "8 + 4 = 12"
      },
      {
        "title": "Try Another",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 2
        },
        "text": "For 9 + 3: take 1 from 3 to make 10. Now 10 + 2 = 12.",
        "caption": "9 + 3 = 12"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 5
        },
        "prompt": "Nine plus five?",
        "answer": 14,
        "hint": "Make 10: 9+1=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 4
        },
        "prompt": "Eight plus four?",
        "answer": 12,
        "hint": "Make 10: 8+2=10, then 10+2=12."
      }
    ]
  },
  {
    "id": "make10-8-5",
    "title": "Make 10: 8 + 5",
    "emoji": "🎯",
    "category": "B",
    "description": "Use the make-10 strategy: 8 + 5 = 13.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Make 10 First",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 8,
          "filledB": 5
        },
        "text": "For 8 + 5, the trick is to MAKE 10 first.",
        "caption": "8 + 5 = ?"
      },
      {
        "title": "Move 1 or 2 Over",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 3
        },
        "text": "Take 2 from the 5 and add it to the 8. Now you have 10 + 3.",
        "caption": "10 + 3"
      },
      {
        "title": "Add the Leftover",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 3
        },
        "text": "10 + 3 is easy: just put the leftover after the 10. Answer: 13!",
        "caption": "10 + 3 = 13"
      },
      {
        "title": "So 8+5=13",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "text": "Make 10 from 8, add the 3 left = 13.",
        "caption": "8 + 5 = 13"
      },
      {
        "title": "Try Another",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 2
        },
        "text": "For 9 + 3: take 1 from 3 to make 10. Now 10 + 2 = 12.",
        "caption": "9 + 3 = 12"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 6
        },
        "prompt": "Nine plus six?",
        "answer": 15,
        "hint": "Make 10: 9+1=10, then 10+5=15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 5
        },
        "prompt": "Eight plus five?",
        "answer": 13,
        "hint": "Make 10: 8+2=10, then 10+3=13."
      }
    ]
  },
  {
    "id": "make10-8-6",
    "title": "Make 10: 8 + 6",
    "emoji": "🎯",
    "category": "B",
    "description": "Use the make-10 strategy: 8 + 6 = 14.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Make 10 First",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 8,
          "filledB": 6
        },
        "text": "For 8 + 6, the trick is to MAKE 10 first.",
        "caption": "8 + 6 = ?"
      },
      {
        "title": "Move 1 or 2 Over",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 4
        },
        "text": "Take 2 from the 6 and add it to the 8. Now you have 10 + 4.",
        "caption": "10 + 4"
      },
      {
        "title": "Add the Leftover",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 4
        },
        "text": "10 + 4 is easy: just put the leftover after the 10. Answer: 14!",
        "caption": "10 + 4 = 14"
      },
      {
        "title": "So 8+6=14",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "text": "Make 10 from 8, add the 4 left = 14.",
        "caption": "8 + 6 = 14"
      },
      {
        "title": "Try Another",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 2
        },
        "text": "For 9 + 3: take 1 from 3 to make 10. Now 10 + 2 = 12.",
        "caption": "9 + 3 = 12"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 6
        },
        "prompt": "Eight plus six?",
        "answer": 14,
        "hint": "Make 10: 8+2=10, then 10+4=14."
      }
    ]
  },
  {
    "id": "make10-9-7",
    "title": "Make 10: 9 + 7",
    "emoji": "🎯",
    "category": "B",
    "description": "Use the make-10 strategy: 9 + 7 = 16.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Make 10 First",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 9,
          "filledB": 7
        },
        "text": "For 9 + 7, the trick is to MAKE 10 first.",
        "caption": "9 + 7 = ?"
      },
      {
        "title": "Move 1 or 2 Over",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 6
        },
        "text": "Take 1 from the 7 and add it to the 9. Now you have 10 + 6.",
        "caption": "10 + 6"
      },
      {
        "title": "Add the Leftover",
        "visual": {
          "type": "two-digit-add",
          "a": 10,
          "b": 6
        },
        "text": "10 + 6 is easy: just put the leftover after the 10. Answer: 16!",
        "caption": "10 + 6 = 16"
      },
      {
        "title": "So 9+7=16",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "text": "Make 10 from 9, add the 6 left = 16.",
        "caption": "9 + 7 = 16"
      },
      {
        "title": "Try Another",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 2
        },
        "text": "For 9 + 3: take 1 from 3 to make 10. Now 10 + 2 = 12.",
        "caption": "9 + 3 = 12"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 8
        },
        "prompt": "Nine plus eight?",
        "answer": 17,
        "hint": "Make 10: 9+1=10, then 10+7=17."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 7
        },
        "prompt": "Nine plus seven?",
        "answer": 16,
        "hint": "Make 10: 9+1=10, then 10+6=16."
      }
    ]
  },
  {
    "id": "tenframe-3",
    "title": "Ten-Frame: 3 dots",
    "emoji": "🟥",
    "category": "A",
    "description": "Count 3 dots in a ten-frame.",
    "kind": "generic",
    "lesson": [
      {
        "title": "A Ten-Frame Shows 3",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "text": "A ten-frame holds 10 dots. This frame has 3 red dots.",
        "caption": "3 dots"
      },
      {
        "title": "Count the Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "text": "Touch each dot and count: 1, 2, 3!",
        "caption": "Total: 3"
      },
      {
        "title": "Empty Cells Tell You Too",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "text": "There are 7 EMPTY cells. 3 + 7 = 10!",
        "caption": "3 + 7 = 10"
      },
      {
        "title": "Compare Frames",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "text": "One more dot makes 4. Ten-frames make counting fast!",
        "caption": "3+1 = 4"
      },
      {
        "title": "You Can Read It!",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "text": "Read it instantly: 3 dots. The ten-frame is your friend!",
        "caption": "3 ✓"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 0
        },
        "prompt": "How many dots?",
        "answer": 0,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 1
        },
        "prompt": "How many dots?",
        "answer": 1,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 2
        },
        "prompt": "How many dots?",
        "answer": 2,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "prompt": "How many dots?",
        "answer": 3,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "prompt": "How many dots?",
        "answer": 4,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots?",
        "answer": 5,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots?",
        "answer": 6,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots?",
        "answer": 7,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 2
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 1
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 2
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 3
      }
    ]
  },
  {
    "id": "tenframe-5",
    "title": "Ten-Frame: 5 dots",
    "emoji": "🟥",
    "category": "A",
    "description": "Count 5 dots in a ten-frame.",
    "kind": "generic",
    "lesson": [
      {
        "title": "A Ten-Frame Shows 5",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "text": "A ten-frame holds 10 dots. This frame has 5 red dots.",
        "caption": "5 dots"
      },
      {
        "title": "Count the Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "text": "Touch each dot and count: 1, 2, 3, 4, 5!",
        "caption": "Total: 5"
      },
      {
        "title": "Empty Cells Tell You Too",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "text": "There are 5 EMPTY cells. 5 + 5 = 10!",
        "caption": "5 + 5 = 10"
      },
      {
        "title": "Compare Frames",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "text": "One more dot makes 6. Ten-frames make counting fast!",
        "caption": "5+1 = 6"
      },
      {
        "title": "You Can Read It!",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "text": "Read it instantly: 5 dots. The ten-frame is your friend!",
        "caption": "5 ✓"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 2
        },
        "prompt": "How many dots?",
        "answer": 2,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "prompt": "How many dots?",
        "answer": 3,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "prompt": "How many dots?",
        "answer": 4,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots?",
        "answer": 5,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots?",
        "answer": 6,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots?",
        "answer": 7,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots?",
        "answer": 8,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots?",
        "answer": 9,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 3
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 5
      }
    ]
  },
  {
    "id": "tenframe-7",
    "title": "Ten-Frame: 7 dots",
    "emoji": "🟥",
    "category": "A",
    "description": "Count 7 dots in a ten-frame.",
    "kind": "generic",
    "lesson": [
      {
        "title": "A Ten-Frame Shows 7",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "text": "A ten-frame holds 10 dots. This frame has 7 red dots.",
        "caption": "7 dots"
      },
      {
        "title": "Count the Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "text": "Touch each dot and count: 1, 2, 3, 4, 5, 6, 7!",
        "caption": "Total: 7"
      },
      {
        "title": "Empty Cells Tell You Too",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "text": "There are 3 EMPTY cells. 7 + 3 = 10!",
        "caption": "7 + 3 = 10"
      },
      {
        "title": "Compare Frames",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "text": "One more dot makes 8. Ten-frames make counting fast!",
        "caption": "7+1 = 8"
      },
      {
        "title": "You Can Read It!",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "text": "Read it instantly: 7 dots. The ten-frame is your friend!",
        "caption": "7 ✓"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 4
        },
        "prompt": "How many dots?",
        "answer": 4,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots?",
        "answer": 5,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots?",
        "answer": 6,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots?",
        "answer": 7,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots?",
        "answer": 8,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots?",
        "answer": 9,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots?",
        "answer": 10,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 5
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 7
      }
    ]
  },
  {
    "id": "tenframe-9",
    "title": "Ten-Frame: 9 dots",
    "emoji": "🟥",
    "category": "A",
    "description": "Count 9 dots in a ten-frame.",
    "kind": "generic",
    "lesson": [
      {
        "title": "A Ten-Frame Shows 9",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "text": "A ten-frame holds 10 dots. This frame has 9 red dots.",
        "caption": "9 dots"
      },
      {
        "title": "Count the Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "text": "Touch each dot and count: 1, 2, 3, 4, 5, 6, 7, 8, 9!",
        "caption": "Total: 9"
      },
      {
        "title": "Empty Cells Tell You Too",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "text": "There are 1 EMPTY cells. 9 + 1 = 10!",
        "caption": "9 + 1 = 10"
      },
      {
        "title": "Compare Frames",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "One more dot makes 10. Ten-frames make counting fast!",
        "caption": "9+1 = 10"
      },
      {
        "title": "You Can Read It!",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "text": "Read it instantly: 9 dots. The ten-frame is your friend!",
        "caption": "9 ✓"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 6
        },
        "prompt": "How many dots?",
        "answer": 6,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots?",
        "answer": 7,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots?",
        "answer": 8,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots?",
        "answer": 9,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots?",
        "answer": 10,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 9
      }
    ]
  },
  {
    "id": "tenframe-10",
    "title": "Ten-Frame: 10 dots",
    "emoji": "🟥",
    "category": "A",
    "description": "Count 10 dots in a ten-frame.",
    "kind": "generic",
    "lesson": [
      {
        "title": "A Ten-Frame Shows 10",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "A ten-frame holds 10 dots. This frame has 10 red dots.",
        "caption": "10 dots"
      },
      {
        "title": "Count the Dots",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "Touch each dot and count: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10!",
        "caption": "Total: 10"
      },
      {
        "title": "Empty Cells Tell You Too",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "There are 0 EMPTY cells. 10 + 0 = 10!",
        "caption": "10 + 0 = 10"
      },
      {
        "title": "Compare Frames",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "One more dot makes 11. Ten-frames make counting fast!",
        "caption": "10+1 = 11"
      },
      {
        "title": "You Can Read It!",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "text": "Read it instantly: 10 dots. The ten-frame is your friend!",
        "caption": "10 ✓"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 7
        },
        "prompt": "How many dots?",
        "answer": 7,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots?",
        "answer": 8,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots?",
        "answer": 9,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots?",
        "answer": 10,
        "hint": "Count one row at a time. Top has up to 5, bottom has up to 5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 8
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 9
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "ten-frame",
          "filled": 10
        },
        "prompt": "How many dots in this ten-frame?",
        "answer": 10
      }
    ]
  },
  {
    "id": "compare-frames",
    "title": "Compare Ten-Frames",
    "emoji": "🟥",
    "category": "E",
    "description": "Which ten-frame has more dots?",
    "kind": "generic",
    "lesson": [
      {
        "title": "Two Frames",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 4,
          "filledB": 7
        },
        "text": "Look at both frames. Which has MORE dots?",
        "caption": "4 vs 7"
      },
      {
        "title": "Count Each",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 4,
          "filledB": 7
        },
        "text": "Left has 4. Right has 7.",
        "caption": "7 > 4"
      },
      {
        "title": "Bigger is More",
        "visual": {
          "type": "compare-pair",
          "a": 4,
          "b": 7
        },
        "text": "7 is bigger than 4. So the right frame has more.",
        "caption": "7 wins!"
      },
      {
        "title": "Try Another",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 9,
          "filledB": 3
        },
        "text": "9 vs 3. Which has more dots? Nine!",
        "caption": "9 > 3"
      },
      {
        "title": "Equal Frames",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 5,
          "filledB": 5
        },
        "text": "When frames look the same, they are EQUAL.",
        "caption": "5 = 5"
      }
    ],
    "practice": [
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 4,
          "filledB": 7
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 1,
        "hint": "Red has 4, green has 7."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 8,
          "filledB": 3
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 0,
        "hint": "Red has 8, green has 3."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 5,
          "filledB": 5
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 2,
        "hint": "Red has 5, green has 5."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 2,
          "filledB": 9
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 1,
        "hint": "Red has 2, green has 9."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 6,
          "filledB": 4
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 0,
        "hint": "Red has 6, green has 4."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 7
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 0,
        "hint": "Red has 10, green has 7."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 3,
          "filledB": 3
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 2,
        "hint": "Red has 3, green has 3."
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 7,
          "filledB": 8
        },
        "prompt": "Which has more dots?",
        "choices": [
          "Red (left)",
          "Green (right)",
          "Same"
        ],
        "answerIndex": 1,
        "hint": "Red has 7, green has 8."
      }
    ],
    "quiz": [
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 2,
          "filledB": 5
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 8,
          "filledB": 4
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 3,
          "filledB": 7
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 9,
          "filledB": 9
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 2
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 6,
          "filledB": 1
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 4,
          "filledB": 8
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 10,
          "filledB": 5
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 2,
          "filledB": 2
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 2
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 7,
          "filledB": 3
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "two-ten-frames",
          "filledA": 5,
          "filledB": 9
        },
        "prompt": "Which has more?",
        "choices": [
          "Red",
          "Green",
          "Same"
        ],
        "answerIndex": 1
      }
    ]
  },
  {
    "id": "build-13",
    "title": "Build 13",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 13 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 13",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "text": "13 = 1 ten-bars + 3 ones.",
        "caption": "1 tens, 3 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "text": "Count the tens: 1. Count the ones: 3. Total: 13.",
        "caption": "10 + 3 = 13"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "text": "The tens digit of 13 is 1.",
        "caption": "Tens = 1"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "text": "The ones digit of 13 is 3.",
        "caption": "Ones = 3"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "text": "You built 13 from blocks!",
        "caption": "13!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13,
        "hint": "1 tens + 3 ones = 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 1,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 3,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13,
        "hint": "13!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 1,
        "hint": "1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 3,
        "hint": "3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13,
        "hint": "1 tens + 3 ones = 13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 1,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 3,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13,
        "hint": "13!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 1,
        "hint": "1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 3,
        "hint": "3."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 1,
          "ones": 3
        },
        "prompt": "What number?",
        "answer": 13
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 13,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 3
      }
    ]
  },
  {
    "id": "build-25",
    "title": "Build 25",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 25 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 25",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "text": "25 = 2 ten-bars + 5 ones.",
        "caption": "2 tens, 5 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "text": "Count the tens: 2. Count the ones: 5. Total: 25.",
        "caption": "20 + 5 = 25"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "text": "The tens digit of 25 is 2.",
        "caption": "Tens = 2"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "text": "The ones digit of 25 is 5.",
        "caption": "Ones = 5"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "text": "You built 25 from blocks!",
        "caption": "25!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25,
        "hint": "2 tens + 5 ones = 25."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 2,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 5,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25,
        "hint": "25!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 2,
        "hint": "2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 5,
        "hint": "5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25,
        "hint": "2 tens + 5 ones = 25."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 2,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 5,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25,
        "hint": "25!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 2,
        "hint": "2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 5,
        "hint": "5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 2,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 25
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 25,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 5
      }
    ]
  },
  {
    "id": "build-38",
    "title": "Build 38",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 38 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 38",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "text": "38 = 3 ten-bars + 8 ones.",
        "caption": "3 tens, 8 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "text": "Count the tens: 3. Count the ones: 8. Total: 38.",
        "caption": "30 + 8 = 38"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "text": "The tens digit of 38 is 3.",
        "caption": "Tens = 3"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "text": "The ones digit of 38 is 8.",
        "caption": "Ones = 8"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "text": "You built 38 from blocks!",
        "caption": "38!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38,
        "hint": "3 tens + 8 ones = 38."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 3,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 8,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38,
        "hint": "38!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 3,
        "hint": "3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 8,
        "hint": "8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38,
        "hint": "3 tens + 8 ones = 38."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 3,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 8,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38,
        "hint": "38!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 3,
        "hint": "3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 8,
        "hint": "8."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 3,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 38
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 38,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 8
      }
    ]
  },
  {
    "id": "build-47",
    "title": "Build 47",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 47 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 47",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "text": "47 = 4 ten-bars + 7 ones.",
        "caption": "4 tens, 7 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "text": "Count the tens: 4. Count the ones: 7. Total: 47.",
        "caption": "40 + 7 = 47"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "text": "The tens digit of 47 is 4.",
        "caption": "Tens = 4"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "text": "The ones digit of 47 is 7.",
        "caption": "Ones = 7"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "text": "You built 47 from blocks!",
        "caption": "47!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47,
        "hint": "4 tens + 7 ones = 47."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 4,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 7,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47,
        "hint": "47!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 4,
        "hint": "4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 7,
        "hint": "7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47,
        "hint": "4 tens + 7 ones = 47."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 4,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 7,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47,
        "hint": "47!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 4,
        "hint": "4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 7,
        "hint": "7."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 4,
          "ones": 7
        },
        "prompt": "What number?",
        "answer": 47
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 47,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 7
      }
    ]
  },
  {
    "id": "build-56",
    "title": "Build 56",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 56 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 56",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "text": "56 = 5 ten-bars + 6 ones.",
        "caption": "5 tens, 6 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "text": "Count the tens: 5. Count the ones: 6. Total: 56.",
        "caption": "50 + 6 = 56"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "text": "The tens digit of 56 is 5.",
        "caption": "Tens = 5"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "text": "The ones digit of 56 is 6.",
        "caption": "Ones = 6"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "text": "You built 56 from blocks!",
        "caption": "56!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56,
        "hint": "5 tens + 6 ones = 56."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 5,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 6,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56,
        "hint": "56!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 5,
        "hint": "5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 6,
        "hint": "6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56,
        "hint": "5 tens + 6 ones = 56."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 5,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 6,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56,
        "hint": "56!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 5,
        "hint": "5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 6,
        "hint": "6."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 5,
          "ones": 6
        },
        "prompt": "What number?",
        "answer": 56
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 56,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 6
      }
    ]
  },
  {
    "id": "build-64",
    "title": "Build 64",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 64 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 64",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "text": "64 = 6 ten-bars + 4 ones.",
        "caption": "6 tens, 4 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "text": "Count the tens: 6. Count the ones: 4. Total: 64.",
        "caption": "60 + 4 = 64"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "text": "The tens digit of 64 is 6.",
        "caption": "Tens = 6"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "text": "The ones digit of 64 is 4.",
        "caption": "Ones = 4"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "text": "You built 64 from blocks!",
        "caption": "64!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64,
        "hint": "6 tens + 4 ones = 64."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 6,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 4,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64,
        "hint": "64!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 6,
        "hint": "6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 4,
        "hint": "4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64,
        "hint": "6 tens + 4 ones = 64."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 6,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 4,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64,
        "hint": "64!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 6,
        "hint": "6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 4,
        "hint": "4."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 6,
          "ones": 4
        },
        "prompt": "What number?",
        "answer": 64
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 64,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 4
      }
    ]
  },
  {
    "id": "build-79",
    "title": "Build 79",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 79 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 79",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "text": "79 = 7 ten-bars + 9 ones.",
        "caption": "7 tens, 9 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "text": "Count the tens: 7. Count the ones: 9. Total: 79.",
        "caption": "70 + 9 = 79"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "text": "The tens digit of 79 is 7.",
        "caption": "Tens = 7"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "text": "The ones digit of 79 is 9.",
        "caption": "Ones = 9"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "text": "You built 79 from blocks!",
        "caption": "79!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79,
        "hint": "7 tens + 9 ones = 79."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 7,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 9,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79,
        "hint": "79!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 7,
        "hint": "7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 9,
        "hint": "9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79,
        "hint": "7 tens + 9 ones = 79."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 7,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 9,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79,
        "hint": "79!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 7,
        "hint": "7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 9,
        "hint": "9."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 7,
          "ones": 9
        },
        "prompt": "What number?",
        "answer": 79
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 79,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 9
      }
    ]
  },
  {
    "id": "build-88",
    "title": "Build 88",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 88 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 88",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "text": "88 = 8 ten-bars + 8 ones.",
        "caption": "8 tens, 8 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "text": "Count the tens: 8. Count the ones: 8. Total: 88.",
        "caption": "80 + 8 = 88"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "text": "The tens digit of 88 is 8.",
        "caption": "Tens = 8"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "text": "The ones digit of 88 is 8.",
        "caption": "Ones = 8"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "text": "You built 88 from blocks!",
        "caption": "88!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88,
        "hint": "8 tens + 8 ones = 88."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 8,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 8,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88,
        "hint": "88!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 8,
        "hint": "8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 8,
        "hint": "8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88,
        "hint": "8 tens + 8 ones = 88."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 8,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 8,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88,
        "hint": "88!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 8,
        "hint": "8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 8,
        "hint": "8."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 8,
          "ones": 8
        },
        "prompt": "What number?",
        "answer": 88
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 88,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 8
      }
    ]
  },
  {
    "id": "build-95",
    "title": "Build 95",
    "emoji": "🧱",
    "category": "D",
    "description": "Make 95 with tens and ones.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Build 95",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "text": "95 = 9 ten-bars + 5 ones.",
        "caption": "9 tens, 5 ones"
      },
      {
        "title": "See Them Together",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "text": "Count the tens: 9. Count the ones: 5. Total: 95.",
        "caption": "90 + 5 = 95"
      },
      {
        "title": "Tens Place",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "text": "The tens digit of 95 is 9.",
        "caption": "Tens = 9"
      },
      {
        "title": "Ones Place",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "text": "The ones digit of 95 is 5.",
        "caption": "Ones = 5"
      },
      {
        "title": "Master It",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "text": "You built 95 from blocks!",
        "caption": "95!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95,
        "hint": "9 tens + 5 ones = 95."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 9,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 5,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95,
        "hint": "95!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 9,
        "hint": "9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 5,
        "hint": "5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95,
        "hint": "9 tens + 5 ones = 95."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "prompt": "How many tens?",
        "answer": 9,
        "hint": "First digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "prompt": "How many ones?",
        "answer": 5,
        "hint": "Last digit."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95,
        "hint": "95!"
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "prompt": "Tens digit?",
        "answer": 9,
        "hint": "9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "prompt": "Ones digit?",
        "answer": 5,
        "hint": "5."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95
      },
      {
        "type": "numeric",
        "visual": {
          "type": "blocks",
          "tens": 9,
          "ones": 5
        },
        "prompt": "What number?",
        "answer": 95
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "tens"
        },
        "prompt": "Tens?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-num",
          "n": 95,
          "highlight": "ones"
        },
        "prompt": "Ones?",
        "answer": 5
      }
    ]
  },
  {
    "id": "time-all-hours",
    "title": "All O'Clock Hours",
    "emoji": "🕐",
    "category": "F",
    "description": "Read every o'clock from 1 to 12.",
    "kind": "generic",
    "lesson": [
      {
        "title": "O'Clock Means Long Hand on 12",
        "visual": {
          "type": "clock",
          "hour": 1,
          "minute": 0
        },
        "text": "When the long hand is on 12, it is exactly o'clock.",
        "caption": "O'Clock"
      },
      {
        "title": "1 O'Clock",
        "visual": {
          "type": "clock",
          "hour": 1,
          "minute": 0
        },
        "text": "Short hand on 1.",
        "caption": "1:00"
      },
      {
        "title": "3 O'Clock",
        "visual": {
          "type": "clock",
          "hour": 3,
          "minute": 0
        },
        "text": "Short hand on 3.",
        "caption": "3:00"
      },
      {
        "title": "6 O'Clock",
        "visual": {
          "type": "clock",
          "hour": 6,
          "minute": 0
        },
        "text": "Short hand on 6.",
        "caption": "6:00"
      },
      {
        "title": "9 O'Clock",
        "visual": {
          "type": "clock",
          "hour": 9,
          "minute": 0
        },
        "text": "Short hand on 9.",
        "caption": "9:00"
      },
      {
        "title": "12 O'Clock",
        "visual": {
          "type": "clock",
          "hour": 12,
          "minute": 0
        },
        "text": "Both hands on 12. That is noon or midnight!",
        "caption": "12:00"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 1,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 1,
        "hint": "Read the SHORT hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 2,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 2,
        "hint": "Read the SHORT hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 4,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 4,
        "hint": "Read the SHORT hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 5,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 5,
        "hint": "Read the SHORT hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 7,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 7,
        "hint": "Read the SHORT hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 8,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 8,
        "hint": "Read the SHORT hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 10,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 10,
        "hint": "Read the SHORT hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 11,
          "minute": 0
        },
        "prompt": "What hour is it? (just the number)",
        "answer": 11,
        "hint": "Read the SHORT hand."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 1,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 2,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 3,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 4,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 5,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 6,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 7,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 8,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 9,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 10,
          "minute": 0
        },
        "prompt": "What hour is it?",
        "answer": 10
      }
    ]
  },
  {
    "id": "time-all-half",
    "title": "All Half-Past Hours",
    "emoji": "🕢",
    "category": "F",
    "description": "Read every half-past hour from 1 to 12.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Half Past = Long Hand on 6",
        "visual": {
          "type": "clock",
          "hour": 3,
          "minute": 30
        },
        "text": "When the long hand is on 6, it is half past the hour.",
        "caption": "Half past"
      },
      {
        "title": "Half Past 1",
        "visual": {
          "type": "clock",
          "hour": 1,
          "minute": 30
        },
        "text": "Short hand between 1 and 2.",
        "caption": "1:30"
      },
      {
        "title": "Half Past 4",
        "visual": {
          "type": "clock",
          "hour": 4,
          "minute": 30
        },
        "text": "Short hand between 4 and 5.",
        "caption": "4:30"
      },
      {
        "title": "Half Past 7",
        "visual": {
          "type": "clock",
          "hour": 7,
          "minute": 30
        },
        "text": "Short hand between 7 and 8.",
        "caption": "7:30"
      },
      {
        "title": "Half Past 10",
        "visual": {
          "type": "clock",
          "hour": 10,
          "minute": 30
        },
        "text": "Short hand between 10 and 11.",
        "caption": "10:30"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 2,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 2,
        "hint": "Pick the SMALLER number near the short hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 3,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 3,
        "hint": "Pick the SMALLER number near the short hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 5,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 5,
        "hint": "Pick the SMALLER number near the short hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 6,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 6,
        "hint": "Pick the SMALLER number near the short hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 8,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 8,
        "hint": "Pick the SMALLER number near the short hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 9,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 9,
        "hint": "Pick the SMALLER number near the short hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 11,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 11,
        "hint": "Pick the SMALLER number near the short hand."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 12,
          "minute": 30
        },
        "prompt": "It is half past which hour?",
        "answer": 12,
        "hint": "Pick the SMALLER number near the short hand."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 1,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 2,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 3,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 4,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 5,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 6,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 7,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 8,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 9,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "clock",
          "hour": 10,
          "minute": 30
        },
        "prompt": "Half past which hour?",
        "answer": 10
      }
    ]
  },
  {
    "id": "coin-pennies",
    "title": "Counting pennys",
    "emoji": "🟤",
    "category": "G",
    "description": "Each penny = 1¢. Count them up!",
    "kind": "generic",
    "lesson": [
      {
        "title": "A penny",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "🟤"
        },
        "text": "A penny is worth 1 cents.",
        "caption": "penny = 1¢"
      },
      {
        "title": "Two pennys",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "🟤"
        },
        "text": "Two pennys = 2 cents.",
        "caption": "2¢"
      },
      {
        "title": "Skip Count",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🟤"
        },
        "text": "Count by 1: 1, 2, 3, 4, 5!",
        "caption": "+1 each"
      },
      {
        "title": "Five pennys",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🟤"
        },
        "text": "Five pennys = 5 cents.",
        "caption": "5×1=5¢"
      },
      {
        "title": "Practice Counting",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🟤"
        },
        "text": "Touch each coin and skip count. Easy!",
        "caption": "Skip count"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 1 penny?",
        "answer": 1,
        "hint": "Skip count by 1: 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 2 pennys?",
        "answer": 2,
        "hint": "Skip count by 1: 1, 2."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 3 pennys?",
        "answer": 3,
        "hint": "Skip count by 1: 1, 2, 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 4 pennys?",
        "answer": 4,
        "hint": "Skip count by 1: 1, 2, 3, 4."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 5 pennys?",
        "answer": 5,
        "hint": "Skip count by 1: 1, 2, 3, 4, 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 6 pennys?",
        "answer": 6,
        "hint": "Skip count by 1: 1, 2, 3, 4, 5, 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 7 pennys?",
        "answer": 7,
        "hint": "Skip count by 1: 1, 2, 3, 4, 5, 6, 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 8 pennys?",
        "answer": 8,
        "hint": "Skip count by 1: 1, 2, 3, 4, 5, 6, 7, 8."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 1 penny?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 2 pennys?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 3 pennys?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 4 pennys?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 5 pennys?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 6 pennys?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 7 pennys?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 8 pennys?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 9,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 9 pennys?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 10,
          "emoji": "🟤"
        },
        "prompt": "How many cents in 10 pennys?",
        "answer": 10
      }
    ]
  },
  {
    "id": "coin-nickels",
    "title": "Counting nickels",
    "emoji": "⚪",
    "category": "G",
    "description": "Each nickel = 5¢. Count them up!",
    "kind": "generic",
    "lesson": [
      {
        "title": "A nickel",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "⚪"
        },
        "text": "A nickel is worth 5 cents.",
        "caption": "nickel = 5¢"
      },
      {
        "title": "Two nickels",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "⚪"
        },
        "text": "Two nickels = 10 cents.",
        "caption": "10¢"
      },
      {
        "title": "Skip Count",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "⚪"
        },
        "text": "Count by 5: 5, 10, 15, 20, 25!",
        "caption": "+5 each"
      },
      {
        "title": "Five nickels",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "⚪"
        },
        "text": "Five nickels = 25 cents.",
        "caption": "5×5=25¢"
      },
      {
        "title": "Practice Counting",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "⚪"
        },
        "text": "Touch each coin and skip count. Easy!",
        "caption": "Skip count"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 1 nickel?",
        "answer": 5,
        "hint": "Skip count by 5: 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 2 nickels?",
        "answer": 10,
        "hint": "Skip count by 5: 5, 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 3 nickels?",
        "answer": 15,
        "hint": "Skip count by 5: 5, 10, 15."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 4 nickels?",
        "answer": 20,
        "hint": "Skip count by 5: 5, 10, 15, 20."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 5 nickels?",
        "answer": 25,
        "hint": "Skip count by 5: 5, 10, 15, 20, 25."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 6 nickels?",
        "answer": 30,
        "hint": "Skip count by 5: 5, 10, 15, 20, 25, 30."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 7 nickels?",
        "answer": 35,
        "hint": "Skip count by 5: 5, 10, 15, 20, 25, 30, 35."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 8 nickels?",
        "answer": 40,
        "hint": "Skip count by 5: 5, 10, 15, 20, 25, 30, 35, 40."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 1 nickel?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 2 nickels?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 3 nickels?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 4 nickels?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 5 nickels?",
        "answer": 25
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 6 nickels?",
        "answer": 30
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 7 nickels?",
        "answer": 35
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 8 nickels?",
        "answer": 40
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 9,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 9 nickels?",
        "answer": 45
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 10,
          "emoji": "⚪"
        },
        "prompt": "How many cents in 10 nickels?",
        "answer": 50
      }
    ]
  },
  {
    "id": "coin-dimes",
    "title": "Counting dimes",
    "emoji": "🔘",
    "category": "G",
    "description": "Each dime = 10¢. Count them up!",
    "kind": "generic",
    "lesson": [
      {
        "title": "A dime",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "🔘"
        },
        "text": "A dime is worth 10 cents.",
        "caption": "dime = 10¢"
      },
      {
        "title": "Two dimes",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "🔘"
        },
        "text": "Two dimes = 20 cents.",
        "caption": "20¢"
      },
      {
        "title": "Skip Count",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🔘"
        },
        "text": "Count by 10: 10, 20, 30, 40, 50!",
        "caption": "+10 each"
      },
      {
        "title": "Five dimes",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🔘"
        },
        "text": "Five dimes = 50 cents.",
        "caption": "5×10=50¢"
      },
      {
        "title": "Practice Counting",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🔘"
        },
        "text": "Touch each coin and skip count. Easy!",
        "caption": "Skip count"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 1 dime?",
        "answer": 10,
        "hint": "Skip count by 10: 10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 2 dimes?",
        "answer": 20,
        "hint": "Skip count by 10: 10, 20."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 3 dimes?",
        "answer": 30,
        "hint": "Skip count by 10: 10, 20, 30."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 4 dimes?",
        "answer": 40,
        "hint": "Skip count by 10: 10, 20, 30, 40."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 5 dimes?",
        "answer": 50,
        "hint": "Skip count by 10: 10, 20, 30, 40, 50."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 6 dimes?",
        "answer": 60,
        "hint": "Skip count by 10: 10, 20, 30, 40, 50, 60."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 7 dimes?",
        "answer": 70,
        "hint": "Skip count by 10: 10, 20, 30, 40, 50, 60, 70."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 8 dimes?",
        "answer": 80,
        "hint": "Skip count by 10: 10, 20, 30, 40, 50, 60, 70, 80."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 1,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 1 dime?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 2 dimes?",
        "answer": 20
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 3 dimes?",
        "answer": 30
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 4 dimes?",
        "answer": 40
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 5 dimes?",
        "answer": 50
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 6 dimes?",
        "answer": 60
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 7 dimes?",
        "answer": 70
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 8 dimes?",
        "answer": 80
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 9,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 9 dimes?",
        "answer": 90
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 10,
          "emoji": "🔘"
        },
        "prompt": "How many cents in 10 dimes?",
        "answer": 100
      }
    ]
  },
  {
    "id": "length-cubes",
    "title": "Measure with Cubes",
    "emoji": "🟩",
    "category": "J",
    "description": "Count cubes to measure how long.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Line Up the Cubes",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🟩"
        },
        "text": "To measure length, line up cubes end to end.",
        "caption": "No gaps!"
      },
      {
        "title": "Count Them",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🟩"
        },
        "text": "Touch each one and count.",
        "caption": "1, 2, 3, 4, 5"
      },
      {
        "title": "Try a Bigger One",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "🟩"
        },
        "text": "A bigger object needs more cubes.",
        "caption": "8 long"
      },
      {
        "title": "Compare",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 8
        },
        "text": "8 cubes is LONGER than 5 cubes.",
        "caption": "More = longer"
      },
      {
        "title": "You Can Measure!",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "🟩"
        },
        "text": "Just count and you have a measurement.",
        "caption": "6 cubes long"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 3,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 4,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 5,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 6,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 7,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 8,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 9,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 9,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 10,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 10,
        "hint": "Count each one."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 9,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 10,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🟩"
        },
        "prompt": "How many cubes long?",
        "answer": 5
      }
    ]
  },
  {
    "id": "length-paperclips",
    "title": "Measure with Paperclips",
    "emoji": "📎",
    "category": "J",
    "description": "Count paperclips to measure how long.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Line Up the Paperclips",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "📎"
        },
        "text": "To measure length, line up paperclips end to end.",
        "caption": "No gaps!"
      },
      {
        "title": "Count Them",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "📎"
        },
        "text": "Touch each one and count.",
        "caption": "1, 2, 3, 4, 5"
      },
      {
        "title": "Try a Bigger One",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "📎"
        },
        "text": "A bigger object needs more paperclips.",
        "caption": "8 long"
      },
      {
        "title": "Compare",
        "visual": {
          "type": "compare-pair",
          "a": 5,
          "b": 8
        },
        "text": "8 paperclips is LONGER than 5 paperclips.",
        "caption": "More = longer"
      },
      {
        "title": "You Can Measure!",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "📎"
        },
        "text": "Just count and you have a measurement.",
        "caption": "6 paperclips long"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 3,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 4,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 5,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 6,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 7,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 8,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 9,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 9,
        "hint": "Count each one."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 10,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 10,
        "hint": "Count each one."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 2,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 3,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 4,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 6,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 8,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 9,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 10,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "📎"
        },
        "prompt": "How many paperclips long?",
        "answer": 5
      }
    ]
  },
  {
    "id": "add3-20",
    "title": "Add Three to 20",
    "emoji": "3️⃣",
    "category": "B",
    "description": "Add three numbers that total 20.",
    "kind": "generic",
    "lesson": [
      {
        "title": "Three Numbers, One Total",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "text": "When we have three numbers to add, we add them in any order!",
        "caption": "a + b + c"
      },
      {
        "title": "Add Two First",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "text": "For 2 + 3 + 4: add 2 + 3 first to get 5.",
        "caption": "Step 1"
      },
      {
        "title": "Then Add the Third",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 4
        },
        "text": "5 + 4 = 9. So 2 + 3 + 4 = 9!",
        "caption": "Step 2"
      },
      {
        "title": "Look for Pairs to 10",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "text": "For 3 + 7 + 4: 3 + 7 = 10. Then 10 + 4 = 14. Pairs to 10 make it FAST.",
        "caption": "Make 10 first!"
      },
      {
        "title": "Use Doubles Too",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "text": "For 5 + 5 + 2: 5 + 5 = 10 (double!), then + 2 = 12.",
        "caption": "Doubles + 1 more"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three plus four?",
        "answer": 9,
        "hint": "2+3=5, 5+4=9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 4
        },
        "prompt": "One plus four plus five?",
        "answer": 10,
        "hint": "1+4=5, 5+5=10."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 7
        },
        "prompt": "Three plus seven plus two?",
        "answer": 12,
        "hint": "Make 10 first: 3+7=10, then +2=12."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus six plus three?",
        "answer": 13,
        "hint": "Make 10: 4+6=10, +3=13."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 2
        },
        "prompt": "Two plus two plus two?",
        "answer": 6,
        "hint": "2+2+2: 4 then +2=6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 5
        },
        "prompt": "Five plus five plus four?",
        "answer": 14,
        "hint": "Doubles! 5+5=10, +4=14."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 3
        },
        "prompt": "Three plus three plus three?",
        "answer": 9,
        "hint": "3+3+3: 6 then +3=9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 4
        },
        "prompt": "Six plus four plus five?",
        "answer": 15,
        "hint": "Make 10: 6+4=10, +5=15."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 3
        },
        "prompt": "Two plus three plus four?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 1,
          "b": 2
        },
        "prompt": "One plus two plus three?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 2,
          "b": 4
        },
        "prompt": "Two plus four plus three?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 3,
          "b": 5
        },
        "prompt": "Three plus five plus two?",
        "answer": 10
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 4,
          "b": 6
        },
        "prompt": "Four plus six plus two?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 5,
          "b": 3
        },
        "prompt": "Five plus three plus four?",
        "answer": 12
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 6,
          "b": 4
        },
        "prompt": "Six plus four plus four?",
        "answer": 14
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 7,
          "b": 3
        },
        "prompt": "Seven plus three plus five?",
        "answer": 15
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 8,
          "b": 2
        },
        "prompt": "Eight plus two plus six?",
        "answer": 16
      },
      {
        "type": "numeric",
        "visual": {
          "type": "two-digit-add",
          "a": 9,
          "b": 1
        },
        "prompt": "Nine plus one plus seven?",
        "answer": 17
      }
    ]
  },
  {
    "id": "even-odd-pairs",
    "title": "Even and Odd",
    "emoji": "👯",
    "category": "A",
    "description": "Pair them up: even or one left over?",
    "kind": "generic",
    "lesson": [
      {
        "title": "Pair Them Up",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 2,
          "emoji": "🐝"
        },
        "text": "A number is EVEN if it makes pairs with no leftover.",
        "caption": "Even = pairs"
      },
      {
        "title": "4 is Even",
        "visual": {
          "type": "add-groups",
          "a": 2,
          "b": 2,
          "emoji": "🐝"
        },
        "text": "4 bees can make 2 pairs. Even!",
        "caption": "4 = 2 pairs"
      },
      {
        "title": "5 is Odd",
        "visual": {
          "type": "objects",
          "count": 5,
          "emoji": "🐝"
        },
        "text": "5 bees: 2 pairs and ONE LEFT OVER. Odd!",
        "caption": "5 = 2 pairs + 1"
      },
      {
        "title": "Check 6",
        "visual": {
          "type": "add-groups",
          "a": 3,
          "b": 3,
          "emoji": "🍎"
        },
        "text": "6 apples = 3 pairs. Even!",
        "caption": "6 = 3 pairs"
      },
      {
        "title": "Check 7",
        "visual": {
          "type": "objects",
          "count": 7,
          "emoji": "🍎"
        },
        "text": "7 apples: 3 pairs and ONE LEFT. Odd!",
        "caption": "7 = 3 pairs + 1"
      },
      {
        "title": "Quick Trick",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "text": "Even numbers end in 0, 2, 4, 6, or 8. Odd end in 1, 3, 5, 7, 9.",
        "caption": "Last digit tells you"
      }
    ],
    "practice": [
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 4
        },
        "prompt": "Is 4 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0,
        "hint": "Last digit: 4. Even."
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 7
        },
        "prompt": "Is 7 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1,
        "hint": "Last digit: 7. Odd."
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 10
        },
        "prompt": "Is 10 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0,
        "hint": "Last digit: 0. Even."
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 13
        },
        "prompt": "Is 13 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1,
        "hint": "Last digit: 3. Odd."
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 16
        },
        "prompt": "Is 16 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0,
        "hint": "Last digit: 6. Even."
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 19
        },
        "prompt": "Is 19 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1,
        "hint": "Last digit: 9. Odd."
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 22
        },
        "prompt": "Is 22 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0,
        "hint": "Last digit: 2. Even."
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 25
        },
        "prompt": "Is 25 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1,
        "hint": "Last digit: 5. Odd."
      }
    ],
    "quiz": [
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 2
        },
        "prompt": "Is 2 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 5
        },
        "prompt": "Is 5 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 8
        },
        "prompt": "Is 8 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 11
        },
        "prompt": "Is 11 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 14
        },
        "prompt": "Is 14 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 17
        },
        "prompt": "Is 17 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 20
        },
        "prompt": "Is 20 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 23
        },
        "prompt": "Is 23 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 26
        },
        "prompt": "Is 26 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 0
      },
      {
        "type": "choice",
        "visual": {
          "type": "bignum",
          "n": 29
        },
        "prompt": "Is 29 even or odd?",
        "choices": [
          "Even",
          "Odd"
        ],
        "answerIndex": 1
      }
    ]
  },
  {
    "id": "pattern-ab",
    "title": "AB Patterns",
    "emoji": "🟥",
    "category": "K",
    "description": "Find the next item in an AB pattern.",
    "kind": "generic",
    "lesson": [
      {
        "title": "AB Pattern",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            2,
            1,
            2,
            1,
            2
          ],
          "missingIndex": -1
        },
        "text": "AB means: alternate two things. 1, 2, 1, 2…",
        "caption": "A B A B"
      },
      {
        "title": "Find the Pattern",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            7,
            3,
            7,
            3,
            7
          ],
          "missingIndex": -1
        },
        "text": "Same pattern with different numbers: 3, 7, 3, 7.",
        "caption": "3 7 3 7"
      },
      {
        "title": "What Comes Next?",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            2,
            1,
            2,
            1
          ],
          "missingIndex": 5
        },
        "text": "After 1, 2, 1, 2, 1 comes... 2!",
        "caption": "Next: 2"
      },
      {
        "title": "Try Another",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            9,
            5,
            9,
            5
          ],
          "missingIndex": 5
        },
        "text": "Spot it: 5, 9, 5, 9, 5… Next is 9.",
        "caption": "Next: 9"
      },
      {
        "title": "Patterns Repeat",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            8,
            2,
            8,
            2,
            8
          ],
          "missingIndex": -1
        },
        "text": "AB patterns ALWAYS repeat the pair. Once you see two, you know the rest.",
        "caption": "A B repeats"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            3,
            1,
            3,
            1
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 3,
        "hint": "AB pattern: after 1 comes 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            5,
            2,
            5,
            2
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 5,
        "hint": "AB pattern: after 2 comes 5."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            4,
            7,
            4,
            7,
            4
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 7,
        "hint": "AB pattern: after 4 comes 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            9,
            6,
            9,
            6
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 9,
        "hint": "AB pattern: after 6 comes 9."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            8,
            2,
            8,
            2
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 8,
        "hint": "AB pattern: after 2 comes 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            6,
            3,
            6,
            3
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 6,
        "hint": "AB pattern: after 3 comes 6."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            7,
            5,
            7,
            5
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 7,
        "hint": "AB pattern: after 5 comes 7."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            9,
            1,
            9,
            1
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 9,
        "hint": "AB pattern: after 1 comes 9."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            4,
            2,
            4,
            2,
            4
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            5,
            1,
            5,
            1,
            5
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            8,
            3,
            8,
            3,
            8
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            2,
            6,
            2,
            6,
            2
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            7,
            9,
            7,
            9,
            7,
            9
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            4,
            1,
            4,
            1,
            4,
            1
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            8,
            3,
            8,
            3,
            8,
            3
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            6,
            5,
            6,
            5,
            6
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            9,
            2,
            9,
            2,
            9,
            2
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            7,
            2,
            7,
            2,
            7
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 2
      }
    ]
  },
  {
    "id": "pattern-aabb",
    "title": "AABB Patterns",
    "emoji": "🟦",
    "category": "K",
    "description": "Two of A, then two of B.",
    "kind": "generic",
    "lesson": [
      {
        "title": "AABB Pattern",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            1,
            2,
            2,
            1,
            1
          ],
          "missingIndex": -1
        },
        "text": "AABB means: two of one, two of another. 1, 1, 2, 2…",
        "caption": "A A B B"
      },
      {
        "title": "Find Pairs",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            3,
            5,
            5,
            3,
            3
          ],
          "missingIndex": -1
        },
        "text": "Two 3s, two 5s, repeat. Easy!",
        "caption": "3 3 5 5"
      },
      {
        "title": "What Comes Next?",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            1,
            2,
            2,
            1
          ],
          "missingIndex": 5
        },
        "text": "After 1, 1, 2, 2, 1 comes another 1 (to complete the AA).",
        "caption": "Next: 1"
      },
      {
        "title": "Then the Switch",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            1,
            2,
            2,
            1,
            1,
            2
          ],
          "missingIndex": -1
        },
        "text": "After AABB, we go AABB again!",
        "caption": "Repeats!"
      },
      {
        "title": "You Got It",
        "visual": {
          "type": "sequence",
          "nums": [
            7,
            7,
            9,
            9,
            7,
            7
          ],
          "missingIndex": -1
        },
        "text": "Now you can spot AABB anywhere.",
        "caption": "Look for pairs!"
      }
    ],
    "practice": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            1,
            3,
            3,
            1
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 1,
        "hint": "AABB: just had one 1, need another to complete the AA."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            2,
            5,
            5,
            2
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 2,
        "hint": "AABB: just had one 2, need another to complete the AA."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            4,
            4,
            6,
            6,
            4
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 4,
        "hint": "AABB: just had one 4, need another to complete the AA."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            7,
            7,
            9,
            9,
            7
          ],
          "missingIndex": 5
        },
        "prompt": "What comes next?",
        "answer": 7,
        "hint": "AABB: just had one 7, need another to complete the AA."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            2,
            8,
            8,
            2,
            2
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 8,
        "hint": "AABB: AA done, now BB starts with 8."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            5,
            1,
            1,
            5,
            5
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 1,
        "hint": "AABB: AA done, now BB starts with 1."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            6,
            3,
            3,
            6,
            6
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 3,
        "hint": "AABB: AA done, now BB starts with 3."
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            8,
            8,
            4,
            4,
            8,
            8
          ],
          "missingIndex": 6
        },
        "prompt": "What comes next?",
        "answer": 4,
        "hint": "AABB: AA done, now BB starts with 4."
      }
    ],
    "quiz": [
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            1,
            2,
            2,
            1,
            1,
            2
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 2
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            3,
            3,
            4,
            4,
            3,
            3,
            4
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 4
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            5,
            5,
            6,
            6,
            5,
            5,
            6
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 6
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            7,
            7,
            8,
            8,
            7,
            7,
            8
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 8
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            9,
            9,
            1,
            1,
            9,
            9,
            1
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 1
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            2,
            2,
            3,
            3,
            2,
            2,
            3
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 3
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            4,
            4,
            5,
            5,
            4,
            4,
            5
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 5
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            6,
            6,
            7,
            7,
            6,
            6,
            7
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 7
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            8,
            8,
            9,
            9,
            8,
            8,
            9
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 9
      },
      {
        "type": "numeric",
        "visual": {
          "type": "sequence",
          "nums": [
            1,
            1,
            5,
            5,
            1,
            1,
            5
          ],
          "missingIndex": 7
        },
        "prompt": "What comes next?",
        "answer": 5
      }
    ]
  }
];

const MODULES_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));

// ----------------------------------------------------------------------
// State
// ----------------------------------------------------------------------

const moduleState = {
    moduleId: null,
    activity: null,            // 'lesson' | 'practice' | 'quiz'
    lessonIndex: 0,
    problemIndex: 0,
    answer: '',
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    sessionRobux: 0,
    hintShown: false,
    locked: false,
};

const ROBUX_PER_QUIZ_CORRECT = 4;

// ----------------------------------------------------------------------
// Home — module grid
// ----------------------------------------------------------------------

// Module categories — order, emoji, title.
// Modules carry a `category` letter that maps into here.
const CATEGORIES = [
    { id: 'A', title: 'Counting & Number Sense', emoji: '🔢' },
    { id: 'B', title: 'Addition Strategies',     emoji: '➕' },
    { id: 'C', title: 'Subtraction Strategies',  emoji: '➖' },
    { id: 'D', title: 'Place Value & Big Numbers', emoji: '🔟' },
    { id: 'E', title: 'Comparing Numbers',       emoji: '⚖️' },
    { id: 'F', title: 'Telling Time',            emoji: '🕐' },
    { id: 'G', title: 'Money & Coins',           emoji: '🪙' },
    { id: 'H', title: 'Shapes (2D & 3D)',        emoji: '🔷' },
    { id: 'I', title: 'Equal Shares',            emoji: '🥧' },
    { id: 'J', title: 'Measurement',             emoji: '📏' },
    { id: 'K', title: 'Patterns',                emoji: '🌀' },
    { id: 'L', title: 'Graphs & Data',           emoji: '📊' },
    { id: 'M', title: 'Word Problems',           emoji: '📖' },
    { id: 'N', title: 'Mixed Math',              emoji: '🎯' },
];

function renderHomeModules() {
    const grid = document.getElementById('module-grid');
    if (!grid) return;

    // Default category if a module didn't get one assigned.
    const fallback = 'A';
    const byCategory = {};
    for (const m of MODULES) {
        const cat = m.category || fallback;
        (byCategory[cat] || (byCategory[cat] = [])).push(m);
    }

    let html = '';
    let total = 0;
    for (const cat of CATEGORIES) {
        const mods = byCategory[cat.id];
        if (!mods || !mods.length) continue;
        mods.sort((a, b) => (a.order || 999) - (b.order || 999));
        html += `<section class="m-category">
            <h3 class="m-category-heading">${cat.emoji} ${cat.title}
                <span class="m-category-count">${mods.length}</span>
            </h3>
            <div class="m-category-grid">
                ${mods.map((m) => `
                    <button class="m-card" onclick="selectModule('${m.id}')">
                        <span class="m-card-icon">${m.emoji}</span>
                        <span class="m-card-title">${m.title}</span>
                        <span class="m-card-desc">${m.description}</span>
                    </button>
                `).join('')}
            </div>
        </section>`;
        total += mods.length;
    }
    grid.innerHTML = html;

    // Show overall count in the header
    const heading = document.querySelector('.modules-heading');
    if (heading) heading.textContent = `Pick a Module — ${total} skills to explore!`;
}

// ----------------------------------------------------------------------
// Module detail — three buttons: Lesson · Practice · Quiz
// ----------------------------------------------------------------------

function selectModule(id) {
    if (typeof playSound === 'function') playSound('click');
    if (typeof initSpeechOnGesture === 'function') initSpeechOnGesture();
    const mod = MODULES_BY_ID[id];
    if (!mod) return;
    moduleState.moduleId = id;
    moduleState.activity = null;

    document.getElementById('module-detail-icon').textContent = mod.emoji;
    document.getElementById('module-detail-title').textContent = mod.title;
    document.getElementById('module-detail-desc').textContent = mod.description;

    const hasPractice = !!mod.practice || mod.kind === 'addsub' || mod.kind === 'factfamily';
    const hasQuiz     = !!mod.quiz     || mod.kind === 'addsub' || mod.kind === 'factfamily';
    document.getElementById('mod-lesson-btn').style.display   = mod.lesson ? '' : 'none';
    document.getElementById('mod-practice-btn').style.display = hasPractice ? '' : 'none';
    document.getElementById('mod-quiz-btn').style.display     = hasQuiz ? '' : 'none';

    showScreen('module-screen');
}

function startActivity(activity) {
    if (typeof playSound === 'function') playSound('click');
    const mod = MODULES_BY_ID[moduleState.moduleId];
    if (!mod) return;
    moduleState.activity = activity;

    if (activity === 'lesson') {
        startLesson(mod);
        return;
    }

    const isPractice = (activity === 'practice');
    if (mod.kind === 'addsub') {
        // Delegate to existing addsub game (game.js).
        // gameMode is 'addition' | 'subtraction'. isPractice → 5 questions, no Robux.
        if (typeof startGame === 'function') startGame(mod.gameMode, isPractice);
        return;
    }
    if (mod.kind === 'factfamily') {
        if (typeof startFactFamilyGame === 'function') startFactFamilyGame(isPractice);
        return;
    }
    // Generic module: use the built-in problem flow
    startGenericProblems(mod, activity);
}

// ----------------------------------------------------------------------
// Lesson flow (used by every module)
// ----------------------------------------------------------------------

function startLesson(mod) {
    moduleState.lessonIndex = 0;
    showScreen('lesson-screen');
    renderLessonPage();
}

function renderLessonPage() {
    const mod = MODULES_BY_ID[moduleState.moduleId];
    if (!mod || !mod.lesson) return;
    const total = mod.lesson.length;
    const page = mod.lesson[moduleState.lessonIndex];
    const isFirst = moduleState.lessonIndex === 0;
    const isLast = moduleState.lessonIndex === total - 1;

    document.getElementById('lesson-title').textContent = page.title;
    document.getElementById('lesson-visual').innerHTML = renderVisual(page.visual);
    document.getElementById('lesson-text').textContent = page.text;
    document.getElementById('lesson-caption').textContent = page.caption || '';
    document.getElementById('lesson-progress').textContent = `Lesson ${moduleState.lessonIndex + 1} / ${total}`;

    const dots = [];
    for (let i = 0; i < total; i++) {
        dots.push(`<span class="dot ${i === moduleState.lessonIndex ? 'active' : (i < moduleState.lessonIndex ? 'done' : '')}"></span>`);
    }
    document.getElementById('lesson-dots').innerHTML = dots.join('');

    document.getElementById('lesson-back-btn').style.visibility = isFirst ? 'hidden' : '';
    const isDelegated = (mod.kind === 'addsub' || mod.kind === 'factfamily');
    document.getElementById('lesson-next-btn').textContent =
        isLast ? (isDelegated ? 'Done ✓' : "Let's Practice! 🎯") : 'Next ➡️';

    if (typeof speak === 'function') speak(page.text);
}

function nextLessonPage() {
    if (typeof playSound === 'function') playSound('click');
    const mod = MODULES_BY_ID[moduleState.moduleId];
    if (!mod) return;
    if (moduleState.lessonIndex < mod.lesson.length - 1) {
        moduleState.lessonIndex++;
        renderLessonPage();
    } else {
        // End of lesson
        if (mod.kind === 'addsub' || mod.kind === 'factfamily') {
            // Delegated practice/quiz — return to module detail
            selectModule(mod.id);
        } else {
            startGenericProblems(mod, 'practice');
        }
    }
}

function prevLessonPage() {
    if (typeof playSound === 'function') playSound('click');
    if (moduleState.lessonIndex > 0) {
        moduleState.lessonIndex--;
        renderLessonPage();
    }
}

// ----------------------------------------------------------------------
// Generic practice/quiz flow
// ----------------------------------------------------------------------

function startGenericProblems(mod, activity) {
    moduleState.activity = activity;
    moduleState.problemIndex = 0;
    moduleState.answer = '';
    moduleState.score = 0;
    moduleState.streak = 0;
    moduleState.bestStreak = 0;
    moduleState.correct = 0;
    moduleState.sessionRobux = 0;
    moduleState.hintShown = false;
    moduleState.locked = false;
    showScreen('module-game-screen');
    renderModuleProblem();
}

function getCurrentProblems() {
    const mod = MODULES_BY_ID[moduleState.moduleId];
    if (!mod) return null;
    return moduleState.activity === 'practice' ? mod.practice : mod.quiz;
}

function renderModuleProblem() {
    const mod = MODULES_BY_ID[moduleState.moduleId];
    const problems = getCurrentProblems();
    if (!problems || !problems.length) return;
    const p = problems[moduleState.problemIndex];
    const total = problems.length;

    moduleState.answer = '';
    moduleState.hintShown = false;
    moduleState.locked = false;

    document.getElementById('mg-question').textContent = p.prompt;
    document.getElementById('mg-visual').innerHTML = renderVisual(p.visual);
    document.getElementById('mg-answer').textContent = '';

    const phaseLabel = moduleState.activity === 'practice' ? '🎯 Practice' : '⭐ Quiz';
    document.getElementById('mg-phase').textContent = `${mod.emoji} ${mod.title} — ${phaseLabel}`;
    document.getElementById('mg-progress-text').textContent = `${moduleState.problemIndex + 1} / ${total}`;
    document.getElementById('mg-progress-fill').style.width = `${(moduleState.problemIndex / total) * 100}%`;
    document.getElementById('mg-score').textContent = moduleState.score;
    document.getElementById('mg-streak').textContent = `🔥 ${moduleState.streak}`;

    // Robux
    const robuxDisplay = document.getElementById('mg-robux-display');
    if (typeof currentUser !== 'undefined' && currentUser === 'hakan') {
        robuxDisplay.style.display = '';
        const total = (typeof loadRobux === 'function' ? loadRobux() : 0);
        document.getElementById('mg-robux-game').textContent = total.toFixed(2);
    } else {
        robuxDisplay.style.display = 'none';
    }

    // Numeric vs choice answer UI
    const numericPad = document.getElementById('mg-num-pad');
    const choicePad  = document.getElementById('mg-choice-pad');
    if (p.type === 'numeric') {
        numericPad.style.display = '';
        choicePad.style.display = 'none';
    } else {
        numericPad.style.display = 'none';
        choicePad.style.display = '';
        choicePad.innerHTML = (p.choices || []).map((c, i) =>
            `<button class="m-choice" onclick="mgPickChoice(${i})">${c}</button>`
        ).join('');
    }

    // Hint button
    const hintBtn = document.getElementById('mg-hint-btn');
    if (moduleState.activity === 'practice' && p.hint) {
        hintBtn.style.display = '';
        hintBtn.classList.remove('exhausted');
    } else {
        hintBtn.style.display = 'none';
    }
    document.getElementById('mg-hint-text').textContent = '';

    if (typeof speak === 'function') speak(p.prompt);
}

function mgShowHint() {
    if (moduleState.activity !== 'practice' || moduleState.hintShown) return;
    const p = getCurrentProblems()[moduleState.problemIndex];
    if (!p.hint) return;
    moduleState.hintShown = true;
    document.getElementById('mg-hint-text').textContent = '💡 ' + p.hint;
    document.getElementById('mg-hint-btn').classList.add('exhausted');
    if (typeof speak === 'function') speak(p.hint);
    if (typeof playSound === 'function') playSound('click');
}

function mgTypeNumber(d) {
    if (moduleState.locked) return;
    if (moduleState.answer.length < 3) {
        moduleState.answer += d;
        document.getElementById('mg-answer').textContent = moduleState.answer;
    }
}
function mgDeleteNumber() {
    if (moduleState.locked) return;
    moduleState.answer = moduleState.answer.slice(0, -1);
    document.getElementById('mg-answer').textContent = moduleState.answer;
}

function mgPickChoice(idx) {
    if (moduleState.locked) return;
    const p = getCurrentProblems()[moduleState.problemIndex];
    if (p.type !== 'choice') return;
    const correct = (idx === p.answerIndex);
    moduleState.answer = String(idx);
    if (correct) handleCorrect(); else handleWrong();
}

function mgCheckAnswer() {
    if (moduleState.locked || moduleState.answer === '') return;
    const p = getCurrentProblems()[moduleState.problemIndex];
    if (p.type === 'numeric') {
        const correct = (parseInt(moduleState.answer, 10) === p.answer);
        if (correct) handleCorrect(); else handleWrong();
    }
}

function handleCorrect() {
    if (typeof playSound === 'function') playSound('correct');
    moduleState.streak++;
    moduleState.bestStreak = Math.max(moduleState.bestStreak, moduleState.streak);
    moduleState.correct++;
    moduleState.score += 10;

    if (moduleState.activity === 'quiz' && typeof currentUser !== 'undefined' && currentUser === 'hakan') {
        moduleState.sessionRobux += ROBUX_PER_QUIZ_CORRECT;
        if (typeof saveRobux === 'function' && typeof loadRobux === 'function') {
            saveRobux(loadRobux() + ROBUX_PER_QUIZ_CORRECT);
        }
    }

    const msg = (typeof MESSAGES !== 'undefined') ? randomChoice(MESSAGES.correct) : 'Great!';
    showMGFeedback('correct', msg);
    if (typeof speak === 'function') speak(msg);
    moduleState.locked = true;
    setTimeout(() => advanceModuleProblem(), 1500);
}

function handleWrong() {
    if (typeof playSound === 'function') playSound('wrong');
    moduleState.streak = 0;
    const msg = (typeof MESSAGES !== 'undefined') ? randomChoice(MESSAGES.wrong) : 'Try again!';
    showMGFeedback('wrong', msg);
    if (typeof speak === 'function') speak(msg);
    moduleState.answer = '';
    document.getElementById('mg-answer').textContent = '';
}

function showMGFeedback(kind, msg) {
    const overlay = document.getElementById('mg-feedback-overlay');
    const content = document.getElementById('mg-feedback-content');
    if (!overlay || !content) return;
    content.textContent = (kind === 'correct' ? '✅ ' : '🤔 ') + msg;
    content.className = 'feedback-content ' + (kind === 'correct' ? 'fb-correct' : 'fb-wrong');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('hidden'), 1200);
}

function advanceModuleProblem() {
    moduleState.locked = false;
    moduleState.problemIndex++;
    const total = getCurrentProblems().length;
    if (moduleState.problemIndex >= total) {
        showModuleResults();
    } else {
        renderModuleProblem();
    }
}

function showModuleResults() {
    const mod = MODULES_BY_ID[moduleState.moduleId];
    const total = getCurrentProblems().length;
    const accuracy = moduleState.correct / total;
    const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
    const isQuiz = moduleState.activity === 'quiz';

    document.getElementById('results-title').textContent =
        isQuiz ? `🎉 Quiz Complete! 🎉` : `🎯 Practice Complete!`;
    document.getElementById('final-score').textContent = moduleState.score;
    document.getElementById('final-correct').textContent = `${moduleState.correct} / ${total}`;
    document.getElementById('final-streak').textContent = moduleState.bestStreak;
    document.getElementById('star-rating').innerHTML = '⭐'.repeat(stars) + '<span class="dim-star">⭐</span>'.repeat(3 - stars);

    if (isQuiz && typeof currentUser !== 'undefined' && currentUser === 'hakan' && moduleState.sessionRobux > 0) {
        document.getElementById('robux-results').style.display = '';
        document.getElementById('robux-session').textContent = moduleState.sessionRobux.toFixed(2);
        document.getElementById('robux-total-result').textContent = (typeof loadRobux === 'function' ? loadRobux() : 0).toFixed(2);
    } else {
        document.getElementById('robux-results').style.display = 'none';
    }

    showScreen('results-screen');

    // After Practice, the "Play Again" button becomes "Take the Quiz!" so
    // the natural progression is practice → quiz. After the Quiz it just
    // restarts the quiz.
    const playBtn = document.querySelector('.play-again-btn');
    if (playBtn) {
        if (moduleState.activity === 'practice') {
            playBtn.innerHTML = '⭐ Take the Quiz!';
            window.__lastModuleStarter = function () { startGenericProblems(mod, 'quiz'); };
        } else {
            playBtn.innerHTML = '🔄 Play Again';
            window.__lastModuleStarter = function () { startGenericProblems(mod, 'quiz'); };
        }
    } else {
        window.__lastModuleStarter = function () { startGenericProblems(mod, moduleState.activity); };
    }
}

// ----------------------------------------------------------------------
// On page load, populate the module grid. Scripts are at the end of
// body, so the DOM is already parsed by the time this runs.
// ----------------------------------------------------------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHomeModules);
} else {
    renderHomeModules();
}
