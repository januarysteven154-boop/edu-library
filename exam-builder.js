/* Edu Library - AI Examination Room, Admin side: Exam Builder v1.0. Builds checked multiple-choice questions (two AIs must agree) from the text of an exam paper PDF and saves them to Supabase table exam_questions. Includes an accuracy test with maths questions whose answers are known. */
(function(){
"use strict";
var URL_BUILD="https://edu-ai-backend-three.vercel.app/api/book-link?exambuild=1";
var CHUNK=3500,MAX_PAGES=30,GAP_MS=11000;
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
async function build(text,ctx){
  var tok=await token();
  for(var a=0;a<2;a++){
    var r=await fetch(URL_BUILD,{method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json"},body:JSON.stringify({text:text,level:ctx.level,class:ctx.cls,subject:ctx.subject})});
    var j={};try{j=await r.json();}catch(e){}
    if(r.status===429&&j&&j.limit){var le=new Error(j.error||"AI limit reached");le.limit=true;throw le;}
    if(r.status===429&&a===0){await wait(20000);continue;}
    if(!r.ok)throw new Error(j.error||("Server answered "+r.status));
    return j;
  }
  throw new Error("Too many requests. Wait a minute and try again.");
}

/* ---------- reading the PDF ---------- */
async function readPages(file){
  var buf=await file.arrayBuffer();
  var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
  var n=Math.min(pdf.numPages,MAX_PAGES),pages=[];
  for(var p=1;p<=n;p++){
    try{
      var g=await pdf.getPage(p),t=await g.getTextContent();
      pages.push(t.items.map(function(x){return x.str;}).join(" ").replace(/[ \t]+/g," ").trim().slice(0,7000));
    }catch(e){pages.push("");}
  }
  try{pdf.destroy();}catch(e){}
  return {pages:pages,total:pdf.numPages};
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
  va
