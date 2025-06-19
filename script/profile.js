// profile.js
import Alert from "./Alert.js";
import { initNav } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
  // Render alert
  initNav();
  try {
    const alertInstance = new Alert('/data/alerts.json');
    alertInstance.render();
  } catch (e) {
    console.warn('Alert init failed:', e);
  }

  // If implementing a simple username: optional
  const userInfoDiv = document.getElementById('userInfo');
  const storedUser = localStorage.getItem('username');
  if (userInfoDiv) {
    if (storedUser) {
      userInfoDiv.innerHTML = `<p>Logged in as: <strong>${storedUser}</strong></p>`;
    } else {
      // Simple login form (not secure, just for demo)
      userInfoDiv.innerHTML = `
        <form id="loginForm">
          <label for="usernameInput">Enter your name:</label>
          <input type="text" id="usernameInput" required />
          <button type="submit">Save</button>
        </form>
      `;
      const loginForm = document.getElementById('loginForm');
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('usernameInput').value.trim();
        if (name) {
          localStorage.setItem('username', name);
          userInfoDiv.innerHTML = `<p>Logged in as: <strong>${name}</strong></p>`;
        }
      });
    }
  }

  // Display current trip details
  const tripDetailsDiv = document.getElementById('tripDetails');
  const clearBtn = document.getElementById('clearTripBtn');
  const profile = JSON.parse(localStorage.getItem('tripProfile') || 'null');
  const tripActivities = JSON.parse(localStorage.getItem('tripActivities') || '[]');

  if (profile) {
    let html = `<p><strong>Trip Name:</strong> ${profile.tripName}</p>`;
    html += `<p><strong>Dates:</strong> ${profile.tripStartDate} to ${profile.tripEndDate}</p>`;
    html += `<p><strong>Group Size:</strong> ${profile.groupSize}</p>`;
    html += `<p><strong>Skill Level:</strong> ${profile.skillLevel}</p>`;
    html += `<p><strong>Activities (${tripActivities.length}):</strong></p>`;
    if (tripActivities.length) {
      html += '<ul>';
      tripActivities.forEach(act => {
        html += `<li>${act.name}</li>`;
      });
      html += '</ul>';
    } else {
      html += '<p>No activities added yet.</p>';
    }
    tripDetailsDiv.innerHTML = html;
  } else {
    tripDetailsDiv.innerHTML = '<p>No trip profile saved. Please create one.</p>';
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your trip profile and activities?')) {
        localStorage.removeItem('tripProfile');
        localStorage.removeItem('tripActivities');
        localStorage.removeItem('selectedGear');
        // Optionally redirect to homepage
        location.reload();
      }
    });
  }
});
