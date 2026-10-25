/* AI Classroom v5.0 - loaded on demand by index.html. Needs a signed-in student.
   Same flow and same backend calls as v4.0 (actions: open, setlevel, join, poll, raise, lower, ask, calendar, notes, noteread).
   v5.0 = new LIVE class screen (no video call, the app shows the teacher and the explanation):
          1. header: class status, time left, class answers, your questions
          2. live teacher: round teacher picture, subject title, explanation with Play / Pause (listen), first paragraph only,
             "See more..." opens the whole explanation, "Minimize" closes it and goes back up
          3. Examples and Practice questions (collapsed, same as before)
          4. Questions & Responses: small explanation for the latest question, "See explanation from the teacher",
             "See all questions and answers"
          5. Students: round heads with the first letter of each active student's name; tap YOUR round head to open a small box
             with Raise Hand and Mic; when it is your turn the typing box opens and you send your question to the teacher
          Long text is never cut: full lesson, full explanation and full messages open in a detail view and the live class keeps running behind it.
   WALLPAPER: small sunset picture embedded in this file, behind every classroom screen. */
(function(){
var LEVELS=[["standard1","Standard 1"],["standard2","Standard 2"],["standard3","Standard 3"],["standard4","Standard 4"],["standard5","Standard 5"],["standard6","Standard 6"],["standard7","Standard 7"],["standard8","Standard 8"],["form1","Form 1"],["form2","Form 2"],["form3","Form 3"],["form4","Form 4"]];
var timer=null,tick=null,gen=0,busy=false,sid="",ui={},last=null,lastAt=0,feedKey="",appRef=null,rosterOpen=false,nar={st:"idle",idx:0,parts:[],g:0};
var ROSTER_PREVIEW=12,FEED_PREVIEW=2,EXPL_CHARS=230,LESSON_CHARS=200,MSG_CHARS=150,PARA_CHARS=420;

/* ---------- styles (scoped to .ecr so nothing else in the app changes) ----------
   Tokens: --acc = gold used for TEXT, --gold = gold used for FILLS (buttons, rings), --onacc = text on a gold fill.
   Sunset (the app default) = plum + gold. Dark = navy + gold. Light = cream + dark gold. */
var CSS=[
".ecr{--bg:#2F102D;--bg2:#411440;--card:rgba(66,20,60,.84);--card2:#652960;--ink:#FDF5E8;--ink2:#DCC6AA;--acc:#F9B81F;--gold:#F9B81F;--gold2:#FFD86B;--line:rgba(244,195,121,.30);--inp:#3A1336;--onacc:#2F102D;--live:#35C779;--rest:#FFAA45;--closed:#F05D64;--conn:#A6A6B2;--speak:#58A6FF;--err:#FF9A9F;--ok:#6FE0A0;--focus:#FFD86B;--shadow:0 2px 10px rgba(0,0,0,.22)}",
"body:not(.sunset):not(.light) .ecr{--bg:#07112F;--bg2:#0B1B49;--card:rgba(16,33,94,.86);--card2:#182A70;--ink:#FFFFFF;--ink2:#B9C6E8;--acc:#F4C542;--gold:#F4C542;--gold2:#FFD86B;--line:rgba(185,198,232,.24);--inp:#0A1740;--onacc:#07112F;--err:#FF8DA0;--ok:#20D6A1;--focus:#FFD86B}",
"body.light .ecr{--bg:#FFF7EE;--bg2:#FBEBD8;--card:rgba(255,255,255,.90);--card2:#FFF1DC;--ink:#2B1A16;--ink2:#6B5448;--acc:#8A5A00;--gold:#F4B521;--gold2:#FFD86B;--line:#E2C9AA;--inp:#FFFFFF;--onacc:#2B1A00;--live:#1B7A45;--rest:#9A5800;--closed:#B3261E;--conn:#6B7280;--speak:#1D5FB0;--err:#B3261E;--ok:#1B7A45;--focus:#8A5A00;--shadow:0 2px 8px rgba(80,50,20,.12)}",
".ecr{box-sizing:border-box;max-width:560px;margin:0 auto;padding:14px 14px calc(100px + env(safe-area-inset-bottom,0px));color:var(--ink);font:16px/1.5 Roboto,'Noto Sans','Segoe UI',sans-serif;overflow-wrap:anywhere}",
".ecr::before{content:\"\";position:fixed;left:0;right:0;top:0;bottom:0;z-index:-1;pointer-events:none;background-color:#2F102D;background-image:linear-gradient(rgba(47,16,45,.25),rgba(47,16,45,.45)),var(--ecr-wallpaper,none);background-size:cover;background-position:center bottom}",
"body.light .ecr::before{background-color:#FFF7EE;background-image:linear-gradient(rgba(255,247,238,.35),rgba(255,247,238,.15)),var(--ecr-wallpaper,none)}",
".ecr *{box-sizing:border-box}.ecr [hidden]{display:none!important}",
".ecr-head{margin:4px 2px 14px}.ecr-head h1{margin:0 0 4px;font-size:22px;line-height:1.25;font-weight:700}.ecr-head p{margin:0;font-size:15px;color:var(--ink2)}",
".ecr-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}",
".ecr-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 2px 14px}.ecr-bar-l{min-width:0}.ecr-bar-l .ecr-kick{margin:0}.ecr-bar-l b{display:block;font-size:20px;line-height:1.25}.ecr-bar-r{display:flex;gap:10px;flex:0 0 auto}",
".ecr-ib{position:relative;display:flex;align-items:center;justify-content:center;width:46px;height:46px;padding:0;border:1.5px solid var(--line);border-radius:50%;background:var(--card);color:var(--acc);cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}.ecr-ib:active{opacity:.8}.ecr-ib svg{width:23px;height:23px}",
".ecr-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--gold);color:var(--onacc);font:700 12px/20px Roboto,'Noto Sans',sans-serif;text-align:center}",
".ecr-card h2{margin:0 0 4px;font-size:19px;line-height:1.3;font-weight:700}",
".ecr-sub{margin:0;font-size:14px;color:var(--ink2)}",
".ecr-kick{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}",
".ecr-ic{display:inline-flex;flex:0 0 auto}.ecr-ic svg{width:18px;height:18px}",
".ecr-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;padding:10px 16px;margin-top:12px;border:1.5px solid var(--gold);border-radius:12px;background:var(--gold);color:var(--onacc);font:600 16px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}",
".ecr-btn.out{background:transparent;color:var(--ink);border-color:var(--line)}",
".ecr-btn.sm{width:auto;flex:1 1 0;min-width:0;min-height:44px;margin-top:0;padding:8px 8px;gap:6px;font-size:15px}.ecr-row .ecr-btn.sm{flex-basis:84px;white-space:nowrap}.ecr-row .ecr-btn.ecr-rd{flex-grow:1.5}",
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
".cal-day{min-width:0;overflow-wrap:normal;word-break:normal;font-size:14px}.cal-day .n{padding:3px 5px;border-radius:10px;white-space:nowrap;line-height:1.1}.cal-day.today .n{background:var(--gold);color:var(--onacc)}",
".cal-day.sel{border-color:var(--gold);background:var(--c-card2)}.cal-day.next{outline:2px dashed var(--gold);outline-offset:-4px}",
".cal-blank{min-height:50px}.cal-dots{display:flex;gap:3px;min-height:7px}",
".cal-dot{display:inline-block;flex:0 0 7px;width:7px;height:7px;border-radius:50%;background:var(--gold)}",
".cal-dot.s-starting_soon{background:var(--c-warn)}.cal-dot.s-live{background:var(--c-live)}.cal-dot.s-completed{background:var(--c-mute)}.cal-dot.s-cancelled,.cal-dot.s-not_held{background:var(--c-bad)}",
".cal-leg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:13px;color:var(--c-ink2)}.cal-leg span{display:inline-flex;align-items:center;gap:6px}",
".cal-it{margin-top:8px;padding:10px 12px;border:1px solid var(--c-line);border-radius:10px;background:var(--c-bg)}",
".cal-chip{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:3px 10px;border:1px solid var(--c-line);border-radius:999px;font-size:13px;font-weight:700}",
".cal-err{margin:12px 0 0;font-size:14px;font-weight:600;color:var(--c-bad)}.cal-load{margin:12px 0 0;font-size:14px;color:var(--c-ink2)}",
/* notifications */
".ecr-nt{margin-top:8px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg2)}.ecr-nt.new{border:2px solid var(--gold)}.ecr-nt b{display:block;font-size:16px;line-height:1.35}.ecr-nt small{display:block;margin-top:2px;font-size:13px;color:var(--ink2)}.ecr-nt span{display:block;margin-top:6px;font-size:15px;white-space:pre-wrap}",
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
"@media (prefers-reduced-motion:reduce){.ecr-spin{animation:none}.ecr-btn:active,.ecr-cat:active{transform:none}}",
".ecr-tc{padding:14px}",
".ecr-tctop{display:flex;align-items:flex-start;gap:12px}",
".ecr-tava{flex:0 0 64px;width:64px;height:64px;border-radius:50%;border:3px solid var(--gold);background:var(--bg2);display:flex;align-items:center;justify-content:center}.ecr-tava svg{width:34px;height:34px}",
".ecr-tava.on{animation:ecrp 1.6s ease-in-out infinite}@keyframes ecrp{0%,100%{box-shadow:0 0 0 0 rgba(249,184,31,.55)}50%{box-shadow:0 0 0 9px rgba(249,184,31,0)}}",
".ecr-ttx{flex:1;min-width:0}.ecr-ttx h2{margin:0 0 6px;font-size:19px;line-height:1.3}.ecr-ttx .ecr-tag{margin:0}",
".ecr-tst{margin:6px 0 0;font-size:13px;font-weight:600;color:var(--ink2)}",
".ecr-pp{flex:0 0 48px;width:48px;height:48px;padding:0;border:1.5px solid var(--gold);border-radius:50%;background:var(--gold);color:var(--onacc);display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}.ecr-pp:active{opacity:.85}.ecr-pp .ecr-ic svg{width:24px;height:24px;fill:currentColor}",
".ecr-tprog{height:5px;margin:12px 0 0;border-radius:3px;background:var(--bg2);overflow:hidden}.ecr-tprog i{display:block;height:100%;width:0;background:var(--gold);transition:width .3s}",
".ecr-expl{margin:14px 0 0;font-size:17px;line-height:1.7}.ecr-expl p{margin:0 0 10px;white-space:pre-wrap}.ecr-expl h3{margin:14px 0 4px;font-size:17px;line-height:1.4;color:var(--acc)}",
".ecr-more{display:flex;justify-content:flex-end}.ecr-more .ecr-btn{margin-top:4px}",
".ecr-seemore{min-height:44px;padding:8px 4px;border:0;background:transparent;color:var(--acc);font:700 16px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}.ecr-seemore:active{opacity:.7}",
".ecr-minb{position:sticky;top:6px;z-index:3;display:flex;justify-content:flex-end;margin:0 0 8px}",
".ecr-pill{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:6px 14px;border:1.5px solid var(--gold);border-radius:999px;background:var(--bg2);color:var(--acc);font:700 15px/1.2 Roboto,'Noto Sans','Segoe UI',sans-serif;cursor:pointer;box-shadow:var(--shadow);-webkit-tap-highlight-color:transparent}.ecr-pill:active{opacity:.8}",
".ecr-qline{margin:0 0 6px;font-size:15px;font-weight:600;color:var(--ink)}",
".ecr-sg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 8px;margin:14px 0 0;padding:0;list-style:none}",
".ecr-sc{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}",
".ecr-sdot{position:relative;display:flex;align-items:center;justify-content:center;width:52px;height:52px;padding:0;border:2.5px solid var(--line);border-radius:50%;background:var(--card2);color:var(--acc);font:700 21px/1 Roboto,'Noto Sans','Segoe UI',sans-serif}",
".ecr-sc.me .ecr-sdot{border-color:var(--gold);background:var(--gold);color:var(--onacc);cursor:pointer;-webkit-tap-highlight-color:transparent}.ecr-sc.me .ecr-sdot:active{opacity:.85}",
".ecr-sc.hand .ecr-sdot{border-color:var(--rest)}.ecr-sc.speaking .ecr-sdot{border-color:var(--speak);box-shadow:0 0 0 3px rgba(88,166,255,.35)}",
".ecr-sbadge{position:absolute;top:-6px;right:-6px;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--rest);color:#2F102D}.ecr-sbadge svg{width:14px;height:14px}",
".ecr-snm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:1.2;font-weight:600;color:var(--ink2)}",
".ecr-pop{position:fixed;left:0;right:0;top:0;bottom:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55)}",
".ecr-popbox{width:100%;max-width:360px;max-height:100%;overflow:auto;padding:16px;border:1.5px solid var(--gold);border-radius:18px;background:var(--bg2);color:var(--ink);box-shadow:0 10px 30px rgba(0,0,0,.4)}",
".ecr-pophd{display:flex;align-items:center;justify-content:space-between;gap:10px}.ecr-pophd h2{margin:0;font-size:19px}.ecr-pophd .ecr-ib{width:40px;height:40px}",
"@media (max-width:329px){.ecr-sg{grid-template-columns:repeat(3,minmax(0,1fr))}}",
"@media (prefers-reduced-motion:reduce){.ecr-tava.on{animation:none}.ecr-tprog i{transition:none}}"
].join("\n");
/* wallpaper: a small copy of the sunset picture is stored inside this file */
var WP="data:image/jpeg;base64,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0ys6ZxYu+Vt9nT53q5de/bw9M31defLn079fFhPffB0mu3DU1nO8a27Scud6OebnpOHPeffPD0l9XPjzru8rWPZnzbN41o4T1TV8++2Y557YTjn0Z1nWZm3tfLpHHv2M8u2cPNn0b6Z8t7wbwzc765V08ivVryd8a338vTOr0zvGul4s67zhQ2rjfTg809PLefO7TWOO7axna54dKQdJprniX0Th1jczZeOvLrvyt5LNdM5i9OWo9HLfnzfRfOs74xzTtHO2OrTnvjTpnPaNa49Ma7a4dM61y6ZjEt1L085fbPHrN9fPCWy51PTfLpv04m5rjrtE4mLm4tZxOuDxXV7cY7cZevPms6XSLeHWW46SOGt89Q0Lm6Xm6c0dOZdykamJe/XzXOu+uUze7l1mppiXcxKqbrF1pedk1Oydc7tbxvz8vVLnz6tufm3N7+bpJiU0ZdOFree+DPTnZdxrN556q471o5umYxbLNawl1LTnKsM0tF6b4M3168es79eOPSbm+U07az0mo2msyRnp5emLnm6y4803npxxrfItkE1K0iPTw0WIjd46Ot55l7XlqXUQy0rM1aiWWZ6KxOtMblll10a5Otl59N7zrnN5Xn11qM3oxvNvOSa46uPFjpz9Hm6Y65ms8u2bJnrgzpTHSbWZEy3KzUGs03Fmi9JcTrpeV7SXnOqsVC6alnTEmujjqXrnnYTomejlnL0885l6zlq51ictTj6OO+mOuM7zcZ64sw1dE0lk6JfPe00znRI1a57tXN1uXGenBNa5breprOrVzvOe248r0eaykZs65hecZ6c85ue3PKvRjnua68+fWM5m9Tlrnd51qYzOrkNMZrq5Le3Tz3N67xWolozsrO1kzotm5cu0l5avI3bkuLE1HKTfOY1jt08uzpnpyly6y55dcVefbn1K59c3O5zOJrriamZFUEWRbJrOl1c3N6zEXWdysds5Xpee5Y6xePWw1049M65dIJnMZmZNc4zrUnTO5c9OfbNubrN1z3iJcNTJnU3jWUz249LGLk1FJvn2I5W63jWUpqMzryKuV6b41rrOm5rlrn1E7cJZjrws3vn0hLqOc7DhmZ3z3O2c1259cavLfMkmtZ56mNZ1jeK3nWY//8QALBAAAgIBAwQCAgMAAwADAAAAAAECERIDECETIDFBIjAyQARCUBQjM2BwoP/aAAgB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";
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
function hush(){try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}if(nar.st==="play"){nar.g++;nar.st="pause";narPaint();}}
function speechParts(t){
  var s=String(t||"").replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,"$1 over $2").replace(/\u00d7/g," times ").replace(/\u00f7/g," divided by ").replace(/=>/g,". ").replace(/=/g," equals ").replace(/\+/g," plus ").replace(/ - /g," minus ").replace(/[()*]/g," ").replace(/-----/g," ");
  return (s.match(/[^.!?\n]+[.!?]?/g)||[]).map(function(p){return p.trim();}).filter(Boolean);
}
function say(t){
  if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined")return false;
  hush();
  speechParts(t).forEach(function(p){var u=new SpeechSynthesisUtterance(p);u.rate=0.9;u.lang="en";speechSynthesis.speak(u);});
  return true;
}
/* Teacher narrator: Play / Pause for the lesson. Pause remembers the sentence, Play continues from it.
   Any other voice (Listen buttons) or leaving the class pauses it, so two voices never talk at once. */
