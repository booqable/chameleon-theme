/**
 * Intersection Observer utility functions
 * Critical utilities for performance optimization
 */

// Create a namespace for intersection utilities
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
