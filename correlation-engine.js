/* ═══════════════════════════════════════════════
   SentiMarket — Correlation Engine  v1.0
   Pearson + Spearman correlations, rolling windows,
   cross-asset matrix, lead/lag detection
═══════════════════════════════════════════════ */
(function () {
    'use strict';

    var MAX_SAMPLES = 200;
    var WINDOWS = { short: 18, medium: 36, long: 72 };
    var LEAD_LAG_MAX_OFFSET = 6;

    var assetBuffers = {};

    function getBuffer(sym) {
        if (!assetBuffers[sym]) {
            assetBuffers[sym] = [];
        }
        return assetBuffers[sym];
    }

    function addSample(sym, data) {
        var buf = getBuffer(sym);
        buf.push(Object.assign({}, data, { ts: data.ts || Date.now() }));
        if (buf.length > MAX_SAMPLES) {
            buf.shift();
        }
    }

    function extractSeries(sym, field, windowSize) {
        var buf = getBuffer(sym);
        var slice = windowSize ? buf.slice(-windowSize) : buf;
        return slice.map(function (s) { return s[field]; });
    }

    function mean(arr) {
        if (!arr.length) return 0;
        return arr.reduce(function (s, v) { return s + v; }, 0) / arr.length;
    }

    function stdDev(arr) {
        if (arr.length < 2) return 0;
        var m = mean(arr);
        var sq = arr.map(function (v) { return (v - m) * (v - m); });
        return Math.sqrt(mean(sq));
    }

    function pearson(x, y) {
        var n = Math.min(x.length, y.length);
        if (n < 3) return 0;
        var mx = mean(x.slice(0, n));
        var my = mean(y.slice(0, n));
        var num = 0, dx2 = 0, dy2 = 0;
        for (var i = 0; i < n; i++) {
            var dx = x[i] - mx;
            var dy = y[i] - my;
            num += dx * dy;
            dx2 += dx * dx;
            dy2 += dy * dy;
        }
        var denom = Math.sqrt(dx2 * dy2);
        if (denom === 0) return 0;
        return num / denom;
    }

    function rankArray(arr) {
        var indexed = arr.map(function (v, i) { return { v: v, i: i }; });
        indexed.sort(function (a, b) { return a.v - b.v; });
        var ranks = new Array(arr.length);
        var i = 0;
        while (i < indexed.length) {
            var j = i;
            while (j < indexed.length - 1 && indexed[j + 1].v === indexed[j].v) {
                j++;
            }
            var avgRank = (i + j) / 2 + 1;
            for (var k = i; k <= j; k++) {
                ranks[indexed[k].i] = avgRank;
            }
            i = j + 1;
        }
        return ranks;
    }

    function spearman(x, y) {
        var n = Math.min(x.length, y.length);
        if (n < 3) return 0;
        var rx = rankArray(x.slice(0, n));
        var ry = rankArray(y.slice(0, n));
        return pearson(rx, ry);
    }

    function crossCorrelation(x, y, offset) {
        var n = Math.min(x.length, y.length);
        if (n < 3) return 0;
        var xSlice, ySlice;
        if (offset >= 0) {
            xSlice = x.slice(offset);
            ySlice = y.slice(0, n - offset);
        } else {
            xSlice = x.slice(0, n + offset);
            ySlice = y.slice(-offset);
        }
        return pearson(xSlice, ySlice);
    }

    function detectLeadLag(symA, symB, fieldA, fieldB, maxOffset) {
        var offset = maxOffset || LEAD_LAG_MAX_OFFSET;
        var x = extractSeries(symA, fieldA);
        var y = extractSeries(symB, fieldB);
        if (x.length < 4 || y.length < 4) {
            return { offset: 0, correlation: 0, leader: null, confidence: 0 };
        }
        var bestR = 0;
        var bestOffset = 0;
        for (var o = -offset; o <= offset; o++) {
            var r = crossCorrelation(x, y, o);
            if (Math.abs(r) > Math.abs(bestR)) {
                bestR = r;
                bestOffset = o;
            }
        }
        var leader = null;
        if (bestOffset > 0) leader = symA;
        else if (bestOffset < 0) leader = symB;
        return {
            offset: bestOffset,
            correlation: Math.round(bestR * 1000) / 1000,
            leader: leader,
            confidence: Math.round(Math.abs(bestR) * 100),
        };
    }

    function computeCorrelation(symA, symB, fieldA, fieldB, windowSize) {
        var x = extractSeries(symA, fieldA, windowSize);
        var y = extractSeries(symB, fieldB, windowSize);
        return {
            pearson: Math.round(pearson(x, y) * 1000) / 1000,
            spearman: Math.round(spearman(x, y) * 1000) / 1000,
            samples: Math.min(x.length, y.length),
        };
    }

    function getSentimentPriceCorrelation(sym, windowSize) {
        var buf = getBuffer(sym);
        var w = windowSize || WINDOWS.short;
        var slice = buf.slice(-w);
        if (slice.length < 3) {
            return { pearson: 0, spearman: 0, samples: slice.length, label: 'N/A' };
        }
        var sentiments = slice.map(function (s) { return s.sentimentScore || 0; });
        var prices = slice.map(function (s) { return s.priceChange || 0; });
        var pR = pearson(sentiments, prices);
        var sR = spearman(sentiments, prices);
        var label = 'WEAK';
        if (Math.abs(pR) > 0.7) label = pR > 0 ? 'STRONG POSITIVE' : 'STRONG NEGATIVE';
        else if (Math.abs(pR) > 0.4) label = pR > 0 ? 'MODERATE POSITIVE' : 'MODERATE NEGATIVE';
        return {
            pearson: Math.round(pR * 1000) / 1000,
            spearman: Math.round(sR * 1000) / 1000,
            samples: slice.length,
            label: label,
        };
    }

    function getSentimentVolumeCorrelation(sym, windowSize) {
        var buf = getBuffer(sym);
        var w = windowSize || WINDOWS.short;
        var slice = buf.slice(-w);
        if (slice.length < 3) {
            return { pearson: 0, spearman: 0, samples: slice.length, label: 'N/A' };
        }
        var sentiments = slice.map(function (s) { return s.sentimentScore || 0; });
        var volumes = slice.map(function (s) { return s.volume || 0; });
        var pR = pearson(sentiments, volumes);
        var sR = spearman(sentiments, volumes);
        var label = 'WEAK';
        if (Math.abs(pR) > 0.7) label = pR > 0 ? 'STRONG POSITIVE' : 'STRONG NEGATIVE';
        else if (Math.abs(pR) > 0.4) label = pR > 0 ? 'MODERATE POSITIVE' : 'MODERATE NEGATIVE';
        return {
            pearson: Math.round(pR * 1000) / 1000,
            spearman: Math.round(sR * 1000) / 1000,
            samples: slice.length,
            label: label,
        };
    }

    function getAllSymbols() {
        return Object.keys(assetBuffers);
    }

    function computeAssetMatrix(symA, symB, windowSize) {
        var w = windowSize || WINDOWS.medium;
        var priceCorr = computeCorrelation(symA, symB, 'priceChange', 'priceChange', w);
        var volCorr = computeCorrelation(symA, symB, 'volume', 'volume', w);
        var sentCorr = computeCorrelation(symA, symB, 'sentimentScore', 'sentimentScore', w);
        var leadLag = detectLeadLag(symA, symB, 'priceChange', 'priceChange');
        return {
            pair: symA + '/' + symB,
            priceCorrelation: priceCorr,
            volumeCorrelation: volCorr,
            sentimentCorrelation: sentCorr,
            leadLag: leadLag,
        };
    }

    function computeAllCorrelations() {
        var symbols = getAllSymbols();
        var result = {
            sentimentPrice: {},
            sentimentVolume: {},
            assetMatrix: {},
            leadLag: {},
            windows: WINDOWS,
        };

        symbols.forEach(function (sym) {
            result.sentimentPrice[sym] = {};
            result.sentimentVolume[sym] = {};
            [WINDOWS.short, WINDOWS.medium, WINDOWS.long].forEach(function (w) {
                var label = w === WINDOWS.short ? 'short' : w === WINDOWS.medium ? 'medium' : 'long';
                result.sentimentPrice[sym][label] = getSentimentPriceCorrelation(sym, w);
                result.sentimentVolume[sym][label] = getSentimentVolumeCorrelation(sym, w);
            });
        });

        for (var i = 0; i < symbols.length; i++) {
            for (var j = i + 1; j < symbols.length; j++) {
                var a = symbols[i];
                var b = symbols[j];
                var pairKey = a + '_' + b;
                result.assetMatrix[pairKey] = computeAssetMatrix(a, b);
                result.leadLag[pairKey] = detectLeadLag(a, b, 'priceChange', 'priceChange');
            }
        }

        return result;
    }

    function getCorrelationArray(sym, windowKey) {
        var w = WINDOWS[windowKey || 'short'];
        var sentPrice = getSentimentPriceCorrelation(sym, w);
        var sentVol = getSentimentVolumeCorrelation(sym, w);
        var symbols = getAllSymbols();
        var selfIdx = symbols.indexOf(sym);
        var assetCorr = 0.55;
        if (selfIdx > 0 && symbols[0]) {
            var matrix = computeAssetMatrix(symbols[0], sym);
            assetCorr = Math.abs(matrix.priceCorrelation.pearson);
        }
        return [
            Math.round(sentPrice.pearson * 100) / 100,
            Math.round(sentVol.pearson * 100) / 100,
            Math.round(assetCorr * 100) / 100,
        ];
    }

    function getBufferForAsset(sym) {
        return getBuffer(sym).slice();
    }

    function resetAsset(sym) {
        if (sym) {
            delete assetBuffers[sym];
        } else {
            Object.keys(assetBuffers).forEach(function (key) { delete assetBuffers[key]; });
        }
    }

    function seedFromAssetData(sym, assetData) {
        if (!assetData || !assetData.sym) return;
        var mentions = parseFloat((assetData.mentions || '0%').replace(/[^0-9.\-]/g, '')) || 0;
        var sentStr = parseFloat((assetData.sentStr || '0').replace(/[^0-9.\-]/g, '')) || 0;
        var vol = parseFloat((assetData.volume || '0').replace(/[^0-9.\-]/g, '')) || 0;
        addSample(sym, {
            sentimentScore: sentStr / 100 || (assetData.change || 0) / 100,
            price: assetData.price,
            priceChange: assetData.change || 0,
            volume: Math.abs(vol) || Math.abs(assetData.change || 0),
            mentions: Math.abs(mentions),
            ts: Date.now(),
        });
    }

    window.CorrelationEngine = {
        addSample: addSample,
        computePearson: function (symA, symB, fieldA, fieldB, windowSize) {
            return computeCorrelation(symA, symB, fieldA || 'priceChange', fieldB || 'priceChange', windowSize);
        },
        computeSpearman: function (symA, symB, fieldA, fieldB, windowSize) {
            var x = extractSeries(symA, fieldA || 'priceChange', windowSize);
            var y = extractSeries(symB, fieldB || 'priceChange', windowSize);
            return {
                spearman: Math.round(spearman(x, y) * 1000) / 1000,
                samples: Math.min(x.length, y.length),
            };
        },
        computeAllCorrelations: computeAllCorrelations,
        getSentimentPriceCorrelation: getSentimentPriceCorrelation,
        getSentimentVolumeCorrelation: getSentimentVolumeCorrelation,
        detectLeadLag: detectLeadLag,
        getCorrelationArray: getCorrelationArray,
        computeAssetMatrix: computeAssetMatrix,
        getBufferForAsset: getBufferForAsset,
        getAllSymbols: getAllSymbols,
        resetAsset: resetAsset,
        seedFromAssetData: seedFromAssetData,
        WINDOWS: Object.assign({}, WINDOWS),
    };
})();
