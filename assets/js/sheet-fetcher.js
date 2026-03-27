/**
 * 從 Google 試算表即時讀取並解析為課次結構
 *
 * 舊版欄位：
 * A=第幾課, B=頁碼, C=課文, D=翻譯, E=生字, F=語詞, G=週數, H=CREC生字,
 * I=填空, J=對話練習, K=連連看上排, L=連連看下排, N=同組字音字形, O=語詞/短句
 *
 * 新版（相容）：
 * A=課次代碼, B=第幾課, C=頁碼, D=課文 ...（其餘整體右移一欄）
 */

(function () {
  function parseCsv(text) {
    text = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\uFEFF/, "");
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
      } else if (ch === "\r" && !inQ) {
        // skip
      } else {
        cur += ch;
      }
    }
    if (cur || line.length) {
      line.push(cur);
      rows.push(line);
    }
    return rows;
  }

  /**
   * 依試算表結構分組為課次
   * A 有值 = 新課開始；A 空 = 延續上一課（C 為課文下一句）
   */
  function groupIntoLessons(rows) {
    const lessons = [];
    let current = null;
    const header = rows[0] || [];
    const firstCol = (header[0] || "").trim();
    const hasLessonCodeCol = /課次/.test(firstCol) && /代碼/.test(firstCol);
    const base = hasLessonCodeCol ? 1 : 0;

    function col(row, idx) {
      return ((row[idx] || "") + "").trim();
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lessonCode = hasLessonCodeCol ? col(row, 0) : "";
      const a = col(row, 0 + base);   // 第幾課（課名）
      const b = col(row, 1 + base);   // 頁碼
      const c = col(row, 2 + base);   // 課文
      const translation = col(row, 3 + base);
      const d = col(row, 4 + base);   // 生字
      const e = col(row, 5 + base);   // 語詞
      const crec = col(row, 7 + base); // CREC生字
      const h = col(row, 8 + base);   // 填空
      const iVal = col(row, 9 + base); // 對話練習
      const k = col(row, 10 + base);  // 連連看上排
      const l = col(row, 11 + base);  // 連連看下排
      const n = col(row, 13 + base);  // 同組字音字形
      const o = col(row, 14 + base);  // 語詞/短句

      if (a) {
        current = {
          lessonId: lessonCode || String(i + 1),
          lessonCode: lessonCode || "",
          lessonName: a,
          page: b,
          text: c ? [c] : [],
          translations: translation ? [translation] : [],
          characters: d ? d.split(/[\s,、]+/).filter(Boolean) : [],
          vocab: e ? e.split(/[\s,、]+/).filter(Boolean) : [],
          crecCharacters: crec ? crec.split(/[\s,、]+/).filter(Boolean) : [],
          fillBlank: h ? [h] : [],
          sentence: iVal ? [iVal] : [],
          match: k && l ? [{ left: k, right: l }] : [],
          typoCorrect: n && o ? [{ groupRaw: n, wordsRaw: o }] : [],
          availableContents: []
        };
        lessons.push(current);
      } else if (current) {
        if (c) current.text.push(c);
        if (translation) current.translations.push(translation);
        if (h) current.fillBlank.push(h);
        if (iVal) current.sentence.push(iVal);
        if (k && l) current.match.push({ left: k, right: l });
        if (n && o) current.typoCorrect.push({ groupRaw: n, wordsRaw: o });
      }
    }
    // 決定每課有哪些內容可用（依試算表欄位）
    lessons.forEach((l) => {
      const list = [];
      if (l.text.length) list.push("text");
      if (l.vocab.length) list.push("vocab");
      if (l.characters.length) list.push("characters");
      if (l.crecCharacters.length) list.push("crecCharacters");
      if (l.fillBlank.length) list.push("fillBlank");
      if (l.sentence.length) list.push("sentence");
      if (l.match && l.match.length) list.push("match");
      if (l.typoCorrect && l.typoCorrect.length) list.push("typoCorrect");
      l.availableContents = list;
      l.order = lessons.indexOf(l);
    });
    return lessons;
  }

  async function fetchSheet(sheetId, gid) {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("無法載入試算表（HTTP " + resp.status + "）。請確認試算表已設為「知道連結的任何人可檢視」。");
    const text = await resp.text();
    const rows = parseCsv(text);
    return groupIntoLessons(rows);
  }

  window.PttSheetFetcher = {
    fetchSheet,
    parseCsv,
    groupIntoLessons
  };
})();
