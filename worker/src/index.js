// 内联 site/ 静态文件 — 更新 site/ 内容后需同步更新此处字符串
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenBird — Publish Markdown. Get a link. Done.</title>
  <meta name="description" content="Open-source, self-hosted Markdown publishing. One CLI command turns Markdown into a shareable web page — free forever on Cloudflare." />
  <meta property="og:title" content="OpenBird — Publish Markdown. Get a link. Done." />
  <meta property="og:description" content="Open-source, self-hosted Markdown publishing. One CLI command, a shareable link. Free on Cloudflare." />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="og-image.svg" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="favicon.svg" />
  <style>
:root {
  --bg: #ffffff;
  --bg-alt: #f8fafc;
  --bg-dark: #0f172a;
  --text: #0f172a;
  --text-muted: #475569;
  --text-subtle: #64748b;
  --border: #e2e8f0;
  --border-soft: #f1f5f9;
  --accent: #14b8a6;
  --accent-dark: #0d9488;
  --accent-bg: #f0fdfa;
  --accent-border: #99f6e4;
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --container: 72rem;
  --radius: 16px;
  --radius-sm: 6px;
}
*{box-sizing:border-box; margin:0;}
body{font-family:var(--font-sans); color:var(--text); background:var(--bg); line-height:1.6;}
.wrapper{min-height:100vh; display:flex; flex-direction:column;}
.container{max-width:var(--container); margin:0 auto; padding:0 1.25rem;}
.container-narrow{max-width:56rem;}
main{flex:1;}
section{padding:3rem 0;}
.features, .integrations{background:var(--bg-alt);}
.section-head{text-align:center; margin-bottom:2.5rem;}
.section-head h2{font-size:1.875rem; font-weight:700; letter-spacing:-.025em;}
.section-head p{color:var(--text-muted); margin-top:.5rem;}
.card-grid{display:grid; gap:1.5rem; align-items:stretch;}
.card-grid-4{grid-template-columns:repeat(4,1fr);}
.card-grid-3{grid-template-columns:repeat(3,1fr);}
.card-grid-2{grid-template-columns:repeat(2,1fr);}
.btn-primary{display:inline-flex; align-items:center; justify-content:center; border-radius:var(--radius-sm);
  background:var(--bg-dark); color:#fff; padding:.625rem 1.25rem; font-size:.875rem; font-weight:600;
  box-shadow:0 1px 2px rgba(0,0,0,.05); text-decoration:none;}
