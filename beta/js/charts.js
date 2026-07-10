let assetChartInstance = null;
let allocationChartInstance = null; 

// --- 5.1 對照基準線狀態讀取與記憶機制 ---
function initTargetLinePersistence() {
    const showTargetEl = document.getElementById('showTargetLine');
    const percentEl = document.getElementById('targetLinePercent');
    if (showTargetEl && percentEl) {
        const savedShow = localStorage.getItem('stock_v8_show_target');
        const savedPercent = localStorage.getItem('stock_v8_target_percent');
        
        if (savedShow !== null) {
            showTargetEl.checked = savedShow === 'true';
        } else {
            showTargetEl.checked = false; 
        }
        
        if (savedPercent !== null) {
            percentEl.value = savedPercent;
        } else {
            percentEl.value = "50"; 
        }
    }
}

window.onTargetPercentInput = function(el) {
    let val = parseFloat(el.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100) val = 100;
    el.value = val;
    
    localStorage.setItem('stock_v8_target_percent', val);
    
    if (document.getElementById('showTargetLine')?.checked) {
        renderChart();
    }
};

window.onTargetCheckboxChange = function(el) {
    localStorage.setItem('stock_v8_show_target', el.checked);
    renderChart();
};

// --- 6. 核心趨勢折線圖渲染 ---
window.renderChart = function() {
    if (typeof Chart === 'undefined') {
        alert("未偵測到 Chart.js，請確認您的網路連線正常。");
        return;
    }

    const canvas = document.getElementById('assetChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (assetChartInstance) {
        assetChartInstance.destroy();
    }

    const startVal = document.getElementById('chartStartDate').value;
    const endVal = document.getElementById('chartEndDate').value;

    if (!startVal || !endVal) return;

    const startDateObj = new Date(startVal);
    const endDateObj = new Date(endVal);

    if (startDateObj > endDateObj) {
        alert("開始日期不能大於結束日期");
        return;
    }

    let dateTimeline = [];
    if (currentChartScale === 'weekly') {
        dateTimeline = generateWeeklyDates(startDateObj, endDateObj);
    } else if (currentChartScale === 'daily') {
        dateTimeline = generateDailyDates(startDateObj, endDateObj);
    } else if (currentChartScale === 'monthly') {
        dateTimeline = generateMonthlyDates(startDateObj, endDateObj);
    } else if (currentChartScale === 'yearly') {
        dateTimeline = generateYearlyDates(startDateObj, endDateObj);
    }

    const plotData = dateTimeline.map(date => calculateAssetOnSpecificDate(date));

    const labels = plotData.map(d => d.date);
    const totalAssetData = plotData.map(d => d.totalAsset);

    const showTarget = document.getElementById('showTargetLine')?.checked || false;
    const targetPercent = parseFloat(document.getElementById('targetLinePercent')?.value) || 0;

    const datasets = [
        {
            label: '總資產 (現金+持股市值)',
            data: totalAssetData,
            borderColor: '#3B82F6',
            fill: false, 
            tension: 0.03,
            pointRadius: dateTimeline.length > 80 ? 0 : 2
        }
    ];

    if (showTarget) {
        const maxAsset = totalAssetData.length > 0 ? Math.max(...totalAssetData) : 0;
        const targetVal = maxAsset * (targetPercent / 100);
        
        const targetData = totalAssetData.map(() => targetVal);
        
        datasets.push({
            label: `對照基準線 (${targetPercent}% of 區間最大值: NT$ ${Math.round(targetVal).toLocaleString()})`,
            data: targetData,
            borderColor: '#EF4444', 
            borderDash: [5, 5],     
            fill: false,
            tension: 0,            
            pointRadius: 0,        
            borderWidth: 2
        });
    }

    const currentBtn = document.getElementById(`btn-scale-${currentChartScale}`);
    if (currentBtn) {
        document.querySelectorAll('#btn-scale-weekly, #btn-scale-daily, #btn-scale-monthly, #btn-scale-yearly').forEach(btn => {
            btn.className = "px-2.5 py-1 text-gray-600 hover:text-gray-900 rounded";
        });
        currentBtn.className = "px-2.5 py-1 bg-blue-500 text-white font-medium rounded shadow-sm";
    }

    assetChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) { return 'NT$ ' + value.toLocaleString(); }
                    }
                }
            }
        }
    });
}

