exports.handler = async function(event) {
  try {
    const symbolsParam = event.queryStringParameters?.symbols || "";

    const symbols = symbolsParam
      .split(",")
      .map(s => String(s).trim().toUpperCase())
      .filter(Boolean);

    if (!symbols.length) {
      return jsonResponse(400, {
        ok: false,
        message: "請提供股票代號，例如 ?symbols=2330,0050,00981A"
      });
    }

    const token = process.env.FINMIND_TOKEN;

    const params = new URLSearchParams({
      dataset: "TaiwanStockInfo"
    });

    if (token) {
      params.set("token", token);
    }

    const url = `https://api.finmindtrade.com/api/v4/data?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      return jsonResponse(res.status, {
        ok: false,
        message: `FinMind TaiwanStockInfo API 錯誤：HTTP ${res.status}`
      });
    }

    const json = await res.json();
    const rows = Array.isArray(json.data) ? json.data : [];

    const symbolSet = new Set(symbols);

    const data = {};
    const list = [];

    rows.forEach(row => {
      const stockId = String(row.stock_id || "").toUpperCase();

      if (!symbolSet.has(stockId)) return;

      const item = {
        symbol: stockId,
        name: row.stock_name || "",
        stockName: row.stock_name || "",
        stock_name: row.stock_name || "",
        industryCategory: row.industry_category || "",
        industry_category: row.industry_category || "",
        type: row.type || "",
        date: row.date || ""
      };

      data[stockId] = item;
      list.push(item);
    });

    const missing = symbols.filter(sym => !data[sym]);

    return jsonResponse(200, {
      ok: true,
      source: "FinMind",
      requested: symbols,
      count: list.length,
      missing,
      data,
      list
    });

  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error.message
    });
  }
};

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
