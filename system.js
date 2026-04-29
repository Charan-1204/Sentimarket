/* ═══════════════════════════════════════════════
   SentiMarket – system.js
   System Performance Panel + smApp integration
═══════════════════════════════════════════════ */

// ─── smApp API ──────────────────────────────────
// Central integration layer between app.js and settings.js
window.smApp = {
    // ── Trade Confirmation ──
    _pendingTrade: null,
    confirmTrade(action) {
        const cfg = JSON.parse(localStorage.getItem('smSettings') || '{}');
        const conf = parseInt(document.getElementById('aiConfidencePct')?.textContent) || 82;
        const risk = cfg.riskTolerance || 'medium';
        const riskLabels = { low: '🛡 Low Risk', medium: '⚖ Medium Risk', high: '🔥 High Risk' };

        if (cfg.aiConfirmation) {
            this._pendingTrade = action;
            document.getElementById('tcm-action').textContent = action;
            document.getElementById('tcm-signal').textContent = action;
            document.getElementById('tcm-confidence').textContent = conf + '%';
            document.getElementById('tcm-risk').textContent = riskLabels[risk] || risk;
            document.getElementById('tradeConfirmOverlay').classList.add('open');
        } else {
            this._executeTrade(action);
        }
    },
    cancelTrade() {
        this._pendingTrade = null;
        document.getElementById('tradeConfirmOverlay').classList.remove('open');
    },
    executeTrade() {
        const action = this._pendingTrade;
        document.getElementById('tradeConfirmOverlay').classList.remove('open');
        this._pendingTrade = null;
        this._executeTrade(action);
    },
    _executeTrade(action) {
        // Placeholder — wire to backend when Phase 2 is ready
        console.log(`[SentiMarket] Trade executed: ${action}`);
        const btn = document.querySelector('.buy-btn');
        if (btn) {
            btn.textContent = '✓ ' + action + ' SENT';
            btn.style.opacity = '0.6';
            setTimeout(() => { btn.textContent = action; btn.style.opacity = ''; }, 2000);
        }
    },

    // ── Chart Style ──
    applyChartStyle(style) {
        console.log('[SentiMarket] Chart style:', style);
        // Trigger chart re-render — hook into app.js chart instance
    },

    // ── Risk Tolerance ──
    applyRisk(level) {
        console.log('[SentiMarket] Risk level:', level);
        // Adjust confidence threshold visibility
        const pct = document.getElementById('aiConfidencePct');
        if (pct) {
            const base = parseInt(pct.textContent) || 82;
            const adjusted = level === 'high' ? base - 10 : level === 'low' ? Math.min(base + 8, 99) : base;
            pct.textContent = adjusted + '%';
        }
    },

    // ── AI Animation ──
    setAiAnimation(enabled) {
        const body = document.getElementById('aiExplBody');
        if (!body) return;
        body.style.transition = enabled ? 'opacity .4s' : 'none';
    },

    // ── AI Personality ──
    setPersonality(id) {
        const PERSONALITY_TEXTS = {
            conservative: 'DOGE exhibits moderate bullish signals. Confidence at 82% — within cautious entry threshold. Recommend small position sizing. Risk is managed.',
            aggressive: 'STRONG BUY SIGNAL on DOGE! 41% mention spike + price above EMA = prime momentum entry. High conviction. Size up. Strike fast.',
            quant: 'DOGE/USD: Hype correlation coefficient 0.78 (short-term). RSI bullish range. Volume +18%. Model confidence: 82%. Entry probability: HIGH.',
            meme: 'DOGE IS MOONING 🚀🚀 Twitter exploding +41% mentions. Reddit apes loading up. Sentiment 65% bullish. MEME SEASON ACTIVATED. LFG!',
            institutional: 'DOGE shows social-driven price action. Current hype cycle suggests temporary momentum. Macro bias neutral. Position within risk parameters. Monitor 20 EMA support.',
        };
        const body = document.getElementById('aiExplBody');
        const cfg = JSON.parse(localStorage.getItem('smSettings') || '{}');
        if (body && cfg.aiAnimation !== false) {
            body.style.opacity = '0';
            setTimeout(() => {
                body.innerHTML = PERSONALITY_TEXTS[id] || PERSONALITY_TEXTS.conservative;
                body.style.opacity = '1';
            }, 300);
        } else if (body) {
            body.innerHTML = PERSONALITY_TEXTS[id] || PERSONALITY_TEXTS.conservative;
        }
    },

    // ── Refresh Hook ──
    refresh() {
        console.log('[SentiMarket] Auto-refresh tick at', new Date().toLocaleTimeString());
        // When backend is wired, replace with: fetch('/api/price') etc.
        const el = document.querySelector('#systemPanel .sys-card[data-metric="refresh"] .sys-card-value');
        if (el) el.textContent = new Date().toLocaleTimeString();
    },
};

// Close popup on overlay click
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('tradeConfirmOverlay');
    if (overlay) overlay.addEventListener('click', e => {
        if (e.target === overlay) window.smApp.cancelTrade();
    });

    // Wire footer tabs
    const tabs = document.getElementById('footerTabs');
    if (tabs) {
        tabs.querySelectorAll('.ftab').forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (tab.dataset.tab === 'system') renderSystemPanel();
                else hideSystemPanel();
            });
        });
    }
});

