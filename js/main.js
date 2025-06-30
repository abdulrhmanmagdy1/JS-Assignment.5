const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// DOM Elements
const searchInput = document.getElementById("search")
const searchBtn = document.getElementById("searchBtn")
const locationBtn = document.getElementById("locationBtn")
const forecastContainer = document.getElementById("forecast")
const loadingElement = document.getElementById("loading")
const errorElement = document.getElementById("error")
const errorMessage = document.getElementById("errorMessage")
const quickCityButtons = document.querySelectorAll(".quick-city")
const subscribeBtn = document.getElementById("subscribeBtn")
const newsletterEmail = document.getElementById("newsletterEmail")
const suggestionsDropdown = document.getElementById("suggestions")

// Search suggestions variables
let searchTimeout
let currentSuggestionIndex = -1
let suggestions = []

// Event Listeners
searchInput.addEventListener("input", handleSearchInput)
searchInput.addEventListener("keydown", handleKeyNavigation)
searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim().length >= 2) {
    showSuggestions()
  }
})

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    hideSuggestions()
  }
})

searchBtn.addEventListener("click", handleSearch)
locationBtn.addEventListener("click", getCurrentLocation)

// Quick city buttons
quickCityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const city = button.getAttribute("data-city")
    searchInput.value = city
    hideSuggestions()
    search(city)
  })
})

// Newsletter subscription
subscribeBtn.addEventListener("click", () => {
  const email = newsletterEmail.value.trim()
  if (email && isValidEmail(email)) {
    alert("Thank you for subscribing to our newsletter!")
    newsletterEmail.value = ""
  } else {
    alert("Please enter a valid email address.")
  }
})

// Search Input Handler with Debouncing
function handleSearchInput(e) {
  const query = e.target.value.trim()

  // Clear previous timeout
  clearTimeout(searchTimeout)

  // Reset suggestion index
  currentSuggestionIndex = -1

  if (query.length >= 2) {
    // Show loading in suggestions
    showSuggestionsLoading()

    // Debounce the search to avoid too many API calls
    searchTimeout = setTimeout(() => {
      searchCities(query)
    }, 300)
  } else {
    hideSuggestions()
  }
}

// Keyboard Navigation for Suggestions
function handleKeyNavigation(e) {
  const suggestionItems = document.querySelectorAll(".suggestion-item")

  if (suggestionItems.length === 0) return

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault()
      currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestionItems.length - 1)
      updateSuggestionSelection(suggestionItems)
      break

    case "ArrowUp":
      e.preventDefault()
      currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1)
      updateSuggestionSelection(suggestionItems)
      break

    case "Enter":
      e.preventDefault()
      if (currentSuggestionIndex >= 0 && suggestionItems[currentSuggestionIndex]) {
        selectSuggestion(suggestions[currentSuggestionIndex])
      } else {
        handleSearch()
      }
      break

    case "Escape":
      hideSuggestions()
      searchInput.blur()
      break
  }
}

// Update Suggestion Selection Visual
function updateSuggestionSelection(suggestionItems) {
  suggestionItems.forEach((item, index) => {
    item.classList.toggle("active", index === currentSuggestionIndex)
  })
}

// Search Cities API
async function searchCities(query) {
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/search.json?key=4874ad98a83e447bb3f131428252706&q=${encodeURIComponent(query)}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const cities = await response.json()
    suggestions = cities
    displaySuggestions(cities)
  } catch (error) {
    console.error("City search error:", error)
    hideSuggestions()
  }
}

// Display Suggestions
function displaySuggestions(cities) {
  const suggestionsList = document.querySelector(".suggestions-list")

  if (cities.length === 0) {
    suggestionsList.innerHTML = '<div class="no-suggestions">No cities found</div>'
    showSuggestions()
    return
  }

  const suggestionsHTML = cities
    .map(
      (city, index) => `
    <div class="suggestion-item" data-index="${index}">
      <div>
        <i class="bi bi-geo-alt text-primary"></i>
      </div>
      <div class="flex-grow-1">
        <div class="city-name">${city.name}</div>
        <div class="d-flex gap-2">
          ${city.region ? `<span class="region-name">${city.region}</span>` : ""}
          <span class="country-name">${city.country}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("")

  suggestionsList.innerHTML = suggestionsHTML

  // Add click listeners to suggestions
  document.querySelectorAll(".suggestion-item").forEach((item, index) => {
    item.addEventListener("click", () => {
      selectSuggestion(cities[index])
    })

    item.addEventListener("mouseenter", () => {
      currentSuggestionIndex = index
      updateSuggestionSelection(document.querySelectorAll(".suggestion-item"))
    })
  })

  showSuggestions()
}

// Show Suggestions Loading
function showSuggestionsLoading() {
  const suggestionsList = document.querySelector(".suggestions-list")
  suggestionsList.innerHTML = `
    <div class="suggestions-loading">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      Searching cities...
    </div>
  `
  showSuggestions()
}

// Select Suggestion
function selectSuggestion(city) {
  const cityName = `${city.name}, ${city.country}`
  searchInput.value = cityName
  hideSuggestions()
  search(cityName)
}

// Show/Hide Suggestions
function showSuggestions() {
  suggestionsDropdown.classList.remove("d-none")
}

function hideSuggestions() {
  suggestionsDropdown.classList.add("d-none")
  currentSuggestionIndex = -1
}

// Search Handler
function handleSearch() {
  const city = searchInput.value.trim()
  if (city) {
    hideSuggestions()
    search(city)
  }
}

// Geolocation Handler
function getCurrentLocation() {
  if (navigator.geolocation) {
    showLoading()
    locationBtn.disabled = true
    locationBtn.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i>Getting Location...'

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        searchByCoordinates(lat, lon)
      },
      (error) => {
        hideLoading()
        locationBtn.disabled = false
        locationBtn.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i>Use My Location'
        showError("Unable to get your location. Please search manually.")
        console.error("Geolocation error:", error)
      },
    )
  } else {
    showError("Geolocation is not supported by this browser.")
  }
}

// Search by coordinates
async function searchByCoordinates(lat, lon) {
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=4874ad98a83e447bb3f131428252706&q=${lat},${lon}&days=3`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    hideLoading()
    locationBtn.disabled = false
    locationBtn.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i>Use My Location'

    // Update search input with location name
    searchInput.value = data.location.name

    displayWeather(data.location, data.current, data.forecast.forecastday)
  } catch (error) {
    hideLoading()
    locationBtn.disabled = false
    locationBtn.innerHTML = '<i class="bi bi-geo-alt-fill me-2"></i>Use My Location'
    showError("Unable to fetch weather data for your location.")
    console.error("Weather API Error:", error)
  }
}

