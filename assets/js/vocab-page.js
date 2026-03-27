(function () {
  const SWIPE_THRESHOLD = 50;
  const IMG_BASE = "https://jojochuang.github.io/Words-picture/";
  /** 聽音辨字遊戲試算表：A=語詞、B=圖片網址，用於語詞分頁圖片對照 */
  const IMAGE_LOOKUP_SHEET_ID = "1264gdkuMnIn2k5L5KM69yumBfJFdYVhxzzsC-2R5Q2U";
  const IMAGE_LOOKUP_GID = "922303464";

  let items = [];
  let slideIndex = 0;
  let startX = 0;
  /** 語詞 -> 圖片網址對照表（從試算表 A、B 欄建立） */
  let imageLookupMap = new Map();

  function byId(id) { return document.getElementById(id); }

  function htmlEscape(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function isValidImageUrl(s) {
    const t = (s || "").trim();
    return t.startsWith("http://") || t.startsWith("https://");
  }

  /**
   * 將多音字（含 IVS 變體選擇器）還原為打字預設的基本字，用於對照與 fallback 網址。
   */
  function stripToBaseForUrl(word) {
    if (!word || typeof word !== "string") return "";
    let out = "";
    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < word.length) {
        const low = word.charCodeAt(i + 1);
        if (code === 0xDB40 && low >= 0xDD00 && low <= 0xDDE0) {
          i++;
          continue;
        }
      }
      if (code >= 0xFE00 && code <= 0xFE0F) continue;
      out += word[i];
    }
    return out;
  }

  /** 從試算表載入語詞->圖片網址對照表 */
  async function fetchImageLookupMap() {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(IMAGE_LOOKUP_SHEET_ID)}/export?format=csv&gid=${encodeURIComponent(IMAGE_LOOKUP_GID)}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const text = await resp.text().then((t) => (t || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
      const rows = [];
      let cur = "";
      let inQ = false;
      const line = [];
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
          if (inQ && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = !inQ;
          }
        } else if ((ch === "," && !inQ) || (ch === "\n" && !inQ)) {
          line.push(cur);
          cur = "";
          if (ch === "\n") {
            rows.push(line.slice());
            line.length = 0;
          }
        } else {
          cur += ch;
        }
      }
      if (cur || line.length) {
        line.push(cur);
        rows.push(line);
      }
      const map = new Map();
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const wordA = (row[0] || "").trim();
        const urlB = (row[1] || "").trim();
        if (!wordA || !isValidImageUrl(urlB)) continue;
        map.set(wordA, urlB);
        const base = stripToBaseForUrl(wordA);
        if (base && base !== wordA) map.set(base, urlB);
      }
      imageLookupMap = map;
    } catch (_) {}
  }

  /** 依語詞取得圖片網址：優先從試算表 B 欄，找不到再用 Words-picture 組網址 */
  function getImageUrl(word) {
    if (!word || typeof word !== "string") return "";
    const u = imageLookupMap.get(word) || imageLookupMap.get(stripToBaseForUrl(word));
    if (u) return u;
    const base = stripToBaseForUrl(word);
    if (!base) return "";
    return IMG_BASE + encodeURIComponent(base) + ".JPEG";
  }

  function render() {
    const wordEl = byId("vocabWord");
    const imgEl = byId("vocabImg");
    const indicatorEl = byId("vocabIndicator");

    if (!items.length) {
      if (wordEl) wordEl.textContent = "此課尚未填資料。";
      if (imgEl) { imgEl.style.display = "none"; imgEl.alt = ""; imgEl.src = ""; }
      if (indicatorEl) indicatorEl.textContent = "";
      return;
    }

    slideIndex = Math.max(0, Math.min(slideIndex, items.length - 1));
    const word = items[slideIndex];

    if (wordEl) wordEl.textContent = word;
    const imgUrl = getImageUrl(word);
    if (imgEl) {
      if (imgUrl) {
        imgEl.src = imgUrl;
        imgEl.alt = word;
        imgEl.style.display = "";
        imgEl.onerror = function () {
          imgEl.style.display = "none";
        };
      } else {
        imgEl.style.display = "none";
        imgEl.src = "";
        imgEl.alt = "";
      }
    }
    if (indicatorEl) indicatorEl.textContent = (slideIndex + 1) + " / " + items.length;
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
    document.title = lesson ? `${lesson} 語詞` : "語詞";
    const titleEl = document.querySelector(".container h1");
    const metaEl = byId("metaText");
    const bodyEl = byId("contentBody");

    try {
      const [data] = await Promise.all([
        loadLessonData(book, lesson),
        fetchImageLookupMap()
      ]);
      if (!data) throw new Error("無法載入資料");

      if (data.lessonName && titleEl) titleEl.textContent = data.lessonName;
      if (data.page != null && data.page !== "" && metaEl) {
        metaEl.textContent = "第" + data.page + "頁";
      } else if (metaEl) {
        const bookLabel = (window.PttConfig && window.PttConfig.bookName && book === "sheet") ? window.PttConfig.bookName : book;
        metaEl.textContent = "課本：" + bookLabel + " ｜ 課次：" + lesson;
      }

      items = Array.isArray(data.vocab) ? data.vocab.filter(Boolean) : [];

      if (!bodyEl) return;

      bodyEl.innerHTML = `
        <div id="vocabSlide" class="vocab-slide">
          <div id="vocabWord" class="vocab-word"></div>
          <div class="vocab-img-wrap">
            <img id="vocabImg" class="vocab-img" src="" alt="" />
          </div>
          <div id="vocabIndicator" class="vocab-indicator"></div>
        </div>
      `;

      render();
      initSwipe(byId("vocabSlide"));
    } catch (e) {
      if (bodyEl) bodyEl.innerHTML =
        "<div class='warn'>載入失敗：" + (e && e.message ? e.message : e) + "</div>";
    }
  }

  window.PttVocabPageInit = init;
})();
