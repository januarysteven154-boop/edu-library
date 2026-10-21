/* AI Classroom v4.0 - loaded on demand by index.html. Needs a signed-in student.
   Same flow and same backend calls as v3.3 (actions: open, setlevel, join, poll, raise, lower, ask, calendar, notes, noteread).
   v4.0 = compact redesign of the LIVE class screen only:
          header with status cards, latest-explanation preview, lesson preview, collapsible Examples and Practice questions
          (answers shown one by one), responsive learner grid with "View all students", conversation previews with
          "Read full response" and "View full conversation", gold accents, three themes (Sunset, Dark, Light).
          Long text is never cut: full lesson, full explanation and full messages open in a detail view and the live class keeps running behind it.
   WALLPAPER: none in this small version. */
(function(){
var LEVELS=[["standard1","Standard 1"],["standard2","Standard 2"],["standard3","Standard 3"],["standard4","Standard 4"],["standard5","Standard 5"],["standard6","Standard 6"],["standard7","Standard 7"],["standard8","Standard 8"],["form1","Form 1"],["form2","Form 2"],["form3","Form 3"],["form4","Form 4"]];
var timer=null,tick=null,gen=0,busy=false,sid="",ui={},last=null,lastAt=0,feedKey="",appRef=null,rosterOpen=false;
var ROSTER_PREVIEW=12,FEED_PREVIEW=2,EXPL_CHARS=230,LESSON_CHARS=200,MSG_CHARS=150;

/* ---------- styles (scoped to .ecr so nothing else in the app changes) ----------
   Tokens: --acc = gold used for TEXT, --gold = gold used for FILLS (buttons, rings), --onacc = text on a gold fill.
   Sunset (the app default) = plum + gold. Dark = navy + gold. Light = cream + dark gold. */
var CSS=[
".ecr{--bg:#2F102D;--bg2:#411440;--card:#521C4D;--card2:#652960;--ink:#FDF5E8;--ink2:#DCC6AA;--acc:#F9B81F;--gold:#F9B81F;--gold2:#FFD86B;--line:rgba(244,195,121,.30);--inp:#3A1336;--onacc:#2F102D;--live:#35C779;--rest:#FFAA45;--closed:#F05D64;--conn:#A6A6B2;--speak:#58A6FF;--err:#FF9A9F;--ok:#6FE0A0;--focus:#FFD86B;--shadow:0 2px 10px rgba(0,0,0,.22)}",
"body:not(.sunset):not(.light) .ecr{--bg:#07112F;--bg2:#0B1B49;--card:#10215E;--card2:#182A70;--ink:#FFFFFF;--ink2:#B9C6E8;--acc:#F4C542;--gold:#F4C542;--gold2:#FFD86B;--line:rgba(185,198,232,.24);--inp:#0A1740;--onacc:#07112F;--err:#FF8DA0;--ok:#20D6A1;--focus:#FFD86B}",
"body.light .ecr{--bg:#FFF7EE;--bg2:#FBEBD8;--card:#FFFFFF;--card2:#FFF1DC;--ink:#2B1A16;--ink2:#6B5448;--acc:#8A5A00;--gold:#F4B521;--gold2:#FFD86B;--line:#E2C9AA;--inp:#FFFFFF;--onacc:#2B1A00;--live:#1B7A45;--rest:#9A5800;--closed:#B3261E;--conn:#6B7280;--speak:#1D5FB0;--err:#B3261E;--ok:#1B7A45;--focus:#8A5A00;--shadow:0 2px 8px rgba(80,50,20,.12)}",
".ecr{box-sizing:border-box;max-width:560px;margin:0 auto;padding:14px 14px calc(100px + env(safe-area-inset-bottom,0px));color:var(--ink);font:16px/1.5 Roboto,'Noto Sans','Segoe UI',sans-serif;overflow-wrap:anywhere}",
".ecr::before{content:\"\";position:fixed;left:0;right:0;top:0;bottom:0;z-index:-1;pointer-events:none;background-color:#2F102D;background-image:linear-gradient(rgba(47,16,45,.25),rgba(47,16,45,.45)),var(--ecr-wallpaper,none);background-size:cover;background-position:center bottom}",
"body.light .ecr::before{background-color:#FFF7EE;background-image:linear-gradient(rgba(255,247,238,.35),rgba(255,247,238,.15)),var(--ecr-wallpaper,none)}",
".ecr *{box-sizing:border-box}.ecr [hidden]{display:none!important}",
".ecr-head{margin:4px 2px 14px}.ecr-head h1{margin:0 0 4px;font-size:22px;line-height:1.25;font-weight:700}.ecr-head p{margin:0;font-size:15px;color:var(--ink2)}",
".ecr-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:var(--shadow)}",
".ecr-card h2{margin:0 0 4px;font-size:19px;line-height:1.3;font-weight:700}",
".ecr-sub{margin:0;font-size:14px;color:var(--ink2)}",
".ecr-kick{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}",
".ecr-ic{display:inline-flex;flex:0 0 auto}.ecr-ic svg{width:18px;height:18px}",
".ecr-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;padding:10px 16px;margin-top:12px;border:1.5px solid var(--gold);border-radius:12px;background:var(--gold);color:var(--onacc);font:600 16px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".ecr-btn.sec{background:transparent;color:var(--ink);border-color:var(--line)}",
".ecr-btn.sm{width:auto;flex:1 1 0;min-width:0;min-height:44px;margin-top:0;padding:8px 8px;gap:6px;font-size:15px}.ecr-row .ecr-btn.sm{flex-basis:84px;white-space:nowrap}.ecr-row .ecr-btn.rd{flex-grow:1.5}",
".ecr-btn:active{transform:scale(.98);opacity:.85}",
".ecr-btn:disabled{opacity:.55;cursor:default;transform:none}",
".ecr button:focus-visible,.ecr select:focus-visible,.ecr textarea:focus-visible,.ecr summary:focus-visible{outline:3px solid var(--focus);outline-offset:2px}",
".ecr-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}",
".ecr-lab{display:block;margin:12px 0 6px;font-size:14px;font-weight:600}",
".ecr-field{display:block;width:100%;min-height:48px;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--inp);color:var(--ink);font:16px/1.4 Roboto,'Noto Sans','Segoe UI',sans-serif}",
"textarea.ecr-field{min-height:84px;resize:vertical}",
".ecr-msg{min-height:20px;margin-top:8px;font-size:14px;font-weight:600}.ecr-msg:empty{min-height:0;margin-top:0}.ecr-msg.err{color:var(--err)}.ecr-msg.ok{color:var(--ok)}",
".ecr-chip{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:4px 12px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);font-size:14px;font-weight:600}",
".ecr-dot{flex:0 0 10px;width:10px;height:10px;border-radius:50%;background:var(--conn)}",
".ecr-dot.live,.ecr-dot.listening{background:var(--live)}.ecr-dot.rest,.ecr-dot.hand{background:var(--rest)}.ecr-dot.closed{background:var(--closed)}.ecr-dot.speaking{background:var(--speak)}.ecr-dot.conn,.ecr-dot.disconnected{background:var(--conn)}",
".ecr-teach{display:flex;align-items:center;gap:14px}.ecr-teach>div:last-child{flex:1;min-width:0}",
".ecr-ava{flex:0 0 56px;width:56px;height:56px;border-radius:50%;border:2.5px solid var(--gold);background:var(--bg2);display:flex;align-items:center;justify-content:center}",
".ecr-ava svg{width:30px;height:30px}",
".ecr-teach b{display:block;font-size:19px;line-height:1.25}",
/* live header */
".ecr-hd{background:linear-gradient(145deg,var(--card2),var(--card));border:1.5px solid var(--gold)}",
".ecr-hdtop{display:flex;align-items:center;gap:12px}.ecr-hdtx{flex:1;min-width:0}.ecr-hdtx b{display:block;font-size:18px;line-height:1.25}",
".ecr-hdtx .ecr-sub{margin-top:2px;font-weight:600;color:var(--ink)}.ecr-hdtx .ecr-chip{margin-top:6px}",
".ecr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:8px;margin-top:12px}",
".ecr-stat{padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg2)}",
".ecr-stat small{display:block;font-size:12px;font-weight:700;line-height:1.25;color:var(--ink2)}",
".ecr-stat span{display:block;margin-top:2px;font-size:17px;line-height:1.25;font-weight:700}.ecr-stat.t span{color:var(--acc)}",
".ecr-prep{margin:10px 0 0;color:var(--rest);font-size:14px;font-weight:600}",
/* previews */
".ecr-by{margin:0 0 6px;font-size:13px;color:var(--ink2)}",
".ecr-prev{margin:0;font-size:16px;line-height:1.6}",
".ecr-tag{display:inline-block;margin:0 0 8px;padding:2px 10px;border:1px solid var(--rest);border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink)}",
".ecr-full{margin:12px 0 0;font-size:17px;line-height:1.7;white-space:pre-wrap}",
".ecr-lessonh{margin:0 0 6px;font-size:19px;line-height:1.3;font-weight:700}",
".ecr-blab{margin:14px 0 0;font-size:14px;font-weight:700}",
/* folds */
".ecr-foldc{padding:0;overflow:hidden}",
".ecr-foldh{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;padding:12px 14px;border:0;background:transparent;color:var(--ink);text-align:left;font:16px/1.3 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".ecr-foldh:active{background:var(--card2)}",
".ecr-fic{flex:0 0 40px;height:40px;border-radius:12px;background:var(--bg2);border:1px solid var(--line);color:var(--acc);display:flex;align-items:center;justify-content:center}.ecr-fic svg{width:22px;height:22px}",
".ecr-ftx{flex:1;min-width:0}.ecr-ftx b{display:block;font-size:17px}.ecr-ftx small{display:block;margin-top:1px;font-size:13px;color:var(--ink2)}",
".ecr-fact{flex:0 0 auto;display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:var(--acc)}.ecr-fact svg{width:18px;height:18px}",
".ecr-foldh[aria-expanded=true] .ecr-fact svg{transform:rotate(180deg)}",
".ecr-foldb{padding:0 14px 14px;border-top:1px solid var(--line)}",
".ecr-ex{margin-top:8px;padding:12px;border-left:4px solid var(--gold);border-radius:4px 12px 12px 4px;background:var(--card2);font-size:16px;line-height:1.6;white-space:pre-wrap}",
".ecr-pq{margin-top:8px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--bg2)}",
".ecr-pq p{margin:0;font-size:16px;line-height:1.6;white-space:pre-wrap}.ecr-pq .num{font-weight:700;color:var(--acc)}",
".ecr-ans{margin-top:8px;padding:10px 12px;border-radius:8px;border-left:4px solid var(--ok);background:var(--card2);font-size:16px;line-height:1.6;white-space:pre-wrap}",
".ecr-link{display:inline-flex;align-items:center;margin-top:8px;min-height:44px;padding:8px 14px;border:1.5px solid var(--line);border-radius:10px;background:transparent;color:var(--ink);font:600 15px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer}.ecr-link:active{opacity:.8}",
".ecr-big{margin:10px 0 0;font-size:18px;font-weight:700}",
/* learner grid */
".ecr-rg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 0;padding:0;list-style:none}",
".ecr-rc{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;min-height:92px;padding:8px 4px;border:1.5px solid var(--line);border-radius:12px;background:var(--bg2);text-align:center}",
".ecr-rc.me{border-color:var(--gold)}.ecr-rc.hand{border-color:var(--rest)}.ecr-rc.speaking{border-color:var(--speak);box-shadow:0 0 0 1px var(--speak)}.ecr-rc.disconnected{opacity:.75}",
".ecr-rav{flex:0 0 34px;width:34px;height:34px;border-radius:50%;background:var(--card2);border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--acc)}",
".ecr-rc.me .ecr-rav{border-color:var(--gold)}",
".ecr-rnm{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;max-width:100%;font-size:14px;line-height:1.25;font-weight:600}",
".ecr-rst{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2px 5px;font-size:12px;line-height:1.2;color:var(--ink2)}.ecr-rst span{overflow-wrap:normal;word-break:normal}.ecr-rst .ecr-dot{flex:0 0 8px;width:8px;height:8px}",
".ecr-none{margin:10px 0 0;font-size:14px;color:var(--ink2)}",
/* conversation */
".ecr-pair{margin-top:12px}",
".ecr-q,.ecr-a{padding:10px 12px;border-radius:12px;font-size:15px;line-height:1.55}",
".ecr-q{background:var(--bg2);border-left:4px solid var(--speak)}",
".ecr-a{background:var(--card2);border-left:4px solid var(--gold);margin:6px 0 0 10px;white-space:pre-wrap}",
".ecr-full-box .ecr-q,.ecr-full-box .ecr-a{font-size:16px;line-height:1.65}",
".ecr-who{display:block;margin-bottom:2px;font-size:13px;font-weight:700;color:var(--ink2)}",
".ecr-q .ecr-who{color:var(--speak)}.ecr-a .ecr-who{color:var(--acc)}",
"body.light .ecr-q .ecr-who{color:#1D5FB0}",
".ecr-pair .ecr-link{margin-left:10px}",
/* detail view */
".ecr-sheet{max-width:720px;margin:0 auto}",
".ecr-sh-top{display:flex;margin-bottom:10px}.ecr-sh-top .ecr-btn{flex:0 0 auto}",
".ecr-sh-h{margin:4px 2px 6px;font-size:22px;line-height:1.3;font-weight:700}.ecr-sh-h:focus{outline:none}",
".ecr-sheet .ecr-card{margin-top:10px}",
/* level screen */
".ecr-cat{display:flex;align-items:flex-start;gap:14px;width:100%;margin:0 0 12px;padding:16px;text-align:left;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);font:16px/1.4 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".ecr-cat:active{transform:scale(.99);background:var(--card2)}.ecr-cat.mine{border:2px solid var(--gold)}",
".ecr-cic{flex:0 0 52px;height:52px;border-radius:14px;background:var(--bg2);border:1px solid var(--line);color:var(--acc);display:flex;align-items:center;justify-content:center}.ecr-cic svg{width:28px;height:28px}",
".ecr-ctx{flex:1;min-width:0;display:block}.ecr-ctx b{display:block;font-size:19px}.ecr-ctx small{display:block;margin-top:2px;font-size:14px;color:var(--ink2)}",
".ecr-ctx .d{display:block;margin-top:8px;font-size:15px}.ecr-ctx .a{display:block;margin-top:10px;font-size:15px;font-weight:700;color:var(--acc)}",
".ecr-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
".ecr-lv{min-height:56px;padding:10px;border:1.5px solid var(--line);border-radius:12px;background:var(--bg2);color:var(--ink);font:600 16px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer}",
".ecr-lv.on{border-color:var(--gold);background:var(--card2)}.ecr-lv:active{opacity:.85}",
".ecr-spin{display:inline-block;width:16px;height:16px;margin-right:8px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:ecrs .8s linear infinite}@keyframes ecrs{to{transform:rotate(360deg)}}",
/* timetable: follows the classroom tokens, so it matches every theme */
".ecr-cal{--c-bg:var(--bg2);--c-card:var(--card);--c-card2:var(--card2);--c-line:var(--line);--c-ink:var(--ink);--c-ink2:var(--ink2);--c-blue:var(--gold);--c-onblue:var(--onacc);--c-plum:var(--acc);--c-live:var(--live);--c-warn:var(--rest);--c-bad:var(--closed);--c-mute:var(--conn);margin:0 0 12px;padding:14px;border:1px solid var(--c-line);border-radius:16px;background:var(--c-bg);color:var(--c-ink)}",
".ecr-cal h2{margin:0 0 2px;font-size:19px;line-height:1.3;font-weight:700}",
".cal-sub{margin:0 0 4px;font-size:14px;color:var(--c-ink2)}",
".cal-card{margin-top:10px;padding:12px;border:1px solid var(--c-line);border-radius:12px;background:var(--c-card)}",
".cal-kick{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c-plum)}",
".cal-b{margin:0;font-size:17px;line-height:1.35;font-weight:700}.cal-m{margin:2px 0 0;font-size:14px;color:var(--c-ink2)}",
".cal-btn{min-height:44px;padding:8px 12px;border:1.5px solid var(--c-line);border-radius:10px;background:transparent;color:var(--c-ink);font:600 15px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".cal-btn.pri{background:var(--c-blue);border-color:var(--c-blue);color:var(--c-onblue)}.cal-btn:active{opacity:.8}",
".ecr-cal button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}",
".cal-row{display:flex;gap:8px;margin-top:10px}.cal-row .cal-btn{flex:1;padding:8px 4px}",
".cal-mh{display:flex;align-items:center;gap:8px;margin-top:12px}.cal-mh b{flex:1;font-size:17px;text-align:center}.cal-mh .cal-btn{flex:0 0 auto;min-width:44px}",
".cal-wk,.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.cal-wk{margin-top:10px}.cal-wk span{text-align:center;font-size:12px;font-weight:700;color:var(--c-ink2)}.cal-grid{margin-top:4px}",
".cal-day{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:50px;padding:2px;border:1.5px solid transparent;border-radius:10px;background:var(--c-card);color:var(--c-ink);font:600 15px/1 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".cal-day .n{padding:3px 7px;border-radius:10px}.cal-day.today .n{background:var(--gold);color:var(--onacc)}",
".cal-day.sel{border-color:var(--gold);background:var(--c-card2)}.cal-day.next{outline:2px dashed var(--gold);outline-offset:-4px}",
".cal-blank{min-height:50px}.cal-dots{display:flex;gap:3px;min-height:7px}",
".cal-dot{display:inline-block;flex:0 0 7px;width:7px;height:7px;border-radius:50%;background:var(--gold)}",
".cal-dot.s-starting_soon{background:var(--c-warn)}.cal-dot.s-live{background:var(--c-live)}.cal-dot.s-completed{background:var(--c-mute)}.cal-dot.s-cancelled,.cal-dot.s-not_held{background:var(--c-bad)}",
".cal-leg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:13px;color:var(--c-ink2)}.cal-leg span{display:inline-flex;align-items:center;gap:6px}",
".cal-it{margin-top:8px;padding:10px 12px;border:1px solid var(--c-line);border-radius:10px;background:var(--c-bg)}",
".cal-chip{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:3px 10px;border:1px solid var(--c-line);border-radius:999px;font-size:13px;font-weight:700}",
".cal-err{margin:12px 0 0;font-size:14px;font-weight:600;color:var(--c-bad)}.cal-load{margin:12px 0 0;font-size:14px;color:var(--c-ink2)}",
/* notifications */
".ecr-note{display:block;width:100%;margin:0 0 10px;padding:14px;text-align:left;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:14px;font:16px/1.45 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".ecr-note.new{border:2px solid var(--gold)}.ecr-note:active{background:var(--card2)}",
".ecr-note b{display:block;font-size:17px}.ecr-note small{display:block;margin-top:2px;font-size:13px;color:var(--ink2)}.ecr-note small.nw{font-weight:700;color:var(--acc)}",
".ecr-note span{display:block;margin-top:8px;font-size:15px;white-space:pre-wrap}",
/* live layout: one column on phones (order below), two columns on wide screens */
".ecr-live{display:flex;flex-direction:column}",
".ecr-colA,.ecr-colB{display:contents}",
".ecr-o1{order:1}.ecr-o2{order:2}.ecr-o3{order:3}.ecr-o4{order:4}.ecr-o5{order:5}.ecr-o6{order:6}.ecr-o7{order:7}",
"@media (min-width:480px){.ecr-rg{grid-template-columns:repeat(4,minmax(0,1fr))}}",
"@media (max-width:329px){.ecr{padding-left:10px;padding-right:10px}.ecr-rg{grid-template-columns:repeat(2,minmax(0,1fr))}.ecr-fact span{display:none}}",
"@media (min-width:860px){.ecr.live{max-width:1000px}.ecr-live{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);column-gap:16px;align-items:start}.ecr-hd{grid-column:1/-1}.ecr-colA,.ecr-colB{display:block;min-width:0}.ecr-rg{grid-template-columns:repeat(3,minmax(0,1fr))}.ecr-sheet .ecr-rg{grid-template-columns:repeat(4,minmax(0,1fr))}}",
"@media (prefers-reduced-motion:reduce){.ecr-spin{animation:none}.ecr-btn:active,.ecr-cat:active{transform:none}}"
].join("\n");
/* wallpaper: none in this small version (the plain plum background is used) */
var WP="";
function allCss(){return CSS+(WP?"\n.ecr{--ecr-wallpaper:url(\""+WP+"\")}":"");}
function ensureStyle(){
  var old=document.getElementById("ecr-style");
  if(old){if(old.textContent!==allCss())old.textContent=allCss();return;}
  var s=document.createElement("style");s.id="ecr-style";s.textContent=allCss();document.head.appendChild(s);
}

/* ---------- small helpers ---------- */
function base(){try{return aiBase();}catch(e){return "https://edu-ai-backend-three.vercel.app/api";}}
function h(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function btn(label,cls){var b=h("button","ecr-btn"+(cls?" "+cls:""),label);b.type="button";return b;}
function levelName(code){for(var i=0;i<LEVELS.length;i++)if(LEVELS[i][0]===code)return LEVELS[i][1];return code||"";}
function clean(s){return String(s||"").replace(/\\[dt]?frac\{([^}]*)\}\{([^}]*)\}/g,function(m,a,b){function w(x){x=x.trim();return /^[0-9A-Za-z.]+$/.test(x)?x:"("+x+")";}return w(a)+"/"+w(b);}).replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\times/g,"\u00d7").replace(/\\div/g,"\u00f7").replace(/\\cdot/g,"\u00b7").replace(/\\left|\\right/g,"").replace(/\\\(|\\\)|\\\[|\\\]/g,"").replace(/\\,/g," ").replace(/\*\*/g,"");}
function rid(){var a="abcdefghijklmnopqrstuvwxyz0123456789",s="r";for(var i=0;i<20;i++)s+=a[Math.floor(Math.random()*a.length)];return s+Date.now();}
function hush(){try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}}
function say(t){
  if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined")return false;
  hush();
  var s=String(t||"").replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,"$1 over $2").replace(/\u00d7/g," times ").replace(/\u00f7/g," divided by ").replace(/=>/g,". ").replace(/=/g," equals ").replace(/\+/g," plus ").replace(/ - /g," minus ").replace(/[()*]/g," ").replace(/-----/g," ");
  var parts=s.match(/[^.!?\n]+[.!?]?/g)||[];
  parts.forEach(function(p){if(!p.trim())return;var u=new SpeechSynthesisUtterance(p.trim());u.rate=0.9;u.lang="en";speechSynthesis.speak(u);});
  return true;
}
/* Listen / Stop: Stop only stops the voice. It never leaves the class. */
/* ---------- small icons (inline, no library) ---------- */
var IC={
 play:'<path d="M8 5l11 7-11 7z"/>',
 stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
 book:'<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 chev:'<path d="M6 9l6 6 6-6"/>',
 hand:'<path d="M8 12V6.5a1.5 1.5 0 013 0V11"/><path d="M11 10.5V4.5a1.5 1.5 0 013 0V11"/><path d="M14 10.5V6.5a1.5 1.5 0 013 0V14c0 4-2.6 7-6.5 7-2.7 0-4.3-1.3-5.6-3.4L3.8 13.3a1.5 1.5 0 012.5-1.6L8 14"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c3 0 4.5 1.7 4.5 4.5"/>',
 chat:'<path d="M4 5h16v11H9.5L4 20z"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
 spark:'<path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z"/>'
};
function icon(name){var s=h("span","ecr-ic");s.setAttribute("aria-hidden","true");s.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(IC[name]||"")+'</svg>';return s;}
/* button with a small icon and a text label (label span is kept in b.lab so it can change while the request runs) */
function btnI(name,label,cls){
  var b=h("button","ecr-btn"+(cls?" "+cls:""));b.type="button";
  if(name)b.appendChild(icon(name));
  b.lab=h("span",null,label);b.appendChild(b.lab);return b;
}
function setLab(b,t){if(b.lab)b.lab.textContent=t;else b.textContent=t;}
/* preview text: collapse white space, cut at a word, never touches the stored text */
function prev(s,n){
  var t=String(s||"").replace(/\s+/g," ").trim();
  if(t.length<=n)return {t:t,cut:false};
  return {t:t.slice(0,n).replace(/\s+\S*$/,"")+"...",cut:true};
}
function whenOf(v){
  var t=typeof v==="number"?v:Date.parse(v);
  if(!isFinite(t)||t<9e11)return "";
  var d=new Date(t+2*3600000);
  return p2(d.getUTCHours())+":"+p2(d.getUTCMinutes());
}

