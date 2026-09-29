# Maungu's Couture & Trade — website

Static site built with plain HTML, CSS and vanilla JavaScript. It is published
straight from this repository with GitHub Pages (see `.github/workflows/static.yml`),
so `index.html` sits at the repository root and every asset path is relative.

## Folder layout

```
.
├── index.html                    the whole site: landing sections 01-08,
│                                 the store block (#shop) and the footer
├── css/
│   └── maungu-home.css           all styling; design tokens (colours, fonts,
│                                 navbar height) live in :root at the top
├── js/
│   ├── i18n-dictionary.js        MAUNGU_TRANSLATIONS - fr / es / de strings,
│   │                             keyed by the English text on the page
│   ├── i18n.js                   translation engine (text nodes, alt,
│   │                             placeholder, title, aria-label, page title)
│   ├── language-selector.js      header globe menu; shares the
│   │                             "maungu-language" localStorage key
│   ├── slider.js                 reusable card slider (index.html also has an
│   │                             inline copy for the moments strip)
│   └── maungo-home.js            home helpers
├── images/
│   ├── hero/                     hero + campaign photography
│   ├── campaign/                 coming-soon / reveal artwork
│   ├── app/                      mobile app screenshots
│   └── story/                    brand + style-guide photos (see "Known gaps")
└── .github/workflows/static.yml  GitHub Pages deployment on push to main
```

Rules of thumb:

* one stylesheet in `css/`, all behaviour in `js/`, all pictures in `images/`
  grouped by the section they belong to;
* nothing is duplicated between the root and a folder — each file lives once;
* new pages (FAQ, delivery, contact …) go at the root next to `index.html`,
  because the footer links to them as `faq.html`, `delivery.html`, …;
* new pictures go into the matching `images/<group>/` folder and are referenced
  as `images/<group>/<name>.<ext>`.

## Preview locally

Any static server works. The quickest one, if Python 3 is installed:

```bash
cd "Maungus Shop"
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from the file system also works, but the
translation dictionaries behave best over `http://`.

## Deploy

Push to `main`: the workflow uploads the repository root to GitHub Pages.

## Known gaps

Referenced but not yet in the repository — they currently return 404, so add the
file (or remove the reference) when the content is ready:

| Missing | Referenced from |
| --- | --- |
| `js/theme.js`, `js/translate.js` | `index.html` `<head>` |
| `js/api.js`, `js/store-categories.js`, `js/nav.js`, `js/location-modal.js`, `js/main.js`, `js/storefront.js`, `js/maungu-v2.js` | `index.html` end of `<body>` |
| `faq.html`, `delivery.html`, `returns.html`, `custom-print-faq.html`, `contact.html`, `terms.html`, `privacy.html` | footer links |
| `images/story/about-maungu.jpg`, `images/story/image1.jpg` | section 02 moment cards and section 05 story cards |

The store block (`#shop`) renders its grid from JavaScript, so it stays empty
until the scripts above are written.
