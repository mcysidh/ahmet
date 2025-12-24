/**
 * Global Configuration & Constants
 * Decouples magic numbers and colors from logic.
 */
const AppConfig = {
    // Theme Colors (daha kurumsal, sade palet)
    colors: {
        // Arka plan ve metin
        background: '#020617',          // Çok koyu lacivert
        text: '#e5e7eb',                // Açık gri metin
        primary: '#7c3aed',             // Koyu mor (vurgu)
        neonRed: '#b91c1c',             // Daha sakin koyu kırmızı (ana vurgu)
        darkGrey: '#111827',            // Düşük değer rengi
        noData: '#020617',              // Veri olmayan ülkeler için renk

        // Isı haritası için kırmızı ton skalası (az olay -> hafif kırmızı, çok olay -> koyu/keskin kırmızı)
        heatmap: [
            { threshold: 0, color: '#4c0519' },  // Çok az olay: koyu bordo
            { threshold: 0.2, color: '#7f1d1d' },  // Az olay: koyu kırmızı
            { threshold: 0.4, color: '#b91c1c' },  // Orta seviye
            { threshold: 0.6, color: '#dc2626' },  // Yüksek
            { threshold: 0.8, color: '#f97373' },  // Çok yüksek, parlak ama neon değil
            { threshold: 1, color: '#7f1d1d' }   // En uçlar tekrar koyu kırmızıya yakın
        ],

        // Karşılaştırma modunda kullanılacak seri renkleri (daha mat tonlar)
        compare: ['#7c3aed', '#2563eb', '#059669', '#b45309'] // Mor, mavi, yeşil, kahverengi-turuncu
    },

    // UI Constants
    ui: {
        animationDuration: 1000, // Reduced from 1600ms to 1000ms (1s)
        cascadeInterval: 40, // Reduced from 80ms to 40ms (snappier)
        mapFlyDuration: 1.5, // Reduced from 2s to 1.5s
        mobileBreakPoint: 768
    },

    // Event Icons
    icons: {
        negative: {
            '2021': '⚠️',
            '2022': '🚨',
            '2023': '⛔',
            '2024': '🔴'
        },
        positive: {
            '2021': '',
            '2022': '',
            '2023': '',
            '2024': ''
        }
    },

    // DOM Element IDs
    dom: {
        panels: {
            container: 'dashboard-container',
            general: 'panel-general',
            history: 'panel-history',
            details: 'panel-details',
            neg: 'panel-neg',
            pos: 'panel-pos',
            years: ['2021', '2022', '2023', '2024'],
            getRankingId: (year) => `panel-ranking-${year}`
        },
        charts: {
            history: 'dash-history-chart',
            getRankingCanvasId: (year) => `dash-rank-chart-${year.toString().slice(-2)}`
        }
    },

    // Detaylı veriler tablosu için kategori eşleştirmeleri
    detailCategoryMap: {
        // KAYNAĞIN TÜRÜNE GÖRE
        'Bireysel Kimlikle Tek Kişinin Gerçekleştirdiği': {
            main: 'KAYNAĞIN TÜRÜNE GÖRE',
            sub: 'Bireysel Kimlik'
        },
        'Bireysel Kimlikle Grup Halinde Gerçekleştirilen': {
            main: 'KAYNAĞIN TÜRÜNE GÖRE',
            sub: 'Bireysel Kimlik'
        },
        'Kaç Kişi Tarafından Gerçekleştirildiği Bilinmeyen': {
            main: 'KAYNAĞIN TÜRÜNE GÖRE',
            sub: 'Bireysel Kimlik'
        },
        'Kurumsal Kimlikle Tek Kişinin Gerçekleştirdiği': {
            main: 'KAYNAĞIN TÜRÜNE GÖRE',
            sub: 'Kurumsal Kimlik'
        },
        'Kurumsal Kimlikle Grup Halinde Gerçekleştirilen': {
            main: 'KAYNAĞIN TÜRÜNE GÖRE',
            sub: 'Kurumsal Kimlik'
        },
        'Kurumlar Tarafından Gerçekleştirilen': {
            main: 'KAYNAĞIN TÜRÜNE GÖRE',
            sub: 'Kurumsal Kimlik'
        },

        // HEDEFİN TÜRÜNE GÖRE
        'Kadınları Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'Şahıs'
        },
        'Erkekleri Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'Şahıs'
        },
        'Kadın ve Erkeklerin Bir Arada Bulunduğu Grupları Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'Şahıs'
        },
        'Camileri Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'Kamu/Şahıs Malı'
        },
        'Diğer Kamu Mallarını Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'Kamu/Şahıs Malı'
        },
        'Şahıs Mallarını Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'Kamu/Şahıs Malı'
        },
        // HEDEFİN TÜRÜNE GÖRE / İslam/Kutsal
        'Kur’an-I Kerimi Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'İslam/Kutsal'
        },
        'Kur’an-ı Kerimi Hedef Alan': { // olası farklı yazım
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'İslam/Kutsal'
        },
        'İslam ve Kutsal Değerleri Hedef Alan': {
            main: 'HEDEFİN TÜRÜNE GÖRE',
            sub: 'İslam/Kutsal'
        },

        // OLAYIN TÜRÜNE GÖRE / Şahsa Yönelik
        'Müslümanlara Yönelik Fiziksel Şiddet İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahsa Yönelik'
        },
        'Müslümanlara Yönelik Sözlü Şiddet İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahsa Yönelik'
        },
        'Müslümanlara Yönelik Yazılı Şiddet İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahsa Yönelik'
        },
        'Müslümanlara Yönelik Ayrımcılık İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahsa Yönelik'
        },

        // OLAYIN TÜRÜNE GÖRE / Şahıs/Kamu Malına Yönelik
        'Şahıs/Kamu Malına Yönelik Maddi Zarar İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahıs/Kamu Malına Yönelik'
        },
        'Şahıs/Kamu Malına Yönelik Yazılı Zarar İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahıs/Kamu Malına Yönelik'
        },
        'Şahıs/Kamu Malına Yönelik Engelleme/Kapatma İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahıs/Kamu Malına Yönelik'
        },
        'Şahıs/Kamu Malına Yönelik Sembolik Hakaret İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'Şahıs/Kamu Malına Yönelik'
        },

        // OLAYIN TÜRÜNE GÖRE / İslam’a Yönelik
        'İslami Değerlere Yönelik Nefret Söylemi/Suçu İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'İslam’a Yönelik'
        },
        'İslami Değerler Aleyhine Yapılan Kanun/Yönetmelik İçeren': {
            main: 'OLAYIN TÜRÜNE GÖRE',
            sub: 'İslam’a Yönelik'
        }

        // Gerekirse diğer veri türleri de buraya eklenebilir
    },

    // Kıta renkleri - Analiz modu için
    continentColors: {
        'Kuzey-Güney Amerika': '#fbbf24', // Sarı/Turuncu
        'Avrupa': '#3b82f6',              // Mavi
        'Balkanlar': '#ec4899',           // Pembe
        'Afrika': '#06b6d4',               // Açık Mavi/Cyan
        'Asya-Pasifik': '#10b981'         // Yeşil
    },

    // Veri Kaynağı Yapılandırması (GitHub CDN'den Otomatik Yükleme)
    dataSource: {
        // GitHub üzerinden jsdelivr CDN ile veri çekiliyor
        baseUrl: 'https://cdn.jsdelivr.net/gh/mcysidh/ahmet@main/Veri/',
        files: [
            'countries.geo.json', // Bu dosya şifrelenmeyecek (boyut nedeniyle)
            'ulkeler.xlsx.enc',
            'ulke_detaylari.csv.enc',
            'veriler_2021.xlsx.enc',
            'veriler_2022.xlsx.enc',
            'veriler_2023.xlsx.enc',
            'veriler_2024.xlsx.enc',
            'özet21.xlsx.enc',
            'özet22.xlsx.enc',
            'özet23.xlsx.enc',
            'özet24.xlsx.enc',
            'Pözet21.xlsx.enc',
            'Pözet22.xlsx.enc',
            'Pözet2023.xlsx.enc',
            'Pözet2024.xlsx.enc'
        ]
    }
};

console.log('⚙️ AppConfig loaded');
