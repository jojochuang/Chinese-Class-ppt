/**
 * 資料載入：試算表即時讀取 或 本機 JSON
 * 當 PttConfig.sheetId 有值時使用試算表
 */

async function loadJson(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error("載入失敗: " + path);
  return resp.json();
}

function useSheetMode() {
  return window.PttConfig && window.PttConfig.sheetId;
}

async function loadBooks() {
  if (useSheetMode()) {
    return [{ bookId: "sheet", bookName: window.PttConfig.bookName || "試算表課本" }];
  }
  return loadJson("./data/books_index.json");
}

async function loadLessonsFromSheet() {
  const { sheetId, gid } = window.PttConfig;
  return window.PttSheetFetcher.fetchSheet(sheetId, gid);
}

async function loadManifest() {
  if (useSheetMode()) {
    const lessons = await loadLessonsFromSheet();
    return lessons.map((l, i) => ({
      bookId: "sheet",
      lessonId: l.lessonId,
      lessonName: l.lessonName,
      order: i,
      availableContents: l.availableContents
    }));
  }
  return loadJson("./data/lessons_manifest.json");
}

async function loadLessonData(bookId, lessonId) {
  if (useSheetMode()) {
    const lessons = await loadLessonsFromSheet();
    const lesson = lessons.find((l) => l.lessonId === lessonId);
    if (!lesson) throw new Error("找不到課次: " + lessonId);
    return {
      lessonName: lesson.lessonName,
      page: lesson.page,
      text: lesson.text,
      translations: lesson.translations || [],
      vocab: lesson.vocab,
      characters: lesson.characters,
      crecCharacters: Array.isArray(lesson.crecCharacters) ? lesson.crecCharacters : [],
      charBuild: [],
      sentence: lesson.sentence,
      dialog: [],
      story: [],
      fillBlank: Array.isArray(lesson.fillBlank) ? lesson.fillBlank : [],
      match: Array.isArray(lesson.match) ? lesson.match : [],
      typoCorrect: Array.isArray(lesson.typoCorrect) ? lesson.typoCorrect : []
    };
  }
  const path = `./data/books/${encodeURIComponent(bookId)}/${encodeURIComponent(lessonId)}.json`;
  return loadJson(path);
}
