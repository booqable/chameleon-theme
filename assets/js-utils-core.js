/**
 * Optimized Core Utilities (critical subset)
 */
window.Utils = window.Utils || {};
window.$ = window.Utils;

// Core type checking - critical for safe operation
Utils.is = (value, type) => {
  switch (type) {
    case 'function': return typeof value === 'function';
    case 'undefined': return typeof value === 'undefined';
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && !isNaN(value);
    case 'boolean': return typeof value === 'boolean';
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array': return Array.isArray(value);
    case 'null': return value === null;
    default: return false;
  }
}

// Connection speed detection - important for adaptive loading
Utils.slowConnection = () => {
  if (!navigator.connection) return false;
  const connectionType = navigator.connection.effectiveType;
  return connectionType === '2g' || connectionType === 'slow-2g';
}

// CSS variable management
Utils.setCssVar = (key, value, element = document.documentElement, unit = '') => {
  element.style.setProperty(key, `${value}${unit}`);
}

// Viewport detection - critical for responsive behavior
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

// Viewport dimensions - widely used for responsive components
Utils.viewportSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight
})

// Animation frame utilities - critical for performance
Utils.nextFrame = callback => window.requestAnimationFrame(callback);

Utils.frameSequence = (readCallback, writeCallback) => {
  return $.nextFrame(() => {
    const result = readCallback();
    $.nextFrame(() => {
      writeCallback(result);
    })
  })
}

Utils.batchDOM = callback => {
  return $.nextFrame(() => callback());
}

// Event management - most widely used utility
Utils.eventListener = (method, nodes, event, handler, options) => {
  if (!nodes) return;

  // Handle single object case
  if (nodes === window ||
      nodes === document ||
      nodes instanceof HTMLElement ||
      (typeof nodes === 'object' &&
      ($.is(nodes.addEventListener, 'function')))) {
    if (method === 'add') nodes.addEventListener(event, handler, options);
    if (method === 'remove') nodes.removeEventListener(event, handler, options);
    return;
  }

  if (!nodes.length) return;

  Array.from(nodes).forEach(node => {
    if (!node || $.is(node.addEventListener, 'function')) return;
    if (method === 'add') node.addEventListener(event, handler, options);
    if (method === 'remove') node.removeEventListener(event, handler, options);
  })
}

// Observer utilities - critical for modern performance patterns
Utils.intersectionObserver = (callback, customOptions = {}) => {
  if (!('IntersectionObserver' in window)) return null;
  const defaultOptions = {
    root: null,
    rootMargin: '100px',
    threshold: 0.01
  }
  return new IntersectionObserver(callback, { ...defaultOptions, ...customOptions });
}

Utils.resizeObserver = (callback, customOptions = {}) => {
  const defaultOptions = {
    debounceTime: 150,
    element: null,
    trackWidth: true
  }
  const options = { ...defaultOptions, ...customOptions };
  let lastWindowWidth = $.viewportSize().width,
      debounceTimer = null,
      observer = null;

  if (!('ResizeObserver' in window)) {
    return { observer: null, cleanup: () => {} };
  }

  const wrappedCallback = (entries) => {
    if (options.trackWidth) {
      const currentWidth = $.viewportSize().width;
      if (currentWidth === lastWindowWidth) return;
      lastWindowWidth = currentWidth;
    }

    const debounceTimeHandler = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        $.nextFrame(() => callback(entries));
      }, options.debounceTime);
    }

    options.debounceTime > 0
      ? debounceTimeHandler()
      : $.nextFrame(() => callback(entries));
  }

  observer = new ResizeObserver(wrappedCallback);
  if (options.element) observer.observe(options.element);

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

// Performance utilities
Utils.requestIdle = (callback, options = {}) => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  const timeout = options.timeout || 50;
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - Date.now()))
    })
  }, timeout)
}

Utils.debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      clearTimeout(timeout);
      func(...args);
    }, wait)
  }
}

// DOM utilities - for efficient class toggling
Utils.toggleClass = (element, className, force) => {
  if (!element) return;
  $.is(force, 'boolean')
    ? element.classList.toggle(className, force)
    : element.classList.toggle(className);
}

// Image loading optimization - for adaptive images
Utils.imageFormats = async () => {
  const formatSupport = { webp: false, avif: false },
        webpSrc = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
        avifSrc = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK';

  try {
    const formatCheck = (format, src) => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      })
    }

    formatSupport.webp = await formatCheck('webp', webpSrc);
    formatSupport.avif = await formatCheck('avif', avifSrc);
  } catch (e) {}
  return formatSupport;
}

// Feature detection for modern image loading
Utils.isFetchPriority = () => 'fetchPriority' in HTMLImageElement.prototype;
