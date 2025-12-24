/**
 * Chart Manager
 * Wrapper around Chart.js for creating and managing charts.
 */

const ChartManager = {

    createChart(canvasId, type, dataConfig, isMini = false, isRanking = false) {
        try {
            const ctx = document.getElementById(canvasId);
            if (!ctx) return;
            if (AppState.chartInstances[canvasId]) AppState.chartInstances[canvasId].destroy();

            // Modern Chart Defaults
            Chart.defaults.color = AppConfig.colors.text;
            Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
            Chart.defaults.font.family = "'Manrope', sans-serif";
            Chart.defaults.font.weight = '600';

            // Safe plugin usage
            let plugins = [];
            if (isMini && typeof ChartDataLabels !== 'undefined') {
                plugins.push(ChartDataLabels);
            }

            const dataLabelsConfig = isMini ? {
                anchor: 'end',
                align: 'start',
                color: '#fafafa',
                font: { family: "'Manrope', sans-serif", weight: '800', size: 13 },
                offset: 4
            } : false;

            AppState.chartInstances[canvasId] = new Chart(ctx, {
                type: type,
                data: dataConfig,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: { left: 10, right: 10, top: 5, bottom: 5 }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart',
                        delay: (context) => context.dataIndex * 50
                    },
                    plugins: {
                        legend: {
                            display: !isMini && !isRanking,
                            position: 'top',
                            align: 'start',
                            labels: {
                                color: '#a1a1aa',
                                font: { family: "'Manrope', sans-serif", size: 12, weight: '500' },
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                generateLabels: function (chart) {
                                    const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                    const labels = original.call(this, chart);
                                    labels.forEach(label => {
                                        label.fillStyle = label.strokeStyle || label.fillStyle;
                                        label.strokeStyle = 'transparent';
                                    });
                                    return labels;
                                }
                            },
                            onClick: function (e, legendItem, legend) {
                                const index = legendItem.datasetIndex;
                                const ci = legend.chart;
                                const meta = ci.getDatasetMeta(index);
                                meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                                ci.update();
                            },
                            onHover: function (e, legendItem, legend) {
                                e.native.target.style.cursor = 'pointer';
                            },
                            onLeave: function (e, legendItem, legend) {
                                e.native.target.style.cursor = 'default';
                            }
                        },
                        datalabels: dataLabelsConfig,
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(10, 10, 15, 0.95)',
                            titleColor: '#f8fafc',
                            bodyColor: '#cbd5e1',
                            borderColor: 'rgba(139, 92, 246, 0.5)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                display: isRanking ? false : !isMini,
                                color: '#94a3b8',
                                font: { size: 12 },
                                padding: 5
                            },
                            grid: {
                                display: false,
                                drawBorder: false
                            },
                            border: { display: false }
                        },
                        x: {
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 10, family: "'Manrope', sans-serif", weight: '600' },
                                maxRotation: 45,
                                minRotation: 45,
                                autoSkip: true,
                                maxTicksLimit: 15,
                                padding: 5
                            },
                            grid: { display: false },
                            border: { display: false }
                        }
                    }
                },
                plugins: plugins
            });
        } catch (error) {
            console.error('Error creating chart:', canvasId, error);
        }
    },

    updateTheme(isLight) {
        try {
            const textColor = isLight ? '#09090b' : '#fafafa';
            const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';

            Chart.defaults.color = textColor;
            Chart.defaults.borderColor = gridColor;

            Object.values(AppState.chartInstances).forEach(chart => {
                if (!chart || !chart.options) return;

                if (chart.options.scales && chart.options.scales.x) {
                    chart.options.scales.x.ticks.color = isLight ? '#52525b' : '#a1a1aa';
                }
                if (chart.options.scales && chart.options.scales.y) {
                    chart.options.scales.y.ticks.color = isLight ? '#52525b' : '#a1a1aa';
                }
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.labels.color = textColor;
                }
                chart.update();
            });
        } catch (error) {
            console.error('Error updating theme:', error);
        }
    },

    createRankingChartForDashboard(canvasId, year, currentCountryName, showAll = false) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const parent = canvas.parentElement;
            const oldLabel = parent.querySelector('.chart-floating-label');
            if (oldLabel) oldLabel.remove();

            if (AppState.chartInstances[canvasId]) {
                AppState.chartInstances[canvasId].destroy();
            }

            const countries = [];
            Object.values(AppState.globalData).forEach(d => {
                if (d.veriler && d.veriler[year]) {
                    countries.push({
                        name: d.displayName,
                        value: Utils.getLastValue(d.veriler[year]),
                        isCurrent: d.displayName === currentCountryName
                    });
                }
            });

            // Sort descending
            countries.sort((a, b) => b.value - a.value);

            // Calculate Ranks
            let fullSortedData = countries.map((c, index) => ({ ...c, rank: index + 1 }));

            // LIMIT DATA if not showing all
            let chartData = showAll ? fullSortedData : fullSortedData.slice(0, 20);

            const currentCountryData = fullSortedData.find(c => c.isCurrent);

            // Gradient oluştur
            const ctx = canvas.getContext('2d');
            const gradientRed = ctx.createLinearGradient(0, 0, 0, 400);
            gradientRed.addColorStop(0, '#ef4444');
            gradientRed.addColorStop(1, '#7f1d1d');

            const gradientPurple = ctx.createLinearGradient(0, 0, 0, 400);
            gradientPurple.addColorStop(0, '#8b5cf6');
            gradientPurple.addColorStop(1, '#4c1d95');

            AppState.chartInstances[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: chartData.map(c => c.name),
                    datasets: [{
                        label: 'Olay Sayısı',
                        data: chartData.map(c => c.value),
                        backgroundColor: chartData.map(c => c.isCurrent ? gradientPurple : gradientRed),
                        hoverBackgroundColor: chartData.map(c => c.isCurrent ? '#a78bfa' : '#f87171'),
                        borderWidth: 0,
                        borderRadius: 4,
                        barThickness: 'flex',
                        maxBarThickness: 30,
                        shadowOffsetX: 0, shadowOffsetY: 0, shadowBlur: 12, shadowColor: 'rgba(255, 0, 60, 0.4)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: true },
                    layout: { padding: { left: 5, right: 5, top: 5, bottom: 20 } }, /* Bottom padding increased for labels */
                    animation: {
                        duration: 1200,
                        easing: 'easeOutElastic',
                        delay: (context) => context.dataIndex * 30
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(10, 10, 15, 0.98)',
                            titleColor: '#8b5cf6',
                            bodyColor: '#e2e8f0',
                            borderColor: '#8b5cf6',
                            borderWidth: 2,
                            cornerRadius: 12,
                            padding: 16,
                            displayColors: false,
                            titleFont: { size: 15, weight: 'bold', family: 'JetBrains Mono' },
                            bodyFont: { size: 14, family: 'JetBrains Mono' },
                            callbacks: {
                                title: function (context) {
                                    const index = context[0].dataIndex;
                                    return `🏆 #${chartData[index].rank} - ${chartData[index].name}`;
                                },
                                label: function (context) {
                                    return `${context.parsed.y} olay`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { display: false, beginAtZero: true },
                        x: {
                            display: true,
                            ticks: {
                                color: '#a1a1aa',
                                font: { size: 10, family: "'Manrope', sans-serif", weight: '600' },
                                maxRotation: 45,
                                minRotation: 45,
                                autoSkip: false /* Ensure all labels are shown */
                            },
                            grid: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });

            const labelDiv = document.createElement('div');
            labelDiv.className = 'chart-floating-label';

            if (currentCountryData) {
                labelDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; font-family: 'Manrope', sans-serif;">
                        <span style="font-size: 20px; font-weight: 800; color: #ef4444;">#${currentCountryData.rank}</span>
                        <span style="font-size: 16px; font-weight: 700; color: #fafafa;">${currentCountryData.value} <span style="font-size: 13px; color: #a1a1aa; font-weight: 500;">Olay</span></span>
                    </div>
                `;
            } else {
                labelDiv.innerHTML = `<div style="font-size: 16px; color: #666;">VERİ YOK</div>`;
            }
            parent.appendChild(labelDiv);
        } catch (error) {
            console.error('Error creating ranking chart:', error);
        }
    },

    clearRankingChart(canvasId, year) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const parent = canvas.parentElement;

        if (AppState.chartInstances[canvasId]) {
            AppState.chartInstances[canvasId].destroy();
            delete AppState.chartInstances[canvasId];
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const oldLabel = parent.querySelector('.chart-floating-label');
        if (oldLabel) oldLabel.remove();

        const labelDiv = document.createElement('div');
        labelDiv.className = 'chart-floating-label';
        labelDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 16px; font-weight: bold; color: #a1a1aa; font-family: 'Manrope', sans-serif; margin-bottom: 6px;">VERİ YOK</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 5px;">${year} Yılı</div>
            </div>
        `;
        parent.appendChild(labelDiv);
    },

    createComparisonChart() {
        try {
            const ctx = document.getElementById('compare-chart');
            if (!ctx) return;

            // Destroy existing chart
            if (AppState.chartInstances['compare-chart']) {
                AppState.chartInstances['compare-chart'].destroy();
            }

            // Prepare datasets
            const datasets = CompareState.selectedCountries.map(country => {
                const events2021 = country.data && country.data.veriler ? Utils.getLastValue(country.data.veriler['2021']) : 0;
                const events2022 = country.data && country.data.veriler ? Utils.getLastValue(country.data.veriler['2022']) : 0;
                const events2023 = country.data && country.data.veriler ? Utils.getLastValue(country.data.veriler['2023']) : 0;
                const events2024 = country.data && country.data.veriler ? Utils.getLastValue(country.data.veriler['2024']) : 0;

                return {
                    label: country.name,
                    data: [events2021, events2022, events2023, events2024],
                    backgroundColor: country.color,
                    borderRadius: 6,
                    borderSkipped: false
                };
            });

            // Create chart
            AppState.chartInstances['compare-chart'] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['2021', '2022', '2023', '2024'],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2.5,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: 'rgba(139, 92, 246, 0.5)',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: true
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#cbd5e1',
                                font: {
                                    size: 14,
                                    weight: 600
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#cbd5e1',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        } catch (error) {
            console.error('Error creating comparison chart:', error);
        }
    },

    // highlightHistoryChartYear: Timeline tabanlı bar vurgulama özelliği kaldırıldı,

    exportChart(canvasId, filename) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with ID '${canvasId}' not found`);
            if (window.UIManager) UIManager.showError('Export Hatası', 'Grafik bulunamadı.');
            return;
        }

        try {
            const link = document.createElement('a');
            const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
            link.download = fileName;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (error) {
            console.error('Export error:', error);
            if (window.UIManager) UIManager.showError('Export Hatası', 'Grafik indirilemedi.');
        }
    }
};

console.log('Chart Manager loaded');
