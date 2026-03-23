(function () {
  let pairs = [];
  let bottomOrder = [];
  let connectedPairs = new Set();

  function byId(id) {
    return document.getElementById(id);
  }

  function htmlEscape(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function isValidImageUrl(s) {
    const t = (s || "").trim();
    return t.startsWith("http://") || t.startsWith("https://");
  }

  function renderContent(val) {
    if (!val) return "";
    const v = String(val).trim();
    if (isValidImageUrl(v)) {
      return `<img class="match-img" src="${htmlEscape(v)}" alt="" />`;
    }
    return htmlEscape(v);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    // 若結果與原順序相同，交換前兩項以確保下排一定被打亂
    if (a.length > 1) {
      let isIdentity = true;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== i) {
          isIdentity = false;
          break;
        }
      }
      if (isIdentity) {
        [a[0], a[1]] = [a[1], a[0]];
      }
    }
    return a;
  }

  function drawLine(svgEl, fromEl, toEl) {
    if (!svgEl || !fromEl || !toEl) return;
    const svgRect = svgEl.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const x1 = fromRect.left - svgRect.left + fromRect.width / 2;
    const y1 = fromRect.bottom - svgRect.top;
    const x2 = toRect.left - svgRect.left + toRect.width / 2;
    const y2 = toRect.top - svgRect.top;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#1976d2");
    line.setAttribute("stroke-width", "2");
    svgEl.appendChild(line);
  }

  function render() {
    const bodyEl = byId("contentBody");
    if (!bodyEl) return;

    if (!pairs.length) {
      bodyEl.innerHTML = "<div class='muted'>此課尚無連連看資料（請在試算表 K、L 欄填寫）。</div>";
      return;
    }

    const topHtml = pairs
      .map(
        (p, i) =>
          `<span class="match-item" data-pair-index="${i}" role="button" tabindex="0"><span class="match-num">${i + 1}</span><span class="match-content">${renderContent(p.left)}</span></span>`
      )
      .join("");

    const bottomHtml = bottomOrder
      .map(
        (idx, pos) =>
          `<span class="match-item match-bottom-item" data-pair-index="${idx}" role="button" tabindex="0"><span class="match-num">${pos + 1}</span><span class="match-content">${renderContent(pairs[idx].right)}</span></span>`
      )
      .join("");

    bodyEl.innerHTML = `
      <div class="match-top">${topHtml}</div>
      <div class="match-connect"></div>
      <div class="match-bottom">${bottomHtml}</div>
      <svg class="match-svg" xmlns="http://www.w3.org/2000/svg"></svg>
    `;

    const svgEl = bodyEl.querySelector(".match-svg");
    const container = bodyEl;

    function redrawAllLines() {
      if (!svgEl) return;
      svgEl.innerHTML = "";
      connectedPairs.forEach((pairIdx) => {
        const topEl = bodyEl.querySelector(`.match-top .match-item[data-pair-index="${pairIdx}"]`);
        const bottomPos = bottomOrder.indexOf(pairIdx);
        const bottomEl = bodyEl.querySelectorAll(".match-bottom .match-item")[bottomPos];
        if (topEl && bottomEl) drawLine(svgEl, topEl, bottomEl);
      });
    }

    bodyEl.querySelectorAll(".match-top .match-item").forEach((topEl) => {
      const pairIdx = parseInt(topEl.getAttribute("data-pair-index"), 10);
      const bottomPos = bottomOrder.indexOf(pairIdx);
      const bottomEl = bodyEl.querySelectorAll(".match-bottom .match-item")[bottomPos];

      const handler = () => {
        if (connectedPairs.has(pairIdx)) {
          connectedPairs.delete(pairIdx);
          topEl.classList.remove("connected");
          if (bottomEl) bottomEl.classList.remove("connected");
          redrawAllLines();
          return;
        }
        connectedPairs.add(pairIdx);
        topEl.classList.add("connected");
        if (bottomEl) bottomEl.classList.add("connected");
        drawLine(svgEl, topEl, bottomEl);
      };

      topEl.addEventListener("click", handler);
      topEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handler();
        }
      });
    });

    window.addEventListener("resize", redrawAllLines);
  }

  async function init() {
    const sp = new URLSearchParams(window.location.search);
    const book = sp.get("book") || "";
    const lesson = sp.get("lesson") || "";
    const titleEl = document.querySelector(".container h1");
    const metaEl = byId("metaText");
    const bodyEl = byId("contentBody");

    try {
      const data = await loadLessonData(book, lesson);
      if (!data) throw new Error("無法載入資料");

      if (data.lessonName && titleEl) titleEl.textContent = data.lessonName;
      if (data.page != null && data.page !== "" && metaEl) {
        metaEl.textContent = "第" + data.page + "頁";
      } else if (metaEl) {
        const bookLabel =
          window.PttConfig && window.PttConfig.bookName && book === "sheet"
            ? window.PttConfig.bookName
            : book;
        metaEl.textContent = "課本：" + bookLabel + " ｜ 課次：" + lesson;
      }

      pairs = Array.isArray(data.match) ? data.match.filter((p) => p && p.left && p.right) : [];
      bottomOrder = shuffle(pairs.map((_, i) => i));
      connectedPairs = new Set();

      render();

      // 從 bfcache 還原時重新打亂（避免重複使用舊分頁時順序未更新）
      window.addEventListener("pageshow", (e) => {
        if (e.persisted && pairs.length > 0) {
          bottomOrder = shuffle(pairs.map((_, i) => i));
          connectedPairs.clear();
          render();
        }
      });
    } catch (e) {
      if (bodyEl)
        bodyEl.innerHTML =
          "<div class='warn'>載入失敗：" + (e && e.message ? e.message : e) + "</div>";
    }
  }

  window.PttMatchPageInit = init;
})();