/* Listen / Stop: ONE speech engine (say/hush above). Listen always cancels whatever is playing first, so two items never talk at once.
   Stop only stops the voice. It never leaves the class. extra = optional button put in front (for example "Read more"). */
function listenRow(getText,msgEl,extra){
  var row=h("div","ecr-row");
  if(extra)row.appendChild(extra);
  var b1=btnI("play","Listen","sec sm"),b2=btnI("stop","Stop","sec sm");
  b1.onclick=function(){msgEl.className="ecr-msg err";msgEl.textContent="";var t=getText();if(!t){msgEl.textContent="Nothing to read yet.";return;}if(!say(t))msgEl.textContent="Voice is not available on this phone.";};
  b2.onclick=function(){hush();msgEl.textContent="";};
  row.appendChild(b1);row.appendChild(b2);return row;
}

function stop(){gen++;hush();if(timer){clearTimeout(timer);timer=null;}if(tick){clearInterval(tick);tick=null;}if(calTick){clearInterval(calTick);calTick=null;}cal=null;}
function post(path,body){
  return window.EduAcct.token().then(function(tk){
    if(!tk)return {error:"Please sign in again."};
    var hd=(typeof eduDeviceHeaders==="function")?eduDeviceHeaders():{"Content-Type":"application/json"};
    hd.Authorization="Bearer "+tk;
    return fetch(base()+path,{method:"POST",headers:hd,body:JSON.stringify(body||{})}).then(function(r){return r.json().catch(function(){return {error:"Bad reply"};});});
  }).catch(function(){return {error:"No connection. Please try again."};});
}
function plain(act){return "/book-link?classroom="+act;}
function url(act){return "/book-link?classroom="+act+"&session="+encodeURIComponent(sid);}
function alive(){return ui.status&&document.body.contains(ui.status);}
function inDoc(n){return n&&document.body.contains(n);}
function pageHead(title,support){var d=h("div","ecr-head");d.appendChild(h("h1",null,title));if(support)d.appendChild(h("p",null,support));return d;}
function capSvg(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--acc)"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/></svg>';}
function teacherRow(subtitle){
  var top=h("div","ecr-teach");
  var pic=h("div","ecr-ava");pic.innerHTML=capSvg();
  var tx=h("div");tx.appendChild(h("b",null,"AI Teacher"));tx.appendChild(h("div","ecr-sub",subtitle));
  top.appendChild(pic);top.appendChild(tx);
  return {row:top,text:tx};
}

