// 全域偵錯與安全逾時定義
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 3000 } = options; 
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

// 資料載入與防衝突初始化
let transactions = [];
let currentPrices = {};
let stockNames = {}; 
let historicalPrices = {}; 

const defaultNames = {
    "2330": "台積電",
    "2317": "鴻海",
    "2454": "聯發科",
    "2308": "台達電",
    "2881": "富邦金",
    "2882": "國泰金",
    "0050": "元大台灣50",
    "0056": "元大高股息",
    "00878": "國泰永續高股息",
    "6488": "環球晶"
};

// 初始化 LocalStorage 讀取
function initLocalStorage() {
    try {
        transactions = JSON.parse(localStorage.getItem('stock_v6_tx')) || [];
        currentPrices = JSON.parse(localStorage.getItem('stock_v6_prices')) || {};
        const savedNames = JSON.parse(localStorage.getItem('stock_v6_names')) || {};
        stockNames = { ...defaultNames, ...savedNames };
        historicalPrices = JSON.parse(localStorage.getItem('stock_v7_historical_prices')) || {};
    } catch (e) {
        console.error("讀取本地儲存失敗，已重新初始化", e);
        stockNames = { ...defaultNames };
        historicalPrices = {};
    }
}
initLocalStorage();