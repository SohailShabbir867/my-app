// API Configuration
const API_KEY = 'aa36e458143363c69bc4f46f5b4e87de'; // Replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const AQI_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const unitToggle = document.getElementById('unit-toggle');
const themeToggle = document.getElementById('theme-toggle');
const recentSearches = document.getElementById('recent-searches');
const weatherContainer = document.getElementById('weather-container');
const loadingContainer = document.getElementById('loading-container');
const errorContainer = document.getElementById('error-container');
const retryBtn = document.getElementById('retry-btn');
const weatherContent = document.getElementById('weather-content');
const errorMessage = document.getElementById('error-message');

// State Variables
let currentUnit = 'metric'; // Default to Celsius
let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
let currentTheme = 'dark';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Load recent searches
    updateRecentSearches();
    
    // Set default theme
    setTheme(currentTheme);
    
    // Load weather for default city or user's location
    getWeatherByLocation();
});

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

locationBtn.addEventListener('click', getWeatherByLocation);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

retryBtn.addEventListener('click', () => {
    const lastCity = recentCities[0];
    if (lastCity) {
        getWeatherData(lastCity);
    } else {
        getWeatherByLocation();
    }
});

unitToggle.addEventListener('click', toggleUnit);
themeToggle.addEventListener('click', toggleTheme);

// Toggle between Celsius and Fahrenheit
function toggleUnit() {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    
    // Update button appearance
    const spans = unitToggle.querySelectorAll('span');
    spans.forEach(span => {
        span.classList.toggle('active', span.textContent.includes(currentUnit === 'metric' ? '°C' : '°F'));
    });
    
    // Reload weather data with new unit
    const currentCity = document.getElementById('city-name').textContent;
    if (currentCity && currentCity !== 'City Name') {
        getWeatherData(currentCity);
    }
}

// Toggle between dark and light theme
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(currentTheme);
    
    // Update theme toggle icon
    const icon = themeToggle.querySelector('i');
    icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function setTheme(theme) {
    document.body.className = theme === 'dark' ? '' : 'light-mode';
    localStorage.setItem('weatherAppTheme', theme);
}

// Get weather by user's location
function getWeatherByLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const weatherData = await fetchWeatherDataByCoords(latitude, longitude);
                    updateUI(weatherData);
                    
                    // Add to recent searches
                    addRecentSearch(weatherData.city);
                } catch (error) {
                    showError("Couldn't get weather for your location. Please try searching for a city.");
                    console.error(error);
                }
            },
            (error) => {
                showError("Location access denied. Please enable location services or search for a city.");
                console.error(error);
                // Default to a popular city if location is denied
                getWeatherData('London');
            }
        );
    } else {
        showError("Geolocation is not supported by your browser. Please search for a city.");
        // Default to a popular city if geolocation isn't supported
        getWeatherData('London');
    }
}

// Get weather data for a specific city
async function getWeatherData(city) {
    try {
        showLoading();
        const weatherData = await fetchWeatherData(city);
        updateUI(weatherData);
        
        // Add to recent searches
        addRecentSearch(city);
        
        // Clear search input
        searchInput.value = '';
    } catch (error) {
        showError("Couldn't find weather data for that location. Please try another city.");
        console.error(error);
    }
}

