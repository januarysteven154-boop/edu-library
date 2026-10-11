/* Edu Library: AI Examination Room (student screen) v1.4
   v1.4: clearer path Level > Class > Subject > list of PAPERS (each shows its number of questions) > the paper. On a paper the student can first \"Read the whole paper\" (all questions and pictures, nothing marked), then \"Start answering\". During the quiz a \"Read all\" button opens the same reading screen and returns to the same question. \"Mixed practice\" keeps the old random-questions choice.
   Loaded on demand from index.html when a student opens #/room.
   v1.3: a play / pause button on the AI teacher's explanation reads it aloud (same voice engine as Edu AI chat).
   v1.2: the AI teacher's explanation shows real bold text (the ** marks are turned into bold).
   v1.1: papers come from server C (and D when C is full) through the backend, are saved on the phone
   (so practice works again offline), and questions can show a diagram picture. Options are shuffled every time,
   marking compares with the saved key, percentage + our own band, saved on the phone. */
(function(){
"use strict";
if(window.EduRoom)return;
var API="https://edu-ai-backend-three.vercel.app/api/book-link?room=";
var SPK=100000; /* read-aloud key = SPK + question number */
var HK="edu_room_hist",RK="edu_room_rep",IK="edu_room_idx",PK="edu_room_p_",PL="edu_room_plist";
var APP=null;
var S={screen:"setup",lv:"",cls:"",sub:"",paper:"",mix:"",rd:[],back:"paper",cat:null,papers:[],qs:[],i:0,sel:[],res:null,busy:false,err:"",exp:{}};

function e(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
/* safe text with **bold** turned into bold (text is escaped first, so nothing else can become HTML) */
function fmt(s){return e(s).replace(/\*\*([^*\n][^*]*?)\*\*/g,"<b>$1</b>");}
function stopSpeak(){try{if(typeof window.ttsStop==="function")window.ttsStop();}catch(x){}}
/* play / pause button (round, top right of the explanation) */
function spkBtn(i){
  if(!("speechSynthesis" in window)||typeof window.speakText!=="function")return "";
  var on=(typeof window.ttsOn==="function")&&window.ttsOn(SPK+i);
  var ic=(typeof window.ttsIcon==="function")?window.ttsIcon(SPK+i):"";
  return "<button type='button' class='speak-btn"+(on?" on":"")+"' data-i='"+(SPK+i)+"' title='"+(on?"Pause":"Play")+"' aria-label='"+(on?"Pause":"Play")+"' onclick='EduRoom.speak("+i+")'>"+ic+"</button>";
}
function expHtml(i){return fmt(S.exp[i])+spkBtn(i);}
async function api(action,payload,extra){
  var r=await fetch(API+action+(extra||""),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload||{})});
  var j=null;try{j=await r.json();}catch(x){}
  if(!r.ok)throw new Error((j&&j.error)||("Server answered "+r.status));
  return j;
}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function band(p){return p>=80?"Excellent":p>=65?"Very good":p>=50?"Good":p>=40?"Fair":"Keep practising";}
function letter(i){return "ABCD".charAt(i);}
function lvLabel(l){return (typeof LEVELS!=="undefined"&&LEVELS[l])?LEVELS[l].label:(l==="?"?"Other":l);}
function lvOrder(){return (typeof LEVELS!=="undefined")?Object.keys(LEVELS):["Primary","Secondary","Tertiary"];}
function readJSON(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(x){return d;}}
function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(x){}}
function sum(o){var n=0;for(var k in o){n+=(typeof o[k]==="number")?o[k]:sum(o[k]);}return n;}

