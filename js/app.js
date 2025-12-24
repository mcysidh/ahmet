// Helper functions
function normalizeKey(str) {
    return Utils.normalizeKey(str);
}

// ... getRedScaleColor stays ...

async function processFolder(files) {

    // Loading UI'ı göster
    const loadingContainer = document.getElementById('loading-container');
    const statusEl = document.getElementById('upload-status');
    const progressBar = document.getElementById('progress-bar');
    const percentage = document.getElementById('upload-percentage');
    const uploadBtn = document.getElementById('upload-btn');

    // Butonu gizle, loading göster
    uploadBtn.style.display = 'none';
    loadingContainer.style.display = 'block';

    let progress = 0;
    const updateProgress = (step, text) => {
        progress = step;
        progressBar.style.width = progress + '%';
        percentage.textContent = progress + '%';
        statusEl.textContent = text;
    };

    updateProgress(5, 'SİSTEM BAŞLATILIYOR...');

    const geoJsonFile = files.find(f => f.name.toLowerCase() === 'countries.geo.json');

    if (geoJsonFile) {
        const text = await geoJsonFile.text();
        AppState.geoJsonData = JSON.parse(text);
        updateProgress(15, 'HARİTA VERİSİ YÜKLENDİ...');
    }

    const dictFile = files.find(f => f.name.includes('sözlük') || f.name.includes('sozluk'));
    if (dictFile) {
        updateProgress(25, 'SÖZLÜK YÜKLENİYOR...');
        await DataManager.processDictionary(dictFile);
        updateProgress(35, 'SÖZLÜK YÜKLENDİ...');
    }

    const sortedFiles = files.sort((a, b) => {
        if (a.name.includes('veriler') && !b.name.includes('veriler')) return -1;
        if (!a.name.includes('veriler') && b.name.includes('veriler')) return 1;
        return 0;
    });

    updateProgress(45, 'VERİLER İŞLENİYOR...');

    let fileCount = 0;
    const totalFiles = sortedFiles.filter(f => {
        const fn = f.name.toLowerCase();
        return fn === 'ulkeler.xlsx' || fn === 'ulke_detaylari.csv' ||
            fn.includes('veriler') || fn.includes('kritik') || fn.includes('pozitif');
    }).length;

    for (const file of sortedFiles) {
        const fileName = file.name.toLowerCase();

        if (fileName === 'ulkeler.xlsx') {
            await DataManager.processUlkelerXlsx(file);
            fileCount++;
            updateProgress(45 + Math.floor((fileCount / totalFiles) * 35), `${fileName} yüklendi...`);
        }
        else if (fileName === 'ulke_detaylari.csv') {
            await DataManager.processDetailsCSV(file);
            fileCount++;
            updateProgress(45 + Math.floor((fileCount / totalFiles) * 35), `${fileName} yüklendi...`);
        }
        else if (fileName.includes('veriler_') && fileName.endsWith('.xlsx')) {
            await DataManager.processVerilerXlsx(file);
            fileCount++;
            updateProgress(45 + Math.floor((fileCount / totalFiles) * 35), `${fileName.split('_')[0]} yüklendi...`);
        }
        else if (fileName.includes('özet') && fileName.endsWith('.xlsx') && !fileName.includes('pö')) {
            await DataManager.processOzetXlsx(file);
            fileCount++;
            updateProgress(45 + Math.floor((fileCount / totalFiles) * 35), 'Kritik olaylar yüklendi...');
        }
        else if ((fileName.includes('pö') || fileName.includes('po')) && fileName.includes('zet') && fileName.endsWith('.xlsx')) {
            await DataManager.processPOzetXlsx(file);
            fileCount++;
            updateProgress(45 + Math.floor((fileCount / totalFiles) * 35), 'Pozitif gelişmeler yüklendi...');
        }
        else if (fileName.match(/\.(jpg|jpeg|png|svg)$/)) {
            await DataManager.processImage(file);
        }
    }

    updateProgress(85, 'RENKLER HESAPLANIYOR...');
    DataManager.calculateColorScale();

    updateProgress(95, 'ARAYÜZ OLUŞTURULUYOR...');
    MapManager.init();

    updateProgress(100, '✓ TAMAMLANDI!');
    setTimeout(() => {
        document.getElementById('upload-overlay').style.display = 'none';
        // Success notification
        UIManager.showSuccess('Veriler yüklendi', 'Harita kullanıma hazır. Bir ülkeye tıklayarak detayları görün.');

        // Initialize search & compare systems AFTER everything is ready
        setTimeout(() => {
            try {
                initializeSearchSystem();
                // Compare system initialized in MapManager.init()
            } catch (error) {
                console.error('❌ System initialization error:', error);
            }
        }, 500);
    }, 800);
}

