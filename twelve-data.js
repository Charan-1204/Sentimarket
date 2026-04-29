/* SentiMarket shared Twelve Data market client */
(function () {
    'use strict';

    const DEFAULT_API_KEY = '4dc45b80102e4941ba8173553e17c41b';
    const BASE_URL = 'https://api.twelvedata.com';
    const CRYPTO_SYMBOLS = {
        BTC: 'BTC/USD',
        ETH: 'ETH/USD',
        SOL: 'SOL/USD',
        DOGE: 'DOGE/USD',
        PEPE: 'PEPE/USD',
        AVAX: 'AVAX/USD',
        SHIB: 'SHIB/USD',
        XRP: 'XRP/USD',
        BNB: 'BNB/USD',
        LTC: 'LTC/USD',
        WIF: 'WIF/USD',
    };

    function getConfig() {
        const runtime = window.SENTI_API_CONFIG || {};
        const twelve = runtime.twelveData || {};
        return {
            apiKey: twelve.apiKey || localStorage.getItem('twelveDataApiKey') || DEFAULT_API_KEY,
            baseUrl: String(twelve.baseUrl || BASE_URL).replace(/\/$/, ''),
            timeoutMs: Number(twelve.timeoutMs || runtime.timeoutMs || 8000),
        };
    }

    function resolveSymbol(symbol) {
        const upper = String(symbol || '').toUpperCase();
        return CRYPTO_SYMBOLS[upper] || upper;
    }

    function buildUrl(path, params = {}) {
        const cfg = getConfig();
        const url = new URL(cfg.baseUrl + path);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
        });
        url.searchParams.set('apikey', cfg.apiKey);
        return url.toString();
    }

    async function fetchJson(path, params = {}) {
        const cfg = getConfig();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

        try {
            const response = await fetch(buildUrl(path, params), {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`);
            const payload = await response.json();
            if (payload?.status === 'error') throw new Error(payload.message || 'Twelve Data error');
            if (payload?.code && payload?.message) throw new Error(payload.message);
            return payload;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function intervalForTimeframe(timeframe) {
        if (timeframe === '1H') return { interval: '1min', outputsize: 60 };
        if (timeframe === '7D') return { interval: '1h', outputsize: 168 };
        if (timeframe === '5D') return { interval: '1h', outputsize: 120 };
        if (timeframe === '1M') return { interval: '1day', outputsize: 30 };
        if (timeframe === '3M') return { interval: '1day', outputsize: 90 };
        if (timeframe === '6M') return { interval: '1day', outputsize: 180 };
        if (timeframe === '1Y') return { interval: '1day', outputsize: 365 };
        if (timeframe === '2Y') return { interval: '1day', outputsize: 730 };
        if (timeframe === '3Y') return { interval: '1day', outputsize: 1095 };
        return { interval: '5min', outputsize: 288 };
    }

    function normalizeCandle(row) {
        const timestamp = row.datetime || row.date || row.timestamp;
        const time = Math.floor(new Date(timestamp).getTime() / 1000);
        const open = Number(row.open);
        const high = Number(row.high);
        const low = Number(row.low);
        const close = Number(row.close);
        if (![time, open, high, low, close].every(Number.isFinite)) return null;
        return {
            time,
            open,
            high,
            low,
            close,
            volume: Number(row.volume || 0) || 0,
        };
    }

    async function getCandles(symbol, options = {}) {
        const timeframe = options.timeframe || '1D';
        const intervalOptions = intervalForTimeframe(timeframe);
        const payload = await fetchJson('/time_series', {
            symbol: resolveSymbol(symbol),
            interval: options.interval || intervalOptions.interval,
            outputsize: options.outputsize || intervalOptions.outputsize,
            order: 'ASC',
        });
        const rows = Array.isArray(payload?.values) ? payload.values : [];
        return rows.map(normalizeCandle).filter(Boolean).sort((a, b) => a.time - b.time);
    }

    function normalizeQuote(symbol, payload) {
        const price = Number(payload.close ?? payload.price);
        const previous = Number(payload.previous_close ?? payload.previous_close_price ?? payload.open ?? price);
        const change = Number(payload.percent_change ?? (previous ? ((price - previous) / previous) * 100 : 0));
        if (!Number.isFinite(price)) throw new Error(`No Twelve Data price for ${symbol}`);
        return {
            symbol: String(symbol).toUpperCase(),
            price,
            change: Number.isFinite(change) ? change : 0,
            basePrice: Number.isFinite(previous) ? previous : price,
            volume: Number(payload.volume || 0) || 0,
            timestamp: payload.datetime || payload.timestamp || '',
        };
    }

    async function getLatest(symbol) {
        const payload = await fetchJson('/quote', { symbol: resolveSymbol(symbol) });
        return normalizeQuote(symbol, payload);
    }

    async function getLatestBatch(symbols) {
        const results = await Promise.allSettled(symbols.map(symbol => getLatest(symbol)));
        return results
            .map(result => result.status === 'fulfilled' ? result.value : null)
            .filter(Boolean);
    }

    window.SentiPrimaryData = {
        providerName: 'Twelve Data',
        symbols: CRYPTO_SYMBOLS,
        getCandles,
        getLatest,
        getLatestBatch,
        intervalForTimeframe,
        resolveSymbol,
    };
})();
