// script/nav.js
export function initNav() {
  // Highlight current link
  const navLinks = document.querySelectorAll('.site-nav .nav-list li a');
  const path = window.location.pathname.split('/').pop() || 'index.html';
  navLinks.forEach(a => {
    let href = a.getAttribute('href');
    // Normalize: if index.html, also match empty path
    if (href === path || (href === 'index.html' && (path === '' || path === 'index.html'))) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });

  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      mainNav.classList.toggle('show');
    });
    // Close nav when clicking a link (mobile)
    document.querySelectorAll('.site-nav .nav-list li a').forEach(link => {
      link.addEventListener('click', () => {
        if (mainNav.classList.contains('show')) {
          mainNav.classList.remove('show');
        }
      });
    });
  }
}
