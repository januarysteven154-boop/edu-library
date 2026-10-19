/* AI Classroom v3.0 - loaded on demand by index.html. Needs a signed-in student.
   Same flow and same backend calls as v2.1:
   choose level -> no class / class open -> Join -> live class (lesson, AI teacher, hand raising, shared answers).
   v3.0 = redesign only: sunset palette, light + dark, cards, status chips. No backend change.
   WALLPAPER LATER: put   .ecr{--ecr-wallpaper:url(classroom-bg.jpg)}   in any local CSS. Nothing else changes. */
(function(){
var LEVELS=[["standard1","Standard 1"],["standard2","Standard 2"],["standard3","Standard 3"],["standard4","Standard 4"],["standard5","Standard 5"],["standard6","Standard 6"],["standard7","Standard 7"],["standard8","Standard 8"],["form1","Form 1"],["form2","Form 2"],["form3","Form 3"],["form4","Form 4"]];
var timer=null,tick=null,gen=0,busy=false,sid="",ui={},last=null,lastAt=0,feedKey="",appRef=null,rosterOpen=false;
var ROSTER_SHOW=5;

/* ---------- styles (scoped to .ecr so nothing else in the app changes) ---------- */
var CSS=[
".ecr{--bg:#290C20;--bg2:#401529;--card:#54283B;--card2:#613247;--ink:#FFF1DF;--ink2:#E7C8B6;--acc:#FFC16D;--acc2:#E98255;--line:#79505A;--inp:#351323;--onacc:#290C20;--live:#35C779;--rest:#FFAA45;--closed:#F05D64;--conn:#A6A6B2;--speak:#58A6FF;--err:#FF9A9F;--ok:#6FE0A0;",
"box-sizing:border-box;max-width:560px;margin:0 auto;padding:16px 16px calc(100px + env(safe-area-inset-bottom,0px));color:var(--ink);font:16px/1.5 Roboto,'Noto Sans','Segoe UI',sans-serif;background-image:var(--ecr-wallpaper,none);background-size:cover;background-position:center;overflow-wrap:anywhere}",
"body.light .ecr{--bg:#FFF7EE;--bg2:#F8E8D7;--card:#FFFCF7;--card2:#FFF0E2;--ink:#351323;--ink2:#765766;--acc:#B94E2C;--acc2:#D98237;--line:#E7CBB9;--inp:#FFFFFF;--onacc:#FFFFFF;--err:#B3261E;--ok:#1B7A45}",
".ecr *{box-sizing:border-box}",
".ecr-head{margin:4px 2px 16px}.ecr-head h1{margin:0 0 4px;font-size:22px;line-height:1.25;font-weight:700}.ecr-head p{margin:0;font-size:15px;color:var(--ink2)}",
".ecr-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.18)}",
".ecr-card h2{margin:0 0 4px;font-size:19px;line-height:1.3;font-weight:700}",
".ecr-sub{margin:0;font-size:14px;color:var(--ink2)}",
".ecr-kick{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}",
".ecr-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;padding:10px 16px;margin-top:12px;border:1.5px solid var(--acc);border-radius:12px;background:var(--acc);color:var(--onacc);font:600 16px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".ecr-btn.sec{background:transparent;color:var(--ink);border-color:var(--line)}",
".ecr-btn.sm{width:auto;flex:1;margin-top:0}",
".ecr-btn:active{transform:scale(.98);opacity:.85}",
".ecr-btn:disabled{opacity:.55;cursor:default;transform:none}",
".ecr button:focus-visible,.ecr select:focus-visible,.ecr textarea:focus-visible,.ecr summary:focus-visible{outline:3px solid var(--speak);outline-offset:2px}",
".ecr-row{display:flex;gap:8px;margin-top:12px}",
".ecr-lab{display:block;margin:12px 0 6px;font-size:14px;font-weight:600}",
".ecr-field{display:block;width:100%;min-height:48px;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--inp);color:var(--ink);font:16px/1.4 Roboto,'Noto Sans','Segoe UI',sans-serif}",
"textarea.ecr-field{min-height:96px;resize:vertical}",
".ecr-msg{min-height:20px;margin-top:8px;font-size:14px;font-weight:600}.ecr-msg.err{color:var(--err)}.ecr-msg.ok{color:var(--ok)}",
".ecr-chip{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:5px 12px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);font-size:14px;font-weight:600}",
".ecr-dot{flex:0 0 10px;width:10px;height:10px;border-radius:50%;background:var(--conn)}",
".ecr-dot.live,.ecr-dot.listening{background:var(--live)}.ecr-dot.rest,.ecr-dot.hand{background:var(--rest)}.ecr-dot.closed{background:var(--closed)}.ecr-dot.speaking{background:var(--speak)}.ecr-dot.conn,.ecr-dot.disconnected{background:var(--conn)}",
".ecr-teach{display:flex;align-items:center;gap:14px}.ecr-teach>div:last-child{flex:1;min-width:0}",
".ecr-ava{flex:0 0 72px;width:72px;height:72px;border-radius:50%;border:3px solid var(--acc);background:var(--bg2);display:flex;align-items:center;justify-content:center}",
".ecr-ava svg{width:38px;height:38px}",
".ecr-teach b{display:block;font-size:19px;line-height:1.25}",
".ecr-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}",
".ecr-stat{padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg2)}.ecr-stat.wide{grid-column:1/-1}",
".ecr-stat small{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)}",
".ecr-stat span{display:block;margin-top:2px;font-size:17px;font-weight:700}.ecr-stat.wide span{font-size:28px;line-height:1.15}",
".ecr-prep{margin:12px 0 0;color:var(--rest);font-size:14px;font-weight:600}",
".ecr-block{margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--bg2);font-size:16px;line-height:1.6;white-space:pre-wrap}",
".ecr-blab{margin:14px 0 0;font-size:14px;font-weight:700}",
".ecr-tag{display:inline-block;margin:6px 0 0;padding:3px 10px;border:1px solid var(--rest);border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}",
".ecr-lesson{margin:12px 0 0;font-size:17px;line-height:1.65;white-space:pre-wrap}",
".ecr-ex{margin-top:8px;padding:12px;border-left:4px solid var(--acc2);border-radius:4px 12px 12px 4px;background:var(--card2);font-size:16px;line-height:1.6;white-space:pre-wrap}",
".ecr-pq{margin-top:8px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--bg2)}",
".ecr-pq p{margin:0;font-size:16px;line-height:1.6;white-space:pre-wrap}.ecr-pq .num{font-weight:700;color:var(--acc)}",
".ecr-ans{margin-top:8px;padding:10px 12px;border-radius:8px;background:var(--card2);font-size:16px;line-height:1.6;white-space:pre-wrap}",
".ecr-link{margin-top:8px;min-height:44px;padding:8px 14px;border:1.5px solid var(--line);border-radius:10px;background:transparent;color:var(--ink);font:600 15px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer}.ecr-link:active{opacity:.8}",
".ecr-big{margin:12px 0 0;font-size:18px;font-weight:700}",
".ecr-r{display:flex;align-items:center;gap:10px;min-height:44px;padding:6px 10px;border-radius:10px}",
".ecr-r.now{background:var(--card2);box-shadow:inset 3px 0 0 var(--speak)}",
".ecr-r .nm{flex:1;min-width:0;font-size:16px}.ecr-r .st{font-size:14px;color:var(--ink2);white-space:nowrap}",
".ecr-q,.ecr-a{padding:12px;border-radius:12px;font-size:16px;line-height:1.6}",
".ecr-q{background:var(--bg2);border-left:4px solid var(--speak);margin-top:14px}",
".ecr-a{background:var(--card2);border-left:4px solid var(--acc);margin:6px 0 0 12px;white-space:pre-wrap}",
".ecr-who{display:block;margin-bottom:2px;font-size:13px;font-weight:700;color:var(--ink2)}",
".ecr-q .ecr-who{color:var(--speak)}.ecr-a .ecr-who{color:var(--acc)}",
"body.light .ecr-q .ecr-who{color:#1D5FB0}",
".ecr-spin{display:inline-block;width:16px;height:16px;margin-right:8px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:ecrs .8s linear infinite}@keyframes ecrs{to{transform:rotate(360deg)}}",
"@media (prefers-reduced-motion:reduce){.ecr-spin{animation:none}}"
].join("\n");
function ensureStyle(){
  if(document.getElementById("ecr-style"))return;
  var s=document.createElement("style");s.id="ecr-style";s.textContent=CSS;document.head.appendChild(s);
}

/* ---------- small helpers ---------- */
function base(){try{return aiBase();}catch(e){return "https://edu-ai-backend-three.vercel.app/api";}}
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function btn(label,cls){var b=h("button","ecr-btn"+(cls?" "+cls:""),label);b.type="button";return b;}
function levelName(code){for(var i=0;i<LEVELS.length;i++)if(LEVELS[i][0]===code)return LEVELS[i][1];return code||"";}
function clean(s){return String(s||"").replace(/\\[dt]?frac\{([^}]*)\}\{([^}]*)\}/g,function(m,a,b){function w(x){x=x.trim();return /^[0-9A-Za-z.]+$/.test(x)?x:"("+x+")";}return w(a)+"/"+w(b);}).replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\times/g,"\u00d7").replace(/\\div/g,"\u00f7").replace(/\\cdot/g,"\u00b7").replace(/\\left|\\right/g,"").replace(/\\\(|\\\)|\\\[|\\\]/g,"").replace(/\\,/g," ").replace(/\*\*/g,"");}
function rid(){var a="abcdefghijklmnopqrstuvwxyz0123456789",s="r";for(var i=0;i<20;i++)s+=a[Math.floor(Math.random()*a.length)];return s+Date.now();}
function hush(){try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}}
function say(t){
  if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined")return false;
  hush();
  var s=String(t||"").replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,"$1 over $2").replace(/\u00d7/g," times ").replace(/\u00f7/g," divided by ").replace(/=>/g,". ").replace(/=/g," equals ").replace(/\+/g," plus ").replace(/ - /g," minus ").replace(/[()*]/g," ").replace(/-----/g," ");
  var parts=s.match(/[^.!?\n]+[.!?]?/g)||[];
  parts.forEach(function(p){if(!p.trim())return;var u=new SpeechSynthesisUtterance(p.trim());u.rate=0.9;u.lang="en";speechSynthesis.speak(u);});
  return true;
}
/* Listen / Stop: Stop only stops the voice. It never leaves the class. */
function listenRow(getText,msgEl){
  var row=h("div","ecr-row");
  var b1=btn("Listen","sec sm"),b2=btn("Stop","sec sm");
  b1.onclick=function(){msgEl.className="ecr-msg err";msgEl.textContent="";var t=getText();if(!t){msgEl.textContent="Nothing to read yet.";return;}if(!say(t))msgEl.textContent="Voice is not available on this phone.";};
  b2.onclick=function(){hush();msgEl.textContent="";};
  row.appendChild(b1);row.appendChild(b2);return row;
}
function stop(){gen++;hush();if(timer){clearTimeout(timer);timer=null;}if(tick){clearInterval(tick);tick=null;}}
function post(path,body){
  return window.EduAcct.token().then(function(tk){
    if(!tk)return {error:"Please sign in again."};
    var hd=(typeof eduDeviceHeaders==="function")?eduDeviceHeaders():{"Content-Type":"application/json"};
    hd.Authorization="Bearer "+tk;
    return fetch(base()+path,{method:"POST",headers:hd,body:JSON.stringify(body||{})}).then(function(r){return r.json().catch(function(){return {error:"Bad reply"};});});
  }).catch(function(){return {error:"No connection. Please try again."};});
}
function plain(act){return "/book-link?classroom="+act;}
function url(act){return "/book-link?classroom="+act+"&session="+encodeURIComponent(sid);}
function alive(){return ui.status&&document.body.contains(ui.status);}
function inDoc(n){return n&&document.body.contains(n);}
function pageHead(title,support){var d=h("div","ecr-head");d.appendChild(h("h1",null,title));if(support)d.appendChild(h("p",null,support));return d;}
function capSvg(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--acc)"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/></svg>';}
function teacherRow(subtitle){
  var top=h("div","ecr-teach");
  var pic=h("div","ecr-ava");pic.innerHTML=capSvg();
  var tx=h("div");tx.appendChild(h("b",null,"AI Teacher"));tx.appendChild(h("div","ecr-sub",subtitle));
  top.appendChild(pic);top.appendChild(tx);
  return {row:top,text:tx};
}

