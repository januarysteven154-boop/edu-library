/* Edu Library - AI Examination Room, Admin side: Exam Builder v3.1 (saves papers to server C, with a space meter; fills Class, Subject, Title and Year from the file by itself). Builds checked multiple-choice questions (two AIs must agree) AND written questions (the AI finds them and drafts the model answers) from the text of an exam paper (PDF with text, SCANNED PDF read by AI, Word .docx, or .txt) and saves them to server C through the backend. Includes an accuracy test with maths questions whose answers are known.
   v3.1: old Word .doc files can now be opened (text is read straight from the file, no library); .docx, PDF and .txt work as before.
   v3.0: NEW LOOK (gold and blue, scoped under the .eb class so the Library Manager is not touched): own title, collapsible how-it-works card, Server C / Server D usage bars, numbered cards 1 Accuracy check and 2 Build from a paper, big file box with the chosen file name, Build exam and Clear buttons. All the building, saving, review and delete logic is unchanged.
   v2.8: the list of saved papers moved to its own screen. A button "Uploaded exams" at the top of the builder opens it (Review questions and Delete for each paper) and "Back to builder" returns. The builder screen is shorter and cleaner.
   v2.7: in section 3, each saved paper has a "Review questions" button that opens all its questions (multiple choice with the marked answer, written questions with the model answer) so you can check a paper before or instead of deleting it. Uses the backend room=paper call (no backend change).
   v2.6: section 3 lists the papers saved in the Examination Room (newest first) with a Delete button (tap twice), so wrong uploads can be removed and students are not confused. Uses the backend room=index and room=del calls (no backend change).
   v2.5: CHICHEWA papers are built as WRITTEN questions only (no multiple choice, no pictures step), because letters, compositions and grammar were being forced into A-D options. Any paper whose Subject contains "Chichewa" is handled this way.
   v2.4: Word files keep UNDERLINED words as __word__ in the text sent to the AI (needs backend lib/examBuild.js to explain the markers).
   v2.3: WRITTEN QUESTIONS, FULLY AUTOMATIC. In the same run as the multiple-choice questions, the AI also finds the questions the student must answer in their own words (short answer, structured parts, describe, essay, letter, comprehension, note making) and drafts a model answer for each. You type nothing. One Save puts both kinds into the same paper. A written question that needs a diagram is held (not saved) because its model answer cannot be trusted without seeing the picture; a question where the student must draw is dropped. Works with backend lib/examBuild.js v7, lib/roomStore.js v2 and lib/roomMark.js.
   v2.1: a paper with only written questions now says so clearly; works with backend examBuild.js v6.
   v2.0: FULLY AUTOMATIC. Choosing the file starts everything by itself (read, questions, pictures); only Save is left for you.
   v1.7 to v1.9: scanned-paper reading by AI, report of kept / held / dropped, pictures cut out of the page and saved with the paper, one run with one button. */
