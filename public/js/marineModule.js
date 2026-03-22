/**
 * Módulo Mar - PzKayak Connect
 * APIs: Open-Meteo Marine, WorldTides, OpenStreetMap Nominatim
 */

const marineModule = {

    WORLDTIDES_KEY: '20c711ef-8e25-4726-891a-2f4a1c893d0c',

    playaActual: null,
    favoritos: [],
    searchTimeout: null,
    ultimaActualizacion: null,
    tideChart: null,

    async init() {
        await this.cargarFavoritos();
        this.setupBuscador();
        this.renderFavoritos();
        this.actualizarMesLabel();
        this.cargarPorGPS();

        document.getElementById('marine-refresh-btn')?.addEventListener('click', () => this.refresh());
        document.getElementById('marine-guardar-btn')?.addEventListener('click', () => this.guardarFavorito());
        document.getElementById('marine-gps-btn')?.addEventListener('click', () => this.cargarPorGPS());

    },

    refresh() {
        if (this.playaActual) this.seleccionarLugar(this.playaActual);
    },

    // ── GPS ───────────────────────────────────────────────────────────────────

    cargarPorGPS() {
        this.mostrarLoadingSemaforo('Obteniendo tu ubicación...');
        if (!navigator.geolocation) { this.usarDefault(); return; }
        navigator.geolocation.getCurrentPosition(
            async pos => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude;
                try {
                    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
                    const data = await res.json();
                    const nombre = data.display_name?.split(',')[0]?.trim() || 'Mi ubicación';
                    this.seleccionarLugar({ nombre, lat, lng, esGPS: true });
                } catch {
                    this.seleccionarLugar({ nombre: 'Mi ubicación', lat, lng, esGPS: true });
                }
            },
            () => this.usarDefault()
        );
    },

    usarDefault() {
        this.seleccionarLugar({ nombre: 'Costa central Chile', lat: -33.0, lng: -71.6 });
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
            if (e.key === 'Enter') { clearTimeout(this.searchTimeout); this.buscarLugar(input.value.trim()); }
        });
        btn?.addEventListener('click', () => {
            clearTimeout(this.searchTimeout);
            this.buscarLugar(document.getElementById('marine-search').value.trim());
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('#marine-search') && !e.target.closest('#marine-sugerencias')) this.ocultarSugerencias();
        });
    },

    async buscarLugar(query) {
        if (!query) return;
        const btn = document.getElementById('marine-search-btn');
        if (btn) btn.innerHTML = '<i class="fa fa-spinner fa-spin text-white text-sm"></i>';
        try {
            const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&accept-language=es`);
            const data = await res.json();
            this.mostrarSugerencias(data.length ? data : [{ sinResultado: true, display_name: `Sin resultados para "${query}"` }]);
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
                div.innerHTML = `<i class="fa fa-map-marker text-primary mt-0.5 flex-shrink-0"></i><div><p class="text-sm font-medium">${nombre}</p><p class="text-xs text-gray-400">${detalle}</p></div>`;
                div.addEventListener('click', () => {
                    document.getElementById('marine-search').value = nombre;
                    this.ocultarSugerencias();
                    this.seleccionarLugar({ nombre, nombreCompleto: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
                });
            }
            cont.appendChild(div);
        });
    },

    ocultarSugerencias() { document.getElementById('marine-sugerencias')?.classList.add('hidden'); },

    seleccionarLugar(lugar) {
        this.playaActual = lugar;
        this.ocultarSugerencias();


        const badge  = document.getElementById('marine-playa-activa');
        const nombre = document.getElementById('marine-playa-nombre');
        const gpsTag = document.getElementById('marine-gps-tag');
        if (badge)  badge.classList.remove('hidden');
        if (nombre) nombre.textContent = lugar.nombre;
        if (gpsTag) gpsTag.classList.toggle('hidden', !lugar.esGPS);

        const yaGuardado = this.favoritos.some(f => f.nombre === lugar.nombre);
        const saveBtn = document.getElementById('marine-guardar-btn');
        if (saveBtn) saveBtn.innerHTML = yaGuardado
            ? '<i class="fa fa-heart mr-1 text-red-400"></i>Guardada'
            : '<i class="fa fa-heart-o mr-1"></i>Guardar';

        this.mostrarLoadingSemaforo(`Cargando datos de ${lugar.nombre}...`);
        document.getElementById('marine-datos').innerHTML = '';
        document.getElementById('marine-pronostico').innerHTML = '';
        document.getElementById('marine-recomendaciones').innerHTML = '';

        Promise.all([
            this.cargarOleaje(lugar.lat, lugar.lng),
            this.cargarMareas(lugar.lat, lugar.lng)
        ]);
    },

    // ── OLEAJE ────────────────────────────────────────────────────────────────

    async cargarOleaje(lat, lng) {
        const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
            `&hourly=wave_height,wave_period,wave_direction,wind_wave_height,swell_wave_height,swell_wave_period` +
            `&daily=wave_height_max,wave_period_max,wind_wave_height_max,swell_wave_height_max` +
            `&timezone=auto&forecast_days=7`;
        try {
            const res  = await fetch(url);
            const data = await res.json();
            if (data.error) { this.renderErrorSemaforo(data.reason); return; }
            this.ultimaActualizacion = new Date();
            this.renderOleaje(data);
        } catch { this.renderErrorSemaforo('Sin conexión'); }
    },

    horaActualIdx(data) {
        const ahora = new Date();
        let closest = 0, minDiff = Infinity;
        data.hourly.time.forEach((t, i) => { const d = Math.abs(new Date(t) - ahora); if (d < minDiff) { minDiff = d; closest = i; } });
        return closest;
    },

    calcularNivel(h) {
        if (h < 0.5) return { nivel:'ÓPTIMO',    emoji:'🟢', color:'bg-green-500',  texto:'text-green-700',  bg:'bg-green-50',  icono:'fa-check-circle',        desc:'Condiciones excelentes para kayak de pesca' };
        if (h < 1.0) return { nivel:'BUENO',     emoji:'🟢', color:'bg-green-400',  texto:'text-green-600',  bg:'bg-green-50',  icono:'fa-thumbs-up',           desc:'Buenas condiciones, apto para intermedios' };
        if (h < 1.5) return { nivel:'MODERADO',  emoji:'🟡', color:'bg-yellow-400', texto:'text-yellow-700', bg:'bg-yellow-50', icono:'fa-exclamation-circle',  desc:'Solo pescadores con experiencia' };
        if (h < 2.5) return { nivel:'DIFÍCIL',   emoji:'🟠', color:'bg-orange-500', texto:'text-orange-700', bg:'bg-orange-50', icono:'fa-exclamation-triangle', desc:'No recomendado en kayak' };
        return             { nivel:'PELIGROSO', emoji:'🔴', color:'bg-red-600',    texto:'text-red-700',    bg:'bg-red-50',    icono:'fa-times-circle',         desc:'⛔ No salir — condiciones peligrosas' };
    },

    direccionTexto(g) { return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'][Math.round(g/22.5)%16]; },

    renderOleaje(data) {
        const idx   = this.horaActualIdx(data);
        const h     = data.hourly.wave_height[idx]       ?? 0;
        const per   = data.hourly.wave_period[idx]       ?? 0;
        const dir   = data.hourly.wave_direction[idx]    ?? 0;
        const ww    = data.hourly.wind_wave_height[idx]  ?? 0;
        const sw    = data.hourly.swell_wave_height[idx] ?? 0;
        const swP   = data.hourly.swell_wave_period[idx] ?? 0;
        const nivel = this.calcularNivel(h);

        const semaforo = document.getElementById('marine-semaforo');
        if (semaforo) semaforo.innerHTML = `
            <div class="w-24 h-24 ${nivel.color} rounded-full flex flex-col items-center justify-center mb-3 shadow-lg">
                <i class="fa ${nivel.icono} text-white text-2xl mb-1"></i>
                <span class="text-white text-xs font-bold">${nivel.nivel}</span>
            </div>
            <p class="${nivel.texto} font-semibold text-center text-sm">${nivel.desc}</p>
            <p class="text-xs text-gray-400 mt-2">
                <i class="fa fa-clock-o mr-1"></i>${this.ultimaActualizacion.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})} · ${this.playaActual?.nombre}
            </p>`;

        const datosCont = document.getElementById('marine-datos');
        if (datosCont) datosCont.innerHTML = [
            { icono:'fa-arrows-v', label:'Altura Olas',    valor:`${h.toFixed(1)} m`,    color:'text-blue-600' },
            { icono:'fa-clock-o',  label:'Período',        valor:`${per.toFixed(0)} seg`, color:'text-cyan-600' },
            { icono:'fa-compass',  label:'Dirección',      valor:this.direccionTexto(dir),color:'text-purple-600' },
            { icono:'fa-flag',     label:'Olas de Viento', valor:`${ww.toFixed(1)} m`,    color:'text-orange-500' },
            { icono:'fa-water',    label:'Swell',          valor:`${sw.toFixed(1)} m`,    color:'text-teal-600' },
            { icono:'fa-repeat',   label:'Per. Swell',     valor:`${swP.toFixed(0)} seg`, color:'text-green-600' },
        ].map(item => `
            <div class="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <div class="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                    <i class="fa ${item.icono} ${item.color}"></i>
                </div>
                <div><p class="text-xs text-gray-400">${item.label}</p><p class="font-semibold text-sm">${item.valor}</p></div>
            </div>`).join('');

        this.renderPronostico7Dias(data);
        this.renderRecomendaciones(h, per, sw);
    },

    renderPronostico7Dias(data) {
        const cont = document.getElementById('marine-pronostico');
        if (!cont || !data.daily) return;
        cont.innerHTML = '';
        data.daily.time.forEach((fecha, i) => {
            const h    = data.daily.wave_height_max[i]       ?? 0;
            const sw   = data.daily.swell_wave_height_max[i] ?? 0;
            const per  = data.daily.wave_period_max[i]       ?? 0;
            const nivel = this.calcularNivel(h);
            const label = i===0?'Hoy':i===1?'Mañana':new Date(fecha+'T12:00:00').toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'});
            const div = document.createElement('div');
            div.className = `flex items-center justify-between p-3 ${nivel.bg} rounded-xl`;
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-lg">${nivel.emoji}</span>
                    <div><p class="font-medium text-sm ${i===0?'text-primary font-bold':''}">${label}</p>
                    <p class="text-xs text-gray-500">Swell ${sw.toFixed(1)}m · ${per.toFixed(0)}s</p></div>
                </div>
                <div class="text-right"><p class="font-bold text-sm ${nivel.texto}">${h.toFixed(1)} m</p>
                <p class="text-xs ${nivel.texto}">${nivel.nivel}</p></div>`;
            cont.appendChild(div);
        });
    },

    renderRecomendaciones(h, per, sw) {
        const cont = document.getElementById('marine-recomendaciones');
        if (!cont) return;
        const recs = [];
        if (h < 0.5)      { recs.push({ic:'fa-check',cl:'text-green-500',txt:'Condiciones ideales — puedes salir a mar abierto'}); recs.push({ic:'fa-check',cl:'text-green-500',txt:'Apto para todos los niveles'}); }
        else if (h < 1.0) { recs.push({ic:'fa-check',cl:'text-green-500',txt:'Buenas condiciones — mantente a menos de 1 km de la costa'}); recs.push({ic:'fa-info-circle',cl:'text-blue-500',txt:'Chaleco salvavidas obligatorio'}); }
        else if (h < 1.5) { recs.push({ic:'fa-exclamation-circle',cl:'text-yellow-500',txt:'Solo para pescadores con experiencia en mar'}); recs.push({ic:'fa-exclamation-circle',cl:'text-yellow-500',txt:'No alejarse más de 500m de la costa'}); }
        else              { recs.push({ic:'fa-times-circle',cl:'text-red-500',txt:'⛔ No recomendado salir en kayak hoy'}); recs.push({ic:'fa-times-circle',cl:'text-red-500',txt:'Espera mejores condiciones'}); }
        if (per > 10) recs.push({ic:'fa-info-circle',cl:'text-blue-500',txt:`Período largo (${per.toFixed(0)}s) — olas de mayor energía`});
        if (sw > 1.0) recs.push({ic:'fa-exclamation-triangle',cl:'text-orange-500',txt:`Swell considerable (${sw.toFixed(1)}m) — dificulta la estabilidad`});
        recs.push({ic:'fa-phone',cl:'text-gray-400',txt:'Siempre informa tu salida a un contacto en tierra'});
        cont.innerHTML = recs.map(r=>`<div class="flex items-start gap-3 p-2"><i class="fa ${r.ic} ${r.cl} mt-0.5 flex-shrink-0"></i><p class="text-sm text-gray-700">${r.txt}</p></div>`).join('');
    },

    renderErrorSemaforo(msg) {
        const s = document.getElementById('marine-semaforo');
        if (!s) return;
        const esInterior = msg?.toLowerCase().includes('no ocean');
        s.innerHTML = `
            <div class="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                <i class="fa fa-${esInterior?'map-marker':'wifi'} text-gray-400 text-2xl"></i>
            </div>
            <p class="text-gray-600 text-sm font-medium text-center">${esInterior?'Esta ubicación no está en el mar':msg}</p>
            <p class="text-gray-400 text-xs text-center mt-1">${esInterior?'Busca una playa o zona costera':'Verifica tu conexión'}</p>`;
    },

    mostrarLoadingSemaforo(msg) {
        const s = document.getElementById('marine-semaforo');
        if (s) s.innerHTML = `
            <div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-3 animate-pulse">
                <i class="fa fa-spinner fa-spin text-gray-400 text-2xl"></i>
            </div><p class="text-gray-400 text-sm">${msg}</p>`;
    },

    // ── MAREAS (WorldTides) ───────────────────────────────────────────────────

    async cargarMareas(lat, lng) {
        try {
            // Usa el backend como proxy con caché compartido
            // Todos los usuarios que consulten la misma playa el mismo día
            // comparten el mismo request a WorldTides
            const res  = await fetch(`/api/mareas?lat=${lat}&lng=${lng}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.fromCache) console.log('Mareas desde caché compartido 🎯');
            this.renderRelojMareas(data);
            this.renderGraficoMareas(data);
            this.calcularSolunar(data);
        } catch (err) {
            console.warn('Mareas:', err);
            this.renderRelojMareasFallback();
            this.calcularSolunarSinMareas();
        }
    },

    renderRelojMareas(data) {
        const cont    = document.getElementById('marine-reloj-mareas');
        if (!cont) return;
        const extremos = data.extremes || [];
        const alturas  = data.heights  || [];
        const ahora    = Date.now() / 1000;

        const siguientes = extremos.filter(e => e.dt > ahora);
        const pleamar    = siguientes.find(e => e.type === 'High');
        const bajamar    = siguientes.find(e => e.type === 'Low');
        const anterior   = extremos.filter(e => e.dt <= ahora).slice(-1)[0];
        const siguiente  = siguientes[0];
        const subiendo   = siguiente?.type === 'High';
        const altActual  = alturas[0]?.height ?? null;

        const fmtHora = ts => new Date(ts*1000).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
        const tiempoRestante = ts => {
            const mins = Math.round((ts - ahora) / 60);
            const h = Math.floor(mins/60), m = mins%60;
            return h > 0 ? `${h}h ${m}min` : `${m} min`;
        };

        let angulo = 90;
        if (anterior && siguiente) {
            const prog = (ahora - anterior.dt) / (siguiente.dt - anterior.dt);
            angulo = anterior.type === 'Low' ? prog * 180 : 180 + prog * 180;
        }

        const color = subiendo ? '#3b82f6' : '#ef4444';
        const x2 = 60 + 38 * Math.sin(angulo * Math.PI / 180);
        const y2 = 60 - 38 * Math.cos(angulo * Math.PI / 180);

        cont.innerHTML = `
            <div class="flex items-center gap-4 w-full">
                <svg width="120" height="120" viewBox="0 0 120 120" class="flex-shrink-0">
                    <circle cx="60" cy="60" r="54" fill="#f0f9ff" stroke="#bfdbfe" stroke-width="2"/>
                    <path d="M 60 10 A 50 50 0 0 1 110 60" fill="none" stroke="#3b82f6" stroke-width="5" stroke-linecap="round" opacity="0.35"/>
                    <path d="M 110 60 A 50 50 0 0 1 10 60" fill="none" stroke="#ef4444" stroke-width="5" stroke-linecap="round" opacity="0.35"/>
                    <path d="M 10 60 A 50 50 0 0 1 60 10" fill="none" stroke="#3b82f6" stroke-width="5" stroke-linecap="round" opacity="0.35"/>
                    <line x1="60" y1="60" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
                    <circle cx="60" cy="60" r="5" fill="${color}"/>
                    <text x="60" y="15" text-anchor="middle" font-size="8" fill="#3b82f6" font-weight="bold">PLEAMAR</text>
                    <text x="60" y="113" text-anchor="middle" font-size="8" fill="#ef4444" font-weight="bold">BAJAMAR</text>
                    <text x="12" y="63" text-anchor="middle" font-size="7" fill="#9ca3af">bajando</text>
                    <text x="108" y="63" text-anchor="middle" font-size="7" fill="#9ca3af">subiendo</text>
                </svg>
                <div class="flex-1 space-y-2">
                    ${pleamar ? `<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-blue-500"></div><div><p class="text-xs text-gray-400">Pleamar</p><p class="font-bold text-blue-600 text-sm">${fmtHora(pleamar.dt)}</p></div></div>` : ''}
                    ${bajamar ? `<div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-red-500"></div><div><p class="text-xs text-gray-400">Bajamar</p><p class="font-bold text-red-500 text-sm">${fmtHora(bajamar.dt)}</p></div></div>` : ''}
                    ${siguiente ? `<div class="p-2 bg-gray-50 rounded-lg text-xs">Nivel <strong style="color:${color}">${subiendo?'↑ subiendo':'↓ bajando'}</strong> · Falta <strong>${tiempoRestante(siguiente.dt)}</strong> para la ${siguiente.type==='High'?'pleamar':'bajamar'}</div>` : ''}
                    ${altActual !== null ? `<p class="text-xs text-gray-400">Altura actual: <strong>${altActual.toFixed(2)} m</strong></p>` : ''}
                </div>
            </div>`;
    },

    renderRelojMareasFallback() {
        const c = document.getElementById('marine-reloj-mareas');
        if (c) c.innerHTML = `<p class="text-gray-400 text-sm text-center py-2">Datos de mareas no disponibles para esta ubicación</p>`;
    },

    renderGraficoMareas(data) {
        const alturas  = data.heights  || [];
        const extremos = data.extremes || [];
        if (!alturas.length) return;

        if (this.tideChart) { this.tideChart.destroy(); this.tideChart = null; }
        const canvas = document.getElementById('marine-tide-chart');
        if (!canvas) return;

        const labels      = alturas.map(h => new Date(h.dt*1000).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}));
        const values      = alturas.map(h => h.height);
        const actividades = alturas.map(h => this.calcularActividadHora(h.dt, extremos));
        const ctx         = canvas.getContext('2d');
        const gradient    = ctx.createLinearGradient(0,0,0,200);
        gradient.addColorStop(0,'rgba(59,130,246,0.35)');
        gradient.addColorStop(1,'rgba(59,130,246,0.02)');

        this.tideChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{ data: values, borderColor:'#3b82f6', backgroundColor: gradient, borderWidth:2.5, tension:0.4, fill:true, pointRadius:0, pointHoverRadius:5 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => [`Altura: ${ctx.parsed.y.toFixed(2)} m`, `Pesca: ${actividades[ctx.dataIndex].peces}`] } }
                },
                scales: {
                    x: { ticks: { maxTicksLimit:7, font:{size:10} }, grid: { display:false } },
                    y: { ticks: { font:{size:10} }, grid: { color:'rgba(0,0,0,0.05)' } }
                }
            },
            plugins: [{
                id: 'markers',
                afterDraw: chart => {
                    const { ctx, scales:{x,y} } = chart;
                    // Puntos pleamar/bajamar
                    extremos.forEach(e => {
                        const label = new Date(e.dt*1000).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
                        const idx   = labels.indexOf(label);
                        if (idx === -1) return;
                        const px = x.getPixelForIndex(idx);
                        const py = y.getPixelForValue(values[idx] ?? 0);
                        ctx.save();
                        ctx.fillStyle = e.type==='High' ? '#2563eb' : '#dc2626';
                        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2); ctx.fill();
                        ctx.font = 'bold 9px sans-serif';
                        ctx.fillStyle = e.type==='High' ? '#1d4ed8' : '#b91c1c';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, px, py - 10);
                        ctx.restore();
                    });
                    // Pececitos debajo del gráfico cada 3h
                    actividades.forEach((act, i) => {
                        if (i % 3 !== 0) return;
                        const px = x.getPixelForIndex(i);
                        const py = chart.chartArea.bottom + 14;
                        ctx.save();
                        ctx.font = '11px serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(act.peces, px, py);
                        ctx.restore();
                    });
                }
            }]
        });
    },

    calcularActividadHora(timestamp, extremos) {
        let mejorDist = Infinity;
        extremos.forEach(e => { const d = Math.abs(e.dt - timestamp); if (d < mejorDist) mejorDist = d; });
        if (mejorDist < 3600)  return { nivel:4, peces:'🐟🐟🐟' };
        if (mejorDist < 7200)  return { nivel:3, peces:'🐟🐟' };
        if (mejorDist < 10800) return { nivel:2, peces:'🐟' };
        return { nivel:1, peces:'—' };
    },

    // ── SOLUNAR ───────────────────────────────────────────────────────────────

    calcularSolunar(data) {
        const cont     = document.getElementById('marine-solunar');
        if (!cont) return;
        const extremos = data.extremes || [];
        const ahora    = Date.now() / 1000;
        const hoy      = new Date().toDateString();
        const fmtHora  = ts => new Date(ts*1000).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});

        const pleamares = extremos.filter(e => e.type==='High' && new Date(e.dt*1000).toDateString()===hoy);
        const bajamares = extremos.filter(e => e.type==='Low'  && new Date(e.dt*1000).toDateString()===hoy);

        let coef = 50;
        if (pleamares.length && bajamares.length) {
            const maxH = Math.max(...pleamares.map(e=>e.height||0));
            const minH = Math.min(...bajamares.map(e=>e.height||0));
            coef = Math.min(120, Math.round((maxH - minH) * 40));
        }

        let actividad, peces, colorAct, descripcion;
        if (coef >= 90)      { actividad='Muy Alta'; peces='🐟🐟🐟'; colorAct='#16a34a'; descripcion='Excelente día para pescar. Actividad de los peces al máximo.'; }
        else if (coef >= 70) { actividad='Alta';     peces='🐟🐟';   colorAct='#2563eb'; descripcion='Buen día para pescar. Alta probabilidad de capturas.'; }
        else if (coef >= 40) { actividad='Media';    peces='🐟';     colorAct='#ca8a04'; descripcion='Día regular. Aprovecha los periodos cerca de las mareas.'; }
        else                 { actividad='Baja';     peces='—';      colorAct='#9ca3af'; descripcion='Actividad baja hoy. Considera esperar mejores condiciones.'; }

        const proximas = extremos.filter(e => e.dt > ahora - 3600).slice(0, 4);
        const periodos = proximas.map(e => {
            const act = this.calcularActividadHora(e.dt, extremos);
            return `
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-2">
                        <span class="text-base">${act.peces}</span>
                        <div>
                            <p class="text-xs font-medium">${e.type==='High'?'↑ Pleamar':'↓ Bajamar'}</p>
                            <p class="text-xs text-gray-400">${fmtHora(e.dt)}</p>
                        </div>
                    </div>
                    <span class="text-xs font-medium" style="color:${act.nivel>=3?'#16a34a':'#9ca3af'}">
                        ${act.nivel>=4?'Excelente':act.nivel>=3?'Muy bueno':act.nivel>=2?'Bueno':'Regular'}
                    </span>
                </div>`;
        }).join('');

        const barWidth = Math.min(100, coef);
        const barColor = coef>=90?'#16a34a':coef>=70?'#2563eb':coef>=40?'#ca8a04':'#9ca3af';

        cont.innerHTML = `
            <div class="w-full">
                <div class="flex items-center gap-4 mb-3 p-3 bg-gray-50 rounded-xl">
                    <div class="text-4xl">${peces}</div>
                    <div class="flex-1">
                        <p class="text-xs text-gray-400">Actividad solunar de hoy</p>
                        <p class="font-bold text-lg" style="color:${colorAct}">${actividad}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div style="width:${barWidth}%;height:100%;background:${barColor};border-radius:9999px;transition:width 0.5s;"></div>
                            </div>
                            <span class="text-xs text-gray-500 font-medium">${coef}</span>
                        </div>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mb-3">${descripcion}</p>
                <p class="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Mejores momentos</p>
                <div class="space-y-2">${periodos || '<p class="text-xs text-gray-400">Sin datos de periodos</p>'}</div>
            </div>`;
    },

    calcularSolunarSinMareas() {
        const c = document.getElementById('marine-solunar');
        if (c) c.innerHTML = `<div class="text-center py-3"><p class="text-2xl mb-1">🐟</p><p class="text-sm text-gray-500">Busca una playa costera para ver la actividad solunar</p></div>`;
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
        if (this.favoritos.some(f => f.nombre === this.playaActual.nombre)) { toast.success('Esta playa ya está guardada'); return; }
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
        } catch (err) { toast.error('Error al guardar: ' + err.message); }
    },

    renderFavoritos() {
        const cont    = document.getElementById('marine-favoritos');
        const wrapper = document.getElementById('marine-favoritos-cont');
        if (!cont || !wrapper) return;
        if (!this.favoritos.length) { wrapper.classList.add('hidden'); return; }
        wrapper.classList.remove('hidden');
        cont.innerHTML = '';
        this.favoritos.forEach(f => {
            const chip = document.createElement('div');
            chip.className = 'flex items-center gap-1';
            chip.innerHTML = `
                <button class="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-primary hover:bg-blue-100 transition-colors">
                    <i class="fa fa-map-marker"></i> ${f.nombre}
                </button>
                <button class="text-gray-300 hover:text-red-400 text-xs px-1 eliminar-fav" data-id="${f.id}" title="Eliminar">✕</button>`;
            chip.querySelector('button:first-child').addEventListener('click', () => this.seleccionarLugar(f));
            chip.querySelector('.eliminar-fav').addEventListener('click', async () => {
                await db.from('playas_favoritas').delete().eq('id', f.id);
                await this.cargarFavoritos();
                this.renderFavoritos();
            });
            cont.appendChild(chip);
        });
    }
};

window.marineModule = marineModule;