/* ---------- lesson card (approved lesson from the database) ---------- */
function oneLine(x){
  if(x==null)return "";
  if(typeof x==="string")return x;
  if(Array.isArray(x))return x.map(oneLine).filter(Boolean).join("  =>  ");
  if(typeof x==="object"){
    var q=x.question||x.q||x.title||x.problem||"";
    var a=x.answer||x.a||x.solution||x.text||x.explanation||"";
    if(q||a)return (q&&a)?(oneLine(q)+"  =>  "+oneLine(a)):oneLine(q||a);
    return Object.keys(x).map(function(k){return oneLine(x[k]);}).filter(Boolean).join("  ");
  }
  return String(x);
}
/* ---------- timetable (month calendar) ----------
   Data comes ONLY from the backend action "calendar". Nothing is invented: no data = an honest empty message.
   Dates (run_date) and times (start_local / end_local) are Malawi time (Africa/Blantyre, UTC+2, no daylight saving).
   "Now" is the SERVER time (d.now) adjusted by an offset, so a wrong phone clock does not change statuses or the countdown. */
var BT=2*3600000;
var MON=["January","February","March","April","May","June","July","August","September","October","November","December"];
var DOWS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
var DOWL=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
var STAT={scheduled:["Scheduled","scheduled"],starting_soon:["Starting soon","starting_soon"],live:["Live now","live"],completed:["Completed","completed"],cancelled:["Cancelled","cancelled"],not_held:["Not held","not_held"]};
var cal=null,calTick=null,pendingDay="";

function p2(n){return n<10?"0"+n:""+n;}
function ymd(y,m,d){return y+"-"+p2(m+1)+"-"+p2(d);}
function pd(s){var a=String(s).split("-");return {y:+a[0],m:+a[1]-1,d:+a[2]};}
function ud(s){var a=pd(s);return new Date(Date.UTC(a.y,a.m,a.d));}
function addDays(s,n){var t=ud(s);t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);}
function mStart(s){return String(s).slice(0,7)+"-01";}
function mEnd(s){var a=pd(s);return ymd(a.y,a.m,new Date(Date.UTC(a.y,a.m+1,0)).getUTCDate());}
function addMonth(key,n){var a=pd(key+"-01");var t=new Date(Date.UTC(a.y,a.m+n,1));return t.getUTCFullYear()+"-"+p2(t.getUTCMonth()+1);}
function longDate(s){var t=ud(s);return DOWL[(t.getUTCDay()+6)%7]+" "+t.getUTCDate()+" "+MON[t.getUTCMonth()]+" "+t.getUTCFullYear();}
function calNow(){return Date.now()+(cal?cal.off:0);}
function calToday(){return new Date(calNow()+BT).toISOString().slice(0,10);}
function dayWord(s){var t=calToday();return s===t?"Today":(s===addDays(t,1)?"Tomorrow":longDate(s));}
function statOf(it){return STAT[it.status]||[String(it.status||"Scheduled"),"scheduled"];}
function until(ms){
  if(ms<60000)return "less than a minute";
  var m=Math.ceil(ms/60000);
  if(m<60)return m+" min";
  var hr=Math.floor(m/60);
  if(hr<24){var r=m%60;return hr+" h"+(r?" "+r+" min":"");}
  var d=Math.floor(hr/24);return d+(d===1?" day":" days");
}
function cdText(c){
  var n=calNow();
  if(n>=c.cdEnd)return "Class time is over.";
  if(n>=c.cdStart)return "Class time has started.";
  return "Starts in "+until(c.cdStart-n);
}
function itemsOn(c,date){
  var out=[];
  Object.keys(c.items).forEach(function(k){if(c.items[k].run_date===date)out.push(c.items[k]);});
  out.sort(function(a,b){return Date.parse(a.starts_at)-Date.parse(b.starts_at);});
  return out;
}
function calNext(c){
  var n=calNow(),best=null;
  Object.keys(c.items).forEach(function(k){
    var it=c.items[k];
    if(it.status!=="scheduled"&&it.status!=="starting_soon"&&it.status!=="live")return;
    var s=Date.parse(it.starts_at),e=Date.parse(it.ends_at);
    if(!isFinite(s)||!isFinite(e)||e<=n)return;
    if(!best||s<best.s)best={it:it,s:s,e:e};
  });
  return best;
}
function cb(label,cls,fn,aria){
  var b=h("button","cal-btn"+(cls?" "+cls:""),label);b.type="button";
  if(aria)b.setAttribute("aria-label",aria);
  b.onclick=fn;return b;
}

