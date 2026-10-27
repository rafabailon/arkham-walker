# Arkham Walker

Walk the uncanny line. Arkham Walker is a responsive, bilingual reading journal for cosmic horror and uncanny-fiction reviews, field notes, and curated reading paths.

## Languages and pages

- `en/` — English version.
- `es/` — Spanish version.
- `index.html` — language selector.

Each language folder contains:

- `index.html` — home page, recent reviews, and newsletter demo.
- `reviews.html` — searchable, filterable archive with sorting and shareable URLs.
- `review.html?id=<book-id>` — dynamic review with sanity score, reading-list control, and related entries.
- `field-notes.html` — curated reading paths.
- `reading-list.html` — saved reviews stored locally in the browser.
- `about.html` — editorial introduction and principles.

### Choose English or Spanish

Open the root `index.html` and select the English or Spanish entry. To open a language directly, visit `en/index.html` or `es/index.html`. The language-switch links on corresponding pages take you to the equivalent page in the other language. For dynamic reviews, retain the review ID when switching languages, for example `en/review.html?id=the-drowned-bell` or its Spanish counterpart `es/review.html?id=the-drowned-bell`.

### Archive links and the reading list

Archive searches, genre filters, and sort order are reflected in the page URL, so a filtered view can be bookmarked or shared. The reading list stores bookmarked review IDs in `localStorage` under `arkham-walker:reading-list`; nothing is sent to a server. Use the bookmark button on any review card or review page, then open the reading list from the main navigation.

## Shared assets

```text
assets/
  css/site.css
  favicon.svg
  js/site.js
  js/books.en.js
  js/books.es.js
en/                     English pages
es/                     Spanish pages
```

## Run locally

Open `index.html` to select a language, or serve this directory:

```sh
make serve
```

Then visit `http://localhost:8000`. Google Fonts and Unsplash photographs are loaded externally and require an internet connection. The newsletter form is a demo and does not submit or store email addresses. Book titles and authors are fictional sample data.

## Tests

Run the local static-site checks with Python 3.10 or later:

```sh
make test
```

The checks verify page metadata and language pairing, local links and assets, archive and reading-list controls, bilingual catalog integrity, responsive breakpoints, reduced-motion support, local script loading, and documentation consistency. They do not measure browser rendering or external CDN performance.

## Structure

```text
assets/
  css/site.css
  favicon.svg
  js/site.js
  js/books.en.js
  js/books.es.js
en/                     English pages
es/                     Spanish pages
tests/test_site.py      Static page, asset, and catalog checks
Makefile                test / serve / clean helpers
index.html              Language selector
```

## Privacy and demo content

The site is fully static. The only browser storage is the optional reading list. Newsletter submissions remain in the page and are discarded. All book titles, authors, and reviews are fictional examples for demonstration purposes.