// ...






document.addEventListener('DOMContentLoaded', () => {
    setupUploadHandlers();
    setupEventListeners(); // Add the new listener setup
    loadTheme();
});



function setupUploadHandlers() {
    const uploadBtn = document.getElementById('upload-btn');
    const passwordModal = document.getElementById('password-modal');
    const unlockBtn = document.getElementById('unlock-btn');
    const passwordInput = document.getElementById('app-password');

    if (!uploadBtn || !unlockBtn || !passwordModal) return;

    // Başlat butonuna basınca şifre ekranını göster
    uploadBtn.addEventListener('click', () => {
        uploadBtn.style.display = 'none';
        passwordModal.style.display = 'block';
        passwordInput.focus();
    });

    // Şifre girilince işlemi başlat
    unlockBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        if (!password) {
            UIManager.showWarning('Lütfen şifre giriniz');
            return;
        }
        handleAutoLoad(password);
    });

    // Enter tuşu desteği
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') unlockBtn.click();
    });
}

/**
 * Otomatik veri yükleme ve şifre çözme işlemi
 */
async function handleAutoLoad(password) {
    const passwordModal = document.getElementById('password-modal');
    const loadingContainer = document.getElementById('loading-container');
    const statusEl = document.getElementById('upload-status');
    const progressBar = document.getElementById('progress-bar');
    const percentage = document.getElementById('upload-percentage');

    passwordModal.style.display = 'none';
    loadingContainer.style.display = 'block';

    const updateProgress = (step, text) => {
        progressBar.style.width = step + '%';
        percentage.textContent = step + '%';
        statusEl.textContent = text;
    };

    updateProgress(5, 'Sunucuya bağlanılıyor...');

    const { baseUrl, files } = AppConfig.dataSource;
    let loadedCount = 0;

    // 1. Önce GeoJSON gibi şifresiz dosyaları çek
    const geoJsonFile = files.find(f => f.endsWith('.json'));
    if (geoJsonFile) {
        try {
            updateProgress(10, 'Harita verisi indiriliyor...');
            const response = await fetch(baseUrl + geoJsonFile);
            if (!response.ok) throw new Error('Harita dosyası bulunamadı');
            AppState.geoJsonData = await response.json();
            updateProgress(20, 'Harita hazır.');
        } catch (err) {
            console.error('GeoJSON hatası:', err);
            UIManager.showError('Harita verisi yüklenemedi');
        }
    }

    // 2. Şifreli dosyaları sırayla çek ve çöz
    const encryptedFiles = files.filter(f => f.endsWith('.enc'));
    const totalFiles = encryptedFiles.length;

    for (const fileName of encryptedFiles) {
        try {
            const currentProgress = 20 + Math.floor((loadedCount / totalFiles) * 70);
            updateProgress(currentProgress, `${fileName.replace('.enc', '')} çözülüyor...`);

            const response = await fetch(baseUrl + fileName);
            if (!response.ok) throw new Error(`${fileName} indirilemedi`);

            const encryptedData = await response.text();

            // CryptoJS ile çöz
            const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
            const originalFileName = fileName.replace('.enc', '');

            // Veri tipine göre işle
            if (originalFileName.endsWith('.xlsx')) {
                // xlsx-js için Unit8Array gerekiyor
                const typedArray = convertWordArrayToUint8Array(decrypted);
                // DataManager'a "dosya gibi" objeler gönderiyoruz
                await DataManager.processExcelFromData(typedArray, originalFileName);
            }
            else if (originalFileName.endsWith('.csv')) {
                const csvText = decrypted.toString(CryptoJS.enc.Utf8);
                await DataManager.processCSVFromText(csvText, originalFileName);
            }

            loadedCount++;
        } catch (err) {
            console.error('Çözme hatası:', fileName, err);
            updateProgress(100, 'HATALI ŞİFRE VEYA BOZUK VERİ');
            UIManager.showError('Veriler açılamadı', 'Lütfen şifrenizi kontrol edin.');
            return;
        }
    }

    updateProgress(90, 'Analizler tamamlanıyor...');
    DataManager.calculateColorScale();
    MapManager.init();

    updateProgress(100, 'Sistem Hazır!');
    setTimeout(() => {
        document.getElementById('upload-overlay').style.display = 'none';
        UIManager.showSuccess('Veriler başarıyla yüklendi');
        initializeSearchSystem();
    }, 800);
}

