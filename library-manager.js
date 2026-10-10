/* Edu Library - AI Library Manager v0.9: the AI sorts each PDF. 80% sure or more = uploads by itself. Below 80% = waits for your Approve. Stops cleanly when the AI limit is reached. */
(function(){
"use strict";
var URL_CLASSIFY="https://edu-ai-backend-three.vercel.app/api/book-link?classify=1";
var GAP_MS=5500,UP_GAP_MS=7000,MAX_FILES=30,TAIL=1400,HEAD=5500,MAX_READ=15,ENOUGH=1500;
var AUTO_MIN=0.80; /* at or above this, a file uploads without asking you */
/* state is kept on window so it survives a screen redraw */
var ST=window.__eduLM=window.__eduLM||{items:[],bookServer:"A"};
if(ST.auto===undefined){ST.auto=true;try{ST.auto=localStorage.getItem("lm_auto")!=="0";}catch(e){}}
var items=ST.items,running=false,uploading=false,stopNow=false,bookServer=ST.bookServer;
try{localStorage.removeItem("lmdbg");}catch(e){}

function $(id){return document.getElementById(id);}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
function E(s){return typeof esc==="function"?esc(s):String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(x){return ("0"+x.toString(16)).slice(-2);}).join("");}
function mb(n){return (n/1048576).toFixed(1)+" MB";}
function clean(s){return String(s||"").replace(/[\\\/]+/g,"-").replace(/~+/g,"-").replace(/\s+/g," ").trim();}
function baseName(n){return String(n||"").replace(/\.pdf$/i,"").replace(/_+/g," ").trim();}
function pct(x){return Math.round((x||0)*100)+"%";}
async function token(){
  var s=await sb.auth.getSession();
  var t=s&&s.data&&s.data.session&&s.data.session.access_token;
  if(!t)throw new Error("Please log out and log in as admin again.");
  return t;
}

/* ---------- reading the PDF ---------- */
async function readPdf(file){
  var buf=await file.arrayBuffer(),hash="";
  try{if(window.crypto&&crypto.subtle)hash=hex(await crypto.subtle.digest("SHA-256",buf));}catch(e){}
  var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
  var n=pdf.numPages,head="",tail="",p,maxp=Math.min(n,MAX_READ);
  function pageText(num){return pdf.getPage(num).then(function(g){return g.getTextContent();}).then(function(t){return "\n[Page "+num+"]\n"+t.items.map(function(x){return x.str;}).join(" ");});}
  for(p=1;p<=maxp;p++){
    try{head+=await pageText(p);}catch(e){}
    if(p>=3&&head.replace(/\[Page \d+\]|\s/g,"").length>=ENOUGH)break;
  }
  if(n>p){try{tail=await pageText(n);}catch(e){}}
  try{pdf.destroy();}catch(e){}
  head=head.replace(/[ \t]+/g," ").trim();tail=tail.replace(/[ \t]+/g," ").trim();
  var excerpt=(head.slice(0,HEAD)+(tail?"\n"+tail.slice(0,TAIL):"")).slice(0,7000);
  var readable=excerpt.replace(/\[Page \d+\]|\s/g,"").length>=80;
  return {pages:n,hash:hash,excerpt:excerpt,readable:readable,read:p>maxp?maxp:p};
}
/* limit:true from the server means the AI allowance is used up: do NOT retry, stop the batch */
async function classify(file,info){
  var tok=await token();
  for(var a=0;a<2;a++){
    var r=await fetch(URL_CLASSIFY,{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify({filename:file.name,pages:info.pages,excerpt:info.excerpt})});
    var j={};try{j=await r.json();}catch(e){}
    if(r.status===429&&j&&j.limit){var le=new Error("AI limit reached");le.limit=true;throw le;}
    if(r.status===429&&a===0){await wait(20000);continue;}
    if(!r.ok)throw new Error(j.error||("Server answered "+r.status));
    return j;
  }
}

/* ---------- short titles ---------- */
/* subject names and the short forms people use for them (bio, phys, chem, ...) */
var SUBJMAP=[
["Further Mathematics","further\\s*(?:mathematics|maths|math)"],
["Additional Mathematics","add(?:itional)?\\s*(?:mathematics|maths|math)"],
["Agricultural Science","agricultural\\s*science|agric\\s*sci\\w*"],
["Agriculture","agriculture|agric|agri|agr"],
["Computer Studies","computer\\s*studies|computer|comp|ict"],
["Civic Education","civic\\s*education|civic"],
["Bible Knowledge","bible\\s*knowledge|bible"],
["Social Studies","social\\s*studies|social|soc\\s*stud\\w*"],
["Life Skills","life\\s*skills"],
["Business Studies","business\\s*studies|business|bus\\s*stud\\w*"],
["Home Economics","home\\s*economics|home\\s*econ?"],
["Physical Science","physical\\s*science|phys\\s*sci\\w*"],
["Physics","physics|physic|physi|phys|phy|fizz\\w*|fiz"],
["Chemistry","chemistry|chemistr|chemis|chemi|chem|chm"],
["Biology","biology|biolog|biolo|biol|bios|bio"],
["Mathematics","mathematics|maths|math"],
["English","english|engl|eng"],
["Chichewa","chichewa|chiche|chich"],
["Economics","economics|econs|econ"],
["Accounting","accounting|account|acc"],
["Government","government|govt|gov"],
["Literature","literature|lit"],
["Geography","geography|geog|geo"],
["History","history|hist"],
["Commerce","commerce"],
["French","french"],
["Yoruba","yoruba"],["Igbo","igbo"],["Hausa","hausa"]
];
function findSubject(txt){
  txt=String(txt||"");
  for(var i=0;i<SUBJMAP.length;i++){
    if(new RegExp("(^|[^a-z])(?:"+SUBJMAP[i][1]+")(?![a-z])","i").test(txt))return SUBJMAP[i][0];
  }
  return "";
}
/* when the AI cannot read the file (scanned PDF), guess from the file name only */
function guessFromName(name){
  var t=baseName(name),g={};
  g.subject=findSubject(t);
  g.docType=/(^|[^a-z])(?:pp?\s*[1-3]|paper|exam\w*|mock|maneb|msce|jce|pslce|past\s*papers?)(?![a-z])/i.test(t)?"exam":"book";
  if(/(^|[^a-z])msce(?![a-z])/i.test(t)){g.level="Secondary";g.cls0="Form 4";g.body="MSCE";}
  else if(/(^|[^a-z])jce(?![a-z])/i.test(t)){g.level="Secondary";g.cls0="Form 2";g.body="JCE";}
  else if(/pslce|(^|[^a-z])(?:std|standard)\s*8(?![0-9])/i.test(t)){g.level="Primary";g.cls0="Standard 8";g.body="MANEB";}
  return g;
}
function shortTitle(title,name,docType,subject){
  var base=baseName(name),sub=findSubject(subject)||findSubject(title)||findSubject(base);
  if(!sub&&subject)sub=String(subject).split(/\s+/).slice(0,3).join(" ");
  if(!sub)return String(title||base).split(/\s+/).slice(0,4).join(" ");
  if(docType!=="exam")return sub+" Book";
  var src=(title||"")+" "+base;
  var pm=src.match(/paper[\s_-]*(\d|one|two|three|iii|ii|i)\b/i)||src.match(/\bp{1,2}[\s-]?(iii|ii|i|[1-3])\b/i);
  var map={one:1,two:2,three:3,i:1,ii:2,iii:3},k=pm?pm[1].toLowerCase():"",num=pm?(map[k]||k):"";
  var ym=src.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/);
  return sub+(pm?" Paper "+num:" Examination")+(ym?" ("+ym[1]+")":"");
}

