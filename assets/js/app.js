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
  const contentSel = byId("contentSelect");
  const available = byId("availableList");
  const warn = byId("warnBox");
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
    if (contentSel) contentSel.innerHTML = list.map((k) => `<option value="${k}">${contentLabels[k] || k}</option>`).join("");
    if (available) available.innerHTML = list.map((k) => `<li>${contentLabels[k] || k}</li>`).join("");
  }

  bookSel.addEventListener("change", refreshLessons);
  lessonSel.addEventListener("change", refreshContents);

  byId("openCurrentBtn").addEventListener("click", () => {
    if (warn) warn.textContent = "";
    const url = buildPageUrl(contentSel.value, bookSel.value, lessonSel.value);
    if (!url) return;
    if (!openOne(url) && warn) {
      warn.textContent = "瀏覽器阻擋新分頁，請允許此網站開啟彈出視窗。";
    }
  });

  byId("openAllBtn").addEventListener("click", () => {
    if (warn) warn.textContent = "";
    const row = currentLessons().find((x) => x.lessonId === lessonSel.value);
    const list = (row && row.availableContents) ? row.availableContents : [];
    const urls = list.map((k) => buildPageUrl(k, bookSel.value, lessonSel.value)).filter(Boolean);
    const ok = openMany(urls);
    if (ok < urls.length && warn) {
      warn.textContent = "部分分頁可能被阻擋，請允許彈出視窗後再試一次。";
    }
  });

  refreshLessons();
}

initLauncher().catch((e) => {
  const warn = document.getElementById("warnBox");
  if (warn) warn.textContent = "初始化失敗：" + (e && e.message ? e.message : e);
});
