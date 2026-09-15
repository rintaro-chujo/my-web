const fs = require('fs');
const path = require('path');
const {
  ROOT,
  loadData,
  t,
  escapeHTML,
  periodYears,
  stripTrailingPeriod,
  formatAuthors,
  hasEqualContribution,
  sortByDate,
  formatVenue,
  groupPublications,
  copyRecursive,
} = require('./lib/render');

// --- Bilingual helpers ---
function bilingual(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return escapeHTML(obj);
  const en = obj.en || '';
  const ja = obj.ja || obj.en || '';
  if (en === ja) return escapeHTML(en);
  return `<span lang="en">${escapeHTML(en)}</span><span lang="ja">${escapeHTML(ja)}</span>`;
}

function bilingualBlock(renderFn) {
  return `<div lang="en">${renderFn('en')}</div><div lang="ja">${renderFn('ja')}</div>`;
}

// --- Section builders ---
function buildProfile(data) {
  const nameEN = escapeHTML(t(data.name, 'en').toUpperCase());
  const nameJA = escapeHTML(t(data.name, 'ja'));
  const nameHTML = nameEN === nameJA
    ? nameEN
    : `<span lang="en">${nameEN}</span><span lang="ja">${nameJA}</span>`;

  const bioHTML = bilingual(data.bio);

  const contactHTML = `
    <p>Email (work): ${escapeHTML(data.contact.email_work)}</p>
    <p>Email (research): ${escapeHTML(data.contact.email_research)}</p>
    <p>Twitter: <a href="${data.contact.twitter}" target="_blank">${escapeHTML(data.contact.twitter)}</a></p>
  `;

  return { nameHTML, bioHTML, contactHTML };
}

function buildEducation(data, lang) {
  return '<ul class="edu-list">' + data.map(item => {
    const meta = [item.degree, item.adviser, item.thesis]
      .filter(field => field && t(field, lang))
      .map(field => `<div class="edu-meta">${escapeHTML(t(field, lang))}</div>`)
      .join('');
    return `<li class="edu-item">
      <div class="edu-period">${escapeHTML(periodYears(item.period, lang))}</div>
      <div class="edu-body">
        <div class="edu-institution">${escapeHTML(stripTrailingPeriod(t(item.institution, lang)))}</div>
        ${meta}
      </div>
    </li>`;
  }).join('') + '</ul>';
}

function buildExperience(data, lang) {
  return '<ul>' + data.map(item => {
    const desc = item.description && t(item.description, lang)
      ? `<ul><li>${t(item.description, lang)}</li></ul>` : '';
    return `<li>
      <span class="item-degree">${t(item.title, lang)},</span> ${t(item.organization, lang)}, ${t(item.period, lang)}
      ${desc}
    </li>`;
  }).join('') + '</ul>';
}

function buildGrants(data, lang) {
  return '<ol>' + sortByDate(data).map(item => {
    const desc = item.description ? `<br>${t(item.description, lang)}` : '';
    return `<li><span class="grant-title-text">${t(item.title, lang)}</span>, ${t(item.date, lang)}${desc}</li>`;
  }).join('') + '</ol>';
}

function buildPublications(publications, categories, lang) {
  return groupPublications(publications, categories).map(({ category: cat, entries }) => {
    const entriesHTML = entries.map(entry => {
      const entryLang = entry.lang === 'en' ? 'en' : lang;
      const authors = formatAuthors(entry.authors, entryLang);
      const title = t(entry.title, entryLang);
      const venue = formatVenue(entry, entryLang);
      const doi = entry.doi ? ` <a href="${entry.doi}" target="_blank">${entry.doi}</a>` : '';
      const award = entry.award ? ` <span class="pub-award">(\u{1F3C6} ${t(entry.award, lang)})</span>` : '';
      const equalNote = hasEqualContribution(entry.authors) ? ' <span class="pub-note">(*: equal contribution)</span>' : '';
      const links = entry.links && entry.links.length > 0
        ? ` <span class="pub-links">${entry.links.filter(l => l.url).map(l => `<a href="${l.url}" target="_blank">[${l.label}]</a>`).join(' ')}</span>`
        : '';
      return `
        <li class="pub-entry">
          ${authors}. "${title}," ${venue}${doi}${award}${equalNote}${links}
        </li>
      `;
    }).join('');

    return `
      <div class="pub-category">
        <h3>${t(cat, lang)}</h3>
        <ol class="pub-list">${entriesHTML}</ol>
      </div>
    `;
  }).join('');
}

