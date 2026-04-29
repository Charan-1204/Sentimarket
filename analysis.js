/* ╔══════════════════════════════════════════════════
   ║  SentiMarket — Advanced Trading Engine  v2.0
   ║  Modular stores · AI engine · Persistent state
   ╚══════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════
   §1  MODULAR STORES
══════════════════════════════════════ */
const ChartStore = {
    chart: null, candleSeries: null, ema20: null, ema50: null, volSeries: null, volChart: null,
    asset: 'DOGE', tf: '5D', data: [], indicators: { ema20: true, ema50: true, vol: true },
};

const DrawingStore = {
    drawings: [],          // { id, type, points:[{x,y}], color, locked, label }
    selected: null,        // id of selected drawing
    tool: 'crosshair',
    locked: false,
    magnetic: false,
    // Fibonacci two-click state
    fibPhase: 0,           // 0=idle, 1=waiting second click
    fibStart: null,
    // Brush state
    brushPath: [],
    drawing: false,
    nextId: 1,
    // RAF handle
    rafHandle: null,
    dirty: true,           // schedule redraw
    save() {
        const key = `sm_drawings_${ChartStore.asset}_${ChartStore.tf}`;
        localStorage.setItem(key, JSON.stringify(this.drawings));
    },
    load() {
        const key = `sm_drawings_${ChartStore.asset}_${ChartStore.tf}`;
        const raw = localStorage.getItem(key);
        this.drawings = raw ? JSON.parse(raw) : [];
        this.dirty = true;
    },
    add(d) { d.id = this.nextId++; this.drawings.push(d); this.dirty = true; this.save(); },
    update(id, patch) {
        const d = this.drawings.find(x => x.id === id);
        if (d) { Object.assign(d, patch); this.dirty = true; this.save(); }
    },
    remove(id) {
        this.drawings = this.drawings.filter(x => x.id !== id);
        if (this.selected === id) this.selected = null;
        this.dirty = true; this.save();
    },
};

const PortfolioStore = {
    _key: 'sm_portfolio',
    _load() { return JSON.parse(localStorage.getItem(this._key) || 'null'); },
    _save(s) { localStorage.setItem(this._key, JSON.stringify(s)); },
    get() {
        return this._load() || { balance: 10000, positions: [], orders: [], history: [] };
    },
    set(s) { this._save(s); },
    patch(fn) { const s = this.get(); fn(s); this._save(s); },
};

const OrderStore = { side: 'buy', type: 'market' };

const AIStore = {
    _key: 'sm_ai',
    enabled: false,
    strategy: 'ema_cross',
    risk: 'medium',
    maxDaily: 5,
    tradesThisDay: 0,
    intervalHandle: null,
    log: [],
    get() { return JSON.parse(localStorage.getItem(this._key) || '[]'); },
    addLog(entry) {
        const log = this.get();
        log.unshift({ ...entry, timestamp: new Date().toISOString() });
        localStorage.setItem(this._key, JSON.stringify(log.slice(0, 200)));
    },
};

/* ══════════════════════════════════════
   §2  ASSET DATA
══════════════════════════════════════ */
const ASSETS = {
    DOGE: { price: 0.1842, chg: 5.32, base: 0.155 },
    BTC: { price: 67420, chg: 2.41, base: 62000 },
    ETH: { price: 3510, chg: 1.83, base: 3300 },
    SOL: { price: 182.4, chg: 3.12, base: 170 },
    PEPE: { price: 0.0000142, chg: 12.7, base: 0.0000108 },
    AVAX: { price: 38.9, chg: -1.24, base: 36 },
};

