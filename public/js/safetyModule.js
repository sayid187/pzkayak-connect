/**
 * 安全工具模块
 * 负责SOS紧急求助、紧急联系人管理、安全装备检查和紧急信息发送
 */

const safetyModule = {
    // 紧急联系人
    emergencyContacts: [
        {
            id: 'contact_001',
            name: '张先生',
            relationship: '亲属',
            phone: '138-0000-0000'
        },
        {
            id: 'contact_002',
            name: '李先生',
            relationship: '朋友',
            phone: '139-0000-0000'
        }
    ],
    
    // 安全装备清单
    safetyEquipment: [
        { id: 'eq_001', name: '救生衣', checked: false },
        { id: 'eq_002', name: '哨子', checked: false },
        { id: 'eq_003', name: '锚', checked: false },
        { id: 'eq_004', name: '桨', checked: false },
        { id: 'eq_005', name: '急救包', checked: false },
        { id: 'eq_006', name: '手电筒', checked: false },
        { id: 'eq_007', name: '对讲机/收音机', checked: false },
        { id: 'eq_008', name: '饮用水', checked: false }
    ],
    
    // 当前位置
    currentLocation: {
        latitude: 36.0671,
        longitude: 120.3826,
        accuracy: null,
        timestamp: null
    },
    
    /**
     * 初始化安全工具模块
     */
    init() {
        this.loadSavedData();
        this.setupEventListeners();
        this.updateEmergencyContacts();
        this.updateSafetyEquipment();
        this.updateCurrentLocation();
    },
    
    /**
     * 加载保存的数据
     */
    loadSavedData() {
        try {
            // 加载紧急联系人
            const savedContacts = localStorage.getItem('pzkayak_emergency_contacts');
            if (savedContacts) {
                this.emergencyContacts = JSON.parse(savedContacts);
            }
            
            // 加载安全装备检查状态
            const savedEquipment = localStorage.getItem('pzkayak_safety_equipment');
            if (savedEquipment) {
                this.safetyEquipment = JSON.parse(savedEquipment);
            }
        } catch (error) {
            console.error('加载安全数据失败:', error);
        }
    },
    
    /**
     * 保存数据
     */
    saveData() {
        try {
            localStorage.setItem('pzkayak_emergency_contacts', JSON.stringify(this.emergencyContacts));
            localStorage.setItem('pzkayak_safety_equipment', JSON.stringify(this.safetyEquipment));
            return true;
        } catch (error) {
            console.error('保存安全数据失败:', error);
            this.showNotification('保存数据失败', 'error');
            return false;
        }
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // SOS按钮
        const sosBtn = document.getElementById('sos-btn');
        if (sosBtn) {
            sosBtn.addEventListener('click', () => {
                this.showSosConfirmation();
            });
        }
        
        // SOS确认按钮
        const confirmSos = document.getElementById('confirm-sos');
        if (confirmSos) {
            confirmSos.addEventListener('click', () => {
                this.sendSos();
            });
        }
        
        // SOS取消按钮
        const cancelSos = document.getElementById('cancel-sos');
        if (cancelSos) {
            cancelSos.addEventListener('click', () => {
                this.hideSosConfirmation();
            });
        }
        
        // 紧急呼叫按钮
        const emergencyCallBtn = document.querySelector('#safety-page .btn.btn-danger');
        if (emergencyCallBtn) {
            emergencyCallBtn.addEventListener('click', () => {
                this.makeEmergencyCall();
            });
        }
        
        // 添加联系人按钮
        const addContactBtn = document.querySelector('#safety-page .btn.btn-primary.w-full');
        if (addContactBtn) {
            addContactBtn.addEventListener('click', () => {
                this.addEmergencyContact();
            });
        }
        
        // 完成检查按钮
        const completeCheckBtn = document.querySelector('#safety-page .btn.btn-primary.w-full:nth-of-type(2)');
        if (completeCheckBtn) {
            completeCheckBtn.addEventListener('click', () => {
                this.completeSafetyCheck();
            });
        }
        
        // 发送紧急信息按钮
        const sendEmergencyInfoBtn = document.querySelector('#safety-page .btn.btn-primary.w-full:nth-of-type(3)');
        if (sendEmergencyInfoBtn) {
            sendEmergencyInfoBtn.addEventListener('click', () => {
                this.sendEmergencyInfo();
            });
        }
        
        // 装备复选框
        this.setupEquipmentCheckboxes();
    },
    
    /**
     * 设置装备复选框事件
     */
    setupEquipmentCheckboxes() {
        const checkboxes = document.querySelectorAll('#safety-page input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
            // 设置初始状态
            if (this.safetyEquipment[index]) {
                checkbox.checked = this.safetyEquipment[index].checked;
            }
            
            // 添加变更事件
            checkbox.addEventListener('change', () => {
                if (this.safetyEquipment[index]) {
                    this.safetyEquipment[index].checked = checkbox.checked;
                    this.saveData();
                }
            });
        });
    },
    
    /**
     * 更新紧急联系人列表
     */
    updateEmergencyContacts() {
        // 获取联系人列表容器
        const contactListContainer = document.querySelector('#safety-page .space-y-3');
        if (!contactListContainer) return;
        
        // 清空现有列表
        contactListContainer.innerHTML = '';
        
        // 添加联系人项
        this.emergencyContacts.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            contactItem.innerHTML = `
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span class="font-bold text-primary">${contact.name.charAt(0)}</span>
                </div>
                <div class="flex-1">
                    <p class="font-medium">${contact.name} (${contact.relationship})</p>
                    <p class="text-sm text-gray-600">${contact.phone}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-primary edit-contact" data-id="${contact.id}">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="text-danger delete-contact" data-id="${contact.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            `;
            
            // 添加编辑事件
            contactItem.querySelector('.edit-contact').addEventListener('click', () => {
                this.editEmergencyContact(contact.id);
            });
            
            // 添加删除事件
            contactItem.querySelector('.delete-contact').addEventListener('click', () => {
                this.deleteEmergencyContact(contact.id);
            });
            
            contactListContainer.appendChild(contactItem);
        });
        
        // 添加添加联系人按钮
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-primary w-full';
        addButton.innerHTML = '<i class="fa fa-plus mr-1"></i> 添加联系人';
        addButton.addEventListener('click', () => {
            this.addEmergencyContact();
        });
        contactListContainer.appendChild(addButton);
    },
    
    /**
     * 更新安全装备列表
     */
    updateSafetyEquipment() {
        // 获取装备列表容器
        const equipmentListContainer = document.querySelector('#safety-page .space-y-3:nth-child(2)');
        if (!equipmentListContainer) return;
        
        // 清空现有列表
        equipmentListContainer.innerHTML = '';
        
        // 添加装备项
        this.safetyEquipment.forEach(equipment => {
            const equipmentItem = document.createElement('div');
            equipmentItem.className = 'flex items-center';
            equipmentItem.innerHTML = `
                <input type="checkbox" id="${equipment.id}" class="w-5 h-5 text-primary rounded focus:ring-primary" ${equipment.checked ? 'checked' : ''}>
                <label for="${equipment.id}" class="ml-2 text-gray-700">${equipment.name}</label>
            `;
            
            // 添加变更事件
            const checkbox = equipmentItem.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                equipment.checked = checkbox.checked;
                this.saveData();
            });
            
            equipmentListContainer.appendChild(equipmentItem);
        });
        
        // 添加完成检查按钮
        const completeButton = document.createElement('button');
        completeButton.className = 'btn btn-primary w-full mt-3';
        completeButton.innerHTML = '<i class="fa fa-check-circle mr-1"></i> 完成检查';
        completeButton.addEventListener('click', () => {
            this.completeSafetyCheck();
        });
        equipmentListContainer.appendChild(completeButton);
    },
    
    /**
     * 更新当前位置
     */
    updateCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    
                    this.updateLocationDisplay();
                },
                error => {
                    console.error('获取位置失败:', error);
                    this.showNotification('无法获取您的位置，使用默认位置', 'warning');
                    this.updateLocationDisplay();
                }
            );
        } else {
            this.showNotification('您的浏览器不支持地理位置功能', 'warning');
            this.updateLocationDisplay();
        }
    },
    
    /**
     * 更新位置显示
     */
    updateLocationDisplay() {
        const locationElement = document.querySelector('#safety-page .bg-gray-50 p.font-medium');
        if (locationElement) {
            locationElement.textContent = `北纬 ${this.currentLocation.latitude.toFixed(4)}°，东经 ${this.currentLocation.longitude.toFixed(4)}°`;
        }
        
        // 更新紧急信息预览
        const infoPreviewElement = document.querySelector('#safety-page .bg-gray-50 p.text-sm');
        if (infoPreviewElement) {
            infoPreviewElement.textContent = `我需要紧急救援，当前位置：北纬 ${this.currentLocation.latitude.toFixed(4)}°，东经 ${this.currentLocation.longitude.toFixed(4)}°。请尽快联系我。`;
        }
    },
    
    /**
     * 显示SOS确认对话框
     */
    showSosConfirmation() {
        const sosModal = document.getElementById('sos-modal');
        if (sosModal) {
            sosModal.classList.remove('hidden');
        }
    },
    
    /**
     * 隐藏SOS确认对话框
     */
    hideSosConfirmation() {
        const sosModal = document.getElementById('sos-modal');
        if (sosModal) {
            sosModal.classList.add('hidden');
        }
    },
    
    /**
     * 发送SOS紧急求助
     */
    sendSos() {
        // 隐藏确认对话框
        this.hideSosConfirmation();
        
        // 显示发送中提示
        this.showNotification('正在发送紧急求助信息...');
        
        // 模拟发送延迟
        setTimeout(() => {
            // 实际应用中，这里应该调用API发送紧急求助信息
            // 例如发送短信、推送通知等
            
            // 显示发送成功提示
            this.showNotification('紧急求助信息已发送！');
            
            // 记录SOS事件
            this.logSosEvent();
        }, 2000);
    },
    
    /**
     * 拨打紧急电话
     */
    makeEmergencyCall() {
        // 实际应用中，这里应该调用设备的电话功能
        // 例如 window.location.href = 'tel:120';
        
        this.showNotification('正在拨打紧急电话...');
        
        // 模拟拨打电话
        setTimeout(() => {
            this.showNotification('紧急电话已接通');
        }, 1000);
    },
    
    /**
     * 添加紧急联系人
     */
    addEmergencyContact() {
        // 实际应用中，这里应该显示一个表单让用户填写联系人信息
        // 为了演示，我们使用prompt获取信息
        
        const name = prompt('请输入联系人姓名:');
        if (!name) return;
        
        const relationship = prompt('请输入与联系人的关系:');
        if (!relationship) return;
        
        const phone = prompt('请输入联系人电话:');
        if (!phone) return;
        
        // 创建新联系人
        const newContact = {
            id: 'contact_' + Date.now(),
            name: name,
            relationship: relationship,
            phone: phone
        };
        
        // 添加到联系人列表
        this.emergencyContacts.push(newContact);
        
        // 保存数据
        if (this.saveData()) {
            // 更新列表
            this.updateEmergencyContacts();
            
            // 显示成功提示
            this.showNotification('联系人已添加');
        }
    },
    
    /**
     * 编辑紧急联系人
     * @param {string} id - 联系人ID
     */
    editEmergencyContact(id) {
        const contact = this.emergencyContacts.find(c => c.id === id);
        if (!contact) return;
        
        // 实际应用中，这里应该显示一个表单让用户编辑联系人信息
        // 为了演示，我们使用prompt获取信息
        
        const name = prompt('请输入联系人姓名:', contact.name);
        if (name !== null) contact.name = name;
        
        const relationship = prompt('请输入与联系人的关系:', contact.relationship);
        if (relationship !== null) contact.relationship = relationship;
        
        const phone = prompt('请输入联系人电话:', contact.phone);
        if (phone !== null) contact.phone = phone;
        
        // 保存数据
        if (this.saveData()) {
            // 更新列表
            this.updateEmergencyContacts();
            
            // 显示成功提示
            this.showNotification('联系人已更新');
        }
    },
    
    /**
     * 删除紧急联系人
     * @param {string} id - 联系人ID
     */
    deleteEmergencyContact(id) {
        if (confirm('确定要删除这个联系人吗？')) {
            // 从列表中移除
            this.emergencyContacts = this.emergencyContacts.filter(c => c.id !== id);
            
            // 保存数据
            if (this.saveData()) {
                // 更新列表
                this.updateEmergencyContacts();
                
                // 显示成功提示
                this.showNotification('联系人已删除');
            }
        }
    },
    
    /**
     * 完成安全检查
     */
    completeSafetyCheck() {
        // 检查是否所有装备都已勾选
        const allChecked = this.safetyEquipment.every(eq => eq.checked);
        
        if (!allChecked) {
            // 找出未勾选的装备
            const uncheckedItems = this.safetyEquipment
                .filter(eq => !eq.checked)
                .map(eq => eq.name)
                .join('、');
            
            this.showNotification(`请确认以下装备：${uncheckedItems}`, 'warning');
            return;
        }
        
        // 保存检查记录
        const checkRecord = {
            timestamp: new Date().getTime(),
            equipment: [...this.safetyEquipment]
        };
        
        try {
            // 获取现有记录
            const savedRecords = JSON.parse(localStorage.getItem('pzkayak_safety_checks') || '[]');
            
            // 添加新记录
            savedRecords.push(checkRecord);
            
            // 只保留最近10条记录
            if (savedRecords.length > 10) {
                savedRecords.shift();
            }
            
            // 保存记录
            localStorage.setItem('pzkayak_safety_checks', JSON.stringify(savedRecords));
            
            // 显示成功提示
            this.showNotification('安全检查已完成');
        } catch (error) {
            console.error('保存安全检查记录失败:', error);
            this.showNotification('保存安全检查记录失败', 'error');
        }
    },
    
    /**
     * 发送紧急信息
     */
    sendEmergencyInfo() {
        // 检查是否有紧急联系人
        if (this.emergencyContacts.length === 0) {
            this.showNotification('请先添加紧急联系人', 'error');
            return;
        }
        
        // 显示发送中提示
        this.showNotification('正在发送紧急信息...');
        
        // 模拟发送延迟
        setTimeout(() => {
            // 实际应用中，这里应该调用API发送紧急信息
            // 例如发送短信、推送通知等
            
            // 显示发送成功提示
            this.showNotification(`紧急信息已发送给 ${this.emergencyContacts.length} 位联系人`);
            
            // 记录紧急信息发送事件
            this.logEmergencyInfoEvent();
        }, 2000);
    },
    
    /**
     * 记录SOS事件
     */
    logSosEvent() {
        try {
            const event = {
                type: 'sos',
                timestamp: new Date().getTime(),
                location: { ...this.currentLocation }
            };
            
            // 获取现有事件记录
            const savedEvents = JSON.parse(localStorage.getItem('pzkayak_safety_events') || '[]');
            
            // 添加新事件
            savedEvents.push(event);
            
            // 只保留最近20条记录
            if (savedEvents.length > 20) {
                savedEvents.shift();
            }
            
            // 保存记录
            localStorage.setItem('pzkayak_safety_events', JSON.stringify(savedEvents));
        } catch (error) {
            console.error('记录SOS事件失败:', error);
        }
    },
    
    /**
     * 记录紧急信息发送事件
     */
    logEmergencyInfoEvent() {
        try {
            const event = {
                type: 'emergency_info',
                timestamp: new Date().getTime(),
                location: { ...this.currentLocation },
                contacts: this.emergencyContacts.map(c => ({ id: c.id, name: c.name }))
            };
            
            // 获取现有事件记录
            const savedEvents = JSON.parse(localStorage.getItem('pzkayak_safety_events') || '[]');
            
            // 添加新事件
            savedEvents.push(event);
            
            // 只保留最近20条记录
            if (savedEvents.length > 20) {
                savedEvents.shift();
            }
            
            // 保存记录
            localStorage.setItem('pzkayak_safety_events', JSON.stringify(savedEvents));
        } catch (error) {
            console.error('记录紧急信息发送事件失败:', error);
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
window.safetyModule = safetyModule;