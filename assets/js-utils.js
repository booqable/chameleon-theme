/**
 * Utilities (optional, load as needed)
 * Depends on js-utils-core.js being loaded first
 */

// Ensure Utils exists even if core wasn't loaded (defensive coding)
window.Utils = window.Utils || {};
window.$ = window.Utils;

// Element dimension calculations with transform support
Utils.getDimensions = (element) => {
  if (!element) return { width: 0, height: 0 };
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height
  }
}

// Event triggering with cross-browser compatibility
Utils.triggerEvent = (element, eventType) => {
  if (!element) return;
  const isFunction = $.is(element[eventType], 'function'),
        isString = $.is(eventType, 'string');
  const eventFallback = () => {
    const event = typeof eventType === 'string'
      ? new Event(eventType, {bubbles: true})
      : eventType;
    element.dispatchEvent(event);
  }

  element[eventType] && isString && isFunction
    ? element[eventType]()
    : eventFallback();
}

// Sibling element traversal
Utils.getSibling = (element, selector, direction) => {
  if (!element) return null;

  const siblingHandler = (property) => {
    let sibling = element[property];
    while (sibling) {
      if (sibling.matches(selector)) return sibling;
      sibling = sibling[property];
    }
    return null;
  }

  if (direction === 'prev') {
    return siblingHandler('previousElementSibling');
  } else if (direction === 'next') {
    return siblingHandler('nextElementSibling');
  }

  return null;
}

// Touch device detection
Utils.isTouchDevice = () => {
  return (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  )
}