// CryptoJS WordArray -> Uint8Array dönüşümü
function convertWordArrayToUint8Array(wordArray) {
    const len = wordArray.sigBytes;
    const words = wordArray.words;
    const result = new Uint8Array(len);
    let j = 0;
    for (let i = 0; i < len; i++) {
        const word = words[i >>> 2];
        const byte = (word >>> (24 - (i % 4) * 8)) & 0xff;
        result[i] = byte;
    }
    return result;
}



function setupEventListeners() {
    // Export Buttons
    document.querySelectorAll('.panel-export-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Prevent event bubbling if necessary
            e.stopPropagation();

            const panelId = btn.getAttribute('data-panel');
            const chartId = btn.getAttribute('data-chart');
            const filename = btn.getAttribute('data-filename');

            if (panelId) {
                UIManager.exportPanel(panelId);
            } else if (chartId && filename) {
                ChartManager.exportChart(chartId, filename);
            }
        });
    });

    // Expand Buttons
    document.querySelectorAll('.panel-expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const panelId = btn.getAttribute('data-panel');
            if (panelId) {
                UIManager.togglePanelFullscreen(panelId);
            }
        });
    });

    // Analiz Modu Butonu
    const analysisIcon = document.getElementById('analysis-icon');
    if (analysisIcon) {
        analysisIcon.addEventListener('click', () => {
            UIManager.openAnalysisModal();
        });
    }

    // Analiz Modal Kapatma
    const analysisCloseBtn = document.getElementById('analysis-close-btn');
    if (analysisCloseBtn) {
        analysisCloseBtn.addEventListener('click', () => {
            UIManager.closeAnalysisModal();
        });
    }


    // Yıl Butonları
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const year = btn.getAttribute('data-year');
            if (year) {
                AppState.analysisYear = year;
                UIManager.updateYearButtons();
                if (AppState.analysisMetric) {
                    UIManager.renderAnalysisBubbles();
                }
            }
        });
    });

    // SLAYT / 4 YILLIK ANALİZ BUTONU (S)
    const storyIcon = document.getElementById('story-icon');
    if (storyIcon) {
        storyIcon.addEventListener('click', () => {
            UIManager.openStoryModal();
        });
    }

    // SLAYT MODAL KAPATMA
    const storyCloseBtn = document.getElementById('story-close-btn');
    if (storyCloseBtn) {
        storyCloseBtn.addEventListener('click', () => {
            UIManager.closeStoryModal();
        });
    }

    // HARİTAYA DÖNÜŞ BUTONU (R - Mobil için)
    const returnMapBtn = document.getElementById('return-map-btn');
    if (returnMapBtn) {
        returnMapBtn.addEventListener('click', () => {
            UIManager.closeDashboardMode();
        });
    }

    console.log('Event listeners initialized');
}

