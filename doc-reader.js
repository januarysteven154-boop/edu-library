/* Edu Library - shared document reader v1.1. Reads the text of a Word file inside the phone (no library, no AI): new Word (.docx) AND old Word (.doc). Used by the AI Library uploader; the Exam Builder reads Word files the same way. Pictures are not read. */
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
  if(eocd<0)throw new Error("This is not a valid Word file. Open it in Word or WPS, save it as .docx, then choose it again.");
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
/* ---------- old Word (.doc): the text is read straight from the file ---------- */
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
function isWord(file){return /\.docx?$/i.test((file&&file.name)||"");}
function tidy(t){return String(t||"").split(/\r?\n/).map(function(s){return s.replace(/[ \t]+/g," ").trim();}).filter(Boolean).join("\n");}
/* returns {text, hash}: all the text of the document (paragraphs on separate lines) and the SHA-256 of the file. The kind of file is found from its content, not its name, so a .docx saved as .doc (or the other way round) still opens. */
async function readWord(file){
  var buf=await file.arrayBuffer(),hash="";
  try{if(window.crypto&&crypto.subtle)hash=hex(await crypto.subtle.digest("SHA-256",buf));}catch(e){}
  var u8=new Uint8Array(buf);
  if(u8.length>600&&u8[0]===0xD0&&u8[1]===0xCF&&u8[2]===0x11&&u8[3]===0xE0){
    return {text:tidy(docText(u8)),hash:hash};
  }
  var data=await zipEntry(buf,"word/document.xml");
  if(!data)throw new Error("Could not find the text inside this Word file.");
  return {text:tidy(xmlToText(new TextDecoder().decode(data))),hash:hash};
}
window.EduDocReader={version:"1.1",oldDoc:true,isWord:isWord,readWord:readWord};
})();
