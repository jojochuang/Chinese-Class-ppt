(function () {
  const SWIPE_THRESHOLD = 50;

  let questions = [];
  let slideIndex = 0;
  let startX = 0;
  let audioCorrect = null;
  let audioWrong = null;
  let speakingEnabled = true;
  const audioPathCandidates = {
    correct: ["../sounds/correct.mp3", "../../sounds/correct.mp3"],
    wrong: ["../sounds/wrong.mp3", "../../sounds/wrong.mp3"]
  };

  function byId(id) { return document.getElementById(id); }

  function splitBySpace(s) {
    return (s || "").trim().split(/\s+/).filter(Boolean);
  }

  function buildQuestions(rows) {
    const out = [];
    (rows || []).forEach((row) => {
      const group = splitBySpace(row.groupRaw);
      const words = splitBySpace(row.wordsRaw);
      if (group.length < 2 || !words.length) return;

      words.forEach((word) => {
        const chars = Array.from(word);
        const hitIdx = chars.findIndex((ch) => group.includes(ch));
        if (hitIdx < 0) return;
        const correctChar = chars[hitIdx];
        const alternatives = group.filter((ch) => ch !== correctChar);
        if (!alternatives.length) return;
        const wrongChar = alternatives[Math.floor(Math.random() * alternatives.length)];
        const shownChars = chars.slice();
        shownChars[hitIdx] = wrongChar;
        out.push({
          originalWord: word,
          shownChars,
          wrongIdx: hitIdx,
          wrongChar,
          correctChar,
          group
        });
      });
    });
    return out;
  }

  function playAudio(ok) {
    const a = ok ? audioCorrect : audioWrong;
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // 若第一路徑失敗或暫時播放失敗，嘗試用備援路徑重播一次
          const kind = ok ? "correct" : "wrong";
          const src = (a.getAttribute("data-fallback-src") || "").trim();
          if (!src) return;
          const retry = new Audio(src);
          retry.preload = "auto";
          retry.play().catch(() => {});
          // 將主 audio 切到備援來源，後續播放更穩定
          a.src = src;
          a.load();
          a.removeAttribute("data-fallback-src");
        });
      }
    } catch (_) {}
  }

  function initAudio() {
    audioCorrect = new Audio(audioPathCandidates.correct[0]);
    audioWrong = new Audio(audioPathCandidates.wrong[0]);
    audioCorrect.preload = "auto";
    audioWrong.preload = "auto";
    if (audioPathCandidates.correct[1]) {
      audioCorrect.setAttribute("data-fallback-src", audioPathCandidates.correct[1]);
    }
    if (audioPathCandidates.wrong[1]) {
      audioWrong.setAttribute("data-fallback-src", audioPathCandidates.wrong[1]);
    }
  }

  function speakText(text) {
    if (!speakingEnabled) return;
    if (!("speechSynthesis" in window)) return;
    const t = (text || "").trim();
    if (!t) return;
    try {
      const syn = window.speechSynthesis;
      syn.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "zh-TW";
      u.rate = 0.85;
      syn.speak(u);
    } catch (_) {}
  }

  function render(autoSpeak) {
    const bodyEl = byId("contentBody");
    if (!bodyEl) return;
    if (!questions.length) {
      bodyEl.innerHTML = "<div class='muted'>此課尚無字音字形改錯資料。</div>";
      return;
    }

    slideIndex = Math.max(0, Math.min(slideIndex, questions.length - 1));
    const q = questions[slideIndex];

    const charsHtml = q.shownChars.map((ch, idx) => {
      const cls = q.solved && idx === q.wrongIdx
        ? "typo-char-btn fixed-char"
        : (idx === q.wrongIdx ? "typo-char-btn wrong-char" : "typo-char-btn");
      return `<button type="button" class="${cls}" data-char-idx="${idx}"><span class="typo-btn-num">${idx + 1}</span>${ch}</button>`;
    }).join("");
    const pickHtml = q.group.map((ch, idx) => (
      `<button type="button" class="typo-pick-btn" data-pick-char="${ch}"><span class="typo-btn-num">${idx + 1}</span>${ch}</button>`
    )).join("");

    bodyEl.innerHTML = `
      <div id="typoSlide" class="typo-slide">
        <button type="button" id="typoSpeakBtn" class="typo-speak-btn">🔊 播放</button>
        <div class="typo-sentence">${charsHtml}</div>
        <div class="typo-picker-zone">
          <div class="typo-divider"></div>
          <div id="typoPicker" class="typo-picker">${pickHtml}</div>
        </div>
        <div class="typo-indicator">${slideIndex + 1} / ${questions.length}</div>
      </div>
    `;
    const speakBtn = byId("typoSpeakBtn");
    if (speakBtn) {
      speakBtn.addEventListener("click", () => {
        speakText(q.originalWord);
      });
    }


    const picker = byId("typoPicker");
    const solved = !!q.solved;

    bodyEl.querySelectorAll(".typo-char-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (solved) return;
        const idx = parseInt(btn.getAttribute("data-char-idx"), 10);
        if (idx !== q.wrongIdx) {
          playAudio(false);
          return;
        }
        playAudio(true);
        if (picker) picker.classList.add("show");
      });
    });

    bodyEl.querySelectorAll(".typo-pick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (solved) return;
        const picked = btn.getAttribute("data-pick-char") || "";
        if (picked !== q.correctChar) {
          playAudio(false);
          return;
        }
        playAudio(true);
        q.solved = true;
        q.shownChars[q.wrongIdx] = q.correctChar;
        render(false);
      });
    });

    if (autoSpeak) {
      speakText(q.originalWord);
    }
  }

  function goPrev() {
    if (questions.length <= 1) return;
    slideIndex = (slideIndex - 1 + questions.length) % questions.length;
    render(true);
  }

  function goNext() {
    if (questions.length <= 1) return;
    slideIndex = (slideIndex + 1) % questions.length;
    render(true);
  }

  function handleSwipe(dx) {
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0) goPrev();
    else goNext();
  }

  function initSwipe() {
    const bodyEl = byId("contentBody");
    if (!bodyEl) return;
    bodyEl.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches.length) startX = e.touches[0].clientX;
    }, { passive: true });
    bodyEl.addEventListener("touchend", (e) => {
      const t = (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : null;
      if (t) handleSwipe(t.clientX - startX);
    }, { passive: true });
    bodyEl.addEventListener("mousedown", (e) => { startX = e.clientX; });
    bodyEl.addEventListener("mouseup", (e) => { handleSwipe(e.clientX - startX); });
  }

  async function init() {
    const sp = new URLSearchParams(window.location.search);
    const book = sp.get("book") || "";
    const lesson = sp.get("lesson") || "";
    document.title = lesson ? `${lesson} 字音字形改錯` : "字音字形改錯";
    const titleEl = byId("pageTitle") || document.querySelector(".container h1");
    const metaEl = byId("metaText");
    const bodyEl = byId("contentBody");

    initAudio();

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

      questions = buildQuestions(data.typoCorrect);
      slideIndex = 0;
      render(true);
      initSwipe();
    } catch (e) {
      if (bodyEl) bodyEl.innerHTML = "<div class='warn'>載入失敗：" + (e && e.message ? e.message : e) + "</div>";
    }
  }

  window.PttTypoCorrectPageInit = init;
})();