function narPaint(){
  if(!ui||!ui.pp||!inDoc(ui.pp))return;
  var playing=nar.st==="play";
  ui.pp.innerHTML="";ui.pp.appendChild(icon(playing?"pause":"play"));
  var lab=playing?"Pause the lesson":(nar.st==="pause"?"Continue the lesson":"Play the lesson");
  ui.pp.setAttribute("aria-label",lab);ui.pp.title=lab;
  ui.tava.className="ecr-tava"+(playing?" on":"");
  ui.tst.textContent=playing?"Teaching now...":(nar.st==="pause"?"Paused":"Tap play to listen");
  var n=nar.parts.length;
  ui.tbar.style.width=(n&&nar.st!=="idle"?Math.min(100,Math.round((nar.idx+1)/n*100)):0)+"%";
}
function narReset(){nar.g++;nar.st="idle";nar.idx=0;nar.parts=[];narPaint();}
function narPause(){
  nar.g++;nar.st="pause";
  try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}
  narPaint();
}
function narPlay(){
  if(!ui.L)return;
  if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined"){ui.tst.textContent="Voice is not available on this phone.";return;}
  if(nar.st!=="pause"||!nar.parts.length){nar.parts=speechParts(ui.L.spoken.join(". "));nar.idx=0;}
  var parts=nar.parts,n=parts.length;
  if(!n){ui.tst.textContent="Nothing to read yet.";return;}
  hush();
  var g=++nar.g;nar.st="play";
  for(var i=nar.idx;i<n;i++){(function(i){
    var u=new SpeechSynthesisUtterance(parts[i]);u.rate=0.9;u.lang="en";
    u.onstart=function(){if(g!==nar.g)return;nar.idx=i;narPaint();};
    u.onend=function(){if(g!==nar.g)return;if(i===n-1){nar.st="idle";nar.idx=0;nar.parts=[];narPaint();}};
    u.onerror=function(ev){if(g!==nar.g)return;var er=ev&&ev.error;if(er==="canceled"||er==="interrupted")return;nar.g++;nar.st="pause";narPaint();};
    speechSynthesis.speak(u);
  })(i);}
  narPaint();
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
 calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 bell:'<path d="M6 17v-6a6 6 0 0112 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
 spark:'<path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4z"/>',
 pause:'<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>',
 up:'<path d="M6 15l6-6 6 6"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
 close:'<path d="M6 6l12 12M18 6L6 18"/>'
};
function icon(name){var s=h("span","ecr-ic");s.setAttribute("aria-hidden","true");s.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(IC[name]||"")+'</svg>';return s;}
/* button with a small icon and a text label (label span is kept in b.lab so it can change while the request runs) */
function btnI(name,label,cls){
  var b=h("button","ecr-btn"+(cls?" "+cls:""));b.type="button";
  if(name)b.appendChild(icon(name));
  b.lab=h("span",null,label);b.appendChild(b.lab);return b;
}
/* round icon button (calendar, bell). Text for screen readers goes in aria-label. */
function iconBtn(name,label,fn,count){
  var b=h("button","ecr-ib");b.type="button";b.setAttribute("aria-label",label);b.title=label;
  b.appendChild(icon(name));
  if(count>0){var c=h("span","ecr-badge",count>9?"9+":String(count));c.setAttribute("aria-hidden","true");b.appendChild(c);b.setAttribute("aria-label",label+", "+count+" new");}
  b.onclick=fn;return b;
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
  var b1=btnI("play","Listen","out sm"),b2=btnI("stop","Stop","out sm");
  b1.onclick=function(){msgEl.className="ecr-msg err";msgEl.textContent="";var t=getText();if(!t){msgEl.textContent="Nothing to read yet.";return;}if(!say(t))msgEl.textContent="Voice is not available on this phone.";};
  b2.onclick=function(){hush();msgEl.textContent="";};
  row.appendChild(b1);row.appendChild(b2);return row;
}