function buildService(data, lang) {
  return escapeHTML(t(data.review, lang));
}

function buildMedia(data, lang) {
  return data.map(item => {
    const title = t(item.title, lang);
    const titleHTML = item.url
      ? `<a href="${item.url}" target="_blank">${title}</a>`
      : title;
    return `<div class="media-item">${item.date} ${titleHTML}</div>`;
  }).join('');
}

// --- HTML template ---
function buildHTML(data) {
  const profile = buildProfile(data.profile);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rintaro Chujo</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="top-bar">
    <div class="top-bar-left">
      <span class="site-name">RINTARO CHUJO</span>
    </div>
    <div class="top-bar-right">
      <a id="cv-link" class="cv-btn" href="cv-en.pdf" download>
        <span lang="en">CV (PDF)</span><span lang="ja">履歴書 (PDF)</span>
      </a>
      <span class="lang-sep">|</span>
      <button id="lang-en" class="lang-btn active">EN</button>
      <span class="lang-sep">|</span>
      <button id="lang-ja" class="lang-btn">JP</button>
    </div>
  </header>

  <main class="content">
    <section id="profile" class="section">
      <div class="profile-header">
        <img id="profile-photo" src="assets/profile.jpg" alt="Rintaro Chujo" class="profile-photo">
        <div class="profile-info">
          <h1 id="profile-name">${profile.nameHTML}</h1>
          <p id="profile-bio" class="bio">${profile.bioHTML}</p>
          <h2><span lang="en">Contact</span><span lang="ja">連絡先</span></h2>
          <div id="profile-contact" class="contact">${profile.contactHTML}</div>
        </div>
      </div>
    </section>

    <section id="education" class="section">
      <h2><span lang="en">Education</span><span lang="ja">学歴</span></h2>
      <div id="education-list" class="edu-section">${bilingualBlock(lang => buildEducation(data.education, lang))}</div>
    </section>

    <section id="experience" class="section">
      <h2><span lang="en">Academic and Work Experience</span><span lang="ja">研究・職歴</span></h2>
      <div id="experience-list" class="list-section">${bilingualBlock(lang => buildExperience(data.experience, lang))}</div>
    </section>

    <section id="grants" class="section">
      <h2><span lang="en">Grants and Honors</span><span lang="ja">受賞・助成</span></h2>
      <div id="grants-list" class="grants-section">${bilingualBlock(lang => buildGrants(data.grants, lang))}</div>
    </section>

    <section id="publications" class="section">
      <h2><span lang="en">Publications</span><span lang="ja">業績一覧</span></h2>
      <div id="publications-list">${bilingualBlock(lang => buildPublications(data.publications, data.categories, lang))}</div>
    </section>

    <section id="service" class="section">
      <h2><span lang="en">Academic Service</span><span lang="ja">学術活動</span></h2>
      <div id="service-content">${bilingualBlock(lang => buildService(data.service, lang))}</div>
    </section>

    <section id="media" class="section">
      <h2><span lang="en">Media Coverage</span><span lang="ja">メディア掲載</span></h2>
      <div id="media-list">${bilingualBlock(lang => buildMedia(data.media, lang))}</div>
    </section>
  </main>

  <script src="js/client.js"></script>
</body>
</html>`;
}

// --- File operations ---
function build() {
  const r = (...p) => path.join(ROOT, ...p);
  const data = loadData();
  const html = buildHTML(data);

  fs.mkdirSync(r("dist"), { recursive: true });
  fs.writeFileSync(r("dist", "index.html"), html, "utf8");
  fs.writeFileSync(r("index.html"), html, "utf8");

  copyRecursive(r("css"), r("dist", "css"));
  copyRecursive(r("assets"), r("dist", "assets"));

  fs.mkdirSync(r("dist", "js"), { recursive: true });
  fs.copyFileSync(r("js", "client.js"), r("dist", "js", "client.js"));

  console.log("Build complete: index.html and dist/index.html");
}

build();
