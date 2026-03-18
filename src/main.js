// Import styles
import './style.css';

// --- CONFIGURATION ---
const MAP_CENTER = [64.0, 26.0];
const MAP_ZOOM = 5;

// FlightRadar24 Public Data Feed (Bounding Box for Finland)
// Bounds format: y1,y2,x1,x2 (North, South, West, East)
const FR24_URL = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=70.5,59.5,19.0,32.0&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=1&estimated=1&maxage=14400&gliders=1&stats=1';

// Proxy to bypass CORS on localhost
const PROXY = 'https://api.allorigins.win/raw?url=';
const API_URL = `${PROXY}${encodeURIComponent(FR24_URL)}`;

// METAR Weather API via Proxy
const METAR_API_BASE = `${PROXY}${encodeURIComponent('https://aviationweather.gov/api/data/metar?format=json&ids=')}`;

// --- AIRPORT BOARDS ---
const MOCK_AIRPORT_FLIGHTS = {
  EFHK: [
    { flight: 'AY1331', dest: 'London LHR', status: 'Boarding' },
    { flight: 'AY101', dest: 'New York JFK', status: 'On Time' },
    { flight: 'LH2461', dest: 'Munich', status: 'Delayed' },
    { flight: 'DY1121', dest: 'Stockholm', status: 'Arrived' }
  ],
  EFOU: [ { flight: 'AY437', dest: 'Helsinki', status: 'Scheduled' } ],
  EFTP: [ { flight: 'FR3411', dest: 'London STN', status: 'Gate Closed' } ]
};

// --- GLOBAL STATE ---
let map;
let markers = {};
let selectedFlight = null;
let currentAirport = 'EFHK';

// --- INITIALIZATION ---
function init() {
  map = L.map('map', { center: MAP_CENTER, zoom: MAP_ZOOM, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentAirport = e.target.dataset.airport;
      refreshAirportData();
    });
  });

  fetchFlights();
  refreshAirportData();
  
  setInterval(fetchFlights, 8000); // FR24 updates every few seconds
  setInterval(refreshAirportData, 300000);
  
  requestAnimationFrame(animateFlights);
}

// --- FLIGHT LOGIC ---
async function fetchFlights() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    
    // FR24 format is an object where keys are flight IDs and values are arrays
    // We filter out metadata keys like 'full_count', 'version', etc.
    const flights = Object.entries(data)
      .filter(([key, val]) => Array.isArray(val))
      .map(([id, val]) => ({
        id: id,
        icao: val[0],
        lat: val[1],
        lon: val[2],
        track: val[3],
        alt: val[4],
        speed: val[5],
        squawk: val[6],
        radar: val[7],
        type: val[8],
        reg: val[9],
        timestamp: val[10],
        origin: val[11],
        dest: val[12],
        flightNumber: val[13],
        verticalSpeed: val[15],
        callsign: val[16]
      }));

    updateMapData(flights);
    
    document.getElementById('last-update').textContent = 'LIVE';
    document.getElementById('last-update').style.color = 'var(--success)';
  } catch (error) {
    console.error('Data update error:', error);
    document.getElementById('last-update').textContent = 'OFFLINE';
    document.getElementById('last-update').style.color = 'var(--danger)';
  }
}

function updateMapData(flights) {
  const currentIds = new Set();
  let count = 0;

  flights.forEach(f => {
    if (f.lat && f.lon) {
      currentIds.add(f.id);
      count++;

      const flightData = {
        id: f.id,
        callsign: f.callsign || f.flightNumber || 'N/A',
        type: f.type || 'Unknown',
        latitude: f.lat,
        longitude: f.lon,
        heading: f.track || 0,
        altitude: f.alt * 0.3048, // feet to meters
        velocity: f.speed * 0.51444, // knots to m/s
        origin: f.origin || 'N/A',
        dest: f.dest || 'N/A',
        lastUpdate: Date.now()
      };

      if (markers[f.id]) {
        markers[f.id].setLatLng([f.lat, f.lon]);
        markers[f.id].setIcon(getPlaneIcon(f.track));
        markers[f.id].flightData = flightData;
        if (selectedFlight === f.id) updateSidePanel(flightData);
      } else {
        const marker = L.marker([f.lat, f.lon], { icon: getPlaneIcon(f.track) }).addTo(map);
        marker.flightData = flightData;
        marker.on('click', () => { selectedFlight = f.id; updateSidePanel(flightData); });
        markers[f.id] = marker;
      }
    }
  });

  Object.keys(markers).forEach(id => {
    if (!currentIds.has(id)) {
      map.removeLayer(markers[id]);
      delete markers[id];
      if (selectedFlight === id) { selectedFlight = null; resetSidePanel(); }
    }
  });

  document.getElementById('flight-count').textContent = count;
}

function animateFlights() {
  const now = Date.now();
  Object.values(markers).forEach(marker => {
    const f = marker.flightData;
    if (f?.lastUpdate && f.velocity && f.heading) {
      const dt = (now - f.lastUpdate) / 1000;
      if (dt < 20) { // Limit interpolation to prevent gliding off-screen
        const rad = f.heading * Math.PI / 180;
        const latS = (f.velocity * Math.cos(rad)) / 111320;
        const lonS = (f.velocity * Math.sin(rad)) / (111320 * Math.cos(f.latitude * Math.PI / 180));
        marker.setLatLng([ f.latitude + (latS * dt), f.longitude + (lonS * dt) ]);
      }
    }
  });
  requestAnimationFrame(animateFlights);
}

// --- WEATHER & BOARDS ---
async function refreshAirportData() {
  const weatherEl = document.getElementById('weather-info');
  const boardEl = document.getElementById('board-content');

  try {
    const res = await fetch(`${METAR_API_BASE}${currentAirport}`);
    const data = await res.json();
    if (data.contents) {
      const parsed = JSON.parse(data.contents);
      if (parsed.length > 0) {
        const m = parsed[0];
        weatherEl.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div><strong>${currentAirport}</strong>: ${Math.round(m.temp)}°C</div>
            <div style="font-size: 0.7rem; opacity: 0.8;">Wind: ${m.wdir}° @ ${Math.round(m.wspd)}kt | Vis: ${m.visib}mi</div>
          </div>
        `;
      }
    }
  } catch (e) { weatherEl.textContent = `Weather Offline`; }

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
    <div class="detail-row"><span class="detail-label">Route</span><span class="detail-value">${f.origin} ➔ ${f.dest}</span></div>
    <div class="detail-row"><span class="detail-label">Altitude</span><span class="detail-value">${Math.round(f.altitude)}m</span></div>
    <div class="detail-row"><span class="detail-label">Ground Speed</span><span class="detail-value">${Math.round(f.velocity * 3.6)} km/h</span></div>
    <div class="detail-row"><span class="detail-label">Aircraft Type</span><span class="detail-value">${f.type}</span></div>
    <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value" style="font-size: 0.7rem">${f.id}</span></div>
  `;
}

function resetSidePanel() {
  document.getElementById('flight-details').innerHTML = `<div class="placeholder"><p>Select an aircraft on the map to view live details.</p></div>`;
}

init();
