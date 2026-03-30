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

/** 對話練習：J 欄。無 A/B/C 標示=標題（開始新組），有 A/B/C=對話。一頁一句／一頁一標題，左右滑動 */
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
    } else {
      current = { title: "", lines: [line] };
      groups.push(current);
    }
  }
  return groups.filter((g) => g.lines.length > 0 || g.title);
}

/** 一頁一句：標題與每句對白各一張投影片 */
function buildDialogLineSlides(groups) {
  const slides = [];
  for (const g of groups) {
    const t = (g.title || "").trim();
    if (t) slides.push({ kind: "title", text: t });
    for (const line of g.lines || []) {
      const raw = String(line || "").trim();
      if (!raw) continue;
      slides.push({ kind: "utterance", raw });
    }
  }
  return slides;
}

function renderDialogSlideHtml(slide) {
  if (slide.kind === "title") {
    return `<div class="slide-sentence dialog-slide-only">${htmlEscape(slide.text)}</div>`;
  }
  const m = slide.raw.match(/^([ABCD])[：:\s、]*(.*)$/);
  if (m) {
    const speaker = m[1];
    const text = m[2].trim();
    const emoji = DIALOG_SPEAKER[speaker] || speaker;
    return `
      <div class="dialog-utterance-slide">
        <span class="dialog-utterance-emoji" aria-hidden="true">${emoji}</span>
        <div class="slide-sentence dialog-slide-only">${htmlEscape(text)}</div>
      </div>`;
  }
  return `<div class="slide-sentence dialog-slide-only">${htmlEscape(slide.raw)}</div>`;
}

function renderDialogPractice(el, arr) {
  const groups = parseDialogGroups(arr);
  const slides = buildDialogLineSlides(groups);
  if (!slides.length) {
    el.innerHTML = "<div class='muted'>此課尚無對話練習資料。</div>";
    return;
  }
  let slideIndex = 0;
  const slideEl = document.createElement("div");
  slideEl.className = "dialog-slide";
  slideEl.innerHTML = `
    <div class="dialog-slide-inner"></div>
    <div class="dialog-indicator"></div>
  `;
  el.innerHTML = "";
  el.appendChild(slideEl);
  const innerEl = slideEl.querySelector(".dialog-slide-inner");
  const indicatorEl = slideEl.querySelector(".dialog-indicator");

  function update() {
    slideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
    innerEl.innerHTML = renderDialogSlideHtml(slides[slideIndex]);
    if (indicatorEl) indicatorEl.textContent = (slideIndex + 1) + " / " + slides.length;
  }

  update();

  let startX = 0;
  function handleSwipe(dx) {
    if (slides.length <= 1) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0) {
      slideIndex = (slideIndex - 1 + slides.length) % slides.length;
    } else {
      slideIndex = (slideIndex + 1) % slides.length;
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

/** 生字：按鈕顯示筆順網動圖；分合 GIF 另外放縮圖，點擊縮圖才放大播放 */
function charToHex(ch) {
  if (!ch || ch.length === 0) return "";
  return ch.codePointAt(0).toString(16);
}

function getWordGifUrl(ch) {
  return "https://jojochuang.github.io/Words-picture/" + encodeURIComponent(ch) + ".gif";
}

function drawGifFirstFrameToCanvas(canvas, gifUrl, onDone) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    if (typeof onDone === "function") onDone(true);
  };
  img.onerror = () => {
    if (typeof onDone === "function") onDone(false);
  };
  img.src = gifUrl;
}

