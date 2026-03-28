/**
 * PzKayak Connect - Módulo Principal
 */
const pzKayakApp = {
    isOnline: navigator.onLine,
    
    async init() {
        console.log('Inicializando la aplicación PzKayak Connect...');
        this.setupEventListeners();
        await this.initModules();
        this.showWelcomeMessage();
        console.log('Inicialización de PzKayak Connect completada');
    },
    
    setupEventListeners() {
        window.addEventListener('online',  () => { this.isOnline = true;  this.updateConnectionStatus(); });
        window.addEventListener('offline', () => { this.isOnline = false; this.updateConnectionStatus(); });
        document.addEventListener('DOMContentLoaded', () => this.onDOMLoaded());
        document.addEventListener('visibilitychange', () => { if (!document.hidden) this.updateAllData(); });
    },
    
    onDOMLoaded() {
        this.initNavigation();
        this.initModals();
        this.initFormValidation();
        this.initOfflineStorage();
    },
    
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages    = document.querySelectorAll('.page');

        const scrollTop = () => {
            // Scroll después del render del módulo
            setTimeout(() => {
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            }, 50);
        };

        const goToPage = (targetPage) => {
            if (!targetPage) return;
            if (document.getElementById('auth-page')?.classList.contains('active')) return;

            navItems.forEach(n => n.classList.remove('active'));
            document.querySelector(`.nav-item[data-page="${targetPage}"]`)?.classList.add('active');

            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === targetPage) page.classList.add('active');
            });

            history.replaceState(null, '', '#' + targetPage);
            this.onPageChange(targetPage);
            scrollTop();
        };

        navItems.forEach(item => item.addEventListener('click', () => goToPage(item.dataset.page)));

        // Hash restore — espera a que el auth complete
        const hash = window.location.hash.replace('#', '');
        const validPages = Array.from(pages).map(p => p.id);
        window._pendingHash = (hash && validPages.includes(hash) && hash !== 'auth-page') ? hash : null;

        window.addEventListener('popstate', () => {
            const h = window.location.hash.replace('#', '');
            if (h && validPages.includes(h)) goToPage(h);
        });

        document.getElementById('settings-btn')?.addEventListener('click', () => this.navigateToPage('profile-page'));
        window._goToPage = goToPage;
    },
    
    initModals() {
        const notificationBtn        = document.getElementById('notification-btn');
        const notificationModal      = document.getElementById('notification-modal');
        const closeNotificationModal = document.getElementById('close-notification-modal');
        if (notificationBtn && notificationModal && closeNotificationModal) {
            notificationBtn.addEventListener('click',        () => notificationModal.classList.remove('hidden'));
            closeNotificationModal.addEventListener('click', () => notificationModal.classList.add('hidden'));
            notificationModal.addEventListener('click', e => { if (e.target === notificationModal) notificationModal.classList.add('hidden'); });
        }
    },
    
    initFormValidation() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', e => {
                let isValid = true;
                form.querySelectorAll('[required]').forEach(field => {
                    if (!field.value.trim()) { isValid = false; this.highlightInvalidField(field); }
                    else this.removeHighlight(field);
                });
                if (!isValid) { e.preventDefault(); this.showNotification('Por favor, completa todos los campos obligatorios', 'error'); }
            });
        });
    },
    
    initOfflineStorage() {
        if (typeof Storage !== 'undefined') {
            if (!localStorage.getItem('pzkayak_first_time')) {
                localStorage.setItem('pzkayak_first_time', 'false');
                localStorage.setItem('pzkayak_version', '1.0.0');
            }
        }
    },
    
    async initModules() {
        if (typeof weatherModule   !== 'undefined') weatherModule.init();
        if (typeof tripTracking    !== 'undefined') await tripTracking.init();
        if (typeof catchLog        !== 'undefined') await catchLog.init();
        if (typeof communityModule !== 'undefined') communityModule.init();
        if (typeof safetyModule    !== 'undefined') await safetyModule.init();
        if (typeof profileModule   !== 'undefined') await profileModule.init();
        if (typeof legalModule     !== 'undefined') legalModule.init();
        if (typeof marineModule    !== 'undefined') await marineModule.init();
    },
    
    onPageChange(pageId) {
        switch (pageId) {
            case 'dashboard-page':   if (typeof weatherModule   !== 'undefined') weatherModule.updateWeatherDisplay(); break;
            case 'trip-page':        if (typeof tripTracking    !== 'undefined') tripTracking.updateUI(); break;
            case 'catch-page':       if (typeof catchLog        !== 'undefined') catchLog.loadCatches().then(() => catchLog.updateCatchList()); break;
            case 'community-page':   if (typeof communityModule !== 'undefined') communityModule.refreshLocations(); break;
            case 'safety-page':      if (typeof safetyModule    !== 'undefined') safetyModule.updateCurrentLocation(); break;
            case 'marine-page':      if (typeof marineModule    !== 'undefined') marineModule.refresh(); break;
            case 'regulations-page': if (typeof legalModule     !== 'undefined') legalModule.renderZona(legalModule.zonaActual); break;
            case 'profile-page':     if (typeof profileModule   !== 'undefined') profileModule.renderEstadisticas(); break;
        }
    },
    
    navigateToPage(pageId) {
        document.querySelector(`.nav-item[data-page="${pageId}"]`)?.click();
    },
    
    updateConnectionStatus() {
        document.querySelectorAll('.connection-status').forEach(ind => {
            ind.className = `connection-status inline-block w-3 h-3 rounded-full mr-1 ${this.isOnline ? 'bg-green-500' : 'bg-red-500'}`;
        });
        if (this.isOnline) this.syncOfflineData();
    },
    
    syncOfflineData() { console.log('Sincronizando datos offline...'); },
    
    updateAllData() {
        if (!this.isOnline) return;
        if (typeof weatherModule   !== 'undefined') weatherModule.refreshWeatherData();
        if (typeof safetyModule    !== 'undefined') safetyModule.updateCurrentLocation();
        if (typeof communityModule !== 'undefined') communityModule.refreshLocations();
    },
    
    highlightInvalidField(field) {
        field.classList.add('border-red-500', 'focus:ring-red-500');
        let err = field.nextElementSibling;
        if (!err?.classList.contains('error-message')) {
            err = document.createElement('p');
            err.className = 'error-message text-red-500 text-xs mt-1';
            field.parentNode.insertBefore(err, field.nextSibling);
        }
        err.textContent = 'Este campo es obligatorio';
    },
    
    removeHighlight(field) {
        field.classList.remove('border-red-500', 'focus:ring-red-500');
        const err = field.nextElementSibling;
        if (err?.classList.contains('error-message')) err.remove();
    },
    
    showWelcomeMessage() { console.log('¡Bienvenido a PzKayak Connect!'); },
    showNotification(message, type = 'success') { toast(message, type); }
};

document.addEventListener('DOMContentLoaded', () => pzKayakApp.init().catch(console.error));