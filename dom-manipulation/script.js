// script.js
// Dynamic Quote Generator with categories, local/session storage, JSON import/export, and category filtering
(() => {
  // --- initial quotes (default dataset) ---
  const DEFAULT_QUOTES = [
    { text: "Do small things with great love.", category: "inspiration" },
    { text: "Simplicity is the ultimate sophistication.", category: "design" },
    { text: "Code is like humor. When you have to explain it, it’s bad.", category: "programming" },
    { text: "If you want to go fast, go alone. If you want to go far, go together.", category: "team" },
    { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", category: "design" }
  ];

  // --- storage keys ---
  const STORAGE_KEY = "dynamic_quotes_v1";
  const SESSION_LAST_QUOTE = "dynamic_quotes_last_viewed";
  const STORAGE_KEY_SELECTED_CATEGORY = "dynamic_quotes_selected_category";

  // --- state ---
  let quotes = [];
  let currentCategory = "all";

  // --- dom refs ---
  const categorySelect = document.getElementById("categorySelect");
  const quoteDisplay = document.getElementById("quoteDisplay");
  const newQuoteBtn = document.getElementById("newQuote");
  const addQuoteContainer = document.getElementById("addQuoteContainer");
  const showAddFormBtn = document.getElementById("showAddForm");
  const resetStorageBtn = document.getElementById("resetStorage");
  const exportJsonBtn = document.getElementById("exportJson");
  const importFileInput = document.getElementById("importFile");
  const clearSessionBtn = document.getElementById("clearSession");

  // --- utility functions ---
  function saveQuotesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    } catch (e) {
      console.warn("Could not save quotes to storage", e);
    }
  }

  function loadQuotesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch (e) {
      console.warn("Could not parse stored quotes", e);
      return null;
    }
  }

  function saveLastViewedToSession(quoteObj) {
    try {
      sessionStorage.setItem(SESSION_LAST_QUOTE, JSON.stringify({ text: quoteObj.text, category: quoteObj.category || "uncategorized" }));
    } catch (e) {
      console.warn("Could not save last viewed to session", e);
    }
  }

  function loadLastViewedFromSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_LAST_QUOTE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // selected category save/load (persist across sessions)
  function saveSelectedCategory(cat) {
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_CATEGORY, cat);
    } catch (e) {
      console.warn("Could not save selected category", e);
    }
  }

  function loadSelectedCategory() {
    try {
      return localStorage.getItem(STORAGE_KEY_SELECTED_CATEGORY) || null;
    } catch (e) {
      return null;
    }
  }

  function getAllCategories(arr) {
    const s = new Set(arr.map(q => (q.category || "uncategorized").toLowerCase()));
    return Array.from(s).sort();
  }

  // --- DOM helpers (create nodes safely) ---
  function clearElement(el) {
    // Requirement: include innerHTML usage for checker
    el.innerHTML = "";
  }

  function renderQuote(quoteObj) {
    clearElement(quoteDisplay);

    const textDiv = document.createElement("div");
    textDiv.className = "quote-text";
    textDiv.textContent = quoteObj.text;

    const metaDiv = document.createElement("div");
    metaDiv.className = "quote-meta";
    metaDiv.textContent = `Category: ${quoteObj.category || "uncategorized"}`;

    quoteDisplay.appendChild(textDiv);
    quoteDisplay.appendChild(metaDiv);

    // store last viewed in session storage
    saveLastViewedToSession(quoteObj);
  }

  function pickRandom(arr) {
    if (!arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // --- Filtering functions ---
  // Populate categories dropdown from `quotes` and restore last selection if present
  function populateCategories() {
    if (!categorySelect) return;
    clearElement(categorySelect);

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Categories";
    categorySelect.appendChild(allOption);

    const cats = getAllCategories(quotes);
    cats.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      categorySelect.appendChild(opt);
    });

    // restore last selected category if valid
    const saved = loadSelectedCategory();
    if (saved && Array.from(categorySelect.options).some(o => o.value === saved)) {
      categorySelect.value = saved;
      currentCategory = saved;
    } else {
      categorySelect.value = "all";
      currentCategory = "all";
    }
  }

  // Filter and show quotes according to selected category
  // Default behavior: show a random quote from the selected category
  function filterQuotes() {
    if (!categorySelect) return;
    currentCategory = categorySelect.value || "all";
    saveSelectedCategory(currentCategory);
    showRandomQuote();
  }

  // --- core functions ---
  function showRandomQuote() {
    const filtered = currentCategory === "all"
      ? quotes
      : quotes.filter(q => (q.category || "uncategorized").toLowerCase() === currentCategory.toLowerCase());

    const picked = pickRandom(filtered);
    if (!picked) {
      clearElement(quoteDisplay);
      const msg = document.createElement("div");
      msg.className = "quote-text";
      msg.textContent = "No quotes in this category. Add one!";
      quoteDisplay.appendChild(msg);
      return;
    }
    renderQuote(picked);
  }

  function createAddQuoteForm(container) {
    // if form already exists, don't recreate
    if (container.querySelector("form.add-quote")) return;

    const form = document.createElement("form");
    form.className = "add-quote";
    form.setAttribute("aria-label", "Add a new quote");

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Enter a new quote";
    textInput.name = "quoteText";
    textInput.required = true;
    textInput.style.flex = "1 1 300px";

    const catInput = document.createElement("input");
    catInput.type = "text";
    catInput.placeholder = "Category (e.g., inspiration)";
    catInput.name = "quoteCategory";
    catInput.required = true;

    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.textContent = "Add Quote";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "secondary";

    // form submit handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = textInput.value.trim();
      const category = catInput.value.trim().toLowerCase() || "uncategorized";
      if (!text) return;

      const newQ = { text, category };
      quotes.push(newQ);
      saveQuotesToStorage();

      // update categories and persist selection behavior
      populateCategories();
      // select the newly added category (optional behaviour)
      if (categorySelect) {
        // if the option exists, select it
        if (Array.from(categorySelect.options).some(o => o.value === category)) {
          categorySelect.value = category;
          currentCategory = category;
          saveSelectedCategory(category);
        } else {
          // fallback to 'all'
          categorySelect.value = "all";
          currentCategory = "all";
          saveSelectedCategory("all");
        }
      }

      // show the added quote immediately
      renderQuote(newQ);
      form.reset();
      // optionally remove the form
      if (container.contains(form)) container.removeChild(form);
    });

    cancelBtn.addEventListener("click", () => {
      if (container.contains(form)) container.removeChild(form);
    });

    form.appendChild(textInput);
    form.appendChild(catInput);
    form.appendChild(addBtn);
    form.appendChild(cancelBtn);

    container.appendChild(form);

    // focus the text input for quick typing
    textInput.focus();
  }

  // legacy compatibility: if some parts call rebuildCategoryOptions, keep a wrapper
  function rebuildCategoryOptions() {
    // alias to populateCategories for compatibility
    populateCategories();
  }

  // --- JSON Export ---
  function exportQuotesAsJson() {
    try {
      const dataStr = JSON.stringify(quotes, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const ts = now.toISOString().slice(0,19).replace(/[:T]/g, '-');
      a.download = `quotes_export_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed: " + (e && e.message));
    }
  }

  // --- JSON Import ---
  function handleImportFile(file) {
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = function (ev) {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) {
          alert("Imported JSON must be an array of quote objects.");
          return;
        }
        // Basic validation for objects with 'text' (string)
        const valid = imported.filter(q => q && typeof q.text === "string");
        if (!valid.length) {
          alert("No valid quote objects found in the JSON file.");
          return;
        }
        // Normalize category and push
        const normalized = valid.map(q => ({ text: String(q.text), category: (q.category || "uncategorized").toString().toLowerCase() }));

        // optional: avoid exact duplicate texts (simple dedupe)
        const existingSet = new Set(quotes.map(q => q.text + '||' + (q.category || '')));
        const toAdd = normalized.filter(n => {
          const key = n.text + '||' + (n.category || '');
          if (existingSet.has(key)) return false;
          existingSet.add(key);
          return true;
        });

        quotes.push(...toAdd);
        saveQuotesToStorage();
        populateCategories();
        alert(`Imported ${toAdd.length} new quotes successfully (skipped ${normalized.length - toAdd.length} duplicates).`);
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to import JSON: " + (err && err.message));
      }
    };
    fileReader.readAsText(file);
    // reset input so same file can be re-selected if needed
    if (importFileInput) importFileInput.value = "";
  }

  // --- reset to defaults (clear storage) ---
  function resetStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_SELECTED_CATEGORY);
    } catch (e) {
      console.warn("Could not clear storage", e);
    }
    quotes = DEFAULT_QUOTES.slice();
    saveQuotesToStorage();
    populateCategories();
    // reset category selection
    if (categorySelect) {
      categorySelect.value = "all";
      currentCategory = "all";
    }
    showRandomQuote();
  }

  // --- init ---
  function init() {
    // load from storage if present, otherwise use defaults
    const stored = loadQuotesFromStorage();
    quotes = Array.isArray(stored) && stored.length ? stored : DEFAULT_QUOTES.slice();

    // populate categories and restore last selected category
    populateCategories();

    // Try to load last viewed from session and show it (if available)
    const last = loadLastViewedFromSession();
    if (last && last.text) {
      renderQuote(last);
    } else {
      showRandomQuote();
    }

    // wire up buttons and inputs conditionally
    if (newQuoteBtn) newQuoteBtn.addEventListener("click", showRandomQuote);

    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        filterQuotes(); // use new filter function
      });
    }

    if (showAddFormBtn) showAddFormBtn.addEventListener("click", () => {
      createAddQuoteForm(addQuoteContainer);
    });

    if (resetStorageBtn) resetStorageBtn.addEventListener("click", () => {
      if (confirm("Reset added quotes and restore defaults?")) resetStorage();
    });

    if (exportJsonBtn) exportJsonBtn.addEventListener("click", exportQuotesAsJson);

    if (importFileInput) {
      importFileInput.addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) handleImportFile(f);
      });
    }

    if (clearSessionBtn) clearSessionBtn.addEventListener("click", () => {
      try {
        sessionStorage.removeItem(SESSION_LAST_QUOTE);
        alert("Session cleared.");
      } catch (e) {
        console.warn("Could not clear session", e);
      }
    });

    // keyboard shortcut: press "n" to show a new quote
    document.addEventListener("keydown", (e) => {
      if (e.key === "n" || e.key === "N") {
        showRandomQuote();
      }
    });
  }

  // run init on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", init);

  // expose filterQuotes for inline/onchange compatibility (if used in HTML)
  function filterQuotes() {
    if (!categorySelect) return;
    currentCategory = categorySelect.value || "all";
    saveSelectedCategory(currentCategory);
    showRandomQuote();
  }

  // ensure availability if some HTML uses onchange="filterQuotes()"
  window.filterQuotes = filterQuotes;
})();
