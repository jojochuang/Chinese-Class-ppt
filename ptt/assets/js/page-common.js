function q(name) {
  const sp = new URLSearchParams(window.location.search);
  return sp.get(name) || "";
}

function htmlEscape(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function renderArray(el, arr) {
  if (!arr || !arr.length) {
    el.innerHTML = "<div class='muted'>此課尚未填資料。</div>";
    return;
  }
  el.innerHTML = `<ul class="list">${arr.map((x) => `<li>${htmlEscape(x)}</li>`).join("")}</ul>`;
}

/** 對話練習：J 欄。無 A/B/C 標示=標題（開始新組），有 A/B/C=對話。一次一組，左右滑動切換 */
const DIALOG_SPEAKER = { A: "👦", B: "👧", C: "👴", D: "👩" };
const SWIPE_THRESHOLD = 50;

function parseDialogGroups(arr) {
  if (!arr || !arr.length) return [];
  const lines = arr.flatMap((s) => (s || "").split(/\r?\n/)).map((t) => t.trim()).filter(Boolean);
  if (!lines.length) return [];
  const groups = [];
  let current = null;
  for (const line of lines) {
    const isSpeaker = /^[ABCD](?:[：:\s、]|$)/.test(line.trim());
    if (!isSpeaker) {
      current = { title: line, lines: [] };
      groups.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return groups.filter((g) => g.lines.length > 0 || g.title);
}

function renderDialogGroup(group) {
  const dialogueHtml = (group.lines || [])
    .map((line) => {
      const m = line.match(/^([ABCD])[：:\s、]*(.*)$/);
      if (m) {
        const speaker = m[1];
        const text = m[2].trim();
        const emoji = DIALOG_SPEAKER[speaker] || speaker;
        return `<div class="dialog-line"><span class="dialog-speaker" tabindex="0" role="button">${emoji}</span><span class="dialog-text">${htmlEscape(text)}</span></div>`;
      }
      return `<div class="dialog-line"><span class="dialog-text">${htmlEscape(line)}</span></div>`;
    })
    .join("");
  return `
    <div class="dialog-title">${htmlEscape(group.title || "")}</div>
    <div class="dialog-content">${dialogueHtml || ""}</div>
  `;
}

function renderDialogPractice(el, arr) {
  const groups = parseDialogGroups(arr);
  if (!groups.length) {
    el.innerHTML = "<div class='muted'>此課尚無對話練習資料。</div>";
    return;
  }
  let slideIndex = 0;
  const slideEl = document.createElement("div");
  slideEl.className = "dialog-slide";
  slideEl.innerHTML = `
    <div class="dialog-slide-inner">${renderDialogGroup(groups[0])}</div>
    <div class="dialog-indicator">1 / ${groups.length}</div>
  `;
  el.innerHTML = "";
  el.appendChild(slideEl);
  const innerEl = slideEl.querySelector(".dialog-slide-inner");
  const indicatorEl = slideEl.querySelector(".dialog-indicator");

  function update() {
    slideIndex = Math.max(0, Math.min(slideIndex, groups.length - 1));
    innerEl.innerHTML = renderDialogGroup(groups[slideIndex]);
    if (indicatorEl) indicatorEl.textContent = (slideIndex + 1) + " / " + groups.length;
  }

  innerEl.addEventListener("click", (e) => {
    const speakerSpan = e.target.closest(".dialog-speaker");
    if (!speakerSpan) return;
    const lineEl = speakerSpan.closest(".dialog-line");
    if (!lineEl) return;
    innerEl.querySelectorAll(".dialog-line.selected").forEach((el) => el.classList.remove("selected"));
    lineEl.classList.add("selected");
  });
  innerEl.addEventListener("keydown", (e) => {
    const speakerSpan = e.target.closest(".dialog-speaker");
    if (!speakerSpan) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const lineEl = speakerSpan.closest(".dialog-line");
      if (lineEl) {
        innerEl.querySelectorAll(".dialog-line.selected").forEach((el) => el.classList.remove("selected"));
        lineEl.classList.add("selected");
      }
    }
  });

  let startX = 0;
  function handleSwipe(dx) {
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0) {
      slideIndex = (slideIndex - 1 + groups.length) % groups.length;
    } else {
      slideIndex = (slideIndex + 1) % groups.length;
    }
    update();
  }
  slideEl.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length) startX = e.touches[0].clientX;
  }, { passive: true });
  slideEl.addEventListener("touchend", (e) => {
    const t = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
    if (t) handleSwipe(t.clientX - startX);
  }, { passive: true });
  slideEl.addEventListener("mousedown", (e) => { startX = e.clientX; });
  slideEl.addEventListener("mouseup", (e) => { handleSwipe(e.clientX - startX); });
}

