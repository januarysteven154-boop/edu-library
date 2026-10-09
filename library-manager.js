/* Edu Library - AI Library Manager v0.3: AI proposes, you approve or reject, approved files upload. */
(function(){
"use strict";
var URL_CLASSIFY="https://edu-ai-backend-three.vercel.app/api/book-link?classify=1";
var GAP_MS=5500,UP_GAP_MS=7000,MAX_FILES=30,TAIL=1400,HEAD=5500,MAX_READ=15,ENOUGH=1500;
var items=[],running=false,uploading=false,stopNow=false,bookServer="A";

function $(id){return document.getElementById(id);}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
function E(s){return typeof esc==="function"?esc(s):String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(x){return ("0"+x.toString(16)).slice(-2);}).join("");}
function mb(n){return (n/1048576).toFixed(1)+" MB";}
function clean(s){return String(s||"").replace(/[\\\/]+/g,"-").replace(/~+/g,"-").replace(/\s+/g," ").trim();}
function baseName(n){return String(n||"").replace(/\.pdf$/i,"").replace(/_+/g," ").trim();}
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
async function classify(file,info){
  var tok=await token();
  for(var a=0;a<2;a++){
    var r=await fetch(URL_CLASSIFY,{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify({filename:file.name,pages:info.pages,excerpt:info.excerpt})});
    if(r.status===429&&a===0){await wait(20000);continue;}
    var j={};try{j=await r.json();}catch(e){}
    if(!r.ok)throw new Error(j.error||("Server answered "+r.status));
    return j;
  }
}

/* ---------- the editable proposal ---------- */
function newEdit(r,name){
  r=r||{};
  var lv=LEVELS[r.level]?r.level:"Primary";
  var cl=LEVELS[lv].classes.indexOf(r.cls0)>=0?r.cls0:"";
  var bd=EXAM_BODIES[cl]||null,body="";
  if(bd)body=bd.indexOf(r.body)>=0?r.body:(bd.length===1?bd[0]:"");
  var tier=TIERS.some(function(t){return t.k===r.tier;})?r.tier:"";
  return {docType:r.docType==="exam"?"exam":"book",level:lv,cls0:cl,tier:tier,body:body,title:r.title||baseName(name),subject:r.subject||r.subjectSuggestion||""};
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
  var lib={},seen={};
  try{booksCache.forEach(function(b){lib[admDupKey(b)]=b.title;});}catch(e){}
  items.forEach(function(it){
    it.dups=[];
    if(it.up==="done")return;
    if(it.hash){
      if(seen[it.hash]!==undefined)it.dups.push("Same file as #"+(seen[it.hash]+1)+" in this batch");
      else seen[it.hash]=it.i;
    }
    var rec=curRec(it);
    if(rec&&rec.title&&rec.cls0!==""&&rec.level&&it.edit.cls0){
      try{var k=admDupKey(rec);if(lib[k]!==undefined)it.dups.push("Looks already in the library: "+lib[k]);}catch(e){}
    }
  });
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
function cardHtml(it){
  var p=it.result,c="#888",h="",i=it.i;
  if(it.dec==="rejected")c="#777";
  if(it.status==="err"){c="#d9534f";h+="<div style='color:#d9534f;margin-top:4px'>Problem: "+E(it.err)+"</div>";}
  else if(it.status==="wait")h+="<div style='margin-top:4px'>Waiting…</div>";
  else if(it.status==="work")h+="<div style='margin-top:4px'>Reading and asking AI…</div>";
  else if(it.status==="noText"){c="#e0a030";h+="<div style='color:#e0a030;margin-top:4px'>No readable text (maybe a scanned PDF).</div>";}
  else if(it.status==="done"&&p){
    var good=(p.confidence>=0.85&&!p.needsReview&&!(p.flags&&p.flags.length)&&!it.dups.length);
    c=it.dec==="rejected"?"#777":(good?"#2FA36B":"#e0a030");
    h+="<div style='margin-top:4px'>AI confidence: <b>"+Math.round((p.confidence||0)*100)+"%</b> · "+E(it.provider||"")+"</div>";
    (p.flags||[]).forEach(function(f){h+="<div style='color:#e0a030;margin-top:3px'>⚠ "+E(f)+"</div>";});
    if(p.reasons&&p.reasons.length)h+="<div style='color:var(--sub);margin-top:4px;font-size:12px'>"+E(p.reasons.slice(0,2).join(" · "))+"</div>";
  }
  if(!it.edit&&(it.status==="noText"||it.status==="err"))h+="<div style='display:flex;margin-top:8px'>"+btn("Fill in by hand","EduLibraryManager.hand("+i+")")+"</div>";
  if(it.edit){
    h+=editH(it);
    if(it.up!=="done")it.dups.forEach(function(f){h+="<div style='color:#d9534f;margin-bottom:4px'>⛔ "+E(f)+"</div>";});
    if(it.msg)h+="<div style='color:#d9534f;margin-bottom:6px'>"+E(it.msg)+"</div>";
    if(it.up==="done"){c="#2FA36B";h+="<div style='color:#2FA36B;font-weight:700'>✓ Uploaded</div>";}
    else if(it.up==="uploading")h+="<div style='color:var(--sub)'>Uploading…</div>";
    else if(it.up==="err")h+="<div style='color:#d9534f;margin-bottom:6px'>Upload failed: "+E(it.upErr)+"</div><div style='display:flex'>"+btn("Try again","EduLibraryManager.retry("+i+")")+"</div>";
    else if(it.dec==="approved")h+="<div style='display:flex;gap:8px;align-items:center'><b style='color:#2FA36B;flex:1'>✓ Approved — waiting for upload</b>"+btn("Undo","EduLibraryManager.decide("+i+",\"pending\")")+"</div>";
    else if(it.dec==="rejected")h+="<div style='display:flex;gap:8px;align-items:center'><b style='color:#d9534f;flex:1'>✗ Rejected — will not be uploaded</b>"+btn("Undo","EduLibraryManager.decide("+i+",\"pending\")")+"</div>";
    else h+="<div style='display:flex;gap:8px'>"+btn("✅ Approve","EduLibraryManager.decide("+i+",\"approved\")","#2FA36B")+btn("❌ Reject","EduLibraryManager.decide("+i+",\"rejected\")","#d9534f")+"</div>";
  }
  return "<div style='border:1px solid var(--line);border-left:5px solid "+c+";border-radius:9px;padding:10px 12px;margin:0 0 10px;font-size:13px;word-break:break-word'>"
    +"<div style='color:var(--sub);font-size:12px'>#"+(i+1)+" · "+E(it.name)+" · "+mb(it.size)+(it.pages?" · "+it.pages+" pages"+(it.read?" (read "+it.read+")":""):"")+"</div>"+h+"</div>";
}
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
  var fin=items.filter(function(x){return x.status==="done"||x.status==="noText"||x.status==="err";}).length;
  var u=$("lmUp");if(u){u.textContent="Upload approved ("+ok+")";u.disabled=!ok||running||uploading;}
  var a=$("lmAll");if(a)a.disabled=running||uploading||!items.length;
  var s=$("lmStatus");
  if(s&&!uploading)s.textContent=items.length?(fin+" of "+items.length+" checked · "+ok+" approved · "+rj+" rejected · "+dn+" uploaded"+(running?" — checking, keep this screen open":"")):"";
  var st=$("lmStop");if(st)st.style.display=(running||uploading)?"":"none";
  var pk=$("lmPick");if(pk)pk.disabled=uploading;
  var sv=$("lmSrv");if(sv)sv.disabled=uploading;
}

/* ---------- your actions ---------- */
function setField(i,f,v){
  var it=items[i];if(!it||!it.edit||it.dec==="approved"||it.up)return;
  var e=it.edit;e[f]=v;
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
    if(it.dups.length&&!confirm("Possible duplicate:\n"+it.dups.join("\n")+"\n\nApprove anyway?"))return;
  }
  it.msg="";it.dec=d;drawOne(i);
}
function hand(i){var it=items[i];if(!it||it.edit)return;it.edit=newEdit(null,it.name);it.dec="pending";drawOne(i);}
function retry(i){var it=items[i];if(!it)return;it.up="";it.upErr="";it.dec="approved";drawOne(i);}
function approveConfident(){
  var n=0;
  items.forEach(function(it){
    var p=it.result;
    if(it.status==="done"&&it.edit&&it.dec==="pending"&&!it.up&&p&&p.confidence>=0.85&&!p.needsReview&&!(p.flags&&p.flags.length)&&!it.dups.length&&!problems(it).length){it.dec="approved";n++;}
  });
  fullDraw();
  var s=$("lmStatus");if(s)s.textContent=n?(n+" confident file(s) approved. Check them, then tap Upload."):"No file is confident enough. Please check them one by one.";
}

