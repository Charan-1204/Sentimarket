/* ═══════════════════════════════════════════════
   SentiMarket – Settings Panel  v2.0
   All settings persisted to localStorage (smSettings)
═══════════════════════════════════════════════ */

// ─── DEFAULTS ────────────────────────────────
const DEFAULTS = {
    theme: 'dark',          // 'dark'|'light'|'midnight'|'emerald'|'purple'
    cursor: 'neon',          // 'normal'|'neon'|'dot'
    accent: 'green',         // 'green'|'blue'|'purple'
    timeframe: '1D',
    autoRefresh: true,
    compactMode: false,
    animations: true,
    alertPrice: true,
    alertHype: true,
    alertSentiment: true,
    alertSound: false,
    // ── NEW v2.0 ──
    chartStyle: 'line',          // 'line'|'candlestick'
    riskTolerance: 'medium',        // 'low'|'medium'|'high'
    aiAnimation: true,            // typing effect in AI panel
    aiConfirmation: false,           // popup before BUY/SELL
    refreshInterval: '30',            // '10'|'30'|'60' seconds
    aiPersonality: 'conservative',  // personality mode
};

// ─── STATE ────────────────────────────────────
let cfg = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('smSettings') || '{}') };

// ─── SAVE ─────────────────────────────────────
function saveSettings() {
    localStorage.setItem('smSettings', JSON.stringify(cfg));
}

// ─── OPEN / CLOSE ─────────────────────────────
function openSettings() {
    document.getElementById('settingsPanel').classList.add('open');
    document.getElementById('settingsOverlay').classList.add('open');
}
function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('settingsOverlay').classList.remove('open');
}

// ─── APPLY ALL ────────────────────────────────
function applyAll(initial) {
    applyTheme(initial);
    applyAccent(initial);
    applyCursor(initial);
    applyCompact(initial);
    applyAnimations(initial);
    applyPersonalityBadge();
    applyRefreshInterval();
}

// ══════════════════════════════════════════════
// SECTION 1 — THEME (5 themes)
// ══════════════════════════════════════════════
const THEMES = [
    { id: 'dark', label: 'Dark Fintech', color: '#22c55e' },
    { id: 'light', label: 'Light Professional', color: '#16a34a' },
    { id: 'midnight', label: 'Midnight Blue', color: '#3b82f6' },
    { id: 'emerald', label: 'Emerald Pro', color: '#10b981' },
    { id: 'purple', label: 'Purple Quant', color: '#a855f7' },
];

function applyTheme(initial) {
    const root = document.documentElement;
    if (cfg.theme === 'dark') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', cfg.theme);
    }
    // Sync active state in panel if rendered
    document.querySelectorAll('.theme-card').forEach(c =>
        c.classList.toggle('active', c.dataset.theme === cfg.theme));
}
function setTheme(t) {
    cfg.theme = t;
    saveSettings(); applyTheme(false);
    document.querySelectorAll('.theme-card').forEach(c =>
        c.classList.toggle('active', c.dataset.theme === t));
}

// ══════════════════════════════════════════════
// SECTION 2 — ACCENT COLOR
// ══════════════════════════════════════════════
const ACCENT_MAP = {
    green: { main: '#22c55e', dim: 'rgba(34,197,94,.15)', glow: 'rgba(34,197,94,.3)' },
    blue: { main: '#3b82f6', dim: 'rgba(59,130,246,.15)', glow: 'rgba(59,130,246,.3)' },
    purple: { main: '#a855f7', dim: 'rgba(168,85,247,.15)', glow: 'rgba(168,85,247,.3)' },
};
function applyAccent(initial) {
    const a = ACCENT_MAP[cfg.accent] || ACCENT_MAP.green;
    const root = document.documentElement;
    root.style.setProperty('--green', a.main);
    root.style.setProperty('--accent', a.main);
    root.style.setProperty('--green-dim', a.dim);
    root.style.setProperty('--accent-dim', a.dim);
    root.style.setProperty('--green-glow', a.glow);
    root.style.setProperty('--accent-glow', a.glow);
}
function setAccent(color) {
    cfg.accent = color;
    document.querySelectorAll('.accent-swatch').forEach(s =>
        s.classList.toggle('active', s.dataset.accent === color));
    saveSettings(); applyAccent(false);
}

// ══════════════════════════════════════════════
// SECTION 3 — CURSOR
// ══════════════════════════════════════════════
function applyCursor(initial) {
    const c = window.smCursor;
    if (!c) return;
    if (cfg.cursor === 'normal') c.disable();
    else if (cfg.cursor === 'dot') c.setDot();
    else c.enable();
}
function setCursor(type) {
    cfg.cursor = type;
    document.querySelectorAll('.cursor-opt').forEach(b =>
        b.classList.toggle('active', b.dataset.cursor === type));
    saveSettings(); applyCursor(false);
}

