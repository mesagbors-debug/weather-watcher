const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const geoButton = document.getElementById('geoButton');
const statusText = document.getElementById('statusText');
const weatherSection = document.getElementById('weatherSection');
const locationName = document.getElementById('locationName');
const weatherSummary = document.getElementById('weatherSummary');
const currentTemp = document.getElementById('currentTemp');
const windSpeed = document.getElementById('windSpeed');
const tempRange = document.getElementById('tempRange');
const sunriseTime = document.getElementById('sunriseTime');
const sunsetTime = document.getElementById('sunsetTime');
const forecastGrid = document.getElementById('forecastGrid');

const weatherCodes = {
  0: { icon: '☀️', label: 'Clear sky' },
  1: { icon: '🌤️', label: 'Mainly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Depositing rime fog' },
  51: { icon: '🌦️', label: 'Light drizzle' },
  53: { icon: '🌦️', label: 'Moderate drizzle' },
  55: { icon: '🌧️', label: 'Dense drizzle' },
  56: { icon: '🌧️', label: 'Freezing drizzle' },
  57: { icon: '🌧️', label: 'Freezing drizzle' },
  61: { icon: '🌧️', label: 'Light rain' },
  63: { icon: '🌧️', label: 'Moderate rain' },
  65: { icon: '⛈️', label: 'Heavy rain' },
  66: { icon: '⛈️', label: 'Freezing rain' },
  67: { icon: '⛈️', label: 'Heavy freezing rain' },
  71: { icon: '❄️', label: 'Light snow' },
  73: { icon: '❄️', label: 'Moderate snow' },
  75: { icon: '❄️', label: 'Heavy snow' },
  77: { icon: '🌨️', label: 'Snow grains' },
  80: { icon: '🌧️', label: 'Rain showers' },
  81: { icon: '🌧️', label: 'Heavy rain showers' },
  82: { icon: '⛈️', label: 'Violent rain showers' },
  85: { icon: '❄️', label: 'Snow showers' },
  86: { icon: '❄️', label: 'Heavy snow showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm with hail' },
  99: { icon: '⛈️', label: 'Thunderstorm with heavy hail' }
};

const unitSelect = document.getElementById('unitSelect');

function getUnit() {
  return localStorage.getItem('weather-units') || 'celsius';
}

function getWindUnit(unit) {
  return unit === 'celsius' ? 'km/h' : 'mph';
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(value) {
  return new Date(value).toLocaleDateString([], { weekday: 'short' });
}

function updateStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? '#ff9b9b' : '';
}

async function fetchLocationByCity(city) {
  const encoded = encodeURIComponent(city);
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=5&language=en&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Location request failed.');
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('No matching locations found.');
  }

  return data.results[0];
}

async function fetchWeather(lat, lon, timezone) {
  const unit = getUnit();
  const tempUnitParam = unit === 'celsius' ? 'celsius' : 'fahrenheit';
  const windUnitParam = unit === 'celsius' ? 'kmh' : 'mph';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=${encodeURIComponent(timezone)}&temperature_unit=${tempUnitParam}&windspeed_unit=${windUnitParam}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Weather request failed.');
  }

  return response.json();
}

function renderWeather(location, weather) {
  const code = weather.current_weather.weathercode;
  const currentLabel = weatherCodes[code]?.label || 'Weather';
  const currentIcon = weatherCodes[code]?.icon || '🌈';

  locationName.textContent = `${location.name}, ${location.country}`;
  weatherSummary.textContent = `${currentIcon} ${currentLabel}`;
  const unit = getUnit();
  const unitSymbol = unit === 'celsius' ? '°C' : '°F';
  const windUnitLabel = getWindUnit(unit);

  currentTemp.textContent = `${Math.round(weather.current_weather.temperature)}${unitSymbol}`;
  windSpeed.textContent = `${Math.round(weather.current_weather.windspeed)} ${windUnitLabel}`;
  tempRange.textContent = `${Math.round(weather.daily.temperature_2m_max[0])}${unitSymbol} / ${Math.round(weather.daily.temperature_2m_min[0])}${unitSymbol}`;
  sunriseTime.textContent = formatTime(weather.daily.sunrise[0]);
  sunsetTime.textContent = formatTime(weather.daily.sunset[0]);

  forecastGrid.innerHTML = '';
  weather.daily.time.forEach((date, index) => {
    const code = weather.daily.weathercode[index];
    const icon = weatherCodes[code]?.icon || '🌈';
    const label = weatherCodes[code]?.label || 'Forecast';

    const card = document.createElement('article');
    card.className = 'forecast-card';
    card.innerHTML = `
      <h3>${formatDay(date)}</h3>
      <div class="icon">${icon}</div>
      <div>${label}</div>
      <div class="temp-range">
        <span>${Math.round(weather.daily.temperature_2m_max[index])}${unitSymbol}</span>
        <span>${Math.round(weather.daily.temperature_2m_min[index])}${unitSymbol}</span>
      </div>
    `;
    forecastGrid.appendChild(card);
  });

  weatherSection.classList.remove('hidden');
}

async function loadWeatherByCity(city) {
  try {
    updateStatus('Looking up location…');
    const location = await fetchLocationByCity(city);
    updateStatus('Loading weather forecast…');
    const weather = await fetchWeather(location.latitude, location.longitude, location.timezone);
    renderWeather(location, weather);
    updateStatus(`Showing weather for ${location.name}, ${location.country}`);
    localStorage.setItem('weather-city', city);
    // Save last coords so unit changes can reload current view
    localStorage.setItem('weather-lat', location.latitude);
    localStorage.setItem('weather-lon', location.longitude);
  } catch (error) {
    updateStatus(error.message, true);
    weatherSection.classList.add('hidden');
  }
}

async function loadWeatherByCoordinates(lat, lon) {
  try {
    updateStatus('Looking up weather for your location…');
    const location = {
      name: 'Current location',
      country: '',
      latitude: lat,
      longitude: lon,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    };
    const weather = await fetchWeather(lat, lon, location.timezone);
    renderWeather(location, weather);
    updateStatus('Showing weather for your current location.');
    localStorage.setItem('weather-lat', lat);
    localStorage.setItem('weather-lon', lon);
  } catch (error) {
    updateStatus(error.message, true);
    weatherSection.classList.add('hidden');
  }
}

searchButton.addEventListener('click', () => {
  const city = searchInput.value.trim();
  if (!city) {
    updateStatus('Enter a city name first.', true);
    return;
  }
  loadWeatherByCity(city);
});

searchInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    searchButton.click();
  }
});

geoButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    updateStatus('Geolocation is not supported by this browser.', true);
    return;
  }
  updateStatus('Acquiring location…');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      loadWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
    },
    () => {
      updateStatus('Unable to retrieve your location.', true);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

window.addEventListener('DOMContentLoaded', () => {
  const lastCity = localStorage.getItem('weather-city');
  const savedUnit = getUnit();
  if (unitSelect) unitSelect.value = savedUnit;

  if (unitSelect) {
    unitSelect.addEventListener('change', () => {
      const selected = unitSelect.value;
      localStorage.setItem('weather-units', selected);
      const lastCity = localStorage.getItem('weather-city');
      const lat = localStorage.getItem('weather-lat');
      const lon = localStorage.getItem('weather-lon');
      if (lastCity) {
        loadWeatherByCity(lastCity);
      } else if (lat && lon) {
        loadWeatherByCoordinates(parseFloat(lat), parseFloat(lon));
      }
    });
  }

  if (lastCity) {
    searchInput.value = lastCity;
    loadWeatherByCity(lastCity);
  }
});