/* ---------- the editable proposal ---------- */
function newEdit(r,name){
  r=r?Object.assign({},r):{};
  if(!(r.level||r.docType||r.cls0||r.title)){var g=guessFromName(name);r={docType:g.docType,level:g.level,cls0:g.cls0,body:g.body,subject:g.subject};}
  else if(!(r.subject||r.subjectSuggestion))r.subject=findSubject(baseName(name));
  var lv=LEVELS[r.level]?r.level:"Primary";
  var cl=LEVELS[lv].classes.indexOf(r.cls0)>=0?r.cls0:"";
  var bd=EXAM_BODIES[cl]||null,body="";
  if(bd)body=bd.indexOf(r.body)>=0?r.body:(bd.length===1?bd[0]:"");
  var tier=TIERS.some(function(t){return t.k===r.tier;})?r.tier:"";
  var dt=r.docType==="exam"?"exam":"book";
  var subj=r.subject||r.subjectSuggestion||"";
  return {docType:dt,level:lv,cls0:cl,tier:tier,body:body,title:shortTitle(r.title,name,dt,subj),subject:subj};
}
function problems(it){
  var e=it.edit,p=[];
  if(!e)return ["Fill in the details first"];
  if(!clean(e.title))p.push("title is empty");
  if(!LEVELS[e.level]||LEVELS[e.level].classes.indexOf(e.cls0)<0)p.push("choose the class");
  if(e.docType==="exam"){
    if(!clean(e.subject))p.push("subject is empty");
    if(EXAM_BODIES[e.cls0]&&EXAM_BODIES[e.cls0].indexOf(e.body)<0)p.push("choose the examination");
  }else if(e.level==="Tertiary"&&!TIERS.some(function(t){return t.k===e.tier;}))p.push("choose the book level");
  return p;
}
function curRec(it){
  var e=it.edit;if(!e)return null;
  var cls=e.cls0+(e.docType==="exam"?TIER_SEP+"Exam"+(e.body?TIER_SEP+e.body:""):(e.level==="Tertiary"&&e.tier?TIER_SEP+e.tier:""));
  return {title:e.title,subject:e.docType==="exam"?e.subject:e.title,level:e.level,class:cls};
}
function checkDuplicates(){
  var lib={},seen={},keys={};
  try{booksCache.forEach(function(b){lib[admDupKey(b)]=b.title;});}catch(e){}
  items.forEach(function(it){
    it.dups=[];
    var rec=it.edit?curRec(it):null,k="";
    if(rec&&rec.title&&it.edit.cls0){try{k=admDupKey(rec);}catch(e){k="";}}
    if(it.up!=="done"){
      if(it.hash&&seen[it.hash]!==undefined)it.dups.push("Same file as #"+(seen[it.hash]+1)+" in this batch");
      if(k&&lib[k]!==undefined)it.dups.push("Looks already in the library: "+lib[k]);
      if(k&&keys[k]!==undefined&&it.dec!=="rejected")it.dups.push("Same title and class as #"+(keys[k]+1)+" in this batch");
    }
    if(it.hash&&seen[it.hash]===undefined)seen[it.hash]=it.i;
    if(k&&it.dec!=="rejected"&&keys[k]===undefined)keys[k]=it.i;
  });
}

