/* ═══════════════════════════════════════════════
   SentiMarket — interactions.js  v3.0
   Premium micro-interactions:
   · Magnetic hover (buttons + cards)
   · Ripple click (all buttons)
   · Parallax 3D tilt (dashboard cards)
   · Respects smSettings.animations
   · Disabled automatically on mobile (< 768px)
═══════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ── Helpers ─────────────────────────────── */
    function animationsEnabled() {
        try {
            const cfg = JSON.parse(localStorage.getItem('smSettings') || '{}');
            return cfg.animations !== false;
        } catch (e) { return true; }
    }
    const isMobile = () => window.innerWidth < 768;

    /* ══════════════════════════════════════════
       1. RIPPLE CLICK — all buttons
    ══════════════════════════════════════════ */
    function attachRipple(btn) {
        btn.addEventListener('click', function (e) {
            if (!animationsEnabled()) return;

            // Remove any existing ripples
            const existing = btn.querySelectorAll('.ripple-circle');
            existing.forEach(r => r.remove());

            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 1.6;
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            const ripple = document.createElement('span');
            ripple.className = 'ripple-circle';

            // Accent color: green in default/dark, slightly muted in light
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            ripple.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: ${isLight
                    ? 'rgba(22, 163, 74, 0.15)'
                    : 'rgba(34, 197, 94, 0.25)'};
            `;

            btn.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    }

    function initRipples() {
        document.querySelectorAll('button, .buy-btn, .hbtn').forEach(attachRipple);

        // Watch for dynamically added buttons (chatbot send, etc.)
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.matches('button, .buy-btn, .hbtn')) attachRipple(node);
                    node.querySelectorAll?.('button, .buy-btn, .hbtn')
                        .forEach(attachRipple);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ══════════════════════════════════════════
       2. MAGNETIC HOVER — BUY btn + key cards
    ══════════════════════════════════════════ */
    function attachMagnetic(el, strength = 0.35, maxPx = 6) {
        el.classList.add('magnetic-el');

        el.addEventListener('mousemove', function (e) {
            if (!animationsEnabled() || isMobile()) return;

            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = (e.clientX - cx) * strength;
            const dy = (e.clientY - cy) * strength;

            const tx = Math.max(-maxPx, Math.min(maxPx, dx));
            const ty = Math.max(-maxPx, Math.min(maxPx, dy));

            el.style.transform = `translate(${tx}px, ${ty}px)`;
        });

        el.addEventListener('mouseleave', function () {
            el.style.transform = 'translate(0, 0)';
        });
    }

    function initMagnetic() {
        // BUY button — strongest pull
        document.querySelectorAll('.buy-btn').forEach(el => attachMagnetic(el, 0.4, 6));

        // Header action buttons — subtle
        document.querySelectorAll('.hbtn, .chat-send, .wl-arrow-btn').forEach(el =>
            attachMagnetic(el, 0.25, 4)
        );

        // KPI cards — very gentle
        document.querySelectorAll('.kpi-card').forEach(el =>
            attachMagnetic(el, 0.08, 3)
        );
    }

    /* ══════════════════════════════════════════
       3. PARALLAX 3D TILT — dashboard cards
    ══════════════════════════════════════════ */
    function attachTilt(el, maxDeg = 3) {
        el.classList.add('tilt-card');

        el.addEventListener('mousemove', function (e) {
            if (!animationsEnabled() || isMobile()) return;

            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            // Normalised -1 … +1
            const nx = (e.clientX - cx) / (rect.width / 2);
            const ny = (e.clientY - cy) / (rect.height / 2);

            const rotX = (-ny * maxDeg).toFixed(2);
            const rotY = (nx * maxDeg).toFixed(2);

            el.style.transform =
                `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

            // Subtle inner shadow for depth
            const shadowX = (nx * 6).toFixed(1);
            const shadowY = (ny * 6).toFixed(1);
            el.style.boxShadow =
                `${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.12),
                 0 4px 20px rgba(0,0,0,0.06)`;
        });

        el.addEventListener('mouseleave', function () {
            el.style.transform =
                'perspective(800px) rotateX(0deg) rotateY(0deg)';
            // Restore original shadow (CSS will handle the transition)
            el.style.boxShadow = '';
        });
    }

    function initTilt() {
        // Apply to chart card, bot cards, hype panel, and ai card
        document.querySelectorAll('.chart-card, .bot-card, .ai-card, .hype-panel').forEach(el =>
            attachTilt(el, 2.5)
        );
    }

    /* ══════════════════════════════════════════
       4. DARK MODE CARD GLOW (instead of glass)
    ══════════════════════════════════════════ */
    function attachDarkGlow(el) {
        el.addEventListener('mouseenter', function () {
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            if (theme === 'light') return; // CSS handles light glassmorphism
            el.style.boxShadow =
                '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(34,197,94,0.12)';
        });
        el.addEventListener('mouseleave', function () {
            el.style.boxShadow = '';
        });
    }

    function initDarkGlow() {
        document.querySelectorAll('.kpi-card, .bot-card, .hype-panel').forEach(attachDarkGlow);
    }

    /* ══════════════════════════════════════════
       5. SMOOTH TAB UNDERLINE — footer tabs
    ══════════════════════════════════════════ */
    function initFooterTabSlide() {
        const tabsContainer = document.getElementById('footerTabs');
        if (!tabsContainer) return;

        tabsContainer.addEventListener('click', function (e) {
            const tab = e.target.closest('.ftab');
            if (!tab) return;

            tabsContainer.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Reveal the panel for this tab
            const tabId = tab.getAttribute('data-tab');
            if (typeof showFooterTab === 'function') showFooterTab(tabId);
        });
    }

    /* ══════════════════════════════════════════
       6. INIT — runs after DOM is ready
    ══════════════════════════════════════════ */
    function init() {
        initRipples();
        initMagnetic();
        initTilt();
        initDarkGlow();
        initFooterTabSlide();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already ready
        init();
    }
})();
