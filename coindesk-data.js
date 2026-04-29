/* SentiMarket shared CoinDesk Data client */
(function () {
    'use strict';

    const DEFAULT_API_KEY = 'a8f8a1c1feefa609c32770daf953c7c9798d1f1de4c4574cc6c4e4fa46489c41';
    const BASE_URL = 'https://data-api.coindesk.com';
    const DEFAULT_MARKET = 'binance';
    const SYMBOLS = {
        BTC: { market: 'binance', instrument: 'BTC-USDT' },
        ETH: { market: 'binance', instrument: 'ETH-USDT' },
        SOL: { market: 'binance', instrument: 'SOL-USDT' },
        DOGE: { market: 'binance', instrument: 'DOGE-USDT' },
        PEPE: { market: 'binance', instrument: 'PEPE-USDT' },
        AVAX: { market: 'binance', instrument: 'AVAX-USDT' },
        SHIB: { market: 'binance', instrument: 'SHIB-USDT' },
        XRP: { market: 'binance', instrument: 'XRP-USDT' },
        BNB: { market: 'binance', instrument: 'BNB-USDT' },
        LTC: { market: 'binance', instrument: 'LTC-USDT' },
        WIF: { market: 'binance', instrument: 'WIF-USDT' },
    };

    function getConfig() {
        const runtime = window.SENTI_API_CONFIG || {};
        const coindesk = runtime.coindesk || {};
        return {
            apiKey: coindesk.apiKey || localStorage.getItem('coindeskApiKey') || DEFAULT_API_KEY,
            baseUrl: String(coindesk.baseUrl || BASE_URL).replace(/\/$/, ''),
            timeoutMs: Number(coindesk.timeoutMs || runtime.timeoutMs || 8000),
        };
    }

    function buildUrl(path, params = {}) {
        const cfg = getConfig();
        const url = new URL(cfg.baseUrl + path);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
        });
        url.searchParams.set('api_key', cfg.apiKey);
        return url.toString();
    }

    async function fetchJson(path, params = {}) {
        const cfg = getConfig();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

        try {
            const response = await fetch(buildUrl(path, params), {
                headers: {
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`CoinDesk HTTP ${response.status}`);
            const payload = await response.json();
            if (payload?.Err && Object.keys(payload.Err).length) throw new Error(JSON.stringify(payload.Err));
            return payload;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function getSymbol(symbol) {
        const upper = String(symbol || '').toUpperCase();
        return SYMBOLS[upper] || { market: DEFAULT_MARKET, instrument: `${upper}-USDT` };
    }

    function candlePath(unit) {
        if (unit === 'day') return '/spot/v1/historical/days';
        if (unit === 'hour') return '/spot/v1/historical/hours';
        return '/spot/v1/historical/minutes';
    }

    function normalizeCandle(row) {
        const open = Number(row.OPEN ?? row.open);
        const high = Number(row.HIGH ?? row.high);
        const low = Number(row.LOW ?? row.low);
        const close = Number(row.CLOSE ?? row.close ?? row.VALUE);
        const time = Number(row.TIMESTAMP ?? row.time ?? row.ts);
        if (![time, open, high, low, close].every(Number.isFinite)) return null;
        return {
            time,
            open,
            high,
            low,
            close,
            volume: Number(row.VOLUME ?? row.volume ?? row.QUOTE_VOLUME ?? 0) || 0,
        };
    }

    async function getCandles(symbol, options = {}) {
        const pair = getSymbol(symbol);
        const unit = options.unit || 'minute';
        const limit = options.limit || 200;
        const aggregate = options.aggregate || 1;
        const payload = await fetchJson(candlePath(unit), {
            market: pair.market,
            instrument: pair.instrument,
            limit,
            aggregate,
            groups: 'OHLC,VOLUME',
        });
        const rows = Array.isArray(payload?.Data) ? payload.Data : [];
        return rows.map(normalizeCandle).filter(Boolean).sort((a, b) => a.time - b.time);
    }

    async function getLatest(symbol) {
        const candles = await getCandles(symbol, { unit: 'minute', limit: 2 });
        if (!candles.length) throw new Error(`No CoinDesk latest candle for ${symbol}`);
        const latest = candles[candles.length - 1];
        const previous = candles[candles.length - 2] || latest;
        const change = previous.close ? ((latest.close - previous.close) / previous.close) * 100 : 0;
        return {
            symbol: String(symbol).toUpperCase(),
            price: latest.close,
            change,
            basePrice: previous.close,
            volume: latest.volume,
            timestamp: latest.time,
        };
    }

    async function getLatestBatch(symbols) {
        const results = await Promise.allSettled(symbols.map(symbol => getLatest(symbol)));
        return results
            .map(result => result.status === 'fulfilled' ? result.value : null)
            .filter(Boolean);
    }

    function historyOptionsForTimeframe(timeframe) {
        if (timeframe === '1H') return { unit: 'minute', limit: 60, aggregate: 1 };
        if (timeframe === '7D') return { unit: 'hour', limit: 168, aggregate: 1 };
        if (timeframe === '5D') return { unit: 'hour', limit: 120, aggregate: 1 };
        if (timeframe === '1M') return { unit: 'day', limit: 30, aggregate: 1 };
        if (timeframe === '3M') return { unit: 'day', limit: 90, aggregate: 1 };
        if (timeframe === '6M') return { unit: 'day', limit: 180, aggregate: 1 };
        if (timeframe === '1Y') return { unit: 'day', limit: 365, aggregate: 1 };
        return { unit: 'minute', limit: 288, aggregate: 5 };
    }

    window.SentiMarketData = {
        providerName: 'CoinDesk Data',
        symbols: SYMBOLS,
        getCandles,
        getLatest,
        getLatestBatch,
        historyOptionsForTimeframe,
    };
})();