// ══════════════════════════════════════════════
// SECTION 4 — DASHBOARD PREFS
// ══════════════════════════════════════════════
function applyCompact(initial) {
    document.body.classList.toggle('compact-mode', cfg.compactMode);
}
function applyAnimations(initial) {
    document.body.classList.toggle('no-animations', !cfg.animations);
}
function setTimeframe(tf) {
    cfg.timeframe = tf;
    document.querySelectorAll('.tf-opt').forEach(b =>
        b.classList.toggle('active', b.dataset.tf === tf));
    document.querySelectorAll('.ttab').forEach(t =>
        t.classList.toggle('active', t.textContent.trim() === tf));
    saveSettings();
}
function toggleAutoRefresh(v) { cfg.autoRefresh = v; saveSettings(); applyRefreshInterval(); }
function toggleCompact(v) { cfg.compactMode = v; saveSettings(); applyCompact(false); }
function toggleAnimations(v) { cfg.animations = v; saveSettings(); applyAnimations(false); }

// ── Chart Style ──
function setChartStyle(style) {
    cfg.chartStyle = style;
    document.querySelectorAll('.chart-style-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.style === style));
    saveSettings();
    if (window.smApp && window.smApp.applyChartStyle) window.smApp.applyChartStyle(style);
}

// ── Risk Tolerance ──
const RISK_LABELS = { low: '🛡 Low Risk', medium: '⚖ Medium Risk', high: '🔥 High Risk' };
function setRiskTolerance(level) {
    cfg.riskTolerance = level;
    saveSettings();
    const badge = document.getElementById('riskBadge');
    if (badge) {
        badge.textContent = RISK_LABELS[level] || level;
        badge.dataset.level = level;
    }
    const slider = document.getElementById('riskSlider');
    if (slider) slider.value = { low: 0, medium: 1, high: 2 }[level] ?? 1;
    if (window.smApp && window.smApp.applyRisk) window.smApp.applyRisk(level);
}
function onRiskSlider(val) {
    const levels = ['low', 'medium', 'high'];
    setRiskTolerance(levels[+val] || 'medium');
}

// ── AI Animation ──
function toggleAiAnimation(v) {
    cfg.aiAnimation = v;
    saveSettings();
    if (window.smApp && window.smApp.setAiAnimation) window.smApp.setAiAnimation(v);
}

// ── AI Trade Confirmation ──
function toggleAiConfirmation(v) { cfg.aiConfirmation = v; saveSettings(); }

// ── Refresh Interval ──
let _refreshTimer = null;
function applyRefreshInterval() {
    if (_refreshTimer) clearInterval(_refreshTimer);
    if (!cfg.autoRefresh) return;
    const ms = parseInt(cfg.refreshInterval, 10) * 1000;
    _refreshTimer = setInterval(() => {
        if (window.smApp && window.smApp.refresh) window.smApp.refresh();
    }, ms);
}
function setRefreshInterval(v) {
    cfg.refreshInterval = v;
    saveSettings();
    applyRefreshInterval();
}

// ══════════════════════════════════════════════
// SECTION 5 — ALERTS
// ══════════════════════════════════════════════
function toggleAlertPrice(v) { cfg.alertPrice = v; saveSettings(); }
function toggleAlertHype(v) { cfg.alertHype = v; saveSettings(); }
function toggleAlertSentiment(v) { cfg.alertSentiment = v; saveSettings(); }
function toggleAlertSound(v) { cfg.alertSound = v; saveSettings(); }

// ══════════════════════════════════════════════
// SECTION 6 — AI PERSONALITY
// ══════════════════════════════════════════════
const PERSONALITIES = [
    { id: 'conservative', label: '🛡 Conservative Analyst', desc: 'Cautious, high confidence only' },
    { id: 'aggressive', label: '⚡ Aggressive Trader', desc: 'Bold signals, high risk tolerance' },
    { id: 'quant', label: '📐 Quantitative Model', desc: 'Data-driven, model-first' },
    { id: 'meme', label: '🚀 Meme Coin Hunter', desc: 'Hype-sensitive, momentum plays' },
    { id: 'institutional', label: '🏛 Institutional Strategist', desc: 'Macro lens, low volatility' },
];
function setPersonality(id) {
    cfg.aiPersonality = id;
    saveSettings();
    applyPersonalityBadge();
    document.querySelectorAll('.personality-opt').forEach(b =>
        b.classList.toggle('active', b.dataset.pid === id));
    if (window.smApp && window.smApp.setPersonality) window.smApp.setPersonality(id);
}
function applyPersonalityBadge() {
    const p = PERSONALITIES.find(x => x.id === cfg.aiPersonality) || PERSONALITIES[0];
    const badge = document.getElementById('personalityBadge');
    if (badge) { badge.textContent = p.label; badge.dataset.pid = p.id; }
}

// ══════════════════════════════════════════════
// BUILD PANEL HTML
// ══════════════════════════════════════════════
function buildSettingsPanel() {
    const panel = document.getElementById('settingsPanel');
    if (!panel) return;

    const gearIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`;

    const toggle = (id, checked, fn, label, sub = '') => `
    <div class="sp-row">
        <div class="sp-row-info">
            <span class="sp-row-title">${label}</span>
            ${sub ? `<span class="sp-row-sub">${sub}</span>` : ''}
        </div>
        <label class="sm-toggle">
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${fn}(this.checked)">
            <span class="sm-toggle-track"><span class="sm-toggle-thumb"></span></span>
        </label>
    </div>`;

    const riskIdx = { low: 0, medium: 1, high: 2 }[cfg.riskTolerance] ?? 1;

    panel.innerHTML = `
    <div class="sp-header">
        <div class="sp-title">${gearIcon} Settings</div>
        <button class="sp-close" onclick="closeSettings()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    </div>

    <div class="sp-body">

        <!-- ① THEME -->
        <div class="sp-section">
            <div class="sp-section-label">① Theme</div>
            <div class="theme-grid">
                ${THEMES.map(t => `
                <button class="theme-card ${cfg.theme === t.id ? 'active' : ''}" data-theme="${t.id}"
                    onclick="setTheme('${t.id}')" title="${t.label}">
                    <span class="theme-dot" style="background:${t.color}"></span>
                    <span class="theme-name">${t.label}</span>
                </button>`).join('')}
            </div>
        </div>

        <!-- ② CURSOR -->
        <div class="sp-section">
            <div class="sp-section-label">② Cursor Style</div>
            <div class="cursor-opts">
                <button class="cursor-opt ${cfg.cursor === 'normal' ? 'active' : ''}" data-cursor="normal" onclick="setCursor('normal')">
                    <span class="co-icon">↖</span> Normal
                </button>
                <button class="cursor-opt ${cfg.cursor === 'neon' ? 'active' : ''}" data-cursor="neon" onclick="setCursor('neon')">
                    <span class="co-icon" style="color:var(--green)">●</span> Neon Glow
                </button>
                <button class="cursor-opt ${cfg.cursor === 'dot' ? 'active' : ''}" data-cursor="dot" onclick="setCursor('dot')">
                    <span class="co-icon">·</span> Minimal Dot
                </button>
            </div>
        </div>

        <!-- ③ ACCENT COLOR -->
        <div class="sp-section">
            <div class="sp-section-label">③ Accent Color</div>
            <div class="accent-row">
                <button class="accent-swatch ${cfg.accent === 'green' ? 'active' : ''}" data-accent="green"
                    style="--sw:#22c55e" onclick="setAccent('green')" title="Green">
                    <span class="sw-dot"></span> Green
                </button>
                <button class="accent-swatch ${cfg.accent === 'blue' ? 'active' : ''}" data-accent="blue"
                    style="--sw:#3b82f6" onclick="setAccent('blue')" title="Blue">
                    <span class="sw-dot"></span> Blue
                </button>
                <button class="accent-swatch ${cfg.accent === 'purple' ? 'active' : ''}" data-accent="purple"
                    style="--sw:#a855f7" onclick="setAccent('purple')" title="Purple">
                    <span class="sw-dot"></span> Purple
                </button>
            </div>
        </div>

        <!-- ④ CHART & AI -->
        <div class="sp-section">
            <div class="sp-section-label">④ Chart &amp; AI</div>

            <div class="sp-row">
                <div class="sp-row-info">
                    <span class="sp-row-title">Chart Style</span>
                    <span class="sp-row-sub">Line or Candlestick view</span>
                </div>
                <div class="chart-style-btns">
                    <button class="chart-style-btn ${cfg.chartStyle === 'line' ? 'active' : ''}" data-style="line"
                        onclick="setChartStyle('line')">Line</button>
                    <button class="chart-style-btn ${cfg.chartStyle === 'candlestick' ? 'active' : ''}" data-style="candlestick"
                        onclick="setChartStyle('candlestick')">Candle</button>
                </div>
            </div>

            <div class="sp-row">
                <div class="sp-row-info">
                    <span class="sp-row-title">Risk Tolerance</span>
                    <span class="sp-row-sub">Affects AI signal weighting</span>
                </div>
                <span class="risk-badge" id="riskBadge" data-level="${cfg.riskTolerance}">
                    ${RISK_LABELS[cfg.riskTolerance]}
                </span>
            </div>
            <div class="risk-slider-wrap">
                <span class="risk-label-sm">Low</span>
                <input type="range" id="riskSlider" class="risk-slider" min="0" max="2" step="1"
                    value="${riskIdx}" oninput="onRiskSlider(this.value)">
                <span class="risk-label-sm">High</span>
            </div>

            ${toggle('aiAnimationToggle', cfg.aiAnimation, 'toggleAiAnimation', 'AI Typing Animation', 'Animated text in explanation panel')}
            ${toggle('aiConfirmToggle', cfg.aiConfirmation, 'toggleAiConfirmation', 'Trade Confirmation Popup', 'Confirm before BUY/SELL')}
        </div>

        <!-- ⑤ DASHBOARD PREFS -->
        <div class="sp-section">
            <div class="sp-section-label">⑤ Dashboard</div>

            <div class="sp-row">
                <div class="sp-row-info">
                    <span class="sp-row-title">Default Timeframe</span>
                </div>
                <div class="tf-opts">
                    ${['1H', '1D', '7D'].map(tf =>
        `<button class="tf-opt ${cfg.timeframe === tf ? 'active' : ''}" data-tf="${tf}"
                            onclick="setTimeframe('${tf}')">${tf}</button>`).join('')}
                </div>
            </div>

            <div class="sp-row">
                <div class="sp-row-info">
                    <span class="sp-row-title">Refresh Interval</span>
                    <span class="sp-row-sub">Auto-refresh price &amp; sentiment</span>
                </div>
                <select class="sp-select" onchange="setRefreshInterval(this.value)">
                    ${['10', '30', '60'].map(s =>
            `<option value="${s}" ${cfg.refreshInterval === s ? 'selected' : ''}>${s}s</option>`).join('')}
                </select>
            </div>

            ${toggle('autoRefreshToggle', cfg.autoRefresh, 'toggleAutoRefresh', 'Auto Refresh', 'Live price updates')}
            ${toggle('compactToggle', cfg.compactMode, 'toggleCompact', 'Compact Mode', 'Reduce card spacing')}
            ${toggle('animToggle', cfg.animations, 'toggleAnimations', 'Animations', 'UI motion effects')}
        </div>

        <!-- ⑥ AI PERSONALITY -->
        <div class="sp-section">
            <div class="sp-section-label">⑥ AI Personality</div>
            <div class="personality-list">
                ${PERSONALITIES.map(p => `
                <button class="personality-opt ${cfg.aiPersonality === p.id ? 'active' : ''}"
                    data-pid="${p.id}" onclick="setPersonality('${p.id}')">
                    <span class="p-label">${p.label}</span>
                    <span class="p-desc">${p.desc}</span>
                </button>`).join('')}
            </div>
        </div>

        <!-- ⑦ ALERTS -->
        <div class="sp-section">
            <div class="sp-section-label">⑦ Alert Preferences</div>
            ${toggle('alertPriceToggle', cfg.alertPrice, 'toggleAlertPrice', 'Price Alerts')}
            ${toggle('alertHypeToggle', cfg.alertHype, 'toggleAlertHype', 'Hype Alerts')}
            ${toggle('alertSentToggle', cfg.alertSentiment, 'toggleAlertSentiment', 'Sentiment Alerts')}
            ${toggle('alertSoundToggle', cfg.alertSound, 'toggleAlertSound', 'Sound Notifications', 'Beep on new alert')}
        </div>

    </div><!-- /sp-body -->

    <div class="sp-footer">
        <button class="sp-reset" onclick="resetSettings()">Reset to Defaults</button>
        <span class="sp-ver">SentiMarket v2.0</span>
        <button class="sp-logout" onclick="logout()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
        </button>
    </div>`;
}

// ─── RESET ────────────────────────────────────
function resetSettings() {
    cfg = { ...DEFAULTS };
    saveSettings();
    buildSettingsPanel();
    applyAll(false);
}

// ─── LOGOUT ───────────────────────────────────
function logout() {
    localStorage.removeItem('smUser');
    localStorage.removeItem('smSession');
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// ─── INIT ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    buildSettingsPanel();
    applyAll(true);

    const btn = document.getElementById('settingsBtn');
    if (btn) btn.onclick = openSettings;
    const overlay = document.getElementById('settingsOverlay');
    if (overlay) overlay.onclick = closeSettings;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSettings(); });
});
