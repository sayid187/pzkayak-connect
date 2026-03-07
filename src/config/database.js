const { Sequelize } = require('sequelize');
require('dotenv').config();

// Vercel Postgres inyecta una variable llamada POSTGRES_URL
const dbUrl = process.env.POSTGRES_URL;

const sequelize = dbUrl 
  ? new Sequelize(dbUrl, {
      dialect: 'postgres',
      dialectModule: require('pg'), // Súper importante para Vercel
      logging: false,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
      }
    })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: false
    });

module.exports = sequelize;