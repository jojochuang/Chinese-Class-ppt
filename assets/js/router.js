const CONTENT_ROUTES = {
  text: "pages/text.html",
  vocab: "pages/vocab.html",
  characters: "pages/characters.html",
  crecCharacters: "pages/crec-characters.html",
  charBuild: "pages/char-build.html",
  sentence: "pages/sentence-practice.html",
  fillBlank: "pages/fill-blank.html",
  match: "pages/match.html",
  typoCorrect: "pages/typo-correct.html",
  dialog: "pages/dialog.html",
  story: "pages/story.html"
};

function buildPageUrl(contentType, bookId, lessonId) {
  const base = CONTENT_ROUTES[contentType];
  if (!base) return "";
  const q = new URLSearchParams({ book: bookId, lesson: lessonId });
  return `${base}?${q.toString()}`;
}
window.PttRouter = (function () {
  const contentToPage = {
    text: "text.html",
    vocab: "vocab.html",
    characters: "characters.html",
    crecCharacters: "crec-characters.html",
    charBuild: "char-build.html",
    sentence: "sentence-practice.html",
    fillBlank: "fill-blank.html",
    match: "match.html",
    typoCorrect: "typo-correct.html",
    dialog: "dialog.html",
    story: "story.html"
  };

  const contentLabel = {
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

  function buildPageUrl(contentKey, bookId, lessonId) {
    const page = contentToPage[contentKey];
    if (!page) return "";
    const q = new URLSearchParams({ book: bookId, lesson: lessonId });
    return "./pages/" + page + "?" + q.toString();
  }

  return {
    contentToPage,
    contentLabel,
    buildPageUrl
  };
})();
