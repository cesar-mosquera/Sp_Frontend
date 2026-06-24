// ============================================================
// CONFIGURACIÓN — Conexión al backend (VPS)
// ============================================================
//
//  API_BASE_URL  → URL pública de tu VPS donde corre server.py
//    Ejemplo:    http://123.456.78.90:5000
//    Con dominio: https://midominio.com
//    Con HTTPS:   https://123.456.78.90:5000
//
//  DASHBOARD_KEY → Debe ser IGUAL al valor de DASHBOARD_API_KEY
//                  en el archivo .env del backend del VPS.
//
//  ⚠️  CAMBIA la IP por la de tu VPS antes de subir a Netlify
// ============================================================

const API_BASE_URL = "http://localhost:5000";   // ← CAMBIA ESTO por la IP de tu VPS cuando subas a Netlify
const DASHBOARD_KEY = "DashK3y_SpyFront_2026_Secure!"; // ← Igual al .env del backend
