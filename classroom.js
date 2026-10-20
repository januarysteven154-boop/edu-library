/* AI Classroom v4.0 - loaded on demand by index.html. Needs a signed-in student.
   Same flow and same backend calls as v3.3 (actions: open, setlevel, join, poll, raise, lower, ask, calendar, notes, noteread).
   v4.0 = compact redesign of the LIVE class screen only:
          header with status cards, latest-explanation preview, lesson preview, collapsible Examples and Practice questions
          (answers shown one by one), responsive learner grid with "View all students", conversation previews with
          "Read full response" and "View full conversation", gold accents, three themes (Sunset, Dark, Light).
          Long text is never cut: full lesson, full explanation and full messages open in a detail view and the live class keeps running behind it.
   WALLPAPER: the sunset picture is embedded in this file and is the background of every classroom screen. */
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
/* wallpaper: the sunset picture is stored inside this file (no separate picture file to upload) */
var WP="data:image/jpeg;base64,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+dmt65WXvnl2zvE74OePRzs5usS4nRcc/RiTOeuTGrJNTWss659TXFGdvP1svNz1n0dvF6sdNcM7TpIlvPDeOfS50565ddZ6Zmcu/O9s3jdQ5Xc2xYud3NmyZOvXhvOuHfphcNc7MXc3MXVJrMNZujl6M1c61qWc+gnk9nGzy30rnh6LuarDOt9Mya3jszvPTGJe+euee/L5/b5uvCO/BNOOrn14c+etcuvLWNzC51zY1neWLOkdF4erx6PVz7eXO93PZOnm6cJemtaPH6PPrtzuNbyszmTprPKO2uVWTm3OnThi3p042XXfzdpenOSTuz0dc5561N89aM56Uxq2XOtZVOMud2dTFu5cztqa48vVJcc++DWeuZfP09XAuOObne+XaZszjLWcTeLmY1n09fJc69XLHbNxz6Z1nlOjWcdOWzj7vNZrF3w1n6Hk63n01zdEvL0XNcrzrhed78umuO8unPG03zmE2ttcumSXpzWTcSIrp28/XO+84TN7ayavPeLMdsSy5xLPY8/absml1eSXr18lPbfldJfdnHab4eX6O08HT1+Qkz6049eUl1zuHPr5bNY1jOdZ1jWdS2ajt14Yxvpy9PGz14zrnu4z6Dx6651lz78zVzk59+G9Td8/bN5sN4x0z004zpplrPHLqwp1iEhZneNMXpbObeJrpNWXPTMl7znZbrh0udIupWpWXNe+/Po9F46mmew5O/E5unRPJ6rprlPRjOsdc5l5xbzznfG5xu41zzit501mV353NxPRg3vh6sbw1mV6uHTGsOWdY1jeNZ6Yzs4tZ3M9+HQxCyb56s78t5ymOnOydGRnWa1ZqW9NeaXtnPTVebvzs1eTLrz1pcN0xcLNyRe2vPqX0vPub013l8/THGva86X18s2a6PJtLnfKxrC56749sbzncs5z0c058/ZY8jty3hz3mzWO8zcs9ovWuW+3k7Ylzljpz1LTlLN46XhuXGN8956UlY3g/8QALxAAAgIBAwMDBAIDAAIDAAAAAAECERIDECETIjEEIEEwMkBQFCMzQmAFQ3CAsP/aAAgBAQABBQL/APXAor/4fr2UVtX/ABT2r24mP/D5HkxOENXtZZkZf8QpGQ/ff/01r/i0iivqKNlCRiY7V+5raitm/p4loVMof76y/wADMy+lX6Ovxq+qlvRiY/pK+vW9ey97/ASEjExMRoT3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uRfIm6CpZC+UzEjIt8i7h7VbHYog8svbY0pTLILZdFxBKoKPY4JHgnkPYkPoMGiG8IbPbMlBJiZTXiaB5Bz8mTg9ZCVCDRfI2INDb6S//9oADAMBAAIAAwAAABBb7777777775L77777777777777767b775774p777b777777777777777777777777777777777777777777b7Lb77777577777/7777777777777777rLbb6oIIp4J4oIKIJJ4oIIIIIIIIKKI4IIIIIIILpIIJL44IoILb77KpJ744pIIIIILKJILIJIIIIIIIIIKJJKIa664IY45645o4444Ip4oY4Z644447r77646447777//APP/AP8A/wD+++2+++eiW+++W7+++++7++/++++69999xxxBRxxRx9999xxxd991hBV9xxxRBxx5xxxxBBtAAAMssBhBBBBBBBBBpBBEJBBFRhBABQgBsAAAcNMEcww48MMMMMMMMMMM88sMMMMYsMM8w4w0wwMM84884AAAA8wAww4840I0wg8088wwAAY8AAEAAAA0oAxhB5FFBBBBAAABdtBAgBBBRBAEMJx0hsBAgRdNPPPP/wD98/37X3+9z/zzz/8A/wDP/wD/AP3nPPfPf+9svPPPOMPPMIJOMNOMMNPPPPOMY4oILMOMMMMMMMMMMI7zRzoJTziSyzgAJzwwwwwxzgDDQx7wgxrbLLL945jHXTz3mEH2FGGFCAFGBDDDFTmlHXHzDEwEEAABCDX00EEl3k1332kEEX300EUH3n33200kF33nHH13301jL6CgAADEwDHDXHAADHHCASwADAAAEEEDRiAQw0yy4sI7N4J4x444oIZ77L557MPd77rJb7LLLLKPLzoxjJ/sM9/NPfMMPPNPOMPOMd+8vOM88s8889+488NFqc1jCADiAxSwwwyxx0kVXXzzxzzhTiADBDBHzDQ9P8gbLPI4447OZ4N9MADjHQ01AEwnEWEDDLLIY76R2tfb0000k3w01jDLLLL6447rLL67+9EHHHDARCVy54jKc4c445yBzKI7LLY5o44444448tMFHc1vPsDjXn12sKsQw2V0000wywABDqED0FPf+sP/APvPQMQwNYwASywQC/fnPOPPPRw8dLDPDDDLBhNNAwSP40NRMKGeuPuN9xyMPNMN73uA51+/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jLXJTdk3wenj14//xAAsEQEBAQACAgIBAwQCAgMBAAABABEhMRBBUWEgcYHwMJGx4aHRUPFAcJDB/9oACAECAQE/EP8A8qB/+yFbakLb/wCFbeZBamAjT/U38dt8b522222238vdEPMhxJZpC5/+Htttttv/AIDbbbbbbf6G222/htvnfDbbfG/0ttt/DbbfG2+FySMahW3wuSSTdTi2uIF2x+G22222+Ntttt/DbfwNtt8K+pTq29wLrztspIectepJ3BZlSEvhtttttttttttvkZsTfOhbbt31Ck+IH3bIt8bOS8cMxpL1GWLAmbHwbDObuQdRu2xbbbbbb4wstROLbbXZ9yD7gIAt8sYE1ey9hF9TPUD5PgMsb3C5bZHLJTTm0cEAbA9BLMr5Nttv9TD8NtthrtgnXUPVsDuW8iATkuLt7YPcHGXaQfUA6kPfiAdeN/obbbbb43xtttttsa6p3lgyScTnqJ3beB8rm3ztttttvjbbbbbbbbbbbbbbbbbbbbbgYSG7AM7tuGwjDq2222222222222222222222222222222BepRbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbAvV9VjG4UYsttt8sKF4bbbbbbbbbbbbbbbdwkhY+FTmR8y94hTmIYWeAZ+LbbX+gDbbbbbbbYfBM4lkz4t5BHPdp3fRH57LkBttttttt86222222222lvhs4tu24FguWECUXhsvuC4tvrCbbfJtx7jLSC8XYeNtttt8OPq+5cpmvvwvjL5y49zrq10uHbCF4YesLuO2PEw2yTuHZ2xN22uBa9yBk+rS/EFLV4jOC6aQcfCl1bbHQJDsllufUN1WsAeTD4uL9MkcEo6wlOyB6JycQ/iNuSYq9TpgEZvFjOZiZ3Pxh5gnq4nVh44m1kLohcrbM1YUo6oNnhxhh2222222223zvjbbSz68FXq1YwPjCzxtvh9ZduOrZZN0Jh0Lh82VvBhDtT7EgHK2vzbbb4bba22/wBMbQj2kznDICeX+bBc+FmM8sHqC/MRpau4JAHlsGbIdyu7O4WPDbbfO2222+dttttgXq1U4WOLvnL7kpExcgTFsdP0wem+jP3s/EuMy5eoD4vZkB685+e222222223Pu5/P+L7mTGeMsPcuJw49wguy8v7svcfPNK7y1+b9X9ABttttttttttttvnAGOd/sj4P8mKnyWZcJw2jnx98wunR/vGC5y2222W2Xw+dbbbbbbbXw5sYXc8dwekxyT0m+ZtJkZXu0Mf/APP8RgwhJx4rGwWeF7WMieWdtfDbbbbbbYYYbfwwuuoIzYXuzU4TLmOb+f3gLVt1hGLBy3fUPaVD/qzmvFmHIf8AE/hjJOYfi48ZHvJHovQMllt+79XkV832RBAvgj8Tw7wsBpx+9ux0yvRx95/P2tOZopM3Q/n95THDG3O/D9ety3OO3ef5LO66WMJz9e/1sAOAx8aOJD3Pwnvjwkxrd2vACAsQEWQRFn4BrFsHHr5/eajgPMAxuSFdIMMZP0uYav0/m/vbck/tBNV4/wATgifzqB/4fX95gTv/AJ/3dg6ebLJJLLJ8Mstrd9QPzAwMEFllkFllllllt81kWf0lt+7gwN/nzY8iAB/W1cDP3/6tHs/T/wBS9Ot7+P8AUruz0xo9XBIueR78jEskkkmZbpyzqxgQxBECJkqwJHqA1PA/ERMYmob4Hts3xD7Vs38jGMYxjBYLrE9BLBXQRCENRhsOnGZzxgsEFkkxJXLy9Fts78hCYsQbD3zB7ECMduUHSHn+1L9MD2z6Jh+04QuoHq29eGn02XuT1MPMfBIcCV7XUkEEFkR+CBiSPWT8G/XJ9cyzshvRIerLLJPUiD2PGyyzM5ISQmNPECAiIbYYYbbbfG22/hnhl7vrgPVi2bO3MjOzstzalzc+I4UERDDGwMRbbbC/EDEwgP6J0CRlWvHFgTkiT+QyAgLi22xtW4oItttttt/DLLLJI4WWSE+EkLFixY8c2bMGz4iMnFxaWn4ceOLT8NttkFp7tAt/Er4lfEr4lfEuOf8Aa/jv+p/m/wCp/m/6v47/AKj/AIf9SRz+P+IH/tECAkE9Q3qPij4oEH8iAxCPUdb4Dc2Th3Px8DxkT4T8E/DPwz8M/BfDvg3wJ+C3OrC8w+EfBfAvhR8MfBA+I36ikF8xOn4HgQtlwWzmVe7Fg2eOZ25mMWLzJWKb8xy4khZVfK28d/4tmpHyX332X2QG0LFu9RtjmT8oDwoawuvVxHPPqC23xvOSm5bLLKSPACRKfBw+BEWtrfqgLui/RK7Ikj7IL7tJxw2dZOuIHbZv48mymrlw60g1yGV+vgXHg8BZPAQhBtt/DVtqFG+5XrtCct3zY9urd4g/Am8R5+rMwjlkHCLdYGSfCRJIMH4JAMGDA8mWWWWWXw3QOIDgSq/VuuS28W7bb4XM5K9wE6dyRzs6Mq3Jb1F9RxxhMILR4G+BiE2222A9t6EuI7krGWOngg65mhy2xY8Ntttjgyg+I2bc+Sh7wdBF1JCCzAPjZ2R2GR+6QP8AYgHZHgGXLYPS2Z748Q/m5LfdpnMAiNDwEPwGFob8SBZVYWo7Y+cgO4+51L+YJE5/P/dxNLmRgU6O93FzzPjIT1CeOW4KCHGQYQZdyRFwTz1BO7Gy1/T/ALkr+1g48nfgnMIa2u4ETSH0tmMLkSWNvonyX6r+0nFQnPM/zNXvyFOpR1sCzmws+I954tuDlbsWgLcMsXuRBXLE+31adeo7MeO0R1c6aTTr7/1Cc9W2LzYnAS+EII44vtYQbDWBmQb1HGZsEA0I+lz4HhNljmXZ8Wg4lcxbnKcWpcsuR+YD3Y3nonirdmW82x4OrkCw1xOLAyzT1Ac5tJByR24dyOyDO50cRp5hh4w9wDqy4xh5n4SvCAHHdku+7AMtJUc8SGAPlHps6t74jCwx0eB58dPAAeGYmlxM1O+IZz9WASA93FyT4GIS4QMxsXdoLPmDWxD6IDpBW5WzbFurruZju3yf4IMgdbA4juO/HSD3NxyL5Mgf3IO7AnJycy8D/WTjDW0buftDCOHmNUgTdkqgJs8zpYFqdYrAcsOnebklxuXLi54kHKCGLJOGcEWcWPf7SbRsIOoz0xMnvx0v1lOH/uUGajAwfA+ZjtaXDiR6/f8A9y53sxrZkUxYQKYK9dwHdo3+/wC/8bLnMbuoZ7hE/wBrs7YnDPM2Z23PF4FxC/S7CwhBhBMiOeEJYHEBxOTEE6ucthuQvk/U2CYxlY6JHa6hAOAkbuc26D/NsFz67th0fJ8wOz7nOjiMIPctxbLb3C5lLRs/DeqYfcPcyM9NzDOOEowJ3dlfMk8MfBAPYx2ZBt3pufm1uHjeMjEe2RJc9n9LTjqJ7C6Obpdd2SNH7kPDYOEgjXM5ZG7ko+Kzsg5F065thnUON217WGFuICMzrmAdEr0R8V9p24W+9sThhUlFoawhyTwgergEgA48PzPwBGw/a0ZRKzUhnmYef0k0Y74UIDlFlpBlzh6JAqeG0cPF7Z/zYeYe7u3bJysA59+EI6Ifi9xkB2wB1fVYdsk6nUESSw2xnnPBiA8OPu4LSZLLFO02Ti4JdwTiyyce7EDjA3mHH3OPUHOZB7sZZ3ZiALawJ1c2B2ZCO7PUFl7QMtwuVhc2T7sbU4tS6W6ZO4guPdhuwDpAdEPQthyQ7DpYXBe7YyS8WNjDfVyhsFxuTfBnjQg4YUB5ZT1JTqB1ankvW/4sPdhOL0DBnKw7K+oR4fM5nFwdIDm1DjmH3bzpLF+bTb4F7nmTObvlkHHvwO9dzieYWt7kzB5uXJdoteXi0d2hzJ8MI8T7Lgl6LSEyYD3anBD2h8NtkhDLc4To5s1z1ZxDzdvBZUOsh4s2RFLRbOCw4JVCWi5+o10uS2JTMnUkZ/P8yDkY1kOdtsNyzLl4Drlk2zzPJchaYvScjD6twycO7lJA7YwSmQJ1ZvNrYXbmwXoE8zJfTaGUdY6yeHnqCayeGw3SPU8uEIe/B5jvwl9SNmWeHJDxD7bVvu3bktbE4fBq5LeLZ6gbLqGdEj7nhhGHG7iTkEsyOZBnhek7gwyeMTzcnJh1/SHW4vpB8ybMSYDGXJ1c+y34PGlxKSLHzds2TeG1dMd3AiHPU45Qpyn97HlGHcjygOzg5e78TmDu4ztodQi59y0zLz6jQDuMFpYtEveQklnLm4WLYbmyW3bnYzXmwcFqC87ueRjmy0X4tyKwMyyTLCjLqEaO5LYb36l4ZPDi6fJNmTMnthGsKdeCyyzxvgu+CSfE5Ooe8kB4jdwdgCMvQFpT8nFwZg7LOS5N8QdyfvHs9QTpaOjuTDwdXVrsccg3mTeIOYNHq1wn7wPA48bLtsS8EbJ9zyctuO5S085xZ8hLnuz5QuVv+TwD3E1AeEOF9SyCzZ4YdyW5w3bY06z2QYQbOnIuoHpnGEPk+NC22Djvwr6nPcZQPRAHYeog+2YWoWx2hTmTusPbYGbI4SHEeB1vd05jmy93gc82ZfJabxYzWEYbD1A27cWPtjviXXIAZJ8eMZ1Mw4y+HBzCRnlrH1ep1EPu4krWw0bOf1lcY3N2T7g6W3E5TPDeLAR2WfMu2cRmSIRPDz1ZZnhYDeZywttfUoZE6t5IKdzy33Dnni7cIwt+IbA5ZCCbtpdI47GvfVnAvcFS/WOrrm11PLxHxLLVjYWNtzqxvNhmwEljLhd2IweWRvdgyCcwA24ObT6Q2nmBOYMucPciJHDYPVucRPGdvAv/xAAtEAEAAgICAgIBAwQDAQEBAQABABEhMUFRYXEQgZEgobEwwdHhQPDxUHBggP/aAAgBAQABPxD/AP3RX/4uf/W4/wDgH/8AC1/ya+a+K/49f0qlfqr/APzHUqVKlfFSpUr4r9VSpUqVK/RUr+lUqV8VKlf0alfNfNf/AJ3X9Wv01+qv+fX9I/VUqVK+a/8AyOpUqV+mv11K+a+KlfNSpX/57XxXxUr4r4r5qV+iv6VSvg+alfNSpX66/XX6KlSv01+ipUqVK+KlfFf/ADK/+tX6a/41fNfNf06/+XUr/j1K+Klf/HP+FUr5r4qV/QP+JUr5r4qV81/yK+a/XX6alSv61SpX/MqV/wAevmv/AJnP9Cvmv/g1/wAKv+dUr5r+hWZXxUqV+iv/AJ1fqr+pXzX/ACalfNSpX6q/VXxUqVKlSpX6qlfor4r9NSpSf/yCjEz/APBr4r+nUf0V/wAapX6q+Klfpr/+Sr4r5r+lUr9Ff8A/+DUr9Ff0Klf/AAalfFf8av01+mpX6alfpr4qV/UqVK/RX66/p18V8VK+K+alfFf1qiSvivivivmv+DX/ANZ/4Nf8Cv8A4dSv6Ffrr9VSv6FSv6FSpUr9NSpUqVK+KlSv6x+qvmvmpUr9FSpUr+hX/Dr9dSv1VK+Klf0qlSpXzX66lfoqVK+b3KEpzUq8BKrZK+Kev0V8VKlSpUqVK+alSpUqVK/TUr9VSpUqVKlSpUr9NfoqVKlSpUr5r4qVKlSvmpUr4lWiVvUNlQ+oA+Ik5mviv1VK/TXxX9CpUqV+mpUqVK/oVKlSpUqVK/VX6alfor4r9CzylbTj4Mwtz8BrUwlLKhbiI4xKlSpX6a+a/RUr4qVKlSv0V8VKlSpUqVK+KlSpX6q/oVKlSpUqVKlSv04SqZMxJWsp8TBppBSonSLGuoliWyFeKhRf6VSpUr5r5r4qVKlSpUqV+mpUqVK+KlSpUqVKlSpUqVKlSpUqV8VKlfqqVKhLkiOyUzZFWX8ShZMR5gEWOWpi0agjJCTEdtOI9UZerlMqV+iviviv1VK+alSviv1V/VqV8VKlSpUqV8VK/TXxUqV8Jsgtn4l5TELUF4YFzFvgifBOQXDNZ+Le/wBFfor4qVKlfqqV81KlSpUqVKlSpUqVKlSpUqVK+KlfFfNSpUr9FSvmvipUr5r4ZXzUqVKlSpUqVKlSv11/QqVKlSpUqVKlSpUqVKlfFSpUqVKlSpXxUr+lUqVKlSpUqV+ivmpXzUqV+iv11Klf06lSpUqVK+KlfFSpUr4qVKlSpX66lfNSpUqVKlSpT8X+ipUqVElSpXxUqV8KlRPgxT+qpUqVKlSv01K+alSpUqVKlSpUqVK/oVKlSpUYqVM/oEyhxcR6l5WXmlvxUqVKlSokqVKiV8kKlD8KqVNMS9fCpUqVKlSpUqVKlSpUqV8VK+alSpUqVKlfFSvipXwqUSiV8VKr4qVK+KgTBAc4iUqiB6mkbi1oi25+KlfFSpUqGXol2jMsGK8xNi4lmyjuI0h8kTL26iEJfwkSa/RUqVKlSpXxUCVKlSpUqVKlSpX62HxUqV8VAlEqUSj4VKlSvh4pcYx0RuU6KS9q8RDm5Z4+KlSvgDmAyrqJ0BmCxHuVo4ItFQAwEo1VHG1ls4lSvjMMypXwtLEqVKlSpUqVKlSpXxUqVKlSviv15fCvjSU6v40SpUD4VElSpXwKbWLXc2HLLcEX0xFbWNiUQgL+ipUqVKhGVkCxLf8AtGu2V8VKlSoJ4jdhlpeEOb+QuNJUqVKlSpUqVKlfFSpUr4q5UqVKlQGW+AplW4gOZQaiMSVKlErr4MfipTDtAJVwipVRyihDuwDT8EGVKJUr4EUgU8wDMPNFwGptRi7APEssZ+YsckrxKepUxIIsGZVMyyJ4lSitzHzXxUqVKlSpUqVKlfCpXxULytQazT4klIEolEaGfg185lSraCUFuJb4Wq5VolHaDhcWwaNS0Wy/EqVKhKo+KlfBBRmKWuJyVQcETITDqUrgQZZaYCsS8RTL1XUG4FPUBsSVCVElQXAvxUqVKlSpUqVKlSpUqVKlSoMtntMuYLiAu2C7irEcIIirv5r4Wh5vuIcVcvZHpiNAipeZ7I54lSpUqVKiQIXNTeUHxUqVKg3qX9w6olzCUINy4BMxCTUR7UEsjLkDwi2wzALQlSj7SUxB7jRxKAoeZ3wA4Uw8ETKsdkHpSoJwFzFekac/AvzUD38KlfFSpUqV85lfFiWiq3BEVdvxUCA5jV4PgRgTxkWQTDGjDAOYo7lSpUqVKlSpUsL2w3RTFOKsE6J6MB2S0Lc4smIOmBZwTTIYLUtwfmCS4Y3K9loEtgIGFtKEGxPEqAeoKcN/CFdXKlnKeaTmsnmuM4kWiEFKyGIWGwJ5gxoyviv0XLl/qqVKlSpUqV8X+i/iXfUqVK+KlSpUqVKlRKUqpiAicz1lHFSziVS6R9QTQiWyo/uLdUl8pbaZSwksM3ApXuTFt31LlNvMB1Q4SKfN0x1yPDGCmfcYc98XMkswQE2rr1U1qDuLKwlys/MyDOfTXiAK/tGo/hEMVX1AnKy/OY+8HRUFsiCeSKGphuAcyvMqVKlSpUqVK+K+KlSvipUqVKlSpUqVKlfFSpUqVKlRzLmI8S7ASwTApLj6KJpIiiwqNQl93GyhAtlvqLgQ9Swu1e4DgcVW1zLrX5MsLPUOQETxiZ2uziWXOZhBqHCPuDFDFtELAbI+CJfSJ2omYVxLGBA4QOItwEQUxBW45zKgVEgppjbv4r5qVK+K+ElSpUqVKlSpUr9VSpUqV8V8V81KiCLLlMpUWbixF1iN4tFioZXFQDJUP2HqVs0jWEXubRpKxKgJQgiVijZPzUqVEgYgSsyrlSpUqVKlSvhJUqVKlSpXxUr4qVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKgSpoT6hJmGZ1sfMyUgeps2iWuK7RcoMX2zNtVf1B31AVbFuFnV3mHWlWcIPqDS7D2xBnUqV8VKlSpUqVKlSpUqVAlSvipUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpacsOwn3LMFJRLA3G3awWCuwyrgeTLWT9xcZmHXtG5SnTBYqpi2xB79xVb+L8SpUqVK+KlSpXxUqVKlSpUqVKlSpXxXzUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKgVWOptB9EUpI0wKlVA34mGax8Et7mzCLbb9y82FMFoD5qVKlSpUqVKgSpX6qlSpXxUqBKlSpUqVK+KlSpUqVKlSpUqVKlSpUqVKlSpUCVKlSpUqVKlSpUqVH0JV09RuDZPNCzArpjluvipUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKgSpUqVKlSpUqVKlSpUqVKlSpUqVKlfFRAtlOos4wSh1K+alSpUqVKlSpUr4qVKlSpUqJKlSpUCVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSv0CpUqVKlSpXxRBS1lurrzFuZqWnMqV8V8VK+FSpXwqVKlSpUqVKlSpUqVKlSpUqVKlSpUr4qVKlSpUqVKlSpUqVKlSpXxUr4EVK/QVzUa9NwF5wj5oJY2QRgLHtT4lrJqWNX9zYMb7gxoREqVKlSpUJZWpjqUjqAvcqyWNS+paKlSvhUqVKlSpXwqVKlSpUqVKlSpUqVKlSpUqVKlSpUqV8VMSvjErNPzB2gRPhAOn43ss5uGAGDURFnOYMKGiFG4jFly5cuX8VKlSpUr4V8LQkA7iuIt7+CwjUZUqBKlSpUqV8KlSpUqVKlSpUqVKlSpUqNdEsdNzHMSNl+5Vgt6jwrOA3Gi2AZag7QvwAuIukIpltwDtm2bfE6kzLj6uLNy5fw/F/0lSvir+I5f4UlESMW/oIKlSpUqVKlSoEqVKlSpXy/FniVmYhVCsC3tjmGKZblDiDI39wXLfHIBFGfoIkXZfLKGGI1j1OCELW/wBF/BblfpqVKiSpUqVK+T6mJiV8X8FlSmZlLxLfGgiEqVKlSpX6BXyVKh+gLS3wqmDMRKHFy1UYlXlmTLPmYwNRPDXuIbQxeAJMQlBHPUGuoZrVzP3BcSWl5hKlSpUqV+iv1VKi6ETaV4lMr4r5AqV4lSpXwTHykz/WxUqVKlSpX9AF+FSorhMarogMWuctfqHoa7huKimI63v3MytLbuGBEqWFTZn0RaE6KigYjDhLjCIysR+KlSpUqVKlQGBW48GPUUKWCHEW7+VSpXxmXL+AJRMS/EuXLZmNzMz+ioESVKlfJUqaalqivuJg1NSsSzxB8E4qolBVwuzcW3UUuZc68wVhj4gmwxF4hdibDfUsQtEWLgKpjfxUvzA+ADkSXAu8saFDcXwSr4lSpUr4XjBFVKj+kF/FfFSvhUqVKlSpUqV+m3UqUz2CK2SeT+Jg2uJcmVXeJS0sp1i1xSUNxoocRaxZxBR2kswJ4IdMW4lo1iVyShVB8FxkuLL0hSXqbkUxVHWMniIWJCGyJKqZZb4IwTxLrqUFpMJZ4m0GHKJEjcoallwTxS0HLJQtZ/aUuoOUBkfxKBpiec9J/wBLKNYYV9GAUHC8fFSokqVKlSpUDsn/AEuFGz8ot1PUCxSDMySfiFGmPFcq5+ApwlZdIcIIHqp0D8S5pBEOn6lrdICuASDnEp5nUx4QbyiauOWMwGziXMHuogYRYUqaMfHZ6XGRCdRuDRL9kb+CoF5IXwYQ1gZypcKKoHiE1t3DchG4EQIcVSKimCXUpc3G0z6olm1DQMouB+JpahjTliXcMyp0ZRf7iMcQa+ZXkD4JRd1mB+qoSvglZ+AJQyvEoSlBNso6h87g3EGcmJOmUOIARW3wgbylgwD1Hgx9zPamLm0t7Y27ZXwDxNhT1EBmTG1v3CAKiPgUirKgKhUqVlAq1qKeSYYqbSXdotvGdM0EZMJBBlAeo1ojSJOCfSZOZxEzhbxK0KYQ7qYBkmRGuYLxlCWR10jt7idKWMjOEoZseIppW95iJYFN3w6lnIu+pYoV9y4aTon9z1mYI+7cDBS+U1K+/JKlRmCQJxAKCTX7TJrDkGzuVCAHMHgMx0S5xFMPGI5l+Ua8yvipXxUqVKgHYTsF7iTIxbsJAdUxfmPbaZeaRAVBus1EKUL3C21xEaRDzziAIsZJp4cNEW2JRoJ5wDcaaJdaistgLChuW4EcQswzmibC2AagDQhSBsQ6p4YoQ0iDI80X4FqXAK0al38EIi9SkH5lQVgRTzLdQ7SuI7YhiSinjMu2MJVr90Dk5mDmXBm4JUMR+aiSpUqVKlSpUr9Nfpr5qVKlfK0zKuXeJaswBzmByqeMvLxcZqEpLr5aRi5f6D4qVCCHENEX4JULH0wSdzFqFhaMFpDXMRFtgxzHEIhQchuEuftKYsUumImxmuvaO1a9xyEw8xzFHEt1EYKH3KOTMz181KlfNSpUqVKiSpUqVKlSpXwCVKlpaDYeUR3OiplmyPdlDVMuS3Uz2zHXwVFfh+GBU5lfNfB8ErEplQaillyVMVXPzUD4CpbAMaJfaKlqvuXAhdS0op1EP4CBtjTyytTbzcedTKAPEoUAeYC2eLjXih1cDg9QKZBHyGVKlEolE8kqKOpTqUfFSkpKlSpUr9OZaS2WzMz/AEH45j8aIWwtPfUBo5dAHGDuOUAWwYH3FVmmm43VZ/NxRxKlQJVMMJGFpj4TMrEr4VKgQbDql71CwVXqACuIpywK8fcWsLGLSx1NGLK7p9xFsXAch7iLKn/uRQysCpUq/hUolEolJRKJgmJcU6lJZ1Lly/61xZfzXxVxdnU5IurdB5gSrcAjbeMxizwcv8XC7m5jus0XmBvGys9jeCs2IJwJQPPb5eYLITaudqC3+Yczh+9Om/UbcPgF8RpAgQRC5kb8Ru/3lodUXAIgdjFcMdxu6+AOn3OGr3EJsfMKroTLlL5iCifURu5DHK+ouCvJHLAyvhX6zKlSpUxMS5cV+KlfFSpUqVK/q18JA+XBCOZ4IqdeJj0hg6CUZjYrpGoDAW6+2Ias2A0nOOM7m5kCr8Sldy7o/wAxXim27gVaW9RN01buCaARbwHuW7fiMrb4lOGpfdYhiyKIzbCzbUIC6IDyPmZLg+EcsFg3ENRRDiCQpgKuD0ziHq5VzyVBqyWpY9QAsz3caILeiNz+5L8b7JhFD2YgziqNyI94iN1Z+YtSyUSpUolH9ABUr9NfoqVKlfNSpXw4nECJR3LiuH8xXEBuWPJhvviHTTJodiZxjHmUAWg0SaaK31FgUKifbrj8RczsMyyXxjkmZyDhcCysRKMzC3l6IAwCGMairgDW41CuIlLtzHUeSW5n3Kplcbuy+/iKFSzITDW4riKFLRNVQCoF9yqZoeYZjRLlDf1AOi/qf5XFsNJctBmhxFoRPqISFe8zLvF238k11/eYllngxLykPsivMs7ZcxLJZLOvhaXLly/i/wBVSpX6a/RUqVKlSoBMxxIHaHESxqFwkzpXjDLhKYLmBqq8RUMHCJA4K19y/C405iKKpBGWYstGLrQVxC9L4jrrChHLhepaFFG14jKxyUqCtuy8xaQcMVIOkYEaFvmxKrqIQgSiwnNvEPAbilIrvuUwRWSEAVOxmyfsmmL4iOwdhiBs/cS3j8Oot0+4tRGY8GHyY4ggrH4gh0P1Nr/YgRQD0bliq/BHAqPYzO635iu7/FmHhJUqVKlSpUr4r5r9FSv0VKlf0alSpUqVH4BGQvlja7YkN9wYc8WdTNYo3gwtP9wpyYI7hH8E27IA5NU0e4g23kd/cWspBvIafqXa55jtZlNZ/eGJEG4UqqRwHmO2OqRo1RV1jPcIrRA0PafvcH5hf7QDi4XcAhd8rbho+IiXNKofBLtV9MTwte5Z0iZK+duZkq0T5CcupopfhjiMLqx7uORh9MG6Fl+mBKlfCpUqVKlSpUqVKlSpXxUrEP8AjCY8uT26PuMOBsaIVi+4zB9DhZp8eYN2AUaRLWqtjRXZXwW8BVZl6PQC1WjXMHHELtWfB65mDqBwL/24BVkFB4Oo8lRK8EdheZqggcsveYERqlora7+pVCFuBBoDOfMDTkFspeK6ROn8VDh4Upz1L/fBvRQ2bxDFVAmGn7g/MzkM9umeMYqZ7z9Qe9fUvs/iW3tiR7z3i0rULgNLGrKqD4/fDR/KLcH7h4vzLEtLfJSUlJSUlO5TuURCVKlSpUr4qVKlfNSpX9dm4C1dBNTAtFV485iwzzVfCmnMMoN2KzeH3Uy7LXuBEAq/BykTJgKRf2Ey0Yt6PcW67b13Cxp7DUo0uzhltswDNGUKGwITF5JnSvLEK8UqpqV1WZj8mty8x2VtXL+8dlQBpp97jjbVSt297J4ipjZQHxUqV8n6MypUD9B8VLfC/wA1JSUTH6KlRJTLtJ+oIXHjiwwmeJn1RPcrtMdss/U/GuCCa/NBHSPxtaepcyQlKf41lyeqiU4MNWaJe4BbV2NRkbFBYrjBb5izBDFs5ab+xEBcxw1xfb5mMOl0Oo1aUvPuLMU43cyq1+Y5u3MX5I5qicx2CNCAgag4hqjKs84m3UQRLRzcqvDHcri+3FQCrH50zJcVcqVKlSpUqVKlSpUqHyfGYLLZbLZbLfmvnEx83FXbLe2WnLFuU8yW7ZuKVdkQ4Tdt+p2RBGi/xBi6r3ArVsMwPuO0U5AMsxf6l3FfbC6D3KWRFsMe2MW4mW4A6hcXVOMS7dFcV2nnRKRNcChjRjiIJsxQqbo/xuZ7ERYtzm/E0DS6AijPPgB9RCbAmFFpV9QRFACWGFlJhFDW/aEuLwB5b5mkFaGfYZXrsCq1a42XzK7OWLheJ3TiGgX6jkX3MlFqu4KUrL9v0VK+A+KlSp7SnZPeXPPqCq6lVKlfFSpUqVKlSpXxX6kj8fUDY/eAFVfuUNGUt5JnsyhoyxxnpFRkS3ZgpVMyl0lcGU8gErG5XqWuYqmayEKPuDiKYtW2sUem2FMDyyc8Oev7TEIWQN8KynmA4C0tv1byeBCdfkhZ64lSR5r/ACl9Qt53LLXjqV8he9wUb6jlq2UBRTx1M2F/iHhVXzHUNuwiVxn6wwcWR0D6jorGoghTnDr3EARgbz05mKO2xvIrVMAU5P3g9+JxmV4x8OsSgfiQWi25Q2I4X9BmSsnmCaR+4fFy5cuDBg9IPT5VKgSpUqVKlRJUqVKlRP0V81KiSpVSvjn4A7jXcx8VLnJluwLQh745h3pBlMc1z+00ougVNqcxZMtDDzZ5/FxT47BiXDMDzVJ9o7VVL1qArAvj/cx4W+CqiIqu4JyaNb0P8xIq1GAvNviWQLg8BKEe9wjTyBZxV7qWcYzQXCOoLIRzXk6isdXbOfn1xGJycwGq5xze5cQaywrX2ffmIVn0LQWXlvGI2GtXtK21uvMDyqKgG6bYSsMGiBLCMEHFceIvbVUFjXPJCFAvBBtk4T8TGtY8QTdIwAtw7qDs29stetdRfingITD28ZmkHhipQXzUFlVeGBWqT3B3WPzBdj7i+S9ME0r7m9KfmNOSVKgmZIAPLB7Xepn4qJbfwRJyZg7v3LnCPuD0pVFc0mwwugvWZWbZTR8M8D+ZQS+wZhoolnTHPcr3KOmV0iD2T2Q8mVKlQVDrZ2BV/fXEfUlQ3a66Jl2obSlW+Y2V4iEc1C6IYvGbYyLAtBQHazFmaAyxzUDRgwHXwMThbCFgs0PIvUxiBf2Xp5E1DBjlWFZ4XmGz6xFYS5niAFF2pm1UX3Aesv50abKN45ll2CCzaz9yDMWM2XNeqlpBtBRJSBx0MY5u9MBQOHJZ3CNtMiXm64teM4xFCbEaw8OOYcU4QkWcvV7mDu6FCY+/uBvJhG3zRWf3lXEfb+GI2Epar6jTDK9RBKTEdgYFwPqANACX4xLXl/QtL9QcEz7oQeVPKnmSvlAOyCln5JVnL2TuT6ncI9IiOWKuWPa5nqZOIwbdypXw/Nst7/RX6Ao2jBe0L4jgp5Gjzac7rURp0LXC8eB+8oFFWtI0sO02oM55ruvPmM7TI3uVgrvVzLFABtnLZvqWdQa3t5iz0DhbhU1hSwKM7Y+35u2dPGnXcpcDlAWzkeOnmIZLLqHCmr7isfHVI9ta7Iq0gFhdN1rfWIhDRVJ/RoTGCx5z9N+mPwmplh58eYhOLzBGQvNlS0n+kHfZebZWCLTsT76cemUviQCx6UxnkllBoDH9y3xHkStlPGOCZzkYpj+HGY+lQQChTerZYSwWFLVyeZUT1Hd2J7ZwFL+XqCuRIJyQZcJiFQCFQO0PKD5/iD0fxDqYcJA/+Z/0qNeUQQiHoRbxFIv4F9fBcVLly5cuXL/p3BfGYR/hJZnPlMYrcYXCjVS8g4aXUArwXqpjuNRRFaKEXYz5x5ldtLRwNb3+8cCgeNvm+Iu10X1Fco0W1+0LrPUKHOLarzc0m6Ooo3oPMpCVAFU0pv1qPr8H13dalK+suWHV4jaaGsHlRx+JRSCsr09PiNii6Y5C4o9REbodNAq3rhlFFHENLhiJw1h80xNHMcTSrXzH7ACyseAO24CHfIELmlmRr+YbdEDRDReQ2a3jMxZPMgC3bnKOuIJEC6WNGr4lYQV9MvzPufcryTQrnjhZcZJ2K+GKPJ6ivZ6JTjP1LS3uW7lvctgGlgWlDsYazMcbge0s0fUU0z7iOR9Rwx+yNn/CU4YxjLlkuESkp8Liy/i5cuXL/TccJq8v0lLfIVt/8goFgrm3bcqypV2I3cNGLNremECKmdZYgLYgo15xDcs09FVI7bbIJLWAAwxQDb6oijXIKAeNtR6kYqKnGS1FpQoS3oOXol+drDQ7TiCRWWuR/EWXgtqxOG3DmMo/YuY7oX94EK6N1D25dRwtATMRKdje1indRYJuNw+kgKpMpUPmMuKboTRVoBxTI44JlpVkB0o8+YuwjKBGsmQXqXeb6h2eD+8sDIlMExZu5cuXPpPQl+oPgj4EF0T0J9Jbct7+D4CBAgmD6ngmkD8kS3ByM3WpbafUctRAqrPbHDLT6iGLH7gltfmWrj8xPJErqJGu5R3/AEb+Lly5cuXL+LjDcxEPB3fcRR8zgONZCFQtsmgQot1EpMiutm1gcO6iATFABXC3w8ygFxA2eCXSjXSuy7wD4jFdhYs4bXB5SLHK2bPoavzDVSyIzRtfiw2NwLqWt5K3XI45hIukQCDlO2pQBpuqivn6Nf2hYifsA519QO6Y2BzZm5WcqeUfNc/iNvJQYcJpOTpnck7K8Bj6jV0UfR5dTFuGkS74sp+P5hQUABQdTefhLWf7dMuX8Lgy/wBA/BCH1Bg/AYLBe4XAlQE01H/bSv8AzTkr8xo2/MVdrG+5b2xXtjH9P1F8Etlv67+LlsuXLlxMc7LNDmMp1IZdLqBtyAi9D1CQUKjoLeK3enqGq4gqkPccMtXGMeV59EyQDa58qweZYMYgBV3R/wBxEqTILbRw0WZiDUsuvTAZbht3ywks3fHOa3KbK7/uJjfAAT8EoWBtI+7l3kLz/sl65PY/OmMTei+8/wAkXytmydkJukvnofXcRpNYlp/k/AXy0mmXLly5cuXLly4MuXBhUKhUKhUAgIDuU7lRIkSVEiRj84iy4suX+m5cuXLly5cuLLly5cPCAlE5MkuXCKlvupYxE0Z1RNK8vxxjCr8QzINKt4lF6Ity8TccEUoD6blDpVen5nSjRf8A5LY1OW5Pbn1LuA2McgCXQ0kWofQap4JcuXLly5cuXLgwZcIQYQIGdCI4hIaLvqD2fgj1JeyAh64LiJEjFixYsWXL+Lly/i4UvAbYHI+VUf8AasP7ahELt71+YIWBPDLly5cuX+gXcuXLly/0C5hCkCbEWeIGIIllOyE1wOMQxWQLNTmtY+klGajkAodLw+EliglCLLF409kxVGHg/k7jIzvYJViE0OPI8+IyVIr0Z/xLly5cuXLly5cuXLhBAwg+AnbO0lsIfRKHk7ZWe0QKcnTLExMtt+onlEvbEjDDCxYsuXLly5coROjlmGK9txgiry/D82mlmzq6ckx55NkC0B2MuXLly5fmXFJf6CyOMhy0anTA1SKKFbCh+V3LKxMISeyLBSEcP+8WQ2oMw4sguS24vSVkYKYfCfTqFswB9JFOqrIcbICZ5Rk9p45+49qNzOvG/wBQLly5cuXLlwYMuDBi+BQg1g+z9JGYVhRfAsYWLLlwmwHmPY+gi1L7D4q+I8MpjQD8sdKTyxfm/liy5eGeGYsj8MwKPeyYhzq5cuXLly5cuXLgxZcsmGmWB2rP4QAi4QAXcuLBoxj1BAGrC6mF2n/rK1FuI+K/pxAqJKyy/wAykJxtCOPs/iIgMGch19S5cubE/WYp2nsmC8XuI9/RNVR8yx5juA9sHzfqconuDZhgy5cIMUUwTEwEVbH6P4u4acnpuDfWXmYsIBsyijGMfiyEEwV9zEbReYsuLGFiy/1LH9W5q6ckIUHkNRere+oDwejLjTxAOosuXLly5cuXL/QxhgGAfxMFybsekiqUewcOgwDS/MB1+aO4Pt+BhB+AvbLzBgzeKgNgwHaC817ifN+p4/lLNUQo2H1LGX+Zd2r7YMubXqNWl7ilhO7IWc09M4Asu3ZLOE5G3RMRQeNxlaV8xRY/DEiSpXxXxUY/oqV+m0bVPiFVfvx2E+2CmlJrWnnM/wAmM6T7Jog+macIj29EH5T6gmjBvTfqXH5YobYF3fqGmn48Z/UE/Cn8fpIEPkhCDBlwg8IVCEGDB+RYsQbYB5i8FRW2LFGMSJKlSo/oCpUqJElSpUqVKlf0a+M9y0GcT1mOlIc7+ZXzfqAdPsjygPEX5/mLdznBI6Lt7lC06+SvgQfAHwr4EEBKgQIECBAmYS4wyp5ixYsYxIkSJGH9IGGE+FSokqVKlSpUqVKlSvhUaNy+x8oSvTF8EeyNvMqVK/RUymi7S8wWCKB3KhB8gIEqBCCAgQJUqBAlhtlHNzxJd+RYsuLGMYkqV+gPwPyGjbKlR+E/ogDRtCAaLl+iD5CU4yiOa9R+LeFgu5cv4qVKlSpUqV805Q+wQPKh0s8/7SnAzxg7kO5DzQ80Egncs7JYckR5nQMv0RTmW7YMGDLmHMqR8ZfqespLuSJcynZGpcqVEiRPYj5/xHrF4q8/JYlPcpmep9T6mOpTup5YHSYjVEX5fCSvmpUr9IVKlSpUqVKlSpUMJ8T4CD5CjaSrmNNEU01LG1L7gMikB5v3F5EE2JPPBuSCdwivcScxv89+5cWXEdxBE9xHTLmsS/nFW1ZllfFMqUwUpqW+CmyEQ7fRH/Yi/R9RVtWVGVK/qAAr5KlSpUqpiIbSeWPnieFL9AdrPae88x8Hkl7dvzLXb81AlQJUICBMfoN5eXl5aKlpbG4kqV8lSmW9S/Ex4iTib4h6EVxg+A7jctjcL+KlSoEo7lEol/Is3xU+Id5uOai+pa8BKuEzrj1PMfiL7i3amKrV7iruDLlsuWZcPI/6n8wGP9xPcrKx8GesPCX6g+pfqW6gupfqA8wHfzbwDPAyvaU6hlqUgMV6lepStSsS2kQ2JRxjTf4VEjl6Jgv8KiDl/ERWLRayX4jfhjzGY+yKFWH1ASsvZG/ecol3L4nnnn/b5i3ULIKKlu5buW7ntHymPEp1L9S/UtLOY27lfFvxVypUCVK+CQl0KgitRC0upSKBkMrAQVobXY84gyTmAoPUx3K8wp51PaV5n3C+5nuF18XiEXcplF1EreJ9DviWWkSk1l5z+IHsxdYoy3ogHD8Rg8jLe4kx8txGAzb43g/02PqWrUt1Ly3ia3co7j4mYiymClqzBS0v1DxluIt1LHEr7iLB/p5k/R5F6oewcHtiOgPRqHuRqXR4O5Wij0Zo1mYqQGy8R1xP+jYC2fnQN/yMzls8WiycUBNxFo5u3AuPqVQfDL5TkV+mVqKeUYLWy3iMeOPQOZeuz3KrWa6gup4GD6Zfpg+oOXl6gRUfkJKlMzKmZT8K6lMz4lx94lJVpQzcqVTdTHUs6jVYIW4lW1HWCJynpM9RFlbYJnd7jdcw7XK9QEOyPdPNBeYi8EUNp+YOgTHmbZL6iAO/EVr4CYRt4Gr/ALsAGviv7H+Y0WlDngjZNp45ZQmjUA01TQaJ/wBLnp+8PA/M9D8yvB+YHg/MB8QvxLeIL4gpzB8zA1cHxKXCHQni/if+VD/WQ/0kt/xS3/ZJQPyjBT+zlH+3j2fWSK/40f8AVp/5yP8Aqkf9Ej/qkf8AUkf9KR/05P8AQI/62P8AoY9X4x6/x+aJlY5L5k9/wYf9ZP8AzIp/ilHj+Io0/ET0/Eon+M2/xlv/ADLf+Zxxroh0wFuNRoBDlhNAjfiXuI7G/wATcsmulumyBpknOkRMj7Rs5eIo8nqIgCh7i3EYYujdLqHnvoDadsLLW/bojjpbrfUeJZYOYVNhdndPiLfFF/5mxzeCUtivBy/4J5Z5p5j8Q7D8TyH4nmPxPIfiHYfieU/EOt+J5z8TovxD/wAU8kJjwp1CZM7Id0HBOj6IMYR9Jzk/RORfqeWMmD8SfFHw/iJ9fiPh/Ee0/Eew/Ee4/EX5PxLHf7QXZ+Ip5PxF9n4l+z8QT/5BZbx2gvX7TJ7wWYmCbvcYAVrCJi2laKxZ6lPJ0tx4D9rC3UVqmFBSOtXBORV9xe0t3mEvYLumrilyXyxbmq+pY3uYucQYe8sTde49G4Nl404leIo1qDiZxeDB+0BZxdHcEBDgUXvqUFXTaFH0dQaycasodEVvAOK1DCBvK8/bBMstD/MRLdp+4DuU7ge/ieaeZh2MOxnsgO2eRh3MO5h3Idr4ITiMSiUBBDDDv8Uw5/ESvhPdQuIU7RhMd5YsFgjt+UT/ANI/+qPTBdC1Nl6jXp/MNLQqLgcS1b17gjdXVssii51c3FljLxHAV0EwYVSsty2jycovlX2vw8Fi73cwaiNgQVhuNkKmS4eJijeosADnmVQaUpYbkt6g7wI8dReA8ypfoalG6fVShoB1E5c+NTUgvG1iortwRLZSuFN+oZoZLWuItCw+WfB/dixJh4Af97n5GLP4P8zfNjbwf7gaC2u4gBeOWKppA7jyrfBT94dDPFPZPZPbPfCzb+Idj+JSAwEB6QFQCCACKwZweZA9kB0jHUg0CyKz+4QZ/eJfy3pjFe49hLpd/wCQq1o7YgWM7RBzIa2/iNx+sG4jW1mgWSmo32rVeuYnRb6cSvCDuDG1JZxLdy3uZUBDEb1fwtLEBmUVZbuAYRhS5aalnEVXMpSL44i0FsbNQwRHO2PReIceD0S3IXzGHL3mYNgIZXiWVrPdEGgEOyt0a+peyvZtgu1Keh7iBbiVn6IQltFyujxFVCng7dRmuNymjwdShr3/AGIaQtx48+5a3sDbz9xIJnjHPqAqsBy8P+iUrbVqVth2QQULQe2eJh2IdyYtod6HYlHlAdoGoF+UB0wPmHnhO34vBCA9ZyYoLK+Ykt/YhTX4CcQPqUdEQ6I10TBwEuGJToU6Y1U0ekV2/wBYq7gqgPtVMKA93B7fyjnB/ca8TRcY+oTX7IlgEPBHrPzK3/KB2fmF2p0LIVrDPcFWl9kFGc/cApq+5gw/cHyfmJMxtgD1O7MrNwFcobiy8L+ph2SvUwiFD74hrutn7EYZVcj+03DMtePXmFQS9rRFlHiAdH95nnQ3RxL4IbAdEqwf5QQVNMcD/vMeSK21zEBkdDXrzL+E/wC4grE/t9S4Ah0P4hFB2sS1QF4afcqMA+juB8wHbKT7QZcHxBeoLBb5gtVmBBfKwF7hTlgpuFvMLhXmHMHsfmLTY/cfYisTtE7/ALx7T8z3/eKOZ5Y9se9nli9vhl1Kez8QvtfxKO1/EOVfxMDTpi9XM/Aph7SlUROio+Kakov9oKXvpuFV/tQfH7Mw3gmHBdsdg/Eo8ZZosz9zvPxKIvtUUGmDXIwXVTJzK3qB3SvGpeHNdx7f7E0Fc9uWE7F0Abiw+NzEF/eUdSbAMp/Yid5XBzAr1X3HRAMQvWPqGCQaHjv1FoAHUAUlDlvFkOQtGBwTYJeVcCVx4f45jmrnXgQw/wDGNTxVhgX3bf2J5g8TT4YcwGB5geYYbh5sPeWcsK8sPJYSeDLkSHVFcWdQ9qHXEyqnQ+EwEMW9S3zLem4qMPVLPBF+IPo/M9T8yv8A1n/S5/0v4jogfE8f7wbUroQ6JkKIqlI90Is6nMm5gT0yxv8AKIvH5IIYbe4bTiFdjHpR2riXuQd4lHfXKAPvbAgg3AMPSWVqizef7sRBLfyy3B2L+XP8QLYPNcSzK1X2r1GqSkoLhc+5Z3enzucw07a/0habAyu/+9RwCCt1wP8AvMd1sBzr/wAilkC1dvmUqX/Qh7Yq6Jr+z9xE1TV5dS1jjHXj/couK1BAPklqxQflCJDLDvIdM8cIEKC0cq0EYDhxn/aVsOpFjnMXUwbbIPY/EHnUQgvZLJQf3iHG4irL+49L9MDRDbiPgxL4npE8RvqN9EReCJ4/aY6/aUoR2j2IjplOmb6Z6M9IeEp6mepb1L6QekzEjJJIsB8WUVqHU1pdX7BASKcOdPRo/mVW6L5+a/uyzw1jQHl4nCAlql9c/mLgBAAo/wAzK2HgT8QQs2io36e/4hbG8n+ZVkCsonjwwwgGFtuj/MaAEug/+BKK7XdPPR4IupbS66hDWxQ0/BFBU4v/AK6mqgZ0W/xK6A/ItB5/gmMywsBgZaWW7b+IwK6U5cxY1MvVFJV/ZxLwIds2ysCndnULLy/B7lkpQSxOMZq+j/MsuRwLQ+tS1AAJ/wBVOIdwWJ35Kl/NVWbahUrTeICBA6lLpMww0HvJBAzKN3F9Yi7zfMy7Yrz9YisccRixruOTc/7uJ/24j2/mN9sR7iM+o11PpmJf6b8y/JPslHcxCo1MQq5QzEretiC0BvB9nPqBDuGa9H/amAOW8Z9Hb+0VsDVhPP8AJ9SlcV2HNxauBZVy/jFPE8ef+kBqMPO0O/L4m0Cv8BUHpOB/lhKqHBaX/fojtaLdno/7v1FYWUw5K8HniWeEQozXg9wKPYffJfUHZ4qeF/2IlzHWz/pRC20X28syU0R1/qES9N/25f7EYSDFNj6lXy+APwTv6Vt5HI9y4uK+YrOHkhDxQZxL9DL9EUoKYNv+Jb8HgEuPMyKqE8tb0C8vX8RJqgUIyEpdkO8nJiE/bC/Op6MBu/21DOnBnW5pMDVp4j1XHxMW4i9gWkWdRLFoFZHERHPmNmbipfuL7YruWYv3LdxXc8hDsg3klukt0loF3LHMH3BdsfeX5lvcsuzDGV/j1MxiNLZ2zgPLmFrpDb4HXliqctBcK/kPERQBMJ/l/sRheUe9HRF1qKDnwSqWjbIF35r8XBqtvhlTFDPAyF0vL3URSNIvMWemd4a2+SNjGy5ZeX0j3Iyy12+4w2QhRX7PbG15i+SvLDYBHOri/HMK7qwTS8sJ8KNC9pjylwOXiIgwaPBAAAVu1l9bessWzIeFS4xEW127cfme038L6Iyc59j/AHmwElcxahbV1HT8xoSEDwxWuIBzCI4JfB4Pgyf4QLQdIB1cBYC1zB9oM7IUX/IiIbPzBtpjzDniI3z9EQYPaXakylIdPMsXjSz4iqI0vmtRVvFfmN8Gvcz4jdaz6i7wM35m0tykR2fAUz4xAdSsr3KdyyX6glbnQuJ6l+PhjGLCyrKMEFqGsLD1z+xBbrPL8l59Q2E0c/8A2imzAyxj/GiIZBy49BHAUuRZ9LL5YaS6A+f5li4DSWiuAIYy1Q+zo9wQgaOo9QTa9HDt8sEAq9H/AGmSNAHiAa+2DqIlRQV/F+YQK4WB1AASuysyhNPl5Yps41EEHePUsvyiDWb3BO+cun5jAlhyDcGGIEvEt9kSsWjKZPUXpKt0KjG2DESDOV8injoibKtbYXFWKTKXz59RzADQ+qTr1CZZiih49u42BWybf8EoTjPMK4rPjUD0wB2B5CBWHPqAgFaqEviFdLvkuIyv++IvheZaos+qS2aHkGK+8Xa1PSAuMXvEoBTnxqVBS0Y2dvzuNmBz5qU6IVdUzasv1Ml5ipavHqaZuUeYgbzAbqJ0Sq4iJwl+MwfBM7qZ6/aX9yGRF/iHVJVlD1jmaYXwotVDLbL45lEmdIgzLPcTsrNdy5ML2y8+IslNqbH+fHBN4BbS1a16jlEt4Kp498y4aDIF6Pbj8yrArQuabrvOIJAIDpUt/tFsNK35e43KoIC9xELfBxfc8oqiwePEbW3KxLiq25Y5b+KlSpUqLlw4vggAV2ROjlFz5E3LAJP3yepahtxKaK29rHUk4FRe+iJSbXuAaZAOnYcnqMlpqPktAHW7w5mNT0BgiUa3kf2jNP8A1/vLT7QEE0wff+IhPYAwYLPafuXL56xf2gQ05bzOk/KUAod2Nxb2FuS4lyYRaWmOwxLS7E1wl3ihXcKcqRvRRvmoNLJ51Mlidz+4ItkK1WYPIHqKcv4TstfmNrgceYFn+U+iZ6qJzEIK4gT7QHJ+Uo6ZRNP4h4P4lHhjknQtDP1Et0hQW/qJalHondcnqCgaKW6Nmb+4OpQsaK2vb1EO6gpod1LRh0hgC7Y2KQJ0NJl/EV8YA0evUW7L0Hl1MAO3dKvMs2iwADWI3nFqnUN4cqZ+54IbK5mU1jnHwj89oQCQo3LXCLTZF7EcC7eyo2svMrz2NxK8b5kRvDBzBdzDCRgZnL/uouooMB0TMEAPh3FDF+BHcv3zjZPacX3CxbpC0PWv5lMueAPogh03DkccTA9IH8XDFIhmzB2UH9mLoyjFIbkzT+GZixm0XY/2Ym82PNyhkA6Zx6nVrBBdsT/riKbNbt3+0sTIO9w1gLfeIm6a9RdYr8M7RfeYC5Rvcvbv90svfhxEUZW4arYh2oW8z0zBtG+Yz1mW1kuc6PzHshpeE8SjzLOKz7j2hxeYFuiX8S6vMYMkFBGXqHMu2hfCt3Khl+4WHZ4zxqDH9AV71KsA4An8SgpTtBrXK9xyBD5qYZUbzuW1bCw4eGK7co3mOBx7lisTIq4DmxJhVKjkaywkpzOyYOozTGdTEbFXKauCXgGU8/tPP+0cG6jpgtvmYjLEDcrhVUnUG1VBbfd2x9ttlOX/ABGRYkFtgHLLOh3LXXrEMxs8sRzWmVo6uu5j1CpZRhel1PPJy+Kf3GEBYsVutLYY0EUC2qXhg4KtvwVKmlemDjnnSP5mcj4pauNTCnNIgqGdHUJo3dioYxy85gl+WC7ZlEBdUA9SwC5Z1UVAMqFH+fmLVAtssLpgbt3IYgjkfcXYPdVASx9A/wCJlux9RbFP7SucNtCpnCJ0My4GdgSk1+yA3/oignmFAdzZJTniC2I9YPE90cj6mxy7Y2T3wy5J5X+1K6yngn54ywsz+6NtqzN4VFrER3BG+JRcRufgmBavuVTpw8TGlHNQCs1G2rzBgyRaTuMFoAOXivpuYHzocL5gOtRo/uOVzL6iV6lZlQscYrEQL1GH9hH4BYjkzDcbKD0xAK/ZlaKK/wCnfUcW7Wl3GcidWPsIeXqPOHRxEtu83FzFlNc+5i8cNDs9wtoKIthm0t4a0rY5P2g8fpcssKo6hBq9HC23XqCi/o2/LCoDdcEVUrv8y1ij7lhmzibFdaaVBft/mUqYm6tv95frx9MBrpmqmBotF/8AmUyg1i6/MRT2ktfXcLSBKZGeq3HNxsWLq6zWYEUs5x9iItlqUDXdxVC2I2JMzar5uFe2BtgG20hFLizR6YluwWQNAhUU3FsC95ePcRr2Ia/sQKu3AUfd7lTIOz/sQ6qEgAXJHagtdom3Map1rRTcrVaK1jCZYaxx3HLe0UU583LMMHb6iYFGnFsuOjxmUshnojXePUuNYHce+X1BDQ8sQKAm7lFyq6iWvYCFgczuCt/UVvEwKc1v3mUBpyO3XuXpqO7YzzLtKl9m81HTEFqOVSquyDGBd1NcvEYP2H8Tb4OI6mGDsixSFW7OOTi/BFsiHB0R4C65DiXVsPklluCleHuDo4LVJwIDQK5HHUIZiQtS8Rm0O3d0lFBTAGiJSoC0X7lWr62XAbePML1HVQ8S1WoKhvpuCtUNqKmJpuPVf5gFuHVBIZnKxxfLmBOu1eBzpYV6mTaa25gTntr/AMjPNk2kgmXTkr1jMplDena1+KzKWaFmLXftxh8ynyJYQdm9W6DczkoHQXkiCnwbq+klFiHVGJ1l9oMRJX4Gt/ipSc45OJpvXkTccG1fOYBGxi/l/aNu7+7iCGreoCvDqzcuEP7I8TC87IdUl4ohdzlPAmGu76iUH9+pTBM+52z9xy4HuKyjP3uXW6epZkzAHIQC3+OIqy2pb6a+C7NQBu3mLpOD8kQtNpbliqmUiI0N0cX7qBLSxCzFa05dEGyJ0TwhTMCK8RoFXUBvuVR4nE2+j+JufCXiD0pUNCgFo4EV+8dLgaIR8Bh/EWNra7lk0rFI0wWtApyTCl7PL2kqkG+Tg/iUCmVnpK10/iACq/MtWSUOQexiaWIHGGuGUliPEmAFwo3AyFpZZDIIM3VuHOS7cArxAdlgNGYiyJyqX9pR6ZYA8MSnsgZ8t2ZxLQLdfuBz9IGy2RWws86XEBqGLlNL2HBGW13dIvM3PsE2Bz3Epv6TlVQc9ufE01niAsHrVwCOHiW6th2OZvDu4AUX5dRO2vupV9/iA3WfiA2tfMp2N8GYvcNcyqP2lGLGiAp2limIgAAe2D7lv+kyczP/ACjgZBjEcY3EzEbocRwUkM5GADmmatp43xqEKcB0wKwCngf+pYCoflBGilWNGpekeCItYMX5h9IG14gK8wNyY2RMTb6P4m58NwRalDssz5i+fIck7/M1MOEV8vMM7oD8SgCqGjzHOI8q5bcOhuA8dQtgLAKMShXGxnG/2zGjbZQEOy9nMpGn8T3ftCNftHZjAdj4YZDUxl3H4Aj/ANa/cxOQdgX5gPNacG6x7iar/wAB4/EERAQpj95aggMArlxqXM7dlX3lgVt2Tyf3i53SrJ5jyD+IXAkMx/ul1cs7aWIwTq1tiGsRJT+BDZmLNMup28TPQIalwuEapYoTBxXUVd8+I94tKElhonUXWDxLJc02nUZpo8MXeh4CUF2Z5gIl16lgtgxK0CvFEFbsUwV6imxlVv3RB5UcckyKIcee4dCFmlDBGBcGXEyOKuq5ngCdbKu6DxM6UeyK5L4IX1S/co9LQvHmLhCvXOr/ALytaEq1x/iUqB51tzONQTJVhmHi3g/zC7wrluFM2ZXUBwJwXFzAEH3OZAY2SMGfo/ibnwIpVib5RDABQVhJdQaUubmMYFmtNsGK6VdLTC4ZVdJUVC5cwfxsZLDmn1BSMlJNvuJhikOT1Fq2p5QPNRwMHEKU4H7P+YBWw9T+/wDZiEUE2x6qVFZNrinJQbyrcYqopwalGl/Etq+vc2BceVvti33biVeCtYu5Qzr1Az65eo9lQllOYqZHZzBAoHHUSoMxznMILBckwgwbLlrz/cBUNJmiKsdg44gGKQo1CqNEvWMeO41yNRM4/EtzLM1iOqCOaxEBDR5jQNjyxaw11c35gDe+8wNGrHlxEarB7/OJRfAAszxU3aub0H86hcTLyENaQFe0BW0W0qxAvFvuVixfMoz61G7GDFm6Fsp1KVSdTTTDGDcME+7mWgD6iz3i71CALpY4KK/EG1rRW2mGHUnA4iAIoBlS9HUrAUNZgIJgC6Aq7iyhxnO4mgYCiEIF4QW1KG4GY7wVHS9H8Tj8IytYN4ploVmC1lpqYCrCN5Xma5mGQnPqXAjstW28B3GmsaOarEBRYmAdRIVBjiuIgUxfHUFjs1BXpMowirj5l/iD0v8Af9PP8xoqghvq/cQwVeolYaXUoSBIhJaN4lBe4HuTq5hLA+8xbkef8zIspDGRq7nO4RA4Soa11VjEsgFW09zA5HKS60JanfuKUrrYuYNslvDHuC8NfROxsStokuiha5uDNYl33C+mCE1W21ydRqwqLA0uaPULG8DPZ1EGRYoa+zuBDbRLbPXNaZknk0Zw5s0f4iTFKVSw6eYFDyNa+iGyIXyDi6b48IqUVerG7txKWQZUtvqpdpHF4KP3ij61J+Q/vOUwUvIOjs3UILLMxXAhsmTQbcN7zsqGil5ZbgWsD55gXTkx3kmZpyMVqVONLDliYVCqlq6COoBd6GBZViz/AJjFfEVxbx9YgtLGOO5iOT/EdXd4i20l6+klDiEtfR/EFNOvi8uWpP2mcYKpUKsZVQRCrUKf9mJk0rbxAlKB5VxG0y7nuHFidpuCasWx0cZg0qpQA+GZ9caI/ZK0gWhqiImiyArMa5hX9oirhqOOCBZAGDI99kbGJyJzGsA9zJdEc1FAEHqWAp0icBYurJl4DrxDabjOXFzQAL0RcAUDfJ4lLNo4jHzuXBYFqJAyOmAVAGUG0llVOcjcSmiy8MzKF7lngRjFVF9Isto9y1/EM4lGpZsZqIArPFJyNa0ng7+oYtSLJed+9QwpmlpI+OXiHFNWgU1XkO/xMHRFCppjuzE/HmCYmWsOocgBtGn37iDdBQIb5GNUdpwN9ykAQVBpkdHUPLYrmEqz1E6HN9Xh+3ExR4uxs4i3TII2i7eok1mLpD36hMNg0yyP7ET2jEx9PcNWpPo3+YLAAC9rWYQAOQ5BxcdyqM1FLIxlJozIAyqsErVUBo7jmKYLuicAZc5mGemGDMP4j+PmtTNovIyq4CkUgnsnj+0IEcygsHgrogF13IOYzRqFuF1UcxzglQmrYbjBwzHhbBGj6IEMGMqP3z93MMctKkIOTNLzBiYVlisTZIi1b6i0AikwND3zU6jESt7fUTIK9kGyrBl+rXk/iXiKvqBuF5ZV6hlugMHcRR+Vr6mSvRUU0pY6GWsOvWoDDNqs1cCEPcW7cQUwim1sMvrx5g3X5TbjLi1quoAXaFG2gimm/RU5K/eV6s+iNqrGvjcKPFeDU1Q4/MAVnQeZeBjgWFpOWt81FBFFjRAld7qDQd0yEXQAU2YvlfrUGsvHBCt4FbEQzCVdmuIgW2bO5crROXZ59xEKNm3aVaBd2/NRwPFLX9oCltdG0uTzOzeDS/VQxIiLBRTp83BykUduJSTaUMPuIF60KusAEXEViBiDQ6KlOwMMArKoC1OeYGhRVe4bGqKDzNsy9B/E0+DXd2d+25VZE5eJYusmXFAtMr/iUXGtHgGWUpPuJUoETiZUDnX+0UKFij3iI4KUHnEOjr6HBGu+CL9caRqoq8kqww++phuV9QuSDq4qBceSDoYu4baLxANLNLf3l+Me4RbtOtstyGlEc2VNNYmAHXekALUSw0fuIugDJGK7yxmAyjIYfzLV0X6SJQAuvB39yxNxo4/O4A0LVu4ppvHFVEYNw/7iyUavEgMEturGIqtebY06e4JnaopLGZAK4JjAGILRrXnGyqiLwB4P2jkjl6JpofCblnvEqvtm/wDcDnqZx45l+axyzMCi01TxAizZu8zZyLrmCWtz95cVU36hSuUcFxtaGfOpYp6cGL2AnYalZxPbAEkqqTZLNQ6jWkHZlUKoe7iHUug6bmKFH26/BmF6HE4BWd7hIINoCjs0fiZkJbpw/wDY0pxC1q+IAORM8MVWkN2qjKemS2P8QDsQLDaA3e5g83xHCnU/aH8fIcN2Tu7yP719RQQdr7lkBbPzESnYy+kE2aOXD1C2XVy8Eco4xLUMjWYcVC9cMBtRSYD6ijrUF5a5XrMqQoXSpYlDUWGssUVzK+/MHWca4of3mEzvmGwQ3qA5QnL29yhyX9xLVRO4gMFeRiL0QwBm+ooKDRUJBx00y9Kz5mM0prGUjQ0z/CoW4PSc3Ep8F9F/zAABp2O0LIAF1xcEG1Wk/wAELuzztLBAuH85jl2vcVhQhtVsDqZVGP3iVd3DcIR1kk89+o4JR3PwDomCLGiZdxCCw37gobxjLb8+pQBQGrKLnnzCzZBzvcZiVFUZmJDvRCSVBuAJRa/bNhs5mQZ+onV2gMstoUbzMJ93HNtNdQcSCrIKKgCus5/mIQTC3Gu4LFkuxe8cR79Wm+XeJTdMG2Xj+PqHhALRvT+WANE0smClYms5intBkpzHWw2bZVw8MXKNrpqoAM5c4I3eL8xAtZkEiGaq+ps9H8fMLW2VbRANS1UckCY3mfUSn0WMnxSnXUxlhJbLo+YZ2fMVulNOGMzszT/tSnmQoz+8Vp6B/CQsNywGrgZjZeV4ZhZSYrJIgvgr6iudNNnDhhog8D+ZfBAtD/24noGwal4el/yO4KFK5/4EGFa/X8zItA1XMZijuiNqi6cxrZtA9blKFJsYPLUzjTMDH3GEhldGBT86hLS6IE+xIk7ysQCDJ0OJZGBTNbuD8v3FdobJxan7yhseiUFQJ8nUWxd4e4HlWaoPqZwqFXt9xZsONgVLa1+Y1yC6gdspuug146iKwCzXxVMayBQDux/YCDZhxTEWrNmGpvZddwg/mqLVh1DSg7B4+GLAcC2/mCV6tkDN9NfvGkFQ7MJLtQGGWl9yjkJyuf8AaXwNhcnh8jG3FlHjLj/yVK146vYUH+IEXBWN/cDDMNk1Y4Acx3AvbeKgajFRXAF/zDsEdLU36ju0KOIAWgo4mbAoVtWIgGrdQ1VWcF6ixWbojBbPBAytOc1K2aLYIsvRNXxQaKeDiDQbe4oHkFgrSgQO24+xlYaiJYcX3MWzcpGTtceoueVbFRAYreAS5i4XmHRk8DY7gBMN2zHQLsC7eLjet6icrUa4PuE2JJWlwxVOLwPEQaAyqHa+5h20cB6ImwpKFbIrcndwi0CroomoB63F+4QuKNtS1ilboYbbXdrQozcSQptC6IFkZQEMhtz+IDOqOiCJLqPQ0V+8YuwfteCcKbiqxKrESsPuWFMBRbjSQy3CbzXj3BAsG3Y+osMRrAepZFdzuKNkvzGpLhti7iA25/iYmg5XLoOSICsLlVBtviFqXIc8b8EvOSqkcfWbjoUEFL6ce2IGBUyDgr+0epfVakYx5bjS6Q5t80vXqAGwxpbMte9x17JTVIX+5dyglbarI3nk5gY4aDNjT7alHC0rhN/m4F2racdCP4f2lAaBeEvJBPUkeB/bEIE+Y+T7LgynAWr3z/mU4XiQl2+4Xs2Cgg4o0FVHLjPUBzxBrgSy+gkfaqUQDKdLLkAso0MKhb8uYZol002yyaNBbnGpUsYKixKopm9zQmWnUR1EBTmsRZc5nLxRAQfGC7Vi0GmmZilFQU0N7T7iq+Io24W+I1dllA5hxRGKwgx1wWvtzDJKLF7imxoFi/8AUJVyqsA7HUpG03lM/cuM4XTo5gZeUckFos3hIp10379MEnQMG2XEaWbRnNQIIRvIVYWeU/xEtUYC9vli/FQFhW2uWAgqt4YHxFG0Fo0Y5lABaDlaeWBxUHvPcW4RqXwZYIUkgxuAak2Ni8fj+Yp43hw+vUawHgqu914JdSE6O61CuhEjbJjPplIwKq17aJWHm1eYJUZjTn/UrOlAcHHqGBSFaoB3KCHghlli7XMoShjX3AeRfNS8YlxqNhyhCssWpiiU2MNVRdCBUJY8EKYCLYBCJq9Arx/7GPAuFWdH1KgCLVeSvA/mWO4wI5OfUxMhRwAmf5lX22ZxdkuRJS7oxZ/ebWzs5Qts+yvqNi4gFuNbfr94V4y6Q0v94CWAKG7Bk+5lScANWV/1hUsdqZDAxBfO68QhLlMgvG/UYKOLsV5VTNB1EANgmnWb8ajWiiWubfHuZSoyBxWYAq7qB2BcUZghcwOcvggENLxV+YN6xbSRnhh5YGR9BmWDrDvmFaFXVwwLnMaL/mxOxQ8xFyWeSC0r7pDZlQrpUOwGauEVuShSeE7jQ1zYmIhebhW0tDT5eEhcktddO4UVBSZYcSxW0+0QE5egxdFHiCc3FYIAg0DFHCzbBoEZtztsOgCF5Y4yOgjFPXHi99wpqnQX1MLbUVdvUUrE6rYcx0orC3u2D7IgUTm15YmpXW58V5lnG9absNynF6wxeL7C7PjuW4WDlG8yi5Xlt6a9kfogFk4vi/JLSAPTzginTeQVQc44lAs6ay0RmdQtXWb/AJmSMmP7P5o+pb7xOVVU4YgdG6iVdMuV51rMTEMMi3ecsWQQulbFX7o/imzTu3/EdkJwmKYrHHmGsAtguq/7UspR1tec/tDWoUclDH9kEFZd4mJaqZD/ANkoYLrbQ/8Af3gtWrX0D3Ej56qgA/BhC7o7jYOYWcZmQwpvOnud3qC26hc0gF04dV7g0VlcsidwHRYaycRVXQ15r8xZT601/wASsbemtxsCCB1a+m9+IfaxN+dwnIdaeVVua/xMaZUuZe+OgiwI4XH2vlhSjmxqyCtur+Q3cFC5qi18wQjald1ohiC5GwGacZl20HXJEJTZfqJYcM7YjPK5bd0xQEG25e4B5VmkGIsVXoqGlo7puCm5NU6IVZW/BEaInN1UTGjQw3NpqNVhyY7IChaVz7jn3HaUzSvupqU6PD5YKGfZ/wAHmJZqlY5jowLku40+YU4OK8wa23fI4SGRiC1+/wAxoBsOVcMHV3pjpq+T3KRE2KD3RGO84N5czCzczUuGyMruttEs1KXJf5hZwQCFvjqX5rC0nIxyEMFisqgLA9dX/medwoe8thFgBRa6KfXUR8q+hlhh3Tlysf3lxToxZW6uHcL4DVhzMu69W5C/JKImSpex3jxcvVvFeb1j1BnNSo9iQUCqwxSN5UWDeTWIsR5yFAjlhCUbKAfzD0wu3/cxVViX2XAALDwNTNABgpBaAOEd/wCkC8N3SCvuWZ2HWagORZQR6PgowNI2JQWoqGIFQMv5gnEBHT9cShuWURafPUS8KLYQdENSzksZc/8AkIgtvlZovxAwUBBQf5gbgrRSk+2HebScguoXzEXwrrrUCUDcFZr+9wqH7LdRuiNgUjgxBdJcFFdg2ypMuhVBVX4Ikedy6RzVaaDHIvidbAp1Ur+AFS/e4hkJpoR9zToKwLFiqLa7gBvO7EEwWbwCNFqNUmYKbJtbMQbB7LuCN29y2BPcZ7SNtStAE7phbHG3fqPV5rTBrkYtZH7AYBorkmXjHy/3BU7CyhHiDVy6Lx4eVhUm1LYunMqetKjbuFWFv+ZyU8OpdcFbVjAbvrcSSmeS7m6ge4pTo6iaWeQ6gBQtdjBLaHFxrsc8xuLGeMdNY+oNd5Kb/wDruEpwhFMOniEDEAvf7t/UThaCVdZLriV1iomm806lPTdkL6GvuUOnkAT8dS07UCDAf8xEEA1xK0ZEQ8dsGlY9hnu4Jjn+Fxa2hgGa6Zg7aAC2/wDyPzAMoKwVyF/iC2qhziz/ADK0ANlBNYvhRCgajAVSDAWXJOkmaMoquzXDcAOyOAJYXcYUsS5jyLs6itMb1mN0XegJiLXufvGK4H7fqWiUjQ6emLZQRUXTuopDWrFXUVlAp5MweSGltD1EZZxKqoYYONYOalMeQ6p4fzLSFI8XfBMxThObWJIuqU1mswS1tdriMVoDpf4iEsRVAcEUCR4p1BSyb4P1GJ0BHmfUto9qKi+AXoWpFpkxbwfbBlJVGKssNwNK7zL8eTmKePqZQo+JcLOljuQnDeXFU+pWRb5Dr7gMUF5LiKggbothdanXylkpfi6gJqFMGjyREXRee4YJWsU7IiEdq49wUGRvvcC2qhL6YeDiWSt5Y8AVLie3zLNYB3FKW3uIBV42wFCpzTDQUBtmYtRpiEQYcLOEDkj0FtP7QOF31ACqrtjrikVyzuVmZCTe+jf3ATYsKA+HL3GyOcXmxhhlaJsrSMxCIGUC7N7gvviFgvdRsRJQUOKriMWQ0Il7+4rLqgXZ6lGxpU6OCPKquqtWbqMAVd0qfBXMwxZFMhyi91xKCLbcQ8xEKMqpr+Y2Aihg0eY5KFEFf3ix7W0smTtmQWIwFOzj5z7irq23H0QKkEiV16hlZiQ/6qODjYhfw/zE7U4XQ+PUAAMwA6rruBsTnJrxF1sO7aY0aa4DNQcAbNZaieADi3uJXgdD/cVSumqu2ZKacgNvVcSxEo7hYH/WGWBhaGuybgxyuY5aTQOVhetAbqo0q0XHiYbQvzE4vWPD3AWqVs8RAaISlESPuxqGUYNBtGV5qxdLj5tfV/iZEpypWVWi5puZGgzwfcxoVDYxYnMaCqauYRVtzEhnI3iG4St4PxFYArkqUL2dEWioGE0+0eO6spPzDwad2LkDywRPij0PxCFMMlwxJLHKwfTmWIEyXz5uCC1+42azC1Nc4X5QC3Lu19oGNgazNXF8Spw8IOgahjDZe+ZXciF14gr82uonocxUcjVQNuHeVP7RKK5IgdLSNVFucJDPow1rUdyV6h2KgiD6lkhqGbOvUKTgGmbviuIBMDWC+OyU0XFnjS/NZjAoOKxREYgWgpbF+L5gO/1RnpbiWJCLA5r0c7i8ZdBc59SrGlNwe4WuwI5XzNAkwKdpUfTV0LwSsYYoWrllJsVYr29zInIGnkGUFEAX3L4uEZUBBoNP21B4QWybtVj3BpXMrv69dywVxkFq3VcS94Zo5HmUKm8pnHEvNAc2VE6xpiyWapce8yntoVQupeMJgQCwx1qm8r9x4XChGm61fcox02uWfUUTksH8S1qhTxGaA9G4HQwuepYWGt9PuYM0YHmuo1LXP4qADsxnUdLk224YoYy4WUAGTK3AnKHBcDlIYrIv4iVSHO0dcjTbHiPuSivI8kCMK6dkAiNswKU4S4xuPsB9w7qE5AHtiXcWpb+4dtNl6EtCn0Q4kDeNleSIW/lTo9Ex1XH4g+xTkNy6ofhcMVtw6I2Ry+uokAIRW6Np34hG4DAMBAasSvZkhuZnnjqCpSDTLYAsSoR1SSgvThl2AvllBZJnCNEkuur9kowgCgufPmNEWPOgaxT3/hiQNtgqLcmhw1iB4BXJCFA2osFVORpi3cqqab4lMXAWNi8HJ5lUawAUqRSgVGDJ+7mDisKsTkrmCszCh+P9RVFhDeo78QEr0NPIGbACgyBsrmC+83yVsr1LVw6XF+/EYQmDCD7/ALSgX2UtLTR7gqUCyLqMrSLcHp8aisE1GF801xBKdCZbbxbMMY8jbzbGbAdpnxRHlBA2sOSwjT7UKMuAce4hxhvtz47Y7WHUuyKDVaKtHOYIdYiqDRbXuWZwjmtzT1FUjPgqOCr6jhKPLUVo4sXxM0W8Yr8sVJDw6+4s65+5cNMrQKPxLl07PMHtQUOazpZuFLvJ/wBxFIizVwqFFpoY9mKpOkUYpqooLQZpdysFOQWn+0wNYpjcejKatpO2CVgFNNh6jWqpaDh7hdimi9y6sRbsXaxKWZMX4mCbGpz5TCENPDEhWkiAtjxLRaAUFJbQN5HJCy9W8iNwQ5ooYIOoAQmBdwiKA85Sr2mzf7R4d4I/MD4IkDgey4jkuSMUla4SX0XeKGbd00iW6IK4gUWByRRddGD0Exldu6p7O/UfoDkjaNj3G1lPFTOKRWDxOxs2XNvUUcbqOF1Dlm4vaTH+mBvo3v7laogEp4oMRO0BKKGqrEe11HWrNR7bBKULua5pglBS1TVLC2WkjKEq3SE6pyDp5lh144GOCIVVinPFxRWPt1mOA0AHRj/EICiqWzd/tiFYKUgdEoFcAhVvPvqLWgwch3MEx1xgA4YZAQ161RzLiqm7WV5rqagqhm+TXMKpaqnVu7gE1bc1/uWXWduR/eL2CrADrEp53gV7/wAS8o6DX/cSB62xr6ib28amUFXjIiVah8QOqT35nChXi1/MwaU9HE3sAa6mjZ9MA2W64hHKz+MJ704E0ii2UHkEzAGdC6jGa7QVTGla76LSuyTtiAdsGx/3MbAnTLMFB3k0p8fmLwCbcqmNYAyDniBDJd7INim9cVAi8OK8QsRta5lTgpyMTKtvlIIpvKyFv6lYqSg6fcV8dyrGZDCPBEASfNEzdRYFJH2zFS3qHQDR58mZg1cU1NoJg9y0SwvVHlLkP91gryXPiNlxgFIECdrFB/mBlPF7lXWrL1xGg01xVzNorkhsali94lAu7lwaHbK0c8DCoMgF/wDYjHFCyaZwAjqoUzLUq6ajRGSrlvQ5Zb5ndHRIk1UpWo9VomIXUt3b0xdUOqFdvURV4pUpzK2gZx4h2lUrKq7uKwFJVcRVstFzINV44FglQR2NVFC4ugqx4Io5aXx/0QRKpFO6+vEG1BsG3y9CQWC2LY2HavPUFbSg7NfX4iYdZQN/6leKeF6vtrqCcFwAYIvITycBKymCoKUcQlBT4TX1MMnNNLJwKnF7igCmVZv7EC1BysftL69sW394pt8LooIhJ1EYtvVQ6uCXQUYQH2UX+8xz6LS0AQ3TggssDeoHaX2VuahT25wdgLUFcXKq9Bb4gPFwWl4grRqrzGrWuoqv3gFWxw5hglP8yhQ1EHN3qmZopxTHUeWMKaTzxF4IGC+B1EFWlxaeESOYWP5U8Zvk9BzBcg6Gg+iMg4O+YOTjPGalDyvqBYf3g3ppIECgVlwQ5XDjYocyzDle2MMkV/aGPDy9rwxoLQ+wmbLFBBDbxzGt9+Yqjzg9ViYAseJzZDxEKBU5S1s/mOkzMl01uU2q6HbU0ata4J4iwJpXy9RyA2kNj0cy8NIrDg91MATWF8hvglFdvFX7a/ggodYgNJxrP7zHHAAgP2XiLYfAFP1Hs0CqUCOgwqnI94gytYpajIZgzuOu0bbTiOua7nP1GTBXfMc2sADjqEULAKo/fcSgLUq2rjW46AsAbHP94rPl2aRKCG9XqvB+8z8NinLDsy1hG9s5WAQwofWeNIoGb00r7Fw9XKTD8tSiqSZaFn+IlT0OUAmi8qlRWgS4Kv8AMoFAtCLftFWgOho/Eo2DgPP5mTUcNQ+pXKayVQxNFtjl9yiyerLjsgcoalv4HNqU8QtgjVuWCbu8Yzn1GvgMW5mOtwylesxqBhIwXmpv9wXiGkoDbB3FgmYLbUuNTv5ZTMYeFBBmPU/CoE2nCIg3IGDQZMZh4Fb2kzg3B1MwzwxBPai6iFyL31AZyLZk8kD4J7JkIxVyk63piIHowpEFbJRMymxzC/fDXIRVJUwJDirgXlTdGoZ2Ymgd+4dQDDEK59yhrEKfuZ3AcDDTYrswSgDlPPQygMaTAf4jaUEABvduNaIIaAoExxvMKh6KK3bWGIFo7GE9TGZRGtDneWcWgI3BahkcOo5q8fhl8Vsqw1LXBTYOLjtGePUTmAK2+mX5Td3YO4aTGxmP4lrG5av06IWZDoCOAfEoQvBV/ZFrNlNk1BAat3lKodugFIxKHJT9nUSt1SwtINaXAA283qJxSchzB4VMix6YIQAoAj5i1RKaqkqjXOFBXJcZbas/5GAFgpkLV7mQLKaD+0OUGmqyzWw5cft1F4YzGAwKIJkHA9XF+w02wbF8vGKljdzDueaVagFfMCgBF0VPIgirSwlp+j6hSbDkhml7RyIB1iBunUqHLkgEJsDVTFRW9nMAqZ88QsWPmKBS/DLxUc3KDK4VBeyrzUVWVO6R4aE0G4aPdswkUba5V/EAWF4yhCxfBMGA+Pi0rcqOoNL4TGnYS+crhuYM0wgZwRrJVvK6D65jFbLAOIqh4jXaBtoDSHLb6I5E49YnFxUEKahPuv4jbOs0eFy4GrslTx4lxoCH+YgZAeGepoi4XB6ldw0tl7DxARVDv0ho02uuCUNFgRLEl6pwc9EQlQBvqmWo2gWsdsrZ6KIx9wGWQ1jUQk65TLhWi2g/MJZNwtGoj0BokKN0wiqZedvsLLZkFbpI1CeERjKVjQfqHUOzav7RKDPin+0aHwsy/wBssYIfBn8xCNq4Wq/lhjJRKFLr6lduPgC/ogJlFgUEZ7nkh+98TOtFV1Qr3DP7pleWc1pLACo2uX5japKZZgiiXFqotTnqVy2JUUI+ppamklTkruAFfELExLsllTAQYsrpOJ9ZEQlRFBvK5+BEZJUMW6YfULN6FolVGvcMYi0mqletLmIAxmyVk08tRFCmYLtXdQOyrKSauCW4CK18zRjrEzHU845qJNRLxFCUO43EFsIblssyoJVQQGGlv9pyA8EiRVPJcQqFV0u407DC0RUDFiHsdQXwBX1W4hQ6NGngruI1lSkKPuOsAuuD8xICGwXs4glq1SoOXxLS0VKRYBQrtDA4PcQ+utt9QVwW6p5Qm83AJioYhG6GqwEFKYu7PUKk8OJ2ABr/AK9xolpeAXEyDTkCaLeDiOby14XX3GNIMmTP+o0kopbRUbVFaBqMKLK7vPgdTJuHSfpfLKQM4pde4ZAjZp5qIOjsbeckqBhShEYU7Arj+RKgszim6jZADyAr95SE74NZeogALFoD96l0GlsRf7zMdzgxJrIFy/FzCQRrKy+k1LmR6gHKa1YZYW1ArGJzFcDLylgOlhqW1qLKwvM7y4AwN93Aza8O5V9Cwj7lYTxchioOla9TEt2hyCKgxwYSBXk5gABDbEIuG5UpUL/wilV09RqVM7Oo4yT6h0qzA19wa3CslxnRKZUQyt7idppZqVhsR6jBW31LhWTZdR6lD90yI2upajhc24D3GS8wWuolO488xM0qU7qKMUF5qCC6ozWSvMUc0rsyD3U4TTpB5g4kZQ3J9cQ0phBOR7WWrBUlB1K3pTsrb7Y1Ag2K17lUhC5Vp6OfcpClTOi3s7iaNBWSvuC1DIbXMOi5d0S7ksWOE5xHEQsqqgqnISALe8ZPuJoq5ouFsJvktxGBGy3IJ0RzRzFkCDLqtqujzX8RgKrm+VeYkZXS2qluEPK3RDFQbvn8zoTxhD9pkRcPCFZUHKpuDbimrLB1alNv9pVFw2hCILyEf3i4pVmlFyzmjN5fzPY9ARLInCzcAqYlaQvOwbAbgG8i1AcpUvllAQ7CWqzDYKsxDrDAsQ2GbOJAIRHDxNYtXfSYhA5GOgjdckFEiFvJChRlK6irdYJQSsYZzNijs1LVm62VLLkchlUCU9GUL3XQwrc5zUoYKZomYDfK+ZUNrOjvzGpRWPcKQWNuiVAKHNmZaWuM0QkOQmlMgcyEyjF8MmZSAFCoiytGLlmHLUSw0rzME4Dm+5r4Ds5loNbWL7XzHkKhaeHMdcoXJ4e4mDvIJ+H5i2QOrJdZloBYwFvMpgq0DIcNvct88+6LWgOtL9oNOrAIPl/iUAOMK0lRS04dXCCG+iH1cIrJ3nMOQ17f6y6JTIrpPuUtBrixUUqTQpAfUr12f9VQ0oTxH7Zd76cAQxPOTJ9wwbHJQr8kvDl3/shsFLblooqQ4GvqLLQHNNwZBhx+6FSkmUsxiFtwMPWoIlRijeZfvQU6pSoBUl34ICrT4Y0y4ZZk0hIGbQcolxlhEuA2WpnpuW4MpYG0wuXiOgordS82p8ylCDdQtzZUHIjkIRA04/3jgmmzmcyPKstQI6XFuErQOoy4YV1QBGWy9olD2wWg3SaFbv8AEEiq4Y3AjYBzNUNUXFIogWcFXEwas8SigwcQ0tBu41HZ5YcWNZDqorYWNsQgtwnLLFpLcEeBzteTweY9WWONwLGvQ7YF0P8ABA1ocq8TQL7BxEDTfifuIMLleMECIFtyhRpWfKO7oWwv7oQoaprrqAvY0yVn5hSZKUArogBRp6CBYEVZUzVDTWftKKoYKNPCykxrv+32xYFGBxUzg57mD5e/UDm4lcjol57ZLc1/mOLKrrCBaedn94Gm08rgrFu0/Yhi14Zv4iCUktAXwAv7SCKGMFbfuUmLhH94uxu5Ux8WRB+kXU9bH8VOejdaP1LFUH7mB2GWPcJF13SxnbWdBLNZlMYlBZpccQAVE5Ny/smNAiukoMsbW4gFZpB+xuCcyR6zTocR1TkhKMnDHftEIo4M1Dela0FRirTq4FDG11KVYlIwQAULYEuByHEZKVlT4lAFAWNcwWFrcJzHacco7+jR1DAC4LmUcULRFjbklxVfbU/8xVb3oiqaFfmWQv8AaZaoeGWqZWsg9SwaBHVy8X5AUfTANebrUQqi+nmJRjyrUBFqI6VV2pitFg4MxAoxxWH8QLDCF4l1p1eDSbxRVgMyy1UM6L6IAV5nkt8sxxkbDlxKnGNqj0SggSIC1eCI4S43Fv8AgmdVWSFYgLBy6hXByBEytNXaDd0lP8kZDaeSc8W7W9/mNWLO0An3UbkUwLo9ZV81/iUQLMoa/FQitPYlX/mWSYhmP0Zg0flH7eY6ack/ZA3DZxeggYsUusscsfq48o16NVKckevjOVjmBC2+owwoGIiUg9TLzNUV6gPExAn38dccwBIVXaHEWL+xFTsFbJfBACvZiInp1Me+bqAhdOaYEqcwBI21nGpdQWH8TNXejXECFOBWV9CSsAoUPBDu6rXTz5lpZVhWF9xRpZNm/EowWZYE4Brk/MvBQOIgC1JsNTBJrWckqglnfBKaRLcq5Qet+BgKwzm5lK0bY7LbutSgwlcl1NCY8LGxyJKNphxbUArrBtBtlBkv7ocIr+ZlKArRFdYfuOB+0gI2wHLzAcAeatlXJQ3S7iVAeI/xENAp0blMsGpX9CULL6wG2i/AQXA20j6moKm8Kg0KbyP7wHUHTaGOj0W4cKyrzWBKXssw+5SYHhWIR7waRd1+Sg1FoaX2/iBVgYDaNw/Zj94hC1oDwTGKW9tGYwyqHlALcsblxF1Rgf8AybAr4MbF7WXPFxC9YS9k1FyzA6lEolCi5eIqmI4ImaliOGL+0jUuL3Yc+YUnslfwQcMdpTJWoODeonlzGN5vUXK1rqoTFc6RmyHa8MoIc7mKiU98Sy6DDmUtWLgE/gykjyt0bYoqU89sapC9DF+5QwrlAuqvu4IjrAcEQKge0EkXQJdU10QDJHJcsAu5gKqCjxFKJVc7lpnI1FhoVCBX5YlJW64CNmD7lP3AVQB2OoFQU2OYD1VnV6jTeNcdQNpruIXIzwaZQwK8osG/qFboPi5S1L5uZ9qriotoIOmIgYdHBAfoXBBFHjnGEpGKxiUNE6zlNEHZv943ZwhgD+CEOm4pn95vhmKD+Zlvc0VlTjllxbE6eaQS5jwPZuF7bF8T9yzU6zKwKtDw3TGBLbDghUoLT4iWTRsVUINl1xLUMEQBqVBzcttxxGVGB8GNY2OXR4mc7QyzELTuWG8kEm8kXJwQw+OXhhoOC10xsolVMkPIy1IphH7jxKbN1CotZ6jUN1Gui7zbzBpdb8S48AQzeBoTveJm+e4NNrp3Eqss2uiKTWd1ElFS7vUoyMOYbHBnBB+PM1KmpztIK2R5sjpA7q5S4FB7OuJSoD5G5aqCnTqJTSmGUrDr4i2l/EoVFvtnRWXOChdLTF20EUi8JAMA5NLFOAfuvxNIs6eYmz8ral6l7BP3JnPQN4iwLRk1K7MeAuZMlpwgFBrsGDJ14sylbPpzE/okqLXRhKn3ccr4skHmhZGIgKy+UpYHS2xqdruxmFllqsSIRRqpFbYL8kARQ6uoSagu39oFsabHmYtRZa4jwRLU4jugmS8QGGBxLExCP2YuKNZ9QZzAD3n6lrIGECKgxnZBSYNMKBEYlEcXmO8SqfFh7il2zvqAF/8AONU2gixwzLwsAEn1CzFYa7WSjQHaNLvuW2ShzP8AtbhM3a/aC8rQbYERizVMB1QegkLhw5iGRSMBFlLC9CwMs+4aT6QAwfmJsr6qJQe+8zEpt7jygPcUAsr3FqiZ6gikB5iMuOiELUspJSQyGZ7fvEC0X3xFvUaxgzO1nliWhdqp7Jm7+JVQDyYnq4iwINbCzLhuzn7I6Xa8CAjWFeSUlpaGxjEt14IMypzRBbOcUn7S1BKMNNwgr/KUgQ3XJjK4oDiVCtHIuCMMp+5iBQ6XLX1lpAIDFbpHFw2EJpB20UqAV8DKMBajKS6yNcsdkS3l5jQjBLEtGYoMTSlzfkqVTWfUQKKrqU+4luJSvwbbVDGNYKLWq+48iDnOfUNZq1B4hTkMxaOqhwv/AFmZNFHyTQX9kYrtCvcyUITLTV+o1Eq+G4zVukXcZhn8IBpn4gj08yi5cSm+JQ2H4jXEopK2QC3J6dQhhfBAMCF+LmM+wmkqPCRI0X12xqK8BgNLF7lo32rwiwKzvUTWq5KsgvLfJgle1vxRUpqkr1ZAmx7U44jppg3DYp2PcWb/AHcaBp2kWrJxS5WozhFShzduYEgTPOiZYHcWgUB4CsW6nNnEEizywDWjWB+IQlmqySIE9CGYO2FDMLX5bP8AeJqDkt1B6K9CFpVhvmLqFlIGvca604EdhGlsq3wwHKi9xW/Uc0FtyhEvs/tGkXAqB58AumKO2YpLFyYvoOIMqDJTMIE3xBTCkKBEceDuAFpWEKV6+IzAqdkWOD0RsHbKwNlzAN3aDeL0mWPpjFrrD7Y+0ZsUAihpLuMNWPuM2ZAtvRKkajJ/CWcKGuCY1ldqMBV8CNguRgLju4qiMMtCw2YlIps5HZBS3Y9MsaArmYYAPTElYEKPJrzGuy7Swyvk1Ah/jBbJj3VRa0D1f7wbXDOdINdXNSnFTvcCwPeNyrYS+UmOKnUKg0POWZLyNgTSw96MFwQ2AS3q1xVxWUk4FSwbq9XKg9GU2gtrjhiOBbojgLLlIpT/AMImVh7jpN7thqCEAWEvdpGXMYQ2/wAztyhcvqWRQbKV4YAXZNEtrsEYfBW8V6h4FDG4lpYNahPUcEwaX5jL9Wjtl8iLK8xGNLjmJFG/uZe7kUEKSyhgNyotoYB6lhmcypeD5K5isG7jH0jquiJS4z1sSZWc8vUEuF8kfphCQbVXAh7vLMgywCIAH92J83llVEchWviAULTrzKayzPZ7mAKfKCOKU8AIDBzO8veERQpXqF7K/UcEMfvKMCo4LGnBDbM9DiLCVlKqXHtFdUWfmZEXyIKz/NARae1blTT+8MkEQGwrzURgfBTK6xHliEVQOCBGsPhi9AYN3T6iVgV1UJ1eIjp9IDDC+SF1dn4iptxDsA8CCFBecRsJHG0vtFBnTDus+oBttxUckJ/EBFNjqO1WSGQt+0huEzFuPF2xH6q6cfUDEobKRgThEI4jgcwZOnqrIEJgHa7Jm0JyXuDV5EqeEiGmi+DdSSouZn1WqF4iVMvLAFF3cIxXjCoqEqekoag37iza1X1LIfmJUMviWTiUjlDpouYdQrVqy5JvkiEu2YpPOJepQALrbIqRRdMcQfucfrlbGly9MV+gO5SsqDcq5er15gUy5HmPYKh0SpCWeSdyz1LTBu6SZlpCFeBXP4IhFvlGyB81F7Q8zRF+ZWsSnzFbYGhmSgtYNOCniIBVJzGEkBtqmDcPsgd4vyMAVIOWIAAQrzLxVnkI60X6S3Zellk/KCCYD2VGIlVEGw+GU9nsmdwjWVB6oH5S3AWopcV6AIIc1IahD1CtNLisEMJ2pD4VDcTiCUXo8wGBVyhHYXcAl6LkgzMO0FtsRKsM/SW+UciVvBxsIEhhbL3GqZfxMwx2mMQtQyGruNlKrGOZbdottfCwGX6lGr2ayRQuXHNQwfbHADgUjUA9phxQrBGc3d1B5QriOp3Gi/hBAx7lKLUcExsP1KfI5WN8gTAQmxbipOW4XV7EG9meGWrfSz5io0GZiXq7ZR2T+0WoX5XmZhdzqIgdrQ6jZweJk8bkeI3Y4mJxbRv1LMnx/dpRy28uY0q7cEuMHJcSK1tFxJbenEGt7tGCWrVfdwgAdgMwF1uDlA06i5cDVXgi+DLsqMrB6jch9TIaV0JG6hUedRqFPRjal3K1L4K61LNntpC7GLyjRpKaq9uZdIwOoLMHh/tM4yyOIqih2jBxmMUXAO70lwVppxqYS/AEoqC7XKxACuAMTAeqnNpFVB2NbZWg5ZmGXlKRk5LEGaYIsLrlTXqFClXqZ8Nohby4qO5GkQA7EuUalZa5cQ0RxhTAcR6Na7RxWOEJGiuYohqauW1NHUaALLZYwOJWWW7IqLgZi0Cj1LVv6SwMxCmbwRamTpERXEKPHMYOUwqblCHEqm1DOg1AAOiGXxk/fhl4Gi8wRLUoloc5jZTCthjYmVYNLrgiGbH3MOB8SxulOoprE5qHGTfOyLG69w2A/SGyOZyqJsA0JX8xJfoZkcBw4l7eWLiZAewisEnIIpDwgzmCgGKWN5X48wjL9R+VjQyxhUMlVMraOGkLwA05i6hh4moDwgY0sPRBBIxusoVE0gzPqJAt2rrUs67ySxhiFowCoy0GGK+VZbIS3l1LkE7TmVyIBgj8FzAF1Flc62xNpZwRqpa1EHYe4aV93LDap1xBxZuVEtd9TeLktmy6IwlSSrBcB3e4g3lUXZHEsze+I8B5RXPjEGjumCh2bzFxTTLFPEOkSiOBxHbBXSABPxLEIMWzUdefMqhe4qPLqK7ZGptGiPQYOZsVJBtTDiLsUvOI8OdPM82evMTOUL4zArIzKVSPzL20bxMcWp5iv7DA32PcNwJCuPto2FLtgXDT3NYL6JlYI3MAPZBAHLhiBYwnMFyBzghCBeLahbY8zCcD8pjyVgQrH3UuODOW9y5Ii7qOEQ83AwUPMGG7FINEqQa5MaE05EaACZKhgrn7JcX4R0Qe3rCHEVdXmkphNt4jqlJKDUsOI8xgO1KgNfzPuhNwOcrmS0z1FmTFweBU5WU2hceYkV6lCwx1CSRHEFq7BmJai4lziakzFDjHMsVpDbCgiBpxHeYotiXcVtx6t1EoWOIK1pl7vCH5koa4magPcrLa7lCXERHqE7Z1qBksDBFNNWzGIxW4trhysZ2oc4tepjUENpOxD3Hq8XMLT9wXgvqX9V4Ny6onsiFB4WMoU5TccBR6mfRijfSy3BXhnBJ7lrQSjQuOpdpX1cuZV2WD5066laFh9ykQvRBS1Nc1B2xPMDqrpLW6XPcSCFkajF1iaqniqgqAOKuUTRPITC1Oag8Fbsyge7ALg9geWNag7jGEi66hKlvkJRIq9XLDyA2Sy+DCxCP2grbg3AtalHFKoS2bcrLXZcxfR7dy1HDCnOogGaNQilZeI5JdiXB5hK9R4KoBDTNVohFTPiCm1HUPyyjhqOQwQ4csJrZhN9wa0X8cIxW0YIXtNR04JakcXCLancLzGtm0lmu5S12mQTxlks/Ohy6Slqs8ygmhkStbhK+rJzsxMXsiGIANh5goEhwfAQoQZ3FCgibI8tBBKV+5oA83AoMPN4hLzO7iLAh9S5Zbm4ZJk7x5g+3cgglx5SIUu9icISGhcRvFSy+NXPbaDiLApcl5jqe5hqWBoURKFXlYEbx0Ra+isK2eFcR75NNPublPLAsY5PcotUtyxneZdc4lro2sStgRYcv7EjASOMxAAL7geVfBDDAcu4ssnUKLREFHBAHZERRqMCZNLe8y8SLdqncyxmYuCXbhyRXHBHqiMTt4iUGh3GxfZ1CoXtBM5mTbbClWAi5WSuWVMH3GCWIu2ekUCuOoO6ZYpTe4ZbojAvcdsuYmKlHRHqdvEQgYeoFk04JzJ7MQgHBhEjbmpXg1K7AEYRkRUo2umLat0hp6NegQEFyJmUfUsVp2kHSpFbFH1Bofapa6nVQFPsVHBeOajeTOuIZYA3xjWsdirg1xfCO6wO9ShXAHSMYzmGTSD0XATC6gAwjLEqFrDQsCCFUERAO5nmLG1EOWMAqdkd8DuuY464g4D7lzFjbmpQ1M7rJM/jHFKHEJTYnN5YsR6+JRSypGVZiYNxbdTaWVKvE5jL9SxpSGLXJzDMq2GoE7izRUpyYIpxzCRczO5CVo3AA/BBeQhgS1FWR5lYAdXLXL1BLhRC3GgiCrYoOCzqHOke4HMqVKdkzpIvmJsR7WM7lhSAeoh4JUqs8R3Y9IW7wzEzRm93EaFBp4hfxHgQ1AxHrqMuTzLqBvaHUfQXOIgUzywcX6GN7/AIJZuieWYj6hlHAyrFssTQGlh7h2Gm9kALerJuW2HwDcucPNBZ9ZFdjCrD7nqpbL+ZaraFTOYpBP1DUOx6gnk+oKexiGrqZi1iV9HBAb7UVdyy9CjAhi6AuazNzZFHMvs3EcMDpzFtooHcsy0Z5agV8ISpuPW1x4tg3E5KYm66mA2gTRmebqXM9RfSRj3R8iFLbMKcmoqN3ZCoHUaS4dywu7maoxMRS+4urVdMY0p7itlTK4XcQTD7gLmcA/EwSo6ZrQkzax8RtuL08JWnfBloZnM0SETq66lJZQPMylVdXHgC8QNUHYyocoCQPmJBaJf0BEpY6JGpA3RLZDgxQ2ddI4wOjBKVL6qIggeUs1lDuDREpejzLQQBV8wUORB1XGBgJqJJCVlzAhwTcDRGFQD7lQ1iNcimm3XE1z6QPWiVEMeYYu6jOsvmGxgziMs0CBGIMZlg2wkA5mV0FsSloMSxeWJs8wIwxSYmSyY7oTaWcwPsxeXNJCBATGkHYuZRWv2mJQrUsssoqm2cxNtvU5LmJRMsVuhcxFWwOVSzEZX1ErEVJh5mVVehD0vnE2Fx5ilfYiSIdjClK44SK7iuOohEWrPEXREKalQ/IrxDIbe44mjkySyTF3BbddhE4PsibPsRQB5GKVFQjyGoa8hqBtYiwtYHlJc6jlgDdZiK4UCga3MrvM3rC8wpi2kJrctYkrkzAUcMAuCXDbHl+kJXVRTB6vCUJ4gLRDJgAYjtgZQ7jCdwve5VWxCeog5MMY1NCqheTGW1lvBLvTCdgxJSb3Ms7R0GOoOTVQZQzBtoKIEbpgrERuiqmDqJKu5Vg1EVScBY4JIMLBqLgB8xuLE6h+gXmouaw9Q8K7IV4qicGVgLNLmiH2yjZ7LlPaSciX3BIBjmDJUeCJFCr8xCiNwxOQDxGJmD1HWLjzGbZl2ae2WJumFyTEbLCJhgg4HSoYpjVKUmYFFqJfY2JHRi3MCYRLu8wpTWVS1S6alVcA2psXLXXEXAWcxFaqJYZhBszESkRmeIKhP3pWxzUUWsVFbdS8TJBVNEo5KZUoiJDLZbwyi3EbsiY7xgNdwDo7hvlLGUVWXdVkAvsYpvC5zl3EICMp4YDCNHeI7CA2Icyv3K+7eSAyD3HaDM2j8yqbAggYdQVmQOolrqYf4cWAcS0BLlkzHQ9GcviVN6lDMogluolZgxRazUP0XNTSbRCGBGMzRkcFRCdY/vRu4gwxxLuIgaYtDMJaxqX9RNonLFpMSakzVKn8ZvMy9IuJzP/Z";
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
