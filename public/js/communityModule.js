/**
 * Módulo de Comunidad - PzKayak Connect
 */

const communityModule = {

    currentUser: {
        id: 'user_yo',
        nombre: 'Tú',
        coordinates: [10.4806, -66.9036] // fallback Caracas, se reemplaza con GPS
    },

    amigos: [
        { id: 'u_carlos',  nombre: 'Carlos',   estado: 'online',  distancia: 2.5, coordinates: [10.4830, -66.9100] },
        { id: 'u_miguel',  nombre: 'Miguel',   estado: 'online',  distancia: 5.8, coordinates: [10.4900, -66.9200] },
        { id: 'u_roberto', nombre: 'Roberto',  estado: 'offline', distancia: 8.3, coordinates: [10.4950, -66.9300] }
    ],

    cercanos: [
        { id: 'u_dana',  nombre: 'Dana',  distancia: 3.2, tipo: 'Pesca en mar',   nivel: 'Avanzado' },
        { id: 'u_elena', nombre: 'Elena', distancia: 4.5, tipo: 'Pesca en río',   nivel: 'Intermedio' },
        { id: 'u_pedro', nombre: 'Pedro', distancia: 6.1, tipo: 'Pesca en kayak', nivel: 'Principiante' }
    ],

    actividades: [
        {
            id: 'act_001',
            titulo: 'Pesca de Fin de Semana',
            fecha: '2025-07-26', hora: '08:00',
            lugar: 'Zona costera central',
            participantes: ['u_carlos', 'u_miguel', 'u_roberto'],
            maxParticipantes: 10,
            estado: 'ongoing'
        },
        {
            id: 'act_002',
            titulo: 'Clase de Kayak para Principiantes',
            fecha: '2025-08-05', hora: '14:00',
            lugar: 'Centro Náutico',
            participantes: ['u_dana'],
            maxParticipantes: 15,
            estado: 'upcoming'
        }
    ],

    colores: [
        'bg-blue-100 text-blue-600',
        'bg-green-100 text-green-600',
        'bg-orange-100 text-orange-600',
        'bg-purple-100 text-purple-600',
        'bg-red-100 text-red-600',
        'bg-yellow-100 text-yellow-700'
    ],

    colorPara(nombre) {
        let hash = 0;
        for (let c of nombre) hash += c.charCodeAt(0);
        return this.colores[hash % this.colores.length];
    },

    init() {
        this.setupMap();
        this.setupEventListeners();
        this.render();
    },

    // ── MAPA ──────────────────────────────────────────────────────────────────

    setupMap() {
        const container = document.getElementById('community-map');
        if (!container) return;

        const cargar = (lat, lng) => {
            this.currentUser.coordinates = [lat, lng];
            // Ajustar coordenadas de amigos relativas al usuario real
            this.amigos.forEach((a, i) => {
                a.coordinates = [lat + (i + 1) * 0.005, lng + (i + 1) * 0.009];
            });
            this.mostrarMapa(lat, lng);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => cargar(pos.coords.latitude, pos.coords.longitude),
                ()  => cargar(this.currentUser.coordinates[0], this.currentUser.coordinates[1])
            );
        } else {
            cargar(this.currentUser.coordinates[0], this.currentUser.coordinates[1]);
        }
    },

    mostrarMapa(lat, lng, zoom = 14) {
        const container = document.getElementById('community-map');
        if (!container) return;
        container.innerHTML = `<iframe
            src="https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed&hl=es"
            style="width:100%;height:100%;border:none;border-radius:0.75rem"
            allowfullscreen loading="lazy">
        </iframe>`;
    },

    mostrarUbicacionAmigo(amigo) {
        const [lat, lng] = amigo.coordinates;
        this.mostrarMapa(lat, lng, 15);
        document.getElementById('community-map')?.scrollIntoView({ behavior: 'smooth' });
    },

    // ── EVENTOS ───────────────────────────────────────────────────────────────

    setupEventListeners() {
        document.getElementById('community-refresh-btn')
            ?.addEventListener('click', () => this.refreshLocations());

        document.getElementById('create-activity-btn')
            ?.addEventListener('click', () => this.mostrarFormActividad());
    },

    // ── RENDER COMPLETO ───────────────────────────────────────────────────────

    render() {
        this.renderContadorOnline();
        this.renderAmigos();
        this.renderCercanos();
        this.renderActividades();
    },

    renderContadorOnline() {
        const el = document.getElementById('community-online-count');
        if (!el) return;
        const n = this.amigos.filter(a => a.estado === 'online').length;
        el.textContent = `${n} amigo${n !== 1 ? 's' : ''} en línea`;
    },

    // ── AMIGOS ────────────────────────────────────────────────────────────────

    renderAmigos() {
        const cont = document.getElementById('friend-list');
        if (!cont) return;
        cont.innerHTML = '';

        if (this.amigos.length === 0) {
            cont.innerHTML = `<p class="text-center py-4 text-gray-500 text-sm">
                Sin amigos aún — añade pescadores cercanos
            </p>`;
            return;
        }

        this.amigos.forEach(amigo => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            item.innerHTML = `
                <div class="w-10 h-10 ${this.colorPara(amigo.nombre)} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    ${amigo.nombre.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium">${amigo.nombre}</p>
                    <p class="text-sm text-gray-500 flex items-center gap-1">
                        <span class="inline-block w-2 h-2 rounded-full ${amigo.estado === 'online' ? 'bg-green-500' : 'bg-gray-400'}"></span>
                        ${amigo.estado === 'online' ? 'En línea' : 'Desconectado'} · ${amigo.distancia} km
                    </p>
                </div>
                <div class="flex gap-2">
                    <button class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-blue-50 btn-ubicar" title="Ver en mapa">
                        <i class="fa fa-map-marker"></i>
                    </button>
                    <button class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-blue-50 btn-mensaje" title="Mensaje">
                        <i class="fa fa-comment"></i>
                    </button>
                    <button class="w-8 h-8 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 btn-eliminar" title="Eliminar amigo">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            `;
            item.querySelector('.btn-ubicar').onclick   = () => this.mostrarUbicacionAmigo(amigo);
            item.querySelector('.btn-mensaje').onclick  = () => this.enviarMensaje(amigo);
            item.querySelector('.btn-eliminar').onclick = () => this.eliminarAmigo(amigo.id);
            cont.appendChild(item);
        });
    },

    eliminarAmigo(id) {
        const amigo = this.amigos.find(a => a.id === id);
        if (!amigo) return;
        if (!(await toast.confirm(`¿Eliminar a ${amigo.nombre} de tus amigos?`)) return;
        this.amigos = this.amigos.filter(a => a.id !== id);
        // Devolver a cercanos
        this.cercanos.unshift({
            id: amigo.id,
            nombre: amigo.nombre,
            distancia: amigo.distancia,
            tipo: 'Pesca en kayak',
            nivel: 'Intermedio'
        });
        this.render();
    },

    enviarMensaje(amigo) {
        toast.info(`Chat con ${amigo.nombre} — función próximamente`);
    },

    // ── PESCADORES CERCANOS ───────────────────────────────────────────────────

    renderCercanos() {
        const cont = document.getElementById('nearby-list');
        if (!cont) return;
        cont.innerHTML = '';

        if (this.cercanos.length === 0) {
            cont.innerHTML = `<p class="text-center py-4 text-gray-500 text-sm">No hay pescadores cercanos</p>`;
            return;
        }

        this.cercanos.forEach(pescador => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            item.innerHTML = `
                <div class="w-10 h-10 ${this.colorPara(pescador.nombre)} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    ${pescador.nombre.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium">${pescador.nombre}</p>
                    <p class="text-sm text-gray-500">${pescador.distancia} km · ${pescador.tipo} · ${pescador.nivel}</p>
                </div>
                <button class="btn btn-primary text-xs px-3 py-1 btn-agregar flex-shrink-0">
                    <i class="fa fa-user-plus mr-1"></i> Añadir
                </button>
            `;
            item.querySelector('.btn-agregar').onclick = () => this.agregarAmigo(pescador);
            cont.appendChild(item);
        });
    },

    agregarAmigo(pescador) {
        if (this.amigos.some(a => a.id === pescador.id)) {
            toast.info(`${pescador.nombre} ya es tu amigo`); return;
        }
        const [lat, lng] = this.currentUser.coordinates;
        this.amigos.push({
            id: pescador.id,
            nombre: pescador.nombre,
            estado: 'online',
            distancia: pescador.distancia,
            coordinates: [
                lat + (Math.random() - 0.5) * 0.05,
                lng + (Math.random() - 0.5) * 0.05
            ]
        });
        this.cercanos = this.cercanos.filter(p => p.id !== pescador.id);
        this.render();
        toast.success(`¡${pescador.nombre} añadido como amigo!`);
    },

    // ── ACTIVIDADES ───────────────────────────────────────────────────────────

    renderActividades() {
        const cont = document.getElementById('activity-list');
        if (!cont) return;
        cont.innerHTML = '';

        if (this.actividades.length === 0) {
            cont.innerHTML = `<p class="text-center py-4 text-gray-500 text-sm">Sin actividades — ¡crea una!</p>`;
            return;
        }

        this.actividades.forEach(act => {
            const fecha    = new Date(act.fecha + 'T' + act.hora).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            const yaUnido  = act.participantes.includes(this.currentUser.id);
            const lleno    = act.participantes.length >= act.maxParticipantes;
            const pct      = Math.round(act.participantes.length / act.maxParticipantes * 100);

            const statusBadge = act.estado === 'ongoing'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700';
            const statusText = act.estado === 'ongoing' ? 'En curso' : 'Próximamente';

            const item = document.createElement('div');
            item.className = 'p-3 bg-gray-50 rounded-lg mb-2';
            item.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <h3 class="font-medium flex-1 mr-2">${act.titulo}</h3>
                    <span class="text-xs ${statusBadge} px-2 py-1 rounded-full flex-shrink-0">${statusText}</span>
                </div>
                <p class="text-sm text-gray-500 mb-1"><i class="fa fa-calendar mr-1 text-gray-400"></i>${fecha} ${act.hora}</p>
                <p class="text-sm text-gray-500 mb-2"><i class="fa fa-map-marker mr-1 text-gray-400"></i>${act.lugar}</p>
                <div class="mb-3">
                    <div class="flex justify-between text-xs text-gray-400 mb-1">
                        <span>${act.participantes.length} participantes</span>
                        <span>Máx. ${act.maxParticipantes}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="bg-primary h-1.5 rounded-full" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${!yaUnido && !lleno ? `
                        <button class="btn btn-primary text-sm flex-1 btn-unirse">
                            <i class="fa fa-plus mr-1"></i> Unirse
                        </button>
                    ` : yaUnido ? `
                        <button class="btn btn-secondary text-sm flex-1 btn-salir">
                            <i class="fa fa-check mr-1"></i> Unido — Salir
                        </button>
                    ` : `
                        <button class="btn text-sm flex-1 bg-gray-200 text-gray-400" disabled>Lleno</button>
                    `}
                    <button class="btn btn-secondary text-sm btn-compartir px-3">
                        <i class="fa fa-share-alt"></i>
                    </button>
                </div>
            `;

            item.querySelector('.btn-unirse')?.addEventListener('click', () => this.unirseActividad(act.id));
            item.querySelector('.btn-salir')?.addEventListener('click',  () => this.salirActividad(act.id));
            item.querySelector('.btn-compartir')?.addEventListener('click', () => this.compartirActividad(act));
            cont.appendChild(item);
        });
    },

    unirseActividad(id) {
        const act = this.actividades.find(a => a.id === id);
        if (!act || act.participantes.includes(this.currentUser.id)) return;
        act.participantes.push(this.currentUser.id);
        this.renderActividades();
        toast.success(`¡Te uniste a "${act.titulo}"!`);
    },

    salirActividad(id) {
        const act = this.actividades.find(a => a.id === id);
        if (!act) return;
        if (!(await toast.confirm(`¿Salir de "${act.titulo}"?`)) return;
        act.participantes = act.participantes.filter(p => p !== this.currentUser.id);
        this.renderActividades();
    },

    compartirActividad(act) {
        const texto = `¡Únete a "${act.titulo}" el ${act.fecha} en ${act.lugar}! — PzKayak Connect`;
        if (navigator.share) {
            navigator.share({ title: act.titulo, text: texto });
        } else {
            navigator.clipboard?.writeText(texto).then(() => toast.info('Enlace copiado al portapapeles'));
        }
    },

    mostrarFormActividad() {
        // Crear modal simple
        const overlay = document.createElement('div');
        overlay.id = 'activity-modal';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">Crear Actividad</h2>
                    <button id="modal-close" class="text-gray-400 hover:text-gray-600"><i class="fa fa-times text-xl"></i></button>
                </div>
                <div class="space-y-3">
                    <input id="act-titulo" type="text" class="input-field" placeholder="Nombre de la actividad">
                    <input id="act-lugar" type="text" class="input-field" placeholder="Lugar">
                    <div class="grid grid-cols-2 gap-3">
                        <input id="act-fecha" type="date" class="input-field">
                        <input id="act-hora"  type="time" class="input-field" value="08:00">
                    </div>
                    <input id="act-max" type="number" class="input-field" placeholder="Máx. participantes" value="10" min="2" max="50">
                    <button id="modal-guardar" class="btn btn-primary w-full">
                        <i class="fa fa-check mr-1"></i> Crear Actividad
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('modal-close').onclick   = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.getElementById('modal-guardar').onclick = () => {
            const titulo = document.getElementById('act-titulo').value.trim();
            const lugar  = document.getElementById('act-lugar').value.trim();
            const fecha  = document.getElementById('act-fecha').value;
            const hora   = document.getElementById('act-hora').value;
            const max    = parseInt(document.getElementById('act-max').value) || 10;

            if (!titulo || !lugar || !fecha) { toast.info('Completa todos los campos'); return; }

            this.actividades.unshift({
                id: 'act_' + Date.now(),
                titulo, lugar, fecha, hora,
                participantes: [this.currentUser.id],
                maxParticipantes: max,
                estado: 'upcoming'
            });
            overlay.remove();
            this.renderActividades();
            toast.success(`¡Actividad "${titulo}" creada!`);
        };
    },

    // ── ACTUALIZAR ────────────────────────────────────────────────────────────

    refreshLocations() {
        const btn = document.getElementById('community-refresh-btn');
        if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i>'; btn.disabled = true; }

        setTimeout(() => {
            this.amigos.forEach(a => {
                a.distancia = Math.max(0.1, Math.round((a.distancia + (Math.random() - 0.5) * 0.5) * 10) / 10);
            });
            this.render();
            if (btn) { btn.innerHTML = '<i class="fa fa-refresh mr-1"></i> Actualizar'; btn.disabled = false; }
        }, 800);
    }
};

window.communityModule = communityModule;