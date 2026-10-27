"""Static checks for the bilingual Arkham Walker site."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ("en", "es")
EXPECTED_PAGES = {"index.html", "reviews.html", "review.html", "field-notes.html", "reading-list.html", "about.html"}
PAGES = (ROOT / "index.html", *sorted((ROOT / "en").glob("*.html")), *sorted((ROOT / "es").glob("*.html")))
CATALOGS = {language: ROOT / "assets" / "js" / f"books.{language}.js" for language in LANGUAGES}


class PageInspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.lang = ""
        self.title = ""
        self.meta_names: set[str] = set()
        self.ids: set[str] = set()
        self.links: list[str] = []
        self.resources: list[str] = []
        self.tags: dict[str, int] = {}
        self.body_page = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        self.tags[tag] = self.tags.get(tag, 0) + 1
        if tag == "html":
            self.lang = attributes.get("lang", "") or ""
        elif tag == "title":
            self._in_title = True
        elif tag == "body":
            self.body_page = attributes.get("data-page", "") or ""
        if tag == "meta" and attributes.get("name"):
            self.meta_names.add(attributes["name"] or "")
        if attributes.get("id"):
            self.ids.add(attributes["id"] or "")
        if tag == "a" and attributes.get("href"):
            self.links.append(attributes["href"] or "")
        for attribute in ("src", "href"):
            value = attributes.get(attribute)
            if value and (
                attribute == "src"
                or (tag == "link" and attributes.get("rel") in {"stylesheet", "icon"})
            ):
                self.resources.append(value)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data.strip()


def inspect_page(path: Path) -> PageInspector:
    parser = PageInspector()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def load_catalog(path: Path) -> list[dict[str, object]]:
    """Read the JS catalog, which uses JSON-compatible values with unquoted keys."""
    text = path.read_text(encoding="utf-8")
    start = text.index("[", text.index("window.ARKHAM_BOOKS"))
    end = text.rindex("]") + 1
    payload = text[start:end]
    payload = re.sub(r"(?m)^(\s*)([A-Za-z_][A-Za-z0-9_]*):", r'\1"\2":', payload)
    return json.loads(payload)


class StaticSiteTests(unittest.TestCase):
    def test_all_pages_have_language_metadata_and_main_landmark(self) -> None:
        for page in PAGES:
            with self.subTest(page=page.relative_to(ROOT)):
                inspector = inspect_page(page)
                expected_language = page.parent.name if page.parent.name in LANGUAGES else "es"
                self.assertEqual(inspector.lang, expected_language)
                self.assertTrue(inspector.title)
                self.assertIn("Arkham Walker", inspector.title)
                self.assertIn("viewport", inspector.meta_names)
                self.assertIn("description", inspector.meta_names)
                self.assertEqual(inspector.tags.get("main"), 1)
                self.assertTrue(inspector.body_page)

    def test_local_links_and_assets_resolve(self) -> None:
        for page in PAGES:
            inspector = inspect_page(page)
            for reference in (*inspector.links, *inspector.resources):
                parsed = urlsplit(reference)
                if parsed.scheme or parsed.netloc or reference.startswith("data:"):
                    continue
                target = (page.parent / unquote(parsed.path)).resolve() if parsed.path else page
                if target.is_dir():
                    target = target / "index.html"
                with self.subTest(page=page.relative_to(ROOT), reference=reference):
                    self.assertTrue(target.is_file(), f"Missing local target: {reference}")
                    if parsed.fragment and target.suffix == ".html":
                        self.assertIn(
                            unquote(parsed.fragment),
                            inspect_page(target).ids,
                            f"Missing anchor in {target}: {parsed.fragment}",
                        )

    def test_language_pages_are_complete_pairs(self) -> None:
        english = {page.name for page in (ROOT / "en").glob("*.html")}
        spanish = {page.name for page in (ROOT / "es").glob("*.html")}
        self.assertEqual(english, spanish)
        self.assertEqual(english, EXPECTED_PAGES)

    def test_archive_controls_and_dynamic_detail_mount_point_exist(self) -> None:
        for language in LANGUAGES:
            archive = (ROOT / language / "reviews.html").read_text(encoding="utf-8")
            detail = (ROOT / language / "review.html").read_text(encoding="utf-8")
            with self.subTest(language=language):
                for marker in ('id="review-search"', 'id="genre-filter"', 'id="review-sort"', 'id="all-reviews"'):
                    self.assertIn(marker, archive)
                self.assertIn('id="review-detail"', detail)
                self.assertIn('aria-live="polite"', detail)

    def test_styles_support_small_screens_and_reduced_motion(self) -> None:
        stylesheet = (ROOT / "assets/css/site.css").read_text(encoding="utf-8")
        for marker in (
            "@media (max-width: 700px)",
            "@media (max-width: 430px)",
            "@media (prefers-reduced-motion: reduce)",
            "[hidden] { display: none !important; }",
            ".book-save",
            ".page-hero-list",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, stylesheet)

    def test_book_catalog_data_is_complete(self) -> None:
        required = {"id", "title", "author", "category", "score", "date", "image", "alt", "excerpt", "body", "verdict", "details"}
        for language, path in CATALOGS.items():
            catalog = load_catalog(path)
            with self.subTest(language=language):
                self.assertGreaterEqual(len(catalog), 4)
                ids = [entry["id"] for entry in catalog]
                self.assertEqual(len(ids), len(set(ids)), "Book IDs must be unique")
                for entry in catalog:
                    self.assertTrue(required.issubset(entry), f"Missing fields in {entry.get('id')}")
                    for field in required - {"score"}:
                        self.assertIsInstance(entry[field], str)
                        self.assertTrue(entry[field].strip(), f"Empty {field} in {entry['id']}")
                    self.assertIsInstance(entry["score"], int)
                    self.assertGreaterEqual(entry["score"], 0)
                    self.assertLessEqual(entry["score"], 100)
                    self.assertTrue(str(entry["image"]).startswith("https://images.unsplash.com/"))

    def test_bilingual_catalogs_stay_in_sync(self) -> None:
        english = load_catalog(CATALOGS["en"])
        spanish = load_catalog(CATALOGS["es"])
        self.assertEqual([entry["id"] for entry in english], [entry["id"] for entry in spanish])
        for en_entry, es_entry in zip(english, spanish):
            with self.subTest(book=en_entry["id"]):
                self.assertEqual(en_entry["score"], es_entry["score"])
                self.assertEqual(en_entry["image"], es_entry["image"])
                self.assertNotEqual(en_entry["title"], es_entry["title"])

    def test_reading_list_feature_is_wired_for_both_languages(self) -> None:
        script = (ROOT / "assets/js/site.js").read_text(encoding="utf-8")
        for marker in (
            "arkham-walker:reading-list",
            "localStorage",
            "escapeHtml",
            "safeScore",
            "data-save-id",
            "arkham:saved",
            "history.replaceState",
            "popstate",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, script)

        for language in LANGUAGES:
            page = (ROOT / language / "reading-list.html").read_text(encoding="utf-8")
            for marker in (
                'data-page="reading-list"',
                'id="reading-list"',
                'id="reading-list-empty"',
                'id="reading-list-count"',
                'id="clear-reading-list"',
            ):
                with self.subTest(language=language, marker=marker):
                    self.assertIn(marker, page)
            for sibling in (ROOT / language).glob("*.html"):
                with self.subTest(language=language, page=sibling.name):
                    self.assertIn('data-nav="reading-list"', sibling.read_text(encoding="utf-8"))
                    self.assertIn("data-reading-count", sibling.read_text(encoding="utf-8"))

    def test_pages_use_local_scripts_and_icon(self) -> None:
        for page in PAGES:
            inspector = inspect_page(page)
            with self.subTest(page=page.relative_to(ROOT)):
                self.assertIn("favicon.svg", " ".join(inspector.resources))
                for resource in inspector.resources:
                    parsed = urlsplit(resource)
                    if parsed.path.endswith(".js"):
                        self.assertFalse(parsed.netloc, f"Unexpected remote script: {resource}")
        site_sources = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (*PAGES, ROOT / "assets/js/site.js", ROOT / "assets/css/site.css")
        )
        self.assertNotIn("cdn.tailwindcss.com", site_sources)

    def test_root_language_selector_links_both_sections(self) -> None:
        inspector = inspect_page(ROOT / "index.html")
        self.assertIn("es/index.html", inspector.links)
        self.assertIn("en/index.html", inspector.links)

    def test_documentation_matches_current_project(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertTrue(readme.startswith("# Arkham Walker"))
        self.assertIn("reading list", readme.lower())
        self.assertIn("make test", readme)


if __name__ == "__main__":
    unittest.main()