function micStop(){
  try{if(ui&&ui.rec){var r=ui.rec;ui.rec=null;r.onend=null;r.stop();}}catch(e){}
  if(ui&&ui.mic&&inDoc(ui.mic))setLab(ui.mic,"Mic");
}
function micToggle(){
  ui.msg.className="ecr-msg err";ui.msg.textContent="";
  if(ui.rec){micStop();return;}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ui.msg.textContent="Voice typing is not available on this phone. Please type your question.";return;}
  hush();
  var r,base=ui.q.value.trim();
  try{r=new SR();}catch(e){ui.msg.textContent="Voice typing is not available on this phone. Please type your question.";return;}
  r.lang="en-GB";r.interimResults=true;r.continuous=false;
  r.onresult=function(ev){
    var t="";for(var i=0;i<ev.results.length;i++)t+=ev.results[i][0].transcript;
    ui.q.value=((base?base+" ":"")+t).slice(0,300);ui.ask.disabled=busy||!ui.q.value.trim();
  };
  r.onerror=function(ev){
    var er=ev&&ev.error;ui.msg.className="ecr-msg err";
    ui.msg.textContent=(er==="not-allowed"||er==="service-not-allowed")?"The microphone is not allowed. Please type your question.":(er==="no-speech"?"I did not hear anything. Tap Mic and try again.":"Voice typing stopped. Please try again or type.");
  };
  r.onend=function(){ui.rec=null;if(ui&&ui.mic&&inDoc(ui.mic))setLab(ui.mic,"Mic");};
  ui.rec=r;setLab(ui.mic,"Stop mic");
  try{r.start();}catch(e){ui.rec=null;setLab(ui.mic,"Mic");ui.msg.textContent="Voice typing could not start. Please type your question.";}
}
function stop(){gen++;hush();micStop();narReset();if(timer){clearTimeout(timer);timer=null;}if(tick){clearInterval(tick);tick=null;}if(calTick){clearInterval(calTick);calTick=null;}cal=null;}
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
var cal=null,calTick=null,pendingDay="",wantCal=false;

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
  var b=btn(n>0?"Notifications ("+n+" new)":"Notifications","out");
  b.style.marginTop="0";b.style.marginBottom="12px";
  b.onclick=function(){notesView(box);};
  box.appendChild(b);
}
function notesView(box){
  box.className="ecr";box.innerHTML="";
  box.appendChild(pageHead("Notifications","Class reminders and changes for your level."));
  var holder=h("div");box.appendChild(holder);
  holder.appendChild(loadingCard("Loading notifications..."));
  var back=btn("Back to the classroom","out");
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
          wantCal=!!pendingDay;
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
  stop();ui={};feedKey="";last=null;sid="";appRef=app;rosterOpen=false;busy=false;wantCal=false;
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
  if(window.__eduOpenCal){window.__eduOpenCal=0;wantCal=true;}
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
  if(!d.level){wantCal=false;levelPicker(box,"",false);return;}
  if(wantCal){wantCal=false;calView(box,d.level,function(){loadOpen(box);});return;}
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
    if(canGoBack){var bk=btn("Back","out");bk.onclick=function(){loadOpen(box);};box.appendChild(bk);}
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
    var bk=btn("Back","out");bk.onclick=cats;box.appendChild(bk);
  }
  cats();
}
/* top bar of the no-class and join screens: level on the left, calendar and notifications icons on the right */
function topBar(box,level,openCal){
  var bar=h("div","ecr-bar");
  var l=h("div","ecr-bar-l");l.appendChild(h("p","ecr-kick","AI Classroom"));l.appendChild(h("b",null,levelName(level)));
  var r=h("div","ecr-bar-r");
  r.appendChild(iconBtn("calendar","Class timetable and notifications",openCal,window.eduNotesCount||0));
  bar.appendChild(l);bar.appendChild(r);box.appendChild(bar);
}
/* the timetable opens on its own page, so the main screen stays clean */
function calView(box,level,back){
  box.className="ecr";box.innerHTML="";
  var top=h("div","ecr-sh-top");var b=btnI("back","Back","out");b.onclick=back;top.appendChild(b);box.appendChild(top);
  var holder=h("div");box.appendChild(holder);
  calendarCard(box,level);
  notesTop(box,holder);
}
/* newest class notifications (unread first, at most 3) shown above the timetable.
   The unread ones count as read as soon as they are on screen, so the red number goes away. */
