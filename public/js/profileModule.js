/**
 * Módulo de Perfil - PzKayak Connect
 */

const profileModule = {

    perfil: {
        nombre: 'Usuario PzKayak',
        bio: 'Entusiasta de Pesca en Kayak',
        foto: null // base64 o null
    },

    config: {
        notificaciones: true,
        sincAuto: true,
        ubicacion: true,
        unidades: 'metric' // metric | imperial
    },

    async init() {
        await this.cargarDatos();
        this.renderPerfil();
        this.setupEventListeners();
        this.actualizarEstadisticas();
    },

    // ── PERSISTENCIA ──────────────────────────────────────────────────────────

    async cargarDatos() {
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) return;
            const { data } = await db.from('perfiles').select('*').eq('id', session.user.id).single();
            if (data) {
                this.perfil = {
                    ...this.perfil,
                    nombre:    data.nombre    || this.perfil.nombre,
                    bio:       data.bio       || '',
                    telefono:  data.telefono  || '',
                    ubicacion: data.ubicacion || '',
                    nivel:     data.nivel     || 'principiante',
                    email:     session.user.email,
                    foto:      data.avatar_url || null,
                    contacto_emergencia: data.contacto_emergencia || '',
                };
                this.config = {
                    ...this.config,
                    unidadPeso:     data.unidad_peso     || 'kg',
                    unidadLongitud: data.unidad_longitud || 'cm',
                    notificaciones: data.notificaciones ?? true,
                };
            }
        } catch (err) { console.error('Error cargando perfil:', err); }
    },

    async guardarDatos() {
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) return;
            await db.from('perfiles').upsert({
                id:              session.user.id,
                nombre:          this.perfil.nombre,
                bio:             this.perfil.bio,
                telefono:        this.perfil.telefono,
                ubicacion:       this.perfil.ubicacion,
                nivel:           this.perfil.nivel,
                contacto_emergencia: this.perfil.contacto_emergencia,
                avatar_url:      this.perfil.foto,
                unidad_peso:     this.config.unidadPeso,
                unidad_longitud: this.config.unidadLongitud,
                notificaciones:  this.config.notificaciones,
                updated_at:      new Date().toISOString()
            });
        } catch (err) { console.error('Error guardando perfil:', err); }
    },

    // ── RENDER PERFIL ─────────────────────────────────────────────────────────

    renderPerfil() {
        const nombre = document.querySelector('#profile-page h2.text-xl');
        const bio    = document.querySelector('#profile-page p.text-gray-600');
        const avatar = document.querySelector('#profile-page .w-24.h-24');

        if (nombre) nombre.textContent = this.perfil.nombre;
        if (bio)    bio.textContent    = this.perfil.bio;

        if (avatar && this.perfil.foto) {
            avatar.innerHTML = `<img src="${this.perfil.foto}" class="w-full h-full object-cover rounded-full">`;
        }

        // Sincronizar toggles con config guardada
        const toggleSinc = document.querySelector('#profile-page input[type="checkbox"]');
        if (toggleSinc) toggleSinc.checked = this.config.sincAuto;
    },

    // ── ESTADÍSTICAS REALES ───────────────────────────────────────────────────

    async actualizarEstadisticas() {
        try {
            const { data: { session: s } } = await db.auth.getSession();
            const { data: capturas = [] } = s ? await db.from('capturas').select('peso,longitud,fecha').eq('user_id', s.user.id) : {};
            const { data: viajes = [] }   = s ? await db.from('viajes').select('distancia,duracion').eq('user_id', s.user.id)   : {};

            // Calcular km totales de viajes
            let kmTotales = 0;
            viajes.forEach(v => {
                if (v.distancia) kmTotales += parseFloat(v.distancia);
            });

            const stats = document.querySelectorAll('#profile-page .grid .text-2xl');
            if (stats[0]) stats[0].textContent = viajes.length   || '0';
            if (stats[1]) stats[1].textContent = capturas.length || '0';
            if (stats[2]) stats[2].textContent = kmTotales > 0 ? kmTotales.toFixed(1) : '0';
        } catch { /* mantener valores actuales */ }
    },

    // ── EVENT LISTENERS ───────────────────────────────────────────────────────

    setupEventListeners() {
        // Botón Editar Perfil
        const btnEditar = document.querySelector('#profile-page .btn-primary');
        if (btnEditar) btnEditar.onclick = () => this.mostrarFormPerfil();

        // Avatar — click para cambiar foto
        const avatar = document.querySelector('#profile-page .w-24.h-24');
        if (avatar) {
            avatar.style.cursor = 'pointer';
            avatar.title = 'Toca para cambiar foto';
            avatar.onclick = () => this.cambiarFoto();
        }

        // Toggle sincronización automática
        const toggleSinc = document.querySelector('#profile-page input[type="checkbox"]');
        if (toggleSinc) {
            toggleSinc.onchange = () => {
                this.config.sincAuto = toggleSinc.checked;
                this.guardarDatos();
                this.mostrarToast(toggleSinc.checked ? 'Sincronización activada' : 'Sincronización desactivada');
            };
        }

        // Botones de configuración (chevron-right)
        const btnItems = document.querySelectorAll('#profile-page .card:nth-child(3) button.text-gray-600');
        const acciones = ['notificaciones', 'ubicacion', 'seguridad', 'idioma'];
        btnItems.forEach((btn, i) => {
            btn.onclick = () => this.abrirConfiguracion(acciones[i] || 'general');
        });

        // Acerca de
        const btnPrivacidad = document.querySelector('#profile-page .card:last-child .space-y-3 div:nth-child(1) button');
        const btnTerminos   = document.querySelector('#profile-page .card:last-child .space-y-3 div:nth-child(2) button');
        const btnAyuda      = document.querySelector('#profile-page .card:last-child .space-y-3 div:nth-child(3) button');
        const btnContacto   = document.querySelector('#profile-page .card:last-child .space-y-3 div:nth-child(4) button');

        if (btnPrivacidad) btnPrivacidad.onclick = () => this.mostrarInfo('Política de Privacidad', 'Tus datos se almacenan localmente en tu dispositivo. Al conectar con Supabase en el futuro, tus datos estarán protegidos con cifrado.');
        if (btnTerminos)   btnTerminos.onclick   = () => this.mostrarInfo('Términos de Servicio', 'PzKayak Connect es una app para uso recreativo de pesca en kayak. El usuario es responsable de su seguridad en el agua.');
        if (btnAyuda)      btnAyuda.onclick      = () => this.mostrarAyuda();
        if (btnContacto)   btnContacto.onclick   = () => this.mostrarContacto();

        // Cerrar sesión
        const btnLogout = document.querySelector('#profile-page .btn-danger');
        if (btnLogout) btnLogout.onclick = () => this.cerrarSesion();
    },

    // ── EDITAR PERFIL ─────────────────────────────────────────────────────────

    mostrarFormPerfil() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">Editar Perfil</h2>
                    <button id="modal-close" class="text-gray-400"><i class="fa fa-times text-xl"></i></button>
                </div>
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input id="p-nombre" type="text" class="input-field" value="${this.perfil.nombre}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <input id="p-bio" type="text" class="input-field" value="${this.perfil.bio}" placeholder="Cuéntanos sobre ti">
                    </div>
                    <button id="modal-guardar" class="btn btn-primary w-full">
                        <i class="fa fa-save mr-1"></i> Guardar Cambios
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('modal-close').onclick  = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        document.getElementById('modal-guardar').onclick = () => {
            const nombre = document.getElementById('p-nombre').value.trim();
            const bio    = document.getElementById('p-bio').value.trim();
            if (!nombre) { toast.info('El nombre no puede estar vacío'); return; }
            this.perfil.nombre = nombre;
            this.perfil.bio    = bio;
            this.guardarDatos();
            this.renderPerfil();
            modal.remove();
            this.mostrarToast('Perfil actualizado');
        };
    },

    cambiarFoto() {
        const input = document.createElement('input');
        input.type   = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.perfil.foto = ev.target.result;
                this.guardarDatos();
                this.renderPerfil();
                this.mostrarToast('Foto actualizada');
            };
            reader.readAsDataURL(file);
        };
        input.click();
    },

    // ── CONFIGURACIÓN ─────────────────────────────────────────────────────────

    abrirConfiguracion(tipo) {
        const configs = {
            notificaciones: {
                titulo: 'Notificaciones',
                contenido: `
                    <div class="space-y-3">
                        ${this.toggleItem('notif-viajes',   'Alertas de viaje',         this.config.notificaciones)}
                        ${this.toggleItem('notif-clima',    'Alertas de clima',          true)}
                        ${this.toggleItem('notif-amigos',   'Actividad de amigos',       true)}
                        ${this.toggleItem('notif-capturas', 'Recordatorios de captura',  false)}
                    </div>
                `
            },
            ubicacion: {
                titulo: 'Permisos de Ubicación',
                contenido: `
                    <div class="space-y-3">
                        <p class="text-sm text-gray-600">Los permisos de ubicación son necesarios para el mapa, seguimiento de viajes y encontrar pescadores cercanos.</p>
                        ${this.toggleItem('ubic-siempre', 'Usar ubicación', this.config.ubicacion)}
                        <div class="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                            <i class="fa fa-info-circle mr-1"></i>
                            Para cambiar permisos del sistema, ve a Configuración de tu dispositivo.
                        </div>
                    </div>
                `
            },
            seguridad: {
                titulo: 'Seguridad de Cuenta',
                contenido: `
                    <div class="space-y-3">
                        <button class="w-full p-3 bg-gray-50 rounded-lg text-left flex justify-between items-center" onclick="profileModule.cambiarContrasena()">
                            <span class="font-medium">Cambiar contraseña</span>
                            <i class="fa fa-chevron-right text-gray-400"></i>
                        </button>
                        <button class="w-full p-3 bg-gray-50 rounded-lg text-left flex justify-between items-center" onclick="profileModule.exportarDatos()">
                            <span class="font-medium">Exportar mis datos</span>
                            <i class="fa fa-chevron-right text-gray-400"></i>
                        </button>
                        <button class="w-full p-3 bg-red-50 rounded-lg text-left flex justify-between items-center" onclick="profileModule.eliminarCuenta()">
                            <span class="font-medium text-red-600">Eliminar cuenta</span>
                            <i class="fa fa-chevron-right text-red-400"></i>
                        </button>
                    </div>
                `
            },
            idioma: {
                titulo: 'Idioma y Unidades',
                contenido: `
                    <div class="space-y-3">
                        <div>
                            <p class="text-sm font-medium text-gray-700 mb-2">Idioma</p>
                            <select class="input-field">
                                <option selected>Español</option>
                                <option>English</option>
                            </select>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-700 mb-2">Unidades de medida</p>
                            <div class="grid grid-cols-2 gap-2">
                                <button class="p-2 rounded-lg border-2 ${this.config.unidades === 'metric' ? 'border-primary bg-blue-50 text-primary' : 'border-gray-200'} text-sm font-medium" onclick="profileModule.setUnidades('metric', this)">
                                    Métrico (cm, kg)
                                </button>
                                <button class="p-2 rounded-lg border-2 ${this.config.unidades === 'imperial' ? 'border-primary bg-blue-50 text-primary' : 'border-gray-200'} text-sm font-medium" onclick="profileModule.setUnidades('imperial', this)">
                                    Imperial (in, lb)
                                </button>
                            </div>
                        </div>
                    </div>
                `
            }
        };

        const cfg = configs[tipo] || configs.notificaciones;
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">${cfg.titulo}</h2>
                    <button id="modal-close" class="text-gray-400"><i class="fa fa-times text-xl"></i></button>
                </div>
                ${cfg.contenido}
                <button id="modal-guardar" class="btn btn-primary w-full mt-4">Listo</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('modal-close').onclick   = () => modal.remove();
        document.getElementById('modal-guardar').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    },

    toggleItem(id, label, checked) {
        return `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span class="text-sm font-medium">${label}</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="${id}" class="sr-only peer" ${checked ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        `;
    },

    setUnidades(tipo, btn) {
        this.config.unidades = tipo;
        this.guardarDatos();
        btn.closest('.grid').querySelectorAll('button').forEach(b => {
            b.className = b.className.replace('border-primary bg-blue-50 text-primary', 'border-gray-200');
        });
        btn.className = btn.className.replace('border-gray-200', 'border-primary bg-blue-50 text-primary');
    },

    // ── ACERCA DE ─────────────────────────────────────────────────────────────

    mostrarInfo(titulo, texto) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">${titulo}</h2>
                    <button id="modal-close" class="text-gray-400"><i class="fa fa-times text-xl"></i></button>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed mb-4">${texto}</p>
                <button id="modal-ok" class="btn btn-primary w-full">Entendido</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modal-close').onclick = () => modal.remove();
        document.getElementById('modal-ok').onclick    = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    },

    mostrarAyuda() {
        this.mostrarInfo('Centro de Ayuda', `
            <strong>Módulos disponibles:</strong><br><br>
            🌤 <strong>Dashboard</strong> — Clima y resumen del día<br>
            🚣 <strong>Viajes</strong> — Seguimiento GPS de tus salidas<br>
            🐟 <strong>Capturas</strong> — Registra tus pescas con foto y ubicación<br>
            👥 <strong>Comunidad</strong> — Conecta con otros pescadores<br>
            🛡 <strong>Seguridad</strong> — SOS y equipo de seguridad<br><br>
            Para soporte escríbenos desde "Contáctanos".
        `);
    },

    mostrarContacto() {
        this.mostrarInfo('Contáctanos', 'Puedes enviarnos un mensaje a <strong>soporte@pzkayak.app</strong><br><br>Responderemos en menos de 48 horas.');
    },

    // ── SEGURIDAD ─────────────────────────────────────────────────────────────

    cambiarContrasena() {
        toast.info('Cambio de contraseña disponible cuando se integre Supabase.');
    },

    async exportarDatos() {
        try {
            const datos = {
                perfil:   this.perfil,
                capturas: (await db.from('capturas').select('*').eq('user_id', (await db.auth.getSession()).data.session?.user.id)).data || [],
                viajes:   (await db.from('viajes').select('*').eq('user_id', (await db.auth.getSession()).data.session?.user.id)).data || [],
                contactos:(await db.from('contactos_emergencia').select('*').eq('user_id', (await db.auth.getSession()).data.session?.user.id)).data || [],
                exportado: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `pzkayak_datos_${new Date().toLocaleDateString('es-ES').replace(/\//g,'-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.mostrarToast('Datos exportados correctamente');
        } catch { toast.error('Error al exportar datos'); }
    },

    async eliminarCuenta() {
        const ok = typeof confirmar === 'function' ? await confirmar('¿Eliminar todos tus datos? Esta acción no se puede deshacer.') : confirm('¿Eliminar todos tus datos?');
        if (!ok) return;
        
        try {
            const { data: { session } } = await db.auth.getSession();
            if (session) {
                await db.from('capturas').delete().eq('user_id', session.user.id);
                await db.from('viajes').delete().eq('user_id', session.user.id);
                await db.from('contactos_emergencia').delete().eq('user_id', session.user.id);
                await db.from('playas_favoritas').delete().eq('user_id', session.user.id);
            }
            localStorage.removeItem('pzkayak_equipo_seguridad');
            toast.success('Todos tus datos han sido eliminados.');
            location.reload();
        } catch (err) { toast.error('Error: ' + err.message); }
    },

    // ── CERRAR SESIÓN ─────────────────────────────────────────────────────────

    async cerrarSesion() {
        const ok = typeof confirmar === 'function' ? await confirmar('¿Cerrar sesión?') : confirm('¿Cerrar sesión?');
        if (!ok) return;
        if (typeof cerrarSesionApp === 'function') {
            await cerrarSesionApp();
        } else {
            await db.auth.signOut();
            location.reload();
        }
    },

    // ── TOAST ─────────────────────────────────────────────────────────────────

    mostrarToast(mensaje) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full z-50 opacity-0 transition-opacity';
        toast.textContent = mensaje;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
};

window.profileModule = profileModule;