(function () {
  "use strict";

  var STORAGE_KEY = "listbyme.v1";
  var LEGACY_STORAGE_KEY = "storyReader.v1";
  var library = window.STORY_LIBRARY || [];
  var storiesById = {};
  library.forEach(function (s) {
    storiesById[s.id] = s;
  });

  var state = loadState();
  var currentStoryId = null; // which story the reader screen is showing right now

  // ---- DOM refs ----
  var storyTitleEl = document.getElementById("storyTitle");
  var chapterContentEl = document.getElementById("chapterContent");
  var tocListEl = document.getElementById("tocList");
  var tocSearchEl = document.getElementById("tocSearch");
  var chapterPosEl = document.getElementById("chapterPos");
  var progressBarTopEl = document.getElementById("progressBarTop");
  var prevBtn = document.getElementById("prevChapter");
  var nextBtn = document.getElementById("nextChapter");
  var resumeToast = document.getElementById("resumeToast");
  var body = document.body;

  var libraryMainEl = document.getElementById("library");
  var readerMainEl = document.getElementById("reader");
  var libraryListEl = document.getElementById("libraryList");
  var continueCardEl = document.getElementById("continueCard");
  var continueTitleEl = document.getElementById("continueTitle");
  var continueSubEl = document.getElementById("continueSub");

  var tocDrawer = document.getElementById("tocDrawer");
  var settingsDrawer = document.getElementById("settingsDrawer");
  var overlay = document.getElementById("overlay");
  var themeColorMeta = document.getElementById("themeColorMeta");
  var topbarEl = document.querySelector(".topbar");

  var WIDTHS = [32, 42, 54]; // rem, matches --content-width choices
  var THEME_SURFACE_COLOR = { light: "#f4f4f4", sepia: "#ece0c4", dark: "#1f2227" };

  // ---- Persistence ----
  function defaultState() {
    var prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return {
      lastStoryId: null,
      perStory: {},
      theme: prefersDark ? "dark" : "light",
      font: "serif",
      fontScale: 1,
      lineHeight: 1.8,
      widthIndex: 1,
    };
  }

  function loadState() {
    var defaults = defaultState();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        parsed.perStory = parsed.perStory || {};
        return Object.assign(defaults, parsed);
      }
      // First run of the multi-story app: carry forward single-story progress
      // from the previous version of this app, if any.
      var legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw && library.length) {
        var legacy = JSON.parse(legacyRaw);
        var firstId = library[0].id;
        defaults.lastStoryId = firstId;
        defaults.perStory[firstId] = {
          chapterId: legacy.chapterId || 0,
          scrollFraction: legacy.scrollFraction || 0,
        };
        ["theme", "font", "fontScale", "lineHeight", "widthIndex"].forEach(function (k) {
          if (legacy[k] !== undefined) defaults[k] = legacy[k];
        });
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
      return defaults;
    } catch (e) {
      return defaults;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable — ignore, reading still works this session */
    }
  }

  function getProgress(storyId) {
    return state.perStory[storyId] || { chapterId: 0, scrollFraction: 0 };
  }

  // ---- Library screen ----
  function renderLibrary() {
    libraryListEl.innerHTML = "";

    if (state.lastStoryId && storiesById[state.lastStoryId]) {
      var lastStory = storiesById[state.lastStoryId];
      var lastProgress = getProgress(state.lastStoryId);
      continueTitleEl.textContent = lastStory.title;
      continueSubEl.textContent =
        "Chương " + (lastProgress.chapterId + 1) + " / " + lastStory.chapters.length;
      continueCardEl.hidden = false;
    } else {
      continueCardEl.hidden = true;
    }

    if (!library.length) {
      var empty = document.createElement("p");
      empty.className = "loading";
      empty.textContent = "Chưa có truyện nào. Hãy tải truyện lên để bắt đầu.";
      libraryListEl.appendChild(empty);
      return;
    }

    library.forEach(function (story) {
      var progress = state.perStory[story.id];
      var btn = document.createElement("button");
      btn.className = "library-card";

      var title = document.createElement("div");
      title.className = "library-card-title";
      title.textContent = story.title;
      btn.appendChild(title);

      var meta = document.createElement("div");
      meta.className = "library-card-meta";
      meta.textContent = progress
        ? "Đã đọc chương " + (progress.chapterId + 1) + " / " + story.chapters.length
        : story.chapters.length + " chương — chưa đọc";
      btn.appendChild(meta);

      var bar = document.createElement("div");
      bar.className = "library-card-progress";
      var fill = document.createElement("div");
      fill.className = "library-card-progress-fill";
      var pct = progress ? ((progress.chapterId + 1) / story.chapters.length) * 100 : 0;
      fill.style.width = pct.toFixed(1) + "%";
      bar.appendChild(fill);
      btn.appendChild(bar);

      btn.addEventListener("click", function () {
        openStory(story.id);
      });
      libraryListEl.appendChild(btn);
    });
  }

  function showLibrary() {
    currentStoryId = null;
    body.setAttribute("data-view", "library");
    body.classList.add("view-library");
    body.classList.remove("view-reader");
    readerMainEl.hidden = true;
    libraryMainEl.hidden = false;
    storyTitleEl.textContent = "listbyme";
    document.title = "listbyme — Thư viện truyện";
    renderLibrary();
    window.scrollTo(0, 0);
  }

  // ---- Reader screen ----
  function openStory(storyId) {
    var story = storiesById[storyId];
    if (!story) return;
    currentStoryId = storyId;
    state.lastStoryId = storyId;
    saveState();

    body.setAttribute("data-view", "reader");
    body.classList.add("view-reader");
    body.classList.remove("view-library");
    libraryMainEl.hidden = true;
    readerMainEl.hidden = false;

    var progress = getProgress(storyId);
    renderChapter(progress.chapterId, true);

    if (progress.chapterId > 0 || progress.scrollFraction > 0) {
      resumeToast.hidden = false;
      setTimeout(function () {
        resumeToast.hidden = true;
      }, 4000);
    }
  }

  function backToLibrary() {
    showLibrary();
  }

  function renderToc(filter) {
    var story = storiesById[currentStoryId];
    if (!story) return;
    tocListEl.innerHTML = "";
    var q = (filter || "").trim().toLowerCase();
    var progress = getProgress(currentStoryId);
    story.chapters.forEach(function (ch) {
      if (q && ch.title.toLowerCase().indexOf(q) === -1) return;
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.textContent = ch.title;
      if (ch.id === progress.chapterId) btn.classList.add("active");
      btn.addEventListener("click", function () {
        goToChapter(ch.id, 0);
        closeDrawer(tocDrawer);
      });
      li.appendChild(btn);
      tocListEl.appendChild(li);
    });
  }

  function renderChapter(chapterId, restoreScroll) {
    var story = storiesById[currentStoryId];
    if (!story) return;
    var ch = story.chapters[chapterId];
    if (!ch) return;

    var frag = document.createDocumentFragment();
    var h1 = document.createElement("h1");
    h1.textContent = ch.title;
    frag.appendChild(h1);
    ch.paragraphs.forEach(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      frag.appendChild(p);
    });
    chapterContentEl.innerHTML = "";
    chapterContentEl.appendChild(frag);

    storyTitleEl.textContent = story.title + " — " + ch.title;
    chapterPosEl.textContent = "Chương " + (chapterId + 1) + " / " + story.chapters.length;
    prevBtn.disabled = chapterId <= 0;
    nextBtn.disabled = chapterId >= story.chapters.length - 1;

    document.title = ch.title + " — " + story.title + " — listbyme";

    renderToc(tocSearchEl.value);
    applySettings();

    var progress = getProgress(currentStoryId);
    if (restoreScroll && progress.scrollFraction > 0) {
      requestAnimationFrame(function () {
        var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.max(0, maxScroll * progress.scrollFraction));
      });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function goToChapter(chapterId, scrollFraction) {
    var story = storiesById[currentStoryId];
    if (!story || chapterId < 0 || chapterId >= story.chapters.length) return;
    state.perStory[currentStoryId] = { chapterId: chapterId, scrollFraction: scrollFraction || 0 };
    saveState();
    renderChapter(chapterId, scrollFraction > 0);
  }

  // ---- Scroll tracking (reading position + progress bar) ----
  var scrollSaveTimer = null;
  function onScroll() {
    if (!currentStoryId) return;
    var docEl = document.documentElement;
    var maxScroll = docEl.scrollHeight - window.innerHeight;
    var fraction = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    fraction = Math.min(1, Math.max(0, fraction));
    progressBarTopEl.style.width = (fraction * 100).toFixed(1) + "%";

    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(function () {
      var progress = getProgress(currentStoryId);
      state.perStory[currentStoryId] = { chapterId: progress.chapterId, scrollFraction: fraction };
      saveState();
    }, 300);
  }

  // ---- Settings (global, apply to every story) ----
  function applySettings() {
    body.setAttribute("data-theme", state.theme);
    body.setAttribute("data-font", state.font);
    chapterContentEl.style.setProperty("--font-scale", state.fontScale);
    chapterContentEl.style.setProperty("--line-height", state.lineHeight);
    document.documentElement.style.setProperty(
      "--content-width",
      WIDTHS[state.widthIndex] + "rem"
    );

    document.getElementById("fontSizeLabel").textContent =
      Math.round(state.fontScale * 100) + "%";
    document.getElementById("lineHeightLabel").textContent = state.lineHeight.toFixed(1);
    var widthNames = ["Hẹp", "Vừa", "Rộng"];
    document.getElementById("widthLabel").textContent = widthNames[state.widthIndex];

    document.querySelectorAll(".choice-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.font === state.font);
    });
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.theme === state.theme);
    });

    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        "content",
        THEME_SURFACE_COLOR[state.theme] || THEME_SURFACE_COLOR.light
      );
    }
  }

  // Keeps the sticky progress bar flush under the top bar, whose height
  // varies by device (notch / punch-hole safe-area insets differ).
  function syncTopbarHeight() {
    if (!topbarEl) return;
    document.documentElement.style.setProperty("--topbar-h", topbarEl.offsetHeight + "px");
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  // ---- Drawers ----
  function openDrawer(drawer) {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.classList.add("visible");
  }
  function closeDrawer(drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.classList.remove("visible");
  }
  function closeAllDrawers() {
    closeDrawer(tocDrawer);
    closeDrawer(settingsDrawer);
  }

  // ---- Wire up events ----
  document.getElementById("btnToc").addEventListener("click", function () {
    if (!currentStoryId) return;
    renderToc(tocSearchEl.value);
    openDrawer(tocDrawer);
  });
  document.getElementById("closeToc").addEventListener("click", function () {
    closeDrawer(tocDrawer);
  });
  document.getElementById("btnBackLibrary").addEventListener("click", function () {
    closeDrawer(tocDrawer);
    backToLibrary();
  });
  document.getElementById("btnSettings").addEventListener("click", function () {
    openDrawer(settingsDrawer);
  });
  document.getElementById("closeSettings").addEventListener("click", function () {
    closeDrawer(settingsDrawer);
  });
  overlay.addEventListener("click", closeAllDrawers);

  tocSearchEl.addEventListener("input", function () {
    renderToc(tocSearchEl.value);
  });

  continueCardEl.addEventListener("click", function () {
    if (state.lastStoryId) openStory(state.lastStoryId);
  });

  prevBtn.addEventListener("click", function () {
    var progress = getProgress(currentStoryId);
    goToChapter(progress.chapterId - 1, 0);
  });
  nextBtn.addEventListener("click", function () {
    var progress = getProgress(currentStoryId);
    goToChapter(progress.chapterId + 1, 0);
  });

  document.getElementById("fontInc").addEventListener("click", function () {
    state.fontScale = clamp(Math.round((state.fontScale + 0.1) * 10) / 10, 0.7, 2);
    saveState();
    applySettings();
  });
  document.getElementById("fontDec").addEventListener("click", function () {
    state.fontScale = clamp(Math.round((state.fontScale - 0.1) * 10) / 10, 0.7, 2);
    saveState();
    applySettings();
  });

  document.getElementById("lineInc").addEventListener("click", function () {
    state.lineHeight = clamp(Math.round((state.lineHeight + 0.1) * 10) / 10, 1.3, 2.6);
    saveState();
    applySettings();
  });
  document.getElementById("lineDec").addEventListener("click", function () {
    state.lineHeight = clamp(Math.round((state.lineHeight - 0.1) * 10) / 10, 1.3, 2.6);
    saveState();
    applySettings();
  });

  document.getElementById("widthInc").addEventListener("click", function () {
    state.widthIndex = clamp(state.widthIndex + 1, 0, WIDTHS.length - 1);
    saveState();
    applySettings();
  });
  document.getElementById("widthDec").addEventListener("click", function () {
    state.widthIndex = clamp(state.widthIndex - 1, 0, WIDTHS.length - 1);
    saveState();
    applySettings();
  });

  document.querySelectorAll(".choice-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      state.font = b.dataset.font;
      saveState();
      applySettings();
    });
  });
  document.querySelectorAll(".theme-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      state.theme = b.dataset.theme;
      saveState();
      applySettings();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT") return;
    if (!currentStoryId) return;
    var progress = getProgress(currentStoryId);
    if (e.key === "ArrowRight") goToChapter(progress.chapterId + 1, 0);
    if (e.key === "ArrowLeft") goToChapter(progress.chapterId - 1, 0);
    if (e.key === "Escape") closeAllDrawers();
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", syncTopbarHeight);
  window.addEventListener("orientationchange", syncTopbarHeight);

  resumeToast.addEventListener("click", function () {
    resumeToast.hidden = true;
  });

  // ---- Init ----
  syncTopbarHeight();
  applySettings();
  showLibrary();
})();