/* ---------- is the AI sure enough to go on its own? ---------- */
function sure(it){
  var p=it.result;
  return !!(it.status==="done"&&it.edit&&p&&p.confidence>=AUTO_MIN&&!p.needsReview&&!(p.flags&&p.flags.length)&&!it.dups.length&&!problems(it).length);
}
function whyNot(it){
  var p=it.result,w=[];
  if(!p||it.status!=="done")return "";
  if(!(p.confidence>=AUTO_MIN))w.push("AI is only "+pct(p.confidence)+" sure (below "+pct(AUTO_MIN)+")");
  if(p.needsReview||(p.flags&&p.flags.length))w.push("the AI flagged something");
  if(it.dups.length)w.push("possible duplicate");
  var pr=problems(it);if(pr.length)w.push(pr.join(", "));
  return w.join("; ");
}
function autoCheck(it){
  if(!ST.auto||it.dec!=="pending"||it.up||it.dec==="rejected")return false;
  checkDuplicates();
  if(!sure(it))return false;
  it.dec="approved";it.auto=true;return true;
}

/* ---------- drawing ---------- */
function opts(list,val,blank){
  return (blank?"<option value=''>— choose —</option>":"")+list.map(function(o){return "<option value=\""+E(o[0])+"\""+(o[0]===val?" selected":"")+">"+E(o[1])+"</option>";}).join("");
}
function selH(i,f,list,val,blank,dis){return "<select"+(dis?" disabled":"")+" onchange=\"EduLibraryManager.set("+i+",'"+f+"',this.value)\">"+opts(list,val,blank)+"</select>";}
function inpH(i,f,val,dis){return "<input"+(dis?" disabled":"")+" value=\""+E(val)+"\" oninput=\"EduLibraryManager.set("+i+",'"+f+"',this.value)\">";}
function fld(label,html){return "<div class='field' style='margin:0 0 8px'><label>"+label+"</label>"+html+"</div>";}
function btn(label,call,bg){return "<button type='button' class='admchip' style='flex:1;padding:10px;font-size:13.5px"+(bg?";background:"+bg+";color:#fff;border-color:"+bg:"")+"' onclick=\""+call+"\">"+label+"</button>";}
function destText(it){
  var e=it.edit;if(!e)return "";
  var p=[LEVELS[e.level]?LEVELS[e.level].label:e.level,e.cls0||"?"];
  if(e.docType==="exam"){if(e.body)p.push(e.body);p.push(clean(e.subject)||"?");var C=srv("C");return p.join(" › ")+" · Examinations · "+(C?C.name:"Server C");}
  if(e.level==="Tertiary")p.push(e.tier||"?");
  var S=srv(bookServer);return p.join(" › ")+" · Books · "+(S?S.name:"?");
}
function editH(it){
  var e=it.edit,i=it.i,dis=it.dec==="approved"||!!it.up,L=Object.keys(LEVELS).map(function(k){return [k,LEVELS[k].label];});
  var cls=(LEVELS[e.level]?LEVELS[e.level].classes:[]).map(function(c){return [c,c];});
  var h="<div class='row2' style='margin-top:8px'>"
    +fld("Type",selH(i,"docType",[["book","Book"],["exam","Exam"]],e.docType,false,dis))
    +fld("Level",selH(i,"level",L,e.level,false,dis))+"</div>"
    +"<div class='row2'>"+fld(e.level==="Tertiary"?"Course":"Class",selH(i,"cls0",cls,e.cls0,true,dis));
  if(e.docType==="exam"&&EXAM_BODIES[e.cls0])h+=fld("Examination",selH(i,"body",EXAM_BODIES[e.cls0].map(function(b){return [b,b];}),e.body,true,dis));
  else if(e.docType==="book"&&e.level==="Tertiary")h+=fld("Book level",selH(i,"tier",TIERS.map(function(t){return [t.k,t.k];}),e.tier,true,dis));
  else h+="<div></div>";
  h+="</div>"+fld("Title",inpH(i,"title",e.title,dis));
  if(e.docType==="exam")h+=fld("Subject",inpH(i,"subject",e.subject,dis));
  return h+"<div style='font-size:12.5px;color:var(--sub);margin:2px 0 8px'>Goes to: <b>"+E(destText(it))+"</b></div>";
}
function fullCard(it){
  var p=it.result,c="#888",h="",i=it.i;
  if(it.dec==="rejected")c="#777";
  if(it.status==="err"){c="#d9534f";h+="<div style='color:#d9534f;margin-top:4px'>Problem: "+E(it.err)+"</div>";}
  else if(it.status==="wait")h+="<div style='margin-top:4px'>Waiting…</div>";
  else if(it.status==="paused"){c="#e0a030";h+="<div style='color:#e0a030;margin-top:4px'>Paused — the AI limit was reached. Not checked yet.</div>";}
  else if(it.status==="work")h+="<div style='margin-top:4px'>Reading and asking AI…</div>";
  else if(it.status==="noText"){c="#e0a030";h+="<div style='color:#e0a030;margin-top:4px'>No readable text (maybe a scanned PDF).</div>";}
  else if(it.status==="done"&&p){
    c=it.dec==="rejected"?"#777":(sure(it)?"#2FA36B":"#e0a030");
    h+="<div style='margin-top:4px'>AI confidence: <b>"+pct(p.confidence)+"</b> · "+E(it.provider||"")+"</div>";
    (p.flags||[]).forEach(function(f){h+="<div style='color:#e0a030;margin-top:3px'>⚠ "+E(f)+"</div>";});
    if(p.reasons&&p.reasons.length)h+="<div style='color:var(--sub);margin-top:4px;font-size:12px'>"+E(p.reasons.slice(0,2).join(" · "))+"</div>";
  }
  if(!it.edit&&(it.status==="noText"||it.status==="err"))h+="<div style='display:flex;margin-top:8px'>"+btn("Fill in by hand","EduLibraryManager.hand("+i+")")+"</div>";
  if(it.edit){
    h+=editH(it);
    if(it.up!=="done")it.dups.forEach(function(f){h+="<div style='color:#d9534f;margin-bottom:4px'>⛔ "+E(f)+"</div>";});
    if(it.msg)h+="<div style='color:#d9534f;margin-bottom:6px'>"+E(it.msg)+"</div>";
    if(it.up==="done"){c="#2FA36B";h+="<div style='color:#2FA36B;font-weight:700'>✓ Uploaded"+(it.auto?" automatically":"")+"</div>";}
    else if(it.up==="uploading")h+="<div style='color:var(--sub)'>Uploading…</div>";
    else if(it.up==="err")h+="<div style='color:#d9534f;margin-bottom:6px'>Upload failed: "+E(it.upErr)+"</div><div style='display:flex'>"+btn("Try again","EduLibraryManager.retry("+i+")")+"</div>";
    else if(it.dec==="approved")h+="<div style='display:flex;gap:8px;align-items:center'><b style='color:#2FA36B;flex:1'>✓ "+(it.auto?"Auto-approved":"Approved")+" — uploading soon</b>"+btn("Undo","EduLibraryManager.decide("+i+",'pending')")+"</div>";
    else if(it.dec==="rejected")h+="<div style='display:flex;gap:8px;align-items:center'><b style='color:#d9534f;flex:1'>✗ Rejected — will not be uploaded</b>"+btn("Undo","EduLibraryManager.decide("+i+",'pending')")+"</div>";
    else{
      var wn=whyNot(it);
      if(wn)h+="<div style='color:#e0a030;margin-bottom:6px'>Needs your OK: "+E(wn)+"</div>";
      h+="<div style='display:flex;gap:8px'>"+btn("✅ Approve","EduLibraryManager.decide("+i+",'approved')","#2FA36B")+btn("❌ Reject","EduLibraryManager.decide("+i+",'rejected')","#d9534f")+"</div>";
    }
  }
  if(it.edit)h+="<div style='display:flex;margin-top:8px'>"+btn("▲ Close details","EduLibraryManager.toggle("+i+")")+"</div>";
  return "<div style='border:1px solid var(--line);border-left:5px solid "+c+";border-radius:9px;padding:10px 12px;margin:0 0 10px;font-size:13px;word-break:break-word'>"
    +"<div style='color:var(--sub);font-size:12px'>#"+(i+1)+" · "+E(it.name)+" · "+mb(it.size)+(it.pages?" · "+it.pages+" pages"+(it.read?" (read "+it.read+")":""):"")+"</div>"+h+"</div>";
}
function colorOf(it){
  if(it.up==="done")return "#2FA36B";
  if(it.up==="err"||it.status==="err")return "#d9534f";
  if(it.dec==="rejected")return "#777";
  if(it.status==="noText"||it.status==="paused")return "#e0a030";
  if(it.status==="done"&&it.result)return (it.dec==="approved"||sure(it))?"#2FA36B":"#e0a030";
  return "#888";
}
function isOpen(it){return it.open===true||(it.open===undefined&&items.length===1);}
function miniBtn(label,call,bg){return "<button type='button' class='admchip' style='flex:1;padding:8px 6px;font-size:13px"+(bg?";background:"+bg+";color:#fff;border-color:"+bg:"")+"' onclick=\""+call+"\">"+label+"</button>";}
function miniCard(it){
  var i=it.i,e=it.edit,p=it.result,h="";
  var head="<div style='color:var(--sub);font-size:12px'>#"+(i+1)+" · "+E(it.name)+" · "+mb(it.size)+(it.pages?" · "+it.pages+" pages":"")+"</div>";
  if(!e){
    if(it.status==="err")h+="<div style='color:#d9534f;margin-top:3px'>Problem: "+E(it.err)+"</div>";
    else if(it.status==="wait")h+="<div style='margin-top:3px'>Waiting…</div>";
    else if(it.status==="paused")h+="<div style='color:#e0a030;margin-top:3px'>Paused — the AI limit was reached. Not checked yet.</div>";
    else if(it.status==="work")h+="<div style='margin-top:3px'>Reading and asking AI…</div>";
    else if(it.status==="noText")h+="<div style='color:#e0a030;margin-top:3px'>No readable text (maybe scanned).</div>";
    if(it.status==="err"||it.status==="noText")h+="<div style='display:flex;margin-top:6px'>"+miniBtn("Fill in by hand","EduLibraryManager.hand("+i+")")+"</div>";
  }else{
    var bits=[];
    if(p&&p.confidence!=null)bits.push("AI "+pct(p.confidence));
    if(p&&p.flags&&p.flags.length)bits.push("⚠ "+p.flags.length+" flag"+(p.flags.length>1?"s":""));
    h+="<div style='font-weight:700;margin-top:3px'>"+E(clean(e.title)||"(no title)")+"</div>"
      +"<div style='font-size:12px;color:var(--sub)'>"+E(destText(it))+"</div>";
    if(bits.length)h+="<div style='font-size:12px;color:var(--sub);margin-top:2px'>"+E(bits.join(" · "))+"</div>";
    if(it.msg)h+="<div style='color:#d9534f;margin-top:3px'>"+E(it.msg)+"</div>";
    if(it.up==="done")h+="<div style='color:#2FA36B;font-weight:700;margin-top:4px'>✓ Uploaded"+(it.auto?" automatically":"")+"</div>";
    else if(it.up==="uploading")h+="<div style='color:var(--sub);margin-top:4px'>Uploading…</div>";
    else if(it.up==="err")h+="<div style='color:#d9534f;margin-top:4px'>Upload failed: "+E(it.upErr)+"</div><div style='display:flex;margin-top:6px'>"+miniBtn("Try again","EduLibraryManager.retry("+i+")")+"</div>";
    else if(it.dec==="approved")h+="<div style='display:flex;gap:8px;align-items:center;margin-top:6px'><b style='color:#2FA36B;flex:1'>✓ "+(it.auto?"Auto-approved":"Approved")+" — uploading soon</b>"+miniBtn("Undo","EduLibraryManager.decide("+i+",'pending')")+"</div>";
    else if(it.dec==="rejected")h+="<div style='display:flex;gap:8px;align-items:center;margin-top:6px'><b style='color:#d9534f;flex:1'>✗ Rejected</b>"+miniBtn("Undo","EduLibraryManager.decide("+i+",'pending')")+"</div>";
    else{
      var wn=whyNot(it);
      if(wn)h+="<div style='color:#e0a030;font-size:12.5px;margin-top:3px'>⚠ Needs your OK: "+E(wn)+"</div>";
      h+="<div style='display:flex;gap:6px;margin-top:6px'>"+miniBtn("✅ Approve","EduLibraryManager.decide("+i+",'approved')","#2FA36B")+miniBtn("❌ Reject","EduLibraryManager.decide("+i+",'rejected')","#d9534f")+miniBtn("✏️ Details","EduLibraryManager.toggle("+i+")")+"</div>";
    }
  }
  return "<div style='border:1px solid var(--line);border-left:5px solid "+colorOf(it)+";border-radius:9px;padding:8px 12px;margin:0 0 8px;font-size:13px;word-break:break-word'>"+head+h+"</div>";
}
function cardHtml(it){return (it.edit&&isOpen(it))?fullCard(it):miniCard(it);}
function drawOne(i){
  var el=$("lmc"+i);if(!el||!items[i])return;
  checkDuplicates();el.innerHTML=cardHtml(items[i]);bar();
}
function fullDraw(){
  var box=$("lmList");if(!box)return;
  checkDuplicates();
  box.innerHTML=items.map(function(it){return "<div id='lmc"+it.i+"'>"+cardHtml(it)+"</div>";}).join("");
  bar();
}
function bar(){
  var ok=items.filter(function(x){return x.dec==="approved"&&x.up!=="done";}).length;
  var rj=items.filter(function(x){return x.dec==="rejected";}).length;
  var dn=items.filter(function(x){return x.up==="done";}).length;
  var need=items.filter(function(x){return x.edit&&x.dec==="pending"&&!x.up;}).length;
  var fin=items.filter(function(x){return x.status==="done"||x.status==="noText"||x.status==="err";}).length;
  var u=$("lmUp");if(u){u.textContent="Upload approved ("+ok+")";u.disabled=!ok||uploading;}
  var a=$("lmAll");if(a)a.disabled=!items.length;
  var s=$("lmStatus");
  if(s&&items.length)s.textContent=fin+" of "+items.length+" checked · "+dn+" uploaded · "+need+" need your OK · "+rj+" rejected"+(running?" — checking, keep this screen open":(uploading?" — uploading, keep this screen open":""));
  else if(s)s.textContent="";
  var st=$("lmStop");if(st)st.style.display=(running||uploading)?"":"none";
  var rs=$("lmResume");if(rs)rs.style.display=(!running&&items.some(function(x){return x.status==="paused";}))?"":"none";
}

