// ═══════════════════════════════════════════════
//  SentiMarket — app.js  v3.0
//  Modular SaaS-grade trading platform frontend
// ═══════════════════════════════════════════════

// ─── ASSET DATA MAP ──────────────────────────────
const ASSETS = {
    DOGE: {
        sym: 'DOGE', name: 'Dogecoin', emoji: '🐶',
        price: 0.1465, change: +3.93, basePrice: 0.13,
        sentiment: 'STRONGLY BULLISH', phase: 'MOMENTUM PHASE',
        hype: 82, mentions: '+41%', engagement: '+27%', sentStr: '+0.65', volume: '+18%',
        rsi: 'Bullish Range', ema: 'Above 20 EMA', volSpike: 'Detected',
        ai: {
            conservative: 'DOGE exhibits moderate bullish signals. Confidence at 82% — within cautious entry threshold. Recommend small position sizing. Risk is managed.',
            aggressive: 'STRONG BUY SIGNAL on DOGE! 41% mention spike + price above EMA = prime momentum entry. High conviction. Size up. Strike fast.',
            quant: 'DOGE/USD: Hype correlation coefficient 0.78 (short-term). RSI bullish range. Volume +18%. Model confidence: 82%. Entry probability: HIGH.',
            meme: 'DOGE IS MOONING 🚀🚀 Twitter exploding +41% mentions. Reddit apes loading up. Sentiment 65% bullish. MEME SEASON ACTIVATED. LFG!',
            institutional: 'DOGE shows social-driven price action. Current hype cycle suggests temporary momentum. Macro bias neutral. Position within risk parameters.',
        },
        corr: [0.78, 0.61, 0.54], confidence: 82,
    },
    PEPE: {
        sym: 'PEPE', name: 'Pepe Coin', emoji: '🐸',
        price: 0.0000156, change: +12.4, basePrice: 0.000012,
        sentiment: 'EXTREME BULLISH', phase: 'HYPE EXPLOSION',
        hype: 94, mentions: '+76%', engagement: '+55%', sentStr: '+0.81', volume: '+62%',
        rsi: 'Overbought Zone', ema: 'Above 20 EMA', volSpike: 'Extreme',
        ai: {
            conservative: 'PEPE is in extreme hype territory. Score 94/100 — high risk of reversal. Proceed with extreme caution. Small speculative positions only.',
            aggressive: 'PEPE is going parabolic. +76% mentions, +62% volume. This is a momentum play. Ride the wave but set trailing stops.',
            quant: 'PEPE: Hype-price correlation 0.91. RSI overbought at 78. Mean reversion risk elevated. Position size accordingly.',
            meme: 'PEPE TO THE MOON 🐸🚀 MEME SEASON AT PEAK. 76% mentions spike. FROG ARMY LOADING. DO NOT MISS THIS.',
            institutional: 'PEPE exhibits extreme speculative behavior. No fundamental basis. Avoid or hedge heavily. Treat as binary event.',
        },
        corr: [0.91, 0.72, 0.48], confidence: 76,
    },
    SOL: {
        sym: 'SOL', name: 'Solana', emoji: '◎',
        price: 143.90, change: +4.89, basePrice: 130,
        sentiment: 'BULLISH', phase: 'ACCUMULATION',
        hype: 68, mentions: '+22%', engagement: '+18%', sentStr: '+0.54', volume: '+11%',
        rsi: 'Neutral-Bullish', ema: 'Above 20 EMA', volSpike: 'Moderate',
        ai: {
            conservative: 'SOL shows steady accumulation with moderate hype (68/100). RSI neutral-bullish. Risk-adjusted entry reasonable at current levels.',
            aggressive: 'SOL breakout incoming. Above EMA with increasing volume. Ecosystem narrative strong. Add on dips.',
            quant: 'SOL/USD: Volume regression +11%. Price momentum score 0.64. Correlation with BTC at 0.61. Moderate conviction buy.',
            meme: 'SOL still got legs 🔮 Accumulation phase means smart money is in. Low-key bullish. DeFi szn loading.',
            institutional: 'SOL demonstrates healthy accumulation patterns. Ecosystem fundamentals strong. Suitable for medium-term position.',
        },
        corr: [0.64, 0.61, 0.55], confidence: 71,
    },
    AVAX: {
        sym: 'AVAX', name: 'Avalanche', emoji: 'A',
        price: 39.71, change: -7.13, basePrice: 42,
        sentiment: 'BEARISH', phase: 'CORRECTION',
        hype: 34, mentions: '-12%', engagement: '-8%', sentStr: '-0.28', volume: '-15%',
        rsi: 'Bearish Range', ema: 'Below 20 EMA', volSpike: 'Declining',
        ai: {
            conservative: 'AVAX is in correction territory. Sentiment declined. Below 20 EMA with weakening hype. Wait for reversal confirmation before entry.',
            aggressive: 'AVAX oversold dip. -7% one-day move might attract buyers. Contrarian play with tight stop-loss.',
            quant: 'AVAX/USD: Negative momentum confirmed. Hype correlation -0.28. Wait for volume reversal signal.',
            meme: 'AVAX down bad 📉 Sentiment shifted negative. Not the time to ape in. Wait for bounce signal.',
            institutional: 'AVAX correction appears healthy. Support at $36 region. Accumulate in tranches on further weakness.',
        },
        corr: [0.48, 0.42, 0.61], confidence: 55,
    },
    BTC: {
        sym: 'BTC', name: 'Bitcoin', emoji: '₿',
        price: 67420, change: +1.82, basePrice: 65000,
        sentiment: 'BULLISH', phase: 'STEADY UPTREND',
        hype: 71, mentions: '+15%', engagement: '+12%', sentStr: '+0.61', volume: '+9%',
        rsi: 'Bullish Range', ema: 'Above 20 EMA', volSpike: 'Moderate',
        ai: {
            conservative: 'BTC shows steady bullish momentum. 71/100 hype with controlled volume. Safe accumulation zone for long-term positioning.',
            aggressive: 'BTC institutional flows detected. +15% mention surge with price above key EMA. Strong buy signal.',
            quant: 'BTC/USD: Hype-price correlation 0.71. Volume baseline +9%. On-chain support confirmed. Confidence: HIGH.',
            meme: 'BTC steady as usual 👑 ETF inflows confirmed. Digital gold narrative strong. HODL mode activated.',
            institutional: 'BTC maintains macro bullish structure. ETF inflow data supports medium-term upside. Core holding confirmed.',
        },
        corr: [0.71, 0.65, 0.80], confidence: 80,
    },
    ETH: {
        sym: 'ETH', name: 'Ethereum', emoji: 'Ξ',
        price: 3280, change: +2.44, basePrice: 3100,
        sentiment: 'BULLISH', phase: 'RECOVERY',
        hype: 62, mentions: '+18%', engagement: '+14%', sentStr: '+0.52', volume: '+13%',
        rsi: 'Neutral-Bullish', ema: 'At 20 EMA', volSpike: 'Moderate',
        ai: {
            conservative: 'ETH in recovery phase. Hype at 62/100, trading at 20 EMA. Neutral-bullish setup with good risk-reward on breakout.',
            aggressive: 'ETH is coiling at EMA — breakout imminent. DeFi TVL recovering. Strong entry opportunity.',
            quant: 'ETH/USD: RSI neutral. Hype score 62. Gas fee trends normalizing. Upgrade narrative active. Moderate long.',
            meme: 'ETH recovery szn starting 🌀 Devs building, DeFi recovering. Layer-2 meta trending. Bullish.',
            institutional: 'ETH staking yield stable. Deflationary pressure from burns. Fundamental case strong for medium-term hold.',
        },
        corr: [0.68, 0.74, 0.78], confidence: 68,
    },
};

// ─── CURRENT STATE ───────────────────────────────
let currentAssetSym = 'DOGE';
let mainChart, candleSeries, volumeSeries, maSeries, miniHypeChart;
let currentBar = null;
let bookmarked = false;
let notifCount = 3;
let searchFocusIdx = -1;
let currentSearchResults = [];
let dashboardPollTimer = null;
let liveFeedTimer = null;
let liveCandleTimer = null;
let backendLiveMode = false;
let isSyncInFlight = false;
let activeTimeframe = '1D';
let lastSuccessfulApiUrl = '';

const DASHBOARD_API_CONFIG = resolveDashboardApiConfig();
const TIINGO_SYMBOLS = {
    DOGE: 'dogeusd',
    PEPE: 'pepeusd',
    SOL: 'solusd',
    AVAX: 'avaxusd',
    BTC: 'btcusd',
    ETH: 'ethusd',
};
const feedFallbackItems = [
    { icon: 'DATA', text: () => 'Live feed unavailable: connect a news or social data provider', type: 'muted' },
];

