/**
 * Cookie styles loader
 * 
 * This script asynchronously loads cookie consent styling after the page is fully loaded
 * to improve initial page load performance. It also adds the appropriate palette class
 * based on the theme settings.
 */

// Function to load cookie styles when needed
function loadCookieStyles() {
  // If styles are already loaded, don't load them again
  if (document.querySelector('link[href*="cookie-styles.css"]')) {
    return;
  }

  // Create link element for the cookie styles
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = window.theme && window.theme.assets_url ? 
    window.theme.assets_url + 'cookie-styles.css' : 
    '/assets/cookie-styles.css';
  document.head.appendChild(link);
  
  // Add the appropriate palette class to cc-main based on theme settings
  var ccMain = document.getElementById('cc-main');
  if (ccMain) {
    // The palette class should be available in a theme variable
    // If not available, add palette-one as default
    var palette = window.theme && window.theme.cookiePalette ? 
      window.theme.cookiePalette : 
      'one';
    
    ccMain.classList.add('palette-' + palette);
  }
}

// Load cookie styles when the page is fully loaded
if (document.readyState === 'complete') {
  loadCookieStyles();
} else {
  window.addEventListener('load', loadCookieStyles);
}

// Add a listener for cookie consent initialization
window.addEventListener('cookie-consent-ui-initialized', loadCookieStyles);

// If consent already exists when this script runs, apply styles immediately
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('cc-main')) {
    loadCookieStyles();
  }
});