/**
 * Data Manager
 * Handles file parsing (XLSX, CSV) and data processing.
 */

const DataManager = {

    async processDictionary(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                rows.forEach(row => {
                    if (row.length >= 2 && row[0] && row[1]) {
                        AppState.translationMap[Utils.normalizeKey(row[0])] = String(row[1]).trim();
                    }
                });
                resolve();
            };
            reader.readAsArrayBuffer(file);
        });
    },

    async processUlkelerXlsx(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                rows.forEach(row => {
                    // Beklenen yapı:
                    // A: Ülke adı
                    // F: Kıta
                    // G: Harita renklendirme değeri (mevcut kullanım)
                    if (row.length > 6 && row[0]) {
                        const countryName = String(row[0]);
                        const continent = row[5] ? String(row[5]).trim() : null; // F sütunu: Kıta
                        const mapValue = parseFloat(row[6]); // G sütunu: harita için renk değeri

                        const normName = Utils.normalizeKey(countryName);
                        if (!AppState.globalData[normName]) {
                            AppState.globalData[normName] = { displayName: countryName };
                        }

                        // Harita renklendirme değeri (mevcut davranış)
                        if (!isNaN(mapValue)) {
                            AppState.globalData[normName].colorValue = mapValue;
                        }

                        // Kıta bilgisi
                        if (continent) {
                            AppState.globalData[normName].continent = continent;
                        }
                    }
                });
                resolve();
            };
            reader.readAsArrayBuffer(file);
        });
    },

    async processDetailsCSV(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                complete: (results) => {
                    results.data.forEach(row => {
                        const countryKey = Object.keys(row).find(k => /country|ulke|name|ülke/i.test(k));
                        if (countryKey && row[countryKey]) {
                            const normName = Utils.normalizeKey(row[countryKey]);
                            if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: row[countryKey] };
                            AppState.globalData[normName].details = row;
                        }
                    });
                    resolve();
                }
            });
        });
    },

    async processVerilerXlsx(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                let year = '2023';
                if (file.name.includes('2021')) year = '2021';
                else if (file.name.includes('2022')) year = '2022';
                else if (file.name.includes('2024')) year = '2024';

                const headers = rows[0];
                if (AppState.orderedHeaders.length === 0) {
                    AppState.orderedHeaders = headers.filter(h => h && !/country|ulke|name|ülke/i.test(h));
                }

                // Z sütunu: satır içinde son sütun (A: ülke, B–Z: veriler)
                const zIndex = headers.length - 1;

                rows.slice(1).forEach(row => {
                    if (row.length > 0 && row[0]) {
                        const countryName = String(row[0]);
                        const normName = Utils.normalizeKey(countryName);
                        if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };
                        if (!AppState.globalData[normName].veriler) AppState.globalData[normName].veriler = {};

                        const yearData = {};
                        headers.forEach((header, idx) => {
                            if (header && row[idx] !== undefined) yearData[header] = row[idx];
                        });
                        AppState.globalData[normName].veriler[year] = yearData;

                        // Büyük Resim + Trend için Z sütunu toplamını topla
                        if (zIndex > 0 && row[zIndex] != null) {
                            const val = parseFloat(row[zIndex]);
                            if (!isNaN(val)) {
                                if (!AppState.globalYearTotals[year]) AppState.globalYearTotals[year] = 0;
                                AppState.globalYearTotals[year] += val;
                            }
                        }
                    }
                });
                resolve();
            };
            reader.readAsArrayBuffer(file);
        });
    },

    async processOzetXlsx(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                let year = '2023';
                if (file.name.includes('21')) year = '2021';
                else if (file.name.includes('22')) year = '2022';
                else if (file.name.includes('24')) year = '2024';

                rows.forEach(row => {
                    if (row.length > 1 && row[0]) {
                        const countryName = String(row[0]);
                        const normName = Utils.normalizeKey(countryName);
                        if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };
                        if (!AppState.globalData[normName].ozet) AppState.globalData[normName].ozet = {};
                        AppState.globalData[normName].ozet[year] = row.slice(1, 7).filter(x => x);
                    }
                });
                resolve();
            };
            reader.readAsArrayBuffer(file);
        });
    },

    async processPOzetXlsx(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                let year = '2023';
                if (file.name.includes('21')) year = '2021';
                else if (file.name.includes('22')) year = '2022';
                else if (file.name.includes('24')) year = '2024';

                rows.forEach(row => {
                    if (row.length > 1 && row[0]) {
                        const countryName = String(row[0]);
                        const normName = Utils.normalizeKey(countryName);
                        if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };
                        if (!AppState.globalData[normName].pozet) AppState.globalData[normName].pozet = {};
                        AppState.globalData[normName].pozet[year] = row.slice(1, 3).filter(x => x);
                    }
                });
                resolve();
            };
            reader.readAsArrayBuffer(file);
        });
    },

    async processImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target.result;
                const countryName = file.name.split('.')[0].replace(/_/g, ' ');
                const normName = Utils.normalizeKey(countryName);

                if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };

                if (file.webkitRelativePath.includes('flags') || file.name.toLowerCase().includes('flag')) {
                    AppState.globalData[normName].flag = url;
                } else if (file.webkitRelativePath.includes('photos') || file.name.toLowerCase().includes('photo')) {
                    AppState.globalData[normName].photo = url;
                }
                resolve();
            };
            reader.readAsDataURL(file);
        });
    },

    async processExcelFromData(data, fileName) {
        const fn = fileName.toLowerCase();
        if (fn === 'ulkeler.xlsx') {
            return this._processUlkelerInternal(data);
        } else if (fn.includes('veriler_')) {
            return this._processVerilerInternal(data, fileName);
        } else if (fn.includes('özet') && !fn.includes('pö')) {
            return this._processOzetInternal(data, fileName);
        } else if (fn.includes('pözet') || fn.includes('pozet')) {
            return this._processPOzetInternal(data, fileName);
        } else if (fn.includes('sözlük') || fn.includes('sozluk')) {
            return this._processDictionaryInternal(data);
        }
    },

    async processCSVFromText(text, fileName) {
        if (fileName.toLowerCase() === 'ulke_detaylari.csv') {
            return new Promise((resolve) => {
                Papa.parse(text, {
                    header: true,
                    complete: (results) => {
                        results.data.forEach(row => {
                            const countryKey = Object.keys(row).find(k => /country|ulke|name|ülke/i.test(k));
                            if (countryKey && row[countryKey]) {
                                const normName = Utils.normalizeKey(row[countryKey]);
                                if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: row[countryKey] };
                                AppState.globalData[normName].details = row;
                            }
                        });
                        resolve();
                    }
                });
            });
        }
    },

    // --- Internal Helpers (Ham veri işleyen alt fonksiyonlar) ---

    _processDictionaryInternal(data) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        rows.forEach(row => {
            if (row.length >= 2 && row[0] && row[1]) {
                AppState.translationMap[Utils.normalizeKey(row[0])] = String(row[1]).trim();
            }
        });
    },

    _processUlkelerInternal(data) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        rows.forEach(row => {
            if (row.length > 6 && row[0]) {
                const countryName = String(row[0]);
                const continent = row[5] ? String(row[5]).trim() : null;
                const mapValue = parseFloat(row[6]);
                const normName = Utils.normalizeKey(countryName);
                if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };
                if (!isNaN(mapValue)) AppState.globalData[normName].colorValue = mapValue;
                if (continent) AppState.globalData[normName].continent = continent;
            }
        });
    },

    _processVerilerInternal(data, fileName) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let year = '2023';
        if (fileName.includes('2021')) year = '2021';
        else if (fileName.includes('2022')) year = '2022';
        else if (fileName.includes('2024')) year = '2024';

        const headers = rows[0];
        if (AppState.orderedHeaders.length === 0) {
            AppState.orderedHeaders = headers.filter(h => h && !/country|ulke|name|ülke/i.test(h));
        }

        const zIndex = headers.length - 1;
        rows.slice(1).forEach(row => {
            if (row.length > 0 && row[0]) {
                const countryName = String(row[0]);
                const normName = Utils.normalizeKey(countryName);
                if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };
                if (!AppState.globalData[normName].veriler) AppState.globalData[normName].veriler = {};
                const yearData = {};
                headers.forEach((header, idx) => {
                    if (header && row[idx] !== undefined) yearData[header] = row[idx];
                });
                AppState.globalData[normName].veriler[year] = yearData;
                if (zIndex > 0 && row[zIndex] != null) {
                    const val = parseFloat(row[zIndex]);
                    if (!isNaN(val)) {
                        if (!AppState.globalYearTotals[year]) AppState.globalYearTotals[year] = 0;
                        AppState.globalYearTotals[year] += val;
                    }
                }
            }
        });
    },

    _processOzetInternal(data, fileName) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let year = '2023';
        if (fileName.includes('21')) year = '2021';
        else if (fileName.includes('22')) year = '2022';
        else if (fileName.includes('24')) year = '2024';

        rows.forEach(row => {
            if (row.length > 1 && row[0]) {
                const countryName = String(row[0]);
                const normName = Utils.normalizeKey(countryName);
                if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };
                if (!AppState.globalData[normName].ozet) AppState.globalData[normName].ozet = {};
                AppState.globalData[normName].ozet[year] = row.slice(1, 7).filter(x => x);
            }
        });
    },

    _processPOzetInternal(data, fileName) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let year = '2023';
        if (fileName.includes('21')) year = '2021';
        else if (fileName.includes('22')) year = '2022';
        else if (fileName.includes('24')) year = '2024';

        rows.forEach(row => {
            if (row.length > 1 && row[0]) {
                const countryName = String(row[0]);
                const normName = Utils.normalizeKey(countryName);
                if (!AppState.globalData[normName]) AppState.globalData[normName] = { displayName: countryName };
                if (!AppState.globalData[normName].pozet) AppState.globalData[normName].pozet = {};
                AppState.globalData[normName].pozet[year] = row.slice(1, 3).filter(x => x);
            }
        });
    },

    calculateColorScale() {
        let min = Infinity; let max = -Infinity;
        Object.values(AppState.globalData).forEach(country => {
            if (country.colorValue !== undefined) {
                if (country.colorValue < min) min = country.colorValue;
                if (country.colorValue > max) max = country.colorValue;
            }
        });
        AppState.colorScale = { min: min === Infinity ? 0 : min, max };
    }
};

console.log('💾 Data Manager loaded');
