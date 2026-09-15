// Builds the CV: data/*.json -> cv-{en,ja}.html -> cv-{en,ja}.pdf
//
// The PDF is rendered by driving an already-installed Chrome through
// puppeteer-core, so no browser binary is downloaded. Override the browser
// with CHROME_PATH=/path/to/chrome if auto-detection fails.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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
} = require('./lib/render');

const LANGS = ['en', 'ja'];

// Categories that are collapsed to a single count line in the English CV.
// The Japanese CV always lists every entry. Edit the wording here.
const EN_SUMMARY_CATEGORIES = {
  "domestic": (n) => `(${n} others in Japanese domestic conferences)`,
  "article": (n) => `(${n} others in Japanese introduction articles)`,
  "invited-talk": (n) => `(${n} others in Japanese invited talks)`,
  "exhibition": (n) => `(${n} others in Japanese exhibitions)`,
};

const LABELS = {
  en: {
    docTitle: 'Rintaro Chujo — Curriculum Vitae',
    education: 'Education',
    experience: 'Academic and Work Experience',
    grants: 'Grants and Honors',
    publications: 'Publications',
    service: 'Academic Service',
    equalNote: '*: equal contribution',
    printHint: 'Print this page (or download the PDF) for an A4 copy.',
    footerName: 'Rintaro Chujo — Curriculum Vitae',
    updated: 'Last updated',
  },
  ja: {
    docTitle: '中條 麟太郎 — 履歴書・業績一覧',
    education: '学歴',
    experience: '研究・職歴',
    grants: '受賞・助成',
    publications: '業績一覧',
    service: '学術活動',
    equalNote: '*: 共同筆頭著者',
    printHint: 'このページを印刷するとA4版のCVになります。',
    footerName: '中條 麟太郎 — 履歴書・業績一覧',
    updated: '最終更新',
  },
};

// --- Helpers ---

// Date of the last change to data/, so rebuilding without content changes
// produces an identical PDF instead of a spurious diff.
function lastUpdated() {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', 'data'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch (e) {
    // not a git checkout, or git unavailable
  }
  return new Date().toISOString().slice(0, 10);
}

// --- Section builders ---

function buildHeader(profile, lang) {
  const name = escapeHTML(t(profile.name, lang));
  const contacts = [
    escapeHTML(t(profile.contact.email_work, lang)),
    escapeHTML(t(profile.contact.email_research, lang)),
  ];
  if (profile.website) {
    contacts.push(`<a href="${profile.website}">${escapeHTML(profile.website.replace(/^https?:\/\//, ''))}</a>`);
  }
  if (profile.contact.twitter) {
    contacts.push(`<a href="${profile.contact.twitter}">${escapeHTML(profile.contact.twitter.replace(/^https?:\/\//, ''))}</a>`);
  }

  return `
  <header class="cv-header">
    <h1 class="cv-name">${name}</h1>
    <p class="cv-contact">${contacts.map(c => `<span>${c}</span>`).join('')}</p>
  </header>`;
}

function buildEducation(data, lang) {
  return '<ul class="edu-list">' + data.map(item => {
    const meta = [item.degree, item.adviser, item.thesis]
      .filter(field => field && t(field, lang))
      .map(field => `<div class="edu-meta">${escapeHTML(t(field, lang))}</div>`)
      .join('');
    return `<li class="edu-item">`
      + `<div class="edu-period">${escapeHTML(periodYears(item.period, lang))}</div>`
      + `<div class="edu-body">`
      + `<div class="edu-institution">${escapeHTML(stripTrailingPeriod(t(item.institution, lang)))}</div>`
      + `${meta}</div></li>`;
  }).join('') + '</ul>';
}

function buildExperience(data, lang) {
  return '<ul class="cv-list">' + data.map(item => {
    const desc = item.description && t(item.description, lang)
      ? `<span class="cv-entry-note">${escapeHTML(t(item.description, lang))}</span>`
      : '';
    return `<li><span class="cv-entry-title">${escapeHTML(t(item.title, lang))}</span>`
      + `<span class="cv-entry-meta">, ${escapeHTML(t(item.organization, lang))}, ${escapeHTML(t(item.period, lang))}</span>${desc}</li>`;
  }).join('') + '</ul>';
}

function buildGrants(data, lang) {
  return '<ul class="cv-list">' + sortByDate(data).map(item => {
    const desc = item.description
      ? `<span class="cv-entry-note">${escapeHTML(t(item.description, lang))}</span>`
      : '';
    return `<li><span class="cv-entry-title">${escapeHTML(t(item.title, lang))}</span>`
      + `<span class="cv-entry-meta">, ${escapeHTML(t(item.date, lang))}</span>${desc}</li>`;
  }).join('') + '</ul>';
}

