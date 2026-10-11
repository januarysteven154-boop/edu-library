/* Edu Library - shared document reader v1.0. Reads the text of a Word (.docx) file inside the phone (no library, no AI). Used by the AI Library uploader; the Exam Builder will use it later. Old .doc files are not supported. */
(function(){
"use strict";
function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(x){return ("0"+x.toString(16)).slice(-2);}).join("");}
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
function isWord(file){return /\.docx$/i.test((file&&file.name)||"");}
/* returns {text, hash}: all the text of the document (paragraphs on separate lines) and the SHA-256 of the file */
async function readWord(file){
  var buf=await file.arrayBuffer(),hash="";
  try{if(window.crypto&&crypto.subtle)hash=hex(await crypto.subtle.digest("SHA-256",buf));}catch(e){}
  var data=await zipEntry(buf,"word/document.xml");
  if(!data)throw new Error("Could not find the text inside this Word file.");
  var text=xmlToText(new TextDecoder().decode(data)).split(/\r?\n/).map(function(s){return s.replace(/[ \t]+/g," ").trim();}).filter(Boolean).join("\n");
  return {text:text,hash:hash};
}
window.EduDocReader={version:"1.0",isWord:isWord,readWord:readWord};
})();
