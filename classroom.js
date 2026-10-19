/* AI Classroom v2.0 - loaded on demand by index.html. Needs a signed-in student.
   Flow: choose level -> see the open class for that level -> Join -> live class screen
   (approved lesson, AI teacher card, hand raising, turns, shared answers). */
(function(){
var CARD="background:rgba(127,127,127,.16);border-radius:14px;padding:12px;margin-bottom:12px";
var RED="#e0455a",GREEN="#5ec27a",ORANGE="#e0a03a",GREY="#8a8a8a";
var LEVELS=[["standard1","Standard 1"],["standard2","Standard 2"],["standard3","Standard 3"],["standard4","Standard 4"],["standard5","Standard 5"],["standard6","Standard 6"],["standard7","Standard 7"],["standard8","Standard 8"],["form1","Form 1"],["form2","Form 2"],["form3","Form 3"],["form4","Form 4"]];
var timer=null,tick=null,gen=0,busy=false,sid="",ui={},last=null,lastAt=0,feedKey="",appRef=null;
function base(){try{return aiBase();}catch(e){return "https://edu-ai-backend-three.vercel.app/api";}}
function el(tag,txt,st){var e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(st)e.style.cssText=st;return e;}
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
function listenRow(getText,msgEl){
  var row=el("div",null,"display:flex;gap:8px;margin:8px 0");
  var b1=el("button","Listen","flex:1;font-size:16px;padding:10px");
  var b2=el("button","Stop","flex:1;font-size:16px;padding:10px");
  b1.onclick=function(){msgEl.textContent="";var t=getText();if(!t){msgEl.textContent="Nothing to read yet.";return;}if(!say(t))msgEl.textContent="Voice is not available on this phone.";};
  b2.onclick=hush;
  row.appendChild(b1);row.appendChild(b2);return row;
}
function stop(){gen++;hush();if(timer){clearTimeout(timer);timer=null;}if(tick){clearInterval(tick);tick=null;}}
function post(path,body){
  return window.EduAcct.token().then(function(tk){
    if(!tk)return {error:"Please sign in again."};
    var h=(typeof eduDeviceHeaders==="function")?eduDeviceHeaders():{"Content-Type":"application/json"};
    h.Authorization="Bearer "+tk;
    return fetch(base()+path,{method:"POST",headers:h,body:JSON.stringify(body||{})}).then(function(r){return r.json().catch(function(){return {error:"Bad reply"};});});
  }).catch(function(){return {error:"No connection. Please try again."};});
}
function plain(act){return "/book-link?classroom="+act;}
function url(act){return "/book-link?classroom="+act+"&session="+encodeURIComponent(sid);}
function alive(){return ui.status&&document.body.contains(ui.status);}
function inDoc(n){return n&&document.body.contains(n);}

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
  var c=el("div",null,CARD);
  if(!l){
    c.appendChild(el("b","Lesson"));
    c.appendChild(el("div","The lesson notes are not ready yet.","margin-top:6px"));
    return c;
  }
  c.appendChild(el("b",clean(l.title)||"Lesson","font-size:17px"));
  c.appendChild(el("div",l.label||"AI-prepared, not teacher-verified","font-size:12px;color:"+ORANGE+";margin:4px 0 8px"));
  var spoken=[clean(l.title),clean(l.text)];
  c.appendChild(el("div",clean(l.text),"white-space:pre-wrap;line-height:1.5"));
  var ex=Array.isArray(l.examples)?l.examples.map(function(e){return clean(oneLine(e));}).filter(Boolean):[];
  if(ex.length){
    c.appendChild(el("b","Examples","display:block;margin-top:12px"));
    ex.forEach(function(t){c.appendChild(el("div",t,"white-space:pre-wrap;line-height:1.5;margin-top:6px"));spoken.push(t);});
  }
  var pr=Array.isArray(l.practice)?l.practice:[];
  if(pr.length){
    c.appendChild(el("b","Practice","display:block;margin-top:12px"));
    pr.forEach(function(p){
      var q=clean(typeof p==="object"&&p?(p.question||p.q||oneLine(p)):oneLine(p));
      var a=clean(typeof p==="object"&&p?(p.answer||p.a||""):"");
      if(!q)return;
      var box=el("div",null,"margin-top:8px");
      box.appendChild(el("div",q,"white-space:pre-wrap;line-height:1.5"));
      if(a){
        var d=el("details");
        d.appendChild(el("summary","Show answer","cursor:pointer;opacity:.85"));
        d.appendChild(el("div",a,"white-space:pre-wrap;line-height:1.5;margin-top:4px"));
        box.appendChild(d);
      }
      c.appendChild(box);
      spoken.push(q);
    });
  }
  var lm=el("div",null,"color:"+RED);
  c.appendChild(listenRow(function(){return spoken.join(". ");},lm));c.appendChild(lm);
  return c;
}

/* ---------- start: choose level / find open class / join ---------- */
function openScreen(app){
  stop();ui={};feedKey="";last=null;sid="";appRef=app;
  try{setActiveNav("settings");}catch(e){}
  try{setHeader('<button class="back" onclick="location.hash=\'#/settings\'">\u2190</button><h2>AI Classroom</h2>');}catch(e){}
  app.innerHTML="";
  var box=el("div",null,"padding:14px");app.appendChild(box);
  if(!(window.EduAcct&&window.EduAcct.isIn&&window.EduAcct.isIn())){
    box.appendChild(el("p","Please sign in with your student account first (tap the account icon at the top), then open the Classroom again."));return;}
  loadOpen(box);
}
function loadOpen(box){
  box.innerHTML="";
  box.appendChild(el("p","Looking for your class..."));
  post(plain("open"),{}).then(function(d){
    if(!inDoc(box))return;
    box.innerHTML="";
    if(!d||d.ok!==true){showError(box,(d&&d.error)||"Could not load the classroom.");return;}
    if(!d.level){levelPicker(box,"");return;}
    if(d.open!==true){noClass(box,d.level);return;}
    sid=d.session;
    if(d.joined===true){enter(box,d);return;}
    joinCard(box,d);
  });
}
function showError(box,msg){
  var c=el("div",null,CARD);
  c.appendChild(el("div",msg,"color:"+RED+";margin-bottom:8px"));
  var b=el("button","Try again","width:100%;font-size:16px;padding:10px");
  b.onclick=function(){loadOpen(box);};
  c.appendChild(b);box.appendChild(c);
}
function levelPicker(box,current){
  var c=el("div",null,CARD);
  c.appendChild(el("b","Choose your class level","font-size:17px"));
  c.appendChild(el("div","You will see the class for this level.","font-size:13px;opacity:.85;margin:4px 0 8px"));
  var sel=el("select",null,"width:100%;font-size:16px;padding:10px;margin-bottom:8px");
  LEVELS.forEach(function(l){var o=el("option",l[1]);o.value=l[0];if(l[0]===current)o.selected=true;sel.appendChild(o);});
  var go=el("button","Save level","width:100%;font-size:16px;padding:10px");
  var err=el("div",null,"color:"+RED+";margin-top:6px");
  go.onclick=function(){
    err.textContent="";go.disabled=true;
    post(plain("setlevel"),{level:sel.value}).then(function(d){
      go.disabled=false;
      if(d&&d.ok===true){if(inDoc(box))loadOpen(box);}
      else err.textContent=(d&&d.error)||"Could not save your level.";
    });
  };
  c.appendChild(sel);c.appendChild(go);c.appendChild(err);box.appendChild(c);
}
function noClass(box,level){
  var c=el("div",null,CARD);
  c.appendChild(el("b","No class is open right now","font-size:17px"));
  c.appendChild(el("div","Your level: "+levelName(level)+". Come back when your teacher's class time starts.","margin:6px 0 10px;line-height:1.5"));
  var b1=el("button","Check again","width:100%;font-size:16px;padding:10px");
  var b2=el("button","Change level","width:100%;font-size:16px;padding:10px;margin-top:8px");
  b1.onclick=function(){loadOpen(box);};
  b2.onclick=function(){box.innerHTML="";levelPicker(box,level);};
  c.appendChild(b1);c.appendChild(b2);box.appendChild(c);
}
function joinCard(box,d){
  var c=el("div",null,CARD);
  c.appendChild(el("b","A class is open now","font-size:17px"));
  c.appendChild(el("div",clean(d.title||"")+" ("+levelName(d.level)+")","margin:6px 0"));
  var go=el("button","Join class","width:100%;font-size:16px;padding:10px");
  var err=el("div",null,"color:"+RED+";margin-top:6px");
  go.onclick=function(){
    err.textContent="";go.disabled=true;
    post(url("join"),{}).then(function(j){
      go.disabled=false;
      if(j&&j.ok===true){if(inDoc(box))enter(box,d);}
      else err.textContent=(j&&j.error)||"Could not join.";
    });
  };
  c.appendChild(go);c.appendChild(err);box.appendChild(c);
  box.appendChild(lessonCard(d.lesson));
  var b2=el("button","Change level","width:100%;font-size:16px;padding:10px");
  b2.onclick=function(){box.innerHTML="";levelPicker(box,d.level);};
  box.appendChild(b2);
}
function enter(box,d){
  box.innerHTML="";
  var cls=el("div");box.appendChild(cls);
  build(cls,d);
  start();
}

/* ---------- live class screen ---------- */
function build(cls,d){
  cls.innerHTML="";
  /* AI teacher card */
  var c1=el("div",null,CARD);
  var top=el("div",null,"display:flex;align-items:center;gap:12px");
  var pic=el("div",null,"flex:0 0 64px;height:64px");
  pic.innerHTML='<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="31" fill="#2f6fd6"/><circle cx="32" cy="29" r="11" fill="#f2c9a0"/><path d="M12 62c2-14 12-20 20-20s18 6 20 20z" fill="#fff"/><path d="M18 21l14-8 14 8-14 8z" fill="#222"/><rect x="45" y="21" width="2" height="9" fill="#222"/></svg>';
  var tx=el("div",null,"flex:1;min-width:0");
  tx.appendChild(el("b","AI Teacher","font-size:18px"));
  tx.appendChild(el("div",levelName(d.level),"font-size:13px;opacity:.85"));
  var live=el("div",null,"font-size:13px;margin-top:4px");
  var dot=el("span",null,"display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:"+GREY);
  var st=el("span","Connecting...");live.appendChild(dot);live.appendChild(st);tx.appendChild(live);
  top.appendChild(pic);top.appendChild(tx);c1.appendChild(top);
  ui.dot=dot;ui.status=st;
  ui.title=el("div",null,"font-size:13px;opacity:.85;margin-top:8px");c1.appendChild(ui.title);
  ui.time=el("div",null,"font-size:13px;opacity:.85");c1.appendChild(ui.time);
  ui.count=el("div",null,"font-size:13px;opacity:.85;margin-bottom:6px");c1.appendChild(ui.count);
  ui.prep=el("div","The AI teacher is preparing an answer...","display:none;color:"+ORANGE+";margin:6px 0");c1.appendChild(ui.prep);
  c1.appendChild(el("b","Latest explanation"));
  ui.latest=el("div",null,"white-space:pre-wrap;line-height:1.5;margin-top:6px");c1.appendChild(ui.latest);
  var lm=el("div",null,"color:"+RED);
  c1.appendChild(listenRow(function(){return ui.latestText||"";},lm));c1.appendChild(lm);
  ui.again=el("button","Check for the next class","display:none;width:100%;font-size:16px;padding:10px;margin-top:6px");
  ui.again.onclick=function(){openScreen(appRef);};
  c1.appendChild(ui.again);
  cls.appendChild(c1);

  /* approved lesson */
  cls.appendChild(lessonCard(d.lesson));

  /* my turn */
  var c2=el("div",null,CARD);
  c2.appendChild(el("b","Your turn"));
  ui.mine=el("div",null,"margin:6px 0;font-size:14px");c2.appendChild(ui.mine);
  ui.raise=el("button","Raise hand","width:100%;font-size:16px;padding:10px;margin-top:4px");
  ui.lower=el("button","Lower hand","width:100%;font-size:16px;padding:10px;margin-top:4px;display:none");
  ui.askBox=el("div",null,"display:none");
  ui.q=el("input");ui.q.maxLength=300;ui.q.placeholder="Your question about the lesson";ui.q.autocomplete="off";
  ui.q.style.cssText="width:100%;box-sizing:border-box;font-size:16px;padding:10px;margin:6px 0";
  ui.ask=el("button","Ask the AI teacher","width:100%;font-size:16px;padding:10px");
  ui.done=el("button","I am done","width:100%;font-size:16px;padding:10px;margin-top:6px");
  ui.askBox.appendChild(ui.q);ui.askBox.appendChild(ui.ask);ui.askBox.appendChild(ui.done);
  ui.msg=el("div",null,"margin-top:6px;color:"+RED);
  c2.appendChild(ui.raise);c2.appendChild(ui.lower);c2.appendChild(ui.askBox);c2.appendChild(ui.msg);
  cls.appendChild(c2);
  ui.raise.onclick=function(){act("raise");};
  ui.lower.onclick=function(){act("lower");};
  ui.done.onclick=function(){act("lower");};
  ui.ask.onclick=askNow;

  /* class list */
  var c3=el("div",null,CARD);
  c3.appendChild(el("b","Class"));
  ui.speaker=el("div",null,"margin:6px 0;font-size:14px");c3.appendChild(ui.speaker);
  ui.roster=el("div");c3.appendChild(ui.roster);
  cls.appendChild(c3);

  /* shared conversation */
  var c4=el("div",null,CARD);ui.c4=c4;
  c4.appendChild(el("b","Class conversation (newest first)"));
  ui.feed=el("div",null,"margin-top:8px");c4.appendChild(ui.feed);
  cls.appendChild(c4);
}

function secs(n){n=Math.max(0,Math.floor(n));var m=Math.floor(n/60),s=n%60;return m+":"+(s<10?"0":"")+s;}

function render(d){
  if(!alive())return;
  var isOpen=d.open===true,paused=d.paused===true;
  ui.dot.style.background=!isOpen?RED:(paused?ORANGE:GREEN);
  ui.status.textContent=!isOpen?"Class is closed":(paused?"AI teacher is resting":"Live");
  ui.again.style.display=isOpen?"none":"block";
  ui.title.textContent=d.title||"";
  ui.count.textContent="Class answers used: "+d.used+" of "+d.max+".  Your questions: "+d.mine+" of "+d.mineMax+".";
  ui.prep.style.display=d.preparing?"block":"none";
  var items=d.items||[];
  var key=items.map(function(i){return i.at;}).join(",");
  if(key!==feedKey){
    feedKey=key;
    if(items.length){
      var f=items[0];ui.latestText=clean(f.answer);ui.latest.textContent=ui.latestText;
    }else{ui.latestText="";ui.latest.textContent="No explanation yet. Raise your hand to ask a question.";}
    ui.feed.innerHTML="";
    if(!items.length)ui.feed.appendChild(el("div","No questions yet."));
    items.forEach(function(it){
      var b=el("div",null,"margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(127,127,127,.3)");
      b.appendChild(el("div",(it.by||"Student")+" asked:","font-weight:bold"));
      b.appendChild(el("div",it.question||"","margin-bottom:4px"));
      b.appendChild(el("div","AI Teacher:","font-weight:bold"));
      b.appendChild(el("div",clean(it.answer),"white-space:pre-wrap;line-height:1.5"));
      ui.feed.appendChild(b);
    });
  }
  /* my turn area */
  var me=d.me||{status:"listening"};
  var why="";
  if(!isOpen)why="Class is closed.";
  else if(paused)why="The AI teacher is resting.";
  else if(d.mine>=d.mineMax)why="You have used all your questions.";
  else if(d.used>=d.max)why="The class has used all its answers.";
  ui.raise.style.display=me.status==="listening"?"block":"none";
  ui.raise.disabled=!!why||busy;
  ui.lower.style.display=me.status==="hand"?"block":"none";
  ui.askBox.style.display=me.status==="speaking"?"block":"none";
  if(me.status==="listening"){ui.mine.textContent=why||"You are listening. Raise your hand to ask the AI teacher.";}
  else if(me.status==="hand"){ui.mine.textContent="Your hand is up. You are number "+me.position+" in line.";}
  else{ui.mine.textContent="It is your turn! Time left: "+secs(me.secondsLeft);}
  /* class list */
  ui.speaker.textContent=d.speaker?("Now speaking: "+d.speaker):"Nobody is speaking.";
  ui.roster.innerHTML="";
  var label={listening:"Listening",hand:"Hand raised",speaking:"Speaking",disconnected:"Disconnected"};
  var colour={listening:GREEN,hand:ORANGE,speaking:"#2f6fd6",disconnected:GREY};
  (d.roster||[]).forEach(function(r){
    var row=el("div",null,"display:flex;align-items:center;padding:5px 0");
    row.appendChild(el("span",null,"width:10px;height:10px;border-radius:50%;margin-right:8px;flex:0 0 10px;background:"+(colour[r.status]||GREY)));
    row.appendChild(el("span",r.name+(r.me?" (you)":""),"flex:1;min-width:0"));
    row.appendChild(el("span",label[r.status]||"","font-size:13px;opacity:.85"));
    ui.roster.appendChild(row);
  });
  ticker();
}

function ticker(){
  if(!last||!alive())return;
  var el1=(Date.now()-lastAt)/1000;
  if(last.endsAt){var left=(new Date(last.endsAt).getTime()-Date.now())/1000;ui.time.textContent=left>0?("Class time left: "+secs(left)):"Class time is over.";}
  var me=last.me||{};
  if(me.status==="speaking"){ui.mine.textContent="It is your turn! Time left: "+secs((me.secondsLeft||0)-el1);}
}

/* ---------- actions ---------- */
function act(name){
  ui.msg.style.color=RED;ui.msg.textContent="";
  ui.raise.disabled=true;ui.lower.disabled=true;ui.done.disabled=true;
  post(url(name),{}).then(function(d){
    ui.raise.disabled=false;ui.lower.disabled=false;ui.done.disabled=false;
    if(d&&d.ok===true){if(name==="lower")ui.q.value="";}
    else ui.msg.textContent=(d&&d.error)||"Something went wrong.";
    pollNow();
  });
}
function askNow(){
  if(busy)return;
  var t=ui.q.value.trim();ui.msg.style.color=RED;ui.msg.textContent="";
  if(t.length<5){ui.msg.textContent="Write a longer question.";return;}
  busy=true;ui.ask.disabled=true;ui.ask.textContent="Thinking...";
  post(url("ask"),{requestId:rid(),question:t}).then(function(d){
    busy=false;ui.ask.disabled=false;ui.ask.textContent="Ask the AI teacher";
    if(d&&d.ok){ui.q.value="";ui.msg.style.color=GREEN;ui.msg.textContent="Answer added.";}
    else{ui.msg.textContent=(d&&d.error)||"Something went wrong.";}
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
        ui.dot.style.background=GREY;
        ui.status.textContent=(d&&d.error)||"Connection problem. Trying again...";
        if(d&&(d.reason==="closed"||d.reason==="no_session"||d.reason==="not_on_roster"))ui.again.style.display="block";
      }
      timer=setTimeout(loop,ok?4000:8000);
    });
  })();
}
window.EduClassroom={open:openScreen,stop:stop};
})();