/* ---------- styles (added once) ---------- */
function css(){
  if(document.getElementById("rmCss"))return;
  var s=document.createElement("style");s.id="rmCss";
  s.textContent=
".rm{max-width:720px;margin:0 auto;padding:4px 2px 96px}"+
".rm h3{margin:16px 0 8px;font-size:16px;color:var(--ink)}"+
".rm p.n{font-size:13px;color:var(--sub);margin:6px 0 10px}"+
".rm .opt{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:14px;margin:0 0 8px;background:rgba(127,127,127,.12);color:var(--ink);font-size:15px;font-weight:600}"+
".rm .opt b{flex:none;background:rgba(127,127,127,.28);border-radius:12px;padding:2px 10px;font-size:13px}"+
".rm .crumbs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}"+
".rm .crumb{border:none;background:#1C6FA6;color:#fff;border-radius:16px;padding:6px 11px;font-size:12.5px;font-weight:700}"+
".rm .top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--sub);margin:4px 0 6px}"+
".rm .top button,.rm .sec{border:1px solid var(--line);background:rgba(127,127,127,.12);color:var(--ink);border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700}"+
".rm .bar{height:6px;border-radius:4px;background:rgba(127,127,127,.25);overflow:hidden;margin:0 0 14px}"+
".rm .bar i{display:block;height:100%;background:#2FA36B}"+
".rm .q{font-size:17px;line-height:1.5;font-weight:700;color:var(--ink);margin:0 0 14px;white-space:pre-wrap;word-wrap:break-word}"+
".rm .ch{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:1.5px solid var(--line);border-radius:12px;padding:12px;margin:0 0 9px;background:rgba(127,127,127,.12);color:var(--ink);font-size:15px;line-height:1.4}"+
".rm .ch b{flex:none;width:26px;height:26px;border-radius:50%;background:rgba(127,127,127,.3);display:flex;align-items:center;justify-content:center;font-size:13px}"+
".rm .ch span{flex:1;min-width:0;word-wrap:break-word}"+
".rm .ch.sel{border-color:#3B8FD4;background:rgba(59,143,212,.22)}"+
".rm .ch.sel b{background:#3B8FD4;color:#fff}"+
".rm .ch.ok{border-color:#2FA36B;background:rgba(47,163,107,.22)}"+
".rm .ch.ok b{background:#2FA36B;color:#fff}"+
".rm .ch.bad{border-color:#D9534F;background:rgba(217,83,79,.2)}"+
".rm .ch.bad b{background:#D9534F;color:#fff}"+
".rm .nav{display:flex;gap:10px;margin:14px 0}"+
".rm .go{flex:1;border:none;border-radius:12px;padding:14px;background:#2FA36B;color:#fff;font-size:15px;font-weight:800}"+
".rm .go[disabled]{opacity:.45}"+
".rm .sec{flex:1;padding:14px;font-size:15px}"+
".rm .score{text-align:center;padding:18px 8px}"+
".rm .score .pc{font-size:54px;font-weight:900;color:var(--ink);line-height:1}"+
".rm .score .bd{font-size:18px;font-weight:800;color:#2FA36B;margin:6px 0}"+
".rm .score small{display:block;color:var(--sub);font-size:13px;margin-top:4px}"+
".rm .card{border:1px solid var(--line);border-radius:14px;padding:12px;margin:0 0 12px;background:rgba(127,127,127,.08)}"+
".rm .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}"+
".rm .acts button{flex:1;min-width:130px;border:1px solid var(--line);background:rgba(127,127,127,.15);color:var(--ink);border-radius:10px;padding:9px 10px;font-size:13px;font-weight:700}"+
".rm .ex{margin-top:8px;font-size:14px;line-height:1.5;color:var(--ink);white-space:pre-wrap;word-wrap:break-word}"+
".rm .ex b{font-weight:800}"+
".rm .ex.has{position:relative;padding-right:44px;min-height:38px}"+
".rm .hist{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--ink);border-bottom:1px solid var(--line);padding:7px 0}"+
".rm .hist span{color:var(--sub)}"+
".rm .lbl{font-size:12px;color:var(--sub);text-align:center;margin:12px 0}"+
".rm .qimg{display:block;max-width:100%;max-height:340px;margin:10px auto;border-radius:10px;background:#fff;border:1px solid var(--line)}"+
".rm .opt b{white-space:nowrap}"+
".rm .opt span small{display:block;font-weight:500;font-size:12px;color:var(--sub);margin-top:2px}"+
".rm .tb{display:flex;gap:6px}"+
".rm .rdo{margin:0 0 6px;padding-left:4px;font-size:14.5px;line-height:1.4;color:var(--ink);word-wrap:break-word}"+
".rmzoom{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:10px}"+
".rmzoom img{max-width:100%;max-height:100%;background:#fff;border-radius:8px}";
  document.head.appendChild(s);
}