/* ---------- your actions ---------- */
function setField(i,f,v){
  var it=items[i];if(!it||!it.edit||it.dec==="approved"||it.up)return;
  var e=it.edit;e[f]=v;it.dupOk=false;
  if(f==="level"){e.cls0="";e.tier="";e.body="";}
  if(f==="cls0"){var b=EXAM_BODIES[v]||null;e.body=b?(b.length===1?b[0]:""):"";}
  if(f==="title"||f==="subject")return;
  it.msg="";drawOne(i);
}
function decide(i,d){
  var it=items[i];if(!it||it.up==="uploading"||it.up==="done")return;
  if(d==="approved"){
    var pr=problems(it);
    if(pr.length){it.msg="Cannot approve yet: "+pr.join(", ")+".";drawOne(i);return;}
    checkDuplicates();
    if(it.dups.length&&!it.dupOk){it.dupOk=true;it.msg="Possible duplicate ("+it.dups.join("; ")+"). Tap Approve again to upload it anyway.";drawOne(i);return;}
  }
  it.msg="";it.dec=d;it.auto=false;drawOne(i);
  if(d==="approved")kick();
}
function hand(i){var it=items[i];if(!it||it.edit)return;it.edit=newEdit(null,it.name);it.dec="pending";it.open=true;drawOne(i);}
function toggle(i){var it=items[i];if(!it)return;it.open=!isOpen(it);drawOne(i);}
function retry(i){var it=items[i];if(!it)return;it.up="";it.upErr="";it.dec="approved";drawOne(i);kick();}
function approveConfident(){
  var n=0;
  checkDuplicates();
  items.forEach(function(it){
    if(it.edit&&it.dec==="pending"&&!it.up&&sure(it)){it.dec="approved";it.auto=true;n++;}
  });
  fullDraw();
  if(n)kick();
  var s=$("lmStatus");if(s)s.textContent=n?(n+" file(s) approved — uploading now."):"Nothing waiting is "+pct(AUTO_MIN)+" sure. Please check the files one by one.";
}
function setAuto(on){
  ST.auto=!!on;
  try{localStorage.setItem("lm_auto",on?"1":"0");}catch(e){}
  if(on){approveConfident();}
}