function notesTop(box,holder){
  post(plain("notes"),{}).then(function(d){
    if(!inDoc(holder)||!d||d.ok!==true)return;
    var items=d.items||[];
    if(!items.length)return;
    var unread=items.filter(function(i){return !i.read_at;});
    var read=items.filter(function(i){return !!i.read_at;});
    var show=unread.concat(read).slice(0,3);
    var c=h("section","ecr-card");c.setAttribute("aria-label","Class notifications");
    c.appendChild(h("p","ecr-kick",unread.length?"Class notification":"Recent class notifications"));
    show.forEach(function(it){
      var isNew=!it.read_at;
      var n=h("div","ecr-nt"+(isNew?" new":""));
      n.appendChild(h("b",null,clean(it.title)||"Notification"));
      n.appendChild(h("small",null,(isNew?"New \u00b7 ":"")+stamp(it.created_at)));
      if(it.body)n.appendChild(h("span",null,clean(it.body)));
      c.appendChild(n);
    });
    var all=btn("See all notifications","out");all.style.marginTop="10px";
    all.onclick=function(){notesView(box);};
    c.appendChild(all);
    holder.appendChild(c);
    if(unread.length){
      var ids=unread.slice(0,50).map(function(i){return i.id;});
      post(plain("noteread"),{ids:ids}).then(function(){badgeSync();});
    }
  });
}
function noClass(box,level,checked){
  var again=function(){box.className="ecr";box.innerHTML="";noClass(box,level,false);};
  topBar(box,level,function(){calView(box,level,again);});
  var c=h("div","ecr-card");
  var ch=h("span","ecr-chip");ch.appendChild(h("span","ecr-dot closed"));ch.appendChild(h("span",null,"No class open"));c.appendChild(ch);
  c.appendChild(h("h2",null,"No class is open right now")).style.marginTop="12px";
  c.appendChild(h("p","ecr-sub","Your level: "+levelName(level)+". Tap the calendar icon at the top to see your next class."));
  var note=h("div","ecr-msg",checked?"Checked just now. Still no class is open for your level.":"");note.setAttribute("role","status");
  var b1=btn("Check again"),b2=btn("Change level","out");
  b1.onclick=function(){
    b1.disabled=true;b2.disabled=true;b1.textContent="";b1.appendChild(h("span","ecr-spin"));b1.appendChild(document.createTextNode("Checking..."));
    post(plain("open"),{}).then(function(d){if(inDoc(box))route(box,d,true);});
  };
  b2.onclick=function(){box.innerHTML="";levelPicker(box,level,true);};
  c.appendChild(b1);c.appendChild(b2);c.appendChild(note);box.appendChild(c);
  if(wantCal){wantCal=false;calView(box,level,again);}
}
function joinCard(box,d){
  var again=function(){box.className="ecr";box.innerHTML="";joinCard(box,d);};
  topBar(box,d.level,function(){calView(box,d.level,again);});
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
  var b2=btn("Change level","out");
  b2.onclick=function(){box.innerHTML="";levelPicker(box,d.level,true);};
  c.appendChild(go);c.appendChild(b2);c.appendChild(msg);box.appendChild(c);
  if(wantCal){wantCal=false;calView(box,d.level,again);}
}
function enter(box,d){
  pendingDay="";wantCal=false;
  box.className="ecr live";box.innerHTML="";
  var cls=h("div");box.appendChild(cls);
  build(cls,d);
  start();
}

