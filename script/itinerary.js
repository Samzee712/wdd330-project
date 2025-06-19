// itinerary.js
import Alert from "./Alert.js";
import { initNav } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
  // Render alerts
  initNav();
  try {
    const alertInstance = new Alert('/data/alerts.json');
    alertInstance.render();
  } catch (e) {
    console.warn('Alert init failed:', e);
  }
  initBackToTop();

  const profile = JSON.parse(localStorage.getItem('tripProfile') || 'null');
  const tripActivities = JSON.parse(localStorage.getItem('tripActivities') || '[]');
  const container = document.getElementById('itineraryContainer');
  if (!profile) {
    container.innerHTML = '<p>Please create and save a Trip Profile first.</p>';
    return;
  }
  if (!tripActivities.length) {
    container.innerHTML = '<p>No activities added to your trip. Please add activities via Activity Detail pages.</p>';
    return;
  }
  const start = new Date(profile.tripStartDate);
  const end = new Date(profile.tripEndDate);
  const dayCount = Math.round((end - start)/(1000*60*60*24)) + 1;
  if (dayCount <= 0) {
    container.innerHTML = '<p>Invalid trip dates. Please adjust your Trip Profile.</p>';
    return;
  }

  // Distribute activities
  const activities = tripActivities.slice();
  const itinerary = [];
  for (let i = 0; i < dayCount; i++) {
    itinerary.push([]);
  }
  activities.forEach((act, idx) => {
    const dayIndex = idx % dayCount;
    itinerary[dayIndex].push(act);
  });

  // Build HTML
  let html = '';
  for (let day = 0; day < dayCount; day++) {
    const date = new Date(start);
    date.setDate(start.getDate() + day);
    const dateStr = date.toDateString();
    html += `<section class="itinerary-day">
      <h2 aria-expanded="true">Day ${day+1} - ${dateStr}</h2>`;
    const acts = itinerary[day];
    if (acts.length === 0) {
      html += '<p>No activities scheduled.</p>';
    } else {
      html += '<ul>';
      acts.forEach(act => {
        const sourceParam = act.source || 'geoapify';
        html += `<li>
          <strong>${act.name}</strong><br>
          Location: ${act.location}<br>
          Distance: ${Math.round(act.distance)} m<br>
          Difficulty: ${act.difficulty || 'N/A'}<br>
          <a href="activity.html?id=${encodeURIComponent(act.id)}&source=${encodeURIComponent(sourceParam)}">View Details</a>
        </li>`;
      });
      html += '</ul>';
    }
    html += '</section>';
  }
  container.innerHTML = html;

  // Collapsible days
  document.querySelectorAll('.itinerary-day').forEach(section => {
    const header = section.querySelector('h2');
    const content = section.querySelector('ul');
    if (header && content) {
      header.setAttribute('role', 'button');
      header.addEventListener('click', () => {
        const collapsed = section.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', (!collapsed).toString());
        if (collapsed) {
          content.style.display = 'none';
        } else {
          content.style.display = 'block';
        }
      });
    }
  });

  // Overview map
  initOverviewMap(tripActivities);
});

// Overview map with all activities
function initOverviewMap(activities) {
  if (!activities.length) return;
  const mapContainer = document.createElement('div');
  mapContainer.id = 'overviewMap';
  mapContainer.style.height = '300px';
  mapContainer.style.marginTop = '20px';
  document.getElementById('itineraryContainer').appendChild(mapContainer);

  // Spinner inside map
  const spinnerDiv = document.createElement('div');
  spinnerDiv.className = 'spinner';
  spinnerDiv.style.position = 'absolute';
  spinnerDiv.style.top = '50%';
  spinnerDiv.style.left = '50%';
  spinnerDiv.style.transform = 'translate(-50%, -50%)';
  mapContainer.style.position = 'relative';
  mapContainer.appendChild(spinnerDiv);

  const defaultCenter = [39.8283, -98.5795];
  const map = L.map('overviewMap').setView(defaultCenter, 5);
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

  const coords = [];
  activities.forEach(act => {
    const lat = parseFloat(act.Latitude);
    const lon = parseFloat(act.Longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      coords.push([lat, lon]);
      L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<strong>${act.name}</strong><br>${act.location}`);
    }
  });
  if (coords.length) {
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Back-to-top
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
