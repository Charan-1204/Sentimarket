/* ═══════════════════════════════════════════════
   SentiMarket — Hype Score Engine  v1.0
   Weighted scoring from real sentiment + market signals
   Weights: Volume 25% | Polarity 25% | Velocity 20% | Momentum 15% | Price 10% | Anomaly 5%
═══════════════════════════════════════════════ */
(function () {
    'use strict';

    const WEIGHTS = {
        sentimentVolume: 0.25,
        sentimentPolarity: 0.25,
        mentionVelocity: 0.20,
        socialMomentum: 0.15,
        priceConfirmation: 0.10,
        anomalySpike: 0.05,
    };

    const HISTORY_WINDOW = 50;
    const VELOCITY_WINDOW = 6;
    const ANOMALY_Z_THRESHOLD = 1.8;

    const assetHistory = {};

    function getHistory(sym) {
        if (!assetHistory[sym]) {
            assetHistory[sym] = [];
        }
        return assetHistory[sym];
    }

    function pushSample(sym, sample) {
        const history = getHistory(sym);
        history.push(Object.assign({}, sample, { ts: Date.now() }));
        if (history.length > HISTORY_WINDOW) {
            history.shift();
        }
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

    function zScore(value, arr) {
        var sd = stdDev(arr);
        if (sd === 0) return 0;
        return (value - mean(arr)) / sd;
    }

    function calcSentimentVolumeFactor(samples) {
        if (samples.length < 2) return 0.5;
        var volumes = samples.map(function (s) { return s.totalMentions || 0; });
        var latest = volumes[volumes.length - 1];
        var avg = mean(volumes.slice(0, -1));
        if (avg === 0) return latest > 0 ? 0.6 : 0.3;
        var ratio = latest / avg;
        return Math.min(1, Math.max(0, (ratio - 0.3) / 2.2));
    }

    function calcSentimentPolarityFactor(samples) {
        if (samples.length < 2) return 0.5;
        var latest = samples[samples.length - 1];
        var score = latest.sentimentScore || 0;
        return Math.max(0, Math.min(1, (score + 1) / 2));
    }

    function calcMentionVelocityFactor(samples) {
        if (samples.length < VELOCITY_WINDOW + 1) return 0.5;
        var recent = samples.slice(-VELOCITY_WINDOW);
        var prev = samples.slice(-VELOCITY_WINDOW * 2, -VELOCITY_WINDOW);
        var recentRate = mean(recent.map(function (s) { return s.totalMentions || 0; }));
        var prevRate = mean(prev.map(function (s) { return s.totalMentions || 0; }));
        if (prevRate === 0) return recentRate > 0 ? 0.7 : 0.3;
        var acceleration = (recentRate - prevRate) / prevRate;
        return Math.min(1, Math.max(0, 0.5 + acceleration * 1.5));
    }

    function calcSocialMomentumFactor(samples) {
        if (samples.length < 3) return 0.5;
        var scores = samples.map(function (s) {
            var vol = s.totalMentions || 0;
            var pol = (s.sentimentScore || 0) * 0.5 + 0.5;
            return vol * pol;
        });
        var recent = scores.slice(-4);
        var older = scores.slice(-8, -4);
        if (!older.length) return 0.5;
        var recentAvg = mean(recent);
        var olderAvg = mean(older);
        if (olderAvg === 0) return recentAvg > 0 ? 0.6 : 0.3;
        var momentum = (recentAvg - olderAvg) / olderAvg;
        return Math.min(1, Math.max(0, 0.5 + momentum));
    }

    function calcPriceConfirmationFactor(samples, assetData) {
        if (!assetData || samples.length < 2) return 0.5;
        var priceChange = assetData.change || 0;
        var latest = samples[samples.length - 1];
        var sentimentDirection = latest.sentimentScore > 0 ? 1 : -1;
        var priceDirection = priceChange > 0 ? 1 : -1;
        if (sentimentDirection === priceDirection) {
            var magnitude = Math.min(1, Math.abs(priceChange) / 8);
            return 0.5 + magnitude * 0.5;
        }
        var divergence = Math.min(1, Math.abs(priceChange) / 5);
        return 0.5 - divergence * 0.3;
    }

    function calcAnomalySpikeFactor(samples) {
        if (samples.length < 8) return 0;
        var volumes = samples.map(function (s) { return s.totalMentions || 0; });
        var latest = volumes[volumes.length - 1];
        var z = zScore(latest, volumes.slice(0, -1));
        if (z > ANOMALY_Z_THRESHOLD) {
            return Math.min(1, (z - ANOMALY_Z_THRESHOLD) / 3);
        }
        return 0;
    }

    function calculateHypeScore(sym, assetData) {
        var history = getHistory(sym);
        if (!history.length || !assetData) {
            return {
                score: assetData ? assetData.hype || 50 : 50,
                breakdown: {
                    sentimentVolume: 50,
                    sentimentPolarity: 50,
                    mentionVelocity: 50,
                    socialMomentum: 50,
                    priceConfirmation: 50,
                    anomalySpike: 0,
                },
                factors: {
                    rawScore: '0.500',
                    sampleCount: history.length,
                    anomalyDetected: false,
                },
                confidence: 30,
                label: 'INSUFFICIENT DATA',
            };
        }

        var fSentVol = calcSentimentVolumeFactor(history);
        var fSentPol = calcSentimentPolarityFactor(history);
        var fVel = calcMentionVelocityFactor(history);
        var fMomentum = calcSocialMomentumFactor(history);
        var fPrice = calcPriceConfirmationFactor(history, assetData);
        var fAnomaly = calcAnomalySpikeFactor(history);

        var rawScore =
            fSentVol * WEIGHTS.sentimentVolume +
            fSentPol * WEIGHTS.sentimentPolarity +
            fVel * WEIGHTS.mentionVelocity +
            fMomentum * WEIGHTS.socialMomentum +
            fPrice * WEIGHTS.priceConfirmation +
            fAnomaly * WEIGHTS.anomalySpike;

        var hypeScore = Math.round(Math.max(5, Math.min(98, rawScore * 100)));

        var label = 'NEUTRAL';
        if (hypeScore >= 85) label = 'EXTREME BULLISH';
        else if (hypeScore >= 70) label = 'STRONGLY BULLISH';
        else if (hypeScore >= 55) label = 'BULLISH';
        else if (hypeScore >= 40) label = 'NEUTRAL';
        else if (hypeScore >= 25) label = 'CAUTIOUS';
        else label = 'BEARISH';

        var confidence = Math.min(95, Math.max(30, 40 + history.length * 1.2));

        return {
            score: hypeScore,
            breakdown: {
                sentimentVolume: Math.round(fSentVol * 100),
                sentimentPolarity: Math.round(fSentPol * 100),
                mentionVelocity: Math.round(fVel * 100),
                socialMomentum: Math.round(fMomentum * 100),
                priceConfirmation: Math.round(fPrice * 100),
                anomalySpike: Math.round(fAnomaly * 100),
            },
            factors: {
                rawScore: rawScore.toFixed(3),
                sampleCount: history.length,
                anomalyDetected: fAnomaly > 0.1,
            },
            confidence: Math.round(confidence),
            label: label,
        };
    }

    function ingestSignal(sym, signal) {
        if (!signal || !sym) return;
        pushSample(sym, {
            totalMentions: signal.total || 0,
            sentimentScore: signal.score || 0,
            positiveCount: signal.positive || 0,
            negativeCount: signal.negative || 0,
            neutralCount: signal.neutral || 0,
        });
    }

    function ingestPriceSignal(sym, price, change, volume) {
        var history = getHistory(sym);
        if (!history.length) return;
        var latest = history[history.length - 1];
        latest.price = price;
        latest.priceChange = change;
        latest.volume = volume;
    }

    function getHistoryForAsset(sym) {
        return getHistory(sym).slice();
    }

    function resetAsset(sym) {
        if (sym) {
            delete assetHistory[sym];
        } else {
            Object.keys(assetHistory).forEach(function (key) { delete assetHistory[key]; });
        }
    }

    function seedFromAssetData(sym, assetData) {
        if (!assetData || !assetData.sym) return;
        var mentions = parseFloat((assetData.mentions || '0%').replace(/[^0-9.\-]/g, '')) || 0;
        var sentStr = parseFloat((assetData.sentStr || '0').replace(/[^0-9.\-]/g, '')) || 0;
        var vol = parseFloat((assetData.volume || '0').replace(/[^0-9.\-]/g, '')) || 0;
        pushSample(sym, {
            totalMentions: Math.max(1, Math.abs(mentions)),
            sentimentScore: sentStr / 100 || (assetData.change || 0) / 100,
            positiveCount: Math.max(0, Math.round(mentions)),
            negativeCount: 0,
            neutralCount: 0,
            price: assetData.price,
            priceChange: assetData.change,
            volume: vol,
        });
    }

    window.HypeEngine = {
        calculateHypeScore: calculateHypeScore,
        ingestSignal: ingestSignal,
        ingestPriceSignal: ingestPriceSignal,
        getHistoryForAsset: getHistoryForAsset,
        resetAsset: resetAsset,
        seedFromAssetData: seedFromAssetData,
        getWeights: function () { return Object.assign({}, WEIGHTS); },
    };
})();
