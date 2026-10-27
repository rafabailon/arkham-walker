(() => {
  "use strict";

  const books = (Array.isArray(window.ARKHAM_BOOKS) ? window.ARKHAM_BOOKS : [])
    .filter(book => book && typeof book.id === "string" && book.id && typeof book.title === "string");
  const language = document.documentElement.lang === "es" ? "es" : "en";
  const STORAGE_KEY = "arkham-walker:reading-list";
  const copy = language === "es" ? {
    sanity: "cordura %",
    reviewLink: "Leer reseña de",
    by: "por",
    bookBy: "Un libro de",
    readReview: "Leer reseña de campo",
    entries: "entrada",
    entriesPlural: "entradas",
    found: "en el archivo",
    back: "← Volver al archivo",
    missingEyebrow: "El rastro se ha perdido",
    missingTitle: "No existe esta entrada en el registro.",
    missingCopy: "Quizá nunca debió encontrarse.",
    missingPageTitle: "Entrada no encontrada — Arkham Walker",
    returnArchive: "Volver al archivo",
    approved: "Registrado por la sala de lectura",
    independent: "Reseña independiente",
    spoilers: "Sin apenas destripes",
    uncanny: "Ficción insólita",
    further: "Para seguir leyendo",
    another: "Otra ruta por explorar",
    archive: "El archivo",
    thanks: "Gracias. Esta demo está lista para conectarse a una lista de correo.",
    openMenu: "Abrir navegación",
    closeMenu: "Cerrar navegación",
    switchLanguage: "English",
    save: "Guardar en la lista de lectura",
    remove: "Quitar de la lista de lectura",
    saveLabel: "Guardar",
    savedLabel: "Guardada",
    savedEntry: "entrada guardada",
    savedEntries: "entradas guardadas",
    readingEmpty: "Aún no hay rutas guardadas. Marca una reseña y te esperará aquí.",
    clearList: "Vaciar lista",
    noBooks: "El archivo sigue catalogándose. Vuelve pronto.",
    browseArchive: "Explorar el archivo"
  } : {
    sanity: "sanity %",
    reviewLink: "Read review of",
    by: "by",
    bookBy: "A book by",
    readReview: "Read field review",
    entries: "entry",
    entriesPlural: "entries",
    found: "in the archive",
    back: "← Back to the archive",
    missingEyebrow: "The trail goes cold",
    missingTitle: "No such entry in the ledger.",
    missingCopy: "Perhaps it was never meant to be found.",
    missingPageTitle: "Entry not found — Arkham Walker",
    returnArchive: "Return to the archive",
    approved: "Filed by the reading room",
    independent: "Independent review",
    spoilers: "Spoiler-light",
    uncanny: "Uncanny fiction",
    further: "Further reading",
    another: "Another trail to follow",
    archive: "The archive",
    thanks: "Thank you. This demo is ready to connect to a mailing list.",
    openMenu: "Open navigation",
    closeMenu: "Close navigation",
    switchLanguage: "Español",
    save: "Save to reading list",
    remove: "Remove from reading list",
    saveLabel: "Save",
    savedLabel: "Saved",
    savedEntry: "saved entry",
    savedEntries: "saved entries",
    readingEmpty: "No saved trails yet. Bookmark a review and it will wait for you here.",
    clearList: "Clear list",
    noBooks: "The archive is still being catalogued. Check back soon.",
    browseArchive: "Browse the archive"
  };
  const eyeIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">
      <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z"/>
      <circle cx="12" cy="12" r="2.7"/><path d="M12 8.1v1.2"/>
    </svg>`;
  const bookmarkIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" aria-hidden="true">
      <path d="M6.5 3.5h11v17l-5.5-4-5.5 4v-17Z"/>
    </svg>`;

  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => entities[character]);
  }

  function safeScore(value) {
    const score = Number(value);
    return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  }

  function getSaved() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (!Array.isArray(parsed)) return [];
      const known = new Set(books.map(book => book.id));
      return [...new Set(parsed.filter(id => typeof id === "string" && known.has(id)))];
    } catch {
      return [];
    }
  }

  function setSaved(ids) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The page still works.
    }
  }

  function isSaved(id) {
    return getSaved().includes(id);
  }

  function updateReadingCounters() {
    const count = getSaved().length;
    document.querySelectorAll("[data-reading-count]").forEach(element => {
      element.textContent = String(count);
      element.hidden = count === 0;
    });
  }

  function syncSaveButtons() {
    const saved = getSaved();
    document.querySelectorAll("[data-save-id]").forEach(button => {
      const savedNow = saved.includes(button.dataset.saveId);
      button.setAttribute("aria-pressed", String(savedNow));
      button.classList.toggle("is-saved", savedNow);
      const title = button.dataset.bookTitle ? `: ${button.dataset.bookTitle}` : "";
      button.setAttribute("aria-label", `${savedNow ? copy.remove : copy.save}${title}`);
      const label = button.querySelector("[data-save-label]");
      if (label) label.textContent = savedNow ? copy.savedLabel : copy.saveLabel;
    });
    updateReadingCounters();
  }

  function toggleSaved(id) {
    if (!books.some(book => book.id === id)) return false;
    const saved = getSaved();
    const next = saved.includes(id) ? saved.filter(entry => entry !== id) : [...saved, id];
    setSaved(next);
    syncSaveButtons();
    return next.includes(id);
  }

  function saveButton(book, labelled = false) {
    const saved = isSaved(book.id);
    const title = escapeHtml(book.title);
    return `
      <button class="book-save${labelled ? " book-save--labelled" : ""}${saved ? " is-saved" : ""}" type="button"
        data-save-id="${escapeHtml(book.id)}" data-book-title="${title}"
        aria-pressed="${saved}" aria-label="${escapeHtml((saved ? copy.remove : copy.save) + ": " + book.title)}">
        ${bookmarkIcon}${labelled ? `<span data-save-label>${saved ? copy.savedLabel : copy.saveLabel}</span>` : ""}
      </button>`;
  }

  function bookCard(book) {
    const score = safeScore(book.score);
    return `
      <article class="book-card">
        ${saveButton(book)}
        <a class="book-card-link" href="review.html?id=${encodeURIComponent(book.id)}" aria-label="${escapeHtml(copy.reviewLink + " " + book.title)}">
          <div class="book-cover">
            <img src="${escapeHtml(book.image)}" alt="${escapeHtml(book.alt)}" loading="lazy" decoding="async">
            <span class="book-category">${escapeHtml(book.category)}</span>
            <span class="score-ring" style="--score:${score}%">
              <span class="score-inside"><span class="score-number">${eyeIcon}<span>${score}</span></span><span class="score-label">${copy.sanity}</span></span>
            </span>
          </div>
          <div class="book-info">
            <h3>${escapeHtml(book.title)}</h3>
            <p class="book-author">${copy.by} ${escapeHtml(book.author)}</p>
            <p class="book-excerpt">${escapeHtml(book.excerpt)}</p>
            <span class="card-action">${copy.readReview} <span aria-hidden="true">→</span></span>
          </div>
        </a>
      </article>`;
  }

  function setupNavigation() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;

    const activeLink = nav.querySelector(`[data-nav="${document.body.dataset.page}"]`);
    activeLink?.setAttribute("aria-current", "page");

    const languageLink = document.createElement("a");
    const destinationLanguage = language === "es" ? "en" : "es";
    languageLink.className = "language-switch";
    const destination = new URL(window.location.href);
    destination.pathname = destination.pathname.replace(/\/(en|es)\//, `/${destinationLanguage}/`);
    const genreNames = {
      "Maritime horror": "Terror marítimo",
      "Weird fiction": "Ficción extraña",
      "Cosmic horror": "Terror cósmico",
      "Gothic mystery": "Misterio gótico",
      "Terror marítimo": "Maritime horror",
      "Ficción extraña": "Weird fiction",
      "Terror cósmico": "Cosmic horror",
      "Misterio gótico": "Gothic mystery"
    };
    const currentGenre = destination.searchParams.get("genre");
    if (currentGenre && genreNames[currentGenre]) destination.searchParams.set("genre", genreNames[currentGenre]);
    languageLink.href = `${destination.pathname}${destination.search}${destination.hash}`;
    languageLink.textContent = copy.switchLanguage;
    languageLink.setAttribute("aria-label", language === "es" ? "Cambiar idioma a inglés" : "Switch language to Spanish");
    nav.append(languageLink);

    function closeMenu() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", copy.openMenu);
    }

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? copy.closeMenu : copy.openMenu);
      nav.classList.toggle("is-open", open);
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  function setupHome() {
    const featured = document.querySelector("#featured-reviews");
    if (!featured) return;
    featured.innerHTML = books.length
      ? books.slice(0, 3).map(bookCard).join("")
      : `<p class="empty-state">${copy.noBooks}</p>`;
  }

  function setupArchive() {
    const grid = document.querySelector("#all-reviews");
    if (!grid) return;
    const search = document.querySelector("#review-search");
    const genre = document.querySelector("#genre-filter");
    const sort = document.querySelector("#review-sort");
    const empty = document.querySelector("#library-empty");
    const count = document.querySelector("#library-count");
    if (!search || !genre || !sort) return;

    [...new Set(books.map(book => book.category))].sort().forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      genre.append(option);
    });

    const params = new URLSearchParams(window.location.search);
    const requestedGenre = params.get("genre");
    const requestedSort = params.get("sort");
    if (requestedGenre && [...genre.options].some(option => option.value === requestedGenre)) genre.value = requestedGenre;
    if (requestedSort && [...sort.options].some(option => option.value === requestedSort)) sort.value = requestedSort;
    search.value = params.get("q") ?? "";

    function syncUrl() {
      const nextParams = new URLSearchParams();
      if (search.value.trim()) nextParams.set("q", search.value.trim());
      if (genre.value) nextParams.set("genre", genre.value);
      if (sort.value !== "featured") nextParams.set("sort", sort.value);
      const query = nextParams.toString();
      const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      try {
        window.history.replaceState(null, "", next);
      } catch {
        // History updates are a convenience; blocked file:// or sandbox contexts still render.
      }
    }

    function render() {
      const query = search.value.trim().toLocaleLowerCase();
      let results = books.filter(book => {
        const text = `${book.title} ${book.author} ${book.category} ${book.excerpt}`.toLocaleLowerCase();
        return text.includes(query) && (!genre.value || book.category === genre.value);
      });
      if (sort.value === "score") results = [...results].sort((a, b) => safeScore(b.score) - safeScore(a.score));
      if (sort.value === "title") results = [...results].sort((a, b) => a.title.localeCompare(b.title));
      grid.innerHTML = results.map(bookCard).join("");
      if (count) count.textContent = `${results.length} ${results.length === 1 ? copy.entries : copy.entriesPlural} ${copy.found}`;
      if (empty) empty.hidden = results.length > 0;
      syncUrl();
    }

    search.addEventListener("input", render);
    genre.addEventListener("change", render);
    sort.addEventListener("change", render);
    window.addEventListener("popstate", () => {
      const state = new URLSearchParams(window.location.search);
      const stateGenre = state.get("genre") ?? "";
      const stateSort = state.get("sort") ?? "featured";
      search.value = state.get("q") ?? "";
      genre.value = [...genre.options].some(option => option.value === stateGenre) ? stateGenre : "";
      sort.value = [...sort.options].some(option => option.value === stateSort) ? stateSort : "featured";
      render();
    });
    render();
  }

  function setupReview() {
    const container = document.querySelector("#review-detail");
    if (!container) return;
    const id = new URLSearchParams(window.location.search).get("id");
    const book = books.find(entry => entry.id === id);
    if (!book) {
      document.title = copy.missingPageTitle;
      container.innerHTML = `
        <a class="detail-back" href="reviews.html">${copy.back}</a>
        <div class="not-found"><p class="eyebrow eyebrow-moss">${copy.missingEyebrow}</p><h1>${copy.missingTitle}</h1><p>${copy.missingCopy}</p><a class="button button-moss" href="reviews.html">${copy.returnArchive}</a></div>`;
      return;
    }
    const score = safeScore(book.score);
    document.title = `${book.title} — Arkham Walker`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", `${book.title} ${copy.by} ${book.author}: ${book.verdict}`);
    container.innerHTML = `
      <a class="detail-back" href="reviews.html">${copy.back}</a>
      <div class="detail-layout">
        <figure class="detail-cover"><img src="${escapeHtml(book.image)}" alt="${escapeHtml(book.alt)}" decoding="async"><figcaption>${escapeHtml(book.category)}</figcaption></figure>
        <article class="detail-content">
          <p class="eyebrow eyebrow-moss">${escapeHtml(book.category)} <span class="detail-dot">•</span> ${escapeHtml(book.date)}</p>
          <h1>${escapeHtml(book.title)}</h1><p class="detail-author">${copy.bookBy} ${escapeHtml(book.author)}</p>
          <div class="detail-score">
            <span class="score-ring" style="--score:${score}%"><span class="score-inside"><span class="score-number">${eyeIcon}<span>${score}</span></span><span class="score-label">${copy.sanity}</span></span></span>
            <span class="detail-score-caption">${copy.approved}</span>
          </div>
          <p class="detail-verdict">“${escapeHtml(book.verdict)}”</p>
          <div class="detail-copy"><p>${escapeHtml(book.body)}</p><p>${escapeHtml(book.details)}</p></div>
          <div class="detail-meta"><span>${copy.independent}</span><span>${copy.spoilers}</span><span>${copy.uncanny}</span></div>
          <div class="detail-actions">${saveButton(book, true)}</div>
        </article>
      </div>
      <section class="related-section"><div class="section-heading"><div><p class="eyebrow eyebrow-moss">${copy.further}</p><h2>${copy.another}</h2></div><a class="text-link" href="reviews.html">${copy.archive} <span aria-hidden="true">→</span></a></div><div class="book-grid related-grid"></div></section>`;
    container.querySelector(".related-grid").innerHTML = books.filter(entry => entry.id !== book.id).slice(0, 2).map(bookCard).join("");
  }

  function setupReadingListPage() {
    const grid = document.querySelector("#reading-list");
    if (!grid) return;
    const empty = document.querySelector("#reading-list-empty");
    const count = document.querySelector("#reading-list-count");
    const clear = document.querySelector("#clear-reading-list");

    function render() {
      const saved = getSaved();
      const entries = saved.map(id => books.find(book => book.id === id)).filter(Boolean);
      grid.innerHTML = entries.map(bookCard).join("");
      if (count) count.textContent = `${entries.length} ${entries.length === 1 ? copy.savedEntry : copy.savedEntries}`;
      if (empty) empty.hidden = entries.length > 0;
      if (clear) clear.hidden = entries.length === 0;
    }

    clear?.addEventListener("click", () => {
      setSaved([]);
      syncSaveButtons();
      render();
    });
    document.addEventListener("arkham:saved", render);
    render();
  }

  function setupSaveButtons() {
    document.addEventListener("click", event => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("[data-save-id]");
      if (!button) return;
      const id = button.dataset.saveId;
      if (!id) return;
      const saved = toggleSaved(id);
      document.dispatchEvent(new CustomEvent("arkham:saved", { detail: { id, saved } }));
    });
  }

  function setupDispatch() {
    document.querySelectorAll("[data-newsletter]").forEach(form => {
      form.addEventListener("submit", event => {
        event.preventDefault();
        const email = form.querySelector('input[type="email"]');
        if (!email || !email.checkValidity()) {
          email?.reportValidity();
          return;
        }
        if (form.nextElementSibling) form.nextElementSibling.textContent = copy.thanks;
        form.reset();
      });
    });
  }

  setupNavigation();
  setupSaveButtons();
  setupHome();
  setupArchive();
  setupReview();
  setupReadingListPage();
  setupDispatch();
  syncSaveButtons();
})();
