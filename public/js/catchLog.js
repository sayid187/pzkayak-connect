/**
 * 渔获日志模块
 * 负责渔获记录的添加、编辑、删除和展示
 */

const catchLog = {
    // 渔获数据
    catches: [],
    
    // 地图相关
    map: null,
    markers: [],
    
    // 表单元素
    form: null,
    
    /**
     * 初始化渔获日志模块
     */
    init() {
        this.loadCatches();
        this.setupMap();
        this.setupForm();
        this.setupEventListeners();
        this.updateCatchList();
    },
    
    /**
     * 设置地图
     */
    setupMap() {
        // 检查地图容器是否存在
        const mapContainer = document.getElementById('catch-map');
        if (!mapContainer) return;
        
        // 创建地图实例
        this.map = L.map('catch-map').setView([36.0671, 120.3826], 13);
        
        // 添加底图图层
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);
        
        // 添加地图点击事件
        this.map.on('click', (e) => {
            this.addMarker(e.latlng);
            this.updateFormLocation(e.latlng);
        });
    },
    
    /**
     * 设置表单
     */
    setupForm() {
        this.form = document.getElementById('catch-form');
        if (!this.form) return;
        
        // 添加表单提交事件
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCatch();
        });
        
        // 设置图片上传预览
        const fileInput = this.form.querySelector('input[type="file"]');
        const uploadArea = this.form.querySelector('.border-dashed');
        
        if (fileInput && uploadArea) {
            uploadArea.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.previewImage(e.target.files[0]);
                }
            });
        }
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 添加标记按钮
        const addMarkerBtn = document.querySelector('#catch-page .text-primary.text-sm');
        if (addMarkerBtn) {
            addMarkerBtn.addEventListener('click', () => {
                // 检查是否有位置权限
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            const latlng = [position.coords.latitude, position.coords.longitude];
                            this.addMarker(latlng);
                            this.updateFormLocation(latlng);
                            this.map.setView(latlng, 15);
                        },
                        error => {
                            console.error('获取位置失败:', error);
                            this.showNotification('无法获取您的位置，请在地图上手动选择', 'warning');
                        }
                    );
                } else {
                    this.showNotification('您的浏览器不支持地理位置功能', 'warning');
                }
            });
        }
        
        // 筛选标签
        const filterTabs = document.querySelectorAll('#catch-page .tab[data-filter]');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.filterCatches(tab.dataset.filter);
            });
        });
    },
    
    /**
     * 加载渔获数据
     */
    loadCatches() {
        try {
            const savedCatches = JSON.parse(localStorage.getItem('pzkayak_catches') || '[]');
            this.catches = savedCatches;
            this.updateMapMarkers();
        } catch (error) {
            console.error('加载渔获数据失败:', error);
            this.catches = [];
        }
    },
    
    /**
     * 保存渔获数据
     */
    saveCatches() {
        try {
            localStorage.setItem('pzkayak_catches', JSON.stringify(this.catches));
            return true;
        } catch (error) {
            console.error('保存渔获数据失败:', error);
            this.showNotification('保存渔获数据失败', 'error');
            return false;
        }
    },
    
    /**
     * 添加地图标记
     * @param {Array} latlng - 经纬度数组 [lat, lng]
     */
    addMarker(latlng) {
        // 移除现有临时标记
        this.removeTemporaryMarkers();
        
        // 创建新标记
        const marker = L.marker(latlng, {
            draggable: true,
            icon: L.divIcon({
                className: 'catch-marker',
                html: '<div class="w-6 h-6 bg-secondary rounded-full border-2 border-white shadow-lg flex items-center justify-center"><i class="fa fa-map-marker text-white text-xs"></i></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(this.map);
        
        // 添加拖拽结束事件
        marker.on('dragend', (e) => {
            this.updateFormLocation(e.target.getLatLng());
        });
        
        // 标记为临时标记
        marker._isTemporary = true;
        
        // 添加到标记数组
        this.markers.push(marker);
    },
    
    /**
     * 移除临时标记
     */
    removeTemporaryMarkers() {
        this.markers.forEach(marker => {
            if (marker._isTemporary) {
                this.map.removeLayer(marker);
            }
        });
        
        this.markers = this.markers.filter(marker => !marker._isTemporary);
    },
    
    /**
     * 更新表单位置信息
     * @param {Object} latlng - 经纬度对象 {lat, lng}
     */
    updateFormLocation(latlng) {
        // 在表单中添加隐藏字段存储位置信息
        let latInput = this.form.querySelector('input[name="latitude"]');
        let lngInput = this.form.querySelector('input[name="longitude"]');
        
        if (!latInput) {
            latInput = document.createElement('input');
            latInput.type = 'hidden';
            latInput.name = 'latitude';
            this.form.appendChild(latInput);
        }
        
        if (!lngInput) {
            lngInput = document.createElement('input');
            lngInput.type = 'hidden';
            lngInput.name = 'longitude';
            this.form.appendChild(lngInput);
        }
        
        latInput.value = latlng.lat;
        lngInput.value = latlng.lng;
        
        // 显示位置信息提示
        this.showNotification(`位置已设置: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
    },
    
    /**
     * 预览上传的图片
     * @param {File} file - 图片文件
     */
    previewImage(file) {
        const uploadArea = this.form.querySelector('.border-dashed');
        if (!uploadArea) return;
        
        // 检查文件类型
        if (!file.type.match('image.*')) {
            this.showNotification('请选择图片文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // 创建预览元素
            const preview = document.createElement('div');
            preview.className = 'relative';
            preview.innerHTML = `
                <img src="${e.target.result}" alt="预览" class="w-full h-32 object-cover rounded-lg">
                <button type="button" class="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                    <i class="fa fa-times text-gray-600"></i>
                </button>
            `;
            
            // 添加删除事件
            preview.querySelector('button').addEventListener('click', () => {
                uploadArea.innerHTML = `
                    <i class="fa fa-camera text-gray-400 text-3xl mb-2"></i>
                    <p class="text-sm text-gray-600">点击上传照片</p>
                    <input type="file" class="hidden" accept="image/*">
                `;
                
                // 重新绑定点击事件
                const fileInput = uploadArea.querySelector('input[type="file"]');
                uploadArea.addEventListener('click', () => fileInput.click());
                
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.previewImage(e.target.files[0]);
                    }
                });
            });
            
            // 替换上传区域内容
            uploadArea.innerHTML = '';
            uploadArea.appendChild(preview);
        };
        
        reader.readAsDataURL(file);
    },
    
    /**
     * 保存渔获记录
     */
    saveCatch() {
        if (!this.form) return;
        
        // 获取表单数据
        const formData = new FormData(this.form);
        const catchData = {
            id: this.generateCatchId(),
            species: formData.get('species') || this.form.querySelector('select').value,
            length: formData.get('length') || this.form.querySelector('input[type="number"]').value,
            weight: formData.get('weight') || this.form.querySelectorAll('input[type="number"]')[1].value,
            bait: formData.get('bait') || this.form.querySelectorAll('input[type="text"]')[0].value,
            depth: formData.get('depth') || this.form.querySelectorAll('input[type="number"]')[2].value,
            notes: formData.get('notes') || this.form.querySelector('textarea').value,
            latitude: formData.get('latitude'),
            longitude: formData.get('longitude'),
            timestamp: new Date().getTime(),
            image: null // 将在下面处理
        };
        
        // 验证必填字段
        if (!catchData.species || !catchData.length || !catchData.weight) {
            this.showNotification('请填写必填字段（物种、长度、重量）', 'error');
            return;
        }
        
        // 验证位置信息
        if (!catchData.latitude || !catchData.longitude) {
            this.showNotification('请在地图上选择渔获位置', 'error');
            return;
        }
        
        // 处理图片
        const fileInput = this.form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                catchData.image = e.target.result;
                this.saveCatchData(catchData);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            // 检查是否有预览图片
            const previewImage = this.form.querySelector('.border-dashed img');
            if (previewImage) {
                catchData.image = previewImage.src;
            }
            
            this.saveCatchData(catchData);
        }
    },
    
    /**
     * 保存渔获数据
     * @param {Object} catchData - 渔获数据
     */
    saveCatchData(catchData) {
        // 添加到渔获数组
        this.catches.push(catchData);
        
        // 保存到本地存储
        if (this.saveCatches()) {
            // 更新地图标记
            this.updateMapMarkers();
            
            // 更新列表
            this.updateCatchList();
            
            // 重置表单
            this.form.reset();
            
            // 移除临时标记
            this.removeTemporaryMarkers();
            
            // 显示成功提示
            this.showNotification('渔获记录已保存');
        }
    },
    
    /**
     * 更新地图标记
     */
    updateMapMarkers() {
        // 清除现有非临时标记
        this.markers.forEach(marker => {
            if (!marker._isTemporary) {
                this.map.removeLayer(marker);
            }
        });
        
        this.markers = this.markers.filter(marker => marker._isTemporary);
        
        // 添加新标记
        this.catches.forEach(catchItem => {
            if (catchItem.latitude && catchItem.longitude) {
                const marker = L.marker([catchItem.latitude, catchItem.longitude], {
                    icon: L.divIcon({
                        className: 'catch-marker',
                        html: `<div class="w-6 h-6 bg-secondary rounded-full border-2 border-white shadow-lg flex items-center justify-center"><i class="fa fa-fish text-white text-xs"></i></div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(this.map);
                
                // 添加弹出信息
                marker.bindPopup(`
                    <div class="p-2">
                        <h3 class="font-bold">${catchItem.species}</h3>
                        <p>尺寸: ${catchItem.length}cm</p>
                        <p>重量: ${catchItem.weight}kg</p>
                        <p>时间: ${new Date(catchItem.timestamp).toLocaleString('zh-CN')}</p>
                        ${catchItem.image ? `<img src="${catchItem.image}" alt="${catchItem.species}" class="w-full h-32 object-cover rounded-lg mt-2">` : ''}
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
        
        // 如果有标记，调整地图视图
        if (this.markers.length > 0) {
            const markerLayer = L.layerGroup(this.markers);
            this.map.fitBounds(markerLayer.getBounds(), {
                padding: [20, 20],
                maxZoom: 15
            });
        }
    },
    
    /**
     * 更新渔获列表
     */
    updateCatchList() {
        // 获取列表容器
        const listContainer = document.querySelector('#catch-page .space-y-3');
        if (!listContainer) return;
        
        // 清空现有列表
        listContainer.innerHTML = '';
        
        // 按时间降序排序
        const sortedCatches = [...this.catches].sort((a, b) => b.timestamp - a.timestamp);
        
        // 添加列表项
        sortedCatches.forEach(catchItem => {
            const date = new Date(catchItem.timestamp).toLocaleDateString('zh-CN');
            const time = new Date(catchItem.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const listItem = document.createElement('div');
            listItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            listItem.innerHTML = `
                <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden mr-3">
                    ${catchItem.image 
                        ? `<img src="${catchItem.image}" alt="${catchItem.species}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full bg-gray-100 flex items-center justify-center"><i class="fa fa-fish text-gray-400 text-xl"></i></div>`
                    }
                </div>
                <div class="flex-1">
                    <p class="font-medium">${catchItem.species}</p>
                    <p class="text-sm text-gray-600">${catchItem.length}cm | ${catchItem.weight}kg | ${date} ${time}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-gray-600 hover:text-primary edit-catch" data-id="${catchItem.id}">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="text-gray-600 hover:text-danger delete-catch" data-id="${catchItem.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            `;
            
            // 添加编辑事件
            listItem.querySelector('.edit-catch').addEventListener('click', () => {
                this.editCatch(catchItem.id);
            });
            
            // 添加删除事件
            listItem.querySelector('.delete-catch').addEventListener('click', () => {
                this.deleteCatch(catchItem.id);
            });
            
            listContainer.appendChild(listItem);
        });
        
        // 如果没有渔获记录，显示提示
        if (sortedCatches.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = '暂无渔获记录';
            listContainer.appendChild(emptyMessage);
        }
    },
    
    /**
     * 编辑渔获记录
     * @param {string} id - 渔获ID
     */
    editCatch(id) {
        const catchItem = this.catches.find(c => c.id === id);
        if (!catchItem) return;
        
        // 填充表单
        const speciesSelect = this.form.querySelector('select');
        const lengthInput = this.form.querySelectorAll('input[type="number"]')[0];
        const weightInput = this.form.querySelectorAll('input[type="number"]')[1];
        const baitInput = this.form.querySelectorAll('input[type="text"]')[0];
        const depthInput = this.form.querySelectorAll('input[type="number"]')[2];
        const notesTextarea = this.form.querySelector('textarea');
        
        if (speciesSelect) speciesSelect.value = catchItem.species;
        if (lengthInput) lengthInput.value = catchItem.length;
        if (weightInput) weightInput.value = catchItem.weight;
        if (baitInput) baitInput.value = catchItem.bait || '';
        if (depthInput) depthInput.value = catchItem.depth || '';
        if (notesTextarea) notesTextarea.value = catchItem.notes || '';
        
        // 设置位置
        if (catchItem.latitude && catchItem.longitude) {
            this.updateFormLocation({lat: catchItem.latitude, lng: catchItem.longitude});
            this.addMarker([catchItem.latitude, catchItem.longitude]);
            this.map.setView([catchItem.latitude, catchItem.longitude], 15);
        }
        
        // 处理图片
        const uploadArea = this.form.querySelector('.border-dashed');
        if (uploadArea && catchItem.image) {
            uploadArea.innerHTML = `
                <div class="relative">
                    <img src="${catchItem.image}" alt="${catchItem.species}" class="w-full h-32 object-cover rounded-lg">
                    <button type="button" class="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                        <i class="fa fa-times text-gray-600"></i>
                    </button>
                </div>
            `;
            
            // 添加删除事件
            uploadArea.querySelector('button').addEventListener('click', () => {
                uploadArea.innerHTML = `
                    <i class="fa fa-camera text-gray-400 text-3xl mb-2"></i>
                    <p class="text-sm text-gray-600">点击上传照片</p>
                    <input type="file" class="hidden" accept="image/*">
                `;
                
                // 重新绑定点击事件
                const fileInput = uploadArea.querySelector('input[type="file"]');
                uploadArea.addEventListener('click', () => fileInput.click());
                
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.previewImage(e.target.files[0]);
                    }
                });
            });
        }
        
        // 添加编辑模式标识
        this.form.dataset.editId = id;
        
        // 修改提交按钮文本
        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa fa-save mr-1"></i> 更新记录';
        }
        
        // 滚动到表单
        this.form.scrollIntoView({behavior: 'smooth'});
        
        // 显示提示
        this.showNotification('编辑渔获记录');
    },
    
    /**
     * 删除渔获记录
     * @param {string} id - 渔获ID
     */
    deleteCatch(id) {
        if (confirm('确定要删除这条渔获记录吗？')) {
            // 从数组中移除
            this.catches = this.catches.filter(c => c.id !== id);
            
            // 保存到本地存储
            if (this.saveCatches()) {
                // 更新地图标记
                this.updateMapMarkers();
                
                // 更新列表
                this.updateCatchList();
                
                // 显示成功提示
                this.showNotification('渔获记录已删除');
            }
        }
    },
    
    /**
     * 筛选渔获记录
     * @param {string} filter - 筛选类型 ('all', 'recent')
     */
    filterCatches(filter) {
        // 获取列表容器
        const listContainer = document.querySelector('#catch-page .space-y-3');
        if (!listContainer) return;
        
        // 清空现有列表
        listContainer.innerHTML = '';
        
        // 根据筛选类型过滤
        let filteredCatches = [...this.catches];
        
        if (filter === 'recent') {
            // 获取7天前的时间戳
            const sevenDaysAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);
            filteredCatches = filteredCatches.filter(c => c.timestamp >= sevenDaysAgo);
        }
        
        // 按时间降序排序
        filteredCatches.sort((a, b) => b.timestamp - a.timestamp);
        
        // 添加列表项
        filteredCatches.forEach(catchItem => {
            const date = new Date(catchItem.timestamp).toLocaleDateString('zh-CN');
            const time = new Date(catchItem.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const listItem = document.createElement('div');
            listItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            listItem.innerHTML = `
                <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden mr-3">
                    ${catchItem.image 
                        ? `<img src="${catchItem.image}" alt="${catchItem.species}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full bg-gray-100 flex items-center justify-center"><i class="fa fa-fish text-gray-400 text-xl"></i></div>`
                    }
                </div>
                <div class="flex-1">
                    <p class="font-medium">${catchItem.species}</p>
                    <p class="text-sm text-gray-600">${catchItem.length}cm | ${catchItem.weight}kg | ${date} ${time}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-gray-600 hover:text-primary edit-catch" data-id="${catchItem.id}">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="text-gray-600 hover:text-danger delete-catch" data-id="${catchItem.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            `;
            
            // 添加编辑事件
            listItem.querySelector('.edit-catch').addEventListener('click', () => {
                this.editCatch(catchItem.id);
            });
            
            // 添加删除事件
            listItem.querySelector('.delete-catch').addEventListener('click', () => {
                this.deleteCatch(catchItem.id);
            });
            
            listContainer.appendChild(listItem);
        });
        
        // 如果没有渔获记录，显示提示
        if (filteredCatches.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center py-4 text-gray-500';
            emptyMessage.textContent = filter === 'recent' ? '最近7天暂无渔获记录' : '暂无渔获记录';
            listContainer.appendChild(emptyMessage);
        }
    },
    
    /**
     * 生成渔获ID
     * @returns {string} 唯一ID
     */
    generateCatchId() {
        return 'catch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
window.catchLog = catchLog;