/* ----- loading data ----- */
function calFetch(c,from,to,quiet){
  if(navigator.onLine===false){
    if(!quiet){c.err="You are offline. Connect to the internet to see the timetable.";calPaint(c);}
    return;
  }
  c.loading=true;
  if(!quiet){c.err="";calPaint(c);}
  post(plain("calendar"),{from:from,to:to}).then(function(d){
    if(cal!==c)return;
    c.loading=false;
    if(d&&d.ok===true){
      var t=Date.parse(d.now);
      if(isFinite(t))c.off=t-Date.now();
      c.fetchedAt=Date.now();c.err="";
      if(d.level)c.level=d.level;
      Object.keys(c.items).forEach(function(k){var dt=c.items[k].run_date;if(dt>=from&&dt<=to)delete c.items[k];});
      (d.items||[]).forEach(function(it){
        if(!it||!it.run_date||!it.slot_id)return;
        it.run_date=String(it.run_date).slice(0,10);
        c.items[it.slot_id+"|"+it.run_date]=it;
      });
      var k=from.slice(0,7);if(mStart(k)<from)k=addMonth(k,1);
      while(mEnd(k)<=to){c.loaded[k]=true;k=addMonth(k,1);}
      c.ready=true;
      if(!c.synced){c.synced=true;c.sel=pendingDay||calToday();c.vm=c.sel.slice(0,7);pendingDay="";}
      calEnsure(c);
    }else if(!quiet){
      c.err=(d&&d.error)||"Could not load the timetable.";
      calPaint(c);
    }else calPaint(c);
  });
}
/* this month plus the next 28 days (max 59 days, the server allows 62): gives the "Next class" card something to look at */
function calWindow(c,quiet){
  var t=calToday(),end=mEnd(t),far=addDays(t,28);
  calFetch(c,mStart(t),far>end?far:end,quiet);
}
function calEnsure(c){
  if(c.ready&&c.vm&&!c.loaded[c.vm]&&!c.loading){var f=mStart(c.vm);calFetch(c,f,mEnd(f));}
  else calPaint(c);
}
function calGo(c,date){c.sel=date;c.vm=date.slice(0,7);c.err="";calEnsure(c);}
function calMonth(c,n){
  var key=addMonth(c.vm,n),t=calToday();
  calGo(c,key===t.slice(0,7)?t:key+"-01");
}
function calStartTick(c){
  if(calTick)clearInterval(calTick);
  calTick=setInterval(function(){
    if(cal!==c||!inDoc(c.root)){clearInterval(calTick);calTick=null;return;}
    var n=calNow();
    if(c.cdEnd&&n>=c.cdEnd){calPaint(c);return;}
    if(c.cd)c.cd.textContent=cdText(c);
    var nx=calNext(c);
    /* near a class start: refresh quietly at most once a minute so "Starting soon" / "Live now" stay true */
    if(!document.hidden&&!c.loading&&nx&&(nx.s-n)<30*60000&&Date.now()-c.fetchedAt>60000)calWindow(c,true);
  },30000);
}

/* ----- drawing ----- */
function loadBlock(r,text){
  var p=h("p","cal-load");p.setAttribute("role","status");
  p.appendChild(h("span","ecr-spin"));p.appendChild(document.createTextNode(text));r.appendChild(p);
}
function errBlock(c,r){
  var p=h("p","cal-err",c.err);p.setAttribute("role","alert");r.appendChild(p);
  var b=cb("Try again","pri",function(){c.err="";if(!c.ready)calWindow(c,false);else calEnsure(c);});
  b.style.marginTop="10px";b.style.width="100%";r.appendChild(b);
}
function chipFor(it){
  var st=statOf(it),chip=h("span","cal-chip");
  chip.appendChild(h("span","cal-dot s-"+st[1]));chip.appendChild(document.createTextNode(st[0]));
  return chip;
}
function nextCard(c){
  var card=h("div","cal-card"),nx=calNext(c);
  card.appendChild(h("p","cal-kick","Next class"));
  c.cdStart=0;c.cdEnd=0;c.cd=null;
  if(!nx){card.appendChild(h("p","cal-m","No upcoming class is in the timetable yet."));return card;}
  var it=nx.it;
  card.appendChild(h("p","cal-b",clean(it.title)||"Class"));
  card.appendChild(h("p","cal-m",(it.level_name||levelName(it.level))+" \u00b7 "+dayWord(it.run_date)+", "+(it.start_local||"")+" - "+(it.end_local||"")));
  card.appendChild(chipFor(it));
  c.cdStart=nx.s;c.cdEnd=nx.e;
  c.cd=h("p","cal-b",cdText(c));c.cd.style.marginTop="10px";card.appendChild(c.cd);
  var row=h("div","cal-row");
  if(it.status==="live")row.appendChild(cb("Open the class","pri",function(){loadOpen(c.box);}));
  row.appendChild(cb("Show on calendar","",function(){calGo(c,it.run_date);}));
  card.appendChild(row);
  return card;
}
function dayPanel(c){
  var p=h("div","cal-card"),s=c.sel,its=itemsOn(c,s);
  p.appendChild(h("p","cal-kick",s===calToday()?"Today":"Selected day"));
  p.appendChild(h("h3","cal-b",longDate(s)));
  var row=h("div","cal-row");
  row.appendChild(cb("\u2039 Week","",function(){calGo(c,addDays(s,-7));},"Back one week"));
  row.appendChild(cb("\u2039 Day","",function(){calGo(c,addDays(s,-1));},"Previous day"));
  row.appendChild(cb("Day \u203a","",function(){calGo(c,addDays(s,1));},"Next day"));
  row.appendChild(cb("Week \u203a","",function(){calGo(c,addDays(s,7));},"Forward one week"));
  p.appendChild(row);
  if(!its.length){
    var mc=0;
    Object.keys(c.items).forEach(function(k){if(c.items[k].run_date.slice(0,7)===c.vm)mc++;});
    p.appendChild(h("p","cal-b","No classes are scheduled")).style.marginTop="12px";
    p.appendChild(h("p","cal-m",mc?"There is no class on this day.":"Nothing is scheduled this month for your level yet."));
    return p;
  }
  its.forEach(function(it){
    var box=h("div","cal-it");
    box.appendChild(h("p","cal-b",clean(it.title)||"Class"));
    box.appendChild(h("p","cal-m",(it.level_name||levelName(it.level))+" \u00b7 "+(it.start_local||"")+" - "+(it.end_local||"")));
    box.appendChild(chipFor(it));
    if(it.status==="live"){
      var jb=cb("Open the class","pri",function(){loadOpen(c.box);});
      jb.style.marginTop="10px";jb.style.width="100%";box.appendChild(jb);
    }
    p.appendChild(box);
  });
  return p;
}
function legend(){
  var l=h("div","cal-leg");
  [["scheduled","Upcoming"],["live","Live"],["completed","Done"],["cancelled","Cancelled"]].forEach(function(x){
    var s=h("span");s.appendChild(h("span","cal-dot s-"+x[0]));s.appendChild(document.createTextNode(x[1]));l.appendChild(s);
  });
  return l;
}
function calPaint(c){
  var r=c.root;if(!r)return;
  r.innerHTML="";c.cd=null;
  r.appendChild(h("h2",null,"Class timetable"));
  r.appendChild(h("p","cal-sub","Times are Malawi time. A dot means a class on that date."));
  if(!c.ready){
    if(c.err)errBlock(c,r);else loadBlock(r,"Loading the timetable...");
    return;
  }
  r.appendChild(nextCard(c));
  var a=pd(c.vm+"-01"),today=calToday();
  var mh=h("div","cal-mh");
  mh.appendChild(cb("\u2039","",function(){calMonth(c,-1);},"Previous month"));
  mh.appendChild(h("b",null,MON[a.m]+" "+a.y));
  mh.appendChild(cb("Today","",function(){calGo(c,today);},"Go to today"));
  mh.appendChild(cb("\u203a","",function(){calMonth(c,1);},"Next month"));
  r.appendChild(mh);
  if(!c.loaded[c.vm]){
    if(c.err)errBlock(c,r);else loadBlock(r,"Loading "+MON[a.m]+"...");
    return;
  }
  var wk=h("div","cal-wk");wk.setAttribute("aria-hidden","true");
  DOWS.forEach(function(d){wk.appendChild(h("span",null,d));});
  r.appendChild(wk);
  var gr=h("div","cal-grid");
  var lead=(new Date(Date.UTC(a.y,a.m,1)).getUTCDay()+6)%7;
  var dim=new Date(Date.UTC(a.y,a.m+1,0)).getUTCDate();
  var nx=calNext(c),nxDate=nx?nx.it.run_date:"";
  for(var i=0;i<lead;i++)gr.appendChild(h("span","cal-blank"));
  for(var d=1;d<=dim;d++)(function(d){
    var s=ymd(a.y,a.m,d),its=itemsOn(c,s);
    var b=h("button","cal-day"+(s===today?" today":"")+(s===c.sel?" sel":"")+(s===nxDate?" next":""));
    b.type="button";
    b.appendChild(h("span","n",String(d)));
    var dots=h("span","cal-dots");
    its.slice(0,3).forEach(function(it){dots.appendChild(h("span","cal-dot s-"+statOf(it)[1]));});
    b.appendChild(dots);
    b.setAttribute("aria-label",longDate(s)+", "+(its.length?its.length+(its.length===1?" class":" classes"):"no classes")+(s===today?", today":""));
    b.setAttribute("aria-pressed",s===c.sel?"true":"false");
    if(s===today)b.setAttribute("aria-current","date");
    b.onclick=function(){c.sel=s;calPaint(c);};
    gr.appendChild(b);
  })(d);
  r.appendChild(gr);
  r.appendChild(legend());
  r.appendChild(dayPanel(c));
}
function calendarCard(box,level){
  var c=(cal&&cal.ready&&cal.level===level&&Date.now()-cal.fetchedAt<45000)?cal:null;
  if(!c){
    c={items:{},loaded:{},off:0,sel:"",vm:"",err:"",loading:false,ready:false,synced:false,fetchedAt:0,level:level,cdStart:0,cdEnd:0,cd:null};
    cal=c;
  }
  c.box=box;c.root=h("section","ecr-cal");
  c.root.setAttribute("aria-label","Class timetable");
  box.appendChild(c.root);
  calStartTick(c);
  if(c.ready){if(pendingDay){var pd0=pendingDay;pendingDay="";calGo(c,pd0);}else calPaint(c);}else calWindow(c,false);
}

