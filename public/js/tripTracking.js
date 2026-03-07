/**
 * 行程追踪模块
 * 负责GPS路线追踪、行程数据计算和离线模式管理
 */

const tripTracking = {
    // 行程状态
    isActive: false,
    isPaused: false,
    
    // 行程数据
    tripData: {
        startTime: null,
        endTime: null,
        duration: 0, // 秒
        distance: 0, // 公里
        speed: 0, // 公里/小时
        coordinates: [] // GPS坐标点数组
    },
    
    // 追踪配置
    config: {
        updateInterval: 1000, // 更新间隔（毫秒）
        minDistance: 10, // 最小记录距离（米）
        maxPoints: 1000 // 最大记录点数
    },
    
    // 计时器ID
    trackingInterval: null,
    
    // 地图相关
    map: null,
    routeLayer: null,
    currentMarker: null,
    
    /**
     * 初始化行程追踪模块
     */
    init() {
        this.setupEventListeners();
        this.setupMap();
        this.loadSavedTrips();
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const startBtn = document.getElementById('start-trip-btn');
        const pauseBtn = document.getElementById('pause-trip-btn');
        const stopBtn = document.getElementById('stop-trip-btn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startTrip());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseTrip());
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopTrip());
        }
    },
    
    /**
     * 设置地图
     */
    setupMap() {
        // 检查地图容器是否存在
        const mapContainer = document.getElementById('trip-map');
        if (!mapContainer) return;
        
        // 创建地图实例
        this.map = L.map('trip-map').setView([36.0671, 120.3826], 13);
        
        // 添加底图图层
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);
        
        // 初始化路线图层
        this.routeLayer = L.polyline([], {
            color: '#0066cc',
            weight: 3,
            opacity: 0.7
        }).addTo(this.map);
        
        // 初始化当前位置标记
        this.currentMarker = L.marker([36.0671, 120.3826], {
            icon: L.divIcon({
                className: 'current-location-marker',
                html: '<div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(this.map);
    },
    
    /**
     * 开始行程追踪
     */
    startTrip() {
        if (!this.isActive) {
            // 开始新行程
            this.isActive = true;
            this.isPaused = false;
            this.tripData = {
                startTime: new Date(),
                endTime: null,
                duration: 0,
                distance: 0,
                speed: 0,
                coordinates: []
            };
            
            // 更新UI
            this.updateUI();
            
            // 获取初始位置
            this.getCurrentLocation()
                .then(position => {
                    // 添加初始坐标
                    this.addCoordinate(position.coords.latitude, position.coords.longitude);
                    
                    // 开始定时更新
                    this.startTrackingInterval();
                })
                .catch(error => {
                    console.error('获取位置失败:', error);
                    this.showNotification('无法获取您的位置，无法开始追踪', 'error');
                    this.stopTrip();
                });
        } else if (this.isPaused) {
            // 恢复已暂停的行程
            this.isPaused = false;
            
            // 更新UI
            this.updateUI();
            
            // 恢复定时更新
            this.startTrackingInterval();
        }
    },
    
    /**
     * 暂停行程追踪
     */
    pauseTrip() {
        if (this.isActive && !this.isPaused) {
            this.isPaused = true;
            
            // 停止定时更新
            this.stopTrackingInterval();
            
            // 更新UI
            this.updateUI();
            
            // 更新连接状态为离线模式
            this.updateConnectionStatus('offline');
        }
    },
    
    /**
     * 停止行程追踪
     */
    stopTrip() {
        if (this.isActive) {
            this.isActive = false;
            this.isPaused = false;
            this.tripData.endTime = new Date();
            
            // 停止定时更新
            this.stopTrackingInterval();
            
            // 保存行程数据
            this.saveTrip();
            
            // 重置数据
            this.tripData = {
                startTime: null,
                endTime: null,
                duration: 0,
                distance: 0,
                speed: 0,
                coordinates: []
            };
            
            // 更新UI
            this.updateUI();
            
            // 更新连接状态为在线模式
            this.updateConnectionStatus('online');
            
            // 显示通知
            this.showNotification('行程已保存');
        }
    },
    
    /**
     * 开始定时更新
     */
    startTrackingInterval() {
        this.trackingInterval = setInterval(() => {
            if (!this.isPaused) {
                // 更新行程时间
                this.tripData.duration = Math.floor((new Date() - this.tripData.startTime) / 1000);
                
                // 获取当前位置
                this.getCurrentLocation()
                    .then(position => {
                        this.addCoordinate(position.coords.latitude, position.coords.longitude);
                    })
                    .catch(error => {
                        console.error('获取位置失败:', error);
                        // 位置获取失败时仍继续计时
                    });
                
                // 更新UI显示
                this.updateTripDisplay();
            }
        }, this.config.updateInterval);
    },
    
    /**
     * 停止定时更新
     */
    stopTrackingInterval() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    },
    
    /**
     * 获取当前位置
     * @returns {Promise} 位置信息Promise
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => resolve(position),
                    error => reject(error),
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                );
            } else {
                reject(new Error('浏览器不支持地理位置功能'));
            }
        });
    },
    
    /**
     * 添加坐标点
     * @param {number} latitude - 纬度
     * @param {number} longitude - 经度
     */
    addCoordinate(latitude, longitude) {
        const newPoint = [latitude, longitude];
        const lastPoint = this.tripData.coordinates.length > 0 
            ? this.tripData.coordinates[this.tripData.coordinates.length - 1]
            : null;
        
        // 添加新坐标
        this.tripData.coordinates.push({
            lat: latitude,
            lng: longitude,
            timestamp: new Date().getTime()
        });
        
        // 更新地图路线
        this.updateMapRoute();
        
        // 如果有上一个点，计算两点之间的距离
        if (lastPoint) {
            const distance = this.calculateDistance(
                lastPoint.lat, lastPoint.lng,
                latitude, longitude
            );
            
            // 如果距离大于最小记录距离，累加到总距离
            if (distance >= this.config.minDistance / 1000) { // 转换为公里
                this.tripData.distance += distance;
                
                // 更新平均速度
                this.tripData.speed = this.tripData.duration > 0
                    ? (this.tripData.distance / (this.tripData.duration / 3600)) // 公里/小时
                    : 0;
            }
        }
        
        // 限制最大记录点数
        if (this.tripData.coordinates.length > this.config.maxPoints) {
            this.tripData.coordinates.shift(); // 移除最早的点
        }
    },
    
    /**
     * 计算两点之间的距离（公里）
     * @param {number} lat1 - 第一点纬度
     * @param {number} lon1 - 第一点经度
     * @param {number} lat2 - 第二点纬度
     * @param {number} lon2 - 第二点经度
     * @returns {number} 距离（公里）
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球半径（公里）
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },
    
    /**
     * 角度转弧度
     * @param {number} degrees - 角度
     * @returns {number} 弧度
     */
    toRad(degrees) {
        return degrees * (Math.PI/180);
    },
    
    /**
     * 更新地图路线
     */
    updateMapRoute() {
        if (!this.map || !this.routeLayer || this.tripData.coordinates.length === 0) return;
        
        // 提取坐标点
        const points = this.tripData.coordinates.map(point => [point.lat, point.lng]);
        
        // 更新路线
        this.routeLayer.setLatLngs(points);
        
        // 更新当前位置标记
        const lastPoint = points[points.length - 1];
        this.currentMarker.setLatLng(lastPoint);
        
        // 如果是第一个点，将地图中心设置到该点
        if (points.length === 1) {
            this.map.setView(lastPoint, 15);
        } else {
            // 否则调整地图视图以适应整个路线
            this.map.fitBounds(this.routeLayer.getBounds(), {
                padding: [20, 20],
                maxZoom: 18
            });
        }
    },
    
    /**
     * 更新行程显示
     */
    updateTripDisplay() {
        // 格式化时间
        const hours = Math.floor(this.tripData.duration / 3600);
        const minutes = Math.floor((this.tripData.duration % 3600) / 60);
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // 格式化距离和速度
        const distanceString = this.tripData.distance.toFixed(1);
        const speedString = this.tripData.speed.toFixed(1);
        
        // 更新DOM
        const tripStats = document.querySelectorAll('#trip-page .text-xl.font-bold');
        if (tripStats.length > 0) tripStats[0].innerHTML = `${distanceString} <span class="text-sm font-normal">公里</span>`;
        if (tripStats.length > 1) tripStats[1].innerHTML = `${timeString} <span class="text-sm font-normal">小时</span>`;
        if (tripStats.length > 2) tripStats[2].innerHTML = `${speedString} <span class="text-sm font-normal">公里/时</span>`;
    },
    
    /**
     * 更新UI状态
     */
    updateUI() {
        const startBtn = document.getElementById('start-trip-btn');
        const pauseBtn = document.getElementById('pause-trip-btn');
        const stopBtn = document.getElementById('stop-trip-btn');
        
        if (startBtn) startBtn.disabled = this.isActive && !this.isPaused;
        if (pauseBtn) {
            pauseBtn.disabled = !this.isActive;
            pauseBtn.innerHTML = this.isPaused 
                ? '<i class="fa fa-play mr-1"></i> 继续' 
                : '<i class="fa fa-pause mr-1"></i> 暂停';
        }
        if (stopBtn) stopBtn.disabled = !this.isActive;
        
        // 更新连接状态
        this.updateConnectionStatus(this.isPaused ? 'offline' : 'online');
    },
    
    /**
     * 更新连接状态显示
     * @param {string} status - 'online' 或 'offline'
     */
    updateConnectionStatus(status) {
        const statusIndicator = document.getElementById('connection-status');
        const statusText = statusIndicator?.nextElementSibling;
        
        if (statusIndicator) {
            statusIndicator.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-500');
            
            if (status === 'online') {
                statusIndicator.classList.add('bg-green-500');
                if (statusText) statusText.textContent = '在线模式';
            } else if (status === 'offline') {
                statusIndicator.classList.add('bg-yellow-500');
                if (statusText) statusText.textContent = '离线模式';
            } else {
                statusIndicator.classList.add('bg-red-500');
                if (statusText) statusText.textContent = '连接错误';
            }
        }
    },
    
    /**
     * 保存行程数据
     */
    saveTrip() {
        if (this.tripData.coordinates.length === 0) return;
        
        // 准备保存的数据
        const tripToSave = {
            ...this.tripData,
            id: this.generateTripId(),
            date: new Date().toISOString().split('T')[0]
        };
        
        try {
            // 从本地存储获取现有行程
            const savedTrips = JSON.parse(localStorage.getItem('pzkayak_trips') || '[]');
            
            // 添加新行程
            savedTrips.push(tripToSave);
            
            // 保存回本地存储
            localStorage.setItem('pzkayak_trips', JSON.stringify(savedTrips));
            
            // 更新行程列表
            this.updateTripList(savedTrips);
            
            return true;
        } catch (error) {
            console.error('保存行程失败:', error);
            this.showNotification('保存行程失败', 'error');
            return false;
        }
    },
    
    /**
     * 生成行程ID
     * @returns {string} 唯一ID
     */
    generateTripId() {
        return 'trip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * 加载保存的行程
     */
    loadSavedTrips() {
        try {
            const savedTrips = JSON.parse(localStorage.getItem('pzkayak_trips') || '[]');
            this.updateTripList(savedTrips);
        } catch (error) {
            console.error('加载行程失败:', error);
        }
    },
    
    /**
     * 更新行程列表显示
     * @param {Array} trips - 行程数据数组
     */
    updateTripList(trips) {
        // 按日期降序排序
        trips.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 限制显示最近的5个行程
        const recentTrips = trips.slice(0, 5);
        
        // 获取行程列表容器
        const tripListContainer = document.querySelector('#trip-page .space-y-3');
        if (!tripListContainer) return;
        
        // 清空现有列表
        tripListContainer.innerHTML = '';
        
        // 添加行程项
        recentTrips.forEach(trip => {
            const duration = this.formatDuration(trip.duration);
            const date = new Date(trip.date).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const tripItem = document.createElement('div');
            tripItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            tripItem.innerHTML = `
                <div class="bg-blue-100 p-2 rounded-full mr-3">
                    <i class="fa fa-calendar text-primary"></i>
                </div>
                <div class="flex-1">
                    <p class="font-medium">${date}</p>
                    <p class="text-sm text-gray-600">${trip.distance.toFixed(1)} 公里 | ${duration}</p>
                </div>
                <button class="text-primary" data-trip-id="${trip.id}">
                    <i class="fa fa-chevron-right"></i>
                </button>
            `;
            
            // 添加点击事件
            tripItem.querySelector('button').addEventListener('click', () => {
                this.showTripDetail(trip);
            });
            
            tripListContainer.appendChild(tripItem);
        });
        
        // 如果没有行程，显示提示
        if (recentTrips.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = '暂无历史行程记录';
            tripListContainer.appendChild(emptyMessage);
        }
    },
    
    /**
     * 格式化持续时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化的时间字符串
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} 小时 ${minutes} 分钟`;
    },
    
    /**
     * 显示行程详情
     * @param {Object} trip - 行程数据
     */
    showTripDetail(trip) {
        // 这里可以实现行程详情页面或弹窗
        console.log('显示行程详情:', trip);
        this.showNotification(`查看行程: ${new Date(trip.date).toLocaleDateString('zh-CN')}`);
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
window.tripTracking = tripTracking;