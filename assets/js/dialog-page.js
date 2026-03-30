(function () {
  const SWIPE_THRESHOLD = 50;
  let items = [];
  let slideIndex = 0;
  let startX = 0;

  function byId(id) { return document.getElementById(id); }

  function toLines(arr) {
    return (arr || [])
      .flatMap((s) => String(s || "").split(/\r?\n/))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function render() {
    const lineEl = byId("dialogLine");
    const indicatorEl = byId("dialogIndicator");
    if (!lineEl || !indicatorEl) return;
    if (!items.length) {
      lineEl.textContent = "此課尚未填資料。";
      indicatorEl.textContent = "";
      return;
    }
    slideIndex = Math.max(0, Math.min(slideIndex, items.length - 1));
    lineEl.textContent = items[slideIndex];
    indicatorEl.textContent = (slideIndex + 1) + " / " + items.length;
  }

  function goPrev() {
    if (items.length <= 1) return;
    slideIndex = (slideIndex - 1 + items.length) % items.length;
    render();
  }

  function goNext() {
    if (items.length <= 1) return;
    slideIndex = (slideIndex + 1) % items.length;
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

  async function init() {
    const sp = new URLSearchParams(window.location.search);
    const book = sp.get("book") || "";
    const lesson = sp.get("lesson") || "";
    document.title = lesson ? `${lesson} 對話` : "對話";

    const titleEl = document.querySelector(".container h1");
    const metaEl = byId("metaText");
    const bodyEl = byId("contentBody");
    if (!bodyEl) return;

    try {
      const data = await loadLessonData(book, lesson);
      if (!data) throw new Error("無法載入資料");
      if (data.lessonName && titleEl) titleEl.textContent = data.lessonName;
      if (data.page != null && data.page !== "" && metaEl) {
        metaEl.textContent = "第" + data.page + "頁";
      } else if (metaEl) {
        const bookLabel = (window.PttConfig && window.PttConfig.bookName && book === "sheet")
          ? window.PttConfig.bookName
          : book;
        metaEl.textContent = "課本：" + bookLabel + " ｜ 課次：" + lesson;
      }

      // dialog 優先，若沒資料則退回 sentence（相容既有表格）
      const source = (Array.isArray(data.dialog) && data.dialog.length) ? data.dialog : data.sentence;
      items = toLines(source);

      bodyEl.innerHTML = `
        <div id="dialogSlide" class="dialog-slide">
          <div id="dialogLine" class="slide-sentence"></div>
          <div id="dialogIndicator" class="dialog-indicator"></div>
        </div>
      `;
      render();
      initSwipe(byId("dialogSlide"));
    } catch (e) {
      bodyEl.innerHTML = "<div class='warn'>載入失敗：" + (e && e.message ? e.message : e) + "</div>";
    }
  }

  window.PttDialogPageInit = init;
})();
