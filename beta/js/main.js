const txForm = document.getElementById('txForm');
const histForm = document.getElementById('histForm');
const txHistoryTable = document.getElementById('txHistoryTable');
const holdingsTable = document.getElementById('holdingsTable');

// 介面欄位安全切換與摺疊選單控制
function toggleFormFields() { ... }
window.toggleTxForm = function() { ... }
window.toggleHistForm = function() { ... }
window.openExcelHelpModal = function() { ... }
window.closeExcelHelpModal = function() { ... }

// 交易資料處理
function saveData() { ... }
function calculateAndRender() { ... }
function renderHistory() { ... }
window.deleteTx = function(id) { ... }
window.updateCurrentPrice = function(symbol, value) { ... }

// 主渲染函數
function render() {
    renderHistory();
    calculateAndRender();
}

// 重設與頁面初始化啟動
window.clearAllData = function() { ... }
toggleFormFields();
initDefaultHistoryRange(currentHistoryScale); 
initTargetLinePersistence();
render();