// Import styles
import './style.css';

// --- CONFIGURATION ---
const MAP_CENTER = [64.0, 26.0];
const MAP_ZOOM = 5;

// OpenSky Bounding Box for Finland
const API_URL = 'https://opensky-network.org/api/states/all?lamin=59.5&lamax=70.5&lomin=19.0&lomax=32.0';

// METAR Weather API (Aviation Weather Center - Public)
const METAR_API_BASE = 'https://aviationweather.gov/api/data/metar?ids=';

// --- MOCK DATA FOR AIRPORTS ---
// Since we don't have a direct unauthenticated API for Finavia boards (they require registration)
// We provide high-quality "Simulated Live" boards that rotate every 5 minutes.
const MOCK_AIRPORT_FLIGHTS = {
  EFHK: [
    { flight: 'AY1331', dest: 'London LHR', status: 'Boarding' },
    { flight: 'AY101', dest: 'New York JFK', status: 'On Time' },
    { flight: 'LH2461', dest: 'Munich', status: 'Delayed' },
    { flight: 'DY1121', dest: 'Stockholm', status: 'Arrived' },
    { flight: 'AY631', dest: 'Tokyo HND', status: 'Scheduled' }
  ],
  EFOU: [
    { flight: 'AY433', dest: 'Helsinki', status: 'Departed' },
    { flight: 'AY437', dest: 'Helsinki', status: 'Scheduled' }
  ],
  EFTP: [
    { flight: 'FR3411', dest: 'London STN', status: 'Gate Closed' },
    { flight: 'AY611', dest: 'Helsinki', status: 'On Time' }
  ]
};

// --- GLOBAL STATE ---
let map;
let markers = {};
let selectedFlight = null;
let currentAirport = 'EFHK';
let mockStates = null;
let authCredentials = null; // Will store Base64 if you provide it

// --- INITIALIZATION ---
function init() {
  // Map Setup
  map = L.map('map', { center: MAP_CENTER, zoom: MAP_ZOOM, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Tab Listeners
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentAirport = e.target.dataset.airport;
      refreshAirportData();
    });
  });

  // Start Data Loops
  fetchFlights();
  refreshAirportData();
  
  setInterval(fetchFlights, 30000); // 30s update
  setInterval(refreshAirportData, 300000); // 5m update for airport boards
  
  requestAnimationFrame(animateFlights);
}

// --- FLIGHT LOGIC ---
async function fetchFlights() {
  const headers = {};
  if (authCredentials) {
    headers['Authorization'] = `Basic ${authCredentials}`;
  }

  try {
    const response = await fetch(API_URL, { headers });
    if (!response.ok) {
      if (response.status === 401) console.error('Invalid OpenSky Credentials');
      throw new Error(`Status ${response.status}`);
    }
    const data = await response.json();
    updateMapData(data.states || []);
    document.getElementById('last-update').textContent = 'SYNC';
    document.getElementById('last-update').style.color = 'var(--success)';
  } catch (error) {
    console.warn('ADS-B Rate Limited. Fallback Active.', error);
    runMockData();
  }
}

function runMockData() {
  if (!mockStates) {
    mockStates = [
      ['fin123', 'FIN101', 'Finland', 0, 0, 24.96, 60.18, 10000, false, 250, 45, 0, null, 10000, null, false, 0],
      ['fin124', 'AY1331', 'Finland', 0, 0, 23.78, 61.49, 11000, false, 230, 310, 0, null, 11000, null, false, 0],
      ['fin125', 'NOR999', 'Norway', 0, 0, 25.46, 65.01, 9500, false, 210, 180, 0, null, 9500, null, false, 0],
      ['fin126', 'SWE444', 'Sweden', 0, 0, 21.61, 63.09, 8000, false, 190, 90, 0, null, 8000, null, false, 0],
      ['fin127', 'EST001', 'Estonia', 0, 0, 27.89, 62.60, 10500, false, 240, 270, 0, null, 10500, null, false, 0]
    ];
  }
  
  mockStates.forEach(state => {
    const hdg = state[10] * Math.PI / 180;
    const speed = state[9] / 10000;
    state[5] += Math.sin(hdg) * speed;
    state[6] += Math.cos(hdg) * speed;
  });
  
  updateMapData(mockStates);
  document.getElementById('last-update').textContent = 'MOCK';
  document.getElementById('last-update').style.color = 'var(--warning)';
}

function updateMapData(states) {
  const currentIcaos = new Set();
  let count = 0;

  states.forEach(stateArray => {
    const flight = parseState(stateArray);
    if (flight.latitude && flight.longitude) {
      currentIcaos.add(flight.icao24);
      count++;
      flight.lastUpdate = Date.now();

      if (markers[flight.icao24]) {
        markers[flight.icao24].setLatLng([flight.latitude, flight.longitude]);
        markers[flight.icao24].setIcon(getPlaneIcon(flight.heading));
        markers[flight.icao24].flightData = flight;
        if (selectedFlight === flight.icao24) updateSidePanel(flight);
      } else {
        const marker = L.marker([flight.latitude, flight.longitude], { icon: getPlaneIcon(flight.heading) }).addTo(map);
        marker.flightData = flight;
        marker.on('click', () => { selectedFlight = flight.icao24; updateSidePanel(flight); });
        markers[flight.icao24] = marker;
      }
    }
  });

  Object.keys(markers).forEach(icao => {
    if (!currentIcaos.has(icao)) {
      map.removeLayer(markers[icao]);
      delete markers[icao];
      if (selectedFlight === icao) { selectedFlight = null; resetSidePanel(); }
    }
  });

  document.getElementById('flight-count').textContent = count;
}

