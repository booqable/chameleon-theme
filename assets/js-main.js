/**
 * Main Component
 *
 * Handles core functionality for the site:
 * - Date picker height calculation
 * - Window resize handling
 * - Page loaded state management
 *
 * Performance optimizations:
 * - Uses ResizeObserver instead of window resize events when available
 * - Batches DOM operations using frameSequence and nextFrame
 * - Properly cleans up event listeners and observers
 * - Uses utility functions for better performance
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */
const handleMain = () => {
  const config = {
    selector: {
      body: 'body',
      datePicker: 'bq-date-picker',
      datePickerBlock: '.date-picker-instance'
    },
    modifier: {
      loaded: 'loaded',
      resize: 'resize-active'
    },
    cssVar: {
      datePickerHeight: '--date-picker-height',
      datePickerBlockHeight: '--date-picker-block-height'
    },
    time: {
      initialDelay: 1000,
      resizeTime: 500
    }
  }

  const elements = {
    body: document.querySelector(config.selector.body),
    datePicker: null,
    datePickerBlock: null
  }

  let cacheData = {
    datePickerHeight: 0,
    datePickerBlockHeight: 0
  }

  let resizeObserver = null,
      intersectionObserver = null,
      heightResizeHandler = null,
      classResizeHandler = null,
      resizeTimer = null,
      isResizing = false;

  if (!elements.body) return null;

  const setupIntersectionObserver = () => {
    if (!elements.datePicker) return;

    const handleIntersection = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) getDatePickerHeight();
      })
    }

    intersectionObserver = $.intersectionObserver(handleIntersection);
    intersectionObserver.observe(elements.datePicker);
  }

  const init = () => {
    elements.datePicker = document.querySelector(config.selector.datePicker);
    elements.datePickerBlock = document.querySelector(config.selector.datePickerBlock);

    setClassLoaded();

    const delayTime = $.slowConnection()
      ? config.time.initialDelay * 2 // Longer delay for slow connections
      : config.time.initialDelay;

    elements.datePicker && $.inViewport(elements.datePicker)
      ? getDatePickerHeight()
      : setTimeout(() => getDatePickerHeight(), delayTime);

    setupResizeHandlers();
    setupIntersectionObserver();
  }

  const setupResizeHandlers = () => {
    const handleResize = () => {
      getDatePickerHeight();
      setClassResize();
    }

    const handleResizeSettings = {
      element: document.documentElement,
      debounceTime: 0 // No debounce for immediate response
    }

    const handleResizeFallback = () => {
      heightResizeHandler = (event) => getDatePickerHeight();
      classResizeHandler = (event) => setClassResize();
      // Use passive listeners for better scrolling performance
      $.eventListener('add', window, 'resize', heightResizeHandler, { passive: true });
      $.eventListener('add', window, 'resize', classResizeHandler, { passive: true });
    }

    $.is($.resizeObserver, 'function')
      ? resizeObserver = $.resizeObserver(handleResize, handleResizeSettings)
      : handleResizeFallback();
  }

  const getDatePickerHeight = () => {
    if (!elements.datePicker) return;

    $.frameSequence(
      // Read phase: get dimensions with change detection
      () => {
        const datePickerHeight = parseInt(elements.datePicker ? $.getDimensions(elements.datePicker).height : 0) || 0,
              datePickerBlockHeight = parseInt(elements.datePickerBlock ? $.getDimensions(elements.datePickerBlock).height : 0) || 0;

        // Only return dimensions that have changed
        const result = {};
        const setDatePickerHeight = () => {
          result.datePickerHeight = datePickerHeight;
          cacheData.datePickerHeight = datePickerHeight;
        }
        const setDatePickerBlockHeight = () => {
          result.datePickerBlockHeight = datePickerBlockHeight;
          cacheData.datePickerBlockHeight = datePickerBlockHeight;
        }
        if (datePickerHeight !== cacheData.datePickerHeight) setDatePickerHeight();
        if (datePickerBlockHeight !== cacheData.datePickerBlockHeight) setDatePickerBlockHeight();

        return Object.keys(result).length ? result : null; // If nothing changed, return null to skip write phase
      },
      // Write phase: update CSS variables only if values changed
      (dimensions) => {
        if (!dimensions) return;

        if (dimensions.datePickerHeight !== undefined) {
          $.setCssVar({
            key: config.cssVar.datePickerHeight,
            value: dimensions.datePickerHeight,
            unit: 'px'
          })
        }

        if (dimensions.datePickerBlockHeight !== undefined) {
          $.setCssVar({
            key: config.cssVar.datePickerBlockHeight,
            value: dimensions.datePickerBlockHeight,
            unit: 'px'
          })
        }
      }
    )
  }

  const toggleClass = (className, add, flagUpdate = false) => {
    $.batchDOM(() => {
      if (add) {
        if (flagUpdate) isResizing = true;
        elements.body.classList.add(className);
      } else {
        if (flagUpdate) isResizing = false;
        elements.body.classList.remove(className);
      }
    })
  }

  const setClassResize = () => {
    if (!isResizing) toggleClass(config.modifier.resize, true, true);
    if (resizeTimer) clearTimeout(resizeTimer);

    // Set timer to remove class after resize has stopped
    resizeTimer = setTimeout(() => {
      toggleClass(config.modifier.resize, false, true);
    }, config.time.resizeTime);
  }

  const setClassLoaded = () => toggleClass(config.modifier.loaded, true);

  const cleanup = () => {
    // Clean up resize observer
    if (resizeObserver && $.is(resizeObserver.cleanup, 'function')) {
      resizeObserver.cleanup();
      resizeObserver = null;
    }

    // Clean up intersection observer
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }

    // Clean up event listeners with same options they were registered with
    if (heightResizeHandler) {
      $.eventListener('remove', window, 'resize', heightResizeHandler, { passive: true });
      heightResizeHandler = null;
    }

    if (classResizeHandler) {
      $.eventListener('remove', window, 'resize', classResizeHandler, { passive: true });
      classResizeHandler = null;
    }

    // Clean up timers
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    // Clean up state
    if (isResizing && elements.body) {
      elements.body.classList.remove(config.modifier.resize);
      isResizing = false;
    }

    // Clear cached data
    cacheData = null;

    // Clear element references to aid garbage collection
    Object.keys(elements).forEach(key => {
      elements[key] = null;
    });

    return null;
  }

  init();
  return cleanup;
}

const initMain = () => {
  window.cleanupMain = handleMain();

  const originalCleanup = window.cleanupMain;
  window.cleanupMain = () => {
    if ($.is(originalCleanup, 'function')) {
      originalCleanup();
      window.cleanupMain = () => {}; // Replace with no-op after cleanup
    }
  }

  // Add the cleanup handler to the themeCleanup function if it exists
  if (window.themeCleanup) {
    const originalThemeCleanup = window.themeCleanup;
    window.themeCleanup = () => {
      if (window.cleanupMain) window.cleanupMain();
      originalThemeCleanup();
    }
  }
}

$.is($.requestIdle, 'function')
  ? $.requestIdle(initMain, { timeout: 2000 })
  : setTimeout(initMain, config.time.initialDelay);
