/**
 * 社区与配对模块
 * 负责好友位置共享、实时位置展示、群组钓鱼行程创建和本地钓友匹配
 */

const communityModule = {
    // 用户数据
    currentUser: {
        id: 'user_001',
        name: '用户名',
        avatar: null,
        coordinates: [36.0671, 120.3826],
        preferences: {
            fishingType: '海钓',
            experienceLevel: '中级',
            favoriteLocations: []
        }
    },
    
    // 好友列表
    friends: [
        {
            id: 'user_002',
            name: '张钓友',
            avatar: null,
            coordinates: [36.0700, 120.3900],
            status: 'online',
            distance: 2.5
        },
        {
            id: 'user_003',
            name: '李钓友',
            avatar: null,
            coordinates: [36.0750, 120.3950],
            status: 'online',
            distance: 5.8
        },
        {
            id: 'user_004',
            name: '王钓友',
            avatar: null,
            coordinates: [36.0800, 120.4000],
            status: 'online',
            distance: 8.3
        }
    ],
    
    // 附近钓友
    nearbyFishers: [
        {
            id: 'user_005',
            name: '赵钓友',
            avatar: null,
            coordinates: [36.0680, 120.3850],
            distance: 3.2,
            preferences: {
                fishingType: '海钓',
                experienceLevel: '高级'
            }
        },
        {
            id: 'user_006',
            name: '钱钓友',
            avatar: null,
            coordinates: [36.0690, 120.3870],
            distance: 4.5,
            preferences: {
                fishingType: '淡水钓',
                experienceLevel: '中级'
            }
        }
    ],
    
    // 群组活动
    groupActivities: [
        {
            id: 'activity_001',
            title: '周末海钓活动',
            description: '一起去青岛栈桥附近海域进行海钓活动',
            date: '2025-07-26',
            time: '08:00',
            location: '青岛栈桥附近海域',
            coordinates: [36.0600, 120.3800],
            organizer: 'user_002',
            participants: ['user_002', 'user_003', 'user_004', 'user_007', 'user_008'],
            status: 'ongoing',
            maxParticipants: 10
        },
        {
            id: 'activity_002',
            title: '新手皮划艇钓鱼教学',
            description: '为新手提供皮划艇钓鱼基础知识和技巧教学',
            date: '2025-08-05',
            time: '14:00',
            location: '青岛奥林匹克帆船中心',
            coordinates: [36.0500, 120.3900],
            organizer: 'user_002',
            participants: ['user_002', 'user_009', 'user_010', 'user_011', 'user_012', 'user_013'],
            status: 'upcoming',
            maxParticipants: 15
        }
    ],
    
    // 地图相关
    map: null,
    markers: [],
    
    /**
     * 初始化社区模块
     */
    init() {
        this.setupMap();
        this.setupEventListeners();
        this.updateFriendList();
        this.updateNearbyFishers();
        this.updateGroupActivities();
    },
    
    /**
     * 设置地图
     */
    setupMap() {
        // 检查地图容器是否存在
        const mapContainer = document.getElementById('community-map');
        if (!mapContainer) return;
        
        // 创建地图实例
        this.map = L.map('community-map').setView(this.currentUser.coordinates, 13);
        
        // 添加底图图层
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);
        
        // 添加用户标记
        this.addUserMarker();
        
        // 添加好友标记
        this.addFriendMarkers();
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 刷新按钮
        const refreshBtn = document.querySelector('#community-page .text-primary.text-sm');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshLocations();
            });
        }
        
        // 好友位置共享按钮
        const friendLocationBtns = document.querySelectorAll('#community-page .fa-map-marker');
        friendLocationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const friendItem = e.target.closest('.flex.items-center');
                if (friendItem) {
                    const friendName = friendItem.querySelector('.font-medium').textContent;
                    this.showFriendLocation(friendName);
                }
            });
        });
        
        // 好友消息按钮
        const friendMessageBtns = document.querySelectorAll('#community-page .fa-comment');
        friendMessageBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const friendItem = e.target.closest('.flex.items-center');
                if (friendItem) {
                    const friendName = friendItem.querySelector('.font-medium').textContent;
                    this.sendMessage(friendName);
                }
            });
        });
        
        // 添加好友按钮
        const addFriendBtns = document.querySelectorAll('#community-page .btn.btn-primary.text-sm');
        addFriendBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fisherItem = e.target.closest('.flex.items-center');
                if (fisherItem) {
                    const fisherName = fisherItem.querySelector('.font-medium').textContent;
                    this.addFriend(fisherName);
                }
            });
        });
        
        // 报名参加活动按钮
        const joinActivityBtns = document.querySelectorAll('#community-page .btn.btn-secondary.text-sm');
        joinActivityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activityItem = e.target.closest('.p-3.bg-gray-50');
                if (activityItem) {
                    const activityTitle = activityItem.querySelector('h3').textContent;
                    this.joinActivity(activityTitle);
                }
            });
        });
        
        // 创建活动按钮
        const createActivityBtn = document.querySelector('#community-page .btn.btn-primary.text-sm');
        if (createActivityBtn) {
            createActivityBtn.addEventListener('click', () => {
                this.createActivity();
            });
        }
    },
    
    /**
     * 添加用户标记
     */
    addUserMarker() {
        if (!this.map) return;
        
        // 创建用户标记
        const userMarker = L.circleMarker(this.currentUser.coordinates, {
            color: '#dc3545',
            fillColor: '#dc3545',
            fillOpacity: 0.8,
            radius: 10,
            weight: 2
        }).addTo(this.map);
        
        // 添加弹出信息
        userMarker.bindPopup(`
            <div class="p-2">
                <h3 class="font-bold">你</h3>
                <p>当前位置</p>
            </div>
        `);
        
        // 添加到标记数组
        this.markers.push(userMarker);
    },
    
    /**
     * 添加好友标记
     */
    addFriendMarkers() {
        if (!this.map) return;
        
        // 清除现有好友标记
        this.markers.forEach(marker => {
            if (marker._isFriendMarker) {
                this.map.removeLayer(marker);
            }
        });
        
        this.markers = this.markers.filter(marker => !marker._isFriendMarker);
        
        // 添加好友标记
        this.friends.forEach(friend => {
            if (friend.coordinates) {
                // 生成随机颜色
                const colors = ['#0066cc', '#00a878', '#ff6b35', '#9b59b6', '#f1c40f'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                // 创建标记
                const marker = L.circleMarker(friend.coordinates, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    radius: 8,
                    weight: 2
                }).addTo(this.map);
                
                // 标记为好友标记
                marker._isFriendMarker = true;
                
                // 添加弹出信息
                marker.bindPopup(`
                    <div class="p-2">
                        <h3 class="font-bold">${friend.name}</h3>
                        <p>${friend.status === 'online' ? '在线' : '离线'}</p>
                        <p>${friend.distance} 公里外</p>
                    </div>
                `);
                
                // 添加点击事件
                marker.on('click', () => {
                    marker.openPopup();
                });
                
                // 添加到标记数组
                this.markers.push(marker);
            }
        });
    },
    
    /**
     * 更新好友列表
     */
    updateFriendList() {
        // 获取好友列表容器
        const friendListContainer = document.querySelector('#community-page .space-y-3');
        if (!friendListContainer) return;
        
        // 清空现有列表
        friendListContainer.innerHTML = '';
        
        // 添加好友项
        this.friends.forEach(friend => {
            // 生成头像
            const avatarInitial = friend.name.charAt(0);
            const avatarColors = ['bg-blue-100 text-primary', 'bg-green-100 text-secondary', 'bg-orange-100 text-accent'];
            const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
            
            const friendItem = document.createElement('div');
            friendItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            friendItem.innerHTML = `
                <div class="w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center mr-3">
                    <span class="font-bold">${avatarInitial}</span>
                </div>
                <div class="flex-1">
                    <p class="font-medium">${friend.name}</p>
                    <p class="text-sm text-gray-600">${friend.status === 'online' ? '在线' : '离线'} · ${friend.distance} 公里外</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-primary friend-location" data-name="${friend.name}">
                        <i class="fa fa-map-marker"></i>
                    </button>
                    <button class="text-primary friend-message" data-name="${friend.name}">
                        <i class="fa fa-comment"></i>
                    </button>
                </div>
            `;
            
            // 添加位置共享事件
            friendItem.querySelector('.friend-location').addEventListener('click', () => {
                this.showFriendLocation(friend.name);
            });
            
            // 添加消息事件
            friendItem.querySelector('.friend-message').addEventListener('click', () => {
                this.sendMessage(friend.name);
            });
            
            friendListContainer.appendChild(friendItem);
        });
        
        // 如果没有好友，显示提示
        if (this.friends.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = '暂无好友，去附近钓友中添加';
            friendListContainer.appendChild(emptyMessage);
        }
    },
    
    /**
     * 更新附近钓友列表
     */
    updateNearbyFishers() {
        // 获取附近钓友列表容器
        const nearbyContainer = document.querySelector('#community-page .space-y-3:last-child');
        if (!nearbyContainer) return;
        
        // 清空现有列表
        nearbyContainer.innerHTML = '';
        
        // 添加钓友项
        this.nearbyFishers.forEach(fisher => {
            // 生成头像
            const avatarInitial = fisher.name.charAt(0);
            const avatarColors = ['bg-purple-100 text-purple-600', 'bg-red-100 text-red-600', 'bg-yellow-100 text-yellow-600'];
            const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
            
            const fisherItem = document.createElement('div');
            fisherItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            fisherItem.innerHTML = `
                <div class="w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center mr-3">
                    <span class="font-bold">${avatarInitial}</span>
                </div>
                <div class="flex-1">
                    <p class="font-medium">${fisher.name}</p>
                    <p class="text-sm text-gray-600">${fisher.distance} 公里外 · 喜欢${fisher.preferences.fishingType}</p>
                </div>
                <button class="btn btn-primary text-sm add-friend" data-name="${fisher.name}">
                    添加好友
                </button>
            `;
            
            // 添加好友事件
            fisherItem.querySelector('.add-friend').addEventListener('click', () => {
                this.addFriend(fisher.name);
            });
            
            nearbyContainer.appendChild(fisherItem);
        });
        
        // 如果没有附近钓友，显示提示
        if (this.nearbyFishers.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = '附近暂无钓友';
            nearbyContainer.appendChild(emptyMessage);
        }
    },
    
    /**
     * 更新群组活动列表
     */
    updateGroupActivities() {
        // 获取活动列表容器
        const activityContainer = document.querySelector('#community-page .space-y-3:nth-child(2)');
        if (!activityContainer) return;
        
        // 清空现有列表
        activityContainer.innerHTML = '';
        
        // 添加活动项
        this.groupActivities.forEach(activity => {
            // 格式化日期
            const date = new Date(activity.date).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // 获取参与者信息
            const participantCount = activity.participants.length;
            const maxParticipants = activity.maxParticipants;
            
            // 生成参与者头像
            let participantAvatars = '';
            for (let i = 0; i < Math.min(3, participantCount); i++) {
                const avatarColors = ['bg-blue-100 text-primary', 'bg-green-100 text-secondary', 'bg-orange-100 text-accent'];
                const avatarColor = avatarColors[i % avatarColors.length];
                const initial = String.fromCharCode(65 + i); // A, B, C...
                
                participantAvatars += `
                    <div class="w-8 h-8 ${avatarColor} rounded-full flex items-center justify-center border-2 border-white">
                        <span class="text-xs font-bold">${initial}</span>
                    </div>
                `;
            }
            
            // 如果参与者超过3个，显示剩余数量
            if (participantCount > 3) {
                participantAvatars += `
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
                        <span class="text-xs font-bold text-gray-600">+${participantCount - 3}</span>
                    </div>
                `;
            }
            
            // 活动状态标签
            const statusClass = activity.status === 'ongoing' ? 'bg-blue-100 text-primary' : 'bg-gray-100 text-gray-600';
            const statusText = activity.status === 'ongoing' ? '进行中' : '即将开始';
            
            const activityItem = document.createElement('div');
            activityItem.className = 'p-3 bg-gray-50 rounded-lg';
            activityItem.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-medium">${activity.title}</h3>
                    <span class="text-xs ${statusClass} px-2 py-1 rounded-full">${statusText}</span>
                </div>
                <p class="text-sm text-gray-600 mb-2">时间: ${date} ${activity.time}</p>
                <p class="text-sm text-gray-600 mb-2">地点: ${activity.location}</p>
                <div class="flex items-center justify-between">
                    <div class="flex -space-x-2">
                        ${participantAvatars}
                    </div>
                    <button class="btn btn-secondary text-sm join-activity" data-title="${activity.title}">
                        报名参加
                    </button>
                </div>
            `;
            
            // 添加报名事件
            activityItem.querySelector('.join-activity').addEventListener('click', () => {
                this.joinActivity(activity.title);
            });
            
            activityContainer.appendChild(activityItem);
        });
        
        // 如果没有活动，显示提示
        if (this.groupActivities.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = '暂无群组活动，创建一个吧';
            activityContainer.appendChild(emptyMessage);
        }
    },
    
    /**
     * 刷新位置信息
     */
    refreshLocations() {
        // 显示加载状态
        const refreshBtn = document.querySelector('#community-page .text-primary.text-sm');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> 刷新中...';
            refreshBtn.disabled = true;
            
            // 模拟API请求延迟
            setTimeout(() => {
                // 更新用户位置（模拟移动）
                this.currentUser.coordinates = [
                    this.currentUser.coordinates[0] + (Math.random() - 0.5) * 0.01,
                    this.currentUser.coordinates[1] + (Math.random() - 0.5) * 0.01
                ];
                
                // 更新好友位置（模拟移动）
                this.friends.forEach(friend => {
                    friend.coordinates = [
                        friend.coordinates[0] + (Math.random() - 0.5) * 0.01,
                        friend.coordinates[1] + (Math.random() - 0.5) * 0.01
                    ];
                    
                    // 重新计算距离
                    friend.distance = this.calculateDistance(
                        this.currentUser.coordinates[0], this.currentUser.coordinates[1],
                        friend.coordinates[0], friend.coordinates[1]
                    );
                    friend.distance = Math.round(friend.distance * 10) / 10; // 保留一位小数
                });
                
                // 更新地图
                this.updateMap();
                
                // 更新列表
                this.updateFriendList();
                
                // 恢复按钮状态
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
                
                // 显示成功提示
                this.showNotification('位置信息已更新');
            }, 1000);
        }
    },
    
    /**
     * 更新地图
     */
    updateMap() {
        if (!this.map) return;
        
        // 更新用户标记位置
        this.markers.forEach(marker => {
            if (!marker._isFriendMarker) {
                marker.setLatLng(this.currentUser.coordinates);
            }
        });
        
        // 更新好友标记
        this.addFriendMarkers();
        
        // 调整地图视图
        const allMarkers = L.layerGroup(this.markers);
        this.map.fitBounds(allMarkers.getBounds(), {
            padding: [20, 20],
            maxZoom: 15
        });
    },
    
    /**
     * 显示好友位置
     * @param {string} friendName - 好友名称
     */
    showFriendLocation(friendName) {
        const friend = this.friends.find(f => f.name === friendName);
        if (!friend || !friend.coordinates || !this.map) return;
        
        // 将地图中心设置到好友位置
        this.map.setView(friend.coordinates, 15);
        
        // 查找并打开好友标记的弹出信息
        this.markers.forEach(marker => {
            if (marker._isFriendMarker) {
                const latlng = marker.getLatLng();
                if (latlng.lat === friend.coordinates[0] && latlng.lng === friend.coordinates[1]) {
                    marker.openPopup();
                }
            }
        });
        
        // 显示提示
        this.showNotification(`已定位到${friendName}的位置`);
    },
    
    /**
     * 发送消息
     * @param {string} friendName - 好友名称
     */
    sendMessage(friendName) {
        // 这里可以实现消息发送功能
        this.showNotification(`发送消息给${friendName}`);
    },
    
    /**
     * 添加好友
     * @param {string} fisherName - 钓友名称
     */
    addFriend(fisherName) {
        // 查找钓友
        const fisher = this.nearbyFishers.find(f => f.name === fisherName);
        if (!fisher) return;
        
        // 检查是否已经是好友
        if (this.friends.some(f => f.name === fisherName)) {
            this.showNotification(`${fisherName}已经是你的好友了`, 'warning');
            return;
        }
        
        // 添加到好友列表
        this.friends.push({
            id: fisher.id,
            name: fisher.name,
            avatar: fisher.avatar,
            coordinates: fisher.coordinates,
            status: 'online',
            distance: fisher.distance
        });
        
        // 从附近钓友列表中移除
        this.nearbyFishers = this.nearbyFishers.filter(f => f.name !== fisherName);
        
        // 更新列表
        this.updateFriendList();
        this.updateNearbyFishers();
        
        // 更新地图
        this.addFriendMarkers();
        
        // 显示成功提示
        this.showNotification(`已添加${fisherName}为好友`);
    },
    
    /**
     * 参加活动
     * @param {string} activityTitle - 活动标题
     */
    joinActivity(activityTitle) {
        // 查找活动
        const activity = this.groupActivities.find(a => a.title === activityTitle);
        if (!activity) return;
        
        // 检查是否已经参加
        if (activity.participants.includes(this.currentUser.id)) {
            this.showNotification('你已经参加了这个活动', 'warning');
            return;
        }
        
        // 检查是否已满
        if (activity.participants.length >= activity.maxParticipants) {
            this.showNotification('活动人数已满', 'error');
            return;
        }
        
        // 添加到参与者列表
        activity.participants.push(this.currentUser.id);
        
        // 更新活动列表
        this.updateGroupActivities();
        
        // 显示成功提示
        this.showNotification(`已成功报名参加"${activityTitle}"`);
    },
    
    /**
     * 创建活动
     */
    createActivity() {
        // 这里可以实现创建活动功能
        // 实际应用中可以显示一个表单让用户填写活动信息
        this.showNotification('创建活动功能将在后续版本中推出');
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
window.communityModule = communityModule;