function collectApiOrigins(runtime = {}) {
    const origins = [];
    const pushOrigin = (value) => {
        const origin = String(value || '').trim().replace(/\/$/, '');
        if (origin) origins.push(origin);
    };

    pushOrigin(runtime.baseUrl);
    pushOrigin(localStorage.getItem('smApiBaseUrl'));
    pushOrigin('https://sentimarket-api.onrender.com');
    pushOrigin('https://sentimarket-api.onrender.com');
    pushOrigin('https://sentimarket-api.onrender.com');
    pushOrigin('https://sentimarket-api.onrender.com');
    if (window.location.protocol.startsWith('http')) pushOrigin(window.location.origin);

    return [...new Set(origins)];
}

// ─── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    seedEnginesFromAssets();
    initMainChart();
    initVolumeChart();
    initMiniHypeChart();
    initChatbot();
    startLiveFeed();
    initTickerTape();
    initKeyboardShortcuts();
    loadUserInfo();
    renderSearchResults('');
    refreshAssetRows();
    updateWatchSnippet();
    syncDashboardData({ silent: true });
    startDashboardPolling();
    liveCandleTimer = setInterval(updateLiveCandle, 1000);
    setInterval(updateMarketStatusTime, 60000);
});

function seedEnginesFromAssets() {
    if (!window.HypeEngine || !window.CorrelationEngine) return;
    Object.entries(ASSETS).forEach(([sym, asset]) => {
        window.HypeEngine.seedFromAssetData(sym, asset);
        window.CorrelationEngine.seedFromAssetData(sym, asset);
    });
}

function resolveDashboardApiConfig() {
    const runtime = window.SENTI_API_CONFIG || {};
    const tiingo = runtime.tiingo || {};
    const configuredProvider = runtime.provider || localStorage.getItem('smDataProvider') || 'twelve';
    const apiOrigins = collectApiOrigins(runtime);
    const baseUrl = apiOrigins[0] || 'https://sentimarket-api.onrender.com';

    return {
        baseUrl: String(baseUrl || '').replace(/\/$/, ''),
        apiOrigins,
        timeoutMs: Number(runtime.timeoutMs || 8000),
        pollMs: Number(runtime.pollMs || 15000),
        feedPollMs: Number(runtime.feedPollMs || 12000),
        provider: configuredProvider === 'tiingo' ? 'twelve' : configuredProvider,
        tiingo: {
            token: tiingo.token || localStorage.getItem('tiingoApiToken') || 'ecc195066c117a60e1cbeb5101ad50e5d1a08da4',
            baseUrl: String(tiingo.baseUrl || 'https://api.tiingo.com').replace(/\/$/, ''),
        },
        endpoints: {
            dashboard: runtime.dashboardEndpoint || '/api/dashboard',
            assets: runtime.assetsEndpoint || '/api/assets',
            feed: runtime.feedEndpoint || '/api/feed',
            history: runtime.historyEndpoint || '/api/assets/{symbol}/history',
            trade: runtime.tradeEndpoint || '/api/trades',
        },
    };
}

function getApiCandidateUrls(path) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const candidates = [];

    if (lastSuccessfulApiUrl) candidates.push(lastSuccessfulApiUrl.replace(/\/$/, '') + cleanPath);
    (DASHBOARD_API_CONFIG.apiOrigins || []).forEach(origin => candidates.push(origin + cleanPath));

    return [...new Set(candidates)];
}

async function fetchJsonWithFallback(path) {
    const urls = getApiCandidateUrls(path);
    let lastError = null;

    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_API_CONFIG.timeoutMs);
            const startedAt = performance.now();
            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            DASHBOARD_API_CONFIG.lastLatencyMs = Math.round(performance.now() - startedAt);
            lastSuccessfulApiUrl = new URL(url).origin;
            return data;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error(`Unable to fetch ${path}`);
}

function formatDateParam(date) {
    return date.toISOString().slice(0, 10);
}

function getTiingoUrl(params) {
    const url = new URL(`${DASHBOARD_API_CONFIG.tiingo.baseUrl}/tiingo/crypto/prices`);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    url.searchParams.set('token', DASHBOARD_API_CONFIG.tiingo.token);
    return url.toString();
}

