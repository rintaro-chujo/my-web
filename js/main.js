let currentLang = 'en';

function t(obj, langOverride) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  const lang = langOverride || currentLang;
  return obj[lang] || obj['en'] || obj['ja'] || '';
}

async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function displayName(nameObj, langOverride) {
  const lang = langOverride || currentLang;
  const raw = t(nameObj, lang);
  const parts = raw.split(', ');
  if (parts.length !== 2) return raw;
  if (lang === 'ja') return parts[0] + ' ' + parts[1];
  return parts[1] + ' ' + parts[0];
}

function formatAuthors(authors, langOverride) {
  if (!Array.isArray(authors)) return t(authors, langOverride);
  return authors.map(a => {
    const name = displayName(a.name, langOverride);
    return a.equal ? name + '*' : name;
  }).join(', ');
}

function hasEqualContribution(authors) {
  return Array.isArray(authors) && authors.some(a => a.equal);
}

function renderProfile(data) {
  document.getElementById('profile-name').textContent = t(data.name).toUpperCase();
  document.getElementById('profile-bio').textContent = t(data.bio);

  const contact = document.getElementById('profile-contact');
  contact.innerHTML = `
    <p>Email (work): ${data.contact.email_work}</p>
    <p>Email (research): ${data.contact.email_research}</p>
    <p>Twitter: <a href="${data.contact.twitter}" target="_blank">${data.contact.twitter}</a></p>
  `;
}

function renderEducation(data) {
  const el = document.getElementById('education-list');
  el.className = 'list-section';
  el.innerHTML = '<ul>' + data.map(item => `
    <li>
      <span class="item-degree">${t(item.degree)}</span>, ${t(item.period)}
      <ul>
        <li>${t(item.institution)}</li>
        <li>${t(item.adviser)}</li>
      </ul>
    </li>
  `).join('') + '</ul>';
}

function renderExperience(data) {
  const el = document.getElementById('experience-list');
  el.className = 'list-section';
  el.innerHTML = '<ul>' + data.map(item => {
    const desc = item.description && t(item.description)
      ? `<ul><li>${t(item.description)}</li></ul>` : '';
    return `<li>
      <span class="item-degree">${t(item.title)},</span> ${t(item.organization)}, ${t(item.period)}
      ${desc}
    </li>`;
  }).join('') + '</ul>';
}

function sortByDate(data) {
  return data.slice().sort((a, b) => {
    const ya = parseInt(b.year || '0') - parseInt(a.year || '0');
    if (ya !== 0) return ya;
    return parseInt(b.month || '0') - parseInt(a.month || '0');
  });
}

function renderGrants(data) {
  const el = document.getElementById('grants-list');
  el.className = 'grants-section';
  el.innerHTML = '<ul>' + sortByDate(data).map(item => {
    const desc = item.description ? `<br>${t(item.description)}` : '';
    return `<li><span class="grant-title-text">${t(item.title)}</span>, ${t(item.date)}${desc}</li>`;
  }).join('') + '</ul>';
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

function renderPublications(publications, categories) {
  const el = document.getElementById('publications-list');
  const catOrder = categories.sort((a, b) => a.sort - b.sort);
  const grouped = {};
  for (const entry of publications) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }

  el.innerHTML = catOrder.map(cat => {
    const entries = grouped[cat.id];
    if (!entries || entries.length === 0) return '';
    entries.sort((a, b) => {
      const ya = parseInt(b.year || '0') - parseInt(a.year || '0');
      if (ya !== 0) return ya;
      return parseInt(b.month || '0') - parseInt(a.month || '0');
    });


    const entriesHTML = entries.map(entry => {
      const entryLang = entry.lang === 'en' ? 'en' : null;
      const authors = formatAuthors(entry.authors, entryLang);
      const title = t(entry.title, entryLang);
      const venue = formatVenue(entry, entryLang);
      const doi = entry.doi ? ` <a href="${entry.doi}" target="_blank">${entry.doi}</a>` : '';
      const award = entry.award ? ` <span class="pub-award">(🏆 ${t(entry.award)})</span>` : '';
      const equalNote = hasEqualContribution(entry.authors) ? ' <span class="pub-note">(*: equal contribution)</span>' : '';
      const links = entry.links && entry.links.length > 0
        ? ` <span class="pub-links">${entry.links.filter(l => l.url).map(l => `<a href="${l.url}" target="_blank">[${l.label}]</a>`).join(' ')}</span>`
        : '';

      return `
        <div class="pub-entry">
          ${authors}. "${title}," ${venue}${doi}${award}${equalNote}${links}
        </div>
      `;
    }).join('');

    return `
      <div class="pub-category">
        <h3>${t(cat)}</h3>
        ${entriesHTML}
      </div>
    `;
  }).join('');
}

function renderTalks(data) {
  const el = document.getElementById('talks-list');
  el.innerHTML = sortByDate(data).map(item => `
    <div class="talk-item">
      ${formatAuthors(item.authors)}. "${t(item.title)}," ${t(item.venue)}
    </div>
  `).join('');
}

function renderService(data) {
  document.getElementById('service-content').textContent = t(data.review);
}

function renderMedia(data) {
  const el = document.getElementById('media-list');
  el.innerHTML = data.map(item => {
    const title = t(item.title);
    const titleHTML = item.url
      ? `<a href="${item.url}" target="_blank">${title}</a>`
      : title;
    return `<div class="media-item">${item.date} ${titleHTML}</div>`;
  }).join('');
}

function updateNavLabels() {
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.getAttribute(`data-${currentLang}`);
  });
}

let allData = {};

async function init() {
  const [profile, education, experience, grants, categories, publications, talks, service, media] = await Promise.all([
    loadJSON('data/profile.json'),
    loadJSON('data/education.json'),
    loadJSON('data/experience.json'),
    loadJSON('data/grants.json'),
    loadJSON('data/categories.json'),
    loadJSON('data/publications.json'),
    loadJSON('data/talks.json'),
    loadJSON('data/service.json'),
    loadJSON('data/media.json'),
  ]);

  allData = { profile, education, experience, grants, categories, publications, talks, service, media };
  renderAll();
}

function renderAll() {
  renderProfile(allData.profile);
  renderEducation(allData.education);
  renderExperience(allData.experience);
  renderGrants(allData.grants);
  renderPublications(allData.publications, allData.categories);
  renderTalks(allData.talks);
  renderService(allData.service);
  renderMedia(allData.media);
  updateNavLabels();
}

function switchLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`lang-${lang}`).classList.add('active');
  renderAll();
}

document.getElementById('lang-en').addEventListener('click', () => switchLang('en'));
document.getElementById('lang-ja').addEventListener('click', () => switchLang('ja'));

init();
