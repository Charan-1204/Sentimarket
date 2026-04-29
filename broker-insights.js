/* ═══════════════════════════════════════════════
   SentiMarket – broker-insights.js
   Broker data, card rendering & forecast chart
═══════════════════════════════════════════════ */

const BROKERS = [
    {
        id: 'alphaquant',
        name: 'AlphaQuant AI',
        category: 'ai',
        categoryLabel: 'AI Broker',
        avatar: 'AQ',
        avatarColor: '#22c55e',
        strategy: 'Momentum + Sentiment',
        successRate: 71,
        wins: 142,
        losses: 58,
        assets: ['BTC', 'ETH', 'SOL'],
        lastSignal: 'BUY',
        lastSignalAsset: 'BTC',
        description: 'Uses transformer-based NLP models to fuse on-chain momentum with social sentiment signals for high-conviction entries.',
        confidence: 87,
        sparkData: [62, 65, 61, 68, 72, 70, 75, 73, 78, 71, 80, 77, 82, 79, 85],
        currentPrice: 67200,
        maxTarget: 92000,
        avgTarget: 78500,
        minTarget: 54000,
        timeframe: '3M',
        volatility: 72,
        riskLevel: 'High',
        aiExplanation: 'Whale accumulation detected across 3 exchanges, sentiment surged +32% on X/Twitter, and funding rates turned negative — a classic setup for a leveraged long squeeze reversal.',
        recommendation: 'BUY',
    },
    {
        id: 'nexusflow',
        name: 'NexusFlow Capital',
        category: 'institutional',
        categoryLabel: 'Institutional',
        avatar: 'NF',
        avatarColor: '#3b82f6',
        strategy: 'Macro + On-Chain Flow',
        successRate: 68,
        wins: 204,
        losses: 96,
        assets: ['BTC', 'ETH', 'AVAX'],
        lastSignal: 'HOLD',
        lastSignalAsset: 'ETH',
        description: 'Tracks institutional wallet flows and macro indicators including DXY correlation to time large-cap crypto moves.',
        confidence: 74,
        sparkData: [55, 58, 57, 60, 62, 59, 65, 63, 66, 68, 65, 70, 67, 72, 69],
        currentPrice: 3450,
        maxTarget: 4800,
        avgTarget: 4100,
        minTarget: 2800,
        timeframe: '6M',
        volatility: 55,
        riskLevel: 'Medium',
        aiExplanation: 'Institutional wallet inflows reached a 90-day high. DXY weakening combined with ETH staking yield increase signals favorable macro conditions for accumulation.',
        recommendation: 'HOLD',
    },
    {
        id: 'quantedge',
        name: 'QuantEdge Systems',
        category: 'quant',
        categoryLabel: 'Quant Trading',
        avatar: 'QE',
        avatarColor: '#a855f7',
        strategy: 'Statistical Arbitrage',
        successRate: 79,
        wins: 316,
        losses: 84,
        assets: ['BTC', 'SOL', 'DOGE'],
        lastSignal: 'BUY',
        lastSignalAsset: 'SOL',
        description: 'High-frequency statistical arbitrage across CEX/DEX pairs. Mean-reversion and co-integration models with 200ms execution.',
        confidence: 91,
        sparkData: [70, 72, 75, 73, 78, 76, 80, 79, 82, 81, 84, 82, 87, 85, 89],
        currentPrice: 148,
        maxTarget: 220,
        avgTarget: 185,
        minTarget: 118,
        timeframe: '2M',
        volatility: 61,
        riskLevel: 'Medium',
        aiExplanation: 'SOL/BTC beta spread deviated 2.4 standard deviations. Co-integration z-score signals high-probability mean reversion within 2–4 weeks.',
        recommendation: 'BUY',
    },
    {
        id: 'cryptosage',
        name: 'CryptoSage Retail',
        category: 'retail',
        categoryLabel: 'Retail Analyst',
        avatar: 'CS',
        avatarColor: '#f97316',
        strategy: 'Technical Analysis',
        successRate: 62,
        wins: 186,
        losses: 114,
        assets: ['DOGE', 'PEPE', 'SHIB'],
        lastSignal: 'BUY',
        lastSignalAsset: 'DOGE',
        description: 'Classic TA approach using RSI, MACD, Bollinger Bands and Elliott Wave patterns on meme coin price action.',
        confidence: 65,
        sparkData: [45, 48, 50, 47, 52, 55, 51, 58, 54, 60, 57, 62, 59, 65, 61],
        currentPrice: 0.1465,
        maxTarget: 0.22,
        avgTarget: 0.17,
        minTarget: 0.11,
        timeframe: '1M',
        volatility: 85,
        riskLevel: 'High',
        aiExplanation: 'DOGE broke above the key $0.14 resistance with a 41% surge in Twitter mentions. RSI at 58 — not overbought. Meme season indicators suggest continuation.',
        recommendation: 'BUY',
    },
    {
        id: 'viralvault',
        name: 'ViralVault Sentiment',
        category: 'social',
        categoryLabel: 'Social Sentiment',
        avatar: 'VV',
        avatarColor: '#ec4899',
        strategy: 'Social Signal Mining',
        successRate: 66,
        wins: 132,
        losses: 68,
        assets: ['PEPE', 'DOGE', 'WIF'],
        lastSignal: 'BUY',
        lastSignalAsset: 'PEPE',
        description: 'Mines Reddit, X (Twitter), TikTok and Discord for viral trend detection. Enters positions ahead of retail FOMO waves.',
        confidence: 70,
        sparkData: [40, 44, 43, 48, 52, 50, 56, 54, 60, 58, 64, 62, 68, 66, 70],
        currentPrice: 0.0000156,
        maxTarget: 0.000028,
        avgTarget: 0.000022,
        minTarget: 0.000011,
        timeframe: '3W',
        volatility: 92,
        riskLevel: 'Very High',
        aiExplanation: 'PEPE TikTok mentions up 180% in 48hr. Reddit meme count exceeded previous cycle peak. Whale accumulation on-chain detected 6 hours before viral pump.',
        recommendation: 'BUY',
    },
    {
        id: 'deltaforce',
        name: 'DeltaForce Macro',
        category: 'institutional',
        categoryLabel: 'Institutional',
        avatar: 'DF',
        avatarColor: '#06b6d4',
        strategy: 'Global Macro Hedge',
        successRate: 73,
        wins: 219,
        losses: 81,
        assets: ['BTC', 'ETH', 'XRP'],
        lastSignal: 'SELL',
        lastSignalAsset: 'XRP',
        description: 'Macro-driven hedging strategy using Fed policy signals, global liquidity cycles and risk-on/off rotation modeling.',
        confidence: 79,
        sparkData: [60, 63, 65, 62, 67, 70, 68, 72, 71, 74, 73, 76, 75, 78, 77],
        currentPrice: 0.58,
        maxTarget: 0.78,
        avgTarget: 0.65,
        minTarget: 0.42,
        timeframe: '4M',
        volatility: 48,
        riskLevel: 'Low',
        aiExplanation: 'XRP SEC ruling uncertainty combined with hawkish Fed signals suggests near-term downside. Recommend reducing exposure until macro clarity improves in Q3.',
        recommendation: 'SELL',
    },
    {
        id: 'neuralnet',
        name: 'NeuralNet Alpha',
        category: 'ai',
        categoryLabel: 'AI Broker',
        avatar: 'NN',
        avatarColor: '#84cc16',
        strategy: 'Deep Learning Forecast',
        successRate: 76,
        wins: 228,
        losses: 72,
        assets: ['BTC', 'ETH', 'BNB'],
        lastSignal: 'BUY',
        lastSignalAsset: 'ETH',
        description: 'LSTM + Transformer hybrid model trained on 5 years of price, volume and on-chain data. Generates 7-day probability forecasts.',
        confidence: 84,
        sparkData: [65, 68, 70, 67, 73, 76, 74, 78, 77, 80, 79, 82, 81, 84, 83],
        currentPrice: 3450,
        maxTarget: 5200,
        avgTarget: 4400,
        minTarget: 2900,
        timeframe: '6M',
        volatility: 58,
        riskLevel: 'Medium',
        aiExplanation: 'Model confidence at 84% for upward movement. ETH EIP upgrade sentiment positive, staking rewards increasing. On-chain active addresses at 6-month high.',
        recommendation: 'BUY',
    },
    {
        id: 'meridian',
        name: 'Meridian Quant Fund',
        category: 'quant',
        categoryLabel: 'Quant Trading',
        avatar: 'MQ',
        avatarColor: '#f59e0b',
        strategy: 'Market Making + Alpha',
        successRate: 82,
        wins: 410,
        losses: 90,
        assets: ['BTC', 'ETH', 'LTC'],
        lastSignal: 'HOLD',
        lastSignalAsset: 'BTC',
        description: 'Combines market-making rebate capture with directional alpha. Uses order book imbalance signals and VWAP deviation models.',
        confidence: 88,
        sparkData: [72, 74, 76, 75, 78, 79, 80, 79, 82, 81, 84, 83, 85, 84, 86],
        currentPrice: 67200,
        maxTarget: 88000,
        avgTarget: 75000,
        minTarget: 58000,
        timeframe: '3M',
        volatility: 44,
        riskLevel: 'Low',
        aiExplanation: 'Order book shows 3.2x bid/ask imbalance favoring buyers at $65K support. VWAP deviation within normal bounds. Holding position is optimal risk-reward.',
        recommendation: 'HOLD',
    },
];