/* ---------- lesson card (approved lesson from the database) ---------- */
function oneLine(x){
  if(x==null)return "";
  if(typeof x==="string")return x;
  if(Array.isArray(x))return x.map(oneLine).filter(Boolean).join("  =>  ");
  if(typeof x==="object"){
    var q=x.question||x.q||x.title||x.problem||"";
    var a=x.answer||x.a||x.solution||x.text||x.explanation||"";
    if(q||a)return (q&&a)?(oneLine(q)+"  =>  "+oneLine(a)):oneLine(q||a);
    return Object.keys(x).map(function(k){return oneLine(x[k]);}).filter(Boolean).join("  ");
  }
  return String(x);
}
function lessonCard(l){
  var c=h("section","ecr-card");
  if(!l){
    c.appendChild(h("h2",null,"Lesson"));
    c.appendChild(h("p","ecr-sub","The lesson notes are not ready yet."));
    return c;
  }
  c.appendChild(h("p","ecr-kick","Today's lesson"));
  c.appendChild(h("h2",null,clean(l.title)||"Lesson"));
  c.appendChild(h("span","ecr-tag",l.label||"AI-prepared, not teacher-verified"));
  var spoken=[clean(l.title),clean(l.text)];
  c.appendChild(h("div","ecr-lesson",clean(l.text)));
  var ex=Array.isArray(l.examples)?l.examples.map(function(e){return clean(oneLine(e));}).filter(Boolean):[];
  if(ex.length){
    c.appendChild(h("h3","ecr-blab","Examples"));
    ex.forEach(function(t,i){var b=h("div","ecr-ex");b.appendChild(h("span","ecr-who","Example "+(i+1)));b.appendChild(document.createTextNode(t));c.appendChild(b);spoken.push(t);});
  }
  var pr=Array.isArray(l.practice)?l.practice:[];
  var n=0;
  if(pr.length){
    c.appendChild(h("h3","ecr-blab","Practice questions"));
    pr.forEach(function(p){
      var q=clean(typeof p==="object"&&p?(p.question||p.q||oneLine(p)):oneLine(p));
      var a=clean(typeof p==="object"&&p?(p.answer||p.a||""):"");
      if(!q)return;
      n++;
      var box=h("div","ecr-pq");
      var qp=h("p");qp.appendChild(h("span","num",n+". "));qp.appendChild(document.createTextNode(q));box.appendChild(qp);
      if(a){
        var tg=h("button","ecr-link","Show answer");tg.type="button";tg.setAttribute("aria-expanded","false");
        var ans=h("div","ecr-ans",a);ans.style.display="none";
        tg.onclick=function(){var open=ans.style.display==="none";ans.style.display=open?"block":"none";tg.textContent=open?"Hide answer":"Show answer";tg.setAttribute("aria-expanded",open?"true":"false");};
        box.appendChild(tg);box.appendChild(ans);
      }
      c.appendChild(box);
    });
  }
  var lm=h("div","ecr-msg err");lm.setAttribute("role","status");
  c.appendChild(listenRow(function(){return spoken.join(". ");},lm));c.appendChild(lm);
  return c;
}

