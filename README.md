# 🇫🇮 Suomi Radar: Finland Live Flight Tracker

[![Vite](https://img.shields.io/badge/Frontend-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet.js-199918?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Suomi Radar** is a high-performance, real-time aviation dashboard dedicated to tracking aircraft within Finnish airspace. It merges live ADS-B data from FlightRadar24 with professional aviation weather (METAR) to provide a premium monitoring experience.

---

## 📸 Dashboard Preview

![Suomi Radar Dashboard](file:///C:/Users/leila/.gemini/antigravity/brain/3a5b76c4-e254-4c18-82dc-3088d19cdc13/flight_radar_main_page_1774806159064.png)
*Live view of the glassmorphic dashboard tracking flights over Helsinki and Tampere.*

---

## ✨ Key Features

### 📡 Real-Time ADS-B Tracking
*   **Live Data Feed:** Fetches coordinates, altitude, Heading, and speed for all active aircraft in the Finland zone.
*   **Smooth Interpolation:** Uses high-frequency frame animation to predict and animate aircraft movement between data updates.
*   **Interactive Markers:** Click any aircraft to pull up a technical detail panel.

### 🌡️ Aviation Weather (METAR)
*   **Live Airport Hubs:** Fetch real-time weather reports for:
    *   **EFHK** (Helsinki-Vantaa)
    *   **EFOU** (Oulu)
    *   **EFTP** (Tampere-Pirkkala)
*   **Technical Metrics:** Displays temperature, wind direction/speed, and visibility distance.

### 🎨 Premium Glassmorphic UI
*   **Dark Mode Optimization:** A sleek, midnight-blue interface designed for technical precision and night viewing.
*   **Interactive Sidebar:** Real-time stats on flights currently in the air.
*   **Airport Boards:** Simulated arrivals and departures for the selected major hub.

---

## 🏗️ Technical Architecture

The application is built on a modern decoupled architecture to bypass browser security constraints (CORS) and ensure high data reliability.

```mermaid
graph TD
    subgraph "Client Side (Browser)"
        UI["Vite Dashboard (Vanilla JS)"]
        Map["Leaflet.js (Engine)"]
        State["App Internal State"]
    end

    subgraph "Local Server"
        Proxy["Express Proxy (Port 3030)"]
    end

    subgraph "External Providers"
        FR24["FlightRadar24 (ADS-B Feed)"]
        AWC["Aviation Weather (METAR API)"]
    end

    UI <--> State
    State --> Map
    UI -- "GET /api/flights" --> Proxy
    UI -- "GET /api/weather" --> Proxy
    Proxy -- "HTTPS" --> FR24
    Proxy -- "HTTPS" --> AWC
```

---

## 🚀 Getting Started

To launch your own instance of Suomi Radar, follow these steps:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Execution
The app requires two concurrent processes:

**Terminal 1 (Vite Dev Server):**
```bash
npm run dev
```
*Access via [http://localhost:5173](http://localhost:5173)*

**Terminal 2 (Radar Proxy):**
```bash
node proxy.js
```
*Required for live data sync.*

---

## 📂 Project Structure

```text
├── src/
│   ├── main.js        # Core logic, map handling, & API polling
│   └── style.css      # CSS system (Glassmorphism, Animations)
├── index.html         # Application viewport structure
├── proxy.js           # Node.js backend to bypass CORS
├── package.json       # Project dependencies & scripts
└── README.md          # Technical documentation
```

---

## 🛠️ Built With
*   [Leaflet.js](https://leafletjs.com/) - Mobile-friendly interactive maps
*   [Vite](https://vitejs.dev/) - Next-generation frontend tooling
*   [Express](https://expressjs.com/) - Fast, unopinionated web framework for Node.js
*   [Axios](https://axios-http.com/) - Promise-based HTTP client

---
*Created as part of the AI in Practice course. 🇫🇮*
