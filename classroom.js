/* AI Classroom v1.0 - loaded on demand by index.html. Needs a signed-in student.
   Live class screen: AI teacher card, hand raising, turns, nicknames, shared answers. */
(function(){
var PACK={status:"NEEDS REVIEW",lessons:[
{title:"Fractions: add, subtract, multiply",steps:["To add or subtract fractions, the bottom numbers (denominators) must be the same. Find a common denominator first.","Change each fraction so it has that denominator, then add or subtract only the top numbers (numerators).","To multiply fractions, multiply the tops together and the bottoms together. Then simplify."],examples:[["2/3 + 1/6","2/3 = 4/6. So 4/6 + 1/6 = 5/6."],["3/4 - 1/3","Common denominator is 12. 9/12 - 4/12 = 5/12."],["2/5 x 3/4","6/20, which simplifies to 3/10."]],practice:["1/2 + 1/3","7/8 - 1/4","3/5 x 2/3"]},
{title:"Decimals: add, subtract, multiply",steps:["When you add or subtract decimals, line up the decimal points. Add zeros if it helps.","Work from the right, like normal numbers, and keep the decimal point in the same place in the answer.","To multiply decimals, multiply as whole numbers, then count the decimal places in both numbers together."],examples:[["3.45 + 2.7","3.45 + 2.70 = 6.15."],["5.2 - 1.75","5.20 - 1.75 = 3.45."],["0.4 x 0.3","4 x 3 = 12. There are 2 decimal places in total, so 0.12."]],practice:["12.5 + 4.75","10 - 3.6","0.5 x 0.6"]},
{title:"Percentages",steps:["Percent means out of 100. 25% means 25 out of 100.","To find a percentage of an amount, divide the amount by 100, then multiply by the percentage.","To change a fraction to a percentage, make the bottom 100, or multiply the fraction by 100."],examples:[["20% of MK 5000","5000 / 100 = 50. 50 x 20 = MK 1000."],["Write 3/4 as a percentage","3/4 x 100 = 75%."],["A shirt costs MK 2000 with 10% off. New price?","10% of 2000 = 200. 2000 - 200 = MK 1800."]],practice:["50% of MK 840","25% of 80","Write 0.35 as a percentage"]}
]};
var CARD="background:rgba(127,127,127,.16);border-radius:14px;padding:12px;margin-bottom:12px";
var RED="#e0455a",GREEN="#5ec27a",ORANGE="#e0a03a",GREY="#8a8a8a";
var timer=null,tick=null,gen=0,busy=false,sid="",ui={},last=null,lastAt=0,feedKey="";
function base(){try{return aiBase();}catch(e){return "https://edu-ai-backend-three.vercel.app/api";}}
function el(tag,txt,st){var e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(st)e.style.cssText=st;return e;}
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
function url(act){return "/book-link?classroom="+act+"&session="+encodeURIComponent(sid);}
function alive(){return ui.status&&document.body.contains(ui.status);}

/* ---------- open / join ---------- */
function open(app){
  stop();ui={};feedKey="";last=null;
  try{setActiveNav("settings");}catch(e){}
  try{setHeader('<button class="back" onclick="location.hash=\'#/settings\'">\u2190</button><h2>AI Classroom</h2>');}catch(e){}
  app.innerHTML="";
  var box=el("div",null,"padding:14px");app.appendChild(box);
  if(!(window.EduAcct&&window.EduAcct.isIn&&window.EduAcct.isIn())){
    box.appendChild(el("p","Please sign in with your student account first (tap the account icon at the top), then open the Classroom again."));return;}
  var card=el("div",null,CARD);
  var inp=el("input");inp.placeholder="Class code";inp.autocomplete="off";inp.value=sid;
  inp.style.cssText="width:100%;box-sizing:border-box;font-size:16px;padding:10px;margin-bottom:8px";
  var go=el("button","Join class","width:100%;font-size:16px;padding:10px");
  var err=el("div",null,"color:"+RED+";margin-top:6px");
  card.appendChild(inp);card.appendChild(go);card.appendChild(err);box.appendChild(card);
  var cls=el("div");box.appendChild(cls);
  go.onclick=function(){
    err.textContent="";sid=inp.value.trim();
    if(sid.length<10){err.textContent="Paste the class code.";return;}
    go.disabled=true;
    post(url("poll"),{}).then(function(d){
      go.disabled=false;
      if(!d||!d.ok){err.textContent=(d&&d.error)||"Could not join.";return;}
      card.style.display="none";build(cls);last=d;lastAt=Date.now();render(d);start();
    });
  };
}

/* ---------- screen ---------- */
function build(cls){
  cls.innerHTML="";
  /* AI teacher card */
  var c1=el("div",null,CARD);
  var top=el("div",null,"display:flex;align-items:center;gap:12px");
  var pic=el("div",null,"flex:0 0 64px;height:64px");
  pic.innerHTML='<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="31" fill="#2f6fd6"/><circle cx="32" cy="29" r="11" fill="#f2c9a0"/><path d="M12 62c2-14 12-20 20-20s18 6 20 20z" fill="#fff"/><path d="M18 21l14-8 14 8-14 8z" fill="#222"/><rect x="45" y="21" width="2" height="9" fill="#222"/></svg>';
  var tx=el("div",null,"flex:1;min-width:0");
  tx.appendChild(el("b","AI Teacher","font-size:18px"));
  tx.appendChild(el("div","Standard 7 Mathematics","font-size:13px;opacity:.85"));
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
  cls.appendChild(c1);

  /* my turn */
  var c2=el("div",null,CARD);
  c2.appendChild(el("b","Your turn"));
  ui.mine=el("div",null,"margin:6px 0;font-size:14px");c2.appendChild(ui.mine);
  ui.raise=el("button","Raise hand","width:100%;font-size:16px;padding:10px;margin-top:4px");
  ui.lower=el("button","Lower hand","width:100%;font-size:16px;padding:10px;margin-top:4px;display:none");
  ui.askBox=el("div",null,"display:none");
  ui.q=el("input");ui.q.maxLength=300;ui.q.placeholder="Your maths question";ui.q.autocomplete="off";
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

  /* lesson notes (kept from v0.4) */
  var c5=el("details",null,CARD);
  c5.appendChild(el("summary","Lesson notes ("+PACK.status+")","font-weight:bold"));
  var sel=el("select",null,"width:100%;font-size:16px;padding:8px;margin:8px 0");
  PACK.lessons.forEach(function(l,i){var o=el("option",l.title);o.value=i;sel.appendChild(o);});
  var ls=el("div",null,"white-space:pre-wrap;line-height:1.5");
  function show(){var l=PACK.lessons[sel.value],t="";l.steps.forEach(function(s,i){t+=(i+1)+". "+s+"\n";});t+="\nExamples:\n";l.examples.forEach(function(e){t+=e[0]+"  =>  "+e[1]+"\n";});t+="\nPractice:\n";l.practice.forEach(function(e){t+=e+"\n";});ls.textContent=t;}
  sel.onchange=show;show();
  var nm=el("div",null,"color:"+RED);
  c5.appendChild(sel);c5.appendChild(listenRow(function(){return ls.textContent;},nm));c5.appendChild(nm);c5.appendChild(ls);
  cls.appendChild(c5);
}

function secs(n){n=Math.max(0,Math.floor(n));var m=Math.floor(n/60),s=n%60;return m+":"+(s<10?"0":"")+s;}

function render(d){
  if(!alive())return;
  var open=d.open===true,paused=d.paused===true;
  ui.dot.style.background=!open?RED:(paused?ORANGE:GREEN);
  ui.status.textContent=!open?"Class is closed":(paused?"AI teacher is resting":"Live");
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
  if(!open)why="Class is closed.";
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
      else{ui.dot.style.background=GREY;ui.status.textContent=(d&&d.error)||"Connection problem. Trying again...";}
      timer=setTimeout(loop,ok?4000:8000);
    });
  })();
}
window.EduClassroom={open:open,stop:stop};
})();
