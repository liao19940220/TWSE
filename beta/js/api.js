// --- 1.2 Yahoo Finance 多重代理伺服器備援查詢機制 (含 2.5 秒安全逾時控制) ---
async function fetchSingleYahooPrice(symbol) {
    const suffixes = ['.TW', '.TWO'];
    
    const proxies = [
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];

    for (const suffix of suffixes) {
        const target = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}`;
        
        for (const getProxyUrl of proxies) {
            const proxyUrl = getProxyUrl(target);
            try {
                const res = await fetchWithTimeout(proxyUrl, { timeout: 2500 });
                if (!res.ok) continue;
                const json = await res.json();
                const meta = json?.chart?.result?.[0]?.meta;
                const price = meta?.regularMarketPrice;
                if (price && typeof price === 'number' && price > 0) {
                    return price; 
                }
            } catch (e) {
                console.warn(`Proxy failed for ${symbol}${suffix} via Yahoo:`, e);
            }
        }
    }
    return null;
}

// --- 2. 【連動 TradingView 更新 + Yahoo 財經 API 雙備援連線機制】 ---
window.fetchTwsePrices = async function() {
    const btn = document.getElementById('fetchPriceBtn');
    const status = document.getElementById('apiStatus');
    if (!btn || !status) return;

    const activeSymbols = getActiveSymbols();
    if (activeSymbols.length === 0) {
        status.innerText = "目前庫存無持股";
        return;
    }

    btn.disabled = true;
    btn.innerText = "連線中...";
    status.innerText = "連線 TradingView 下載最新數據...";

    const today = new Date().toISOString().split('T')[0];
    if (!historicalPrices[today]) {
        historicalPrices[today] = {};
    }

    const symbolQueries = [];
    for (let i = 0; i < activeSymbols.length; i++) {
        const sym = activeSymbols[i];
        symbolQueries.push("TWSE:" + sym);
        symbolQueries.push("TPEX:" + sym); 
    }

    const targetUrl = "https://scanner.tradingview.com/taiwan/scan";
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);

    const payload = {
        symbols: {
            tickers: symbolQueries
        },
        columns: ["name", "description", "close"] 
    };

    const tryUrls = [
        targetUrl, 
        proxyUrl   
    ];

    const tvUpdatedSymbols = new Set();
    let successFetch = false;

    for (let k = 0; k < tryUrls.length; k++) {
        if (successFetch) break;
        try {
            const response = await fetchWithTimeout(tryUrls[k], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                timeout: 3500
            });
            
            if (!response.ok) continue;

            const data = await response.json();
            
            if (data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    if (!item || !Array.isArray(item.d)) return;

                    const sParts = (item.s || '').split(':');
                    const symCode = sParts[1];
                    if (!symCode) return;

                    const priceVal = parseFloat(item.d[2]);
                    if (!isNaN(priceVal) && priceVal > 0) {
                        currentPrices[symCode] = priceVal;
                        historicalPrices[today][symCode] = priceVal; 
                        tvUpdatedSymbols.add(symCode);
                    }
                });

                successFetch = true;
            }
        } catch (err) {
            console.warn("TradingView 連線方案未成功，切換下一重試");
        }
    }

    const missingSymbols = activeSymbols.filter(sym => !tvUpdatedSymbols.has(sym));
    let yahooUpdatedCount = 0;

    if (missingSymbols.length > 0) {
        status.innerText = `TradingView 已更新 ${tvUpdatedSymbols.size} 檔，正在連線 Yahoo 財經補齊其餘 ${missingSymbols.length} 檔...`;
        
        const yahooPromises = missingSymbols.map(async (sym) => {
            const price = await fetchSingleYahooPrice(sym);
            if (price !== null) {
                currentPrices[sym] = price;
                historicalPrices[today][sym] = price;
                yahooUpdatedCount++;
            }
        });

        await Promise.all(yahooPromises);
    }

    localStorage.setItem('stock_v6_prices', JSON.stringify(currentPrices));
    localStorage.setItem('stock_v7_historical_prices', JSON.stringify(historicalPrices));

    calculateAndRender();

    const now = new Date();
    const totalUpdated = tvUpdatedSymbols.size + yahooUpdatedCount;
    status.innerText = `成功同步 ${totalUpdated} 檔收盤價 (${now.toLocaleTimeString()})`;
    btn.disabled = false;
    btn.innerText = "更新今日收盤價";
};