/* ---------- notifications (in-app only: list + badge; no closed-app phone alerts) ---------- */
function stamp(iso){var t=Date.parse(iso);if(!isFinite(t))return "";var d=new Date(t+BT);return d.getUTCDate()+" "+MON[d.getUTCMonth()].slice(0,3)+", "+p2(d.getUTCHours())+":"+p2(d.getUTCMinutes());}
function badgeSync(n){try{if(window.eduNotesRefresh){if(typeof n==="number")window.eduNotesRefresh(n);else window.eduNotesRefresh();}}catch(e){}}
function notesButton(box){
  var n=window.eduNotesCount||0;
  var b=btn(n>0?"Notifications ("+n+" new)":"Notifications","sec");
  b.style.marginTop="0";b.style.marginBottom="12px";
  b.onclick=function(){notesView(box);};
  box.appendChild(b);
}
function notesView(box){
  box.className="ecr";box.innerHTML="";
  box.appendChild(pageHead("Notifications","Class reminders and changes for your level."));
  var holder=h("div");box.appendChild(holder);
  holder.appendChild(loadingCard("Loading notifications..."));
  var back=btn("Back to the classroom","sec");
  back.onclick=function(){loadOpen(box);};
  post(plain("notes"),{}).then(function(d){
    if(!inDoc(box))return;
    holder.innerHTML="";
    if(!d||d.ok!==true){
      var ec=h("div","ecr-card");ec.appendChild(h("h2",null,"Could not load notifications"));
      var em=h("p","ecr-msg err",(d&&d.error)||"Please try again.");em.setAttribute("role","alert");ec.appendChild(em);
      var rb=btn("Try again");rb.onclick=function(){notesView(box);};ec.appendChild(rb);
      holder.appendChild(ec);box.appendChild(back);return;
    }
    var items=d.items||[],unread=typeof d.unread==="number"?d.unread:items.filter(function(i){return !i.read_at;}).length;
    badgeSync(unread);
    if(!items.length){
      var c=h("div","ecr-card");c.appendChild(h("h2",null,"No notifications yet"));
      c.appendChild(h("p","ecr-sub","Reminders about your classes will appear here."));
      holder.appendChild(c);
    }else{
      if(unread>0){
        var all=btn("Mark all as read");all.style.marginTop="0";all.style.marginBottom="12px";
        all.onclick=function(){all.disabled=true;post(plain("noteread"),{all:true}).then(function(){badgeSync();if(inDoc(box))notesView(box);});};
        holder.appendChild(all);
      }
      items.forEach(function(it){
        var isNew=!it.read_at;
        var b=h("button","ecr-note"+(isNew?" new":""));b.type="button";
        b.appendChild(h("small",isNew?"nw":null,isNew?"New":"Read"));
        b.appendChild(h("b",null,clean(it.title)||"Notification"));
        b.appendChild(h("small",null,stamp(it.created_at)));
        b.appendChild(h("span",null,clean(it.body)));
        b.onclick=function(){
          if(isNew)post(plain("noteread"),{ids:[it.id]}).then(function(){badgeSync();});
          pendingDay=it.run_date?String(it.run_date).slice(0,10):"";
          loadOpen(box);
        };
        holder.appendChild(b);
      });
    }
    box.appendChild(back);
  });
}

/* ---------- start: choose level / find open class / join ---------- */
function openScreen(app){
  stop();ui={};feedKey="";last=null;sid="";appRef=app;rosterOpen=false;busy=false;
  ensureStyle();
  try{setActiveNav("classroom");}catch(e){}
  try{setHeader('<h2>AI Classroom</h2>');}catch(e){}
  app.innerHTML="";
  var box=h("div","ecr");app.appendChild(box);
  if(!(window.EduAcct&&window.EduAcct.isIn&&window.EduAcct.isIn())){
    var c=h("div","ecr-card");c.appendChild(h("h2",null,"Please sign in"));
    c.appendChild(h("p","ecr-sub","Sign in with your student account first (tap the account icon at the top), then open the Classroom again."));
    box.appendChild(c);return;
  }
  if(window.__eduOpenNotes){window.__eduOpenNotes=0;notesView(box);return;}
  loadOpen(box);
}
function loadingCard(text){
  var c=h("div","ecr-card");c.setAttribute("role","status");
  var p=h("p","ecr-sub");p.appendChild(h("span","ecr-spin"));p.appendChild(document.createTextNode(text));c.appendChild(p);return c;
}
function loadOpen(box){
  box.className="ecr";box.innerHTML="";
  box.appendChild(loadingCard("Looking for your class..."));
  post(plain("open"),{}).then(function(d){if(inDoc(box))route(box,d,false);});
}
function route(box,d,checked){
  box.innerHTML="";
  if(!d||d.ok!==true){showError(box,(d&&d.error)||"Could not load the classroom.");return;}
  if(!d.level){levelPicker(box,"",false);return;}
  if(d.open!==true){noClass(box,d.level,checked);return;}
  sid=d.session;
  if(d.joined===true){enter(box,d);return;}
  joinCard(box,d);
}
function showError(box,msg){
  var c=h("div","ecr-card");
  c.appendChild(h("h2",null,"Something went wrong"));
  var m=h("p","ecr-msg err",msg);m.setAttribute("role","alert");c.appendChild(m);
  var b=btn("Try again");b.onclick=function(){loadOpen(box);};
  c.appendChild(b);box.appendChild(c);
}
/* Level screen: three separate education categories, then the levels inside the chosen one.
   Only the 12 level codes the backend already accepts are used. Tertiary has no backend codes yet,
   so TERTIARY stays empty and the screen says so honestly (nothing is invented). */