// ============================================
// ACCESSIBILITY - KEYBOARD NAVIGATION
// ============================================

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC: Close dashboard veya analiz modal
    if (e.key === 'Escape' || e.key === 'Esc') {
        // Önce slayt / story modal açık mı kontrol et
        if (AppState.storyModalOpen) {
            UIManager.closeStoryModal();
            return;
        }
        // Sonra analiz modal açık mı kontrol et
        if (AppState.analysisModalOpen) {
            UIManager.closeAnalysisModal();
            return;
        }
        // Sonra dashboard açık mı kontrol et
        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer && dashboardContainer.style.display !== 'none') {
            UIManager.closeDashboardMode();
        }
    }

    // SPACE/ENTER: Activate focused button
    if (e.key === ' ' || e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'BUTTON') {
            e.preventDefault();
            activeElement.click();
        }
    }

    // TAB: Make sure focus is visible
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
    }
});

// Remove keyboard-nav class on mouse interaction
document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
});

// Make panels keyboard accessible
document.addEventListener('DOMContentLoaded', () => {
    // Add tabindex to panels for keyboard navigation
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(panel => {
        panel.setAttribute('tabindex', '0');
    });

    // Add keyboard support for expand buttons
    const expandButtons = document.querySelectorAll('.panel-expand-btn');
    expandButtons.forEach(btn => {
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });

    // Add ARIA live region for dynamic updates
    const ariaLive = document.createElement('div');
    ariaLive.setAttribute('role', 'status');
    ariaLive.setAttribute('aria-live', 'polite');
    ariaLive.setAttribute('aria-atomic', 'true');
    ariaLive.className = 'sr-only';
    ariaLive.id = 'aria-live-region';
    document.body.appendChild(ariaLive);
});

// Screen reader announcements helper
function announceToScreenReader(message) {
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

console.log('Accessibility features loaded: Keyboard navigation & ARIA support enabled');

// ============================================
// EXPORT FEATURES - PNG DOWNLOAD
// ============================================

// Remove notification with animation
function removeNotification(notification) {
    notification.classList.add('removing');

    setTimeout(() => {
        notification.remove();
    }, 300); // Match animation duration
}

// ============================================
// THEME TOGGLE - DARK/LIGHT MODE
// ============================================

// Load saved theme or default to dark
function loadTheme() {
    const themeToggleBtn = document.querySelector('.theme-toggle-btn');
    if (themeToggleBtn) {
        // Check local storage
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            setTimeout(() => {
                try {
                    if (window.ChartManager) ChartManager.updateTheme(true);
                } catch (e) { console.error('Chart update error:', e); }
            }, 100);
        } else {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            setTimeout(() => {
                try {
                    if (window.ChartManager) ChartManager.updateTheme(false);
                } catch (e) { console.error('Chart update error:', e); }
            }, 100);
        }

        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');

            // Icon update
            themeToggleBtn.innerHTML = isLight ?
                '<i class="fas fa-moon"></i>' :
                '<i class="fas fa-sun"></i>';

            // Local storage
            localStorage.setItem('theme', isLight ? 'light' : 'dark');

            // Update Charts
            try {
                if (window.ChartManager) ChartManager.updateTheme(isLight);
            } catch (e) { console.error('Chart update error:', e); }

            if (isLight) {
                UIManager.showInfo('Aydınlık tema etkin', 'Aydınlık tema etkinleştirildi.');
            } else {
                UIManager.showInfo('Karanlık tema etkin', 'Karanlık tema etkinleştirildi.');
            }
        });
    } else {
        console.warn('Theme toggle button not found');
    }
}

// Toggle theme
// This function is now integrated into the loadTheme's event listener.
// The original toggleTheme function is effectively replaced by the event listener logic.
// The provided snippet for toggleTheme was incomplete and seemed to be part of the new loadTheme logic.
// Keeping the original structure of toggleTheme for clarity, but its functionality is now handled by the event listener.
// Toggle theme helper (now handled by event listener, keeping for compatibility if referenced elsewhere)
function toggleTheme() {
    const btn = document.querySelector('.theme-toggle-btn');
    if (btn) btn.click();
}
function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;

    if (theme === 'light') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// Initialize theme on page load
// Consolidated DOMContentLoaded is handled at the top of the file/script.
// Removing duplicate listener to prevent conflicts.

console.log('🌓 Theme toggle loaded: Dark/Light mode ready');

// ============================================
// RESPONSIVE & MOBILE OPTIMIZATIONS
// ============================================