/* ---------- loading the list of papers that have questions ---------- */
async function loadCat(){
  var idx=null;
  try{idx=await api("index",{});writeJSON(IK,idx);}
  catch(x){idx=readJSON(IK,null);if(!idx)throw x;}
  S.papers=(idx&&idx.papers)||[];
  var c={};
  S.papers.forEach(function(p){
    var l=p.level||"?",k=p.class||"?",su=p.subject||"General";
    if(!c[l])c[l]={};if(!c[l][k])c[l][k]={};
    c[l][k][su]=(c[l][k][su]||0)+(p.count||0);
  });
  S.cat=c;
}
/* a paper is kept on the phone; papers with pictures are fetched again after 5 hours (picture links expire) */
function cacheSet(id,obj){
  var list=readJSON(PL,[]).filter(function(x){return x!==id;});list.push(id);
  while(list.length>30){try{localStorage.removeItem(PK+list.shift());}catch(x){}}
  try{localStorage.setItem(PK+id,JSON.stringify(obj));}
  catch(x){list.forEach(function(k){if(k!==id){try{localStorage.removeItem(PK+k);}catch(y){}}});list=[id];try{localStorage.setItem(PK+id,JSON.stringify(obj));}catch(y){}}
  writeJSON(PL,list);
}
async function loadPaper(p){
  var c=readJSON(PK+p.id,null);
  if(c&&c.updated===p.updated&&c.data){
    var hasImg=(c.data.questions||[]).some(function(q){return q.img;});
    if(!hasImg||Date.now()-(c.at||0)<5*3600*1000)return c.data;
  }
  try{
    var d=await api("paper",{},"&id="+encodeURIComponent(p.id));
    cacheSet(p.id,{updated:p.updated,at:Date.now(),data:d});
    return d;
  }catch(x){
    if(c&&c.data)return c.data;
    throw x;
  }
}

/* ---------- screens ---------- */
function pkey(p){return [p.level||"?",p.class||"?",p.subject||"General"];}
function papersFor(l,k,su){return S.papers.filter(function(p){var a=pkey(p);return a[0]===l&&(k==null||a[1]===k)&&(su==null||a[2]===su);});}
function stat(ps){var q=0;ps.forEach(function(p){q+=p.count||0;});return ps.length+(ps.length===1?" paper \u00B7 ":" papers \u00B7 ")+q+" questions";}
function ptitle(p){return (p&&(p.title||p.name))||"Paper";}
function papersNow(){if(S.paper)return S.papers.filter(function(p){return p.id===S.paper.id;});return papersFor(S.lv,S.cls,S.sub);}
function crumb(k,label){return "<button type='button' class='crumb' onclick=\"EduRoom.pick('"+k+"','')\">"+e(label)+" \u2715</button>";}
function opt(k,v,label,n){return "<button type='button' class='opt' data-k='"+k+"' data-v=\""+e(v)+"\" onclick=\"EduRoom.pick(this.dataset.k,this.dataset.v)\"><span>"+label+"</span><b>"+n+"</b></button>";}

