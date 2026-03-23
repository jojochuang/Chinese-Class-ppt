# ptt 教學分頁啟動器

## 從試算表即時讀取

課本資料來自 Google 試算表，修改試算表後重新整理頁面即可生效。

**必要設定**：試算表需設為「知道連結的任何人可檢視」，否則無法從網頁讀取。

## 試算表結構（美洲一課本）

- **A**：第幾課（含標題）
- **B**：頁碼
- **C**：課文（一句一儲存格，同一課跨多列）
- **D**：生字
- **E**：語詞
- **H**：填空
- **I**：造句

## 設定檔

`assets/js/config.js`：
- `sheetId`：試算表 ID（網址中 `/d/` 後面那一串）
- `gid`：工作表 ID（網址中 `gid=` 後面）
- `bookName`：顯示用課本名稱

若將 `sheetId` 改為空字串，則改回使用本機 `data/` JSON。

## 本地測試

因跨網域讀取，需用 HTTP 伺服器開啟，不能直接開 `file://`：

```bash
cd ptt
python3 -m http.server 8888
# 瀏覽器打開 http://localhost:8888
```

## 部署到 GitHub Pages

1. 將 ptt 資料夾推上 GitHub
2. Settings → Pages → Source 選 main 或 gh-pages
3. 開啟 `https://<username>.github.io/<repo>/ptt/`