function fmtPrice(asset, p) {
    if (p < 0.0001) return '$' + p.toFixed(8);
    if (p < 1) return '$' + p.toFixed(4);
    if (p < 1000) return '$' + p.toFixed(2);
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ══════════════════════════════════════
   §3  DATA GENERATION + EMA
══════════════════════════════════════ */
async function loadCoinDeskData(asset, tf) {
    const provider = window.SentiPrimaryData || window.SentiMarketData;
    if (!provider) throw new Error('Market data client unavailable');
    const options = window.SentiMarketData?.historyOptionsForTimeframe(tf) || {};
    const rows = provider === window.SentiPrimaryData
        ? await provider.getCandles(asset, { timeframe: tf })
        : await provider.getCandles(asset, options);
    const ohlcv = rows.map(row => ({ time: row.time, open: row.open, high: row.high, low: row.low, close: row.close }));
    const vols = rows.map(row => ({
        time: row.time,
        value: row.volume || 0,
        color: row.close >= row.open ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)',
    }));
    return { ohlcv, vols };
}
function calcEMA(data, n) {
    if (!Array.isArray(data) || !data.length) return [];
    const k = 2 / (n + 1); let e = data[0].close;
    return data.map((d, i) => { if (i > 0) e = d.close * k + e * (1 - k); return { time: d.time, value: e }; });
}
function calcRSI(data, n = 14) {
    const res = [];
    for (let i = n; i < data.length; i++) {
        let ag = 0, al = 0;
        for (let j = i - n; j < i; j++) {
            const d = data[j + 1].close - data[j].close;
            if (d > 0) ag += d; else al += Math.abs(d);
        }
        ag /= n; al /= n;
        res.push({ time: data[i].time, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
    }
    return res;
}

/* ══════════════════════════════════════
   §4  LIGHTWEIGHT CHARTS INIT
══════════════════════════════════════ */
const chartEl = document.getElementById('lwChart');
const volEl = document.getElementById('lwVolume');
function cssVar(name) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
}

ChartStore.chart = LightweightCharts.createChart(chartEl, {
    layout: {
        background: { color: cssVar('--bg-card') },
        textColor: cssVar('--text-dim')
    },
    grid: { vertLines: { color: 'rgba(255,255,255,.04)' }, horzLines: { color: 'rgba(255,255,255,.04)' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: cssVar('--border') },
    timeScale: { borderColor: cssVar('--border'), timeVisible: true },
    handleScale: { mouseWheel: true, pinch: true },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
});
ChartStore.volChart = LightweightCharts.createChart(volEl, {
    layout: {
        background: { color: cssVar('--bg-card') },
        textColor: cssVar('--text-dim')
    },
    grid: { vertLines: { color: 'rgba(255,255,255,.02)' }, horzLines: { color: 'rgba(255,255,255,.02)' } },
    rightPriceScale: { borderColor: cssVar('--border') },
    timeScale: { borderColor: cssVar('--border'), timeVisible: true },
    handleScale: { mouseWheel: true },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
});
ChartStore.candleSeries = ChartStore.chart.addCandlestickSeries({
    upColor: '#22c55e', downColor: '#ef4444',
    borderUpColor: '#22c55e', borderDownColor: '#ef4444',
    wickUpColor: '#22c55e', wickDownColor: '#ef4444',
});
ChartStore.ema20 = ChartStore.chart.addLineSeries({ color: 'rgba(59,130,246,.85)', lineWidth: 1, title: 'EMA 20' });
ChartStore.ema50 = ChartStore.chart.addLineSeries({ color: 'rgba(249,115,22,.85)', lineWidth: 1, title: 'EMA 50' });
ChartStore.volSeries = ChartStore.volChart.addHistogramSeries({
    priceFormat: { type: 'volume' }, priceScaleId: '', color: 'rgba(34,197,94,.35)',
});

async function loadChart(asset, tf) {
    try {
        const { ohlcv, vols } = await loadCoinDeskData(asset, tf);
        ChartStore.data = ohlcv;
        ChartStore.candleSeries.setData(ohlcv);
        ChartStore.ema20.setData(calcEMA(ohlcv, 20));
        ChartStore.ema50.setData(calcEMA(ohlcv, 50));
        ChartStore.volSeries.setData(vols);
        ChartStore.chart.timeScale().fitContent();
        ChartStore.volChart.timeScale().fitContent();
        if (ohlcv.length) {
            const latest = ohlcv[ohlcv.length - 1];
            const previous = ohlcv[ohlcv.length - 2] || latest;
            ASSETS[asset].price = latest.close;
            ASSETS[asset].base = previous.close;
            ASSETS[asset].chg = previous.close ? ((latest.close - previous.close) / previous.close) * 100 : 0;
        }
        updatePriceTag(ASSETS[asset].price);
        updateSummary();
        DrawingStore.load();
    } catch (error) {
        showToast(`CoinDesk data unavailable for ${asset}`, 'error');
    }
}

/* ══════════════════════════════════════
   §5  CANVAS DRAWING ENGINE (RAF)
══════════════════════════════════════ */
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const HANDLE_R = 6;
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
const FIB_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#22c55e'];

function resizeCanvas() {
    const r = chartEl.parentElement.getBoundingClientRect();
    canvas.width = r.width; canvas.height = r.height;
    DrawingStore.dirty = true;
}

/* RAF loop */
function rafLoop() {
    if (DrawingStore.dirty) {
        renderDrawings();
        DrawingStore.dirty = false;
    }
    DrawingStore.rafHandle = requestAnimationFrame(rafLoop);
}

function renderDrawings(preview) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = [...DrawingStore.drawings, ...(preview ? [preview] : [])];
    all.forEach(d => drawShape(d, d.id === DrawingStore.selected));
}

function drawShape(d, selected) {
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.font = 'bold 10px Inter,sans-serif';

    if (d.type === 'trendline' && d.points.length >= 2) {
        ctx.strokeStyle = d.color || 'rgba(34,197,94,.9)';
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        ctx.lineTo(d.points[1].x, d.points[1].y);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(d.points[1].y - d.points[0].y, d.points[1].x - d.points[0].x);
        ctx.fillStyle = d.color || 'rgba(34,197,94,.9)';
        ctx.beginPath();
        ctx.moveTo(d.points[1].x, d.points[1].y);
        ctx.lineTo(d.points[1].x - 10 * Math.cos(angle - .35), d.points[1].y - 10 * Math.sin(angle - .35));
        ctx.lineTo(d.points[1].x - 10 * Math.cos(angle + .35), d.points[1].y - 10 * Math.sin(angle + .35));
        ctx.closePath(); ctx.fill();
        if (selected) { d.points.forEach(p => drawHandle(p)); }

    } else if (d.type === 'hline' && d.points.length >= 1) {
        ctx.strokeStyle = 'rgba(251,191,36,.8)';
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(0, d.points[0].y); ctx.lineTo(canvas.width, d.points[0].y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(251,191,36,.9)'; ctx.font = '10px var(--mono)';
        ctx.fillText(d.label || '', 4, d.points[0].y - 4);
        if (selected) drawHandle(d.points[0]);

    } else if (d.type === 'rect' && d.points.length >= 2) {
        const [a, b] = d.points;
        ctx.strokeStyle = 'rgba(34,197,94,.8)'; ctx.fillStyle = 'rgba(34,197,94,.06)';
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        if (selected) { d.points.forEach(p => drawHandle(p)); }

    } else if (d.type === 'fib' && d.points.length >= 2) {
        const [a, b] = d.points;
        const dy = b.y - a.y;
        FIB_LEVELS.forEach((lvl, i) => {
            const y = a.y + dy * lvl;
            ctx.strokeStyle = FIB_COLORS[i]; ctx.lineWidth = .8; ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(Math.min(a.x, b.x), y); ctx.lineTo(canvas.width - 60, y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = FIB_COLORS[i]; ctx.font = 'bold 10px Inter,sans-serif';
            ctx.fillText(`${(lvl * 100).toFixed(1)}%`, canvas.width - 56, y - 2);
        });
        if (selected) { d.points.forEach(p => drawHandle(p, FIB_COLORS[0])); }

    } else if (d.type === 'brush' && d.points.length >= 2) {
        ctx.strokeStyle = 'rgba(251,191,36,.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.points[0].x, d.points[0].y);
        d.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();

    } else if (d.type === 'text' && d.points.length >= 1) {
        ctx.fillStyle = 'rgba(251,191,36,.9)'; ctx.font = 'bold 12px Inter,sans-serif';
        ctx.fillText(d.label || '', d.points[0].x, d.points[0].y);
    }
    ctx.restore();
}

function drawHandle(pt, color = 'rgba(34,197,94,.9)') {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = '#0d1117'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, HANDLE_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
}

/* ══════════════════════════════════════
   §6  MOUSE INTERACTION — DRAWING
══════════════════════════════════════ */
function ptFromEvent(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

/* Drag state */
let dragState = null; // { drawingId, pointIdx }
let previewShape = null;

function hitTestHandle(pt) {
    for (let i = DrawingStore.drawings.length - 1; i >= 0; i--) {
        const d = DrawingStore.drawings[i];
        if (d.locked) continue;
        for (let j = 0; j < d.points.length; j++) {
            if (dist(pt, d.points[j]) <= HANDLE_R + 3) return { drawingId: d.id, pointIdx: j };
        }
    }
    return null;
}

function hitTestShape(pt) {
    for (let i = DrawingStore.drawings.length - 1; i >= 0; i--) {
        const d = DrawingStore.drawings[i];
        if (d.type === 'trendline' && d.points.length >= 2) {
            if (ptToLineSegDist(pt, d.points[0], d.points[1]) < 6) return d.id;
        } else if (d.type === 'hline' && d.points.length >= 1) {
            if (Math.abs(pt.y - d.points[0].y) < 6) return d.id;
        } else if (d.type === 'fib' && d.points.length >= 2) {
            const [a, b] = d.points; const dy = b.y - a.y;
            if (FIB_LEVELS.some(lvl => Math.abs(pt.y - (a.y + dy * lvl)) < 5)) return d.id;
        }
    }
    return null;
}

function ptToLineSegDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    if (len2 === 0) return dist(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

canvas.addEventListener('mousedown', e => {
    if (DrawingStore.locked && DrawingStore.tool === 'crosshair') return;
    const pt = ptFromEvent(e);
    const tool = DrawingStore.tool;

    // Crosshair = selection mode
    if (tool === 'crosshair') {
        const hit = hitTestHandle(pt);
        if (hit) { dragState = hit; DrawingStore.selected = hit.drawingId; DrawingStore.dirty = true; return; }
        const sid = hitTestShape(pt);
        DrawingStore.selected = sid || null; DrawingStore.dirty = true;
        return;
    }
    if (DrawingStore.locked) return;

    if (tool === 'zoom') { ChartStore.chart.timeScale().fitContent(); return; }
    if (tool === 'text') { showTextInput(pt); return; }

    if (tool === 'eraser') { performErase(pt); DrawingStore.drawing = true; return; }

    if (tool === 'fib') {
        if (DrawingStore.fibPhase === 0) {
            DrawingStore.fibStart = pt; DrawingStore.fibPhase = 1;
            showToast('Click second point to complete Fibonacci', 'info');
        } else {
            DrawingStore.add({ type: 'fib', points: [DrawingStore.fibStart, pt], color: '#8b5cf6', locked: false });
            DrawingStore.fibPhase = 0; DrawingStore.fibStart = null;
            previewShape = null; DrawingStore.dirty = true;
        }
        return;
    }

    DrawingStore.drawing = true;
    if (tool === 'brush') { DrawingStore.brushPath = [pt]; }
    else { previewShape = { type: tool, points: [pt, pt], color: 'rgba(34,197,94,.9)', locked: false }; }
});

canvas.addEventListener('mousemove', e => {
    const pt = ptFromEvent(e);

    // Drag handle
    if (dragState) {
        DrawingStore.update(dragState.drawingId, {
            points: (() => {
                const d = DrawingStore.drawings.find(x => x.id === dragState.drawingId);
                if (!d) return [];
                const pts = [...d.points];
                pts[dragState.pointIdx] = { ...pt };
                if (d.type === 'hline') pts[0] = { x: 0, y: pt.y };
                return pts;
            })()
        });
        DrawingStore.dirty = true; return;
    }

    // Fib preview
    if (DrawingStore.fibPhase === 1 && DrawingStore.fibStart) {
        previewShape = { type: 'fib', points: [DrawingStore.fibStart, pt], color: '#8b5cf6', locked: false };
        DrawingStore.dirty = true; return;
    }

    if (!DrawingStore.drawing) return;
    const tool = DrawingStore.tool;
    if (tool === 'eraser') { performErase(pt); return; }
    if (tool === 'brush') {
        DrawingStore.brushPath.push(pt);
        previewShape = { type: 'brush', points: [...DrawingStore.brushPath], locked: false };
    } else if (previewShape) {
        previewShape.points = [previewShape.points[0], pt];
    }
    DrawingStore.dirty = true;
});

canvas.addEventListener('mouseup', e => {
    if (dragState) { dragState = null; return; }
    if (!DrawingStore.drawing) return;
    DrawingStore.drawing = false;
    const pt = ptFromEvent(e);
    const tool = DrawingStore.tool;
    if (tool === 'brush' && DrawingStore.brushPath.length > 1) {
        DrawingStore.add({ type: 'brush', points: [...DrawingStore.brushPath], locked: false });
    } else if (previewShape && (tool === 'trendline' || tool === 'hline' || tool === 'rect')) {
        const pts = tool === 'hline' ? [{ x: 0, y: previewShape.points[0].y }] : [previewShape.points[0], pt];
        DrawingStore.add({
            type: tool, points: pts, color: previewShape.color, locked: false,
            label: tool === 'hline' ? fmtPrice(ChartStore.asset, ASSETS[ChartStore.asset].price) : ''
        });
    }
    previewShape = null; DrawingStore.dirty = true;
});

canvas.addEventListener('mouseleave', () => { if (DrawingStore.drawing) { DrawingStore.drawing = false; previewShape = null; DrawingStore.dirty = true; } });

/* Keyboard: Delete selected */
document.addEventListener('keydown', e => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && DrawingStore.selected && document.activeElement === document.body) {
        DrawingStore.remove(DrawingStore.selected); showToast('Drawing deleted', 'success');
    }
    if (e.key === 'Escape') { DrawingStore.selected = null; DrawingStore.dirty = true; DrawingStore.fibPhase = 0; previewShape = null; if (DrawingStore.tool === 'eraser') setTool(document.querySelector('.tool-btn[data-tool="crosshair"]'), 'crosshair'); }
    if (e.key.toLowerCase() === 'e' && document.activeElement === document.body) {
        const btn = document.querySelector('.tool-btn[data-tool="eraser"]');
        if (btn) setTool(btn, 'eraser');
    }
});

/* RAF override — always render with preview */
function renderDrawings() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    DrawingStore.drawings.forEach(d => drawShape(d, d.id === DrawingStore.selected));
    if (previewShape) drawShape(previewShape, false);
}

/* Text input overlay */
const textInput = document.getElementById('textInput');
function showTextInput(pt) {
    const r = canvas.getBoundingClientRect();
    textInput.style.left = (pt.x + r.left + 4) + 'px';
    textInput.style.top = (pt.y + r.top - 14) + 'px';
    textInput.style.display = 'block';
    textInput.value = ''; textInput.focus();
    textInput._pt = pt;
}
textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        if (textInput.value.trim()) DrawingStore.add({ type: 'text', points: [textInput._pt], label: textInput.value.trim(), locked: false });
        textInput.style.display = 'none';
    } else if (e.key === 'Escape') textInput.style.display = 'none';
});

