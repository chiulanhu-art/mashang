# 馬上有錢

開盤前五分鐘，看懂昨天的台股。純靜態網站（HTML／CSS／JS），可直接放在 GitHub Pages。

## 檔案說明

| 檔案／資料夾 | 用途 |
|---|---|
| `index.html` | 首頁：大盤摘要、昨日焦點 |
| `rank.html` | 排行榜：漲幅／跌幅／成交量前十名 |
| `stock.html` | 個股查詢＋我的觀察清單 |
| `learn.html` | 名詞小教室 |
| `about.html` | 關於本站、資料來源、免責聲明、照片來源 |
| `css/style.css` | 所有頁面的樣式（顏色在最上面的 `:root` 可以改） |
| `js/main.js` | 網頁互動程式 |
| `images/` | 照片（來自 Unsplash，免費授權） |
| `data/market.js` | 股市資料，**自動產生，請不要手動改** |
| `scripts/fetch_data.py` | 去證交所抓資料的程式 |
| `.github/workflows/update-data.yml` | 讓 GitHub 每個交易日 15:30 自動執行上面那支程式 |

## 在自己電腦上預覽

直接用滑鼠雙擊 `index.html`，就會用瀏覽器打開。

## 上傳到 GitHub 並開成網站

1. 到 GitHub 建立一個新的 repository（例如叫 `mashang`），設成 **Public**。
2. 在 repository 頁面按 **Add file → Upload files**，把這個資料夾裡的**所有檔案和資料夾**拖進去（包含 `.github` 資料夾），按 **Commit changes**。
3. 到 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 **main**、資料夾選 **/(root)**，按 **Save**。
4. 等 1～2 分鐘，網址會出現在同一頁，格式像 `https://你的帳號.github.io/mashang/`。

## 讓資料每天自動更新

- 上傳後，到 **Actions** 分頁，左邊點「更新股市資料」，按 **Run workflow** 手動跑一次測試。
- 成功的話會出現綠色勾勾，`data/market.js` 會被更新，網站幾分鐘後就會顯示新資料。
- 之後每個交易日台灣時間下午 3:30 左右會自動執行，不用再管它。
- 如果出現紅色叉叉，點進去看錯誤訊息，最常見的原因是證交所資料暫時抓不到，隔天通常就會恢復。

## 免責聲明

本站資料僅供參考，不構成任何投資建議。
