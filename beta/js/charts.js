// 圖表實體與尺度變數
let assetChartInstance = null;
let allocationChartInstance = null; 

// 時間軸產生輔助函數
function generateDailyDates(startDate, endDate) { ... }
function generateWeeklyDates(startDate, endDate) { ... }
function generateMonthlyDates(startDate, endDate) { ... }
function generateYearlyDates(startDate, endDate) { ... }

// 對照基準線狀態記憶機制
function initTargetLinePersistence() { ... }
window.onTargetPercentInput = function(el) { ... }
window.onTargetCheckboxChange = function(el) { ... }

// 核心折線圖與資產比例圖渲染
window.renderChart = function() { ... }
window.renderAllocationCharts = function() { ... }
function renderDoughnutChart(labels, dataVals, activeColors, total) { ... }