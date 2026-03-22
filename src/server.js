const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = process.env.SUPABASE_URL    || 'https://nfpeohkjxzqgifrcitvz.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGVvaGtqeHpxZ2lmcmNpdHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYyNjQ1MiwiZXhwIjoyMDg5MjAyNDUyfQ.finW3oVyomvsdgSLl-64B0D79iJ_Vl4RAoKmAHM_m_I';

// Cliente admin (service_role) — solo en el backend, nunca en el frontend
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10mb para fotos en base64
app.use(express.static(path.join(__dirname, '../public')));

// ── MIDDLEWARE: verificar sesión Supabase ─────────────────────
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ mensaje: 'Token requerido' });

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(403).json({ mensaje: 'Sesión inválida o expirada' });

    req.user = user;
    next();
}

// ── RUTAS API ─────────────────────────────────────────────────

// Verificar sesión activa
app.get('/api/auth/verificar', requireAuth, (req, res) => {
    res.json({ valido: true, user: req.user });
});

// Subir foto de captura al Storage de Supabase
app.post('/api/capturas/foto', requireAuth, async (req, res) => {
    const { base64, fileName } = req.body;
    if (!base64 || !fileName) return res.status(400).json({ mensaje: 'Faltan datos' });

    const buffer   = Buffer.from(base64.split(',')[1] || base64, 'base64');
    const filePath = `${req.user.id}/${Date.now()}_${fileName}`;

    const { data, error } = await supabaseAdmin.storage
        .from('capturas')
        .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: false });

    if (error) return res.status(500).json({ mensaje: error.message });

    const { data: { publicUrl } } = supabaseAdmin.storage.from('capturas').getPublicUrl(filePath);
    res.json({ url: publicUrl });
});

// Subir avatar de perfil
app.post('/api/perfil/avatar', requireAuth, async (req, res) => {
    const { base64, fileName } = req.body;
    if (!base64) return res.status(400).json({ mensaje: 'Faltan datos' });

    const buffer   = Buffer.from(base64.split(',')[1] || base64, 'base64');
    const filePath = `${req.user.id}/avatar.jpg`;

    const { error } = await supabaseAdmin.storage
        .from('avatares')
        .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: true });

    if (error) return res.status(500).json({ mensaje: error.message });

    const { data: { publicUrl } } = supabaseAdmin.storage.from('avatares').getPublicUrl(filePath);
    res.json({ url: publicUrl });
});


// ── MAREAS con caché compartido ───────────────────────────────
// Todos los usuarios que consulten la misma playa el mismo día
// comparten el mismo request a WorldTides
const WORLDTIDES_KEY = '20c711ef-8e25-4726-891a-2f4a1c893d0c';

app.get('/api/mareas', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos' });

    // Redondear a 4 decimales para agrupar ubicaciones cercanas
    const latR = parseFloat(parseFloat(lat).toFixed(4));
    const lngR = parseFloat(parseFloat(lng).toFixed(4));
    const hoy  = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // 1. Buscar en caché
        const { data: cache } = await supabaseAdmin
            .from('mareas_cache')
            .select('datos')
            .eq('lat', latR)
            .eq('lng', lngR)
            .eq('fecha', hoy)
            .single();

        if (cache) {
            console.log(`Cache HIT: ${latR},${lngR} ${hoy}`);
            return res.json({ ...cache.datos, fromCache: true });
        }

        // 2. No hay caché — consultar WorldTides
        console.log(`Cache MISS: ${latR},${lngR} ${hoy} — consultando WorldTides`);
        const ahora  = Math.floor(Date.now() / 1000);
        const url    = `https://www.worldtides.info/api/v3?heights&extremes&datum=LAT&lat=${latR}&lon=${lngR}&start=${ahora}&length=86400&step=3600&key=${WORLDTIDES_KEY}`;
        const resp   = await fetch(url);
        const datos  = await resp.json();

        if (datos.status !== 200) {
            return res.status(502).json({ error: datos.error || 'Error WorldTides' });
        }

        // 3. Guardar en caché para todos
        await supabaseAdmin.from('mareas_cache').upsert({
            lat: latR, lng: lngR, fecha: hoy, datos
        }, { onConflict: 'lat,lng,fecha' });

        res.json({ ...datos, fromCache: false });

    } catch (err) {
        console.error('Error mareas:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── INICIO ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 PzKayak corriendo en http://localhost:${PORT}`));
}

module.exports = app;