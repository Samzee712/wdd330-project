// Alert.js
export default class Alert {
  /**
   * @param {string} dataUrl - URL to fetch alerts JSON (e.g. '/data/alerts.json')
   * @param {object} options - optional settings:
   *    position: 'top' or 'bottom' (default 'top')
   *    autoHideDuration: milliseconds to auto-hide all alerts (default 0 = no auto-hide)
   */
  constructor(dataUrl, options = {}) {
    this.dataUrl = dataUrl;
    this.options = {
      position: options.position === 'bottom' ? 'bottom' : 'top',
      autoHideDuration: typeof options.autoHideDuration === 'number' && options.autoHideDuration > 0
        ? options.autoHideDuration
        : 0,
      ...options
    };
    // localStorage keys
    this.SHOWN_ALERTS_KEY = 'shownAlerts';         // array of alert IDs dismissed
    this.CACHED_ALERTS_KEY = 'cachedAlertsData';   // optional: store last fetched alerts
  }

  /** Main entry: fetch alerts and render any new ones */
  async render() {
    let alerts;
    try {
      const res = await fetch(this.dataUrl);
      if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.status}`);
      alerts = await res.json();
      if (!Array.isArray(alerts) || alerts.length === 0) {
        return; // no alerts to show
      }
    } catch (error) {
      console.error('Alert.fetch error:', error);
      return;
    }

    // Optionally cache fetched alerts in localStorage
    try {
      const prevCached = localStorage.getItem(this.CACHED_ALERTS_KEY);
      // You could compare prevCached vs. JSON.stringify(alerts) to detect changes
      localStorage.setItem(this.CACHED_ALERTS_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.warn('Failed to cache alerts data:', e);
    }

    // Load shownAlerts from localStorage
    let shownAlerts = [];
    try {
      const stored = localStorage.getItem(this.SHOWN_ALERTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          shownAlerts = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse shownAlerts from localStorage:', e);
    }

    // Filter alerts to only those not yet shown
    const newAlerts = alerts.filter(alertObj => {
      const id = this._getAlertId(alertObj);
      return !shownAlerts.includes(id);
    });
    if (newAlerts.length === 0) {
      return; // no new alerts to display
    }

    // Build the alert section
    const section = document.createElement('section');
    section.classList.add('alert-list');
    // Style position (if desired, fixed or relative)
    // You may adjust styling via CSS; here we prepend under <main>
    // Optionally you can set fixed positioning:
    // section.style.position = 'fixed';
    // section.style.width = '100%';
    // section.style.zIndex = '1000';
    // if (this.options.position === 'top') section.style.top = '0';
    // else section.style.bottom = '0';

    // For each new alert, create a <p> element
    newAlerts.forEach(alertObj => {
      const message = alertObj.message || '';
      const background = alertObj.background || '#333';
      const color = alertObj.color || '#fff';

      const id = this._getAlertId(alertObj);

      const p = document.createElement('p');
      p.textContent = message;
      // Basic inline styles; you can move to CSS classes if preferred
      p.style.backgroundColor = background;
      p.style.color = color;
      p.style.padding = '0.75rem 2rem 0.75rem 1rem';
      p.style.margin = '0';
      p.style.position = 'relative';
      p.style.textAlign = 'center';
      p.style.fontWeight = 'bold';
      p.style.cursor = 'pointer';

      // Close button
      const closeBtn = document.createElement('span');
      closeBtn.textContent = '❌';
      closeBtn.style.position = 'absolute';
      closeBtn.style.right = '1rem';
      closeBtn.style.top = '50%';
      closeBtn.style.transform = 'translateY(-50%)';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.fontWeight = 'bold';

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        p.remove();
        // Mark this alert as shown/dismissed
        this._markAlertAsShown(id);
        // If no more <p> children, remove the section
        if (section.childElementCount === 0) {
          section.remove();
        }
      });

      p.appendChild(closeBtn);
      section.appendChild(p);

      // Optionally auto-hide after a duration per alert
      if (this.options.autoHideDuration > 0) {
        setTimeout(() => {
          if (p.parentElement) {
            p.remove();
            this._markAlertAsShown(id);
          }
          if (section.childElementCount === 0 && section.parentElement) {
            section.remove();
          }
        }, this.options.autoHideDuration);
      }
    });

    // Prepend to <main> so it's visible at top of content
    const main = document.querySelector('main');
    if (main) {
      if (this.options.position === 'top') {
        main.prepend(section);
      } else {
        main.append(section);
      }
    } else {
      // Fallback: append to body
      document.body.prepend(section);
    }
  }

  /** Compute a stable ID for an alert object */
  _getAlertId(alertObj) {
    // If alertObj.id exists and is a string/number, use it
    if (alertObj.id !== undefined && alertObj.id !== null) {
      return String(alertObj.id);
    }
    // Otherwise derive from message + background + color
    const text = (alertObj.message || '') + '|' + (alertObj.background || '') + '|' + (alertObj.color || '');
    // Simple hash: compute a short hash code
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const chr = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32-bit int
    }
    // Return as string
    return 'alert_' + hash;
  }

  /** Add an alert ID to shownAlerts in localStorage */
  _markAlertAsShown(alertId) {
    try {
      const key = this.SHOWN_ALERTS_KEY;
      let shown = [];
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) shown = parsed;
      }
      if (!shown.includes(alertId)) {
        shown.push(alertId);
        localStorage.setItem(key, JSON.stringify(shown));
      }
    } catch (e) {
      console.warn('Failed to mark alert as shown in localStorage:', e);
    }
  }
}