/* ══════════════════════════════════════
   §7  CHART RESIZE + CURSOR + CROSSHAIR
══════════════════════════════════════ */
function updateCursor() {
    const cur = {
        crosshair: 'default', trendline: 'crosshair', hline: 'row-resize',
        brush: 'cell', text: 'text', rect: 'crosshair', fib: 'crosshair', zoom: 'zoom-in',
        eraser: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9InJlZCIgc3Ryb2tlLXdpZHRoPSIyIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgc3Ryb2tlLWRhc2hhcnJheT0iMiAyIi8+PC9zdmc+IikgMTIgMTIsIGNyb3NzaGFpcg=="'
    }[DrawingStore.tool] || 'default';
    canvas.style.cursor = cur;
}

function resizeCharts() {
    const cw = chartEl.parentElement.offsetWidth, ch = chartEl.parentElement.offsetHeight;
    ChartStore.chart.applyOptions({ width: cw, height: ch });
    const vw = volEl.parentElement.offsetWidth, vh = volEl.parentElement.offsetHeight;
    ChartStore.volChart.applyOptions({ width: vw, height: vh });
    resizeCanvas();
}
window.addEventListener('resize', resizeCharts);

ChartStore.chart.subscribeCrosshairMove(param => {
    const info = document.getElementById('crosshairInfo');
    if (!info) return;
    if (!param.point) { info.style.opacity = '0'; return; }
    const bar = param.seriesData.get(ChartStore.candleSeries);
    if (!bar) { info.style.opacity = '0'; return; }
    
    info.style.opacity = '1';
    info.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center;background:rgba(15,23,42,0.8);backdrop-filter:blur(8px);padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.05);box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            <span style="color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-size:9px;">O</span> <span style="font-family:var(--mono);">${bar.open.toFixed(4)}</span>
            <span style="color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-size:9px;">H</span> <span style="font-family:var(--mono);color:#22c55e;">${bar.high.toFixed(4)}</span>
            <span style="color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-size:9px;">L</span> <span style="font-family:var(--mono);color:#ef4444;">${bar.low.toFixed(4)}</span>
            <span style="color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-size:9px;">C</span> <span style="font-family:var(--mono);">${bar.close.toFixed(4)}</span>
        </div>
    `;
});

function updatePriceTag(price) {
    const tag = document.getElementById('priceTag');
    if (!tag) return;
    const oldPrice = parseFloat(tag.getAttribute('data-last') || 0);
    tag.textContent = fmtPrice(ChartStore.asset, price);
    tag.setAttribute('data-last', price);
    tag.style.top = (chartEl.parentElement.offsetHeight * 0.45) + 'px';

    // Tick Animation
    const tb = document.getElementById('tbPrice');
    if (tb && price !== oldPrice) {
        const up = price > oldPrice;
        tb.classList.remove('tick-up', 'tick-dn');
        void tb.offsetWidth; // trigger reflow
        tb.classList.add(up ? 'tick-up' : 'tick-dn');
        setTimeout(() => tb.classList.remove('tick-up', 'tick-dn'), 400);
    }
}

/* ══════════════════════════════════════
   §8  ERASER LOGIC
   ══════════════════════════════════════ */
const ERASER_RAD = 15;

function performErase(pt) {
    let changed = false;
    let oldDrawings = [...DrawingStore.drawings];
    let newDrawings = [];

    oldDrawings.forEach(d => {
        if (d.locked) { newDrawings.push(d); return; }

        if (d.type === 'brush') {
            const segments = [];
            let current = [];
            let hit = false;
            d.points.forEach(p => {
                if (dist(p, pt) > ERASER_RAD) {
                    current.push(p);
                } else {
                    hit = true;
                    if (current.length > 1) segments.push(current);
                    current = [];
                }
            });
            if (current.length > 1) segments.push(current);

            if (hit) {
                changed = true;
                segments.forEach(seg => newDrawings.push({ ...d, id: DrawingStore.nextId++, points: seg }));
            } else {
                newDrawings.push(d);
            }
        } else if (d.type === 'trendline') {
            const hit = ptToLineSegDist(pt, d.points[0], d.points[1]) < ERASER_RAD;
            if (hit) { changed = true; } 
            else { newDrawings.push(d); }
        } else if (d.type === 'hline') {
            const hit = Math.abs(d.points[0].y - pt.y) < ERASER_RAD;
            if (hit) { changed = true; }
            else { newDrawings.push(d); }
        } else if (d.type === 'rect') {
            const [a, b] = d.points;
            const hit = pt.x > Math.min(a.x, b.x) - 5 && pt.x < Math.max(a.x, b.x) + 5 && pt.y > Math.min(a.y, b.y) - 5 && pt.y < Math.max(a.y, b.y) + 5;
            if (hit) { changed = true; }
            else { newDrawings.push(d); }
        } else if (d.type === 'fib' || d.type === 'text') {
            const hit = d.points.some(p => dist(p, pt) < ERASER_RAD + 5);
            if (hit) { changed = true; }
            else { newDrawings.push(d); }
        } else {
            newDrawings.push(d);
        }
    });

    if (changed) {
        DrawingStore.drawings = newDrawings;
        DrawingStore.dirty = true;
        DrawingStore.save();
    }
}

/* ══════════════════════════════════════
   §9  TOOLBAR ACTIONS
   ══════════════════════════════════════ */

function setTool(btn, tool) {
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    DrawingStore.tool = tool;
    DrawingStore.fibPhase = 0; DrawingStore.fibStart = null; previewShape = null;
    const drawing = tool !== 'crosshair' && tool !== 'zoom';
    canvas.classList.toggle('drawing', drawing);
    updateCursor();
}
function toggleLock() {
    DrawingStore.locked = !DrawingStore.locked;
    const btn = document.getElementById('lockBtn');
    btn.classList.toggle('active', DrawingStore.locked);
    btn.firstChild.textContent = DrawingStore.locked ? '🔒' : '🔓';
}
function clearDrawings() { DrawingStore.drawings = []; DrawingStore.dirty = true; DrawingStore.save(); showToast('All drawings cleared', 'success'); }
function setTf(btn, tf) { document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); ChartStore.tf = tf; loadChart(ChartStore.asset, tf); renderTab(currentTab); }
function toggleMagnetic() { DrawingStore.magnetic = !DrawingStore.magnetic; document.getElementById('magBtn').classList.toggle('active', DrawingStore.magnetic); }
function toggleIndicators() { const p = document.getElementById('indicatorPanel'); p.classList.toggle('open'); document.getElementById('indBtn').classList.toggle('active', p.classList.contains('open')); }
function toggleInd(btn, ind) {
    btn.classList.toggle('on'); const on = btn.classList.contains('on');
    if (ind === 'ema20') ChartStore.ema20.applyOptions({ visible: on });
    if (ind === 'ema50') ChartStore.ema50.applyOptions({ visible: on });
    if (ind === 'vol') ChartStore.volSeries.applyOptions({ visible: on });
}
function switchAsset(asset) {
    ChartStore.asset = asset;
    const a = ASSETS[asset];
    document.getElementById('tbPrice').textContent = fmtPrice(asset, a.price);
    const chgEl = document.getElementById('tbChg');
    chgEl.textContent = (a.chg >= 0 ? '▲ +' : '▼ ') + Math.abs(a.chg).toFixed(2) + '%';
    chgEl.className = 'tb-chg ' + (a.chg >= 0 ? 'up' : 'dn');
    document.getElementById('sumAsset').textContent = asset + '/USD';
    updateSummary(); loadChart(asset, ChartStore.tf); renderTab(currentTab);
}

/* ══════════════════════════════════════
   §9  ORDER PANEL
══════════════════════════════════════ */
function setOrderSide(side) {
    OrderStore.side = side;
    document.getElementById('opBuyBtn').classList.toggle('active', side === 'buy');
    document.getElementById('opSellBtn').classList.toggle('active', side === 'sell');
    
    // Also sync the new quick-action buttons
    const qBuy = document.getElementById('opQuickBuy');
    const qSell = document.getElementById('opQuickSell');
    if (qBuy) {
        qBuy.classList.toggle('active', side === 'buy');
        qBuy.classList.toggle('dimmed', side === 'sell');
    }
    if (qSell) {
        qSell.classList.toggle('active', side === 'sell');
        qSell.classList.toggle('dimmed', side === 'buy');
    }

    const btn = document.getElementById('opConfirm');
    btn.className = 'op-confirm ' + side;
    btn.textContent = 'CONFIRM ' + side.toUpperCase();
    updateSummary();
}
function setOrderType(type) {
    OrderStore.type = type;
    document.getElementById('otMarket').classList.toggle('active', type === 'market');
    document.getElementById('otLimit').classList.toggle('active', type === 'limit');
    document.getElementById('limitPriceWrap').style.display = type === 'limit' ? 'block' : 'none';
    updateSummary();
}
function updateSummary() {
    const qty = parseFloat(document.getElementById('opQty').value) || 0;
    const price = OrderStore.type === 'limit' ? (parseFloat(document.getElementById('opLimitPrice').value) || ASSETS[ChartStore.asset].price) : ASSETS[ChartStore.asset].price;
    const total = qty * price;
    document.getElementById('sumQty').textContent = qty;
    document.getElementById('sumPrice').textContent = fmtPrice(ChartStore.asset, price);
    document.getElementById('sumTotal').textContent = '$' + total.toFixed(2);
    document.getElementById('sumTotal').className = 'sum-v ' + (OrderStore.side === 'buy' ? 'up' : 'dn');
    const st = PortfolioStore.get();
    document.getElementById('opBalance').textContent = '$' + st.balance.toFixed(2);
}
function placeOrder(side, qty, asset, silent) {
    side = side || OrderStore.side; qty = qty || (parseFloat(document.getElementById('opQty').value) || 0); asset = asset || ChartStore.asset;
    const price = ASSETS[asset].price, total = qty * price;
    if (qty <= 0) { if (!silent) showToast('Invalid quantity', 'error'); return false; }
    PortfolioStore.patch(st => {
        if (side === 'buy' && total > st.balance) { if (!silent) showToast('Insufficient balance', 'error'); return; }
        const order = { id: '#' + (1000 + st.orders.length + st.history.length), asset, side, type: OrderStore.type, qty, price, total, status: 'filled', time: new Date().toLocaleTimeString() };
        if (OrderStore.type === 'market') {
            if (side === 'buy') st.balance -= total; else st.balance += total;
            _addPosition(st, order);
            st.history.push({ ...order, status: 'filled' });
        } else { order.status = 'open'; st.orders.push(order); }
    });
    if (!silent) showToast(`${side.toUpperCase()} ${qty} ${asset} @ ${fmtPrice(asset, price)}`, 'success');
    updateSummary(); renderTab(currentTab); updateCounts();
    return true;
}
function _addPosition(st, order) {
    const ex = st.positions.find(p => p.asset === order.asset && p.side === order.side);
    if (ex) { ex.qty += order.qty; ex.totalCost += order.total; ex.avgPrice = ex.totalCost / ex.qty; }
    else st.positions.push({ id: Date.now(), asset: order.asset, side: order.side, qty: order.qty, avgPrice: order.price, totalCost: order.total, entryTime: order.time });
}
function closePosition(id, partial) {
    PortfolioStore.patch(st => {
        const idx = st.positions.findIndex(p => p.id === id);
        if (idx < 0) return;
        const p = st.positions[idx];
        const closeQty = partial ? Math.floor(p.qty / 2) : p.qty;
        const cur = ASSETS[p.asset]?.price || p.avgPrice;
        const pnl = (cur - p.avgPrice) * closeQty * (p.side === 'buy' ? 1 : -1);
        st.balance += closeQty * cur + (p.side === 'sell' ? -pnl : 0);
        if (closeQty >= p.qty) st.positions.splice(idx, 1);
        else { p.qty -= closeQty; p.totalCost = p.qty * p.avgPrice; }
        st.history.push({ id: '#C' + Date.now(), asset: p.asset, side: p.side === 'buy' ? 'sell' : 'buy', qty: closeQty, price: cur, total: closeQty * cur, pnl, time: new Date().toLocaleTimeString(), status: 'closed' });
        showToast(`Position ${partial ? 'partially ' : ''}closed. P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, pnl >= 0 ? 'success' : 'error');
    });
    renderTab(currentTab); updateCounts(); updateSummary();
}
function cancelOrder(id) {
    PortfolioStore.patch(st => { st.orders = st.orders.filter(o => o.id !== id); });
    renderTab('orders'); updateCounts(); showToast('Order cancelled', 'success');
}
function quickAction(side) { setOrderSide(side.toLowerCase()); placeOrder(); }