// --- 6.1 實時資產分配圖表連動 (圓餅圖 + 橫向長條圖) ---
window.renderAllocationCharts = function() {
    let cash = 0;
    const holdings = {};
    
    transactions.forEach(tx => {
        const price = Number(tx.price) || 0;
        const quantity = Number(tx.quantity) || 0;
        const fee = Number(tx.fee) || 0;
        const tax = Number(tx.tax) || 0;

        if (tx.type === 'DEPOSIT') {
            cash += price;
        } else if (tx.type === 'WITHDRAW') {
            cash -= price;
        } else if (tx.type === 'BUY') {
            const totalCost = (price * quantity) + fee;
            cash -= totalCost;
            if (!holdings[tx.symbol]) holdings[tx.symbol] = { qty: 0, totalCost: 0, avgCost: 0 };
            holdings[tx.symbol].qty += quantity;
            holdings[tx.symbol].totalCost += totalCost;
            holdings[tx.symbol].avgCost = holdings[tx.symbol].qty > 0 ? (holdings[tx.symbol].totalCost / holdings[tx.symbol].qty) : 0;
        } else if (tx.type === 'SELL') {
            const totalRevenue = (price * quantity) - fee - tax;
            cash += totalRevenue;
            const hold = holdings[tx.symbol];
            if (hold && hold.qty > 0) {
                hold.qty -= quantity;
                hold.totalCost = hold.qty * (hold.avgCost || 0);
            }
        }
    });

    const labels = [];
    const dataVals = [];
    const backgroundColors = [
        '#3B82F6', 
        '#F59E0B', 
        '#EC4899', 
        '#8B5CF6', 
        '#06B6D4', 
        '#10B981', 
        '#EF4444', 
        '#14B8A6', 
        '#6366F1', 
        '#9CA3AF'  
    ];

    if (cash > 0) {
        labels.push('現金');
        dataVals.push(cash);
    } else if (cash < 0) {
        labels.push('現金');
        dataVals.push(0);
    }

    Object.keys(holdings).forEach(sym => {
        const hold = holdings[sym];
        if (hold.qty > 0) {
            const currentPrice = Number(currentPrices[sym]) || 0;
            const marketVal = hold.qty * currentPrice;
            if (marketVal > 0) {
                labels.push(sym); 
                dataVals.push(marketVal);
            }
        }
    });

    const total = dataVals.reduce((a, b) => a + b, 0);
    if (total === 0) {
        labels.push('EMPTY');
        dataVals.push(1);
    }

    const activeColors = backgroundColors.slice(0, labels.length);

    const legendContainer = document.getElementById('unifiedLegend');
    if (legendContainer) {
        legendContainer.innerHTML = '';
        labels.forEach((label, idx) => {
            const color = activeColors[idx];
            const item = document.createElement('div');
            item.className = "flex items-center gap-1 w-full text-left";
            item.innerHTML = `
                <span class="w-2 h-2 rounded-full inline-block shrink-0" style="background-color: ${color}"></span>
                <span class="text-[9px] md:text-[11px] font-bold text-gray-700 truncate leading-none">${label}</span>
            `;
            legendContainer.appendChild(item);
        });
    }

    renderDoughnutChart(labels, dataVals, activeColors, total);

    const listContainer = document.getElementById('allocationListContainer');
    if (listContainer) {
        listContainer.innerHTML = '';
        labels.forEach((label, idx) => {
            const val = dataVals[idx];
            const pct = total > 0 ? ((val / total) * 100) : 0;
            const color = activeColors[idx];

            const item = document.createElement('div');
            item.className = "flex items-center gap-2.5";

            item.innerHTML = `
                <span class="w-2.5 h-2.5 rounded-full inline-block shrink-0" style="background-color: ${color}"></span>
                
                <div class="w-full bg-gray-200 rounded h-6 relative overflow-hidden border border-gray-300 shadow-sm">
                    <div class="h-full rounded transition-all duration-500" style="width: ${pct.toFixed(1)}%; background-color: ${color}"></div>
                    
                    <div class="absolute inset-0 flex justify-between items-center px-3 pointer-events-none text-white text-xs font-extrabold" style="text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 2px 4px rgba(0,0,0,0.8);">
                                <span>${label}</span>
                                <span>${pct.toFixed(1)}%</span>
                            </div>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
            }
        }

        function renderDoughnutChart(labels, dataVals, activeColors, total) {
            const canvas = document.getElementById('allocationChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            if (allocationChartInstance) {
                allocationChartInstance.destroy();
            }

            allocationChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataVals,
                        backgroundColor: activeColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }, 
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw || 0;
                                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    const code = context.label;
                                    const nameText = stockNames[code] ? ` (${stockNames[code]})` : '';
                                    return ` ${code}${nameText}: NT$ ${value.toLocaleString()} (${pct}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }