// EduVoice v1.1: natural English voice for Edu AI (and later the AI teacher), loaded on demand.
// It asks the backend (?voice=1, Cloudflare Workers AI) for a short piece of speech and plays it.
// If the cloud voice fails, is out of free use for today, or the student is offline, it says so to the
// caller (onFail) and rests for 10 minutes, so the app falls back to the phone voice. Nothing else changes.
// v1.1: the next piece is now fetched 2 seconds AFTER the current piece starts playing (not at the same
// moment), and the audio is decoded off the main thread, so the phone is not busy while the first words play.
(function () {
  var cool = 0, aud = null, active = 0, cache = {}, order = [], seq = 0, pt = 0;
  function signedIn() { try { return !!(window.EduAcct && EduAcct.isIn && EduAcct.isIn()); } catch (e) { return false; } }
  function ok() { return Date.now() > cool && navigator.onLine !== false && signedIn(); }
  function rest() { cool = Date.now() + 10 * 60 * 1000; }
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
      var tk = await EduAcct.token();
      if (!tk) throw new Error("no token");
      var hd = eduDeviceHeaders(); hd.Authorization = "Bearer " + tk;
      var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 25000);
      try {
        var r = await fetch(aiBase() + "/book-link?voice=1", { method: "POST", headers: hd, body: JSON.stringify({ text: text, lang: "en" }), signal: ctl.signal });
        var d = await r.json();
        if (!r.ok || !d || d.ok !== true || !d.audio) throw new Error("voice " + r.status);
        return await b64Url(d.audio, d.mime);
      } finally { clearTimeout(t); }
    })();
    cache[text] = p; order.push(text);
    while (order.length > 6) { var old = order.shift(), op = cache[old]; delete cache[old]; if (op) op.then(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }, function () {}); }
    p.catch(function () { delete cache[text]; });
    return p;
  }
  function stop() {
    seq++; active = 0;
    try { clearTimeout(pt); } catch (e) {}
    try { if (aud) { aud.onended = null; aud.onerror = null; aud.onplaying = null; aud.pause(); aud = null; } } catch (e) {}
  }
  // play(text, nextText, onEnd, onFail): onEnd when this piece finished, onFail when the phone voice must take over
  function play(text, nextText, onEnd, onFail) {
    stop(); var my = seq; active = 1;
    var failed = false, started = false;
    function fail() { if (failed || my !== seq) return; failed = true; active = 0; rest(); onFail(); }
    fetchUrl(text).then(function (url) {
      if (my !== seq) return;
      var a = new Audio(url); aud = a;
      a.onended = function () { if (my !== seq) return; active = 0; onEnd(); };
      a.onerror = fail;
      a.onplaying = function () {
        if (started || my !== seq) return;
        started = true;
        if (nextText) {
          clearTimeout(pt);
          pt = setTimeout(function () { if (my === seq) fetchUrl(nextText).catch(function () {}); }, 2000);
        }
      };
      var pr = a.play(); if (pr && pr.catch) pr.catch(fail);
    }).catch(fail);
  }
  window.EduVoice = { ok: ok, play: play, stop: stop, busy: function () { return active === 1; }, version: "1.1" };
})();
