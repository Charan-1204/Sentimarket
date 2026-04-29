/* ═══════════════════════════════════════════════
   SentiMarket — Live Feed Engine  v1.0
   Enhanced REST polling with reconnect, buffering, fallbacks
   Event-driven: priceUpdate, feedUpdate, statusChange
═══════════════════════════════════════════════ */
(function () {
    'use strict';

    var state = {
        running: false,
        priceTimer: null,
        feedTimer: null,
        priceInFlight: false,
        feedInFlight: false,
        wsSocket: null,
        wsReconnectAttempts: 0,
        wsReconnectTimer: null,
        wsBackoffMs: 1000,
        wsMaxBackoffMs: 30000,
        lastPriceUpdate: 0,
        lastFeedUpdate: 0,
        lastLatencyMs: 0,
        source: 'none',
        connected: false,
        errorCount: 0,
        maxConsecutiveErrors: 5,
        priceBuffer: [],
        feedBuffer: [],
        listeners: {},
        config: null,
    };

    function on(event, callback) {
        if (!state.listeners[event]) state.listeners[event] = [];
        state.listeners[event].push(callback);
    }

    function emit(event, data) {
        var cbs = state.listeners[event] || [];
        for (var i = 0; i < cbs.length; i++) {
            try { cbs[i](data); } catch (e) { /* ignore listener errors */ }
        }
    }

    function updateStatus(connected, source) {
        if (state.connected !== connected || state.source !== source) {
            state.connected = connected;
            state.source = source || state.source;
            emit('statusChange', { connected: connected, source: state.source, lastUpdate: state.lastPriceUpdate });
        }
    }

    function fetchWithTimeout(url, timeoutMs) {
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs || 8000);
        return fetch(url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        }).then(function (response) {
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        }).catch(function (err) {
            clearTimeout(timeoutId);
            throw err;
        });
    }

    function getApiCandidateUrls(path) {
        var candidates = [];
        var cfg = state.config || {};
        if (cfg.baseUrl) {
            var base = String(cfg.baseUrl).replace(/\/$/, '');
            candidates.push(base + (path.startsWith('/') ? path : '/' + path));
        }
        if (window.location.protocol && window.location.protocol.startsWith('http')) {
            candidates.push(window.location.origin + (path.startsWith('/') ? path : '/' + path));
        }
        return candidates;
    }

    function fetchFirstAvailable(urls, timeoutMs) {
        var lastError = null;
        var chain = Promise.resolve();
        for (var i = 0; i < urls.length; i++) {
            (function (url) {
                chain = chain.catch(function () {
                    return fetchWithTimeout(url, timeoutMs);
                });
            })(urls[i]);
        }
        return chain;
    }

    function tryFetchProvider(path, providerName, symbols, timeoutMs) {
        if (providerName === 'Twelve Data' && window.SentiPrimaryData) {
            return window.SentiPrimaryData.getLatestBatch(symbols).then(function (rows) {
                return { data: rows, provider: 'Twelve Data' };
            });
        }
        if (providerName === 'CoinDesk' && window.SentiMarketData) {
            return window.SentiMarketData.getLatestBatch(symbols).then(function (rows) {
                return { data: rows, provider: 'CoinDesk' };
            });
        }
        var urls = getApiCandidateUrls(path);
        if (!urls.length) return Promise.reject(new Error('No API URLs configured'));
        return fetchFirstAvailable(urls, timeoutMs).then(function (payload) {
            return { data: payload, provider: 'Backend' };
        });
    }

    function pollPrices(config) {
        if (state.priceInFlight) return;
        state.priceInFlight = true;

        var symbols = config.symbols || Object.keys(config.assetMap || {});
        var startedAt = performance.now();

        var providers = config.providerOrder || ['Twelve Data', 'CoinDesk', 'Backend'];
        var path = config.historyEndpoint || '/api/assets';

        function tryProvider(idx) {
            if (idx >= providers.length) {
                state.priceInFlight = false;
                state.errorCount++;
                if (state.errorCount >= state.maxConsecutiveErrors) {
                    updateStatus(false, 'ALL PROVIDERS DOWN');
                }
                return;
            }

            var providerName = providers[idx];
            tryFetchProvider(path, providerName, symbols, config.timeoutMs || 8000)
                .then(function (result) {
                    var latency = Math.round(performance.now() - startedAt);
                    state.lastLatencyMs = latency;
                    state.lastPriceUpdate = Date.now();
                    state.errorCount = 0;
                    state.priceInFlight = false;
                    updateStatus(true, result.provider + ' CONNECTED');

                    if (Array.isArray(result.data)) {
                        result.data.forEach(function (row) {
                            if (row && row.symbol) {
                                emit('priceUpdate', {
                                    symbol: String(row.symbol).toUpperCase(),
                                    price: row.price,
                                    change: row.change,
                                    volume: row.volume,
                                    provider: result.provider,
                                    latency: latency,
                                });
                            }
                        });
                    }
                })
                .catch(function (err) {
                    tryProvider(idx + 1);
                });
        }

        tryProvider(0);
    }

    function pollFeed(config) {
        if (state.feedInFlight) return;
        state.feedInFlight = true;

        var startedAt = performance.now();

        function fetchNewsFeed() {
            if (!window.SentiNewsData) {
                state.feedInFlight = false;
                return;
            }
            window.SentiNewsData.getNews({ limit: 8 })
                .then(function (articles) {
                    var latency = Math.round(performance.now() - startedAt);
                    state.lastFeedUpdate = Date.now();
                    state.feedInFlight = false;

                    if (articles && articles.length) {
                        var items = articles.map(function (a) {
                            var isPositive = a.sentiment && (a.sentiment.includes('positive') || a.sentiment.includes('bull'));
                            var isNegative = a.sentiment && (a.sentiment.includes('negative') || a.sentiment.includes('bear'));
                            return {
                                text: (a.source || 'NEWS') + ': ' + (a.title || ''),
                                icon: isPositive ? 'POS' : isNegative ? 'NEG' : 'NEWS',
                                type: isPositive ? 'green' : isNegative ? 'orange' : 'muted',
                                timeLabel: formatNewsTime(a.publishedAt),
                            };
                        });
                        emit('feedUpdate', items);
                    }
                })
                .catch(function () {
                    state.feedInFlight = false;
                });
        }

        function fetchBackendFeed() {
            var urls = getApiCandidateUrls(config.feedEndpoint || '/api/feed');
            if (!urls.length) {
                state.feedInFlight = false;
                return;
            }
            fetchFirstAvailable(urls, config.timeoutMs || 8000)
                .then(function (payload) {
                    var latency = Math.round(performance.now() - startedAt);
                    state.lastFeedUpdate = Date.now();
                    state.feedInFlight = false;

                    var items = normalizeFeedPayload(payload);
                    if (items.length) {
                        emit('feedUpdate', items);
                    }
                })
                .catch(function () {
                    state.feedInFlight = false;
                });
        }

        if (window.SentiNewsData) {
            fetchNewsFeed();
        } else {
            fetchBackendFeed();
        }
    }

    function normalizeFeedPayload(payload) {
        var raw = Array.isArray(payload) ? payload :
            (payload && (payload.items || payload.feed || payload.data || payload.events)) || [];
        return raw.map(function (item) {
            if (typeof item === 'string') {
                return { text: item, icon: 'LIVE', type: 'green', timeLabel: 'just now' };
            }
            return {
                text: item.text || item.message || item.headline || item.title || '',
                icon: String(item.icon || item.kind || item.source || 'LIVE').slice(0, 6).toUpperCase(),
                type: item.type || item.level || 'muted',
                timeLabel: item.timeLabel || item.time || 'just now',
            };
        }).filter(function (item) { return item.text; });
    }

    function formatNewsTime(value) {
        if (!value) return 'just now';
        var timestamp = new Date(value).getTime();
        if (!timestamp) return 'just now';
        var minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
        if (minutes < 1) return 'just now';
        if (minutes < 60) return minutes + ' min ago';
        var hours = Math.round(minutes / 60);
        if (hours < 24) return hours + ' hr ago';
        return Math.round(hours / 24) + ' day ago';
    }

    function initWsConnection(config) {
        if (!config.wsUrl) return;

        function connect() {
            if (!state.running) return;
            try {
                state.wsSocket = new WebSocket(config.wsUrl);
            } catch (e) {
                scheduleWsReconnect();
                return;
            }

            state.wsSocket.onopen = function () {
                state.wsReconnectAttempts = 0;
                state.wsBackoffMs = 1000;
                updateStatus(true, 'WebSocket');
            };

            state.wsSocket.onmessage = function (event) {
                try {
                    var data = JSON.parse(event.data);
                    if (data.type === 'price') {
                        emit('priceUpdate', data.payload);
                        state.lastPriceUpdate = Date.now();
                    } else if (data.type === 'feed') {
                        emit('feedUpdate', data.payload);
                        state.lastFeedUpdate = Date.now();
                    }
                } catch (e) { /* ignore parse errors */ }
            };

            state.wsSocket.onclose = function () {
                updateStatus(false, 'WebSocket disconnected');
                scheduleWsReconnect();
            };

            state.wsSocket.onerror = function () {
                updateStatus(false, 'WebSocket error');
            };
        }

        function scheduleWsReconnect() {
            if (!state.running) return;
            state.wsReconnectAttempts++;
            var delay = Math.min(state.wsBackoffMs, state.wsMaxBackoffMs);
            state.wsBackoffMs *= 2;
            clearTimeout(state.wsReconnectTimer);
            state.wsReconnectTimer = setTimeout(connect, delay);
        }

        connect();
    }

    function init(config) {
        if (state.running) stop();

        state.config = config || {};
        state.running = true;
        state.errorCount = 0;
        state.wsReconnectAttempts = 0;
        state.wsBackoffMs = 1000;

        var priceInterval = config.pricePollMs || 5000;
        var feedInterval = config.feedPollMs || 12000;

        pollPrices(config);
        pollFeed(config);

        state.priceTimer = setInterval(function () {
            if (state.running) pollPrices(config);
        }, priceInterval);

        state.feedTimer = setInterval(function () {
            if (state.running) pollFeed(config);
        }, feedInterval);

        if (config.wsUrl) {
            initWsConnection(config);
        }

        updateStatus(false, 'INITIALIZING');
    }

    function stop() {
        state.running = false;
        clearInterval(state.priceTimer);
        clearInterval(state.feedTimer);
        clearTimeout(state.wsReconnectTimer);
        if (state.wsSocket) {
            try { state.wsSocket.close(); } catch (e) { /* ignore */ }
            state.wsSocket = null;
        }
        state.priceTimer = null;
        state.feedTimer = null;
    }

    function getStatus() {
        return {
            connected: state.connected,
            source: state.source,
            lastPriceUpdate: state.lastPriceUpdate,
            lastFeedUpdate: state.lastFeedUpdate,
            lastLatencyMs: state.lastLatencyMs,
            running: state.running,
            errorCount: state.errorCount,
            wsReconnectAttempts: state.wsReconnectAttempts,
        };
    }

    window.LiveFeed = {
        init: init,
        stop: stop,
        on: on,
        getStatus: getStatus,
    };
})();
