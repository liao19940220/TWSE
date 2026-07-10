// --- 7. EXCEL 匯出備份 (使用 SheetJS 活頁簿格式) ---
window.exportData = function() {
    try {
        if (typeof XLSX === 'undefined') {
            alert("Excel 處理函式庫載入失敗，請確認您的網路連線。");
            return;
        }

        const wb = XLSX.utils.book_new();

        // Sheet 1: 交易紀錄
        const txData = transactions.map(tx => ({
            "ID": tx.id || "",
            "日期": tx.date || "",
            "類型": tx.type || "",
            "股票代號": tx.symbol || "",
            "單價_金額": Number(tx.price) || 0,
            "數量": Number(tx.quantity) || 0,
            "手續費": Number(tx.fee) || 0,
            "交易稅": Number(tx.tax) || 0
        }));
        const wsTx = XLSX.utils.json_to_sheet(txData);
        XLSX.utils.book_append_sheet(wb, wsTx, "交易紀錄");

        // Sheet 2: 目前市價
        const priceData = Object.keys(currentPrices).map(sym => ({
            "股票代號": sym,
            "目前市價": Number(currentPrices[sym]) || 0
        }));
        const wsPrice = XLSX.utils.json_to_sheet(priceData);
        XLSX.utils.book_append_sheet(wb, wsPrice, "目前市價");

        // Sheet 3: 自訂中文名稱
        const nameData = Object.keys(stockNames).map(sym => ({
            "股票代號": sym,
            "中文名稱": stockNames[sym] || ""
        }));
        const wsName = XLSX.utils.json_to_sheet(nameData);
        XLSX.utils.book_append_sheet(wb, wsName, "自訂中文名稱");

        // Sheet 4: 歷史收盤價庫
        const histData = [];
        Object.keys(historicalPrices).forEach(date => {
            Object.keys(historicalPrices[date]).forEach(sym => {
                histData.push({
                    "日期": date,
                    "股票代號": sym,
                    "收盤價": Number(historicalPrices[date][sym]) || 0
                });
            });
        });
        const wsHist = XLSX.utils.json_to_sheet(histData);
        XLSX.utils.book_append_sheet(wb, wsHist, "歷史收盤價庫");

        const filename = "stock_backup_" + new Date().toISOString().split('T')[0] + ".xlsx";
        XLSX.writeFile(wb, filename);

    } catch (err) {
        alert("匯出 Excel 備份失敗：" + err.message);
    }
};

// --- 7.1 EXCEL 匯入備份 ---
window.importData = function(event) {
    try {
        if (typeof XLSX === 'undefined') {
            alert("Excel 處理函式庫載入失敗，請確認您的網路連線。");
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const wsTx = workbook.Sheets["交易紀錄"];
                if (!wsTx) {
                    alert("匯入失敗：Excel 檔案結構不符，找不到「交易紀錄」工作表。");
                    return;
                }

                const rawTx = XLSX.utils.sheet_to_json(wsTx);
                const importedTx = rawTx.map(row => ({
                    id: String(row["ID"] || row["id"] || Date.now().toString() + Math.random()),
                    date: String(row["日期"] || row["date"] || ""),
                    type: String(row["類型"] || row["type"] || ""),
                    symbol: String(row["股票代號"] || row["symbol"] || ""),
                    price: parseFloat(row["單價_金額"] || row["price"]) || 0,
                    quantity: parseInt(row["數量"] || row["quantity"]) || 0,
                    fee: parseFloat(row["手續費"] || row["fee"]) || 0,
                    tax: parseFloat(row["交易稅"] || row["tax"]) || 0
                }));

                const wsPrice = workbook.Sheets["目前市價"];
                const importedCurrentPrices = {};
                if (wsPrice) {
                    const rawPrice = XLSX.utils.sheet_to_json(wsPrice);
                    rawPrice.forEach(row => {
                        const sym = String(row["股票代號"] || row["symbol"] || "").trim();
                        const price = parseFloat(row["目前市價"] || row["price"]) || 0;
                        if (sym) importedCurrentPrices[sym] = price;
                    });
                }

                const wsName = workbook.Sheets["自訂中文名稱"];
                const importedStockNames = {};
                if (wsName) {
                    const rawName = XLSX.utils.sheet_to_json(wsName);
                    rawName.forEach(row => {
                        const sym = String(row["股票代號"] || row["symbol"] || "").trim();
                        const name = String(row["中文名稱"] || row["name"] || "").trim();
                        if (sym) importedStockNames[sym] = name;
                    });
                }

                const wsHist = workbook.Sheets["歷史收盤價庫"];
                const importedHistoricalPrices = {};
                if (wsHist) {
                    const rawHist = XLSX.utils.sheet_to_json(wsHist);
                    rawHist.forEach(row => {
                        const date = String(row["日期"] || row["date"] || "").trim();
                        const sym = String(row["股票代號"] || row["symbol"] || "").trim();
                        const price = parseFloat(row["收盤價"] || row["price"]) || 0;
                        if (date && sym) {
                            if (!importedHistoricalPrices[date]) {
                                importedHistoricalPrices[date] = {};
                            }
                            importedHistoricalPrices[date][sym] = price;
                        }
                    });
                }

                transactions = importedTx.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                currentPrices = importedCurrentPrices;
                stockNames = { ...defaultNames, ...importedStockNames };
                historicalPrices = importedHistoricalPrices;

                localStorage.setItem('stock_v6_tx', JSON.stringify(transactions));
                localStorage.setItem('stock_v6_prices', JSON.stringify(currentPrices));
                localStorage.setItem('stock_v6_names', JSON.stringify(stockNames));
                localStorage.setItem('stock_v7_historical_prices', JSON.stringify(historicalPrices));

                render();
                alert("Excel 備份資料匯入成功！");
                event.target.value = ""; 

            } catch (err) {
                alert("讀取 Excel 內容時發生錯誤：" + err.message);
            }
        };
        reader.readAsArrayBuffer(file);

    } catch (err) {
        alert("匯入 Excel 失敗：" + err.message);
    }
};