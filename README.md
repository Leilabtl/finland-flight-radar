# 🇫🇮 Suomi Radar - Finland Live Flight Tracker

**Suomi Radar** is a premium, real-time aircraft tracking application focused on Finnish airspace. It combines high-density ADS-B data from FlightRadar24 with live aviation weather (METAR) to create a professional-grade radar dashboard.

![Suomi Radar Dashboard Screenshot](file:///C:/Users/leila/.gemini/antigravity/brain/03ba89fe-2178-4fa9-a7d8-83ef24bd9107/flight_radar_main_page_1773826695532.png)

## ✨ Core Features

-   🏠 **High-Density ADS-B Engine:** Tracks dozens of flights across Finland in real-time using the FlightRadar24 public data feed.
-   🌡️ **Live Airport Weather:** Real-time METAR observations (Temperature, Wind, Visibility) for major hubs:
    -   **Helsinki-Vantaa (HEL/EFHK)**
    -   **Oulu (OUL/EFOU)**
    -   **Tampere-Pirkkala (TMP/EFTP)**
-   📋 **Interactive Flight Boards:** View simulated live departures and arrivals for each major hub.
-   ✈️ **Detailed Tracking:** Click any aircraft on the map to see its:
    -   **Route** (Origin ➔ Destination)
    -   **Ground Speed** (converted to km/h)
    -   **Altitude** (converted to meters)
    -   **Heading & Aircraft Type**
-   🎨 **Glassmorphic UI:** Modern, dark-mode technical interface with high-performance flight path interpolation (smooth plane movement).

## 🛠️ Technology Stack

-   **Frontend:** Vite, Vanilla JavaScript, Leaflet.js
-   **Styling:** Modern CSS3 with Glassmorphism and Backdrop Filters
-   **Backend Proxy:** Node.js Express server with Axios (bypasses CORS & rate-limiting)
-   **Data Sources:** FlightRadar24 (ADS-B), Aviation Weather Center (METAR)

## 🚀 Getting Started

To run this application on your local machine, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Radar Dashboard (Terminal 1)
```bash
npm run dev
```
By default, the app will open at `http://localhost:5173`.

### 3. Start the Data Proxy (Terminal 2)
**Crucial:** The dashboard requires the local proxy to bypass browser security and fetch live data.
```bash
node proxy.js
```
The proxy runs on `http://localhost:3030`.

## 📜 Credits
- Data provided by FlightRadar24 and Aviation Weather Center.
- UI built for Finland aviation enthusiasts.

---
*Created as part of the AI in Practice course.*