/* ---------- start: choose level / find open class / join ---------- */
function openScreen(app){
  stop();ui={};feedKey="";last=null;sid="";appRef=app;rosterOpen=false;busy=false;
  ensureStyle();
  try{setActiveNav("classroom");}catch(e){}
  try{setHeader('<h2>AI Classroom</h2>');}catch(e){}
  app.innerHTML="";
  var box=h("div","ecr");app.appendChild(box);
  if(!(window.EduAcct&&window.EduAcct.isIn&&window.EduAcct.isIn())){
    var c=h("div","ecr-card");c.appendChild(h("h2",null,"Please sign in"));
    c.appendChild(h("p","ecr-sub","Sign in with your student account first (tap the account icon at the top), then open the Classroom again."));
    box.appendChild(c);return;
  }
  loadOpen(box);
}
function loadingCard(text){
  var c=h("div","ecr-card");c.setAttribute("role","status");
  var p=h("p","ecr-sub");p.appendChild(h("span","ecr-spin"));p.appendChild(document.createTextNode(text));c.appendChild(p);return c;
}
function loadOpen(box){
  box.innerHTML="";
  box.appendChild(loadingCard("Looking for your class..."));
  post(plain("open"),{}).then(function(d){if(inDoc(box))route(box,d,false);});
}
function route(box,d,checked){
  box.innerHTML="";
  if(!d||d.ok!==true){showError(box,(d&&d.error)||"Could not load the classroom.");return;}
  if(!d.level){levelPicker(box,"",false);return;}
  if(d.open!==true){noClass(box,d.level,checked);return;}
  sid=d.session;
  if(d.joined===true){enter(box,d);return;}
  joinCard(box,d);
}
function showError(box,msg){
  var c=h("div","ecr-card");
  c.appendChild(h("h2",null,"Something went wrong"));
  var m=h("p","ecr-msg err",msg);m.setAttribute("role","alert");c.appendChild(m);
  var b=btn("Try again");b.onclick=function(){loadOpen(box);};
  c.appendChild(b);box.appendChild(c);
}
function levelPicker(box,current,canGoBack){
  box.appendChild(pageHead("Welcome to your classroom","Choose your learning level so we can find the right classroom and lessons for you."));
  var c=h("div","ecr-card");
  var lab=h("label","ecr-lab","Learning level");lab.htmlFor="ecr-level";
  var sel=h("select","ecr-field");sel.id="ecr-level";
  if(!current){var o0=h("option","Choose your level");o0.value="";o0.selected=true;sel.appendChild(o0);}
  LEVELS.forEach(function(l){var o=h("option",null,l[1]);o.value=l[0];if(l[0]===current)o.selected=true;sel.appendChild(o);});
  var go=btn("Save Level");
  var msg=h("div","ecr-msg");msg.setAttribute("role","status");
  go.onclick=function(){
    if(!sel.value){msg.className="ecr-msg err";msg.textContent="Please choose your level first.";return;}
    msg.className="ecr-msg";msg.textContent="";go.disabled=true;go.textContent="Saving...";
    post(plain("setlevel"),{level:sel.value}).then(function(d){
      if(!inDoc(box))return;
      go.disabled=false;go.textContent="Save Level";
      if(d&&d.ok===true){msg.className="ecr-msg ok";msg.textContent="Level saved: "+levelName(sel.value)+".";setTimeout(function(){if(inDoc(box))loadOpen(box);},700);}
      else{msg.className="ecr-msg err";msg.textContent=(d&&d.error)||"Could not save your level.";}
    });
  };
  c.appendChild(lab);c.appendChild(sel);c.appendChild(go);c.appendChild(msg);
  if(canGoBack){var bk=btn("Back","sec");bk.onclick=function(){loadOpen(box);};c.appendChild(bk);}
  box.appendChild(c);
}
function noClass(box,level,checked){
  box.appendChild(pageHead("AI Classroom"));
  var c=h("div","ecr-card");
  var ch=h("span","ecr-chip");ch.appendChild(h("span","ecr-dot closed"));ch.appendChild(h("span",null,"No class open"));c.appendChild(ch);
  c.appendChild(h("h2",null,"No class is open right now")).style.marginTop="12px";
  c.appendChild(h("p","ecr-sub","Your level: "+levelName(level)+". Come back when your teacher's class time starts."));
  var note=h("div","ecr-msg",checked?"Checked just now. Still no class is open for your level.":"");note.setAttribute("role","status");
  var b1=btn("Check again"),b2=btn("Change level","sec");
  b1.onclick=function(){
    b1.disabled=true;b2.disabled=true;b1.textContent="";b1.appendChild(h("span","ecr-spin"));b1.appendChild(document.createTextNode("Checking..."));
    post(plain("open"),{}).then(function(d){if(inDoc(box))route(box,d,true);});
  };
  b2.onclick=function(){box.innerHTML="";levelPicker(box,level,true);};
  c.appendChild(b1);c.appendChild(b2);c.appendChild(note);box.appendChild(c);
}
function joinCard(box,d){
  box.appendChild(pageHead("AI Classroom"));
  var c=h("div","ecr-card");
  var ch=h("span","ecr-chip");ch.appendChild(h("span","ecr-dot live"));ch.appendChild(h("span",null,"A class is open now."));c.appendChild(ch);
  var t=teacherRow(clean(d.title||"")+" \u00b7 "+levelName(d.level));t.row.style.marginTop="14px";c.appendChild(t.row);
  var L=d.lesson;
  if(L&&(L.title||L.text)){
    c.appendChild(h("p","ecr-kick","Lesson")).style.marginTop="16px";
    c.appendChild(h("h2",null,clean(L.title)||"Lesson"));
    var pv=clean(L.text||"");if(pv.length>220)pv=pv.slice(0,220).replace(/\s+\S*$/,"")+"...";
    if(pv)c.appendChild(h("p","ecr-sub",pv)).style.fontSize="15px";
  }
  var go=btn("Join Class");
  var msg=h("div","ecr-msg");msg.setAttribute("role","status");
  go.onclick=function(){
    msg.className="ecr-msg";msg.textContent="";go.disabled=true;go.textContent="";go.appendChild(h("span","ecr-spin"));go.appendChild(document.createTextNode("Connecting..."));
    post(url("join"),{}).then(function(j){
      if(!inDoc(box))return;
      if(j&&j.ok===true){enter(box,d);}
      else{go.disabled=false;go.textContent="Try again";msg.className="ecr-msg err";msg.textContent=(j&&j.error)||"Could not join the class.";}
    });
  };
  var b2=btn("Change level","sec");
  b2.onclick=function(){box.innerHTML="";levelPicker(box,d.level,true);};
  c.appendChild(go);c.appendChild(b2);c.appendChild(msg);box.appendChild(c);
}
function enter(box,d){
  box.innerHTML="";
  var cls=h("div");box.appendChild(cls);
  build(cls,d);
  start();
}

