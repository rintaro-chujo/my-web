# Rintaro Chujo - Portfolio Site

Academic portfolio site for Rintaro Chujo. Hosted on GitHub Pages.

## Quick Start

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Build

```bash
npm install     # once, for the PDF renderer
npm run build   # site + CV (HTML and PDF)
```

| Command | Output |
| --- | --- |
| `npm run build:site` | `index.html` + `dist/` |
| `npm run build:cv` | `cv-{en,ja}.html` and `cv-{en,ja}.pdf` |
| `npm run build` | both |

Generated files are committed, because GitHub Pages serves the repository root.
Run `npm run build` before pushing whenever `data/` changes.

### CV / PDF

[build-cv.js](build-cv.js) renders the same `data/*.json` into a print-oriented
page ([css/cv.css](css/cv.css)) and prints it to PDF through an already-installed
Chrome (via `puppeteer-core` — no browser binary is downloaded). Set
`CHROME_PATH` if auto-detection fails:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run build:cv
```

In the **English** CV, categories that are Japanese-only are collapsed to a single
count line (e.g. `(38 others in Japanese domestic conferences)`) instead of being
listed entry by entry. Which categories, and the exact wording, are set in
`EN_SUMMARY_CATEGORIES` at the top of [build-cv.js](build-cv.js). The Japanese CV
always lists everything.

The "Last updated" line in the PDF footer comes from the date of the last commit
that touched `data/`, so rebuilding without content changes produces an
identical PDF instead of a spurious diff.

Formatting logic shared by the site and the CV lives in [lib/render.js](lib/render.js).

## Structure

```
.
├── index.html          # Generated site (committed; GitHub Pages serves it)
├── cv-en.html          # Generated CV, English (print-oriented)
├── cv-ja.html          # Generated CV, Japanese
├── cv-en.pdf           # Generated CV PDF, English
├── cv-ja.pdf           # Generated CV PDF, Japanese
├── build.js            # Site build
├── build-cv.js         # CV + PDF build
├── lib/render.js       # Shared data loading & formatting
├── css/style.css       # Styles
├── js/main.js          # Rendering logic & language switching
├── assets/
│   └── profile.jpg     # Profile photo
└── data/               # All content managed here
    ├── profile.json        # Name, bio, contact info
    ├── education.json      # Education history
    ├── experience.json     # Academic & work experience
    ├── grants.json         # Grants & honors
    ├── categories.json     # Publication category definitions
    ├── publications.json   # Publications (BibTeX-style fields)
    ├── talks.json          # Invited talks
    ├── service.json        # Academic service
    └── media.json          # Media coverage
```

## Updating Content

All content is stored as JSON in `data/`. Edit the JSON files directly to update the site.

### Bilingual Support

Fields that differ between English and Japanese use an object:

```json
{"en": "English text", "ja": "日本語テキスト"}
```

Fields that are the same in both languages can use a plain string.

### Publications

Publications are a flat array in `publications.json`. Each entry references a category ID defined in `categories.json`.

**categories.json** defines the display order and bilingual labels:

```json
[
  {"id": "journal", "en": "Journal Paper", "ja": "学術雑誌論文", "sort": 1},
  {"id": "intl-full", "en": "International Conference (Full paper, reviewed)", "ja": "国際会議 (フルペーパー、査読あり)", "sort": 2},
  ...
]
```

**Publication entry fields** (BibTeX-style):

| Field | Description | Example |
|-------|-------------|---------|
| `category` | Category ID from categories.json | `"journal"` |
| `authors` | Array of author objects | See below |
| `title` | Paper title (bilingual) | `{"en": "...", "ja": "..."}` |
| `lang` | Entry language (`"en"` or `"ja"`). English entries display in English even in JP mode | `"en"` |
| `journal` | Journal name | `"IEICE Transactions..."` |
| `booktitle` | Conference/proceedings name | `"CHI '22"` |
| `year` | Publication year | `"2024"` |
| `month` | Publication month | `"5"` |
| `volume` | Volume | `"E107.D"` |
| `number` | Issue number | `"3"` |
| `pages` | Page range | `"1-16"` |
| `articleno` | Article number | `"527"` |
| `publisher` | Publisher | `"ACM"` |
| `location` | Conference location | `"Yokohama, Japan"` |
| `paper_id` | Paper/session ID | `"C-1-6"` |
| `series` | Series abbreviation | `"MVE"` |
| `eprint` | arXiv ID (preprints) | `"2410.15023"` |
| `acceptance_rate` | Acceptance rate | `"23.7%"` |
| `doi` | DOI URL | `"https://doi.org/..."` |
| `award` | Award info (bilingual) | `{"en": "Best Paper", "ja": "..."}` |
| `links` | Additional links | `[{"label": "Demo", "url": "..."}]` |

**Author format** (BibTeX-style `Last, First`):

```json
{
  "authors": [
    {"name": {"en": "Chujo, Rintaro", "ja": "中條, 麟太郎"}},
    {"name": {"en": "Suzuki, Atsunobu", "ja": "鈴木, 敦命"}, "equal": true}
  ]
}
```

Set `"equal": true` for equal-contribution authors (shown with `*`).

### Adding a New Publication

Add an object to the `publications.json` array:

```json
{
  "category": "intl-full",
  "authors": [
    {"name": {"en": "Chujo, Rintaro", "ja": "中條, 麟太郎"}}
  ],
  "title": {"en": "Paper Title", "ja": "Paper Title"},
  "booktitle": "CHI '26",
  "year": "2026",
  "doi": "https://doi.org/...",
  "award": null,
  "links": [],
  "lang": "en"
}
```

### Media Coverage

```json
{
  "date": "2024.01.01",
  "title": {"en": "Article Title", "ja": "記事タイトル"},
  "url": "https://..."
}
```

## Deployment

Push to `main` branch. GitHub Pages serves the site as static files (no build step required).
