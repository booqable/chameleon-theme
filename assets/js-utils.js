/**
 * Observer utility functions
 * Critical utilities for performance optimization
 */

// Create a namespace for utilities
window.Utils = window.Utils || {};

/**
 * Create an IntersectionObserver with standard options
 * @param {Function} callback - Function to call when elements intersect
 * @param {Object} customOptions - Optional custom observer options
 * @returns {IntersectionObserver|null} - Observer instance or null if not supported
 */
Utils.createObserver = (callback, customOptions = {}) => {
  // Check if IntersectionObserver is supported
  if (!('IntersectionObserver' in window)) return null;

  // Default options with good performance settings
  const defaultOptions = {
    root: null, // Use viewport as root
    rootMargin: '100px', // Load a bit before they enter viewport
    threshold: 0.01 // Trigger when just 1% is visible
  }

  // Merge default with custom options
  const options = { ...defaultOptions, ...customOptions };

  // Create and return the observer
  return new IntersectionObserver(callback, options);
}

/**
 * Create a ResizeObserver with optional debounce
 * @param {Function} callback - Function to call when elements resize
 * @param {Object} options - Optional configuration
 * @param {HTMLElement} options.element - Element to observe
 * @param {number} options.debounceTime - Debounce time in ms (0 to disable)
 * @param {boolean} options.trackWidth - Whether to track window width changes
 * @returns {Object} - Observer instance and cleanup function
 */
Utils.createResizeObserver = (callback, options = {}) => {
  // Default options with good performance settings
  const defaultOptions = {
    debounceTime: 150, // Reasonable debounce default
    trackWidth: true, // Track window width by default
    element: null // No default element
  }

  // Merge with user options
  const config = { ...defaultOptions, ...options };

  // Variables for width tracking and debouncing
  let lastWindowWidth = window.innerWidth;
  let debounceTimer = null;
  let observer = null;

  // No-op if ResizeObserver is not supported
  if (!('ResizeObserver' in window)) {
    return {
      observer: null,
      cleanup: () => {}
    }
  }

  // Create wrapped callback with debounce and width tracking
  const wrappedCallback = (entries) => {
    // If tracking width, check if it changed
    if (config.trackWidth) {
      const currentWidth = window.innerWidth;
      if (currentWidth === lastWindowWidth) return;
      lastWindowWidth = currentWidth;
    }

    // If debounce is enabled, use it
    if (config.debounceTime > 0) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        window.requestAnimationFrame(() => callback(entries));
      }, config.debounceTime);
    } else {
      // Otherwise run immediately but still in rAF for performance
      window.requestAnimationFrame(() => callback(entries));
    }
  }

  // Create the observer
  observer = new ResizeObserver(wrappedCallback);

  // Observe the element if provided
  if (config.element) observer.observe(config.element);

  // Return observer and cleanup function
  return {
    observer,
    cleanup: () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    }
  }
}

/**
 * Check if an element is currently in the viewport
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} - True if element is in viewport
 */
Utils.inViewport = (element) => {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}