function setupHtml(){
  var h="<p class='n'>Practise with multiple-choice questions taken from past papers. Choose what you want to practise.</p>";
  var cr=[];
  if(S.lv)cr.push(crumb("lv",lvLabel(S.lv)));
  if(S.cls)cr.push(crumb("cls",S.cls));
  if(S.sub)cr.push(crumb("sub",S.sub));
  if(S.paper)cr.push(crumb("paper",ptitle(S.paper)));
  else if(S.mix)cr.push(crumb("mix","Mixed practice"));
  if(cr.length)h+="<div class='crumbs'>"+cr.join("")+"</div>";
  var cat=S.cat||{};
  if(!Object.keys(cat).length){
    return h+"<div class='empty'>No practice questions are ready yet. Please check again soon.</div>";
  }
  if(!S.lv){
    h+="<h3>Which level?</h3>";
    var ks=lvOrder().concat(["?"]).filter(function(k){return cat[k];});
    ks.forEach(function(k){h+=opt("lv",k,e(lvLabel(k)),stat(papersFor(k)));});
  }else if(!S.cls){
    h+="<h3>Which class?</h3>";
    var cl=cat[S.lv]||{},first=((typeof LEVELS!=="undefined"&&LEVELS[S.lv])?LEVELS[S.lv].classes:[]).filter(function(k){return cl[k];});
    var rest2=Object.keys(cl).filter(function(k){return first.indexOf(k)<0;}).sort();
    first.concat(rest2).forEach(function(k){h+=opt("cls",k,e(k),stat(papersFor(S.lv,k)));});
  }else if(!S.sub){
    h+="<h3>Which subject?</h3>";
    var sj=(cat[S.lv]||{})[S.cls]||{};
    Object.keys(sj).sort().forEach(function(k){h+=opt("sub",k,e(k),stat(papersFor(S.lv,S.cls,k)));});
  }else if(S.paper){
    h+=paperHtml();
  }else if(!S.mix){
    var pl=papersFor(S.lv,S.cls,S.sub).sort(function(a,b){return (Number(b.year)||0)-(Number(a.year)||0)||String(ptitle(a)).localeCompare(String(ptitle(b)));});
    h+="<h3>Choose a paper</h3><p class='n'>Open a paper to read all its questions first, then start answering.</p>";
    pl.forEach(function(p){h+=opt("paper",p.id,e(ptitle(p))+(p.year?"<small>"+e(p.year)+"</small>":""),(p.count||0)+" questions");});
    if(pl.length>1)h+=opt("mix","1","Mixed practice<small>Random questions from all these papers</small>",stat(pl).split(" \u00B7 ")[1]);
  }else{
    var total=0;papersFor(S.lv,S.cls,S.sub).forEach(function(p){total+=p.count||0;});
    h+="<h3>How many questions?</h3>";
    [10,20,40].filter(function(x){return x<total;}).forEach(function(x){h+=opt("count",String(x),x+" questions",x);});
    var all=Math.min(total,60);
    h+=opt("count",String(all),"All ("+all+")",all);
    if(S.err)h+="<p class='n' style='color:#D9534F'>"+e(S.err)+"</p>";
    if(S.busy)h+="<p class='n'>Loading questions...</p>";
  }
  var hist=readJSON(HK,[]).slice(0,5);
  if(!S.lv&&hist.length){
    h+="<h3>Your recent results</h3>"+hist.map(function(x){
      return "<div class='hist'><div>"+e(x.sub)+" <span>"+e(x.cls)+"</span></div><div>"+x.pct+"% <span>"+e(x.band)+"</span></div></div>";
    }).join("");
  }
  return h+"<div class='lbl'>AI-marked practice. Not an official exam result.</div>";
}

function paperHtml(){
  var p=S.paper,h="<h3>"+e(ptitle(p))+"</h3><p class='n'>"+(p.count||0)+" questions"+(p.year?" \u00B7 "+e(p.year):"")+". Tip: read all the questions first, then start answering.</p>";
  h+="<div class='nav'><button type='button' class='sec' onclick='EduRoom.read()'>Read the whole paper first</button></div>";
  h+="<div class='nav'><button type='button' class='go' onclick='EduRoom.start()'>Start answering</button></div>";
  if(S.err)h+="<p class='n' style='color:#D9534F'>"+e(S.err)+"</p>";
  if(S.busy)h+="<p class='n'>Loading questions...</p>";
  return h;
}
function readHtml(){
  var fromQuiz=S.back==="quiz";
  var btn=fromQuiz?"<div class='nav'><button type='button' class='go' onclick='EduRoom.unread()'>Back to question "+(S.i+1)+"</button></div>":"<div class='nav'><button type='button' class='go' onclick='EduRoom.start()'>Start answering</button></div>";
  var h="<div class='top'><span>Reading all "+S.rd.length+" questions</span><button type='button' onclick='EduRoom.unread()'>Back</button></div>"+
    "<p class='n'>Nothing is marked here. Read everything, then "+(fromQuiz?"go back to your question.":"start answering.")+"</p>"+btn;
  S.rd.forEach(function(q,i){
    h+="<div class='card'><div class='q' style='font-size:15px'>"+(i+1)+". "+e(q.q)+"</div>"+imgHtml(q)+q.o.map(function(o){return "<div class='rdo'>\u2022 "+e(o)+"</div>";}).join("")+"</div>";
  });
  return h+btn;
}
function imgHtml(q){return q.img?"<img class='qimg' alt='Diagram or table for this question' src=\""+e(q.img)+"\" onclick='EduRoom.zoom(this.src)'>":"";}
function quizHtml(){
  var n=S.qs.length,q=S.qs[S.i],sel=S.sel[S.i];
  var h="<div class='top'><span>Question "+(S.i+1)+" of "+n+"</span><span class='tb'><button type='button' onclick='EduRoom.read()'>Read all</button><button type='button' onclick='EduRoom.quit()'>Quit</button></span></div>"+
    "<div class='bar'><i style='width:"+Math.round((S.i/n)*100)+"%'></i></div>"+
    "<div class='q'>"+e(q.q)+"</div>"+imgHtml(q);
  q.opts.forEach(function(o,k){
    h+="<button type='button' class='ch"+(sel===k?" sel":"")+"' onclick='EduRoom.choose("+k+")'><b>"+letter(k)+"</b><span>"+e(o)+"</span></button>";
  });
  h+="<div class='nav'>"+(S.i>0?"<button type='button' class='sec' onclick='EduRoom.step(-1)'>Previous</button>":"")+
    "<button type='button' class='go' "+(sel<0?"disabled":"")+" onclick='EduRoom.step(1)'>"+(S.i===n-1?"Finish":"Next")+"</button></div>";
  return h+"<div class='lbl'>AI-marked practice. Not an official exam result.</div>";
}

