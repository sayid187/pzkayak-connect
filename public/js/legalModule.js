/**
 * Módulo Legal - PzKayak Connect
 * Reglamentos de pesca recreativa Chile (Sernapesca)
 */

const legalModule = {

    zonaActual: 'norte',

    zonas: {
        norte: {
            nombre: 'Zona Norte',
            regiones: 'Arica y Parinacota, Tarapacá, Antofagasta, Atacama, Coquimbo',
            temporada: 'Aguas marinas: todo el año · Aguas continentales: nov–mayo',
            especiesMarinas: [
                { nombre: 'Sierra',        tallaMin: 35,  limiteDia: 15 },
                { nombre: 'Jurel',         tallaMin: 26,  limiteDia: 15 },
                { nombre: 'Corvina',       tallaMin: 40,  limiteDia: 5  },
                { nombre: 'Congrio',       tallaMin: 60,  limiteDia: 5  },
                { nombre: 'Cabrilla',      tallaMin: 25,  limiteDia: 15 },
                { nombre: 'Lenguado',      tallaMin: 30,  limiteDia: 5  }
            ],
            especiesContinentales: [
                { nombre: 'Trucha Arcoíris', tallaMin: 25, limiteDia: 3, nota: 'Solo en Lago Chungará (Arica)' }
            ],
            vedas: [
                'Especies nativas protegidas: veda extractiva hasta oct. 2026 (Decreto 2011)',
                'Prohibido pescar de noche desde embarcación (21:00–06:00) a menos de 500m de desembocaduras',
                'Zona norte: verificar áreas marinas protegidas en Sernapesca'
            ],
            advertencias: [
                '⚠️ En el norte predomina la pesca marina costera desde kayak',
                '⚠️ Verifique las áreas de nidificación de chungungo y pingüino antes de pescar'
            ]
        },
        centro: {
            nombre: 'Zona Centro',
            regiones: 'Valparaíso, Metropolitana, O\'Higgins, Maule, Ñuble',
            temporada: 'Aguas marinas: todo el año · Aguas continentales: 2° viernes nov – 1° domingo mayo',
            especiesMarinas: [
                { nombre: 'Corvina',     tallaMin: 40, limiteDia: 5  },
                { nombre: 'Reineta',     tallaMin: 32, limiteDia: 15 },
                { nombre: 'Congrio',     tallaMin: 60, limiteDia: 5  },
                { nombre: 'Jurel',       tallaMin: 26, limiteDia: 15 },
                { nombre: 'Palometa',    tallaMin: 25, limiteDia: 15 },
                { nombre: 'Tollo',       tallaMin: 70, limiteDia: 3  }
            ],
            especiesContinentales: [
                { nombre: 'Trucha Arcoíris', tallaMin: 25, limiteDia: 3  },
                { nombre: 'Trucha Café',     tallaMin: 25, limiteDia: 3  },
                { nombre: 'Pejerrey',        tallaMin: 20, limiteDia: 15 },
                { nombre: 'Carpa',           tallaMin: 30, limiteDia: 15 }
            ],
            vedas: [
                'Especies nativas protegidas: veda extractiva hasta oct. 2026',
                'Prohibido pescar de noche desde embarcación (21:00–06:00) a 500m de desembocaduras',
                'Lago Rapel: permitido pescar en toda la ribera',
                'Ríos cordilleranos (Maipo, Tinguiririca, Maule): verificar tramos habilitados'
            ],
            advertencias: [
                '⚠️ Zona con mayor actividad de kayak de pesca recreativa del país',
                '⚠️ Máx. 3 ejemplares/día O 15 kg diarios (lo que ocurra primero) en aguas continentales'
            ]
        },
        sur: {
            nombre: 'Zona Sur',
            regiones: 'Biobío, La Araucanía, Los Ríos, Los Lagos, Aysén, Magallanes',
            temporada: 'Aguas marinas: todo el año · Aguas continentales: 2° viernes nov – 1° domingo mayo',
            especiesMarinas: [
                { nombre: 'Merluza',     tallaMin: 35, limiteDia: 15 },
                { nombre: 'Congrio',     tallaMin: 60, limiteDia: 5  },
                { nombre: 'Róbalo',      tallaMin: 40, limiteDia: 5  },
                { nombre: 'Corvina',     tallaMin: 40, limiteDia: 5  },
                { nombre: 'Pejeperro',   tallaMin: 30, limiteDia: 10 }
            ],
            especiesContinentales: [
                { nombre: 'Trucha Arcoíris', tallaMin: 25, limiteDia: 3, nota: 'Solo señuelos artificiales en zonas señaladas' },
                { nombre: 'Trucha Café',     tallaMin: 25, limiteDia: 3, nota: 'Devolución obligatoria en varios ríos (Araucanía)' },
                { nombre: 'Salmón del Atlántico', tallaMin: 40, limiteDia: 2 },
                { nombre: 'Pejerrey',        tallaMin: 20, limiteDia: 15 }
            ],
            vedas: [
                'Pesca nocturna prohibida (21:00–06:00) en cursos continentales de La Araucanía',
                'Parques Nacionales (Huerquehue, Villarrica, etc.): prohibido o restringido — verificar mapa',
                'Ríos Araucanía: solo cauce principal habilitado, afluentes prohibidos',
                'Devolución obligatoria en ríos de La Araucanía y Los Ríos',
                'Especies nativas protegidas: veda extractiva hasta oct. 2026'
            ],
            advertencias: [
                '⚠️ La Araucanía: solo señuelos artificiales con un anzuelo simple sin rebarba',
                '⚠️ En parques nacionales consultar Conaf antes de pescar',
                '⚠️ Magallanes y Aysén: revisar vedas específicas por especie en Sernapesca'
            ]
        }
    },

    reglamentosGenerales: [
        { titulo: 'Licencia obligatoria', icono: 'fa-id-card', texto: 'Toda persona debe portar licencia Sernapesca vigente al pescar y durante el transporte de las capturas. Debe mostrarse junto a cédula de identidad al ser fiscalizada.' },
        { titulo: 'Solo aparejos personales', icono: 'fa-wrench', texto: 'Solo se permite una caña manejada a mano a la vez. Prohibido usar redes, palangres o métodos no recreativos (Decreto N° 103, 2012).' },
        { titulo: 'Prohibición de venta', icono: 'fa-ban', texto: 'Las capturas no pueden ser vendidas ni comercializadas bajo ninguna forma. La infracción es sancionada bajo Ley N° 20.256 y Ley General de Pesca N° 18.892.' },
        { titulo: 'Límite general', icono: 'fa-balance-scale', texto: 'Máximo 3 ejemplares por día de pesca O hasta 15 kg diarios en aguas continentales — lo que se cumpla primero.' },
        { titulo: 'Exenciones de licencia', icono: 'fa-info-circle', texto: 'Quedan exentos del pago y obtención de licencia: menores de 12 años, mayores de 65 años, y personas con discapacidad inscritas en el Registro Nacional.' },
        { titulo: 'Kayak desde mar', icono: 'fa-ship', texto: 'La pesca desde kayak en aguas marinas aplica normativa de embarcación menor. Llevar chaleco salvavidas, señalización y equipo de seguridad es obligatorio (Resolución 433/2025).' }
    ],

    init() {
        this.setupEventListeners();
        this.renderZona('norte');
        this.renderLicencia();
    },

    setupEventListeners() {
        // Botones de zona
        document.querySelectorAll('.zona-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.zona-btn').forEach(b => {
                    b.className = 'zona-btn flex-1 py-2 rounded-xl text-sm font-medium border-2 border-gray-200 text-gray-500';
                });
                btn.className = 'zona-btn flex-1 py-2 rounded-xl text-sm font-medium border-2 border-primary bg-blue-50 text-primary';
                this.zonaActual = btn.dataset.zona;
                this.renderZona(btn.dataset.zona);
            });
        });

        // Búsqueda
        document.getElementById('reglamento-search')?.addEventListener('input', (e) => {
            this.buscar(e.target.value.trim());
        });

        // Foto licencia
        document.getElementById('cargar-licencia-btn')?.addEventListener('click', () => {
            document.getElementById('licencia-foto-input').click();
        });
        document.getElementById('licencia-foto-input')?.addEventListener('change', (e) => {
            if (e.target.files[0]) this.guardarFotoLicencia(e.target.files[0]);
        });
    },

    renderZona(zonaId) {
        const zona = this.zonas[zonaId];
        const cont = document.getElementById('regulations-content');
        if (!cont || !zona) return;

        cont.innerHTML = `
            <!-- Info zona -->
            <div class="card p-4 mb-4">
                <div class="flex items-center gap-2 mb-1">
                    <i class="fa fa-map-marker text-primary"></i>
                    <h3 class="font-semibold">${zona.nombre}</h3>
                </div>
                <p class="text-xs text-gray-500 mb-2">${zona.regiones}</p>
                <div class="bg-blue-50 rounded-lg p-2 text-xs text-blue-700">
                    <i class="fa fa-calendar mr-1"></i> <strong>Temporada:</strong> ${zona.temporada}
                </div>
            </div>

            <!-- Reglamentos generales -->
            <div class="card p-4 mb-4">
                <h3 class="font-semibold mb-3">Normas Generales (Todo Chile)</h3>
                <div class="space-y-2" id="generales-list"></div>
            </div>

            <!-- Especies marinas -->
            <div class="card p-4 mb-4">
                <h3 class="font-semibold mb-3"><i class="fa fa-ship mr-1 text-blue-500"></i>Pesca Marina — Tallas Mínimas</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-xs text-gray-400 border-b">
                                <th class="text-left py-2">Especie</th>
                                <th class="text-center py-2">Talla mín.</th>
                                <th class="text-center py-2">Límite/día</th>
                            </tr>
                        </thead>
                        <tbody id="marina-table"></tbody>
                    </table>
                </div>
            </div>

            <!-- Especies continentales -->
            <div class="card p-4 mb-4">
                <h3 class="font-semibold mb-3"><i class="fa fa-tint mr-1 text-cyan-500"></i>Pesca Continental — Tallas Mínimas</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-xs text-gray-400 border-b">
                                <th class="text-left py-2">Especie</th>
                                <th class="text-center py-2">Talla mín.</th>
                                <th class="text-center py-2">Límite/día</th>
                            </tr>
                        </thead>
                        <tbody id="continental-table"></tbody>
                    </table>
                </div>
            </div>

            <!-- Vedas y restricciones -->
            <div class="card p-4 mb-4">
                <h3 class="font-semibold mb-3"><i class="fa fa-ban mr-1 text-red-500"></i>Vedas y Restricciones</h3>
                <div class="space-y-2" id="vedas-list"></div>
            </div>

            <!-- Advertencias zona -->
            <div class="card p-4 mb-4 bg-yellow-50 border border-yellow-200">
                <h3 class="font-semibold mb-2 text-yellow-800"><i class="fa fa-exclamation-triangle mr-1"></i>Importante para esta zona</h3>
                <div class="space-y-1" id="advertencias-list"></div>
            </div>

            <!-- Link Sernapesca -->
            <div class="card p-4 mb-4 bg-blue-50">
                <p class="text-sm text-blue-800 text-center">
                    <i class="fa fa-info-circle mr-1"></i>
                    Información oficial y actualizada en
                    <a href="https://www.sernapesca.cl" target="_blank" class="font-semibold underline">sernapesca.cl</a>
                    · Fono: <strong>800 320 032</strong>
                </p>
            </div>
        `;

        // Reglamentos generales
        const genList = document.getElementById('generales-list');
        this.reglamentosGenerales.forEach(r => {
            const div = document.createElement('div');
            div.className = 'flex items-start gap-3 p-2 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i class="fa ${r.icono} text-primary text-xs"></i>
                </div>
                <div>
                    <p class="font-medium text-sm">${r.titulo}</p>
                    <p class="text-xs text-gray-500 mt-0.5">${r.texto}</p>
                </div>
            `;
            genList.appendChild(div);
        });

        // Tabla marina
        const marinaTable = document.getElementById('marina-table');
        zona.especiesMarinas.forEach(e => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-100';
            tr.innerHTML = `
                <td class="py-2 font-medium">${e.nombre}</td>
                <td class="py-2 text-center"><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">${e.tallaMin} cm</span></td>
                <td class="py-2 text-center text-gray-600">${e.limiteDia} ${e.limiteDia === 15 ? 'kg' : 'ej.'}</td>
            `;
            if (e.nota) {
                const notaTr = document.createElement('tr');
                notaTr.innerHTML = `<td colspan="3" class="text-xs text-orange-600 pb-2 pl-2">⚠️ ${e.nota}</td>`;
                marinaTable.appendChild(tr);
                marinaTable.appendChild(notaTr);
            } else {
                marinaTable.appendChild(tr);
            }
        });

        // Tabla continental
        const contTable = document.getElementById('continental-table');
        zona.especiesContinentales.forEach(e => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-100';
            tr.innerHTML = `
                <td class="py-2 font-medium">${e.nombre}</td>
                <td class="py-2 text-center"><span class="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded text-xs">${e.tallaMin} cm</span></td>
                <td class="py-2 text-center text-gray-600">${e.limiteDia} ej.</td>
            `;
            contTable.appendChild(tr);
            if (e.nota) {
                const notaTr = document.createElement('tr');
                notaTr.innerHTML = `<td colspan="3" class="text-xs text-orange-600 pb-2 pl-2">⚠️ ${e.nota}</td>`;
                contTable.appendChild(notaTr);
            }
        });

        // Vedas
        const vedasList = document.getElementById('vedas-list');
        zona.vedas.forEach(v => {
            const div = document.createElement('div');
            div.className = 'flex items-start gap-2 p-2 bg-red-50 rounded-lg';
            div.innerHTML = `<i class="fa fa-times-circle text-red-400 mt-0.5 flex-shrink-0"></i><p class="text-xs text-gray-700">${v}</p>`;
            vedasList.appendChild(div);
        });

        // Advertencias
        const advList = document.getElementById('advertencias-list');
        zona.advertencias.forEach(a => {
            const p = document.createElement('p');
            p.className = 'text-xs text-yellow-800';
            p.textContent = a;
            advList.appendChild(p);
        });
    },

    buscar(query) {
        if (!query) { this.renderZona(this.zonaActual); return; }
        const q = query.toLowerCase();
        const zona = this.zonas[this.zonaActual];
        const cont = document.getElementById('regulations-content');
        if (!cont) return;

        const resultados = [
            ...zona.especiesMarinas.filter(e => e.nombre.toLowerCase().includes(q))
                .map(e => ({ tipo: 'Marina', ...e })),
            ...zona.especiesContinentales.filter(e => e.nombre.toLowerCase().includes(q))
                .map(e => ({ tipo: 'Continental', ...e })),
            ...zona.vedas.filter(v => v.toLowerCase().includes(q))
                .map(v => ({ tipo: 'Veda', texto: v })),
            ...this.reglamentosGenerales.filter(r =>
                r.titulo.toLowerCase().includes(q) || r.texto.toLowerCase().includes(q))
                .map(r => ({ tipo: 'Norma', nombre: r.titulo, texto: r.texto }))
        ];

        if (resultados.length === 0) {
            cont.innerHTML = `<div class="card p-6 text-center text-gray-500">
                <i class="fa fa-search text-3xl mb-2 block text-gray-300"></i>
                Sin resultados para "${query}"
            </div>`;
            return;
        }

        cont.innerHTML = `<div class="card p-4 mb-4">
            <h3 class="font-semibold mb-3">Resultados para "${query}"</h3>
            <div class="space-y-2">
                ${resultados.map(r => `
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mr-2">${r.tipo}</span>
                        <span class="font-medium text-sm">${r.nombre || ''}</span>
                        ${r.tallaMin ? `<span class="ml-2 text-xs text-gray-500">Talla mín: ${r.tallaMin}cm · Límite: ${r.limiteDia}</span>` : ''}
                        ${r.texto ? `<p class="text-xs text-gray-500 mt-1">${r.texto}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    // ── LICENCIA ──────────────────────────────────────────────────────────────

    renderLicencia() {
        const display = document.getElementById('licencia-display');
        if (!display) return;

        const data = this.cargarLicencia();

        if (!data) {
            display.innerHTML = `
                <div class="bg-gray-50 rounded-xl p-4 text-center text-gray-400">
                    <i class="fa fa-id-card text-3xl mb-2 block"></i>
                    <p class="text-sm">Sin licencia cargada</p>
                    <p class="text-xs mt-1">Obtén tu licencia en <a href="https://pescarecreativa.sernapesca.cl" target="_blank" class="text-primary underline">Sernapesca</a> y súbela aquí</p>
                </div>
            `;
            return;
        }

        const vencida = data.vencimiento && new Date(data.vencimiento) < new Date();
        display.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                ${data.foto ? `<img src="${data.foto}" alt="Licencia" class="w-full rounded-lg mb-3 max-h-48 object-contain bg-white">` : ''}
                <div class="flex items-center gap-2 mb-1">
                    <i class="fa fa-check-circle text-green-500"></i>
                    <span class="font-semibold text-green-800">Licencia cargada</span>
                    ${vencida ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Vencida</span>' : '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Vigente</span>'}
                </div>
                ${data.numero    ? `<p class="text-sm text-gray-600">N° ${data.numero}</p>` : ''}
                ${data.vencimiento ? `<p class="text-sm text-gray-500">Válida hasta: ${new Date(data.vencimiento).toLocaleDateString('es-CL')}</p>` : ''}
                <div class="flex gap-2 mt-3">
                    <button id="editar-licencia-btn" class="btn btn-secondary text-xs flex-1">
                        <i class="fa fa-pencil mr-1"></i> Editar datos
                    </button>
                    <button id="eliminar-licencia-btn" class="btn text-xs px-3 bg-red-50 text-red-500 border border-red-200 rounded-lg">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        document.getElementById('editar-licencia-btn')?.addEventListener('click', () => this.mostrarFormLicencia(data));
        document.getElementById('eliminar-licencia-btn')?.addEventListener('click', () => {
            if (confirm('¿Eliminar la licencia guardada?')) {
                localStorage.removeItem('pzkayak_licencia');
                this.renderLicencia();
            }
        });

        // Ocultar botón cargar si ya hay licencia
        const btn = document.getElementById('cargar-licencia-btn');
        if (btn) btn.innerHTML = '<i class="fa fa-refresh mr-1"></i> Actualizar foto de licencia';
    },

    guardarFotoLicencia(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const existing = this.cargarLicencia() || {};
            existing.foto = e.target.result;
            localStorage.setItem('pzkayak_licencia', JSON.stringify(existing));
            this.renderLicencia();
            this.mostrarFormLicencia(existing);
        };
        reader.readAsDataURL(file);
    },

    mostrarFormLicencia(data = {}) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-t-2xl p-5 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">Datos de la Licencia</h2>
                    <button id="modal-close" class="text-gray-400"><i class="fa fa-times text-xl"></i></button>
                </div>
                <div class="space-y-3">
                    <div>
                        <label class="text-sm text-gray-600 mb-1 block">N° de Licencia</label>
                        <input id="lic-numero" type="text" class="input-field" placeholder="Ej: 2025-12345" value="${data.numero || ''}">
                    </div>
                    <div>
                        <label class="text-sm text-gray-600 mb-1 block">Tipo de licencia</label>
                        <select id="lic-tipo" class="input-field">
                            <option value="" disabled>Seleccionar tipo</option>
                            <option ${data.tipo === 'marina-anual' ? 'selected' : ''} value="marina-anual">Aguas marinas (año) — 0,2 UF</option>
                            <option ${data.tipo === 'continental-semana' ? 'selected' : ''} value="continental-semana">Aguas continentales (semana) — 0,1 UF</option>
                            <option ${data.tipo === 'continental-mes' ? 'selected' : ''} value="continental-mes">Aguas continentales (mes) — 0,2 UF</option>
                            <option ${data.tipo === 'continental-anual' ? 'selected' : ''} value="continental-anual">Aguas continentales (año) — 0,3 UF</option>
                            <option ${data.tipo === 'ambas-anual' ? 'selected' : ''} value="ambas-anual">Marinas y continentales (año) — 0,4 UF</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm text-gray-600 mb-1 block">Fecha de vencimiento</label>
                        <input id="lic-vencimiento" type="date" class="input-field" value="${data.vencimiento || ''}">
                    </div>
                    <button id="modal-guardar" class="btn btn-primary w-full">
                        <i class="fa fa-save mr-1"></i> Guardar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('modal-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        document.getElementById('modal-guardar').onclick = () => {
            const saved = this.cargarLicencia() || {};
            saved.numero      = document.getElementById('lic-numero').value.trim();
            saved.tipo        = document.getElementById('lic-tipo').value;
            saved.vencimiento = document.getElementById('lic-vencimiento').value;
            localStorage.setItem('pzkayak_licencia', JSON.stringify(saved));
            this.renderLicencia();
            modal.remove();
        };
    },

    cargarLicencia() {
        try {
            const d = localStorage.getItem('pzkayak_licencia');
            return d ? JSON.parse(d) : null;
        } catch { return null; }
    }
};

window.legalModule = legalModule;
