/* street-intro.js — opening scene.
   A pixel shopping street (assets/street.jpg, 400x200). Click the pink shop (or anywhere on the street):
   the little walker goes up the road to the shop window, then we zoom in and the real site opens. */
(() => {
  const W = 400, H = 200;
  // walking route in image pixels (feet position) and the sprite scale at each point (perspective)
  const ROUTE = [
    { x: 150, y: 197, s: 0.8 },
    { x: 196, y: 188, s: 0.76 },
    { x: 228, y: 181, s: 0.72 },
    { x: 286, y: 174, s: 0.68 },
  ];
  const ZOOM_AT = { x: 320, y: 100 }; // centre of the shop window

  const walkerSprite = `
    <g class="walker-body">
      <rect x="-7" y="-44" width="14" height="12" fill="#3b2a35"/>
      <rect x="-5" y="-40" width="10" height="10" fill="#ffe0cc"/>
      <rect x="-3" y="-37" width="2" height="2" fill="#3b2a35"/><rect x="2" y="-37" width="2" height="2" fill="#3b2a35"/>
      <rect x="-9" y="-46" width="18" height="4" fill="#ff7eb6"/><rect x="5" y="-50" width="6" height="6" fill="#ff7eb6"/>
      <rect x="-6" y="-30" width="12" height="14" fill="#ff9cc8"/><rect x="-8" y="-20" width="16" height="6" fill="#ff7eb6"/>
      <g class="legs">
        <rect class="leg-l" x="-4" y="-14" width="3" height="12" fill="#ffe0cc"/><rect class="leg-r" x="1" y="-14" width="3" height="12" fill="#ffe0cc"/>
        <rect x="-5" y="-3" width="5" height="3" fill="#5b3550"/><rect x="0" y="-3" width="5" height="3" fill="#5b3550"/>
      </g>
    </g>`;

  function build() {
    const wrap = document.createElement("div");
    wrap.className = "street-intro";
    wrap.id = "streetIntro";
    wrap.innerHTML = `
      <div class="street-stage">
        <svg class="street-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="street">
          <image href="assets/street.jpg" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>
          <g class="shop hot" tabindex="0" role="button" aria-label="enter">
            <rect class="hit" x="244" y="20" width="154" height="162" fill="transparent"/>
            <g class="outline">
              <rect x="244" y="21" width="153" height="160" rx="12" fill="none" stroke="#e2588f" stroke-width="1.6" stroke-dasharray="5 5"/>
              <rect x="244" y="21" width="153" height="160" rx="12" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="5 5" stroke-dashoffset="5"/>
            </g>
          </g>
          <g class="walker hot" tabindex="0" role="button" aria-label="enter">
            <g class="outline">
              <rect x="-13" y="-57" width="26" height="61" rx="4" fill="none" stroke="#e2588f" stroke-width="1.6" stroke-dasharray="4 4"/>
              <rect x="-13" y="-57" width="26" height="61" rx="4" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 4" stroke-dashoffset="4"/>
            </g>
            <rect class="hit" x="-13" y="-57" width="26" height="61" fill="transparent"/>
            ${walkerSprite}
          </g>
        </svg>
      </div>
`;
    document.body.appendChild(wrap);
    return wrap;
  }

  function init() {
    if (location.hash || new URLSearchParams(location.search).has("nostreet")) return;
    const wrap = build();
    const svg = wrap.querySelector(".street-svg");
    const walker = wrap.querySelector(".walker");
    const shop = wrap.querySelector(".shop");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let busy = false;

    const place = (p) => walker.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.s.toFixed(3)})`);
    place(ROUTE[0]);
    document.documentElement.style.overflow = "hidden";

    const close = () => {
      const home = document.querySelector('.tabs .tab[data-tab="home"]');
      if (home) home.click();
      window.scrollTo(0, 0);
      wrap.classList.add("is-leaving");
      document.documentElement.style.overflow = "";
      setTimeout(() => wrap.remove(), 500);
    };

    const walk = (done) => {
      if (reduce) { place(ROUTE[ROUTE.length - 1]); return done(); }
      // pixel-ish stepping: move in small hops along the route
      const segs = [];
      let total = 0;
      for (let i = 1; i < ROUTE.length; i++) {
        const a = ROUTE[i - 1], b = ROUTE[i], len = Math.hypot(b.x - a.x, b.y - a.y);
        segs.push({ a, b, len }); total += len;
      }
      const ms = 520, stepMs = 40;
      walker.classList.add("walking");
      const t0 = performance.now();
      let last = 0;
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        if (now - last >= stepMs || t === 1) {
          last = now;
          let d = t * total;
          for (const s of segs) {
            if (d <= s.len || s === segs[segs.length - 1]) {
              const k = Math.min(1, d / s.len);
              place({ x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, s: s.a.s + (s.b.s - s.a.s) * k });
              break;
            }
            d -= s.len;
          }
        }
        if (t < 1) requestAnimationFrame(tick);
        else { walker.classList.remove("walking"); done(); }
      };
      requestAnimationFrame(tick);
    };

    const enter = () => {
      if (busy) return;
      busy = true;
      shop.classList.add("is-chosen");
      walk(() => {
        walker.classList.add("go-in");
        // zoom toward the shop window: work out where it sits on screen
        const r = svg.getBoundingClientRect();
        const m = svg.getScreenCTM();
        const pt = svg.createSVGPoint(); pt.x = ZOOM_AT.x; pt.y = ZOOM_AT.y;
        const sp = m ? pt.matrixTransform(m) : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        svg.style.transformOrigin = `${sp.x - r.left}px ${sp.y - r.top}px`;
        setTimeout(() => {
          wrap.classList.add("is-entering");
          setTimeout(close, reduce ? 0 : 380);
        }, reduce ? 0 : 80);
      });
    };

    wrap.querySelectorAll(".hot").forEach((el) => {
      el.addEventListener("click", enter);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); } });
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.contains(wrap)) close(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