/* ══════════════════════════════════════
   §10  LIVE PRICE UPDATES (DEBOUNCED)
══════════════════════════════════════ */
let liveInterval, lastPriceUpdate = 0;
function startLive() {
    clearInterval(liveInterval);
    liveInterval = setInterval(async () => {
        const now = Date.now();
        if (now - lastPriceUpdate < 800) return; // debounce
        lastPriceUpdate = now;
        const provider = window.SentiPrimaryData || window.SentiMarketData;
        if (!provider) return;
        try {
            const rows = await provider.getLatestBatch(Object.keys(ASSETS));
            rows.forEach(row => {
                if (!ASSETS[row.symbol]) return;
                ASSETS[row.symbol].price = row.price;
                ASSETS[row.symbol].base = row.basePrice;
                ASSETS[row.symbol].chg = row.change;
            });
        } catch (error) {
            return;
        }
        const a = ASSETS[ChartStore.asset];
        document.getElementById('tbPrice').textContent = fmtPrice(ChartStore.asset, a.price);
        updatePriceTag(a.price);
        updateSummary();
        _updateNetPnL();
        if (AIStore.enabled) runAIEngine();
    }, 1000);
}
function _updateNetPnL() {
    const st = PortfolioStore.get();
    const net = st.positions.reduce((s, p) => {
        const cur = ASSETS[p.asset]?.price || p.avgPrice;
        return s + (cur - p.avgPrice) * p.qty * (p.side === 'buy' ? 1 : -1);
    }, 0);
    document.getElementById('netPnl').textContent = (net >= 0 ? '+' : '') + '$' + net.toFixed(2);
    document.getElementById('netPnl').style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
}