/* ---------- checking files with the AI ---------- */
async function run(){
  if(running)return;
  running=true;if(!uploading)stopNow=false;bar();
  var stopped=false,limitHit=false;
  for(var k=0;k<items.length;k++){
    var it=items[k];
    if(stopNow){stopped=true;break;}
    if(it.status!=="wait")continue;
    it.status="work";drawOne(k);
    try{
      var info=await readPdf(it.file);
      it.pages=info.pages;it.hash=info.hash;it.read=info.read;
      if(!info.readable){it.status="noText";drawOne(k);continue;}
      var j=await classify(it.file,info);
      if(j.noText){it.status="noText";}
      else if(j.result){it.result=j.result;it.provider=j.provider;it.status="done";it.edit=newEdit(j.result,it.name);it.dec="pending";}
      else{it.status="err";it.err=j.error||"No answer";}
    }catch(e){
      if(e&&e.limit){limitHit=true;it.status="paused";break;}
      it.status="err";it.err=(e&&e.message)||String(e);
    }
    if(autoCheck(it))kick();
    drawOne(k);
    if(k<items.length-1&&!stopNow)await wait(GAP_MS);
  }
  /* AI limit reached: keep every unchecked file as "paused" (not an error) so you can check them later */
  if(limitHit)items.forEach(function(x){if(x.status==="wait")x.status="paused";});
  var left=items.filter(function(x){return x.status==="wait"||x.status==="paused";}).length;
  running=false;
  if(!uploading)stopNow=false;
  fullDraw();
  var m=$("lmStatus");
  if(m&&limitHit)m.textContent="Stopped: the AI limit was reached. "+left+" file(s) were not checked. Wait a while, then tap Check remaining files.";
  else if(m&&stopped&&left)m.textContent="Stopped. "+left+" file(s) were not checked.";
}
/* continue with the files that were paused by the AI limit */
function resume(){
  if(running)return;
  var n=0;
  items.forEach(function(x){if(x.status==="paused"){x.status="wait";n++;}});
  if(!n)return;
  fullDraw();
  run().catch(function(e){
    var m=$("lmStatus");if(m)m.textContent="Error: "+((e&&e.message)||e);
    running=false;bar();
  });
}