// Fetch weather data for a city
async function fetchWeatherData(city) {
    // First get coordinates for the city
    const geoResponse = await fetch(`${GEO_URL}?q=${city}&limit=1&appid=${API_KEY}`);
    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
        throw new Error('City not found');
    }
    
    const { lat, lon, name, country } = geoData[0];
    
    // Fetch current weather, forecast, and air quality
    const [currentWeather, forecast, airQuality] = await Promise.all([
        fetch(`${BASE_URL}weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`),
        fetch(`${BASE_URL}forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`),
        fetch(`${AQI_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
    ]);
    
    const currentWeatherData = await currentWeather.json();
    const forecastData = await forecast.json();
    const airQualityData = await airQuality.json();
    
    return {
        city: name,
        country,
        current: currentWeatherData,
        forecast: forecastData,
        airQuality: airQualityData,
        coords: { lat, lon }
    };
}

// Fetch weather data by coordinates
async function fetchWeatherDataByCoords(lat, lon) {
    // Fetch current weather, forecast, and air quality
    const [currentWeather, forecast, airQuality, reverseGeo] = await Promise.all([
        fetch(`${BASE_URL}weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`),
        fetch(`${BASE_URL}forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`),
        fetch(`${AQI_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
        fetch(`${GEO_URL}?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
    ]);
    
    const currentWeatherData = await currentWeather.json();
    const forecastData = await forecast.json();
    const airQualityData = await airQuality.json();
    const reverseGeoData = await reverseGeo.json();
    
    return {
        city: reverseGeoData[0]?.name || 'Unknown Location',
        country: reverseGeoData[0]?.country || '',
        current: currentWeatherData,
        forecast: forecastData,
        airQuality: airQualityData,
        coords: { lat, lon }
    };
}

// Update the UI with weather data
function updateUI(data) {
    showWeatherContent();
    
    // Update current weather
    updateCurrentWeather(data);
    
    // Update highlights
    updateHighlights(data);
    
    // Update forecast
    updateForecast(data.forecast);
    
    // Update hourly forecast
    updateHourlyForecast(data.forecast);
    
    // Update air quality
    updateAirQuality(data.airQuality);
}

// Update current weather section
function updateCurrentWeather(data) {
    const { city, country, current } = data;
    const { temp, feels_like, temp_min, temp_max, humidity } = current.main;
    const { description, icon } = current.weather[0];
    const { speed, deg } = current.wind;
    const { sunrise, sunset } = current.sys;
    
    // City and country
    document.getElementById('city-name').textContent = city;
    document.getElementById('country-name').textContent = country;
    
    // Date and time
    const now = new Date();
    document.getElementById('date-time').textContent = formatDateTime(now);
    
    // Temperature
    document.getElementById('temperature').textContent = `${Math.round(temp)}°`;
    document.getElementById('feels-like').textContent = `Feels like: ${Math.round(feels_like)}°`;
    
    // Weather description
    document.getElementById('weather-description').textContent = description;
    
    // Min/Max temperature
    document.getElementById('min-temp').textContent = `Min: ${Math.round(temp_min)}°`;
    document.getElementById('max-temp').textContent = `Max: ${Math.round(temp_max)}°`;
    
    // Weather icon
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    document.getElementById('weather-icon').src = iconUrl;
    document.getElementById('weather-icon').alt = description;
}

// Update weather highlights
function updateHighlights(data) {
    const { current } = data;
    const { humidity, pressure } = current.main;
    const { speed, deg } = current.wind;
    const visibility = current.visibility / 1000; // Convert to km
    const { sunrise, sunset } = current.sys;
    
    // Wind status
    document.getElementById('wind-speed').textContent = Math.round(speed * (currentUnit === 'metric' ? 3.6 : 1));
    document.getElementById('wind-direction').textContent = getWindDirection(deg);
    
    // Rotate wind direction arrow
    const windArrow = document.getElementById('wind-direction-arrow');
    windArrow.style.transform = `rotate(${deg}deg)`;
    
    // Humidity
    document.getElementById('humidity-value').textContent = humidity;
    document.getElementById('humidity-progress').style.width = `${humidity}%`;
    
    // Visibility
    document.getElementById('visibility-value').textContent = visibility.toFixed(1);
    document.getElementById('visibility-status').textContent = getVisibilityStatus(visibility);
    
    // Air pressure
    document.getElementById('pressure-value').textContent = pressure;
    
    // Sunrise and sunset
    document.getElementById('sunrise-time').textContent = formatTime(sunrise * 1000);
    document.getElementById('sunset-time').textContent = formatTime(sunset * 1000);
    
    // UV Index (not available in current weather API - would need separate call)
    // This is a placeholder - in a real app you'd need to call a UV index API
    const uvIndex = Math.floor(Math.random() * 10) + 1; // Random for demo
    document.getElementById('uv-index').textContent = uvIndex;
    document.getElementById('uv-level').textContent = getUVLevelText(uvIndex);
    
    // Position UV indicator
    const uvIndicator = document.getElementById('uv-indicator');
    const position = Math.min(uvIndex / 12 * 100, 100); // Cap at 100%
    uvIndicator.style.left = `${position}%`;
}

// Update 5-day forecast
function updateForecast(forecastData) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = '';
    
    // Get daily forecasts (every 8th item in the list = every 24 hours)
    const dailyForecasts = forecastData.list.filter((_, index) => index % 8 === 0).slice(0, 5);
    
    dailyForecasts.forEach((forecast, index) => {
        const template = document.getElementById('forecast-day-template').content.cloneNode(true);
        const date = new Date(forecast.dt * 1000);
        const day = formatDay(date);
        const { temp_min, temp_max } = forecast.main;
        const { description, icon } = forecast.weather[0];
        
        template.querySelector('.forecast-day').textContent = index === 0 ? 'Today' : day;
        template.querySelector('.forecast-icon img').src = `https://openweathermap.org/img/wn/${icon}.png`;
        template.querySelector('.forecast-icon img').alt = description;
        template.querySelector('.max-temp').textContent = `${Math.round(temp_max)}°`;
        template.querySelector('.min-temp').textContent = `${Math.round(temp_min)}°`;
        template.querySelector('.forecast-description').textContent = description;
        
        forecastContainer.appendChild(template);
    });
}

// Update hourly forecast
function updateHourlyForecast(forecastData) {
    const hourlyForecast = document.getElementById('hourly-forecast');
    hourlyForecast.innerHTML = '';
    
    // Get next 24 hours of forecasts
    const hourlyForecasts = forecastData.list.slice(0, 8); // Next 24 hours (3-hour intervals)
    
    hourlyForecasts.forEach((forecast, index) => {
        const template = document.getElementById('hourly-item-template').content.cloneNode(true);
        const date = new Date(forecast.dt * 1000);
        const time = formatHour(date);
        const { temp } = forecast.main;
        const { icon } = forecast.weather[0];
        
        template.querySelector('.hourly-time').textContent = index === 0 ? 'Now' : time;
        template.querySelector('.hourly-icon').src = `https://openweathermap.org/img/wn/${icon}.png`;
        template.querySelector('.hourly-icon').alt = forecast.weather[0].description;
        template.querySelector('.hourly-temp').textContent = `${Math.round(temp)}°`;
        
        // Set animation delay
        template.querySelector('.hourly-item').style.setProperty('--delay-index', index);
        
        hourlyForecast.appendChild(template);
    });
}

// Update air quality information
function updateAirQuality(airQualityData) {
    const aqi = airQualityData.list[0].main.aqi;
    const { co, no2, o3, so2, pm2_5, pm10 } = airQualityData.list[0].components;
    
    document.getElementById('aqi-number').textContent = aqi;
    document.getElementById('aqi-text').textContent = getAQIText(aqi);
    document.getElementById('aqi-text').className = `aqi-text ${getAQIClass(aqi)}`;
    
    // Update pollutant values
    document.getElementById('co-value').textContent = co.toFixed(1);
    document.getElementById('no2-value').textContent = no2.toFixed(1);
    document.getElementById('o3-value').textContent = o3.toFixed(1);
    document.getElementById('pm25-value').textContent = pm2_5.toFixed(1);
    document.getElementById('pm10-value').textContent = pm10.toFixed(1);
    document.getElementById('so2-value').textContent = so2.toFixed(1);
}

// Add city to recent searches
function addRecentSearch(city) {
    // Remove if already exists
    recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning
    recentCities.unshift(city);
    
    // Keep only last 5 searches
    if (recentCities.length > 5) {
        recentCities.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('recentCities', JSON.stringify(recentCities));
    
    // Update UI
    updateRecentSearches();
}

// Update recent searches UI
function updateRecentSearches() {
    recentSearches.innerHTML = '';
    
    if (recentCities.length > 0) {
        recentCities.forEach(city => {
            const template = document.getElementById('recent-search-template').content.cloneNode(true);
            template.querySelector('.city-name').textContent = city;
            template.querySelector('.recent-search-item').addEventListener('click', () => {
                getWeatherData(city);
            });
            recentSearches.appendChild(template);
        });
        
        recentSearches.classList.add('active');
    } else {
        recentSearches.classList.remove('active');
    }
}

// Helper functions
function formatDateTime(date) {
    const options = { 
        weekday: 'long', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDay(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatHour(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false });
}

function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round((degrees % 360) / 45) % 8;
    return directions[index];
}

function getVisibilityStatus(visibility) {
    if (visibility > 10) return 'Excellent';
    if (visibility > 5) return 'Good';
    if (visibility > 1) return 'Moderate';
    return 'Poor';
}

function getUVLevelText(index) {
    if (index <= 2) return 'Low';
    if (index <= 5) return 'Moderate';
    if (index <= 7) return 'High';
    if (index <= 10) return 'Very High';
    return 'Extreme';
}

function getAQIText(aqi) {
    switch(aqi) {
        case 1: return 'Good';
        case 2: return 'Fair';
        case 3: return 'Moderate';
        case 4: return 'Poor';
        case 5: return 'Very Poor';
        default: return 'Unknown';
    }
}

function getAQIClass(aqi) {
    switch(aqi) {
        case 1: return 'aqi-good';
        case 2: return 'aqi-moderate';
        case 3: return 'aqi-unhealthy-sensitive';
        case 4: return 'aqi-unhealthy';
        case 5: return 'aqi-very-unhealthy';
        default: return '';
    }
}

// UI State Functions
function showLoading() {
    loadingContainer.classList.remove('hidden');
    errorContainer.classList.add('hidden');
    weatherContent.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    loadingContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    weatherContent.classList.add('hidden');
}

function showWeatherContent() {
    loadingContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    weatherContent.classList.remove('hidden');
}