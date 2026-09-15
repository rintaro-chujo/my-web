// Shared data loading and formatting logic used by both the site build
// (build.js) and the CV/PDF build (build-cv.js).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// --- Data loading ---
function loadData() {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf8'));
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

// --- Helpers ---
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

// Reduce a period string to the year range used in the Education column:
// "Apr. 2023 - Mar. 2025" -> "2023 - 2025", "2025年4月 - 現在" -> "2025 - 現在".
function periodYears(period, lang) {
  const raw = t(period, lang);
  if (!raw) return "";
  return raw
    .split(/\s+[-–—]\s+/)
    .map(part => {
      const year = part.match(/\d{4}/);
      return year ? year[0] : part.trim();
    })
    .join(" - ");
}

// Institution names are headings in the CV layout, so a trailing sentence
// period reads as a typo there.
function stripTrailingPeriod(text) {
  return String(text).replace(/\.\s*$/, "");
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

// Publications grouped by category, in category sort order, each group
// sorted newest first. Empty categories are dropped.
function groupPublications(publications, categories) {
  const grouped = {};
  for (const entry of publications) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }
  return categories
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map(cat => ({ category: cat, entries: sortByDate(grouped[cat.id] || []) }))
    .filter(group => group.entries.length > 0);
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

module.exports = {
  ROOT,
  loadData,
  t,
  escapeHTML,
  displayName,
  periodYears,
  stripTrailingPeriod,
  formatAuthors,
  hasEqualContribution,
  sortByDate,
  formatVenue,
  groupPublications,
  copyRecursive,
};
