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

    const token = process.env.FINMIND_TOKEN;

    /*
      1. 查每日股價
    */
    const priceParams = new URLSearchParams({
      dataset: "TaiwanStockPrice",
      data_id: symbol,
      start_date: startDate
    });

    if (token) {
      priceParams.set("token", token);
    }

    const priceUrl = `https://api.finmindtrade.com/api/v4/data?${priceParams.toString()}`;

    const priceRes = await fetch(priceUrl, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!priceRes.ok) {
      return jsonResponse(priceRes.status, {
        ok: false,
        message: `FinMind API 錯誤：HTTP ${priceRes.status}`
      });
    }

    const priceJson = await priceRes.json();
    const rows = Array.isArray(priceJson.data) ? priceJson.data : [];

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

    /*
      2. 查股票中文名稱
      FinMind TaiwanStockInfo 通常可取得：
      stock_id, stock_name, type, industry_category
    */
    let name = "";
    let stockInfo = null;

    try {
      stockInfo = await fetchStockInfo(symbol, token);

      if (stockInfo) {
        name =
          stockInfo.stock_name ||
          stockInfo.name ||
          "";
      }
    } catch (nameError) {
      console.warn(`取得 ${symbol} 股票名稱失敗：`, nameError.message);
    }

    return jsonResponse(200, {
      ok: true,
      source: "FinMind",
      symbol,
      name,
      stockName: name,
      stock_name: name,
      stockInfo,
      startDate,
      latest: latest
        ? {
            ...latest,
            name,
            stockName: name,
            stock_name: name
          }
        : null,
      data
    });

  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      message: error.message
    });
  }
};

async function fetchStockInfo(symbol, token) {
  const infoParams = new URLSearchParams({
    dataset: "TaiwanStockInfo"
  });

  if (token) {
    infoParams.set("token", token);
  }

  const infoUrl = `https://api.finmindtrade.com/api/v4/data?${infoParams.toString()}`;

  const infoRes = await fetch(infoUrl, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!infoRes.ok) {
    throw new Error(`FinMind TaiwanStockInfo API 錯誤：HTTP ${infoRes.status}`);
  }

  const infoJson = await infoRes.json();
  const rows = Array.isArray(infoJson.data) ? infoJson.data : [];

  return rows.find(row => String(row.stock_id).toUpperCase() === String(symbol).toUpperCase()) || null;
}

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
