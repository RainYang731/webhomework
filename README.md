# 月兔防衛隊

中秋夜限時消除遊戲：60 秒內點掉殭屍圖片，每張得 1 分。每排只有一隻殭屍；點擊只依欄位判定，不看上下位置，固定檢查該欄最底下的格子。底格命中後，上方殭屍快速落下一排，頂端隨機補入新殭屍。底格沒有殭屍時會有 1 秒操作冷卻，最底排殭屍閃爍提示。

## Demo

部署完成後可從 GitHub 專案的 **Settings → Pages** 取得網址。此儲存庫預期網址為：

https://rainyang731.github.io/webhomework/

## 開發與執行

這是純 HTML、CSS、JavaScript 靜態網站，不需要安裝套件或建置步驟。

```sh
python3 -m http.server 8000
```

接著在瀏覽器開啟 <http://localhost:8000>。

## 遊戲資料與圖片

- 排行榜與玩家名稱以 `localStorage` 保存在目前瀏覽器。
- 殭屍圖片由專案統一提供，位置是 `assets/zombie.svg`。要替換成自己的圖片，可在 GitHub 編輯／上傳這個素材檔；若更換檔名，請同步修改 `game.js` 的 `ZOMBIE_IMAGE`。
- 排行榜不會同步到其他裝置或玩家。純 GitHub Pages 沒有安全的伺服器端憑證可用來寫回 Git 儲存庫。

## 部署到 GitHub Pages

儲存庫已加入 GitHub Actions Pages 工作流程。將變更推送到 `main` 後，workflow 會部署網站。第一次部署前，請到儲存庫 **Settings → Pages → Build and deployment**，將 **Source** 設為 **GitHub Actions**。完成後 GitHub 會在 Pages 設定頁顯示公開網址。

## AI 工具

- OpenAI Codex：協助整理需求、製作遊戲與設定靜態部署。

## 檔案

- `SPEC.md`：產品需求與驗收條件。
- `index.html`、`styles.css`、`game.js`：遊戲介面、樣式與玩法。
- `assets/zombie.svg`：全遊戲共用的殭屍圖片，可在 GitHub 統一更換。
- `.github/workflows/pages.yml`：GitHub Pages 部署工作流程。
- `RETROSPECTIVE.md`：AI 協作回顧。