function loadGifStillData(gifUrl, onDone) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const iw = Math.max(1, img.naturalWidth || 1);
      const ih = Math.max(1, img.naturalHeight || 1);
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(iw, ih));
      const w = Math.max(1, Math.round(iw * scale));
      const h = Math.max(1, Math.round(ih * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/png");
      if (typeof onDone === "function") onDone({ ok: true, dataUrl, w, h, ratio: w / h });
    } catch (_) {
      if (typeof onDone === "function") onDone({ ok: false });
    }
  };
  img.onerror = () => {
    if (typeof onDone === "function") onDone({ ok: false });
  };
  img.src = gifUrl;
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
  function charLineHtml(ch, isRight) {
    return `
      <li>
        <div class="char-line ${isRight ? "char-line-right" : ""}">
          <button type="button" class="char-item" data-char="${htmlEscape(ch)}">${htmlEscape(ch)}</button>
          <div class="char-gif-thumb ${isRight ? "char-gif-thumb-right" : ""}" data-char="${htmlEscape(ch)}" aria-label="${htmlEscape(ch)} 動圖縮圖" title="${htmlEscape(ch)} 分合動圖">
            <canvas class="char-gif-canvas" width="54" height="54"></canvas>
          </div>
        </div>
      </li>
    `;
  }
  const leftHtml = leftChars.map((ch) => charLineHtml(ch, false)).join("");
  const rightHtml = rightChars.map((ch) => charLineHtml(ch, true)).join("");
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
    <div id="splitGifOverlay" class="stroke-overlay hidden">
      <div class="stroke-overlay-inner">
        <div id="splitGifCell" class="stroke-cell split-gif-cell">
          <img id="splitGifPlayer" src="" alt="" />
          <span id="splitGifFallback" class="stroke-fallback"></span>
        </div>
      </div>
    </div>
  `;
  const strokeOverlay = el.querySelector("#strokeOverlay");
  const strokeGifEl = el.querySelector("#strokeGif");
  const strokeFallbackEl = el.querySelector("#strokeFallback");
  const indicatorEl = el.querySelector("#strokeIndicator");
  const splitOverlay = el.querySelector("#splitGifOverlay");
  const splitCell = el.querySelector("#splitGifCell");
  const splitGifEl = el.querySelector("#splitGifPlayer");
  const splitFallbackEl = el.querySelector("#splitGifFallback");
  const thumbDataMap = new Map();
  const stillDataMap = new Map();
  const thumbRatioMap = new Map();
  let splitPlayTimer = null;
  let splitPauseTimer = null;
  const PLAY_MS = 2400;
  const PAUSE_MS = 3000;
  let strokeIdx = 0;
  let justSwipedStroke = false;
  let justSwipedSplit = false;
  const SWIPE_THRESHOLD = 50;
  let startXStroke = 0;
  let startXSplit = 0;

  function clearSplitLoopTimers() {
    if (splitPlayTimer) clearTimeout(splitPlayTimer);
    if (splitPauseTimer) clearTimeout(splitPauseTimer);
    splitPlayTimer = null;
    splitPauseTimer = null;
  }

  function fitSplitCellByRatio(ratio) {
    if (!splitCell || !ratio || !isFinite(ratio)) return;
    const maxW = Math.min(Math.round(window.innerWidth * 0.82), 520);
    const maxH = Math.min(Math.round(window.innerHeight * 0.72), 520);
    let w = maxW;
    let h = maxH;
    if (ratio >= 1) {
      h = Math.max(220, Math.round(w / ratio));
      if (h > maxH) {
        h = maxH;
        w = Math.round(h * ratio);
      }
    } else {
      h = maxH;
      w = Math.max(220, Math.round(h * ratio));
      if (w > maxW) {
        w = maxW;
        h = Math.round(w / ratio);
      }
    }
    splitCell.style.width = `${w}px`;
    splitCell.style.height = `${h}px`;
  }

  function showSplitOverlayStill(ch) {
    splitGifEl.style.display = "none";
    splitFallbackEl.style.display = "";
    splitFallbackEl.textContent = "";
    splitFallbackEl.innerHTML = "";
    const dataUrl = stillDataMap.get(ch) || thumbDataMap.get(ch);
    if (dataUrl) {
      splitFallbackEl.innerHTML = `<img src="${dataUrl}" alt="${htmlEscape(ch)} 靜態縮圖" class="stroke-still-img" />`;
    } else {
      splitFallbackEl.textContent = ch;
    }
  }

  function playSplitGifLoop(ch) {
    clearSplitLoopTimers();
    const gifUrl = getWordGifUrl(ch);

    const playOnce = () => {
      splitFallbackEl.style.display = "none";
      splitFallbackEl.textContent = "";
      splitFallbackEl.innerHTML = "";
      splitGifEl.style.display = "";
      splitGifEl.crossOrigin = "anonymous";
      splitGifEl.src = gifUrl + "?t=" + Date.now();
      splitGifEl.alt = ch;
      splitGifEl.onerror = () => {
        splitGifEl.style.display = "none";
        splitFallbackEl.textContent = ch + "（GIF 無法載入）";
        splitFallbackEl.style.display = "";
        clearSplitLoopTimers();
      };

      splitPlayTimer = setTimeout(() => {
        showSplitOverlayStill(ch);
        splitPauseTimer = setTimeout(() => {
          if (!splitOverlay.classList.contains("hidden")) playOnce();
        }, PAUSE_MS);
      }, PLAY_MS);
    };

    playOnce();
  }

  function showStrokeAt(idx) {
    strokeIdx = Math.max(0, Math.min(idx, chars.length - 1));
    const ch = chars[strokeIdx];
    const hex = charToHex(ch);
    strokeGifEl.style.display = "";
    strokeFallbackEl.style.display = "none";
    strokeFallbackEl.textContent = "";
    strokeFallbackEl.innerHTML = "";
    strokeGifEl.src = "https://www.twpen.com/bishun-animation/" + hex + "-stroke-order.gif";
    strokeGifEl.alt = ch;
    strokeGifEl.onerror = () => {
      strokeGifEl.style.display = "none";
      strokeFallbackEl.textContent = ch + "（筆順圖無法載入）";
      strokeFallbackEl.style.display = "";
    };
    if (indicatorEl) indicatorEl.textContent = (strokeIdx + 1) + " / " + chars.length;
  }

  // 先渲染分合縮圖：有 GIF 才顯示；無 GIF 時右欄保留空位、左欄隱藏
  el.querySelectorAll(".char-gif-thumb").forEach((thumbEl) => {
    const ch = thumbEl.getAttribute("data-char") || "";
    const canvas = thumbEl.querySelector(".char-gif-canvas");
    drawGifFirstFrameToCanvas(canvas, getWordGifUrl(ch), (ok) => {
      if (!ok || !canvas) {
        if (thumbEl.classList.contains("char-gif-thumb-right")) {
          thumbEl.classList.add("placeholder");
        } else {
          thumbEl.classList.add("hidden");
        }
        return;
      }
      try {
        thumbDataMap.set(ch, canvas.toDataURL("image/png"));
        const ctx = canvas.getContext("2d");
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const a = img[(y * canvas.width + x) * 4 + 3];
            if (a > 8) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX >= minX && maxY >= minY) {
          const bw = Math.max(1, maxX - minX + 1);
          const bh = Math.max(1, maxY - minY + 1);
          thumbRatioMap.set(ch, bw / bh);
        } else {
          thumbRatioMap.set(ch, 1);
        }
      } catch (_) {}

      // 另外載入高解析靜態幀，供放大層停住 3 秒使用，避免糊掉
      loadGifStillData(getWordGifUrl(ch), (ret) => {
        if (!ret || !ret.ok) return;
        stillDataMap.set(ch, ret.dataUrl);
        if (ret.ratio && isFinite(ret.ratio) && ret.ratio > 0) {
          // 優先使用 GIF 原始寬高比（上下型會是偏高）
          thumbRatioMap.set(ch, ret.ratio);
        }
      });
    });

    thumbEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (thumbEl.classList.contains("hidden") || thumbEl.classList.contains("placeholder")) return;
      fitSplitCellByRatio(thumbRatioMap.get(ch) || 1);
      splitOverlay.classList.remove("hidden");
      playSplitGifLoop(ch);
    });
  });

  el.querySelectorAll(".char-item").forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      strokeIdx = idx;
      showStrokeAt(strokeIdx);
      strokeOverlay.classList.remove("hidden");
    });
  });

  function handleStrokeSwipe(dx) {
    if (Math.abs(dx) < SWIPE_THRESHOLD || chars.length <= 1) return false;
    justSwipedStroke = true;
    if (dx > 0) {
      strokeIdx = (strokeIdx - 1 + chars.length) % chars.length;
    } else {
      strokeIdx = (strokeIdx + 1) % chars.length;
    }
    showStrokeAt(strokeIdx);
    setTimeout(() => { justSwipedStroke = false; }, 350);
    return true;
  }
  function handleSplitSwipe(dx) {
    if (Math.abs(dx) < SWIPE_THRESHOLD || chars.length <= 1) return false;
    justSwipedSplit = true;
    if (dx > 0) {
      strokeIdx = (strokeIdx - 1 + chars.length) % chars.length;
    } else {
      strokeIdx = (strokeIdx + 1) % chars.length;
    }
    const ch = chars[strokeIdx];
    playSplitGifLoop(ch);
    if (indicatorEl) indicatorEl.textContent = (strokeIdx + 1) + " / " + chars.length;
    setTimeout(() => { justSwipedSplit = false; }, 350);
    return true;
  }

  strokeOverlay.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length) startXStroke = e.touches[0].clientX;
  }, { passive: true });
  strokeOverlay.addEventListener("touchend", (e) => {
    const t = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
    if (t && handleStrokeSwipe(t.clientX - startXStroke)) e.preventDefault();
  }, { passive: false });
  strokeOverlay.addEventListener("mousedown", (e) => { startXStroke = e.clientX; });
  strokeOverlay.addEventListener("mouseup", (e) => {
    handleStrokeSwipe(e.clientX - startXStroke);
  });

  splitOverlay.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length) startXSplit = e.touches[0].clientX;
  }, { passive: true });
  splitOverlay.addEventListener("touchend", (e) => {
    const t = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
    if (t && handleSplitSwipe(t.clientX - startXSplit)) e.preventDefault();
  }, { passive: false });
  splitOverlay.addEventListener("mousedown", (e) => { startXSplit = e.clientX; });
  splitOverlay.addEventListener("mouseup", (e) => {
    handleSplitSwipe(e.clientX - startXSplit);
  });

  strokeOverlay.addEventListener("click", () => {
    if (justSwipedStroke) return;
    strokeOverlay.classList.add("hidden");
  });
  splitOverlay.addEventListener("click", () => {
    if (justSwipedSplit) return;
    clearSplitLoopTimers();
    splitOverlay.classList.add("hidden");
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
  const labels = (window.PttRouter && window.PttRouter.contentLabel) || {};
  const label = labels[contentKey] || contentKey || "內容";
  document.title = lesson ? `${lesson} ${label}` : label;
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