.btn-primary:hover{background:#1e293b;}
.btn-secondary{display:inline-flex; align-items:center; justify-content:center; border-radius:var(--radius-sm);
  border:1px solid var(--border); background:var(--bg); color:var(--text-muted);
  padding:.625rem 1.25rem; font-size:.875rem; font-weight:500; text-decoration:none;}
.btn-secondary:hover{background:var(--bg-alt);}
code{font-family:var(--font-mono); background:var(--bg-alt); padding:.125rem .375rem; border-radius:.25rem; font-size:.85em;}
pre code{background:none; padding:0; border-radius:0; font-size:inherit;}

.site-header{
  position:sticky; top:0; z-index:30;
  display:flex; align-items:center; justify-content:space-between;
  padding:1.25rem;
  border-bottom:1px solid var(--border);
  background:rgba(248,250,252,.8);
  backdrop-filter:blur(8px);
}
.brand{display:flex; align-items:center; gap:.5rem; text-decoration:none; color:var(--text); font-weight:700; font-size:1.125rem;}
.brand-logo{flex-shrink:0;}
.header-nav{display:flex; align-items:center; gap:.75rem;}
.nav-link{color:var(--text-muted); text-decoration:none; font-size:.875rem; font-weight:500;}
.nav-link:hover{color:var(--text);}

.hero{padding-top:3rem;}
.hero-grid{display:grid; grid-template-columns:1fr 1fr; gap:3rem; align-items:center;}
.hero h1{font-size:3rem; line-height:1.1; font-weight:700; letter-spacing:-.025em;}
.hero h1 span{color:var(--accent-dark);}
.hero-sub{color:var(--text-muted); font-size:1.125rem; margin:1.5rem 0;}
.hero-cta{display:flex; gap:.75rem; align-items:center; flex-wrap:wrap;}
.hero-note{color:var(--text-subtle); font-size:.875rem; margin-top:.75rem;}
.badge{display:inline-flex; align-items:center; gap:.625rem; margin-top:2.5rem; border-radius:9999px;
  border:1px solid var(--accent-border); background:var(--accent-bg); padding:.625rem 1rem; font-size:.875rem;}
.badge-strong{font-weight:600;}

.terminal{
  border-radius:var(--radius); overflow:hidden;
  border:1px solid var(--border); background:var(--bg-dark); color:#e2e8f0;
}
.term-bar{display:flex; align-items:center; gap:.5rem; padding:.6rem 1rem; background:#1e293b;}
.term-bar .dot{width:.75rem;height:.75rem;border-radius:50%;background:#475569;}
.term-bar .dot:first-child{background:#ef4444;}
.term-bar .dot:nth-child(2){background:#eab308;}
.term-bar .dot:nth-child(3){background:#22c55e;}
.terminal pre{margin:0; padding:1.25rem 1.5rem; overflow-x:auto; font-family:var(--font-mono); font-size:.85rem; line-height:1.7;}
.c-muted{color:#64748b;} .c-accent{color:var(--accent);}

.card{
  display:flex; flex-direction:column;
  border-radius:var(--radius);
  background:var(--bg); padding:1.5rem;
  box-shadow:0 1px 2px rgba(0,0,0,.05);
  border:1px solid var(--border-soft);
}
.card-link{text-decoration:none; color:var(--text); transition:transform .3s, box-shadow .3s;}
.card-link:hover{transform:translateY(-2px); box-shadow:0 8px 16px rgba(0,0,0,.08);}
.card-icon{
  width:2.5rem; height:2.5rem; margin-bottom:1rem;
  display:inline-flex; align-items:center; justify-content:center;
  border-radius:9999px; background:#f1f5f9; color:var(--text-muted);
  font-family:var(--font-mono);
}
.step-head{display:flex; align-items:center; gap:.75rem; margin-bottom:.5rem;}
.step-tag{font-size:.75rem; font-weight:600; color:var(--accent-dark); text-transform:uppercase; letter-spacing:.05em;}
.learn{color:var(--accent); font-size:.875rem; font-weight:600; margin-top:auto;}

.marquee{overflow:hidden; position:relative;}
.marquee-track{display:flex; gap:1rem; width:max-content; animation:marquee 30s linear infinite;}
.marquee:hover .marquee-track{animation-play-state:paused;}
@keyframes marquee{from{transform:translateX(0);} to{transform:translateX(-50%);}}
.tpl-card{flex:0 0 9rem; height:11rem; padding:.875rem; border-radius:.75rem; background:var(--bg);
  border:1px solid var(--border); display:flex; flex-direction:column; gap:.5rem;
  transition:transform .3s, box-shadow .3s; text-decoration:none; color:var(--text);}
.tpl-card:hover{transform:scale(1.05); box-shadow:0 10px 20px rgba(0,0,0,.1);}
.tpl-title{font-size:.75rem; font-weight:600; color:var(--text);}
.tpl-line{height:.375rem; border-radius:9999px; background:var(--border-soft);}
.w-4-5{width:80%;}.w-11-12{width:91.67%;}.w-3-4{width:75%;}.w-2-3{width:66.67%;}.w-1-2{width:50%;}
@media (prefers-reduced-motion: reduce){.marquee-track{animation:none;}}

.cta-card{
  text-align:center; padding:3rem 2rem;
  border-radius:var(--radius); border:1px solid var(--border); background:var(--bg-alt);
}
.cta-card h2{font-size:2rem; font-weight:700; margin-bottom:.75rem;}
.cta-card p{color:var(--text-muted); margin-bottom:1.5rem; max-width:36rem; margin-left:auto; margin-right:auto;}
.privacy{margin-top:3rem;}
.privacy h3{font-size:1.25rem; font-weight:600; margin-bottom:1rem;}
.privacy ul{list-style:none; padding:0; display:flex; flex-direction:column; gap:.75rem;}
.privacy li{padding-left:1.5rem; position:relative; color:var(--text-muted);}
.privacy li::before{content:"✓"; position:absolute; left:0; color:var(--accent); font-weight:700;}

.site-footer{border-top:1px solid var(--border); padding:2rem 0; margin-top:2rem;}
.footer-grid{display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:2rem;}
.footer-brand p{color:var(--text-muted); font-size:.875rem; margin-top:.25rem;}
.footer-nav{display:flex; gap:1.5rem; flex-wrap:wrap;}
.footer-nav a{color:var(--text-muted); text-decoration:none; font-size:.875rem;}
.footer-nav a:hover{color:var(--text);}
.footer-bottom{border-top:1px solid var(--border); margin-top:1.5rem; padding-top:1.5rem; font-size:.8125rem; color:var(--text-subtle);}

@media (max-width: 1024px){
  .hero-grid{grid-template-columns:1fr;}
  .hero-terminal{display:none;}
  .card-grid-4{grid-template-columns:repeat(2,1fr);}
}
@media (max-width: 640px){
  .hero h1{font-size:2.25rem;}
  .card-grid-4,.card-grid-3,.card-grid-2{grid-template-columns:1fr;}
  .header-nav .nav-link{display:none;}
}
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="site-header">
      <a class="brand" href="/">
        <svg class="brand-logo" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M4 18 L12 4 L20 18 Z" fill="var(--accent)"/>
        </svg>
        <span class="brand-name">OpenBird</span>
      </a>
      <nav class="header-nav">
        <a class="nav-link" href="https://github.com/PPsteven/openbird">GitHub</a>
        <a class="nav-link" href="https://github.com/PPsteven/openbird#readme">Docs</a>
        <a class="btn-primary" href="#install">Get started</a>
      </nav>
    </header>
    <main>
      <section id="hero" class="hero">
        <div class="container hero-grid">
          <div class="hero-copy">
            <h1>Publish Markdown.<br/><span>Get a link. Done.</span></h1>
            <p class="hero-sub">
              Open-source, self-hosted Markdown publishing. One CLI command turns
              Markdown into a shareable web page — free forever on Cloudflare.
            </p>
            <div class="hero-cta">
              <a class="btn-primary" href="#install">Get started</a>
              <a class="btn-secondary" href="https://github.com/PPsteven/openbird">View on GitHub</a>
            </div>
            <p class="hero-note">No account required — try it with <code>openbird publish --temp</code></p>
          </div>
          <div class="hero-terminal">
            <div class="terminal">
              <div class="term-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
              <pre><code>$ openbird publish notes.md
<span class="c-accent">✨ Published → https://openbird.jhao.space/quiet-blue-lake</span></code></pre>
            </div>
          </div>
        </div>
        <div class="container">
          <div class="badge">
            <span class="badge-strong">Open source</span>
            <span class="badge-sep"> · </span>
            <span>Self-hosted</span>
            <span class="badge-sep"> · </span>
            <span>Zero dependencies</span>
          </div>
        </div>
      </section>
      <section id="features" class="features">
        <div class="container">
          <div class="section-head">
            <h2>Why OpenBird?</h2>
            <p>Everything you need to publish Markdown from the terminal.</p>
          </div>
          <div class="card-grid card-grid-4">
            <div class="card">
              <div class="card-icon">$</div>
              <h3>CLI-first publishing</h3>
              <p>One command publishes Markdown to a shareable URL. Update or delete anytime, right from the terminal.</p>
            </div>
            <div class="card">
              <div class="card-icon">☁</div>
              <h3>Self-hosted &amp; free</h3>
              <p>Runs entirely on Cloudflare's free tier. Your content, your infrastructure, no subscriptions.</p>
            </div>
            <div class="card">
              <div class="card-icon">🖼</div>
              <h3>Smart image handling</h3>
              <p>Local images auto-upload to R2 and rewrite to URLs. No manual hosting, no broken links.</p>
            </div>
            <div class="card">
              <div class="card-icon">@</div>
              <h3>Memorable URLs</h3>
              <p>Random slugs out of the box, or <code>username/slug</code> namespace for permanent links.</p>
            </div>
          </div>
        </div>
      </section>
      <section id="how-it-works" class="how">
        <div class="container">
          <div class="section-head">
            <h2>How it works</h2>
            <p>Three steps from a Markdown file to a published link.</p>
          </div>
          <div class="card-grid card-grid-3">
            <div class="card">
              <div class="step-head"><div class="card-icon">1</div><span class="step-tag">Step 1</span></div>
              <h3>Install the CLI</h3>
              <p>Clone the repo and link the CLI. Zero npm dependencies — just Node.js 18+.</p>
            </div>
            <div class="card">
              <div class="step-head"><div class="card-icon">2</div><span class="step-tag">Step 2</span></div>
              <h3>Publish in one command</h3>
              <p><code>openbird publish notes.md</code> renders your Markdown and hands back a shareable link.</p>
            </div>
            <div class="card">
              <div class="step-head"><div class="card-icon">3</div><span class="step-tag">Step 3</span></div>
              <h3>Share &amp; manage</h3>
              <p>Open the URL in any browser. Update or remove with a single command, anytime.</p>
            </div>
          </div>
        </div>
      </section>
      <section id="install" class="code-showcase">
        <div class="container container-narrow">
          <div class="section-head">
            <h2>See it in action</h2>
            <p>From zero to a published page in under a minute.</p>
          </div>
          <div class="terminal">
            <div class="term-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="term-title">bash</span></div>
<pre><code><span class="c-muted"># 1. Install the CLI (zero dependencies)</span>
git clone https://github.com/PPsteven/openbird.git
cd openbird/cli &amp;&amp; npm link

<span class="c-muted"># 2. Login (or skip with --temp)</span>
openbird login

<span class="c-muted"># 3. Publish</span>
echo "# Hello OpenBird" &gt; hello.md
openbird publish hello.md
<span class="c-accent">✨ Published → https://openbird.jhao.space/quiet-blue-lake</span>

<span class="c-muted"># Anonymous temp publish, expires in 1 hour</span>
openbird publish --temp hello.md
<span class="c-accent">⚡ Published (temp, 1h) → https://openbird.jhao.space/warm-clear-seed</span>

<span class="c-muted"># Namespace permanent URL</span>
openbird publish --namespace my-post hello.md
<span class="c-accent">✨ Published → https://openbird.jhao.space/ppsteven/my-post</span></code></pre>
          </div>
        </div>
      </section>
      <section class="templates">
        <div class="container">
          <div class="section-head">
            <h2>What will you publish with OpenBird?</h2>
            <p>From quick notes to detailed docs — if you can write it, you can share it.</p>
          </div>
        </div>
        <div class="marquee">
          <div class="marquee-track">
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Meeting notes</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Project README</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">API docs</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Blog draft</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Study notes</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Team update</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Recipe</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Release notes</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Changelog</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Interview prep</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Meeting notes</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Project README</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">API docs</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Blog draft</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Study notes</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Team update</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Recipe</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Release notes</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Changelog</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
      <a class="tpl-card" href="#install">
        <span class="tpl-title">Interview prep</span>
        <div class="tpl-line w-4-5"></div>
        <div class="tpl-line w-11-12"></div>
        <div class="tpl-line w-3-4"></div>
      </a>
          </div>
        </div>
      </section>
      <section id="integrations" class="integrations">
        <div class="container">
          <div class="section-head">
            <h2>Publish from anywhere</h2>
            <p>Publish from the terminal, your CI pipeline, or your own code. OpenBird has tools for every workflow.</p>
          </div>
          <div class="card-grid card-grid-4">
            <a class="card card-link" href="https://github.com/PPsteven/openbird#command-reference">
              <div class="card-icon">&gt;_</div>
              <span class="step-tag">CLI</span>
              <h3>Terminal</h3>
              <p>Publish Markdown files straight from the terminal. Pipe from scripts, CI, or any tool that outputs text.</p>
              <span class="learn">Learn more →</span>
            </a>
            <a class="card card-link" href="https://github.com/PPsteven/openbird#api-documentation">
              <div class="card-icon">{ }</div>
              <span class="step-tag">REST</span>
              <h3>API</h3>
              <p>A simple REST API for publishing, listing, and deleting documents. Build your own integrations in any language.</p>
              <span class="learn">Learn more →</span>
            </a>
            <a class="card card-link" href="https://github.com/PPsteven/openbird#quick-start">
              <div class="card-icon">⚙</div>
              <span class="step-tag">CI/CD</span>
              <h3>Pipelines</h3>
              <p>Publish release notes, changelogs, or build artifacts from GitHub Actions. Set <code>OPENBIRD_API_KEY</code> and go.</p>
              <span class="learn">Learn more →</span>
            </a>
            <a class="card card-link" href="https://github.com/PPsteven/openbird">
              <div class="card-icon">⇧</div>
              <span class="step-tag">Self-host</span>
              <h3>Deploy your own</h3>
              <p>One <code>wrangler deploy</code> spins up your own instance on Cloudflare's free tier. Full control, zero cost.</p>
              <span class="learn">Learn more →</span>
            </a>
          </div>
        </div>
      </section>
      <section class="cta">
        <div class="container">
          <div class="cta-card">
            <h2>Free and open source</h2>
            <p>Self-host on Cloudflare's free tier. MIT licensed. No subscriptions, no lock-in. Your content, your infrastructure.</p>
            <a class="btn-primary" href="https://github.com/PPsteven/openbird">Star on GitHub</a>
          </div>
          <div class="privacy">
            <h3>No tracking. No ads. Ever.</h3>
            <ul>
              <li>Your Markdown stays on your device until you publish.</li>
              <li>Published pages are unlisted — no ads, no tracking pixels.</li>
              <li>Temporary links expire in 1 hour. Namespace links are yours to keep.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <span class="brand-name">OpenBird</span>
          <p>Open-source Markdown publishing.</p>
        </div>
        <nav class="footer-nav">
          <a href="https://github.com/PPsteven/openbird">GitHub</a>
          <a href="https://github.com/PPsteven/openbird#readme">Docs</a>
          <a href="https://github.com/PPsteven/openbird#api-documentation">API</a>
          <a href="https://openbird.jhao.space">Live demo</a>
          <a href="https://github.com/PPsteven/openbird/blob/main/LICENSE">License</a>
        </nav>
      </div>
      <div class="container footer-bottom">
        <span>© 2026 OpenBird · MIT License</span>
      </div>
    </footer>
  </div>
</body>
</html>
`

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path d="M6 24 L16 4 L26 24 Z" fill="#14b8a6"/>
  <path d="M10 20 L16 8 L22 20 Z" fill="#0d9488"/>
  <circle cx="16" cy="18" r="3" fill="#fff"/>
</svg>
`

const OGIMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="#0f172a"/>
  <path d="M200 400 L400 100 L600 400 Z" fill="#14b8a6" opacity=".15"/>
  <path d="M600 400 L800 100 L1000 400 Z" fill="#14b8a6" opacity=".15"/>
  <text x="600" y="260" text-anchor="middle" font-family="system-ui,sans-serif" font-size="64" font-weight="700" fill="#fff">OpenBird</text>
  <text x="600" y="330" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" fill="#94a3b8">Publish Markdown. Get a link. Done.</text>
  <text x="600" y="400" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#64748b">Open-source, self-hosted Markdown publishing</text>
</svg>
`


// Auto-seed admin user from env vars on first request
let seeded = false
async function seedAdminUser(env) {
  if (seeded) return
  seeded = true

  const adminEmail = env.ADMIN_EMAIL
  const adminPassword = env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) return

  try {
    const existing = await env.USERS.get("email:" + adminEmail)
    if (existing) return

    const userId = "user_" + randomHex(12)
    const apiKey = "ob_" + randomHex(32)
    const passwordHash = await sha256(adminPassword)
    const keyHash = await sha256(apiKey)
    const now = new Date().toISOString()

    const username = adminEmail.split('@')[0]
    await env.USERS.put("user:" + userId, JSON.stringify({
      id: userId, email: adminEmail, username, passwordHash,
      keys: [{ prefix: apiKey.slice(0, 7), hash: keyHash, createdAt: now }],
      createdAt: now
    }))
    await env.USERS.put("email:" + adminEmail, userId)
    await env.USERS.put("apikey:" + keyHash, JSON.stringify({ userId, createdAt: now }))
    await env.USERS.put("username:" + username, userId)
  } catch (e) {
    console.error("seedAdminUser error:", e)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // Auto-seed admin user on first request
    await seedAdminUser(env)

    if (path === "/api/v1/register" && method === "POST") return handleRegister(request, env)
    if (path === "/api/v1/publish" && method === "POST") {
      const auth = request.headers.get("Authorization")
      if (auth && auth.startsWith("Bearer ob_")) {
        return handlePublish(request, env)
      }
      return handleGuestPublish(request, env)
    }
    if (path === "/api/v1/documents" && method === "GET") return handleList(request, env)
    if (path === "/api/v1/documents" && method === "DELETE") return handleRemove(request, env)
    if (path === "/api/v1/upload-image" && method === "POST") return handleUploadImage(request, env)
    if (path === "/api/v1/account" && method === "PUT") return handleUpdateAccount(request, env)
    if (path === "/api/v1/login" && method === "GET") return handleLoginPage(request, env)
    if (path === "/api/v1/login" && method === "POST") return handleLoginSubmit(request, env)

    // 静态资源路由（必须在 slug 路由之前）
    if (path === "/") {
      return new Response(LANDING_HTML, {
        headers: { "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" }
      })
    }
    if (path === "/favicon.svg") {
      return new Response(FAVICON_SVG, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, immutable" }
      })
    }
    if (path === "/og-image.svg") {
      return new Response(OGIMAGE_SVG, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, immutable" }
      })
    }


    if (path.startsWith("/images/")) return serveImage(path, env)
    if (path.startsWith("/") && path.length > 1) {
      const segments = path.slice(1).split("/")
      if (segments.length === 2) return serveNamespacedPage(segments[0], segments[1], env)
      return servePage(segments[0], env)
    }

    return new Response("Not Found", { status: 404 })
  }
}

// Admin-only: creates new users. Requires ADMIN_EMAIL API key.
async function handleRegister(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Registration is closed" }, 403)
  if (auth.user.email !== env.ADMIN_EMAIL) {
    return json({ error: "Only admin can register users" }, 403)
  }

  let body
  try { body = await request.json() } catch {
    return json({ error: "Invalid request body" }, 400)
  }

  const { email, password, username: providedUsername } = body
  if (!email || typeof email !== "string" || email.trim().length === 0) {
    return json({ error: "Email is required" }, 400)
  }

  const actualPassword = (password && typeof password === "string" && password.trim().length > 0)
    ? password.trim()
    : randomHex(16)

  const existing = await env.USERS.get("email:" + email)
  if (existing) return json({ error: "Email already registered" }, 400)

  const username = (providedUsername && typeof providedUsername === "string" && providedUsername.trim().length > 0)
    ? providedUsername.trim()
    : email.split('@')[0]

  const existingUsername = await env.USERS.get("username:" + username)
  if (existingUsername) {
    return json({ error: `Username already taken: ${username}` }, 409)
  }

  const userId = "user_" + randomHex(12)
  const apiKey = "ob_" + randomHex(32)
  const passwordHash = await sha256(actualPassword)
  const keyHash = await sha256(apiKey)
  const now = new Date().toISOString()

  await env.USERS.put("user:" + userId, JSON.stringify({
    id: userId, email, username, passwordHash,
    keys: [{ prefix: apiKey.slice(0, 7), hash: keyHash, createdAt: now }],
    createdAt: now
  }))
  await env.USERS.put("email:" + email, userId)
  await env.USERS.put("apikey:" + keyHash, JSON.stringify({ userId, createdAt: now }))
  await env.USERS.put("username:" + username, userId)

  return json({ userId, apiKey, email, username }, 201)
}

async function verifyAuth(request, env) {
  const auth = request.headers.get("Authorization")
  if (!auth || !auth.startsWith("Bearer ob_")) return null

  const key = auth.slice(7)
  const keyHash = await sha256(key)
  const entry = await env.USERS.get("apikey:" + keyHash)
  if (!entry) return null

  const { userId } = JSON.parse(entry)
  const userData = await env.USERS.get("user:" + userId)
  if (!userData) return null

  return { userId, user: JSON.parse(userData) }
}

async function handlePublish(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid request body" }, 400)
  }

  const { markdown, title: titleParam, slug: slugParam, namespaced } = body

  if (!markdown || typeof markdown !== "string" || markdown.trim().length === 0) {
    return json({ error: "Missing markdown field" }, 400)
  }

  const markdownBytes = new TextEncoder().encode(markdown).length
  if (markdownBytes > 262144) {
    return json({ error: "Markdown too large (max 262144 bytes)" }, 413)
  }

  if (namespaced) {
    if (!auth.user.username) {
      return json({ error: "Username required for namespaced publishing" }, 403)
    }

    let nsSlug = slugParam
    let isNew = true

    if (nsSlug) {
      if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(nsSlug)) {
        return json({ error: "Invalid slug format" }, 400)
      }
      const kvKey = `ns:${auth.user.username}/${nsSlug}`
      const existing = await env.DOCS.get(kvKey)
      if (existing) {
        const doc = JSON.parse(existing)
        if (doc.userId !== auth.userId) {
          return json({ error: "Document not owned by user" }, 403)
        }
        isNew = false
      }
    } else {
      nsSlug = await allocateSlug(env)
      if (!nsSlug) {
        return json({ error: "Failed to allocate document slug" }, 503)
      }
    }

    const title = titleParam || extractTitle(markdown) || "Untitled"
    const html = renderMarkdown(markdown)

    const htmlBytes = new TextEncoder().encode(html).length
    if (htmlBytes > 524288) {
      return json({ error: "Rendered HTML too large (max 524288 bytes)" }, 413)
    }

    const now = new Date().toISOString()
    const r2Key = `pages/${auth.user.username}/${nsSlug}/index.html`
    await env.PAGES.put(r2Key, html, {
      httpMetadata: { contentType: "text/html" },
      customMetadata: { userId: auth.userId, title, slug: nsSlug, username: auth.user.username, createdAt: now, updatedAt: now }
    })

    const kvKey = `ns:${auth.user.username}/${nsSlug}`
    const meta = { slug: nsSlug, title, userId: auth.userId, username: auth.user.username, source: "api", createdAt: now, updatedAt: now }
    await env.DOCS.put(kvKey, JSON.stringify(meta))
    await env.DOCS.put(`user:${auth.userId}:docs:${auth.user.username}/${nsSlug}`, "1")

    const baseUrl = getBaseUrl(request)
    return json({
      slug: nsSlug,
      username: auth.user.username,
      url: `${baseUrl}/${auth.user.username}/${nsSlug}`,
      title,
      expiresAt: null,
      ttlDays: null,
      created: isNew
    }, isNew ? 201 : 200)
  }

  let slug
  let isNew = true

  if (slugParam) {
    if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slugParam)) {
      return json({ error: "Invalid slug format" }, 400)
    }
    const existing = await env.DOCS.get("doc:" + slugParam)
    if (existing) {
      const doc = JSON.parse(existing)
      if (doc.userId !== auth.userId) {
        return json({ error: "Document not owned by user" }, 403)
      }
      isNew = false
    }
    slug = slugParam
  } else {
    slug = await allocateSlug(env)
    if (!slug) {
      return json({ error: "Failed to allocate document slug" }, 503)
    }
  }

  const title = titleParam || extractTitle(markdown) || "Untitled"
  const html = renderMarkdown(markdown)

  const htmlBytes = new TextEncoder().encode(html).length
  if (htmlBytes > 524288) {
    return json({ error: "Rendered HTML too large (max 524288 bytes)" }, 413)
  }

  const now = new Date().toISOString()

  const htmlKey = `pages/${slug}/index.html`
  await env.PAGES.put(htmlKey, html, {
    httpMetadata: { contentType: "text/html" },
    customMetadata: { userId: auth.userId, title, slug, createdAt: now, updatedAt: now }
  })

  const meta = { slug, title, userId: auth.userId, source: "api", createdAt: now, updatedAt: now }
  await env.DOCS.put("doc:" + slug, JSON.stringify(meta))
  await env.DOCS.put("user:" + auth.userId + ":docs:" + slug, "1")

  const baseUrl = getBaseUrl(request)

  return json({
    slug,
    username: null,
    url: `${baseUrl}/${slug}`,
    title,
    expiresAt: null,
    ttlDays: null,
    created: isNew
  }, isNew ? 201 : 200)
}

async function handleGuestPublish(request, env) {
  let body
  try { body = await request.json() } catch {
    return json({ error: "Invalid request body" }, 400)
  }

  const { markdown, title: titleParam, slug: slugParam, temp } = body

  if (!temp) {
    return json({ error: "Invalid API key" }, 401)
  }

  if (!markdown || typeof markdown !== "string" || markdown.trim().length === 0) {
    return json({ error: "Missing markdown field" }, 400)
  }

  const markdownBytes = new TextEncoder().encode(markdown).length
  if (markdownBytes > 262144) {
    return json({ error: "Markdown too large (max 262144 bytes)" }, 413)
  }

  let slug
  if (slugParam) {
    if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slugParam)) {
      return json({ error: "Invalid slug format" }, 400)
    }
    const [existingDoc, existingGuest] = await Promise.all([
      env.DOCS.get("doc:" + slugParam),
      env.DOCS.get("guest:" + slugParam)
    ])
    if (existingDoc || existingGuest) {
      return json({ error: "Slug already taken" }, 409)
    }
    slug = slugParam
  } else {
    slug = await allocateGuestSlug(env)
    if (!slug) {
      return json({ error: "Failed to allocate document slug" }, 503)
    }
  }

  const title = titleParam || extractTitle(markdown) || "Untitled"
  const html = renderMarkdown(markdown)

  const htmlBytes = new TextEncoder().encode(html).length
  if (htmlBytes > 524288) {
    return json({ error: "Rendered HTML too large (max 524288 bytes)" }, 413)
  }

  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 3600000).toISOString()

  const htmlKey = `pages/guest/${slug}/index.html`
  await env.PAGES.put(htmlKey, html, {
    httpMetadata: { contentType: "text/html" },
    customMetadata: { title, slug, guest: "true", createdAt: now, expiresAt }
  })

  const meta = { slug, title, guest: true, source: "guest", createdAt: now, expiresAt, ttlMinutes: 60 }
  await env.DOCS.put("guest:" + slug, JSON.stringify(meta), { expirationTtl: 3600 })

  const baseUrl = getBaseUrl(request)
  return json({
    slug, url: `${baseUrl}/${slug}`,
    title, expiresAt, ttlMinutes: 60, guest: true
  }, 201)
}

async function allocateGuestSlug(env) {
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug()
    const [existingDoc, existingGuest] = await Promise.all([
      env.DOCS.get("doc:" + slug),
      env.DOCS.get("guest:" + slug)
    ])
    if (!existingDoc && !existingGuest) return slug
  }
  return null
}

async function handleList(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  const prefix = "user:" + auth.userId + ":docs:"
  const result = await env.DOCS.list({ prefix })

  const docs = []
  for (const key of result.keys) {
    const suffix = key.name.slice(prefix.length)
    if (suffix.includes("/")) {
      const docData = await env.DOCS.get("ns:" + suffix)
      if (!docData) continue
      const doc = JSON.parse(docData)
      const baseUrl = getBaseUrl(request)
      docs.push({
        slug: doc.slug,
        username: doc.username,
        title: doc.title,
        url: `${baseUrl}/${doc.username}/${doc.slug}`,
        source: doc.source,
        updatedAt: doc.updatedAt,
        expiresAt: null
      })
    } else {
      const docData = await env.DOCS.get("doc:" + suffix)
      if (!docData) continue
      const doc = JSON.parse(docData)
      const baseUrl = getBaseUrl(request)
      docs.push({
        slug: doc.slug,
        username: null,
        title: doc.title,
        url: `${baseUrl}/${suffix}`,
        source: doc.source,
        updatedAt: doc.updatedAt,
        expiresAt: doc.expiresAt
      })
    }
  }

  docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  return json({ documents: docs })
}

async function handleRemove(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  const url = new URL(request.url)
  const slug = url.searchParams.get("slug")
  const namespaced = url.searchParams.get("namespaced") === "true"

  if (!slug) {
    return json({ error: "Missing slug parameter" }, 400)
  }

  if (namespaced) {
    if (!auth.user.username) {
      return json({ error: "Username required for namespaced operations" }, 403)
    }
    const kvKey = `ns:${auth.user.username}/${slug}`
    const docData = await env.DOCS.get(kvKey)
    if (!docData) {
      return json({ error: "Document not found" }, 404)
    }
    const doc = JSON.parse(docData)
    if (doc.userId !== auth.userId) {
      return json({ error: "Document not owned by user" }, 403)
    }
    await env.PAGES.delete(`pages/${auth.user.username}/${slug}/index.html`)
    await env.DOCS.delete(kvKey)
    await env.DOCS.delete(`user:${auth.userId}:docs:${auth.user.username}/${slug}`)
    return json({ ok: true })
  }

  const docData = await env.DOCS.get("doc:" + slug)
  if (!docData) {
    return json({ error: "Document not found" }, 404)
  }

  const doc = JSON.parse(docData)
  if (doc.userId !== auth.userId) {
    return json({ error: "Document not owned by user" }, 403)
  }

  await env.PAGES.delete("pages/" + slug + "/index.html")
  await env.DOCS.delete("doc:" + slug)
  await env.DOCS.delete("user:" + auth.userId + ":docs:" + slug)

  return json({ ok: true })
}

async function handleLoginPage(request, env) {
  const url = new URL(request.url)
  const callback = url.searchParams.get("callback") || ""

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login — OpenBird</title>
<style>
body{max-width:400px;margin:4rem auto;padding:0 1.5rem;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;color:#1a1a1a}
h1{font-size:1.5rem;margin-bottom:.5rem}
p{color:#555;margin-bottom:1.5rem}
label{display:block;margin-bottom:.25rem;font-weight:600;font-size:.875rem}
input{width:100%;padding:.5rem .75rem;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;margin-bottom:1rem}
input:focus{outline:none;border-color:#0366d6;box-shadow:0 0 0 3px rgba(3,102,214,.15)}
button{width:100%;padding:.6rem;background:#0366d6;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer}
button:hover{background:#0256b9}
.error{color:#d73a49;font-size:.875rem;margin-top:.5rem;display:none}
.hint{font-size:.8rem;color:#888;margin-top:.75rem;text-align:center}
</style>
</head>
<body>
<h1>Login to OpenBird</h1>
<p>Enter your credentials to get an API key.</p>
<form id="loginForm">
<label for="email">Email / Username</label>
<input type="text" id="email" name="email" placeholder="admin@example.com" autocomplete="username" required>
<label for="password">Password</label>
<input type="password" id="password" name="password" placeholder="Enter your password" autocomplete="current-password" required>
<button type="submit">Get API Key</button>
<div class="error" id="error"></div>
</form>
<div class="hint">Don't have an account? Ask your admin to create one.</div>
<script>
const callback = ${JSON.stringify(callback)}
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault()
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const errorEl = document.getElementById("error")
  try {
    const resp = await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    const data = await resp.json()
    if (!resp.ok) { errorEl.textContent = data.error; errorEl.style.display = "block"; return }
    if (callback) {
      window.location.href = callback + "?token=" + encodeURIComponent(data.apiKey)
    } else {
      document.body.innerHTML = "<h1>API Key</h1><p style='word-break:break-all;font-family:monospace;background:#f4f4f4;padding:1rem;border-radius:6px'>" + data.apiKey + "</p><p>Save this key and use it with <code>openbird login</code>.</p>"
    }
  } catch (e) {
    errorEl.textContent = "Network error"; errorEl.style.display = "block"
  }
})
</script>
</body>
</html>`
  return new Response(html, {
    headers: { "Content-Type": "text/html", "Cache-Control": "no-store" }
  })
}

async function handleLoginSubmit(request, env) {
  let body
  try { body = await request.json() } catch {
    return json({ error: "Invalid request body" }, 400)
  }

  const { email, password } = body
  if (!email || !password) {
    return json({ error: "Email and password are required" }, 400)
  }

  const existing = await env.USERS.get("email:" + email)
  if (!existing) {
    return json({ error: "User not found" }, 404)
  }

  const userData = await env.USERS.get("user:" + existing)
  if (!userData) {
    return json({ error: "User not found" }, 404)
  }

  const user = JSON.parse(userData)
  const passwordHash = await sha256(password)
  if (user.passwordHash !== passwordHash) {
    return json({ error: "Invalid password" }, 401)
  }

  const apiKey = "ob_" + randomHex(32)
  const keyHash = await sha256(apiKey)
  const now = new Date().toISOString()
  user.keys.push({ prefix: apiKey.slice(0, 7), hash: keyHash, createdAt: now })
  await env.USERS.put("user:" + user.id, JSON.stringify(user))
  await env.USERS.put("apikey:" + keyHash, JSON.stringify({ userId: user.id, createdAt: now }))

  return json({ userId: user.id, apiKey })
}

async function servePage(slug, env) {
  let obj = await env.PAGES.get("pages/" + slug + "/index.html")
  if (obj) {
    return new Response(obj.body, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600"
      }
    })
  }

  obj = await env.PAGES.get("pages/guest/" + slug + "/index.html")
  if (!obj) {
    return new Response("Not Found", { status: 404 })
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=300",
      "X-Guest-Page": "true"
    }
  })
}

async function handleUploadImage(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  let form, file
  try {
    form = await request.formData()
    file = form.get("file")
  } catch {
    return json({ error: "Invalid form data" }, 400)
  }

  if (!file || typeof file === "string") {
    return json({ error: "Missing file field" }, 400)
  }

  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"])
  const EXT_MAP = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg" }

  const contentType = file.type
  if (!ALLOWED_TYPES.has(contentType)) {
    return json({ error: `Unsupported image type: ${contentType}` }, 400)
  }

  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > 10 * 1024 * 1024) {
    return json({ error: "Image too large (max 10 MB)" }, 413)
  }

  const ext = EXT_MAP[contentType]
  const key = `images/${auth.userId}/${randomHex(16)}${ext}`
  await env.IMAGES.put(key, buffer, { httpMetadata: { contentType } })

  const baseUrl = getBaseUrl(request)
  return json({ url: `${baseUrl}/${key}` }, 201)
}

async function serveImage(path, env) {
  const key = path.slice(1)
  const obj = await env.IMAGES.get(key)
  if (!obj) {
    return new Response("Not Found", { status: 404 })
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  })
}

