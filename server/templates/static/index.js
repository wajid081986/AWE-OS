// Barebones HTML/CSS building blocks for the AI Factory 'static-bundle'
// product type (SDD Phase 1 §4.3). Independent of the PDFKit resume
// templates that live alongside it in server/templates/ — those render
// into a PDFKit doc; these assemble plain HTML/CSS strings.

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CSS = `
:root {
  --ink: #111111;
  --muted: #5a5a5a;
  --accent: #2b5cff;
  --bg: #ffffff;
  --card-bg: #f7f7f9;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  color: var(--ink);
  background: var(--bg);
  line-height: 1.5;
}
.container { max-width: 880px; margin: 0 auto; padding: 0 24px; }
.hero { padding: 96px 0 64px; text-align: center; }
.hero h1 { font-size: 2.5rem; margin: 0 0 16px; }
.hero p { font-size: 1.15rem; color: var(--muted); max-width: 560px; margin: 0 auto 32px; }
.btn {
  display: inline-block;
  padding: 12px 28px;
  background: var(--accent);
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
}
.features { padding: 48px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
.feature-card { background: var(--card-bg); border-radius: 12px; padding: 24px; }
.feature-card h3 { margin: 0 0 8px; font-size: 1.05rem; }
.feature-card p { margin: 0; color: var(--muted); font-size: 0.95rem; }
.cta { padding: 64px 0 96px; text-align: center; }
.cta h2 { font-size: 1.8rem; margin: 0 0 24px; }
`.trim();

function heroSection(hero = {}) {
  const headline    = escapeHtml(hero.headline || '');
  const subheadline = escapeHtml(hero.subheadline || '');
  const ctaText      = escapeHtml(hero.cta_text || 'Get Started');
  return `<section class="hero">
      <h1>${headline}</h1>
      <p>${subheadline}</p>
      <a class="btn" href="#cta">${ctaText}</a>
    </section>`;
}

function featuresSection(features = []) {
  if (!features.length) return '';
  const cards = features.map(f => `
      <div class="feature-card">
        <h3>${escapeHtml(f.title)}</h3>
        <p>${escapeHtml(f.description)}</p>
      </div>`).join('');
  return `<section class="features">${cards}\n    </section>`;
}

function ctaSection(cta = {}) {
  const heading    = escapeHtml(cta.heading || '');
  const buttonText = escapeHtml(cta.button_text || 'Get Started');
  return `<section class="cta" id="cta">
      <h2>${heading}</h2>
      <a class="btn" href="#">${buttonText}</a>
    </section>`;
}

// Builds a static-bundle product page from generated copy sections.
// Returns a filename -> content map; index.html inlines the CSS so the
// download is self-contained even when only index.html is fetched.
function buildStaticBundle({ name, description, hero, features, cta } = {}) {
  const title = escapeHtml(name || 'Untitled');
  const desc  = escapeHtml(description || '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <style>
${CSS}
  </style>
</head>
<body>
  <div class="container">
    ${heroSection(hero)}
    ${featuresSection(features)}
    ${ctaSection(cta)}
  </div>
</body>
</html>
`;

  return {
    'index.html': html,
    'style.css': CSS,
  };
}

module.exports = { buildStaticBundle };