// Weather API Function
async function search(city) {
  showLoading()
  hideError()

  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=4874ad98a83e447bb3f131428252706&q=${city}&days=3`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    hideLoading()
    displayWeather(data.location, data.current, data.forecast.forecastday)
  } catch (error) {
    hideLoading()
    showError("Unable to fetch weather data. Please check the city name and try again.")
    console.error("Weather API Error:", error)
  }
}

// Display Weather Data
function displayWeather(location, current, forecastDays) {
  if (!current || !forecastDays) return

  const currentDate = new Date(current.last_updated.replace(" ", "T"))
  const dayName = days[currentDate.getDay()]
  const dateString = `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]}`

  // Current Weather HTML
  const currentWeatherHTML = `
    <div class="weather-container fade-in">
      <div class="current-weather">
        <div class="row align-items-center">
          <div class="col-md-8">
            <div class="location">
              <i class="bi bi-geo-alt-fill text-warning me-2"></i>
              ${location.name}, ${location.country}
            </div>
            <div class="condition">${current.condition.text}</div>
            <div class="temperature">
              ${Math.round(current.temp_c)}<sup>°C</sup>
            </div>
            <div class="d-flex align-items-center mt-2">
              <small class="me-3">
                <i class="bi bi-calendar-day me-1"></i>
                ${dayName}, ${dateString}
              </small>
              <small>
                <i class="bi bi-thermometer-half me-1"></i>
                Feels like ${Math.round(current.feelslike_c)}°C
              </small>
            </div>
          </div>
          <div class="col-md-4 text-center">
            <img src="https:${current.condition.icon}" alt="${current.condition.text}" class="weather-icon">
          </div>
        </div>
        
        <div class="weather-details">
          <div class="weather-detail">
            <i class="bi bi-droplet-fill text-info"></i>
            <div class="value">${current.humidity}%</div>
            <div class="label">Humidity</div>
          </div>
          <div class="weather-detail">
            <i class="bi bi-wind text-success"></i>
            <div class="value">${current.wind_kph} km/h</div>
            <div class="label">Wind Speed</div>
          </div>
          <div class="weather-detail">
            <i class="bi bi-compass text-warning"></i>
            <div class="value">${current.wind_dir}</div>
            <div class="label">Wind Direction</div>
          </div>
          <div class="weather-detail">
            <i class="bi bi-eye-fill text-primary"></i>
            <div class="value">${current.vis_km} km</div>
            <div class="label">Visibility</div>
          </div>
          <div class="weather-detail">
            <i class="bi bi-speedometer2 text-danger"></i>
            <div class="value">${current.pressure_mb} mb</div>
            <div class="label">Pressure</div>
          </div>
          <div class="weather-detail">
            <i class="bi bi-sun-fill text-warning"></i>
            <div class="value">${current.uv}</div>
            <div class="label">UV Index</div>
          </div>
        </div>
      </div>
      
      <div class="forecast-container">
        ${generateForecastCards(forecastDays)}
      </div>
    </div>
  `

  forecastContainer.innerHTML = currentWeatherHTML
}

// Generate Forecast Cards
function generateForecastCards(forecastDays) {
  let forecastHTML = ""

  for (let i = 1; i < forecastDays.length; i++) {
    const day = forecastDays[i]
    const date = new Date(day.date.replace(" ", "T"))
    const dayName = days[date.getDay()]
    const dateString = `${date.getDate()} ${monthNames[date.getMonth()]}`

    forecastHTML += `
      <div class="forecast-card slide-up" style="animation-delay: ${i * 0.1}s">
        <div class="day">${dayName}</div>
        <div class="date">${dateString}</div>
        <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" class="weather-icon">
        <div class="temperature">
          ${Math.round(day.day.maxtemp_c)}°
          <span class="min-temp">${Math.round(day.day.mintemp_c)}°</span>
        </div>
        <div class="condition">${day.day.condition.text}</div>
        <div class="mt-2">
          <small class="text-muted">
            <i class="bi bi-droplet-fill me-1"></i>${day.day.avghumidity}%
            <i class="bi bi-wind ms-2 me-1"></i>${Math.round(day.day.maxwind_kph)} km/h
          </small>
        </div>
      </div>
    `
  }

  return forecastHTML
}

// Utility Functions
function showLoading() {
  loadingElement.classList.remove("d-none")
}

function hideLoading() {
  loadingElement.classList.add("d-none")
}

function showError(message) {
  errorMessage.textContent = message
  errorElement.classList.remove("d-none")
}

function hideError() {
  errorElement.classList.add("d-none")
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Initialize with default city
document.addEventListener("DOMContentLoaded", () => {
  search("Cairo")
})