async function serveNamespacedPage(username, slug, env) {
  const obj = await env.PAGES.get(`pages/${username}/${slug}/index.html`)
  if (!obj) return new Response("Not Found", { status: 404 })
  return new Response(obj.body, {
    headers: { "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" }
  })
}

async function handleUpdateAccount(request, env) {
  const auth = await verifyAuth(request, env)
  if (!auth) return json({ error: "Invalid API key" }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: "Invalid request body" }, 400) }

  const { username } = body
  if (!username || typeof username !== "string") {
    return json({ error: "Username is required" }, 400)
  }
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(username)) {
    return json({ error: "Invalid username format" }, 400)
  }

  const oldUsername = auth.user.username

  const existingUser = await env.USERS.get("username:" + username)
  if (existingUser && existingUser !== auth.userId) {
    return json({ error: `Username already taken: ${username}` }, 409)
  }

  auth.user.username = username
  await env.USERS.put("user:" + auth.userId, JSON.stringify(auth.user))

  if (oldUsername && oldUsername !== username) {
    await env.USERS.delete("username:" + oldUsername)
  }
  await env.USERS.put("username:" + username, auth.userId)

  return json({ username })
}

function getBaseUrl(request) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)/m)
  return match ? match[1].trim() : null
}

async function allocateSlug(env) {
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug()
    const existing = await env.DOCS.get("doc:" + slug)
    if (!existing) return slug
  }
  return null
}

