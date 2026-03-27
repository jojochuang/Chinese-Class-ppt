(function () {
  const SWIPE_THRESHOLD = 50;
  const BLANK = "（＿）";
  const re = /"([^"]*)"/g;

  let items = [];
  let slideIndex = 0;
  let startX = 0;

  function byId(id) { return document.getElementById(id); }

  function htmlEscape(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  /** 解析顏色標記 [c=red]文字[/c] 或 [color=#f00]文字[/color]，回傳安全 HTML */
  function processColorMarkup(s) {
    if (!s || typeof s !== "string") return s;
    const re = /\[(?:c|color)=([^\]]+)\]([\s\S]*?)\[\/(?:c|color)\]/gi;
    let lastIdx = 0;
    let out = "";
    let m;
    while ((m = re.exec(s)) !== null) {
      out += htmlEscape(s.slice(lastIdx, m.index));
      out += "<span style=\"color:" + htmlEscape(m[1].trim()) + "\">" + htmlEscape(m[2]) + "</span>";
      lastIdx = re.lastIndex;
    }
    out += htmlEscape(s.slice(lastIdx));
    return out;
  }

  function parseFillBlank(raw) {
    const parts = [];
    let lastIdx = 0;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(raw)) !== null) {
      parts.push({ type: "text", s: raw.slice(lastIdx, m.index) });
      parts.push({ type: "blank", answer: m[1] });
      lastIdx = re.lastIndex;
    }
    parts.push({ type: "text", s: raw.slice(lastIdx) });
    return parts;
  }

  function buildItemHtml(parts) {
    return parts
      .map((p) => {
        if (p.type === "text") return processColorMarkup(p.s);
        const ans = htmlEscape(p.answer);
        const ansWithColor = processColorMarkup(p.answer);
        const hasColor = ansWithColor !== htmlEscape(p.answer);
        const ansHtmlAttr = hasColor ? " data-answer-html=\"" + ansWithColor.replace(/"/g, "&quot;") + "\"" : "";
        const visibleLen = p.answer.replace(/\[(?:c|color)=[^\]]+\]([\s\S]*?)\[\/(?:c|color)\]/gi, "$1").length;
        const w = Math.max(3, 3 + visibleLen);
        return `<span class="fill-blank-item" data-answer="${ans}"${ansHtmlAttr} style="min-width:${w}em" tabindex="0" role="button"><span class="fb-content">${BLANK}</span></span>`;
      })
      .join("");
  }

  function bindClickReveal(container) {
    if (!container) return;
    container.querySelectorAll(".fill-blank-item").forEach((span) => {
      const ans = span.getAttribute("data-answer");
      const ansHtml = span.getAttribute("data-answer-html"); // 含顏色的 HTML（若有）
      const contentEl = span.querySelector(".fb-content");
      const handler = () => {
        if (span.classList.contains("revealed")) {
          contentEl.textContent = BLANK;
          span.classList.remove("revealed");
          contentEl.style.cssText = "";
        } else {
          if (ansHtml) {
            contentEl.innerHTML = "（" + ansHtml + "）";
          } else {
            contentEl.textContent = "（" + ans + "）";
          }
          span.classList.add("revealed");
        }
      };
      span.addEventListener("click", handler);
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  function render() {
    const slideEl = byId("fillSlide");
    const questionEl = byId("fillQuestion");
    const indicatorEl = byId("fillIndicator");
    if (!slideEl || !questionEl) return;

    if (!items.length) {
      questionEl.innerHTML = "<div class='muted'>此課尚未填資料。</div>";
      if (indicatorEl) indicatorEl.textContent = "";
      return;
    }

    slideIndex = Math.max(0, Math.min(slideIndex, items.length - 1));
    questionEl.innerHTML = buildItemHtml(items[slideIndex]);
    bindClickReveal(questionEl);
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
    const book = (new URLSearchParams(window.location.search)).get("book") || "";
    const lesson = (new URLSearchParams(window.location.search)).get("lesson") || "";
    document.title = lesson ? `${lesson} 填空` : "填空";
    const titleEl = byId("pageTitle");
    const metaEl = byId("metaText");
    const bodyEl = byId("contentBody");

    try {
      const data = await loadLessonData(book, lesson);
      if (!data) throw new Error("無法載入資料");

      if (data.lessonName && titleEl) titleEl.textContent = data.lessonName;
      if (data.page != null && data.page !== "" && metaEl) {
        metaEl.textContent = "第" + data.page + "頁";
      } else if (metaEl) {
        const bookLabel = (window.PttConfig && window.PttConfig.bookName && book === "sheet") ? window.PttConfig.bookName : book;
        metaEl.textContent = "課本：" + bookLabel + " ｜ 課次：" + lesson;
      }

      const rawArr = Array.isArray(data.fillBlank) ? data.fillBlank : [];
      items = rawArr.map(parseFillBlank);

      if (!bodyEl) return;

      bodyEl.innerHTML = `
        <div id="fillSlide" class="fill-slide">
          <div id="fillQuestion" class="fill-question"></div>
          <div id="fillIndicator" class="fill-indicator"></div>
        </div>
      `;

      render();
      initSwipe(byId("fillSlide"));
    } catch (e) {
      if (bodyEl) bodyEl.innerHTML =
        "<div class='warn'>載入失敗：" + (e && e.message ? e.message : e) + "</div>";
    }
  }

  window.PttFillBlankPageInit = init;
})();
