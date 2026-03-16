/**
 * Módulo de Registro de Capturas — Supabase
 */

const catchLog = {
    catches: [],
    form: null,
    currentLat: null,
    currentLng: null,

    async init() {
        await this.loadCatches();
        this.setupMap();
        this.setupForm();
        this.setupEventListeners();
        this.updateCatchList();
    },

    // ── MAPA ──────────────────────────────────────────────────────────────────

    setupMap() {
        const container = document.getElementById('catch-map');
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

    setLocation(lat, lng) {
        this.currentLat = lat;
        this.currentLng = lng;
        const container = document.getElementById('catch-map');
        if (container) {
            container.innerHTML = `<iframe
                src="https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&hl=es"
                style="width:100%;height:100%;border:none;border-radius:0.75rem"
                allowfullscreen loading="lazy">
            </iframe>`;
        }
        const display = document.getElementById('catch-location-display');
        const text    = document.getElementById('catch-location-text');
        if (display) display.classList.remove('hidden');
        if (text) text.textContent = `Ubicación: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
    },

    // ── FORMULARIO ────────────────────────────────────────────────────────────

    setupForm() {
        this.form = document.getElementById('catch-form');
        if (!this.form) return;
        this.form.addEventListener('submit', (e) => { e.preventDefault(); this.saveCatch(); });
        this.setupPhotoUpload();
    },

    setupPhotoUpload() {
        const area  = document.getElementById('photo-upload-area');
        const input = document.getElementById('catch-photo-input');
        if (!area || !input) return;
        area.addEventListener('click', (e) => { if (!e.target.closest('.remove-photo')) input.click(); });
        input.addEventListener('change', (e) => {
            if (e.target.files?.[0]) this.previewImage(e.target.files[0]);
        });
    },

    previewImage(file) {
        if (!file.type.match('image.*')) { alert('Selecciona un archivo de imagen'); return; }
        const area = document.getElementById('photo-upload-area');
        if (!area) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            area.innerHTML = `
                <div class="relative">
                    <img src="${e.target.result}" alt="Vista previa" class="w-full h-40 object-cover rounded-lg">
                    <button type="button" class="remove-photo absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-md">
                        <i class="fa fa-times text-gray-600"></i>
                    </button>
                </div>
            `;
            area.querySelector('.remove-photo').addEventListener('click', () => this.resetPhotoUpload());
        };
        reader.readAsDataURL(file);
    },

    resetPhotoUpload() {
        const area = document.getElementById('photo-upload-area');
        if (!area) return;
        area.innerHTML = `
            <i class="fa fa-camera text-gray-400 text-3xl mb-2"></i>
            <p class="text-sm text-gray-600">Toca aquí para subir una foto</p>
            <input type="file" name="photo" id="catch-photo-input" class="hidden" accept="image/*">
        `;
        this.setupPhotoUpload();
    },

    setupEventListeners() {
        const addMarkerBtn = document.querySelector('#catch-page .text-primary.text-sm');
        if (addMarkerBtn) {
            addMarkerBtn.addEventListener('click', () => {
                navigator.geolocation?.getCurrentPosition(
                    (pos) => this.setLocation(pos.coords.latitude, pos.coords.longitude),
                    () => alert('No se pudo obtener tu ubicación')
                );
            });
        }
        const filterTabs = document.querySelectorAll('#catch-page .tab[data-filter]');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.filterCatches(tab.dataset.filter);
            });
        });
    },

    // ── GUARDAR ───────────────────────────────────────────────────────────────

    async saveCatch() {
        if (!this.form) return;

        const especie  = this.form.querySelector('[name="species"]')?.value;
        const longitud = this.form.querySelector('[name="length"]')?.value;
        const peso     = this.form.querySelector('[name="weight"]')?.value;
        const cebo     = this.form.querySelector('[name="bait"]')?.value || '';
        const prof     = this.form.querySelector('[name="depth"]')?.value || '';
        const notas    = this.form.querySelector('[name="notes"]')?.value || '';

        if (!especie)  { alert('Por favor selecciona la especie'); return; }
        if (!longitud) { alert('Por favor ingresa la longitud'); return; }
        if (!peso)     { alert('Por favor ingresa el peso'); return; }
        if (!this.currentLat || !this.currentLng) {
            alert('Pulsa "Añadir Marcador" para registrar la ubicación');
            return;
        }

        const btn = this.form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> Guardando...'; }

        try {
            // Subir foto si hay
            let foto_url = null;
            const input   = document.getElementById('catch-photo-input');
            const preview = document.querySelector('#photo-upload-area img');

            if (input?.files?.[0]) {
                foto_url = await this.subirFoto(input.files[0]);
            } else if (preview?.src?.startsWith('data:')) {
                foto_url = await this.subirFotoBase64(preview.src);
            }

            const { data: { session } } = await db.auth.getSession();
            if (!session) { alert('Tu sesión expiró, inicia sesión nuevamente'); return; }

            const catchData = {
                user_id:    session.user.id,
                especie,
                longitud:   parseFloat(longitud),
                peso:       parseFloat(peso),
                cebo,
                profundidad: prof ? parseFloat(prof) : null,
                notas,
                foto_url,
                lat:  this.currentLat,
                lng:  this.currentLng,
                fecha: new Date().toISOString()
            };

            const editId = this.form.dataset.editId;
            let error;

            if (editId) {
                ({ error } = await db.from('capturas').update(catchData).eq('id', editId));
                if (!error) delete this.form.dataset.editId;
            } else {
                ({ error } = await db.from('capturas').insert(catchData));
            }

            if (error) throw error;

            this.form.reset();
            this.resetPhotoUpload();
            document.getElementById('catch-location-display')?.classList.add('hidden');
            if (btn) btn.innerHTML = '<i class="fa fa-save mr-1"></i> Guardar Captura';

            await this.loadCatches();
            this.updateCatchList();
            alert('¡Captura guardada!');

        } catch (err) {
            console.error(err);
            alert('Error al guardar: ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    async subirFoto(file) {
        const reader = new FileReader();
        const base64 = await new Promise(res => {
            reader.onload = e => res(e.target.result);
            reader.readAsDataURL(file);
        });
        return this.subirFotoBase64(base64, file.name);
    },

    async subirFotoBase64(base64, fileName = 'foto.jpg') {
        try {
            const res  = await fetch('/api/capturas/foto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await db.auth.getSession()).data.session?.access_token}` },
                body: JSON.stringify({ base64, fileName })
            });
            const data = await res.json();
            return data.url || null;
        } catch { return null; }
    },

    // ── CARGAR DESDE SUPABASE ─────────────────────────────────────────────────

    async loadCatches() {
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) { this.catches = []; return; }

            const { data, error } = await db
                .from('capturas')
                .select('*')
                .eq('user_id', session.user.id)
                .order('fecha', { ascending: false });

            if (error) throw error;
            this.catches = data || [];
        } catch (err) {
            console.error('Error cargando capturas:', err);
            this.catches = [];
        }
    },

    // ── LISTA ─────────────────────────────────────────────────────────────────

    updateCatchList() {
        this.renderList(this.catches);
    },

    filterCatches(filtro) {
        let lista = [...this.catches];
        if (filtro === 'recent') {
            const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            lista = lista.filter(c => c.fecha >= hace7dias);
        }
        this.renderList(lista);
    },

    renderList(capturas) {
        const contenedor = document.getElementById('catch-list');
        if (!contenedor) return;
        contenedor.innerHTML = '';

        if (capturas.length === 0) {
            contenedor.innerHTML = `<div class="text-center py-6 text-gray-500">
                <i class="fa fa-fish text-3xl mb-2 block text-gray-300"></i>
                Sin capturas registradas aún
            </div>`;
            return;
        }

        capturas.forEach(c => {
            const fecha = new Date(c.fecha).toLocaleDateString('es-ES');
            const hora  = new Date(c.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const img   = c.foto_url;

            const item = document.createElement('div');
            item.className = 'flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            item.innerHTML = `
                <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    ${img
                        ? `<img src="${img}" alt="${c.especie}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full flex items-center justify-center"><i class="fa fa-fish text-gray-400 text-2xl"></i></div>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-semibold truncate">${c.especie}</p>
                    <p class="text-sm text-gray-600">${c.longitud}cm · ${c.peso}kg</p>
                    <p class="text-xs text-gray-400">${fecha} ${hora}</p>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button class="text-gray-400 hover:text-blue-500 edit-catch p-1" data-id="${c.id}">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="text-gray-400 hover:text-red-500 delete-catch p-1" data-id="${c.id}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            `;
            item.querySelector('.edit-catch').addEventListener('click',   () => this.editCatch(c.id));
            item.querySelector('.delete-catch').addEventListener('click', () => this.deleteCatch(c.id));
            contenedor.appendChild(item);
        });
    },

    editCatch(id) {
        const c = this.catches.find(x => x.id === id);
        if (!c || !this.form) return;
        this.form.querySelector('[name="species"]').value = c.especie;
        this.form.querySelector('[name="length"]').value  = c.longitud;
        this.form.querySelector('[name="weight"]').value  = c.peso;
        this.form.querySelector('[name="bait"]').value    = c.cebo || '';
        this.form.querySelector('[name="depth"]').value   = c.profundidad || '';
        this.form.querySelector('[name="notes"]').value   = c.notas || '';
        if (c.lat && c.lng) this.setLocation(c.lat, c.lng);
        if (c.foto_url) {
            const area = document.getElementById('photo-upload-area');
            if (area) {
                area.innerHTML = `
                    <div class="relative">
                        <img src="${c.foto_url}" alt="${c.especie}" class="w-full h-40 object-cover rounded-lg">
                        <button type="button" class="remove-photo absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-md">
                            <i class="fa fa-times text-gray-600"></i>
                        </button>
                    </div>
                `;
                area.querySelector('.remove-photo').addEventListener('click', () => this.resetPhotoUpload());
            }
        }
        this.form.dataset.editId = id;
        const btn = this.form.querySelector('button[type="submit"]');
        if (btn) btn.innerHTML = '<i class="fa fa-save mr-1"></i> Actualizar Captura';
        this.form.scrollIntoView({ behavior: 'smooth' });
    },

    async deleteCatch(id) {
        if (!confirm('¿Eliminar esta captura?')) return;
        const { error } = await db.from('capturas').delete().eq('id', id);
        if (error) { alert('Error al eliminar: ' + error.message); return; }
        this.catches = this.catches.filter(c => c.id !== id);
        this.updateCatchList();
    }
};

window.catchLog = catchLog;