// ── Helpers ──────────────────────────────────────
function getBrokerById(id) {
    return BROKERS.find(b => b.id === id) || BROKERS[0];
}

async function refreshBrokerMarketData() {
    const provider = window.SentiPrimaryData || window.SentiMarketData;
    if (!provider) return;
    const symbols = [...new Set(BROKERS.map(b => b.lastSignalAsset).filter(Boolean))];
    const latestRows = await provider.getLatestBatch(symbols);
    const latestBySymbol = new Map(latestRows.map(row => [row.symbol, row]));

    BROKERS.forEach(broker => {
        const latest = latestBySymbol.get(broker.lastSignalAsset);
        if (!latest) return;
        broker.currentPrice = latest.price;
        broker.maxTarget = latest.price;
        broker.avgTarget = latest.price;
        broker.minTarget = latest.price;
        broker.sparkData = [latest.price];
        broker.aiExplanation = `${broker.lastSignalAsset} current price is sourced from CoinDesk Data. Broker forecasts, social claims, and fixed target ranges are hidden until a verified broker/forecast data source is connected.`;
        broker.recommendation = 'DATA ONLY';
    });
}

function getSignalColor(signal) {
    if (signal === 'BUY') return { bg: 'rgba(34,197,94,.15)', border: 'rgba(34,197,94,.4)', color: '#22c55e' };
    if (signal === 'SELL') return { bg: 'rgba(239,68,68,.15)', border: 'rgba(239,68,68,.4)', color: '#ef4444' };
    return { bg: 'rgba(251,191,36,.15)', border: 'rgba(251,191,36,.4)', color: '#fbbf24' };
}

