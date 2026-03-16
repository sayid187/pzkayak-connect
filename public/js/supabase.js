// js/supabase.js — Cliente Supabase compartido por todos los módulos
// ⚠️  Solo la anon key va aquí (es pública y segura con RLS activado)

const SUPABASE_URL  = 'https://nfpeohkjxzqgifrcitvz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcGVvaGtqeHpxZ2lmcmNpdHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MjY0NTIsImV4cCI6MjA4OTIwMjQ1Mn0.yhtFJHuGeGEhTWoJmsnW1TKBttoAuK8KCdcQdyUbFSY';

// Carga el SDK de Supabase desde CDN (se agrega en index.html antes de este script)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

window.db = db; // Para depuración en consola, no es necesario para el funcionamiento   