async function fetchTiingoPrices(tickers, options = {}) {
    if (!DASHBOARD_API_CONFIG.tiingo.token) throw new Error('Missing Tiingo API token');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_API_CONFIG.timeoutMs);
    const startedAt = performance.now();

    try {
        const response = await fetch(getTiingoUrl({
            tickers: Array.isArray(tickers) ? tickers.join(',') : tickers,
            startDate: options.startDate,
            endDate: options.endDate,
            resampleFreq: options.resampleFreq,
        }), {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Tiingo HTTP ${response.status}`);
        const data = await response.json();
        DASHBOARD_API_CONFIG.lastLatencyMs = Math.round(performance.now() - startedAt);
        lastSuccessfulApiUrl = 'https://api.tiingo.com';
        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

function getTiingoPointSeries(record) {
    if (Array.isArray(record?.priceData)) return record.priceData;
    if (Array.isArray(record?.data)) return record.data;
    if (Array.isArray(record?.prices)) return record.prices;
    return [];
}

function getTiingoPointClose(point) {
    return parseNumeric(point?.close ?? point?.last ?? point?.price ?? point?.adjClose);
}

function calculateTiingoChange(points) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const latest = getTiingoPointClose(points[points.length - 1]);
    const previous = getTiingoPointClose(points[points.length - 2]);
    if (!latest || !previous) return null;
    return ((latest - previous) / previous) * 100;
}

function buildMarketNarrative(sym, change, price) {
    const direction = change >= 0 ? 'positive' : 'negative';
    const strength = Math.abs(change) >= 5 ? 'sharp' : Math.abs(change) >= 1 ? 'active' : 'steady';
    return {
        conservative: `${sym} is trading at ${formatAssetPrice(price)} with a ${formatSignedMetric(change)} latest market-data move. Momentum is ${direction}; use measured position sizing until the next candle confirms direction.`,
        aggressive: `${sym} live market momentum is ${strength} at ${formatSignedMetric(change)}. Watch the latest candle and volume before chasing the move.`,
        quant: `${sym}/USD market feed: last price ${formatAssetPrice(price)}, latest sampled change ${formatSignedMetric(change)}, directional confidence derived from price momentum.`,
        meme: `${sym} is moving ${direction} on the live tape: ${formatSignedMetric(change)} from the previous market-data sample.`,
        institutional: `${sym} shows ${direction} near-term price action from live market data. Monitor liquidity, realized volatility, and trend continuation before adding exposure.`,
    };
}

function normalizeTiingoAssetRecord(sym, record) {
    const current = ASSETS[sym];
    if (!current) return null;

    const points = getTiingoPointSeries(record);
    const latestPoint = points[points.length - 1] || record || {};
    const price = getTiingoPointClose(latestPoint) ?? current.price;
    const change = calculateTiingoChange(points) ?? current.change;
    const volume = parseNumeric(latestPoint.volume ?? latestPoint.volumeNotional) ?? null;
    const volumeText = volume ? `${volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : current.volume;

    if (window.CorrelationEngine) {
        window.CorrelationEngine.addSample(sym, {
            sentimentScore: current.sentStr ? parseFloat(current.sentStr) : change / 100,
            price, priceChange: change, volume: volume || Math.abs(change),
            mentions: parseFloat(current.mentions) || 0, ts: Date.now(),
        });
    }

    let hype = current.hype;
    let corr = current.corr;
    let confidence = current.confidence;
    let sentiment = current.sentiment;
    let phase = current.phase;

    if (window.HypeEngine) {
        const hypeResult = window.HypeEngine.calculateHypeScore(sym, { price, change, volume });
        hype = hypeResult.score;
        confidence = hypeResult.confidence;
        sentiment = hypeResult.label;
        phase = inferPhaseFromHype(hype);
    }

    if (window.CorrelationEngine) {
        corr = window.CorrelationEngine.getCorrelationArray(sym, 'short');
    }

    const absChange = Math.abs(change);

    return {
        ...current,
        price,
        change,
        basePrice: getTiingoPointClose(points[0]) ?? current.basePrice ?? price,
        sentiment,
        phase,
        hype,
        mentions: formatSignedMetric(change * 2.4),
        engagement: formatSignedMetric(change * 1.6),
        sentStr: `${change >= 0 ? '+' : ''}${Math.max(-0.95, Math.min(0.95, change / 10)).toFixed(2)}`,
        volume: volumeText,
        rsi: change >= 1.5 ? 'Bullish Range' : change < 0 ? 'Bearish Range' : 'Neutral',
        ema: change >= 0 ? 'Above latest trend' : 'Below latest trend',
        volSpike: volume ? 'Live Tiingo volume' : current.volSpike,
        ai: buildMarketNarrative(sym, change, price),
        corr,
        confidence,
        history: points.length ? normalizeCandleData(points, current.basePrice) : current.history,
    };
}

function normalizeCoinDeskAssetRecord(record) {
    const sym = String(record?.symbol || '').toUpperCase();
    const current = ASSETS[sym];
    if (!current) return null;

    const price = parseNumeric(record.price) ?? current.price;
    const change = parseNumeric(record.change) ?? current.change;
    const absChange = Math.abs(change);

    if (window.CorrelationEngine) {
        window.CorrelationEngine.addSample(sym, {
            sentimentScore: current.sentStr ? parseFloat(current.sentStr) : change / 100,
            price, priceChange: change, volume: record.volume || Math.abs(change),
            mentions: parseFloat(current.mentions) || 0, ts: Date.now(),
        });
    }

    let hype = current.hype;
    let corr = current.corr;
    let confidence = current.confidence;
    let sentiment = current.sentiment;
    let phase = current.phase;

    if (window.HypeEngine) {
        const hypeResult = window.HypeEngine.calculateHypeScore(sym, { price, change, volume: record.volume });
        hype = hypeResult.score;
        confidence = hypeResult.confidence;
        sentiment = hypeResult.label;
        phase = inferPhaseFromHype(hype);
    }

    if (window.CorrelationEngine) {
        corr = window.CorrelationEngine.getCorrelationArray(sym, 'short');
    }

    return {
        ...current,
        price,
        change,
        basePrice: parseNumeric(record.basePrice) ?? current.basePrice ?? price,
        sentiment,
        phase,
        hype,
        mentions: formatSignedMetric(change * 2.4),
        engagement: formatSignedMetric(change * 1.6),
        sentStr: `${change >= 0 ? '+' : ''}${Math.max(-0.95, Math.min(0.95, change / 10)).toFixed(2)}`,
        volume: record.volume ? Number(record.volume).toLocaleString('en-US', { maximumFractionDigits: 0 }) : current.volume,
        rsi: change >= 1.5 ? 'Bullish Range' : change < 0 ? 'Bearish Range' : 'Neutral',
        ema: change >= 0 ? 'Above latest trend' : 'Below latest trend',
        volSpike: record.volume ? 'Live CoinDesk volume' : current.volSpike,
        ai: buildMarketNarrative(sym, change, price),
        corr,
        confidence,
    };
}

function normalizeMarketAssetRecord(record, providerName = 'market data') {
    const sym = String(record?.symbol || '').toUpperCase();
    const current = ASSETS[sym];
    if (!current) return null;

    const price = parseNumeric(record.price) ?? current.price;
    const change = parseNumeric(record.change) ?? current.change;
    const absChange = Math.abs(change);
    const hype = Math.max(15, Math.min(95, Math.round(45 + absChange * 7 + (change > 0 ? 10 : -6))));
    const confidence = Math.max(45, Math.min(94, Math.round(58 + absChange * 5)));

    return {
        ...current,
        price,
        change,
        basePrice: parseNumeric(record.basePrice) ?? current.basePrice ?? price,
        sentiment: inferSentimentFromChange(change),
        phase: inferPhaseFromHype(hype),
        hype,
        mentions: formatSignedMetric(change * 2.4),
        engagement: formatSignedMetric(change * 1.6),
        sentStr: `${change >= 0 ? '+' : ''}${Math.max(-0.95, Math.min(0.95, change / 10)).toFixed(2)}`,
        volume: record.volume ? Number(record.volume).toLocaleString('en-US', { maximumFractionDigits: 0 }) : current.volume,
        rsi: change >= 1.5 ? 'Bullish Range' : change < 0 ? 'Bearish Range' : 'Neutral',
        ema: change >= 0 ? 'Above latest trend' : 'Below latest trend',
        volSpike: record.volume ? `Live ${providerName} volume` : current.volSpike,
        ai: buildMarketNarrative(sym, change, price),
        corr: [Math.min(0.95, 0.55 + absChange / 20), Math.min(0.88, 0.45 + absChange / 25), Math.min(0.82, 0.5 + absChange / 30)],
        confidence,
    };
}

async function fetchTwelveDashboardPayload() {
    if (!window.SentiPrimaryData) throw new Error('Twelve Data client unavailable');
    const symbols = Object.keys(ASSETS);
    const rows = await window.SentiPrimaryData.getLatestBatch(symbols);
    lastSuccessfulApiUrl = 'https://api.twelvedata.com';
    return {
        assets: rows.map(row => normalizeMarketAssetRecord(row, 'Twelve Data')).filter(Boolean),
    };
}

async function fetchCoinDeskDashboardPayload() {
    if (!window.SentiMarketData) throw new Error('CoinDesk data client unavailable');
    const symbols = Object.keys(ASSETS);
    const rows = await window.SentiMarketData.getLatestBatch(symbols);
    lastSuccessfulApiUrl = 'https://data-api.coindesk.com';
    return {
        assets: rows.map(normalizeCoinDeskAssetRecord).filter(Boolean),
    };
}

async function fetchTiingoDashboardPayload() {
    const symbols = Object.keys(TIINGO_SYMBOLS).filter(sym => ASSETS[sym]);
    const startDate = formatDateParam(new Date(Date.now() - 36 * 60 * 60 * 1000));
    const results = await Promise.allSettled(
        symbols.map(sym => fetchTiingoPrices(TIINGO_SYMBOLS[sym], { startDate, resampleFreq: '1hour' }))
    );

    return {
        assets: results
            .map((result, index) => {
                if (result.status !== 'fulfilled') return null;
                const record = Array.isArray(result.value) ? result.value[0] : result.value;
                return normalizeTiingoAssetRecord(symbols[index], record);
            })
            .filter(Boolean),
    };
}

function getTiingoHistoryOptions() {
    const now = Date.now();
    if (activeTimeframe === '1H') {
        return { startDate: formatDateParam(new Date(now)), resampleFreq: '1min', limit: 60 };
    }
    if (activeTimeframe === '7D') {
        return { startDate: formatDateParam(new Date(now - 7 * 24 * 60 * 60 * 1000)), resampleFreq: '1hour', limit: 168 };
    }
    return { startDate: formatDateParam(new Date(now - 24 * 60 * 60 * 1000)), resampleFreq: '5min', limit: 288 };
}

async function fetchTiingoHistory(sym) {
    const ticker = TIINGO_SYMBOLS[sym];
    if (!ticker) throw new Error(`No Tiingo ticker configured for ${sym}`);
    const options = getTiingoHistoryOptions();
    const records = await fetchTiingoPrices(ticker, options);
    const record = Array.isArray(records) ? records[0] : records;
    const points = getTiingoPointSeries(record);
    const candles = normalizeCandleData(points.slice(-options.limit), ASSETS[sym].basePrice || ASSETS[sym].price);
    if (!candles.length) throw new Error(`No Tiingo history for ${sym}`);
    return candles;
}

async function fetchCoinDeskHistory(sym) {
    if (!window.SentiMarketData) throw new Error('CoinDesk data client unavailable');
    const options = window.SentiMarketData.historyOptionsForTimeframe(activeTimeframe);
    const rows = await window.SentiMarketData.getCandles(sym, options);
    const candles = rows.map(row => ({
        time: row.time,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
    }));
    if (!candles.length) throw new Error(`No CoinDesk history for ${sym}`);
    lastSuccessfulApiUrl = 'https://data-api.coindesk.com';
    return candles;
}

async function fetchTwelveHistory(sym) {
    if (!window.SentiPrimaryData) throw new Error('Twelve Data client unavailable');
    const rows = await window.SentiPrimaryData.getCandles(sym, { timeframe: activeTimeframe });
    const candles = rows.map(row => ({
        time: row.time,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
    }));
    if (!candles.length) throw new Error(`No Twelve Data history for ${sym}`);
    lastSuccessfulApiUrl = 'https://api.twelvedata.com';
    return candles;
}

function getCurrentTimeframeCount() {
    if (activeTimeframe === '1H') return 60;
    if (activeTimeframe === '7D') return 1440;
    return 200;
}

function formatAssetPrice(price) {
    if (typeof price !== 'number' || Number.isNaN(price)) return '--';
    if (price < 0.01) return '$' + price.toExponential(4);
    if (price < 10) return '$' + price.toFixed(4);
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseNumeric(value) {
    if (typeof value === 'number') return Number.isNaN(value) ? null : value;
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[%,$\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
}

function formatSignedMetric(value, digits = 2, suffix = '%') {
    const numeric = parseNumeric(value);
    if (numeric === null) return String(value ?? '--');
    const sign = numeric > 0 ? '+' : '';
    return `${sign}${numeric.toFixed(digits)}${suffix}`;
}

function inferSentimentFromChange(change) {
    if (change >= 8) return 'EXTREME BULLISH';
    if (change >= 1.5) return 'BULLISH';
    if (change <= -5) return 'BEARISH';
    if (change < 0) return 'CAUTIOUS';
    return 'NEUTRAL';
}

function inferPhaseFromHype(hype) {
    if (hype >= 85) return 'HYPE EXPLOSION';
    if (hype >= 70) return 'MOMENTUM PHASE';
    if (hype >= 50) return 'ACCUMULATION';
    return 'CORRECTION';
}

function normalizeAiPayload(existingAi, incoming) {
    if (typeof incoming === 'string') {
        return {
            ...existingAi,
            conservative: incoming,
            aggressive: incoming,
            quant: incoming,
            meme: incoming,
            institutional: incoming,
        };
    }
    if (incoming && typeof incoming === 'object') return { ...existingAi, ...incoming };
    return existingAi;
}

function normalizeAssetPayload(sym, raw = {}) {
    const current = ASSETS[sym];
    if (!current) return null;

    const price = parseNumeric(raw.price ?? raw.currentPrice ?? raw.lastPrice) ?? current.price;
    const change =
        parseNumeric(raw.change ?? raw.changePct ?? raw.percentChange ?? raw.priceChangePercent) ??
        (current.price ? ((price - current.price) / current.price) * 100 : current.change);
    const hype = parseNumeric(raw.hype ?? raw.hypeScore ?? raw.sentimentScore) ?? current.hype;
    const confidence = Math.max(0, Math.min(99, Math.round(parseNumeric(raw.confidence ?? raw.aiConfidence ?? raw.confidencePct) ?? current.confidence)));
    const corrRaw = raw.corr || raw.correlation || raw.correlations;
    const corr = Array.isArray(corrRaw) ? corrRaw.map(v => Number(parseNumeric(v) ?? 0)) : current.corr;

    return {
        ...current,
        name: raw.name || raw.assetName || current.name,
        price,
        change,
        basePrice: parseNumeric(raw.basePrice) ?? current.basePrice ?? price,
        sentiment: raw.sentiment || raw.signal || inferSentimentFromChange(change),
        phase: raw.phase || raw.marketPhase || inferPhaseFromHype(hype),
        hype,
        mentions: raw.mentions || raw.mentionGrowth || current.mentions,
        engagement: raw.engagement || raw.engagementSpike || current.engagement,
        sentStr: raw.sentStr || raw.sentimentStrength || current.sentStr,
        volume: raw.volume || raw.volumeSpike || current.volume,
        rsi: raw.rsi || raw.rsiLabel || current.rsi,
        ema: raw.ema || raw.emaStatus || current.ema,
        volSpike: raw.volSpike || raw.volumeStatus || current.volSpike,
        ai: normalizeAiPayload(current.ai, raw.ai || raw.aiExplanation || raw.explanation),
        corr,
        confidence,
        history: Array.isArray(raw.history) ? raw.history : current.history,
    };
}

function applyAssetsPayload(payload) {
    if (!payload || typeof payload !== 'object') return [];
    const rawAssets = Array.isArray(payload)
        ? payload
        : payload.assets || payload.data || payload.market || payload.rows || payload.results || payload;

    const entries = Array.isArray(rawAssets)
        ? rawAssets.map(item => [String(item.sym || item.symbol || item.ticker || '').toUpperCase(), item])
        : Object.entries(rawAssets);

    const updatedSymbols = [];
    entries.forEach(([symbol, raw]) => {
        const sym = String(symbol || '').toUpperCase();
        if (!ASSETS[sym]) return;
        const normalized = normalizeAssetPayload(sym, raw);
        if (!normalized) return;
        ASSETS[sym] = normalized;
        updatedSymbols.push(sym);
    });

    return updatedSymbols;
}

function normalizeFeedItems(payload) {
    const rawItems = Array.isArray(payload)
        ? payload
        : payload?.items || payload?.feed || payload?.data || payload?.events || [];

    return rawItems.map(item => {
        if (typeof item === 'string') {
            return { text: item, icon: 'LIVE', type: 'green', timeLabel: 'just now' };
        }

        return {
            text: item.text || item.message || item.headline || item.title || '',
            icon: String(item.icon || item.kind || item.source || 'LIVE').slice(0, 6).toUpperCase(),
            type: item.type || item.level || 'green',
            timeLabel: item.timeLabel || item.time || item.createdAt || 'just now',
        };
    }).filter(item => item.text);
}

function formatNewsTime(value) {
    if (!value) return 'just now';
    const timestamp = new Date(value).getTime();
    if (!timestamp) return 'just now';
    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.round(hours / 24)} day ago`;
}

function normalizeNewsFeedItems(articles) {
    return articles.map(article => {
        const sentiment = window.SentiNewsData && typeof window.SentiNewsData.normalizeSentiment === 'function'
            ? window.SentiNewsData.normalizeSentiment(article.sentiment)
            : String(article.sentiment || '').toLowerCase();
        const isPositive = sentiment === 'positive' || sentiment.includes('bull');
        const isNegative = sentiment === 'negative' || sentiment.includes('bear');
        return {
            text: `${article.source}: ${article.title}`,
            icon: isPositive ? 'POS' : isNegative ? 'NEG' : 'NEWS',
            type: isPositive ? 'green' : isNegative ? 'orange' : 'muted',
            timeLabel: formatNewsTime(article.publishedAt),
        };
    });
}

function mergeNewsSentiment(asset, signal) {
    if (!asset || !signal || !signal.total) return asset;
    const sentimentStrength = Math.max(-0.95, Math.min(0.95, signal.score));
    const hype = Math.max(10, Math.min(95, Math.round((asset.hype * 0.55) + (signal.hype * 0.45))));
    return {
        ...asset,
        hype,
        sentiment: signal.sentiment === 'NEUTRAL' ? asset.sentiment : signal.sentiment,
        phase: inferPhaseFromHype(hype),
        mentions: `News ${signal.total}`,
        engagement: `${signal.positive} positive / ${signal.negative} negative`,
        sentStr: `${sentimentStrength >= 0 ? '+' : ''}${sentimentStrength.toFixed(2)}`,
        ai: {
            ...asset.ai,
            conservative: `${asset.sym} news sentiment from cryptocurrency.cv: ${signal.total} recent stories, ${signal.positive} positive and ${signal.negative} negative. Market price remains sourced from Twelve Data/CoinDesk.`,
            aggressive: `${asset.sym} news momentum is ${signal.sentiment.toLowerCase()} with ${signal.total} recent stories. Confirm with price trend before taking action.`,
            quant: `${asset.sym} news signal: score ${sentimentStrength.toFixed(2)}, hype ${hype}/100, sample ${signal.total} articles from cryptocurrency.cv.`,
            meme: `${asset.sym} news chatter: ${signal.total} stories, ${signal.sentiment.toLowerCase()} tilt.`,
            institutional: `${asset.sym} media sentiment is ${signal.sentiment.toLowerCase()} based on cryptocurrency.cv aggregation. Treat as a news factor, not a standalone trade signal.`,
        },
    };
}

async function syncNewsSentimentForAsset(sym) {
    if (!window.SentiNewsData || !ASSETS[sym]) return false;
    const articles = await window.SentiNewsData.getAssetNews(sym, 12);
    const signal = window.SentiNewsData.deriveSignal(articles);
    ASSETS[sym] = mergeNewsSentiment(ASSETS[sym], signal);
    return true;
}

function normalizeCandleData(payload, fallbackBasePrice) {
    const rawCandles = Array.isArray(payload)
        ? payload
        : payload?.candles || payload?.data || payload?.history || payload?.points || [];

    const candles = rawCandles.map(point => {
        const timeValue = point.time || point.timestamp || point.date || point.x;
        const unixTime = typeof timeValue === 'number'
            ? (timeValue > 9999999999 ? Math.floor(timeValue / 1000) : timeValue)
            : Math.floor(new Date(timeValue).getTime() / 1000);
        const open = parseNumeric(point.open ?? point.o);
        const high = parseNumeric(point.high ?? point.h);
        const low = parseNumeric(point.low ?? point.l);
        const close = parseNumeric(point.close ?? point.c ?? point.price ?? point.value);

        if (!unixTime || [open, high, low, close].some(v => v === null)) return null;
        return { time: unixTime, open, high, low, close };
    }).filter(Boolean);

    return candles.length ? candles : generateCandleData(fallbackBasePrice, getCurrentTimeframeCount());
}

function buildVolumeSeriesFromCandles(candles) {
    return candles.map(candle => ({
        time: candle.time,
        value: Math.max(100, Math.abs(candle.close - candle.open) * 1000),
        color: candle.close >= candle.open ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
    }));
}

function refreshAssetRows() {
    const rows = document.querySelectorAll('.asset-row');
    const symbols = ['DOGE', 'PEPE', 'SOL', 'AVAX'];

    rows.forEach((row, index) => {
        const sym = symbols[index];
        const asset = ASSETS[sym];
        if (!asset) return;

        const assetName = row.querySelector('.asset-name');
        const assetSub = row.querySelector('.asset-sub');
        const assetPrice = row.querySelector('.asset-price');
        const assetChange = row.querySelector('.asset-change');
        const assetChip = row.querySelector('.asset-chip');

        if (assetName) assetName.innerHTML = `${asset.sym} <span class="${asset.change >= 0 ? 'green' : 'red'}">${formatAssetPrice(asset.price)}</span>`;
        if (assetSub) assetSub.textContent = asset.name;
        if (assetPrice) assetPrice.textContent = formatAssetPrice(asset.price);
        if (assetChip) {
            assetChip.textContent = `H ${Math.round(asset.hype)}`;
            assetChip.className = `asset-chip ${asset.hype >= 75 ? 'orange' : asset.change >= 0 ? 'green-chip' : 'muted-chip'}`;
        }
        if (assetChange) {
            const sign = asset.change >= 0 ? '+' : '';
            assetChange.textContent = `${sign}${asset.change.toFixed(2)}% ${asset.change >= 0 ? '↑' : '↓'}`;
            assetChange.className = `asset-change ${asset.change >= 0 ? 'green' : 'red'}`;
        }
    });
}

function updateWatchSnippet() {
    const rows = document.querySelectorAll('#watchSnip .wsnip-row');
    if (!rows.length) return;

    const movers = Object.values(ASSETS)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 2);

    movers.forEach((asset, index) => {
        const row = rows[index];
        if (!row) return;
        row.innerHTML = `<span class="${asset.change >= 0 ? 'green' : 'red'}">${asset.change >= 0 ? '⬆' : '⬇'} ${asset.sym}</span><span class="wsnip-val">${formatSignedMetric(asset.change)}</span>`;
    });
}

function updateMarketStatusConnection(isConnected) {
    const pill = document.querySelector('.market-status-pill');
    if (!pill) return;

    if (isConnected) {
        const source = lastSuccessfulApiUrl.includes('tiingo')
            ? 'TIINGO CONNECTED'
            : lastSuccessfulApiUrl.includes('twelvedata')
                ? 'TWELVE DATA CONNECTED'
                : lastSuccessfulApiUrl.includes('coindesk')
                    ? 'COINDESK CONNECTED'
                    : 'BACKEND CONNECTED';
        pill.innerHTML = `<span class="status-dot"></span> LIVE &bull; ${source}`;
        pill.style.color = 'var(--green)';
        pill.style.borderColor = 'rgba(34,197,94,.3)';
        pill.style.background = 'rgba(34,197,94,.1)';
        updateDataSourceAttribution(source);
        return;
    }

    updateMarketStatusTime();
}

function updateDataSourceAttribution(source) {
    const footer = document.querySelector('.rpanel-footer .muted');
    if (!footer) return;
    footer.innerHTML = source === 'TIINGO CONNECTED'
        ? '<a href="https://www.tiingo.com" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">Data sourced by Tiingo</a> &bull; SENTI-ENGINE v3'
        : source === 'TWELVE DATA CONNECTED'
            ? '<a href="https://twelvedata.com" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">Data sourced by Twelve Data</a> &bull; SENTI-ENGINE v3'
        : source === 'COINDESK CONNECTED'
            ? '<a href="https://data.coindesk.com" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">Data sourced by CoinDesk Data</a> &bull; SENTI-ENGINE v3'
        : 'SENTI-ENGINE v3';
}

// ─── USER INFO ────────────────────────────────────
function loadUserInfo() {
    try {
        const u = JSON.parse(localStorage.getItem('smUser') || '{}');
        const name = u.name || u.username || u.email?.split('@')[0] || 'Trader';
        const initials = name.slice(0, 1).toUpperCase();
        const el = document.getElementById('userDisplayName');
        const ci = document.getElementById('userAvatarInitial');
        if (el) el.textContent = name;
        if (ci) ci.textContent = initials;
    } catch (e) { }
}

// ─── MARKET STATUS ────────────────────────────────
function updateMarketStatusTime() {
    if (backendLiveMode) {
        updateMarketStatusConnection(true);
        return;
    }

    const h = new Date().getHours();
    const isOpen = h >= 9 && h < 17;
    const pill = document.querySelector('.market-status-pill');
    if (pill) {
        pill.innerHTML = `<span class="status-dot"></span> LIVE &bull; ${isOpen ? 'MARKET OPEN' : 'AFTER HOURS'}`;
        pill.style.color = isOpen ? 'var(--green)' : 'var(--orange)';
        pill.style.borderColor = isOpen ? 'rgba(34,197,94,.3)' : 'rgba(249,115,22,.3)';
        pill.style.background = isOpen ? 'rgba(34,197,94,.1)' : 'rgba(249,115,22,.1)';
    }
}

// ─── TICKER TAPE ─────────────────────────────────
function initTickerTape() {
    const tape = document.getElementById('tickerTape');
    if (!tape) return;

    const items = Object.values(ASSETS);
    let html = '';
    // Build two copies for seamless looping
    for (let pass = 0; pass < 2; pass++) {
        items.forEach(a => {
            const upDown = a.change >= 0 ? 'up' : 'down';
            const sign = a.change >= 0 ? '+' : '';
            const priceStr = a.price < 0.01 ? a.price.toExponential(2) : (a.price < 10 ? '$' + a.price.toFixed(4) : '$' + a.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            html += `<div class="ticker-item-tape" onclick="switchAsset('${a.sym}')">
                <span class="t-sym">${a.sym}</span>
                <span class="t-price">${priceStr}</span>
                <span class="t-chg ${upDown}">${sign}${a.change.toFixed(2)}%</span>
            </div>`;
        });
    }
    tape.innerHTML = html;
}

// ─── ASSET SWITCHING ─────────────────────────────
function switchAsset(sym) {
    const a = ASSETS[sym];
    if (!a) return;
    currentAssetSym = sym;
    window.currentAssetSym = sym;

    // Close search modal
    closeSearchModal();

    // Update search box label
    const lbl = document.getElementById('searchBoxLabel');
    if (lbl) lbl.textContent = a.name;

    // Update KPI cards
    updateKPICards(a);

    // Update charts with new data
    if (candleSeries) {
        const data = Array.isArray(a.history) && a.history.length
            ? normalizeCandleData(a.history, a.basePrice)
            : generateCandleData(a.basePrice, getCurrentTimeframeCount());
        renderHistoricalSeries(data);
    }

    // Update chart header label
    const sectionLbl = document.querySelector('.section-label');
    if (sectionLbl) sectionLbl.textContent = `${sym} PRICE & HYPE BREAKDOWN`;

    // Update AI panel
    updateAIPanel(a);

    // Update bottom cards
    updateBottomCards(a);

    // Update hype panel
    updateHypePanel(a);
    updateMiniHypeChart(a);

    // Update momentum phase
    const mph = document.getElementById('momentumPhaseLabel');
    if (mph) mph.textContent = a.phase;
    refreshAssetRows();
    updateWatchSnippet();

    // Toast notification
    showToast(`Switched to ${a.name}`, `Hype: ${a.hype}/100 · ${a.sentiment}`, a.change >= 0 ? 'success' : 'warning');
    loadHistoricalSeries(sym, { silent: true });
    syncNewsSentimentForAsset(sym)
        .then(updated => {
            if (!updated || currentAssetSym !== sym) return;
            const asset = ASSETS[sym];
            updateKPICards(asset);
            updateAIPanel(asset);
            updateBottomCards(asset);
            updateHypePanel(asset);
            updateMiniHypeChart(asset);
            refreshAssetRows();
            renderSearchResults(document.getElementById('searchMainInput')?.value || '');
        })
        .catch(error => console.warn('News sentiment sync failed:', error?.message || error));
}

function updateKPICards(a) {
    // Asset card
    const kpiBig = document.querySelector('.kpi-card:first-child .kpi-big');
    const kpiSub = document.querySelector('.kpi-card:first-child .kpi-sub');
    if (kpiBig) kpiBig.textContent = a.sym;
    if (kpiSub) kpiSub.textContent = a.name;

    // Price card
    const priceEl = document.getElementById('priceDisplay');
    if (priceEl) {
        const sign = a.change >= 0 ? '+' : '';
        const cls = a.change >= 0 ? 'green-sm' : 'red-sm';
        const priceStr = a.price < 0.01 ? '$' + a.price.toExponential(4) : (a.price < 10 ? '$' + a.price.toFixed(4) : '$' + a.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        priceEl.innerHTML = `${priceStr} <span class="${cls}">${sign}${a.change.toFixed(2)}%</span>`;
    }
    const priceSub = document.querySelectorAll('.kpi-card')[1]?.querySelector('.kpi-sub');
    if (priceSub) {
        const delta = a.price - (a.basePrice || a.price);
        const deltaSign = delta >= 0 ? '+' : '-';
        priceSub.textContent = `${delta >= 0 ? '↗' : '↘'} ${deltaSign}${formatAssetPrice(Math.abs(delta)).replace('$', '$')}`;
        priceSub.className = `kpi-sub ${delta >= 0 ? 'green' : 'red'}`;
    }

    // Sentiment card
    const sentBig = document.querySelectorAll('.kpi-card')[2]?.querySelector('.kpi-big');
    const sentBadge = document.querySelector('.badge-orange');
    if (sentBig) {
        sentBig.textContent = a.sentiment;
        sentBig.className = 'kpi-big ' + (a.change >= 0 ? 'green' : 'red');
    }
    if (sentBadge) {
        sentBadge.innerHTML = `⬤ ${a.phase}`;
        sentBadge.style.color = a.change >= 0 ? 'var(--orange)' : 'var(--red)';
        sentBadge.style.background = a.change >= 0 ? 'rgba(249,115,22,.15)' : 'rgba(239,68,68,.12)';
    }

    // Hype score number in panel
    document.querySelectorAll('.hype-num').forEach(el => el.textContent = a.hype);
    document.querySelectorAll('.hype-bar-fill').forEach(el => el.style.width = a.hype + '%');
    const extremeBadge = document.querySelector('.extreme-badge');
    if (extremeBadge) extremeBadge.textContent = a.hype >= 80 ? 'EXTREME HYPE' : a.hype >= 60 ? 'HIGH HYPE' : 'MODERATE HYPE';
}

function updateAIPanel(a) {
    const cfg = JSON.parse(localStorage.getItem('smSettings') || '{}');
    const personality = cfg.aiPersonality || 'conservative';
    const body = document.getElementById('aiExplBody');
    if (!body) return;
    const aiPayload = a.ai && typeof a.ai === 'object'
        ? a.ai
        : normalizeAiPayload(ASSETS[currentAssetSym]?.ai || {}, a.ai);
    body.style.opacity = '0';
    setTimeout(() => {
        body.innerHTML = aiPayload[personality] || aiPayload.conservative || `${a.sym} is currently ${a.sentiment.toLowerCase()}.`;
        body.style.opacity = '1';
        body.style.transition = 'opacity .4s';
    }, 250);
}

function updateBottomCards(a) {
    // Hype score breakdown
    const h2score = document.querySelector('.hype2-score');
    if (h2score) h2score.innerHTML = `Hype Score: <span class="orange">${a.hype}</span> <span class="muted">/100</span>`;

    const hstats = document.querySelectorAll('.bot-card:nth-child(2) .hstat');
    const vals = [a.mentions, a.engagement, a.sentStr, a.volume];
    hstats.forEach((hs, i) => {
        const valSpan = hs.querySelector('span:last-child');
        if (valSpan && vals[i]) {
            valSpan.textContent = vals[i];
            const isPos = !vals[i].startsWith('-');
            valSpan.className = isPos ? 'orange' : 'red';
        }
    });

    // Technical confirmation
    const techStatus = document.querySelector('.tech-status');
    const techList = document.querySelectorAll('.tech-list li');
    const confPct = document.getElementById('aiConfidencePct');
    if (techStatus) {
        techStatus.textContent = a.change >= 0 ? 'BULLISH CONFIRMED' : 'BEARISH SIGNAL';
        techStatus.style.color = a.change >= 0 ? 'var(--green)' : 'var(--red)';
    }
    if (confPct) confPct.textContent = a.confidence + '%';
    if (techList[0]) techList[0].innerHTML = `<span class="${a.change >= 0 ? 'green' : 'red'}">${a.change >= 0 ? '✓' : '✗'}</span> Price ${a.ema}`;
    if (techList[1]) techList[1].innerHTML = `<span class="${a.change >= 0 ? 'green' : 'red'}">${a.change >= 0 ? '✓' : '✗'}</span> Volume ${a.volSpike}`;
    if (techList[2]) techList[2].innerHTML = `<span class="${a.change >= 0 ? 'green' : 'red'}">${a.change >= 0 ? '✓' : '✗'}</span> RSI: ${a.rsi}`;

    // Correlation matrix
    updateCorrelationMatrix(a);
}

function updateHypePanel(a) {
    const hStats = document.querySelector('.hype-panel .hype-stats');
    if (!hStats) return;
    const labels = ['Mention Growth', 'Engagement Spike', 'Sentiment Strength', 'Volume Spike'];
    const vals = [a.mentions, a.engagement, a.sentStr, a.volume];
    hStats.querySelectorAll('.hstat').forEach((hs, i) => {
        if (i < labels.length) {
            const valSpan = hs.querySelector('span:last-child');
            const isPos = vals[i] && !vals[i].startsWith('-');
            hs.querySelector('span:first-child').textContent = labels[i];
            if (valSpan) { valSpan.textContent = vals[i]; valSpan.className = isPos ? 'green' : 'red'; }
        }
    });
    // Tickers row
    const tickItems = document.querySelectorAll('.ticker-item');
    if (tickItems[0]) {
        const corr = (ASSETS[currentAssetSym]?.corr || [0.78, 0.61, 0.54]);
        tickItems[0].querySelector('.tick-coin').textContent = currentAssetSym;
        tickItems[0].querySelector('.tick-v1').textContent = corr[0].toFixed(2) + '%';
        tickItems[0].querySelector('.tick-v2').textContent = '● ' + corr[0].toFixed(2);
        tickItems[1]?.querySelector('.tick-coin') && (tickItems[1].querySelector('.tick-coin').textContent = currentAssetSym);
        tickItems[1]?.querySelector('.tick-v1') && (tickItems[1].querySelector('.tick-v1').textContent = corr[1].toFixed(2));
    }
}

function updateCorrelationMatrix(a) {
    const corr = a.corr || [0.78, 0.61, 0.54];
    const matrixRows = document.querySelectorAll('.matrix-r');
    const clsMap = v => v >= 0.65 ? 'green' : 'orange';
    matrixRows.forEach((row, i) => {
        const spans = row.querySelectorAll('.orange, .green, .mrow-hi');
        spans.forEach(s => {
            if (corr[i] !== undefined) {
                s.textContent = s.classList.contains('mrow-hi') ? `⊕ ${corr[i].toFixed(2)}` : corr[i].toFixed(2);
                s.className = s.classList.contains('mrow-hi') ? `mrow-hi ${clsMap(corr[i])}` : clsMap(corr[i]);
            }
        });
    });
}

// ─── MAIN CANDLESTICK CHART ───────────────────────
function initMainChart() {
    const container = document.getElementById('mainChartContainer');
    if (!container) return;

    mainChart = LightweightCharts.createChart(container, {
        width: container.clientWidth || 500,
        height: container.clientHeight || 220,
        layout: {
            background: { type: 'solid', color: '#161b27' },
            textColor: '#6b7280',
        },
        grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        rightPriceScale: {
            borderColor: '#21293a',
            scaleMarksCount: 4,
        },
        timeScale: {
            borderColor: '#21293a',
            timeVisible: true,
            secondsVisible: false,
        },
        crosshair: {
            mode: 0,
            vertLine: { color: '#374151', width: 1, style: 1 },
            horzLine: { color: '#374151', width: 1, style: 1 },
        },
        handleScroll: true,
        handleScale: true,
    });

    candleSeries = mainChart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
    });

    maSeries = mainChart.addLineSeries({
        color: '#eab308',
        lineWidth: 1.5,
        lineStyle: 0,
        priceLineVisible: false,
    });

    const candles = generateCandleData(ASSETS[currentAssetSym].basePrice, getCurrentTimeframeCount());
    renderHistoricalSeries(candles);

    // Wire timeframe tabs
    document.querySelectorAll('.ttab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ttab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTimeframe = tab.textContent.trim();
            const newCandles = Array.isArray(ASSETS[currentAssetSym].history) && ASSETS[currentAssetSym].history.length
                ? normalizeCandleData(ASSETS[currentAssetSym].history, ASSETS[currentAssetSym].basePrice)
                : generateCandleData(ASSETS[currentAssetSym].basePrice, getCurrentTimeframeCount());
            renderHistoricalSeries(newCandles);
            loadHistoricalSeries(currentAssetSym, { silent: true });
        });
    });

    const ro = new ResizeObserver(() => {
        if (mainChart && container.clientWidth > 0 && container.clientHeight > 0) {
            mainChart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        }
    });
    ro.observe(container);
}

// ─── VOLUME BAR CHART ─────────────────────────────
function initVolumeChart() {
    const container = document.getElementById('volumeContainer');
    if (!container) return;

    const volumeChart = LightweightCharts.createChart(container, {
        width: container.clientWidth || 500,
        height: container.clientHeight || 54,
        layout: { background: { color: '#161b27' }, textColor: '#6b7280' },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        timeScale: { visible: false },
        crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
        handleScroll: false,
        handleScale: false,
    });

    volumeSeries = volumeChart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
    });

    const volData = generateVolumeData(200);
    volumeSeries.setData(volData);

    const ro = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            volumeChart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        }
    });
    ro.observe(container);
}

// ─── MINI HYPE CHART ──────────────────────────────
function initMiniHypeChart() {
    const ctx = document.getElementById('miniHypeChart');
    if (!ctx) return;

    miniHypeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            datasets: [{
                data: [30, 42, 38, 55, 48, 65, 58, 70, 65, 78, 72, 85, 80, 82],
                borderColor: '#f97316',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0.4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } },
            animation: false,
        }
    });
}

function updateMiniHypeChart(asset) {
    if (!miniHypeChart || !asset) return;

    const end = Math.max(20, Math.round(asset.hype));
    const series = Array.from({ length: 14 }, (_, index) => {
        const base = end - (13 - index) * 2.2;
        return Math.max(10, Math.min(100, Number(base.toFixed(1))));
    });

    miniHypeChart.data.datasets[0].data = series;
    miniHypeChart.update('none');
}

// ─── LIVE CANDLE UPDATE ───────────────────────────
function updateLiveCandle() {
    return;
}

// ─── DATA GENERATORS ──────────────────────────────
function generateCandleData(basePrice, count) {
    return [];
}

function generateVolumeData(count) {
    return [];
}

function computeMA(candles, period) {
    const ma = [];
    for (let i = period - 1; i < candles.length; i++) {
        const sum = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0);
        ma.push({ time: candles[i].time, value: sum / period });
    }
    return ma;
}

function renderHistoricalSeries(candles) {
    if (!Array.isArray(candles) || !candles.length || !candleSeries) return;
    candleSeries.setData(candles);
    if (maSeries) maSeries.setData(computeMA(candles, 20));
    if (volumeSeries) volumeSeries.setData(buildVolumeSeriesFromCandles(candles));
    currentBar = { ...candles[candles.length - 1] };
}

async function loadHistoricalSeries(sym, { silent = false } = {}) {
    const endpoint = DASHBOARD_API_CONFIG.endpoints.history.replace('{symbol}', sym);

    try {
        let candles;
        if (DASHBOARD_API_CONFIG.provider === 'tiingo') {
            candles = await fetchCoinDeskHistory(sym);
        } else {
            try {
                candles = await fetchTwelveHistory(sym);
            } catch (twelveError) {
                if (!silent) console.warn(`Twelve Data history unavailable for ${sym}:`, twelveError?.message || twelveError);
                candles = await fetchCoinDeskHistory(sym);
            }
        }
        ASSETS[sym].history = candles;
        renderHistoricalSeries(candles);
        backendLiveMode = true;
        updateMarketStatusConnection(true);
        return true;
    } catch (error) {
        if (!silent) console.warn(`History sync failed for ${sym}:`, error?.message || error);
        return false;
    }
}

async function syncDashboardData({ silent = false } = {}) {
    if (isSyncInFlight) return false;
    isSyncInFlight = true;

    try {
        let payload;
        if (DASHBOARD_API_CONFIG.provider === 'tiingo') {
            payload = await fetchCoinDeskDashboardPayload();
        } else {
            try {
                payload = await fetchTwelveDashboardPayload();
                if (!payload.assets?.length) throw new Error('No Twelve Data assets returned');
            } catch (twelveError) {
                if (!silent) console.warn('Twelve Data dashboard unavailable:', twelveError?.message || twelveError);
                payload = await fetchCoinDeskDashboardPayload();
            }
        }
        const updatedSymbols = applyAssetsPayload(payload);
        if (!updatedSymbols.length) throw new Error('No dashboard assets in API response');

        backendLiveMode = true;
        updateMarketStatusConnection(true);
        refreshAssetRows();
        updateWatchSnippet();
        initTickerTape();
        renderSearchResults(document.getElementById('searchMainInput')?.value || '');

        if (updatedSymbols.includes(currentAssetSym)) {
            await syncNewsSentimentForAsset(currentAssetSym).catch(error => {
                if (!silent) console.warn('News sentiment sync failed:', error?.message || error);
            });
            const asset = ASSETS[currentAssetSym];
            updateKPICards(asset);
            updateAIPanel(asset);
            updateBottomCards(asset);
            updateHypePanel(asset);
            updateMiniHypeChart(asset);
            await loadHistoricalSeries(currentAssetSym, { silent: true });
        }

        if (!silent) showToast('Live data synced', `Dashboard updated from ${lastSuccessfulApiUrl || 'backend API'}`, 'success');
        return true;
    } catch (error) {
        backendLiveMode = false;
        updateMarketStatusConnection(false);
        if (!silent) console.warn('Dashboard sync failed:', error?.message || error);
        return false;
    } finally {
        isSyncInFlight = false;
    }
}

function startDashboardPolling() {
    clearInterval(dashboardPollTimer);
    dashboardPollTimer = setInterval(() => {
        syncDashboardData({ silent: true });
    }, DASHBOARD_API_CONFIG.pollMs);
}

window.syncDashboardData = syncDashboardData;
window.currentAssetSym = currentAssetSym;
window.SENTI_DASHBOARD_API = DASHBOARD_API_CONFIG;

// ─── SEARCH MODAL ────────────────────────────────
function openSearchModal() {
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchMainInput');
    if (overlay) {
        overlay.classList.add('open');
        document.addEventListener('keydown', searchModalKeyHandler);
        setTimeout(() => { if (input) input.focus(); }, 50);
        renderSearchResults('');
    }
}

function closeSearchModal() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        document.removeEventListener('keydown', searchModalKeyHandler);
        searchFocusIdx = -1;
        const input = document.getElementById('searchMainInput');
        if (input) input.value = '';
    }
}

function handleSearchOverlayClick(e) {
    if (e.target.id === 'searchOverlay') closeSearchModal();
}

function filterSearchAssets(query) {
    searchFocusIdx = -1;
    renderSearchResults(query);
}

function renderSearchResults(query) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    const q = query.toLowerCase().trim();
    const all = Object.values(ASSETS);
    const filtered = q ? all.filter(a =>
        a.sym.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.sentiment.toLowerCase().includes(q)
    ) : all;

    currentSearchResults = filtered;

    if (!filtered.length) {
        container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">No assets found for "${query}"</div>`;
        return;
    }

    let html = `<div class="search-section-label">Assets ${q ? '— Search Results' : '— All Markets'}</div>`;
    filtered.forEach((a, i) => {
        const sign = a.change >= 0 ? '+' : '';
        const dir = a.change >= 0 ? 'up' : 'down';
        const priceStr = a.price < 0.01 ? '$' + a.price.toExponential(2) : (a.price < 10 ? '$' + a.price.toFixed(4) : '$' + a.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        html += `<div class="search-asset-row" onclick="switchAsset('${a.sym}')" data-idx="${i}">
            <div class="search-asset-icon">${a.emoji}</div>
            <div class="search-asset-info">
                <div class="search-asset-sym">${a.sym} ${a.sym === currentAssetSym ? '<span class="badge-new">ACTIVE</span>' : ''}</div>
                <div class="search-asset-name">${a.name} · Hype ${a.hype}/100</div>
            </div>
            <div class="search-asset-right">
                <div class="search-asset-price">${priceStr}</div>
                <div class="search-asset-chg ${dir}">${sign}${a.change.toFixed(2)}%</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function searchModalKeyHandler(e) {
    const rows = document.querySelectorAll('.search-asset-row');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        searchFocusIdx = Math.min(searchFocusIdx + 1, rows.length - 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        searchFocusIdx = Math.max(searchFocusIdx - 1, 0);
    } else if (e.key === 'Enter' && searchFocusIdx >= 0) {
        const asset = currentSearchResults[searchFocusIdx];
        if (asset) switchAsset(asset.sym);
        return;
    } else if (e.key === 'Escape') {
        closeSearchModal();
        return;
    }
    rows.forEach((r, i) => r.classList.toggle('focused', i === searchFocusIdx));
    if (searchFocusIdx >= 0 && rows[searchFocusIdx]) {
        rows[searchFocusIdx].scrollIntoView({ block: 'nearest' });
    }
}

// ─── ALERTS HANDLER ───────────────────────────────
function handleAlertsClick() {
    if (notifCount > 0) {
        notifCount--;
        const b = document.getElementById('alertCount');
        const n = document.getElementById('alertCountNav');
        if (b) { b.textContent = notifCount; if (notifCount === 0) b.style.display = 'none'; }
        if (n) { n.textContent = notifCount; if (notifCount === 0) n.style.display = 'none'; }
    }
    const msgs = [
        ['⚠ Price Alert', 'AVAX crossed below $40.00 support'],
        ['🔥 Hype Alert', 'PEPE hype score surged to 94/100'],
        ['📡 Sentiment Alert', 'DOGE sentiment shifted strongly bullish'],
    ];
    const msg = msgs[Math.max(0, 2 - notifCount)] || msgs[0];
    showToast(msg[0], msg[1], 'warning');
}

// ─── NAV TAB SWITCHER ─────────────────────────────
function switchTab(e, tab) {
    e.preventDefault();
    document.querySelectorAll('.snav-link').forEach(l => l.classList.remove('active'));
    e.target.classList.add('active');
    if (tab === 'analysis') {
        showToast('📊 Analysis Mode', 'Advanced signal analysis view (coming soon)', 'info');
    }
}

// ─── TOAST SYSTEM ─────────────────────────────────
function showToast(title, msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: '✓', warning: '⚠', error: '✗', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ'}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
        </div>
        <button class="toast-close" onclick="dismissToast(this.parentElement)">×</button>`;

    container.appendChild(toast);

    setTimeout(() => dismissToast(toast), 4000);
}

function dismissToast(el) {
    if (!el || !el.parentElement) return;
    el.classList.add('toast-exit');
    setTimeout(() => el.remove(), 280);
}

// ─── BOOKMARK ─────────────────────────────────────
function toggleBookmark(btn) {
    bookmarked = !bookmarked;
    const icon = document.getElementById('bookmarkIcon');
    if (bookmarked) {
        btn.style.color = '#22c55e';
        if (icon) { icon.setAttribute('fill', '#22c55e'); icon.setAttribute('stroke', '#22c55e'); }
        showToast('🔖 Bookmarked', `${ASSETS[currentAssetSym].name} saved to watchlist`, 'success');
    } else {
        btn.style.color = '';
        if (icon) { icon.setAttribute('fill', 'none'); icon.setAttribute('stroke', 'currentColor'); }
        showToast('Bookmark removed', `${ASSETS[currentAssetSym].name} removed from watchlist`, 'info');
    }
}

// ─── CHATBOT ──────────────────────────────────────
function initChatbot() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const messages = document.getElementById('chatWindow');

    if (!input || !sendBtn || !messages) return;

    function getAssetResponse(text) {
        const t = text.toLowerCase();
        const a = ASSETS[currentAssetSym];
        if (t.includes('buy') || t.includes('long') || t.includes('bullish')) {
            return a.change >= 0
                ? `${a.sym} looks ${a.sentiment.toLowerCase()}. Hype ${a.hype}/100 with ${a.mentions} mention growth. Consider entry with stop below 20 EMA.`
                : `${a.sym} is currently ${a.sentiment.toLowerCase()}. Caution advised — wait for sentiment reversal before buying.`;
        }
        if (t.includes('sell') || t.includes('short') || t.includes('bearish')) {
            return a.change < 0
                ? `${a.sym} showing bearish signals. RSI: ${a.rsi}. Consider taking profits or reducing exposure.`
                : `${a.sym} is bullish. No sell signal yet. Monitor if hype drops below 50/100.`;
        }
        if (t.includes('hype') || t.includes('sentiment') || t.includes('social')) {
            return `${a.sym} hype score: ${a.hype}/100. Mentions: ${a.mentions} · Engagement: ${a.engagement} · Sentiment: ${a.sentStr}. Phase: ${a.phase}.`;
        }
        if (t.includes('price') || t.includes('prediction') || t.includes('target')) {
            const conf = a.confidence;
            return `${a.sym} AI confidence: ${conf}%. Current trend: ${a.sentiment}. Volume spike: ${a.volume}. Correlation accuracy: ${a.corr?.[0]?.toFixed(2) || 'N/A'}.`;
        }
        const responses = [
            `${a.sym} is showing ${a.sentiment.toLowerCase()} signals with hype at ${a.hype}/100 and ${a.mentions} mention growth.`,
            `Based on ${a.name} data: sentiment confidence ${a.confidence}%, social momentum ${a.engagement}, volume ${a.volume}.`,
            `${a.sym} phase: ${a.phase}. Key levels based on 20 EMA. Monitor RSI: currently ${a.rsi}.`,
        ];
        return responses[0];
    }

    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // User message
        const userDiv = document.createElement('div');
        userDiv.style.cssText = 'text-align:right;margin-bottom:6px';
        userDiv.innerHTML = `<span style="background:var(--accent,#22c55e);color:#000;padding:4px 10px;border-radius:12px 12px 0 12px;font-size:11px;font-weight:600;display:inline-block">${text}</span>`;
        messages.appendChild(userDiv);
        input.value = '';
        messages.scrollTop = messages.scrollHeight;

        // Typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        messages.appendChild(typingDiv);
        messages.scrollTop = messages.scrollHeight;

        setTimeout(() => {
            typingDiv.remove();
            const botDiv = document.createElement('div');
            botDiv.style.cssText = 'margin-bottom:6px';
            const reply = getAssetResponse(text);
            botDiv.innerHTML = `<span style="font-size:11px;color:#94a3b8;display:block;background:rgba(34,197,94,.06);padding:6px 10px;border-radius:6px 12px 12px 6px">🤖 ${reply}</span>`;
            messages.appendChild(botDiv);
            messages.scrollTop = messages.scrollHeight;
        }, 1000);
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

// ─── LIVE FEED ────────────────────────────────────
function startLiveFeed() {
    const scheduleFallbackFeed = () => {
        clearInterval(liveFeedTimer);
        liveFeedTimer = setInterval(() => {
            addFeedItem('Live news from NewsAPI, Finnhub & backend', 'green', 'NEWS', 'live');
        }, 30000);
    };

    const syncFeed = async () => {
        try {
            if (window.SentiNewsData) {
                const articles = await window.SentiNewsData.getNews({ limit: 8 });
                const items = normalizeNewsFeedItems(articles || []);
                if (items.length) {
                    const feedList = document.getElementById('feedList');
                    if (feedList) {
                        feedList.innerHTML = '';
                        items.slice(0, 6).forEach(item => addFeedItem(item.text, item.type, item.icon, item.timeLabel));
                    }
                    clearInterval(liveFeedTimer);
                    return;
                }
            }
            throw new Error('No news');
        } catch (e) {
            console.log('Live feed fallback:', e.message);
        }
        scheduleFallbackFeed();
    };

    syncFeed();
    setInterval(syncFeed, 12000);
}

// ─── USER GUIDE MODAL ─────────────────────────────
function openGuide(e) {
    if (e) e.preventDefault();
    const overlay = document.getElementById('guideOverlay');
    if (overlay) {
        overlay.classList.add('open');
        document.addEventListener('keydown', guideEsc);
    }
}

function closeGuide(e) {
    if (e && e.target && e.target.id !== 'guideOverlay') return;
    const overlay = document.getElementById('guideOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        document.removeEventListener('keydown', guideEsc);
    }
}

function guideEsc(e) {
    if (e.key === 'Escape') closeGuide();
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────
function startLiveFeed() {
    function scheduleFallbackFeed() {
    clearInterval(liveFeedTimer);

    const demoFeed = [
        { text: "BTC sentiment surging +12% in last hour", type: "bullish" },
        { text: "ETH whale accumulation detected (↑ volume spike)", type: "bullish" },
        { text: "DOGE hype increasing across social platforms", type: "neutral" },
        { text: "SOL showing strong short-term correlation with BTC", type: "neutral" },
        { text: "Market volatility rising – caution advised", type: "bearish" },
        { text: "Altcoin momentum building after news spike", type: "bullish" }
    ];

    let index = 0;

    liveFeedTimer = setInterval(() => {
        const item = demoFeed[index % demoFeed.length];

        addFeedItem(
            item.text,
            item.type,
            "LIVE"
        );

        index++;
    }, 30000);
}

    const syncFeed = async () => {
        try {
            const items = window.SentiNewsData
                ? normalizeNewsFeedItems(await window.SentiNewsData.getNews({ limit: 8 }))
                : normalizeFeedItems(await fetchJsonWithFallback(DASHBOARD_API_CONFIG.endpoints.feed));
            if (!items.length) throw new Error('No live feed items');

            clearInterval(liveFeedTimer);
            liveFeedTimer = null;
            const feedList = document.getElementById('feedList');
            if (!feedList) return;
            feedList.innerHTML = '';
            items.slice(0, 6).forEach(item => addFeedItem(item.text, item.type, item.icon, item.timeLabel));
            backendLiveMode = true;
            updateMarketStatusConnection(true);
        } catch (error) {
            if (!liveFeedTimer) scheduleFallbackFeed();
        }
    };

    scheduleFallbackFeed();
    syncFeed();
    setInterval(syncFeed, DASHBOARD_API_CONFIG.feedPollMs);
}

function addFeedItem(text, type = 'green', icon = 'LIVE', timeLabel = 'just now') {
    const fl = document.getElementById('feedList');
    if (!fl) return;

    const div = document.createElement('div');
    const safeIcon = String(icon || 'LIVE').slice(0, 6).toUpperCase();
    div.className = 'feed-item feed-new';
    div.innerHTML = `
        <span class="feed-icon ${type}">${safeIcon}</span>
        <div class="feed-body">
            <div class="feed-text">${text}</div>
            <div class="feed-time">${timeLabel}</div>
        </div>`;

    fl.insertBefore(div, fl.firstChild);
    while (fl.children.length > 6) fl.removeChild(fl.lastChild);
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        // Skip if inside input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            openSearchModal();
        } else if (e.key === 'b' || e.key === 'B') {
            const btn = document.getElementById('bookmarkBtn');
            if (btn) toggleBookmark(btn);
        } else if (e.key === 'Escape') {
            closeSearchModal();
            closeGuide();
        } else if (e.key === '?' || e.key === '/') {
            showToast('⌨ Keyboard Shortcuts', 'K=Search  B=Bookmark  Esc=Close  ?=Help', 'info');
        }
    });
}

// ─── ASSET ROW CLICK (right panel) ────────────────
document.addEventListener('DOMContentLoaded', () => {
    const assetMap = {
        'ar-doge': 'DOGE',
    };
    document.querySelectorAll('.asset-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.wl-arrow-btn')) return;
            const sym = assetMap[row.id] ||
                row.querySelector('.asset-name')?.textContent?.trim()?.split(' ')[0];
            if (sym && ASSETS[sym]) switchAsset(sym);
        });
    });

    // Wire PEPE, SOL, AVAX rows
    const rows = document.querySelectorAll('.asset-row');
    const syms = ['DOGE', 'PEPE', 'SOL', 'AVAX'];
    rows.forEach((row, i) => {
        if (syms[i]) {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.wl-arrow-btn')) switchAsset(syms[i]);
            });
        }
    });
});