(function(){
"use strict";
var URL_BUILD="https://edu-ai-backend-three.vercel.app/api/book-link?exambuild=1";
var CHUNK=3500,MAX_PAGES=30,GAP_MS=6000,OCR_BATCH=2,OCR_GAP_MS=5000,WGAP_MS=11000;
var ST=window.__eduEB=window.__eduEB||{built:[],meta:null,busy:false};
ST.held=ST.held||[];ST.lost=ST.lost||[];ST.pics=ST.pics||{};
ST.written=ST.written||[];ST.wheld=ST.wheld||[];ST.wlost=ST.wlost||[];

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
async function buildRetry(text,ctx){
  try{return await build(text,ctx);}
  catch(e){
    if(e&&e.limit)throw e;
    await wait(20000);
    return await build(text,ctx);
  }
}
async function buildWritten(text,ctx){return post({written:true,text:text,level:ctx.level,class:ctx.cls,subject:ctx.subject});}
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
/* the AI reading of the page pictures is kept in memory, so running the same file again does not read the pictures again */
async function getScanned(file,ctx){
  var key=(file.name||"")+"|"+file.size+"|"+file.lastModified;
  if(ST.ocr&&ST.ocr.key===key&&ST.ocr.text){return {text:ST.ocr.text,total:ST.ocr.total,read:ST.ocr.read,limitHit:false,again:true};}
  var sc=await readScanned(file,ctx);
  if(!sc.limitHit&&sc.text.trim())ST.ocr={key:key,text:sc.text,total:sc.total,read:sc.read};
  return sc;
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
/* v2.4: underlined words are kept as __word__ (needed for English questions such as "What part of speech is the underlined word?") */
function runUnderlined(run){
  var rp=run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  if(!rp)return false;
  var u=rp[0].match(/<w:u(?:\s[^>]*)?\/?>/);
  if(!u)return false;
  return !/w:val="(?:none|0)"/.test(u[0]);
}
function markersToUnderscores(t){
  return t.replace(/\u0001([\s\S]*?)\u0002/g,function(m,inner){
    return inner.split("\n").map(function(line){
      var p=line.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return p[2]?p[1]+"__"+p[2]+"__"+p[3]:line;
    }).join("\n");
  });
}
function xmlToText(xml){
  var t=xml.replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g,"");
  t=t.replace(/<w:r[ >][\s\S]*?<\/w:r>/g,function(run){
    var txt=run.replace(/<w:tab\s*\/>/g," ").replace(/<w:br[^>]*\/>/g,"\n").replace(/<\/w:p>/g,"\n").replace(/<[^>]+>/g,"");
    return (txt.trim()&&runUnderlined(run))?"\u0001"+txt+"\u0002":txt;
  }).replace(/\u0002(?:<[^>]*>)*\u0001/g,"");
  t=t.replace(/<w:tab\s*\/>/g," ").replace(/<w:br[^>]*\/>/g,"\n").replace(/<\/w:p>/g,"\n").replace(/<[^>]+>/g,"");
  t=t.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,"\"").replace(/&apos;/g,"'")
    .replace(/&#x([0-9a-fA-F]+);/g,function(m,h){return String.fromCharCode(parseInt(h,16));})
    .replace(/&#(\d+);/g,function(m,d){return String.fromCharCode(parseInt(d,10));})
    .replace(/&amp;/g,"&");
  return markersToUnderscores(t);
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
/* ---------- reading an old Word .doc (no library needed) ---------- */
function docOle(u8){
  var dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength),i;
  var ss=1<<dv.getUint16(30,true),ms=1<<dv.getUint16(32,true);
  var nFat=dv.getUint32(44,true),dirStart=dv.getUint32(48,true),cutoff=dv.getUint32(56,true);
  var mfStart=dv.getUint32(60,true),difStart=dv.getUint32(68,true),nDif=dv.getUint32(72,true);
  function secOff(s){return (s+1)*ss;}
  var fatSecs=[];
  for(i=0;i<109&&fatSecs.length<nFat;i++){var v=dv.getUint32(76+i*4,true);if(v<0xFFFFFFFA)fatSecs.push(v);}
  var ds=difStart,per=ss/4-1;
  while(nDif-->0&&ds<0xFFFFFFFA){
    var o=secOff(ds);
    for(i=0;i<per&&fatSecs.length<nFat;i++){var v2=dv.getUint32(o+i*4,true);if(v2<0xFFFFFFFA)fatSecs.push(v2);}
    ds=dv.getUint32(o+per*4,true);
  }
  var fat=[];
  fatSecs.forEach(function(s){var o=secOff(s);for(var k=0;k<ss/4;k++)fat.push(dv.getUint32(o+k*4,true));});
  function chain(start,table){var out=[],s=start,g=0;while(s<0xFFFFFFFA&&g++<2000000){out.push(s);s=table[s];if(s===undefined)break;}return out;}
  function readFat(start,size){
    var secs=chain(start,fat),out=new Uint8Array(secs.length*ss);
    secs.forEach(function(s,k){var o=secOff(s);out.set(u8.subarray(o,Math.min(o+ss,u8.length)),k*ss);});
    return size==null?out:out.subarray(0,size);
  }
  var dir=readFat(dirStart),ddv=new DataView(dir.buffer,dir.byteOffset,dir.byteLength),ents=[];
  for(i=0;i+128<=dir.length;i+=128){
    var nl=ddv.getUint16(i+64,true),nm="";
    for(var c=0;c<(nl/2)-1;c++)nm+=String.fromCharCode(ddv.getUint16(i+c*2,true));
    ents.push({name:nm,type:dir[i+66],start:ddv.getUint32(i+116,true),size:ddv.getUint32(i+120,true)});
  }
  var mini=null,miniFat=null;
  function ensureMini(){
    if(mini)return;
    mini=readFat(ents[0].start,ents[0].size);
    var mfb=readFat(mfStart),mdv=new DataView(mfb.buffer,mfb.byteOffset,mfb.byteLength);miniFat=[];
    for(var k=0;k<mfb.length/4;k++)miniFat.push(mdv.getUint32(k*4,true));
  }
  function stream(name){
    for(var k=0;k<ents.length;k++){
      var e=ents[k];
      if(e.type===2&&e.name===name){
        if(e.size<cutoff){
          ensureMini();
          var secs=chain(e.start,miniFat),out=new Uint8Array(secs.length*ms);
          secs.forEach(function(s,j){out.set(mini.subarray(s*ms,s*ms+ms),j*ms);});
          return out.subarray(0,e.size);
        }
        return readFat(e.start,e.size);
      }
    }
    return null;
  }
  return {stream:stream};
}
function docClean(s){
  var st=[],o="",prev7=false,i,ch;
  for(i=0;i<s.length;i++){
    ch=s.charCodeAt(i);
    if(ch===19){st.push(true);continue;}
    if(ch===20){if(st.length)st[st.length-1]=false;continue;}
    if(ch===21){st.pop();continue;}
    if(st.indexOf(true)>-1)continue;
    if(ch===7){o+=prev7?"\n":"\t";prev7=true;continue;}
    prev7=false;
    if(ch===13||ch===11)o+="\n";
    else if(ch===12)o+="\n\n";
    else if(ch===30)o+="-";
    else if(ch===9||ch===10||ch>=32)o+=s.charAt(i);
  }
  return o.replace(/\t+\n/g,"\n").replace(/\n{3,}/g,"\n\n");
}
function docText(u8){
  var bad="This .doc file cannot be read here. Open it in Word or WPS, save it as .docx, then choose it again.";
  var ole=docOle(u8),wd=ole.stream("WordDocument");
  if(!wd||wd.length<200)throw new Error(bad);
  var dv=new DataView(wd.buffer,wd.byteOffset,wd.byteLength);
  if(dv.getUint16(0,true)!==0xA5EC)throw new Error("This .doc file was saved by a very old Word and cannot be read. Open it in Word or WPS, save it as .docx, then choose it again.");
  var flags=dv.getUint16(10,true);
  if(flags&0x0100)throw new Error("This Word file is password protected. Remove the password, save it, then choose it again.");
  var tb=ole.stream((flags&0x0200)?"1Table":"0Table");
  if(!tb)throw new Error(bad);
  var p=32,csw=dv.getUint16(p,true);p+=2+csw*2;
  var cslw=dv.getUint16(p,true);p+=2;
  var ccpText=dv.getInt32(p+12,true);p+=cslw*4;
  p+=2;
  var fcClx=dv.getUint32(p+33*8,true),lcbClx=dv.getUint32(p+33*8+4,true);
  var tdv=new DataView(tb.buffer,tb.byteOffset,tb.byteLength),q=fcClx,end=fcClx+lcbClx,plc=null;
  while(q<end){
    var t=tb[q];
    if(t===1)q+=3+tdv.getUint16(q+1,true);
    else if(t===2){plc=[q+5,tdv.getUint32(q+1,true)];break;}
    else break;
  }
  if(!plc)throw new Error(bad);
  var n=Math.floor((plc[1]-4)/12),base=plc[0],parts=[],i;
  var dAnsi=new TextDecoder("windows-1252"),dUni=new TextDecoder("utf-16le");
  for(i=0;i<n;i++){
    var cp0=tdv.getUint32(base+i*4,true),cp1=tdv.getUint32(base+(i+1)*4,true);
    if(cp0>=ccpText)break;
    if(cp1>ccpText)cp1=ccpText;
    var fc=tdv.getUint32(base+(n+1)*4+i*8+2,true),len=cp1-cp0;
    if(fc&0x40000000){var off=Math.floor((fc&0x3FFFFFFF)/2);parts.push(dAnsi.decode(wd.subarray(off,off+len)));}
    else parts.push(dUni.decode(wd.subarray(fc,fc+len*2)));
  }
  return docClean(parts.join(""));
}
async function readDoc(file){
  var u8=new Uint8Array(await file.arrayBuffer());
  if(u8[0]===0x50&&u8[1]===0x4B)return await readDocx(file);
  var sig=[0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1],ok=u8.length>600;
  for(var i=0;i<8&&ok;i++)if(u8[i]!==sig[i])ok=false;
  if(!ok)throw new Error("This file is named .doc but is not a normal Word file. Open it in Word or WPS, save it as .docx, then choose it again.");
  var txt=docText(u8);
  if(txt.replace(/\s/g,"").length<20)throw new Error("No text was found in this Word file. If it is a scan, save it as PDF and choose the PDF.");
  return textToPages(txt);
}
async function readFileText(file){
  var n=(file.name||"").toLowerCase();
  if(/\.docx$/.test(n))return await readDocx(file);
  if(/\.txt$/.test(n))return await readTxt(file);
  if(/\.doc$/.test(n))return await readDoc(file);
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
/* bigger pieces for the written questions (a question with its parts or a passage must not be cut), and each piece starts with the end of the page before so a question that runs over a page is seen whole at least once */
function chunkPagesW(pages){
  var out=[],cur="",lastSeg="",LIM=6000,OV=1200;
  pages.forEach(function(t,i){
    var s="\n[Page "+(i+1)+"]\n"+String(t||"").slice(0,6500);
    if(cur&&cur.length+s.length>LIM){
      out.push(cur);
      var tail=lastSeg.slice(-OV);
      cur=tail?"\n[continued from the page before]\n"+tail:"";
    }
    cur+=s;lastSeg=s;
  });
  if(cur.replace(/\[Page \d+\]|\[continued[^\]]*\]|\s/g,"").length>=80)out.push(cur);
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
/* v2.5: papers of these subjects are built as written questions only (no multiple choice) */
function writtenOnly(subject){return /chichewa/i.test(String(subject||""));}
function fillClasses(){
  var lv=$("ebLevel").value,cl=(LEVELS[lv]&&LEVELS[lv].classes)||[];
  $("ebClass").innerHTML="<option value=''>— choose —</option>"+cl.map(function(c){return "<option value=\""+E(c)+"\">"+E(c)+"</option>";}).join("");
}
var WHY={options_not_in_file:"its options were not found in the file text",disagree:"the two AIs gave different answers",unsure:"one AI was not sure of the answer"};
var WHYW={needs_drawing:"the student would have to draw, which is not supported yet",too_long:"it is too long to save",multiple_choice:"it looks like multiple choice",not_in_file:"it was not found in the file text",no_answer:"the AI could not write a model answer"};
var KINDS=[["short","Short answer"],["describe","Describe / explain"],["essay","Essay"],["letter","Letter"],["comprehension","Comprehension"],["notes","Note making / summary"],["diagram","Diagram question"]];
function kindLabel(k){for(var i=0;i<KINDS.length;i++)if(KINDS[i][0]===k)return KINDS[i][1];return k;}
/* question numbers of written questions (ready, held or dropped), so they are not reported as "not found" among the multiple-choice numbers */
function wNums(){
  var a=[];
  ST.written.concat(ST.wheld).forEach(function(w){if(w.n)a.push(w.n);});
  ST.wlost.forEach(function(d){if(d.n)a.push(d.n);});
  return a;
}
/* the report: which question numbers were kept, held for a picture, dropped (and why), and not found at all */
function reportCounts(built,held,lost,wn){
  var kn={},all={},i;
  built.forEach(function(q){if(q.n){kn[q.n]=1;all[q.n]=1;}});
  held.forEach(function(q){if(q.n)all[q.n]=1;});
  var shown=lost.filter(function(d){return !(d.n&&kn[d.n]);});
  shown.forEach(function(d){if(d.n)all[d.n]=1;});
  (wn||[]).forEach(function(n){all[n]=1;});
  var nums=Object.keys(all).map(Number),max=nums.length?Math.max.apply(null,nums):0,miss=0;
  for(i=1;i<=max;i++)if(!all[i])miss++;
  return {kept:built.length,held:held.length,dropped:shown.length,missing:miss,max:max,written:false};
}
function reportLines(built,held,lost,wn){
  var kn=[],hn=[],all={},i;
  built.forEach(function(q){if(q.n){kn.push(q.n);all[q.n]=1;}});
  held.forEach(function(q){if(q.n){hn.push(q.n);all[q.n]=1;}});
  var shown=lost.filter(function(d){return !(d.n&&kn.indexOf(d.n)>=0);});
  shown.forEach(function(d){if(d.n)all[d.n]=1;});
  (wn||[]).forEach(function(n){all[n]=1;});
  var nums=Object.keys(all).map(Number),max=nums.length?Math.max.apply(null,nums):0,miss=[];
  for(i=1;i<=max;i++)if(!all[i])miss.push(i);
  var srt=function(a){return a.slice().sort(function(x,y){return x-y;});};
  var out=[];
  if(!built.length&&!held.length&&!shown.length)return out;
  out.push("Multiple choice kept and ready to save: "+built.length+(kn.length?" (No. "+srt(kn).join(", ")+")":""));
  if(held.length)out.push("Multiple choice held (no picture yet): "+held.length+(hn.length?" (No. "+srt(hn).join(", ")+")":"")+".");
  shown.slice(0,40).forEach(function(d){out.push("Dropped No. "+(d.n||"?")+": "+(WHY[d.reason]||d.reason)+". "+String(d.q||"").slice(0,70));});
  if(shown.length>40)out.push("... and "+(shown.length-40)+" more dropped.");
  if(miss.length&&max>0)out.push("Not found by the AI at all (numbers between 1 and "+max+"): "+miss.join(", ")+". Run the same file again to try them.");
  return out;
}
function writtenLines(){
  var out=[],srt=function(a){return a.slice().sort(function(x,y){return x-y;});};
  var rn=ST.written.filter(function(w){return w.n;}).map(function(w){return w.n;});
  var hn=ST.wheld.filter(function(w){return w.n;}).map(function(w){return w.n;});
  if(ST.written.length)out.push("Written questions ready to save: "+ST.written.length+(rn.length?" (No. "+srt(rn).join(", ")+")":""));
  if(ST.wheld.length)out.push("Written questions held (they need a diagram, not saved): "+ST.wheld.length+(hn.length?" (No. "+srt(hn).join(", ")+")":"")+".");
  ST.wlost.slice(0,30).forEach(function(d){out.push("Written dropped No. "+(d.n||"?")+": "+(WHYW[d.reason]||d.reason)+". "+String(d.q||"").slice(0,70));});
  return out;
}
/* the AI finds the written questions and drafts the model answers (backend v7). A question that runs over two pieces is kept once (the longer copy wins). */
async function writtenPass(chunksW,c){
  var map={},lost={},failed=0,lastErr="",limit=false,k;
  for(k=0;k<chunksW.length;k++){
    say("ebSt","Written questions: part "+(k+1)+" of "+chunksW.length+"… found so far: "+Object.keys(map).length+" (the AI is also writing the model answers, please wait)");
    try{
      var j;
      try{j=await buildWritten(chunksW[k],c);}
      catch(e1){if(e1&&e1.limit)throw e1;await wait(20000);j=await buildWritten(chunksW[k],c);}
      (j.written||[]).forEach(function(w){
        var key=w.n?"n"+w.n:"t"+norm(w.q).slice(0,60);
        if(!map[key]||String(w.q).length>String(map[key].q).length)map[key]=w;
      });
      (j.writtenDropped||[]).forEach(function(d){lost[(d.n?"n"+d.n:"t"+norm(d.q).slice(0,40))+"|"+d.reason]=d;});
    }catch(e){
      if(e&&e.limit){limit=true;break;}
      failed++;lastErr=(e&&e.message)||String(e);
    }
    if(k<chunksW.length-1)await wait(WGAP_MS);
  }
  var oks=[],helds=[],okN={};
  Object.keys(map).forEach(function(key){var it=map[key];if(it.n)okN[it.n]=1;(it.needsPicture?helds:oks).push(it);});
  var byN=function(a,b){return (a.n||9999)-(b.n||9999);};
  ST.written=oks.sort(byN);ST.wheld=helds.sort(byN);
  ST.wlost=Object.keys(lost).map(function(key){return lost[key];}).filter(function(d){return !(d.n&&okN[d.n]);});
  return {failed:failed,lastErr:lastErr,limit:limit};
}
async function buildPaper(){
  if(ST.busy)return;
  var f=$("ebFile").files[0],c=ctxNow();
  if(!f){say("ebSt","Choose a file first (PDF, Word .docx, .doc or .txt).");return;}
  if(!c.cls||!c.subject||!c.title){var ms=[];if(!c.cls)ms.push("Class");if(!c.subject)ms.push("Subject");if(!c.title)ms.push("Paper title");say("ebSt","Please fill in: "+ms.join(", ")+".");return;}
  ST.busy=true;ST.built=[];ST.held=[];ST.lost=[];ST.pics={};ST.written=[];ST.wheld=[];ST.wlost=[];ST.meta=null;ST.pdfFile=null;drawResults();
  var limitHit=false;
  try{
    var isPdf=!/\.(docx|txt|doc)$/i.test(f.name||"");
    ST.pdfFile=isPdf?f:null;
    var useScan=isPdf&&$("ebScan")&&$("ebScan").checked;
    var onlyW=writtenOnly(c.subject);
    var rd,chunks,scanNote="";
    if(useScan){
      say("ebSt","Reading the page pictures with AI…");
      var sc0=await getScanned(f,c);
      rd=textToPages(sc0.text,60);chunks=chunkPages(rd.pages);
      scanNote=" (scanned paper, "+sc0.read+" of "+sc0.total+" pages read"+(sc0.again?" before, reused":"")+(sc0.limitHit?", AI limit reached while reading":"")+")";
    }else{
      say("ebSt","Reading the file…");
      rd=await readFileText(f);chunks=chunkPages(rd.pages);
      if(!chunks.length&&isPdf){
        var sc=await getScanned(f,c);
        rd=textToPages(sc.text,60);chunks=chunkPages(rd.pages);
        scanNote=" (scanned paper, "+sc.read+" of "+sc.total+" pages read"+(sc.limitHit?", AI limit reached while reading":"")+")";
      }
    }
    if(!chunks.length){
      say("ebSt",isPdf?"Could not read any text from the page pictures. The scan may be too faint or blank.":"No readable text found in this file.");
      ST.busy=false;return;
    }
    var seenQ={},seenH={},seenL={},failedIdx=[],lastErr="";
    ST.meta=c;
    var runChunk=async function(k){
      var j=await buildRetry(chunks[k],c);
      (j.questions||[]).forEach(function(q){var key=norm(q.q);if(seenQ[key])return;seenQ[key]=1;ST.built.push(q);});
      (j.held||[]).forEach(function(h){var key=norm(h.q);if(seenH[key])return;seenH[key]=1;ST.held.push(h);});
      (j.droppedList||[]).forEach(function(d){var key=norm(d.q);if(seenL[key])return;seenL[key]=1;ST.lost.push(d);});
    };
    /* v2.5: a written-only subject (Chichewa) skips the whole multiple-choice step */
    for(var k=0;k<chunks.length&&!onlyW;k++){
      say("ebSt","Multiple choice: part "+(k+1)+" of "+chunks.length+" (parts of the file read: "+rd.pages.length+" of "+rd.total+")… kept so far: "+ST.built.length);
      try{await runChunk(k);}
      catch(e){
        if(e&&e.limit){limitHit=true;break;}
        failedIdx.push(k);lastErr=(e&&e.message)||String(e);
      }
      drawResults();
      if(k<chunks.length-1)await wait(GAP_MS);
    }
    /* second chance for the parts that failed */
    if(failedIdx.length&&!limitHit){
      var again=failedIdx.slice();failedIdx=[];
      for(var r2=0;r2<again.length;r2++){
        say("ebSt","Trying part "+(again[r2]+1)+" again after a failure… kept so far: "+ST.built.length);
        await wait(GAP_MS+9000);
        try{await runChunk(again[r2]);}
        catch(e2){
          if(e2&&e2.limit){limitHit=true;break;}
          failedIdx.push(again[r2]);lastErr=(e2&&e2.message)||String(e2);
        }
        drawResults();
      }
    }
    ST.meta=c;
    /* pictures: same run, no extra button */
    var picNote="";
    if(ST.held.length&&ST.pdfFile&&!limitHit){
      say("ebSt","Questions done. Now adding the pictures ("+ST.held.length+" question(s) need one)…");
      await wait(GAP_MS);
      var pr=await picturesCore();
      picNote=picLine(pr);
    }
    /* written questions: same run, the AI finds them and writes the model answers */
    var wNote="";
    if(!limitHit){
      var chunksW=chunkPagesW(rd.pages);
      if(chunksW.length){
        if(!onlyW)await wait(GAP_MS);
        var wr=await writtenPass(chunksW,c);
        if(wr.limit){limitHit=true;wNote=" Written questions stopped: the AI limit was reached.";}
        else if(wr.failed)wNote=" "+wr.failed+" written part(s) failed ("+wr.lastErr+"); run the same file again later, Save skips questions already saved.";
      }
    }
    if(onlyW)wNote+=" "+c.subject+" is built as written questions only (no multiple choice). The model answers are drafted by AI, which is weak in Chichewa: look at them before you save.";
    ST.busy=false;drawResults();
    var cn=reportCounts(ST.built,ST.held,ST.lost,wNums()),withPic=ST.built.filter(function(b){return b.img;}).length;
    say("ebSt",(limitHit?"Stopped: the AI limit was reached. ":(failedIdx.length?"Finished with problems. ":"Done. "))+"Ready to save: "+cn.kept+" multiple choice"+(withPic?" ("+withPic+" with a picture)":"")+" · "+ST.written.length+" written · Held: "+(cn.held+ST.wheld.length)+" · Dropped: "+(cn.dropped+ST.wlost.length)+(cn.missing?" · Not found: "+cn.missing:"")+"."+(picNote?" "+picNote:"")+scanNote+wNote+(failedIdx.length?" "+failedIdx.length+" multiple-choice part(s) failed twice ("+lastErr+"). Save what is ready, then run the same file again later; Save skips questions already saved.":"")+((ST.built.length||ST.written.length)?" Everything is ready: look at the questions, then tap Save.":(!ST.held.length&&!ST.wheld.length&&!cn.dropped&&!ST.wlost.length?" No questions were found in this file.":"")));
    try{var sv=$("ebSave");if(sv&&sv.scrollIntoView)sv.scrollIntoView({behavior:"smooth",block:"start"});}catch(e9){}
  }catch(e){say("ebSt","Stopped: "+((e&&e.message)||e));}
  ST.busy=false;drawResults();
}
/* ---------- pictures for the questions that need one ---------- */
var PIC_MAX=110000; /* saved picture: about 100 KB at most */
function dataBytes(d){return Math.floor((d.length-d.indexOf(",")-1)*0.75);}
/* cut the picture out of a page (box = [top,left,bottom,right] in 0-1000 units), small enough to save */
async function cropPage(pdf,pageNum,box){
  var g=await pdf.getPage(pageNum),v1=g.getViewport({scale:1});
  var sc=Math.min(3,2400/Math.max(v1.width,v1.height));
  var vp=g.getViewport({scale:sc}),cv=document.createElement("canvas");
  cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);
  var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);
  await g.render({canvasContext:cx,viewport:vp}).promise;
  var pad=0.012,y0=Math.max(0,box[0]/1000-pad),x0=Math.max(0,box[1]/1000-pad),y1=Math.min(1,box[2]/1000+pad),x1=Math.min(1,box[3]/1000+pad);
  var sx=Math.floor(x0*cv.width),sy=Math.floor(y0*cv.height),sw=Math.max(8,Math.floor((x1-x0)*cv.width)),sh=Math.max(8,Math.floor((y1-y0)*cv.height));
  var k=Math.min(1,900/sw),ow=Math.max(8,Math.floor(sw*k)),oh=Math.max(8,Math.floor(sh*k));
  var out=document.createElement("canvas");out.width=ow;out.height=oh;
  var ox=out.getContext("2d");ox.fillStyle="#fff";ox.fillRect(0,0,ow,oh);
  ox.drawImage(cv,sx,sy,sw,sh,0,0,ow,oh);
  cv.width=0;cv.height=0;
  var jpeg=out.toDataURL("image/jpeg",0.8),web="",ext="webp",qs=[0.72,0.6,0.5,0.4],i;
  for(i=0;i<qs.length;i++){web=out.toDataURL("image/webp",qs[i]);if(web.indexOf("data:image/webp")!==0)break;if(dataBytes(web)<=PIC_MAX)break;}
  if(web.indexOf("data:image/webp")!==0){ext="jpg";web="";for(i=0;i<qs.length;i++){web=out.toDataURL("image/jpeg",qs[i]);if(dataBytes(web)<=PIC_MAX)break;}}
  out.width=0;out.height=0;
  return {jpeg:jpeg.split(",")[1],save:web.split(",")[1],ext:ext,bytes:dataBytes(web),preview:web};
}
function picLine(r){
  return "Pictures: "+r.added+" added"+(r.textOnly?", "+r.textOnly+" needed none":"")+(r.reasons.length?". Problem: "+r.reasons.join("; "):"")+".";
}
async function addPictures(){
  if(ST.busy||!ST.held.length||!ST.pdfFile||!ST.meta)return;
  ST.busy=true;drawResults();
  var r=await picturesCore();
  say("ebSt",picLine(r)+" Still held: "+ST.held.length+". Look at each picture below before you tap Save.");
  ST.busy=false;drawResults();
}
async function picturesCore(){
  var c=ST.meta,found={},groups={},reasons=[],added=0,textOnly=0,limitHit=false,pdf=null;
  try{
    var buf=await ST.pdfFile.arrayBuffer();
    pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
    var n=Math.min(pdf.numPages,MAX_PAGES),withNum=ST.held.filter(function(h){return h.n;});
    /* 1. where is the picture of each held question? (the AI looks at 2 pages at a time) */
    for(var pass=0;pass<2&&!limitHit;pass++){
    var p=1+pass;
    if(pass>0){
      if(!withNum.filter(function(h){return !found[h.n];}).length)break;
      await wait(OCR_GAP_MS);
    }
    while(p<=n&&!limitHit){
      var left=withNum.filter(function(h){return !found[h.n];});
      if(!left.length)break;
      var last=Math.min(p+OCR_BATCH-1,n),imgs=[];
      say("ebSt","Looking for the pictures"+(pass?" (second look)":"")+": pages "+p+(last>p?"–"+last:"")+" of "+n+". Questions still to find: "+left.length+"…");
      for(var q=p;q<=last;q++)imgs.push(await pageImage(pdf,q));
      try{
        var j=await post({figures:true,images:imgs,qs:left.map(function(h){return {n:h.n,q:h.q};}),level:c.level,class:c.cls,subject:c.subject});
        (j.items||[]).forEach(function(it){
          if(!it.found||found[it.n])return;
          if(!(it.needsPicture===false||(it.box&&it.image)))return;
          found[it.n]={noPic:it.needsPicture===false,page:it.image?p+it.image-1:0,box:it.box};
        });
      }catch(e){
        if(e&&e.limit){limitHit=true;break;}
        throw e;
      }
      p=last+1;
      if(p<=n)await wait(OCR_GAP_MS);
    }
    }
    if(limitHit)reasons.push("the AI limit was reached while looking for pictures");
    /* 2. group the questions: same picture together, questions that need no picture together */
    ST.held.forEach(function(h){
      var f=h.n?found[h.n]:null;
      if(!f)return;
      if(f.noPic){(groups.text=groups.text||{items:[]}).items.push(h);return;}
      if(!f.box||!f.page)return;
      var key=f.page+"|"+f.box.map(function(v){return Math.round(v/20);}).join(",");
      (groups[key]=groups[key]||{page:f.page,box:f.box,items:[]}).items.push(h);
    });
    /* 3. cut each picture out, let both AIs look at it, keep what they agree on */
    var keys=Object.keys(groups),answered={},gi=0;
    for(var ki=0;ki<keys.length&&!limitHit;ki++){
      var gr=groups[keys[ki]],crop=null;
      gi++;
      say("ebSt","Picture "+gi+" of "+keys.length+": cutting it out and asking both AIs to look at it…");
      try{
        if(gr.box)crop=await cropPage(pdf,gr.page,gr.box);
        var r=await post({answerPics:true,image:crop?crop.jpeg:"",qs:gr.items.slice(0,8).map(function(h){return {n:h.n,q:h.q,options:h.options};}),level:c.level,class:c.cls,subject:c.subject});
        var name=null;
        if(crop){
          name="fig"+gr.page+"-"+gr.box.map(function(v){return Math.round(v/10).toString(36);}).join("")+"."+crop.ext;
          name=name.toLowerCase();
        }
        (r.kept||[]).forEach(function(k){
          var it={q:k.q,options:k.options,correct:k.correct,verifiedBy:k.verifiedBy,n:k.n};
          if(crop){it.img=name;it.preview=crop.preview;ST.pics[name]=crop.save;added++;}else textOnly++;
          ST.built.push(it);answered[k.n]=1;
        });
        (r.droppedList||[]).forEach(function(d){ST.lost.push(d);answered[d.n]=1;});
      }catch(e){
        if(e&&e.limit){limitHit=true;reasons.push("the AI limit was reached");break;}
        reasons.push("a group of questions failed ("+((e&&e.message)||e)+")");
      }
      drawResults();
      if(ki<keys.length-1)await wait(6000);
    }
    ST.held=ST.held.filter(function(h){return !(h.n&&answered[h.n]);});
    var noFound=ST.held.filter(function(h){return h.n&&!found[h.n];}).map(function(h){return h.n;});
    var noBox=ST.held.filter(function(h){return h.n&&found[h.n]&&!found[h.n].noPic&&!(found[h.n].box&&found[h.n].page);}).map(function(h){return h.n;});
    if(noFound.length)reasons.push("No. "+noFound.join(", ")+(noFound.length>1?" were":" was")+" not found on the page pictures");
    if(noBox.length)reasons.push("the picture of No. "+noBox.join(", ")+" could not be located");
  }catch(e){reasons.push("stopped: "+((e&&e.message)||e));}
  try{if(pdf)pdf.destroy();}catch(e3){}
  drawResults();
  return {added:added,textOnly:textOnly,reasons:reasons};
}
function dropBuilt(i){
  if(ST.busy)return;
  var it=ST.built[i];if(!it)return;
  ST.built.splice(i,1);drawResults();
}
function dropWritten(i){
  if(ST.busy)return;
  if(!ST.written[i])return;
  ST.written.splice(i,1);drawResults();
}
function drawResults(){
  var box=$("ebList");if(!box)return;
  var q=ST.built,w=ST.written,h="",wn=wNums();
  var rep=reportLines(ST.built,ST.held,ST.lost,wn).concat(writtenLines()),cn=reportCounts(ST.built,ST.held,ST.lost,wn);
  if(rep.length){
    h+="<div style='border:1px solid var(--line);border-radius:9px;padding:8px 12px;margin:0 0 10px;font-size:13px;line-height:1.5;color:var(--sub);word-break:break-word'><b style='color:var(--ink)'>Ready "+cn.kept+" multiple choice · "+w.length+" written</b> · Held "+(cn.held+ST.wheld.length)+" · Dropped "+(cn.dropped+ST.wlost.length)+(cn.missing?" · Not found "+cn.missing:"")
      +"<details style='margin-top:6px'><summary style='cursor:pointer;color:var(--ink)'>Details</summary><div style='font-size:12.5px;line-height:1.55;margin-top:6px'>"+rep.map(function(l){return "<div>"+E(l)+"</div>";}).join("")+"</div></details></div>";
  }
  if(ST.held.length&&ST.pdfFile&&!ST.busy)h+="<button type='button' class='btn' id='ebPics' style='margin:0 0 10px'>Try pictures again ("+ST.held.length+" held)</button>";
  if(ST.held.length&&!ST.pdfFile&&!ST.busy)h+="<div style='font-size:12.5px;color:var(--sub);margin:0 0 10px'>Pictures can only be added from a PDF paper for now.</div>";
  if(q.length||w.length){
    h+="<button type='button' class='btn green' id='ebSave' style='margin:0 0 10px'>Save "+(q.length+w.length)+" questions ("+q.length+" multiple choice, "+w.length+" written)</button>";
  }
  if(q.length){
    h+="<div style='font-weight:700;margin:6px 0'>Multiple choice ("+q.length+")</div>";
    q.forEach(function(it,i){
      h+="<div style='background:#0C2850;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 10px;font-size:13px;word-break:break-word'><b>"+(i+1)+". "+E(it.q)+"</b>"
        +(it.preview?"<img alt='Picture for this question' src=\""+E(it.preview)+"\" style='display:block;max-width:100%;max-height:260px;margin:8px auto;border-radius:8px;background:#fff;border:1px solid var(--line)'>":"")
        +it.options.map(function(o,k){return "<div style='"+(k===it.correct?"color:#2FA36B;font-weight:700":"color:var(--sub)")+"'>"+"ABCD"[k]+". "+E(o)+(k===it.correct?" ✓":"")+"</div>";}).join("")
        +(it.img?"<button type='button' class='ebDrop' data-i='"+i+"' style='margin-top:8px;border:1px solid var(--line);background:rgba(127,127,127,.15);color:var(--ink);border-radius:8px;padding:6px 10px;font-size:12.5px'>Don't save this question</button>":"")
        +"</div>";
    });
  }
  if(w.length){
    h+="<div style='font-weight:700;margin:10px 0 6px'>Written questions ("+w.length+")</div>";
    w.forEach(function(it,i){
      h+="<div style='background:#0C2850;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 10px;font-size:13px;word-break:break-word'>"
        +"<div style='color:var(--sub);font-size:12px'>"+(it.n?"No. "+it.n+" · ":"")+E(kindLabel(it.kind))+" · "+it.marks+" mark"+(it.marks>1?"s":"")+"</div>"
        +"<div style='margin-top:4px;white-space:pre-wrap'><b>"+E(it.q.length>400?it.q.slice(0,400)+"…":it.q)+"</b></div>"
        +"<details style='margin-top:6px'><summary style='cursor:pointer;color:var(--sub);font-size:12.5px'>Model answer the AI wrote (students never see it)</summary><div style='margin-top:4px;color:#2FA36B;font-size:12.5px;white-space:pre-wrap'>"+E(it.answer)+"</div></details>"
        +"<button type='button' class='wDrop' data-i='"+i+"' style='margin-top:8px;border:1px solid var(--line);background:rgba(127,127,127,.15);color:var(--ink);border-radius:8px;padding:6px 10px;font-size:12.5px'>Don't save this question</button>"
        +"</div>";
    });
  }
  box.innerHTML=h;
  var b=$("ebSave");if(b)b.onclick=save;
  var pb=$("ebPics");if(pb)pb.onclick=addPictures;
  var ds=box.querySelectorAll?box.querySelectorAll(".ebDrop"):[];
  for(var di=0;di<ds.length;di++)ds[di].onclick=(function(el){return function(){dropBuilt(parseInt(el.getAttribute("data-i"),10));};})(ds[di]);
  var ws=box.querySelectorAll?box.querySelectorAll(".wDrop"):[];
  for(var wi=0;wi<ws.length;wi++)ws[wi].onclick=(function(el){return function(){dropWritten(parseInt(el.getAttribute("data-i"),10));};})(ws[wi]);
}
/* ---------- Examination Room storage (server C, with server D as back-up space) ---------- */
var URL_ROOM="https://edu-ai-backend-three.vercel.app/api/book-link?room=";
var URL_USAGE="https://edu-ai-backend-three.vercel.app/api/book-link?usage=1";
async function roomCall(action,payload,extra){
  var tok=await token();
  var r=await fetch(URL_ROOM+action+(extra||""),{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify(payload||{})});
  var j={};try{j=await r.json();}catch(e){}
  if(!r.ok)throw new Error(j.error||("Server answered "+r.status));
  return j;
}
function fmtBytes(n){return n>=1073741824?(n/1073741824).toFixed(2)+" GB":(n/1048576).toFixed(1)+" MB";}
async function showSpace(){
  var tok;try{tok=await token();}catch(e){return;}
  var list=[["","ebSrvC",5],["&s=d","ebSrvD",10]];
  for(var i=0;i<list.length;i++){
    var t=$(list[i][1]+"t"),bar=$(list[i][1]+"b");
    try{
      var r=await fetch(URL_USAGE+list[i][0],{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:"{}"});
      var j=await r.json();
      if(!r.ok||typeof j.bytes!=="number")throw new Error("x");
      var pct=Math.round(j.bytes/(list[i][2]*1073741824)*100);
      if(t)t.textContent=fmtBytes(j.bytes)+" / "+list[i][2]+" GB ("+pct+"%)"+(pct>=80?" - nearly full":"");
      if(bar)bar.style.width=(pct>0?Math.max(3,Math.min(100,pct)):0)+"%";
    }catch(e){if(t)t.textContent="Not available";}
  }
}
/* ---------- list of saved papers, with Review and Delete (v2.6, v2.7) ---------- */
var PARM={};
var REV={}; /* v2.7: paper id -> {open, loading, err, qs} for the Review questions button */
async function loadPapers(){
  var el=$("ebPapers");if(!el)return;
  el.textContent="Loading…";
  try{
    var j=await roomCall("index",{});
    ST.papers=(j.papers||[]).slice().sort(function(a,b){return (b.updated||0)-(a.updated||0);});
    drawPapers();
  }catch(e){el.textContent="Could not load the list: "+((e&&e.message)||e);}
}
/* v2.7: the questions of one paper, so you can check them */
function reviewHtml(r){
  if(!r)return "";
  if(r.loading)return "<div style='margin-top:8px;color:var(--sub);font-size:12.5px'>Loading the questions…</div>";
  if(r.err)return "<div style='margin-top:8px;color:#d9534f;font-size:12.5px'>Could not load the questions: "+E(r.err)+"</div>";
  var qs=r.qs||[];
  if(!qs.length)return "<div style='margin-top:8px;color:var(--sub);font-size:12.5px'>This paper has no questions.</div>";
  var mc=0,wr=0;
  qs.forEach(function(x){if(x.type==="written")wr++;else mc++;});
  var h="<div style='margin-top:8px;border-top:1px solid var(--line);padding-top:8px'>"
    +"<div style='color:var(--sub);font-size:12px;margin:0 0 6px'>"+qs.length+" question(s): "+mc+" multiple choice, "+wr+" written. Green = the answer saved for marking.</div>";
  qs.forEach(function(x,i){
    if(x.type==="written"){
      h+="<div style='border:1px solid var(--line);border-radius:8px;padding:7px 10px;margin:0 0 6px;font-size:12.5px;word-break:break-word'>"
        +"<div style='color:var(--sub);font-size:11.5px'>"+(i+1)+". Written · "+E(kindLabel(x.kind))+(x.marks?" · "+x.marks+" mark"+(x.marks>1?"s":""):"")+"</div>"
        +"<div style='margin-top:3px;white-space:pre-wrap'><b>"+E(x.q)+"</b></div>"
        +(x.answer?"<details style='margin-top:5px'><summary style='cursor:pointer;color:var(--sub)'>Model answer</summary><div style='margin-top:3px;color:#2FA36B;white-space:pre-wrap'>"+E(x.answer)+"</div></details>":"<div style='margin-top:4px;color:var(--sub);font-size:11.5px'>(the model answer is not sent to this screen by the server)</div>")
        +"</div>";
    }else{
      var opts=x.options||[],hasC=(typeof x.correct==="number");
      h+="<div style='border:1px solid var(--line);border-radius:8px;padding:7px 10px;margin:0 0 6px;font-size:12.5px;word-break:break-word'>"
        +"<div><b>"+(i+1)+". "+E(x.q)+"</b></div>"
        +(x.img?"<div style='color:var(--sub);font-size:11.5px;margin-top:2px'>(this question has a picture)</div>":"")
        +opts.map(function(o,k){return "<div style='"+(hasC&&k===x.correct?"color:#2FA36B;font-weight:700":"color:var(--sub)")+"'>"+"ABCD"[k]+". "+E(o)+(hasC&&k===x.correct?" ✓":"")+"</div>";}).join("")
        +(hasC?"":"<div style='margin-top:4px;color:var(--sub);font-size:11.5px'>(the correct answer is not sent to this screen by the server)</div>")
        +"</div>";
    }
  });
  return h+"</div>";
}
function drawPapers(){
  var el=$("ebPapers");if(!el)return;
  var ps=ST.papers||[];
  if(!ps.length){el.innerHTML="<div style='color:var(--sub);font-size:12.5px'>No papers saved yet.</div>";return;}
  el.innerHTML="<div style='color:var(--sub);font-size:12.5px;margin:0 0 8px'>"+ps.length+" paper(s), newest first.</div>"+ps.map(function(p,i){
    var w=p.written||0,m=(p.count||0)-w,armed=!!PARM[p.id],rv=REV[p.id],open=!!(rv&&rv.open);
    return "<div style='background:#0C2850;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 10px;font-size:13px;word-break:break-word'>"
      +"<b>"+E(p.title)+"</b>"
      +"<div style='color:var(--sub);font-size:12px;margin-top:2px'>"+E(p.class)+" · "+E(p.subject)+(p.year?" · "+E(p.year):"")+" · "+m+" multiple choice, "+w+" written · server "+E(String(p.server||"").toUpperCase())+"</div>"
      +"<div style='display:flex;gap:8px;margin-top:8px'>"
      +"<button type='button' class='pRev' data-i='"+i+"' style='flex:1;border:1px solid var(--line);background:rgba(127,127,127,.15);color:var(--ink);border-radius:8px;padding:8px 10px;font-size:12.5px'>"+(open?"Hide questions":"Review questions")+"</button>"
      +"<button type='button' class='pDel' data-i='"+i+"' style='flex:1;border:1px solid "+(armed?"#d9534f":"var(--line)")+";background:"+(armed?"#d9534f":"rgba(127,127,127,.15)")+";color:"+(armed?"#fff":"var(--ink)")+";border-radius:8px;padding:8px 10px;font-size:12.5px'>"+(armed?"Tap again to delete for good":"Delete this paper")+"</button>"
      +"</div>"
      +(open?reviewHtml(rv):"")
      +"</div>";
  }).join("");
  var bs=el.querySelectorAll?el.querySelectorAll(".pDel"):[];
  for(var k=0;k<bs.length;k++)bs[k].onclick=(function(b){return function(){delPaper(parseInt(b.getAttribute("data-i"),10));};})(bs[k]);
  var rs=el.querySelectorAll?el.querySelectorAll(".pRev"):[];
  for(var k2=0;k2<rs.length;k2++)rs[k2].onclick=(function(b){return function(){reviewPaper(parseInt(b.getAttribute("data-i"),10));};})(rs[k2]);
}
async function reviewPaper(i){
  var p=(ST.papers||[])[i];if(!p)return;
  var r=REV[p.id];
  if(r&&r.open){r.open=false;drawPapers();return;}
  if(r&&r.qs){r.open=true;drawPapers();return;}
  REV[p.id]={open:true,loading:true};drawPapers();
  try{
    var j=await roomCall("paper",{},"&id="+encodeURIComponent(p.id));
    REV[p.id]={open:true,qs:j.questions||[]};
  }catch(e){REV[p.id]={open:true,err:(e&&e.message)||String(e)};}
  drawPapers();
}
async function delPaper(i){
  var p=(ST.papers||[])[i];if(!p)return;
  if(!PARM[p.id]){
    PARM[p.id]=1;drawPapers();
    setTimeout(function(){if(PARM[p.id]){delete PARM[p.id];drawPapers();}},5000);
    return;
  }
  delete PARM[p.id];
  say("ebPapSt","Deleting "+p.title+"…");
  try{
    await roomCall("del",{id:p.id});
    delete REV[p.id];
    ST.papers=(ST.papers||[]).filter(function(x){return x.id!==p.id;});
    drawPapers();showSpace();
    say("ebPapSt","Deleted: "+p.title+". Students will stop seeing it within about a minute.");
  }catch(e){drawPapers();say("ebPapSt","Could not delete: "+((e&&e.message)||e));}
}
async function save(){
  if(ST.busy||(!ST.built.length&&!ST.written.length)||!ST.meta)return;
  ST.busy=true;var m=ST.meta;
  try{
    say("ebSt","Saving...");
    var mcq=ST.built.map(function(q){return {q:q.q,options:q.options,correct:q.correct,verifiedBy:q.verifiedBy||"mistral+gemini",img:q.img||undefined};});
    var wr=ST.written.map(function(x){return {type:"written",kind:x.kind,marks:x.marks,q:x.q,answer:x.answer,verifiedBy:"ai draft"};});
    var j=await roomCall("save",{level:m.level,class:m.cls,subject:m.subject,title:m.title,year:m.year,questions:mcq.concat(wr)});
    /* pictures go to the same server as the paper */
    var names={},upOk=0,upBad=0,nm;
    ST.built.forEach(function(q){if(q.img)names[q.img]=1;});
    for(nm in names){
      if(!ST.pics||!ST.pics[nm]){upBad++;continue;}
      try{await roomCall("img",{id:j.id,name:nm,b64:ST.pics[nm]});upOk++;}catch(e5){upBad++;}
    }
    var seen=0,seenImg=0,seenW=0;
    try{var p=await roomCall("paper",{},"&id="+encodeURIComponent(j.id));seen=(p.questions||[]).length;seenImg=(p.questions||[]).filter(function(x){return x.img;}).length;seenW=(p.questions||[]).filter(function(x){return x.type==="written";}).length;}catch(e){}
    var msg="Saved on server "+j.server+": "+j.added+" new question(s)"+(j.skipped?", "+j.skipped+" already saved before (skipped)":"")+".";
    if(seen>0){msg+=" Check passed: students can read "+seen+" question(s) of this paper ("+(seen-seenW)+" multiple choice, "+seenW+" written"+(seenImg?", "+seenImg+" with a picture":"")+").";if(upOk||upBad)msg+=" Pictures saved: "+upOk+(upBad?". FAILED: "+upBad+" (send this message to Claude)":".");ST.built=[];ST.written=[];ST.pics={};drawResults();}
    else msg+=" WARNING: the check could not read the paper back. Do not save again, send this message to Claude.";
    say("ebSt",msg);
    delete REV[j.id];
    showSpace();loadPapers();
  }catch(e){say("ebSt","Could not save: "+((e&&e.message)||e));}
  ST.busy=false;
}

/* ---------- auto-fill the boxes from the file name and first page (plain code, no AI) ---------- */
var AUTO={};
var SUBJECTS=[
  ["Additional Mathematics",/additional\s*(maths?|mathematics)/],
  ["Mathematics",/mathematics|\bmaths?\b/],
  ["Physical Science",/physical\s*science/],
  ["Biology",/biology/],["Chemistry",/chemistry/],["Physics",/physics/],
  ["Agriculture",/agricultur/],["Geography",/geography/],["History",/history/],
  ["Bible Knowledge",/bible\s*knowledge|\bbk\b/],["Social Studies",/social\s*studies/],
  ["Life Skills",/life\s*skills/],["Computer Studies",/computer\s*(studies|science)/],
  ["Business Studies",/business\s*studies/],["Accounting",/accounting/],["Economics",/economics/],
  ["Home Economics",/home\s*economics/],["Chichewa",/chichewa/],["English",/english/],
  ["Science",/\bscience\b/]
];
function guessClass(t){
  var m;
  if((m=t.match(/form\s*([1-4])\b/)))return "Form "+m[1];
  if((m=t.match(/(?:standard|std)\.?\s*([1-8])\b/)))return "Standard "+m[1];
  if(/\bmsce\b/.test(t))return "Form 4";
  if(/\bjce\b/.test(t))return "Form 2";
  if(/\bpsl?ce\b/.test(t))return "Standard 8";
  return "";
}
function guessSubject(t){
  for(var i=0;i<SUBJECTS.length;i++)if(SUBJECTS[i][1].test(t))return SUBJECTS[i][0];
  return "";
}
function guessYear(t){var m=t.match(/\b(19[89]\d|20[0-3]\d)\b/);return m?m[1]:"";}
function guessTitle(name){
  var t=String(name||"").replace(/\.[A-Za-z0-9]{2,5}$/,"").replace(/[_]+/g," ").replace(/\s*\(\d+\)\s*$/,"").replace(/\s+/g," ").trim();
  return t.slice(0,80);
}
function guessFrom(name,text){
  var n=String(name||"").toLowerCase().replace(/[_\-.]+/g," "),x=String(text||"").toLowerCase().replace(/\s+/g," ");
  return {
    cls:guessClass(n)||guessClass(x),
    subject:guessSubject(n)||guessSubject(x),
    year:guessYear(n)||guessYear(x),
    title:guessTitle(name)
  };
}
async function peekText(file){
  try{
    var n=(file.name||"").toLowerCase();
    if(/\.(docx|doc|txt)$/.test(n)){var r=await readFileText(file);return String(r.pages[0]||"").slice(0,1500);}
    if(/\.pdf$/.test(n)){
      var buf=await file.arrayBuffer();
      var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
      var g=await pdf.getPage(1),t=await g.getTextContent();
      var out=t.items.map(function(i){return i.str;}).join(" ").slice(0,1500);
      try{pdf.destroy();}catch(e){}
      return out;
    }
  }catch(e){}
  return "";
}
/* does this PDF look like a scan? (made by a scanner program, or page 1 is one big picture). A wrong guess only means the Scanned box is ticked or not; you can change it. */
async function looksScanned(file){
  var res=false;
  try{
    if(!/\.pdf$/i.test(file.name||""))return false;
    var buf=await file.arrayBuffer();
    var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
    try{
      var md=await pdf.getMetadata(),inf=(md&&md.info)||{};
      var tag=String((inf.Producer||"")+" "+(inf.Creator||"")).toLowerCase();
      if(/scan|camscanner|office lens|canon|epson|xerox|ricoh|konica|kyocera|brother|samsung|fujitsu|sharp|toshiba|lexmark/.test(tag))res=true;
      if(!res&&pdfjsLib.OPS){
        var pg=await pdf.getPage(1),vp=pg.getViewport({scale:1}),pageArea=vp.width*vp.height;
        var ol=await pg.getOperatorList(),O=pdfjsLib.OPS,det=1,stack=[];
        for(var i=0;i<ol.fnArray.length;i++){
          var fn=ol.fnArray[i],a=ol.argsArray[i];
          if(fn===O.save)stack.push(det);
          else if(fn===O.restore){if(stack.length)det=stack.pop();}
          else if(fn===O.transform&&a&&a.length>=4)det*=(a[0]*a[3]-a[1]*a[2]);
          else if(fn===O.paintImageXObject||fn===O.paintJpegXObject||fn===O.paintInlineImageXObject){
            if(Math.abs(det)>=0.6*pageArea){res=true;break;}
          }
        }
      }
    }finally{try{pdf.destroy();}catch(e){}}
  }catch(e){}
  return res;
}
function setClassGuess(name){
  var keys=Object.keys(LEVELS);
  for(var i=0;i<keys.length;i++){
    var cl=(LEVELS[keys[i]]&&LEVELS[keys[i]].classes)||[];
    for(var j=0;j<cl.length;j++){
      if(norm(cl[j])===norm(name)){$("ebLevel").value=keys[i];fillClasses();$("ebClass").value=cl[j];return true;}
    }
  }
  return false;
}
function setAuto(id,key,val){
  var el=$(id);if(!el)return;
  if(val){el.value=val;AUTO[key]=true;}
  else if(AUTO[key]){el.value="";AUTO[key]=false;}
}
async function onFile(){
  var f=$("ebFile").files[0];if(!f)return;
  var fnEl=$("ebFileName");if(fnEl)fnEl.textContent="Selected: "+f.name;
  say("ebSt","Reading the file to fill in the boxes…");
  var g=guessFrom(f.name,""),need=!g.cls||!g.subject||!g.year;
  if(need){var g2=guessFrom(f.name,await peekText(f));g.cls=g2.cls;g.subject=g2.subject;g.year=g2.year;}
  var gotClass=g.cls?setClassGuess(g.cls):false;
  setAuto("ebSubj","subj",g.subject);
  setAuto("ebYear","year",g.year);
  setAuto("ebTitle","title",g.title);
  var got=[];
  if(gotClass)got.push($("ebClass").value);
  if(g.subject)got.push(g.subject);
  if(g.year)got.push(g.year);
  var miss=[];
  if(!gotClass)miss.push("Class");
  if(!g.subject)miss.push("Subject");
  var sc=await looksScanned(f);
  var sb=$("ebScan");if(sb)sb.checked=sc;
  var info="Filled in from the file: "+(got.length?got.join(", "):"nothing found")+(sc?" (scanned paper)":"")+".";
  var cc=ctxNow();
  if(cc.cls&&cc.subject&&cc.title&&!ST.busy){
    say("ebSt",info+" Starting by itself. Do not close this screen; only Save is left for you at the end.");
    await wait(600);
    buildPaper();
  }else{
    say("ebSt",info+" Please fill in: "+miss.join(", ")+", then tap the button.");
  }
}

/* ---------- screen (v3.0 look) ---------- */
var EB_CSS=[
".eb{--ink:#F5F7FF;--sub:#B9C8E5;--line:rgba(120,160,230,.30);color:#F5F7FF;padding:4px 0 100px;font-size:14px;line-height:1.45}",
".eb *{box-sizing:border-box}",
".eb-title{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:800;margin:2px 0 2px;color:#fff}",
".eb-title svg{color:#D9AD4F;flex:none}",
".eb-sub{color:#B9C8E5;font-size:13.5px;margin:0 0 12px}",
".eb-card{background:#0C2850;border:1px solid rgba(120,160,230,.25);border-radius:16px;padding:14px;margin:0 0 12px;box-shadow:0 6px 18px rgba(0,0,0,.25)}",
".eb-info{border-color:rgba(217,173,79,.45)}",
".eb-info summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;font-weight:700;color:#F4D58A}",
".eb-info summary::-webkit-details-marker{display:none}",
".eb-info svg{color:#D9AD4F;flex:none}",
".eb-info ul{margin:10px 0 0;padding-left:18px;color:#B9C8E5;font-size:13px}",
".eb-info li{margin:0 0 4px}",
".eb-store{display:grid;grid-template-columns:1fr 1fr;gap:14px}",
".eb-srv b{display:block;font-size:13px;color:#fff}",
".eb-srv span{display:block;font-size:12px;color:#B9C8E5;margin:2px 0 6px}",
".eb-bar{height:7px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden}",
".eb-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#1769E0,#168BFF);border-radius:6px}",
".eb-h{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:800;color:#fff;margin:0 0 4px}",
".eb-n{flex:none;width:30px;height:30px;border-radius:50%;background:#1769E0;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;box-shadow:0 0 0 2px rgba(217,173,79,.6)}",
".eb-d{color:#B9C8E5;font-size:13px;margin:0 0 10px}",
".eb .btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;padding:12px 14px;border:0;border-radius:12px;background:linear-gradient(90deg,#1769E0,#168BFF);color:#fff;font-size:15px;font-weight:700;cursor:pointer}",
".eb .btn.green{background:linear-gradient(90deg,#16a37a,#20C997);color:#04210f}",
".eb .btn:disabled{opacity:.55}",
".eb .btn.eb-ghost{background:transparent;border:1.5px solid #1769E0;color:#F5F7FF}",
".eb-drop{text-align:center;border:2px dashed rgba(22,139,255,.7);border-radius:14px;padding:18px 10px;margin:0 0 8px;color:#F5F7FF;cursor:pointer;background:rgba(22,105,224,.08)}",
".eb-drop svg{color:#168BFF}",
".eb-drop b{display:block;font-size:16px;margin-top:4px}",
".eb-drop span{display:block;font-size:12.5px;color:#B9C8E5;margin-top:2px}",
".eb-fn{font-size:13px;color:#F4D58A;margin:0 0 10px;word-break:break-all}",
".eb-chk{display:flex;gap:10px;align-items:flex-start;margin:0 0 12px;font-size:14px}",
".eb-chk input{width:20px;height:20px;margin-top:2px;flex:none}",
".eb-chk small{display:block;color:#B9C8E5;font-size:12px;margin-top:1px}",
".eb-g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 10px}",
".eb-g1{margin:0 0 10px}",
".eb-row{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin:0 0 10px}",
".eb-acts{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin:6px 0 0}",
"@media(max-width:340px){.eb-g,.eb-store,.eb-row,.eb-acts{grid-template-columns:1fr}}",
".eb-lab{display:block;font-size:13px;font-weight:700;color:#F5F7FF;margin:0 0 4px}",
".eb-lab em{color:#F4D58A;font-style:normal}",
".eb-in{display:block;width:100%;height:46px;padding:0 12px;border-radius:12px;border:1px solid rgba(22,139,255,.55);background:#0A2145;color:#F5F7FF;font-size:16px}",
".eb-in::placeholder{color:#8fa3c6}",
".eb-st{color:#B9C8E5;font-size:13px;margin:10px 0;word-break:break-word}"
].join("\n");
function ensureStyle(){
  if($("ebStyle"))return;
  var st=document.createElement("style");st.id="ebStyle";st.textContent=EB_CSS;document.head.appendChild(st);
}
function ico(d,sz){sz=sz||20;return "<svg viewBox='0 0 24 24' width='"+sz+"' height='"+sz+"' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>"+d+"</svg>";}
var ICO={
  cap:"<path d='M2 9l10-5 10 5-10 5z'/><path d='M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5'/>",
  shield:"<path d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/><path d='m9 12 2 2 4-4'/>",
  up:"<path d='M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4.5 4.5 0 0 1 17 18'/><path d='M12 12v8M9 15l3-3 3 3'/>",
  gear:"<circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1'/>",
  trash:"<path d='M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'/>",
  doc:"<path d='M6 3h9l4 4v14H6z'/><path d='M14 3v5h5M9 13h7M9 17h5'/>",
  bulb:"<path d='M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z'/>",
  back:"<path d='M15 5l-7 7 7 7'/>"
};
function clearAll(){
  if(ST.busy){say("ebSt","The builder is working. Wait until it is finished.");return;}
  if((ST.built.length||ST.written.length)&&!confirm("Clear the form and throw away the questions that are not saved yet?"))return;
  ST.built=[];ST.held=[];ST.lost=[];ST.pics={};ST.written=[];ST.wheld=[];ST.wlost=[];ST.meta=null;ST.pdfFile=null;ST.ocr=null;
  AUTO.subj=false;AUTO.title=false;AUTO.year=false;
  var f=$("ebFile");if(f)f.value="";
  $("ebFileName").textContent="";$("ebScan").checked=false;$("ebSubj").value="";$("ebTitle").value="";$("ebYear").value="";$("ebClass").value="";
  say("ebSt","");drawResults();
}
function render(body){
  ensureStyle();
  var lv=Object.keys(LEVELS).map(function(k){return "<option value=\""+E(k)+"\">"+E(LEVELS[k].label||k)+"</option>";}).join("");
  var subs=SUBJECTS.map(function(x){return "<option value=\""+E(x[0])+"\">";}).join("");
  body.innerHTML="<div class='eb'>"
   +"<div class='eb-title'>"+ico(ICO.cap,28)+"<span>AI Examination Room</span></div>"
   +"<div class='eb-sub'>Build practice exams from past papers.</div>"
   +"<button type='button' class='btn eb-ghost' id='ebOpenPap' style='margin:0 0 12px'>"+ico(ICO.doc,18)+" Uploaded exams (review / delete)</button>"
   +"<details class='eb-card eb-info'><summary>"+ico(ICO.bulb,20)+"<span>How it works</span></summary><ul>"
   +"<li>The AI reads your examination paper and builds a practice exam.</li>"
   +"<li>Multiple choice: two different AIs must agree on each answer, otherwise the question is not kept.</li>"
   +"<li>Written questions: the AI drafts a model answer, used only for marking.</li>"
   +"<li>Chichewa papers are built as written questions only.</li>"
   +"<li>Nothing is saved until you tap Save.</li></ul></details>"
   +"<div class='eb-card'><div class='eb-store'>"
   +"<div class='eb-srv'><b>Server C</b><span id='ebSrvCt'>Checking…</span><div class='eb-bar'><i id='ebSrvCb'></i></div></div>"
   +"<div class='eb-srv'><b>Server D</b><span id='ebSrvDt'>Checking…</span><div class='eb-bar'><i id='ebSrvDb'></i></div></div>"
   +"</div></div>"
   +"<div class='eb-card'><div class='eb-h'><span class='eb-n'>1</span><span>Accuracy check</span></div>"
   +"<div class='eb-d'>Check the maths-answer accuracy of the examination AI before building a paper.</div>"
   +"<button type='button' class='btn' id='ebAcc'>"+ico(ICO.shield,20)+" Run 12-question maths test</button>"
   +"<div id='ebAccSt' class='eb-st'></div><div id='ebAccOut'></div></div>"
   +"<div class='eb-card'><div class='eb-h'><span class='eb-n'>2</span><span>Build from a paper</span></div>"
   +"<div class='eb-d'>Choose a past examination paper to generate a practice exam.</div>"
   +"<div class='eb-drop' id='ebDrop'>"+ico(ICO.up,34)+"<b>Choose PDF, Word or text file</b><span>Tap to select a past paper from your device</span></div>"
   +"<input id='ebFile' type='file' accept='application/pdf,.pdf,.docx,.doc,application/msword,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain' style='display:none'>"
   +"<div class='eb-fn' id='ebFileName'></div>"
   +"<label class='eb-chk'><input type='checkbox' id='ebScan'><span>This is a scanned or photographed paper<small>The AI reads the page pictures (slower, more accurate). It ticks itself when the PDF looks like a scan; you can change it.</small></span></label>"
   +"<div class='eb-g'><div><label class='eb-lab'>Education level <em>*</em></label><select id='ebLevel' class='eb-in'>"+lv+"</select></div>"
   +"<div><label class='eb-lab'>Class <em>*</em></label><select id='ebClass' class='eb-in'></select></div></div>"
   +"<div class='eb-g1'><label class='eb-lab'>Subject <em>*</em></label><input id='ebSubj' class='eb-in' list='ebSubjList' placeholder='Choose or type the subject'><datalist id='ebSubjList'>"+subs+"</datalist></div>"
   +"<div class='eb-row'><div><label class='eb-lab'>Paper title <em>*</em></label><input id='ebTitle' class='eb-in' placeholder='e.g. Biology Paper 1'></div>"
   +"<div><label class='eb-lab'>Year</label><input id='ebYear' class='eb-in' placeholder='2019'></div></div>"
   +"<div class='eb-acts'><button type='button' class='btn' id='ebGo'>"+ico(ICO.gear,20)+" Build exam</button>"
   +"<button type='button' class='btn eb-ghost' id='ebClear'>"+ico(ICO.trash,18)+" Clear</button></div>"
   +"<div id='ebSt' class='eb-st'></div></div>"
   +"<div id='ebList'></div></div>";
  fillClasses();
  $("ebLevel").onchange=fillClasses;
  $("ebDrop").onclick=function(){$("ebFile").click();};
  $("ebFile").onchange=onFile;
  $("ebSubj").oninput=function(){AUTO.subj=false;};
  $("ebTitle").oninput=function(){AUTO.title=false;};
  $("ebYear").oninput=function(){AUTO.year=false;};
  $("ebAcc").onclick=async function(){var b=this;b.disabled=true;try{await accuracyTest();}finally{b.disabled=false;}};
  $("ebGo").onclick=async function(){var b=this;b.disabled=true;try{await buildPaper();}finally{b.disabled=false;}};
  $("ebClear").onclick=clearAll;
  $("ebOpenPap").onclick=function(){
    if(ST.busy){say("ebSt","The builder is working. Wait until it is finished, then open Uploaded exams.");return;}
    showPapers(body);
  };
  drawResults();
  showSpace();
}
/* the saved papers have their own screen */
function showPapers(body){
  ensureStyle();
  body.innerHTML="<div class='eb'><button type='button' class='btn eb-ghost' id='ebBack' style='margin:0 0 12px'>"+ico(ICO.back,18)+" Back to builder</button>"
   +"<div class='eb-title'>"+ico(ICO.doc,26)+"<span>Uploaded exams</span></div>"
   +"<div class='eb-sub'>These are the papers students can open. Review the questions, or delete a wrong or old paper.</div>"
   +"<button type='button' class='btn' id='ebPapRefresh'>Refresh the list</button>"
   +"<div id='ebPapSt' class='eb-st'></div><div id='ebPapers'></div></div>";
  $("ebBack").onclick=function(){render(body);};
  $("ebPapRefresh").onclick=function(){REV={};loadPapers();};
  loadPapers();
}

window.EduExamBuilder={render:render,version:"3.1",_readFileText:readFileText,_counts:reportCounts,_guess:guessFrom,_report:reportLines,_looksScanned:looksScanned};
})();
