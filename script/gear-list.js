// gear-list.js
import Alert from "./Alert.js";
import { initNav } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Render alert
  initNav();
  try {
    const alertInstance = new Alert('/data/alerts.json');
    alertInstance.render();
  } catch (e) {
    console.warn('Alert init failed:', e);
  }

  // 2. Load trip activities to determine needed gear
  const tripActivities = JSON.parse(localStorage.getItem('tripActivities') || '[]');
  const container = document.getElementById('gearContainer');
  if (!tripActivities.length) {
    container.innerHTML = '<p>No activities in your trip. Please add activities first.</p>';
    return;
  }

  // 3. Define mapping: activity type -> gear items
  // Example: for hiking activities, suggest list; for camping, another list.
  // You may enrich this mapping or fetch from a JSON file.
  const gearMapping = {
    hiking: [
      { name: "Hammocks", productUrl: "https://sleepoutsidesafe.netlify.app/product_listing/?category=hammocks" },
      { name: "Backpack (30L)", productUrl: "https://sleepoutsidesafe.netlify.app/product_listing/?category=backpacks"},
    ],
    camping: [
      { name: "Tent (2-person)", productUrl: "https://sleepoutsidesafe.netlify.app/product_listing/?category=tents" },
      { name: "Sleeping Bag", productUrl: "https://sleepoutsidesafe.netlify.app/product_listing/?category=sleeping-bags" },
  
    ],
    kayaking: [
      { name: "Life Jacket", productUrl: "#" },
      { name: "Dry Bag", productUrl: "#" },
      { name: "Paddle", productUrl: "#" }
    ]
    // Add or modify categories as needed
  };

  // 4. Determine which gear items to suggest based on tripActivities
  // For simplicity, if any activity has name or category containing keyword, map accordingly.
  // Better: store `act.type` when adding (e.g., 'hiking', 'camping').
  let suggestedGear = [];
  tripActivities.forEach(act => {
    const nameLower = (act.name || '').toLowerCase();
    // Simple keyword matching
    if (nameLower.includes('hike') || act.category === 'sport.hiking') {
      suggestedGear = suggestedGear.concat(gearMapping.hiking || []);
    }
    if (nameLower.includes('camp') || act.category === 'camping') {
      suggestedGear = suggestedGear.concat(gearMapping.camping || []);
    }
    if (nameLower.includes('kayak') || act.category === 'water') {
      suggestedGear = suggestedGear.concat(gearMapping.kayaking || []);
    }
    // Add more rules as needed
  });
  // Remove duplicates by item name
  suggestedGear = suggestedGear.filter((item, idx, self) =>
    idx === self.findIndex(i => i.name === item.name)
  );
  if (suggestedGear.length === 0) {
    container.innerHTML = '<p>No specific gear suggestions available for your activities.</p>';
  } else {
    // Build checklist UI
    const ul = document.createElement('ul');
    suggestedGear.forEach(item => {
      const li = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'gear_' + item.name.replace(/\s+/g, '-').toLowerCase();
      // Load checked state from localStorage if previously saved
      const saved = JSON.parse(localStorage.getItem('selectedGear') || '[]');
      if (saved.includes(item.name)) checkbox.checked = true;

      checkbox.addEventListener('change', () => {
        let sel = JSON.parse(localStorage.getItem('selectedGear') || '[]');
        if (checkbox.checked) {
          if (!sel.includes(item.name)) sel.push(item.name);
        } else {
          sel = sel.filter(n => n !== item.name);
        }
        localStorage.setItem('selectedGear', JSON.stringify(sel));
      });

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = item.name + (item.productUrl ? '' : '');
      if (item.productUrl) {
        const a = document.createElement('a');
        a.href = item.productUrl;
        a.textContent = ' (View)';
        a.target = '_blank';
        a.rel = 'noopener';
        label.appendChild(a);
      }
      li.appendChild(checkbox);
      li.appendChild(label);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  // 5. Download gear list as CSV
  const downloadBtn = document.getElementById('downloadGearListBtn');
  downloadBtn.addEventListener('click', () => {
    const saved = JSON.parse(localStorage.getItem('selectedGear') || '[]');
    if (saved.length === 0) {
      alert('No gear items selected.');
      return;
    }
    // Build CSV: header + rows
    let csv = 'Item\n';
    saved.forEach(name => {
      csv += `"${name.replace(/"/g, '""')}"\n`;
    });
    // Create blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tripName = localStorage.getItem('searchQuery') || 'gear-list';
    a.download = `${tripName}-gear-list.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