function resultHtml(){
  var r=S.res;
  return "<div class='score'><div class='pc'>"+r.pct+"%</div><div class='bd'>"+e(r.band)+"</div>"+
    "<div>"+r.c+" of "+r.n+" correct</div><small>"+e(S.sub)+" \u00B7 "+e(S.cls)+"</small></div>"+
    "<div class='nav'><button type='button' class='go' onclick='EduRoom.review()'>Review answers</button></div>"+
    "<div class='nav'><button type='button' class='sec' onclick='EduRoom.again()'>Try again (new order)</button><button type='button' class='sec' onclick='EduRoom.home()'>Choose another</button></div>"+
    "<div class='lbl'>AI-marked practice. The questions come from past papers, read by AI and checked by two AIs. This is not an official MANEB or school result. Your score is saved on this phone only.</div>";
}

function reviewHtml(){
  var h="<div class='top'><span>Review: "+S.res.pct+"% \u00B7 "+S.res.c+" of "+S.res.n+"</span><button type='button' onclick='EduRoom.result()'>Back</button></div>";
  S.qs.forEach(function(q,i){
    var sel=S.sel[i];
    h+="<div class='card'><div class='q' style='font-size:15px'>"+(i+1)+". "+e(q.q)+"</div>"+imgHtml(q);
    q.opts.forEach(function(o,k){
      var cls=k===q.ci?" ok":(k===sel?" bad":"");
      h+="<div class='ch"+cls+"'><b>"+letter(k)+"</b><span>"+e(o)+"</span></div>";
    });
    h+="<div class='n'>"+(sel<0?"You did not answer. ":(sel===q.ci?"Correct. ":"You chose "+letter(sel)+". "))+"The saved answer is "+letter(q.ci)+".</div>"+
      "<div class='acts'><button type='button' onclick='EduRoom.explain("+i+")'>Explain with AI teacher</button><button type='button' id='rmrep"+i+"' onclick='EduRoom.report("+i+")'>Report a wrong answer</button></div>"+
      "<div class='ex"+((S.exp[i]&&S.exp[i]!=="Thinking...")?" has":"")+"' id='rmex"+i+"'>"+((S.exp[i]&&S.exp[i]!=="Thinking...")?expHtml(i):(S.exp[i]?e(S.exp[i]):""))+"</div></div>";
  });
  return h+"<div class='nav'><button type='button' class='go' onclick='EduRoom.home()'>Done</button></div>";
}

function draw(){
  if(!APP)return;
  var h="";
  if(S.screen==="quiz")h=quizHtml();
  else if(S.screen==="result")h=resultHtml();
  else if(S.screen==="review")h=reviewHtml();
  else if(S.screen==="read")h=readHtml();
  else h=setupHtml();
  APP.innerHTML="<div class='rm'>"+h+"</div>";
  try{window.scrollTo(0,0);}catch(x){}
}

