/**
 * 天气和潮汐数据模块
 * 负责获取、处理和展示天气和潮汐数据
 */

const weatherModule = {
    // 当前位置信息
    currentLocation: {
        name: '青岛市, 中国',
        coordinates: [36.0671, 120.3826] // 默认坐标（青岛）
    },
    
    // 天气数据
    weatherData: {
        temperature: 23,
        condition: '晴朗',
        windSpeed: 3.2,
        humidity: 65
    },
    
    // 潮汐数据
    tideData: {
        today: [
            1.2, 1.0, 0.8, 0.5, 0.3, 0.2, 0.4, 0.8, 1.3, 1.8, 2.1, 2.2,
            2.0, 1.7, 1.3, 0.9, 0.6, 0.4, 0.3, 0.5, 0.9, 1.4, 1.8, 1.5
        ],
        tomorrow: [
            1.5, 1.3, 1.1, 0.8, 0.5, 0.3, 0.5, 1.0, 1.5, 2.0, 2.3, 2.4,
            2.2, 1.9, 1.5, 1.1, 0.8, 0.5, 0.4, 0.6, 1.1, 1.6, 2.0, 1.7
        ]
    },
    
    // 图表实例
    tideChart: null,
    
    /**
     * 初始化天气模块
     */
    init() {
        this.setupTideChart();
        this.setupEventListeners();
        this.updateWeatherDisplay();
    },
    
    /**
     * 设置潮汐图表
     */
    setupTideChart() {
        const tideChartCtx = document.getElementById('tide-chart').getContext('2d');
        
        // 生成24小时的时间标签
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        
        this.tideChart = new Chart(tideChartCtx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: '潮汐高度 (米)',
                    data: this.tideData.today,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#0066cc',
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 潮汐图表标签切换
        const tideTabs = document.querySelectorAll('[data-tide]');
        tideTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tideTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateTideChart(tab.dataset.tide);
            });
        });
        
        // 刷新天气按钮
        const refreshWeatherBtn = document.querySelector('#dashboard-page button.text-primary');
        if (refreshWeatherBtn) {
            refreshWeatherBtn.addEventListener('click', () => {
                this.refreshWeatherData();
            });
        }
    },
    
    /**
     * 更新潮汐图表数据
     * @param {string} period - 'today' 或 'tomorrow'
     */
    updateTideChart(period) {
        if (this.tideChart && this.tideData[period]) {
            this.tideChart.data.datasets[0].data = this.tideData[period];
            this.tideChart.update();
        }
    },
    
    /**
     * 更新天气显示
     */
    updateWeatherDisplay() {
        const { temperature, condition, windSpeed, humidity } = this.weatherData;
        
        // 更新DOM元素
        const tempElement = document.querySelector('#dashboard-page .text-2xl.font-bold');
        const conditionElement = tempElement?.nextElementSibling;
        const statsElements = document.querySelectorAll('#dashboard-page .grid.grid-cols-2 .font-semibold');
        
        if (tempElement) tempElement.textContent = `${temperature}°C`;
        if (conditionElement) conditionElement.textContent = condition;
        if (statsElements.length > 0) statsElements[0].textContent = `${windSpeed} m/s`;
        if (statsElements.length > 1) statsElements[1].textContent = `${humidity}%`;
    },
    
    /**
     * 刷新天气数据
     * 模拟从API获取新数据
     */
    refreshWeatherData() {
        // 显示加载状态
        const refreshBtn = document.querySelector('#dashboard-page button.text-primary');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> 刷新中...';
            refreshBtn.disabled = true;
            
            // 模拟API请求延迟
            setTimeout(() => {
                // 随机生成新的天气数据
                this.weatherData = {
                    temperature: Math.floor(Math.random() * 15) + 15, // 15-29°C
                    condition: this.getRandomWeatherCondition(),
                    windSpeed: (Math.random() * 5 + 1).toFixed(1), // 1-6 m/s
                    humidity: Math.floor(Math.random() * 40) + 40 // 40-79%
                };
                
                // 更新显示
                this.updateWeatherDisplay();
                
                // 恢复按钮状态
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
                
                // 显示成功提示
                this.showNotification('天气数据已更新');
            }, 1000);
        }
    },
    
    /**
     * 获取随机天气状况
     * @returns {string} 天气状况
     */
    getRandomWeatherCondition() {
        const conditions = ['晴朗', '多云', '阴天', '小雨', '中雨', '大雨', '雷阵雨'];
        return conditions[Math.floor(Math.random() * conditions.length)];
    },
    
    /**
     * 获取用户当前位置
     * 使用浏览器的Geolocation API
     */
    getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.currentLocation.coordinates = [
                        position.coords.latitude,
                        position.coords.longitude
                    ];
                    
                    // 这里可以调用地理编码API获取位置名称
                    // 为了演示，我们使用模拟数据
                    this.updateLocationDisplay();
                },
                error => {
                    console.error('获取位置失败:', error);
                    this.showNotification('无法获取您的位置，使用默认位置', 'warning');
                }
            );
        } else {
            this.showNotification('您的浏览器不支持地理位置功能', 'warning');
        }
    },
    
    /**
     * 更新位置显示
     */
    updateLocationDisplay() {
        const locationElement = document.querySelector('#dashboard-page .flex.items-center h2');
        if (locationElement) {
            locationElement.textContent = this.currentLocation.name;
        }
    },
    
    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 ('success', 'warning', 'error')
     */
    showNotification(message, type = 'success') {
        // 简单的通知实现
        // 实际应用中可以使用更复杂的通知系统
        alert(message);
    }
};

// 导出模块
window.weatherModule = weatherModule;