var PRIMARY=LEVELS.slice(0,8),SECONDARY=LEVELS.slice(8),TERTIARY=[];
function catOf(code){for(var i=0;i<PRIMARY.length;i++)if(PRIMARY[i][0]===code)return "primary";for(var j=0;j<SECONDARY.length;j++)if(SECONDARY[j][0]===code)return "secondary";return "";}
var ICON={
 primary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z"/></svg>',
 secondary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/></svg>',
 tertiary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/></svg>'
};
var CATS=[
 {k:"primary",title:"Primary",sub:"Standards 1\u20138",desc:"Learn, practise and attend Primary classes.",act:"View Primary classes"},
 {k:"secondary",title:"Secondary",sub:"Forms 1\u20134",desc:"Attend lessons and learn with your AI teacher.",act:"View Secondary classes"},
 {k:"tertiary",title:"Tertiary / College",sub:"College and university",desc:"Access college-level learning and classroom sessions.",act:"View Tertiary / College classes"}
];
function levelPicker(box,current,canGoBack){
  var cur=catOf(current);
  function cats(){
    box.innerHTML="";
    box.appendChild(pageHead("Welcome to your classroom","Choose your education level so we can find the right classroom and lessons for you."));
    if(current){var yl=h("div","ecr-card");yl.appendChild(h("p","ecr-kick","Your level"));yl.appendChild(h("h2",null,levelName(current)));
      var keep=btn("Keep this level");keep.onclick=function(){loadOpen(box);};yl.appendChild(keep);box.appendChild(yl);}
    CATS.forEach(function(c){
      var b=h("button","ecr-cat"+(c.k===cur?" mine":""));b.type="button";
      var ic=h("span","ecr-cic");ic.innerHTML=ICON[c.k];
      var tx=h("span","ecr-ctx");tx.appendChild(h("b",null,c.title));tx.appendChild(h("small",null,c.sub));tx.appendChild(h("span","d",c.desc));
      tx.appendChild(h("span","a",c.act+" \u2192"));
      b.appendChild(ic);b.appendChild(tx);
      b.onclick=function(){levels(c);};
      box.appendChild(b);
    });
    if(canGoBack){var bk=btn("Back","sec");bk.onclick=function(){loadOpen(box);};box.appendChild(bk);}
  }
  function levels(c){
    box.innerHTML="";
    box.appendChild(pageHead(c.title+" classes",c.k==="primary"?"Choose your standard.":c.k==="secondary"?"Choose your form.":"Choose your course or level."));
    var list=c.k==="primary"?PRIMARY:c.k==="secondary"?SECONDARY:TERTIARY;
    var card=h("div","ecr-card");
    var msg=h("div","ecr-msg");msg.setAttribute("role","status");
    if(!list.length){
      card.appendChild(h("h2",null,"Not open for college yet"));
      card.appendChild(h("p","ecr-sub","AI Classroom lessons are not available for Tertiary / College yet. You can still use the Library and Past Papers."));
    }else{
      var chosen=current&&list.some(function(l){return l[0]===current;})?current:"";
      var grid=h("div","ecr-grid");grid.setAttribute("role","group");grid.setAttribute("aria-label",c.title+" levels");
      var go=btn("Save Level");go.disabled=!chosen;
      list.forEach(function(l){
        var b=h("button","ecr-lv"+(l[0]===chosen?" on":""),(l[0]===chosen?"\u2713 ":"")+l[1]);b.type="button";b.setAttribute("aria-pressed",l[0]===chosen?"true":"false");
        b.onclick=function(){chosen=l[0];msg.textContent="";go.disabled=false;
          Array.prototype.forEach.call(grid.children,function(x){var on=x===b;x.className="ecr-lv"+(on?" on":"");x.setAttribute("aria-pressed",on?"true":"false");x.textContent=(on?"\u2713 ":"")+x.getAttribute("data-n");});};
        b.setAttribute("data-n",l[1]);grid.appendChild(b);
      });
      card.appendChild(grid);card.appendChild(go);card.appendChild(msg);
      go.onclick=function(){
        if(!chosen){msg.className="ecr-msg err";msg.textContent="Please choose your level first.";return;}
        msg.className="ecr-msg";msg.textContent="";go.disabled=true;go.textContent="Saving...";
        post(plain("setlevel"),{level:chosen}).then(function(d){
          if(!inDoc(box))return;
          go.disabled=false;go.textContent="Save Level";
          if(d&&d.ok===true){msg.className="ecr-msg ok";msg.textContent="Level saved: "+levelName(chosen)+".";setTimeout(function(){if(inDoc(box))loadOpen(box);},700);}
          else{msg.className="ecr-msg err";msg.textContent=(d&&d.error)||"Could not save your level.";}
        });
      };
    }
    box.appendChild(card);
    var bk=btn("Back","sec");bk.onclick=cats;box.appendChild(bk);
  }
  cats();
}
function noClass(box,level,checked){
  box.appendChild(pageHead("AI Classroom"));
  notesButton(box);
  var c=h("div","ecr-card");
  var ch=h("span","ecr-chip");ch.appendChild(h("span","ecr-dot closed"));ch.appendChild(h("span",null,"No class open"));c.appendChild(ch);
  c.appendChild(h("h2",null,"No class is open right now")).style.marginTop="12px";
  c.appendChild(h("p","ecr-sub","Your level: "+levelName(level)+". Check the timetable below for your next class."));
  var note=h("div","ecr-msg",checked?"Checked just now. Still no class is open for your level.":"");note.setAttribute("role","status");
  var b1=btn("Check again"),b2=btn("Change level","sec");
  b1.onclick=function(){
    b1.disabled=true;b2.disabled=true;b1.textContent="";b1.appendChild(h("span","ecr-spin"));b1.appendChild(document.createTextNode("Checking..."));
    post(plain("open"),{}).then(function(d){if(inDoc(box))route(box,d,true);});
  };
  b2.onclick=function(){box.innerHTML="";levelPicker(box,level,true);};
  c.appendChild(b1);c.appendChild(b2);c.appendChild(note);box.appendChild(c);
  calendarCard(box,level);
}
function joinCard(box,d){
  box.appendChild(pageHead("AI Classroom"));
  notesButton(box);
  var c=h("div","ecr-card");
  var ch=h("span","ecr-chip");ch.appendChild(h("span","ecr-dot live"));ch.appendChild(h("span",null,"A class is open now."));c.appendChild(ch);
  var t=teacherRow(clean(d.title||"")+" \u00b7 "+levelName(d.level));t.row.style.marginTop="14px";c.appendChild(t.row);
  var L=d.lesson;
  if(L&&(L.title||L.text)){
    c.appendChild(h("p","ecr-kick","Lesson")).style.marginTop="16px";
    c.appendChild(h("h2",null,clean(L.title)||"Lesson"));
    var pv=clean(L.text||"");if(pv.length>220)pv=pv.slice(0,220).replace(/\s+\S*$/,"")+"...";
    if(pv)c.appendChild(h("p","ecr-sub",pv)).style.fontSize="15px";
  }
  var go=btn("Join Class");
  var msg=h("div","ecr-msg");msg.setAttribute("role","status");
  go.onclick=function(){
    msg.className="ecr-msg";msg.textContent="";go.disabled=true;go.textContent="";go.appendChild(h("span","ecr-spin"));go.appendChild(document.createTextNode("Connecting..."));
    post(url("join"),{}).then(function(j){
      if(!inDoc(box))return;
      if(j&&j.ok===true){enter(box,d);}
      else{go.disabled=false;go.textContent="Try again";msg.className="ecr-msg err";msg.textContent=(j&&j.error)||"Could not join the class.";}
    });
  };
  var b2=btn("Change level","sec");
  b2.onclick=function(){box.innerHTML="";levelPicker(box,d.level,true);};
  c.appendChild(go);c.appendChild(b2);c.appendChild(msg);box.appendChild(c);
  calendarCard(box,d.level);
}
function enter(box,d){
  pendingDay="";
  box.className="ecr live";box.innerHTML="";
  var cls=h("div");box.appendChild(cls);
  build(cls,d);
  start();
}

/* ---------- live class screen (v4.0 compact layout) ----------
   Main view = header, latest explanation preview, your turn, lesson preview, Examples and Practice folds, learner grid, conversation preview.
   Detail views (full lesson, full explanation, full response, full conversation, all students) replace the main view while open.
   The main view is only hidden, never destroyed, so polling, timers, answers you revealed and your typed question all stay as they were. */
function lessonData(l){
  if(!l)return null;
  var ex=Array.isArray(l.examples)?l.examples.map(function(e){return clean(oneLine(e));}).filter(Boolean):[];
  var pq=[];
  (Array.isArray(l.practice)?l.practice:[]).forEach(function(p){
    var q=clean(typeof p==="object"&&p?(p.question||p.q||oneLine(p)):oneLine(p));
    var araw=typeof p==="object"&&p?(p.answer||p.a||""):"";
    var a=clean(typeof araw==="string"?araw:oneLine(araw));
    if(q)pq.push({q:q,a:a});
  });
  var title=clean(l.title)||"Lesson",text=clean(l.text);
  return {title:title,text:text,label:l.label||"AI-prepared, not teacher-verified",ex:ex,pq:pq,spoken:[clean(l.title),text].concat(ex)};
}
function ord(el,n){el.className+=" ecr-o"+n;return el;}

/* collapsible card: nothing is built until the first open, and repeated taps only show/hide the same content */
function fold(id,ico,title,count,sub,openLbl,closeLbl,fill){
  var c=h("section","ecr-card ecr-foldc");
  var hd=h("button","ecr-foldh");hd.type="button";hd.setAttribute("aria-expanded","false");hd.setAttribute("aria-controls",id);
  var ic=h("span","ecr-fic");ic.appendChild(icon(ico));
  var tx=h("span","ecr-ftx");tx.appendChild(h("b",null,title+" \u00b7 "+count));tx.appendChild(h("small",null,sub));
  var act=h("span","ecr-fact");var al=h("span",null,openLbl);act.appendChild(al);act.appendChild(icon("chev"));
  hd.appendChild(ic);hd.appendChild(tx);hd.appendChild(act);
  var body=h("div","ecr-foldb");body.id=id;body.hidden=true;
  var built=false;
  hd.onclick=function(){
    var open=body.hidden;
    body.hidden=!open;hd.setAttribute("aria-expanded",open?"true":"false");al.textContent=open?closeLbl:openLbl;
    if(open&&!built){built=true;fill(body);}
  };
  c.appendChild(hd);c.appendChild(body);return c;
}
function fillExamples(L){return function(body){
  L.ex.forEach(function(t,i){var b=h("div","ecr-ex");b.appendChild(h("span","ecr-who","Example "+(i+1)));b.appendChild(document.createTextNode(t));body.appendChild(b);});
};}
function fillPractice(L){return function(body){
  L.pq.forEach(function(p,i){
    var box=h("div","ecr-pq");
    var qp=h("p");qp.appendChild(h("span","num",(i+1)+". "));qp.appendChild(document.createTextNode(p.q));box.appendChild(qp);
    if(p.a){
      var tg=h("button","ecr-link","Show answer");tg.type="button";tg.setAttribute("aria-expanded","false");
      var ans=h("div","ecr-ans",p.a);ans.hidden=true;ans.id="ecr-ans-"+i;tg.setAttribute("aria-controls",ans.id);
      tg.onclick=function(){var open=ans.hidden;ans.hidden=!open;tg.textContent=open?"Hide answer":"Show answer";tg.setAttribute("aria-expanded",open?"true":"false");};
      box.appendChild(tg);box.appendChild(ans);
    }
    body.appendChild(box);
  });
};}

