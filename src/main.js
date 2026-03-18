// Import styles
import './style.css';

// --- CONFIGURATION ---
const MAP_CENTER = [64.0, 26.0];
const MAP_ZOOM = 5;

// ADSB.LOL API (Much more reliable and open)
// We use a point-radius fetch centered in Finland to get maximum coverage
const ADSB_API_BASE = 'https://api.adsb.lol/v2/lat/64.0/lon/26.0/dist/250';

// METAR Weather API (Aviation Weather Center - Public)
const METAR_API_BASE = 'https://aviationweather.gov/api/data/metar?ids=';

// --- HUB FLIGHTS ---
const MOCK_AIRPORT_FLIGHTS = {
  EFHK: [
    { flight: 'AY1331', dest: 'London LHR', status: 'Boarding' },
    { flight: 'AY101', dest: 'New York JFK', status: 'On Time' },
    { flight: 'LH2461', dest: 'Munich', status: 'Delayed' },
    { flight: 'DY1121', dest: 'Stockholm', status: 'Arrived' }
  ],
  EFOU: [
    { flight: 'AY437', dest: 'Helsinki', status: 'Scheduled' }
  ],
  EFTP: [
    { flight: 'FR3411', dest: 'London STN', status: 'Gate Closed' }
  ]
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
  
  setInterval(fetchFlights, 10000); // ADSB.lol is faster, let's use 10s
  setInterval(refreshAirportData, 300000);
  
  requestAnimationFrame(animateFlights);
}

// --- FLIGHT LOGIC ---
async function fetchFlights() {
  try {
    const response = await fetch(ADSB_API_BASE);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    
    // ADSB.lol returns an object with an 'ac' array (aircrafts)
    updateMapData(data.ac || []);
    
    document.getElementById('last-update').textContent = 'SYNC';
    document.getElementById('last-update').style.color = 'var(--success)';
  } catch (error) {
    console.error('ADSB Update Error:', error);
    document.getElementById('last-update').textContent = 'OFFLINE';
    document.getElementById('last-update').style.color = 'var(--danger)';
  }
}

function updateMapData(aircrafts) {
  const currentIcaos = new Set();
  let count = 0;

  aircrafts.forEach(ac => {
    // Basic validation
    if (ac.lat && ac.lon) {
      const flight = {
        icao24: ac.hex,
        callsign: ac.flight?.trim() || ac.registration?.trim() || 'N/A',
        origin: ac.t || 'Unknown Type',
        longitude: ac.lon,
        latitude: ac.lat,
        altitude: ac.alt_baro === 'ground' ? 0 : (ac.alt_baro || 0) * 0.3048, // Convert feet to meters
        velocity: (ac.gs || 0) * 0.51444, // Convert knots to m/s
        heading: ac.track || 0,
        lastUpdate: Date.now()
      };

      currentIcaos.add(flight.icao24);
      count++;

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

function animateFlights() {
  const now = Date.now();
  Object.values(markers).forEach(marker => {
    const f = marker.flightData;
    if (f?.lastUpdate && f.velocity && f.heading) {
      const dt = (now - f.lastUpdate) / 1000;
      if (dt < 30) {
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

  try {
    const res = await fetch(`${METAR_API_BASE}${currentAirport}&format=json`);
    const data = await res.json();
    if (data.length > 0) {
      const m = data[0];
      weatherEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div><strong>${currentAirport}</strong>: ${Math.round(m.temp)}°C</div>
          <div style="font-size: 0.7rem; opacity: 0.8;">Wind: ${m.wdir}° @ ${Math.round(m.wspd)}kt | Vis: ${m.visib}mi</div>
        </div>
      `;
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
    <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${f.origin}</span></div>
    <div class="detail-row"><span class="detail-label">Altitude</span><span class="detail-value">${Math.round(f.altitude)}m</span></div>
    <div class="detail-row"><span class="detail-label">Speed</span><span class="detail-value">${Math.round(f.velocity * 3.6)} km/h</span></div>
    <div class="detail-row"><span class="detail-label">Heading</span><span class="detail-value">${Math.round(f.heading)}°</span></div>
    <div class="detail-row"><span class="detail-label">ICAO24</span><span class="detail-value">${f.icao24.toUpperCase()}</span></div>
  `;
}

function resetSidePanel() {
  document.getElementById('flight-details').innerHTML = `<div class="placeholder"><p>Select an aircraft on the map to view live details.</p></div>`;
}

init();
