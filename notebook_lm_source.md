# NotebookLM Source: Suomi Radar Project

This document serves as a consolidated source for the **Suomi Radar** project, a real-time aircraft tracking application focused on Finnish airspace.

---

## 📄 README.md
```markdown
# 🇫🇮 Suomi Radar - Finland Live Flight Tracker

**Suomi Radar** is a premium, real-time aircraft tracking application focused on Finnish airspace. It combines high-density ADS-B data from FlightRadar24 with live aviation weather (METAR) to create a professional-grade radar dashboard.

## ✨ Core Features
- 🏠 **High-Density ADS-B Engine:** Tracks dozens of flights across Finland in real-time.
- 🌡️ **Live Airport Weather:** Real-time METAR observations for HEL, OUL, TMP.
- 📋 **Interactive Flight Boards:** View simulated live departures/arrivals.
- ✈️ **Detailed Tracking:** Route, Ground Speed, Altitude, Heading.
- 🎨 **Glassmorphic UI:** Modern, dark-mode technical interface.

## 🛠️ Technology Stack
- **Frontend:** Vite, Vanilla JavaScript, Leaflet.js
- **Backend Proxy:** Node.js Express server (bypasses CORS)
```

---

## 🌐 index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Finland Live Flight Radar</title>
    <!-- Leaflet & Fonts included -->
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app">
      <div id="map"></div>
      <!-- Panels for Airport Hubs and Flight Details -->
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

---

## ⚙️ proxy.js (Backend Proxy)
```javascript
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
const PORT = 3030;

// FlightRadar24 Proxy
app.get('/api/flights', async (req, res) => {
  const url = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=70.5,59.5,19.0,32.0&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=1&estimated=1&maxage=14400&gliders=1&stats=1';
  // ... fetching logic using axios
});

// Weather (METAR) Proxy
app.get('/api/weather', async (req, res) => {
  const { ids } = req.query;
  const url = `https://aviationweather.gov/api/data/metar?format=json&ids=${ids}`;
  // ... fetching logic
});

app.listen(PORT, () => console.log(`Radar Proxy running on http://localhost:${PORT}`));
```

---

## 🧠 src/main.js (Core Logic)
```javascript
// --- CONFIGURATION ---
const MAP_CENTER = [64.0, 26.0];
const LOCAL_PROXY = 'http://localhost:3030';

// --- INITIALIZATION ---
function init() {
  map = L.map('map', { center: MAP_CENTER, zoom: 5 });
  // Set up tile layers, fetch flights, start intervals
}

// --- FLIGHT LOGIC ---
async function fetchFlights() {
  // Fetches from local proxy, processes FlightRadar24 feed format
  // Falls back to mock data if API is down
}

function updateMapData(flights) {
  // Syncs airplane markers on the map using Leaflet
}

function animateFlights() {
  // Smoothly interpolates plane positions between API updates
}

// --- WEATHER & BOARDS ---
async function refreshAirportData() {
  // Fetches METAR weather and populates airport flight boards
}
```

---

## 🎨 src/style.css (Styling)
```css
:root {
  --bg-dark: #020617;
  --accent: #38bdf8;
  --panel-bg: rgba(15, 23, 42, 0.7);
}

.glass-panel {
  backdrop-filter: blur(20px);
  background: var(--panel-bg);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Custom darker map styles via css filters */
.leaflet-layer {
  filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(100%);
}
```
