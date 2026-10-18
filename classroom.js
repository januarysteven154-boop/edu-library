/* AI Classroom (test) v0.1 - loaded on demand by index.html. Needs a signed-in student. */
(function(){
var PACK={status:"NEEDS REVIEW",lessons:[
{title:"Fractions: add, subtract, multiply",steps:["To add or subtract fractions, the bottom numbers (denominators) must be the same. Find a common denominator first.","Change each fraction so it has that denominator, then add or subtract only the top numbers (numerators).","To multiply fractions, multiply the tops together and the bottoms together. Then simplify."],examples:[["2/3 + 1/6","2/3 = 4/6. So 4/6 + 1/6 = 5/6."],["3/4 - 1/3","Common denominator is 12. 9/12 - 4/12 = 5/12."],["2/5 x 3/4","6/20, which simplifies to 3/10."]],practice:["1/2 + 1/3","7/8 - 1/4","3/5 x 2/3"]},
{title:"Decimals: add, subtract, multiply",steps:["When you add or subtract decimals, line up the decimal points. Add zeros if it helps.","Work from the right, like normal numbers, and keep the decimal point in the same place in the answer.","To multiply decimals, multiply as whole numbers, then count the decimal places in both numbers together."],examples:[["3.45 + 2.7","3.45 + 2.70 = 6.15."],["5.2 - 1.75","5.20 - 1.75 = 3.45."],["0.4 x 0.3","4 x 3 = 12. There are 2 decimal places in total, so 0.12."]],practice:["12.5 + 4.75","10 - 3.6","0.5 x 0.6"]},
{title:"Percentages",steps:["Percent means out of 100. 25% means 25 out of 100.","To find a percentage of an amount, divide the amount by 100, then multiply by the percentage.","To change a fraction to a percentage, make the bottom 100, or multiply the fraction by 100."],examples:[["20% of MK 5000","5000 / 100 = 50. 50 x 20 = MK 1000."],["Write 3/4 as a percentage","3/4 x 100 = 75%."],["A shirt costs MK 2000 with 10% off. New price?","10% of 2000 = 200. 2000 - 200 = MK 1800."]],practice:["50% of MK 840","25% of 80","Write 0.35 as a percentage"]}
]};
var timer=null,busy=false,sid="",root=null;
function base(){try{return aiBase();}catch(e){return "https://edu-ai-backend-three.vercel.app/api";}}
function el(tag,txt,st){var e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(st)e.style.cssText=st;return e;}
function clean(s){return String(s||"").replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g,"$1/$2").replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\times/g,"\u00d7").replace(/\\div/g,"\u00f7").replace(/\\cdot/g,"\u00b7").replace(/\\left|\\right/g,"").replace(/\\\(|\\\)|\\\[|\\\]/g,"").replace(/\\,/g," ").replace(/\*\*/g,"");}
function rid(){var a="abcdefghijklmnopqrstuvwxyz0123456789",s="r";for(var i=0;i<20;i++)s+=a[Math.floor(Math.random()*a.length)];return s+Date.now();}
function stop(){if(timer){clearInterval(timer);timer=null;}}
function post(path,body){
  return window.EduAcct.token().then(function(tk){
    if(!tk)return {error:"Please sign in again."};
    var h=(typeof eduDeviceHeaders==="function")?eduDeviceHeaders():{"Content-Type":"application/json"};
    h.Authorization="Bearer "+tk;
    return fetch(base()+path,{method:"POST",headers:h,body:JSON.stringify(body||{})}).then(function(r){return r.json().catch(function(){return {error:"Bad reply"};});});
  }).catch(function(){return {error:"No connection. Please try again."};});
}
function open(app){
  stop();root=app;
  try{setActiveNav("settings");}catch(e){}
  try{setHeader('<button class="back" onclick="location.hash=\'#/settings\'">\u2190</button><h2>AI Classroom</h2>');}catch(e){}
  app.innerHTML="";
  var box=el("div",null,"padding:14px");app.appendChild(box);
  if(!(window.EduAcct&&window.EduAcct.isIn&&window.EduAcct.isIn())){
    box.appendChild(el("p","Please sign in with your student account first (tap the account icon at the top), then open the Classroom again."));return;}
  var card=el("div",null,"background:rgba(127,127,127,.16);border-radius:14px;padding:12px;margin-bottom:12px");
  var inp=el("input");inp.placeholder="Class code";inp.autocomplete="off";inp.value=sid;
  inp.style.cssText="width:100%;box-sizing:border-box;font-size:16px;padding:10px;margin-bottom:8px";
  var go=el("button","Join class","width:100%;font-size:16px;padding:10px");
  var err=el("div",null,"color:#e0455a;margin-top:6px");
  card.appendChild(inp);card.appendChild(go);card.appendChild(err);box.appendChild(card);
  var cls=el("div");box.appendChild(cls);
  go.onclick=function(){err.textContent="";sid=inp.value.trim();if(sid.length<10){err.textContent="Paste the class code.";return;}
    post("/book-link?classroom=feed&session="+encodeURIComponent(sid),{}).then(function(d){
      if(!d||d.error&&!d.items){err.textContent=(d&&d.error)||"Could not join.";return;}
      card.style.display="none";build(cls);refresh();stop();timer=setInterval(refresh,8000);});};
}
var ui={};
function build(cls){
  cls.innerHTML="";
  var st=el("div",null,"font-size:13px;opacity:.8;margin-bottom:8px");ui.status=st;cls.appendChild(st);
  var c1=el("div",null,"background:rgba(127,127,127,.16);border-radius:14px;padding:12px;margin-bottom:12px");
  c1.appendChild(el("b","Lesson ("+PACK.status+")"));
  var sel=el("select",null,"width:100%;font-size:16px;padding:8px;margin:8px 0");
  PACK.lessons.forEach(function(l,i){var o=el("option",l.title);o.value=i;sel.appendChild(o);});
  var ls=el("div",null,"white-space:pre-wrap;line-height:1.5");
  function show(){var l=PACK.lessons[sel.value],t="";l.steps.forEach(function(s,i){t+=(i+1)+". "+s+"\n";});t+="\nExamples:\n";l.examples.forEach(function(e){t+=e[0]+"  =>  "+e[1]+"\n";});t+="\nPractice:\n";l.practice.forEach(function(e){t+=e+"\n";});ls.textContent=t;}
  sel.onchange=show;show();c1.appendChild(sel);c1.appendChild(ls);cls.appendChild(c1);
  var c2=el("div",null,"background:rgba(127,127,127,.16);border-radius:14px;padding:12px;margin-bottom:12px");
  c2.appendChild(el("b","Ask the AI teacher"));
  var q=el("input");q.maxLength=300;q.placeholder="Your maths question";q.style.cssText="width:100%;box-sizing:border-box;font-size:16px;padding:10px;margin:8px 0";
  var ask=el("button","Ask","width:100%;font-size:16px;padding:10px");var qe=el("div",null,"color:#e0455a;margin-top:6px");
  ask.onclick=function(){
    if(busy)return;var t=q.value.trim();qe.textContent="";
    if(t.length<5){qe.textContent="Write a longer question.";return;}
    busy=true;ask.disabled=true;ask.textContent="Thinking...";
    post("/book-link?classroom=ask&session="+encodeURIComponent(sid),{requestId:rid(),question:t}).then(function(d){
      busy=false;ask.disabled=false;ask.textContent="Ask";
      if(d&&d.ok)q.value="";else qe.textContent=(d&&d.error)||"Something went wrong.";
      refresh();});};
  c2.appendChild(q);c2.appendChild(ask);c2.appendChild(qe);cls.appendChild(c2);
  var c3=el("div",null,"background:rgba(127,127,127,.16);border-radius:14px;padding:12px");
  c3.appendChild(el("b","Class answers"));
  var fd=el("div",null,"white-space:pre-wrap;line-height:1.5;margin-top:8px");ui.feed=fd;c3.appendChild(fd);cls.appendChild(c3);
}
function refresh(){
  if(!ui.status||!document.body.contains(ui.status)){stop();return;}
  post("/book-link?classroom=feed&session="+encodeURIComponent(sid),{}).then(function(d){
    if(!ui.status||!document.body.contains(ui.status))return;
    if(!d||d.error&&!d.items){ui.status.textContent=(d&&d.error)||"";return;}
    ui.status.textContent=(d.open?"Class is open. ":"Class is closed. ")+"Answers used: "+d.used+" of "+d.max+(d.paused?" (AI is resting)":"");
    var t="";(d.items||[]).forEach(function(it){t+=clean(it.answer)+"\n\n-----\n\n";});
    ui.feed.textContent=t||"No answers yet.";});
}
window.EduClassroom={open:open,stop:stop};
})();
