/**
 * Módulo de Seguimiento de Viajes
 * Gestiona el rastreo GPS, cálculo de datos del viaje y modo sin conexión
 */

const tripTracking = {
    isActive: false,
    isPaused: false,

    tripData: {
        startTime: null,
        endTime: null,
        duration: 0,
        distance: 0,
        speed: 0,
        coordinates: []
    },

    config: {
        updateInterval: 1000,
        minDistance: 10,
        maxPoints: 1000
    },

    trackingInterval: null,
    currentLat: null,
    currentLng: null,

    init() {
        this.setupEventListeners();
        this.setupMap();
        this.loadSavedTrips();
    },

    setupEventListeners() {
        const startBtn = document.getElementById('start-trip-btn');
        const pauseBtn = document.getElementById('pause-trip-btn');
        const stopBtn  = document.getElementById('stop-trip-btn');
        if (startBtn) startBtn.addEventListener('click', () => this.startTrip());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pauseTrip());
        if (stopBtn)  stopBtn.addEventListener('click',  () => this.stopTrip());
    },

    setupMap() {
        const container = document.getElementById('trip-map');
        if (!container) return;

        const cargarMapa = (lat, lng) => {
            this.currentLat = lat;
            this.currentLng = lng;
            container.innerHTML = `<iframe 
                src="https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed&hl=es"
                style="width:100%;height:100%;border:none;border-radius:0.75rem"
                allowfullscreen loading="lazy">
            </iframe>`;
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => cargarMapa(pos.coords.latitude, pos.coords.longitude),
                ()    => cargarMapa(10.4806, -66.9036)
            );
        } else {
            cargarMapa(10.4806, -66.9036);
        }
    },

    actualizarMapa(lat, lng) {
        const container = document.getElementById('trip-map');
        if (!container) return;
        container.innerHTML = `<iframe 
            src="https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&hl=es"
            style="width:100%;height:100%;border:none;border-radius:0.75rem"
            allowfullscreen loading="lazy">
        </iframe>`;
    },

    startTrip() {
        if (!this.isActive) {
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
            this.updateUI();
            this.getCurrentLocation()
                .then(position => {
                    this.addCoordinate(position.coords.latitude, position.coords.longitude);
                    this.startTrackingInterval();
                })
                .catch(() => {
                    this.showNotification('No se pudo obtener tu ubicación', 'error');
                    this.stopTrip();
                });
        } else if (this.isPaused) {
            this.isPaused = false;
            this.updateUI();
            this.startTrackingInterval();
        }
    },

    pauseTrip() {
        if (this.isActive && !this.isPaused) {
            this.isPaused = true;
            this.stopTrackingInterval();
            this.updateUI();
            this.updateConnectionStatus('offline');
        }
    },

    stopTrip() {
        if (this.isActive) {
            this.isActive = false;
            this.isPaused = false;
            this.tripData.endTime = new Date();
            this.stopTrackingInterval();
            this.saveTrip();
            this.tripData = { startTime: null, endTime: null, duration: 0, distance: 0, speed: 0, coordinates: [] };
            this.updateUI();
            this.updateConnectionStatus('online');
            this.showNotification('Viaje guardado');
        }
    },

    startTrackingInterval() {
        this.trackingInterval = setInterval(() => {
            if (!this.isPaused) {
                this.tripData.duration = Math.floor((new Date() - this.tripData.startTime) / 1000);
                this.getCurrentLocation()
                    .then(pos => this.addCoordinate(pos.coords.latitude, pos.coords.longitude))
                    .catch(() => {});
                this.updateTripDisplay();
            }
        }, this.config.updateInterval);
    },

    stopTrackingInterval() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    },

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 5000, maximumAge: 0
                });
            } else {
                reject(new Error('Geolocalización no soportada'));
            }
        });
    },

    addCoordinate(lat, lng) {
        const ultimo = this.tripData.coordinates.length > 0
            ? this.tripData.coordinates[this.tripData.coordinates.length - 1] : null;

        this.tripData.coordinates.push({ lat, lng, timestamp: Date.now() });

        // Actualizar mapa cada 5 puntos para no recargar constantemente
        if (this.tripData.coordinates.length % 5 === 0) {
            this.actualizarMapa(lat, lng);
        }

        if (ultimo) {
            const dist = this.calculateDistance(ultimo.lat, ultimo.lng, lat, lng);
            if (dist >= this.config.minDistance / 1000) {
                this.tripData.distance += dist;
                this.tripData.speed = this.tripData.duration > 0
                    ? this.tripData.distance / (this.tripData.duration / 3600) : 0;
            }
        }

        if (this.tripData.coordinates.length > this.config.maxPoints) {
            this.tripData.coordinates.shift();
        }
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    toRad(g) { return g * (Math.PI / 180); },

    updateTripDisplay() {
        const h = Math.floor(this.tripData.duration / 3600);
        const m = Math.floor((this.tripData.duration % 3600) / 60);
        const stats = document.querySelectorAll('#trip-page .text-xl.font-bold');
        if (stats[0]) stats[0].innerHTML = `${this.tripData.distance.toFixed(1)} <span class="text-sm font-normal">km</span>`;
        if (stats[1]) stats[1].innerHTML = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} <span class="text-sm font-normal">h</span>`;
        if (stats[2]) stats[2].innerHTML = `${this.tripData.speed.toFixed(1)} <span class="text-sm font-normal">km/h</span>`;
    },

    updateUI() {
        const startBtn = document.getElementById('start-trip-btn');
        const pauseBtn = document.getElementById('pause-trip-btn');
        const stopBtn  = document.getElementById('stop-trip-btn');
        if (startBtn) startBtn.disabled = this.isActive && !this.isPaused;
        if (pauseBtn) {
            pauseBtn.disabled = !this.isActive;
            pauseBtn.innerHTML = this.isPaused
                ? '<i class="fa fa-play mr-1"></i> Continuar'
                : '<i class="fa fa-pause mr-1"></i> Pausar';
        }
        if (stopBtn) stopBtn.disabled = !this.isActive;
        this.updateConnectionStatus(this.isPaused ? 'offline' : 'online');
    },

    updateConnectionStatus(estado) {
        const ind  = document.getElementById('connection-status');
        const txt  = ind?.nextElementSibling;
        if (ind) {
            ind.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-500');
            if (estado === 'online')        { ind.classList.add('bg-green-500');  if (txt) txt.textContent = 'Modo en línea'; }
            else if (estado === 'offline')  { ind.classList.add('bg-yellow-500'); if (txt) txt.textContent = 'Modo sin conexión'; }
            else                            { ind.classList.add('bg-red-500');    if (txt) txt.textContent = 'Error de conexión'; }
        }
    },

    saveTrip() {
        if (this.tripData.coordinates.length === 0) return;
        const viaje = { ...this.tripData, id: 'viaje_' + Date.now(), date: new Date().toISOString().split('T')[0] };
        try {
            const guardados = JSON.parse(localStorage.getItem('pzkayak_trips') || '[]');
            guardados.push(viaje);
            localStorage.setItem('pzkayak_trips', JSON.stringify(guardados));
            this.updateTripList(guardados);
        } catch (e) {
            this.showNotification('Error al guardar el viaje', 'error');
        }
    },

    loadSavedTrips() {
        try {
            const guardados = JSON.parse(localStorage.getItem('pzkayak_trips') || '[]');
            this.updateTripList(guardados);
        } catch (e) {}
    },

    updateTripList(viajes) {
        viajes.sort((a, b) => new Date(b.date) - new Date(a.date));
        const contenedor = document.querySelector('#trip-page .space-y-3');
        if (!contenedor) return;
        contenedor.innerHTML = '';
        const recientes = viajes.slice(0, 5);
        recientes.forEach(viaje => {
            const fecha = new Date(viaje.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            const dur   = this.formatDuration(viaje.duration);
            const item  = document.createElement('div');
            item.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            item.innerHTML = `
                <div class="bg-blue-100 p-2 rounded-full mr-3"><i class="fa fa-calendar text-primary"></i></div>
                <div class="flex-1">
                    <p class="font-medium">${fecha}</p>
                    <p class="text-sm text-gray-600">${viaje.distance.toFixed(1)} km | ${dur}</p>
                </div>
                <button class="text-primary"><i class="fa fa-chevron-right"></i></button>`;
            item.querySelector('button').addEventListener('click', () => this.showTripDetail(viaje));
            contenedor.appendChild(item);
        });
        if (recientes.length === 0) {
            contenedor.innerHTML = '<div class="text-center py-4 text-gray-500">Sin historial de viajes</div>';
        }
    },

    formatDuration(seg) {
        return `${Math.floor(seg/3600)} h ${Math.floor((seg%3600)/60)} min`;
    },

    showTripDetail(viaje) {
        this.showNotification(`Viaje del ${new Date(viaje.date).toLocaleDateString('es-ES')}`);
    },

    showNotification(msg) { alert(msg); }
};

window.tripTracking = tripTracking;