function getRiskColor(level) {
    if (level === 'Low') return '#22c55e';
    if (level === 'Medium') return '#f97316';
    if (level === 'High') return '#ef4444';
    return '#dc2626';
}

function formatPrice(price) {
    if (price >= 1000) return '$' + price.toLocaleString();
    if (price >= 1) return '$' + price.toFixed(2);
    return '$' + price.toFixed(7);
}

function pctChange(current, target) {
    const pct = ((target - current) / current * 100).toFixed(1);
    return (target > current ? '+' : '') + pct + '%';
}

// ── Sparkline ────────────────────────────────────
function drawSparkline(canvas, data, color = '#22c55e') {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const min = Math.min(...data), max = Math.max(...data);
    ctx.clearRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color.replace(')', ',.3)').replace('rgb', 'rgba') || 'rgba(34,197,94,.3)');
    grad.addColorStop(1, 'transparent');

    ctx.beginPath();
    data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((v - min) / (max - min || 1)) * (H - 4) - 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
}

// ── Card Rendering ────────────────────────────────
function renderBrokerCards(filter = 'all') {
    const container = document.getElementById('brokersGrid');
    if (!container) return;

    const filtered = filter === 'all' ? BROKERS : BROKERS.filter(b => b.category === filter);
    const sig = (s) => getSignalColor(s);

    container.innerHTML = filtered.map(b => {
        const s = sig(b.lastSignal);
        const winLoss = `${b.wins}W / ${b.losses}L`;
        return `
    <div class="broker-card" onclick="goToBroker('${b.id}')" id="card-${b.id}">
      <div class="bcard-header">
        <div class="bcard-avatar" style="background:${b.avatarColor}22;border-color:${b.avatarColor}44;color:${b.avatarColor}">${b.avatar}</div>
        <div class="bcard-info">
          <div class="bcard-name">${b.name}</div>
          <div class="bcard-category">${b.categoryLabel}</div>
        </div>
        <div class="bcard-signal" style="background:${s.bg};border:1px solid ${s.border};color:${s.color}">
          ${b.lastSignal} ${b.lastSignalAsset}
        </div>
      </div>

      <div class="bcard-strategy">${b.strategy}</div>
      <div class="bcard-desc">${b.description}</div>

      <div class="bcard-stats">
        <div class="bstat">
          <div class="bstat-val" style="color:#22c55e">${b.successRate}%</div>
          <div class="bstat-lbl">Success Rate</div>
        </div>
        <div class="bstat">
          <div class="bstat-val">${winLoss}</div>
          <div class="bstat-lbl">Win / Loss</div>
        </div>
        <div class="bstat">
          <div class="bstat-val" style="color:#3b82f6">${b.confidence}%</div>
          <div class="bstat-lbl">Confidence</div>
        </div>
      </div>

      <div class="bcard-assets">
        ${b.assets.map(a => `<span class="asset-chip-b">${a}</span>`).join('')}
      </div>

      <div class="bcard-chart-wrap">
        <canvas class="bcard-sparkline" id="spark-${b.id}" width="240" height="50"></canvas>
      </div>

      <button class="bcard-btn" onclick="event.stopPropagation();goToBroker('${b.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        View Graph Analysis
      </button>
    </div>`;
    }).join('');

    // Draw sparklines
    function drawAll() {
        filtered.forEach(b => {
            const c = document.getElementById('spark-' + b.id);
            if (c) drawSparkline(c, b.sparkData, b.avatarColor);
        });
    }
    window.requestAnimationFrame ? window.requestAnimationFrame(drawAll) : setTimeout(drawAll, 50);
}