// ─── SYSTEM PERFORMANCE PANEL ────────────────────
const SYSTEM_METRICS = [
    { key: 'latency', label: 'API Latency', unit: 'ms', baseVal: 42, variance: 20 },
    { key: 'sentiment', label: 'Sentiment Confidence', unit: '%', baseVal: 87, variance: 5 },
    { key: 'correlation', label: 'Correlation Accuracy', unit: '%', baseVal: 91, variance: 3 },
    { key: 'backtest', label: 'Backtest Win Rate', unit: '%', baseVal: 68, variance: 4 },
    { key: 'uptime', label: 'Server Uptime', unit: '', baseVal: 99.97, variance: 0 },
    { key: 'refresh', label: 'Last Refresh', unit: '', baseVal: 0, variance: 0 },
];

function renderSystemPanel() {
    let panel = document.getElementById('systemPanel');
    if (!panel) {
        // Create it inside the tool-panel area
        const bottomRow = document.querySelector('.bottom-row');
        if (!bottomRow) return;
        panel = document.createElement('div');
        panel.id = 'systemPanel';
        panel.style.cssText = 'display:none;';
        bottomRow.parentElement.insertBefore(panel, bottomRow);
    }

    const now = new Date().toLocaleTimeString();
    panel.innerHTML = `
    <div style="padding:10px 0 4px;"><span style="font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--muted);">⚡ SYSTEM PERFORMANCE</span></div>
    <div class="system-grid">
        ${SYSTEM_METRICS.map(m => {
        const val = m.key === 'refresh' ? now
            : m.key === 'uptime' ? m.baseVal.toFixed(2) + '%'
                : Math.round(m.baseVal + (Math.random() - 0.5) * m.variance) + m.unit;
        const isOk = m.key === 'latency' ? parseInt(val) < 100
            : m.key === 'uptime' ? true
                : m.key === 'refresh' ? true
                    : parseInt(val) > 75;
        const color = isOk ? 'var(--accent,#22c55e)' : '#ef4444';
        return `
            <div class="sys-card" data-metric="${m.key}">
                <div class="sys-card-label">${m.label}</div>
                <div class="sys-card-value" style="color:${color};">${val}</div>
                <canvas class="sys-card-sparkline" data-base="${m.baseVal}" data-var="${m.variance}" width="100" height="30"></canvas>
            </div>`;
    }).join('')}
    </div>`;

    // Show system panel, hide bottom-row
    panel.style.display = 'block';
    const br = document.querySelector('.bottom-row');
    if (br) br.style.display = 'none';

    // Draw sparklines
    panel.querySelectorAll('.sys-card-sparkline').forEach(canvas => {
        const ctx = canvas.getContext('2d');
        const base = parseFloat(canvas.dataset.base);
        const variance = parseFloat(canvas.dataset.var) || 5;
        const pts = Array.from({ length: 20 }, () => base + (Math.random() - 0.5) * variance * 2);
        const minV = Math.min(...pts), maxV = Math.max(...pts);
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#22c55e';
        grad.addColorStop(0, accent.replace(')', ',.25)').replace('rgb', 'rgba') || 'rgba(34,197,94,.25)');
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        pts.forEach((p, i) => {
            const x = (i / (pts.length - 1)) * W;
            const y = H - ((p - minV) / (maxV - minV || 1)) * H;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = accent || '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Fill
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    });

    // Auto-refresh system metrics every 5s
    clearInterval(window._sysPanelTimer);
    window._sysPanelTimer = setInterval(renderSystemPanel, 5000);
}

function hideSystemPanel() {
    const panel = document.getElementById('systemPanel');
    if (panel) panel.style.display = 'none';
    const br = document.querySelector('.bottom-row');
    if (br) br.style.display = '';
    clearInterval(window._sysPanelTimer);
}

if (window.smApp) {
    window.smApp._executeTrade = function (action) {
        const apiBaseUrl = localStorage.getItem('smApiBaseUrl') || (window.SENTI_API_CONFIG && window.SENTI_API_CONFIG.baseUrl) || '';
        if (apiBaseUrl) {
            fetch(`${String(apiBaseUrl).replace(/\/$/, '')}/api/trades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    symbol: window.currentAssetSym || 'DOGE',
                    action,
                    source: 'dashboard',
                }),
            }).catch(error => console.warn('[SentiMarket] Trade API unavailable:', error?.message || error));
        }

        const btn = document.querySelector('.buy-btn');
        if (btn) {
            btn.textContent = 'âœ“ ' + action + ' SENT';
            btn.style.opacity = '0.6';
            setTimeout(() => { btn.textContent = action; btn.style.opacity = ''; }, 2000);
        }
    };

    window.smApp.refresh = function () {
        console.log('[SentiMarket] Auto-refresh tick at', new Date().toLocaleTimeString());
        if (typeof window.syncDashboardData === 'function') {
            window.syncDashboardData({ silent: true });
        }
        const el = document.querySelector('#systemPanel .sys-card[data-metric="refresh"] .sys-card-value');
        if (el) el.textContent = new Date().toLocaleTimeString();
    };
}
 
 