/* ---------- live class screen ---------- */
function build(cls,d){
  cls.innerHTML="";
  /* 1. AI teacher card */
  var c1=h("section","ecr-card");
  var t=teacherRow(levelName(d.level));
  ui.title=h("div","ecr-sub");t.text.appendChild(ui.title);
  var chip=h("span","ecr-chip");chip.style.marginTop="8px";
  var dot=h("span","ecr-dot conn"),st=h("span",null,"Connecting...");
  st.setAttribute("role","status");
  chip.appendChild(dot);chip.appendChild(st);t.text.appendChild(chip);
  c1.appendChild(t.row);
  ui.dot=dot;ui.status=st;
  var stats=h("div","ecr-stats");
  ui.timeBox=h("div","ecr-stat wide");ui.timeBox.style.display="none";
  ui.timeBox.appendChild(h("small",null,"Class time left"));ui.time=h("span");ui.timeBox.appendChild(ui.time);
  var s1=h("div","ecr-stat");s1.appendChild(h("small",null,"Class answers used"));ui.used=h("span",null,"-");s1.appendChild(ui.used);
  var s2=h("div","ecr-stat");s2.appendChild(h("small",null,"Your questions"));ui.mineq=h("span",null,"-");s2.appendChild(ui.mineq);
  stats.appendChild(ui.timeBox);stats.appendChild(s1);stats.appendChild(s2);c1.appendChild(stats);
  ui.prep=h("p","ecr-prep","Preparing an answer...");ui.prep.style.display="none";c1.appendChild(ui.prep);
  c1.appendChild(h("h3","ecr-blab","Latest explanation"));
  ui.latest=h("div","ecr-block");c1.appendChild(ui.latest);
  var lm=h("div","ecr-msg err");lm.setAttribute("role","status");
  c1.appendChild(listenRow(function(){return ui.latestText||"";},lm));c1.appendChild(lm);
  ui.again=btn("Check for the next class");ui.again.style.display="none";
  ui.again.onclick=function(){openScreen(appRef);};
  c1.appendChild(ui.again);
  cls.appendChild(c1);

  /* 2. lesson */
  cls.appendChild(lessonCard(d.lesson));

  /* 3. your turn */
  var c2=h("section","ecr-card");
  ui.turnH=h("h2",null,"Your turn");c2.appendChild(ui.turnH);
  ui.mine=h("p","ecr-big");c2.appendChild(ui.mine);
  ui.hint=h("p","ecr-sub");c2.appendChild(ui.hint);
  ui.raise=btn("Raise Hand");
  ui.lower=btn("Lower Hand","sec");ui.lower.style.display="none";
  ui.askBox=h("div");ui.askBox.style.display="none";
  var ql=h("label","ecr-lab","Your question");ql.htmlFor="ecr-q";
  ui.q=h("textarea","ecr-field");ui.q.id="ecr-q";ui.q.maxLength=300;ui.q.rows=4;ui.q.placeholder="Ask your question about the lesson...";ui.q.autocomplete="off";
  ui.ask=btn("Ask the AI Teacher");ui.ask.disabled=true;
  ui.done=btn("I Am Done","sec");
  ui.askBox.appendChild(ql);ui.askBox.appendChild(ui.q);ui.askBox.appendChild(ui.ask);ui.askBox.appendChild(ui.done);
  ui.msg=h("div","ecr-msg");ui.msg.setAttribute("role","status");
  c2.appendChild(ui.raise);c2.appendChild(ui.lower);c2.appendChild(ui.askBox);c2.appendChild(ui.msg);
  cls.appendChild(c2);
  ui.raise.onclick=function(){act("raise");};
  ui.lower.onclick=function(){act("lower");};
  ui.done.onclick=function(){act("lower");};
  ui.ask.onclick=askNow;
  ui.q.oninput=function(){ui.ask.disabled=busy||!ui.q.value.trim();};

  /* 4. roster */
  var c3=h("section","ecr-card");
  c3.appendChild(h("h2",null,"Classroom"));
  ui.speaker=h("p","ecr-sub");ui.speaker.style.margin="2px 0 8px";c3.appendChild(ui.speaker);
  ui.roster=h("div");c3.appendChild(ui.roster);
  ui.more=btn("View All Students","sec");ui.more.style.display="none";
  ui.more.onclick=function(){rosterOpen=!rosterOpen;if(last)render(last);};
  c3.appendChild(ui.more);
  cls.appendChild(c3);

  /* 5. shared conversation */
  var c4=h("section","ecr-card");ui.c4=c4;
  c4.appendChild(h("h2",null,"Class Conversation"));
  c4.appendChild(h("p","ecr-sub","Questions and answers shared with everyone in the classroom."));
  ui.feed=h("div");c4.appendChild(ui.feed);
  cls.appendChild(c4);
}