/* ---------- checking files with the AI ---------- */
async function run(){
  if(running)return;
  running=true;stopNow=false;bar();
  for(var k=0;k<items.length;k++){
    var it=items[k];
    if(stopNow)break;
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
    }catch(e){it.status="err";it.err=(e&&e.message)||String(e);}
    drawOne(k);
    if(k<items.length-1&&!stopNow)await wait(GAP_MS);
  }
  running=false;fullDraw();
  var left=items.filter(function(x){return x.status==="wait";}).length;
  if(stopNow&&left){var m=$("lmStatus");if(m)m.textContent="Stopped. "+left+" file(s) were not checked.";}
}

/* ---------- uploading approved files (same steps as the normal upload forms) ---------- */
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
    var xcls=cls0+TIER_SEP+"Exam"+(body?TIER_SEP+body:"");
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
async function uploadAll(){
  if(uploading||running)return;
  var list=items.filter(function(x){return x.dec==="approved"&&x.up!=="done";});
  if(!list.length)return;
  var S=srv(bookServer),nb=list.filter(function(x){return x.edit.docType==="book";}).length,ne=list.length-nb;
  var bad=list.filter(function(x){return problems(x).length;});
  if(bad.length){alert("Some approved files are incomplete. Please undo and fix them.");return;}
  if(!confirm("Upload "+list.length+" approved file(s)?\n"+(nb?nb+" book(s) → "+S.name+"\n":"")+(ne?ne+" exam(s) → Server C\n":"")+"\nThis adds them to your live library."))return;
  uploading=true;stopNow=false;bar();
  var ok=0,fail=0;
  for(var k=0;k<list.length;k++){
    var it=list[k];
    if(stopNow)break;
    it.up="uploading";it.upErr="";drawOne(it.i);
    var s=$("lmStatus");if(s)s.textContent="Uploading "+(k+1)+" of "+list.length+"… keep this screen open";
    try{await uploadRetry(it,S);it.up="done";ok++;}
    catch(e){it.up="err";it.upErr=(e&&e.message)||String(e);fail++;}
    drawOne(it.i);
    if(k<list.length-1&&!stopNow)await wait(UP_GAP_MS);
  }
  try{await refreshBooks();}catch(e){}
  uploading=false;fullDraw();
  var m=$("lmStatus");if(m)m.textContent="Finished: "+ok+" uploaded"+(fail?", "+fail+" failed (tap Try again)":"")+(stopNow?" — stopped early":"")+".";
}