/* ---------- uploading (same steps as the normal upload forms) ---------- */
async function post(path,tok,body){
  try{return await fbPost(path,{Authorization:"Bearer "+tok},body);}
  catch(e){e.rl=/429|too many|rate|limit/i.test((e&&e.message)||"");throw e;}
}
async function uploadOne(it,S){
  var e=it.edit,file=it.file,title=clean(e.title),level=e.level,cls0=e.cls0,desc="",tok,put,j;
  if(e.docType==="exam"){
    var C=srv("C");
    if(!C||!C.ok||!C.exam)throw new Error("Exam server C is not connected.");
    var body=EXAM_BODIES[cls0]?e.body:"",subject=clean(e.subject);
    tok=await token();
    j=await post("/api/exam-upload",tok,{level:level,cls0:cls0,body:body,subject:subject,title:title});
    if(!j.url)throw new Error("No upload link");
    put=await fetch(j.url,{method:"PUT",body:file});
    if(!put.ok)throw new Error("File upload failed ("+put.status+")");
    return;
  }
  if(!S||!S.ok)throw new Error("The book server is not connected.");
  var tier=level==="Tertiary"?e.tier:"",author="Billz",bsub=title,cls=cls0+(tier?TIER_SEP+tier:"");
  var path=(level+"/"+cls0+(tier?"/"+tier:"")+"/"+Date.now()+"_"+file.name).replace(/\s+/g,"_");
  if(S.type==="b2"){
    tok=await token();
    j=await post("/api/book-upload",tok,{level:level,cls0:cls0,tier:tier,subject:bsub,title:title,author:author});
    if(!j.url)throw new Error("No upload link");
    put=await fetch(j.url,{method:"PUT",body:file});
    if(!put.ok)throw new Error("File upload failed ("+put.status+")");
  }else if(S.type==="appwrite"){
    var up=await S.storage.createFile({bucketId:S.bucket,fileId:Appwrite.ID.unique(),file:file});
    var fileUrl=S.endpoint+"/storage/buckets/"+S.bucket+"/files/"+up.$id+"/view?project="+S.project;
    await S.tdb.createRow({databaseId:S.db,tableId:S.table,rowId:Appwrite.ID.unique(),data:{title:title,subject:bsub,author:author,level:level,class:cls,description:desc,file_path:fileUrl}});
  }else{
    var r1=await S.sb.storage.from("books").upload(path,file);
    if(r1.error)throw r1.error;
    var pub=S.sb.storage.from("books").getPublicUrl(path);
    var r2=await S.sb.from("books").insert({title:title,subject:bsub,author:author,level:level,class:cls,description:desc,file_path:pub.data.publicUrl});
    if(r2.error)throw r2.error;
  }
}
async function uploadRetry(it,S){
  try{await uploadOne(it,S);}
  catch(e){if(e&&e.rl){await wait(30000);await uploadOne(it,S);}else throw e;}
}
function nextToUpload(){
  return items.filter(function(x){return x.dec==="approved"&&!x.up&&x.edit&&!problems(x).length;})[0];
}
/* the upload loop: takes approved files one at a time; keeps going while new ones get approved */
async function uploadLoop(){
  if(uploading)return;
  uploading=true;if(!running)stopNow=false;bar();
  var ok=0,fail=0,did=false;
  try{
    for(;;){
      if(stopNow)break;
      var it=nextToUpload();
      if(!it){
        if(did){did=false;try{await refreshBooks();}catch(e){}fullDraw();continue;}
        break;
      }
      var S=srv(bookServer);
      it.up="uploading";it.upErr="";drawOne(it.i);
      try{await uploadRetry(it,S);it.up="done";ok++;}
      catch(e){it.up="err";it.upErr=(e&&e.message)||String(e);fail++;}
      did=true;
      drawOne(it.i);
      if(nextToUpload()&&!stopNow)await wait(UP_GAP_MS);
    }
  }catch(e){
    var m=$("lmStatus");if(m)m.textContent="Upload stopped: "+((e&&e.message)||e);
  }
  var stopped=stopNow;
  uploading=false;
  if(!running)stopNow=false;
  fullDraw();
  var s=$("lmStatus");
  if(s&&(ok||fail||stopped))s.textContent=(s.textContent||"")+" · This round: "+ok+" uploaded"+(fail?", "+fail+" failed (tap Try again)":"")+(stopped?" — stopped early":"");
}
function kick(){
  if(uploading)return;
  uploadLoop().catch(function(e){uploading=false;var m=$("lmStatus");if(m)m.textContent="Upload error: "+((e&&e.message)||e);bar();});
}

