/* Edu Library - Quick Quiz popup (v1)
   While a student reads a PDF book, this watches which pages they read.
   When they stop for a while, a small card asks "Wanna take a quick quiz?".
   If they tap Take quiz, Edu AI reads the pages they were on and makes a short quiz.
   Progress (book, pages, topic, scores) is saved on the phone for now. */
(function () {
  "use strict";
  if (window.__eduQuizLoaded) return;
  window.__eduQuizLoaded = true;

  /* ---- settings you can change ---- */
  var CFG = {
    MIN_PAGES: 2,       /* pages that must be read before a quiz is offered */
    MIN_PAGE_SECS: 8,   /* seconds on a page for it to count as read */
    IDLE_SECS: 45,      /* student stops scrolling this long, then the card appears */
    COOLDOWN_MIN: 20,   /* minutes before asking again for the same book */
    QUESTIONS: 4,       /* questions per quiz */
    LAST_PAGES: 3,      /* quiz is made from the last pages the student read */
    MAX_CHARS: 6000     /* text sent to the AI */
  };
  var KEY = "edu_quiz_progress_v1";

  /* ---- saved progress ---- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { window.eduLog && window.eduLog(e); }
  }
  function bookRec(d, title) {
    if (!d[title]) d[title] = { pages: {}, lastPage: 0, lastAsked: 0, quizzes: [] };
    return d[title];
  }
  window.eduQuizProgress = function () { return load(); };

  /* ---- reading tracker ---- */
  var S = { pv: null, title: "", secs: {}, last: {}, cur: 0, lastAct: Date.now(), ticks: 0, prompt: null, quizOpen: false, busy: false };

  function bookTitle() {
    var b = document.querySelector(".pv .pvbar b");
    return b ? (b.textContent || "").trim() : "Book";
  }
  function flush() {
    if (!S.pv || !S.title) return;
    var d = load(), r = bookRec(d, S.title);
    Object.keys(S.secs).forEach(function (p) { r.pages[p] = (r.pages[p] || 0) + S.secs[p]; });
    if (S.cur) r.lastPage = S.cur;
    S.secs = {};
    save(d);
  }
  function resetState() {
    flush();
    S.pv = null; S.title = ""; S.secs = {}; S.last = {}; S.cur = 0; S.lastAct = Date.now();
    closePrompt();
  }
  function touchAct() { S.lastAct = Date.now(); }
  document.addEventListener("scroll", touchAct, true);
  document.addEventListener("touchstart", touchAct, { passive: true, capture: true });
  document.addEventListener("touchmove", touchAct, { passive: true, capture: true });
  document.addEventListener("pointerdown", touchAct, true);

  function curPage(pv) {
    var br = pv.body.getBoundingClientRect(), mid = br.top + br.height / 2;
    var els = pv.wrap.children;
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) return +els[i].dataset.p || 0;
    }
    return 0;
  }
  function readPages() {
    return Object.keys(S.secs).filter(function (p) { return S.secs[p] >= CFG.MIN_PAGE_SECS; }).map(Number);
  }
  function quizPages() {
    var pages = readPages().sort(function (a, b) { return (S.last[b] || 0) - (S.last[a] || 0); });
    return pages.slice(0, CFG.LAST_PAGES).sort(function (a, b) { return a - b; });
  }
  function cooldownOk() {
    var r = load()[S.title];
    return !r || (Date.now() - (r.lastAsked || 0)) > CFG.COOLDOWN_MIN * 60000;
  }

  function tick() {
    var pvEl = document.querySelector(".pv"), pv = null;
    try { pv = (typeof PV !== "undefined") ? PV : null; } catch (e) { pv = null; }
    if (!pvEl || !pv || !pv.pdf || !pv.body || !pv.body.isConnected || !pv.wrap) {
      if (S.pv) resetState();
      return;
    }
    if (S.pv !== pv) { resetState(); S.pv = pv; S.title = bookTitle(); S.lastAct = Date.now(); }
    if (document.hidden || S.quizOpen) return;
    var p = curPage(pv);
    if (p) {
      S.cur = p;
      S.secs[p] = (S.secs[p] || 0) + 1;
      S.last[p] = Date.now();
    }
    S.ticks++;
    if (S.ticks % 15 === 0) flush();
    if (S.prompt || S.busy) return;
    if (navigator.onLine === false) return;
    if (readPages().length >= CFG.MIN_PAGES && (Date.now() - S.lastAct) / 1000 >= CFG.IDLE_SECS && cooldownOk()) showPrompt();
  }
  setInterval(tick, 1000);

  /* ---- small helpers for building the screen ---- */
  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(label, css, fn) {
    var b = el("button", "border:none;border-radius:12px;padding:11px 16px;font-size:14px;font-weight:700;cursor:pointer;" + css, label);
    b.type = "button";
    b.onclick = fn;
    return b;
  }
  function toast(msg) {
    if (typeof window.eduToast === "function") { window.eduToast(msg); return; }
    var t = el("div", "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483600;background:rgba(20,10,35,.96);color:#fff;padding:11px 15px;border-radius:13px;font-size:13px;font-weight:600;max-width:90%;text-align:center", msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  /* ---- the small "Wanna take a quick quiz?" card ---- */
  function markAsked() {
    var d = load(); bookRec(d, S.title).lastAsked = Date.now(); save(d);
  }
  function closePrompt() {
    if (S.prompt) { S.prompt.remove(); S.prompt = null; }
  }
  function showPrompt() {
    closePrompt();
    var box = el("div", "position:fixed;left:12px;right:12px;bottom:calc(18px + env(safe-area-inset-bottom,0px));max-width:420px;margin:0 auto;z-index:2147483500;background:#1c1030;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:14px 14px 12px;box-shadow:0 12px 34px rgba(0,0,0,.5);font-family:inherit");
    var head = el("div", "font-size:15px;font-weight:800;margin-bottom:4px", "\uD83E\uDDE0 Wanna take a quick quiz?");
    var sub = el("div", "font-size:12.5px;opacity:.8;line-height:1.4;margin-bottom:12px", "Test what you just read in \u201C" + S.title + "\u201D.");
    var row = el("div", "display:flex;gap:8px");
    var pages = quizPages();
    var title = S.title;
    row.appendChild(btn("Take quiz", "background:#7c3aed;color:#fff;flex:1", function () {
      markAsked(); closePrompt(); S.secs = {}; startQuiz(title, pages);
    }));
    row.appendChild(btn("Not now", "background:rgba(255,255,255,.1);color:#fff", function () {
      markAsked(); closePrompt(); S.secs = {};
    }));
    box.appendChild(head); box.appendChild(sub); box.appendChild(row);
    document.body.appendChild(box);
    S.prompt = box;
  }

  /* ---- get the text of the pages ---- */
  async function pagesText(pv, pages) {
    var out = "";
    for (var i = 0; i < pages.length; i++) {
      try {
        var pg = await pv.pdf.getPage(pages[i]);
        var tc = await pg.getTextContent();
        var s = tc.items.map(function (it) { return typeof it.str === "string" ? it.str : ""; }).join(" ").replace(/\s+/g, " ").trim();
        if (s) out += "[Page " + pages[i] + "] " + s + "\n";
      } catch (e) { window.eduLog && window.eduLog(e); }
    }
    return out.slice(0, CFG.MAX_CHARS);
  }

  /* ---- read the AI answer ---- */
  function parseQuiz(reply) {
    if (typeof reply !== "string") return null;
    var t = reply.replace(/```json/gi, "").replace(/```/g, "");
    var a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    var obj;
    try { obj = JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
    if (!obj || !Array.isArray(obj.questions)) return null;
    var qs = obj.questions.filter(function (q) {
      return q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length >= 2 &&
        Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length;
    }).map(function (q) {
      return { q: q.q, options: q.options.map(String), answer: q.answer, why: typeof q.why === "string" ? q.why : "" };
    });
    if (!qs.length) return null;
    return { topic: typeof obj.topic === "string" && obj.topic.trim() ? obj.topic.trim() : "this topic", questions: qs };
  }
  window.__eduQuizParse = parseQuiz;

  async function askAI(title, pages, text) {
    var prompt =
      "You are Edu AI. A student has been reading the book \"" + title + "\" (pages " + pages.join(", ") + "). " +
      "Using ONLY the text below, write a quick quiz of " + CFG.QUESTIONS + " multiple-choice questions to check what they understood. " +
      "Use simple, clear English for a school student in Malawi. Each question has 4 options and exactly one correct answer.\n" +
      "Reply with ONLY valid JSON, no markdown and no extra words, in exactly this shape:\n" +
      "{\"topic\":\"short topic name\",\"questions\":[{\"q\":\"question\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":0,\"why\":\"one short sentence explaining the answer\"}]}\n" +
      "\"answer\" is the number (0 to 3) of the correct option.\n\nTEXT:\n" + text;
    var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 60000);
    try {
      var headers = (typeof eduAuthHeaders === "function") ? await eduAuthHeaders() : { "Content-Type": "application/json" };
      var ctx, lvl;
      try { ctx = (typeof buildAppContext === "function") ? buildAppContext() : undefined; } catch (e) { ctx = undefined; }
      try { lvl = (typeof eduLevelCode === "function") ? eduLevelCode() : undefined; } catch (e) { lvl = undefined; }
      var res = await fetch(getAIEndpoint(), {
        method: "POST", signal: ctrl.signal, headers: headers,
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], context: ctx, level: lvl })
      });
      if (res.status === 401) throw new Error("Please sign in again to use Edu AI.");
      var data = null; try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok) throw new Error("Edu AI is busy right now. Try again in a moment.");
      var reply = data && (data.reply || data.text || data.message || data.content ||
        (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
        (Array.isArray(data.content) && data.content.map(function (x) { return x.text || ""; }).join("")));
      var quiz = parseQuiz(reply);
      if (!quiz) throw new Error("I could not make a quiz this time. Please try again.");
      return quiz;
    } finally { clearTimeout(to); }
  }

  /* ---- the quiz screen ---- */
  function overlay() {
    var o = el("div", "position:fixed;inset:0;z-index:2147483550;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit");
    var card = el("div", "width:100%;max-width:440px;max-height:92vh;overflow:auto;background:#1c1030;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:18px;box-shadow:0 16px 44px rgba(0,0,0,.55)");
    o.appendChild(card);
    document.body.appendChild(o);
    return { o: o, card: card };
  }

  async function startQuiz(title, pages) {
    if (S.busy) return;
    var pv = S.pv;
    if (!pv || !pages.length) { toast("Read a few pages first, then try again."); return; }
    S.busy = true;
    var ui = overlay();
    S.quizOpen = true;
    function close() { ui.o.remove(); S.quizOpen = false; S.lastAct = Date.now(); }
    ui.card.appendChild(el("div", "font-size:15px;font-weight:800;text-align:center;padding:26px 6px", "\uD83E\uDDE0 Making your quiz\u2026"));
    try {
      var text = await pagesText(pv, pages);
      if (text.replace(/\[Page \d+\]/g, "").trim().length < 80) {
        close(); S.busy = false;
        toast("These pages are pictures, so I can't make a quiz from them.");
        return;
      }
      var quiz = await askAI(title, pages, text);
      S.busy = false;
      runQuiz(ui, quiz, title, pages, close);
    } catch (e) {
      S.busy = false;
      ui.card.innerHTML = "";
      ui.card.appendChild(el("div", "font-size:14px;line-height:1.5;padding:10px 4px 16px", (e && e.name === "AbortError") ? "That took too long. Please try again." : (e && e.message) || "Something went wrong."));
      var row = el("div", "display:flex;gap:8px");
      row.appendChild(btn("Try again", "background:#7c3aed;color:#fff;flex:1", function () { close(); startQuiz(title, pages); }));
      row.appendChild(btn("Close", "background:rgba(255,255,255,.1);color:#fff", close));
      ui.card.appendChild(row);
    }
  }

  function runQuiz(ui, quiz, title, pages, close) {
    var i = 0, score = 0, card = ui.card;
    function showQ() {
      card.innerHTML = "";
      var q = quiz.questions[i];
      card.appendChild(el("div", "font-size:12px;opacity:.7;margin-bottom:6px", "Quick quiz \u2022 " + quiz.topic + " \u2022 Question " + (i + 1) + " of " + quiz.questions.length));
      card.appendChild(el("div", "font-size:16px;font-weight:800;line-height:1.4;margin-bottom:14px", q.q));
      var opts = [], locked = false;
      var fb = el("div", "display:none;margin-top:12px;font-size:13px;line-height:1.5");
      var next = btn(i + 1 < quiz.questions.length ? "Next" : "See my score", "background:#7c3aed;color:#fff;width:100%;margin-top:12px;display:none", function () {
        i++; if (i < quiz.questions.length) showQ(); else showEnd();
      });
      q.options.forEach(function (text, k) {
        var b = btn(String.fromCharCode(65 + k) + ".  " + text, "display:block;width:100%;text-align:left;background:rgba(255,255,255,.08);color:#fff;margin-bottom:8px;line-height:1.35;font-weight:600", function () {
          if (locked) return;
          locked = true;
          var right = k === q.answer;
          if (right) score++;
          opts.forEach(function (ob, j) {
            if (j === q.answer) ob.style.background = "#15803d";
            else if (j === k) ob.style.background = "#b91c1c";
          });
          fb.style.display = "block";
          fb.textContent = (right ? "\u2705 Correct! " : "\u274C Not quite. ") + (q.why || "");
          next.style.display = "block";
        });
        opts.push(b);
        card.appendChild(b);
      });
      card.appendChild(fb);
      card.appendChild(next);
    }
    function showEnd() {
      var total = quiz.questions.length;
      var d = load(), r = bookRec(d, title);
      r.quizzes.push({ t: Date.now(), topic: quiz.topic, pages: pages, score: score, total: total });
      if (r.quizzes.length > 50) r.quizzes = r.quizzes.slice(-50);
      save(d);
      var msg = score === total ? "Perfect! Great reading." : score >= total / 2 ? "Good job! Read the tricky parts again." : "Keep going! Read the pages again and try another quiz.";
      card.innerHTML = "";
      card.appendChild(el("div", "text-align:center;font-size:34px;margin:6px 0", score === total ? "\uD83C\uDFC6" : "\uD83D\uDCDA"));
      card.appendChild(el("div", "text-align:center;font-size:20px;font-weight:800", "You got " + score + " out of " + total));
      card.appendChild(el("div", "text-align:center;font-size:13px;opacity:.8;margin:6px 0 16px", quiz.topic + " \u2022 " + msg));
      var row = el("div", "display:flex;gap:8px");
      row.appendChild(btn("Another quiz", "background:#7c3aed;color:#fff;flex:1", function () { close(); startQuiz(title, pages); }));
      row.appendChild(btn("Close", "background:rgba(255,255,255,.1);color:#fff", close));
      card.appendChild(row);
    }
    showQ();
  }
})();