/** 生字：一字一行，點擊顯示筆順動圖（twpen.com） */
function charToHex(ch) {
  if (!ch || ch.length === 0) return "";
  return ch.codePointAt(0).toString(16);
}

function renderCharacters(el, arr) {
  if (!arr || !arr.length) {
    el.innerHTML = "<div class='muted'>此課尚未填資料。</div>";
    return;
  }
  const chars = arr.flatMap((s) => (s ? Array.from(s) : [])).filter((c) => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(c));
  if (!chars.length) {
    el.innerHTML = "<div class='muted'>此課尚無生字。</div>";
    return;
  }
  const mid = Math.ceil(chars.length / 2);
  const leftChars = chars.slice(0, mid);
  const rightChars = chars.slice(mid);
  const leftHtml = leftChars.map((ch) => `<li><button type="button" class="char-item" data-char="${htmlEscape(ch)}">${htmlEscape(ch)}</button></li>`).join("");
  const rightHtml = rightChars.map((ch) => `<li><button type="button" class="char-item" data-char="${htmlEscape(ch)}">${htmlEscape(ch)}</button></li>`).join("");
  el.innerHTML = `
    <div class="char-columns">
      <ul class="list char-list char-list-left">${leftHtml}</ul>
      <ul class="list char-list char-list-right">${rightHtml}</ul>
    </div>
    <div id="strokeOverlay" class="stroke-overlay hidden">
      <div class="stroke-overlay-inner">
        <div class="stroke-cell">
          <img id="strokeGif" src="" alt="" />
          <span id="strokeFallback" class="stroke-fallback"></span>
        </div>
        <span id="strokeIndicator" class="stroke-indicator"></span>
      </div>
    </div>
  `;
  const overlay = el.querySelector("#strokeOverlay");
  const gifEl = el.querySelector("#strokeGif");
  const fallbackEl = el.querySelector("#strokeFallback");
  const indicatorEl = el.querySelector("#strokeIndicator");
  let strokeIdx = 0;
  let justSwiped = false;
  const SWIPE_THRESHOLD = 50;
  let startX = 0;

  function showStrokeAt(idx) {
    strokeIdx = Math.max(0, Math.min(idx, chars.length - 1));
    const ch = chars[strokeIdx];
    const hex = charToHex(ch);
    gifEl.style.display = "";
    fallbackEl.style.display = "none";
    fallbackEl.textContent = "";
    gifEl.src = "https://www.twpen.com/bishun-animation/" + hex + "-stroke-order.gif";
    gifEl.alt = ch;
    gifEl.onerror = () => {
      gifEl.style.display = "none";
      fallbackEl.textContent = ch + "（筆順圖無法載入）";
      fallbackEl.style.display = "";
    };
    if (indicatorEl) indicatorEl.textContent = (strokeIdx + 1) + " / " + chars.length;
  }

  el.querySelectorAll(".char-item").forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      strokeIdx = idx;
      showStrokeAt(strokeIdx);
      overlay.classList.remove("hidden");
    });
  });

  function handleSwipe(dx) {
    if (Math.abs(dx) < SWIPE_THRESHOLD || chars.length <= 1) return false;
    justSwiped = true;
    if (dx > 0) {
      strokeIdx = (strokeIdx - 1 + chars.length) % chars.length;
    } else {
      strokeIdx = (strokeIdx + 1) % chars.length;
    }
    showStrokeAt(strokeIdx);
    setTimeout(() => { justSwiped = false; }, 350);
    return true;
  }
  overlay.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length) startX = e.touches[0].clientX;
  }, { passive: true });
  overlay.addEventListener("touchend", (e) => {
    const t = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
    if (t && handleSwipe(t.clientX - startX)) e.preventDefault();
  }, { passive: false });
  overlay.addEventListener("mousedown", (e) => { startX = e.clientX; });
  overlay.addEventListener("mouseup", (e) => {
    handleSwipe(e.clientX - startX);
  });
  overlay.addEventListener("click", () => {
    if (justSwiped) return;
    overlay.classList.add("hidden");
  });
}