function renderMarkdown(markdown) {
  let result = markdown

  const codeBlocks = []
  result = result.replace(/```([\s\S]*?)```/g, (_, code) => {
    const placeholder = `%%CODEBLOCK_${codeBlocks.length}%%`
    codeBlocks.push(code)
    return placeholder
  })

  result = result.replace(/^\|(.+)\|(\r?\n\|.*\|)*/gm, (match) => {
    const lines = match.split("\n")
    const rows = lines.filter((l, i) => i !== 1 || !/^[\s\|:-]+$/.test(l))
    let html = "<table>\n"
    for (let i = 0; i < rows.length; i++) {
      const tag = i === 0 ? "th" : "td"
      const cells = rows[i].split("|").filter(c => c !== undefined).slice(1, -1)
      html += "<tr>" + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>\n"
    }
    html += "</table>"
    return html
  })

  result = result.replace(/^######\s+(.+)/gm, "<h6>$1</h6>")
  result = result.replace(/^#####\s+(.+)/gm, "<h5>$1</h5>")
  result = result.replace(/^####\s+(.+)/gm, "<h4>$1</h4>")
  result = result.replace(/^###\s+(.+)/gm, "<h3>$1</h3>")
  result = result.replace(/^##\s+(.+)/gm, "<h2>$1</h2>")
  result = result.replace(/^#\s+(.+)/gm, "<h1>$1</h1>")

  result = result.replace(/^---+\s*$/gm, "<hr>")

  result = result.replace(/^>\s+(.+)/gm, "<blockquote>$1</blockquote>")

  result = result.replace(/^(\s*)[-*]\s+(.+)/gm, (_, indent, content) => {
    return `<li>${content}</li>`
  })
  result = result.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")

  result = result.replace(/^\d+\.\s+(.+)/gm, (_, content) => {
    return `<li>${content}</li>`
  })
  result = result.replace(/(?:^<li>.*<\/li>\n?)+/gm, (match) => {
    if (!match.includes("<ol>")) {
      return `<ol>${match}</ol>`
    }
    return match
  })

  const paragraphs = result.split(/\n\n+/)
  result = paragraphs.map(p => {
    const trimmed = p.trim()
    if (!trimmed) return ""
    if (trimmed.startsWith("<")) return trimmed
    return `<p>${trimmed}</p>`
  }).join("\n")

  result = result.replace(/%%CODEBLOCK_(\d+)%%/g, (_, idx) => {
    const code = codeBlocks[parseInt(idx)]
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`
  })

  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>")
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>")
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  return wrapHtml(result)
}

function wrapHtml(content, title) {
  const t = title || "Untitled"
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(t)} — OpenBird</title>
<style>
body{max-width:768px;margin:0 auto;padding:2rem 1.5rem;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;color:#1a1a1a}
h1,h2{border-bottom:1px solid #eee;padding-bottom:.3em}
code{background:#f4f4f4;padding:.2em .4em;border-radius:3px;font-size:.9em}
pre{background:#f4f4f4;padding:1em;border-radius:6px;overflow-x:auto}
pre code{background:none;padding:0}
blockquote{border-left:4px solid #ddd;margin:1em 0;padding:.5em 1em;color:#555}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:.5em .75em}
th{background:#f8f8f8}
img{max-width:100%;height:auto}
a{color:#0366d6}
</style>
</head>
<body>
<article>${content}</article>
</body>
</html>`
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, "0")).join("")
}

const ADJECTIVES = ["bright","calm","swift","red","blue","green","warm","cool","dark","light","sharp","soft","wild","bold","quick","slow","deep","high","low","wide","thin","long","short","clear","pure","dry","wet","raw","rare","kind","wise","fair","fine","rich","new","late","free","full","safe","sure","true","real","open","flat","pale","vast","keen","neat","warm","glad"]
const NOUNS = ["meadow","river","ocean","forest","mountain","valley","field","garden","lake","creek","hill","cliff","canyon","desert","island","shore","beach","cloud","storm","wind","rain","snow","frost","flame","stone","rock","pearl","coral","cedar","maple","pine","oak","wolf","fox","hawk","crane","swan","dove","fish","bear","deer","owl","moth","rose","lily","vine","fern","moss","leaf","seed"]

function generateSlug() {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]
  let adj1 = pick(ADJECTIVES), adj2 = pick(ADJECTIVES)
  while (adj2 === adj1) adj2 = pick(ADJECTIVES)
  return `${adj1}-${adj2}-${pick(NOUNS)}`
}
