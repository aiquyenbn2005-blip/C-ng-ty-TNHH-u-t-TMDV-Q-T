(function () {
  "use strict";

  var STORAGE_KEY = "storyReader.v1";
  var data = window.STORY_DATA || { title: "Truyện", chapters: [] };
  var chapters = data.chapters || [];

  var state = loadState();

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

  var tocDrawer = document.getElementById("tocDrawer");
  var settingsDrawer = document.getElementById("settingsDrawer");
  var overlay = document.getElementById("overlay");
  var themeColorMeta = document.getElementById("themeColorMeta");
  var topbarEl = document.querySelector(".topbar");

  var WIDTHS = [32, 42, 54]; // rem, matches --content-width choices
  var THEME_SURFACE_COLOR = { light: "#f4f4f4", sepia: "#ece0c4", dark: "#1f2227" };

  // ---- Persistence ----
  function loadState() {
    var prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var defaults = {
      chapterId: 0,
      scrollFraction: 0,
      theme: prefersDark ? "dark" : "light",
      font: "serif",
      fontScale: 1,
      lineHeight: 1.8,
      widthIndex: 1,
    };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults; // first run on this device — honor system dark mode
      var parsed = JSON.parse(raw);
      return Object.assign(defaults, parsed);
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

  // ---- Rendering ----
  function renderToc(filter) {
    tocListEl.innerHTML = "";
    var q = (filter || "").trim().toLowerCase();
    chapters.forEach(function (ch) {
      if (q && ch.title.toLowerCase().indexOf(q) === -1) return;
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.textContent = ch.title;
      if (ch.id === state.chapterId) btn.classList.add("active");
      btn.addEventListener("click", function () {
        goToChapter(ch.id, 0);
        closeDrawer(tocDrawer);
      });
      li.appendChild(btn);
      tocListEl.appendChild(li);
    });
  }

  function renderChapter(restoreScroll) {
    var ch = chapters[state.chapterId];
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

    storyTitleEl.textContent = data.title + " — " + ch.title;
    chapterPosEl.textContent = "Chương " + (state.chapterId + 1) + " / " + chapters.length;
    prevBtn.disabled = state.chapterId <= 0;
    nextBtn.disabled = state.chapterId >= chapters.length - 1;

    document.title = ch.title + " — " + data.title;

    renderToc(tocSearchEl.value);
    applySettings();

    if (restoreScroll && state.scrollFraction > 0) {
      requestAnimationFrame(function () {
        var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.max(0, maxScroll * state.scrollFraction));
      });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function goToChapter(id, scrollFraction) {
    if (id < 0 || id >= chapters.length) return;
    state.chapterId = id;
    state.scrollFraction = scrollFraction || 0;
    saveState();
    renderChapter(scrollFraction > 0);
  }

  // ---- Scroll tracking (reading position + progress bar) ----
  var scrollSaveTimer = null;
  function onScroll() {
    var docEl = document.documentElement;
    var maxScroll = docEl.scrollHeight - window.innerHeight;
    var fraction = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    fraction = Math.min(1, Math.max(0, fraction));
    progressBarTopEl.style.width = (fraction * 100).toFixed(1) + "%";

    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(function () {
      state.scrollFraction = fraction;
      saveState();
    }, 300);
  }

  // ---- Settings ----
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
    renderToc(tocSearchEl.value);
    openDrawer(tocDrawer);
  });
  document.getElementById("closeToc").addEventListener("click", function () {
    closeDrawer(tocDrawer);
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

  prevBtn.addEventListener("click", function () {
    goToChapter(state.chapterId - 1, 0);
  });
  nextBtn.addEventListener("click", function () {
    goToChapter(state.chapterId + 1, 0);
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
    if (e.key === "ArrowRight") goToChapter(state.chapterId + 1, 0);
    if (e.key === "ArrowLeft") goToChapter(state.chapterId - 1, 0);
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
  renderChapter(true);
  if (state.chapterId > 0 || state.scrollFraction > 0) {
    resumeToast.hidden = false;
    setTimeout(function () {
      resumeToast.hidden = true;
    }, 4000);
  }
})();