/* ----- detail view ----- */
function openSheet(trig,title,kind,fill){
  ui.trig=trig;ui.sy=window.pageYOffset||0;ui.kind=kind;ui.refresh=null;
  ui.sheet.innerHTML="";
  var top=h("div","ecr-sh-top");var b1=btnI("back","Back to classroom","sec");b1.onclick=closeSheet;top.appendChild(b1);ui.sheet.appendChild(top);
  var hd=h("h2","ecr-sh-h",title);hd.tabIndex=-1;ui.sheet.appendChild(hd);
  var body=h("div");ui.sheet.appendChild(body);
  fill(body);
  var b2=btnI("back","Back to classroom","sec");b2.onclick=closeSheet;ui.sheet.appendChild(b2);
  ui.main.hidden=true;ui.sheet.hidden=false;
  try{window.scrollTo(0,0);}catch(e){}
  try{hd.focus({preventScroll:true});}catch(e){}
}
function closeSheet(){
  if(!ui.sheet||ui.sheet.hidden)return;
  hush();ui.refresh=null;ui.kind="";
  ui.sheet.hidden=true;ui.sheet.innerHTML="";ui.main.hidden=false;
  try{window.scrollTo(0,ui.sy||0);}catch(e){}
  try{if(ui.trig&&inDoc(ui.trig))ui.trig.focus({preventScroll:true});}catch(e){}
}
function fillLessonSheet(L){return function(body){
  body.appendChild(h("p","ecr-kick","Today's lesson"));
  body.appendChild(h("h3","ecr-lessonh",L.title));
  body.appendChild(h("span","ecr-tag",L.label));
  body.appendChild(h("div","ecr-full",L.text));
  var lm=h("div","ecr-msg err");lm.setAttribute("role","status");
  body.appendChild(listenRow(function(){return L.spoken.join(". ");},lm));body.appendChild(lm);
};}
function fillExplainSheet(body){
  body.appendChild(h("p","ecr-kick","Latest explanation"));
  var by=h("p","ecr-by");body.appendChild(by);
  var tx=h("div","ecr-full");body.appendChild(tx);
  var lm=h("div","ecr-msg err");lm.setAttribute("role","status");
  body.appendChild(listenRow(function(){return ui.latestText||"";},lm));body.appendChild(lm);
  function paint(){by.textContent=ui.byText||"";tx.textContent=ui.latestText||"No explanation yet. Raise your hand to ask a question.";}
  paint();ui.refresh=function(changed){if(changed)paint();};
}
function whoLine(it,asked){
  var t=whenOf(it.at);
  return (asked?"Student asked \u00b7 ":"")+(it.by||"Student")+(t?" \u00b7 "+t:"");
}
/* one question + its answer. preview=true: short text and a "Read full response" button when something was cut. Stored text is never changed. */
function pairEl(it,preview){
  var wrap=h("div","ecr-pair"+(preview?"":" ecr-full-box"));
  var qt=it.question||"",at=clean(it.answer);
  var pq=preview?prev(qt,MSG_CHARS):{t:qt,cut:false},pa=preview?prev(at,MSG_CHARS):{t:at,cut:false};
  var q=h("div","ecr-q");q.appendChild(h("span","ecr-who",whoLine(it,true)));q.appendChild(document.createTextNode(pq.t));
  var a=h("div","ecr-a");a.appendChild(h("span","ecr-who","AI Teacher"));a.appendChild(document.createTextNode(pa.t));
  wrap.appendChild(q);wrap.appendChild(a);
  if(preview&&(pq.cut||pa.cut)){
    var rb=h("button","ecr-link","Read full response");rb.type="button";
    rb.onclick=function(){openSheet(rb,"Full response","message",function(body){
      body.appendChild(pairEl(it,false));
      var lm=h("div","ecr-msg err");lm.setAttribute("role","status");
      body.appendChild(listenRow(function(){return at;},lm));body.appendChild(lm);
    });};
    wrap.appendChild(rb);
  }
  return wrap;
}
function fillConvSheet(body){
  var key=null,list=h("div");body.appendChild(list);
  function paint(){
    var items=(last&&last.items)||[];
    var k=items.map(function(i){return i.at;}).join(",");
    if(k===key)return;key=k;
    list.innerHTML="";
    if(!items.length){list.appendChild(h("p","ecr-none","No questions yet."));return;}
    items.forEach(function(it){list.appendChild(pairEl(it,false));});
  }
  paint();ui.refresh=function(){paint();};
}
function rosterCards(list,host){
  list.forEach(function(r){
    var s=LABEL[r.status]?r.status:"disconnected";
    var nm=r.name||"Student";
    var li=h("li","ecr-rc "+s+(r.me?" me":""));
    li.setAttribute("aria-label",nm+(r.me?" (you)":"")+", "+LABEL[s]);
    var av=h("span","ecr-rav",nm.charAt(0).toUpperCase());av.setAttribute("aria-hidden","true");
    var n=h("span","ecr-rnm",nm+(r.me?" (you)":""));n.title=nm;
    var st=h("span","ecr-rst");st.appendChild(h("span","ecr-dot "+s));st.appendChild(h("span",null,LABEL[s]));
    li.appendChild(av);li.appendChild(n);li.appendChild(st);host.appendChild(li);
  });
}
function fillRosterSheet(body){
  var sp=h("p","ecr-sub");body.appendChild(sp);
  var g=h("ul","ecr-rg");g.setAttribute("aria-label","All students");body.appendChild(g);
  function paint(){
    var all=(last&&last.roster)||[];
    sp.textContent=(all.length+(all.length===1?" learner":" learners"))+" \u00b7 "+(last&&last.speaker?("Now speaking: "+last.speaker):"Nobody is speaking.");
    g.innerHTML="";
    if(!all.length){g.parentNode.insertBefore(h("p","ecr-none","No students are connected yet."),g);return;}
    rosterCards(all,g);
  }
  paint();ui.refresh=function(){paint();};
}

function build(cls,d){
  cls.innerHTML="";
  var L=lessonData(d.lesson);ui.L=L;ui.latestText="";ui.byText="";ui.refresh=null;ui.kind="";
  ui.main=h("div","ecr-live");
  ui.sheet=h("div","ecr-sheet");ui.sheet.hidden=true;
  cls.appendChild(ui.main);cls.appendChild(ui.sheet);
  var M=ui.main,A=h("div","ecr-colA"),B=h("div","ecr-colB");

  /* 1. header: teacher, level, lesson, status, time and usage */
  var hd=h("section","ecr-card ecr-hd");hd.setAttribute("aria-label","Class status");
  var top=h("div","ecr-hdtop");
  var pic=h("div","ecr-ava");pic.innerHTML=capSvg();
  var tx=h("div","ecr-hdtx");
  tx.appendChild(h("p","ecr-kick","AI Classroom"));
  tx.appendChild(h("b",null,"AI Teacher \u00b7 "+levelName(d.level)));
  ui.title=h("div","ecr-sub");ui.title.textContent=clean(d.title||"");tx.appendChild(ui.title);
  var chip=h("span","ecr-chip");
  var dot=h("span","ecr-dot conn"),st=h("span",null,"Connecting...");
  st.setAttribute("role","status");
  chip.appendChild(dot);chip.appendChild(st);tx.appendChild(chip);
  top.appendChild(pic);top.appendChild(tx);hd.appendChild(top);
  ui.dot=dot;ui.status=st;
  var stats=h("div","ecr-stats");
  ui.timeBox=h("div","ecr-stat t");ui.timeBox.hidden=true;
  ui.timeBox.appendChild(h("small",null,"Time left"));ui.time=h("span");ui.timeBox.appendChild(ui.time);
  var s1=h("div","ecr-stat");s1.appendChild(h("small",null,"Class answers"));ui.used=h("span",null,"-");s1.appendChild(ui.used);
  var s2=h("div","ecr-stat");s2.appendChild(h("small",null,"Your questions"));ui.mineq=h("span",null,"-");s2.appendChild(ui.mineq);
  stats.appendChild(ui.timeBox);stats.appendChild(s1);stats.appendChild(s2);hd.appendChild(stats);
  ui.prep=h("p","ecr-prep","Preparing an answer...");ui.prep.style.display="none";ui.prep.setAttribute("role","status");hd.appendChild(ui.prep);
  ui.again=btn("Check for the next class");ui.again.style.display="none";
  ui.again.onclick=function(){openScreen(appRef);};
  hd.appendChild(ui.again);
  M.appendChild(hd);

  /* 2. latest explanation (preview; full text in a detail view) */
  var c1=ord(h("section","ecr-card"),1);c1.setAttribute("aria-label","Latest explanation");
  c1.appendChild(h("p","ecr-kick","Latest explanation"));
  ui.by=h("p","ecr-by");c1.appendChild(ui.by);
  ui.latest=h("p","ecr-prev");c1.appendChild(ui.latest);
  ui.readMore=btnI(null,"Read more","sm");ui.readMore.hidden=true;ui.readMore.className+=" rd";
  ui.readMore.onclick=function(){openSheet(ui.readMore,"Latest explanation","explain",fillExplainSheet);};
  var lm=h("div","ecr-msg err");lm.setAttribute("role","status");
  c1.appendChild(listenRow(function(){return ui.latestText||"";},lm,ui.readMore));c1.appendChild(lm);
  A.appendChild(c1);

  /* 3. your turn */
  var c2=ord(h("section","ecr-card"),2);c2.setAttribute("aria-label","Your turn");
  ui.turnH=h("h2",null,"Your turn");c2.appendChild(ui.turnH);
  ui.mine=h("p","ecr-big");c2.appendChild(ui.mine);
  ui.hint=h("p","ecr-sub");c2.appendChild(ui.hint);
  ui.raise=btnI("hand","Raise Hand");
  ui.lower=btnI("hand","Lower Hand","sec");ui.lower.style.display="none";
  ui.askBox=h("div");ui.askBox.style.display="none";
  var ql=h("label","ecr-lab","Your question");ql.htmlFor="ecr-q";
  ui.q=h("textarea","ecr-field");ui.q.id="ecr-q";ui.q.maxLength=300;ui.q.rows=3;ui.q.placeholder="Ask your question about the lesson...";ui.q.autocomplete="off";
  ui.ask=btnI("spark","Ask the AI Teacher");ui.ask.disabled=true;
  ui.done=btn("I Am Done","sec");
  ui.askBox.appendChild(ql);ui.askBox.appendChild(ui.q);ui.askBox.appendChild(ui.ask);ui.askBox.appendChild(ui.done);
  ui.msg=h("div","ecr-msg");ui.msg.setAttribute("role","status");
  c2.appendChild(ui.raise);c2.appendChild(ui.lower);c2.appendChild(ui.askBox);c2.appendChild(ui.msg);
  B.appendChild(c2);
  ui.raise.onclick=function(){act("raise");};
  ui.lower.onclick=function(){act("lower");};
  ui.done.onclick=function(){act("lower");};
  ui.ask.onclick=askNow;
  ui.q.oninput=function(){ui.ask.disabled=busy||!ui.q.value.trim();};

  /* 4. lesson preview + Examples + Practice questions */
  if(!L){
    var c0=ord(h("section","ecr-card"),3);c0.appendChild(h("h2",null,"Lesson"));c0.appendChild(h("p","ecr-sub","The lesson notes are not ready yet."));A.appendChild(c0);
  }else{
    var c3=ord(h("section","ecr-card"),3);c3.setAttribute("aria-label","Today's lesson");
    c3.appendChild(h("p","ecr-kick","Today's lesson"));
    c3.appendChild(h("h2",null,L.title));
    c3.appendChild(h("span","ecr-tag",L.label));
    var lp=prev(L.text,LESSON_CHARS);
    if(lp.t)c3.appendChild(h("p","ecr-prev",lp.t));
    var rl=btnI(null,"Read lesson","sm");rl.hidden=!lp.cut;rl.className+=" rd";
    rl.onclick=function(){openSheet(rl,L.title,"lesson",fillLessonSheet(L));};
    var lm2=h("div","ecr-msg err");lm2.setAttribute("role","status");
    c3.appendChild(listenRow(function(){return L.spoken.join(". ");},lm2,rl));c3.appendChild(lm2);
    A.appendChild(c3);
    if(L.ex.length)A.appendChild(ord(fold("ecr-ex","spark","Examples",L.ex.length,"Real-life examples from the lesson.","View examples","Hide examples",fillExamples(L)),4));
    if(L.pq.length)A.appendChild(ord(fold("ecr-pq","list","Practice questions",L.pq.length,"Test your understanding.","Open questions","Close questions",fillPractice(L)),5));
  }

  /* 5. learners: compact grid, all of them in a detail view */
  var c5=ord(h("section","ecr-card"),6);c5.setAttribute("aria-label","Students");
  var rh=h("div");rh.style.cssText="display:flex;align-items:baseline;justify-content:space-between;gap:8px";
  rh.appendChild(h("h2",null,"Classroom"));ui.rcount=h("span","ecr-sub");rh.appendChild(ui.rcount);c5.appendChild(rh);
  ui.speaker=h("p","ecr-sub");c5.appendChild(ui.speaker);
  ui.roster=h("ul","ecr-rg");ui.roster.setAttribute("aria-label","Students in this class");c5.appendChild(ui.roster);
  ui.more=btnI("people","View all students","sec");ui.more.hidden=true;
  ui.more.onclick=function(){openSheet(ui.more,"All students","roster",fillRosterSheet);};
  c5.appendChild(ui.more);
  B.appendChild(c5);

  /* 6. shared conversation: previews first */
  var c4=ord(h("section","ecr-card"),7);ui.c4=c4;c4.setAttribute("aria-label","Class conversation");
  c4.appendChild(h("h2",null,"Class Conversation"));
  c4.appendChild(h("p","ecr-sub","Questions and answers shared with everyone in the classroom."));
  ui.feed=h("div");c4.appendChild(ui.feed);
  ui.feedMore=btnI("chat","View full conversation","sec");ui.feedMore.hidden=true;
  ui.feedMore.onclick=function(){openSheet(ui.feedMore,"Class Conversation","conv",fillConvSheet);};
  c4.appendChild(ui.feedMore);
  B.appendChild(c4);

  M.appendChild(A);M.appendChild(B);
}