function pick(files){
  try{
    var list=Array.prototype.slice.call(files||[]).filter(function(f){return /\.pdf$/i.test(f.name)||f.type==="application/pdf";});
    if(!list.length){alert("Please choose PDF files.");return;}
    /* tidy the list when nothing is busy: drop uploaded and rejected cards */
    if(!running&&!uploading){
      var keep=items.filter(function(x){return x.up!=="done"&&x.dec!=="rejected";});
      items.length=0;
      keep.forEach(function(x,n){x.i=n;items.push(x);});
    }
    var skipped=0,added=0;
    list.forEach(function(f){
      var dup=items.some(function(x){return x.name===f.name&&x.size===f.size;});
      if(dup){skipped++;return;}
      if(items.length>=MAX_FILES){skipped++;return;}
      items.push({i:items.length,file:f,name:f.name,size:f.size,status:"wait",dups:[],dec:"",up:"",msg:""});
      added++;
    });
    var s=$("lmStatus");
    fullDraw();
    if(s&&!added)s.textContent="Nothing new added ("+skipped+" already in the list, or the list is full at "+MAX_FILES+").";
    else if(s)s.textContent=added+" file(s) added. Starting…";
    setTimeout(function(){
      run().catch(function(e){
        var m=$("lmStatus");if(m)m.textContent="Error: "+((e&&e.message)||e);
        running=false;bar();
      });
    },50);
  }catch(e){alert("Could not load the files: "+((e&&e.message)||e));}
}

