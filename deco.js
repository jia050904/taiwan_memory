/* deco.js — scatter stickers (assets/deco/*.png) around the page, scrapbook style.
   Each sticker is pinned to an anchor element: its centre sits at (ax, ay) of the anchor's box
   (0..1, can go past the edges) plus (dx, dy) pixels. All stickers live in one overlay layer,
   so boxes with overflow:hidden never clip them. Desktop layout only. */
(() => {
  const D = (src, anchor, ax, ay, w, rot = 0, dx = 0, dy = 0) => ({ src, anchor, ax, ay, w, rot, dx, dy });
  // few, small, only where the page is empty — never on top of content
  const STICKERS = [
    D("cake", ".outside-left", 0.35, 1, 40, -6, 0, 40),
    D("butterfly", ".outside-left", 0.7, 1, 38, 8, 0, 96),
    D("strawberry", ".outside-left", 0.4, 1, 34, -10, 0, 150),
    D("yellow-cloud", ".site-alien", 0.3, 1, 44, 0, 0, 30),
    D("duck", ".site-alien", 0.75, 1, 34, 6, 0, 40),
    D("dolphin", ".site-alien", 0.45, 1, 46, -6, 0, 92),

    // jelly stickers, one small set per tab, sitting on box corners.
    // anchors on a hidden tab have no size, so those stickers hide by themselves.
    // HOME
    D("jelly-pudding", "#homePanel.active #bgmPlayer", 0, 0, 50, -10, 6, 4),
    D("jelly-strawberry", "#homePanel.active .guestbook-box", 1, 0, 44, 12, -4, 2),
    D("jelly-shooting-star", "#homePanel.active .updates-block", 0, 1, 58, -8, 18, -4),
    D("jelly-melon-soda", "#homePanel.active .travel-block", 1, 1, 44, 8, -6, -10),
    D("jelly-cat", "#homePanel.active .random-memory-box", 1, 0, 48, 6, -10, -4),
    // DIARY
    D("jelly-bunny", "#feedPanel.active #postForm", 1, 0, 56, 8, -18, 0),
    D("jelly-cream-soda", "#feedPanel.active #feed", 1, 1, 48, -6, -6, -14),
    // TRAVEL
    D("jelly-clover", "#travelPanel.active #linkForm", 1, 0, 52, 10, -14, 0),
    D("jelly-star", "#travelPanel.active .filters", 1, 0.5, 36, -12, -8, 0),
    // DANCE
    D("jelly-jam", "#dancePanel.active #danceForm", 1, 0, 48, 8, -14, 0),
    D("jelly-bear-cup", "#dancePanel.active #danceForm", 0, 1, 44, -8, 10, -2),
    // GUIDES
    D("jelly-strawberry", "#guidesPanel.active #guideImportForm", 1, 0, 42, 10, -12, 0),
    D("jelly-pudding", "#guidesPanel.active #guideList", 0, 1, 46, -8, 12, -6),
  ];

  let layer, shell, items = [];
  function build() {
    shell = document.querySelector(".page-shell");
    if (!shell) return false;
    layer = document.createElement("div");
    layer.className = "deco-layer";
    layer.setAttribute("aria-hidden", "true");
    items = STICKERS.map((s) => {
      const img = new Image();
      img.src = `assets/deco/${s.src}.png`;
      img.alt = "";
      img.className = "deco";
      img.decoding = "async";
      img.style.width = `${s.w}px`;
      img.addEventListener("load", () => schedule(), { once: true });
      layer.appendChild(img);
      return { s, img };
    });
    shell.appendChild(layer);
    return true;
  }

  // things a sticker must never sit on: text, buttons, form fields, pictures
  const CONTENT = "button, input, textarea, select, a, p, li, h1, h2, h3, strong, b, small, span, time, label, img:not(.deco):not(.bgm-shell):not(.guestbook-shell), canvas, video, iframe, .card, .home-post-preview, .site-footer";

  function contentRects(base) {
    const list = [];
    shell.querySelectorAll(CONTENT).forEach((el) => {
      if (el.closest(".deco-layer")) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const m = 5; // breathing room, also covers the corners a small rotation adds
      list.push({ l: r.left - base.left - m, t: r.top - base.top - m, r: r.right - base.left + m, b: r.bottom - base.top + m });
    });
    return list;
  }

  // largest share of the sticker covered by any single piece of content
  function coverage(x, y, w, h, rects) {
    const area = w * h;
    let worst = 0;
    for (const c of rects) {
      const ix = Math.min(x + w, c.r) - Math.max(x, c.l);
      const iy = Math.min(y + h, c.b) - Math.max(y, c.t);
      if (ix > 0 && iy > 0) worst = Math.max(worst, (ix * iy) / area);
    }
    return worst;
  }

  function place() {
    const desktop = matchMedia("(min-width: 1100px)").matches;
    layer.hidden = !desktop;
    if (!desktop) return;
    const base = shell.getBoundingClientRect();
    const rects = contentRects(base);
    const taken = [];
    for (const { s, img } of items) {
      const a = document.querySelector(s.anchor);
      const r = a && a.getBoundingClientRect();
      if (!r || !r.width) { img.style.display = "none"; continue; }
      // real drawn height (tall stickers like the cream soda are not square)
      const h = img.naturalWidth ? s.w * img.naturalHeight / img.naturalWidth : s.w;
      const cx = r.left - base.left + r.width * s.ax + s.dx;
      const cy = r.top - base.top + r.height * s.ay + s.dy;
      // try the chosen spot first, then slide outward (away from the anchor's middle) until it covers nothing
      const mx = r.left - base.left + r.width / 2, my = r.top - base.top + r.height / 2;
      let dir = Math.atan2(cy - my, cx - mx);
      if (!isFinite(dir)) dir = -Math.PI / 2;
      let spot = null;
      // nearest free spot: first along the outward direction, then all the way round, a bit further each step
      const turns = [0, -0.4, 0.4, -0.8, 0.8, -1.2, 1.2, -1.6, 1.6, -2.0, 2.0, -2.4, 2.4, -2.8, 2.8, Math.PI];
      search:
      for (let dist = 0; dist <= 150; dist += 6) {
        for (const turn of turns) {
          const x = cx + Math.cos(dir + turn) * dist - s.w / 2;
          const y = cy + Math.sin(dir + turn) * dist - h / 2;
          if (x < 0 || y < 0 || x + s.w > base.width) continue;
          if (coverage(x, y, s.w, h, rects) === 0 && !taken.some((t) => Math.abs(t.x - x) < s.w * 0.7 && Math.abs(t.y - y) < h * 0.7)) { spot = { x, y }; break search; }
          if (dist === 0) break;
        }
      }
      if (!spot) { img.style.display = "none"; continue; }
      taken.push(spot);
      img.style.display = "";
      img.style.left = `${Math.round(spot.x)}px`;
      img.style.top = `${Math.round(spot.y)}px`;
      img.style.setProperty("--rot", `${s.rot}deg`);
    }
  }

  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };

  function clampAbout() {
    const box = document.querySelector(".welcome-box");
    if (!box || box.scrollHeight < 420) return;
    box.classList.add("is-clamped");
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "about-more"; btn.textContent = "▼ 展开";
    btn.addEventListener("click", () => {
      const open = box.classList.toggle("is-clamped") === false;
      btn.textContent = open ? "▲ 收起" : "▼ 展开";
      schedule();
    });
    box.appendChild(btn);
  }

  function init() {
    clampAbout();
    if (!build()) return;
    place();
    new ResizeObserver(schedule).observe(shell);
    addEventListener("resize", schedule);
    // tabs change panel heights
    document.addEventListener("click", (e) => { if (e.target.closest(".tab, [data-jump], [data-side-tab]")) setTimeout(schedule, 50); });
    setTimeout(schedule, 1500); // after feeds/images load
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