/* ---------- live class screen (v5.0) ----------
   Main view = header, live teacher (Play / Pause, first paragraph, See more / Minimize), Examples and Practice folds,
   Questions & Responses, Students (round heads). Your own round head opens a small box: Raise Hand, Mic, typing box.
   Detail views (full explanation, full conversation, all students) replace the main view while open.
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
  var top=h("div","ecr-sh-top");var b1=btnI("back","Back to classroom","out");b1.onclick=closeSheet;top.appendChild(b1);ui.sheet.appendChild(top);
  var hd=h("h2","ecr-sh-h",title);hd.tabIndex=-1;ui.sheet.appendChild(hd);
  var body=h("div");ui.sheet.appendChild(body);
  fill(body);
  var b2=btnI("back","Back to classroom","out");b2.onclick=closeSheet;ui.sheet.appendChild(b2);
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


/* teacher explanation: split into paragraphs; a short line ending with ":" is a sub-heading (Definition:, Factors:, Importance:) */
function isHead(s){s=String(s||"").trim();return s.length>0&&s.length<=70&&/:$/.test(s);}
function paras(text){
  var out=[];
  String(text||"").split(/\n\s*\n/).forEach(function(blk){
    blk=blk.trim();if(!blk)return;
    var lines=blk.split("\n");
    if(lines.length>1&&isHead(lines[0])){out.push({t:lines[0].trim(),head:true});blk=lines.slice(1).join("\n").trim();}
    if(!blk)return;
    if(blk.indexOf("\n")<0&&isHead(blk)){out.push({t:blk,head:true});return;}
    out.push({t:blk,head:false});
  });
  return out;
}
function pill(name,label,fn){
  var b=h("button","ecr-pill");b.type="button";b.appendChild(icon(name));b.appendChild(h("span",null,label));b.onclick=fn;return b;
}
function minimize(L){
  ui.expanded=false;paintExpl(L);
  try{ui.tc.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}
}
function paintExpl(L){
  var all=paras(L.text);
  ui.expl.innerHTML="";ui.moreRow.innerHTML="";
  if(!all.length){ui.expl.appendChild(h("p",null,"The lesson notes are not ready yet."));return;}
  if(ui.expanded){
    var mb=h("div","ecr-minb");mb.appendChild(pill("up","Minimize",function(){minimize(L);}));ui.expl.appendChild(mb);
    all.forEach(function(it){ui.expl.appendChild(it.head?h("h3",null,it.t):h("p",null,it.t));});
    var m2=btnI("up","Minimize","out");m2.onclick=function(){minimize(L);};ui.moreRow.appendChild(m2);
    ui.moreRow.style.display="block";
  }else{
    var cut=false;
    for(var i=0;i<all.length;i++){
      var it=all[i];
      if(it.head){ui.expl.appendChild(h("h3",null,it.t));continue;}
      var p=prev(it.t,PARA_CHARS);
      ui.expl.appendChild(h("p",null,p.t));
      cut=p.cut||i<all.length-1;break;
    }
    ui.moreRow.style.display="flex";
    if(cut){
      var sm=h("button","ecr-seemore","See more...");sm.type="button";sm.setAttribute("aria-expanded","false");
      sm.onclick=function(){ui.expanded=true;paintExpl(L);};
      ui.moreRow.appendChild(sm);
    }
  }
}

