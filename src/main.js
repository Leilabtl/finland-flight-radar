// Import styles
import './style.css';

// Finland Map Configuration
const MAP_CENTER = [64.0, 26.0]; // Central Finland
const MAP_ZOOM = 5;

// OpenSky API Bounding Box for Finland
const API_URL = 'https://opensky-network.org/api/states/all?lamin=59.5&lamax=70.5&lomin=19.0&lomax=32.0';

// Global state
let map;
let markers = {};
let selectedFlight = null;

// Initialize the application
function init() {
  // Initialize Leaflet map
  map = L.map('map', {
    center: MAP_CENTER,
    zoom: MAP_ZOOM,
    zoomControl: false // Add it later for better positioning if needed
  });

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // Add CartoDB Dark Matter tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);
  // Note: the tile layer is "light_all" but our CSS uses invert() and hue-rotate() 
  // to make it a beautiful custom dark glow map.

  // Fetch initial data
  fetchFlights();

  // Set interval to update every 30 seconds to avoid OpenSky rate limits
  setInterval(fetchFlights, 30000);
}

// Custom Plane Icon Generator
function getPlaneIcon(heading) {
  const rotation = heading ? heading - 45 : -45; // SVG default direction adjustment
  
  return L.divIcon({
    className: 'aircraft-marker',
    html: `
      <div style="transform: rotate(${rotation}deg);">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path class="aircraft-icon" d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1.2 3.3c-.2.5.1 1 .6 1.1l7.3 2-3.2 3.2-3.1-1.1c-.4-.1-.8 0-1 .4l-1.6 3.2c-.2.4 0 .9.4 1l4.2 1.5 1.5 4.2c.1.4.6.6 1 .4l3.2-1.6c.4-.2.5-.6.4-1l-1.1-3.1 3.2-3.2 2 7.3c.1.5.6.8 1.1.6l3.3-1.2c.5-.2.8-.6.7-1.1z"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

// Fallback Mock Data state
let mockStates = null;

// Fetch Flight Data
async function fetchFlights() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    updateMapData(data.states || []);
    
    // Update last updated time
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
  } catch (error) {
    console.warn('API Error (Likely rate limited). Using mock data for demonstration.', error);
    
    // Initialize mock data if needed
    if (!mockStates) {
      mockStates = [
        ['fin123', 'FIN1', 'Finland', 0, 0, 24.9384, 60.1699, 10000, false, 250, 45, 0, null, 10000, null, false, 0], // Near Helsinki
        ['fin124', 'AY131', 'Finland', 0, 0, 23.7871, 61.4978, 11000, false, 230, 310, 0, null, 11000, null, false, 0], // Near Tampere
        ['fin125', 'NOR99', 'Norway', 0, 0, 25.4682, 65.0121, 9500, false, 210, 180, 0, null, 9500, null, false, 0],   // Near Oulu
        ['fin126', 'SWE44', 'Sweden', 0, 0, 21.6158, 63.0951, 8000, false, 190, 90, 0, null, 8000, null, false, 0],    // Near Vaasa
        ['fin127', 'EST01', 'Estonia', 0, 0, 27.8915, 62.6010, 10500, false, 240, 270, 0, null, 10500, null, false, 0] // Near Kuopio
      ];
    }
    
    // Simulate flight movement
    mockStates.forEach(state => {
      const hdg = state[10] * Math.PI / 180;
      // 10 seconds of movement at 'velocity' m/s approx
      const speed = state[9] / 10000; 
      state[5] += Math.sin(hdg) * speed; // Longitude roughly
      state[6] += Math.cos(hdg) * speed; // Latitude roughly
    });
    
    updateMapData(mockStates);
    
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Mock)';
  }
}

// Parse OpenSky State Vector
function parseState(state) {
  return {
    icao24: state[0],
    callsign: state[1] ? state[1].trim() : 'UNKNOWN',
    originCountry: state[2],
    longitude: state[5],
    latitude: state[6],
    altitude: state[7], // baro_altitude in meters
    velocity: state[9], // velocity in m/s
    heading: state[10] // true_track
  };
}

// Update Map with new Data
function updateMapData(states) {
  const currentIcaos = new Set();

  let validFlightsCount = 0;

  states.forEach(stateArray => {
    const flight = parseState(stateArray);
    
    // Only process if we have valid coordinates
    if (flight.latitude && flight.longitude) {
      currentIcaos.add(flight.icao24);
      validFlightsCount++;

      if (markers[flight.icao24]) {
        // Update existing marker
        markers[flight.icao24].setLatLng([flight.latitude, flight.longitude]);
        markers[flight.icao24].setIcon(getPlaneIcon(flight.heading));
        
        // Update flight data stored in the marker for the click handler
        markers[flight.icao24].flightData = flight;
        
        // If this is the selected flight, live update the sidebar
        if (selectedFlight === flight.icao24) {
          updateSelectedFlightDetails(flight);
        }
      } else {
        // Create new marker
        const marker = L.marker([flight.latitude, flight.longitude], {
          icon: getPlaneIcon(flight.heading)
        }).addTo(map);

        marker.flightData = flight;
        
        marker.on('click', () => {
          selectedFlight = flight.icao24;
          updateSelectedFlightDetails(flight);
        });

        markers[flight.icao24] = marker;
      }
    }
  });

  // Remove stale markers (flights that left the area or landed)
  Object.keys(markers).forEach(icao => {
    if (!currentIcaos.has(icao)) {
      map.removeLayer(markers[icao]);
      delete markers[icao];
      
      if (selectedFlight === icao) {
        selectedFlight = null;
        clearFlightDetails();
      }
    }
  });

  // Update Stats
  document.getElementById('flight-count').textContent = validFlightsCount;
  
  // Add a bounce animation to count to indicate live refresh
  const statBox = document.getElementById('flight-count').parentElement;
  statBox.style.transform = 'scale(1.05)';
  setTimeout(() => {
    statBox.style.transform = 'scale(1)';
  }, 200);
}

// Format helpers
const formatVelocity = (mps) => mps ? Math.round(mps * 3.6) + ' km/h' : 'N/A';
const formatAltitude = (meters) => meters ? Math.round(meters) + ' m' : 'N/A';
const formatHeading = (deg) => deg ? Math.round(deg) + '°' : 'N/A';

// Update Sidebar Details
function updateSelectedFlightDetails(flight) {
  const detailsDiv = document.getElementById('flight-details');
  
  const callsign = flight.callsign || 'N/A';
  
  detailsDiv.innerHTML = `
    <div class="flight-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1.2 3.3c-.2.5.1 1 .6 1.1l7.3 2-3.2 3.2-3.1-1.1c-.4-.1-.8 0-1 .4l-1.6 3.2c-.2.4 0 .9.4 1l4.2 1.5 1.5 4.2c.1.4.6.6 1 .4l3.2-1.6c.4-.2.5-.6.4-1l-1.1-3.1 3.2-3.2 2 7.3c.1.5.6.8 1.1.6l3.3-1.2c.5-.2.8-.6.7-1.1z"/></svg>
      Flight ${callsign}
    </div>
    
    <div class="detail-row">
      <span class="detail-label">Origin Country</span>
      <span class="detail-value">${flight.originCountry}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Altitude</span>
      <span class="detail-value">${formatAltitude(flight.altitude)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Speed</span>
      <span class="detail-value">${formatVelocity(flight.velocity)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Heading</span>
      <span class="detail-value">${formatHeading(flight.heading)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">ICAO24</span>
      <span class="detail-value" style="font-family: monospace; letter-spacing: 1px;">${flight.icao24.toUpperCase()}</span>
    </div>
  `;
}

// Clear Sidebar
function clearFlightDetails() {
  const detailsDiv = document.getElementById('flight-details');
  detailsDiv.innerHTML = `
    <div class="placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.7l-1.2 3.3c-.2.5.1 1 .6 1.1l7.3 2-3.2 3.2-3.1-1.1c-.4-.1-.8 0-1 .4l-1.6 3.2c-.2.4 0 .9.4 1l4.2 1.5 1.5 4.2c.1.4.6.6 1 .4l3.2-1.6c.4-.2.5-.6.4-1l-1.1-3.1 3.2-3.2 2 7.3c.1.5.6.8 1.1.6l3.3-1.2c.5-.2.8-.6.7-1.1z"/></svg>
      <p>Select an aircraft on the map to view live details.</p>
    </div>
  `;
}

// Kick off
init();
