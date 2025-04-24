/**
 * Cookie styles loader
 *
 * This script loads cookie consent styling immediately when the cookie element
 * appears in the DOM using MutationObserver for optimal performance.
 *
 * @requires js-utils-core.js
 */

// Store current state to prevent unnecessary reapplication
let ccCurrentPalette = '',
    ccAppliedStyles = false,
    observer = null,
    checkInterval = null;

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

  // Batch DOM writes for better performance
  $.batchDOM(() => {
    for (const [prop, val] of Object.entries(ccStyleMap)) {
      ccMain.style.setProperty(prop, val);
    }

    ccCurrentPalette = ccPalette;
    ccAppliedStyles = true;
    ccMain.style.opacity = '1';
  })

  return true;
}

// Set up MutationObserver to watch for cookie container, with performance optimizations
const setupMutationObserver = () => {
  // Don't create an observer if one already exists
  if (observer) return observer;

  // Helper function to handle cookie container nodes
  const nodeHandler = (el) => {
    if (!el && el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.id === 'cc-main') {
      applyCookieStyles(el);
      return true;
    } else if (el.querySelector) {
      const ccMain = el.querySelector('#cc-main');
      if (ccMain) {
        applyCookieStyles(ccMain);
        return true;
      }
    }
  }

  // Create an observer instance with optimized callback
  observer = new MutationObserver((mutations) => {
    let foundCookieContainer = false;

    // Check for cookie container in added nodes
    for (let i = 0; i < mutations.length && !foundCookieContainer; i++) {
      const mutation = mutations[i];
      if (mutation.type !== 'childList') continue;

      for (let j = 0; j < mutation.addedNodes.length && !foundCookieContainer; j++) {
        foundCookieContainer = nodeHandler(mutation.addedNodes[j]);
        if (foundCookieContainer) break;
      }
    }

    // If we found the container, disconnect the observer to save resources
    if (foundCookieContainer && observer) {
      observer.disconnect();
    }
  })

  // Start observing the document body for DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  return observer;
}

// Cleanup function to avoid memory leaks
const cleanupCookiesListeners = () => {
  $.eventListener('remove', window, 'cookie-consent-ui-initialized', cookieConsentInitHandler);

  // Clean up observers and intervals
  if (observer && observer.disconnect) {
    observer.disconnect();
    observer = null;
  }

  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

// Store handler for cookie consent initialization
const cookieConsentInitHandler = () => applyCookieStyles();

applyCookieStyles();
setupMutationObserver();

// Backup: Check for cookie container a few times with longer intervals
// This is a fallback for older browsers or if the MutationObserver fails
let attempts = 0;
checkInterval = setInterval(() => {
  attempts++;

  const clearIntervalhandler = () => {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  if (document.getElementById('cc-main')) {
    applyCookieStyles();
    clearIntervalhandler();
  }

  // Stop checking after 3 attempts (fewer attempts, longer interval)
  if (attempts >= 3) clearIntervalhandler();
}, 1500)

// Apply when cookie consent UI is initialized
$.eventListener('add', window, 'cookie-consent-ui-initialized', cookieConsentInitHandler);

// Expose cleanup function to global scope for page transitions
window.cleanupCookiesListeners = cleanupCookiesListeners;
