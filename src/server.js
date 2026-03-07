const express = require('express');
const cors = require('cors');
const path = require('path');

// Importamos la conexión a la base de datos y los modelos
const sequelize = require('./config/database');
const User = require('./models/User');

const app = express();

// --- Middlewares ---
app.use(cors()); 
app.use(express.json()); 

// 👇 Esta línea hace la magia: le dice a Node que muestre tu frontend
app.use(express.static(path.join(__dirname, '../public')));

// --- Rutas de la API ---
const userRoutes = require('./routes/userRoutes');
app.use('/api/usuarios', userRoutes);

// --- Sincronización de Base de Datos ---
sequelize.sync({ alter: true }) 
    .then(() => console.log('✅ Modelos sincronizados con la base de datos'))
    .catch(err => console.error('❌ Error al sincronizar modelos:', err));

// --- Configuración del Puerto y Vercel ---
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor de PzKayak corriendo localmente en http://localhost:${PORT}`);
    });
}

// Exportamos la app para Vercel
module.exports = app;