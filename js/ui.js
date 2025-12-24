/**
 * UI Manager
 * Handles generic UI interactions, notifications, and dashboard panel logic.
 */

const UIManager = {

    // --- Notifications ---
    showSuccess(title, message) {
        UIManager.showNotification('success', title, message, 'fa-check');
    },

    showError(title, message) {
        UIManager.showNotification('error', title, message, 'fa-times');
    },

    showWarning(title, message = '') {
        UIManager.showNotification('warning', title, message, 'fa-exclamation-triangle');
    },

    showInfo(title, message = '') {
        UIManager.showNotification('info', title, message, 'fa-info-circle');
    },

    showNotification(type, title, message, icon) {
        const bgColors = {
            success: 'linear-gradient(135deg, rgba(6, 78, 59, 0.95), rgba(16, 185, 129, 0.9))',
            error: 'linear-gradient(135deg, rgba(127, 29, 29, 0.95), rgba(220, 38, 38, 0.9))',
            warning: 'linear-gradient(135deg, rgba(124, 45, 18, 0.95), rgba(245, 158, 11, 0.9))',
            info: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(59, 130, 246, 0.9))'
        };

        const existing = document.querySelector('.custom-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icon}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        Object.assign(toast.style, {
            position: 'fixed', top: '20px', right: '20px',
            background: bgColors[type], color: 'white', padding: '16px 24px',
            borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', gap: '15px',
            zIndex: '100000', opacity: '0', transform: 'translateY(-20px)',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
            minWidth: '320px'
        });

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    // --- Dashboard Panels ---

    animatePanelEntrance() {
        const panels = [
            AppConfig.dom.panels.general,
            AppConfig.dom.panels.history,
            AppConfig.dom.panels.details,
            AppConfig.dom.panels.neg,
            AppConfig.dom.panels.pos,
            ...AppConfig.dom.panels.years.map(y => AppConfig.dom.panels.getRankingId(y))
        ];

        // Reset
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(30px) scale(0.9)';
                panel.style.transition = 'none';
            }
        });

        // Cascade
        panels.forEach((panelId, index) => {
            setTimeout(() => {
                const panel = document.getElementById(panelId);
                if (panel) {
                    panel.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    panel.style.opacity = '1';
                    panel.style.transform = 'translateY(0) scale(1)';

                    // Bounce
                    setTimeout(() => {
                        panel.style.transform = 'translateY(0) scale(1.02)';
                        setTimeout(() => {
                            panel.style.transform = 'translateY(0) scale(1)';
                        }, 150);
                    }, 400);
                }
            }, index * AppConfig.ui.cascadeInterval);
        });
    },

    togglePanelFullscreen(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const isFullscreen = panel.classList.contains('fullscreen');
        const btn = panel.querySelector('.panel-expand-btn');

        if (isFullscreen) {
            panel.classList.remove('fullscreen');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                btn.title = 'Tam Ekran';
            }

            // Re-render chart if it's a ranking panel (Show Top 15)
            if (panelId.includes('ranking') && AppState.currentCountryData) {
                const year = panelId.split('-')[2]; // panel-ranking-2021 -> 2021
                // Wait for transition to finish or do it immediately? Chart.js animates, so immediate is fine.
                // We need to wait slightly for container resize? No, Chart.js handles responsive unless we destroy it.
                // But we are changing data limit, so we MUST destroy and recreate.
                ChartManager.createRankingChartForDashboard(
                    AppConfig.dom.charts.getRankingCanvasId(year),
                    year,
                    AppState.currentCountryData.displayName,
                    false // showAll = false
                );
            }

        } else {
            panel.classList.add('fullscreen');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                btn.title = 'Küçült';
            }

            // Re-render chart if it's a ranking panel (Show ALL)
            if (panelId.includes('ranking') && AppState.currentCountryData) {
                const year = panelId.split('-')[2];
                ChartManager.createRankingChartForDashboard(
                    AppConfig.dom.charts.getRankingCanvasId(year),
                    year,
                    AppState.currentCountryData.displayName,
                    true // showAll = true
                );
            }
        }
    },

    showDashboardPanels(data) {
        const container = document.getElementById(AppConfig.dom.panels.container);
        if (!container) return;
        container.style.display = 'block';

        // Store current country data for chart re-rendering
        AppState.currentCountryData = data;

        const flagImg = document.getElementById('dash-flag');
        if (flagImg) {
            flagImg.style.display = data.flag ? 'block' : 'none';
            if (data.flag) {
                flagImg.src = data.flag;
                flagImg.alt = data.displayName; // Set alt for accessibility
            }
        }

        const generalContent = document.getElementById('dash-general-content');
        if (generalContent) {
            let genHtml = `<h2 style="margin-top:0; margin-bottom:10px; color:#ff003c;">${data.displayName.toUpperCase()}</h2>`;
            if (data.details) {
                genHtml += '<div style="display:grid; gap:5px;">';
                Object.entries(data.details).forEach(([k, v]) => {
                    if (!k.toLowerCase().includes('country') && !k.toLowerCase().includes('ülke') && v) {
                        genHtml += `<div><strong style="color:#94a3b8;">${k.toUpperCase()}:</strong> ${v}</div>`;
                    }
                });
                genHtml += '</div>';
            }
            generalContent.innerHTML = genHtml;
        }

        // Hide floating chart labels
        document.querySelectorAll('.chart-floating-label').forEach(el => el.remove());

        // Create main history chart - smooth line + area (2021-2024)
        ChartManager.createChart(AppConfig.dom.charts.history, 'line', {
            labels: AppConfig.dom.panels.years,
            datasets: [{
                label: 'Toplam Olay',
                data: AppConfig.dom.panels.years.map(y => Utils.getLastValue(data.veriler?.[y])),
                borderColor: '#f97316', // sıcak turuncu çizgi
                backgroundColor: 'rgba(249, 115, 22, 0.25)', // turuncu alan
                fill: true,
                tension: 0.35, // yumuşak eğri
                borderWidth: 3,
                pointBackgroundColor: '#f97316',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        }, true);

        // Populate Tables and other charts
        UIManager.populateDashboardTable(data);
        UIManager.populateDashboardExamples(data);

        // Show panels with animation
        const panels = [
            AppConfig.dom.panels.general,
            AppConfig.dom.panels.details,
            AppConfig.dom.panels.history,
            AppConfig.dom.panels.neg,
            AppConfig.dom.panels.pos,
            ...AppConfig.dom.panels.years.map(y => AppConfig.dom.panels.getRankingId(y))
        ];

        panels.forEach((panelId, index) => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = 'block';
                panel.classList.remove('active');
                setTimeout(() => panel.classList.add('active'), index * 100);
            }
        });

        // İlk panel için odak ayarla (klavye kullanıcıları için)
        const firstPanel = document.getElementById(AppConfig.dom.panels.general);
        if (firstPanel) {
            firstPanel.focus();
        }

        // Mobil cihazlarda R butonunu göster
        const returnMapBtn = document.getElementById('return-map-btn');
        if (returnMapBtn) {
            returnMapBtn.classList.add('active');
        }
    },

    populateDashboardTable(data) {
        const tbody = document.querySelector('#dash-details-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!AppState.orderedHeaders || AppState.orderedHeaders.length === 0 || !data.veriler) {
            AppConfig.dom.panels.years.forEach(y => ChartManager.clearRankingChart(AppConfig.dom.charts.getRankingCanvasId(y), y));
            return;
        }

        // 1) Önce satırları kategori bilgisi ile birlikte hazırlayalım
        const rows = [];
        AppState.orderedHeaders.forEach(feature => {
            const val2021 = (data.veriler['2021'] && data.veriler['2021'][feature]) || '-';
            const val2022 = (data.veriler['2022'] && data.veriler['2022'][feature]) || '-';
            const val2023 = (data.veriler['2023'] && data.veriler['2023'][feature]) || '-';
            const val2024 = (data.veriler['2024'] && data.veriler['2024'][feature]) || '-';

            if (val2021 === '-' && val2022 === '-' && val2023 === '-' && val2024 === '-') return;

            const cat = AppConfig.detailCategoryMap[feature] || { main: '', sub: '' };
            rows.push({
                feature,
                main: cat.main,
                sub: cat.sub,
                vals: { '2021': val2021, '2022': val2022, '2023': val2023, '2024': val2024 }
            });
        });

        if (rows.length === 0) {
            return;
        }

        // 2) Rowspan değerlerini hesapla (aynı ana/alt kategori ardışık satırlarda birleştirilecek)
        for (let i = 0; i < rows.length; i++) {
            // Ana kategori
            if (!rows[i].main) {
                // Kategorisi olmayan satırlar gruplanmasın
                rows[i].mainRowSpan = 0;
            } else if (i === 0 || rows[i].main !== rows[i - 1].main) {
                let span = 1;
                for (let j = i + 1; j < rows.length; j++) {
                    if (rows[j].main === rows[i].main) span++;
                    else break;
                }
                rows[i].mainRowSpan = rows[i].main ? span : 0;
            } else {
                rows[i].mainRowSpan = 0;
            }

            // Alt kategori
            if (!rows[i].sub) {
                // Alt kategorisi olmayan satırlar gruplanmasın
                rows[i].subRowSpan = 0;
            } else if (i === 0 || rows[i].sub !== rows[i - 1].sub) {
                let spanSub = 1;
                for (let j = i + 1; j < rows.length; j++) {
                    if (rows[j].sub === rows[i].sub) spanSub++;
                    else break;
                }
                rows[i].subRowSpan = rows[i].sub ? spanSub : 0;
            } else {
                rows[i].subRowSpan = 0;
            }
        }

        // 3) Satırları DOM'a yaz
        rows.forEach((rowData, index) => {
            const tr = document.createElement('tr');

            // Ana kategori hücresi (dikey yazı, rowspan ile)
            if (rowData.mainRowSpan > 0) {
                let mainKey = '';
                if (rowData.main === 'KAYNAĞIN TÜRÜNE GÖRE') mainKey = 'source';
                else if (rowData.main === 'HEDEFİN TÜRÜNE GÖRE') mainKey = 'target';
                else if (rowData.main === 'OLAYIN TÜRÜNE GÖRE') mainKey = 'event';

                const tdMain = document.createElement('td');
                tdMain.rowSpan = rowData.mainRowSpan;
                tdMain.classList.add('detail-main-cell');
                if (mainKey) {
                    tdMain.classList.add(`detail-main-${mainKey}`);
                }

                const span = document.createElement('span');
                span.textContent = rowData.main;
                span.classList.add('detail-main-text');

                tdMain.appendChild(span);
                tr.appendChild(tdMain);
            } else if (!rowData.main) {
                // Kategorisi olmayan satırlar için boş hücre ekle (kolon hizası bozulmasın)
                const tdEmptyMain = document.createElement('td');
                tdEmptyMain.classList.add('detail-main-cell');
                tr.appendChild(tdEmptyMain);
            }

            // Alt kategori hücresi
            if (rowData.subRowSpan > 0) {
                let mainKey = '';
                if (rowData.main === 'KAYNAĞIN TÜRÜNE GÖRE') mainKey = 'source';
                else if (rowData.main === 'HEDEFİN TÜRÜNE GÖRE') mainKey = 'target';
                else if (rowData.main === 'OLAYIN TÜRÜNE GÖRE') mainKey = 'event';

                const tdSub = document.createElement('td');
                tdSub.rowSpan = rowData.subRowSpan;
                tdSub.classList.add('detail-sub-cell');
                if (mainKey) {
                    tdSub.classList.add(`detail-sub-${mainKey}`);
                }

                // Bazı uzun başlıkları kontrollü satıra böl
                if (rowData.sub === 'Şahıs/Kamu Malına Yönelik') {
                    tdSub.innerHTML = 'Şahıs/Kamu<br>Malına Yönelik';
                } else if (rowData.sub === 'Kamu/Şahıs Malı') {
                    tdSub.innerHTML = 'Kamu/Şahıs<br>Malı';
                } else if (rowData.sub === 'Şahsa Yönelik') {
                    tdSub.innerHTML = 'Şahsa<br>Yönelik';
                } else if (rowData.sub === 'İslam’a Yönelik') {
                    tdSub.innerHTML = 'İslam’a<br>Yönelik';
                } else if (rowData.sub === 'İslam/Kutsal') {
                    tdSub.innerHTML = 'İslam/<br>Kutsal';
                } else {
                    tdSub.textContent = rowData.sub;
                }

                tr.appendChild(tdSub);
            } else if (!rowData.sub) {
                // Alt kategorisi olmayan satırlar için boş hücre ekle
                const tdEmptySub = document.createElement('td');
                tdEmptySub.classList.add('detail-sub-cell');
                tr.appendChild(tdEmptySub);
            }

            // Veri türü ve yıllar
            const tdFeature = document.createElement('td');
            tdFeature.innerHTML = `<strong>${rowData.feature}</strong>`;
            tr.appendChild(tdFeature);

            ['2021', '2022', '2023', '2024'].forEach(y => {
                const tdYear = document.createElement('td');
                tdYear.textContent = rowData.vals[y];
                tr.appendChild(tdYear);
            });

            tbody.appendChild(tr);
        });

        // Create Ranking Charts
        AppConfig.dom.panels.years.forEach((y) => {
            ChartManager.createRankingChartForDashboard(AppConfig.dom.charts.getRankingCanvasId(y), y, data.displayName);
        });

        UIManager.animatePanelEntrance();
    },

    populateDashboardExamples(data) {
        const years = ['2021', '2022', '2023', '2024'];

        // Critical Events
        const negDiv = document.getElementById('dash-neg-content');
        if (negDiv) {
            let html = '<div class="events-grid">';
            years.forEach(year => {
                const list = data.ozet && data.ozet[year];
                html += UIManager.createEventColumnHtml(year, list, 'negative');
            });
            html += '</div>';
            negDiv.innerHTML = html;
        }

        // Positive Events
        const posDiv = document.getElementById('dash-pos-content');
        if (posDiv) {
            let html = '<div class="events-grid">';
            years.forEach(year => {
                const list = data.pozet && data.pozet[year];
                html += UIManager.createEventColumnHtml(year, list, 'positive');
            });
            html += '</div>';
            posDiv.innerHTML = html;
        }
    },

    createEventColumnHtml(year, list, type) {
        const hasData = list && list.length > 0;
        const icon = AppConfig.icons[type][year] || '';

        return `
            <div class="event-column">
                <div class="event-header">
                    <span class="event-icon">${icon}</span>
                    <span class="event-year">${year}</span>
                </div>
                <div class="event-cards">
                    ${hasData ? list.map(item => `
                        <div class="event-card ${type}">
                            <div class="card-content">
                                ${type === 'positive' ? '<i class="fas fa-check" style="color:#10b981; margin-right:5px;"></i>' : ''} 
                                ${item}
                            </div>
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <i class="fas fa-thumbs-down"></i>
                            <p>Bu yıl için<br>kayıtlı örnek<br>bulunamadı</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    closeDashboardMode() {
        AppState.dashboardActive = false;
        AppState.selectedLayer = null;

        const panels = [
            AppConfig.dom.panels.pos,
            AppConfig.dom.panels.neg,
            ...AppConfig.dom.panels.years.reverse().map(y => AppConfig.dom.panels.getRankingId(y)),
            AppConfig.dom.panels.details,
            AppConfig.dom.panels.history,
            AppConfig.dom.panels.general
        ];

        panels.forEach((panelId, index) => {
            setTimeout(() => {
                const panel = document.getElementById(panelId);
                if (panel) {
                    panel.style.transition = 'all 0.4s ease-out';
                    panel.style.opacity = '0';
                    panel.style.transform = 'translateY(-20px) scale(0.95)';
                }
            }, index * 50);
        });

        setTimeout(() => {
            document.getElementById('dashboard-container').style.display = 'none';
            document.querySelectorAll('.dashboard-panel').forEach(p => {
                p.classList.remove('active');
                p.classList.remove('fullscreen');
                p.style.opacity = ''; p.style.transform = ''; p.style.transition = '';
            });

            // Odağı tekrar haritaya döndür
            const mapEl = document.getElementById('map');
            if (mapEl) {
                mapEl.focus?.();
            }
        }, panels.length * 50 + 400);

        AppState.map.flyTo([20, 0], 2, { duration: 1.5 });
        AppState.geoJsonLayer.eachLayer(l => AppState.geoJsonLayer.resetStyle(l));
        document.querySelectorAll('.chart-floating-label').forEach(el => el.remove());

        // Mobil cihazlarda R butonunu gizle
        const returnMapBtn = document.getElementById('return-map-btn');
        if (returnMapBtn) {
            returnMapBtn.classList.remove('active');
        }

        UIManager.showInfo('Haritaya dönüldü', 'Başka bir ülke seçmek için haritaya tıklayın.');
    },

    // Info Card Logic (Hover Tooltip)
    infoCardTimeout: null,

    showCountryInfoCard(event, feature) {
        if (UIManager.infoCardTimeout) clearTimeout(UIManager.infoCardTimeout);

        const infoCard = document.getElementById('country-info-card');
        if (!infoCard) return;

        const countryName = feature.properties.ADMIN || feature.properties.NAME || feature.properties.name;
        const normalizedKey = Utils.normalizeKey(countryName);
        const countryData = AppState.globalData[normalizedKey];

        let events2021 = 0, events2022 = 0, events2023 = 0, events2024 = 0;
        if (countryData && countryData.veriler) {
            events2021 = Utils.getLastValue(countryData.veriler['2021']);
            events2022 = Utils.getLastValue(countryData.veriler['2022']);
            events2023 = Utils.getLastValue(countryData.veriler['2023']);
            events2024 = Utils.getLastValue(countryData.veriler['2024']);
        }

        document.getElementById('info-card-country').textContent = countryName;
        document.getElementById('info-card-2021').textContent = events2021 > 0 ? events2021 : '-';
        document.getElementById('info-card-2022').textContent = events2022 > 0 ? events2022 : '-';
        document.getElementById('info-card-2023').textContent = events2023 > 0 ? events2023 : '-';
        document.getElementById('info-card-2024').textContent = events2024 > 0 ? events2024 : '-';

        const flagElement = document.getElementById('info-card-flag');
        if (countryData && countryData.bayrak) {
            flagElement.src = countryData.bayrak;
            flagElement.alt = countryName + ' bayrağı';
            flagElement.style.display = 'block';
        } else {
            flagElement.style.display = 'none';
        }

        const mouseX = event.originalEvent.clientX;
        const mouseY = event.originalEvent.clientY;
        const cardWidth = 260, cardHeight = 280, offsetX = 15, offsetY = 15;
        let posX = mouseX + offsetX, posY = mouseY + offsetY;

        if (posX + cardWidth > window.innerWidth) posX = mouseX - cardWidth - offsetX;
        if (posY + cardHeight > window.innerHeight) posY = mouseY - cardHeight - offsetY;

        infoCard.style.left = Math.max(10, posX) + 'px';
        infoCard.style.top = Math.max(10, posY) + 'px';

        UIManager.infoCardTimeout = setTimeout(() => {
            infoCard.style.display = 'block';
            infoCard.offsetHeight; // reflow
            infoCard.classList.add('visible');
        }, 200);
    },

    hideCountryInfoCard() {
        if (UIManager.infoCardTimeout) {
            clearTimeout(UIManager.infoCardTimeout);
            UIManager.infoCardTimeout = null;
        }
        const infoCard = document.getElementById('country-info-card');
        if (!infoCard) return;
        infoCard.classList.remove('visible');
        setTimeout(() => {
            if (!infoCard.classList.contains('visible')) infoCard.style.display = 'none';
        }, 300);
    },

    // Export using html2canvas
    async exportPanel(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = () => UIManager.exportPanelWithHtml2Canvas(panel, panelId);
            document.head.appendChild(script);
        } else {
            UIManager.exportPanelWithHtml2Canvas(panel, panelId);
        }
    },

    async exportPanelWithHtml2Canvas(panel, panelId) {
        const panelTitle = panel.querySelector('h3')?.textContent || panelId;

        let scrollableContent = panel.querySelector('.panel-content') || panel.querySelector('.compare-panel-body');
        const eventCards = panel.querySelectorAll('.event-cards');
        const originalStyles = {
            panel: {
                opacity: panel.style.opacity,
                transform: panel.style.transform,
                transition: panel.style.transition
            },
            scrollable: null,
            cards: []
        };

        panel.style.opacity = '1';
        panel.style.transform = 'none';
        panel.style.transition = 'none';

        if (scrollableContent) {
            originalStyles.scrollable = {
                height: scrollableContent.style.height,
                maxHeight: scrollableContent.style.maxHeight,
                overflow: scrollableContent.style.overflow
            };
            scrollableContent.scrollTop = 0;
            scrollableContent.style.height = 'auto';
            scrollableContent.style.maxHeight = 'none';
            scrollableContent.style.overflow = 'visible';
        }

        eventCards.forEach(card => {
            originalStyles.cards.push({
                el: card,
                height: card.style.height,
                maxHeight: card.style.maxHeight,
                overflow: card.style.overflow
            });
            card.scrollTop = 0;
            card.style.height = 'auto';
            card.style.maxHeight = 'none';
            card.style.overflow = 'visible';
        });

        await new Promise(resolve => setTimeout(resolve, 150));

        // Export sırasında dikey yazıların html2canvas'ta bozulmaması için
        // geçici olarak yatay moda alıyoruz.
        document.body.classList.add('panel-export-mode');

        const canvas = await html2canvas(panel, {
            backgroundColor: AppConfig.colors.background,
            scale: 2,
            useCORS: true,
            allowTaint: true,
            scrollY: -window.scrollY,
            windowHeight: panel.scrollHeight + 100
        });

        document.body.classList.remove('panel-export-mode');

        // Orijinal stilleri geri yükle
        panel.style.opacity = originalStyles.panel.opacity;
        panel.style.transform = originalStyles.panel.transform;
        panel.style.transition = originalStyles.panel.transition;

        if (scrollableContent && originalStyles.scrollable) {
            scrollableContent.style.height = originalStyles.scrollable.height;
            scrollableContent.style.maxHeight = originalStyles.scrollable.maxHeight;
            scrollableContent.style.overflow = originalStyles.scrollable.overflow;
        }

        originalStyles.cards.forEach(({ el, height, maxHeight, overflow }) => {
            el.style.height = height;
            el.style.maxHeight = maxHeight;
            el.style.overflow = overflow;
        });

        const link = document.createElement('a');
        link.download = `${panelTitle.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();

        // Revert styles would be needed here strictly, but usually user interaction resets/closes panel eventually.
        // Or we can reload styling logic. For now assuming panel state reset isn't critical or is complex.
        // Actually we should restore, but simply closing and reopening fixes it.
    },

    // --- Country Comparison UI ---

    updateCompareSelection() {
        const listEl = document.getElementById('compare-selected-list');
        const showBtn = document.getElementById('compare-show-btn');

        if (!listEl || !showBtn) return;

        // Clear list
        listEl.innerHTML = '';

        // Add selected countries
        CompareState.selectedCountries.forEach((country, index) => {
            const tag = document.createElement('div');
            tag.className = 'compare-country-tag';
            tag.style.borderColor = country.color;

            let flagHTML = '';
            if (country.data && country.data.bayrak) {
                flagHTML = `<img src="${country.data.bayrak}" alt="${country.name}" class="compare-country-flag">`;
            }

            tag.innerHTML = `
                ${flagHTML}
                <span>${country.name}</span>
                <button class="compare-country-remove" onclick="MapManager.removeCountryFromCompare(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;

            listEl.appendChild(tag);
        });

        // Enable/disable show button
        showBtn.disabled = CompareState.selectedCountries.length < 2;
    },

    populateComparisonPanel() {
        // Create legend
        const legendEl = document.getElementById('compare-countries-legend');
        legendEl.innerHTML = '';

        CompareState.selectedCountries.forEach(country => {
            const item = document.createElement('div');
            item.className = 'compare-legend-item';

            let flagHTML = '';
            if (country.data && country.data.bayrak) {
                flagHTML = `<img src="${country.data.bayrak}" alt="${country.name}" class="compare-country-flag">`;
            }

            item.innerHTML = `
                ${flagHTML}
                <div class="compare-legend-color" style="background: ${country.color};"></div>
                <span>${country.name}</span>
            `;

            legendEl.appendChild(item);
        });

        // Create chart
        ChartManager.createComparisonChart();

        // Create stats table
        UIManager.createComparisonStats();
    },

    createComparisonStats() {
        const statsEl = document.getElementById('compare-stats-table');
        statsEl.innerHTML = '';

        // Calculate totals
        const totals = CompareState.selectedCountries.map(country => {
            if (!country.data || !country.data.veriler) return 0;

            const events2021 = Utils.getLastValue(country.data.veriler['2021']);
            const events2022 = Utils.getLastValue(country.data.veriler['2022']);
            const events2023 = Utils.getLastValue(country.data.veriler['2023']);
            const events2024 = Utils.getLastValue(country.data.veriler['2024']);

            return events2021 + events2022 + events2023 + events2024;
        });

        const totalRow = document.createElement('div');
        totalRow.className = 'compare-stats-row';
        totalRow.innerHTML = `
            <span class="compare-stats-label">TOPLAM OLAY SAYISI (2021-2024)</span>
            <div class="compare-stats-values">
                ${CompareState.selectedCountries.map((c, i) =>
            `<span class="compare-stats-value" style="color: ${c.color};">${totals[i]}</span>`
        ).join('')}
            </div>
        `;
        statsEl.appendChild(totalRow);

        // Find max
        const maxTotal = Math.max(...totals);
        const maxCountryIndex = totals.indexOf(maxTotal);
        const maxCountry = CompareState.selectedCountries[maxCountryIndex];

        // Differences
        const diffRow = document.createElement('div');
        diffRow.className = 'compare-stats-row';
        diffRow.innerHTML = `
            <span class="compare-stats-label">EN YÜKSEK: ${maxCountry.name}</span>
            <div class="compare-stats-values">
                ${CompareState.selectedCountries.map((c, i) => {
            if (i === maxCountryIndex) {
                return `<span class="compare-stats-value" style="color: ${c.color};">-</span>`;
            }
            const diff = maxTotal - totals[i];
            return `<span class="compare-stats-value" style="color: ${c.color};">-${diff}</span>`;
        }).join('')}
            </div>
        `;
        statsEl.appendChild(diffRow);
    },

    // ============================================
    // ANALİZ MODU FONKSİYONLARI
    // ============================================

    openAnalysisModal() {
        const modal = document.getElementById('analysis-modal');
        if (!modal) return;

        AppState.analysisModalOpen = true;
        modal.style.display = 'flex';

        // Filtre dropdown'ını doldur (veriler_2021.xlsx'ten B-Z sütunları)
        UIManager.populateAnalysisFilter();

        // Varsayılan olarak 2023 yılı ve ilk metrik seçili
        if (!AppState.analysisMetric && AppState.orderedHeaders.length > 0) {
            AppState.analysisMetric = AppState.orderedHeaders[0];
            const select = document.getElementById('analysis-metric-select');
            if (select) select.value = AppState.analysisMetric;
        }

        // Yıl butonlarını aktif hale getir
        UIManager.updateYearButtons();

        // Balonları render et
        if (AppState.analysisMetric) {
            UIManager.renderAnalysisBubbles();
        }
    },

    closeAnalysisModal() {
        const modal = document.getElementById('analysis-modal');
        if (!modal) return;

        AppState.analysisModalOpen = false;
        modal.style.display = 'none';
    },

    populateAnalysisFilter() {
        const select = document.getElementById('analysis-metric-select');
        if (!select || !AppState.orderedHeaders || AppState.orderedHeaders.length === 0) return;

        select.innerHTML = '<option value="">-- Veri Türü Seçin --</option>';

        // B-Z sütunlarından başlıkları al (ülke sütununu atla)
        AppState.orderedHeaders.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            select.appendChild(option);
        });

        // Change event listener
        select.addEventListener('change', (e) => {
            AppState.analysisMetric = e.target.value;
            if (AppState.analysisMetric) {
                UIManager.renderAnalysisBubbles();
            } else {
                const container = document.getElementById('analysis-bubbles-container');
                if (container) container.innerHTML = '';
            }
        });
    },

    updateYearButtons() {
        ['2021', '2022', '2023', '2024'].forEach(year => {
            const btn = document.getElementById(`year-btn-${year}`);
            if (btn) {
                if (year === AppState.analysisYear) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    },

    renderAnalysisBubbles() {
        const container = document.getElementById('analysis-bubbles-container');
        const legend = document.getElementById('analysis-legend');
        if (!container || !AppState.analysisMetric) return;

        container.innerHTML = '';

        // Tüm ülkeleri topla ve değerleri hesapla
        const countriesData = [];
        let maxValue = 0;

        Object.values(AppState.globalData).forEach(country => {
            if (!country.veriler || !country.veriler[AppState.analysisYear]) return;

            const value = country.veriler[AppState.analysisYear][AppState.analysisMetric];
            if (value === undefined || value === null || value === '-' || value === '') return;

            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue <= 0) return;

            countriesData.push({
                name: country.displayName,
                value: numValue,
                continent: country.continent || 'Diğer'
            });

            if (numValue > maxValue) maxValue = numValue;
        });

        if (countriesData.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; width: 100%;">Bu yıl için seçilen veri türünde veri bulunamadı.</p>';
            return;
        }

        // Değere göre büyükten küçüğe sırala (büyük balonlar önce yerleşsin)
        countriesData.sort((a, b) => b.value - a.value);

        // Balonları güzel bir şekilde yerleştirmek için pozisyonları hesapla
        const positions = UIManager.calculateBubblePositions(countriesData, maxValue);

        // Balonları oluştur ve render et
        countriesData.forEach((country, index) => {
            const bubbleWrapper = document.createElement('div');
            bubbleWrapper.style.display = 'flex';
            bubbleWrapper.style.flexDirection = 'column';
            bubbleWrapper.style.alignItems = 'center';
            bubbleWrapper.style.gap = '8px';

            const bubble = document.createElement('div');
            bubble.className = 'country-bubble';

            // Boyut hesapla (büyük değerler çok daha belirgin olsun)
            // Küçük değerler küçük kalsın, büyük değerler çok daha büyük olsun
            const normalizedValue = country.value / maxValue;
            // Güçlendirilmiş scaling: küçük değerler için daha yavaş, büyük değerler için çok hızlı büyüme
            const scale = 0.4 + (Math.pow(normalizedValue, 0.6) * 3.2);
            const size = Math.max(55, Math.min(280, scale * 75)); // Min 55px, Max 280px - büyük balonlar daha belirgin

            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.fontSize = `${Math.max(10, size / 8)}px`;

            // Renk (kıtaya göre)
            const continentColor = AppConfig.continentColors[country.continent] || '#6b7280';
            bubble.style.background = continentColor;

            bubble.textContent = country.name;
            bubble.title = `${country.name}: ${country.value}`;

            // Veri değerini altına ekle
            const valueLabel = document.createElement('div');
            valueLabel.style.color = 'var(--text-secondary)';
            valueLabel.style.fontSize = '12px';
            valueLabel.style.fontWeight = 'var(--weight-medium)';
            valueLabel.style.marginTop = '4px';
            valueLabel.textContent = country.value;

            bubbleWrapper.appendChild(bubble);
            bubbleWrapper.appendChild(valueLabel);

            // Pozisyonu uygula (absolute positioning) - SADECE DESKTOP'TA
            // Mobilde (768px ve altı) CSS Grid kullanılacak
            if (positions[index] && window.innerWidth > 768) {
                bubbleWrapper.style.position = 'absolute';
                bubbleWrapper.style.left = `${positions[index].x}px`;
                bubbleWrapper.style.top = `${positions[index].y}px`;
                bubbleWrapper.style.transform = 'translate(-50%, -50%)';
            }

            container.appendChild(bubbleWrapper);
        });

        // Legend oluştur
        UIManager.renderAnalysisLegend();
    },

    calculateBubblePositions(countriesData, maxValue) {
        const positions = [];
        const container = document.getElementById('analysis-bubbles-container');
        if (!container) return positions;

        // MOBİL KONTROLÜ: 768px ve altında CSS Grid kullan, pozisyon hesaplama
        if (window.innerWidth <= 768) {
            // Mobilde pozisyon hesaplama yapma, CSS Grid'e bırak
            return positions; // Boş array döndür
        }

        // Container'ın gerçek boyutlarını al (padding dahil)
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;

        // Kullanılabilir alan (padding hariç)
        const padding = 40;
        const availableWidth = containerWidth - (padding * 2);
        const availableHeight = containerHeight - (padding * 2);

        // Kullanılan pozisyonları takip et (çakışma kontrolü için)
        const usedPositions = [];

        // Önce tüm balonların boyutlarını hesapla
        const bubbles = countriesData.map((country, index) => {
            const normalizedValue = country.value / maxValue;
            const scale = 0.4 + (Math.pow(normalizedValue, 0.6) * 3.2);
            const size = Math.max(55, Math.min(280, scale * 75));
            const radius = size / 2;
            return { country, index, radius, size, normalizedValue };
        });

        // Büyükten küçüğe sırala (büyükler önce yerleşsin)
        bubbles.sort((a, b) => b.normalizedValue - a.normalizedValue);

        bubbles.forEach((bubble, idx) => {
            const { radius, country } = bubble;
            let x, y;
            let attempts = 0;
            const maxAttempts = 500;
            let found = false;

            // İlk birkaç büyük balon için farklı stratejiler dene
            if (idx === 0) {
                // En büyük balon: üst-orta bölgeye
                x = padding + availableWidth * 0.5;
                y = padding + availableHeight * 0.2;
            } else if (idx === 1) {
                // İkinci büyük: alt-orta bölgeye
                x = padding + availableWidth * 0.5;
                y = padding + availableHeight * 0.7;
            } else if (idx === 2) {
                // Üçüncü büyük: sol-orta
                x = padding + availableWidth * 0.25;
                y = padding + availableHeight * 0.5;
            } else if (idx === 3) {
                // Dördüncü büyük: sağ-orta
                x = padding + availableWidth * 0.75;
                y = padding + availableHeight * 0.5;
            } else {
                // Diğer balonlar için rastgele başlangıç pozisyonu
                x = padding + Math.random() * availableWidth;
                y = padding + Math.random() * availableHeight;
            }

            // Çakışma kontrolü ve yerleşim
            while (attempts < maxAttempts && !found) {
                let collision = false;

                // Mevcut pozisyonlarla çakışma kontrolü
                for (const used of usedPositions) {
                    const dx = x - used.x;
                    const dy = y - used.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = radius + used.radius + 15; // Minimum mesafe

                    if (distance < minDistance) {
                        collision = true;
                        // Çakışma varsa uzaklaştır
                        if (distance > 0) {
                            const pushAngle = Math.atan2(dy, dx);
                            const pushDistance = minDistance - distance + 5;
                            x = used.x + Math.cos(pushAngle) * minDistance;
                            y = used.y + Math.sin(pushAngle) * minDistance;
                        } else {
                            // Tam üst üste binmişse rastgele yön ver
                            const randomAngle = Math.random() * Math.PI * 2;
                            x = used.x + Math.cos(randomAngle) * minDistance;
                            y = used.y + Math.sin(randomAngle) * minDistance;
                        }
                        break;
                    }
                }

                // Sınır kontrolü
                if (x < padding + radius) x = padding + radius;
                if (x > containerWidth - padding - radius) x = containerWidth - padding - radius;
                if (y < padding + radius) y = padding + radius;
                if (y > containerHeight - padding - radius) y = containerHeight - padding - radius;

                // Çakışma yoksa yerleştir
                if (!collision) {
                    found = true;
                } else {
                    attempts++;
                    // Çakışma devam ederse yeni bir rastgele pozisyon dene
                    if (attempts < maxAttempts) {
                        x = padding + Math.random() * availableWidth;
                        y = padding + Math.random() * availableHeight;
                    }
                }
            }

            // Son çare: grid-based yerleşim
            if (!found) {
                const gridCols = Math.ceil(Math.sqrt(countriesData.length));
                const gridRows = Math.ceil(countriesData.length / gridCols);
                const cellWidth = availableWidth / gridCols;
                const cellHeight = availableHeight / gridRows;
                const gridX = (idx % gridCols) * cellWidth + cellWidth / 2 + padding;
                const gridY = Math.floor(idx / gridCols) * cellHeight + cellHeight / 2 + padding;
                x = Math.max(padding + radius, Math.min(containerWidth - padding - radius, gridX));
                y = Math.max(padding + radius, Math.min(containerHeight - padding - radius, gridY));
            }

            positions[bubble.index] = { x, y };
            usedPositions.push({ x, y, radius });
        });

        return positions;
    },

    renderAnalysisLegend() {
        const legend = document.getElementById('analysis-legend');
        if (!legend) return;

        legend.innerHTML = '';

        Object.entries(AppConfig.continentColors).forEach(([continent, color]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.background = color;

            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = continent;

            item.appendChild(colorBox);
            item.appendChild(label);
            legend.appendChild(item);
        });
    },

    // ============================================
    // SLAYT / 4 YILLIK KÜRESEL ANALİZ MODU (S BUTONU)
    // ============================================

    openStoryModal() {
        const modal = document.getElementById('story-modal');
        if (!modal) return;

        AppState.storyModalOpen = true;
        modal.style.display = 'flex';

        // Büyük resim kartlarını doldur
        UIManager.renderStoryOverview();
        // Sayıları animasyonlu göster
        UIManager.animateStoryNumbers();

        // Trend grafiği
        UIManager.renderStoryTrendChart();

        // En yüksek olay sayısı listeleri
        UIManager.renderStoryTopCountries();
    },

    closeStoryModal() {
        const modal = document.getElementById('story-modal');
        if (!modal) return;

        AppState.storyModalOpen = false;
        modal.style.display = 'none';
    },

    renderStoryOverview() {
        const totals = AppState.globalYearTotals || {};
        const t2021 = Math.round(totals['2021'] || 0);
        const t2022 = Math.round(totals['2022'] || 0);
        const t2023 = Math.round(totals['2023'] || 0);
        const t2024 = Math.round(totals['2024'] || 0);
        const totalAll = t2021 + t2022 + t2023 + t2024;

        const n2021 = document.getElementById('story-total-2021');
        const n2022 = document.getElementById('story-total-2022');
        const n2023 = document.getElementById('story-total-2023');
        const n2024 = document.getElementById('story-total-2024');
        const nAll = document.getElementById('story-total-all');

        // Hedef değerleri dataset'e yaz, animasyon fonksiyonu buradan okuyacak
        if (n2021) {
            n2021.dataset.target = t2021 || 0;
            n2021.textContent = '0';
        }
        if (n2022) {
            n2022.dataset.target = t2022 || 0;
            n2022.textContent = '0';
        }
        if (n2023) {
            n2023.dataset.target = t2023 || 0;
            n2023.textContent = '0';
        }
        if (n2024) {
            n2024.dataset.target = t2024 || 0;
            n2024.textContent = '0';
        }
        if (nAll) {
            nAll.dataset.target = totalAll || 0;
            nAll.textContent = '0';
        }

        // Kritik artış metni: 2021 → 2024 yüzdesi (varsa)
        const criticalEl = document.getElementById('story-critical-text');
        if (criticalEl && t2021 > 0 && t2024 > 0) {
            const change = ((t2024 - t2021) / t2021) * 100;
            const rounded = Math.round(change * 10) / 10;
            criticalEl.innerHTML = `2021'den 2024'e <strong>%${rounded}</strong> değişim gözlemlendi. 
Bu, İslamofobik olayların dört yıllık eğilimini özetlemektedir.`;
        }
    },

    animateStoryNumbers() {
        const elements = document.querySelectorAll('.story-stat-number');
        elements.forEach(el => {
            const target = parseFloat(el.dataset.target);
            if (!target || target <= 0) {
                el.textContent = target ? target.toLocaleString('tr-TR') : '-';
                return;
            }

            const duration = 1400;
            const startTime = performance.now();

            const step = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                const value = Math.floor(target * progress);
                el.textContent = value.toLocaleString('tr-TR');
                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            };

            requestAnimationFrame(step);
        });
    },

    renderStoryTrendChart() {
        const ctx = document.getElementById('story-trend-chart');
        if (!ctx || !window.Chart) return;

        const totals = AppState.globalYearTotals || {};
        const data = [
            totals['2021'] || 0,
            totals['2022'] || 0,
            totals['2023'] || 0,
            totals['2024'] || 0
        ];

        // Eski grafik varsa temizle
        if (AppState.chartInstances['story-trend']) {
            AppState.chartInstances['story-trend'].destroy();
        }

        // Gradient oluştur (Kırmızı ağırlıklı)
        const ctx2d = ctx.getContext('2d');
        const gradient = ctx2d.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)');  // Koyu Kırmızı
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)'); // Şeffaf Kırmızı

        AppState.chartInstances['story-trend'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2021', '2022', '2023', '2024'],
                datasets: [{
                    label: 'Yıllık Toplam Olay Sayısı',
                    data,
                    borderColor: '#ef4444',
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: (context) => {
                        const val = context.dataset.data[context.dataIndex];
                        const max = Math.max(...context.dataset.data);
                        return (val / (max || 1)) > 0.8 ? '#b91c1c' : '#f87171';
                    },
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e5e7eb',
                            font: { weight: 'bold' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#ef4444',
                        padding: 12,
                        cornerRadius: 10
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9ca3af', font: { weight: '600' } },
                        grid: { color: 'rgba(55, 65, 81, 0.3)' }
                    },
                    y: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(55, 65, 81, 0.2)' },
                        beginAtZero: true
                    }
                }
            }
        });
    },

    renderStoryTopCountries() {
        // Her yıl için, veriler_20xx.xlsx dosyalarından alınan Z sütununa (son sütun) göre en yüksek ülkeleri bul
        const years = ['2021', '2022', '2023', '2024'];

        years.forEach(year => {
            const container = document.getElementById(`story-top-${year}`);
            if (!container) return;

            const items = [];

            Object.values(AppState.globalData).forEach(country => {
                if (!country.veriler || !country.veriler[year]) return;

                const yearData = country.veriler[year];
                const headers = Object.keys(yearData);

                // Z sütununu yakalamak için son başlığı kullan (A: ülke, B–Z: veriler)
                if (headers.length <= 1) return;

                const zHeader = headers[headers.length - 1];
                const rawVal = yearData[zHeader];
                const numVal = parseFloat(rawVal);
                if (isNaN(numVal) || numVal <= 0) return;

                items.push({
                    name: country.displayName,
                    value: numVal
                });
            });

            // Değere göre azalan sırala ve ilk birkaç tanesini al
            items.sort((a, b) => b.value - a.value);
            const topItems = items.slice(0, 8);

            container.innerHTML = '';
            topItems.forEach((item, idx) => {
                const row = document.createElement('div');
                row.className = 'story-country-item';
                row.innerHTML = `
                    <div class="story-country-name">#${idx + 1} ${item.name}</div>
                    <div class="story-country-value">${item.value.toLocaleString('tr-TR')}</div>
                `;
                container.appendChild(row);
            });
        });
    }
};

console.log('🎨 UI Manager loaded');
