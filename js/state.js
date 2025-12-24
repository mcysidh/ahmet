/**
 * State Management
 * Centralizes all global state objects.
 */

const AppState = {
    map: null,
    geoJsonLayer: null,
    geoJsonData: null,
    translationMap: {},
    globalData: {},
    orderedHeaders: [],
    chartInstances: {}, // Chart.js instances
    dashboardActive: false,
    selectedLayer: null,
    currentCountryData: null,
    // Analiz modu için state
    analysisYear: '2023',
    analysisMetric: null,
    analysisModalOpen: false,
    // 4 yıllık küresel analiz (S butonu) için özet veriler
    globalYearTotals: {
        '2021': 0,
        '2022': 0,
        '2023': 0,
        '2024': 0
    },
    storyModalOpen: false
};

// TimelineState eskiden zaman çizelgesi için kullanılıyordu, özellik kaldırıldığı için tutulmuyor.

const CompareState = {
    isActive: false,
    selectedCountries: [],
    maxCountries: 4,
    colors: AppConfig.colors.compare
};

const searchState = {
    allCountries: [],
    filteredResults: [],
    selectedIndex: -1,
    isSearchActive: false
};

console.log('🧠 State Managers loaded');
