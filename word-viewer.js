/* Edu Library: Word (.docx) viewer for the student app. v1.0
   Loaded on demand by the tiny hook in index.html (only when the PDF reader cannot open a file).
   Uses the shared reader doc-reader.js (window.EduDocReader). */
(function(){
"use strict";
if(window.EduWordViewer)return;
var URL_READER="https://edu-library.januarysteven154.workers.dev/doc-reader.js";
var MAXBYTES=25*1024*1024;
var fs=17; /* current text size in px */

function ensureReader(){
  if(window.EduDocReader)return Promise.resolve();
  return new Promise(function(ok,no){
    var s=document.createElement("script");
    s.src=URL_READER+"?v="+Date.now();
    s.onload=function(){if(window.EduDocReader)ok();else no(new Error("reader"));};
    s.onerror=function(){no(new Error("reader"));};
    document.head.appendChild(s);
  });
}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

/* Is this a Word file? A .docx is a zip, so it starts with the letters PK. */
function isZip(buf){var u=new Uint8Array(buf.slice(0,4));return u[0]===0x50&&u[1]===0x4B;}

function applySize(){
  var c=document.getElementById("wvcard");
  if(c)c.style.fontSize=fs+"px";
}

/* The zoom buttons (- and +) in the reader bar call pvStep(). For a Word file we change the text size instead. */
var origStep=window.pvStep;
window.pvStep=function(dir){
  if(document.getElementById("wvcard")){
    fs=Math.max(13,Math.min(30,fs+(dir>0?2:-2)));
    applySize();
    return;
  }
  if(typeof origStep==="function")return origStep.apply(this,arguments);
};

/* show(url, bodyElement): returns true when the file was a Word file and is now on screen; false otherwise */
async function show(url,body){
  try{
    var r=await fetch(url);
    if(!r.ok)return false;
    var buf=await r.arrayBuffer();
    if(!buf||buf.byteLength<100||buf.byteLength>MAXBYTES||!isZip(buf))return false;
    await ensureReader();
    var file=new File([buf],"paper.docx",{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
    var d=await window.EduDocReader.readWord(file);
    var text=String((d&&d.text)||"").replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
    if(!body||!body.isConnected)return true;
    if(text.replace(/\s/g,"").length<5){
      body.innerHTML='<div class="empty">This Word file has no readable text. Use Save.</div>';
      return true;
    }
    var html=text.split("\n").map(function(line){
      line=line.trim();
      return line?'<p style="margin:0 0 .75em">'+esc(line)+'</p>':'<div style="height:.6em"></div>';
    }).join("");
    body.innerHTML='<div id="wvcard" style="max-width:800px;margin:0 auto;background:#fff;color:#111;border-radius:10px;padding:18px 16px;font:'+fs+'px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;word-wrap:break-word;overflow-wrap:anywhere">'+html+'</div>';
    applySize();
    body.scrollTop=0;
    return true;
  }catch(e){
    return false;
  }
}
window.EduWordViewer={show:show,version:"1.0"};
})();