function secs(n){n=Math.max(0,Math.floor(n));var m=Math.floor(n/60),s=n%60;return m+":"+(s<10?"0":"")+s;}
var LABEL={listening:"Listening",hand:"Hand raised",speaking:"Speaking",disconnected:"Disconnected"};

function render(d){
  if(!alive())return;
  var isOpen=d.open===true,paused=d.paused===true;
  ui.dot.className="ecr-dot "+(!isOpen?"closed":(paused?"rest":"live"));
  ui.status.textContent=!isOpen?"Class is closed":(paused?"AI teacher is resting":"Live");
  ui.again.style.display=isOpen?"none":"flex";
  ui.title.textContent=d.title||"";
  ui.used.textContent=(typeof d.used==="number"&&typeof d.max==="number")?d.used+" of "+d.max:"-";
  ui.mineq.textContent=(typeof d.mine==="number"&&typeof d.mineMax==="number")?d.mine+" of "+d.mineMax:"-";
  ui.prep.style.display=d.preparing?"block":"none";
  var items=d.items||[];
  var key=items.map(function(i){return i.at;}).join(",");
  if(key!==feedKey){
    feedKey=key;
    if(items.length){ui.latestText=clean(items[0].answer);ui.latest.textContent=ui.latestText;}
    else{ui.latestText="";ui.latest.textContent="No explanation yet. Raise your hand to ask a question.";}
    ui.feed.innerHTML="";
    if(!items.length)ui.feed.appendChild(h("p","ecr-sub","No questions yet.")).style.marginTop="12px";
    items.forEach(function(it){
      var q=h("div","ecr-q");q.appendChild(h("span","ecr-who","Student asked \u00b7 "+(it.by||"Student")));q.appendChild(document.createTextNode(it.question||""));
      var a=h("div","ecr-a");a.appendChild(h("span","ecr-who","AI Teacher"));a.appendChild(document.createTextNode(clean(it.answer)));
      ui.feed.appendChild(q);ui.feed.appendChild(a);
    });
  }
  /* your turn */
  var me=d.me||{status:"listening"};
  var why="";
  if(!isOpen)why="Class is closed.";
  else if(paused)why="The AI teacher is resting.";
  else if(d.mine>=d.mineMax)why="You have used all your questions.";
  else if(d.used>=d.max)why="The class has used all its answers.";
  ui.raise.style.display=me.status==="listening"?"flex":"none";
  ui.raise.disabled=!!why||busy;
  ui.lower.style.display=me.status==="hand"?"flex":"none";
  ui.askBox.style.display=me.status==="speaking"?"block":"none";
  if(me.status==="hand"){
    ui.turnH.textContent="Your hand is raised";
    ui.mine.textContent="You are number "+me.position+" in line";ui.mine.style.display="block";
    ui.hint.textContent="Please wait. The AI Teacher will give you a turn.";
  }else if(me.status==="speaking"){
    ui.turnH.textContent="It's your turn!";
    ui.mine.style.display="block";
    ui.hint.textContent="";
  }else{
    ui.turnH.textContent="Your turn";
    ui.mine.textContent="";ui.mine.style.display="none";
    ui.hint.textContent=why||"Have a question about the lesson? Raise your hand to join the queue.";
  }
  /* roster */
  ui.speaker.textContent=d.speaker?("Now speaking: "+d.speaker):"Nobody is speaking.";
  ui.roster.innerHTML="";
  var all=d.roster||[],shown=all;
  if(!rosterOpen&&all.length>ROSTER_SHOW){
    shown=all.slice(0,ROSTER_SHOW);
    all.slice(ROSTER_SHOW).forEach(function(r){if(r.me)shown.push(r);});
  }
  shown.forEach(function(r){
    var row=h("div","ecr-r"+(r.status==="speaking"?" now":""));
    row.appendChild(h("span","ecr-dot "+(LABEL[r.status]?r.status:"disconnected")));
    row.appendChild(h("span","nm",(r.name||"Student")+(r.me?" (you)":"")));
    row.appendChild(h("span","st",LABEL[r.status]||""));
    ui.roster.appendChild(row);
  });
  ui.more.style.display=all.length>ROSTER_SHOW?"flex":"none";
  ui.more.textContent=rosterOpen?"View Less":"View All Students";
  ticker();
}