function render(body){
  items=ST.items;bookServer=ST.bookServer;
  var so=SERVERS.filter(function(x){return !x.exam;}).map(function(x){return "<option value='"+x.id+"'"+(x.ok?"":" disabled")+(x.id===bookServer?" selected":"")+">"+E(x.name)+(x.ok?"":" (not connected)")+"</option>";}).join("");
  body.innerHTML="<div class='note' style='margin-top:0'>AI Library — choose PDFs. The AI works out where each one belongs. <b>If it is "+pct(AUTO_MIN)+" sure or more, the file uploads by itself.</b> Below "+pct(AUTO_MIN)+", or if it sees a problem or a possible duplicate, it waits for your <b>Approve</b>.<br><b>Tip:</b> each time you choose PDFs they are <b>added</b> to the list. Tap <b>Details</b> on a card to edit it.</div>"
   +"<input id='lmFile' type='file' accept='application/pdf,.pdf' multiple style='display:none'>"
   +"<button type='button' class='btn' id='lmPick'>Choose PDF files</button>"
   +"<label style='display:flex;gap:10px;align-items:center;margin:12px 0 0;font-size:13.5px'><input type='checkbox' id='lmAuto'"+(ST.auto?" checked":"")+" style='width:20px;height:20px;flex:none'> <span>Upload automatically when the AI is "+pct(AUTO_MIN)+" sure or more</span></label>"
   +"<div class='field' style='margin:10px 0 0'><label>Save books to (exams always go to Server C)</label><select id='lmSrv'>"+so+"</select></div>"
   +"<div id='lmStatus' style='color:var(--sub);font-size:12.5px;margin:10px 0'></div>"
   +"<div style='display:flex;gap:8px;margin-bottom:10px'><button type='button' class='admchip' id='lmAll' style='flex:1'>Approve all confident</button><button type='button' class='admchip' id='lmStop' style='display:none'>Stop</button><button type='button' class='admchip' id='lmResume' style='display:none'>Check remaining files</button></div>"
   +"<button type='button' class='btn green' id='lmUp' style='margin:0 0 12px'>Upload approved (0)</button>"
   +"<div id='lmList'></div>";
  $("lmPick").onclick=function(){$("lmFile").value="";$("lmFile").click();};
  $("lmFile").onchange=function(){pick(this.files);};
  $("lmStop").onclick=function(){stopNow=true;};
  $("lmResume").onclick=resume;
  $("lmAll").onclick=approveConfident;
  $("lmUp").onclick=kick;
  $("lmAuto").onchange=function(){setAuto(this.checked);};
  $("lmSrv").onchange=function(){bookServer=ST.bookServer=this.value;fullDraw();};
  if(items.length){
    items.forEach(function(it){if(it.status==="work")it.status="wait";if(it.up==="uploading")it.up="";});
    fullDraw();
    if(items.some(function(x){return x.status==="wait";}))run();
    if(nextToUpload())kick();
  }else bar();
}

window.EduLibraryManager={render:render,set:setField,decide:decide,hand:hand,retry:retry,toggle:toggle,resume:resume,version:"0.9"};
})();
