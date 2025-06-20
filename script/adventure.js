// adventure.js
import Alert from "./Alert.js";
import { initNav } from "./nav.js";

document.addEventListener('DOMContentLoaded', () => {
  // Initialize navigation (toggle & active link)
  initNav();

  // Render alerts if any
  try {
    const alertInstance = new Alert('data/alerts.json');
    alertInstance.render();
  } catch (e) {
    console.warn('Alert init failed:', e);
  }

  // Initialize back-to-top behavior
  initBackToTop();

  // Handle search form submission on homepage (or pages with #searchForm)
  const form = document.getElementById('searchForm');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const searchTerm = document.getElementById('searchInput').value.trim();
      const categoryElem = document.getElementById('categorySelect');
      const category = categoryElem ? categoryElem.value : '';
      const radiusElem = document.getElementById('radiusInput');
      const radiusKm = radiusElem ? parseFloat(radiusElem.value) : NaN;
      const radiusMeters = (!isNaN(radiusKm) && radiusKm > 0) ? radiusKm * 1000 : 25000;

      if (!searchTerm) {
        alert('Please enter a city name.');
        return;
      }
      try {
        showLoading();
        // Geocode city
        const { lon, lat } = await geocodeCity(searchTerm);
        let places = [];
        if (category === 'sport.hiking') {
          places = await fetchTrailsForCity(searchTerm, lon, lat, radiusMeters);
          places.forEach(p => p.source = 'sport.hiking');
        } else {
          places = await fetchGeoapifyPlacesByCoords(lon, lat, category, radiusMeters);
          places.forEach(p => p.source = 'geoapify');
        }
        if (!Array.isArray(places) || places.length === 0) {
          alert("No places found for this city/category within the specified radius.");
          return;
        }
        // Sort by distance
        places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        // Store results and params
        localStorage.setItem('searchResults', JSON.stringify(places));
        localStorage.setItem('searchQuery', searchTerm);
        localStorage.setItem('searchCategory', category);
        localStorage.setItem('searchRadius', radiusMeters);
        // Redirect to results page
        window.location.href = `search-results.html?q=${encodeURIComponent(searchTerm)}`;
      } catch (err) {
        console.error('Search failed:', err);
        alert('Search error: ' + err.message);
      } finally {
        hideLoading();
      }
    });
  } else {
    console.warn('Search form (#searchForm) not found on this page.');
  }

  // If on search-results.html, render results (and map)
  if (window.location.pathname.endsWith('search-results.html')) {
    renderSearchResults();
  }
});

// ------------- Utility Functions -------------

// Show/hide loading overlay
function showLoading() {
  const ov = document.getElementById('loadingOverlay');
  if (ov) {
    ov.classList.remove('hidden');
    document.body.setAttribute('aria-busy', 'true');
  }
}
function hideLoading() {
  const ov = document.getElementById('loadingOverlay');
  if (ov) {
    ov.classList.add('hidden');
    document.body.removeAttribute('aria-busy');
  }
}