/* ---------- actions ---------- */
async function collect(ps){
  var out=[];
  for(var pi=0;pi<ps.length;pi++){
    var pd=await loadPaper(ps[pi]);
    (pd.questions||[]).forEach(function(x){
      var o=x.options,ci=x.correct;
      if(!Array.isArray(o)||o.length!==4||typeof ci!=="number"||ci<0||ci>3)return;
      if(!x.q||o.some(function(t){return typeof t!=="string"||!t.trim();}))return;
      out.push({id:x.id,pid:pd.id,img:x.img||"",q:x.q,o:o.slice(),ci:ci});
    });
  }
  return out;
}
async function begin(count){
  if(S.busy)return;
  stopSpeak();
  S.busy=true;S.err="";draw();
  try{
    var raw=await collect(papersNow());
    if(!raw.length)throw new Error("No questions found for this choice.");
    var good=raw.map(function(r){var order=shuffle([0,1,2,3]);return {id:r.id,pid:r.pid,img:r.img,q:r.q,opts:order.map(function(k){return r.o[k];}),ci:order.indexOf(r.ci)};});
    S.qs=S.paper?good:shuffle(good).slice(0,Math.max(1,count));
    S.sel=S.qs.map(function(){return -1;});
    S.i=0;S.res=null;S.exp={};S.screen="quiz";
  }catch(x){
    S.err="Could not load the questions. Check your internet and try again. ("+(x&&x.message||x)+")";
  }
  S.busy=false;draw();
}
function finish(){
  var c=0;S.qs.forEach(function(q,i){if(S.sel[i]===q.ci)c++;});
  var n=S.qs.length,pct=Math.round(c/n*100);
  S.res={c:c,n:n,pct:pct,band:band(pct)};
  var h=readJSON(HK,[]);
  h.unshift({t:Date.now(),lv:S.lv,cls:S.cls,sub:S.sub,c:c,n:n,pct:pct,band:S.res.band});
  writeJSON(HK,h.slice(0,20));
  S.screen="result";draw();
}
async function explain(i){
  var q=S.qs[i],box=document.getElementById("rmex"+i);
  if(!box)return;
  if(S.exp[i]&&S.exp[i]!=="Thinking..."){return;}
  S.exp[i]="Thinking...";box.textContent="Thinking...";
  var sel=S.sel[i];
  var prompt="A student is reviewing a multiple-choice question from a past paper. The saved marking key says the correct answer is "+letter(q.ci)+". "+
    "Explain simply and briefly why "+letter(q.ci)+" is correct"+(sel>=0&&sel!==q.ci?" and why "+letter(sel)+" is not":"")+". Do not change the key.\n\nQuestion: "+q.q+"\n"+
    q.opts.map(function(o,k){return letter(k)+") "+o;}).join("\n")+"\n\nStudent chose: "+(sel<0?"no answer":letter(sel))+".";
  try{
    var res=await fetch(getAIEndpoint(),{method:"POST",headers:await eduAuthHeaders(),body:JSON.stringify({messages:[{role:"user",content:prompt}],context:""})});
    if(res.status===401&&window.EduAcct){try{EduAcct.expired();}catch(x){}throw new Error("Please sign in again to use the AI teacher.");}
    var d=null;try{d=await res.json();}catch(x){}
    if(!res.ok)throw new Error("Server responded "+res.status);
    var t=d&&(d.reply||d.text||d.message||d.content||(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content));
    if(typeof t!=="string"||!t.trim())throw new Error("No answer came back.");
    S.exp[i]=t.trim();
  }catch(x){
    S.exp[i]="";
    box.textContent="Could not get an explanation: "+(x&&x.message||x);
    return;
  }
  var b2=document.getElementById("rmex"+i);if(b2){b2.className="ex has";b2.innerHTML=expHtml(i);}
}
async function report(i){
  var q=S.qs[i],btn=document.getElementById("rmrep"+i),rk=q.pid+":"+q.id;
  var done=readJSON(RK,[]);
  if(done.indexOf(rk)>-1){if(btn)btn.textContent="Already reported";return;}
  if(btn){btn.disabled=true;btn.textContent="Sending...";}
  try{
    await api("report",{id:q.pid,q:q.id});
    done.push(rk);writeJSON(RK,done.slice(-200));
    if(btn)btn.textContent="Reported. Thank you.";
  }catch(x){
    if(btn){btn.disabled=false;btn.textContent="Could not send. Try again";}
  }
}
function zoom(src){
  var d=document.createElement("div");d.className="rmzoom";
  d.innerHTML="<img alt='' src=\""+e(src)+"\">";
  d.onclick=function(){if(d.parentNode)d.parentNode.removeChild(d);};
  document.body.appendChild(d);
}

