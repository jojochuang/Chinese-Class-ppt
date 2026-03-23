(function () {
  const SWIPE_THRESHOLD = 50;
  let sentences = [];
  let translations = [];
  let slideIndex = 0;
  let startX = 0;

  function byId(id) { return document.getElementById(id); }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function render() {
    const fullEl = byId("textFull");
    const slideEl = byId("textSlide");
    const slideSentence = byId("slideSentence");
    const slideTranslation = byId("slideTranslation");
    const slideIndicator = byId("slideIndicator");
    if (!fullEl || !slideEl) return;

    fullEl.innerHTML = sentences.map((s) => `<div class="sentence">${esc(s)}</div>`).join("");
    if (sentences.length) {
      slideIndex = Math.max(0, Math.min(slideIndex, sentences.length - 1));
      slideSentence.textContent = sentences[slideIndex] || "";
      if (slideTranslation) slideTranslation.textContent = translations[slideIndex] || "";
      slideIndicator.textContent = (slideIndex + 1) + " / " + sentences.length;
    }
  }

  function goPrev() {
    if (sentences.length <= 1) return;
    slideIndex = (slideIndex - 1 + sentences.length) % sentences.length;
    render();
  }

  function goNext() {
    if (sentences.length <= 1) return;
    slideIndex = (slideIndex + 1) % sentences.length;
    render();
  }

  function handleSwipe(dx) {
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0) goPrev();
    else goNext();
  }

  function initSwipe(el) {
    if (!el) return;
    el.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches.length) startX = e.touches[0].clientX;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      const t = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
      if (t) handleSwipe(t.clientX - startX);
    }, { passive: true });
    el.addEventListener("mousedown", (e) => { startX = e.clientX; });
    el.addEventListener("mouseup", (e) => { handleSwipe(e.clientX - startX); });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  async function init() {
    const book = (new URLSearchParams(window.location.search)).get("book") || "";
    const lesson = (new URLSearchParams(window.location.search)).get("lesson") || "";
    const titleEl = byId("textTitle");
    const metaEl = byId("textMeta");
    const bodyEl = byId("textBody");
    const toggleBtn = byId("toggleViewBtn");
    const fullscreenBtn = byId("fullscreenBtn");

    try {
      const data = await loadLessonData(book, lesson);
      if (!data) throw new Error("無法載入資料");

      if (data.lessonName && titleEl) titleEl.textContent = data.lessonName;
      if (data.page != null && data.page !== "" && metaEl) metaEl.textContent = "第" + data.page + "頁";

      sentences = Array.isArray(data.text) ? data.text : [];
      translations = Array.isArray(data.translations) ? data.translations : [];
      if (!bodyEl) return;

      bodyEl.innerHTML = `
        <div id="textFull" class="text-full"></div>
        <div id="textSlide" class="text-slide">
          <div id="slideSentence" class="slide-sentence"></div>
          <div id="slideTranslation" class="slide-translation"></div>
          <div id="slideIndicator" class="slide-indicator"></div>
        </div>
      `;

      render();
      initSwipe(byId("textSlide"));

      if (toggleBtn) {
        toggleBtn.textContent = "單句模式";
        toggleBtn.addEventListener("click", () => {
          document.body.classList.toggle("slide-mode", toggleBtn.textContent === "單句模式");
          toggleBtn.textContent = document.body.classList.contains("slide-mode") ? "全文模式" : "單句模式";
          render();
        });
      }
      if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleFullscreen);
    } catch (e) {
      if (bodyEl) bodyEl.innerHTML = "<div class='warn'>載入失敗：" + (e && e.message ? e.message : e) + "</div>";
    }
  }

  window.PttTextPageInit = init;
})();
