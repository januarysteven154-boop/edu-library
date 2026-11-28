/* EDU LIBRARY MW - Notepad v1.0
   Students write, search, pin and delete their own notes.
   Notes are saved on the phone (localStorage), separately for each signed-in username, and work without internet.
   index.html opens this file on demand: #/notepad shows the list, #/notepad/<id> opens one note. */
(function(){
"use strict";
var KEY="edu_notepad_v1_";
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
".enp{padding:4px 0 90px}"+
".enp-top{display:flex;gap:10px;align-items:center;margin:6px 0 14px}"+
".enp-s,.enp-t,.enp-b{width:100%;box-sizing:border-box;background:rgba(127,127,127,.12);border:1px solid var(--line);border-radius:12px;color:var(--ink);font-family:inherit;font-size:16px;outline:none}"+
".enp-s{flex:1;min-width:0;padding:12px 14px}"+
".enp-s:focus,.enp-t:focus,.enp-b:focus{border-color:#f9b81f}"+
".enp-new{flex:none;border:0;border-radius:12px;padding:12px 14px;font-size:14px;font-weight:700;color:#2b0f2f;background:linear-gradient(135deg,#f9b81f,#f25e1e)}"+
".enp-c{display:block;width:100%;text-align:left;margin:0 0 10px;padding:13px 14px;border-radius:14px;border:1px solid var(--line);background:rgba(127,127,127,.12);color:inherit;font-family:inherit}"+
".enp-c b{display:block;font-size:15.5px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
".enp-c span{display:block;font-size:13.5px;color:var(--sub);line-height:1.4;max-height:2.8em;overflow:hidden}"+
".enp-c small{display:block;margin-top:7px;font-size:11.5px;color:var(--sub)}"+
".enp-c small em{font-style:normal;color:#f9b81f;font-weight:700;margin-right:6px}"+
".enp-foot{margin:14px 4px 0;text-align:center;font-size:12px;color:var(--sub)}"+
".enp-t{padding:13px 14px;font-size:18px;font-weight:700;margin-bottom:8px}"+
".enp-b{padding:13px 14px;line-height:1.55;min-height:220px;resize:none;display:block;overflow:hidden}"+
".enp-meta{display:flex;justify-content:space-between;gap:10px;margin:2px 4px 10px;font-size:12px;color:var(--sub)}"+
".enp-row{display:flex;gap:10px;margin-top:14px}"+
".enp-row button{flex:1;padding:12px;border-radius:12px;border:1px solid var(--line);background:rgba(127,127,127,.12);color:inherit;font-size:14px;font-weight:600;font-family:inherit}"+
".enp-row button.on{border-color:#f9b81f;color:#f9b81f}"+
".enp-row button.del{color:#ff7a7a}"+
".enp-dlg{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.5)}"+
".enp-dlgb{width:min(320px,100%);border-radius:18px;padding:20px 18px 16px;background:#2e1438;color:#fff;border:1px solid rgba(249,184,31,.35)}"+
".enp-dlgb b{display:block;font-size:17px}"+
".enp-dlgb p{margin:8px 0 16px;font-size:14px;opacity:.85}"+
".enp-dlgb div{display:flex;gap:10px}"+
".enp-dlgb button{flex:1;padding:12px;border-radius:12px;border:0;font-size:14px;font-weight:700;font-family:inherit}"+
".enp-no{background:rgba(255,255,255,.14);color:#fff}"+
".enp-yes{background:#e5484d;color:#fff}";
  document.head.appendChild(s);
}

function head(title,backHash){
  if(typeof window.setHeader==="function"){
    window.setHeader('<button class="back" onclick="location.hash=\''+backHash+'\'">\u2190</button><h2>'+esc(title)+'</h2>');
  }
  if(typeof window.setActiveNav==="function")window.setActiveNav("library");
}

/* ---------- list of notes ---------- */
function openList(app){
  css();
  head("Notepad","#/library");
  app.innerHTML=
    '<div class="enp">'+
      '<div class="enp-top"><input id="enpS" class="enp-s" type="search" placeholder="Search notes" autocomplete="off" aria-label="Search notes">'+
      '<button type="button" id="enpNew" class="enp-new">+ New note</button></div>'+
      '<div id="enpL"></div>'+
      '<p class="enp-foot">Your notes are saved on this phone.</p>'+
    '</div>';
  var box=document.getElementById("enpL");
  var inp=document.getElementById("enpS");
  function draw(){
    var q=String(inp.value||"").trim().toLowerCase();
    var all=load();
    var rows=sorted(all).filter(function(n){
      return !q||String(n.title||"").toLowerCase().indexOf(q)>-1||String(n.body||"").toLowerCase().indexOf(q)>-1;
    });
    if(!rows.length){
      box.innerHTML='<div class="empty">'+(all.length?"No notes match your search.":"No notes yet. Tap New note to write your first note.")+'</div>';
      return;
    }
    box.innerHTML=rows.map(function(n){
      var prev=String(n.body||"").replace(/\s+/g," ").trim().slice(0,140);
      return '<button type="button" class="enp-c" data-id="'+esc(n.id)+'"><b>'+esc(n.title||"Untitled")+'</b>'+
        '<span>'+esc(prev||"No text")+'</span>'+
        '<small>'+(n.pinned?'<em>Pinned</em>':'')+esc(fmt(n.updated))+'</small></button>';
    }).join("");
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
  var st=document.getElementById("enpSt");
  if(st)st.textContent=ok?"Saved":"Could not save. Your phone storage may be full.";
}
function later(){
  if(timer)clearTimeout(timer);
  var st=document.getElementById("enpSt");
  if(st)st.textContent="Saving...";
  timer=setTimeout(flush,500);
}
function grow(t){t.style.height="auto";t.style.height=Math.max(t.scrollHeight,220)+"px";}

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
      '<div class="enp-meta"><span id="enpSt">'+(i>=0?"Saved":"")+'</span><span id="enpW"></span></div>'+
      '<textarea id="enpB" class="enp-b" maxlength="20000" placeholder="Write your note here..." aria-label="Note text"></textarea>'+
      '<div class="enp-row"><button type="button" id="enpP"></button><button type="button" id="enpD" class="del">Delete</button></div>'+
    '</div>';
  var t=document.getElementById("enpT"),b=document.getElementById("enpB"),p=document.getElementById("enpP"),w=document.getElementById("enpW");
  t.value=n.title||"";
  b.value=n.body||"";
  function words(){
    var c=String(b.value||"").trim();
    var k=c?c.split(/\s+/).length:0;
    w.textContent=k+(k===1?" word":" words");
  }
  function pin(){p.textContent=n.pinned?"Unpin":"Pin to top";p.className=n.pinned?"on":"";}
  pin();words();grow(b);
  t.addEventListener("input",function(){n.title=t.value;cur.dirty=true;later();});
  b.addEventListener("input",function(){n.body=b.value;cur.dirty=true;grow(b);words();later();});
  t.addEventListener("blur",flush);
  b.addEventListener("blur",flush);
  p.addEventListener("click",function(){n.pinned=!n.pinned;cur.dirty=true;pin();flush();});
  document.getElementById("enpD").addEventListener("click",function(){confirmDelete(app,n.id);});
  if(i<0){try{t.focus();}catch(e){log(e);}}
}

function confirmDelete(app,id){
  var old=document.getElementById("enpDlg");
  if(old)old.remove();
  var w=document.createElement("div");
  w.id="enpDlg";
  w.className="enp-dlg";
  w.innerHTML='<div class="enp-dlgb"><b>Delete this note?</b><p>You cannot get it back after you delete it.</p><div><button type="button" class="enp-no">Cancel</button><button type="button" class="enp-yes">Delete</button></div></div>';
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
