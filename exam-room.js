/* Edu Library: AI Examination Room (student screen) v1.0
   Loaded on demand from index.html when a student opens #/room.
   Reads active questions from the exam_questions table (read-only), shuffles the options every time,
   marks by comparing with the saved key, shows percentage + our own band, saved on the phone. */
(function(){
"use strict";
if(window.EduRoom)return;
var SB="https://uozxdopexjbxjpatodpl.supabase.co";
var KEY="sb_publishable_7WBlnIk-CDi-nSiUT9JDBg_7iRT8j-V";
var HK="edu_room_hist",RK="edu_room_rep";
var APP=null;
var S={screen:"setup",lv:"",cls:"",sub:"",cat:null,qs:[],i:0,sel:[],res:null,busy:false,err:"",exp:{}};

function e(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function rest(path,o){
  o=o||{};
  var h={apikey:KEY,Authorization:"Bearer "+KEY};
  if(o.body)h["Content-Type"]="application/json";
  return fetch(SB+"/rest/v1/"+path,{method:o.method||"GET",headers:h,body:o.body});
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
".rm .hist{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--ink);border-bottom:1px solid var(--line);padding:7px 0}"+
".rm .hist span{color:var(--sub)}"+
".rm .lbl{font-size:12px;color:var(--sub);text-align:center;margin:12px 0}";
  document.head.appendChild(s);
}

/* ---------- loading the list of papers that have questions ---------- */
async function loadCat(){
  var r=await rest("exam_questions?select=level,class,subject&status=eq.active&limit=5000");
  if(!r.ok)throw new Error("Server answered "+r.status);
  var rows=await r.json(),c={};
  rows.forEach(function(x){
    var l=x.level||"?",k=x.class||"?",s=x.subject||"General";
    if(!c[l])c[l]={};if(!c[l][k])c[l][k]={};
    c[l][k][s]=(c[l][k][s]||0)+1;
  });
  S.cat=c;
}

/* ---------- screens ---------- */
function crumb(k,label){return "<button type='button' class='crumb' onclick=\"EduRoom.pick('"+k+"','')\">"+e(label)+" \u2715</button>";}
function opt(k,v,label,n){return "<button type='button' class='opt' data-k='"+k+"' data-v=\""+e(v)+"\" onclick=\"EduRoom.pick(this.dataset.k,this.dataset.v)\"><span>"+e(label)+"</span><b>"+n+"</b></button>";}

function setupHtml(){
  var h="<p class='n'>Practise with multiple-choice questions taken from past papers. Choose what you want to practise.</p>";
  var cr=[];
  if(S.lv)cr.push(crumb("lv",lvLabel(S.lv)));
  if(S.cls)cr.push(crumb("cls",S.cls));
  if(S.sub)cr.push(crumb("sub",S.sub));
  if(cr.length)h+="<div class='crumbs'>"+cr.join("")+"</div>";
  var cat=S.cat||{};
  if(!Object.keys(cat).length){
    return h+"<div class='empty'>No practice questions are ready yet. Please check again soon.</div>";
  }
  if(!S.lv){
    h+="<h3>Which level?</h3>";
    var ks=lvOrder().concat(["?"]).filter(function(k){return cat[k];});
    ks.forEach(function(k){h+=opt("lv",k,lvLabel(k),sum(cat[k]));});
  }else if(!S.cls){
    h+="<h3>Which class?</h3>";
    var cl=cat[S.lv]||{},first=((typeof LEVELS!=="undefined"&&LEVELS[S.lv])?LEVELS[S.lv].classes:[]).filter(function(k){return cl[k];});
    var rest2=Object.keys(cl).filter(function(k){return first.indexOf(k)<0;}).sort();
    first.concat(rest2).forEach(function(k){h+=opt("cls",k,k,sum(cl[k]));});
  }else if(!S.sub){
    h+="<h3>Which subject?</h3>";
    var sj=(cat[S.lv]||{})[S.cls]||{};
    Object.keys(sj).sort().forEach(function(k){h+=opt("sub",k,k,sj[k]);});
  }else{
    var total=(((cat[S.lv]||{})[S.cls]||{})[S.sub])||0;
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

function quizHtml(){
  var n=S.qs.length,q=S.qs[S.i],sel=S.sel[S.i];
  var h="<div class='top'><span>Question "+(S.i+1)+" of "+n+"</span><button type='button' onclick='EduRoom.quit()'>Quit</button></div>"+
    "<div class='bar'><i style='width:"+Math.round((S.i/n)*100)+"%'></i></div>"+
    "<div class='q'>"+e(q.q)+"</div>";
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
    h+="<div class='card'><div class='q' style='font-size:15px'>"+(i+1)+". "+e(q.q)+"</div>";
    q.opts.forEach(function(o,k){
      var cls=k===q.ci?" ok":(k===sel?" bad":"");
      h+="<div class='ch"+cls+"'><b>"+letter(k)+"</b><span>"+e(o)+"</span></div>";
    });
    h+="<div class='n'>"+(sel<0?"You did not answer. ":(sel===q.ci?"Correct. ":"You chose "+letter(sel)+". "))+"The saved answer is "+letter(q.ci)+".</div>"+
      "<div class='acts'><button type='button' onclick='EduRoom.explain("+i+")'>Explain with AI teacher</button><button type='button' id='rmrep"+i+"' onclick='EduRoom.report("+i+")'>Report a wrong answer</button></div>"+
      "<div class='ex' id='rmex"+i+"'>"+(S.exp[i]?e(S.exp[i]):"")+"</div></div>";
  });
  return h+"<div class='nav'><button type='button' class='go' onclick='EduRoom.home()'>Done</button></div>";
}

function draw(){
  if(!APP)return;
  var h="";
  if(S.screen==="quiz")h=quizHtml();
  else if(S.screen==="result")h=resultHtml();
  else if(S.screen==="review")h=reviewHtml();
  else h=setupHtml();
  APP.innerHTML="<div class='rm'>"+h+"</div>";
  try{window.scrollTo(0,0);}catch(x){}
}

/* ---------- actions ---------- */
async function begin(count){
  if(S.busy)return;
  S.busy=true;S.err="";draw();
  try{
    var f="exam_questions?select=id,q_text,options,correct_index&status=eq.active&level=eq."+encodeURIComponent(S.lv)+"&class=eq."+encodeURIComponent(S.cls)+"&subject=eq."+encodeURIComponent(S.sub)+"&limit=1000";
    var r=await rest(f);
    if(!r.ok)throw new Error("Server answered "+r.status);
    var rows=await r.json(),good=[];
    rows.forEach(function(x){
      var o=x.options,ci=x.correct_index;
      if(!Array.isArray(o)||o.length!==4||typeof ci!=="number"||ci<0||ci>3)return;
      if(!x.q_text||o.some(function(t){return typeof t!=="string"||!t.trim();}))return;
      var order=shuffle([0,1,2,3]);
      good.push({id:x.id,q:x.q_text,opts:order.map(function(k){return o[k];}),ci:order.indexOf(ci)});
    });
    if(!good.length)throw new Error("No questions found for this choice.");
    S.qs=shuffle(good).slice(0,Math.max(1,count));
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
  var b2=document.getElementById("rmex"+i);if(b2)b2.textContent=S.exp[i];
}
async function report(i){
  var q=S.qs[i],btn=document.getElementById("rmrep"+i);
  var done=readJSON(RK,[]);
  if(done.indexOf(q.id)>-1){if(btn)btn.textContent="Already reported";return;}
  if(btn){btn.disabled=true;btn.textContent="Sending...";}
  try{
    var r=await rest("rpc/report_exam_question",{method:"POST",body:JSON.stringify({qid:q.id})});
    if(!r.ok)throw new Error("status "+r.status);
    done.push(q.id);writeJSON(RK,done.slice(-200));
    if(btn)btn.textContent="Reported. Thank you.";
  }catch(x){
    if(btn){btn.disabled=false;btn.textContent="Could not send. Try again";}
  }
}

window.EduRoom={
  open:async function(app){
    APP=app;css();
    try{if(typeof setHeader==="function")setHeader("<button class=\"back\" onclick=\"location.hash='#/exams'\">\u2190</button><h2>AI Examination Room</h2>");}catch(x){}
    try{if(typeof setActiveNav==="function")setActiveNav("exams");}catch(x){}
    if(S.screen!=="setup"&&S.qs.length){draw();return;}
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
    S[k]=v;
    if(k==="lv"){S.cls="";S.sub="";}
    if(k==="cls"){S.sub="";}
    S.err="";draw();
  },
  choose:function(k){S.sel[S.i]=k;draw();},
  step:function(d){
    if(d>0){if(S.sel[S.i]<0)return;if(S.i===S.qs.length-1){finish();return;}}
    S.i=Math.max(0,Math.min(S.qs.length-1,S.i+d));draw();
  },
  quit:function(){if(confirm("Stop this practice? Your answers will not be saved."))window.EduRoom.home();},
  result:function(){S.screen="result";draw();},
  review:function(){S.screen="review";draw();},
  again:function(){begin(S.qs.length);},
  home:function(){S.screen="setup";S.qs=[];S.sel=[];S.res=null;S.exp={};S.lv="";S.cls="";S.sub="";S.err="";draw();},
  explain:explain,
  report:report,
  version:"1.0",
  _t:{band:band,shuffle:shuffle,S:S}
};
})();
