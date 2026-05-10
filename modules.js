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
