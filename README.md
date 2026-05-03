# 🍽️ Restaurant Finder

A mobile-friendly web app that recommends nearby restaurants using Google Maps and includes an AI-powered blind assist feature for obstacle detection.

## Features

- 📍 **Nearby Restaurant Search** — finds restaurants within a configurable radius
- 🗺️ **Interactive Map** — Google Maps with restaurant markers
- 🍴 **Restaurant Details** — price level, cuisine type, opening hours, parking, reviews
- 🧭 **Navigation** — one-tap Google Maps navigation
- 👁️ **Blind Assist** — real-time obstacle detection via camera + OpenAI Vision + voice guidance

## Setup

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies

```bash
# Root (server)
npm install

# Client
cd client
npm install
cd ..
```

### 3. Configure API keys

Edit `.env` in the root directory:

```
GOOGLE_MAPS_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

Also update `client/src/components/Map.jsx` line 10 with your Google Maps key.

#### Getting API Keys:
- **Google Maps**: https://console.cloud.google.com → Enable Maps JavaScript API + Places API
- **OpenAI**: https://platform.openai.com/api-keys

### 4. Run the app

```bash
npm run dev
```

This starts:
- Backend server at http://localhost:3001
- Frontend at http://localhost:5173

Open http://localhost:5173 in your browser (or on your phone via your local IP).

## Project Structure

```
├── server/
│   ├── index.js              # Express server
│   └── routes/
│       ├── places.js         # Google Places API proxy
│       └── vision.js         # OpenAI Vision obstacle detection
├── client/
│   └── src/
│       ├── App.jsx           # Main app with tab navigation
│       └── components/
│           ├── Map.jsx           # Google Maps + search
│           ├── RestaurantList.jsx # Sortable/filterable list
│           ├── RestaurantCard.jsx # Restaurant summary card
│           ├── RestaurantDetail.jsx # Full details + navigation
│           └── BlindAssist.jsx   # Camera + AI obstacle detection
├── .env                      # API keys (never commit this)
└── package.json
```

## Mobile Usage

To open on your phone while developing locally:
1. Find your computer's local IP (e.g. `192.168.1.x`)
2. Open `http://192.168.1.x:5173` on your phone
3. Both devices must be on the same WiFi network