function ticker(){
  if(!last||!alive())return;
  var el1=(Date.now()-lastAt)/1000;
  var endMs=last.endsAt?new Date(last.endsAt).getTime():NaN;
  if(isFinite(endMs)){
    var left=(endMs-Date.now())/1000;
    ui.timeBox.style.display="block";
    ui.time.textContent=left>0?secs(left):"Class time is over.";
  }else ui.timeBox.style.display="none";
  var me=last.me||{};
  if(me.status==="speaking"){ui.mine.textContent="Time left: "+secs((me.secondsLeft||0)-el1);}
}

/* ---------- actions ---------- */
function act(name){
  ui.msg.className="ecr-msg";ui.msg.textContent="";
  ui.raise.disabled=true;ui.lower.disabled=true;ui.done.disabled=true;
  post(url(name),{}).then(function(d){
    if(!alive())return;
    ui.raise.disabled=false;ui.lower.disabled=false;ui.done.disabled=false;
    if(d&&d.ok===true){if(name==="lower")ui.q.value="";}
    else{ui.msg.className="ecr-msg err";ui.msg.textContent=(d&&d.error)||"Something went wrong.";}
    pollNow();
  });
}
function askNow(){
  if(busy)return;
  var t=ui.q.value.trim();ui.msg.className="ecr-msg err";ui.msg.textContent="";
  if(t.length<5){ui.msg.textContent="Write a longer question.";return;}
  busy=true;ui.ask.disabled=true;ui.ask.textContent="Sending...";
  post(url("ask"),{requestId:rid(),question:t}).then(function(d){
    busy=false;
    if(!alive())return;
    ui.ask.textContent="Ask the AI Teacher";ui.ask.disabled=!ui.q.value.trim();
    if(d&&d.ok){ui.q.value="";ui.ask.disabled=true;ui.msg.className="ecr-msg ok";ui.msg.textContent="Answer added.";}
    else{ui.msg.className="ecr-msg err";ui.msg.textContent=(d&&d.error)||"Something went wrong.";}
    pollNow(function(){if(d&&d.ok){try{ui.c4.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}}});
  });
}