// Detect mobile device
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
}

// Detect touch device
function isTouchDevice() {
    return ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0);
}

// Adjust UI for mobile
function adjustForMobile() {
    if (isMobileDevice()) {
        document.body.classList.add('mobile-device');
    }

    if (isTouchDevice()) {
        document.body.classList.add('touch-device');
    }
}

// Handle orientation change
function handleOrientationChange() {
    // Resize chart instances
    Object.values(AppState.chartInstances).forEach(chart => {
        if (chart && chart.resize) {
            setTimeout(() => chart.resize(), 300);
        }
    });
}

// Prevent zoom on double tap (iOS)
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    const timeSince = now - (window.lastTouchEnd || 0);

    if (timeSince < 300 && timeSince > 0) {
        e.preventDefault();
    }

    window.lastTouchEnd = now;
}, { passive: false });

// Initialize mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    adjustForMobile();

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', () => {
        if (isMobileDevice()) {
            handleOrientationChange();
        }
    });
});

console.log('Responsive optimizations loaded: Mobile & Tablet ready');

// ===========================================================
// COUNTRY SEARCH SYSTEM - ÜLKE ARAMA SİSTEMİ
// ===========================================================

// searchState is now in js/state.js

// Fuzzy search algorithm - Using Utils
function fuzzyMatch(text, pattern) {
    return Utils.fuzzyMatch(text, pattern);
}

// Levenshtein distance - Removed (handled in Utils)

// Initialize search system
function initializeSearchSystem() {
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('country-search');
    const searchClearBtn = document.getElementById('search-clear');
    const searchResults = document.getElementById('search-results');

    if (!searchContainer || !searchInput || !searchResults) {
        console.error('❌ Search elements not found');
        return;
    }

    // Build country list from geoJSON Layer (more reliable)
    searchState.allCountries = [];

    if (AppState.geoJsonLayer) {
        AppState.geoJsonLayer.eachLayer(layer => {
            if (layer.feature && layer.feature.properties) {
                const props = layer.feature.properties;
                const countryName = props.ADMIN || props.NAME || props.name || props.admin || props.NAME_LONG;

                if (countryName) {
                    const normalizedKey = normalizeKey(countryName);
                    searchState.allCountries.push({
                        name: countryName,
                        data: AppState.globalData[normalizedKey] || null,
                        layer: layer,
                        feature: layer.feature
                    });
                }
            }
        });
    }

    // Fallback to geoJsonData
    if (searchState.allCountries.length === 0 && AppState.geoJsonData && AppState.geoJsonData.features) {
        searchState.allCountries = AppState.geoJsonData.features.map(feature => {
            const props = feature.properties;
            const countryName = props.ADMIN || props.NAME || props.name || props.admin || props.NAME_LONG;
            return {
                name: countryName || 'Unknown',
                data: AppState.globalData[normalizeKey(countryName)] || null,
                feature: feature,
                layer: null
            };
        }).filter(c => c.name !== 'Unknown');
    }

    if (searchState.allCountries.length === 0) {
        console.error('❌ No countries found for search');
        return;
    }

    console.log(`🔍 Search initialized with ${searchState.allCountries.length} countries`);

    // Show search container
    searchContainer.style.display = 'block';
    searchContainer.style.visibility = 'visible';
    searchContainer.style.opacity = '1';

    // Search input event
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Show/hide clear button
        searchClearBtn.style.display = query ? 'block' : 'none';

        if (query.length === 0) {
            hideSearchResults();
            return;
        }

        if (query.length < 2) {
            return; // Wait for at least 2 characters
        }

        performSearch(query);
    });

    // Clear button
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
        hideSearchResults();
        searchInput.focus();
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        if (!searchState.isSearchActive) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                navigateResults(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                navigateResults(-1);
                break;
            case 'Enter':
                e.preventDefault();
                selectHighlightedResult();
                break;
            case 'Escape':
                hideSearchResults();
                searchInput.blur();
                break;
        }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            hideSearchResults();
        }
    });
}

