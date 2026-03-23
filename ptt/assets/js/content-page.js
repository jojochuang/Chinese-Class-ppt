(async function initContentPage() {
  const titleEl = document.getElementById("pageTitle");
  const lessonEl = document.getElementById("lessonMeta");
  const bodyEl = document.getElementById("pageBody");
  if (!titleEl || !bodyEl) return;

  const pageKey = document.body.dataset.contentKey;
  const params = window.PttDataLoader.getParams();
  const data = await window.PttDataLoader.getLessonData(params.book, params.lesson);
  const label = window.PttRouter.contentLabel[pageKey] || pageKey;

  titleEl.textContent = label;
  lessonEl.textContent = "課本: " + (data.meta.bookName || params.book) + " / " + (data.meta.lessonName || params.lesson);

  const section = data[pageKey];
  if (!section) {
    bodyEl.innerHTML = "<div class='card'>目前沒有資料</div>";
    return;
  }

  if (Array.isArray(section)) {
    bodyEl.innerHTML = section.map((x) => "<div class='card'>" + escapeHtml(String(x)) + "</div>").join("");
    return;
  }

  bodyEl.innerHTML = "<div class='card'><pre>" + escapeHtml(JSON.stringify(section, null, 2)) + "</pre></div>";

  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }
})();
