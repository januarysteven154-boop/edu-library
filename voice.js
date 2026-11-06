// EduVoice v2.0: one clean English voice for every play button (Edu AI chat, Examination Room).
// Same calls as v1.2 (ok, play, stop, busy), so index.html does not change.
// No cloud call: it speaks with the best voice installed on the phone, one short sentence at a time.
(function () {
  var seq = 0, active = 0, cool = 0, vc = null;
  function has() {
    try { return !!(window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined"); } catch (e) { return false; }
  }
  function ok() { return has() && Date.now() > cool; }
  function clean(t) {
    return String(t || "")
      .replace(/https?:\/\/\S+/g, " link ")
      .replace(/\u2011/g, "-")
      .replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, "$1 over $2")
      .replace(/\u00d7/g, " times ").replace(/\u00f7/g, " divided by ")
      .replace(/=/g, " equals ").replace(/\+/g, " plus ")
      .replace(/&/g, " and ").replace(/%/g, " percent")
      .replace(/\be\.g\./gi, "for example").replace(/\bi\.e\./gi, "that is")
      .replace(/[()\[\]{}]/g, ", ")
      .replace(/[\u2013\u2014]/g, ", ").replace(/\s-\s/g, ", ")
      .replace(/\u2026/g, ". ")
      .replace(/["\u201C\u201D\u201E\u00AB\u00BB]/g, "")
      .replace(/[<>^~|_*#@`\\\/]/g, " ")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2900}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, " ")
      .replace(/(?:,\s*){2,}/g, ", ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([.!?])\s*,/g, "$1")
      .replace(/\s{2,}/g, " ").trim();
  }
  // short pieces: the phone voice stutters on long ones
  function split(s) {
    var out = [];
    (s.match(/[^.!?\n]+[.!?]?/g) || []).forEach(function (p) {
      p = p.trim();
      if (!p || !/[A-Za-z0-9]/.test(p)) return;
      if (p.length <= 170) { out.push(p); return; }
      var cur = "";
      p.split(/\s+/).forEach(function (w) {
        if (cur && (cur + " " + w).length > 150 && /[,;:]$/.test(cur)) { out.push(cur); cur = w; }
        else if (cur && (cur + " " + w).length > 170) { out.push(cur); cur = w; }
        else cur = cur ? cur + " " + w : w;
      });
      if (cur) out.push(cur);
    });
    return out;
  }
  function score(v) {
    var n = (v.name || "") + " " + (v.voiceURI || ""), l = String(v.lang || "").toLowerCase().replace("_", "-"), sc = 0;
    if (/natural|neural|studio|premium|enhanced|siri/i.test(n)) sc += 6;
    if (v.localService === false || /online|wavenet|network/i.test(n)) sc -= 6; else sc += 2;
    if (/google/i.test(n)) sc += 2;
    if (/espeak|compact/i.test(n)) sc -= 4;
    if (/^en-(gb|us|za|au|ie)/.test(l)) sc += 1;
    return sc;
  }
  function pick() {
    var vs = [];
    try { vs = speechSynthesis.getVoices() || []; } catch (e) {}
    if (!vs.length) return vc;
    var en = vs.filter(function (x) { return /^en/i.test(x.lang || ""); }).sort(function (a, b) { return score(b) - score(a); });
    vc = en[0] || vc;
    return vc;
  }
  function stop() {
    seq++; active = 0;
    try { if (has()) speechSynthesis.cancel(); } catch (e) {}
  }
  // play(text, nextText, onEnd, onFail, more): onEnd when this piece finished, onFail when the phone voice must take over.
  function play(text, nextText, onEnd, onFail) {
    stop();
    var my = seq, failed = false, i = 0;
    if (!has()) { if (onFail) onFail(); return; }
    var parts = split(clean(text));
    if (!parts.length) { if (onEnd) onEnd(); return; }
    active = 1;
    var v = pick();
    function fail() {
      if (failed || my !== seq) return;
      failed = true; active = 0; cool = Date.now() + 10 * 60 * 1000;
      if (onFail) onFail();
    }
    function next() {
      if (my !== seq) return;
      if (i >= parts.length) { active = 0; if (onEnd) onEnd(); return; }
      var u = new SpeechSynthesisUtterance(parts[i++]);
      u.rate = 0.95; u.pitch = 1; u.volume = 1;
      u.lang = v && v.lang ? v.lang : "en-GB";
      if (v) u.voice = v;
      u.onend = next;
      u.onerror = function (ev) {
        if (my !== seq) return;
        var er = ev && ev.error;
        if (er === "canceled" || er === "interrupted") return;
        fail();
      };
      try { speechSynthesis.speak(u); } catch (e) { fail(); }
    }
    next();
  }
  try { if (has()) speechSynthesis.getVoices(); } catch (e) {}
  window.EduVoice = { ok: ok, play: play, stop: stop, busy: function () { return active === 1; }, version: "2.0" };
})();
