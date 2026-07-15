exports.handler = async function(event) {
  try {
    const symbolsParam = event.queryStringParameters?.symbols || "";

    const symbols = symbolsParam
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (symbols.length === 0) {
      return jsonResponse(400, {
        ok: false,
        message: "請提供股票代號，例如 ?symbols=2330,2317"
      });
    }

    const results = {};

    await Promise.all(
      symbols.map(async symbol => {
        const quote = await fetchTwseMisQuote(symbol);

        if (quote) {
          results[symbol] = quote;
        }
      })
    );

    return jsonResponse(200, {
      ok: true,
      source: "TWSE MIS",
      updatedAt: new Date().toISOString(),
      data: results
    });

  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error.message
    });
  }
};

async function fetchTwseMisQuote(symbol) {
  const markets = ["tse", "otc"];

  for (const market of markets) {
    const exCh = `${market}_${symbol}.tw`;
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${exCh}&json=1&delay=0`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://mis.twse.com.tw/stock/index.jsp",
          "Accept": "application/json,text/plain,*/*"
        }
      });

      if (!res.ok) continue;

      const json = await res.json();
      const item = json?.msgArray?.[0];

      if (!item) continue;

      const latestPrice = parsePrice(item.z);
      const yesterdayPrice = parsePrice(item.y);
      const open = parsePrice(item.o);
      const high = parsePrice(item.h);
      const low = parsePrice(item.l);

      let change = null;
      let changePercent = null;

      if (latestPrice && yesterdayPrice) {
        change = latestPrice - yesterdayPrice;
        changePercent = yesterdayPrice !== 0 ? change / yesterdayPrice * 100 : null;
      }

      return {
        symbol: item.c || symbol,
        name: item.n || "",
        market,
        price: latestPrice,
        yesterday: yesterdayPrice,
        open,
        high,
        low,
        volume: parseNumber(item.v),
        time: item.t || "",
        date: item.d || "",
        change,
        changePercent
      };

    } catch (error) {
      console.warn(`TWSE MIS ${market}_${symbol} failed`, error.message);
    }
  }

  return null;
}

function parsePrice(value) {
  if (value === undefined || value === null) return null;
  if (value === "-" || value === "") return null;

  const num = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(num) ? num : null;
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;

  const num = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(num) ? num : null;
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(body)
  };
}
