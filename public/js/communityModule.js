/**
 * Módulo de Comunidad - PzKayak Connect
 * Sistema de solicitudes de amistad + chat en tiempo real
 */

const communityModule = {

    currentUser:      null,
    perfil:           null,
    amigos:           [],
    cercanos:         [],
    actividades:      [],
    solicitudesEnviadas: [], // solicitudes que YO envié (pendientes)
    miUbicacion:      null,
    compartiendoUbic: false,
    ubicWatchId:      null,
    ubicInterval:     null,
    chatAbierto:      null,
    chatSuscripcion:  null,
    solicitudSub:     null,
    mensajes:         [],

    colores: [
        'bg-blue-100 text-blue-600','bg-green-100 text-green-600',
        'bg-orange-100 text-orange-600','bg-purple-100 text-purple-600',
        'bg-red-100 text-red-600','bg-yellow-100 text-yellow-700'
    ],
    colorPara(n=''){let h=0;for(let c of n)h+=c.charCodeAt(0);return this.colores[h%this.colores.length];},

    // ── INIT ──────────────────────────────────────────────────────────────────

    async init() {
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) return;
            this.currentUser = session.user;
            await this.cargarTodo();
            this.setupMap();
            this.setupEventListeners();
            this.initUbicacionToggle();
            this.suscribirSolicitudes(); // escucha solicitudes en tiempo real
            this.render();
        } catch (err) {
            console.error('Community init:', err);
            this.cargarDatosDemo();
            this.setupMap();
            this.setupEventListeners();
            this.initUbicacionToggle();
            this.render();
        }
    },

    // ── CARGA DATOS ───────────────────────────────────────────────────────────

    async cargarTodo() {
        await Promise.all([
            this.cargarPerfil(),
            this.cargarAmigos(),
            this.cargarActividades(),
            this.cargarSolicitudesEnviadas(),
        ]);
        await this.cargarCercanos();
    },

    async cargarPerfil() {
        try {
            const { data } = await db.from('perfiles').select('*').eq('id', this.currentUser.id).single();
            this.perfil = data;
        } catch {}
    },

    async cargarAmigos() {
        try {
            const { data, error } = await db.from('amigos')
                .select('id, amigo_id, perfiles!amigos_amigo_id_fkey(id, nombre, lat, lng, ultima_vez_online)')
                .eq('user_id', this.currentUser.id);
            if (error) throw error;
            this.amigos = (data || []).map(row => {
                const p = row.perfiles || {};
                return {
                    id: row.id, amigo_id: row.amigo_id,
                    nombre: p.nombre || 'Pescador',
                    lat: p.lat || null, lng: p.lng || null,
                    online: this.estaOnline(p.ultima_vez_online),
                    distancia: this.calcularDistancia(p.lat, p.lng)
                };
            });
        } catch { this.amigos = []; }
    },

    async cargarSolicitudesEnviadas() {
        try {
            const { data } = await db.from('solicitudes_amistad')
                .select('id, receptor_id, estado')
                .eq('emisor_id', this.currentUser.id)
                .eq('estado', 'pendiente');
            this.solicitudesEnviadas = data || [];
        } catch { this.solicitudesEnviadas = []; }
    },

    async cargarCercanos() {
        try {
            const idsAmigos = this.amigos.map(a => a.amigo_id);
            const idsEnviadas = this.solicitudesEnviadas.map(s => s.receptor_id);
            const idsExcluir = [...new Set([...idsAmigos, ...idsEnviadas, this.currentUser.id])];

            const { data, error } = await db.from('perfiles')
                .select('id, nombre, lat, lng, tipo_pesca, nivel, ultima_vez_online, compartir_ubicacion')
                .not('id', 'in', `(${idsExcluir.join(',')})`)
                .eq('compartir_ubicacion', true)
                .not('lat', 'is', null)
                .limit(20);
            if (error) throw error;
            this.cercanos = (data || [])
                .map(p => ({ id:p.id, nombre:p.nombre||'Pescador', tipo:p.tipo_pesca||'Pesca en kayak', nivel:p.nivel||'Intermedio', distancia:this.calcularDistancia(p.lat,p.lng), lat:p.lat, lng:p.lng }))
                .filter(p => p.distancia !== null)
                .sort((a,b) => a.distancia - b.distancia)
                .slice(0, 10);
        } catch { this.cercanos = []; }
    },

    async cargarActividades() {
        try {
            const { data, error } = await db.from('actividades')
                .select('*, actividad_participantes(user_id), perfiles!actividades_creador_id_fkey(nombre)')
                .order('fecha', { ascending: true });
            if (error) throw error;
            this.actividades = (data||[]).map(a => ({
                id:a.id, titulo:a.titulo, lugar:a.lugar, fecha:a.fecha, hora:a.hora||'08:00',
                maxParticipantes:a.max_participantes||10,
                participantes:(a.actividad_participantes||[]).map(p=>p.user_id),
                creador:a.perfiles?.nombre||'Organizador', descripcion:a.descripcion||''
            }));
        } catch { this.actividades = []; }
    },

    // ── SOLICITUDES DE AMISTAD ────────────────────────────────────────────────

    async enviarSolicitud(pescador) {
        // Verificar que no existe ya
        if (this.amigos.some(a => a.amigo_id === pescador.id)) {
            toast(`${pescador.nombre} ya es tu amigo`, 'info'); return;
        }
        if (this.solicitudesEnviadas.some(s => s.receptor_id === pescador.id)) {
            toast('Ya enviaste una solicitud a esta persona', 'info'); return;
        }

        try {
            const { error } = await db.from('solicitudes_amistad').insert({
                emisor_id:   this.currentUser.id,
                receptor_id: pescador.id,
                estado:      'pendiente'
            });
            if (error && error.message.includes('duplicate')) {
                toast('Ya enviaste una solicitud', 'info'); return;
            }
            if (error) throw error;

            // Agregar a enviadas localmente para actualizar UI
            this.solicitudesEnviadas.push({ receptor_id: pescador.id, estado: 'pendiente' });
            // Quitar de cercanos
            this.cercanos = this.cercanos.filter(p => p.id !== pescador.id);
            this.renderCercanos();
            toast(`✅ Solicitud enviada a ${pescador.nombre}`, 'success');
        } catch (err) {
            toast('Error al enviar solicitud: ' + err.message, 'error');
        }
    },

    // Escucha en tiempo real solicitudes que ME llegan
    suscribirSolicitudes() {
        if (!this.currentUser) return;
        this.solicitudSub = db.channel(`solicitudes-${this.currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'solicitudes_amistad',
                filter: `receptor_id=eq.${this.currentUser.id}`
            }, payload => {
                if (payload.eventType === 'INSERT' && payload.new.estado === 'pendiente') {
                    this.onNuevaSolicitud(payload.new);
                }
                if (payload.eventType === 'UPDATE' && payload.new.estado === 'aceptada') {
                    this.onSolicitudAceptada(payload.new);
                }
            })
            .subscribe();
    },

    async onNuevaSolicitud(solicitud) {
        // Obtener nombre del emisor
        try {
            const { data } = await db.from('perfiles').select('nombre').eq('id', solicitud.emisor_id).single();
            const nombre = data?.nombre || 'Un pescador';
            this.mostrarNotificacionSolicitud(solicitud.id, solicitud.emisor_id, nombre);
            this.actualizarBadgeNotificaciones(1);
        } catch {}
    },

    onSolicitudAceptada(solicitud) {
        // Mi solicitud fue aceptada — recargar amigos
        this.cargarAmigos().then(() => {
            this.cargarCercanos().then(() => this.render());
        });
        toast('🎣 ¡Tu solicitud fue aceptada! Ya pueden chatear', 'success');
    },

    mostrarNotificacionSolicitud(solicitudId, emisorId, nombre) {
        // Agregar al modal de notificaciones
        const lista = document.getElementById('notif-list');
        if (!lista) return;

        const item = document.createElement('div');
        item.id = `solicitud-${solicitudId}`;
        item.className = 'flex items-start p-3 bg-blue-50 rounded-lg';
        item.innerHTML = `
            <div class="bg-blue-100 p-2 rounded-full mr-3 mt-1 flex-shrink-0">
                <i class="fa fa-user-plus text-primary"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-medium">Solicitud de amistad</p>
                <p class="text-sm text-gray-600 mb-2"><strong>${nombre}</strong> quiere ser tu amigo de pesca 🎣</p>
                <div class="flex gap-2">
                    <button class="btn btn-primary text-xs px-3 py-1 btn-aceptar">
                        <i class="fa fa-check mr-1"></i> Aceptar
                    </button>
                    <button class="btn text-xs px-3 py-1 bg-gray-200 text-gray-600 btn-rechazar">
                        <i class="fa fa-times mr-1"></i> Rechazar
                    </button>
                </div>
                <p class="text-xs text-gray-400 mt-1">Ahora mismo</p>
            </div>`;

        item.querySelector('.btn-aceptar').onclick  = () => this.responderSolicitud(solicitudId, emisorId, nombre, 'aceptada', item);
        item.querySelector('.btn-rechazar').onclick = () => this.responderSolicitud(solicitudId, emisorId, nombre, 'rechazada', item);

        lista.prepend(item);

        // Mostrar el modal automáticamente
        document.getElementById('notification-modal')?.classList.remove('hidden');
    },

    async responderSolicitud(solicitudId, emisorId, nombre, estado, itemEl) {
        try {
            await db.from('solicitudes_amistad')
                .update({ estado, updated_at: new Date().toISOString() })
                .eq('id', solicitudId);

            if (estado === 'aceptada') {
                // Crear relación bidireccional en tabla amigos
                await db.from('amigos').insert([
                    { user_id: this.currentUser.id, amigo_id: emisorId },
                    { user_id: emisorId, amigo_id: this.currentUser.id },
                ]);
                toast(`🎣 ¡Ahora eres amigo de ${nombre}! Ya pueden chatear`, 'success');
                await this.cargarAmigos();
                await this.cargarCercanos();
                this.render();
            } else {
                toast(`Solicitud de ${nombre} rechazada`, 'info');
            }

            // Remover el item del modal
            itemEl?.remove();
            this.actualizarBadgeNotificaciones(-1);
        } catch (err) {
            toast('Error: ' + err.message, 'error');
        }
    },

    actualizarBadgeNotificaciones(delta) {
        const badge = document.getElementById('notif-badge');
        if (!badge) return;
        const actual = parseInt(badge.textContent) || 0;
        const nuevo = Math.max(0, actual + delta);
        badge.textContent = nuevo;
        badge.classList.toggle('hidden', nuevo === 0);
    },

    // Cargar solicitudes pendientes al abrir notificaciones
    async cargarSolicitudesPendientes() {
        try {
            const { data } = await db.from('solicitudes_amistad')
                .select('id, emisor_id, perfiles!solicitudes_amistad_emisor_id_fkey(nombre)')
                .eq('receptor_id', this.currentUser.id)
                .eq('estado', 'pendiente');

            const lista = document.getElementById('notif-list');
            if (!lista || !data?.length) return;

            // Remover solicitudes anteriores
            lista.querySelectorAll('[id^="solicitud-"]').forEach(el => el.remove());

            data.forEach(s => {
                const nombre = s.perfiles?.nombre || 'Pescador';
                this.mostrarNotificacionSolicitud(s.id, s.emisor_id, nombre);
            });

            // Actualizar badge
            const badge = document.getElementById('notif-badge');
            if (badge) {
                badge.textContent = data.length;
                badge.classList.toggle('hidden', data.length === 0);
            }
        } catch {}
    },

    // ── AMIGOS ────────────────────────────────────────────────────────────────

    async eliminarAmigoDb(amigoId) {
        await db.from('amigos').delete()
            .or(`and(user_id.eq.${this.currentUser.id},amigo_id.eq.${amigoId}),and(user_id.eq.${amigoId},amigo_id.eq.${this.currentUser.id})`);
        // También limpiar solicitudes
        await db.from('solicitudes_amistad').delete()
            .or(`and(emisor_id.eq.${this.currentUser.id},receptor_id.eq.${amigoId}),and(emisor_id.eq.${amigoId},receptor_id.eq.${this.currentUser.id})`);
    },

    async eliminarAmigo(amigo) {
        if (!await confirmar(`¿Eliminar a ${amigo.nombre} de tus amigos?`)) return;
        try {
            await this.eliminarAmigoDb(amigo.amigo_id);
            this.amigos = this.amigos.filter(a => a.id !== amigo.id);
            await this.cargarCercanos();
            this.render();
            toast(`${amigo.nombre} eliminado`, 'info');
        } catch (err) { toast('Error: ' + err.message, 'error'); }
    },

    // ── ACTIVIDADES ───────────────────────────────────────────────────────────

    async crearActividadDb(datos) {
        const { data, error } = await db.from('actividades').insert({
            creador_id: this.currentUser.id, titulo: datos.titulo, lugar: datos.lugar,
            fecha: datos.fecha, hora: datos.hora, max_participantes: datos.max, descripcion: datos.descripcion||''
        }).select().single();
        if (error) throw error;
        await db.from('actividad_participantes').insert({ actividad_id: data.id, user_id: this.currentUser.id });
        return data;
    },

    async unirseActividadDb(actividadId) {
        const { error } = await db.from('actividad_participantes').insert({ actividad_id: actividadId, user_id: this.currentUser.id });
        if (error && !error.message.includes('duplicate')) throw error;
    },

    async salirActividadDb(actividadId) {
        await db.from('actividad_participantes').delete().eq('actividad_id', actividadId).eq('user_id', this.currentUser.id);
    },

    // ── SWITCH UBICACIÓN ──────────────────────────────────────────────────────

    initUbicacionToggle() {
        const toggle = document.getElementById('ubicacion-toggle');
        if (!toggle) return;
        const guardado = localStorage.getItem('pzkayak_compartir_ubicacion') === 'true';
        toggle.checked = guardado;
        this.compartiendoUbic = guardado;
        this.actualizarTextoUbicacion(guardado);
        if (guardado) this.iniciarCompartirUbicacion();

        toggle.addEventListener('change', () => {
            this.compartiendoUbic = toggle.checked;
            localStorage.setItem('pzkayak_compartir_ubicacion', toggle.checked);
            this.actualizarTextoUbicacion(toggle.checked);
            if (toggle.checked) {
                this.iniciarCompartirUbicacion();
                toast('📍 Ubicación compartida con pescadores cercanos', 'success');
            } else {
                this.detenerCompartirUbicacion();
                toast('Ubicación ocultada', 'info');
            }
        });
    },

    actualizarTextoUbicacion(activo) {
        const el = document.getElementById('ubicacion-status-txt');
        if (el) el.textContent = activo ? '✅ Activo — otros pescadores pueden verte' : 'Desactivado — solo tú te ves';
    },

    iniciarCompartirUbicacion() {
        if (!navigator.geolocation) return;
        this.ubicWatchId = navigator.geolocation.watchPosition(
            pos => this.guardarUbicacion(pos.coords.latitude, pos.coords.longitude, true),
            err => console.warn('GPS:', err),
            { enableHighAccuracy: true, maximumAge: 10000 }
        );
        this.ubicInterval = setInterval(() => {
            if (this.miUbicacion) this.guardarUbicacion(this.miUbicacion.lat, this.miUbicacion.lng, true);
        }, 30000);
    },

    detenerCompartirUbicacion() {
        if (this.ubicWatchId) navigator.geolocation.clearWatch(this.ubicWatchId);
        if (this.ubicInterval) clearInterval(this.ubicInterval);
        this.ubicWatchId = null; this.ubicInterval = null;
        this.guardarUbicacion(null, null, false);
    },

    async guardarUbicacion(lat, lng, compartir) {
        if (!this.currentUser) return;
        try {
            await db.from('perfiles').upsert({ id:this.currentUser.id, lat, lng, compartir_ubicacion:compartir, ultima_vez_online:new Date().toISOString() });
        } catch {}
    },

    // ── CHAT ──────────────────────────────────────────────────────────────────

    abrirChat(amigo) {
        this.chatAbierto = amigo;
        const isDark = document.body.classList.contains('dark');

        const overlay = document.createElement('div');
        overlay.id = 'chat-overlay';
        overlay.style.cssText = `position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;background:${isDark?'#0f172a':'#f1f5f9'};`;
        overlay.innerHTML = `
            <div style="background:${isDark?'#1e293b':'white'};border-bottom:1px solid ${isDark?'#334155':'#e5e7eb'};padding:12px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;">
                <button id="chat-back" style="background:none;border:none;cursor:pointer;color:#6b7280;padding:4px;">
                    <i class="fa fa-arrow-left" style="font-size:18px;"></i>
                </button>
                <div class="w-9 h-9 ${this.colorPara(amigo.nombre)} rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 relative">
                    ${amigo.nombre.charAt(0).toUpperCase()}
                    <span style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;border:2px solid white;background:${amigo.online?'#22c55e':'#9ca3af'};"></span>
                </div>
                <div style="flex:1;min-width:0;">
                    <p style="font-weight:600;color:${isDark?'#e2e8f0':'#1f2937'};margin:0;">${amigo.nombre}</p>
                    <p style="font-size:12px;color:#9ca3af;margin:0;">${amigo.online?'🟢 En línea':'⚫ Desconectado'}</p>
                </div>
            </div>
            <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:6px;">
                <div style="text-align:center;color:#9ca3af;margin:auto;">
                    <i class="fa fa-spinner fa-spin" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                    Cargando...
                </div>
            </div>
            <div style="background:${isDark?'#1e293b':'white'};border-top:1px solid ${isDark?'#334155':'#e5e7eb'};padding:10px 14px;display:flex;gap:8px;align-items:flex-end;flex-shrink:0;padding-bottom:max(10px,env(safe-area-inset-bottom));">
                <textarea id="chat-input" placeholder="Escribe un mensaje..." rows="1"
                    style="flex:1;border:1px solid ${isDark?'#334155':'#e5e7eb'};border-radius:20px;padding:8px 14px;font-size:14px;resize:none;outline:none;max-height:100px;font-family:inherit;line-height:1.4;background:${isDark?'#273549':'white'};color:${isDark?'#e2e8f0':'#1f2937'};"
                    oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
                <button id="chat-send" style="width:40px;height:40px;border-radius:50%;background:#0066cc;color:white;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa fa-paper-plane"></i>
                </button>
            </div>`;

        document.body.appendChild(overlay);
        document.getElementById('chat-back').onclick = () => this.cerrarChat();
        document.getElementById('chat-send').onclick = () => this.enviarMensaje();
        document.getElementById('chat-input').addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviarMensaje(); }
        });
        this.cargarMensajes(amigo.amigo_id);
        this.suscribirseChat(amigo.amigo_id);
    },

    cerrarChat() {
        if (this.chatSuscripcion) { db.removeChannel(this.chatSuscripcion); this.chatSuscripcion = null; }
        document.getElementById('chat-overlay')?.remove();
        this.chatAbierto = null; this.mensajes = [];
    },

    async cargarMensajes(amigoId) {
        try {
            const uid = this.currentUser.id;
            const { data, error } = await db.from('mensajes')
                .select('*')
                .or(`and(emisor_id.eq.${uid},receptor_id.eq.${amigoId}),and(emisor_id.eq.${amigoId},receptor_id.eq.${uid})`)
                .order('created_at', { ascending: true }).limit(50);
            if (error) throw error;
            this.mensajes = data || [];
            await db.from('mensajes').update({ leido:true }).eq('receptor_id',uid).eq('emisor_id',amigoId).eq('leido',false);
        } catch { this.mensajes = []; }
        this.renderMensajes();
    },

    suscribirseChat(amigoId) {
        const uid = this.currentUser.id;
        this.chatSuscripcion = db.channel(`chat-${[uid,amigoId].sort().join('-')}`)
            .on('postgres_changes', { event:'INSERT', schema:'public', table:'mensajes', filter:`receptor_id=eq.${uid}` },
                payload => {
                    if (payload.new.emisor_id === amigoId) {
                        this.mensajes.push(payload.new);
                        this.renderMensajes();
                        db.from('mensajes').update({ leido:true }).eq('id', payload.new.id);
                    }
                })
            .subscribe();
    },

    async enviarMensaje() {
        const input = document.getElementById('chat-input');
        const texto = input?.value.trim();
        if (!texto || !this.chatAbierto || !this.currentUser) return;
        input.value = ''; input.style.height = 'auto';
        const pendiente = { emisor_id:this.currentUser.id, receptor_id:this.chatAbierto.amigo_id, texto, created_at:new Date().toISOString(), leido:false, _pendiente:true };
        this.mensajes.push(pendiente);
        this.renderMensajes();
        try {
            const { data, error } = await db.from('mensajes').insert({ emisor_id:this.currentUser.id, receptor_id:this.chatAbierto.amigo_id, texto, leido:false }).select().single();
            if (error) throw error;
            const idx = this.mensajes.findLastIndex(m => m._pendiente && m.texto === texto);
            if (idx !== -1) this.mensajes[idx] = data;
            this.renderMensajes();
        } catch { toast('Error al enviar', 'error'); this.mensajes = this.mensajes.filter(m=>!m._pendiente); this.renderMensajes(); }
    },

    renderMensajes() {
        const cont = document.getElementById('chat-messages');
        if (!cont) return;
        cont.innerHTML = '';
        const isDark = document.body.classList.contains('dark');
        if (this.mensajes.length === 0) {
            cont.innerHTML = `<div style="text-align:center;color:#9ca3af;margin:auto;padding:32px;">
                <i class="fa fa-comments" style="font-size:40px;display:block;margin-bottom:8px;"></i>
                <p>Sin mensajes aún</p><p style="font-size:12px;margin-top:4px;">¡Di hola! 🎣</p></div>`;
            return;
        }
        const uid = this.currentUser.id;
        let lastDate = null;
        this.mensajes.forEach(msg => {
            const esPropio = msg.emisor_id === uid;
            const fecha = new Date(msg.created_at);
            const fechaStr = fecha.toLocaleDateString('es-ES', { day:'numeric', month:'short' });
            const hora = fecha.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
            if (fechaStr !== lastDate) {
                lastDate = fechaStr;
                const sep = document.createElement('div');
                sep.style.cssText = 'text-align:center;margin:8px 0;';
                sep.innerHTML = `<span style="background:#e5e7eb;color:#6b7280;font-size:11px;padding:2px 10px;border-radius:10px;">${fechaStr}</span>`;
                cont.appendChild(sep);
            }
            const burbuja = document.createElement('div');
            burbuja.style.cssText = `display:flex;flex-direction:column;align-items:${esPropio?'flex-end':'flex-start'};margin:2px 0;`;
            burbuja.innerHTML = `
                <div style="max-width:75%;padding:8px 12px;border-radius:${esPropio?'18px 18px 4px 18px':'18px 18px 18px 4px'};background:${esPropio?'#0066cc':isDark?'#273549':'white'};color:${esPropio?'white':isDark?'#e2e8f0':'#1f2937'};box-shadow:0 1px 2px rgba(0,0,0,0.1);word-break:break-word;${msg._pendiente?'opacity:0.7;':''}">
                    <p style="font-size:14px;line-height:1.4;margin:0;">${this.escaparHtml(msg.texto)}</p>
                </div>
                <span style="font-size:10px;color:#9ca3af;margin-top:2px;padding:0 4px;">${hora}${esPropio?(msg._pendiente?' ⏳':msg.leido?' ✓✓':' ✓'):''}</span>`;
            cont.appendChild(burbuja);
        });
        cont.scrollTop = cont.scrollHeight;
    },

    escaparHtml(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },

    // ── UTILIDADES ────────────────────────────────────────────────────────────

    estaOnline(u) { if(!u)return false; return Date.now()-new Date(u).getTime()<15*60*1000; },

    calcularDistancia(lat2,lng2) {
        if(!this.miUbicacion||!lat2||!lng2)return null;
        const R=6371, dLat=(lat2-this.miUbicacion.lat)*Math.PI/180, dLng=(lng2-this.miUbicacion.lng)*Math.PI/180;
        const a=Math.sin(dLat/2)**2+Math.cos(this.miUbicacion.lat*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
        return Math.round(Math.sqrt(a)*2*R*10)/10;
    },

    cargarDatosDemo() {
        this.amigos = [
            {id:'d1',amigo_id:'d1',nombre:'Carlos',online:true, distancia:2.5,lat:null,lng:null},
            {id:'d2',amigo_id:'d2',nombre:'Miguel', online:false,distancia:5.8,lat:null,lng:null},
        ];
        this.cercanos = [
            {id:'n1',nombre:'Dana', tipo:'Pesca en mar',  nivel:'Avanzado',  distancia:3.2},
            {id:'n2',nombre:'Elena',tipo:'Pesca en kayak',nivel:'Intermedio',distancia:4.5},
        ];
        this.actividades = [{id:'demo1',titulo:'Pesca de Fin de Semana',fecha:'2025-07-26',hora:'08:00',lugar:'Zona costera',participantes:[],maxParticipantes:10,creador:'Carlos',descripcion:''}];
    },

    // ── MAPA ──────────────────────────────────────────────────────────────────

    setupMap() {
        if (!navigator.geolocation) { this.mostrarMapa(-33.4569,-70.6482); return; }
        navigator.geolocation.getCurrentPosition(
            pos => { this.miUbicacion={lat:pos.coords.latitude,lng:pos.coords.longitude}; this.mostrarMapa(pos.coords.latitude,pos.coords.longitude); },
            () => this.mostrarMapa(-33.4569,-70.6482)
        );
    },

    mostrarMapa(lat,lng,zoom=13) {
        const c=document.getElementById('community-map'); if(!c)return;
        c.innerHTML=`<iframe src="https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed&hl=es" style="width:100%;height:100%;border:none;border-radius:0.75rem" allowfullscreen loading="lazy"></iframe>`;
    },

    mostrarUbicacionAmigo(amigo) {
        if(amigo.lat&&amigo.lng){this.mostrarMapa(amigo.lat,amigo.lng,15);document.getElementById('community-map')?.scrollIntoView({behavior:'smooth'});}
        else toast(`${amigo.nombre} no ha compartido su ubicación`,'info');
    },

    // ── EVENTOS ───────────────────────────────────────────────────────────────

    setupEventListeners() {
        document.getElementById('community-refresh-btn')?.addEventListener('click',()=>this.refreshLocations());
        document.getElementById('create-activity-btn')?.addEventListener('click',()=>this.mostrarFormActividad());

        // Cargar solicitudes pendientes al abrir notificaciones
        document.getElementById('notification-btn')?.addEventListener('click',()=>{
            if(this.currentUser) this.cargarSolicitudesPendientes();
        });
    },

    // ── RENDER ────────────────────────────────────────────────────────────────

    render() {
        this.renderContadorOnline();
        this.renderAmigos();
        this.renderCercanos();
        this.renderActividades();
    },

    renderContadorOnline() {
        const el=document.getElementById('community-online-count'); if(!el)return;
        const n=this.amigos.filter(a=>a.online).length;
        el.textContent=n>0?`${n} amigo${n!==1?'s':''} en línea`:`${this.amigos.length} amigo${this.amigos.length!==1?'s':''}`;
    },

    renderAmigos() {
        const cont=document.getElementById('friend-list'); if(!cont)return;
        cont.innerHTML='';
        if(this.amigos.length===0){
            cont.innerHTML=`<div class="text-center py-6 text-gray-400"><i class="fa fa-users text-3xl mb-2 block"></i><p class="text-sm">Sin amigos aún</p><p class="text-xs mt-1">Añade pescadores desde la lista de cercanos</p></div>`;
            return;
        }
        this.amigos.forEach(amigo=>{
            const item=document.createElement('div');
            item.className='flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            const dist=amigo.distancia!==null?`· ${amigo.distancia} km`:'';
            item.innerHTML=`
                <div class="w-10 h-10 ${this.colorPara(amigo.nombre)} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm relative">
                    ${amigo.nombre.charAt(0).toUpperCase()}
                    <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${amigo.online?'bg-green-500':'bg-gray-300'}"></span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium">${amigo.nombre}</p>
                    <p class="text-xs text-gray-500">${amigo.online?'En línea':'Desconectado'} ${dist}</p>
                </div>
                <div class="flex gap-2">
                    <button class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-blue-50 btn-chat" title="Chat"><i class="fa fa-comment"></i></button>
                    <button class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-blue-50 btn-ubicar" title="Ver en mapa"><i class="fa fa-map-marker"></i></button>
                    <button class="w-8 h-8 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 btn-eliminar" title="Eliminar"><i class="fa fa-times"></i></button>
                </div>`;
            item.querySelector('.btn-chat').onclick    =()=>this.abrirChat(amigo);
            item.querySelector('.btn-ubicar').onclick  =()=>this.mostrarUbicacionAmigo(amigo);
            item.querySelector('.btn-eliminar').onclick=()=>this.eliminarAmigo(amigo);
            cont.appendChild(item);
        });
    },

    renderCercanos() {
        const cont=document.getElementById('nearby-list'); if(!cont)return;
        cont.innerHTML='';
        if(this.cercanos.length===0){
            cont.innerHTML=`<div class="text-center py-6 text-gray-400"><i class="fa fa-map-marker text-3xl mb-2 block"></i><p class="text-sm">Sin pescadores cercanos con ubicación activa</p></div>`;
            return;
        }
        this.cercanos.forEach(p=>{
            const yaSolicitado=this.solicitudesEnviadas.some(s=>s.receptor_id===p.id);
            const item=document.createElement('div');
            item.className='flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            const dist=p.distancia!==null?`${p.distancia} km · `:'';
            item.innerHTML=`
                <div class="w-10 h-10 ${this.colorPara(p.nombre)} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">${p.nombre.charAt(0).toUpperCase()}</div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium">${p.nombre}</p>
                    <p class="text-xs text-gray-500">${dist}${p.tipo} · ${p.nivel}</p>
                </div>
                ${yaSolicitado
                    ? `<span class="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1"><i class="fa fa-clock-o"></i> Pendiente</span>`
                    : `<button class="btn btn-primary text-xs px-3 py-1 btn-agregar flex-shrink-0"><i class="fa fa-user-plus mr-1"></i> Añadir</button>`
                }`;
            if(!yaSolicitado) item.querySelector('.btn-agregar').onclick=()=>this.enviarSolicitud(p);
            cont.appendChild(item);
        });
    },

    renderActividades() {
        const cont=document.getElementById('activity-list'); if(!cont)return;
        cont.innerHTML='';
        if(this.actividades.length===0){
            cont.innerHTML=`<div class="text-center py-6 text-gray-400"><i class="fa fa-calendar text-3xl mb-2 block"></i><p class="text-sm">Sin actividades — ¡crea una!</p></div>`;
            return;
        }
        this.actividades.forEach(act=>{
            const fechaObj=new Date(act.fecha+'T12:00:00');
            const fecha=fechaObj.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
            const yaUnido=this.currentUser&&act.participantes.includes(this.currentUser.id);
            const lleno=act.participantes.length>=act.maxParticipantes;
            const pct=Math.round(act.participantes.length/act.maxParticipantes*100);
            const hoy=new Date();
            const esHoy=fechaObj.toDateString()===hoy.toDateString();
            const esFuturo=fechaObj>=hoy;
            const badge=esHoy?'bg-red-100 text-red-700':esFuturo?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500';
            const badgeTxt=esHoy?'🔴 Hoy':esFuturo?'Próximamente':'Finalizado';
            const item=document.createElement('div');
            item.className='p-4 bg-gray-50 rounded-xl border border-gray-100';
            item.innerHTML=`
                <div class="flex items-start justify-between mb-2 gap-2">
                    <h3 class="font-semibold flex-1">${act.titulo}</h3>
                    <span class="text-xs ${badge} px-2 py-1 rounded-full flex-shrink-0">${badgeTxt}</span>
                </div>
                ${act.descripcion?`<p class="text-xs text-gray-500 mb-2">${act.descripcion}</p>`:''}
                <div class="space-y-1 mb-3">
                    <p class="text-sm text-gray-500"><i class="fa fa-calendar mr-2 text-gray-400 w-4"></i>${fecha} — ${act.hora}</p>
                    <p class="text-sm text-gray-500"><i class="fa fa-map-marker mr-2 text-gray-400 w-4"></i>${act.lugar}</p>
                    <p class="text-sm text-gray-500"><i class="fa fa-user mr-2 text-gray-400 w-4"></i>Organiza: ${act.creador}</p>
                </div>
                <div class="mb-3">
                    <div class="flex justify-between text-xs text-gray-400 mb-1"><span>${act.participantes.length} participantes</span><span>Máx. ${act.maxParticipantes}</span></div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="${pct>=80?'bg-orange-400':'bg-primary'} h-1.5 rounded-full" style="width:${pct}%"></div></div>
                </div>
                <div class="flex gap-2">
                    ${!esFuturo&&!esHoy?'':!yaUnido&&!lleno
                        ?`<button class="btn btn-primary text-sm flex-1 btn-unirse"><i class="fa fa-plus mr-1"></i> Unirse</button>`
                        :yaUnido?`<button class="btn btn-secondary text-sm flex-1 btn-salir"><i class="fa fa-check mr-1"></i> Unido — Salir</button>`
                        :`<button class="btn text-sm flex-1 bg-gray-200 text-gray-400" disabled><i class="fa fa-lock mr-1"></i> Lleno</button>`}
                    <button class="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-blue-50 btn-compartir flex-shrink-0"><i class="fa fa-share-alt"></i></button>
                </div>`;
            item.querySelector('.btn-unirse')?.addEventListener('click',    ()=>this.unirseActividad(act));
            item.querySelector('.btn-salir')?.addEventListener('click',     ()=>this.salirActividad(act));
            item.querySelector('.btn-compartir')?.addEventListener('click', ()=>this.compartirActividad(act));
            cont.appendChild(item);
        });
    },

    async unirseActividad(act) {
        try { await this.unirseActividadDb(act.id); act.participantes.push(this.currentUser.id); this.renderActividades(); toast(`¡Te uniste a "${act.titulo}"! 🎣`,'success'); }
        catch(err){ toast('Error: '+err.message,'error'); }
    },

    async salirActividad(act) {
        if(!await confirmar(`¿Salir de "${act.titulo}"?`))return;
        try { await this.salirActividadDb(act.id); act.participantes=act.participantes.filter(p=>p!==this.currentUser.id); this.renderActividades(); }
        catch(err){ toast('Error: '+err.message,'error'); }
    },

    compartirActividad(act) {
        const texto=`🎣 ¡Únete a "${act.titulo}"!\n📅 ${act.fecha} ${act.hora}\n📍 ${act.lugar}\n\nVía PzKayak Connect`;
        if(navigator.share){navigator.share({title:act.titulo,text:texto}).catch(()=>{});}
        else{navigator.clipboard?.writeText(texto).then(()=>toast('Copiado','info'));}
    },

    mostrarFormActividad() {
        const overlay=document.createElement('div');
        overlay.className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        overlay.innerHTML=`<div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold">Nueva Actividad</h2>
                <button id="act-close" class="text-gray-400 w-8 h-8 flex items-center justify-center"><i class="fa fa-times text-xl"></i></button>
            </div>
            <div class="space-y-3">
                <input id="act-titulo" type="text" class="input-field" placeholder="Nombre *">
                <input id="act-lugar"  type="text" class="input-field" placeholder="Lugar *">
                <textarea id="act-desc" class="input-field" rows="2" placeholder="Descripción (opcional)"></textarea>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs text-gray-500 mb-1 block">Fecha *</label><input id="act-fecha" type="date" class="input-field"></div>
                    <div><label class="text-xs text-gray-500 mb-1 block">Hora</label><input id="act-hora" type="time" class="input-field" value="08:00"></div>
                </div>
                <div><label class="text-xs text-gray-500 mb-1 block">Máx. participantes</label>
                <input id="act-max" type="number" class="input-field" value="10" min="2" max="100"></div>
                <button id="act-guardar" class="btn btn-primary w-full"><i class="fa fa-check mr-1"></i> Crear Actividad</button>
            </div></div>`;
        document.body.appendChild(overlay);
        document.getElementById('act-fecha').min=new Date().toISOString().split('T')[0];
        document.getElementById('act-close').onclick=()=>overlay.remove();
        overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
        document.getElementById('act-guardar').onclick=async()=>{
            const titulo=document.getElementById('act-titulo').value.trim();
            const lugar=document.getElementById('act-lugar').value.trim();
            const fecha=document.getElementById('act-fecha').value;
            const hora=document.getElementById('act-hora').value;
            const max=parseInt(document.getElementById('act-max').value)||10;
            const desc=document.getElementById('act-desc').value.trim();
            if(!titulo||!lugar||!fecha){toast('Completa los campos obligatorios','error');return;}
            const btn=document.getElementById('act-guardar');
            btn.disabled=true; btn.innerHTML='<i class="fa fa-spinner fa-spin mr-1"></i> Creando...';
            try{
                const nueva=await this.crearActividadDb({titulo,lugar,fecha,hora,max,descripcion:desc});
                this.actividades.unshift({id:nueva.id,titulo,lugar,fecha,hora,maxParticipantes:max,participantes:[this.currentUser.id],creador:this.perfil?.nombre||'Tú',descripcion:desc});
                overlay.remove(); this.renderActividades(); toast(`¡"${titulo}" creada! 🎣`,'success');
            }catch(err){toast('Error: '+err.message,'error');btn.disabled=false;btn.innerHTML='<i class="fa fa-check mr-1"></i> Crear Actividad';}
        };
    },

    async refreshLocations() {
        const btn=document.getElementById('community-refresh-btn');
        if(btn){btn.innerHTML='<i class="fa fa-spinner fa-spin mr-1"></i>';btn.disabled=true;}
        try{await this.cargarTodo();this.render();toast('Actualizado','success');}
        catch{toast('Error al actualizar','error');}
        finally{if(btn){btn.innerHTML='<i class="fa fa-refresh mr-1"></i> Actualizar';btn.disabled=false;}}
    }
};

window.communityModule = communityModule;