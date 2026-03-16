/**
 * Módulo de Condiciones del Mar - PzKayak Connect
 * Búsqueda por nombre + ubicación GPS automática
 * APIs: OpenStreetMap Nominatim (geocoding) + Open-Meteo Marine (datos)
 */

const marineModule = {

    playaActual: null,
    favoritos: [],
    searchTimeout: null,
    ultimaActualizacion: null,

    async init() {
        await this.cargarFavoritos();
        this.setupBuscador();
        this.renderFavoritos();
        this.cargarPorGPS(); // Carga automática por GPS al abrir

        document.getElementById('marine-refresh-btn')
            ?.addEventListener('click', () => this.refresh());
        document.getElementById('marine-guardar-btn')
            ?.addEventListener('click', () => this.guardarFavorito());
        document.getElementById('marine-gps-btn')
            ?.addEventListener('click', () => this.cargarPorGPS());
    },

    refresh() {
        if (!this.playaActual) return;
        this.seleccionarLugar(this.playaActual);
    },

    // ── GPS AUTOMÁTICO ────────────────────────────────────────────────────────

    cargarPorGPS() {
        const semaforo = document.getElementById('marine-semaforo');
        if (semaforo) {
            semaforo.innerHTML = `
                <div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-3 animate-pulse">
                    <i class="fa fa-spinner fa-spin text-gray-400 text-2xl"></i>
                </div>
                <p class="text-gray-400 text-sm">Obteniendo tu ubicación...</p>
            `;
        }

        if (!navigator.geolocation) {
            this.usarUbicacionDefault();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                // Reverse geocoding para obtener nombre del lugar
                try {
                    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
                    const data = await res.json();
                    const partes = data.display_name?.split(',') || [];
                    const nombre = partes[0]?.trim() || 'Mi ubicación';

                    this.seleccionarLugar({ nombre, lat, lng, esGPS: true });
                } catch {
                    this.seleccionarLugar({ nombre: 'Mi ubicación', lat, lng, esGPS: true });
                }
            },
            () => this.usarUbicacionDefault()
        );
    },

    usarUbicacionDefault() {
        // Costa central Chile como fallback
        this.seleccionarLugar({ nombre: 'Costa central Chile', lat: -33.0, lng: -71.6, esDefault: true });
    },

    // ── BUSCADOR ──────────────────────────────────────────────────────────────

    setupBuscador() {
        const input = document.getElementById('marine-search');
        const btn   = document.getElementById('marine-search-btn');
        if (!input) return;

        input.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            const q = input.value.trim();
            if (q.length < 3) { this.ocultarSugerencias(); return; }
            this.searchTimeout = setTimeout(() => this.buscarLugar(q), 500);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                clearTimeout(this.searchTimeout);
                this.buscarLugar(input.value.trim());
            }
        });

        btn?.addEventListener('click', () => {
            clearTimeout(this.searchTimeout);
            this.buscarLugar(input.value.trim());
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('#marine-search') && !e.target.closest('#marine-sugerencias')) {
                this.ocultarSugerencias();
            }
        });
    },

    async buscarLugar(query) {
        if (!query) return;
        const btn = document.getElementById('marine-search-btn');
        if (btn) btn.innerHTML = '<i class="fa fa-spinner fa-spin text-white text-sm"></i>';

        try {
            const url = `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(query)}&format=json&limit=6&accept-language=es`;

            const res  = await fetch(url, { headers: { 'Accept-Language': 'es' } });
            const data = await res.json();

            if (data.length === 0) {
                this.mostrarSugerencias([{ sinResultado: true, display_name: `Sin resultados para "${query}"` }]);
            } else {
                this.mostrarSugerencias(data);
            }
        } catch {
            this.mostrarSugerencias([{ sinResultado: true, display_name: 'Error de conexión' }]);
        } finally {
            if (btn) btn.innerHTML = '<i class="fa fa-search text-white text-sm"></i>';
        }
    },

    mostrarSugerencias(resultados) {
        const cont = document.getElementById('marine-sugerencias');
        if (!cont) return;
        cont.classList.remove('hidden');
        cont.innerHTML = '';

        resultados.forEach(r => {
            const div = document.createElement('div');

            if (r.sinResultado) {
                div.className = 'p-3 text-gray-400 text-sm text-center';
                div.textContent = r.display_name;
            } else {
                const partes  = r.display_name.split(',');
                const nombre  = partes[0].trim();
                const detalle = partes.slice(1, 3).join(', ').trim();

                div.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-start gap-2';
                div.innerHTML = `
                    <i class="fa fa-map-marker text-primary mt-0.5 flex-shrink-0"></i>
                    <div>
                        <p class="text-sm font-medium">${nombre}</p>
                        <p class="text-xs text-gray-400">${detalle}</p>
                    </div>
                `;
                div.addEventListener('click', () => {
                    const input = document.getElementById('marine-search');
                    if (input) input.value = nombre;
                    this.ocultarSugerencias();
                    this.seleccionarLugar({
                        nombre,
                        nombreCompleto: r.display_name,
                        lat: parseFloat(r.lat),
                        lng: parseFloat(r.lon)
                    });
                });
            }
            cont.appendChild(div);
        });
    },

    ocultarSugerencias() {
        document.getElementById('marine-sugerencias')?.classList.add('hidden');
    },

    seleccionarLugar(lugar) {
        this.playaActual = lugar;
        this.ocultarSugerencias();

        // Actualizar UI
        const badge  = document.getElementById('marine-playa-activa');
        const nombre = document.getElementById('marine-playa-nombre');
        const gpsTag = document.getElementById('marine-gps-tag');

        if (badge)  badge.classList.remove('hidden');
        if (nombre) nombre.textContent = lugar.nombre;
        if (gpsTag) gpsTag.classList.toggle('hidden', !lugar.esGPS);

        // Botón guardar — reset si cambia playa
        const saveBtn = document.getElementById('marine-guardar-btn');
        const yaGuardado = this.favoritos.some(f => f.nombre === lugar.nombre);
        if (saveBtn) {
            saveBtn.innerHTML = yaGuardado
                ? '<i class="fa fa-heart mr-1 text-red-400"></i>Guardada'
                : '<i class="fa fa-heart-o mr-1"></i>Guardar';
        }

        // Loading
        const semaforo = document.getElementById('marine-semaforo');
        if (semaforo) {
            semaforo.innerHTML = `
                <div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-3 animate-pulse">
                    <i class="fa fa-spinner fa-spin text-gray-400 text-2xl"></i>
                </div>
                <p class="text-gray-400 text-sm">Cargando datos de <strong>${lugar.nombre}</strong>...</p>
            `;
        }

        document.getElementById('marine-datos').innerHTML       = '';
        document.getElementById('marine-pronostico').innerHTML  = '';
        document.getElementById('marine-recomendaciones').innerHTML = '';

        this.cargarDatos(lugar.lat, lugar.lng);
    },

    // ── API OPEN-METEO MARINE ─────────────────────────────────────────────────

    async cargarDatos(lat, lng) {
        const url = `https://marine-api.open-meteo.com/v1/marine?` +
            `latitude=${lat}&longitude=${lng}` +
            `&hourly=wave_height,wave_period,wave_direction,wind_wave_height,swell_wave_height,swell_wave_period` +
            `&daily=wave_height_max,wave_period_max,wind_wave_height_max,swell_wave_height_max` +
            `&timezone=auto&forecast_days=7`;

        try {
            const res  = await fetch(url);
            const data = await res.json();

            if (data.error) { this.renderError(data.reason); return; }

            this.ultimaActualizacion = new Date();
            this.renderDatos(data);
        } catch (err) {
            this.renderError('Sin conexión a internet');
        }
    },

    horaActualIdx(data) {
        const ahora   = new Date();
        const horas   = data.hourly.time;
        let closest   = 0, minDiff = Infinity;
        horas.forEach((t, i) => {
            const diff = Math.abs(new Date(t) - ahora);
            if (diff < minDiff) { minDiff = diff; closest = i; }
        });
        return closest;
    },

    // ── SEMÁFORO ──────────────────────────────────────────────────────────────

    calcularNivel(h) {
        if (h < 0.5) return { nivel: 'ÓPTIMO',    emoji: '🟢', color: 'bg-green-500',  texto: 'text-green-700',  bg: 'bg-green-50',  icono: 'fa-check-circle',         desc: 'Condiciones excelentes para kayak de pesca' };
        if (h < 1.0) return { nivel: 'BUENO',     emoji: '🟢', color: 'bg-green-400',  texto: 'text-green-600',  bg: 'bg-green-50',  icono: 'fa-thumbs-up',             desc: 'Buenas condiciones, apto para intermedios' };
        if (h < 1.5) return { nivel: 'MODERADO',  emoji: '🟡', color: 'bg-yellow-400', texto: 'text-yellow-700', bg: 'bg-yellow-50', icono: 'fa-exclamation-circle',    desc: 'Condiciones moderadas, solo pescadores con experiencia' };
        if (h < 2.5) return { nivel: 'DIFÍCIL',   emoji: '🟠', color: 'bg-orange-500', texto: 'text-orange-700', bg: 'bg-orange-50', icono: 'fa-exclamation-triangle',  desc: 'Condiciones difíciles, no recomendado en kayak' };
        return             { nivel: 'PELIGROSO', emoji: '🔴', color: 'bg-red-600',    texto: 'text-red-700',    bg: 'bg-red-50',    icono: 'fa-times-circle',          desc: '⛔ No salir — condiciones peligrosas' };
    },

    direccionTexto(g) {
        return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'][Math.round(g / 22.5) % 16];
    },

    // ── RENDER ────────────────────────────────────────────────────────────────

    renderDatos(data) {
        const idx  = this.horaActualIdx(data);
        const h    = data.hourly.wave_height[idx]       ?? 0;
        const per  = data.hourly.wave_period[idx]       ?? 0;
        const dir  = data.hourly.wave_direction[idx]    ?? 0;
        const ww   = data.hourly.wind_wave_height[idx]  ?? 0;
        const sw   = data.hourly.swell_wave_height[idx] ?? 0;
        const swP  = data.hourly.swell_wave_period[idx] ?? 0;
        const nivel = this.calcularNivel(h);

        // Semáforo
        const semaforo = document.getElementById('marine-semaforo');
        if (semaforo) {
            semaforo.innerHTML = `
                <div class="w-24 h-24 ${nivel.color} rounded-full flex flex-col items-center justify-center mb-3 shadow-lg">
                    <i class="fa ${nivel.icono} text-white text-2xl mb-1"></i>
                    <span class="text-white text-xs font-bold">${nivel.nivel}</span>
                </div>
                <p class="${nivel.texto} font-semibold text-center text-sm">${nivel.desc}</p>
                <p class="text-xs text-gray-400 mt-2">
                    <i class="fa fa-clock-o mr-1"></i>
                    ${this.ultimaActualizacion.toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'})}
                    · ${this.playaActual?.nombre}
                </p>
            `;
        }

        // Datos actuales
        const datosCont = document.getElementById('marine-datos');
        if (datosCont) {
            const items = [
                { icono: 'fa-arrows-v',   label: 'Altura Olas',   valor: `${h.toFixed(1)} m`,              color: 'text-blue-600'   },
                { icono: 'fa-clock-o',    label: 'Período',       valor: `${per.toFixed(0)} seg`,           color: 'text-cyan-600'   },
                { icono: 'fa-compass',    label: 'Dirección',     valor: this.direccionTexto(dir),          color: 'text-purple-600' },
                { icono: 'fa-flag',       label: 'Olas de Viento',valor: `${ww.toFixed(1)} m`,              color: 'text-orange-500' },
                { icono: 'fa-water',      label: 'Swell',         valor: `${sw.toFixed(1)} m`,              color: 'text-teal-600'   },
                { icono: 'fa-repeat',     label: 'Per. Swell',    valor: `${swP.toFixed(0)} seg`,           color: 'text-green-600'  },
            ];
            datosCont.innerHTML = items.map(item => `
                <div class="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                    <div class="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                        <i class="fa ${item.icono} ${item.color}"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-400">${item.label}</p>
                        <p class="font-semibold text-sm">${item.valor}</p>
                    </div>
                </div>
            `).join('');
        }

        this.renderPronostico(data);
        this.renderRecomendaciones(h, per, sw);
    },

    renderPronostico(data) {
        const cont = document.getElementById('marine-pronostico');
        if (!cont || !data.daily) return;

        const { time, wave_height_max, swell_wave_height_max, wave_period_max } = data.daily;
        cont.innerHTML = '';

        time.forEach((fecha, i) => {
            const h    = wave_height_max[i]        ?? 0;
            const sw   = swell_wave_height_max[i]  ?? 0;
            const per  = wave_period_max[i]        ?? 0;
            const nivel = this.calcularNivel(h);
            const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' :
                new Date(fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });

            const div = document.createElement('div');
            div.className = `flex items-center justify-between p-3 ${nivel.bg} rounded-xl`;
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-lg">${nivel.emoji}</span>
                    <div>
                        <p class="font-medium text-sm ${i === 0 ? 'text-primary font-bold' : ''}">${label}</p>
                        <p class="text-xs text-gray-500">Swell ${sw.toFixed(1)}m · ${per.toFixed(0)}s</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-sm ${nivel.texto}">${h.toFixed(1)} m</p>
                    <p class="text-xs ${nivel.texto}">${nivel.nivel}</p>
                </div>
            `;
            cont.appendChild(div);
        });
    },

    renderRecomendaciones(h, per, sw) {
        const cont = document.getElementById('marine-recomendaciones');
        if (!cont) return;
        const recs = [];

        if (h < 0.5) {
            recs.push({ ic: 'fa-check', cl: 'text-green-500', txt: 'Condiciones ideales — puedes salir a mar abierto sin problema' });
            recs.push({ ic: 'fa-check', cl: 'text-green-500', txt: 'Apto para todos los niveles de experiencia' });
        } else if (h < 1.0) {
            recs.push({ ic: 'fa-check',        cl: 'text-green-500',  txt: 'Buenas condiciones — mantente a menos de 1 km de la costa' });
            recs.push({ ic: 'fa-info-circle',  cl: 'text-blue-500',   txt: 'Chaleco salvavidas y señalización obligatoria' });
        } else if (h < 1.5) {
            recs.push({ ic: 'fa-exclamation-circle', cl: 'text-yellow-500', txt: 'Solo para pescadores con experiencia en mar' });
            recs.push({ ic: 'fa-exclamation-circle', cl: 'text-yellow-500', txt: 'No alejarse más de 500m de la costa' });
            recs.push({ ic: 'fa-info-circle',        cl: 'text-blue-500',   txt: 'Equipo de seguridad completo obligatorio' });
        } else if (h < 2.5) {
            recs.push({ ic: 'fa-times-circle', cl: 'text-orange-500', txt: 'Condiciones difíciles — no recomendado en kayak de pesca' });
            recs.push({ ic: 'fa-times-circle', cl: 'text-orange-500', txt: 'Si saliste, regresa a puerto lo antes posible' });
        } else {
            recs.push({ ic: 'fa-times-circle', cl: 'text-red-500', txt: '⛔ No salir hoy — condiciones peligrosas' });
            recs.push({ ic: 'fa-times-circle', cl: 'text-red-500', txt: 'Espera mejores condiciones (consulta el pronóstico de 7 días)' });
        }

        if (per > 10) recs.push({ ic: 'fa-info-circle', cl: 'text-blue-500', txt: `Período largo (${per.toFixed(0)}s) — olas de mayor energía, cuidado al entrar al agua` });
        if (sw > 1.0)  recs.push({ ic: 'fa-exclamation-triangle', cl: 'text-orange-500', txt: `Swell considerable (${sw.toFixed(1)}m) — dificulta la estabilidad del kayak` });
        if (sw > 0 && per > 8) recs.push({ ic: 'fa-info-circle', cl: 'text-blue-500', txt: 'Olas de fondo presentes — pueden sorprender al alejarse de la costa' });

        recs.push({ ic: 'fa-phone', cl: 'text-gray-400', txt: 'Siempre informa tu salida a un contacto en tierra (hora, zona y regreso estimado)' });

        cont.innerHTML = recs.map(r => `
            <div class="flex items-start gap-3 p-2">
                <i class="fa ${r.ic} ${r.cl} mt-0.5 flex-shrink-0"></i>
                <p class="text-sm text-gray-700">${r.txt}</p>
            </div>
        `).join('');
    },

    renderError(msg = 'Sin datos del mar') {
        const semaforo = document.getElementById('marine-semaforo');
        if (!semaforo) return;

        const esInterior = msg?.toLowerCase().includes('no ocean') || msg?.toLowerCase().includes('not ocean');
        semaforo.innerHTML = `
            <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                <i class="fa fa-${esInterior ? 'map-marker' : 'wifi'} text-gray-400 text-2xl"></i>
            </div>
            <p class="text-gray-600 text-sm font-medium text-center">
                ${esInterior ? 'Esta ubicación no está en el mar' : msg}
            </p>
            <p class="text-gray-400 text-xs text-center mt-1">
                ${esInterior ? 'Busca una playa o zona costera' : 'Verifica tu conexión e intenta de nuevo'}
            </p>
            ${!esInterior ? `<button onclick="marineModule.refresh()" class="btn btn-primary text-sm mt-3"><i class="fa fa-refresh mr-1"></i>Reintentar</button>` : ''}
        `;
        document.getElementById('marine-datos').innerHTML = '';
        document.getElementById('marine-pronostico').innerHTML = '';
        document.getElementById('marine-recomendaciones').innerHTML = '';
    },

    // ── FAVORITOS ─────────────────────────────────────────────────────────────

    async cargarFavoritos() {
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) { this.favoritos = []; return; }
            const { data } = await db.from('playas_favoritas').select('*').eq('user_id', session.user.id).order('created_at');
            this.favoritos = data || [];
        } catch { this.favoritos = []; }
    },

    async guardarFavorito() {
        if (!this.playaActual) return;
        if (this.favoritos.some(f => f.nombre === this.playaActual.nombre)) {
            alert('Esta playa ya está guardada'); return;
        }
        try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) return;
            const { esGPS, esDefault, ...lugarLimpio } = this.playaActual;
            const { error } = await db.from('playas_favoritas').insert({
                user_id: session.user.id,
                nombre: lugarLimpio.nombre,
                nombre_completo: lugarLimpio.nombreCompleto || lugarLimpio.nombre,
                lat: lugarLimpio.lat,
                lng: lugarLimpio.lng
            });
            if (error) throw error;
            await this.cargarFavoritos();
            this.renderFavoritos();
            const btn = document.getElementById('marine-guardar-btn');
            if (btn) btn.innerHTML = '<i class="fa fa-heart mr-1 text-red-400"></i>Guardada';
        } catch (err) { alert('Error al guardar: ' + err.message); }
    },

    renderFavoritos() {
        const cont    = document.getElementById('marine-favoritos');
        const wrapper = document.getElementById('marine-favoritos-cont');
        if (!cont || !wrapper) return;

        if (this.favoritos.length === 0) { wrapper.classList.add('hidden'); return; }
        wrapper.classList.remove('hidden');
        cont.innerHTML = '';

        this.favoritos.forEach((f, i) => {
            const chip = document.createElement('div');
            chip.className = 'flex items-center gap-1';
            chip.innerHTML = `
                <button class="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-primary hover:bg-blue-100 transition-colors">
                    <i class="fa fa-map-marker"></i> ${f.nombre}
                </button>
                <button class="text-gray-300 hover:text-red-400 text-xs px-1 eliminar-fav" data-i="${i}" title="Eliminar">✕</button>
            `;
            chip.querySelector('button:first-child').addEventListener('click', () => this.seleccionarLugar(f));
            chip.querySelector('.eliminar-fav').addEventListener('click', async () => {
                const id = f.id;
                if (id) await db.from('playas_favoritas').delete().eq('id', id);
                await this.cargarFavoritos();
                this.renderFavoritos();
            });
            cont.appendChild(chip);
        });
    }
};

window.marineModule = marineModule;