window.EduRoom={
  open:async function(app){
    APP=app;css();
    try{if(typeof setHeader==="function")setHeader("<h2>AI Examination Room</h2>");}catch(x){}
    try{if(typeof setActiveNav==="function")setActiveNav("room");}catch(x){}
    if(S.screen!=="setup"&&S.qs.length){draw();return;}
    if(S.screen==="read"&&S.rd.length){draw();return;}
    S.cat=null; /* always ask the server again, so newly saved papers show up */
    if(!S.cat){
      app.innerHTML="<div class='rm'><div class='empty'>Loading...</div></div>";
      try{await loadCat();}
      catch(x){
        app.innerHTML="<div class='rm'><div class='empty'>Could not load the practice papers. Check your internet.</div><div class='nav'><button type='button' class='go' onclick='EduRoom.retry()'>Try again</button></div></div>";
        return;
      }
    }
    draw();
  },
  retry:function(){S.cat=null;window.EduRoom.open(APP);},
  pick:function(k,v){
    if(k==="count"){begin(parseInt(v,10)||10);return;}
    if(k==="paper"&&v){S.paper=S.papers.filter(function(p){return p.id===v;})[0]||"";S.err="";draw();return;}
    S[k]=v;
    if(k==="lv"){S.cls="";S.sub="";S.paper="";S.mix="";}
    if(k==="cls"){S.sub="";S.paper="";S.mix="";}
    if(k==="sub"){S.paper="";S.mix="";}
    S.err="";draw();
  },
  start:function(){S.screen="setup";begin(9999);},
  read:async function(){
    if(S.busy)return;
    stopSpeak();
    if(S.screen==="quiz"){
      S.rd=S.qs.map(function(q){return {q:q.q,img:q.img,o:q.opts};});S.back="quiz";S.screen="read";draw();return;
    }
    S.busy=true;S.err="";draw();
    try{
      var raw=await collect(papersNow());
      if(!raw.length)throw new Error("No questions found for this choice.");
      S.rd=raw.map(function(r){return {q:r.q,img:r.img,o:r.o};});S.back="paper";S.screen="read";
    }catch(x){S.err="Could not load the questions. Check your internet and try again. ("+(x&&x.message||x)+")";}
    S.busy=false;draw();
  },
  unread:function(){S.screen=(S.back==="quiz"&&S.qs.length)?"quiz":"setup";draw();},
  choose:function(k){S.sel[S.i]=k;draw();},
  step:function(d){
    if(d>0){if(S.sel[S.i]<0)return;if(S.i===S.qs.length-1){finish();return;}}
    S.i=Math.max(0,Math.min(S.qs.length-1,S.i+d));draw();
  },
  quit:function(){if(confirm("Stop this practice? Your answers will not be saved."))window.EduRoom.home();},
  result:function(){stopSpeak();S.screen="result";draw();},
  review:function(){S.screen="review";draw();},
  again:function(){begin(S.qs.length);},
  home:function(){stopSpeak();S.screen="setup";S.qs=[];S.sel=[];S.res=null;S.exp={};S.lv="";S.cls="";S.sub="";S.paper="";S.mix="";S.rd=[];S.back="paper";S.err="";draw();},
  explain:explain,
  speak:function(i){if(S.exp[i]&&S.exp[i]!=="Thinking..."&&typeof window.speakText==="function")window.speakText(SPK+i,S.exp[i]);},
  report:report,
  zoom:zoom,
  version:"1.4",
  _t:{band:band,shuffle:shuffle,fmt:fmt,S:S}
};
})();