/* your own round head opens the small box (Raise Hand, Mic, typing box) */
function openPop(){
  if(!ui.pop)return;
  ui.pop.hidden=false;
  try{(ui.askBox.style.display!=="none"?ui.q:(ui.raise.style.display!=="none"?ui.raise:ui.lower)).focus({preventScroll:true});}catch(e){}
}
function closePop(){
  if(!ui.pop||ui.pop.hidden)return;
  micStop();ui.pop.hidden=true;
  try{if(ui.meBtn&&inDoc(ui.meBtn))ui.meBtn.focus({preventScroll:true});}catch(e){}
}
function studentEl(r){
  var s=(LABEL[r.status]&&r.status!=="disconnected")?r.status:"listening";
  var nm=r.name||"Student";
  var li=h("li","ecr-sc "+s+(r.me?" me":""));
  var dot=r.me?h("button","ecr-sdot"):h("span","ecr-sdot");
  if(r.me){
    dot.type="button";
    dot.setAttribute("aria-label","Your round head, "+LABEL[s]+". Tap to raise your hand or ask a question.");
    dot.onclick=openPop;ui.meBtn=dot;
  }else{li.setAttribute("aria-label",nm+", "+LABEL[s]);}
  dot.appendChild(document.createTextNode(nm.charAt(0).toUpperCase()));
  if(s==="hand"){var bd=h("span","ecr-sbadge");bd.setAttribute("aria-hidden","true");bd.appendChild(icon("hand"));dot.appendChild(bd);}
  var n=h("span","ecr-snm",r.me?"You":nm.split(/\s+/)[0]);n.title=nm;n.setAttribute("aria-hidden","true");
  li.appendChild(dot);li.appendChild(n);
  return li;
}

