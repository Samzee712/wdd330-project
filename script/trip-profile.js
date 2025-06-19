// trip-profile.js
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

  // Populate selected activities list
  const selList = document.getElementById('selectedActivitiesList');
  const tripActivities = JSON.parse(localStorage.getItem('tripActivities') || '[]');
  if (selList) {
    selList.innerHTML = '';
    if (tripActivities.length === 0) {
      selList.innerHTML = '<li>No activities added yet.</li>';
    } else {
      tripActivities.forEach(act => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        const sourceParam = act.source || 'geoapify';
        a.href = `activity.html?id=${encodeURIComponent(act.id)}&source=${encodeURIComponent(sourceParam)}`;
        a.textContent = act.name;
        li.appendChild(a);
        selList.appendChild(li);
      });
    }
  }

  // Load existing trip profile
  const form = document.getElementById('tripProfileForm');
  if (form) {
    const storedProfile = JSON.parse(localStorage.getItem('tripProfile') || 'null');
    if (storedProfile) {
      document.getElementById('tripName').value = storedProfile.tripName || '';
      document.getElementById('tripStartDate').value = storedProfile.tripStartDate || '';
      document.getElementById('tripEndDate').value = storedProfile.tripEndDate || '';
      document.getElementById('groupSize').value = storedProfile.groupSize || 1;
      document.getElementById('skillLevel').value = storedProfile.skillLevel || 'beginner';
    }
    // Date validation
    const startInput = document.getElementById('tripStartDate');
    const endInput = document.getElementById('tripEndDate');
    function validateDates() {
      if (startInput.value && endInput.value && endInput.value < startInput.value) {
        endInput.setCustomValidity('End date must be after start date.');
      } else {
        endInput.setCustomValidity('');
      }
    }
    startInput.addEventListener('change', validateDates);
    endInput.addEventListener('change', validateDates);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const tripName = document.getElementById('tripName').value.trim();
      const tripStartDate = document.getElementById('tripStartDate').value;
      const tripEndDate = document.getElementById('tripEndDate').value;
      const groupSize = parseInt(document.getElementById('groupSize').value, 10);
      const skillLevel = document.getElementById('skillLevel').value;

      if (tripEndDate < tripStartDate) {
        alert('End date must be after start date.');
        return;
      }
      if (!tripName) {
        alert('Please enter a trip name.');
        return;
      }
      const profileObj = { tripName, tripStartDate, tripEndDate, groupSize, skillLevel };
      localStorage.setItem('tripProfile', JSON.stringify(profileObj));
      alert('Trip profile saved.');
      // Optionally redirect:
      // window.location.href = 'itinerary.html';
    });
  }
});

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