function pick(files){
  var list=Array.prototype.slice.call(files||[]).filter(function(f){return /\.pdf$/i.test(f.name)||f.type==="application/pdf";});
  if(!list.length){alert("Please choose PDF files.");return;}
  var open=items.filter(function(x){return x.dec==="approved"&&x.up!=="done";}).length;
  if(open&&!confirm(open+" approved file(s) have not been uploaded yet. Replace the list anyway?"))return;
  if(list.length>MAX_FILES){alert("Choose at most "+MAX_FILES+" files at a time. Only the first "+MAX_FILES+" will be used.");list=list.slice(0,MAX_FILES);}
  items=list.map(function(f,i){return {i:i,file:f,name:f.name,size:f.size,status:"wait",dups:[],dec:"",up:"",msg:""};});
  fullDraw();run();
}

function render(body){
  var so=SERVERS.filter(function(x){return !x.exam;}).map(function(x){return "<option value='"+x.id+"'"+(x.ok?"":" disabled")+(x.id===bookServer?" selected":"")+">"+E(x.name)+(x.ok?"":" (not connected)")+"</option>";}).join("");
  body.innerHTML="<div class='note' style='margin-top:0'>AI Library — choose PDFs, the AI proposes where each belongs. Nothing uploads until you tap <b>Approve</b> and then <b>Upload approved</b>.</div>"
   +"<input id='lmFile' type='file' accept='application/pdf,.pdf' multiple style='display:none'>"
   +"<button type='button' class='btn' id='lmPick'>Choose PDF files</button>"
   +"<div class='field' style='margin:10px 0 0'><label>Save approved books to (exams always go to Server C)</label><select id='lmSrv'>"+so+"</select></div>"
   +"<div id='lmStatus' style='color:var(--sub);font-size:12.5px;margin:10px 0'></div>"
   +"<div style='display:flex;gap:8px;margin-bottom:10px'><button type='button' class='admchip' id='lmAll' style='flex:1'>Approve all confident</button><button type='button' class='admchip' id='lmStop' style='display:none'>Stop</button></div>"
   +"<div id='lmList'></div>"
   +"<button type='button' class='btn green' id='lmUp' style='margin:6px 0 20px'>Upload approved (0)</button>";
  $("lmPick").onclick=function(){if(running||uploading)return;$("lmFile").value="";$("lmFile").click();};
  $("lmFile").onchange=function(){pick(this.files);};
  $("lmStop").onclick=function(){stopNow=true;};
  $("lmAll").onclick=approveConfident;
  $("lmUp").onclick=uploadAll;
  $("lmSrv").onchange=function(){bookServer=this.value;fullDraw();};
  if(items.length)fullDraw();else bar();
}

window.EduLibraryManager={render:render,set:setField,decide:decide,hand:hand,retry:retry,version:"0.3"};
})();
