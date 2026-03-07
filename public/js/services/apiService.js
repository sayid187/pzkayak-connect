/**
 * Copyright (c) 2026 Sociedad Comercial Yepsen LTDA. All rights reserved.
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, distribution, or use of this file, via any medium, is strictly prohibited.
 */

// API Service for handling backend communication
const apiService = {
    // Base API URL
    baseUrl: 'http://localhost:3000/api',

    // Get authentication token from localStorage
    getToken() {
        return localStorage.getItem('token');
    },

    // Set authentication token in localStorage
    setToken(token) {
        localStorage.setItem('token', token);
    },

    // Remove authentication token from localStorage
    removeToken() {
        localStorage.removeItem('token');
    },

    // Get headers with authorization token
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    },

    // Generic fetch wrapper
    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = this.getHeaders(options.auth !== false);

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Authentication endpoints
    auth: {
        // Register new user
        async register(userData) {
            return await apiService.fetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData),
                auth: false
            });
        },

        // Login user
        async login(credentials) {
            const response = await apiService.fetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
                auth: false
            });
            
            // Store token
            if (response.data?.token) {
                apiService.setToken(response.data.token);
            }
            
            return response;
        },

        // Get current user
        async getCurrentUser() {
            return await apiService.fetch('/auth/me');
        },

        // Logout user
        async logout() {
            const response = await apiService.fetch('/auth/logout');
            apiService.removeToken();
            return response;
        }
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    },

    // Get current user from localStorage
    getCurrentUserFromStorage() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set current user in localStorage
    setCurrentUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    // Clear user data from localStorage
    clearUserData() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }
};

// Export the API service
window.apiService = apiService;