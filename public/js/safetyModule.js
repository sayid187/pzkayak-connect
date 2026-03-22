/**
 * Módulo de Seguridad - PzKayak Connect
 */

const safetyModule = {

    contactos: [
        { id: 'c_001', nombre: 'Familiar',  relacion: 'Familia', telefono: '+58 412 000 0000' },
        { id: 'c_002', nombre: 'Amigo',     relacion: 'Amigo',   telefono: '+58 414 000 0001' }
    ],

    equipo: [
        { id: 'eq_001', nombre: 'Chaleco Salvavidas',            checked: false, icon: 'fa-life-ring' },
        { id: 'eq_002', nombre: 'Silbato',                       checked: false, icon: 'fa-bullhorn' },
        { id: 'eq_003', nombre: 'Ancla',                         checked: false, icon: 'fa-anchor' },
        { id: 'eq_004', nombre: 'Remo extra',                    checked: false, icon: 'fa-arrows-v' },
        { id: 'eq_005', nombre: 'Botiquín de Primeros Auxilios', checked: false, icon: 'fa-medkit' },
        { id: 'eq_006', nombre: 'Linterna',                      checked: false, icon: 'fa-lightbulb-o' },
        { id: 'eq_007', nombre: 'Radio / Walkie-talkie',         checked: false, icon: 'fa-volume-up' },
        { id: 'eq_008', nombre: 'Agua Potable',                  checked: false, icon: 'fa-tint' },
        { id: 'eq_009', nombre: 'Teléfono cargado',              checked: false, icon: 'fa-mobile' },
        { id: 'eq_010', nombre: 'Protector solar',               checked: false, icon: 'fa-sun-o' }
    ],

    ubicacionActual: { lat: null, lng: null },
    sosActivo: false,

    async init() {
        await this.cargarDatos();
        this.setupEventListeners();
        this.renderContactos();
        this.renderEquipo();
        this.actualizarUbicacion();
    },

    // ── PERSISTENCIA ──────────────────────────────────────────────────────────

    async cargarDatos() {
        // Equipo stays in localStorage (device-specific)
        try {
            const e = localStorage.getItem('pzkayak_equipo_seguridad');
            if (e) this.equipo = JSON.parse(e);
        } catch {}
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) return;
            const { data } = await db
                .from('contactos_emergencia')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at');
            if (data && data.length > 0) this.contactos = data;
        } catch (err) { console.error('Error cargando contactos:', err); }
    },


    guardarEquipo() {
        localStorage.setItem('pzkayak_equipo_seguridad', JSON.stringify(this.equipo));
    },

    async guardarContacto(contacto) {
        const { data: { session } } = await db.auth.getSession();
        if (!session) return null;
        if (contacto.id && !contacto.id.startsWith('c_')) {
            // Update existing Supabase record
            const { data, error } = await db.from('contactos_emergencia')
                .update({ nombre: contacto.nombre, relacion: contacto.relacion, telefono: contacto.telefono })
                .eq('id', contacto.id).select().single();
            if (error) throw error;
            return data;
        } else {
            // Insert new
            const { data, error } = await db.from('contactos_emergencia')
                .insert({ user_id: session.user.id, nombre: contacto.nombre, relacion: contacto.relacion, telefono: contacto.telefono })
                .select().single();
            if (error) throw error;
            return data;
        }
    },

    async eliminarContactoDb(id) {
        if (!id || id.startsWith('c_')) return;
        await db.from('contactos_emergencia').delete().eq('id', id);
    },

    // ── UBICACIÓN ─────────────────────────────────────────────────────────────

    actualizarUbicacion() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            this.ubicacionActual.lat = pos.coords.latitude;
            this.ubicacionActual.lng = pos.coords.longitude;
        });
    },

    updateCurrentLocation() {
        this.actualizarUbicacion();
    },

    // ── SOS ───────────────────────────────────────────────────────────────────

    setupEventListeners() {
        document.getElementById('sos-btn')
            ?.addEventListener('click', () => this.confirmarSOS());

        document.querySelector('#safety-page .btn-danger')
            ?.addEventListener('click', () => this.llamadaEmergencia());
    },

    confirmarSOS() {
        if (this.sosActivo) {
            confirmar('¿Cancelar la alerta SOS?').then(ok => { if (ok) this.cancelarSOS(); });
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa fa-exclamation-triangle text-danger text-3xl"></i>
                </div>
                <h2 class="text-xl font-bold text-danger mb-2">Activar SOS</h2>
                <p class="text-gray-600 mb-2">Se enviará tu ubicación a tus contactos de emergencia.</p>
                ${this.ubicacionActual.lat
                    ? `<p class="text-xs text-gray-400 mb-4">
                        <i class="fa fa-map-marker mr-1"></i>
                        ${this.ubicacionActual.lat.toFixed(5)}, ${this.ubicacionActual.lng.toFixed(5)}
                       </p>`
                    : `<p class="text-xs text-orange-500 mb-4">⚠️ Ubicación no disponible</p>`
                }
                <div class="flex gap-3">
                    <button id="sos-cancelar" class="btn btn-secondary flex-1">Cancelar</button>
                    <button id="sos-confirmar" class="btn btn-danger flex-1">¡Activar SOS!</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('sos-cancelar').onclick  = () => modal.remove();
        document.getElementById('sos-confirmar').onclick = () => {
            modal.remove();
            this.activarSOS();
        };
    },

    activarSOS() {
        this.sosActivo = true;
        const btn = document.getElementById('sos-btn');
        if (btn) {
            btn.classList.add('animate-pulse');
            btn.innerHTML = '<i class="fa fa-times text-white text-3xl"></i>';
        }

        // Notificación visible
        const banner = document.createElement('div');
        banner.id = 'sos-banner';
        banner.className = 'fixed top-0 left-0 right-0 bg-danger text-white text-center py-2 z-50 text-sm font-bold';
        banner.innerHTML = '<i class="fa fa-exclamation-triangle mr-1"></i> SOS ACTIVO — Toca el botón rojo para cancelar';
        document.body.prepend(banner);

        // Simular envío a contactos
        const nombres = this.contactos.map(c => c.nombre).join(', ');
        setTimeout(() => {
            toast.info(`✅ Alerta SOS enviada a: ${nombres}\n\nUbicación: ${
                this.ubicacionActual.lat
                    ? `${this.ubicacionActual.lat.toFixed(5)}, ${this.ubicacionActual.lng.toFixed(5)}`
                    : 'No disponible'
            }`);
        }, 500);
    },

    cancelarSOS() {
        this.sosActivo = false;
        const btn = document.getElementById('sos-btn');
        if (btn) {
            btn.classList.remove('animate-pulse');
            btn.innerHTML = '<i class="fa fa-exclamation-triangle text-white text-4xl"></i>';
        }
        document.getElementById('sos-banner')?.remove();
    },

    llamadaEmergencia() {
        const opciones = `
¿A quién llamar?

1. Guardia Costera: 137
2. Emergencias: 133
3. ${this.contactos[0]?.nombre || 'Contacto'}: ${this.contactos[0]?.telefono || 'No configurado'}
        `.trim();
        toast.info(opciones);
    },

    // ── CONTACTOS ─────────────────────────────────────────────────────────────

    renderContactos() {
        const cont = document.querySelector('#safety-page .card:nth-child(2) .space-y-3');
        if (!cont) return;

        // Renderizar solo los items de contacto, mantener el botón Añadir
        const btnAnadir = cont.querySelector('.btn-primary');
        cont.innerHTML = '';

        this.contactos.forEach(c => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-2 bg-gray-50 rounded-lg';
            item.innerHTML = `
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span class="font-bold text-primary">${c.nombre.charAt(0).toUpperCase()}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium">${c.nombre}</p>
                    <p class="text-sm text-gray-500">${c.relacion} · ${c.telefono}</p>
                </div>
                <div class="flex gap-2">
                    <button class="text-primary p-1 btn-llamar" title="Llamar">
                        <i class="fa fa-phone"></i>
                    </button>
                    <button class="text-primary p-1 btn-editar" title="Editar">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="text-danger p-1 btn-eliminar" title="Eliminar">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            `;
            item.querySelector('.btn-llamar').onclick   = () => toast.info(`Llamando a ${c.nombre}: ${c.telefono}`);
            item.querySelector('.btn-editar').onclick   = () => this.editarContacto(c.id);
            item.querySelector('.btn-eliminar').onclick = () => this.eliminarContacto(c.id);
            cont.appendChild(item);
        });

        // Botón añadir
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary w-full';
        btn.innerHTML = '<i class="fa fa-plus mr-1"></i> Añadir Contacto';
        btn.onclick = () => this.mostrarFormContacto();
        cont.appendChild(btn);
    },

    mostrarFormContacto(contacto = null) {
        const esEdicion = !!contacto;
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">${esEdicion ? 'Editar' : 'Añadir'} Contacto</h2>
                    <button id="modal-close" class="text-gray-400"><i class="fa fa-times text-xl"></i></button>
                </div>
                <div class="space-y-3">
                    <input id="c-nombre"   type="text" class="input-field" placeholder="Nombre" value="${contacto?.nombre || ''}">
                    <input id="c-relacion" type="text" class="input-field" placeholder="Relación (ej: Familia, Amigo)" value="${contacto?.relacion || ''}">
                    <input id="c-telefono" type="tel"  class="input-field" placeholder="Teléfono" value="${contacto?.telefono || ''}">
                    <button id="modal-guardar" class="btn btn-primary w-full">
                        <i class="fa fa-save mr-1"></i> ${esEdicion ? 'Actualizar' : 'Guardar'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('modal-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        document.getElementById('modal-guardar').onclick = async () => {
            const nombre   = document.getElementById('c-nombre').value.trim();
            const relacion = document.getElementById('c-relacion').value.trim();
            const telefono = document.getElementById('c-telefono').value.trim();
            if (!nombre || !telefono) { toast.error('Nombre y teléfono son obligatorios'); return; }

            try {
                if (esEdicion) {
                    const updated = await this.guardarContacto({ id: contacto.id, nombre, relacion, telefono });
                    const idx = this.contactos.findIndex(x => x.id === contacto.id);
                    if (idx !== -1 && updated) this.contactos[idx] = updated;
                } else {
                    const nuevo = await this.guardarContacto({ nombre, relacion, telefono });
                    if (nuevo) this.contactos.push(nuevo);
                }
                this.renderContactos();
                modal.remove();
            } catch (err) { toast.error('Error al guardar: ' + err.message); }
        };
    },

    editarContacto(id) {
        const c = this.contactos.find(x => x.id === id);
        if (c) this.mostrarFormContacto(c);
    },

    async eliminarContacto(id) {
        const c = this.contactos.find(x => x.id === id);
        if (!c) return;
        if (!await confirmar(`¿Eliminar a ${c.nombre} de tus contactos de emergencia?`)) return;
        this.contactos = this.contactos.filter(x => x.id !== id);
        await this.eliminarContactoDb(id);
        this.renderContactos();
    },

    // ── EQUIPO ────────────────────────────────────────────────────────────────

    renderEquipo() {
        const cont = document.querySelector('#safety-page .card:nth-child(3) .space-y-3');
        if (!cont) return;
        cont.innerHTML = '';

        this.equipo.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors';
            div.innerHTML = `
                <input type="checkbox" id="${item.id}" class="w-5 h-5 text-primary rounded focus:ring-primary cursor-pointer" ${item.checked ? 'checked' : ''}>
                <label for="${item.id}" class="flex-1 flex items-center gap-2 cursor-pointer ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}">
                    <i class="fa ${item.icon} text-gray-400 w-4 text-center"></i>
                    ${item.nombre}
                </label>
                ${item.checked ? '<i class="fa fa-check-circle text-green-500"></i>' : ''}
            `;

            const checkbox = div.querySelector('input');
            checkbox.onchange = () => {
                item.checked = checkbox.checked;
                this.guardarEquipo();
                this.renderEquipo();
                this.actualizarBarraEquipo();
            };
            cont.appendChild(div);
        });

        // Barra de progreso
        const total    = this.equipo.length;
        const listos   = this.equipo.filter(e => e.checked).length;
        const pct      = Math.round(listos / total * 100);
        const colorBar = pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400';

        const barra = document.createElement('div');
        barra.id = 'equipo-progress';
        barra.className = 'mt-2';
        barra.innerHTML = `
            <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>${listos} de ${total} elementos listos</span>
                <span>${pct}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="${colorBar} h-2 rounded-full transition-all" style="width:${pct}%"></div>
            </div>
        `;
        cont.appendChild(barra);

        // Botón completar
        const btn = document.createElement('button');
        btn.className = `btn w-full mt-2 ${pct === 100 ? 'btn-secondary' : 'btn-primary'}`;
        btn.innerHTML = pct === 100
            ? '<i class="fa fa-check-circle mr-1"></i> ¡Todo listo para salir!'
            : `<i class="fa fa-check-circle mr-1"></i> Completar Verificación (${listos}/${total})`;
        btn.onclick = () => {
            if (pct < 100) {
                const faltantes = this.equipo.filter(e => !e.checked).map(e => `• ${e.nombre}`).join('\n');
                toast.error(`Aún faltan estos elementos:\n\n${faltantes}`);
            } else {
                toast.success('✅ ¡Equipo completo! Estás listo para salir a pescar.');
            }
        };
        cont.appendChild(btn);
    },

    actualizarBarraEquipo() {
        // ya se renderiza en renderEquipo
    }
};

window.safetyModule = safetyModule;