function build(cls,d){
  cls.innerHTML="";
  var L=lessonData(d.lesson);ui.L=L;ui.latestText="";ui.byText="";ui.refresh=null;ui.kind="";ui.expanded=false;ui.meS="";ui.rkey="";ui.meBtn=null;ui.rec=null;
  narReset();
  ui.main=h("div","ecr-live");
  ui.sheet=h("div","ecr-sheet");ui.sheet.hidden=true;
  cls.appendChild(ui.main);cls.appendChild(ui.sheet);
  var M=ui.main,A=h("div","ecr-colA"),B=h("div","ecr-colB");

  /* 1. header: level, session title, status, time and usage */
  var hd=h("section","ecr-card ecr-hd");hd.setAttribute("aria-label","Class status");
  var tx=h("div","ecr-hdtx");
  tx.appendChild(h("p","ecr-kick","AI Classroom"));
  tx.appendChild(h("b",null,"AI Teacher \u00b7 "+levelName(d.level)));
  ui.title=h("div","ecr-sub");ui.title.textContent=clean(d.title||"");tx.appendChild(ui.title);
  var chip=h("span","ecr-chip");
  var dot=h("span","ecr-dot conn"),st=h("span",null,"Connecting...");
  st.setAttribute("role","status");
  chip.appendChild(dot);chip.appendChild(st);tx.appendChild(chip);
  hd.appendChild(tx);
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

  /* 2. live teacher: picture, subject title, explanation, Play / Pause, See more / Minimize */
  if(!L){
    var c0=ord(h("section","ecr-card"),1);c0.appendChild(h("h2",null,"Lesson"));c0.appendChild(h("p","ecr-sub","The lesson notes are not ready yet."));A.appendChild(c0);
  }else{
    var tc=ord(h("section","ecr-card ecr-tc"),1);tc.setAttribute("aria-label","Live teacher");ui.tc=tc;
    var tt=h("div","ecr-tctop");
    ui.tava=h("div","ecr-tava");ui.tava.innerHTML=capSvg();
    var ttx=h("div","ecr-ttx");
    ttx.appendChild(h("p","ecr-kick","Live teacher"));
    ttx.appendChild(h("h2",null,L.title));
    ttx.appendChild(h("span","ecr-tag",L.label));
    ui.tst=h("p","ecr-tst");ui.tst.setAttribute("role","status");ttx.appendChild(ui.tst);
    ui.pp=h("button","ecr-pp");ui.pp.type="button";
    ui.pp.onclick=function(){if(nar.st==="play")narPause();else narPlay();};
    tt.appendChild(ui.tava);tt.appendChild(ttx);tt.appendChild(ui.pp);tc.appendChild(tt);
    var pg=h("div","ecr-tprog");ui.tbar=h("i");pg.appendChild(ui.tbar);tc.appendChild(pg);
    ui.expl=h("div","ecr-expl");tc.appendChild(ui.expl);
    ui.moreRow=h("div","ecr-more");tc.appendChild(ui.moreRow);
    paintExpl(L);narPaint();
    A.appendChild(tc);
    if(L.ex.length)A.appendChild(ord(fold("ecr-ex","spark","Examples",L.ex.length,"Real-life examples from the lesson.","View examples","Hide examples",fillExamples(L)),2));
    if(L.pq.length)A.appendChild(ord(fold("ecr-pq","list","Practice questions",L.pq.length,"Test your understanding.","Open questions","Close questions",fillPractice(L)),3));
  }

  /* 3. questions and responses: small explanation for the latest question, then two buttons */
  var c4=ord(h("section","ecr-card"),4);ui.c4=c4;c4.setAttribute("aria-label","Questions and responses");
  c4.appendChild(h("h2",null,"Questions & Responses"));
  c4.appendChild(h("p","ecr-sub","Answers from the AI Teacher, shared with the whole class."));
  ui.by=h("p","ecr-by");ui.by.style.marginTop="10px";c4.appendChild(ui.by);
  ui.qline=h("p","ecr-qline");c4.appendChild(ui.qline);
  ui.latest=h("p","ecr-prev");c4.appendChild(ui.latest);
  ui.readMore=btnI("book","See explanation from the teacher","out");ui.readMore.hidden=true;
  ui.readMore.onclick=function(){openSheet(ui.readMore,"Latest explanation","explain",fillExplainSheet);};
  c4.appendChild(ui.readMore);
  var lm=h("div","ecr-msg err");lm.setAttribute("role","status");
  c4.appendChild(listenRow(function(){return ui.latestText||"";},lm));c4.appendChild(lm);
  ui.feedMore=btnI("chat","See all questions and answers","out");ui.feedMore.hidden=true;
  ui.feedMore.onclick=function(){openSheet(ui.feedMore,"All questions and answers","conv",fillConvSheet);};
  c4.appendChild(ui.feedMore);
  ui.note=h("div","ecr-msg ok");ui.note.setAttribute("role","status");c4.appendChild(ui.note);
  B.appendChild(c4);

  /* 4. students: round heads with letters (active students only); the gold one is you */
  var c5=ord(h("section","ecr-card"),5);c5.setAttribute("aria-label","Students");
  var rh=h("div");rh.style.cssText="display:flex;align-items:baseline;justify-content:space-between;gap:8px";
  rh.appendChild(h("h2",null,"Students"));ui.rcount=h("span","ecr-sub");rh.appendChild(ui.rcount);c5.appendChild(rh);
  ui.speaker=h("p","ecr-sub");c5.appendChild(ui.speaker);
  c5.appendChild(h("p","ecr-sub","Tap your gold round head to raise your hand or ask a question."));
  ui.roster=h("ul","ecr-sg");ui.roster.setAttribute("aria-label","Students in this class");c5.appendChild(ui.roster);
  ui.more=btnI("people","View all students","out");ui.more.hidden=true;
  ui.more.onclick=function(){openSheet(ui.more,"All students","roster",fillRosterSheet);};
  c5.appendChild(ui.more);
  B.appendChild(c5);

  M.appendChild(A);M.appendChild(B);

  /* 5. small box that opens from your own round head: Raise Hand, Mic, typing box.
        It sits outside the cards on purpose, so it covers the whole screen. */
  ui.pop=h("div","ecr-pop");ui.pop.hidden=true;ui.pop.setAttribute("role","dialog");ui.pop.setAttribute("aria-modal","true");ui.pop.setAttribute("aria-label","Your turn");
  var pb=h("div","ecr-popbox");
  var ph=h("div","ecr-pophd");
  ui.turnH=h("h2",null,"Your turn");
  var px=h("button","ecr-ib");px.type="button";px.setAttribute("aria-label","Close");px.title="Close";px.appendChild(icon("close"));px.onclick=closePop;
  ph.appendChild(ui.turnH);ph.appendChild(px);pb.appendChild(ph);
  ui.mine=h("p","ecr-big");pb.appendChild(ui.mine);
  ui.hint=h("p","ecr-sub");pb.appendChild(ui.hint);
  ui.raise=btnI("hand","Raise Hand","sm");
  ui.lower=btnI("hand","Lower Hand","out sm");ui.lower.style.display="none";
  ui.mic=btnI("mic","Mic","out sm");ui.mic.disabled=true;ui.mic.onclick=micToggle;
  var rw=h("div","ecr-row");rw.appendChild(ui.raise);rw.appendChild(ui.lower);rw.appendChild(ui.mic);pb.appendChild(rw);
  ui.askBox=h("div");ui.askBox.style.display="none";
  var ql=h("label","ecr-lab","Your question");ql.htmlFor="ecr-q";
  ui.q=h("textarea","ecr-field");ui.q.id="ecr-q";ui.q.maxLength=300;ui.q.rows=3;ui.q.placeholder="Type your question about the lesson...";ui.q.autocomplete="off";
  ui.ask=btnI("spark","Send to the AI Teacher");ui.ask.disabled=true;
  ui.done=btn("I Am Done","out");
  ui.askBox.appendChild(ql);ui.askBox.appendChild(ui.q);ui.askBox.appendChild(ui.ask);ui.askBox.appendChild(ui.done);
  pb.appendChild(ui.askBox);
  ui.msg=h("div","ecr-msg");ui.msg.setAttribute("role","status");pb.appendChild(ui.msg);
  ui.pop.appendChild(pb);cls.appendChild(ui.pop);
  ui.pop.onclick=function(e){if(e.target===ui.pop)closePop();};
  ui.pop.onkeydown=function(e){if(e.key==="Escape")closePop();};
  ui.raise.onclick=function(){act("raise");};
  ui.lower.onclick=function(){act("lower");};
  ui.done.onclick=function(){act("lower");};
  ui.ask.onclick=askNow;
  ui.q.oninput=function(){ui.ask.disabled=busy||!ui.q.value.trim();};
  narPaint();
}

