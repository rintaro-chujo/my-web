const fs = require('fs');
const path = require('path');

// --- Data loading ---
function loadData() {
  const read = (name) => JSON.parse(fs.readFileSync(path.join('data', name), 'utf8'));
  return {
    profile: read('profile.json'),
    education: read('education.json'),
    experience: read('experience.json'),
    grants: read('grants.json'),
    categories: read('categories.json'),
    publications: read('publications.json'),
    service: read('service.json'),
    media: read('media.json'),
  };
}

// --- Helpers (ported from main.js) ---
function t(obj, lang) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj['en'] || obj['ja'] || '';
}

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function displayName(nameObj, lang) {
  const raw = t(nameObj, lang);
  const parts = raw.split(', ');
  if (parts.length !== 2) return raw;
  if (lang === 'ja') return parts[0] + ' ' + parts[1];
  return parts[1] + ' ' + parts[0];
}

function formatAuthors(authors, lang) {
  if (!Array.isArray(authors)) return t(authors, lang);
  return authors.map(a => {
    const name = displayName(a.name, lang);
    return a.equal ? name + '*' : name;
  }).join(', ');
}

function hasEqualContribution(authors) {
  return Array.isArray(authors) && authors.some(a => a.equal);
}

function sortByDate(data) {
  return data.slice().sort((a, b) => {
    const ya = parseInt(b.year || '0') - parseInt(a.year || '0');
    if (ya !== 0) return ya;
    return parseInt(b.month || '0') - parseInt(a.month || '0');
  });
}

function formatVenue(entry, lang) {
  const v = (field) => t(entry[field], lang);
  const parts = [];
  if (entry.booktitle) parts.push(v('booktitle'));
  if (entry.journal) parts.push(v('journal'));
  if (entry.series) parts.push(entry.series);
  if (entry.volume && entry.number) parts.push(`vol. ${entry.volume}, no. ${entry.number}`);
  else if (entry.volume) parts.push(`vol. ${entry.volume}`);
  if (entry.paper_id) parts.push(entry.paper_id);
  if (entry.publisher) parts.push(entry.publisher);
  if (entry.location) parts.push(entry.location);
  if (entry.articleno) parts.push(`Article ${entry.articleno}`);
  if (entry.pages) parts.push(`pp. ${entry.pages}`);
  if (entry.eprint) parts.push(`arXiv:${entry.eprint}`);
  let result = parts.join(', ');
  if (entry.year) {
    const date = entry.month ? `${entry.year}.${entry.month}` : entry.year;
    result += ` (${date})`;
  }
  if (entry.acceptance_rate) result += `. Acceptance rate: ${entry.acceptance_rate}`;
  return result + '.';
}

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
  return '<ul>' + data.map(item => `
    <li>
      <span class="item-degree">${t(item.degree, lang)}</span>, ${t(item.period, lang)}
      <ul>
        <li>${t(item.institution, lang)}</li>
        <li>${t(item.adviser, lang)}</li>
      </ul>
    </li>
  `).join('') + '</ul>';
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
  const catOrder = categories.slice().sort((a, b) => a.sort - b.sort);
  const grouped = {};
  for (const entry of publications) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }

  return catOrder.map(cat => {
    const entries = grouped[cat.id];
    if (!entries || entries.length === 0) return '';
    entries.sort((a, b) => {
      const ya = parseInt(b.year || '0') - parseInt(a.year || '0');
      if (ya !== 0) return ya;
      return parseInt(b.month || '0') - parseInt(a.month || '0');
    });

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
      <div id="education-list" class="list-section">${bilingualBlock(lang => buildEducation(data.education, lang))}</div>
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
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  const data = loadData();
  const html = buildHTML(data);

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/index.html', html, 'utf8');
  fs.writeFileSync('index.html', html, 'utf8');

  copyRecursive('css', 'dist/css');
  copyRecursive('assets', 'dist/assets');

  fs.mkdirSync('dist/js', { recursive: true });
  fs.copyFileSync('js/client.js', 'dist/js/client.js');

  console.log('Build complete: index.html and dist/index.html');
}

build();
