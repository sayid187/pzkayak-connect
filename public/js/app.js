/**
 * PzKayak Connect - Módulo Principal
 * Responsable de inicializar y coordinar todos los módulos
 */

const pzKayakApp = {
    // Estado de la aplicación
    isOnline: navigator.onLine,
    
    // Inicializar aplicación
    init() {
        console.log('Inicializando la aplicación PzKayak Connect...');
        
        this.setupEventListeners();
        this.initModules();
        this.showWelcomeMessage();
        
        console.log('Inicialización de PzKayak Connect completada');
    },
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });
        
        document.addEventListener('DOMContentLoaded', () => {
            this.onDOMLoaded();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateAllData();
            }
        });
    },
    
    onDOMLoaded() {
        this.initNavigation();
        this.initModals();
        this.initFormValidation();
        this.initOfflineStorage();
    },
    
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetPage = item.dataset.page;
                
                navItems.forEach(navItem => navItem.classList.remove('active'));
                item.classList.add('active');
                
                pages.forEach(page => {
                    page.classList.remove('active');
                    if (page.id === targetPage) {
                        page.classList.add('active');
                        this.onPageChange(targetPage);
                    }
                });
            });
        });
        
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.navigateToPage('profile-page');
            });
        }
    },
    
    initModals() {
        const notificationBtn = document.getElementById('notification-btn');
        const notificationModal = document.getElementById('notification-modal');
        const closeNotificationModal = document.getElementById('close-notification-modal');
        
        if (notificationBtn && notificationModal && closeNotificationModal) {
            notificationBtn.addEventListener('click', () => {
                notificationModal.classList.remove('hidden');
            });
            
            closeNotificationModal.addEventListener('click', () => {
                notificationModal.classList.add('hidden');
            });
            
            notificationModal.addEventListener('click', (e) => {
                if (e.target === notificationModal) {
                    notificationModal.classList.add('hidden');
                }
            });
        }
    },
    
    initFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const requiredFields = form.querySelectorAll('[required]');
                let isValid = true;
                
                requiredFields.forEach(field => {
                    if (!field.value.trim()) {
                        isValid = false;
                        this.highlightInvalidField(field);
                    } else {
                        this.removeHighlight(field);
                    }
                });
                
                if (!isValid) {
                    e.preventDefault();
                    this.showNotification('Por favor, completa todos los campos obligatorios', 'error');
                }
            });
        });
    },
    
    initOfflineStorage() {
        if (typeof Storage !== 'undefined') {
            console.log('El navegador soporta almacenamiento local');
            
            const isFirstTime = !localStorage.getItem('pzkayak_first_time');
            
            if (isFirstTime) {
                localStorage.setItem('pzkayak_first_time', 'false');
                localStorage.setItem('pzkayak_version', '1.0.0');
                
                setTimeout(() => {
                    this.showNotification('¡Bienvenido a PzKayak Connect!', 'success');
                }, 1000);
            }
        } else {
            console.warn('El navegador no soporta almacenamiento local, algunas funciones pueden verse afectadas');
            this.showNotification('Almacenamiento local no soportado, algunas funciones pueden verse afectadas', 'warning');
        }
    },
    
    initModules() {
        if (typeof weatherModule !== 'undefined') weatherModule.init();
        if (typeof tripTracking !== 'undefined') tripTracking.init();
        if (typeof catchLog !== 'undefined') catchLog.init();
        if (typeof communityModule !== 'undefined') communityModule.init();
        if (typeof safetyModule !== 'undefined') safetyModule.init();
    },
    
    onPageChange(pageId) {
        console.log(`Cambiando a la página: ${pageId}`);
        
        switch (pageId) {
            case 'dashboard-page':
                if (typeof weatherModule !== 'undefined') weatherModule.updateWeatherDisplay();
                break;
            case 'trip-page':
                if (typeof tripTracking !== 'undefined') tripTracking.updateUI();
                break;
            case 'catch-page':
                if (typeof catchLog !== 'undefined') catchLog.updateCatchList();
                break;
            case 'community-page':
                if (typeof communityModule !== 'undefined') communityModule.refreshLocations();
                break;
            case 'safety-page':
                if (typeof safetyModule !== 'undefined') safetyModule.updateCurrentLocation();
                break;
        }
    },
    
    navigateToPage(pageId) {
        const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (navItem) navItem.click();
    },
    
    updateConnectionStatus() {
        console.log(`Estado de red: ${this.isOnline ? 'En línea' : 'Desconectado'}`);
        
        const statusIndicators = document.querySelectorAll('.connection-status');
        
        statusIndicators.forEach(indicator => {
            indicator.className = `connection-status inline-block w-3 h-3 rounded-full mr-1 ${this.isOnline ? 'bg-green-500' : 'bg-red-500'}`;
        });
        
        if (this.isOnline) {
            this.syncOfflineData();
        }
    },
    
    syncOfflineData() {
        console.log('Sincronizando datos offline...');
        this.showNotification('Datos offline sincronizados', 'success');
    },
    
    updateAllData() {
        if (!this.isOnline) return;
        
        console.log('Actualizando todos los datos...');
        
        if (typeof weatherModule !== 'undefined') weatherModule.refreshWeatherData();
        if (typeof safetyModule !== 'undefined') safetyModule.updateCurrentLocation();
        if (typeof communityModule !== 'undefined') communityModule.refreshLocations();
    },
    
    highlightInvalidField(field) {
        field.classList.add('border-red-500');
        field.classList.add('focus:ring-red-500');
        
        let errorElement = field.nextElementSibling;
        
        if (!errorElement || !errorElement.classList.contains('error-message')) {
            errorElement = document.createElement('p');
            errorElement.className = 'error-message text-red-500 text-xs mt-1';
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        errorElement.textContent = 'Este campo es obligatorio';
    },
    
    removeHighlight(field) {
        field.classList.remove('border-red-500');
        field.classList.remove('focus:ring-red-500');
        
        const errorElement = field.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
        }
    },
    
    showWelcomeMessage() {
        console.log('¡Bienvenido a PzKayak Connect!');
    },
    
    showNotification(message, type = 'success') {
        alert(message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    pzKayakApp.init();
});