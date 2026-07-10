// Yahoo Finance 多重代理伺服器備援查詢機制
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

// 連動 TradingView 更新 + Yahoo 財經 API 雙備援連線機制
window.fetchTwsePrices = async function() {
    // ... 將原 fetchTwsePrices 函數的全部內容剪下貼到這裡 ...
};