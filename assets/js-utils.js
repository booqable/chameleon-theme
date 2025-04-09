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
