exports.handler = async function(event) {
  try {
    const symbol = event.queryStringParameters?.symbol;
    const startDate = event.queryStringParameters?.start_date || getDefaultStartDate();

    if (!symbol) {
      return jsonResponse(400, {
        ok: false,
        message: "請提供股票代號，例如 ?symbol=2330"
      });
    }

    const params = new URLSearchParams({
      dataset: "TaiwanStockPrice",
      data_id: symbol,
      start_date: startDate
    });

    const token = process.env.FINMIND_TOKEN;

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
        message: `FinMind API 錯誤：HTTP ${res.status}`
      });
    }

    const json = await res.json();
    const rows = Array.isArray(json.data) ? json.data : [];

    const data = rows.map(row => ({
      date: row.date,
      symbol: row.stock_id,
      open: Number(row.open),
      high: Number(row.max),
      low: Number(row.min),
      close: Number(row.close),
      volume: Number(row.Trading_Volume),
      turnover: Number(row.Trading_turnover),
      spread: Number(row.spread)
    }));

    const latest = data.length > 0 ? data[data.length - 1] : null;

    return jsonResponse(200, {
      ok: true,
      source: "FinMind",
      symbol,
      startDate,
      latest,
      data
    });

  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error.message
    });
  }
};

function getDefaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - 60);
  return d.toISOString().slice(0, 10);
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