// Geocode city via Geoapify
async function geocodeCity(searchTerm) {
  const apiKey = '943a5c16fe47481a84080c1f7f863489';
  const geoUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchTerm)}&limit=1&apiKey=${apiKey}`;
  let resp;
  try {
    resp = await fetch(geoUrl);
  } catch {
    throw new Error('Network error during geocoding.');
  }
  if (!resp.ok) {
    let msg = `Geocoding API error: ${resp.status}`;
    try {
      const errJson = await resp.json();
      if (errJson.message) msg += ' - ' + errJson.message;
    } catch {}
    throw new Error(msg);
  }
  let data;
  try {
    data = await resp.json();
  } catch {
    throw new Error('Invalid JSON from geocoding API.');
  }
  if (!data.features || data.features.length === 0) {
    throw new Error('City not found. Please try another location.');
  }
  const props = data.features[0].properties || {};
  const lon = props.lon, lat = props.lat;
  if (typeof lon !== 'number' || typeof lat !== 'number') {
    throw new Error('Invalid coordinates returned.');
  }
  return { lon, lat };
}

// Fetch Geoapify Places by coords
async function fetchGeoapifyPlacesByCoords(lon, lat, category, radius) {
  const apiKey = '943a5c16fe47481a84080c1f7f863489';
  const placeUrl = new URL('https://api.geoapify.com/v2/places');
  placeUrl.searchParams.set('categories', category);
  placeUrl.searchParams.set('filter', `circle:${lon},${lat},${radius}`);
  placeUrl.searchParams.set('bias', `proximity:${lon},${lat}`);
  placeUrl.searchParams.set('limit', '20');
  placeUrl.searchParams.set('apiKey', apiKey);

  let resp;
  try {
    resp = await fetch(placeUrl.toString());
  } catch {
    throw new Error('Network error during Places request.');
  }
  if (!resp.ok) {
    let text = '';
    try { text = await resp.text(); } catch {}
    let msg = `Places API error: ${resp.status}`;
    if (text) {
      try {
        const pjson = JSON.parse(text);
        if (pjson.message) msg += ' - ' + pjson.message;
        else msg += ' - ' + text;
      } catch {
        msg += ' - ' + text;
      }
    }
    throw new Error(msg);
  }
  let data;
  try {
    data = await resp.json();
  } catch {
    throw new Error('Invalid JSON from Places API.');
  }
  if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
    return [];
  }
  return data.features.map(feature => {
    const p = feature.properties || {};
    const coords = feature.geometry && feature.geometry.coordinates;
    const lon2 = Array.isArray(coords) ? coords[0] : undefined;
    const lat2 = Array.isArray(coords) ? coords[1] : undefined;
    return {
      id: p.place_id || `${p.name}-${lat2}-${lon2}`,
      name: p.name || p.street || "Unknown",
      location: `${p.city || p.county || 'Unknown'}, ${p.country || ''}`.trim().replace(/^,|,$/g, ""),
      difficulty: 'N/A',
      Latitude: lat2,
      Longitude: lon2,
      distance: typeof p.distance === 'number' ? p.distance : 0
    };
  });
}

// Fetch trails via TrailAPI for hiking
async function fetchTrailsForCity(searchTerm, cityLon, cityLat, radiusMeters) {
  const apiKey = '1e86beb749mshd532496b103bacap19ab77jsnb35cde239fc8';
  const url = `https://trailapi-trailapi.p.rapidapi.com/activity/?q-city_cont=${encodeURIComponent(searchTerm)}&q-activities_activity_type_name_eq=hiking&limit=50`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'trailapi-trailapi.p.rapidapi.com'
    }
  };
  let resp;
  try {
    resp = await fetch(url, options);
  } catch {
    throw new Error('Network error during TrailAPI request.');
  }
  if (!resp.ok) {
    throw new Error(`TrailAPI error: ${resp.status}`);
  }
  let data;
  try {
    data = await resp.json();
  } catch {
    throw new Error('Invalid JSON from TrailAPI.');
  }
  const places = data.places || [];
  const results = [];
  for (const place of places) {
    const lat2 = parseFloat(place.lat);
    const lon2 = parseFloat(place.lon);
    if (isNaN(lat2) || isNaN(lon2)) continue;
    const dist = computeDistanceMeters(cityLat, cityLon, lat2, lon2);
    if (dist > radiusMeters) continue;
    let diff = 'Unknown';
    if (place.difficulty) {
      diff = place.difficulty;
    } else if (place.activities && Array.isArray(place.activities) && place.activities.length > 0) {
      diff = place.activities[0].activity_description || diff;
    }
    results.push({
      id: place.unique_id || `${place.name}-${lat2}-${lon2}`,
      name: place.name || 'Unknown Trail',
      location: `${place.city || ''}, ${place.state || ''}`.trim().replace(/^,|,$/g, ""),
      difficulty: diff,
      Latitude: lat2,
      Longitude: lon2,
      distance: dist
    });
  }
  return results;
}

