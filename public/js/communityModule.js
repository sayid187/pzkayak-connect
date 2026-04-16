/**
 * Módulo de Comunidad - PzKayak Connect
 * Requiere tablas Supabase:
 *   - perfiles       (ya existe)
 *   - amigos         (user_id, amigo_id, created_at)
 *   - actividades    (id, creador_id, titulo, lugar, fecha, hora, max_participantes, created_at)
 *   - actividad_participantes (actividad_id, user_id, created_at)
 */

const communityModule = {

    // ── ESTADO ────────────────────────────────────────────────────────────────
    currentUser:  null,
    perfil:       null,
    amigos:       [],
    cercanos:     [],
    actividades:  [],
    miUbicacion:  null,

    colores: [
        'bg-blue-100 text-blue-600',
        'bg-green-100 text-green-600',
        'bg-orange-100 text-orange-600',
        'bg-purple-100 text-purple-600',
        'bg-red-100 text-red-600',
        'bg-yellow-100 text-yellow-700'
    ],

    colorPara(nombre = '') {
        let hash = 0;
        for (let c of nombre) hash += c.charCodeAt(0);
        return this.colores[hash % this.colores.length];
    },

    // ── INIT ──────────────────────────────────────────────────────────────────

    async init() {
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) return;
            this.currentUser = session.user;

            await this.crearTablasSimuladas(); // intenta crear las tablas si no existen via upsert
            await this.cargarTodo();
            this.setupMap();
            this.setupEventListeners();
            this.render();
        } catch (err) {
            console.error('Community init error:', err);
            // Fallback con datos demo si Supabase falla
            this.cargarDatosDemo();
            this.setupMap();
            this.setupEventListeners();
            this.render();
        }
    },

    // ── SUPABASE ──────────────────────────────────────────────────────────────

    async cargarTodo() {
        await Promise.all([
            this.cargarPerfil(),
            this.cargarAmigos(),
            this.cargarActividades(),
        ]);
        await this.cargarCercanos(); // depende de miUbicacion
    },

    async cargarPerfil() {
        try {
            const { data } = await db.from('perfiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
            this.perfil = data;
        } catch {}
    },

    async cargarAmigos() {
        try {
            const { data, error } = await db.from('amigos')
                .select(`
                    id,
                    amigo_id,
                    perfiles!amigos_amigo_id_fkey (
                        id, nombre, avatar_url, lat, lng, ultima_vez_online
                    )
                `)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            this.amigos = (data || []).map(row => {
                const p = row.perfiles || {};
                return {
                    id:         row.id,
                    amigo_id:   row.amigo_id,
                    nombre:     p.nombre || 'Pescador',
                    avatar_url: p.avatar_url || null,
                    lat:        p.lat || null,
                    lng:        p.lng || null,
                    online:     this.estaOnline(p.ultima_vez_online),
                    distancia:  this.calcularDistancia(p.lat, p.lng)
                };
            });
        } catch (err) {
            console.warn('Error cargando amigos:', err);
            this.amigos = [];
        }
    },

    async cargarCercanos() {
        try {
            // Traer perfiles que NO son amigos ni el usuario actual
            const idsAmigos = this.amigos.map(a => a.amigo_id);
            idsAmigos.push(this.currentUser.id);

            const { data, error } = await db.from('perfiles')
                .select('id, nombre, avatar_url, lat, lng, tipo_pesca, nivel, ultima_vez_online')
                .not('id', 'in', `(${idsAmigos.join(',')})`)
                .not('lat', 'is', null)
                .limit(20);

            if (error) throw error;

            this.cercanos = (data || [])
                .map(p => ({
                    id:         p.id,
                    nombre:     p.nombre || 'Pescador',
                    avatar_url: p.avatar_url || null,
                    tipo:       p.tipo_pesca || 'Pesca en kayak',
                    nivel:      p.nivel || 'Intermedio',
                    distancia:  this.calcularDistancia(p.lat, p.lng),
                    lat:        p.lat,
                    lng:        p.lng,
                }))
                .filter(p => p.distancia !== null)
                .sort((a, b) => a.distancia - b.distancia)
                .slice(0, 10);
        } catch (err) {
            console.warn('Error cargando cercanos:', err);
            this.cercanos = [];
        }
    },

    async cargarActividades() {
        try {
            const { data, error } = await db.from('actividades')
                .select(`
                    *,
                    actividad_participantes ( user_id ),
                    perfiles!actividades_creador_id_fkey ( nombre )
                `)
                .order('fecha', { ascending: true });

            if (error) throw error;

            this.actividades = (data || []).map(a => ({
                id:              a.id,
                titulo:          a.titulo,
                lugar:           a.lugar,
                fecha:           a.fecha,
                hora:            a.hora || '08:00',
                maxParticipantes: a.max_participantes || 10,
                participantes:   (a.actividad_participantes || []).map(p => p.user_id),
                creador:         a.perfiles?.nombre || 'Organizador',
                descripcion:     a.descripcion || '',
            }));
        } catch (err) {
            console.warn('Error cargando actividades:', err);
            this.actividades = [];
        }
    },

    async agregarAmigoDb(perfilId) {
        // Relación bidireccional
        const { error } = await db.from('amigos').insert([
            { user_id: this.currentUser.id, amigo_id: perfilId },
            { user_id: perfilId, amigo_id: this.currentUser.id },
        ]);
        if (error && !error.message.includes('duplicate')) throw error;
    },

    async eliminarAmigoDb(amigoId) {
        await db.from('amigos')
            .delete()
            .or(`and(user_id.eq.${this.currentUser.id},amigo_id.eq.${amigoId}),and(user_id.eq.${amigoId},amigo_id.eq.${this.currentUser.id})`);
    },

    async crearActividadDb(datos) {
        const { data, error } = await db.from('actividades').insert({
            creador_id:       this.currentUser.id,
            titulo:           datos.titulo,
            lugar:            datos.lugar,
            fecha:            datos.fecha,
            hora:             datos.hora,
            max_participantes: datos.max,
            descripcion:      datos.descripcion || '',
        }).select().single();
        if (error) throw error;

        // El creador se une automáticamente
        await db.from('actividad_participantes').insert({
            actividad_id: data.id,
            user_id:      this.currentUser.id
        });
        return data;
    },

    async unirseActividadDb(actividadId) {
        const { error } = await db.from('actividad_participantes').insert({
            actividad_id: actividadId,
            user_id:      this.currentUser.id
        });
        if (error && !error.message.includes('duplicate')) throw error;
    },

    async salirActividadDb(actividadId) {
        await db.from('actividad_participantes')
            .delete()
            .eq('actividad_id', actividadId)
            .eq('user_id', this.currentUser.id);
    },

    async actualizarMiUbicacion(lat, lng) {
        if (!this.currentUser) return;
        try {
            await db.from('perfiles').upsert({
                id: this.currentUser.id,
                lat,
                lng,
                ultima_vez_online: new Date().toISOString()
            });
        } catch {}
    },

    // ── UTILIDADES ────────────────────────────────────────────────────────────

    estaOnline(ultimaVez) {
        if (!ultimaVez) return false;
        const diff = Date.now() - new Date(ultimaVez).getTime();
        return diff < 15 * 60 * 1000; // online si activo en últimos 15 min
    },

    calcularDistancia(lat2, lng2) {
        if (!this.miUbicacion || !lat2 || !lng2) return null;
        const R = 6371;
        const dLat = (lat2 - this.miUbicacion.lat) * Math.PI / 180;
        const dLng = (lng2 - this.miUbicacion.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 +
            Math.cos(this.miUbicacion.lat * Math.PI/180) *
            Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2)**2;
        return Math.round(Math.sqrt(a) * 2 * R * 10) / 10;
    },

    cargarDatosDemo() {
        this.amigos = [
            { id: 'd1', amigo_id: 'd1', nombre: 'Carlos', online: true,  distancia: 2.5, lat: null, lng: null },
            { id: 'd2', amigo_id: 'd2', nombre: 'Miguel', online: true,  distancia: 5.8, lat: null, lng: null },
            { id: 'd3', amigo_id: 'd3', nombre: 'Roberto',online: false, distancia: 8.3, lat: null, lng: null },
        ];
        this.cercanos = [
            { id: 'n1', nombre: 'Dana',  tipo: 'Pesca en mar',   nivel: 'Avanzado',     distancia: 3.2 },
            { id: 'n2', nombre: 'Elena', tipo: 'Pesca en río',   nivel: 'Intermedio',   distancia: 4.5 },
            { id: 'n3', nombre: 'Pedro', tipo: 'Pesca en kayak', nivel: 'Principiante', distancia: 6.1 },
        ];
        this.actividades = [
            {
                id: 'demo1', titulo: 'Pesca de Fin de Semana',
                fecha: '2025-07-26', hora: '08:00', lugar: 'Zona costera central',
                participantes: [], maxParticipantes: 10, creador: 'Carlos'
            }
        ];
    },

    // ── MAPA ──────────────────────────────────────────────────────────────────

    setupMap() {
        if (!navigator.geolocation) {
            this.mostrarMapa(-33.4569, -70.6482);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                this.miUbicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                this.mostrarMapa(pos.coords.latitude, pos.coords.longitude);
                this.actualizarMiUbicacion(pos.coords.latitude, pos.coords.longitude);
            },
            () => this.mostrarMapa(-33.4569, -70.6482)
        );
    },

    mostrarMapa(lat, lng, zoom = 13) {
        const container = document.getElementById('community-map');
        if (!container) return;
        container.innerHTML = `<iframe
            src="https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed&hl=es"
            style="width:100%;height:100%;border:none;border-radius:0.75rem"
            allowfullscreen loading="lazy">
        </iframe>`;
    },

    mostrarUbicacionAmigo(amigo) {
        if (amigo.lat && amigo.lng) {
            this.mostrarMapa(amigo.lat, amigo.lng, 15);
        } else if (this.miUbicacion) {
            this.mostrarMapa(this.miUbicacion.lat, this.miUbicacion.lng, 13);
            toast(`${amigo.nombre} no ha compartido su ubicación`, 'info');
            return;
        }
        document.getElementById('community-map')?.scrollIntoView({ behavior: 'smooth' });
    },

    // ── EVENTOS ───────────────────────────────────────────────────────────────

    setupEventListeners() {
        document.getElementById('community-refresh-btn')
            ?.addEventListener('click', () => this.refreshLocations());
        document.getElementById('create-activity-btn')
            ?.addEventListener('click', () => this.mostrarFormActividad());
    },

    // ── RENDER ────────────────────────────────────────────────────────────────

    render() {
        this.renderContadorOnline();
        this.renderAmigos();
        this.renderCercanos();
        this.renderActividades();
    },

    renderContadorOnline() {
        const el = document.getElementById('community-online-count');
        if (!el) return;
        const n = this.amigos.filter(a => a.online).length;
        el.textContent = n > 0
            ? `${n} amigo${n !== 1 ? 's' : ''} en línea ahora`
            : `${this.amigos.length} amigo${this.amigos.length !== 1 ? 's' : ''}`;
    },

    // ── AMIGOS ────────────────────────────────────────────────────────────────

    renderAmigos() {
        const cont = document.getElementById('friend-list');
        if (!cont) return;
        cont.innerHTML = '';

        if (this.amigos.length === 0) {
            cont.innerHTML = `
                <div class="text-center py-6 text-gray-400">
                    <i class="fa fa-users text-3xl mb-2 block"></i>
                    <p class="text-sm">Sin amigos aún</p>
                    <p class="text-xs mt-1">Añade pescadores desde "Pescadores Cercanos"</p>
                </div>`;
            return;
        }

        this.amigos.forEach(amigo => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            const dist = amigo.distancia !== null ? `· ${amigo.distancia} km` : '';
            item.innerHTML = `
                <div class="w-10 h-10 ${this.colorPara(amigo.nombre)} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm relative">
                    ${amigo.nombre.charAt(0).toUpperCase()}
                    <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${amigo.online ? 'bg-green-500' : 'bg-gray-300'}"></span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium">${amigo.nombre}</p>
                    <p class="text-xs text-gray-500">${amigo.online ? 'En línea' : 'Desconectado'} ${dist}</p>
                </div>
                <div class="flex gap-2">
                    <button class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-blue-50 btn-ubicar" title="Ver en mapa">
                        <i class="fa fa-map-marker"></i>
                    </button>
                    <button class="w-8 h-8 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 btn-eliminar" title="Eliminar amigo">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            `;
            item.querySelector('.btn-ubicar').onclick   = () => this.mostrarUbicacionAmigo(amigo);
            item.querySelector('.btn-eliminar').onclick = () => this.eliminarAmigo(amigo);
            cont.appendChild(item);
        });
    },

    async eliminarAmigo(amigo) {
        if (!await confirmar(`¿Eliminar a ${amigo.nombre} de tus amigos?`)) return;
        try {
            await this.eliminarAmigoDb(amigo.amigo_id);
            this.amigos = this.amigos.filter(a => a.id !== amigo.id);
            await this.cargarCercanos();
            this.render();
            toast(`${amigo.nombre} eliminado de amigos`, 'info');
        } catch (err) {
            toast('Error al eliminar: ' + err.message, 'error');
        }
    },

    // ── PESCADORES CERCANOS ───────────────────────────────────────────────────

    renderCercanos() {
        const cont = document.getElementById('nearby-list');
        if (!cont) return;
        cont.innerHTML = '';

        if (this.cercanos.length === 0) {
            cont.innerHTML = `
                <div class="text-center py-6 text-gray-400">
                    <i class="fa fa-map-marker text-3xl mb-2 block"></i>
                    <p class="text-sm">No hay pescadores cercanos con ubicación activa</p>
                </div>`;
            return;
        }

        this.cercanos.forEach(p => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            const dist = p.distancia !== null ? `${p.distancia} km · ` : '';
            item.innerHTML = `
                <div class="w-10 h-10 ${this.colorPara(p.nombre)} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    ${p.nombre.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium">${p.nombre}</p>
                    <p class="text-xs text-gray-500">${dist}${p.tipo} · ${p.nivel}</p>
                </div>
                <button class="btn btn-primary text-xs px-3 py-1 btn-agregar flex-shrink-0">
                    <i class="fa fa-user-plus mr-1"></i> Añadir
                </button>
            `;
            item.querySelector('.btn-agregar').onclick = () => this.agregarAmigo(p);
            cont.appendChild(item);
        });
    },

    async agregarAmigo(pescador) {
        if (this.amigos.some(a => a.amigo_id === pescador.id)) {
            toast(`${pescador.nombre} ya es tu amigo`, 'info'); return;
        }
        try {
            await this.agregarAmigoDb(pescador.id);
            await this.cargarAmigos();
            this.cercanos = this.cercanos.filter(p => p.id !== pescador.id);
            this.render();
            toast(`¡${pescador.nombre} añadido como amigo! 🎣`, 'success');
        } catch (err) {
            toast('Error al añadir amigo: ' + err.message, 'error');
        }
    },

    // ── ACTIVIDADES ───────────────────────────────────────────────────────────

    renderActividades() {
        const cont = document.getElementById('activity-list');
        if (!cont) return;
        cont.innerHTML = '';

        if (this.actividades.length === 0) {
            cont.innerHTML = `
                <div class="text-center py-6 text-gray-400">
                    <i class="fa fa-calendar text-3xl mb-2 block"></i>
                    <p class="text-sm">Sin actividades — ¡crea una!</p>
                </div>`;
            return;
        }

        this.actividades.forEach(act => {
            const fechaObj = new Date(act.fecha + 'T12:00:00');
            const fecha    = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            const yaUnido  = this.currentUser && act.participantes.includes(this.currentUser.id);
            const lleno    = act.participantes.length >= act.maxParticipantes;
            const pct      = Math.round(act.participantes.length / act.maxParticipantes * 100);
            const hoy      = new Date();
            const esHoy    = fechaObj.toDateString() === hoy.toDateString();
            const esFuturo = fechaObj >= hoy;

            const badge = esHoy
                ? 'bg-red-100 text-red-700'
                : esFuturo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
            const badgeText = esHoy ? '🔴 Hoy' : esFuturo ? 'Próximamente' : 'Finalizado';

            const item = document.createElement('div');
            item.className = 'p-4 bg-gray-50 rounded-xl border border-gray-100';
            item.innerHTML = `
                <div class="flex items-start justify-between mb-2 gap-2">
                    <h3 class="font-semibold flex-1">${act.titulo}</h3>
                    <span class="text-xs ${badge} px-2 py-1 rounded-full flex-shrink-0">${badgeText}</span>
                </div>
                ${act.descripcion ? `<p class="text-xs text-gray-500 mb-2">${act.descripcion}</p>` : ''}
                <div class="space-y-1 mb-3">
                    <p class="text-sm text-gray-500"><i class="fa fa-calendar mr-2 text-gray-400 w-4"></i>${fecha} — ${act.hora}</p>
                    <p class="text-sm text-gray-500"><i class="fa fa-map-marker mr-2 text-gray-400 w-4"></i>${act.lugar}</p>
                    <p class="text-sm text-gray-500"><i class="fa fa-user mr-2 text-gray-400 w-4"></i>Organiza: ${act.creador}</p>
                </div>
                <div class="mb-3">
                    <div class="flex justify-between text-xs text-gray-400 mb-1">
                        <span>${act.participantes.length} participantes</span>
                        <span>Máx. ${act.maxParticipantes}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="${pct >= 80 ? 'bg-orange-400' : 'bg-primary'} h-1.5 rounded-full transition-all" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${!esFuturo && !esHoy ? '' :
                        !yaUnido && !lleno ? `
                            <button class="btn btn-primary text-sm flex-1 btn-unirse">
                                <i class="fa fa-plus mr-1"></i> Unirse
                            </button>` :
                        yaUnido ? `
                            <button class="btn btn-secondary text-sm flex-1 btn-salir">
                                <i class="fa fa-check mr-1"></i> Unido — Salir
                            </button>` : `
                            <button class="btn text-sm flex-1 bg-gray-200 text-gray-400 cursor-not-allowed" disabled>
                                <i class="fa fa-lock mr-1"></i> Lleno
                            </button>`
                    }
                    <button class="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-blue-50 btn-compartir flex-shrink-0" title="Compartir">
                        <i class="fa fa-share-alt"></i>
                    </button>
                </div>
            `;

            item.querySelector('.btn-unirse')?.addEventListener('click',     () => this.unirseActividad(act));
            item.querySelector('.btn-salir')?.addEventListener('click',      () => this.salirActividad(act));
            item.querySelector('.btn-compartir')?.addEventListener('click',  () => this.compartirActividad(act));
            cont.appendChild(item);
        });
    },

    async unirseActividad(act) {
        if (!this.currentUser) { toast('Inicia sesión para unirte', 'error'); return; }
        try {
            await this.unirseActividadDb(act.id);
            act.participantes.push(this.currentUser.id);
            this.renderActividades();
            toast(`¡Te uniste a "${act.titulo}"! 🎣`, 'success');
        } catch (err) {
            toast('Error: ' + err.message, 'error');
        }
    },

    async salirActividad(act) {
        if (!await confirmar(`¿Salir de "${act.titulo}"?`)) return;
        try {
            await this.salirActividadDb(act.id);
            act.participantes = act.participantes.filter(p => p !== this.currentUser.id);
            this.renderActividades();
        } catch (err) {
            toast('Error: ' + err.message, 'error');
        }
    },

    compartirActividad(act) {
        const texto = `🎣 ¡Únete a "${act.titulo}"!\n📅 ${act.fecha} ${act.hora}\n📍 ${act.lugar}\n\nVía PzKayak Connect`;
        if (navigator.share) {
            navigator.share({ title: act.titulo, text: texto })
                .catch(() => {});
        } else {
            navigator.clipboard?.writeText(texto)
                .then(() => toast('Actividad copiada al portapapeles', 'info'));
        }
    },

    mostrarFormActividad() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">Nueva Actividad</h2>
                    <button id="act-close" class="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center">
                        <i class="fa fa-times text-xl"></i>
                    </button>
                </div>
                <div class="space-y-3">
                    <input id="act-titulo"  type="text" class="input-field" placeholder="Nombre de la actividad *">
                    <input id="act-lugar"   type="text" class="input-field" placeholder="Lugar *">
                    <textarea id="act-desc" class="input-field" rows="2" placeholder="Descripción (opcional)"></textarea>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs text-gray-500 mb-1 block">Fecha *</label>
                            <input id="act-fecha" type="date" class="input-field">
                        </div>
                        <div>
                            <label class="text-xs text-gray-500 mb-1 block">Hora</label>
                            <input id="act-hora"  type="time" class="input-field" value="08:00">
                        </div>
                    </div>
                    <div>
                        <label class="text-xs text-gray-500 mb-1 block">Máx. participantes</label>
                        <input id="act-max" type="number" class="input-field" value="10" min="2" max="100">
                    </div>
                    <button id="act-guardar" class="btn btn-primary w-full">
                        <i class="fa fa-check mr-1"></i> Crear Actividad
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Fecha mínima hoy
        document.getElementById('act-fecha').min = new Date().toISOString().split('T')[0];

        document.getElementById('act-close').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('act-guardar').onclick = async () => {
            const titulo = document.getElementById('act-titulo').value.trim();
            const lugar  = document.getElementById('act-lugar').value.trim();
            const fecha  = document.getElementById('act-fecha').value;
            const hora   = document.getElementById('act-hora').value;
            const max    = parseInt(document.getElementById('act-max').value) || 10;
            const desc   = document.getElementById('act-desc').value.trim();

            if (!titulo || !lugar || !fecha) {
                toast('Completa los campos obligatorios (*)', 'error'); return;
            }

            const btn = document.getElementById('act-guardar');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> Creando...';

            try {
                const nueva = await this.crearActividadDb({ titulo, lugar, fecha, hora, max, descripcion: desc });
                this.actividades.unshift({
                    id:              nueva.id,
                    titulo, lugar, fecha, hora,
                    maxParticipantes: max,
                    participantes:   [this.currentUser.id],
                    creador:         this.perfil?.nombre || 'Tú',
                    descripcion:     desc,
                });
                overlay.remove();
                this.renderActividades();
                toast(`¡"${titulo}" creada! 🎣`, 'success');
            } catch (err) {
                toast('Error al crear: ' + err.message, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-check mr-1"></i> Crear Actividad';
            }
        };
    },

    // ── ACTUALIZAR ────────────────────────────────────────────────────────────

    async refreshLocations() {
        const btn = document.getElementById('community-refresh-btn');
        if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i>'; btn.disabled = true; }

        try {
            await this.cargarTodo();
            this.render();
            toast('Ubicaciones actualizadas', 'success');
        } catch {
            toast('Error al actualizar', 'error');
        } finally {
            if (btn) { btn.innerHTML = '<i class="fa fa-refresh mr-1"></i> Actualizar'; btn.disabled = false; }
        }
    }
};

window.communityModule = communityModule;