import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());

const PORT = 3030;

// FlightRadar24 Proxy
app.get('/api/flights', async (req, res) => {
  try {
    const url = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=70.5,59.5,19.0,32.0&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=1&estimated=1&maxage=14400&gliders=1&stats=1';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching flights:', error.message);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

// Weather (METAR) Proxy
app.get('/api/weather', async (req, res) => {
  try {
    const { ids } = req.query;
    const url = `https://aviationweather.gov/api/data/metar?format=json&ids=${ids}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching weather:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

app.listen(PORT, () => {
  console.log(`Radar Proxy running on http://localhost:${PORT}`);
});