// Perform search
function performSearch(query) {
    searchState.filteredResults = [];
    searchState.selectedIndex = -1;

    // Search through all countries
    searchState.allCountries.forEach(country => {
        const result = fuzzyMatch(country.name, query);
        if (result.match) {
            searchState.filteredResults.push({
                ...country,
                score: result.score
            });
        }
    });

    // Sort by score (highest first)
    searchState.filteredResults.sort((a, b) => b.score - a.score);

    // Display results
    displaySearchResults();
}

// Display search results
function displaySearchResults() {
    const searchResults = document.getElementById('search-results');

    if (searchState.filteredResults.length === 0) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <div>Sonuç bulunamadı</div>
            </div>
        `;
        searchResults.classList.add('active');
        searchState.isSearchActive = true;
        return;
    }

    searchResults.innerHTML = searchState.filteredResults.map((country, index) => {
        const dataCount = country.data && country.data.veriler ?
            Object.values(country.data.veriler).reduce((sum, val) => sum + (parseInt(val) || 0), 0) : 0;

        return `
            <div class="search-result-item" data-index="${index}" role="option">
                <span class="result-country-name">${country.name}</span>
                ${dataCount > 0 ? `<span class="result-data-badge">${dataCount} olay</span>` : ''}
            </div>
        `;
    }).join('');

    searchResults.classList.add('active');
    searchState.isSearchActive = true;

    // Add click listeners
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.getAttribute('data-index'));
            selectCountry(index);
        });
    });
}

// Navigate results with keyboard
function navigateResults(direction) {
    const maxIndex = searchState.filteredResults.length - 1;

    // Remove previous highlight
    if (searchState.selectedIndex >= 0) {
        const prevItem = document.querySelector(`.search-result-item[data-index="${searchState.selectedIndex}"]`);
        if (prevItem) prevItem.classList.remove('keyboard-selected');
    }

    // Update index
    searchState.selectedIndex += direction;
    if (searchState.selectedIndex < 0) searchState.selectedIndex = maxIndex;
    if (searchState.selectedIndex > maxIndex) searchState.selectedIndex = 0;

    // Highlight new item
    const newItem = document.querySelector(`.search-result-item[data-index="${searchState.selectedIndex}"]`);
    if (newItem) {
        newItem.classList.add('keyboard-selected');
        newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Select highlighted result
function selectHighlightedResult() {
    if (searchState.selectedIndex >= 0) {
        selectCountry(searchState.selectedIndex);
    }
}

// Select country
function selectCountry(index) {
    const country = searchState.filteredResults[index];
    if (!country) return;

    console.log(`🎯 Selected country: ${country.name} `);

    // Hide search results
    hideSearchResults();

    // Clear search input
    document.getElementById('country-search').value = '';
    document.getElementById('search-clear').style.display = 'none';

    // Use the layer directly if available
    if (country.layer) {
        // Simulate click on the layer
        country.layer.fire('click');

        // Zoom to country
        const bounds = country.layer.getBounds();
        AppState.map.flyToBounds(bounds, {
            padding: [50, 50],
            duration: 1.5,
            easeLinearity: 0.5
        });

        // Success notification
        UIManager.showSuccess(`${country.name} seçildi`);
    } else {
        // Fallback: Find the layer in the map
        if (AppState.geoJsonLayer) {
            AppState.geoJsonLayer.eachLayer(layer => {
                const layerName = layer.feature.properties.ADMIN || layer.feature.properties.NAME;
                if (layerName === country.name) {
                    // Simulate click on the layer
                    layer.fire('click');

                    // Zoom to country
                    const bounds = layer.getBounds();
                    AppState.map.flyToBounds(bounds, {
                        padding: [50, 50],
                        duration: 1.5,
                        easeLinearity: 0.5
                    });

                    // Success notification
                    UIManager.showSuccess(`${country.name} seçildi`);
                }
            });
        }
    }
}

// Hide search results
function hideSearchResults() {
    const searchResults = document.getElementById('search-results');
    searchResults.classList.remove('active');
    searchState.isSearchActive = false;
    searchState.selectedIndex = -1;
}

console.log('🔍 Country search system loaded');

// ===========================================================
// COUNTRY INFO CARD - HOVER TOOLTIP
// ===========================================================

let infoCardTimeout = null;

// Show country info card on hover
function showCountryInfoCard(event, feature) {
    // Clear any existing timeout
    if (infoCardTimeout) {
        clearTimeout(infoCardTimeout);
    }

    const infoCard = document.getElementById('country-info-card');
    if (!infoCard) return;

    // Get country data (same way as showDashboardPanels)
    const countryName = feature.properties.ADMIN || feature.properties.NAME || feature.properties.name;
    const normalizedKey = normalizeKey(countryName);
    const countryData = AppState.globalData[normalizedKey];

    // Get yearly data (same as dash-history-chart)
    let events2021 = 0;
    let events2022 = 0;
    let events2023 = 0;
    let events2024 = 0;

    if (countryData && countryData.veriler) {
        events2021 = getLastValue(countryData.veriler['2021']);
        events2022 = getLastValue(countryData.veriler['2022']);
        events2023 = getLastValue(countryData.veriler['2023']);
        events2024 = getLastValue(countryData.veriler['2024']);
    }

    // Update card content
    document.getElementById('info-card-country').textContent = countryName;
    document.getElementById('info-card-2021').textContent = events2021 > 0 ? events2021 : '-';
    document.getElementById('info-card-2022').textContent = events2022 > 0 ? events2022 : '-';
    document.getElementById('info-card-2023').textContent = events2023 > 0 ? events2023 : '-';
    document.getElementById('info-card-2024').textContent = events2024 > 0 ? events2024 : '-';

    // Set flag (if exists)
    const flagElement = document.getElementById('info-card-flag');
    if (countryData && countryData.bayrak) {
        flagElement.src = countryData.bayrak;
        flagElement.alt = countryName + ' bayrağı';
        flagElement.style.display = 'block';
    } else {
        flagElement.style.display = 'none';
    }

    // Position card near mouse
    const mouseX = event.originalEvent.clientX;
    const mouseY = event.originalEvent.clientY;

    // Calculate position (avoid overflow)
    const cardWidth = 260;
    const cardHeight = 280; // 4 rows now (2021, 2022, 2023, 2024)
    const offsetX = 15;
    const offsetY = 15;

    let posX = mouseX + offsetX;
    let posY = mouseY + offsetY;

    // Check right overflow
    if (posX + cardWidth > window.innerWidth) {
        posX = mouseX - cardWidth - offsetX;
    }

    // Check bottom overflow
    if (posY + cardHeight > window.innerHeight) {
        posY = mouseY - cardHeight - offsetY;
    }

    // Ensure minimum position
    posX = Math.max(10, posX);
    posY = Math.max(10, posY);

    infoCard.style.left = posX + 'px';
    infoCard.style.top = posY + 'px';

    // Show card with slight delay
    infoCardTimeout = setTimeout(() => {
        infoCard.style.display = 'block';
        // Trigger reflow
        infoCard.offsetHeight;
        infoCard.classList.add('visible');
    }, 200); // 200ms delay before showing
}

// Hide country info card
function hideCountryInfoCard() {
    // Clear timeout
    if (infoCardTimeout) {
        clearTimeout(infoCardTimeout);
        infoCardTimeout = null;
    }

    const infoCard = document.getElementById('country-info-card');
    if (!infoCard) return;

    infoCard.classList.remove('visible');

    // Hide after animation
    setTimeout(() => {
        if (!infoCard.classList.contains('visible')) {
            infoCard.style.display = 'none';
        }
    }, 300);
}

// Hide info card when dashboard opens
function hideInfoCardOnDashboard() {
    hideCountryInfoCard();
}

console.log('📍 Country info card (hover tooltip) loaded');

// ===========================================================
// TIMELINE SYSTEM - YILLAR ARASI GEÇİŞ ANİMASYONU
// ===========================================================

// TimelineState is now in js/state.js

// Timeline feature tamamen kaldırıldı (initializeTimelineControls vb.)

// ===========================================================
// COUNTRY COMPARISON SYSTEM - ÜLKE KARŞILAŞTIRMA
// ===========================================================

console.log('Country comparison system loaded');