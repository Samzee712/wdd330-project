// script/activity-detail.js
import Alert from "./Alert.js";
import { initNav } from './nav.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize nav and alerts
  initNav();
  try {
    const alertInstance = new Alert('/data/alerts.json');
    alertInstance.render();
  } catch (e) {
    console.warn('Alert init failed:', e);
  }
  initBackToTop();

  // Parse URL params
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  const source = params.get('source') || 'geoapify';
  if (!idParam) {
    showError('Activity ID missing in URL.');
    return;
  }
  // Decode the ID from URL
  const decodedId = decodeURIComponent(idParam);

  // Try to find in localStorage searchResults
  let storedResults = [];
  try {
    const raw = localStorage.getItem('searchResults');
    if (raw) {
      storedResults = JSON.parse(raw);
      if (!Array.isArray(storedResults)) storedResults = [];
    }
  } catch (e) {
    console.warn('Could not parse searchResults from localStorage:', e);
    storedResults = [];
  }

  // Find matching activity:
  let activityObj = storedResults.find(item => {
    // Direct match
    if (String(item.id) === decodedId) return true;
    // If stored ID might contain chars that were encoded, try compare encoded form
    if (encodeURIComponent(String(item.id)) === idParam) return true;
    return false;
  });

  let details = null;
  try {
    if (activityObj) {
      details = activityObj;
    } else if (source === 'sport.hiking') {
      // If you have a TrailAPI detail endpoint, implement here; otherwise:
      console.warn('No stored hiking data found and no detail fetch implemented for hiking.');
      alert('Details unavailable for this hiking activity.');
      return;
    } else {
      // Fetch from Geoapify Place Details API by place_id
      details = await fetchGeoapifyPlaceDetails(decodedId);
    }
  } catch (err) {
    console.error('Failed to load details:', err);
    showError('Failed to load activity details: ' + err.message);
    return;
  }

  // Ensure source field
  details.source = source;

  // Render into DOM
  renderActivityDetails(details);
  initDetailMap(details);

  // Handle Add to Trip
  const addBtn = document.getElementById('addToTripBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addToTrip(details);
      alert('Activity added to your trip profile.');
    });
  }
});

// Show an error message in the detail container
function showError(msg) {
  const container = document.getElementById('activityDetailContainer');
  if (container) {
    container.innerHTML = `<p style="color:red;font-weight:bold;">${msg}</p>`;
  } else {
    console.error('activityDetailContainer not found to display error:', msg);
  }
}

// Render the fields into the page
function renderActivityDetails(act) {
  const nameEl = document.getElementById('activityName');
  const infoEl = document.getElementById('activityInfo');
  if (nameEl) {
    nameEl.textContent = act.name || 'Unnamed Activity';
  }
  if (infoEl) {
    let html = '';
    if (act.location) {
      html += `<p><strong>Location:</strong> ${act.location}</p>`;
    }
    if (act.distance !== undefined && act.distance !== null) {
      html += `<p><strong>Distance from search center:</strong> ${Math.round(act.distance)} m</p>`;
    }
    if (act.difficulty) {
      html += `<p><strong>Difficulty:</strong> ${act.difficulty}</p>`;
    }
    if (act.address) {
      html += `<p><strong>Address:</strong> ${act.address}</p>`;
    }
    if (act.description) {
      html += `<p><strong>Description:</strong> ${act.description}</p>`;
    }
    if (act.website) {
      html += `<p><strong>Website:</strong> <a href="${act.website}" target="_blank" rel="noopener">${act.website}</a></p>`;
    }
    infoEl.innerHTML = html;
  }
}

// Initialize Leaflet map for detail page
function initDetailMap(act) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded; cannot init detail map.');
    return;
  }
  const mapEl = document.getElementById('activityMap');
  if (!mapEl) {
    console.warn('#activityMap not found');
    return;
  }
  // Remove previous map if exists
  if (mapEl._leaflet_map) {
    try {
      mapEl._leaflet_map.remove();
    } catch (e) {
      console.warn('Error removing existing map:', e);
    }
    mapEl._leaflet_map = null;
    mapEl.innerHTML = '';
  }
  // Add a spinner while tiles load
  const spinnerDiv = document.createElement('div');
  spinnerDiv.className = 'spinner';
  spinnerDiv.style.position = 'absolute';
  spinnerDiv.style.top = '50%';
  spinnerDiv.style.left = '50%';
  spinnerDiv.style.transform = 'translate(-50%, -50%)';
  mapEl.style.position = 'relative';
  mapEl.appendChild(spinnerDiv);

  const lat = parseFloat(act.Latitude);
  const lon = parseFloat(act.Longitude);
  const defaultCenter = [39.8283, -98.5795];
  const center = (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] : defaultCenter;
  const map = L.map(mapEl).setView(center, (!isNaN(lat) ? 13 : 4));

  // Store reference for potential removal later
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
    if (spinnerDiv.parentNode) spinnerDiv.remove();
  });

  if (!isNaN(lat) && !isNaN(lon)) {
    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`<strong>${act.name}</strong>`)
      .openPopup();
  }
}

// Add this activity to the trip profile in localStorage
function addToTrip(act) {
  const key = 'tripActivities';
  let arr = [];
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      arr = JSON.parse(stored);
      if (!Array.isArray(arr)) arr = [];
    }
  } catch (e) {
    arr = [];
  }
  // Avoid duplicates
  if (!arr.some(item => String(item.id) === String(act.id))) {
    arr.push(act);
    localStorage.setItem(key, JSON.stringify(arr));
  }
}

// Fetch Geoapify place details by place_id
async function fetchGeoapifyPlaceDetails(placeId) {
  const apiKey = '943a5c16fe47481a84080c1f7f863489';
  const url = new URL('https://api.geoapify.com/v2/place-details');
  url.searchParams.set('id', placeId);
  url.searchParams.set('apiKey', apiKey);
  // Optionally: you can request features via url.searchParams.set('features', 'details');
  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error(`Place Details API error: ${resp.status}`);
  }
  const data = await resp.json();
  if (!data.features || !data.features.length) {
    throw new Error('No place details found.');
  }
  const feature = data.features[0];
  const p = feature.properties || {};
  const coords = feature.geometry && feature.geometry.coordinates;
  return {
    id: placeId,
    name: p.name || 'Unknown',
    location: `${p.city || ''}${p.city && p.country ? ', ' : ''}${p.country || ''}`.trim().replace(/^,|,$/g, ""),
    Latitude: coords ? coords[1] : null,
    Longitude: coords ? coords[0] : null,
    distance: p.distance || null,
    address: p.formatted || '',
    description: p.description || '',
    website: p.website || '',
    difficulty: 'N/A'
  };
}

// Back-to-top behavior
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
