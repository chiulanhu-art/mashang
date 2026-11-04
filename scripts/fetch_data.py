"""
馬上有錢：抓取臺灣證券交易所 OpenAPI 的每日收盤資料，存成 data/market.js。

這支程式由 GitHub Actions 每個交易日下午自動執行（見 .github/workflows/update-data.yml），
網頁再讀取 data/market.js 顯示資料。只用 Python 內建功能，不需要安裝任何套件。
"""
import json
import os
import urllib.request
from datetime import datetime, timezone, timedelta

API = "https://openapi.twse.com.tw/v1/exchangeReport/"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "market.js")

# 首頁「其他指數」要顯示的指數
INDEX_NAMES = ["臺灣50指數", "臺灣中型100指數", "臺灣資訊科技指數", "臺灣高股息指數"]


def get(name):
    req = urllib.request.Request(API + name, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def num(s):
    """把 "1,234.50"、"-0.8800" 之類的字串轉成數字；空的或無效的回傳 None。"""
    try:
        return float(str(s).replace(",", "").strip())
    except ValueError:
        return None


def roc_date(s):
    """民國日期 "1151103" -> "2026-11-03" """
    s = str(s).strip()
    return f"{int(s[:-4]) + 1911}-{s[-4:-2]}-{s[-2:]}"


def old_history():
    """讀取上一次存下來的大盤走勢，讓走勢圖可以累積超過一個月。"""
    try:
        with open(OUT, encoding="utf-8") as f:
            text = f.read()
        return json.loads(text[text.index("{"):text.rindex("}") + 1]).get("history", [])
    except (OSError, ValueError):
        return []


def main():
    market = get("FMTQIK")        # 本月每日大盤成交資訊
    indices = get("MI_INDEX")     # 昨日各類指數
    stocks = get("STOCK_DAY_ALL") # 昨日個股收盤

    last = market[-1]
    taiex_pct = None
    other = []
    for row in indices:
        sign = -1 if row.get("漲跌") == "-" else 1
        item = {
            "name": row["指數"],
            "close": num(row["收盤指數"]),
            "change": sign * (num(row["漲跌點數"]) or 0),
            "pct": num(row["漲跌百分比"]),
        }
        if row["指數"] == "發行量加權股價指數":
            taiex_pct = item["pct"]
        elif row["指數"] in INDEX_NAMES:
            other.append(item)
    other.sort(key=lambda x: INDEX_NAMES.index(x["name"]))

    rows = []
    for s in stocks:
        close = num(s["ClosingPrice"])
        if not close:
            continue  # 當天沒有成交
        rows.append([
            s["Code"], s["Name"].strip(),
            num(s["OpeningPrice"]), num(s["HighestPrice"]), num(s["LowestPrice"]),
            close, num(s["Change"]) or 0,
            int(num(s["TradeVolume"]) or 0), int(num(s["TradeValue"]) or 0),
        ])

    # 新舊走勢合併（同一天以新的為準），最多保留 60 個交易日
    history = {h["date"]: h for h in old_history()}
    for m in market:
        d = roc_date(m["Date"])
        history[d] = {"date": d, "close": num(m["TAIEX"]), "change": num(m["Change"])}
    history = [history[d] for d in sorted(history)][-60:]

    data = {
        "date": roc_date(stocks[0]["Date"] if stocks else last["Date"]),
        "generatedAt": datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M"),
        "taiex": {
            "close": num(last["TAIEX"]),
            "change": num(last["Change"]),
            "pct": taiex_pct,
            "value": int(num(last["TradeValue"])),
            "volume": int(num(last["TradeVolume"])),
            "transactions": int(num(last["Transaction"])),
        },
        "history": history,
        "indices": other,
        "stocks": rows,
    }

    # utf-8-sig 會在檔案開頭加上 UTF-8 標記，避免某些瀏覽器把中文讀成亂碼
    with open(OUT, "w", encoding="utf-8-sig") as f:
        f.write("/* 這個檔案由 scripts/fetch_data.py 自動產生，請不要手動修改 */\n")
        f.write("window.MARKET_DATA = ")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"OK: {data['date']}，共 {len(rows)} 檔")


if __name__ == "__main__":
    main()
