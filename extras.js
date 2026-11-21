/* extras.js — small add-ons that use the page's Firebase connection (global `db`).
   1. RANDOM MEMORY: click "next random → ???" to write a short line; the box shows 2 random lines.
   2. Visitor counter: a real count kept in Firestore (stats/visitors), shown everywhere a
      ".visitor-no" span appears. One visit = one browser session, so refreshing doesn't inflate it.
      Local development (localhost) only reads the number, never adds to it. */
(() => {
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  /* ---------- RANDOM MEMORY ---------- */
  const BUILT_IN = [
    { text: "夜里突然想吃盐酥鸡", date: "07/04" },
    { text: "和yukiri一起去看玩具总动员了 不过她居然看着看着要掉眼泪了哈哈哈", date: "07/04" },
  ];
  let pool = BUILT_IN.slice();

  const pad2 = (n) => String(n).padStart(2, "0");
  const mmdd = (ms) => { const d = new Date(ms); return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`; };

  function pickTwo(mustInclude) {
    const rest = pool.filter((m) => m !== mustInclude).sort(() => Math.random() - 0.5);
    return (mustInclude ? [mustInclude, ...rest] : rest).slice(0, 2);
  }

  function renderMemories(box, mustInclude) {
    box.querySelectorAll(".rm-line").forEach((el) => el.remove());
    const title = box.querySelector("b");
    let after = title;
    for (const m of pickTwo(mustInclude)) {
      const line = document.createElement("span");
      line.className = "rm-line";
      line.textContent = `${m.date} ${m.text}`;
      after.after(line);
      after = line;
    }
  }

  function setupRandomMemory() {
    const box = document.querySelector(".random-memory-box");
    if (!box) return;
    // the two hard-coded lines become part of the random pool
    box.querySelectorAll(":scope > span").forEach((el) => el.remove());
    const trigger = box.querySelector("small");
    trigger.classList.add("rm-trigger");
    trigger.setAttribute("role", "button");
    trigger.tabIndex = 0;
    trigger.title = "写一条小回忆";

    const form = document.createElement("form");
    form.className = "rm-form";
    form.hidden = true;
    form.innerHTML = `<input type="text" maxlength="40" placeholder="写一句短短的回忆..." aria-label="random memory" required>
      <button type="submit">存</button><button type="button" class="rm-cancel">×</button>`;
    trigger.after(form);
    const input = form.querySelector("input");

    const open = () => { trigger.hidden = true; form.hidden = false; input.focus(); };
    const shut = () => { form.hidden = true; trigger.hidden = false; input.value = ""; };
    trigger.addEventListener("click", open);
    trigger.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    form.querySelector(".rm-cancel").addEventListener("click", shut);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const createdAt = Date.now();
        await db.collection("randomMemories").add({ text, createdAt });
        const added = { text, date: mmdd(createdAt) };
        pool.push(added);
        renderMemories(box, added);
        shut();
        if (typeof showToast === "function") showToast("存好啦 ♡");
      } catch (err) {
        console.error(err);
        if (typeof showToast === "function") showToast("没存上…再试一次？");
      } finally {
        btn.disabled = false;
      }
    });

    renderMemories(box);
    if (typeof db === "undefined") return;
    db.collection("randomMemories").orderBy("createdAt", "desc").limit(200).get()
      .then((snap) => {
        snap.forEach((doc) => {
          const d = doc.data();
          if (d && d.text) pool.push({ text: String(d.text), date: mmdd(d.createdAt || Date.now()) });
        });
        renderMemories(box);
      })
      .catch((err) => console.warn("random memories offline", err));
  }

  /* ---------- visitor counter ---------- */
  function showVisitor(n) {
    const label = String(n).padStart(6, "0");
    document.querySelectorAll(".visitor-no").forEach((el) => { el.textContent = label; });
  }

  async function setupVisitors() {
    if (typeof db === "undefined" || typeof firebase === "undefined") return;
    const ref = db.collection("stats").doc("visitors");
    const KEY = "astra-visitor-no";
    let mine = null;
    try { mine = sessionStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (mine) { showVisitor(mine); return; }
    try {
      if (LOCAL) {
        const snap = await ref.get();
        showVisitor(snap.exists ? snap.data().count : 27);
        return;
      }
      // the counter started at 27 before it was real, so the first real visitor is no. 28
      const n = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const next = (snap.exists ? Number(snap.data().count) || 27 : 27) + 1;
        tx.set(ref, { count: next, updatedAt: Date.now() }, { merge: true });
        return next;
      });
      try { sessionStorage.setItem(KEY, String(n)); } catch (e) { /* ignore */ }
      showVisitor(n);
    } catch (err) {
      console.warn("visitor counter offline", err);
    }
  }

  function init() { setupRandomMemory(); setupVisitors(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
