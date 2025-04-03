/**
 * Cookie styles loader
 *
 * This script loads cookie consent styling immediately when the cookie element
 * appears in the DOM using MutationObserver for optimal performance.
 */

// Store current state to prevent unnecessary reapplication
let ccCurrentPalette = '';
let ccAppliedStyles = false;

// Apply the styles to the cookie container
const applyCookieStyles = (ccMain) => {
  if (!ccMain) {
    ccMain = document.getElementById('cc-main');
    if (!ccMain) return false;
  }

  // Get the palette value from cookieSettings global object (set by Liquid)
  const ccPalette = window?.cookieSettings?.cookiePalette || 'one';

  // Skip if already applied with the same palette
  if (ccPalette === ccCurrentPalette && ccAppliedStyles) return true;

  // Apply the correct class
  ccMain.classList.remove('palette-one', 'palette-two', 'palette-three');
  ccMain.classList.add(`palette-${ccPalette}`);

  // Apply CSS variables from the style map
  const ccStyleMap = window?.cookieSettings?.cookieStyleMap || {};

  for (const [prop, val] of Object.entries(ccStyleMap)) {
    ccMain.style.setProperty(prop, val);
  }

  // Force a reflow to ensure styles are applied
  void ccMain.offsetHeight;

  // Update state
  ccCurrentPalette = ccPalette;
  ccAppliedStyles = true;

  // Make cookie container visible now that styles are applied
  setTimeout(() => { ccMain.style.opacity = '1'}, 500);

  return true;
}

// Load the cookie CSS file with high priority
const loadCookieStyles = () => {
  if (document.querySelector('link[href*="cookie-styles.css"]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = window.theme?.assets_url
    ? `${window.theme.assets_url}cookie-notice-styles.css`
    : '/assets/cookie-notice-styles.css';
  link.setAttribute('priority', 'high');

  document.head.appendChild(link);
}

// Set up MutationObserver to watch for cookie container
const setupMutationObserver = () => {
  // Create an observer instance
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this element is the cookie container
            if (node.id === 'cc-main') {
              applyCookieStyles(node);
              return;
            }

            // Check if the cookie container is a child of this element
            const ccMain = node.querySelector('#cc-main');
            if (ccMain) {
              applyCookieStyles(ccMain);
              return;
            }
          }
        }
      }
    }
  })

  // Start observing the document body for DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  return observer;
}

// Initial setup
loadCookieStyles();
applyCookieStyles();

// Set up the observer
const observer = setupMutationObserver();

// Backup: Check for cookie container a few times with longer intervals
let attempts = 0;
const checkInterval = setInterval(() => {
  attempts++;

  if (document.getElementById('cc-main')) {
    applyCookieStyles();
  }

  // Stop checking after 3 attempts (fewer attempts, longer interval)
  if (attempts >= 3) {
    clearInterval(checkInterval);
  }
}, 1500)

// Also try on DOM ready
document.addEventListener('DOMContentLoaded', () => applyCookieStyles());

// Apply when cookie consent UI is initialized
window.addEventListener('cookie-consent-ui-initialized', () => applyCookieStyles());
