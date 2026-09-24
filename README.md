# 月兔防衛隊

中秋夜限時守衛遊戲：60 秒內點擊落下的殭屍，每擊中一隻得 1 分。

## Demo

部署完成後可從 GitHub 專案的 **Settings → Pages** 取得網址。此儲存庫預期網址為：

https://rainyang731.github.io/webhomework/

## 開發與執行

這是純 HTML、CSS、JavaScript 靜態網站，不需要安裝套件或建置步驟。

```sh
python3 -m http.server 8000
```

接著在瀏覽器開啟 <http://localhost:8000>。

## 遊戲資料

- 排行榜與玩家名稱以 `localStorage` 保存在目前瀏覽器。
- 自訂殭屍圖片以 IndexedDB 保存在目前瀏覽器，圖片上限 5 MB。
- 這些資料不會同步到其他裝置或玩家。純 GitHub Pages 沒有安全的伺服器端憑證可用來寫回 Git 儲存庫。

## 部署到 GitHub Pages

儲存庫已加入 GitHub Actions Pages 工作流程。將變更推送到 `main` 後，workflow 會部署網站。第一次部署前，請到儲存庫 **Settings → Pages → Build and deployment**，將 **Source** 設為 **GitHub Actions**。完成後 GitHub 會在 Pages 設定頁顯示公開網址。

## AI 工具

- OpenAI Codex：協助整理需求、製作遊戲與設定靜態部署。

## 檔案

- `SPEC.md`：產品需求與驗收條件。
- `index.html`、`styles.css`、`game.js`：遊戲介面、樣式與玩法。
- `.github/workflows/pages.yml`：GitHub Pages 部署工作流程。
- `RETROSPECTIVE.md`：AI 協作回顧。
