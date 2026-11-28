/* EDU LIBRARY MW - Notepad v2.0
   Students write, search, pin and delete their own notes.
   Notes are saved on the phone (localStorage), separately for each signed-in username, and work without internet.
   It is opened from the bell (Notifications) panel. index.html loads this file on demand:
   #/notepad shows the list, #/notepad/<id> opens one note. */
(function(){
"use strict";
var KEY="edu_notepad_v1_";
var NOTE="\uD83D\uDCDD";            /* note emoji */
var PIN="\uD83D\uDCCC";             /* pin emoji */
var BIN="\uD83D\uDDD1\uFE0F";       /* bin emoji */
var TICK="\u2713";
var timer=null;
var cur=null; /* the note being edited: {n:note, dirty:bool} */

function log(e){if(window.eduLog)window.eduLog(e);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function who(){
  try{var u=window.EduAcct&&window.EduAcct.user&&window.EduAcct.user();return u?String(u).toLowerCase():"guest";}
  catch(e){log(e);return "guest";}
}
function load(){
  try{
    var r=localStorage.getItem(KEY+who());
    var a=r?JSON.parse(r):[];
    return Array.isArray(a)?a:[];
  }catch(e){log(e);return [];}
}
function save(list){
  try{localStorage.setItem(KEY+who(),JSON.stringify(list));return true;}
  catch(e){log(e);return false;}
}
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function idx(list,id){for(var i=0;i<list.length;i++){if(list[i]&&list[i].id===id)return i;}return -1;}
function fmt(ts){
  var d=new Date(ts);
  if(isNaN(d))return "";
  var n=new Date();
  try{
    if(d.toDateString()===n.toDateString())return "Today, "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    var o={day:"numeric",month:"short"};
    if(d.getFullYear()!==n.getFullYear())o.year="numeric";
    return d.toLocaleDateString("en-GB",o);
  }catch(e){log(e);return d.toDateString();}
}
function sorted(list){
  return list.slice().sort(function(a,b){
    if(!!a.pinned!==!!b.pinned)return a.pinned?-1:1;
    return (b.updated||0)-(a.updated||0);
  });
}

function css(){
  if(document.getElementById("enpStyle"))return;
  var s=document.createElement("style");
  s.id="enpStyle";
  s.textContent=
/* page */
".enp{padding:4px 0 90px;animation:enpIn .45s cubic-bezier(.2,.8,.2,1) both}"+
/* hero banner (same sunset colours as the level cards) */
".enp-hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;margin:4px 0 14px;padding:16px;border-radius:18px;color:#fff;border:1px solid rgba(255,214,140,.55);background:linear-gradient(135deg,#f25e1e,#c4482a 55%,#5b2156);box-shadow:0 0 22px rgba(249,184,31,.22)}"+
".enp-hero:after{content:'';position:absolute;top:0;bottom:0;left:0;width:45%;background:linear-gradient(110deg,transparent,rgba(255,255,255,.22),transparent);transform:translateX(-130%);animation:enpShine 5s ease-in-out 1.2s infinite}"+
".enp-hi{flex:none;width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:32px;line-height:1;background:rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.35);animation:enpFloat 3.2s ease-in-out infinite}"+
".enp-hero b{display:block;font-size:18px;text-shadow:0 1px 3px rgba(0,0,0,.35)}"+
".enp-hero small{display:block;margin-top:3px;font-size:12.5px;color:#ffe9c7}"+
/* search + new button */
".enp-top{display:flex;gap:10px;align-items:center;margin:0 0 14px}"+
".enp-s,.enp-t,.enp-b{width:100%;box-sizing:border-box;color:var(--ink);font-family:inherit;font-size:16px;outline:none;border:1px solid rgba(244,195,121,.3);background:rgba(255,255,255,.08);border-radius:14px;transition:border-color .2s ease,box-shadow .2s ease}"+
".enp-s::placeholder,.enp-t::placeholder,.enp-b::placeholder{color:var(--sub);opacity:.85}"+
".enp-s{flex:1;min-width:0;padding:12px 14px}"+
".enp-s:focus,.enp-t:focus,.enp-b:focus{border-color:#f9b81f;box-shadow:0 0 0 3px rgba(249,184,31,.22)}"+
".enp-new{flex:none;border:0;border-radius:14px;padding:12px 15px;font-size:14px;font-weight:800;color:#3a1238;background:linear-gradient(135deg,#f9b81f,#f77864);animation:enpGlow 2.8s ease-in-out infinite;transition:transform .15s ease}"+
".enp-new:active{transform:scale(.93)}"+
/* note cards */
".enp-c{display:block;width:100%;text-align:left;margin:0 0 10px;padding:13px 14px;border-radius:16px;border:1px solid rgba(244,195,121,.28);background:linear-gradient(135deg,rgba(249,184,31,.12),rgba(93,28,87,.85));color:inherit;font-family:inherit;box-shadow:0 0 16px rgba(249,184,31,.08);transition:transform .15s ease,box-shadow .2s ease}"+
".enp-c.in{opacity:0;animation:enpIn .5s cubic-bezier(.2,.8,.2,1) forwards}"+
".enp-c:active{transform:scale(.975);box-shadow:0 0 22px rgba(249,184,31,.35)}"+
".enp-c.pin{border-left:4px solid #f9b81f}"+
".enp-c b{display:block;font-size:15.5px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
".enp-c span{display:block;font-size:13.5px;color:var(--sub);line-height:1.4;max-height:2.8em;overflow:hidden}"+
".enp-c small{display:block;margin-top:7px;font-size:11.5px;color:var(--sub)}"+
/* empty state */
".enp-empty{text-align:center;padding:34px 12px 10px;color:var(--sub);font-size:14px}"+
".enp-empty i{display:block;font-style:normal;font-size:54px;line-height:1;margin-bottom:10px;animation:enpFloat 3s ease-in-out infinite}"+
".enp-empty small{display:block;margin-top:6px;font-size:12.5px}"+
".enp-foot{margin:14px 4px 0;text-align:center;font-size:12px;color:var(--sub)}"+
/* editor */
".enp-t{padding:13px 14px;font-size:19px;font-weight:700;margin-bottom:8px}"+
".enp-meta{display:flex;justify-content:space-between;gap:10px;margin:2px 4px 10px;font-size:12px;color:var(--sub)}"+
".enp-st.ok{color:#f9b81f;font-weight:700;animation:enpPop .45s ease both;display:inline-block}"+
".enp-b{padding:8px 14px 14px;line-height:28px;min-height:240px;resize:none;display:block;overflow:hidden;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 27px,rgba(249,184,31,.20) 27px,rgba(249,184,31,.20) 28px);background-position:0 8px;background-attachment:local}"+
".enp-row{display:flex;gap:10px;margin-top:14px}"+
".enp-row button{flex:1;padding:12px;border-radius:14px;border:1px solid rgba(244,195,121,.3);background:rgba(255,255,255,.08);color:inherit;font-size:14px;font-weight:700;font-family:inherit;transition:transform .15s ease,background .2s ease}"+
".enp-row button:active{transform:scale(.95)}"+
".enp-row button.on{color:#3a1238;border-color:#f9b81f;background:linear-gradient(135deg,#f9b81f,#f77864)}"+
".enp-row button.wig{animation:enpWig .5s ease}"+
".enp-row button.del{color:#ff9a8a}"+
/* delete box */
".enp-dlg{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(20,5,22,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:enpFade .2s ease both}"+
".enp-dlgb{width:min(320px,100%);border-radius:20px;padding:22px 18px 16px;text-align:center;background:linear-gradient(145deg,#5b2156,#2f102d);color:#fff;border:1px solid rgba(249,184,31,.45);box-shadow:0 14px 40px rgba(0,0,0,.45);animation:enpDlg .32s cubic-bezier(.2,1.3,.4,1) both}"+
".enp-dlgb i{display:block;font-style:normal;font-size:38px;line-height:1;margin-bottom:8px}"+
".enp-dlgb b{display:block;font-size:17px}"+
".enp-dlgb p{margin:8px 0 16px;font-size:13.5px;opacity:.85}"+
".enp-dlgb div{display:flex;gap:10px}"+
".enp-dlgb button{flex:1;padding:12px;border-radius:12px;border:0;font-size:14px;font-weight:800;font-family:inherit;transition:transform .15s ease}"+
".enp-dlgb button:active{transform:scale(.94)}"+
".enp-no{background:rgba(255,255,255,.16);color:#fff}"+
".enp-yes{background:linear-gradient(135deg,#f25e1e,#d63a2f);color:#fff}"+
/* light theme */
"body.light .enp-s,body.light .enp-t,body.light .enp-b{background:#fff;border-color:rgba(30,70,160,.22)}"+
"body.light .enp-c{background:#fff;border-color:rgba(30,70,160,.18);box-shadow:none}"+
"body.light .enp-row button{background:#fff;border-color:rgba(30,70,160,.22)}"+
"body.light .enp-row button.on{background:linear-gradient(135deg,#f9b81f,#f77864);border-color:#f9b81f}"+
"body.light .enp-st.ok{color:#c4482a}"+
/* animations */
"@keyframes enpIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}"+
"@keyframes enpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}"+
"@keyframes enpShine{0%{transform:translateX(-130%)}60%,100%{transform:translateX(330%)}}"+
"@keyframes enpGlow{0%,100%{box-shadow:0 0 0 rgba(249,184,31,0)}50%{box-shadow:0 0 16px rgba(249,184,31,.65)}}"+
"@keyframes enpPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1)}}"+
"@keyframes enpWig{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg) scale(1.05)}55%{transform:rotate(5deg) scale(1.05)}80%{transform:rotate(-2deg)}}"+
"@keyframes enpFade{from{opacity:0}to{opacity:1}}"+
"@keyframes enpDlg{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}"+
"@media (prefers-reduced-motion:reduce){.enp,.enp *,.enp-dlg,.enp-dlg *{animation:none!important;transition:none!important}.enp-c.in{opacity:1!important}}";
  document.head.appendChild(s);
}

function head(title,backHash){
  if(typeof window.setHeader==="function"){
    window.setHeader('<button class="back" onclick="location.hash=\''+backHash+'\'">\u2190</button><h2>'+NOTE+' '+esc(title)+'</h2>');
  }
  if(typeof window.setActiveNav==="function")window.setActiveNav("library");
}

/* ---------- list of notes ---------- */
function openList(app){
  css();
  head("Notepad","#/library");
  var total=load().length;
  app.innerHTML=
    '<div class="enp">'+
      '<div class="enp-hero"><span class="enp-hi">'+NOTE+'</span><div><b>My Notepad</b><small>'+
        (total?total+(total===1?" note":" notes")+" saved on this phone":"Write it down. Remember it.")+'</small></div></div>'+
      '<div class="enp-top"><input id="enpS" class="enp-s" type="search" placeholder="Search notes" autocomplete="off" aria-label="Search notes">'+
      '<button type="button" id="enpNew" class="enp-new">+ New note</button></div>'+
      '<div id="enpL"></div>'+
      '<p class="enp-foot">Your notes are saved on this phone.</p>'+
    '</div>';
  var box=document.getElementById("enpL");
  var inp=document.getElementById("enpS");
  var first=true;
  function draw(){
    var q=String(inp.value||"").trim().toLowerCase();
    var all=load();
    var rows=sorted(all).filter(function(n){
      return !q||String(n.title||"").toLowerCase().indexOf(q)>-1||String(n.body||"").toLowerCase().indexOf(q)>-1;
    });
    if(!rows.length){
      box.innerHTML=all.length
        ?'<div class="enp-empty"><i>'+NOTE+'</i>No notes match your search.</div>'
        :'<div class="enp-empty"><i>'+NOTE+'</i>No notes yet<small>Tap New note to write your first note.</small></div>';
      return;
    }
    box.innerHTML=rows.map(function(n,k){
      var prev=String(n.body||"").replace(/\s+/g," ").trim().slice(0,140);
      var anim=first?' in" style="animation-delay:'+Math.min(k,8)*60+'ms':'';
      return '<button type="button" class="enp-c'+(n.pinned?' pin':'')+anim+'" data-id="'+esc(n.id)+'"><b>'+esc(n.title||"Untitled")+'</b>'+
        '<span>'+esc(prev||"No text")+'</span>'+
        '<small>'+(n.pinned?PIN+' ':'')+esc(fmt(n.updated))+'</small></button>';
    }).join("");
    first=false;
  }
  inp.addEventListener("input",draw);
  box.addEventListener("click",function(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest(".enp-c"):null;
    if(b)location.hash="#/notepad/"+b.getAttribute("data-id");
  });
  document.getElementById("enpNew").addEventListener("click",function(){location.hash="#/notepad/"+genId();});
  draw();
}

/* ---------- one note ---------- */
function setSt(text,ok){
  var st=document.getElementById("enpSt");
  if(!st)return;
  st.textContent=text;
  st.className="enp-st";
  if(ok){void st.offsetWidth;st.className="enp-st ok";} /* restart the little pop */
}
function persist(){
  if(!cur)return true;
  var n=cur.n;
  var list=load();
  var i=idx(list,n.id);
  var empty=!String(n.title||"").trim()&&!String(n.body||"").trim();
  if(empty&&i<0)return true; /* a new note with nothing written is not saved */
  n.updated=Date.now();
  if(i>=0)list[i]=n;else list.push(n);
  return save(list);
}
function flush(){
  if(timer){clearTimeout(timer);timer=null;}
  if(!cur||!cur.dirty)return;
  var ok=persist();
  cur.dirty=!ok;
  setSt(ok?TICK+" Saved":"Could not save. Your phone storage may be full.",ok);
}
function later(){
  if(timer)clearTimeout(timer);
  setSt("Saving...",false);
  timer=setTimeout(flush,500);
}
function grow(t){t.style.height="auto";t.style.height=Math.max(t.scrollHeight,240)+"px";}

function openEditor(app,id){
  css();
  var list=load();
  var i=idx(list,id);
  var n;
  if(i>=0){n=list[i];}
  else{
    if(!/^[a-z0-9]{4,24}$/.test(String(id))){location.hash="#/notepad";return;}
    n={id:id,title:"",body:"",pinned:false,created:Date.now(),updated:Date.now()};
  }
  cur={n:n,dirty:false};
  head("Note","#/notepad");
  app.innerHTML=
    '<div class="enp">'+
      '<input id="enpT" class="enp-t" type="text" maxlength="120" placeholder="Title" autocomplete="off" aria-label="Note title">'+
      '<div class="enp-meta"><span id="enpSt" class="enp-st">'+(i>=0?TICK+" Saved":"")+'</span><span id="enpW"></span></div>'+
      '<textarea id="enpB" class="enp-b" maxlength="20000" placeholder="Write your note here..." aria-label="Note text"></textarea>'+
      '<div class="enp-row"><button type="button" id="enpP"></button><button type="button" id="enpD" class="del">'+BIN+' Delete</button></div>'+
    '</div>';
  var t=document.getElementById("enpT"),b=document.getElementById("enpB"),p=document.getElementById("enpP"),w=document.getElementById("enpW");
  t.value=n.title||"";
  b.value=n.body||"";
  function words(){
    var c=String(b.value||"").trim();
    var k=c?c.split(/\s+/).length:0;
    w.textContent=k+(k===1?" word":" words");
  }
  function pin(){p.textContent=PIN+(n.pinned?" Unpin":" Pin to top");p.className=n.pinned?"on":"";}
  pin();words();grow(b);
  t.addEventListener("input",function(){n.title=t.value;cur.dirty=true;later();});
  b.addEventListener("input",function(){n.body=b.value;cur.dirty=true;grow(b);words();later();});
  t.addEventListener("blur",flush);
  b.addEventListener("blur",flush);
  p.addEventListener("click",function(){
    n.pinned=!n.pinned;cur.dirty=true;pin();flush();
    p.classList.remove("wig");void p.offsetWidth;p.classList.add("wig");
  });
  document.getElementById("enpD").addEventListener("click",function(){confirmDelete(app,n.id);});
  if(i<0){try{t.focus();}catch(e){log(e);}}
}

function confirmDelete(app,id){
  var old=document.getElementById("enpDlg");
  if(old)old.remove();
  var w=document.createElement("div");
  w.id="enpDlg";
  w.className="enp-dlg";
  w.innerHTML='<div class="enp-dlgb"><i>'+BIN+'</i><b>Delete this note?</b><p>You cannot get it back after you delete it.</p><div><button type="button" class="enp-no">Cancel</button><button type="button" class="enp-yes">Delete</button></div></div>';
  app.appendChild(w);
  w.addEventListener("click",function(ev){if(ev.target===w)w.remove();});
  w.querySelector(".enp-no").addEventListener("click",function(){w.remove();});
  w.querySelector(".enp-yes").addEventListener("click",function(){
    if(timer){clearTimeout(timer);timer=null;}
    cur=null;
    var list=load();
    var i=idx(list,id);
    if(i>=0){list.splice(i,1);save(list);}
    w.remove();
    location.hash="#/notepad";
  });
}

/* keep what was typed when the student leaves the page or the app */
window.addEventListener("hashchange",flush);
window.addEventListener("pagehide",flush);
document.addEventListener("visibilitychange",function(){if(document.hidden)flush();});

window.EduNotepad={
  open:function(app,id){
    flush();
    if(id)openEditor(app,String(id));else openList(app);
  }
};
})();