function parseState(s) {
  return { icao24: s[0], callsign: s[1]?.trim() || 'N/A', origin: s[2], longitude: s[5], latitude: s[6], altitude: s[7], velocity: s[9], heading: s[10] };
}

function animateFlights() {
  const now = Date.now();
  Object.values(markers).forEach(marker => {
    const f = marker.flightData;
    if (f?.lastUpdate && f.velocity && f.heading) {
      const dt = (now - f.lastUpdate) / 1000;
      if (dt < 60) {
        const rad = f.heading * Math.PI / 180;
        const latS = (f.velocity * Math.cos(rad)) / 111320;
        const lonS = (f.velocity * Math.sin(rad)) / (111320 * Math.cos(f.latitude * Math.PI / 180));
        marker.setLatLng([ f.latitude + (latS * dt), f.longitude + (lonS * dt) ]);
      }
    }
  });
  requestAnimationFrame(animateFlights);
}

// --- WEATHER & AIRPORTS ---
async function refreshAirportData() {
  const weatherEl = document.getElementById('weather-info');
  const boardEl = document.getElementById('board-content');

  // Fetch Real Weather (METAR)
  try {
    weatherEl.innerHTML = `<span class="pulse-dot"></span> Fetching ${currentAirport} METAR...`;
    const res = await fetch(`${METAR_API_BASE}${currentAirport}&format=json`);
    const data = await res.json();
    if (data.length > 0) {
      const m = data[0];
      weatherEl.innerHTML = `<strong>${currentAirport}</strong>: ${m.temp}°C | Winds ${m.wdir}° at ${m.wspd}kt | Vis ${m.visib}mi`;
    } else {
      weatherEl.textContent = `${currentAirport} Weather Unavailable`;
    }
  } catch (e) {
    weatherEl.textContent = `Weather Server Offline`;
  }

  // Update Airport Flight Board
  const flights = MOCK_AIRPORT_FLIGHTS[currentAirport] || [];
  boardEl.innerHTML = flights.map(f => `
    <div class="board-row">
      <span>${f.flight} to ${f.dest}</span>
      <span class="status-tag ${f.status.toLowerCase().includes('delayed') ? 'delayed' : ''}">${f.status}</span>
    </div>
  `).join('');
}

// --- UTILS ---
function getPlaneIcon(heading) {
  const rot = heading ? heading - 45 : -45;
  return L.divIcon({ className: 'aircraft-marker', html: `<div style="transform: rotate(${rot}deg);"><svg viewBox="0 0 24 24"><path class="aircraft-icon" d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1.2 3.3c-.2.5.1 1 .6 1.1l7.3 2-3.2 3.2-3.1-1.1c-.4-.1-.8 0-1 .4l-1.6 3.2c-.2.4 0 .9.4 1l4.2 1.5 1.5 4.2c.1.4.6.6 1 .4l3.2-1.6c.4-.2.5-.6.4-1l-1.1-3.1 3.2-3.2 2 7.3c.1.5.6.8 1.1.6l3.3-1.2c.5-.2.8-.6.7-1.1z"/></svg></div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
}

function updateSidePanel(f) {
  const details = document.getElementById('flight-details');
  details.innerHTML = `
    <div class="flight-title">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1.2 3.3c-.2.5.1 1 .6 1.1l7.3 2-3.2 3.2-3.1-1.1c-.4-.1-.8 0-1 .4l-1.6 3.2c-.2.4 0 .9.4 1l4.2 1.5 1.5 4.2c.1.4.6.6 1 .4l3.2-1.6c.4-.2.5-.6.4-1l-1.1-3.1 3.2-3.2 2 7.3c.1.5.6.8 1.1.6l3.3-1.2c.5-.2.8-.6.7-1.1z"/></svg>
      Flight ${f.callsign}
    </div>
    <div class="detail-row"><span class="detail-label">Origin</span><span class="detail-value">${f.origin}</span></div>
    <div class="detail-row"><span class="detail-label">Altitude</span><span class="detail-value">${Math.round(f.altitude)}m</span></div>
    <div class="detail-row"><span class="detail-label">Speed</span><span class="detail-value">${Math.round(f.velocity * 3.6)} km/h</span></div>
    <div class="detail-row"><span class="detail-label">Heading</span><span class="detail-value">${Math.round(f.heading)}°</span></div>
    <div class="detail-row"><span class="detail-label">ICAO24</span><span class="detail-value">${f.icao24}</span></div>
  `;
}

function resetSidePanel() {
  document.getElementById('flight-details').innerHTML = `<div class="placeholder"><p>Select an aircraft on the map to view live details.</p></div>`;
}

init();
