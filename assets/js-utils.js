/**
 * Utility functions for JavaScript components
 */

// Create a namespace for utility functions
window.Utils = window.Utils || {};

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
Utils.debounce = (func, wait) => {
  let timeout;

  return (...args) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    }

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  }
}

/**
 * Add event listener to multiple nodes
 * @param {NodeList} nodes - NodeList of elements
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 */
Utils.addEventListenerToNodes = (nodes, event, handler) => {
  if (!nodes || !nodes.length) return;

  for (const node of nodes) node.addEventListener(event, handler);
}

/**
 * Trigger an event on an element
 * @param {HTMLElement} element - Element to trigger event on
 * @param {string|Event} eventType - Event type or Event object
 */
Utils.triggerEvent = (element, eventType) => {
  if (!element) return;

  if (typeof eventType === 'string' && typeof element[eventType] === 'function') {
    element[eventType]();
  } else {
    const event = typeof eventType === 'string'
      ? new Event(eventType, {bubbles: true})
      : eventType;
    element.dispatchEvent(event);
  }
}

/**
 * Create an IntersectionObserver with standard options
 * @param {Function} callback - Function to call when elements intersect
 * @param {Object} customOptions - Optional custom observer options
 * @returns {IntersectionObserver|null} - Observer instance or null if not supported
 */
Utils.createIntersectionObserver = (callback, customOptions = {}) => {
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
 * Check if an element is currently in the viewport
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} - True if element is in viewport
 */
Utils.isInViewport = (element) => {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}