/* ---------- polling: every 4 seconds, never overlapping ---------- */
function pollNow(done){
  post(url("poll"),{}).then(function(d){
    if(!alive())return;
    if(d&&d.ok){last=d;lastAt=Date.now();render(d);}
    else if(d&&d.error){ui.status.textContent=d.error;}
    if(typeof done==="function")done();
  });
}
function start(){
  var g=gen;
  if(tick)clearInterval(tick);
  tick=setInterval(ticker,1000);
  (function loop(){
    if(g!==gen)return;
    if(!alive()){stop();return;}
    if(document.hidden){timer=setTimeout(loop,4000);return;}
    post(url("poll"),{}).then(function(d){
      if(g!==gen)return;
      if(!alive()){stop();return;}
      var ok=!!(d&&d.ok);
      if(ok){last=d;lastAt=Date.now();render(d);}
      else{
        ui.dot.className="ecr-dot conn";
        ui.status.textContent=(d&&d.error)||"Connection problem. Trying again...";
        if(d&&(d.reason==="closed"||d.reason==="no_session"||d.reason==="not_on_roster"))ui.again.style.display="flex";
      }
      timer=setTimeout(loop,ok?4000:8000);
    });
  })();
}
window.EduClassroom={open:openScreen,stop:stop};
})();