function secs(n){n=Math.max(0,Math.floor(n));var m=Math.floor(n/60),s=n%60;return m+":"+(s<10?"0":"")+s;}
var LABEL={listening:"Listening",hand:"Hand raised",speaking:"Speaking",disconnected:"Disconnected"};

function paintExplain(items){
  if(items.length){
    ui.latestText=clean(items[0].answer);
    var t=whenOf(items[0].at);
    ui.byText=items[0].by?("Answering "+items[0].by+(t?" \u00b7 "+t:"")):"";
    var p=prev(ui.latestText,EXPL_CHARS);
    ui.latest.textContent=p.t;ui.readMore.hidden=!p.cut;
  }else{
    ui.latestText="";ui.byText="";
    ui.latest.textContent="No explanation yet. Raise your hand to ask a question.";ui.readMore.hidden=true;
  }
  ui.by.textContent=ui.byText;ui.by.hidden=!ui.byText;
}
function paintFeed(items){
  ui.feed.innerHTML="";
  if(!items.length){ui.feed.appendChild(h("p","ecr-none","No questions yet."));ui.feedMore.hidden=true;return;}
  items.slice(0,FEED_PREVIEW).forEach(function(it){ui.feed.appendChild(pairEl(it,true));});
  ui.feedMore.hidden=items.length<=FEED_PREVIEW;
  setLab(ui.feedMore,"View full conversation ("+items.length+")");
}
function paintRoster(d){
  ui.speaker.textContent=d.speaker?("Now speaking: "+d.speaker):"Nobody is speaking.";
  var all=d.roster||[],shown=all;
  ui.rcount.textContent=all.length?(all.length+(all.length===1?" learner":" learners")):"";
  if(all.length>ROSTER_PREVIEW){
    shown=all.slice(0,ROSTER_PREVIEW);
    all.slice(ROSTER_PREVIEW).forEach(function(r){if(r.me||r.status==="speaking")shown.push(r);});
  }
  ui.roster.innerHTML="";
  if(!all.length){ui.roster.hidden=true;}
  else{ui.roster.hidden=false;rosterCards(shown,ui.roster);}
  ui.more.hidden=all.length<=ROSTER_PREVIEW;
  setLab(ui.more,"View all students ("+all.length+")");
}

function render(d){
  if(!alive())return;
  var isOpen=d.open===true,paused=d.paused===true;
  ui.dot.className="ecr-dot "+(!isOpen?"closed":(paused?"rest":"live"));
  ui.status.textContent=!isOpen?"Class is closed":(paused?"AI teacher is resting":"Live");
  ui.again.style.display=isOpen?"none":"flex";
  ui.title.textContent=clean(d.title||"");
  ui.used.textContent=(typeof d.used==="number"&&typeof d.max==="number")?d.used+" of "+d.max:"-";
  ui.mineq.textContent=(typeof d.mine==="number"&&typeof d.mineMax==="number")?d.mine+" of "+d.mineMax:"-";
  ui.prep.style.display=d.preparing?"block":"none";
  var items=d.items||[];
  var key=items.map(function(i){return i.at;}).join(",");
  var changed=false;
  if(key!==feedKey){feedKey=key;changed=true;paintExplain(items);paintFeed(items);}
  /* your turn */
  var me=d.me||{status:"listening"};
  var why="";
  if(!isOpen)why="Class is closed.";
  else if(paused)why="The AI teacher is resting.";
  else if(d.mine>=d.mineMax)why="You have used all your questions.";
  else if(d.used>=d.max)why="The class has used all its answers.";
  ui.raise.style.display=me.status==="listening"?"flex":"none";
  ui.raise.disabled=!!why||busy;
  ui.lower.style.display=me.status==="hand"?"flex":"none";
  ui.askBox.style.display=me.status==="speaking"?"block":"none";
  if(me.status==="hand"){
    ui.turnH.textContent="Your hand is raised";
    ui.mine.textContent="You are number "+me.position+" in line";ui.mine.style.display="block";
    ui.hint.textContent="Please wait. The AI Teacher will give you a turn.";
  }else if(me.status==="speaking"){
    ui.turnH.textContent="It's your turn!";
    ui.mine.style.display="block";
    ui.hint.textContent="";
  }else{
    ui.turnH.textContent="Your turn";
    ui.mine.textContent="";ui.mine.style.display="none";
    ui.hint.textContent=why||"Have a question about the lesson? Raise your hand to join the queue.";
  }
  paintRoster(d);
  if(ui.refresh)ui.refresh(changed);
  ticker();
}

function ticker(){
  if(!last||!alive())return;
  var el1=(Date.now()-lastAt)/1000;
  var endMs=last.endsAt?new Date(last.endsAt).getTime():NaN;
  if(isFinite(endMs)){
    var left=(endMs-Date.now())/1000;
    ui.timeBox.hidden=false;
    ui.time.textContent=left>0?secs(left):"Class time is over.";
  }else ui.timeBox.hidden=true;
  var me=last.me||{};
  if(me.status==="speaking"){ui.mine.textContent="Time left: "+secs((me.secondsLeft||0)-el1);}
}

/* ---------- actions ---------- */
function act(name){
  ui.msg.className="ecr-msg";ui.msg.textContent="";
  var b=name==="raise"?ui.raise:ui.lower,old=b.lab?b.lab.textContent:"";
  setLab(b,name==="raise"?"Raising...":"Lowering...");
  ui.raise.disabled=true;ui.lower.disabled=true;ui.done.disabled=true;
  post(url(name),{}).then(function(d){
    if(!alive())return;
    setLab(b,old);
    ui.raise.disabled=false;ui.lower.disabled=false;ui.done.disabled=false;
    if(d&&d.ok===true){if(name==="lower")ui.q.value="";}
    else{ui.msg.className="ecr-msg err";ui.msg.textContent=(d&&d.error)||"Something went wrong.";}
    pollNow();
  });
}
function askNow(){
  if(busy)return;
  var t=ui.q.value.trim();ui.msg.className="ecr-msg err";ui.msg.textContent="";
  if(t.length<5){ui.msg.textContent="Write a longer question.";return;}
  busy=true;ui.ask.disabled=true;setLab(ui.ask,"Sending...");
  post(url("ask"),{requestId:rid(),question:t}).then(function(d){
    busy=false;
    if(!alive())return;
    setLab(ui.ask,"Ask the AI Teacher");ui.ask.disabled=!ui.q.value.trim();
    if(d&&d.ok){ui.q.value="";ui.ask.disabled=true;ui.msg.className="ecr-msg ok";ui.msg.textContent="Answer added.";}
    else{ui.msg.className="ecr-msg err";ui.msg.textContent=(d&&d.error)||"Something went wrong.";}
    pollNow(function(){if(d&&d.ok){try{ui.c4.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}}});
  });
}

/* ---------- polling: every 4 seconds, never overlapping ---------- */
function pollNow(done){
  post(url("poll"),{}).then(function(d){
    if(!alive())return;
    if(d&&d.ok){last=d;lastAt=Date.now();render(d);}
    else if(d&&d.error){ui.status.textContent=d.error;}
    if(typeof done==="function")done();
  });
}
function start(){
  var g=gen;
  if(tick)clearInterval(tick);
  tick=setInterval(ticker,1000);
  (function loop(){
    if(g!==gen)return;
    if(!alive()){stop();return;}
    if(document.hidden){timer=setTimeout(loop,4000);return;}
    post(url("poll"),{}).then(function(d){
      if(g!==gen)return;
      if(!alive()){stop();return;}
      var ok=!!(d&&d.ok);
      if(ok){last=d;lastAt=Date.now();render(d);}
      else{
        ui.dot.className="ecr-dot conn";
        ui.status.textContent=(d&&d.error)||"Connection problem. Trying again...";
        if(d&&(d.reason==="closed"||d.reason==="no_session"||d.reason==="not_on_roster"))ui.again.style.display="flex";
      }
      timer=setTimeout(loop,ok?4000:8000);
    });
  })();
}
window.EduClassroom={open:openScreen,stop:stop};
})();
