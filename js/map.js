/**
 * Map Manager
 * Handles Leaflet map initialization, styling, feature interaction, and Compare Mode logic.
 */

const MapManager = {

    init() {
        console.log('Map Manager initializing...');
        MapManager.initializeMap();
        MapManager.initializeCompareSystem();
    },

    // --- Core Map Initialization ---

    initializeMap() {
        if (AppState.map) return; // Prevent double init

        AppState.map = L.map('map').setView([20, 0], 2);

        // CARTO Dark Matter (Simsiyah Harita)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(AppState.map);

        if (AppState.geoJsonData) {
            AppState.geoJsonLayer = L.geoJSON(AppState.geoJsonData, {
                style: MapManager.styleFeature,
                onEachFeature: MapManager.onEachFeature
            }).addTo(AppState.map);
        }

        console.log('Map initialized');
    },

    // --- Styling ---

    styleFeature(feature) {
        const englishName = feature.properties.name;
        const normEnglish = Utils.normalizeKey(englishName);
        const turkishName = AppState.translationMap[normEnglish] || englishName;
        const normTurkish = Utils.normalizeKey(turkishName);

        const data = AppState.globalData[normTurkish];
        const value = (data && typeof data.colorValue === 'number')
            ? data.colorValue
            : null;

        // Orijinal rengi hesapla ve kaydet
        const originalColor = MapManager.getRedScaleColor(value, AppState.colorScale.min, AppState.colorScale.max);
        feature._originalColor = originalColor; // Kaydet!

        return {
            fillColor: originalColor,
            weight: 1,
            opacity: 1,
            color: '#111', // Sınır çizgileri çok koyu
            fillOpacity: 1
        };
    },

    getRedScaleColor(value, min, max) {
        // Hiç veri yoksa: tamamen ayrı bir renk (noData)
        if (value === null || value === undefined || isNaN(value)) {
            return AppConfig.colors.noData || AppConfig.colors.background;
        }

        // Koruma: min/max tanımlı değilse tek ton kullan
        const safeMin = (typeof min === 'number') ? min : value;
        const safeMax = (typeof max === 'number') ? max : value;

        const ratio = (safeMax === safeMin) ? 1 : (value - safeMin) / (safeMax - safeMin);

        // Dark mode'a uygun, parlayan kırmızı tonları (Config'den)
        const colors = AppConfig.colors.heatmap;

        for (let i = colors.length - 1; i >= 0; i--) {
            if (ratio >= colors[i].threshold) return colors[i].color;
        }

        return colors[0].color;
    },

    // --- Interaction ---

    onEachFeature(feature, layer) {
        layer.on({
            mouseover: (e) => {
                if (!AppState.dashboardActive && !CompareState.isActive) {
                    e.target.setStyle({ weight: 2, color: AppConfig.colors.neonRed });
                    UIManager.showCountryInfoCard(e, feature);
                }
            },

            mouseout: (e) => {
                if (!AppState.dashboardActive && !CompareState.isActive) {
                    AppState.geoJsonLayer.resetStyle(e.target);
                    UIManager.hideCountryInfoCard();
                }
            },

            click: (e) => {
                L.DomEvent.stopPropagation(e);

                const countryName = feature.properties.ADMIN || feature.properties.NAME || feature.properties.name;

                // Compare mode active?
                if (CompareState.isActive) {
                    MapManager.addCountryToCompare(countryName, feature, e.target);
                    return;
                }

                UIManager.hideCountryInfoCard(); // Info card'ı gizle
                MapManager.activateDashboardMode(e.target, countryName);
            }
        });
    },

    activateDashboardMode(layer, englishName) {
        AppState.dashboardActive = true;
        AppState.selectedLayer = layer;

        // Hide info card when dashboard opens
        UIManager.hideCountryInfoCard();

        // Diğer ülkeleri tamamen karanlığa göm (orijinal renklerini koru)
        AppState.geoJsonLayer.eachLayer(l => {
            l.setStyle({
                opacity: 0.1,
                fillOpacity: 0.05,
                color: '#000'
            });
        });

        // Seçili ülkeyi NEON yap - ESKİ VERSİYON GİBİ
        // Fill rengi DEĞİŞMİYOR (orijinal renk kalıyor)
        // Sadece BORDER KIRMIZI oluyor!
        layer.setStyle({
            opacity: 1,
            color: AppConfig.colors.neonRed, // Neon Kırmızı Sınır
            weight: 3,
            fillOpacity: 1,
            fillColor: layer.options.fillColor // ORİJİNAL RENK KORUNUYOR!
        });

        const bounds = layer.getBounds();

        AppState.map.flyToBounds(bounds, {
            padding: [100, 100],
            duration: AppConfig.ui.mapFlyDuration,
            easeLinearity: 0.15,
            maxZoom: 6
        });

        const normEnglish = Utils.normalizeKey(englishName);
        const turkishName = AppState.translationMap[normEnglish] || englishName;
        const normTurkish = Utils.normalizeKey(turkishName);

        const data = AppState.globalData[normTurkish];

        if (!data) console.warn("Veri bulunamadı: " + turkishName);

        setTimeout(() => { if (data) UIManager.showDashboardPanels(data); }, AppConfig.ui.animationDuration);
    },

    // --- Compare System (Map Logic) ---

    initializeCompareSystem() {
        const compareBtn = document.getElementById('compare-mode-btn');
        const cancelBtn = document.getElementById('compare-cancel-btn');
        const showBtn = document.getElementById('compare-show-btn');
        const closeBtn = document.getElementById('compare-close-btn');
        const exportBtn = document.getElementById('compare-export-btn');

        if (!compareBtn) return;

        // Show compare button
        compareBtn.style.display = 'flex';

        // Toggle compare mode
        compareBtn.addEventListener('click', MapManager.toggleCompareMode);

        // Cancel compare mode
        cancelBtn.addEventListener('click', () => {
            MapManager.deactivateCompareMode();
        });

        // Show comparison
        showBtn.addEventListener('click', () => {
            if (CompareState.selectedCountries.length < 2) {
                UIManager.showWarning('En az 2 ülke seçmelisiniz');
                return;
            }
            document.getElementById('compare-results-panel').style.display = 'block';
            UIManager.populateComparisonPanel();
            MapManager.deactivateCompareMode();
        });

        // Close comparison panel
        closeBtn.addEventListener('click', () => {
            document.getElementById('compare-results-panel').style.display = 'none';
            if (AppState.chartInstances['compare-chart']) {
                AppState.chartInstances['compare-chart'].destroy();
                delete AppState.chartInstances['compare-chart'];
            }
        });

        // Export comparison
        exportBtn.addEventListener('click', () => {
            ChartManager.exportChart('compare-chart', 'Ulke_Karsilastirma');
        });

        console.log('Compare system initialized');
    },

    toggleCompareMode() {
        if (CompareState.isActive) {
            MapManager.deactivateCompareMode();
        } else {
            MapManager.activateCompareMode();
        }
    },

    activateCompareMode() {
        CompareState.isActive = true;
        CompareState.selectedCountries = [];

        const compareBtn = document.getElementById('compare-mode-btn');
        const selectionPanel = document.getElementById('compare-selection-panel');

        compareBtn.classList.add('active');
        selectionPanel.style.display = 'block';

        // Update map cursor
        document.getElementById('map').style.cursor = 'crosshair';

        // Show notification
        UIManager.showInfo('Karşılaştırmak istediğiniz ülkelere tıklayın (2-4 ülke)');

        UIManager.updateCompareSelection();
    },

    deactivateCompareMode() {
        CompareState.isActive = false;
        CompareState.selectedCountries = [];

        const compareBtn = document.getElementById('compare-mode-btn');
        const selectionPanel = document.getElementById('compare-selection-panel');

        compareBtn.classList.remove('active');
        selectionPanel.style.display = 'none';

        // Reset map cursor
        document.getElementById('map').style.cursor = '';

        // Remove all highlights
        if (AppState.geoJsonLayer) {
            AppState.geoJsonLayer.eachLayer(layer => {
                AppState.geoJsonLayer.resetStyle(layer);
            });
        }

        UIManager.updateCompareSelection();
    },

    addCountryToCompare(countryName, feature, layer) {
        if (!CompareState.isActive) return false;

        // Check if already selected
        const existing = CompareState.selectedCountries.find(c => c.name === countryName);
        if (existing) {
            // Remove if already selected
            CompareState.selectedCountries = CompareState.selectedCountries.filter(c => c.name !== countryName);
            AppState.geoJsonLayer.resetStyle(layer);
            UIManager.showInfo(`${countryName} seçimden çıkarıldı`);
        } else {
            // Check max limit
            if (CompareState.selectedCountries.length >= CompareState.maxCountries) {
                UIManager.showWarning(`En fazla ${CompareState.maxCountries} ülke seçebilirsiniz`);
                return false;
            }

            // Add to selection
            const normalizedKey = Utils.normalizeKey(countryName);
            const countryData = AppState.globalData[normalizedKey];

            CompareState.selectedCountries.push({
                name: countryName,
                data: countryData,
                feature: feature,
                layer: layer,
                color: CompareState.colors[CompareState.selectedCountries.length]
            });

            // Highlight layer
            layer.setStyle({
                fillColor: CompareState.colors[CompareState.selectedCountries.length],
                fillOpacity: 0.6,
                weight: 2,
                color: '#ffffff'
            });

            UIManager.showSuccess(`${countryName} seçildi`);
        }

        UIManager.updateCompareSelection();
        return true;
    },

    removeCountryFromCompare(index) {
        const country = CompareState.selectedCountries[index];
        if (country && country.layer) {
            AppState.geoJsonLayer.resetStyle(country.layer);
        }
        CompareState.selectedCountries.splice(index, 1);

        // Reassign colors
        CompareState.selectedCountries.forEach((c, i) => {
            c.color = CompareState.colors[i];
            if (c.layer) {
                c.layer.setStyle({
                    fillColor: c.color,
                    fillOpacity: 0.6,
                    weight: 2,
                    color: '#ffffff'
                });
            }
        });

        UIManager.updateCompareSelection();
    }
};
