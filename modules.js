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
        kind: 'generic',
        description: 'Count up, count down, and find missing numbers.',
        lesson: [
            {
                title: 'Counting Up!',
                visual: { type: 'numberline', from: 1, to: 10 },
                text: 'When we count, each new number is one more than the last. One, two, three, four, five.',
                caption: 'Each step is one more!',
            },
            {
                title: 'Counting by Tens',
                visual: { type: 'numberline', from: 10, to: 100 },
                text: 'We can count by tens to reach big numbers fast. Ten, twenty, thirty, forty, fifty.',
                caption: '10, 20, 30, 40, 50…',
            },
            {
                title: "What's Missing?",
                visual: { type: 'sequence', nums: [4, 5, 6, 7, 8], missingIndex: 2 },
                text: 'Sometimes a number is missing in a row. Look at the numbers around it. Four, five, six, seven, eight.',
                caption: 'The missing number is six!',
            },
            {
                title: 'Counting Backwards!',
                visual: { type: 'numberline', from: 1, to: 10, mark: 5 },
                text: 'We can count backwards too. Each number is one less than the last. Ten, nine, eight, seven.',
                caption: 'Each step is one less!',
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
        kind: 'addsub',
        gameMode: 'addition',
        description: 'Put numbers together. Plus, count on, doubles!',
        lesson: [
            {
                title: 'Adding Things Together',
                visual: { type: 'objects', count: 5, emoji: '🍎' },
                text: 'When we add, we put two groups together. Three apples and two more apples make five apples.',
                caption: '3 + 2 = 5',
            },
            {
                title: 'The Plus Sign',
                visual: { type: 'two-digit-add', a: 3, b: 2 },
                text: 'The plus sign means and. Three plus two is five.',
                caption: 'Plus means and!',
            },
            {
                title: 'Count On',
                visual: { type: 'numberline', from: 1, to: 10, mark: 8 },
                text: 'When we add, we can start with the bigger number and count up. Five plus three. Five, six, seven, eight!',
                caption: 'Start big, count on!',
            },
            {
                title: 'Doubles!',
                visual: { type: 'objects', count: 10, emoji: '⭐' },
                text: 'Doubles are easy to remember. Five plus five is ten. Six plus six is twelve.',
                caption: 'Doubles are powers!',
            },
        ],
    },

    // -------- 3. SUBTRACTION (delegates) --------
    {
        id: 'subtraction',
        title: 'Subtraction within 20',
        emoji: '➖',
        order: 3,
        kind: 'addsub',
        gameMode: 'subtraction',
        description: 'Take some away. Minus, count back!',
        lesson: [
            {
                title: 'Taking Away',
                visual: { type: 'objects', count: 3, emoji: '🍪' },
                text: 'When we take some away, we subtract. Five cookies. Two are eaten. Three are left.',
                caption: '5 − 2 = 3',
            },
            {
                title: 'The Minus Sign',
                visual: { type: 'two-digit-add', a: 5, b: 2 },
                text: 'The minus sign means take away. Five minus two is three.',
                caption: 'Minus means take away!',
            },
            {
                title: 'Count Back',
                visual: { type: 'numberline', from: 1, to: 10, mark: 5 },
                text: 'Start at the big number and count back. Eight minus three. Eight, seven, six, five!',
                caption: 'Count backwards!',
            },
            {
                title: 'Add and Subtract are Buddies',
                visual: { type: 'objects', count: 8, emoji: '🌟' },
                text: 'Adding and subtracting are opposites. If three plus five is eight, then eight minus five is three.',
                caption: 'Opposites attract!',
            },
        ],
    },

    // -------- 4. FACT FAMILIES (delegates) --------
    {
        id: 'fact-families',
        title: 'Fact Families',
        emoji: '🔺',
        order: 4,
        kind: 'factfamily',
        description: 'Three numbers, four facts. The math superpower!',
        lesson: [
            {
                title: "What's a Fact Family?",
                visual: { type: 'objects', count: 3, emoji: '🔺' },
                text: 'Three numbers can make a fact family. Three, five, and eight all go together.',
                caption: 'Three numbers, one family!',
            },
            {
                title: 'Four Facts',
                visual: { type: 'sequence', nums: [3, 5, 8], missingIndex: -1 },
                text: 'Each family makes four math facts. Three plus five is eight. Five plus three is eight. Eight minus three is five. Eight minus five is three.',
                caption: '4 facts from 3 numbers!',
            },
            {
                title: 'The Triangle',
                visual: { type: 'shape', name: 'triangle' },
                text: 'We can draw a fact family in a triangle. The big number sits at the top. The two small numbers sit at the bottom.',
                caption: 'Triangle of friends!',
            },
            {
                title: 'A Math Superpower',
                visual: { type: 'bignum', n: 8 },
                text: 'If you know one fact in a family, you know them all. That is a math superpower!',
                caption: 'Know one, know four!',
            },
        ],
    },

    // -------- 5. PLACE VALUE --------
    {
        id: 'place-value',
        title: 'Place Value',
        emoji: '🧱',
        order: 5,
        kind: 'generic',
        description: 'Tens and ones — what each digit means.',
        lesson: [
            {
                title: 'Meet the Tens!',
                visual: { type: 'blocks', tens: 1, ones: 0 },
                text: 'When you have ten ones all together, you can group them into one ten. The tall blue bar is one ten. It has ten little squares stacked up.',
                caption: '1 ten = 10 ones',
            },
            {
                title: 'Tens and Ones Together',
                visual: { type: 'blocks', tens: 2, ones: 3 },
                text: 'Two-digit numbers have tens and ones. This picture shows two tens and three ones.',
                caption: '2 tens + 3 ones = 23',
            },
            {
                title: 'Reading the Number',
                visual: { type: 'blocks', tens: 4, ones: 7 },
                text: 'Count the tens first, then the ones. Four tens make forty. Then add seven more.',
                caption: '40 + 7 = 47',
            },
            {
                title: 'What about zero ones?',
                visual: { type: 'blocks', tens: 6, ones: 0 },
                text: 'If there are no orange ones, the number ends in zero. Six tens with zero ones is just sixty.',
                caption: '6 tens + 0 ones = 60',
            },
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
        kind: 'generic',
        description: 'Greater than, less than, or equal? You decide!',
        lesson: [
            {
                title: 'Which is Bigger?',
                visual: { type: 'compare-pair', a: 7, b: 3 },
                text: 'When we compare numbers, we find which is bigger, smaller, or the same. Seven is bigger than three.',
                caption: 'Bigger or smaller?',
            },
            {
                title: 'The Hungry Alligator',
                visual: { type: 'compare-pair', a: 7, b: 3 },
                text: 'The greater than sign looks like an alligator mouth. The mouth always opens to eat the bigger number. Seven is greater than three.',
                caption: '7 > 3',
            },
            {
                title: 'Less Than',
                visual: { type: 'compare-pair', a: 3, b: 7 },
                text: 'Same alligator, opposite direction. Three is less than seven.',
                caption: '3 < 7',
            },
            {
                title: 'Equal',
                visual: { type: 'compare-pair', a: 5, b: 5 },
                text: 'When two numbers are the same, we use the equal sign. Five equals five.',
                caption: '5 = 5',
            },
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
        kind: 'generic',
        description: 'Add a small number to a bigger one.',
        lesson: [
            {
                title: 'Adding to a Big Number',
                visual: { type: 'two-digit-add', a: 23, b: 5 },
                text: 'We can add a small number to a bigger one. Twenty-three plus five.',
                caption: '23 + 5 = ?',
            },
            {
                title: 'Just Add the Ones',
                visual: { type: 'two-digit-num', n: 23, highlight: 'ones' },
                text: 'Look at the ones place. Twenty-three has three ones. Three plus five is eight.',
                caption: '3 + 5 = 8',
            },
            {
                title: 'Keep the Tens',
                visual: { type: 'blocks', tens: 2, ones: 8 },
                text: 'The tens stay the same. Twenty-three plus five is twenty-eight!',
                caption: '23 + 5 = 28',
            },
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
        kind: 'generic',
        description: 'Read a clock — hour and half-hour.',
        lesson: [
            {
                title: 'The Clock',
                visual: { type: 'clock', hour: 3, minute: 0 },
                text: 'A clock has two hands. The short hand shows the hour. The long hand shows the minutes.',
                caption: 'Two hands, one clock!',
            },
            {
                title: "O'Clock",
                visual: { type: 'clock', hour: 3, minute: 0 },
                text: 'When the long hand points to twelve, we say o-clock. This shows three o-clock.',
                caption: '3 o’clock',
            },
            {
                title: 'Half Past',
                visual: { type: 'clock', hour: 3, minute: 30 },
                text: 'When the long hand points to six, we say half past. This shows half past three.',
                caption: 'Half past 3',
            },
            {
                title: 'Reading the Time',
                visual: { type: 'clock', hour: 7, minute: 30 },
                text: 'First look at the short hand for the hour. Then look at the long hand. This is half past seven.',
                caption: 'Half past 7',
            },
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
        kind: 'generic',
        description: 'Circles, squares, triangles — and equal parts!',
        lesson: [
            {
                title: 'Shapes Around Us',
                visual: { type: 'shape', name: 'circle' },
                text: 'A circle is round. A square has four equal sides. A triangle has three sides. Shapes are everywhere!',
                caption: 'Look for shapes!',
            },
            {
                title: 'Halves',
                visual: { type: 'fraction', shape: 'circle', parts: 2, filled: 1 },
                text: 'When we cut something into two equal parts, each part is one half.',
                caption: 'Two equal parts!',
            },
            {
                title: 'Fourths',
                visual: { type: 'fraction', shape: 'square', parts: 4, filled: 1 },
                text: 'When we cut something into four equal parts, each part is one fourth. Some people call them quarters.',
                caption: 'Four equal parts!',
            },
            {
                title: 'Must Be Equal!',
                visual: { type: 'fraction', shape: 'square', parts: 4, filled: 4 },
                text: 'Halves and fourths must always be the same size. Equal parts!',
                caption: 'Equal means same!',
            },
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
        kind: 'generic',
        description: 'Math stories. Find the numbers and solve!',
        lesson: [
            {
                title: 'Story Math',
                visual: { type: 'objects', count: 5, emoji: '🍎' },
                text: 'Hakan has three apples. He gets two more. How many in all? That is a math story.',
                caption: 'Read the story!',
            },
            {
                title: 'Find the Numbers',
                visual: { type: 'sequence', nums: [3, 2], missingIndex: -1 },
                text: 'Look for the numbers in the story. Three and two. Those are our numbers.',
                caption: '3 and 2',
            },
            {
                title: 'Add or Subtract?',
                visual: { type: 'two-digit-add', a: 3, b: 2 },
                text: 'Did Hakan get more apples or lose some? Got more means add. Lost means subtract. Three plus two is five!',
                caption: '3 + 2 = 5',
            },
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

function renderHomeModules() {
    const grid = document.getElementById('module-grid');
    if (!grid) return;
    const sorted = MODULES.slice().sort((a, b) => a.order - b.order);
    grid.innerHTML = sorted.map((m, i) => `
        <button class="m-card" onclick="selectModule('${m.id}')">
            <span class="m-card-num">${i + 1}</span>
            <span class="m-card-icon">${m.emoji}</span>
            <span class="m-card-title">${m.title}</span>
            <span class="m-card-desc">${m.description}</span>
        </button>
    `).join('');
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
    // Wire Play Again to restart the same activity
    window.__lastModuleStarter = function () { startGenericProblems(mod, moduleState.activity); };
}

// ----------------------------------------------------------------------
// On page load, populate the module grid
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', renderHomeModules);