function secs(n){n=Math.max(0,Math.floor(n));var m=Math.floor(n/60),s=n%60;return m+":"+(s<10?"0":"")+s;}
var LABEL={listening:"Listening",hand:"Hand raised",speaking:"Speaking",disconnected:"Disconnected"};

function paintExplain(items){
  if(items.length){
    ui.latestText=clean(items[0].answer);
    var t=whenOf(items[0].at);
    ui.byText=items[0].by?("Answering "+items[0].by+(t?" \u00b7 "+t:"")):"";
    var p=prev(ui.latestText,EXPL_CHARS);
    ui.latest.textContent=p.t;ui.readMore.hidden=false;
    var q=prev(items[0].question||"",120);
    ui.qline.textContent=q.t?("Question: "+q.t):"";ui.qline.hidden=!q.t;
  }else{
    ui.latestText="";ui.byText="";
    ui.latest.textContent="No explanation yet. Tap your gold round head and raise your hand to ask a question.";ui.readMore.hidden=true;
    ui.qline.textContent="";ui.qline.hidden=true;
  }
  ui.by.textContent=ui.byText;ui.by.hidden=!ui.byText;
}
function paintFeed(items){
  ui.feedMore.hidden=!items.length;
  setLab(ui.feedMore,"See all questions and answers ("+items.length+")");
}
function paintRoster(d){
  ui.speaker.textContent=d.speaker?("Now speaking: "+d.speaker):"";ui.speaker.hidden=!d.speaker;
  var all=d.roster||[];
  var key=(d.speaker||"")+"|"+((d.me&&d.me.status)||"")+"|"+all.map(function(r){return (r.name||"")+":"+r.status+(r.me?":me":"");}).join(",");
  if(key===ui.rkey)return;ui.rkey=key;
  var me=null;all.forEach(function(r){if(r.me)me=r;});
  if(!me)me={name:"Me",me:true,status:(d.me&&d.me.status)||"listening"};
  var act=all.filter(function(r){return !r.me&&r.status!=="disconnected";});
  var shown=[me].concat(act.slice(0,ROSTER_PREVIEW-1));
  act.slice(ROSTER_PREVIEW-1).forEach(function(r){if(r.status==="speaking"||r.status==="hand")shown.push(r);});
  ui.rcount.textContent=(act.length+1)+" active";
  ui.roster.innerHTML="";
  shown.forEach(function(r){ui.roster.appendChild(studentEl(r));});
  ui.more.hidden=all.length<=shown.length;
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
  /* your turn (this lives in the small box that opens from your own round head) */
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
  ui.mic.disabled=me.status!=="speaking";
  if(me.status!=="speaking")micStop();
  if(me.status==="hand"){
    ui.turnH.textContent="Your hand is raised";
    ui.mine.textContent="You are number "+me.position+" in line";ui.mine.style.display="block";
    ui.hint.textContent="Please wait. The AI Teacher will give you a turn.";
  }else if(me.status==="speaking"){
    ui.turnH.textContent="It's your turn!";
    ui.mine.style.display="block";
    ui.hint.textContent="Type your question, or tap Mic and speak it.";
  }else{
    ui.turnH.textContent="Your turn";
    ui.mine.textContent="";ui.mine.style.display="none";
    ui.hint.textContent=why||"Raise your hand to join the line. When it is your turn you can type your question or use the Mic.";
  }
  var was=ui.meS;ui.meS=me.status;
  if(me.status==="speaking"&&was!=="speaking")openPop();
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
    setLab(ui.ask,"Send to the AI Teacher");ui.ask.disabled=!ui.q.value.trim();
    if(d&&d.ok){ui.q.value="";ui.ask.disabled=true;ui.msg.className="ecr-msg ok";ui.msg.textContent="Answer added.";}
    else{ui.msg.className="ecr-msg err";ui.msg.textContent=(d&&d.error)||"Something went wrong.";}
    pollNow(function(){if(d&&d.ok){closePop();ui.note.textContent="Your answer was added. It is shown above.";setTimeout(function(){if(alive())ui.note.textContent="";},10000);try{ui.c4.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}}});
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
window.EduClassroom={open:openScreen,stop:stop,openCalendar:function(app){window.__eduOpenCal=1;openScreen(app);}};
})();
