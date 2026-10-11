/* Edu Library - AI Examination Room, Admin side: Exam Builder v1.2. Builds checked multiple-choice questions (two AIs must agree) from the text of an exam paper (PDF with text, SCANNED PDF read by AI, Word .docx, or .txt) and saves them to Supabase table exam_questions. Includes an accuracy test with maths questions whose answers are known. */
(function(){
"use strict";
var URL_BUILD="https://edu-ai-backend-three.vercel.app/api/book-link?exambuild=1";
var CHUNK=3500,MAX_PAGES=30,GAP_MS=11000,OCR_BATCH=2,OCR_GAP_MS=9000;
var ST=window.__eduEB=window.__eduEB||{built:[],meta:null,busy:false};

function $(id){return document.getElementById(id);}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
function E(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function clean(s){return String(s||"").replace(/\s+/g," ").trim();}
function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
function say(id,t){var el=$(id);if(el)el.textContent=t;}
async function token(){
  var s=await sb.auth.getSession();
  var t=s&&s.data&&s.data.session&&s.data.session.access_token;
  if(!t)throw new Error("Please log out and log in as admin again.");
  return t;
}

/* ---------- ask the backend ---------- */
async function post(payload){
  var tok=await token();
  for(var a=0;a<2;a++){
    var r=await fetch(URL_BUILD,{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify(payload)});
    var j={};try{j=await r.json();}catch(e){}
    if(r.status===429&&j&&j.limit){var le=new Error(j.error||"AI limit reached");le.limit=true;throw le;}
    if(r.status===429&&a===0){await wait(20000);continue;}
    if(!r.ok)throw new Error(j.error||("Server answered "+r.status));
    return j;
  }
  throw new Error("Too many requests. Wait a minute and try again.");
}
async function build(text,ctx){return post({text:text,level:ctx.level,class:ctx.cls,subject:ctx.subject});}
async function ocr(images,ctx){var j=await post({images:images,level:ctx.level,class:ctx.cls,subject:ctx.subject});return String(j.text||"");}

/* ---------- reading a PDF ---------- */
async function readPdf(file){
  var buf=await file.arrayBuffer();
  var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
  var n=Math.min(pdf.numPages,MAX_PAGES),pages=[];
  for(var p=1;p<=n;p++){
    try{
      var g=await pdf.getPage(p),t=await g.getTextContent();
      pages.push(t.items.map(function(x){return x.str;}).join(" ").replace(/[ \t]+/g," ").trim().slice(0,7000));
    }catch(e){pages.push("");}
  }
  var total=pdf.numPages;
  try{pdf.destroy();}catch(e){}
  return {pages:pages,total:total};
}

/* ---------- reading a SCANNED PDF: page pictures, Gemini copies the words ---------- */
async function pageImage(pdf,num){
  var g=await pdf.getPage(num),v1=g.getViewport({scale:1});
  var sc=Math.min(2,1400/Math.max(v1.width,v1.height));
  var vp=g.getViewport({scale:sc}),cv=document.createElement("canvas");
  cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);
  var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);
  await g.render({canvasContext:cx,viewport:vp}).promise;
  var d=cv.toDataURL("image/jpeg",0.72);
  cv.width=0;cv.height=0;
  return d.split(",")[1];
}
async function readScanned(file,ctx){
  var buf=await file.arrayBuffer();
  var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
  var total=pdf.numPages,n=Math.min(total,MAX_PAGES),texts=[],p=1,limitHit=false;
  try{
    while(p<=n){
      var last=Math.min(p+OCR_BATCH-1,n),imgs=[];
      say("ebSt","Scanned paper: AI is reading page pictures "+p+(last>p?"–"+last:"")+" of "+n+". This is slow, keep the screen on…");
      for(var q=p;q<=last;q++)imgs.push(await pageImage(pdf,q));
      try{
        var t=await ocr(imgs,ctx);
        if(t.trim())texts.push(t);
      }catch(e){
        if(e&&e.limit){limitHit=true;break;}
        throw e;
      }
      p=last+1;
      if(p<=n)await wait(OCR_GAP_MS);
    }
  }finally{try{pdf.destroy();}catch(e){}}
  return {text:texts.join("\n"),total:total,read:n,limitHit:limitHit};
}

/* ---------- reading a Word .docx (no library needed) ---------- */
async function inflateRaw(bytes){
  if(typeof DecompressionStream==="undefined")throw new Error("This phone's browser cannot open Word files. Update Chrome / Android System WebView.");
  var ds=new DecompressionStream("deflate-raw");
  var resp=new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await resp.arrayBuffer());
}
async function zipEntry(buf,wanted){
  var v=new DataView(buf),u8=new Uint8Array(buf),i,eocd=-1;
  for(i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-70000);i--){if(v.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw new Error("This is not a valid .docx file (old .doc files are not supported; save it as .docx first).");
  var count=v.getUint16(eocd+10,true),pos=v.getUint32(eocd+16,true),dec=new TextDecoder();
  for(i=0;i<count;i++){
    if(v.getUint32(pos,true)!==0x02014b50)break;
    var method=v.getUint16(pos+10,true),csize=v.getUint32(pos+20,true),nl=v.getUint16(pos+28,true),el=v.getUint16(pos+30,true),cl=v.getUint16(pos+32,true),lo=v.getUint32(pos+42,true);
    var name=dec.decode(u8.subarray(pos+46,pos+46+nl));
    if(name===wanted){
      var ln=v.getUint16(lo+26,true),le=v.getUint16(lo+28,true),start=lo+30+ln+le,data=u8.subarray(start,start+csize);
      if(method===0)return data;
      if(method===8)return await inflateRaw(data);
      throw new Error("Unsupported Word file compression.");
    }
    pos+=46+nl+el+cl;
  }
  return null;
}
function xmlToText(xml){
  var t=xml.replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g,"")
    .replace(/<w:tab\s*\/>/g," ").replace(/<w:br[^>]*\/>/g,"\n").replace(/<\/w:p>/g,"\n")
    .replace(/<[^>]+>/g,"");
  return t.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,"\"").replace(/&apos;/g,"'")
    .replace(/&#x([0-9a-fA-F]+);/g,function(m,h){return String.fromCharCode(parseInt(h,16));})
    .replace(/&#(\d+);/g,function(m,d){return String.fromCharCode(parseInt(d,10));})
    .replace(/&amp;/g,"&");
}
function textToPages(text,cap){
  var paras=text.split(/\r?\n/).map(function(s){return s.replace(/[ \t]+/g," ").trim();}).filter(Boolean);
  var pages=[],cur="";
  paras.forEach(function(p){
    if(cur&&cur.length+p.length>3000){pages.push(cur);cur="";}
    cur+=(cur?"\n":"")+p;
  });
  if(cur)pages.push(cur);
  return {pages:pages.slice(0,cap||MAX_PAGES),total:pages.length};
}
async function readDocx(file){
  var buf=await file.arrayBuffer();
  var data=await zipEntry(buf,"word/document.xml");
  if(!data)throw new Error("Could not find the text inside this Word file.");
  return textToPages(xmlToText(new TextDecoder().decode(data)));
}
async function readTxt(file){return textToPages(await file.text());}
async function readFileText(file){
  var n=(file.name||"").toLowerCase();
  if(/\.docx$/.test(n))return await readDocx(file);
  if(/\.txt$/.test(n))return await readTxt(file);
  if(/\.doc$/.test(n))throw new Error("Old .doc files are not supported. Open it in Word or WPS and save it as .docx, then choose it again.");
  return await readPdf(file);
}
function chunkPages(pages){
  var out=[],cur="";
  pages.forEach(function(t,i){
    var s="\n[Page "+(i+1)+"]\n"+t;
    if(cur&&cur.length+s.length>CHUNK){out.push(cur);cur="";}
    cur+=s;
  });
  if(cur.replace(/\[Page \d+\]|\s/g,"").length>=80)out.push(cur);
  return out;
}

/* ---------- accuracy test: maths questions with known answers ---------- */
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function shuf(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=rnd(0,i),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function makeSet(){
  var qs=[],i;
  function add(stem,ans){
    var wrong=shuf([ans+1,ans-1,ans+2,ans-2,ans+5,ans-5,ans*2,ans+10,ans-10]).filter(function(v,k,arr){return v>0&&v!==ans&&arr.indexOf(v)===k;}).slice(0,3);
    qs.push({stem:stem,ans:ans,opts:shuf([ans].concat(wrong))});
  }
  for(i=0;i<3;i++){var P=[10,15,20,25,30,40,50,60][rnd(0,7)],N=rnd(2,40)*20;add("What is "+P+"% of "+N+"?",P*N/100);}
  for(i=0;i<3;i++){var a=rnd(2,9),x=rnd(2,12),b=rnd(1,20);add("Solve for x: "+a+"x + "+b+" = "+(a*x+b),x);}
  for(i=0;i<3;i++){var L=rnd(5,30),W=rnd(3,20);add("A rectangle has length "+L+" cm and width "+W+" cm. What is its area in square centimetres?",L*W);}
  for(i=0;i<3;i++){var m=rnd(10,60),d=[rnd(-6,6),rnd(-6,6),rnd(-6,6)];d.push(-(d[0]+d[1]+d[2]));var nums=[m+d[0],m+d[1],m+d[2],m+d[3]].concat([m]);add("Find the mean of these numbers: "+nums.join(", ")+".",m);}
  return shuf(qs);
}
async function accuracyTest(){
  if(ST.busy)return;ST.busy=true;
  var out=$("ebAccOut");if(out)out.innerHTML="";
  try{
    var set=makeSet(),text="MALAWI SCHOOL PRACTICE PAPER - MATHEMATICS\nAnswer all questions.\n";
    set.forEach(function(q,i){text+="\n"+(i+1)+". "+q.stem+"\n"+q.opts.map(function(o,k){return "ABCD"[k]+". "+o;}).join("\n")+"\n";});
    say("ebAccSt","Running the test (about 20 seconds)…");
    var j=await build(text,{level:"Secondary",cls:"Form 4",subject:"Mathematics"});
    var kept=j.questions||[],right=0,wrong=0,unk=0;
    kept.forEach(function(k){
      var qn=norm(k.q),hit=set.filter(function(s){return qn.indexOf(norm(s.stem))>=0;})[0];
      if(!hit){unk++;return;}
      if(norm(k.options[k.correct])===norm(hit.ans))right++;else wrong++;
    });
    var asked=set.length,dropped=asked-kept.length;
    say("ebAccSt","Test finished.");
    if(out)out.innerHTML="<div style='font-size:13.5px;line-height:1.6'>Questions asked: <b>"+asked+"</b><br>Found by the AI: <b>"+(j.found||0)+"</b><br>Kept (both AIs agreed): <b>"+kept.length+"</b><br>Kept and <b style='color:#2FA36B'>correct</b>: <b>"+right+"</b><br>Kept but <b style='color:#d9534f'>wrong</b>: <b>"+wrong+"</b>"+(unk?"<br>Could not match: "+unk:"")+"<br>Dropped (AIs disagreed or unsure): <b>"+dropped+"</b></div><div class='note'>Wrong kept answers are the dangerous ones. Aim for 0 here. This test is easy maths, so real papers will be a little less accurate. Run it 2 or 3 times for a fair picture.</div>";
  }catch(e){say("ebAccSt","Test stopped: "+((e&&e.message)||e));}
  ST.busy=false;
}

/* ---------- build from a paper ---------- */
function ctxNow(){return {level:$("ebLevel").value,cls:$("ebClass").value,subject:clean($("ebSubj").value),title:clean($("ebTitle").value),year:clean($("ebYear").value)};}
function fillClasses(){
  var lv=$("ebLevel").value,cl=(LEVELS[lv]&&LEVELS[lv].classes)||[];
  $("ebClass").innerHTML="<option value=''>— choose —</option>"+cl.map(function(c){return "<option value=\""+E(c)+"\">"+E(c)+"</option>";}).join("");
}
async function buildPaper(){
  if(ST.busy)return;
  var f=$("ebFile").files[0],c=ctxNow();
  if(!f){say("ebSt","Choose a file first (PDF, Word .docx or .txt).");return;}
  if(!c.cls||!c.subject||!c.title){say("ebSt","Fill in class, subject and title first.");return;}
  ST.busy=true;ST.built=[];ST.meta=null;drawResults();
  var found=0,limitHit=false;
  try{
    say("ebSt","Reading the file…");
    var rd=await readFileText(f),chunks=chunkPages(rd.pages),scanNote="";
    var isPdf=!/\.(docx|txt|doc)$/i.test(f.name||"");
    if(!chunks.length&&isPdf){
      var sc=await readScanned(f,c);
      rd=textToPages(sc.text,60);
      chunks=chunkPages(rd.pages);
      scanNote=" (scanned paper, "+sc.read+" of "+sc.total+" pages read"+(sc.limitHit?", AI limit reached while reading":"")+")";
    }
    if(!chunks.length){
      say("ebSt",isPdf?"Could not read any text from the page pictures. The scan may be too faint or blank.":"No readable text found in this file.");
      ST.busy=false;return;
    }
    var seen={};
    for(var k=0;k<chunks.length;k++){
      say("ebSt","Part "+(k+1)+" of "+chunks.length+" (parts of the file read: "+rd.pages.length+" of "+rd.total+")… kept so far: "+ST.built.length);
      try{
        var j=await build(chunks[k],c);
        found+=j.found||0;
        (j.questions||[]).forEach(function(q){var key=norm(q.q);if(seen[key])return;seen[key]=1;ST.built.push(q);});
      }catch(e){
        if(e&&e.limit){limitHit=true;break;}
        throw e;
      }
      drawResults();
      if(k<chunks.length-1)await wait(GAP_MS);
    }
    ST.meta=c;
    say("ebSt",(limitHit?"Stopped: the AI limit was reached. ":"Done. ")+"Questions found: "+found+" · kept (both AIs agreed): "+ST.built.length+" · dropped: "+(found-ST.built.length)+"."+scanNote+(found===0?" No multiple-choice questions were found. If this paper only has written (structured) questions, that is expected.":""));
  }catch(e){say("ebSt","Stopped: "+((e&&e.message)||e));}
  ST.busy=false;drawResults();
}
function drawResults(){
  var box=$("ebList");if(!box)return;
  var q=ST.built,h="";
  if(q.length){
    h+="<button type='button' class='btn green' id='ebSave' style='margin:0 0 10px'>Save "+q.length+" questions</button>";
    q.forEach(function(it,i){
      h+="<div style='border:1px solid var(--line);border-radius:9px;padding:8px 12px;margin:0 0 8px;font-size:13px;word-break:break-word'><b>"+(i+1)+". "+E(it.q)+"</b>"
        +it.options.map(function(o,k){return "<div style='"+(k===it.correct?"color:#2FA36B;font-weight:700":"color:var(--sub)")+"'>"+"ABCD"[k]+". "+E(o)+(k===it.correct?" ✓":"")+"</div>";}).join("")+"</div>";
    });
  }
  box.innerHTML=h;
  var b=$("ebSave");if(b)b.onclick=save;
}
async function save(){
  if(ST.busy||!ST.built.length||!ST.meta)return;
  ST.busy=true;var m=ST.meta;
  try{
    var pk=[m.level,m.cls,m.subject,m.title,m.year].join("|").toLowerCase().replace(/\s+/g," ").slice(0,200);
    var ex=await sb.from("exam_questions").select("q_text").eq("paper_key",pk).limit(1000);
    if(ex.error)throw ex.error;
    var have={};(ex.data||[]).forEach(function(r){have[norm(r.q_text)]=1;});
    var rows=ST.built.filter(function(q){return !have[norm(q.q)];}).map(function(q){
      return {paper_key:pk,level:m.level,class:m.cls,subject:m.subject,source_title:m.title,source_year:m.year,q_text:q.q,options:q.options,correct_index:q.correct,verified_by:q.verifiedBy||"mistral+gemini"};
    });
    var skipped=ST.built.length-rows.length;
    if(rows.length){var r=await sb.from("exam_questions").insert(rows);if(r.error)throw r.error;}
    say("ebSt","Saved "+rows.length+" question(s)."+(skipped?" "+skipped+" already saved before, skipped.":""));
    ST.built=[];drawResults();
  }catch(e){say("ebSt","Could not save: "+((e&&e.message)||e));}
  ST.busy=false;
}

/* ---------- screen ---------- */
function render(body){
  var lv=Object.keys(LEVELS).map(function(k){return "<option value=\""+E(k)+"\">"+E(LEVELS[k].label||k)+"</option>";}).join("");
  body.innerHTML="<div class='note' style='margin-top:0'><b>AI Examination Room — Exam Builder.</b> Two different AIs answer each question separately. A question is kept only if both agree. Nothing is saved until you tap Save.</div>"
   +"<div style='font-weight:700;margin:10px 0 6px'>1. Accuracy test</div>"
   +"<button type='button' class='btn' id='ebAcc'>Run accuracy test (12 maths questions)</button>"
   +"<div id='ebAccSt' style='color:var(--sub);font-size:12.5px;margin:8px 0'></div><div id='ebAccOut'></div>"
   +"<div style='font-weight:700;margin:16px 0 6px'>2. Build from a paper</div>"
   +"<input id='ebFile' type='file' accept='application/pdf,.pdf,.docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain' style='margin:0 0 10px;max-width:100%'>"
   +"<div class='row2'><div class='field' style='margin:0 0 8px'><label>Level</label><select id='ebLevel'>"+lv+"</select></div>"
   +"<div class='field' style='margin:0 0 8px'><label>Class</label><select id='ebClass'></select></div></div>"
   +"<div class='field' style='margin:0 0 8px'><label>Subject</label><input id='ebSubj' placeholder='e.g. Biology'></div>"
   +"<div class='row2'><div class='field' style='margin:0 0 8px'><label>Paper title</label><input id='ebTitle' placeholder='e.g. Biology Paper 1'></div>"
   +"<div class='field' style='margin:0 0 8px'><label>Year (optional)</label><input id='ebYear' placeholder='e.g. 2019'></div></div>"
   +"<button type='button' class='btn' id='ebGo'>Read paper and build questions</button>"
   +"<div id='ebSt' style='color:var(--sub);font-size:12.5px;margin:10px 0'></div><div id='ebList'></div>";
  fillClasses();
  $("ebLevel").onchange=fillClasses;
  $("ebAcc").onclick=accuracyTest;
  $("ebGo").onclick=buildPaper;
  drawResults();
}

window.EduExamBuilder={render:render,version:"1.2",_readFileText:readFileText};
})();