/** Parse fill-blank string: "X" → （＿） (click to reveal （X）). */
function renderFillBlank(el, arr) {
  if (!arr || !arr.length) {
    el.innerHTML = "<div class='muted'>此課尚未填資料。</div>";
    return;
  }
  const BLANK = "（＿）";
  const re = /"([^"]*)"/g;
  const items = arr.map((raw) => {
    const parts = [];
    let lastIdx = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
      parts.push({ type: "text", s: raw.slice(lastIdx, m.index) });
      parts.push({ type: "blank", answer: m[1] });
      lastIdx = re.lastIndex;
    }
    parts.push({ type: "text", s: raw.slice(lastIdx) });
    return parts;
  });
  const lis = items.map((parts) => {
    const inner = parts
      .map((p) => {
        if (p.type === "text") return htmlEscape(p.s);
        const ans = htmlEscape(p.answer);
        const w = Math.max(3, 3 + p.answer.length);
        return `<span class="fill-blank-item" data-answer="${ans}" style="min-width:${w}em" tabindex="0" role="button"><span class="fb-content">${BLANK}</span></span>`;
      })
      .join("");
    return `<li>${inner}</li>`;
  });
  el.innerHTML = `<ul class="list fill-blank-list">${lis.join("")}</ul>`;
  el.querySelectorAll(".fill-blank-item").forEach((span) => {
    const ans = span.getAttribute("data-answer");
    const contentEl = span.querySelector(".fb-content");
    const handler = () => {
      if (span.classList.contains("revealed")) return;
      contentEl.textContent = "（" + ans + "）";
      span.classList.add("revealed");
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

async function initContentPage(contentKey) {
  const book = q("book");
  const lesson = q("lesson");
  const titleEl = document.querySelector(".container h1") || document.getElementById("pageTitle");
  const metaEl = document.getElementById("metaText") || document.getElementById("lessonMeta");

  try {
    const data = await loadLessonData(book, lesson);
    if (data.lessonName && titleEl) titleEl.textContent = data.lessonName;
    if (data.page != null && data.page !== "" && metaEl) {
      metaEl.textContent = "第" + data.page + "頁";
    } else if (metaEl) {
      const bookLabel = (window.PttConfig && window.PttConfig.bookName && book === "sheet") ? window.PttConfig.bookName : book;
      metaEl.textContent = "課本：" + bookLabel + " ｜ 課次：" + lesson;
    }

    const body = document.getElementById("contentBody") || document.getElementById("pageBody");
    if (!body) return;
    const val = data[contentKey];

    if (Array.isArray(val)) {
      if (contentKey === "fillBlank") {
        renderFillBlank(body, val);
      } else if (contentKey === "characters" || contentKey === "crecCharacters") {
        renderCharacters(body, val);
      } else if (contentKey === "sentence") {
        renderDialogPractice(body, val);
      } else {
        renderArray(body, val);
      }
      return;
    }
    if (val && typeof val === "object") {
      body.innerHTML = `<pre>${htmlEscape(JSON.stringify(val, null, 2))}</pre>`;
      return;
    }
    body.innerHTML = "<div class='muted'>此課尚未填資料。</div>";
  } catch (e) {
    const body = document.getElementById("contentBody") || document.getElementById("pageBody");
    if (body) body.innerHTML =
      `<div class="warn">載入失敗：${htmlEscape(e && e.message ? e.message : e)}</div>`;
  }
}
