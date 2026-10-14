/* Edu Library: AI Examination Room (student screen) v2.1
   v2.1: new clean sunset wallpaper (no words, books and lamp only at the bottom corners) replaces the old purple sunset JPG; light dark layer over it; picture centred. The website address was changed to edu-library.edulibrary.workers.dev (the old address no longer exists, so the wallpaper could not load and the drawn pencils picture showed instead).
   v2.0: question text now shows __underlined words__ as real underlined text (no more double dashes), and the level/class/subject cards no longer let the text overlap the "papers / questions" badge.
   v1.9: fourth wallpaper "Edu AI" (the robot picture, room-bg-eduai.jpg) with a dark layer over it so the text stays easy to read.
   v1.8: round icons on the level cards (notebook, graduation cap, college) and on the class cards (like the Library), wallpaper is now taken from the website first, then the copy inside the app. Tertiary shows automatically once it has papers.
   v1.7: wallpaper behind every Examination Room screen (3 looks: purple sunset, deep blue night, soft green; a built-in picture is used if the JPG cannot load),
   a customizable home dashboard (practice-day streak, weakest subjects, recent results), and a Customize screen (wallpaper, accent colour, text size).
   Everything is kept on the phone only (localStorage). No names, emails or phone numbers.
   v1.6: a "Back" button at the top of every choosing screen (also at the bottom of the long list of papers) (class, subject, list of papers, the paper, mixed practice). It goes back one step, to where you came from.
   v1.5: written questions. A paper can hold multiple-choice AND written questions. The student answers all of them in one sitting
   (written answers are typed and kept as drafts on the phone), then taps Submit. Multiple choice is marked on the phone.
   Written answers go to the backend (?room=mark) in groups of 8 and come back with a verdict, score, feedback, spelling list
   and a pass-level answer. If marking fails the answers are kept and "Try again" continues. Result screen shows the whole-paper score.
   v1.4: Level > Class > Subject > list of papers > the paper. "Read the whole paper" and "Read all" screens. "Mixed practice" kept (multiple choice only).
   v1.3: play / pause button on the AI teacher's explanation.
   v1.2: the AI teacher's explanation shows real bold text.
   v1.1: papers come from the backend, are saved on the phone (works offline), pictures, shuffled options, percentage + band.
   Loaded on demand from index.html when a student opens #/room. */
