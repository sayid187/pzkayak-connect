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

// ── INICIO ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`🚀 PzKayak corriendo en http://localhost:${PORT}`));
}

module.exports = app;