/**
 * Módulo de Registro de Capturas
 */

const catchLog = {
    catches: [],
    form: null,
    currentLat: null,
    currentLng: null,

    init() {
        this.loadCatches();
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

        // Mostrar indicador de ubicación en el formulario
        const display = document.getElementById('catch-location-display');
        const text    = document.getElementById('catch-location-text');
        if (display) display.classList.remove('hidden');
        if (text) text.textContent = `Ubicación: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
    },

    // ── FORMULARIO ────────────────────────────────────────────────────────────

    setupForm() {
        this.form = document.getElementById('catch-form');
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCatch();
        });

        this.setupPhotoUpload();
    },

    setupPhotoUpload() {
        const area  = document.getElementById('photo-upload-area');
        const input = document.getElementById('catch-photo-input');
        if (!area || !input) return;

        area.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-photo')) input.click();
        });

        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.previewImage(e.target.files[0]);
            }
        });
    },

    previewImage(file) {
        if (!file.type.match('image.*')) {
            alert('Por favor selecciona un archivo de imagen');
            return;
        }
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

    // ── EVENTOS ───────────────────────────────────────────────────────────────

    setupEventListeners() {
        // Botón Añadir Marcador — usa GPS real
        const addMarkerBtn = document.querySelector('#catch-page .text-primary.text-sm');
        if (addMarkerBtn) {
            addMarkerBtn.addEventListener('click', () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            this.setLocation(pos.coords.latitude, pos.coords.longitude);
                        },
                        () => alert('No se pudo obtener tu ubicación')
                    );
                }
            });
        }

        // Filtros
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

    saveCatch() {
        if (!this.form) return;

        const especie  = this.form.querySelector('[name="species"]')?.value;
        const longitud = this.form.querySelector('[name="length"]')?.value;
        const peso     = this.form.querySelector('[name="weight"]')?.value;
        const cebo     = this.form.querySelector('[name="bait"]')?.value || '';
        const prof     = this.form.querySelector('[name="depth"]')?.value || '';
        const notas    = this.form.querySelector('[name="notes"]')?.value || '';

        if (!especie) { alert('Por favor selecciona la especie'); return; }
        if (!longitud) { alert('Por favor ingresa la longitud'); return; }
        if (!peso)     { alert('Por favor ingresa el peso'); return; }

        const lat = this.currentLat;
        const lng = this.currentLng;
        if (!lat || !lng) {
            alert('Pulsa "Añadir Marcador" para registrar la ubicación de la captura');
            return;
        }

        const catchData = {
            id: 'captura_' + Date.now(),
            especie, longitud, peso, cebo, prof, notas,
            latitud: lat, longitud_coord: lng,
            timestamp: Date.now(),
            imagen: null
        };

        // Procesar imagen
        const input    = document.getElementById('catch-photo-input');
        const preview  = document.querySelector('#photo-upload-area img');

        if (input && input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                catchData.imagen = e.target.result;
                this.finalizeSave(catchData);
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            if (preview) catchData.imagen = preview.src;
            this.finalizeSave(catchData);
        }
    },

    finalizeSave(catchData) {
        // Si es edición, reemplazar
        const editId = this.form.dataset.editId;
        if (editId) {
            this.catches = this.catches.map(c => c.id === editId ? { ...catchData, id: editId } : c);
            delete this.form.dataset.editId;
        } else {
            this.catches.push(catchData);
        }

        localStorage.setItem('pzkayak_catches', JSON.stringify(this.catches));
        this.form.reset();
        this.resetPhotoUpload();

        const display = document.getElementById('catch-location-display');
        if (display) display.classList.add('hidden');

        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<i class="fa fa-save mr-1"></i> Guardar Captura';

        this.updateCatchList();
        alert('¡Captura guardada correctamente!');
    },

    loadCatches() {
        try {
            this.catches = JSON.parse(localStorage.getItem('pzkayak_catches') || '[]');
        } catch { this.catches = []; }
    },

    // ── LISTA ─────────────────────────────────────────────────────────────────

    updateCatchList() {
        this.renderList([...this.catches].sort((a, b) => b.timestamp - a.timestamp));
    },

    filterCatches(filtro) {
        let lista = [...this.catches];
        if (filtro === 'recent') {
            const hace7dias = Date.now() - 7 * 24 * 60 * 60 * 1000;
            lista = lista.filter(c => c.timestamp >= hace7dias);
        }
        this.renderList(lista.sort((a, b) => b.timestamp - a.timestamp), filtro);
    },

    renderList(capturas, filtro = 'all') {
        const contenedor = document.getElementById('catch-list');
        if (!contenedor) return;
        contenedor.innerHTML = '';

        if (capturas.length === 0) {
            contenedor.innerHTML = `<div class="text-center py-6 text-gray-500">
                <i class="fa fa-fish text-3xl mb-2 block text-gray-300"></i>
                ${filtro === 'recent' ? 'Sin capturas en los últimos 7 días' : 'Sin capturas registradas aún'}
            </div>`;
            return;
        }

        capturas.forEach(c => {
            const fecha = new Date(c.timestamp).toLocaleDateString('es-ES');
            const hora  = new Date(c.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            const item = document.createElement('div');
            item.className = 'flex items-center p-3 bg-gray-50 rounded-lg gap-3';
            item.innerHTML = `
                <div class="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    ${c.imagen
                        ? `<img src="${c.imagen}" alt="${c.especie}" class="w-full h-full object-cover">`
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

    // ── EDITAR / ELIMINAR ─────────────────────────────────────────────────────

    editCatch(id) {
        const c = this.catches.find(x => x.id === id);
        if (!c || !this.form) return;

        this.form.querySelector('[name="species"]').value = c.especie;
        this.form.querySelector('[name="length"]').value  = c.longitud;
        this.form.querySelector('[name="weight"]').value  = c.peso;
        this.form.querySelector('[name="bait"]').value    = c.cebo || '';
        this.form.querySelector('[name="depth"]').value   = c.prof || '';
        this.form.querySelector('[name="notes"]').value   = c.notas || '';

        if (c.latitud && c.longitud_coord) {
            this.setLocation(c.latitud, c.longitud_coord);
        }

        if (c.imagen) {
            const area = document.getElementById('photo-upload-area');
            if (area) {
                area.innerHTML = `
                    <div class="relative">
                        <img src="${c.imagen}" alt="${c.especie}" class="w-full h-40 object-cover rounded-lg">
                        <button type="button" class="remove-photo absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-md">
                            <i class="fa fa-times text-gray-600"></i>
                        </button>
                    </div>
                `;
                area.querySelector('.remove-photo').addEventListener('click', () => this.resetPhotoUpload());
            }
        }

        this.form.dataset.editId = id;
        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<i class="fa fa-save mr-1"></i> Actualizar Captura';

        this.form.scrollIntoView({ behavior: 'smooth' });
    },

    deleteCatch(id) {
        if (confirm('¿Eliminar esta captura?')) {
            this.catches = this.catches.filter(c => c.id !== id);
            localStorage.setItem('pzkayak_catches', JSON.stringify(this.catches));
            this.updateCatchList();
        }
    }
};

window.catchLog = catchLog;