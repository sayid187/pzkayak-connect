const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Importamos la conexión

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // No pueden haber dos usuarios con el mismo correo
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    contacto_emergencia: {
        type: DataTypes.STRING,
        allowNull: true // Opcional por si lo llenan después
    },
    idioma: {
        type: DataTypes.STRING,
        defaultValue: 'es' // Por defecto en español, como lo tienes planeado
    }
}, {
    tableName: 'usuarios', // Nombre de la tabla en PostgreSQL
    timestamps: true       // Crea automáticamente las columnas createdAt y updatedAt
});

module.exports = User;