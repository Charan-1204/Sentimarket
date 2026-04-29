/**
 * SentiMarket – Premium Custom Cursor v3
 * ─────────────────────────────────────────────────────────────
 * Context-aware color table:
 *   Normal area  → Neon Green
 *   On Button    → White  + bigger (10px) + strong glow
 *   On Link      → White  + glow (9px, no ring growth)
 *   On Card      → Green  (stays green, ring brightens)
 *
 * Magnetic effect: buttons attract the cursor dot within 80px
 */
(function initCursor() {
    if (window.smCursor) return;

    if (!document.body) {
        document.addEventListener('DOMContentLoaded', initCursor, { once: true });
        return;
    }

    /* ─── CSS ─────────────────────────────────────────────── */
    const style = document.createElement('style');
    style.id = 'smCursorStyle';
    style.textContent = `
        body.sm-cursor-on *,
        body.sm-cursor-on *::before,
        body.sm-cursor-on *::after { cursor: none !important; }

        #sm-cursor-dot,
        #sm-cursor-ring {
            position: fixed;
            top: 0; left: 0;
            border-radius: 50%;
            pointer-events: none;
            z-index: 99999;
            transform: translate(-50%, -50%);
            will-change: transform;
            display: none;
            transition:
                width      150ms ease,
                height     150ms ease,
                background 150ms ease,
                border-color 150ms ease,
                box-shadow 150ms ease,
                opacity    150ms ease;
        }

        /* ── Default: Neon Green ── */
        #sm-cursor-dot {
            width: 8px; height: 8px;
            background: #22c55e;
            box-shadow: 0 0 6px 2px rgba(34,197,94,.75),
                        0 0 14px 4px rgba(34,197,94,.3);
        }
        #sm-cursor-ring {
            width: 36px; height: 36px;
            border: 1.5px solid rgba(34,197,94,.55);
            background: rgba(34,197,94,.04);
            box-shadow: 0 0 12px 2px rgba(34,197,94,.15),
                        inset 0 0 8px rgba(34,197,94,.05);
        }

        /* ── Button hover: White + bigger ── */
        #sm-cursor-dot.ctx-btn {
            width: 10px; height: 10px;
            background: #ffffff;
            box-shadow: 0 0 10px 4px rgba(255,255,255,.9),
                        0 0 22px 7px rgba(255,255,255,.35);
        }
        #sm-cursor-ring.ctx-btn {
            width: 54px; height: 54px;
            border-color: rgba(255,255,255,.75);
            background: rgba(255,255,255,.05);
            box-shadow: 0 0 18px 4px rgba(255,255,255,.22),
                        inset 0 0 12px rgba(255,255,255,.07);
        }

        /* ── Link hover: White, medium size ── */
        #sm-cursor-dot.ctx-link {
            width: 9px; height: 9px;
            background: #ffffff;
            box-shadow: 0 0 8px 3px rgba(255,255,255,.85),
                        0 0 18px 6px rgba(255,255,255,.3);
        }
        #sm-cursor-ring.ctx-link {
            width: 42px; height: 42px;
            border-color: rgba(255,255,255,.60);
            background: rgba(255,255,255,.04);
            box-shadow: 0 0 12px 3px rgba(255,255,255,.15);
        }

        /* ── Card hover: stay Green, ring brightens ── */
        #sm-cursor-dot.ctx-card {
            width: 8px; height: 8px;
            background: #22c55e;
            box-shadow: 0 0 8px 3px rgba(34,197,94,.9),
                        0 0 18px 6px rgba(34,197,94,.4);
        }
        #sm-cursor-ring.ctx-card {
            width: 44px; height: 44px;
            border-color: rgba(34,197,94,.75);
            background: rgba(34,197,94,.06);
            box-shadow: 0 0 16px 4px rgba(34,197,94,.25),
                        inset 0 0 10px rgba(34,197,94,.08);
        }
                        
[data-theme="light"] #sm-cursor-dot.ctx-btn {
    background: #2563eb; /* blue */
    box-shadow: 0 0 10px 4px rgba(37,99,235,.6),
                0 0 22px 7px rgba(37,99,235,.25);
}

[data-theme="light"] #sm-cursor-ring.ctx-btn {
    border-color: rgba(37,99,235,.6);
    background: rgba(37,99,235,.05);
    box-shadow: 0 0 18px 4px rgba(37,99,235,.2),
                inset 0 0 12px rgba(37,99,235,.08);
}


        /* ── Click ── */
        #sm-cursor-dot.clicking  { transform: translate(-50%,-50%) scale(.7); }
        #sm-cursor-ring.clicking { transform: translate(-50%,-50%) scale(.85); }

        /* ── Hidden ── */
        #sm-cursor-dot.hidden, #sm-cursor-ring.hidden { opacity: 0; }
    `;
    document.head.appendChild(style);

    /* ─── ELEMENTS ────────────────────────────────────────── */
    const dot = document.createElement('div'); dot.id = 'sm-cursor-dot';
    const ring = document.createElement('div'); ring.id = 'sm-cursor-ring';
    const cursorRoot = document.documentElement;
    cursorRoot.appendChild(ring);
    cursorRoot.appendChild(dot);

    /* ─── STATE ───────────────────────────────────────────── */
    let mouseX = -200, mouseY = -200;   // raw mouse
    let dotX = -200, dotY = -200;   // dot (with magnetic offset)
    let ringX = -200, ringY = -200;   // ring (lerp)
    let active = false;
    let dotOnly = false;

    // Context classes (one at a time)
    const CTX_NONE = '';
    const CTX_BTN = 'ctx-btn';
    const CTX_LINK = 'ctx-link';
    const CTX_CARD = 'ctx-card';
    let currentCtx = CTX_NONE;

    /* ─── PUBLIC API ──────────────────────────────────────── */
    window.smCursor = {
        enable() { active = true; dotOnly = false; _show(); },
        setDot() { active = true; dotOnly = true; _showDot(); },
        disable() { active = false; dotOnly = false; _hide(); },
        isActive() { return active; }
    };
    function _show() {
        document.body.classList.add('sm-cursor-on');
        dot.style.display = 'block';
        ring.style.display = 'block';
    }
    function _showDot() {
        document.body.classList.add('sm-cursor-on');
        dot.style.display = 'block';
        dot.style.width = '6px';
        dot.style.height = '6px';
        ring.style.display = 'none';
    }
    function _hide() {
        document.body.classList.remove('sm-cursor-on');
        dot.style.display = 'none';
        ring.style.display = 'none';
    }

    /* ─── CONTEXT DETECTION ──────────────────────────────── */
    const BTN_SEL = 'button, [role="button"], input[type="submit"], input[type="checkbox"], .btn-submit, .btn-social, .hbtn, .ttab, .ftab, .cursor-opt, .accent-swatch, .tf-opt, .sp-close, .sp-reset, .sm-toggle, .sm-toggle-track, .search-pill, .search-box, .search-val';
    const LINK_SEL = 'a, .snav-link, .signin-note a, .terms-row a';
    const CARD_SEL = '.kpi-card, .chart-card, .feed-item, .auth-card, .sp-section';

    function getContext(el) {
        if (!el) return CTX_NONE;
        if (el.closest(BTN_SEL)) return CTX_BTN;
        if (el.closest(LINK_SEL)) return CTX_LINK;
        if (el.closest(CARD_SEL)) return CTX_CARD;
        return CTX_NONE;
    }

    function setCtx(ctx) {
        if (ctx === currentCtx) return;
        // remove old
        dot.classList.remove(CTX_BTN, CTX_LINK, CTX_CARD);
        ring.classList.remove(CTX_BTN, CTX_LINK, CTX_CARD);
        currentCtx = ctx;
        if (ctx) {
            dot.classList.add(ctx);
            ring.classList.add(ctx);
        }
    }

    /* ─── MAGNETIC EFFECT ─────────────────────────────────
     * When within MAGNET_RADIUS px of a button center,
     * pull the cursor dot toward the button center.
     * The pull strength falls off with distance.
    ─────────────────────────────────────────────────────── */
    const MAGNET_RADIUS = 80;   // detection radius (px)
    const MAGNET_STRENGTH = 0.28; // 0 = no pull, 1 = snap to center

    let magnetOffsetX = 0, magnetOffsetY = 0;

    function calcMagnet(mx, my) {
        let bestDist = Infinity;
        let bx = 0, by = 0;
        const buttons = document.querySelectorAll(BTN_SEL);
        buttons.forEach(btn => {
            const r = btn.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dx = mx - cx;
            const dy = my - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MAGNET_RADIUS && dist < bestDist) {
                bestDist = dist;
                // Pull vector (from mouse toward center, scaled by proximity)
                const pull = (1 - dist / MAGNET_RADIUS) * MAGNET_STRENGTH;
                bx = -dx * pull;
                by = -dy * pull;
            }
        });
        magnetOffsetX = bestDist < Infinity ? bx : 0;
        magnetOffsetY = bestDist < Infinity ? by : 0;
    }

    /* ─── MOUSE MOVE ─────────────────────────────────────── */
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!active) return;

        // Context-aware color
        setCtx(getContext(e.target));

        // Magnetic offset toward nearest button
        calcMagnet(mouseX, mouseY);

        dotX = mouseX + magnetOffsetX;
        dotY = mouseY + magnetOffsetY;

        dot.style.left = dotX + 'px';
        dot.style.top = dotY + 'px';
    });

    // Keep the synthetic cursor pinned to the viewport during wheel/trackpad scrolls
    // even when no mousemove event fires.
    window.addEventListener('scroll', () => {
        if (!active) return;
        calcMagnet(mouseX, mouseY);
        dotX = mouseX + magnetOffsetX;
        dotY = mouseY + magnetOffsetY;
        dot.style.left = dotX + 'px';
        dot.style.top = dotY + 'px';
        if (!dotOnly) {
            ring.style.left = mouseX + 'px';
            ring.style.top = mouseY + 'px';
            ringX = mouseX;
            ringY = mouseY;
        }
    }, { passive: true });

    /* ─── CLICK ──────────────────────────────────────────── */
    document.addEventListener('mousedown', () => {
        if (!active) return;
        dot.classList.add('clicking');
        ring.classList.add('clicking');
    });
    document.addEventListener('mouseup', () => {
        dot.classList.remove('clicking');
        ring.classList.remove('clicking');
    });

    /* ─── LEAVE / ENTER ──────────────────────────────────── */
    document.addEventListener('mouseleave', () => {
        dot.classList.add('hidden');
        ring.classList.add('hidden');
    });
    document.addEventListener('mouseenter', () => {
        dot.classList.remove('hidden');
        ring.classList.remove('hidden');
    });

    /* ─── LERP RING ANIMATION ────────────────────────────── */
    const LERP_RING = 0.10;  // ring trails further behind
    function lerp(a, b, t) { return a + (b - a) * t; }

    (function animate() {
        if (active) {
            // Ring always follows raw mouse (no magnet on ring)
            ringX = lerp(ringX, mouseX, LERP_RING);
            ringY = lerp(ringY, mouseY, LERP_RING);

            if (!dotOnly) {
                ring.style.left = ringX + 'px';
                ring.style.top = ringY + 'px';
            }
        }
        requestAnimationFrame(animate);
    })();

})();