function buildPublications(publications, categories, lang) {
  return groupPublications(publications, categories).map(({ category, entries }) => {
    const summarize = lang === "en" && EN_SUMMARY_CATEGORIES[category.id];
    if (summarize) {
      return `<h3>${escapeHTML(t(category, lang))}</h3>`
        + `<p class="cv-pub-summary">${escapeHTML(summarize(entries.length))}</p>`;
    }

    const items = entries.map(entry => {
      // Entries flagged lang:"en" keep their English metadata in both builds.
      const entryLang = entry.lang === 'en' ? 'en' : lang;
      const authors = escapeHTML(formatAuthors(entry.authors, entryLang));
      const title = escapeHTML(t(entry.title, entryLang));
      const venue = escapeHTML(formatVenue(entry, entryLang));
      const doi = entry.doi
        ? ` <a class="cv-doi" href="${entry.doi}">${escapeHTML(entry.doi)}</a>`
        : '';
      const award = entry.award
        ? ` <span class="cv-award">(\u{1F3C6} ${escapeHTML(t(entry.award, lang))})</span>`
        : '';
      const equalNote = hasEqualContribution(entry.authors)
        ? ` <span class="cv-note">(${LABELS[lang].equalNote})</span>`
        : '';
      const links = entry.links && entry.links.some(l => l.url)
        ? ` <span class="cv-links">${entry.links.filter(l => l.url)
            .map(l => `<a href="${l.url}">[${escapeHTML(l.label)}]</a>`).join(' ')}</span>`
        : '';
      return `<li>${authors}. <span class="cv-pub-title">&ldquo;${title},&rdquo;</span> ${venue}${doi}${award}${equalNote}${links}</li>`;
    }).join('');

    return `<h3>${escapeHTML(t(category, lang))}</h3><ol class="cv-pub-list">${items}</ol>`;
  }).join('');
}

function buildService(data, lang) {
  return `<p>${escapeHTML(t(data.review, lang))}</p>`;
}

// --- Page template ---

function section(id, heading, body) {
  if (!body) return '';
  return `
    <section id="${id}" class="cv-section">
      <h2>${escapeHTML(heading)}</h2>
      ${body}
    </section>`;
}

function buildCVHTML(data, lang, updated) {
  const L = LABELS[lang];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(L.docTitle)}</title>
  <link rel="stylesheet" href="css/cv.css">
</head>
<body>
  <p class="cv-print-hint">${escapeHTML(L.printHint)} · ${escapeHTML(L.updated)}: ${updated}</p>
${buildHeader(data.profile, lang)}
${section('education', L.education, buildEducation(data.education, lang))}
${section('publications', L.publications, buildPublications(data.publications, data.categories, lang))}
${section('experience', L.experience, buildExperience(data.experience, lang))}
${section('grants', L.grants, buildGrants(data.grants, lang))}
${section('service', L.service, buildService(data.service, lang))}
</body>
</html>`;
}

// --- PDF rendering ---

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'No Chrome/Chromium found. Set CHROME_PATH to a browser executable, e.g.\n'
    + '  CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run build'
  );
}

function footerTemplate(lang, updated) {
  const L = LABELS[lang];
  return `<div style="width:100%;margin:0 15mm;font-family:Arial,'Hiragino Sans',sans-serif;font-size:7pt;color:#666;display:flex;justify-content:space-between;">
    <span>${L.footerName}</span>
    <span>${L.updated}: ${updated}</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;
}

// Chrome stamps the wall-clock time into every PDF it prints, which would make
// each rebuild a fresh binary diff. Rewrite both dates to the content date; the
// replacement is the same byte length, so the xref offsets stay valid.
function normalizePDFDates(pdfPath, updated) {
  const stamp = `D:${updated.replace(/-/g, '')}000000+00'00'`;
  const raw = fs.readFileSync(pdfPath).toString('latin1');
  const normalized = raw.replace(/\/(CreationDate|ModDate) \(D:\d{14}\+00'00'\)/g, (match, key) => {
    const replacement = `/${key} (${stamp})`;
    return replacement.length === match.length ? replacement : match;
  });
  if (normalized !== raw) fs.writeFileSync(pdfPath, Buffer.from(normalized, 'latin1'));
}

async function renderPDFs(targets, updated) {
  // puppeteer-core ships as ESM, so it has to be pulled in dynamically here.
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  try {
    for (const { lang, htmlPath, pdfPath } of targets) {
      const page = await browser.newPage();
      await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: footerTemplate(lang, updated),
        margin: { top: '14mm', bottom: '16mm', left: '15mm', right: '15mm' },
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

// --- Entry point ---

async function main() {
  const r = (...p) => path.join(ROOT, ...p);
  const data = loadData();
  const updated = lastUpdated();
  const targets = [];

  fs.mkdirSync(r('dist'), { recursive: true });

  for (const lang of LANGS) {
    const html = buildCVHTML(data, lang, updated);
    const name = `cv-${lang}`;
    fs.writeFileSync(r(`${name}.html`), html, 'utf8');
    fs.writeFileSync(r('dist', `${name}.html`), html, 'utf8');
    targets.push({ lang, htmlPath: r(`${name}.html`), pdfPath: r(`${name}.pdf`) });
  }

  await renderPDFs(targets, updated);

  for (const { pdfPath } of targets) {
    normalizePDFDates(pdfPath, updated);
    fs.copyFileSync(pdfPath, r('dist', path.basename(pdfPath)));
  }

  const sizes = targets
    .map(({ pdfPath }) => `${path.basename(pdfPath)} (${Math.round(fs.statSync(pdfPath).size / 1024)} KB)`)
    .join(', ');
  console.log(`CV build complete: ${sizes} — last updated ${updated}`);
}

main().catch(err => {
  console.error('CV build failed:', err.message);
  process.exit(1);
});
