# 哥吉拉怪獸對打機速查

哥吉拉聯名怪獸對打機的中文攻略速查網頁，手機可「加入主畫面」離線使用（PWA）。

網址：https://jackhung9527.github.io/Digivice_Data/

## 支援機型

| 機型 | 頁面 | 內容 |
|---|---|---|
| 哥吉拉彩元祖（Digital Monster COLOR ゴジラ 70th Edition） | `dmgz.html` | 34 隻、10 關 |
| 哥吉拉彩色超代（Digimon Pendulum COLOR ゴジラ Edition） | `pengz.html` | 58 隻、22 關、合體速查 |
| 彩色超代（Digimon Pendulum COLOR，10 個版本） | `penc.html` | 331 隻、各版本 10 關、依屬性合體速查 |
| 元祖20th（Digimon Original／Digital Monster Ver.20th） | `dm20.html` | 134 隻、15 顆蛋、競技場單打／雙打各 100 回合 |

## 內容

| 分頁 | 內容 |
|---|---|
| 進化條件 | 全部怪獸的進化路線、條件與數值；**進化試算**（輸入失誤／G細胞／勝率等，直接顯示會進化成誰）；**我的圖鑑**（從相簿加圖，只存在手機） |
| 合體速查（彩色超代） | **查合體**工具；成熟期／完全體／其他合體速查表 |
| 操作手順 | 按鍵、開機充電、A～H 圖示、睡覺、冷凍備份、照顧失誤、死亡、通信對戰、設定 |
| G細胞系統 | 量表規則、增減點數、**G數值換算** |
| 隨機遭遇事件 | 時間組／對手組、**我的怪獸下次幾點遭遇** |
| 背景獲得 | 全部背景的解鎖條件 |
| 關卡 | 任務模式各關對手與力量、**命中率計算** |

最上方搜尋框會跨所有分頁搜尋（中文、英文、日文名稱皆可）。

## 檔案結構

```
docs/                 ← 網站本體（直接部署這個資料夾）
  index.html          選機型首頁
  dmgz.html           哥吉拉彩元祖（Digital Monster COLOR ゴジラ 70th）
  pengz.html          哥吉拉彩色超代（Digimon Pendulum COLOR ゴジラ Edition，含合體速查）
  penc.html           彩色超代（Digimon Pendulum COLOR，10 個版本，含版本切換與合體速查）
  dm20.html           元祖20th（Digimon Original，含蛋篩選、版本限定、競技場）
  app.css / app.js    共用的樣式與功能
  data/dmgz.js, data/pengz.js, data/penc.js, data/dm20.js   資料（由 tools/build_data.py 產生，勿手改）
  sw.js               離線快取
  manifest.webmanifest, icon-*.png
tools/
  build_data.py       英文原始資料 → 中文資料檔（兩台機型）
  make_icons.py       產生圖示
  source/             原始資料（dmgz_en.json、pengz_en.json、pengz_jogress.json、penc_en.json、penc_quest.json）
                      penc_zh.json、dm20_zh.json 為中文名稱對照，可直接修改後重新產生
                      dm20_en.json、dm20_extra.json 為元祖20th 原始資料（進化、競技場、版本限定）
```

## 修改資料

```
python tools/build_data.py     # 改完中文名稱／關卡／遭遇表後重新產生 data.js
```

更新網站內容後，把 `docs/sw.js` 的 `CACHE = 'gz70-v5'` 版本號 +1，手機開啟後才會抓到新版。

## 部署與安裝到手機

1. GitHub Pages：倉庫 Settings → Pages → Source 選 Branch `main`、資料夾 `/docs` → Save（免費帳號需為公開倉庫）。
2. 手機用瀏覽器開網址一次：
   - iPhone（Safari）：分享 → 加入主畫面
   - Android（Chrome）：⋮ → 加到主畫面／安裝應用程式
3. 之後從主畫面圖示開啟，沒有網路也能用。

## 資料來源

- BANDAI 官方取扱説明書
- [humulos.com](https://humulos.com/digimon/dmgz/) 攻略站（數值資料）

非官方整理。Digimon © 本鄉あきよし・東映動畫・BANDAI／Godzilla TM & © TOHO CO., LTD.
