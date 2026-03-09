const weatherModule = {
    init() {
        this.updateWeatherDisplay();
    },

    updateWeatherDisplay() {
        const descElement = document.getElementById('weather-desc');
        if(descElement) descElement.textContent = "Buscando ubicación...";

        // Pide permiso para usar el GPS del navegador
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.fetchRealWeather(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Ubicación denegada", error);
                    if(descElement) descElement.textContent = "Ubicación denegada";
                }
            );
        } else {
            if(descElement) descElement.textContent = "GPS no soportado";
        }
    },

    async fetchRealWeather(lat, lon) {
        try {
            document.getElementById('weather-desc').textContent = "Descargando...";
            // Llama a la API gratuita del clima con tus coordenadas exactas
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=ms`;
            
            const response = await fetch(url);
            const data = await response.json();

            // Pinta los datos reales en el HTML
            document.getElementById('weather-temp').textContent = `${Math.round(data.current.temperature_2m)}°C`;
            document.getElementById('weather-wind').textContent = `${data.current.wind_speed_10m} m/s`;
            document.getElementById('weather-humidity').textContent = `${data.current.relative_humidity_2m}%`;

            this.setWeatherIconAndText(data.current.weather_code);
        } catch (error) {
            console.error("Error al obtener el clima:", error);
            document.getElementById('weather-desc').textContent = "Error de red";
        }
    },

    // Alias so app.js can call weatherModule.refreshWeatherData()
    refreshWeatherData() {
        this.updateWeatherDisplay();
    },

    setWeatherIconAndText(code) {
        const iconElement = document.getElementById('weather-icon');
        const descElement = document.getElementById('weather-desc');
        let desc = "Despejado", iconClass = "fa-sun-o text-yellow-500"; 

        if (code >= 1 && code <= 3) { desc = "Nublado"; iconClass = "fa-cloud text-gray-400"; } 
        else if (code >= 51 && code <= 67) { desc = "Lluvia"; iconClass = "fa-tint text-blue-400"; } 
        
        descElement.textContent = desc;
        iconElement.className = `fa ${iconClass} text-4xl mr-3`;
    }
};

// Arranca automáticamente al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    if(typeof weatherModule !== 'undefined') {
        weatherModule.init();
    }
});