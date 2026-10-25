// EduVoice v1.2: natural English voice for Edu AI (and later the AI teacher), loaded on demand.
// It asks the backend (?voice=1, Cloudflare Workers AI) for a short piece of speech and plays it.
// If the cloud voice fails, is out of free use for today, or the student is offline, it says so to the
// caller (onFail) and rests for 10 minutes, so the app falls back to the phone voice. Nothing else changes.
// v1.2: (1) gets the next pieces ready EARLY (next piece at once, then the ones after it) so there is no
// waiting gap between pieces; (2) cleans symbols before sending text to the cloud voice; (3) decodes audio
// off the main thread.
(function () {
  var cool = 0, aud = null, active = 0, cache = {}, order = [], seq = 0;
  function signedIn() { try { return !!(window.EduAcct && EduAcct.isIn && EduAcct.isIn()); } catch (e) { return false; } }
  function ok() { return Date.now() > cool && navigator.onLine !== false && signedIn(); }
  function rest() { cool = Date.now() + 10 * 60 * 1000; }
  // The cloud voice reads symbols aloud (the phone voice skips them), so remove or replace them first.
  function clean(t) {
    return String(t || "")
      .replace(/https?:\/\/\S+/g, " link ")
      .replace(/[()\[\]{}]/g, ", ")
      .replace(/&/g, " and ").replace(/%/g, " percent").replace(/\+/g, " plus ").replace(/=/g, " equals ")
      .replace(/\s*[\/\\]\s*/g, " ")
      .replace(/["\u201C\u201D\u201E\u00AB\u00BB]/g, "")
      .replace(/[\u2013\u2014]/g, ", ").replace(/\s-\s/g, ", ")
      .replace(/\u2026/g, ". ")
      .replace(/[<>^~|_*#@`]/g, " ")
      .replace(/(?:,\s*){2,}/g, ", ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([.!?])\s*,/g, "$1")
      .replace(/\s{2,}/g, " ").trim();
  }
  async function b64Url(b64, mime) {
    var type = mime || "audio/mpeg";
    try {
      var r = await fetch("data:" + type + ";base64," + b64);
      var b = await r.blob();
      return URL.createObjectURL(b);
    } catch (e) {
      var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
      for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([u], { type: type }));
    }
  }
  function fetchUrl(text) {
    if (cache[text]) return cache[text];
    var p = (async function () {
      var say = clean(text);
      if (!/[A-Za-z0-9]/.test(say)) throw new Error("empty");
      var tk = await EduAcct.token();
      if (!tk) throw new Error("no token");
      var hd = eduDeviceHeaders(); hd.Authorization = "Bearer " + tk;
      var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 25000);
      try {
        var r = await fetch(aiBase() + "/book-link?voice=1", { method: "POST", headers: hd, body: JSON.stringify({ text: say, lang: "en" }), signal: ctl.signal });
        var d = await r.json();
        if (!r.ok || !d || d.ok !== true || !d.audio) throw new Error("voice " + r.status);
        return await b64Url(d.audio, d.mime);
      } finally { clearTimeout(t); }
    })();
    cache[text] = p; order.push(text);
    while (order.length > 8) { var old = order.shift(), op = cache[old]; delete cache[old]; if (op) op.then(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }, function () {}); }
    p.catch(function () { delete cache[text]; });
    return p;
  }
  // gets the next piece going now, then the pieces after it one at a time (never many at once)
  function ahead(my, list) {
    var i = 0;
    function step() {
      if (my !== seq || i >= list.length) return;
      var t = list[i++];
      if (!t) return step();
      fetchUrl(t).then(step, function () {});
    }
    step();
  }
  function stop() {
    seq++; active = 0;
    try { if (aud) { aud.onended = null; aud.onerror = null; aud.pause(); aud = null; } } catch (e) {}
  }
  // play(text, nextText, onEnd, onFail, more): onEnd when this piece finished, onFail when the phone voice must take over.
  // more = optional list of the pieces after nextText.
  function play(text, nextText, onEnd, onFail, more) {
    stop(); var my = seq; active = 1;
    var failed = false;
    function fail() { if (failed || my !== seq) return; failed = true; active = 0; rest(); onFail(); }
    var line = [];
    if (nextText) line.push(nextText);
    if (more && more.length) line = line.concat(more);
    var first = fetchUrl(text);
    if (line.length) ahead(my, line);
    first.then(function (url) {
      if (my !== seq) return;
      var a = new Audio(url); aud = a;
      a.onended = function () { if (my !== seq) return; active = 0; onEnd(); };
      a.onerror = fail;
      var pr = a.play(); if (pr && pr.catch) pr.catch(fail);
    }).catch(fail);
  }
  window.EduVoice = { ok: ok, play: play, stop: stop, busy: function () { return active === 1; }, version: "1.2" };
})();
