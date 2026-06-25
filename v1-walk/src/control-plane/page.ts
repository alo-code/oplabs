// page.ts — the non-engineer surface: one self-contained HTML page, no build, no framework.
// ONE primary action — "Create Report" — fetches every healthy source into shared memory, refreshes
// the activity feed, then renders a grounded executive summary (every line links to a real
// artifact). Auto-refreshes; the embedded script uses no backticks (it lives in a TS template).

export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Beacon — control plane</title>
<style>
  :root {
    --ink:#0b0b0c; --body:#1d1f23; --muted:#6b7280; --faint:#9aa1ab;
    --line:#e8e9ec; --line2:#f1f2f4; --bg:#f7f8fa; --card:#ffffff;
    --red:#FF0420; --ok:#0a7d28; --okbg:#e7f6ec; --downbg:#fdecee;
    --shadow:0 1px 2px rgba(16,18,22,.04), 0 1px 3px rgba(16,18,22,.06);
  }
  * { box-sizing:border-box; }
  html,body { margin:0; }
  body { font:14.5px/1.55 -apple-system,BlinkMacSystemFont,"Inter","Helvetica Neue",Arial,sans-serif; color:var(--body); background:var(--bg); -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }

  .topbar { position:sticky; top:0; z-index:10; display:flex; align-items:center; gap:12px; padding:14px 24px; background:rgba(255,255,255,.85); backdrop-filter:saturate(1.4) blur(8px); border-bottom:1px solid var(--line); }
  .brand { font-size:19px; font-style:italic; font-weight:700; letter-spacing:-.02em; color:var(--ink); }
  .brand .v { font-style:normal; font-weight:600; color:var(--red); }
  .topbar .role { color:var(--muted); font-size:13px; }
  .topbar .spacer { flex:1; }
  .live { display:inline-flex; align-items:center; gap:7px; font-size:12.5px; color:var(--muted); }
  .live .dot { width:8px; height:8px; border-radius:50%; background:var(--ok); animation:pulse 2s infinite; }
  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(10,125,40,.45);} 70%{box-shadow:0 0 0 6px rgba(10,125,40,0);} 100%{box-shadow:0 0 0 0 rgba(10,125,40,0);} }
  .pill { font-size:12px; font-weight:600; color:var(--ink); background:#fff; border:1px solid var(--line); border-radius:999px; padding:3px 11px; }
  .pill.db { border-color:#f3c6cb; color:var(--red); }

  main { max-width:1060px; margin:0 auto; padding:22px 24px 64px; }
  .sec-head { font-size:12px; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); font-weight:700; margin:26px 2px 12px; }
  .sec-head .muted { text-transform:none; letter-spacing:0; font-weight:500; }
  .count { color:var(--faint); font-weight:600; }
  .muted { color:var(--muted); } .faint { color:var(--faint); }

  /* hero CTA */
  .hero { display:flex; align-items:center; gap:18px; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px 20px; box-shadow:var(--shadow); margin-top:6px; }
  .cta { font:inherit; font-size:15px; font-weight:700; color:#fff; background:var(--red); border:0; border-radius:10px; padding:13px 22px; cursor:pointer; display:inline-flex; align-items:center; gap:9px; transition:filter .15s, transform .05s; white-space:nowrap; }
  .cta:hover { filter:brightness(1.06); } .cta:active { transform:translateY(1px); }
  .cta:disabled { cursor:default; }
  .cta.loading::before { content:""; width:15px; height:15px; border:2px solid rgba(255,255,255,.45); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .herotext .t { font-weight:650; color:var(--ink); }
  .herotext .s { color:var(--muted); font-size:13px; margin-top:2px; }

  /* executive summary */
  #summary { margin-top:18px; transition:opacity .2s; }
  #summary.loading { opacity:.5; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow); }
  .empty { padding:20px; color:var(--faint); }
  .report { overflow:hidden; }
  .rhead { padding:16px 18px 12px; border-bottom:1px solid var(--line2); }
  .rtitle { font-size:17px; font-weight:700; color:var(--ink); letter-spacing:-.01em; }
  .rmeta { color:var(--faint); font-size:12.5px; margin-top:3px; }
  .narrative { padding:14px 18px; color:var(--body); border-bottom:1px solid var(--line2); background:#fcfcfd; }
  .rsection { padding:12px 18px; border-bottom:1px solid var(--line2); }
  .rsection:last-child { border-bottom:0; }
  .rh { font-size:12.5px; font-weight:700; color:var(--ink); margin-bottom:8px; }
  a.rb { display:flex; align-items:flex-start; gap:9px; padding:5px 0; color:var(--body); }
  a.rb:hover .rbt { text-decoration:underline; text-decoration-color:var(--line); }
  .rbt { flex:1; } .rb .ext { color:var(--faint); }
  .rmore { color:var(--faint); font-size:12.5px; padding:4px 0 0 2px; }
  .rfoot { padding:11px 18px; color:var(--faint); font-size:12px; background:#fcfcfd; }
  .report.held { border-color:#f3c6cb; }
  .report.held .rtitle { color:var(--red); }
  .vlist { margin:8px 0 0 18px; padding:0; } .vlist li { margin:2px 0; }

  /* connectors (health only — no per-source buttons) */
  .conns { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
  @media (max-width:820px){ .conns{ grid-template-columns:repeat(2,1fr); } }
  .conn { display:flex; align-items:center; gap:9px; background:var(--card); border:1px solid var(--line); border-radius:11px; padding:11px 13px; box-shadow:var(--shadow); }
  .conn .hdot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
  .conn .hdot.ok { background:var(--ok); } .conn .hdot.down { background:var(--faint); }
  .conn .name { font-weight:650; color:var(--ink); font-size:13.5px; }
  .conn .detail { color:var(--faint); font-size:11.5px; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  .badge { flex:0 0 auto; font-size:10.5px; font-weight:700; border-radius:6px; padding:3px 7px; margin-top:1px; }
  .badge.gh { background:#0d1117; color:#fff; } .badge.op { background:var(--red); color:#fff; }
  .badge.slack { background:#4a154b; color:#fff; } .badge.notion { background:#111; color:#fff; } .badge.monday { background:#fdab3d; color:#111; } .badge.gen { background:var(--line2); color:var(--muted); }

  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  @media (max-width:720px){ .stats{ grid-template-columns:repeat(2,1fr); } }
  .stat { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:13px 15px; box-shadow:var(--shadow); }
  .stat .n { font-size:21px; font-weight:700; color:var(--ink); }
  .stat .l { font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--faint); margin-top:2px; }

  .cols { display:grid; grid-template-columns:1.35fr 1fr; gap:24px; }
  @media (max-width:820px){ .cols{ grid-template-columns:1fr; } }
  .list { background:var(--card); border:1px solid var(--line); border-radius:12px; box-shadow:var(--shadow); overflow:hidden; }
  .item { display:flex; align-items:flex-start; gap:11px; padding:11px 14px; border-bottom:1px solid var(--line2); }
  .item:last-child { border-bottom:0; }
  a.item:hover { background:#fafbfc; }
  .item .label { color:var(--ink); font-weight:500; }
  a.item:hover .label { text-decoration:underline; text-decoration-color:var(--line); }
  .item .meta { color:var(--faint); font-size:12px; margin-top:2px; }
  .item .ext { margin-left:auto; color:var(--faint); font-size:12px; align-self:center; }
  .runi { display:flex; align-items:center; gap:9px; padding:11px 14px; border-bottom:1px solid var(--line2); font-size:13px; }
  .runi:last-child { border-bottom:0; }
  .tag { font-size:10.5px; font-weight:700; border-radius:6px; padding:2px 7px; }
  .tag.ok { background:var(--okbg); color:var(--ok); } .tag.err { background:var(--downbg); color:var(--red); }
  .runi .c { font-weight:650; color:var(--ink); } .runi .n { color:var(--muted); } .runi .t { margin-left:auto; color:var(--faint); font-size:12px; }
  footer { margin-top:30px; padding-top:16px; border-top:1px solid var(--line); color:var(--faint); font-size:12.5px; }

  .connect-btn { font:inherit; font-size:11.5px; font-weight:600; color:var(--red); background:#fff; border:1px solid #f3c6cb; border-radius:7px; padding:4px 9px; cursor:pointer; margin-left:auto; white-space:nowrap; }
  .connect-btn:hover { background:#fff5f6; }
  .addsvc { font:inherit; font-size:12.5px; font-weight:600; color:var(--ink); background:#fff; border:1px solid var(--line); border-radius:8px; padding:5px 11px; cursor:pointer; margin-left:auto; }
  .addsvc:hover { border-color:var(--ink); }
  .modal { position:fixed; inset:0; background:rgba(11,11,12,.42); display:flex; align-items:center; justify-content:center; z-index:60; }
  .sheet { background:#fff; width:430px; max-width:calc(100vw - 32px); border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.28); padding:20px; }
  .sheet-h { font-size:16px; font-weight:700; color:var(--ink); }
  .sheet-sub { color:var(--muted); font-size:13px; margin-top:3px; }
  .fl { display:block; font-size:12px; font-weight:600; color:var(--muted); margin:13px 2px 5px; }
  .sheet input, .sheet select { width:100%; font:inherit; font-size:13.5px; padding:9px 11px; border:1px solid var(--line); border-radius:8px; background:#fff; }
  .sheet input:focus, .sheet select:focus { outline:none; border-color:var(--ink); }
  .hint { font-size:12px; color:var(--muted); margin:6px 2px 0; } .hint a { color:var(--red); text-decoration:underline; }
  .sheet-note { font-size:11.5px; color:var(--faint); margin-top:14px; line-height:1.5; }
  .sheet-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }
  .btn { font:inherit; font-size:13px; font-weight:600; border-radius:8px; padding:9px 16px; cursor:pointer; border:1px solid var(--line); background:#fff; color:var(--ink); }
  .btn.primary { background:var(--red); color:#fff; border:0; } .btn:disabled { opacity:.6; cursor:default; }
  .sheet-msg { font-size:12.5px; margin-top:10px; min-height:16px; }
  .sheet-msg.ok { color:var(--ok); } .sheet-msg.err { color:var(--red); }
</style>
</head>
<body>
<div class="topbar">
  <span class="brand">Beacon<span class="v">·</span></span>
  <span class="role">control plane</span>
  <span class="spacer"></span>
  <span class="live"><span class="dot"></span> live · auto-refresh</span>
  <span class="pill" id="fixtures" style="display:none; border-color:#f3c6cb; color:var(--red);">demo data</span>
  <span class="pill db" id="backend">…</span>
</div>

<main>
  <section class="hero">
    <button id="report" class="cta">Create Report</button>
    <div class="herotext">
      <div class="t">Weekly executive brief</div>
      <div class="s" id="reportstatus">Fetches every source → updates the activity feed → writes a grounded summary.</div>
    </div>
  </section>

  <section id="summary"></section>

  <div class="sec-head" style="display:flex; align-items:center;">Sources <span class="muted" style="margin-left:6px">— what Beacon read, and is it healthy?</span><button id="addsvc" class="addsvc" style="display:none">+ Connect a service</button></div>
  <div id="conns" class="conns"></div>

  <div class="sec-head">Activity</div>
  <div id="stats" class="stats"></div>

  <div class="cols">
    <section>
      <div class="sec-head">Activity feed <span class="muted">— shared memory</span> <span id="memcount" class="count"></span></div>
      <div id="memory" class="list"></div>
    </section>
    <section>
      <div class="sec-head">Run history</div>
      <div id="runs" class="list"></div>
    </section>
  </div>

  <footer><span id="footbackend"></span> · every report line cites a real artifact</footer>
</main>

<div id="modal" class="modal" style="display:none">
  <div class="sheet">
    <div class="sheet-h">Connect a service</div>
    <div class="sheet-sub">Authenticate a source so Beacon can read it — paste a token below.</div>
    <label class="fl">Service</label>
    <select id="m-source"></select>
    <div class="hint" id="m-hint"></div>
    <label class="fl" id="m-tokenlabel">Token</label>
    <input id="m-token" type="password" autocomplete="off" placeholder="paste token" />
    <div id="m-targetwrap" style="display:none"><label class="fl" id="m-targetlabel"></label><input id="m-target" type="text" autocomplete="off" /></div>
    <div class="sheet-msg" id="m-msg"></div>
    <div class="sheet-note">🔒 Saved to <code>v1-walk/.env</code> (gitignored) and applied to the running app immediately. Local dev only — production uses OAuth + a secrets vault.</div>
    <div class="sheet-actions"><button class="btn" id="m-cancel">Cancel</button><button class="btn primary" id="m-connect">Connect</button></div>
  </div>
</div>

<script>
  function el(t,c,h){ var e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c];}); }
  async function getJSON(u,o){ var r=await fetch(u,o); return r.json(); }
  function timeAgo(iso){ if(!iso) return ""; var s=Math.max(0,(Date.now()-new Date(iso).getTime())/1000);
    if(s<60) return Math.floor(s)+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago";
    if(s<86400) return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; }
  function badge(src){ var m={github:["gh","GITHUB"],optimism:["op","OP MAINNET"],slack:["slack","SLACK"],notion:["notion","NOTION"],monday:["monday","MONDAY"]};
    var b=m[src]; return b ? '<span class="badge '+b[0]+'">'+b[1]+'</span>' : '<span class="badge gen">'+esc((src||"").toUpperCase())+'</span>'; }
  function engineLabel(e){ return e==="claude" ? "Claude narrative + grounded sections" : "grounded · no model"; }

  var busy=false, fixturesMode=false;

  async function load(){
    var c = await getJSON("/api/connectors");
    document.getElementById("backend").textContent = c.backend;
    fixturesMode = !!c.fixtures;
    document.getElementById("fixtures").style.display = c.fixtures ? "" : "none";
    document.getElementById("addsvc").style.display = c.fixtures ? "none" : "";
    document.getElementById("footbackend").textContent = "backend: " + c.backend + (c.fixtures ? " · Slack/Notion/Monday are demo data" : "");
    renderConns(c.connectors);
    var mem = await getJSON("/api/memory?limit=12"); renderMemory(mem);
    renderRuns(await getJSON("/api/runs"));
    renderStats(await getJSON("/api/metrics"), mem.length);
    renderReport(await getJSON("/api/report"));
  }

  function renderConns(list){
    var box=document.getElementById("conns"); box.innerHTML="";
    list.forEach(function(x){
      var card=el("div","conn");
      card.appendChild(el("span","hdot "+(x.health.ok?"ok":"down")));
      var g=el("div"); g.style.minWidth="0";
      g.appendChild(el("div","name",esc(x.name)));
      g.appendChild(el("div","detail",esc(x.health.detail||"")));
      card.appendChild(g);
      if(!x.health.ok && !fixturesMode){ var cb=el("button","connect-btn","Connect"); cb.onclick=function(){ openConnect(x.name); }; card.appendChild(cb); }
      box.appendChild(card);
    });
  }

  function renderMemory(items){
    document.getElementById("memcount").textContent = items.length ? "("+items.length+")" : "";
    var box=document.getElementById("memory"); box.innerHTML="";
    if(!items.length){ box.appendChild(el("div","empty","Empty — click <b>Create Report</b> to fetch every source.")); return; }
    items.forEach(function(i){
      var p=i.payload||{}; var a=el("a","item"); a.href=p.url||"#"; a.target="_blank"; a.rel="noopener";
      a.innerHTML = badge(i.source) + '<div style="flex:1;min-width:0"><div class="label">'+esc(p.label||i.sourceId)+'</div>'+
        '<div class="meta">by '+esc(i.agent||"?")+' · '+esc(timeAgo(i.createdAt))+'</div></div><span class="ext">open ↗</span>';
      box.appendChild(a);
    });
  }

  function renderRuns(runs){
    var box=document.getElementById("runs"); box.innerHTML="";
    if(!runs.length){ box.appendChild(el("div","empty","No runs yet.")); return; }
    runs.slice(0,8).forEach(function(r){
      var row=el("div","runi");
      row.innerHTML='<span class="tag '+(r.ok?"ok":"err")+'">'+(r.ok?"OK":"ERR")+'</span><span class="c">'+esc(r.connector)+'</span>'+
        '<span class="n">'+(r.ok?(r.stored+" new · "+r.deduped+" dedup · "+r.latencyMs+"ms"):esc(r.error||"failed"))+'</span>'+
        '<span class="t">'+esc(timeAgo(r.at))+'</span>';
      box.appendChild(row);
    });
  }

  function renderStats(samples, memShown){
    function sum(name,f){ return samples.filter(function(s){return s.name===name;}).reduce(function(a,s){return a+(s[f]||0);},0); }
    var reqs=sum("connector_requests_total","count");
    var lc=sum("connector_latency_ms","count"), ls=sum("connector_latency_ms","sum");
    var storedNew=samples.filter(function(s){return s.name==="memory_store_total"&&s.labels.result==="stored";}).reduce(function(a,s){return a+s.count;},0);
    var tiles=[["Connector calls",reqs],["Avg latency",(lc?Math.round(ls/lc):0)+"ms"],["Items stored",storedNew],["In feed now",memShown]];
    var box=document.getElementById("stats"); box.innerHTML="";
    tiles.forEach(function(t){ box.appendChild(el("div","stat",'<div class="n">'+esc(t[1])+'</div><div class="l">'+esc(t[0])+'</div>')); });
  }

  function renderReport(r){
    var box=document.getElementById("summary");
    if(!r){ box.innerHTML='<div class="card empty">No report yet — click <b>Create Report</b> to fetch every source and write the executive summary.</div>'; return; }
    var t = r.trust;
    if(t && !t.published){
      var vlist = (t.violations||[]).map(function(v){ return '<li>'+esc(v)+'</li>'; }).join('');
      box.innerHTML = '<div class="card report held">'
        + '<div class="rhead"><div class="rtitle">⚠ Report held — not published</div>'
        + '<div class="rmeta">the trust gate refused this brief · eval '+t.score+' (floor '+t.floor+')</div></div>'
        + '<div class="narrative"><b>Reason:</b> '+esc(t.heldReason||'failed checks')+(vlist?'<ul class="vlist">'+vlist+'</ul>':'')+'</div>'
        + '<div class="rfoot">The draft is withheld until it passes — the trust gate doing its job (same logic as v0).</div></div>';
      return;
    }
    var h='<div class="card report"><div class="rhead"><div class="rtitle">'+esc(r.title)+'</div>'+
      '<div class="rmeta">'+esc(r.window)+' · '+r.stats.items+' items · '+r.stats.sources+' sources · '+esc(engineLabel(r.engine))+'</div></div>';
    if(r.narrative) h+='<div class="narrative">'+esc(r.narrative)+'</div>';
    r.sections.forEach(function(s){
      h+='<div class="rsection"><div class="rh">'+esc(s.heading)+'</div>';
      s.bullets.forEach(function(b){
        h+='<a class="rb" href="'+esc(b.url)+'" target="_blank" rel="noopener">'+badge(b.source)+'<span class="rbt">'+esc(b.text)+'</span><span class="ext">↗</span></a>';
      });
      if(s.more>0) h+='<div class="rmore">+ '+s.more+' more</div>';
      h+='</div>';
    });
    var trustline = t ? ' · <b style="color:var(--ok)">✓ published</b> · grounded '+Math.round((t.checks.groundedRatio||0)*100)+'% · eval '+t.score : '';
    h+='<div class="rfoot">Generated '+esc(timeAgo(r.generatedAt))+' · '+esc(engineLabel(r.engine))+trustline+'</div></div>';
    box.innerHTML=h;
  }

  async function createReport(){
    if(busy) return; busy=true;
    var btn=document.getElementById("report"); btn.disabled=true; btn.classList.add("loading"); btn.textContent="Working…";
    var st=document.getElementById("reportstatus"); document.getElementById("summary").classList.add("loading");
    try {
      st.textContent="① Fetching every source…";
      var runs = await getJSON("/api/run-all",{method:"POST"});
      st.textContent="② Updating the activity feed…";
      await load();
      st.textContent="③ Writing the executive summary…";
      renderReport(await getJSON("/api/report",{method:"POST"}));
      var stored = (runs||[]).reduce(function(a,r){return a+(r.stored||0);},0);
      st.textContent="Done — "+(runs||[]).length+" sources fetched, "+stored+" new items.";
    } catch(e){ st.textContent="Failed: "+e; }
    finally { btn.disabled=false; btn.classList.remove("loading"); btn.textContent="Create Report"; document.getElementById("summary").classList.remove("loading"); busy=false; }
  }

  // --- Connect a service (local authentication) ---
  var CATALOG = {
    slack:{label:"Slack", tokenLabel:"Bot token (xoxb-…)", hint:'Needs <code>channels:history</code>. <a href="https://api.slack.com/apps" target="_blank" rel="noopener">Slack apps ↗</a>', target:{label:"Channel ID (e.g. C0123ABCD)"}},
    notion:{label:"Notion", tokenLabel:"Internal integration token (secret_…)", hint:'Share your pages with the integration. <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener">Notion integrations ↗</a>', target:null},
    monday:{label:"Monday", tokenLabel:"API v2 token", hint:'<a href="https://developer.monday.com/api-reference/docs/authentication" target="_blank" rel="noopener">Monday API token ↗</a>', target:{label:"Board ID"}},
    github:{label:"GitHub (optional token)", tokenLabel:"Personal access token", hint:'Public repos work without one — a token lifts the rate limit. <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">Create token ↗</a>', target:null},
    anthropic:{label:"Anthropic — Claude narrative", tokenLabel:"API key (sk-ant-…)", hint:'Optional. Enables the LLM-written summary. <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">API keys ↗</a>', target:null}
  };
  var ORDER = ["slack","notion","monday","github","anthropic"];

  function syncModal(){
    var c = CATALOG[document.getElementById("m-source").value];
    document.getElementById("m-hint").innerHTML = c.hint;
    document.getElementById("m-tokenlabel").textContent = c.tokenLabel;
    document.getElementById("m-token").value = "";
    var tw = document.getElementById("m-targetwrap");
    if(c.target){ tw.style.display=""; document.getElementById("m-targetlabel").textContent=c.target.label; document.getElementById("m-target").value=""; }
    else tw.style.display="none";
    document.getElementById("m-msg").textContent="";
  }
  function openConnect(source){
    var sel=document.getElementById("m-source"); sel.innerHTML="";
    ORDER.forEach(function(k){ var o=document.createElement("option"); o.value=k; o.textContent=CATALOG[k].label; sel.appendChild(o); });
    if(source && CATALOG[source]) sel.value=source;
    syncModal();
    document.getElementById("modal").style.display="flex";
    document.getElementById("m-token").focus();
  }
  function closeModal(){ document.getElementById("modal").style.display="none"; }
  async function submitConnect(){
    var k=document.getElementById("m-source").value;
    var token=document.getElementById("m-token").value, target=document.getElementById("m-target").value;
    var msg=document.getElementById("m-msg"), btn=document.getElementById("m-connect");
    if(!token.trim()){ msg.className="sheet-msg err"; msg.textContent="Paste a token first."; return; }
    btn.disabled=true; msg.className="sheet-msg"; msg.textContent="Connecting…";
    try {
      var r=await getJSON("/api/connect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({source:k,token:token,target:target})});
      if(r.ok){ msg.className="sheet-msg ok"; msg.textContent="Connected ✓ "+((r.health&&r.health.detail)||""); setTimeout(function(){ closeModal(); load(); },800); }
      else { msg.className="sheet-msg err"; msg.textContent="Saved, but the check failed: "+((r.health&&r.health.detail)||"check the token/target"); load(); }
    } catch(e){ msg.className="sheet-msg err"; msg.textContent="Failed: "+e; }
    finally { btn.disabled=false; }
  }
  document.getElementById("m-source").onchange = syncModal;
  document.getElementById("m-cancel").onclick = closeModal;
  document.getElementById("m-connect").onclick = submitConnect;
  document.getElementById("addsvc").onclick = function(){ openConnect("slack"); };
  document.getElementById("modal").onclick = function(e){ if(e.target.id==="modal") closeModal(); };

  document.getElementById("report").onclick = createReport;
  load();
  setInterval(function(){ if(!busy) load(); }, 7000);
</script>
</body>
</html>`;