// Haversine distance
function computeDistanceMeters(lat1, lon1, lat2, lon2) {
  function toRad(deg) {
    return deg * Math.PI / 180;
  }
  const R = 6371000;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Render search results and initialize map
function renderSearchResults() {
  // Ensure nav and alerts have been initialized
  initNav();
  initBackToTop();
  try {
    const alertInstance = new Alert('data/alerts.json');
    alertInstance.render();
  } catch {}

  const stored = localStorage.getItem('searchResults');
  const results = stored ? JSON.parse(stored) : [];
  const grid = document.getElementById('activityGrid');
  const title = document.getElementById('resultsTitle');
  const searchQuery = localStorage.getItem('searchQuery') || '';
  const category = localStorage.getItem('searchCategory') || '';
  const radiusMeters = localStorage.getItem('searchRadius') || '';

  if (title) {
    title.textContent = `Results for "${searchQuery}" [Category: ${category}, Radius: ${radiusMeters/1000} km]`;
  }
  if (grid) {
    if (results.length > 0) {
      grid.innerHTML = results.map(activity => {
        const id = encodeURIComponent(activity.id);
        const source = encodeURIComponent(activity.source || 'geoapify');
        return `
        <a href="activity.html?id=${id}&source=${source}">
          <div class="activity-card" data-lat="${activity.Latitude}" data-lng="${activity.Longitude}">
            <h3>${activity.name}</h3>
            <p>Location: ${activity.location}</p>
            <p>Distance: ${Math.round(activity.distance)} meters</p>
            <p>Difficulty: ${activity.difficulty || 'N/A'}</p>
          </div>
        </a>`;
      }).join('');
      initMap(results);
    } else {
      grid.innerHTML = '<p>No activities found.</p>';
    }
  } else {
    console.warn('#activityGrid not found in DOM.');
  }
}

// Initialize Leaflet map for search results
function initMap(activities = []) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet (L) is undefined; cannot initialize map.');
    return;
  }
  const mapEl = document.getElementById('map');
  if (!mapEl) {
    console.warn('Map container (#map) not found');
    return;
  }

  // Remove previous map instance if exists
  if (mapEl._leaflet_map) {
    try {
      mapEl._leaflet_map.remove();
    } catch (e) {
      console.warn('Error removing previous Leaflet map:', e);
    }
    mapEl._leaflet_map = null;
    // Clear innerHTML so new map can attach
    mapEl.innerHTML = '';
  }

  // Show spinner overlay inside map until tiles load
  const spinnerDiv = document.createElement('div');
  spinnerDiv.className = 'spinner';
  spinnerDiv.style.position = 'absolute';
  spinnerDiv.style.top = '50%';
  spinnerDiv.style.left = '50%';
  spinnerDiv.style.transform = 'translate(-50%, -50%)';
  mapEl.style.position = 'relative';
  mapEl.appendChild(spinnerDiv);

  // Default center (USA)
  const defaultCenter = [39.8283, -98.5795];
  const map = L.map(mapEl).setView(defaultCenter, 5);
  // Store the Leaflet map instance for future removal
  mapEl._leaflet_map = map;

  const tileLayer = L.tileLayer(
    'https://maps.geoapify.com/v1/tile/positron/{z}/{x}/{y}.png?apiKey=943a5c16fe47481a84080c1f7f863489',
    {
      attribution: '© OpenMapTiles © OpenStreetMap contributors',
      maxZoom: 18,
    }
  );
  tileLayer.addTo(map);
  tileLayer.on('load', () => {
    if (spinnerDiv && spinnerDiv.parentNode) {
      spinnerDiv.remove();
    }
  });

  // If no activities or invalid coords, keep default view
  if (!Array.isArray(activities) || activities.length === 0) {
    return;
  }
  const coords = [];
  activities.forEach(activity => {
    const lat = parseFloat(activity.Latitude);
    const lon = parseFloat(activity.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      coords.push([lat, lon]);
      L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`
          <strong>${activity.name}</strong><br>
          ${activity.location}<br>
          Distance: ${Math.round(activity.distance)} m
        `);
    }
  });
  if (coords.length) {
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Back-to-top button behavior
function initBackToTop() {
  const backBtn = document.getElementById('backToTop');
  if (!backBtn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backBtn.classList.remove('hidden');
    } else {
      backBtn.classList.add('hidden');
    }
  });
  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
