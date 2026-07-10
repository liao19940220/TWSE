const txForm = document.getElementById('txForm');
const histForm = document.getElementById('histForm');
const txHistoryTable = document.getElementById('txHistoryTable');
const holdingsTable = document.getElementById('holdingsTable');

// 時間軸產生輔助函數
function generateDailyDates(startDate, endDate) {
    const dates = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
}

function generateWeeklyDates(startDate, endDate) {
    const dates = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
        const day = curr.getDay(); 
        if (day === 5) { 
            dates.push(curr.toISOString().split('T')[0]);
        }
        curr.setDate(curr.getDate() + 1);
    }
    const endStr = end.toISOString().split('T')[0];
    if (dates.indexOf(endStr) === -1) {
        dates.push(endStr);
    }
    return [...new Set(dates)].sort();
}

function generateMonthlyDates(startDate, endDate) {
    const dates = [];
    let curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate);
    while (curr <= end) {
        const lastDay = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);
        if (lastDay >= startDate && lastDay <= end) {
            dates.push(lastDay.toISOString().split('T')[0]);
        }
        curr.setMonth(curr.getMonth() + 1);
    }
    const endStr = end.toISOString().split('T')[0];
    if (dates.indexOf(endStr) === -1) {
        dates.push(endStr);
    }
    return [...new Set(dates)].sort();
}

// 年時間軸產生函數
function generateYearlyDates(startDate, endDate) {
    const dates = [];
    let curr = new Date(startDate.getFullYear(), 0, 1);
    const end = new Date(endDate);
    while (curr <= end) {
        const yearKey = curr.getFullYear();
        const lastDayOfYear = yearKey + "-12-31";
        if (new Date(lastDayOfYear) <= end) {
            dates.push(lastDayOfYear);
        }
        curr.setFullYear(curr.getFullYear() + 1);
    }
    const endStr = end.toISOString().split('T')[0];
    if (dates.indexOf(endStr) === -1) {
        dates.push(endStr);
    }
    return [...new Set(dates)].sort();
}

// 全域核心 Render 宣告 (解決未定義 ReferenceError 錯誤)
function render() {
    renderHistory();
    calculateAndRender();
}

// 重設
window.clearAllData = function() {
    if (confirm("確定要重設所有資料嗎？這將刪除所有交易紀錄且無法復原！")) {
        localStorage.clear();
        transactions = [];
        currentPrices = {};
        stockNames = { ...defaultNames };
        historicalPrices = {};
        render();
        alert("資料已全部重設。");
    }
};

// --- 5.2 交易明細與功能邏輯處理群組 ---

// 歷史明細時間軸區間核心計算
function initDefaultHistoryRange(scale) {
    const today = new Date();
    let start = new Date();

    if (scale === 'daily') {
        start.setDate(today.getDate() - 5);  
    } else if (scale === 'weekly') {
        start.setDate(today.getDate() - 28); 
    } else if (scale === 'monthly') {
        start.setMonth(today.getMonth() - 6); 
    } else if (scale === 'yearly') {
        start.setFullYear(today.getFullYear() - 3); 
    }

    const startStr = start.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const histStartEl = document.getElementById('historyStartDate');
    const histEndEl = document.getElementById('historyEndDate');

    if (histStartEl && histEndEl) {
        histStartEl.value = startStr;
        histEndEl.value = todayStr;
        histStartEl.max = todayStr;
        histEndEl.max = todayStr;
    }
}

window.changeHistoryScale = function(scale, btnElement) {
    currentHistoryScale = scale;
    
    document.querySelectorAll('#btn-hist-daily, #btn-hist-weekly, #btn-hist-monthly, #btn-hist-yearly').forEach(btn => {
        btn.className = "px-2.5 py-1 text-gray-600 hover:text-gray-900 rounded";
    });
    if (btnElement) {
        btnElement.className = "px-2.5 py-1 bg-blue-500 text-white font-medium rounded shadow-sm";
    }

    initDefaultHistoryRange(scale);
    renderHistory();
};

window.resetHistoryRange = function() {
    currentHistoryScale = 'daily';
    initDefaultHistoryRange('daily');
    
    if (document.getElementById('historySearch')) {
        document.getElementById('historySearch').value = '';
    }

    const currentBtn = document.getElementById('btn-hist-daily');
    if (currentBtn) {
        document.querySelectorAll('#btn-hist-daily, #btn-hist-weekly, #btn-hist-monthly, #btn-hist-yearly').forEach(btn => {
            btn.className = "px-2.5 py-1 text-gray-600 hover:text-gray-900 rounded";
        });
        currentBtn.className = "px-2.5 py-1 bg-blue-500 text-white font-medium rounded shadow-sm";
    }

    renderHistory();
};

// --- 首次啟動與背景執行配置 ---
toggleFormFields();
initDefaultHistoryRange(currentHistoryScale); 
initTargetLinePersistence(); // 在最開始載入本地記憶快取
render();