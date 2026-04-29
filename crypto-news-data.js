/* SentiMarket – Backend-driven news client */
(function () {
    'use strict';

    function getConfig() {
        const runtime = window.SENTI_API_CONFIG || {};
        var dashboardApi = window.SENTI_DASHBOARD_API || {};
        var apiOrigins = Array.isArray(dashboardApi.apiOrigins) && dashboardApi.apiOrigins.length
            ? dashboardApi.apiOrigins
            : [
                runtime.baseUrl,
                localStorage.getItem('smApiBaseUrl'),
                'https://sentimarket-api.onrender.com',
                'https://sentimarket-api.onrender.com',
                'https://sentimarket-api.onrender.com',
                'https://sentimarket-api.onrender.com',
                window.location.protocol.startsWith('http') ? window.location.origin : '',
            ].filter(Boolean).map(function (value) {
                return String(value).replace(/\/$/, '');
            }).filter(Boolean);
        return {
            apiOrigins: Array.from(new Set(apiOrigins)),
            newsEndpoint: runtime.newsEndpoint || '/api/news',
            timeoutMs: Number(runtime.timeoutMs || 8000),
        };
    }

    function buildNewsUrls(params) {
        const cfg = getConfig();
        return cfg.apiOrigins.map(function (origin) {
            var url = new URL(cfg.newsEndpoint, origin + '/');
            Object.entries(params || {}).forEach(function ([key, value]) {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, String(value));
                }
            });
            return url.toString();
        });
    }

    function normalizeSentiment(sentiment) {
        if (typeof sentiment === 'number' && Number.isFinite(sentiment)) {
            if (sentiment > 0.15) return 'positive';
            if (sentiment < -0.15) return 'negative';
            return 'neutral';
        }

        var label = String(sentiment || '').trim().toLowerCase();
        if (!label) return 'neutral';
        if (label.includes('positive') || label.includes('bull')) return 'positive';
        if (label.includes('negative') || label.includes('bear')) return 'negative';
        return 'neutral';
    }

    async function getNews(options = {}) {
        const cfg = getConfig();
        var lastError = null;
        for (const url of buildNewsUrls({ limit: options.limit || 8 })) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);
            try {
                const response = await fetch(url, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
                const data = await response.json();
                return (data.articles || data.news || data.data || []).map(item => ({
                    title: item.title || item.headline,
                    source: item.source || item.source_name || 'Backend',
                    url: item.url,
                    publishedAt: item.publishedAt || item.published_at,
                    sentiment: normalizeSentiment(item.sentiment),
                    summary: item.summary || item.description || '',
                }));
            } catch (error) {
                lastError = error;
            } finally {
                clearTimeout(timeoutId);
            }
        }
        throw lastError || new Error('Unable to fetch news');
    }

    async function getAssetNews(symbol, limit = 12) {
        var lastError = null;
        for (const url of buildNewsUrls({ symbol: symbol, limit: limit })) {
            try {
                const response = await fetch(url, {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
                const data = await response.json();
                return (data.articles || []).map(item => ({
                    title: item.title,
                    source: item.source || 'Backend',
                    url: item.url,
                    publishedAt: item.publishedAt,
                    sentiment: normalizeSentiment(item.sentiment),
                    summary: item.summary || '',
                }));
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('Unable to fetch asset news');
    }

    // ----- Sentiment derivation (unchanged) -----
    var signalHistory = {};
    var SIGNAL_HISTORY_LEN = 20;

    function pushSignalHistory(symbol, signal) {
        var key = String(symbol || '').toUpperCase();
        if (!signalHistory[key]) signalHistory[key] = [];
        signalHistory[key].push(Object.assign({}, signal, { ts: Date.now() }));
        if (signalHistory[key].length > SIGNAL_HISTORY_LEN) signalHistory[key].shift();
    }

    function computeVelocity(symbol) {
        var key = String(symbol || '').toUpperCase();
        var history = signalHistory[key] || [];
        if (history.length < 3) return 0;
        var recent = history.slice(-3).reduce(function (s, x) { return s + x.total; }, 0) / 3;
        var older = history.slice(-6, -3).reduce(function (s, x) { return s + x.total; }, 0) / Math.min(3, history.length - 3);
        if (older === 0) return recent > 0 ? 1 : 0;
        return (recent - older) / older;
    }

    function computeMomentum(symbol) {
        var key = String(symbol || '').toUpperCase();
        var history = signalHistory[key] || [];
        if (history.length < 4) return 0;
        var recent = history.slice(-2).reduce(function (s, x) { return s + x.score; }, 0) / 2;
        var older = history.slice(-4, -2).reduce(function (s, x) { return s + x.score; }, 0) / 2;
        return recent - older;
    }

    function deriveSignal(articles, symbol) {
        var total = articles.length;
        var positive = articles.filter(function (a) { return normalizeSentiment(a.sentiment) === 'positive'; }).length;
        var negative = articles.filter(function (a) { return normalizeSentiment(a.sentiment) === 'negative'; }).length;
        var neutral = Math.max(0, total - positive - negative);
        var score = total ? (positive - negative) / total : 0;
        var hype = Math.max(10, Math.min(95, Math.round(35 + total * 4 + Math.abs(score) * 25)));
        var signal = {
            total: total, positive: positive, negative: negative, neutral: neutral,
            score: score, hype: hype,
            sentiment: score > 0.2 ? 'BULLISH' : score < -0.2 ? 'BEARISH' : 'NEUTRAL',
            velocity: computeVelocity(symbol),
            momentum: computeMomentum(symbol),
        };
        if (symbol) pushSignalHistory(symbol, signal);
        return signal;
    }

    window.SentiNewsData = {
        providerName: 'NewsAPI, Finnhub, Alpha Vantage, CryptoCompare',
        getNews: getNews,
        getAssetNews: getAssetNews,
        deriveSignal: deriveSignal,
        normalizeSentiment: normalizeSentiment,
        getSignalHistory: function (symbol) {
            var key = String(symbol || '').toUpperCase();
            return (signalHistory[key] || []).slice();
        },
        resetHistory: function (symbol) {
            if (symbol) { delete signalHistory[String(symbol).toUpperCase()]; } else { signalHistory = {}; }
        },
    };
})();
