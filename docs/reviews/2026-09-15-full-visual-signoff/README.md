# 全站 26 頁逐頁視覺驗收

本輪補完此前承認不足的逐頁看圖工作，並修正實際看到的問題。範圍是 **25 個正常頁面＋404**，不是只看同模板代表頁；每頁皆有桌機 1440px 與手機 390px 的完整截圖，合計 **52 張**，並附每頁核對重點。另以瀏覽器跑完全部 26 頁在 360／390／768／1440 的 **104 組**檢查。

網站實作版本：`111c6075ddddb7c36570032fa518923c43c583f2`。最終稽核程式與獨立複核版本：`3655d6a72dafbc513606b37879b42db6761cf70f`；其間只修正截圖稽核程式，沒有變更網站執行程式、內容或樣式。此目錄後續提交只新增證據。

## 驗收入口

[整站首頁](http://localhost:4336/) · [圖集](http://localhost:4336/galleries/) · [房型清單](http://localhost:4336/rooms/) · [觀山之屋](http://localhost:4336/rooms/log_cabin_1/) · [訂房匯款](http://localhost:4336/infos/account/) · [PR #63](https://github.com/Lawa0921/misstravel/pull/63)

localhost 只適用已啟動 WSL 預覽的使用者電腦，須保留預覽程序。[Vercel 預覽](https://misstravel-git-feat-editori-44e386-bag571ivy3470-1104s-projects.vercel.app) 維持原有登入保護。未合併，未變更正式站。

## 這次看圖後修正的缺陷

| 缺陷 | 修正與驗證 |
| --- | --- |
| 圖集舊欄位類別造成六個隱含欄，照片變成巨大單張 | 移除衝突類別；實測手機2欄、平板3欄、桌機4欄，36張照片逐張完成載入與繪製 |
| 觀山之屋首張是歷史冷氣公告 | 先顯示該房型設定的主圖；保留所有原照片及公告，不改原圖；十個房型皆測試主圖與完整圖片集合 |
| 房型尺寸圖／公告被 cover 裁切 | 輪播用 contain 顯示全圖，尺寸註記及公告原文不被裁掉 |
| 手機12px選圖按鈕太小、控制列遮圖且未填滿 | 改為圖片下方44px操作區；整列滿寬、窄螢幕內部捲動；用下一張按鈕逐張走到底驗證目前圓點保持可見 |
| 退費表格只有外框滿寬、欄位只占一半 | 恢復原生表格排版、固定欄寬，保留所有原列與百分比 |
| 營位長標題的最後一字落單 | 原房型名與原括號方案分組呈現，沒有改寫標題文字；四種寬度檢查 |

新回歸測試先在舊版重現了圖集欄數與觀山之屋主圖問題。看圖時也發現「圖片已下載」仍不等於完整截圖已繪製；稽核程式改為實際逐張垂直捲動並等候繪製，跳過未啟用輪播。每次截圖前檢查輪播未被水平位移且目前照片已載入，不能以壞掉的截圖冒稱通過。

## 逐頁清單與完整截圖

下列每一頁均由協調者實際讀取桌機／手機完整畫面核對，不以自動測試替代。原圖中的淺色菜單、QR Code、地圖與照片保留原色，不代表改成淺色介面。手機與桌機畫面皆可點開放大。

| 頁面 | 桌機完整圖 | 手機完整圖 | 逐頁核對重點 |
| --- | --- | --- | --- |
| `/404.html` | [1440px](pages/404.html-1440.jpg) | [390px](pages/404.html-390.jpg) | 錯誤提示與首頁／房型／關於入口完整；手機按鈕自然換行，noindex保留。 |
| `/announcements/` | [1440px](pages/announcements-1440.jpg) | [390px](pages/announcements-390.jpg) | 現有公告卡、原日期、原照片與前往查看入口；手機上下堆疊完整。 |
| `/announcements/website/` | [1440px](pages/announcements-website-1440.jpg) | [390px](pages/announcements-website-390.jpg) | 文章標題、原日期與標籤、照片、全部正文、返回最新消息及頁尾均檢視。 |
| `/galleries/` | [1440px](pages/galleries-1440.jpg) | [390px](pages/galleries-390.jpg) | 修正舊欄位類別造成的六個隱含欄；桌機4欄／手機2欄，36張照片必須完成實際捲動與繪製後再確認。 |
| `/` | [1440px](pages/home-1440.jpg) | [390px](pages/home-390.jpg) | 主視覺、兩個操作入口、六張導覽照片及完整頁尾；桌機分欄、手機堆疊一致。 |
| `/infos/account/` | [1440px](pages/infos-account-1440.jpg) | [390px](pages/infos-account-390.jpg) | 完整訂房步驟、QR Code、匯款資料、防詐提醒、延期與退費表格；表格欄位已填滿閱讀區。 |
| `/infos/contact-method/` | [1440px](pages/infos-contact-method-1440.jpg) | [390px](pages/infos-contact-method-390.jpg) | LINE、QR Code、社群、電話、Email與地址；手機沒有溢出或遮擋。 |
| `/infos/guide/` | [1440px](pages/infos-guide-1440.jpg) | [390px](pages/infos-guide-390.jpg) | 兩種路線卡及原建議提示；兩個完整圖文彈窗、標題與關閉操作另列驗收。 |
| `/infos/` | [1440px](pages/infos-1440.jpg) | [390px](pages/infos-390.jpg) | 八個資訊入口、八組設施照片與所有原說明逐段檢視；長頁照片沒有省略為代表圖。 |
| `/infos/map/` | [1440px](pages/infos-map-1440.jpg) | [390px](pages/infos-map-390.jpg) | 原地圖未裁切或反相；可開啟原圖，手機導覽及頁尾完整。 |
| `/infos/menu/` | [1440px](pages/infos-menu-1440.jpg) | [390px](pages/infos-menu-390.jpg) | 原菜單全張顯示且價格未重畫；手機可開啟原圖放大，淺底只屬原圖片。 |
| `/infos/roles/` | [1440px](pages/infos-roles-1440.jpg) | [390px](pages/infos-roles-390.jpg) | 警告與所有條款完整展開；手機段落、強調文字及完整頁尾逐段核對。 |
| `/infos/set-menu-info/` | [1440px](pages/infos-set-menu-info-1440.jpg) | [390px](pages/infos-set-menu-info-390.jpg) | 原訂購條件與三種合菜入口皆完整；原菜單縮圖、全圖彈窗及手機版逐項核對。 |
| `/infos/video/` | [1440px](pages/infos-video-1440.jpg) | [390px](pages/infos-video-390.jpg) | 等候外部播放器載入後確認桌機與手機的YouTube預覽、播放按鈕和比例；不將未載入空框算通過。 |
| `/rooms/campsite_1/` | [1440px](pages/rooms-campsite_1-1440.jpg) | [390px](pages/rooms-campsite_1-390.jpg) | 櫻花之盡：原本標題末字落單，已將原房型名與方案分組；三／四帳價格、尺寸、規則及相關房型均檢視。 |
| `/rooms/campsite_2/` | [1440px](pages/rooms-campsite_2-1440.jpg) | [390px](pages/rooms-campsite_2-390.jpg) | 沒日之嶺：草地照片、三／四帳與12／16人、費用及完整入營條件；手機無擠壓。 |
| `/rooms/campsite_3/` | [1440px](pages/rooms-campsite_3-1440.jpg) | [390px](pages/rooms-campsite_3-390.jpg) | 密式雨棚：原尺寸註記圖片完整、不裁掉下緣；2帳8人、加帳及車輛條件、標題分組均檢視。 |
| `/rooms/` | [1440px](pages/rooms-1440.jpg) | [390px](pages/rooms-390.jpg) | 十張房型卡逐張核對；營位三／四帳價格與人數、四間木屋、三種套房皆顯示完整。 |
| `/rooms/log_cabin_1/` | [1440px](pages/rooms-log_cabin_1-1440.jpg) | [390px](pages/rooms-log_cabin_1-390.jpg) | 觀山之屋：修正首張為設定的陽台房型照片；歷史冷氣公告仍保留於輪播；公共設施、炊煮與停車原文完整。 |
| `/rooms/log_cabin_2/` | [1440px](pages/rooms-log_cabin_2-1440.jpg) | [390px](pages/rooms-log_cabin_2-390.jpg) | 依山之屋－靜：原圖、共享平台及與默房合訂條件完整；費用、正文與頁尾均檢視。 |
| `/rooms/log_cabin_3/` | [1440px](pages/rooms-log_cabin_3-1440.jpg) | [390px](pages/rooms-log_cabin_3-390.jpg) | 依山之屋－默：原圖及與靜房共用平台條件完整；手機長文與相關房型卡完整。 |
| `/rooms/log_cabin_4/` | [1440px](pages/rooms-log_cabin_4-1440.jpg) | [390px](pages/rooms-log_cabin_4-390.jpg) | 依山之屋－沉：門口原圖、涼亭尺寸、炊煮與停車條件完整；窄螢幕選圖列不再縮短。 |
| `/rooms/suite_1/` | [1440px](pages/rooms-suite_1-1440.jpg) | [390px](pages/rooms-suite_1-390.jpg) | 密式之眼：室內原圖、平日不附／假日附早餐、加人與平台搭帳費用完整。 |
| `/rooms/suite_2/` | [1440px](pages/rooms-suite_2-1440.jpg) | [390px](pages/rooms-suite_2-390.jpg) | 密式之頂：床位原圖、早餐與寢具條件、停車限制、全段正文與相關卡片均檢視。 |
| `/rooms/suite_3/` | [1440px](pages/rooms-suite_3-1440.jpg) | [390px](pages/rooms-suite_3-390.jpg) | 映月之屋：入口原圖、2人與1600元平日起價、早餐／寢具條件及頁尾均檢視。 |
| `/sale_items/` | [1440px](pages/sale_items-1440.jpg) | [390px](pages/sale_items-390.jpg) | 七項服務卡、原租用品價格與摘要均完整；七個既有彈窗另列開啟、捲動及關閉檢查。 |

## 十二個彈窗

已分別開啟全部十二個彈窗，在桌機與手機捲到上方／底部，核對標題、關閉按鈕、原內容、圖片及末段提示；另由完整瀏覽器測試驗證 Escape、焦點回復與無 JavaScript 備援。下列每張比較圖含兩種寬度各自的上方與底部畫面。

| 類別 | 實際畫面 |
| --- | --- |
| 交通 | [大湖](dialogs/guide_1.jpg) · [豆腐街](dialogs/guide_2.jpg) |
| 租用與服務 | [烹飪](dialogs/sale_item_1.jpg) · [烤肉](dialogs/sale_item_2.jpg) · [寢具](dialogs/sale_item_3.jpg) · [雜貨](dialogs/sale_item_4.jpg) |
| 餐食服務 | [代訂合菜](dialogs/sale_item_6.jpg) · [簡餐](dialogs/sale_item_7.jpg) · [代訂食材](dialogs/sale_item_8.jpg) |
| 原合菜菜單 | [家庭](dialogs/set_menu_1.jpg) · [經濟](dialogs/set_menu_2.jpg) · [精緻](dialogs/set_menu_3.jpg) |

## 測試與獨立複核

完整 verify：**328／328**，npm audit：**0 vulnerabilities**；完整 Chromium 互動測試 **61／61（不重試）**；整站訪客流程 **419／419**；全部頁面四種寬度 **104／104**。76 組頁面／彈窗的 axe 掃描未發現 violations，其中 38 組有待判定項目，未當成通過，不宣稱完整 WCAG 認證。

[機器可讀摘要](verification.json) · [104組逐項結果](all-pages-report.json) · [完整瀏覽器測試](browser-tests.txt) · [verify](verify.txt) · [訪客流程](visitor-report.json) · [無障礙掃描](accessibility.json) · [內容與SEO前後對照](content-preservation.json) · [來源CI成功](https://github.com/Lawa0921/misstravel/actions/runs/34954222840)

獨立唯讀 AI 審查未直接放行：[第一輪](independent-review-initial.md) 指出手機控制列寬度與圖集繪製證據不足；[第二輪](independent-review-second.md) 確認網站修正，但指出截圖工具把未啟用的輪播橫向捲走；工具補上檢查並重拍全部頁面後，[最終複核為 PASS](independent-review-final.md)。保留所有原始結論，不將未通過紀錄改寫成通過。

所有 26 頁的原正文文字、title／meta／canonical／JSON-LD 與連結對照無差異；251 個原內容、照片與字型檔未改。輪播順序、顯示裁切、控制大小、表格及標題包裝是本次允許的介面改動。沒有變更價格、營運條件或外部訂房流程。

## 驗收界線

逐頁畫面檢核由協調者讀取實際瀏覽器截圖完成，獨立審查是另一個 AI 唯讀工作階段，並非真人使用者研究。完整截圖涵蓋1440／390，360／768為瀏覽器幾何與互動測試，不冒稱另有兩套完整看圖紀錄。原始菜單／照片不重畫，外部 YouTube 與訂房服務不由本專案改版；沒有送出真實訂單、付款或訊息，也未衡量搜尋排名提升。

直接開 `/404.html` 是靜態驗收畫面，預覽伺服器可回200，不把它與不存在網址的404回應混為一談。正式站未套用本次PR。相較先前只交代表頁，現在每一頁均有完整截圖、個別核對重點與可追溯測試版本。
