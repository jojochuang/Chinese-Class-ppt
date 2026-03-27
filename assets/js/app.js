const contentLabels = {
  text: "課文",
  vocab: "語詞",
  characters: "生字",
  crecCharacters: "CREC生字",
  charBuild: "生字拆合",
  sentence: "對話練習",
  fillBlank: "填空",
  match: "連連看",
  typoCorrect: "字音字形改錯",
  dialog: "對話",
  story: "補充故事"
};

function byId(id) { return document.getElementById(id); }

function renderOptions(select, arr, valueKey, labelKey) {
  select.innerHTML = arr.map((x) => `<option value="${x[valueKey]}">${x[labelKey]}</option>`).join("");
}

async function initLauncher() {
  const bookSel = byId("bookSelect");
  const lessonSel = byId("lessonSelect");
  const contentButtons = byId("contentButtons");
  if (!bookSel || !lessonSel) return;

  const books = await loadBooks();
  const manifest = await loadManifest();
  renderOptions(bookSel, books, "bookId", "bookName");

  function currentLessons() {
    return manifest
      .filter((x) => x.bookId === bookSel.value)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function refreshLessons() {
    const lessons = currentLessons();
    renderOptions(lessonSel, lessons, "lessonId", "lessonName");
    refreshContents();
  }

  function refreshContents() {
    const row = currentLessons().find((x) => x.lessonId === lessonSel.value);
    const list = (row && row.availableContents) ? row.availableContents : [];
    if (contentButtons) {
      contentButtons.innerHTML = list.map((k) => (
        `<button type="button" class="secondary content-open-btn" data-content="${k}">${contentLabels[k] || k}</button>`
      )).join("");
      Array.from(contentButtons.querySelectorAll(".content-open-btn")).forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-content");
          const url = buildPageUrl(key, bookSel.value, lessonSel.value);
          if (!url) return;
          if (!openOne(url)) {
            alert("瀏覽器阻擋新分頁，請允許此網站開啟彈出視窗。");
          }
        });
      });
    }
  }

  bookSel.addEventListener("change", refreshLessons);
  lessonSel.addEventListener("change", refreshContents);

  refreshLessons();
}

initLauncher().catch((e) => {
  alert("初始化失敗：" + (e && e.message ? e.message : e));
});