/* ══════════════════════════════════════
   §11  BOTTOM TABS
══════════════════════════════════════ */
let currentTab = 'orders';
function setTab(btn, tab) {
    document.querySelectorAll('.bp-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); currentTab = tab; renderTab(tab);
}
function updateCounts() {
    const st = PortfolioStore.get();
    document.getElementById('ordCount').textContent = st.orders.length;
    document.getElementById('posCount').textContent = st.positions.length;
}
function renderTab(tab) {
    const body = document.getElementById('bpBody');
    const st = PortfolioStore.get();
    if (tab === 'orders') {
        if (!st.orders.length) { body.innerHTML = '<div class="bp-empty">No open orders</div>'; return; }
        body.innerHTML = `<table class="bp-table"><thead><tr><th>ID</th><th>Asset</th><th>Side</th><th>Type</th><th>Qty</th><th>Price</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>${st.orders.map(o => `<tr><td class="sym">${o.id}</td><td class="sym">${o.asset}/USD</td><td class="${o.side === 'buy' ? 'up' : 'dn'}">${o.side.toUpperCase()}</td><td>${o.type}</td><td>${o.qty}</td><td>${fmtPrice(o.asset, o.price)}</td><td>$${o.total.toFixed(2)}</td><td><span class="badge-pending">PENDING</span></td><td><button class="bp-cancel" onclick="cancelOrder('${o.id}')">Cancel</button></td></tr>`).join('')
            }</tbody></table>`;
    } else if (tab === 'positions') {
        if (!st.positions.length) { body.innerHTML = '<div class="bp-empty">No open positions</div>'; return; }
        body.innerHTML = `<table class="bp-table"><thead><tr><th>Asset</th><th>Side</th><th>Qty</th><th>Avg Price</th><th>Current</th><th>Unrealised P&L</th><th>Return</th><th>Status</th><th>Action</th></tr></thead><tbody>${st.positions.map(p => {
            const cur = ASSETS[p.asset]?.price || p.avgPrice;
            const pnl = (cur - p.avgPrice) * p.qty * (p.side === 'buy' ? 1 : -1);
            const ret = (pnl / p.totalCost * 100).toFixed(2);
            return `<tr><td class="sym">${p.asset}/USD</td><td class="${p.side === 'buy' ? 'up' : 'dn'}">${p.side.toUpperCase()}</td><td>${p.qty}</td><td>${fmtPrice(p.asset, p.avgPrice)}</td><td>${fmtPrice(p.asset, cur)}</td><td class="${pnl >= 0 ? 'up' : 'dn'}">${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}</td><td class="${pnl >= 0 ? 'up' : 'dn'}">${pnl >= 0 ? '+' : ''}${ret}%</td><td><span class="badge-active">ACTIVE</span></td><td><button class="bp-cancel" onclick="closePosition(${p.id})">Close</button></td></tr>`;
        }).join('')
            }</tbody></table>`;
    } else if (tab === 'history') {
        if (!st.history.length) { body.innerHTML = '<div class="bp-empty">No history yet</div>'; return; }
        body.innerHTML = `<table class="bp-table"><thead><tr><th>ID</th><th>Asset</th><th>Side</th><th>Qty</th><th>Price</th><th>Total</th><th>P&L</th><th>Status</th><th>Time</th></tr></thead><tbody>${st.history.map(o => `<tr><td class="sym">${o.id}</td><td class="sym">${o.asset}/USD</td><td class="${o.side === 'buy' ? 'up' : 'dn'}">${o.side.toUpperCase()}</td><td>${o.qty}</td><td>${fmtPrice(o.asset, o.price)}</td><td>$${o.total.toFixed(2)}</td><td class="${(o.pnl || 0) >= 0 ? 'up' : 'dn'}">${o.pnl != null ? (o.pnl >= 0 ? '+' : '') + '$' + Math.abs(o.pnl).toFixed(2) : '—'}</td><td><span class="badge-filled">FILLED</span></td><td>${o.time}</td></tr>`).join('')
            }</tbody></table>`;
    } else if (tab === 'pnl') {
        const net = st.positions.reduce((s, p) => { const cur = ASSETS[p.asset]?.price || p.avgPrice; return s + (cur - p.avgPrice) * p.qty * (p.side === 'buy' ? 1 : -1); }, 0);
        const realized = st.history.filter(h => h.pnl != null).reduce((s, h) => s + (h.pnl || 0), 0);
        body.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:12px 0">
      <div class="pnl-card">
        <div class="pnl-lbl">Account Balance</div>
        <div class="pnl-val">$${st.balance.toFixed(2)}</div>
        <div class="pnl-sub">Buying Power: 100%</div>
      </div>
      <div class="pnl-card">
        <div class="pnl-lbl">Floating Unrealized</div>
        <div class="pnl-val ${net >= 0 ? 'up' : 'dn'}">${net >= 0 ? '+' : ''}$${net.toFixed(2)}</div>
        <div class="pnl-sub">from ${st.positions.length} positions</div>
      </div>
      <div class="pnl-card">
        <div class="pnl-lbl">Total Realized P&L</div>
        <div class="pnl-val ${realized >= 0 ? 'up' : 'dn'}">${realized >= 0 ? '+' : ''}$${realized.toFixed(2)}</div>
        <div class="pnl-sub">Closed successfully</div>
      </div>
    </div>`;
    } else if (tab === 'ai_log') {
        const log = AIStore.get();
        if (!log.length) { body.innerHTML = '<div class="bp-empty">No AI trades yet</div>'; return; }
        body.innerHTML = `<table class="bp-table"><thead><tr><th>Time</th><th>Asset</th><th>Strategy</th><th>Action</th><th>Price</th><th>Qty</th><th>Result</th><th>Status</th></tr></thead><tbody>${log.slice(0, 80).map(l => `<tr><td>${new Date(l.timestamp).toLocaleTimeString()}</td><td class="sym">${l.asset}</td><td>${l.strategy}</td><td class="${l.side === 'buy' ? 'up' : 'dn'}">${l.side?.toUpperCase()}</td><td>${fmtPrice(l.asset, l.price)}</td><td>${l.qty}</td><td class="${(l.result || 0) >= 0 ? 'up' : 'dn'}">${l.result != null ? (l.result >= 0 ? '+' : '') + '$' + Math.abs(l.result).toFixed(2) : 'Pending'}</td><td><span class="badge-ai">AI-AUTO</span></td></tr>`).join('')
            }</tbody></table>`;
    }
}

// AI Panel "Explain More" Handler
document.querySelectorAll('.ais-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        showToast('🤖 AI Analysis: Momentum is shifting to the upside. EMA cross confirmed. Recommended entry: 0.178 - 0.182.', 'info');
    });
});
document.querySelectorAll('.btn-buy, .btn-sell, .op-confirm, .ais-more-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
    });
});
document.addEventListener('mousedown', function (e) {
    const target = e.target.closest('button, .hbtn, .tool-btn');
    if (!target) return;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    target.appendChild(ripple);

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    setTimeout(() => ripple.remove(), 600);
});

/* ══════════════════════════════════════
   §12  AI STRATEGY ENGINE
══════════════════════════════════════ */
const STRATEGIES = {
    ema_cross: (data) => {
        if (data.length < 52) return null;
        const e20 = calcEMA(data, 20), e50 = calcEMA(data, 50);
        const n = e20.length - 1;
        const cross = e20[n].value > e50[n].value && e20[n - 1].value <= e50[n - 1].value;
        const cross_dn = e20[n].value < e50[n].value && e20[n - 1].value >= e50[n - 1].value;
        if (cross) return 'buy';
        if (cross_dn) return 'sell';
        return null;
    },
    rsi_os: (data) => {
        const rsi = calcRSI(data, 14);
        if (!rsi.length) return null;
        const v = rsi[rsi.length - 1].value;
        if (v < 30) return 'buy';
        if (v > 70) return 'sell';
        return null;
    },
    sentiment_spike: (data) => {
        if (data.length < 2) return null;
        const last = data[data.length - 1], prev = data[data.length - 2];
        const move = prev.close ? (last.close - prev.close) / prev.close : 0;
        if (move > 0.015) return 'buy';
        if (move < -0.015) return 'sell';
        return null;
    },
    hype_breakout: (data) => {
        if (data.length < 3) return null;
        const last = data[data.length - 1], prev = data[data.length - 2];
        const vol = (last.close - prev.close) / prev.close;
        if (vol > 0.03) return 'buy';
        if (vol < -0.03) return 'sell';
        return null;
    },
};
const RISK_QTY = { low: 50, medium: 150, high: 400 };

function runAIEngine() {
    if (!AIStore.enabled) return;
    if (AIStore.tradesThisDay >= AIStore.maxDaily) return;
    const today = new Date().toDateString();
    if (AIStore._lastDay !== today) { AIStore.tradesThisDay = 0; AIStore._lastDay = today; }
    const strategy = STRATEGIES[AIStore.strategy];
    if (!strategy) return;
    const signal = strategy(ChartStore.data);
    if (!signal) return;
    const qty = RISK_QTY[AIStore.risk] || 150;
    const asset = ChartStore.asset;
    const price = ASSETS[asset].price;
    // Execute paper order using current CoinDesk-backed price
    const prevBal = PortfolioStore.get().balance;
    OrderStore.side = signal; OrderStore.type = 'market';
    const ok = placeOrder(signal, qty, asset, true);
    if (!ok) return;
    AIStore.tradesThisDay++;
    const newBal = PortfolioStore.get().balance;
    AIStore.addLog({ asset, strategy: AIStore.strategy, side: signal, price, qty, result: null });
    showAIPopup(signal, asset, price, qty);
    showToast(`🤖 AI ${signal.toUpperCase()} ${qty} ${asset} via ${AIStore.strategy}`, 'success');
    if (currentTab === 'ai_log') renderTab('ai_log');
    updateCounts();
}

function showAIPopup(side, asset, price, qty) {
    const popup = document.getElementById('aiPopup');
    if (!popup) return;
    document.getElementById('aiPopupSide').textContent = side.toUpperCase();
    document.getElementById('aiPopupSide').className = 'sum-v ' + (side === 'buy' ? 'up' : 'dn');
    document.getElementById('aiPopupAsset').textContent = `${qty} ${asset} @ ${fmtPrice(asset, price)}`;
    document.getElementById('aiPopupStrat').textContent = AIStore.strategy.replace('_', ' ');
    popup.style.display = 'block';
    setTimeout(() => popup.style.display = 'none', 4000);
}

function toggleAI() {
    AIStore.enabled = !AIStore.enabled;
    const btn = document.getElementById('aiToggleBtn');
    if (btn) { btn.textContent = AIStore.enabled ? '⏹ Stop AI' : '▶ Start AI'; btn.classList.toggle('active', AIStore.enabled); btn.classList.toggle('btn-sell', AIStore.enabled); btn.classList.toggle('btn-buy', !AIStore.enabled); }
    _syncAIDot();
    showToast(AIStore.enabled ? '🤖 AI Auto Trading ENABLED' : '🤖 AI Auto Trading STOPPED', AIStore.enabled ? 'success' : 'error');
}
function setAIStrategy(v) { AIStore.strategy = v; }
function setAIRisk(v) { AIStore.risk = v; }
function setAIMaxTrades(v) { AIStore.maxDaily = parseInt(v) || 5; }
function toggleAIPanel() {
    const panel = document.getElementById('aiPanel');
    const btn = document.getElementById('aiBtn');
    if (!panel) return;
    const open = panel.style.display === 'none' || !panel.style.display;
    panel.style.display = open ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', open);
}
function _syncAIDot() {
    const dot = document.getElementById('aiStatusDot');
    if (!dot) return;
    dot.style.background = AIStore.enabled ? '#22c55e' : 'var(--muted)';
    dot.style.boxShadow = AIStore.enabled ? '0 0 6px #22c55e' : 'none';
}

/* ══════════════════════════════════════
   §13  TOAST
══════════════════════════════════════ */
let toastTimer;
function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg; el.className = type; el.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.style.display = 'none', 3000);
}

function updateChartTheme() {
    const styles = getComputedStyle(document.documentElement);

    const bg = styles.getPropertyValue('--bg-card').trim();
    const text = styles.getPropertyValue('--text-dim').trim();
    const border = styles.getPropertyValue('--border').trim();

    ChartStore.chart.applyOptions({
        layout: {
            background: { color: bg },
            textColor: text
        },
        rightPriceScale: {
            borderColor: border
        },
        timeScale: {
            borderColor: border
        }
    });

    ChartStore.volChart.applyOptions({
        layout: {
            background: { color: bg },
            textColor: text
        }
    });
}

/* ══════════════════════════════════════
   §14  INIT
══════════════════════════════════════ */
loadChart(ChartStore.asset, ChartStore.tf);
updateChartTheme();
updateSummary();
renderTab('orders');
startLive();
rafLoop();
setTimeout(resizeCharts, 50);
setTimeout(resizeCharts, 400);