function goToBroker(id) {
    window.location.href = 'broker-analysis.html?id=' + id;
}

// ── Forecast Chart ──────────────────────────────
function renderForecastChart(broker) {
    const canvas = document.getElementById('forecastChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // ── Data ──
    // Flat placeholder until verified broker history is connected
    const pastMonths = 24;
    const forecastMonths = 12;
    const totalPoints = pastMonths + forecastMonths;
    const splitX = pastMonths / totalPoints; // where past ends

    const pastData = generatePastData(broker.currentPrice, pastMonths);
    const months = generateMonthLabels(pastMonths + forecastMonths);

    // Forecast anchors
    const curr = broker.currentPrice;
    const maxT = broker.maxTarget;
    const avgT = broker.avgTarget;
    const minT = broker.minTarget;

    // Layout
    const PAD_L = 60, PAD_R = 120, PAD_T = 40, PAD_B = 50;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const allVals = [...pastData, maxT, minT];
    const dataMin = Math.min(...allVals) * 0.9;
    const dataMax = Math.max(...allVals) * 1.05;

    function toX(i) { return PAD_L + (i / (totalPoints - 1)) * chartW; }
    function toY(v) { return PAD_T + chartH - ((v - dataMin) / (dataMax - dataMin)) * chartH; }

    const splitXPx = toX(pastMonths - 1);
    const forecastStartXPx = toX(pastMonths);

    ctx.clearRect(0, 0, W, H);

    // ── Grid lines ──
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = PAD_T + (i / 5) * chartH;
        ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    }

    // ── Past price fill ──
    const pastGrad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
    pastGrad.addColorStop(0, 'rgba(59,130,246,0.25)');
    pastGrad.addColorStop(1, 'rgba(59,130,246,0.02)');

    ctx.beginPath();
    pastData.forEach((v, i) => {
        const x = toX(i), y = toY(v);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(splitXPx, PAD_T + chartH);
    ctx.lineTo(PAD_L, PAD_T + chartH);
    ctx.closePath();
    ctx.fillStyle = pastGrad;
    ctx.fill();

    // ── Past price line ──
    ctx.beginPath();
    pastData.forEach((v, i) => {
        const x = toX(i), y = toY(v);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Forecast: GREEN zone (curr → avg → max) ──
    const forecastEndX = toX(totalPoints - 1);
    const currY = toY(curr);
    const maxY = toY(maxT);
    const avgY = toY(avgT);
    const minY = toY(minT);

    // Green upper area
    const greenGrad = ctx.createLinearGradient(forecastStartXPx, 0, forecastEndX, 0);
    greenGrad.addColorStop(0, 'rgba(34,197,94,0.05)');
    greenGrad.addColorStop(1, 'rgba(34,197,94,0.25)');

    ctx.beginPath();
    ctx.moveTo(forecastStartXPx, currY);
    ctx.lineTo(forecastEndX, maxY);
    ctx.lineTo(forecastEndX, avgY);
    ctx.lineTo(forecastStartXPx, currY);
    ctx.closePath();
    ctx.fillStyle = greenGrad;
    ctx.fill();

    // Green border lines
    ctx.beginPath();
    ctx.moveTo(forecastStartXPx, currY);
    ctx.lineTo(forecastEndX, maxY);
    ctx.strokeStyle = 'rgba(34,197,94,0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(forecastStartXPx, currY);
    ctx.lineTo(forecastEndX, avgY);
    ctx.strokeStyle = 'rgba(34,197,94,0.9)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();

    // ── Red: curr → min ──
    const redGrad = ctx.createLinearGradient(forecastStartXPx, 0, forecastEndX, 0);
    redGrad.addColorStop(0, 'rgba(239,68,68,0.05)');
    redGrad.addColorStop(1, 'rgba(239,68,68,0.25)');

    ctx.beginPath();
    ctx.moveTo(forecastStartXPx, currY);
    ctx.lineTo(forecastEndX, minY);
    ctx.lineTo(forecastEndX, currY + 2);
    ctx.closePath();
    ctx.fillStyle = redGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(forecastStartXPx, currY);
    ctx.lineTo(forecastEndX, minY);
    ctx.strokeStyle = 'rgba(239,68,68,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Divider line ──
    ctx.beginPath();
    ctx.moveTo(splitXPx, PAD_T);
    ctx.lineTo(splitXPx, PAD_T + chartH);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Current price line (horizontal dashed) ──
    ctx.beginPath();
    ctx.moveTo(splitXPx, currY);
    ctx.lineTo(forecastEndX, currY);
    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Price labels on right side ──
    function drawLabel(y, text, subtext, bg) {
        const lx = W - PAD_R + 8;
        const lw = PAD_R - 10;
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(lx, y - 12, lw, 24, 4);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, lx + lw / 2, y - 1);
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText(subtext, lx + lw / 2, y + 10);
    }

    // Left-side badges
    function drawLeftBadge(y, label, color) {
        const bw = 85;
        const bx = forecastEndX - bw - 4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(bx, y - 10, bw, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, bx + 6, y + 4);
    }

    drawLeftBadge(maxY, `Max ${pctChange(curr, maxT)}`, '#16a34a');
    drawLeftBadge(avgY, `Avg ${pctChange(curr, avgT)}`, '#15803d');
    drawLeftBadge(minY, `Min ${pctChange(curr, minT)}`, '#dc2626');

    drawLabel(maxY, formatPrice(maxT), '', '#22c55e');
    drawLabel(avgY, formatPrice(avgT), '', '#16a34a');
    drawLabel(currY, 'Current', formatPrice(curr), '#3b82f6');
    drawLabel(minY, formatPrice(minT), '', '#ef4444');

    // ── X-axis labels ──
    ctx.fillStyle = 'rgba(100,120,150,0.8)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelStep = Math.ceil(totalPoints / 8);
    months.forEach((m, i) => {
        if (i % labelStep === 0) {
            ctx.fillText(m, toX(i), PAD_T + chartH + 18);
        }
    });

    // Section labels
    ctx.fillStyle = 'rgba(100,120,150,0.6)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAST 2Y', PAD_L + (splitXPx - PAD_L) / 2, PAD_T + chartH + 36);
    ctx.fillText('1Y FORECAST', splitXPx + (forecastEndX - splitXPx) / 2, PAD_T + chartH + 36);
}

function generatePastData(currentPrice, months) {
    return Array.from({ length: months }, () => currentPrice);
}

function generateMonthLabels(count) {
    const now = new Date();
    const labels = [];
    const start = new Date(now);
    start.setMonth(start.getMonth() - 24);
    for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels.push(d.getMonth() === 0 ? String(d.getFullYear()) : monthNames[d.getMonth()]);
    }
    return labels;
}
