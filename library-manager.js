/* Edu Library - AI Library Manager. Step A: READ-ONLY PREVIEW (no uploads). v0.2 */
(function(){
"use strict";
var URL_CLASSIFY="https://edu-ai-backend-three.vercel.app/api/book-link?classify=1";
var GAP_MS=5500,MAX_FILES=30,TAIL=1400,HEAD=5500,MAX_READ=15,ENOUGH=1500;
var items=[],running=false,stopNow=false,host=null;

function $(id){return document.getElementById(id);}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
function E(s){return typeof esc==="function"?esc(s):String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(x){return ("0"+x.toString(16)).slice(-2);}).join("");}
function mb(n){return (n/1048576).toFixed(1)+" MB";}

async function readPdf(file){
  var buf=await file.arrayBuffer(),hash="";
  try{if(window.crypto&&crypto.subtle)hash=hex(await crypto.subtle.digest("SHA-256",buf));}catch(e){}
  var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
  var n=pdf.numPages,head="",tail="",p,pg,tc,maxp=Math.min(n,MAX_READ);
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
  var s=await sb.auth.getSession();
  var tok=s&&s.data&&s.data.session&&s.data.session.access_token;
  if(!tok)throw new Error("Please log out and log in as admin again.");
  for(var a=0;a<2;a++){
    var r=await fetch(URL_CLASSIFY,{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify({filename:file.name,pages:info.pages,excerpt:info.excerpt})});
    if(r.status===429&&a===0){await wait(20000);continue;}
    var j={};try{j=await r.json();}catch(e){}
    if(!r.ok)throw new Error(j.error||("Server answered "+r.status));
    return j;
  }
}

function libKey(p){
  var cls=p.cls0+(p.docType==="exam"?" | Exam"+(p.body?" | "+p.body:""):(p.tier&&p.tier!=="-"?" | "+p.tier:""));
  return admDupKey({title:p.title,subject:p.subject,level:p.level,class:cls});
}
function checkDuplicates(){
  var lib={},seen={};
  try{booksCache.forEach(function(b){lib[admDupKey(b)]=b.title;});}catch(e){}
  items.forEach(function(it){
    it.dups=[];
    if(it.hash){
      if(seen[it.hash]!==undefined)it.dups.push("Same file as #"+(seen[it.hash]+1)+" in this batch");
      else seen[it.hash]=it.i;
    }
    var p=it.result;
    if(p&&p.title&&p.level&&p.cls0){
      try{var k=libKey(p);if(lib[k]!==undefined)it.dups.push("Looks already in the library: "+lib[k]);}catch(e){}
    }
  });
}

function card(it){
  var p=it.result,c="#888",st="",h="";
  if(it.status==="wait")st="Waiting…";
  else if(it.status==="work")st="Reading and asking AI…";
  else if(it.status==="err"){st="Problem: "+E(it.err);c="#d9534f";}
  else if(it.status==="noText"){st="No readable text (maybe a scanned PDF). Needs manual review.";c="#e0a030";}
  else if(it.status==="done"&&p){
    var good=(p.confidence>=0.85&&!p.needsReview&&!(p.flags&&p.flags.length)&&!it.dups.length);
    c=good?"#2FA36B":"#e0a030";
    st=E(p.level)+" › "+E(p.cls0)+(p.tier&&p.tier!=="-"&&p.docType!=="exam"?" › "+E(p.tier):"")+" › "+E(p.subject||p.subjectSuggestion||"?")+" · <b>"+(p.docType==="exam"?"Exam":"Book")+"</b>"+(p.kind?" ("+E(p.kind)+")":"")+(p.body?" · "+E(p.body):"");
    h="<div style='margin-top:4px'><b>"+E(p.title||"(no title)")+"</b>"+(p.author?" — "+E(p.author):"")+(p.year?" · "+E(p.year):"")+"</div>"
      +"<div style='margin-top:4px'>Confidence: <b>"+Math.round((p.confidence||0)*100)+"%</b> · "+E(it.provider||"")+"</div>";
    (p.flags||[]).forEach(function(f){h+="<div style='color:#e0a030;margin-top:3px'>⚠ "+E(f)+"</div>";});
    it.dups.forEach(function(f){h+="<div style='color:#d9534f;margin-top:3px'>⛔ "+E(f)+"</div>";});
    if(p.reasons&&p.reasons.length)h+="<div style='color:var(--sub);margin-top:4px;font-size:12px'>"+E(p.reasons.slice(0,2).join(" · "))+"</div>";
  }
  var lead=it.status==="done"?st:"<span style='color:"+c+"'>"+st+"</span>";
  return "<div style='border:1px solid var(--line);border-left:5px solid "+c+";border-radius:9px;padding:10px 12px;margin:0 0 10px;font-size:13px;word-break:break-word'>"
    +"<div style='color:var(--sub);font-size:12px'>#"+(it.i+1)+" · "+E(it.name)+" · "+mb(it.size)+(it.pages?" · "+it.pages+" pages"+(it.read?" (read "+it.read+")":""):"")+"</div>"
    +"<div style='margin-top:4px'>"+lead+"</div>"+h+"</div>";
}

function draw(){
  var box=$("lmList");if(!box)return;
  checkDuplicates();
  box.innerHTML=items.map(card).join("");
  var done=items.filter(function(x){return x.status==="done"||x.status==="noText"||x.status==="err";}).length;
  var s=$("lmStatus");if(s)s.textContent=items.length?(done+" of "+items.length+" finished"+(running?" — working, please keep this screen open":"")):"";
}

async function run(){
  if(running)return;
  running=true;stopNow=false;
  var b=$("lmStop");if(b)b.style.display="";
  for(var k=0;k<items.length;k++){
    var it=items[k];
    if(stopNow)break;
    if(it.status!=="wait")continue;
    it.status="work";draw();
    try{
      var info=await readPdf(it.file);
      it.pages=info.pages;it.hash=info.hash;it.read=info.read;
      if(!info.readable){it.status="noText";draw();continue;}
      var j=await classify(it.file,info);
      if(j.noText){it.status="noText";}
      else if(j.result){it.result=j.result;it.provider=j.provider;it.status="done";}
      else{it.status="err";it.err=j.error||"No answer";}
    }catch(e){it.status="err";it.err=(e&&e.message)||String(e);}
    draw();
    if(k<items.length-1&&!stopNow)await wait(GAP_MS);
  }
  running=false;
  if(b)b.style.display="none";
  var st=items.filter(function(x){return x.status==="wait";}).length;
  if(stopNow&&st){var m=$("lmStatus");if(m)m.textContent="Stopped. "+st+" file(s) were not checked.";}
  else draw();
}

function pick(files){
  var list=Array.prototype.slice.call(files||[]).filter(function(f){return /\.pdf$/i.test(f.name)||f.type==="application/pdf";});
  if(!list.length){alert("Please choose PDF files.");return;}
  if(list.length>MAX_FILES){alert("Choose at most "+MAX_FILES+" files at a time. Only the first "+MAX_FILES+" will be used.");list=list.slice(0,MAX_FILES);}
  items=list.map(function(f,i){return {i:i,file:f,name:f.name,size:f.size,status:"wait",dups:[]};});
  draw();run();
}

function render(body){
  host=body;
  body.innerHTML="<div class='note' style='margin-top:0'>AI Library — <b>preview only</b>. Nothing is uploaded. Choose PDFs and the AI will propose where each one belongs.</div>"
   +"<input id='lmFile' type='file' accept='application/pdf,.pdf' multiple s
