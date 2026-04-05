'use strict';

const API_URL = 'https://bool-handheld-coverage-references.trycloudflare.com/api/focus/sessions/';

// DOM refs
const topBar         = document.getElementById('top-bar');
const topBarUsername = document.getElementById('top-bar-username');
const logoutBtn      = document.getElementById('logout-btn');

// Auth helpers
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    };
}

function logout() {
    ['accessToken', 'refreshToken', 'username'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
}

logoutBtn.addEventListener('click', logout);

// Boot: auth check then fetch
(function init() {
    if (!localStorage.getItem('accessToken')) {
        window.location.href = 'index.html';
        return;
    }
    topBarUsername.textContent = localStorage.getItem('username') || 'Observer';
    topBar.style.display = 'flex';
    fetchAndRender();
})();

// Fetch all sessions, then render everything
async function fetchAndRender() {
    try {
        const res = await fetch(API_URL, { headers: getAuthHeaders() });
        if (res.status === 401) { logout(); return; }
        const all  = await res.json();
        const done = all.filter(s => s.status === 'completed');

        renderHeroNumbers(done);
        renderContributionGrid(done, 'rolling');
        renderBarChart(done, 'month');
        renderTagBreakdown(done);
        renderRingChart(all);
        wireToggles(done);
    } catch (e) {
        console.error('Stats error:', e);
    }
}

// Date helper: 'YYYY-MM-DD' in local time
function toDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-`
         + `${String(d.getMonth() + 1).padStart(2, '0')}-`
         + `${String(d.getDate()).padStart(2, '0')}`;
}

// Build { 'YYYY-MM-DD': totalMinutes } map
function buildDateMap(sessions) {
    const map = {};
    sessions.forEach(s => {
        const key = toDateKey(new Date(s.start_time));
        map[key] = (map[key] || 0) + s.duration_minutes;
    });
    return map;
}

// Hero Numbers
function renderHeroNumbers(done) {
    const totalMins  = done.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalHours = (totalMins / 60).toFixed(1);
    const longest    = done.length ? Math.max(...done.map(s => s.duration_minutes)) : 0;

    // Streak: consecutive calendar days going back from today
    const dateMap = buildDateMap(done);
    let streak = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    while (dateMap[toDateKey(check)]) {
        streak++;
        check.setDate(check.getDate() - 1);
    }

    document.getElementById('stat-total-hours').textContent    = totalHours;
    document.getElementById('stat-total-sessions').textContent = done.length;
    document.getElementById('stat-streak').textContent         = `${streak}d`;
    document.getElementById('stat-longest').textContent        = longest;
}

// Contribution Grid
function intensityClass(mins) {
    if (mins === 0)   return 'l0';
    if (mins <= 25)   return 'l1';
    if (mins <= 60)   return 'l2';
    if (mins <= 120)  return 'l3';
    return 'l4';
}

function renderContributionGrid(done, mode) {
    const grid    = document.getElementById('contribution-grid');
    grid.innerHTML = '';

    const dateMap = buildDateMap(done);
    const today   = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate, endDate;

    if (mode === 'rolling') {
        // End: this coming Saturday
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + (6 - today.getDay()));
        // Start: Sunday exactly 52 weeks before endDate
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 364);
        startDate.setDate(startDate.getDate() - startDate.getDay());
    } else {
        // Current year: Jan 1 → Dec 31, padded to Sun–Sat boundaries
        const year = today.getFullYear();
        startDate  = new Date(year, 0, 1);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate    = new Date(year, 11, 31);
        const ld   = endDate.getDay();
        if (ld < 6) endDate.setDate(endDate.getDate() + (6 - ld));
    }

    // CSS grid: 7 rows (Sun–Sat), auto columns (weeks), filled column-by-column
    grid.style.gridTemplateRows = 'repeat(7, 13px)';
    grid.style.gridAutoColumns  = '13px';
    grid.style.gridAutoFlow     = 'column';

    const cur = new Date(startDate);
    while (cur <= endDate) {
        const key      = toDateKey(cur);
        const mins     = dateMap[key] || 0;
        const isFuture = cur > today;

        const cell       = document.createElement('div');
        cell.className   = `grid-cell ${isFuture ? 'l-future' : intensityClass(mins)}`;
        if (!isFuture) cell.title = `${key}: ${mins} min`;

        grid.appendChild(cell);
        cur.setDate(cur.getDate() + 1);
    }
}

// Bar Chart
function renderBarChart(done, period) {
    const canvas = document.getElementById('bar-chart');
    const ctx    = canvas.getContext('2d');

    // Match canvas pixel width to its CSS container width
    canvas.width = canvas.parentElement.clientWidth - 48;

    const today  = new Date();
    let labels   = [];
    let values   = [];

    if (period === 'month') {
        const year  = today.getFullYear();
        const month = today.getMonth();
        const days  = new Date(year, month + 1, 0).getDate();
        const map   = {};
        done.forEach(s => {
            const d = new Date(s.start_time);
            if (d.getFullYear() === year && d.getMonth() === month) {
                map[d.getDate()] = (map[d.getDate()] || 0) + s.duration_minutes;
            }
        });
        for (let d = 1; d <= days; d++) {
            labels.push(d);
            values.push(map[d] || 0);
        }

    } else if (period === 'week') {
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const map = {};
        done.forEach(s => {
            const key = toDateKey(new Date(s.start_time));
            map[key]  = (map[key] || 0) + s.duration_minutes;
        });
        for (let d = 0; d < 7; d++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + d);
            labels.push(dayNames[d]);
            values.push(map[toDateKey(day)] || 0);
        }

    } else if (period === 'year') {
        const year       = today.getFullYear();
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun',
                            'Jul','Aug','Sep','Oct','Nov','Dec'];
        const map = {};
        done.forEach(s => {
            const d = new Date(s.start_time);
            if (d.getFullYear() === year) {
                map[d.getMonth()] = (map[d.getMonth()] || 0) + s.duration_minutes;
            }
        });
        for (let m = 0; m < 12; m++) {
            labels.push(monthNames[m]);
            values.push(map[m] || 0);
        }
    }

    drawBarChart(ctx, canvas.width, canvas.height, labels, values);
}

function drawBarChart(ctx, W, H, labels, values) {
    const pL = 48, pR = 15, pT = 20, pB = 32;
    const chartW = W - pL - pR;
    const chartH = H - pT - pB;
    const maxVal = Math.max(...values, 1);
    const n      = values.length;
    const gap    = n > 15 ? 2 : 4;
    const barW   = (chartW - (n - 1) * gap) / n;

    ctx.clearRect(0, 0, W, H);

    // Horizontal grid lines + Y labels
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pT + chartH - (i / 4) * chartH;
        ctx.strokeStyle = 'rgba(69,162,158,0.15)';
        ctx.beginPath();
        ctx.moveTo(pL, y);
        ctx.lineTo(pL + chartW, y);
        ctx.stroke();

        ctx.fillStyle  = 'rgba(197,198,199,0.5)';
        ctx.font       = '10px Courier New';
        ctx.textAlign  = 'right';
        ctx.fillText(Math.round((i / 4) * maxVal), pL - 6, y + 3);
    }

    // Bars
    values.forEach((val, i) => {
        const x    = pL + i * (barW + gap);
        const barH = (val / maxVal) * chartH;
        const y    = pT + chartH - barH;

        if (val > 0) {
            const grad = ctx.createLinearGradient(0, y, 0, pT + chartH);
            grad.addColorStop(0, '#66fcf1');
            grad.addColorStop(1, 'rgba(69,162,158,0.3)');
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = 'rgba(69,162,158,0.08)';
        }

        ctx.beginPath();
        const drawH = Math.max(barH, val > 0 ? 3 : 0);
        // simple rounded top via arc, fallback for older browsers
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, pT + chartH - drawH, barW, drawH, [2, 2, 0, 0]);
        } else {
            ctx.rect(x, pT + chartH - drawH, barW, drawH);
        }
        ctx.fill();

        // X labels — skip some if too many bars
        const step = n > 20 ? 5 : 1;
        if (i % step === 0 || i === n - 1) {
            ctx.fillStyle  = 'rgba(197,198,199,0.55)';
            ctx.font       = '9px Courier New';
            ctx.textAlign  = 'center';
            ctx.fillText(labels[i], x + barW / 2, pT + chartH + 18);
        }
    });
}

// Tag Breakdown
function renderTagBreakdown(done) {
    const container    = document.getElementById('tag-breakdown');
    container.innerHTML = '';

    if (!done.length) {
        container.innerHTML = '<p style="opacity:0.5; font-size:0.85rem;">No sessions recorded yet.</p>';
        return;
    }

    const tagMap = {};
    done.forEach(s => {
        const tag    = s.task_tag || 'Uncategorized';
        tagMap[tag]  = (tagMap[tag] || 0) + s.duration_minutes;
    });

    const maxMins = Math.max(...Object.values(tagMap));
    const sorted  = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);

    sorted.forEach(([tag, mins]) => {
        const pct   = (mins / maxMins) * 100;
        const hours = (mins / 60).toFixed(1);

        const row = document.createElement('div');
        row.className = 'tag-row';
        row.innerHTML = `
            <div class="tag-label">${tag}</div>
            <div class="tag-bar-track">
                <div class="tag-bar-fill" style="width: ${pct}%"></div>
            </div>
            <div class="tag-value">${hours}h</div>
        `;
        container.appendChild(row);
    });
}

// Ring Chart
function renderRingChart(all) {
    const canvas    = document.getElementById('ring-chart');
    const ctx       = canvas.getContext('2d');
    const completed = all.filter(s => s.status === 'completed').length;
    const aborted   = all.length - completed;
    const total     = all.length;

    if (total === 0) return;

    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;
    const r  = Math.min(cx, cy) - 15;
    const lw = 18;
    const compAngle = (completed / total) * 2 * Math.PI;

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(69,162,158,0.15)';
    ctx.lineWidth   = lw;
    ctx.stroke();

    // Completed arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + compAngle);
    ctx.strokeStyle = '#66fcf1';
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Aborted arc
    if (aborted > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2 + compAngle, 3 * Math.PI / 2);
        ctx.strokeStyle = '#ff4c4c';
        ctx.lineWidth   = lw;
        ctx.lineCap     = 'round';
        ctx.stroke();
    }

    // Centre percentage
    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 20px Courier New';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round((completed / total) * 100)}%`, cx, cy);

    // Legend
    document.getElementById('ring-legend').innerHTML = `
        <div class="ring-legend-item">
            <span class="ring-dot" style="background:#66fcf1; box-shadow:0 0 5px #66fcf1"></span>
            Completed: ${completed}
        </div>
        <div class="ring-legend-item">
            <span class="ring-dot" style="background:#ff4c4c; box-shadow:0 0 5px #ff4c4c"></span>
            Aborted: ${aborted}
        </div>
        <div class="ring-legend-item" style="margin-top:10px; opacity:0.55; font-size:0.8rem;">
            Total sessions: ${total}
        </div>
    `;
}

// Toggle wiring
function setActive(clicked, selector) {
    document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
    clicked.classList.add('active');
}

function wireToggles(done) {
    document.getElementById('btn-rolling').addEventListener('click', function () {
        setActive(this, '#contribution-grid-container ~ * .toggle-btn, #btn-rolling, #btn-year');
        renderContributionGrid(done, 'rolling');
    });
    document.getElementById('btn-year').addEventListener('click', function () {
        setActive(this, '#btn-rolling, #btn-year');
        renderContributionGrid(done, 'year');
    });

    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', function () {
            setActive(this, '[data-period]');
            renderBarChart(done, this.dataset.period);
        });
    });
}