(function(){
"use strict";
if(window.EduRoom)return;
var API="https://edu-ai-backend-three.vercel.app/api/book-link?room=";
var SPK=100000;
var HK="edu_room_hist",RK="edu_room_rep",IK="edu_room_idx",PK="edu_room_p_",PL="edu_room_plist",DK="edu_room_drafts";
var APP=null;
var KINDS={short:"Short answer",describe:"Describe",essay:"Essay",letter:"Letter",comprehension:"Comprehension",notes:"Note making",diagram:"Diagram question"};
var VERD={right:"Right",almost:"Almost right",wrong:"Wrong"};
var S={screen:"setup",lv:"",cls:"",sub:"",paper:"",mix:"",rd:[],back:"paper",cat:null,papers:[],qs:[],ws:[],items:[],wa:{},wres:{},mk:{g:0,G:0,err:"",wait:""},marking:false,i:0,sel:[],res:null,busy:false,err:"",exp:{}};
var dTimer=null;
var SK="edu_room_set",DYK="edu_room_days";
var WALLS={
  sunset:{name:"Purple sunset",file:"room-bg-sunset.jpg",veil:"linear-gradient(180deg,rgba(24,6,34,.20),rgba(24,6,34,.42) 45%,rgba(24,6,34,.25))",top:"#2F102D",bot:"#A03A33",ink:"#FDF5E8",sub:"#E8CDA8",line:"rgba(244,195,121,.30)",bar:"rgba(32,6,44,.80)",card:"rgba(40,12,42,.58)",star:"#FFE2BE",moon:"#FFD6AA",book:["#78284A","#AA463C","#C86446"],pen:"#F7B65A"},
  night:{name:"Deep blue night",file:"room-bg-night.jpg",top:"#0B1030",bot:"#204280",ink:"#EEF3FF",sub:"#BFD0F2",line:"rgba(150,190,255,.30)",bar:"rgba(8,14,40,.82)",card:"rgba(10,18,52,.60)",star:"#D6E4FF",moon:"#E1EBFF",book:["#1E326E","#325096","#4664AA"],pen:"#96BEFF"},
  eduai:{name:"Edu AI",file:"room-bg-eduai.jpg",veil:"linear-gradient(180deg,rgba(24,6,34,.55),rgba(24,6,34,.76) 45%,rgba(24,6,34,.62))",top:"#2F102D",bot:"#A03A33",ink:"#FDF5E8",sub:"#E8CDA8",line:"rgba(244,195,121,.30)",bar:"rgba(32,6,44,.82)",card:"rgba(40,12,42,.60)",star:"#FFE2BE",moon:"#FFD6AA",book:["#78284A","#AA463C","#C86446"],pen:"#F7B65A"},
  green:{name:"Soft green",file:"room-bg-green.jpg",top:"#0F2E27",bot:"#2F7A5A",ink:"#F2FBF5",sub:"#C8E8D6",line:"rgba(170,235,200,.30)",bar:"rgba(8,36,28,.82)",card:"rgba(8,40,30,.58)",star:"#DCF5E6",moon:"#EBFADC",book:["#16503E","#286E50","#3E8C66"],pen:"#C8EB96"}
};
var ACCS={orange:["Orange","#F25E1E","#F77864"],pink:["Pink","#C2417F","#E86AA6"],blue:["Blue","#1C6FA6","#3B8FD4"],green:["Green","#2FA36B","#56C48E"],violet:["Violet","#7A4CC2","#A58AEA"]};
var SIZES={s:["Small",.92],m:["Normal",1],l:["Large",1.12],x:["Extra large",1.25]};
var DEF={wall:"sunset",acc:"orange",size:"m"};
var SITE="https://edu-library.edulibrary.workers.dev/";
var wallTok=0,hashOn=false;

function e(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmt(s){return e(s).replace(/\*\*([^*\n][^*]*?)\*\*/g,"<b>$1</b>");}
/* question text: __word__ becomes underlined word */
function qf(s){return e(s).replace(/__([^_\n]+?)__/g,"<u>$1</u>");}
function stopSpeak(){try{if(typeof window.ttsStop==="function")window.ttsStop();}catch(x){}}
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
function nm(x){return Math.round((Number(x)||0)*10)/10;}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function lvLabel(l){return (typeof LEVELS!=="undefined"&&LEVELS[l])?LEVELS[l].label:(l==="?"?"Other":l);}
function lvOrder(){return (typeof LEVELS!=="undefined")?Object.keys(LEVELS):["Primary","Secondary","Tertiary"];}
function readJSON(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(x){return d;}}
function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(x){}}
function kindLabel(k){return KINDS[k]||"Written";}
function spTxt(s){
  if(typeof s==="string")return s;
  if(s&&typeof s==="object"){var v=[];for(var k in s){if(typeof s[k]==="string")v.push(s[k]);}return v.join(" \u2192 ");}
  return "";
}

/* ---------- look (wallpaper, accent colour, text size) and practice days: all kept on the phone ---------- */
function getSet(){
  var r=readJSON(SK,{}),o={};
  o.wall=WALLS[r.wall]?r.wall:DEF.wall;
  o.acc=ACCS[r.acc]?r.acc:DEF.acc;
  o.size=SIZES[r.size]?r.size:DEF.size;
  return o;
}
function pad2(n){return (n<10?"0":"")+n;}
function dayKey(ts){var d=new Date(ts);return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function daySet(){
  var o={};
  readJSON(DYK,[]).forEach(function(k){if(typeof k==="string")o[k]=1;});
  readJSON(HK,[]).forEach(function(x){if(x&&x.t)o[dayKey(x.t)]=1;});
  return o;
}
function addToday(){
  var l=readJSON(DYK,[]),k=dayKey(Date.now());
  if(l.indexOf(k)<0){l.push(k);writeJSON(DYK,l.slice(-120));}
}
function streakInfo(){
  var o=daySet(),d=new Date(),n=0,today=!!o[dayKey(d.getTime())];
  if(!today)d.setDate(d.getDate()-1);
  while(o[dayKey(d.getTime())]&&n<400){n++;d.setDate(d.getDate()-1);}
  var w=[],names=["S","M","T","W","T","F","S"];
  for(var i=6;i>=0;i--){
    var x=new Date();x.setDate(x.getDate()-i);
    w.push({on:!!o[dayKey(x.getTime())],l:names[x.getDay()],now:i===0});
  }
  return {n:n,today:today,week:w};
}
function weakList(){
  var g={};
  readJSON(HK,[]).forEach(function(x){
    if(!x||!x.sub)return;
    var k=[x.lv||"",x.cls||"",x.sub].join("|");
    if(!g[k])g[k]={lv:x.lv||"",cls:x.cls||"",sub:x.sub,p:[]};
    if(g[k].p.length<6)g[k].p.push(Number(x.pct)||0);
  });
  var a=Object.keys(g).map(function(k){
    var v=g[k],t=0;v.p.forEach(function(q){t+=q;});
    v.avg=Math.round(t/v.p.length);return v;
  });
  var any=a.length>0;
  a=a.filter(function(v){return v.avg<80;}).sort(function(x,y){return x.avg-y.avg;});
  return {any:any,list:a.slice(0,3)};
}
function ago(ts){
  if(!ts)return "";
  var a=new Date(),b=new Date(ts);
  a.setHours(0,0,0,0);b.setHours(0,0,0,0);
  var d=Math.round((a-b)/86400000);
  return d<=0?"Today":d===1?"Yesterday":d+" days ago";
}
function sceneUri(t){
  var st="",P=[[30,40,6],[80,95,4],[130,30,5],[170,70,7],[215,28,4],[250,110,5],[320,28,4],[340,120,5],[60,150,4],[200,150,4],[20,770,4],[160,785,5],[240,760,4],[340,778,4],[110,742,4]];
  P.forEach(function(p){var x=p[0],y=p[1],r=p[2];st+="<path d='M"+x+" "+(y-r)+" L"+(x+r*.3)+" "+(y-r*.3)+" L"+(x+r)+" "+y+" L"+(x+r*.3)+" "+(y+r*.3)+" L"+x+" "+(y+r)+" L"+(x-r*.3)+" "+(y+r*.3)+" L"+(x-r)+" "+y+" L"+(x-r*.3)+" "+(y-r*.3)+" Z' fill='"+t.star+"' opacity='.75'/>";});
  var bk="";
  [[8,772,44,10,0],[10,762,38,9,1],[9,753,42,9,2],[300,772,48,10,1],[296,762,40,9,2],[302,753,44,9,0],[298,744,34,8,1]].forEach(function(b){
    bk+="<rect x='"+b[0]+"' y='"+b[1]+"' width='"+b[2]+"' height='"+b[3]+"' rx='3' fill='"+t.book[b[4]]+"' opacity='.9'/><rect x='"+(b[0]+4)+"' y='"+(b[1]+3)+"' width='"+(b[2]-8)+"' height='1.5' fill='"+t.star+"' opacity='.4'/>";
  });
  var pe="<g transform='translate(18 52) rotate(-24)' opacity='.85'><rect width='64' height='9' rx='2' fill='"+t.pen+"'/><path d='M64 0 L78 4.5 L64 9 Z' fill='#F6E4C8'/><path d='M73 3 L78 4.5 L73 6 Z' fill='#463240'/></g>"+
     "<g transform='translate(40 118) rotate(14)' opacity='.8'><rect width='50' height='8' rx='2' fill='"+t.pen+"'/><path d='M50 0 L62 4 L50 8 Z' fill='#F6E4C8'/><path d='M58 2.7 L62 4 L58 5.3 Z' fill='#463240'/></g>";
  var svg="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 800' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='"+t.top+"'/><stop offset='1' stop-color='"+t.bot+"'/></linearGradient></defs><rect width='360' height='800' fill='url(#g)'/><circle cx='295' cy='58' r='22' fill='"+t.moon+"' opacity='.85'/>"+st+pe+bk+"</svg>";
  return "data:image/svg+xml,"+encodeURIComponent(svg);
}
function tryWall(el,t,base,tok,list){
  if(!list.length)return;
  var src=list.shift(),im=new Image();
  im.onload=function(){if(tok===wallTok)el.style.backgroundImage=(t.veil?t.veil+",":"")+"url(\""+src+"\"),"+base;};
  im.onerror=function(){if(tok===wallTok)tryWall(el,t,base,tok,list);};
  im.src=src;
}
function applyTheme(){
  try{
    var st=getSet(),t=WALLS[st.wall],a=ACCS[st.acc],b=document.body;
    if(!b)return;
    var el=document.getElementById("rmWall");
    if(!el){el=document.createElement("div");el.id="rmWall";b.appendChild(el);}
    el.style.display="";
    var base="linear-gradient(180deg,"+t.top+","+t.bot+")";
    el.style.backgroundColor=t.top;
    el.style.backgroundImage="url(\""+sceneUri(t)+"\"),"+base;
    var tok=++wallTok;
    tryWall(el,t,base,tok,[SITE+t.file+"?v=20",t.file]);
    var v={"--ink":t.ink,"--sub":t.sub,"--line":t.line,"--rmBar":t.bar,"--rmCard":t.card,"--rmA1":a[1],"--rmA2":a[2],"--rmZ":String(SIZES[st.size][1])};
    for(var k in v)b.style.setProperty(k,v[k]);
    b.classList.add("rmwall");
    if(!hashOn){hashOn=true;window.addEventListener("hashchange",function(){if((location.hash||"").indexOf("#/room")!==0)leaveTheme();});}
  }catch(x){}
}
function leaveTheme(){
  try{
    var b=document.body;if(!b)return;
    b.classList.remove("rmwall");
    ["--ink","--sub","--line","--rmBar","--rmCard","--rmA1","--rmA2","--rmZ"].forEach(function(k){b.style.removeProperty(k);});
    var el=document.getElementById("rmWall");if(el)el.style.display="none";
    wallTok++;
  }catch(x){}
}

/* ---------- drafts of written answers (kept on the phone) ---------- */
function loadDraft(pid){
  var a=((readJSON(DK,{})[pid])||{}).a||{},out={};
  S.ws.forEach(function(w){if(typeof a[w.id]==="string")out[w.id]=a[w.id];});
  return out;
}
function saveDraft(){
  if(!S.paper||!S.ws.length)return;
  var all=readJSON(DK,{});
  all[S.paper.id]={at:Date.now(),a:S.wa};
  var ks=Object.keys(all).sort(function(a,b){return (all[b].at||0)-(all[a].at||0);});
  ks.slice(10).forEach(function(k){delete all[k];});
  writeJSON(DK,all);
}
function clearDraft(){
  if(!S.paper)return;
  var all=readJSON(DK,{});delete all[S.paper.id];writeJSON(DK,all);
}

/* ---------- styles ---------- */
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
".rm .top.bk{justify-content:flex-start;margin:4px 0 10px}"+
".rm .top.bk button{padding:10px 18px;font-size:14px}"+
".rm .bar{height:6px;border-radius:4px;background:rgba(127,127,127,.25);overflow:hidden;margin:0 0 14px}"+
".rm .bar i{display:block;height:100%;background:#2FA36B}"+
".rm .q{font-size:17px;line-height:1.5;font-weight:700;color:var(--ink);margin:0 0 14px;white-space:pre-wrap;word-wrap:break-word}"+
".rm .q u{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:2px}"+
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
/* v2.0: badge may wrap and the text side takes the free space, so nothing overlaps */
".rm .opt b{white-space:normal;text-align:center;max-width:44%;line-height:1.25;padding:4px 10px}"+
".rm .ot{display:flex;align-items:center;gap:12px;flex:1 1 0;min-width:0}"+
".rm .ol{flex:1 1 0;min-width:0;word-wrap:break-word;overflow-wrap:anywhere}"+
".rm .oi{flex:none;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-style:normal;box-shadow:inset 0 0 12px rgba(255,255,255,.2)}"+
".rm .oi svg{width:26px;height:26px}"+
".rm .opt span small{display:block;font-weight:500;font-size:12px;color:var(--sub);margin-top:2px}"+
".rm .tb{display:flex;gap:6px}"+
".rm .rdo{margin:0 0 6px;padding-left:4px;font-size:14.5px;line-height:1.4;color:var(--ink);word-wrap:break-word}"+
".rm .tag{display:inline-block;font-size:12px;font-weight:800;color:#fff;background:#1C6FA6;border-radius:12px;padding:3px 10px;margin:0 0 8px}"+
".rm textarea.wa{width:100%;min-height:200px;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;padding:12px;background:rgba(127,127,127,.12);color:var(--ink);font-size:16px;line-height:1.5;font-family:inherit;resize:vertical}"+
".rm .vd{display:inline-block;font-size:13px;font-weight:800;border-radius:12px;padding:3px 10px;color:#fff;background:#888}"+
".rm .vd.right{background:#2FA36B}.rm .vd.almost{background:#D9962B}.rm .vd.wrong{background:#D9534F}"+
".rm .box{margin:8px 0;padding:10px;border-radius:10px;border:1px solid var(--line);background:rgba(127,127,127,.12);font-size:14px;line-height:1.5;color:var(--ink);white-space:pre-wrap;word-wrap:break-word}"+
".rm .box small{display:block;font-weight:800;font-size:12px;color:var(--sub);margin-bottom:4px}"+
".rmzoom{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:10px}"+
".rmzoom img{max-width:100%;max-height:100%;background:#fff;border-radius:8px}";
  document.head.appendChild(s);
  css2();
}
function css2(){
  if(document.getElementById("rmCss2"))return;
  var s=document.createElement("style");s.id="rmCss2";
  s.textContent=
"#rmWall{position:fixed;top:0;left:0;right:0;bottom:0;z-index:-1;pointer-events:none;background-color:#2F102D;background-position:center center;background-size:cover;background-repeat:no-repeat}"+
"body.rmwall:not(.gate){background:transparent!important;color:var(--ink)}"+
"body.rmwall:not(.gate)::before{display:none!important}"+
"body.rmwall:not(.gate) #topHeader{background:var(--rmBar)!important;border-bottom:1px solid var(--line)!important}"+
"body.rmwall:not(.gate) .topbar h2,body.rmwall:not(.gate) .topbar .back{color:var(--ink)!important}"+
"body.rmwall:not(.gate) .bottomnav{background:var(--rmBar)!important;border-top:1px solid var(--line)!important}"+
"body.rmwall:not(.gate) .bottomnav a:not(.active){color:var(--sub)!important}"+
"body.rmwall .rm{zoom:var(--rmZ,1);color:var(--ink)}"+
"body.rmwall .rm h3{color:var(--ink);text-shadow:0 1px 6px rgba(0,0,0,.45)}"+
"body.rmwall .rm p.n,body.rmwall .rm .lbl{color:var(--sub);text-shadow:0 1px 5px rgba(0,0,0,.5)}"+
"body.rmwall .rm .opt,body.rmwall .rm .card,body.rmwall .rm .box,body.rmwall .rm .ch,body.rmwall .rm textarea.wa{background:var(--rmCard);border-color:var(--line)}"+
"body.rmwall .rm .ch.sel{background:rgba(59,143,212,.38);border-color:#3B8FD4}"+
"body.rmwall .rm .ch.ok{background:rgba(47,163,107,.34);border-color:#2FA36B}"+
"body.rmwall .rm .ch.bad{background:rgba(217,83,79,.32);border-color:#D9534F}"+
"body.rmwall .rm .top button,body.rmwall .rm .sec,body.rmwall .rm .acts button{background:rgba(255,255,255,.12);border-color:var(--line);color:var(--ink)}"+
"body.rmwall .rm .go{background:linear-gradient(135deg,var(--rmA1),var(--rmA2));color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.28)}"+
"body.rmwall .rm .empty{color:var(--sub)}"+
".rm .opt,.rm .go,.rm .sec,.rm .top button{min-height:44px}"+
".rm .dh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:2px 0 8px}"+
".rm .dh h3{margin:0}"+
".rm .dh button{border:1px solid var(--line);background:rgba(255,255,255,.12);color:var(--ink);border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700;min-height:40px}"+
".rm .strk{display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 12px;background:var(--rmCard)}"+
".rm .strk .sn{flex:none;min-width:58px;text-align:center}"+
".rm .strk .sn b{display:block;font-size:34px;line-height:1;font-weight:900;color:var(--ink)}"+
".rm .strk .sn span{display:block;font-size:11.5px;color:var(--sub);margin-top:3px}"+
".rm .strk .sm{flex:1;min-width:0}"+
".rm .strk .sm p{margin:0 0 8px;font-size:13px;line-height:1.35;color:var(--ink)}"+
".rm .wk{display:flex;justify-content:space-between;gap:4px}"+
".rm .wk i{flex:1;max-width:34px;text-align:center;font-style:normal;font-size:11px;font-weight:800;color:var(--sub)}"+
".rm .wk i u{display:block;width:100%;height:22px;border-radius:50%;max-width:22px;margin:0 auto 3px;border:1.5px solid var(--line);background:transparent;box-sizing:border-box;text-decoration:none}"+
".rm .wk i.on u{background:linear-gradient(135deg,var(--rmA1),var(--rmA2));border-color:transparent}"+
".rm .wk i.now{color:var(--ink)}"+
".rm .wrow{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line);padding:9px 0}"+
".rm .wrow:last-child{border-bottom:none}"+
".rm .wrow .wt{flex:1;min-width:0;font-size:14px;color:var(--ink);font-weight:700}"+
".rm .wrow .wt small{display:block;font-weight:500;font-size:12px;color:var(--sub);margin-top:1px}"+
".rm .wrow .wb{height:6px;border-radius:4px;background:rgba(255,255,255,.18);overflow:hidden;margin-top:6px}"+
".rm .wrow .wb i{display:block;height:100%;border-radius:4px}"+
".rm .wrow .wp{flex:none;font-size:15px;font-weight:900;color:var(--ink);min-width:44px;text-align:right}"+
".rm .wrow button{flex:none;border:none;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--rmA1),var(--rmA2));min-height:40px}"+
".rm .rrow{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:9px 0}"+
".rm .rrow:last-child{border-bottom:none}"+
".rm .rrow .rt{min-width:0;font-size:14px;color:var(--ink);font-weight:700}"+
".rm .rrow .rt small{display:block;font-weight:500;font-size:12px;color:var(--sub);margin-top:1px}"+
".rm .rrow .rp{flex:none;text-align:right;font-size:18px;font-weight:900;color:var(--ink);line-height:1.1}"+
".rm .rrow .rp small{display:block;font-size:11.5px;font-weight:700;color:var(--sub)}"+
".rm .pnl{border:1px solid var(--line);border-radius:14px;padding:6px 14px;margin:0 0 12px;background:var(--rmCard)}"+
".rm .pnl p{margin:10px 0;font-size:13px;color:var(--sub)}"+
".rm .wsw{display:flex;gap:8px;margin:0 0 6px}"+
".rm .wsw button{flex:1;min-width:0;border:2px solid var(--line);border-radius:14px;padding:0 0 8px;background:var(--rmCard);color:var(--ink);font-size:12.5px;font-weight:700;overflow:hidden}"+
".rm .wsw button em{display:block;height:84px;margin-bottom:6px}"+
".rm .wsw button.on{border-color:var(--rmA2);box-shadow:0 0 0 2px var(--rmA2)}"+
".rm .asw{display:flex;gap:6px;margin:0 0 6px;flex-wrap:wrap}"+
".rm .asw button{flex:1;min-width:56px;border:2px solid var(--line);border-radius:14px;padding:8px 2px;background:var(--rmCard);color:var(--ink);font-size:11.5px;font-weight:700}"+
".rm .asw button i{display:block;width:30px;height:30px;border-radius:50%;margin:0 auto 5px}"+
".rm .asw button.on{border-color:var(--rmA2);box-shadow:0 0 0 2px var(--rmA2)}"+
".rm .zsw{display:flex;gap:6px;margin:0 0 6px}"+
".rm .zsw button{flex:1;min-width:0;border:2px solid var(--line);border-radius:12px;padding:10px 2px;background:var(--rmCard);color:var(--ink);font-weight:800;min-height:44px}"+
".rm .zsw button.on{border-color:var(--rmA2);box-shadow:0 0 0 2px var(--rmA2)}";
  document.head.appendChild(s);
}

/* ---------- list of papers ---------- */
async function loadCat(){
  var idx=null;
  try{idx=await api("index",{});writeJSON(IK,idx);}
  catch(x){idx=readJSON(IK,null);if(!idx)throw x;}
  S.papers=(idx&&idx.papers)||[];
  var c={};
  S.papers.forEach(function(p){
    var l=p.level||"?",k=p.class||"?",su=p.subject||"General";
    if(!c[l])c[l]={};if(!c[l][k])c[l][k]={};
    c[l][k][su]=(c[l][k][su]||0)+cnt(p);
  });
  S.cat=c;
}
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
function cnt(p){return (p.count||0)+(p.written||0);}
function pkey(p){return [p.level||"?",p.class||"?",p.subject||"General"];}
function papersFor(l,k,su){return S.papers.filter(function(p){var a=pkey(p);return a[0]===l&&(k==null||a[1]===k)&&(su==null||a[2]===su);});}
function stat(ps){var q=0;ps.forEach(function(p){q+=cnt(p);});return ps.length+(ps.length===1?" paper \u00B7 ":" papers \u00B7 ")+q+" questions";}
function ptitle(p){return (p&&(p.title||p.name))||"Paper";}
function papersNow(){if(S.paper)return S.papers.filter(function(p){return p.id===S.paper.id;});return papersFor(S.lv,S.cls,S.sub);}
function crumb(k,label){return "<button type='button' class='crumb' onclick=\"EduRoom.pick('"+k+"','')\">"+e(label)+" \u2715</button>";}
var IPATH={book:"<path d='M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z'/><path d='M12 6.5v13'/>",Primary:"<path d='M6 3.5h10.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z'/><path d='M6 3.5v17M9.5 8h5M9.5 11.5h5'/>",Secondary:"<path d='M2.5 9.5L12 5l9.5 4.5L12 14z'/><path d='M6.5 11.7v4.3c0 1.2 2.5 2.6 5.5 2.6s5.5-1.4 5.5-2.6v-4.3'/><path d='M21.5 9.5v5.5'/>",Tertiary:"<path d='M3 20.5h18M5 20.5V10M9.5 20.5V10M14.5 20.5V10M19 20.5V10'/><path d='M2.5 10L12 4l9.5 6z'/>"};
var ICOL={Primary:["#1dba6d","#0b6b3d"],Secondary:["#2e8bff","#0e3fa8"],Tertiary:["#8b5cff","#4b2aa8"]};
var CGR={Primary:["#F5B400,#FF8A00","#FF7A18,#F2590C","#F0284A,#C4102F","#E01FA0,#9B2BE0","#7B3FEA,#5B2BD0","#1E7CF2,#1550D0","#12C4C4,#0A8FA8","#22C55E,#0E9F3E"],Secondary:["#1E7CF2,#0F4FD0","#22C55E,#0E9F3E","#FF9A1F,#E06A00","#8B5CFF,#5B2BD0"],Tertiary:["#8B3FE8,#5B2BD0","#1E7CF2,#0F4FD0","#22C55E,#0E9F3E","#FF9A1F,#E06A00"]};
function isvg(p){return "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>"+p+"</svg>";}
function lvIcon(l){var c=ICOL[l]||["#F25E1E","#A03A33"];return "<i class='oi' style='background:linear-gradient(135deg,"+c[0]+","+c[1]+")'>"+isvg(IPATH[l]||IPATH.book)+"</i>";}
function clIcon(l,c,i){
  var g=CGR[l]||CGR.Primary,gr=g[i%g.length],ic=null;
  try{if(l==="Tertiary"&&typeof TICON!=="undefined"&&TICON[c])ic=e(TICON[c]);}catch(x){}
  return "<i class='oi' style='background:linear-gradient(135deg,"+gr+")'>"+(ic||isvg(IPATH.book))+"</i>";
}
function opt(k,v,label,n,ic){return "<button type='button' class='opt' data-k='"+k+"' data-v=\""+e(v)+"\" onclick=\"EduRoom.pick(this.dataset.k,this.dataset.v)\"><span class='ot'>"+(ic||"")+"<span class='ol'>"+label+"</span></span><b>"+n+"</b></button>";}
function backBtn(){return "<div class='top bk'><button type='button' onclick='EduRoom.up()'>\u2190 Back</button></div>";}

function setupHtml(){
  var h=(S.lv?backBtn():"")+"<p class='n'>Practise with multiple-choice and written questions taken from past papers. Choose what you want to practise.</p>";
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
    h+=streakHtml();
    h+="<h3>Which level?</h3>";
    var ks=lvOrder().concat(["?"]).filter(function(k){return cat[k];});
    ks.forEach(function(k){h+=opt("lv",k,e(lvLabel(k)),stat(papersFor(k)),lvIcon(k));});
  }else if(!S.cls){
    h+="<h3>Which class?</h3>";
    var cl=cat[S.lv]||{},first=((typeof LEVELS!=="undefined"&&LEVELS[S.lv])?LEVELS[S.lv].classes:[]).filter(function(k){return cl[k];});
    var rest2=Object.keys(cl).filter(function(k){return first.indexOf(k)<0;}).sort();
    first.concat(rest2).forEach(function(k,i){h+=opt("cls",k,e(k),stat(papersFor(S.lv,k)),clIcon(S.lv,k,i));});
  }else if(!S.sub){
    h+="<h3>Which subject?</h3>";
    var sj=(cat[S.lv]||{})[S.cls]||{};
    Object.keys(sj).sort().forEach(function(k){h+=opt("sub",k,e(k),stat(papersFor(S.lv,S.cls,k)));});
  }else if(S.paper){
    h+=paperHtml();
  }else if(!S.mix){
    var pl=papersFor(S.lv,S.cls,S.sub).sort(function(a,b){return (Number(b.year)||0)-(Number(a.year)||0)||String(ptitle(a)).localeCompare(String(ptitle(b)));});
    h+="<h3>Choose a paper</h3><p class='n'>Open a paper to read all its questions first, then start answering.</p>";
    pl.forEach(function(p){h+=opt("paper",p.id,e(ptitle(p))+(p.year?"<small>"+e(p.year)+"</small>":""),cnt(p)+" questions");});
    var mcTotal=0;pl.forEach(function(p){mcTotal+=p.count||0;});
    if(pl.length>1)h+=opt("mix","1","Mixed practice<small>Random multiple-choice questions from all these papers</small>",mcTotal+" questions");
  }else{
    var total=0;papersFor(S.lv,S.cls,S.sub).forEach(function(p){total+=p.count||0;});
    h+="<h3>How many questions?</h3>";
    [10,20,40].filter(function(x){return x<total;}).forEach(function(x){h+=opt("count",String(x),x+" questions",x);});
    var all=Math.min(total,60);
    h+=opt("count",String(all),"All ("+all+")",all);
    if(S.err)h+="<p class='n' style='color:#D9534F'>"+e(S.err)+"</p>";
    if(S.busy)h+="<p class='n'>Loading questions...</p>";
  }
  if(!S.lv)h+=weakHtml()+recentHtml();
  return h+((S.lv&&S.cls&&S.sub&&!S.paper&&!S.mix)?backBtn():"")+"<div class='lbl'>AI-marked practice. Not an official exam result.</div>";
}

function streakHtml(){
  var si=streakInfo(),msg;
  if(si.n===0)msg="Practise today to start your streak.";
  else if(!si.today)msg="Practise today to keep your streak going.";
  else msg=si.n===1?"You practised today. Come back tomorrow!":"You practised today. Keep it up!";
  var dots=si.week.map(function(d){return "<i class='"+(d.on?"on":"")+(d.now?" now":"")+"'><u></u>"+d.l+"</i>";}).join("");
  return "<div class='dh'><h3>Your practice</h3><button type='button' onclick='EduRoom.custom()'>Customize</button></div>"+
    "<div class='strk'><div class='sn'><b>"+si.n+"</b><span>"+(si.n===1?"day":"days")+" in a row</span></div><div class='sm'><p>"+msg+"</p><div class='wk'>"+dots+"</div></div></div>";
}
function weakHtml(){
  var w=weakList(),h="<h3>Weakest subjects</h3><div class='pnl'>";
  if(!w.any)return h+"<p>Finish a practice to see which subjects need more work.</p></div>";
  if(!w.list.length)return h+"<p>No weak subjects right now. Well done, keep practising!</p></div>";
  w.list.forEach(function(v){
    var col=v.avg<40?"#D9534F":"#D9962B";
    h+="<div class='wrow'><div class='wt'>"+e(v.sub)+"<small>"+e(v.cls)+" \u00B7 average of "+v.p.length+(v.p.length===1?" try":" tries")+"</small><div class='wb'><i style='width:"+Math.max(4,v.avg)+"%;background:"+col+"'></i></div></div><div class='wp'>"+v.avg+"%</div>"+
      "<button type='button' data-lv=\""+e(v.lv)+"\" data-c=\""+e(v.cls)+"\" data-s=\""+e(v.sub)+"\" onclick='EduRoom.go(this.dataset.lv,this.dataset.c,this.dataset.s)'>Practise</button></div>";
  });
  return h+"</div>";
}
function recentHtml(){
  var hist=readJSON(HK,[]).slice(0,3),h="<h3>Recent results</h3><div class='pnl'>";
  if(!hist.length)return h+"<p>Your results will show here after your first practice.</p></div>";
  hist.forEach(function(x){
    h+="<div class='rrow'><div class='rt'>"+e(x.sub)+"<small>"+e(x.cls)+(x.t?" \u00B7 "+e(ago(x.t)):"")+"</small></div><div class='rp'>"+e(x.pct)+"%<small>"+e(x.band)+"</small></div></div>";
  });
  return h+"</div>";
}
function customHtml(){
  var st=getSet(),h="<div class='top bk'><button type='button' onclick='EduRoom.customDone()'>\u2190 Back</button></div><h3>Customize</h3><p class='n'>Your choices are saved on this phone only.</p>";
  h+="<h3>Wallpaper</h3><div class='wsw'>";
  Object.keys(WALLS).forEach(function(k){
    var t=WALLS[k];
    h+="<button type='button' class='"+(st.wall===k?"on":"")+"' onclick=\"EduRoom.set('wall','"+k+"')\"><em style='background:linear-gradient(180deg,"+t.top+","+t.bot+")'></em>"+e(t.name)+"</button>";
  });
  h+="</div><h3>Accent colour</h3><div class='asw'>";
  Object.keys(ACCS).forEach(function(k){
    var a=ACCS[k];
    h+="<button type='button' class='"+(st.acc===k?"on":"")+"' onclick=\"EduRoom.set('acc','"+k+"')\"><i style='background:linear-gradient(135deg,"+a[1]+","+a[2]+")'></i>"+e(a[0])+"</button>";
  });
  h+="</div><h3>Text size</h3><div class='zsw'>";
  Object.keys(SIZES).forEach(function(k){
    h+="<button type='button' class='"+(st.size===k?"on":"")+"' onclick=\"EduRoom.set('size','"+k+"')\" style='font-size:"+Math.round(13*SIZES[k][1])+"px'>"+e(SIZES[k][0])+"</button>";
  });
  h+="</div><h3>Preview</h3><div class='card'><div class='q' style='font-size:15px'>Which planet is closest to the Sun?</div><button type='button' class='ch sel' onclick='EduRoom.pv(this)'><b>A</b><span>Mercury</span></button><button type='button' class='ch' onclick='EduRoom.pv(this)'><b>B</b><span>Venus</span></button></div>";
  h+="<div class='nav'><button type='button' class='go' onclick='EduRoom.customDone()'>Done</button></div>";
  h+="<div class='nav'><button type='button' class='sec' onclick='EduRoom.set(\"reset\",\"\")'>Reset to default look</button></div>";
  return h;
}

function paperHtml(){
  var p=S.paper,mc=p.count||0,wr=p.written||0;
  var parts=[];if(mc)parts.push(mc+" multiple choice");if(wr)parts.push(wr+" written");
  var h="<h3>"+e(ptitle(p))+"</h3><p class='n'>"+(parts.length?parts.join(" \u00B7 "):cnt(p)+" questions")+(p.year?" \u00B7 "+e(p.year):"")+". Tip: read all the questions first, then start answering.</p>";
  if(wr)h+="<p class='n'>Written questions: type your answers in your own words. They are kept on this phone while you work. Marking needs internet and happens when you submit.</p>";
  h+="<div class='nav'><button type='button' class='sec' onclick='EduRoom.read()'>Read the whole paper first</button></div>";
  h+="<div class='nav'><button type='button' class='go' onclick='EduRoom.start()'>Start answering</button></div>";
  if(S.err)h+="<p class='n' style='color:#D9534F'>"+e(S.err)+"</p>";
  if(S.busy)h+="<p class='n'>Loading questions...</p>";
  return h;
}
function imgHtml(q){return q.img?"<img class='qimg' alt='Diagram or table for this question' src=\""+e(q.img)+"\" onclick='EduRoom.zoom(this.src)'>":"";}
function readHtml(){
  var fromQuiz=S.back==="quiz";
  var btn=fromQuiz?"<div class='nav'><button type='button' class='go' onclick='EduRoom.unread()'>Back to question "+(S.i+1)+"</button></div>":"<div class='nav'><button type='button' class='go' onclick='EduRoom.start()'>Start answering</button></div>";
  var h="<div class='top'><span>Reading all "+S.rd.length+" questions</span><button type='button' onclick='EduRoom.unread()'>Back</button></div>"+
    "<p class='n'>Nothing is marked here. Read everything, then "+(fromQuiz?"go back to your question.":"start answering.")+"</p>"+btn;
  S.rd.forEach(function(q,i){
    if(q.w){
      h+="<div class='card'><span class='tag'>"+e(kindLabel(q.kind))+" \u00B7 "+nm(q.marks)+(q.marks===1?" mark":" marks")+"</span><div class='q' style='font-size:15px'>"+(i+1)+". "+qf(q.q)+"</div>"+imgHtml(q)+"<div class='rdo'>Written answer: you type it when you start answering.</div></div>";
    }else{
      h+="<div class='card'><div class='q' style='font-size:15px'>"+(i+1)+". "+qf(q.q)+"</div>"+imgHtml(q)+q.o.map(function(o){return "<div class='rdo'>\u2022 "+e(o)+"</div>";}).join("")+"</div>";
    }
  });
  return h+btn;
}
function quizHtml(){
  var n=S.items.length,it=S.items[S.i];
  var h="<div class='top'><span>Question "+(S.i+1)+" of "+n+"</span><span class='tb'><button type='button' onclick='EduRoom.read()'>Read all</button><button type='button' onclick='EduRoom.quit()'>Quit</button></span></div>"+
    "<div class='bar'><i style='width:"+Math.round((S.i/n)*100)+"%'></i></div>";
  var last=(S.i===n-1),lastLabel=S.ws.length?"Submit":"Finish",ok=true;
  if(it.t==="m"){
    var q=S.qs[it.k],sel=S.sel[it.k];
    h+="<div class='q'>"+qf(q.q)+"</div>"+imgHtml(q);
    q.opts.forEach(function(o,k){
      h+="<button type='button' class='ch"+(sel===k?" sel":"")+"' onclick='EduRoom.choose("+k+")'><b>"+letter(k)+"</b><span>"+e(o)+"</span></button>";
    });
    ok=sel>=0;
  }else{
    var w=S.ws[it.k];
    h+="<span class='tag'>"+e(kindLabel(w.kind))+" \u00B7 "+nm(w.marks)+(w.marks===1?" mark":" marks")+"</span>"+
      "<div class='q'>"+qf(w.q)+"</div>"+imgHtml(w)+
      "<textarea class='wa' maxlength='6000' placeholder='Type your answer here...' spellcheck='false' autocorrect='off' autocapitalize='sentences' oninput='EduRoom.type("+it.k+",this.value)' onblur='EduRoom.type("+it.k+",this.value,1)'>"+e(S.wa[w.id]||"")+"</textarea>"+
      "<div class='lbl' style='text-align:left'>Saved on this phone as you type. Write in your own words: spelling and expression can be marked.</div>";
  }
  h+="<div class='nav'>"+(S.i>0?"<button type='button' class='sec' onclick='EduRoom.step(-1)'>Previous</button>":"")+
    "<button type='button' class='go' "+(ok?"":"disabled")+" onclick='EduRoom.step(1)'>"+(last?lastLabel:"Next")+"</button></div>";
  return h+"<div class='lbl'>AI-marked practice. Not an official exam result.</div>";
}

function markingHtml(){
  var m=S.mk,h="<h3>Marking your written answers</h3>";
  if(m.err){
    h+="<p class='n' style='color:#D9534F'>"+e(m.err)+"</p><p class='n'>Your answers are safe on this phone. Nothing was lost.</p>"+
      "<div class='nav'><button type='button' class='go' onclick='EduRoom.retryMark()'>Try again</button></div>"+
      "<div class='nav'><button type='button' class='sec' onclick='EduRoom.unmark()'>Back to my answers</button></div>";
  }else{
    h+="<p class='n'>Marking... group "+Math.max(1,m.g)+" of "+Math.max(1,m.G)+". Please keep this screen open.</p>"+
      "<div class='bar'><i style='width:"+Math.round((Math.max(0,m.g-1)/Math.max(1,m.G))*100)+"%'></i></div>"+
      (m.wait?"<p class='n'>"+e(m.wait)+"</p>":"");
  }
  return h;
}

function wCard(w,i){
  var r=S.wres[w.id]||{},ans=S.wa[w.id]||"",v=VERD[r.verdict]?r.verdict:"wrong";
  var sc=Math.max(0,Math.min(w.marks,Number(r.score)||0));
  var h="<div class='card'><span class='tag'>Question "+(S.qs.length+i+1)+" \u00B7 "+e(kindLabel(w.kind))+"</span>"+
    "<div class='q' style='font-size:15px'>"+qf(w.q)+"</div>"+imgHtml(w)+
    "<div class='box'><small>Your answer</small>"+(ans.trim()?e(ans):"(no answer)")+"</div>"+
    "<div><span class='vd "+v+"'>"+VERD[v]+"</span> <b style='color:var(--ink)'>"+nm(sc)+" out of "+nm(w.marks)+"</b></div>";
  if(r.feedback)h+="<div class='ex'>"+fmt(r.feedback)+"</div>";
  var sp=(Array.isArray(r.spelling)?r.spelling:[]).map(spTxt).filter(function(x){return x;});
  if(sp.length)h+="<div class='box'><small>Spelling to check</small>"+sp.map(function(x){return "\u2022 "+e(x);}).join("\n")+"</div>";
  if(v!=="right"&&r.pass)h+="<div class='box'><small>A pass answer would look like this</small>"+fmt(r.pass)+"</div>";
  return h+"</div>";
}

function resultHtml(){
  var r=S.res,h="<div class='score'><div class='pc'>"+r.pct+"%</div><div class='bd'>"+e(r.band)+"</div>";
  if(r.hasW){
    h+="<div>"+nm(r.tot)+" of "+nm(r.max)+" marks</div><small>Multiple choice: "+r.c+" of "+r.n+" \u00B7 Written: "+nm(r.ws)+" of "+nm(r.wm)+" marks</small>";
  }else{
    h+="<div>"+r.c+" of "+r.n+" correct</div>";
  }
  h+="<small>"+e(S.sub)+" \u00B7 "+e(S.cls)+"</small></div>";
  if(r.hasW){
    h+="<h3>Written answers</h3>";
    S.ws.forEach(function(w,i){h+=wCard(w,i);});
  }
  if(S.qs.length)h+="<div class='nav'><button type='button' class='go' onclick='EduRoom.review()'>Review multiple-choice answers</button></div>";
  h+="<div class='nav'><button type='button' class='sec' onclick='EduRoom.again()'>Try again (new order)</button><button type='button' class='sec' onclick='EduRoom.home()'>Choose another</button></div>"+
    "<div class='lbl'>AI-marked practice. The questions come from past papers, read by AI"+(S.qs.length?" and checked by two AIs":"")+". Written answers are marked by AI using a model answer written by AI, so they can be wrong. This is not an official MANEB or school result. Your score is saved on this phone only.</div>";
  return h;
}

function reviewHtml(){
  var h="<div class='top'><span>Multiple choice: "+S.res.c+" of "+S.res.n+"</span><button type='button' onclick='EduRoom.result()'>Back</button></div>";
  S.qs.forEach(function(q,i){
    var sel=S.sel[i];
    h+="<div class='card'><div class='q' style='font-size:15px'>"+(i+1)+". "+qf(q.q)+"</div>"+imgHtml(q);
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
  else if(S.screen==="marking")h=markingHtml();
  else if(S.screen==="result")h=resultHtml();
  else if(S.screen==="review")h=reviewHtml();
  else if(S.screen==="read")h=readHtml();
  else if(S.screen==="custom")h=customHtml();
  else h=setupHtml();
  APP.innerHTML="<div class='rm'>"+h+"</div>";
  try{window.scrollTo(0,0);}catch(x){}
}

/* ---------- actions ---------- */
async function collect(ps,withW){
  var m=[],w=[];
  for(var pi=0;pi<ps.length;pi++){
    var pd=await loadPaper(ps[pi]);
    (pd.questions||[]).forEach(function(x){
      if(!x)return;
      if(x.type==="written"){
        if(!withW||!x.id||typeof x.q!=="string"||!x.q.trim())return;
        var mk=Number(x.marks);
        w.push({id:x.id,pid:pd.id,kind:x.kind||"short",marks:mk>0?mk:1,q:x.q,img:x.img||""});
        return;
      }
      var o=x.options,ci=x.correct;
      if(!Array.isArray(o)||o.length!==4||typeof ci!=="number"||ci<0||ci>3)return;
      if(!x.q||o.some(function(t){return typeof t!=="string"||!t.trim();}))return;
      m.push({id:x.id,pid:pd.id,img:x.img||"",q:x.q,o:o.slice(),ci:ci});
    });
  }
  return {m:m,w:w};
}
async function begin(count){
  if(S.busy)return;
  stopSpeak();
  S.busy=true;S.err="";draw();
  try{
    var raw=await collect(papersNow(),!!S.paper);
    if(!raw.m.length&&!raw.w.length)throw new Error("No questions found for this choice.");
    var good=raw.m.map(function(r){var order=shuffle([0,1,2,3]);return {id:r.id,pid:r.pid,img:r.img,q:r.q,opts:order.map(function(k){return r.o[k];}),ci:order.indexOf(r.ci)};});
    S.qs=S.paper?good:shuffle(good).slice(0,Math.max(1,count));
    S.ws=S.paper?raw.w:[];
    S.wa=S.paper?loadDraft(S.paper.id):{};
    S.wres={};S.marking=false;S.mk={g:0,G:0,err:"",wait:""};
    S.sel=S.qs.map(function(){return -1;});
    S.items=S.qs.map(function(q,k){return {t:"m",k:k};}).concat(S.ws.map(function(w,k){return {t:"w",k:k};}));
    S.i=0;S.res=null;S.exp={};S.screen="quiz";
  }catch(x){
    S.err="Could not load the questions. Check your internet and try again. ("+(x&&x.message||x)+")";
  }
  S.busy=false;draw();
}
function finishAll(){
  var c=0;S.qs.forEach(function(q,i){if(S.sel[i]===q.ci)c++;});
  var n=S.qs.length,ws=0,wm=0;
  S.ws.forEach(function(w){
    var r=S.wres[w.id];
    wm+=w.marks;
    if(r)ws+=Math.max(0,Math.min(w.marks,Number(r.score)||0));
  });
  var tot=c+ws,max=n+wm,pct=max>0?Math.round(tot/max*100):0;
  S.res={c:c,n:n,pct:pct,band:band(pct),hasW:S.ws.length>0,ws:ws,wm:wm,tot:tot,max:max};
  var h=readJSON(HK,[]);
  h.unshift({t:Date.now(),lv:S.lv,cls:S.cls,sub:S.sub,c:c,n:n,pct:pct,band:S.res.band});
  writeJSON(HK,h.slice(0,60));
  addToday();
  clearDraft();
  S.screen="result";draw();
}
async function markCall(body){
  var ctl=null,tm=null;
  try{ctl=new AbortController();tm=setTimeout(function(){ctl.abort();},60000);}catch(x){}
  try{
    var r=await fetch(API+"mark",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined});
    var j=null;try{j=await r.json();}catch(x){}
    if(tm)clearTimeout(tm);
    if(r.ok&&j)return {ok:true,j:j};
    return {ok:false,status:r.status,msg:(j&&j.error)||("Server answered "+r.status)};
  }catch(x){
    if(tm)clearTimeout(tm);
    return {ok:false,status:0,msg:"Could not reach the marking server. Check your internet."};
  }
}
async function runMark(){
  if(S.marking)return;
  S.marking=true;
  var todo=S.ws.filter(function(w){return !S.wres[w.id];});
  var groups=[];
  for(var i=0;i<todo.length;i+=8)groups.push(todo.slice(i,i+8));
  S.mk={g:0,G:groups.length,err:"",wait:""};
  var byId={};S.ws.forEach(function(w){byId[w.id]=w;});
  try{
    for(var gi=0;gi<groups.length;gi++){
      var g=groups[gi];
      S.mk.g=gi+1;S.mk.wait="";draw();
      var body={id:S.paper.id,answers:g.map(function(w){return {q:w.id,a:String(S.wa[w.id]||"").slice(0,6000)};})};
      var out=null,tries=0;
      while(!out){
        var r=await markCall(body);
        if(r.ok){out=r.j;break;}
        if(r.status===429&&tries<3){
          tries++;S.mk.wait="Waiting a moment, then marking continues...";draw();
          await sleep(20000);S.mk.wait="";draw();continue;
        }
        throw new Error(r.msg);
      }
      (out.results||[]).forEach(function(x){
        if(x&&x.q&&byId[x.q]&&x.verdict!=="unmarked")S.wres[x.q]=x;
      });
    }
    /* a blank answer simply scores 0 */
    S.ws.forEach(function(w){
      if(!S.wres[w.id]&&!String(S.wa[w.id]||"").trim()){
        S.wres[w.id]={q:w.id,marks:w.marks,score:0,verdict:"wrong",feedback:"You did not answer this question.",spelling:[],pass:""};
      }
    });
    if(S.ws.some(function(w){return !S.wres[w.id];}))throw new Error("Some answers could not be marked. Please try again.");
  }catch(x){
    S.mk.err=(x&&x.message)||"Marking failed. Please try again.";
    S.marking=false;draw();return;
  }
  S.marking=false;
  finishAll();
}
function submit(){
  if(S.marking)return;
  stopSpeak();
  if(!S.ws.length){finishAll();return;}
  var blanks=S.ws.filter(function(w){return !String(S.wa[w.id]||"").trim();}).length;
  if(blanks&&!confirm(blanks+" written question"+(blanks===1?" is":"s are")+" empty. Submit anyway?"))return;
  saveDraft();
  S.screen="marking";S.wres={};
  runMark();
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
    APP=app;css();applyTheme();
    try{if(typeof setHeader==="function")setHeader("<h2>AI Examination Room</h2>");}catch(x){}
    try{if(typeof setActiveNav==="function")setActiveNav("room");}catch(x){}
    if(S.screen!=="setup"&&(S.qs.length||S.ws.length)){draw();return;}
    if(S.screen==="read"&&S.rd.length){draw();return;}
    S.cat=null;
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
  custom:function(){S.screen="custom";draw();},
  customDone:function(){S.screen="setup";draw();},
  pv:function(btn){
    var p=btn&&btn.parentNode;if(!p)return;
    var all=p.querySelectorAll(".ch");
    for(var i=0;i<all.length;i++)all[i].className="ch";
    btn.className="ch sel";
  },
  set:function(k,v){
    var st=getSet();
    if(k==="reset"){st={wall:DEF.wall,acc:DEF.acc,size:DEF.size};}
    else if(k==="wall"&&WALLS[v])st.wall=v;
    else if(k==="acc"&&ACCS[v])st.acc=v;
    else if(k==="size"&&SIZES[v])st.size=v;
    writeJSON(SK,st);
    applyTheme();
    var y=0;try{y=window.pageYOffset||0;}catch(x){}
    draw();
    try{window.scrollTo(0,y);}catch(x){}
  },
  go:function(lv,cls,sub){
    var c=S.cat||{};
    if(!(c[lv]&&c[lv][cls]&&c[lv][cls][sub])){draw();return;}
    S.lv=lv;S.cls=cls;S.sub=sub;S.paper="";S.mix="";S.err="";draw();
  },
  pick:function(k,v){
    if(k==="count"){begin(parseInt(v,10)||10);return;}
    if(k==="paper"&&v){S.paper=S.papers.filter(function(p){return p.id===v;})[0]||"";S.err="";draw();return;}
    S[k]=v;
    if(k==="lv"){S.cls="";S.sub="";S.paper="";S.mix="";}
    if(k==="cls"){S.sub="";S.paper="";S.mix="";}
    if(k==="sub"){S.paper="";S.mix="";}
    S.err="";draw();
  },
  /* Back: one step back to where the student came from (paper > list of papers > subject > class > level) */
  up:function(){
    if(S.busy)return;
    if(S.paper)S.paper="";
    else if(S.mix)S.mix="";
    else if(S.sub)S.sub="";
    else if(S.cls)S.cls="";
    else if(S.lv)S.lv="";
    S.err="";draw();
  },
  start:function(){S.screen="setup";begin(9999);},
  read:async function(){
    if(S.busy)return;
    stopSpeak();
    if(S.screen==="quiz"){
      S.rd=S.items.map(function(it){
        if(it.t==="m"){var q=S.qs[it.k];return {q:q.q,img:q.img,o:q.opts};}
        var w=S.ws[it.k];return {w:true,kind:w.kind,marks:w.marks,q:w.q,img:w.img};
      });
      S.back="quiz";S.screen="read";draw();return;
    }
    S.busy=true;S.err="";draw();
    try{
      var raw=await collect(papersNow(),!!S.paper);
      if(!raw.m.length&&!raw.w.length)throw new Error("No questions found for this choice.");
      S.rd=raw.m.map(function(r){return {q:r.q,img:r.img,o:r.o};}).concat(raw.w.map(function(w){return {w:true,kind:w.kind,marks:w.marks,q:w.q,img:w.img};}));
      S.back="paper";S.screen="read";
    }catch(x){S.err="Could not load the questions. Check your internet and try again. ("+(x&&x.message||x)+")";}
    S.busy=false;draw();
  },
  unread:function(){S.screen=(S.back==="quiz"&&S.items.length)?"quiz":"setup";draw();},
  choose:function(k){var it=S.items[S.i];if(it&&it.t==="m"){S.sel[it.k]=k;draw();}},
  type:function(k,v,now){
    var w=S.ws[k];if(!w)return;
    S.wa[w.id]=String(v||"").slice(0,6000);
    if(dTimer)clearTimeout(dTimer);
    if(now)saveDraft();else dTimer=setTimeout(saveDraft,400);
  },
  step:function(d){
    var it=S.items[S.i];
    if(d>0){
      if(it.t==="m"&&S.sel[it.k]<0)return;
      if(S.i===S.items.length-1){submit();return;}
    }
    saveDraft();
    S.i=Math.max(0,Math.min(S.items.length-1,S.i+d));draw();
  },
  quit:function(){if(confirm("Stop this practice? Your multiple-choice answers will not be saved. Written answers stay as drafts on this phone."))window.EduRoom.home();},
  retryMark:function(){S.mk.err="";S.marking=false;runMark();},
  unmark:function(){S.marking=false;S.screen="quiz";S.i=Math.max(0,S.items.length-1);draw();},
  result:function(){stopSpeak();S.screen="result";draw();},
  review:function(){S.screen="review";draw();},
  again:function(){begin(S.qs.length);},
  home:function(){stopSpeak();saveDraft();S.screen="setup";S.qs=[];S.ws=[];S.items=[];S.wa={};S.wres={};S.marking=false;S.sel=[];S.res=null;S.exp={};S.lv="";S.cls="";S.sub="";S.paper="";S.mix="";S.rd=[];S.back="paper";S.err="";draw();},
  explain:explain,
  speak:function(i){if(S.exp[i]&&S.exp[i]!=="Thinking..."&&typeof window.speakText==="function")window.speakText(SPK+i,S.exp[i]);},
  report:report,
  zoom:zoom,
  version:"2.1",
  _t:{band:band,shuffle:shuffle,fmt:fmt,qf:qf,S:S,streak:streakInfo,weak:weakList,getSet:getSet}
};
})();
