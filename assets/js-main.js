/**
 * Main Component
 *
 * Handles core functionality for the site:
 * - Date picker height calculation
 * - Window resize handling
 * - Page loaded state management
 *
 * Uses utilities like ResizeObserver, Batches DOM, etc. for better performance
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */

const MainConfig = {
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
    delay: 1000,
    resizeDelay: 500
  }
}

const MainDOM = {
  elements: {
    body: null,
    datePicker: null,
    datePickerBlock: null
  },

  cacheData: {
    datePickerHeight: 0,
    datePickerBlockHeight: 0
  },

  isResizing: false,
  resizeTimer: null,

  init() {
    this.elements.body = document.querySelector(MainConfig.selector.body);
    this.elements.datePicker = document.querySelector(MainConfig.selector.datePicker);
    this.elements.datePickerBlock = document.querySelector(MainConfig.selector.datePickerBlock);
    return this.elements;
  },

  setClassLoaded() {
    if (!this.elements.body) return;
    $.toggleClass(this.elements.body, MainConfig.modifier.loaded, true);
  },

  setClassResize() {
    if (!this.elements.body) return;

    if (!this.isResizing) {
      this.isResizing = true;
      $.batchDOM(() => {
        $.toggleClass(this.elements.body, MainConfig.modifier.resize, true);
      })
    }

    if (this.resizeTimer) clearTimeout(this.resizeTimer);

    this.resizeTimer = setTimeout(() => {
      this.isResizing = false;
      $.batchDOM(() => {
        $.toggleClass(this.elements.body, MainConfig.modifier.resize, false);
      })
    }, MainConfig.time.resizeDelay)
  },

  cleanup() {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    // Clean up state
    if (this.isResizing && this.elements.body) {
      $.toggleClass(this.elements.body, MainConfig.modifier.resize, false);
      this.isResizing = false;
    }

    // Clear cached data
    this.cacheData = {
      datePickerHeight: 0,
      datePickerBlockHeight: 0
    }

    Object.keys(this.elements).forEach(key => {
      this.elements[key] = null;
    })
  }
}

const MainHeight = {
  height: MainConfig.cssVar.datePickerHeight,
  blockHeight: MainConfig.cssVar.datePickerBlockHeight,

  // Read phase function for frameSequence
  readDatePickerDimensions() {
    if (!MainDOM.elements.datePicker) return null;

    const datePickerHeight = parseInt(MainDOM.elements.datePicker ?
      $.getDimensions(MainDOM.elements.datePicker).height : 0) || 0;

    const datePickerBlockHeight = parseInt(MainDOM.elements.datePickerBlock ?
      $.getDimensions(MainDOM.elements.datePickerBlock).height : 0) || 0;

    // Only return dimensions that have changed
    const result = {};

    if (datePickerHeight !== MainDOM.cacheData.datePickerHeight) {
      result.datePickerHeight = datePickerHeight;
      MainDOM.cacheData.datePickerHeight = datePickerHeight;
    }

    if (datePickerBlockHeight !== MainDOM.cacheData.datePickerBlockHeight) {
      result.datePickerBlockHeight = datePickerBlockHeight;
      MainDOM.cacheData.datePickerBlockHeight = datePickerBlockHeight;
    }

    return Object.keys(result).length ? result : null; // If nothing changed, return null to skip write phase
  },

  // Write phase function for frameSequence
  writeDatePickerVariables(dimensions) {
    if (!dimensions) return;
    const { datePickerHeight, datePickerBlockHeight } = dimensions;
    const setDatePickerHeight = () => {
      $.setCssVar({ key: this.height, value: datePickerHeight, unit: 'px' })
    }
    const setDatePickerBlockHeight = () => {
      $.setCssVar({ key: this.blockHeight, value: datePickerBlockHeight, unit: 'px' })
    }

    if (datePickerHeight !== undefined) setDatePickerHeight();
    if (datePickerBlockHeight !== undefined) setDatePickerBlockHeight();
  },

  calculateDatePickerHeight() {
    if (!MainDOM.elements.datePicker) return;

    // Bind the context to ensure 'this' references the MainHeight
    const readPhase = this.readDatePickerDimensions.bind(this),
          writePhase = this.writeDatePickerVariables.bind(this);

    $.frameSequence(readPhase, writePhase);
  },

  setInitialHeights() {
    $.setCssVar({ key: this.height, value: 0, unit: 'px' })
    $.setCssVar({ key: this.blockHeight, value: 0, unit: 'px' })
  }
}

const MainResize = {
  resizeObserver: null,
  heightResizeHandler: null,
  classResizeHandler: null,

  setupResizeHandlers() {
    const handleResize = () => {
      MainHeight.calculateDatePickerHeight();
      MainDOM.setClassResize();
    }

    const handleResizeSettings = {
      element: document.documentElement,
      debounceTime: 0
    }

    const handleResizeFallback = () => {
      this.heightResizeHandler = () => MainHeight.calculateDatePickerHeight();
      this.classResizeHandler = () => MainDOM.setClassResize();

      $.eventListener('add', window, 'resize', this.heightResizeHandler, { passive: true });
      $.eventListener('add', window, 'resize', this.classResizeHandler, { passive: true });
    }

    $.is($.resizeObserver, 'function')
      ? this.resizeObserver = $.resizeObserver(handleResize, handleResizeSettings)
      : handleResizeFallback();
  },

  cleanup() {
    if (this.resizeObserver && $.is(this.resizeObserver.cleanup, 'function')) {
      this.resizeObserver.cleanup();
      this.resizeObserver = null;
    }

    if (this.heightResizeHandler) {
      $.eventListener('remove', window, 'resize', this.heightResizeHandler, { passive: true });
      this.heightResizeHandler = null;
    }

    if (this.classResizeHandler) {
      $.eventListener('remove', window, 'resize', this.classResizeHandler, { passive: true });
      this.classResizeHandler = null;
    }
  }
}

const MainVisibility = {
  observer: null,

  setupIntersectionObserver() {
    if (!MainDOM.elements.datePicker) return;

    const handleIntersection = (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        MainHeight.calculateDatePickerHeight();
      })
    }

    this.observer = $.intersectionObserver(handleIntersection);
    if (!this.observer) return;
    this.observer.observe(MainDOM.elements.datePicker);
  },

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

const MainDevice = {
  getdelay() {
    return $.slowConnection()
      ? MainConfig.time.timeout * 2 // Longer delay for slow connections
      : MainConfig.time.timeout;
  },

  isInViewport(element) {
    return $.is($.inViewport, 'function') && $.inViewport(element);
  }
}

const handleMainLoading = () => {
  MainHeight.setInitialHeights();

  const body = document.querySelector(MainConfig.selector.body);
  if (body) $.toggleClass(body, MainConfig.modifier.loaded, true);
}

handleMainLoading();

const handleMain = () => {
  MainDOM.init();

  if (!MainDOM.elements.body) return null;

  MainDOM.setClassLoaded();

  // Initialize date picker height with connection-aware delay
  const calculateDatePickerHeightFallback = () => {
    setTimeout(() => {
      MainHeight.calculateDatePickerHeight();
    }, MainDevice.getdelay())
  }

  MainDOM.elements.datePicker && MainDevice.isInViewport(MainDOM.elements.datePicker)
    ? MainHeight.calculateDatePickerHeight()
    : calculateDatePickerHeightFallback();

  MainResize.setupResizeHandlers();
  MainVisibility.setupIntersectionObserver();

  const cleanup = () => {
    MainResize.cleanup();
    MainVisibility.cleanup();
    MainDOM.cleanup();
    return null;
  }

  return cleanup;
}

const initMain = () => {
  window.cleanupMain = handleMain();

  // Ensure cleanup is idempotent
  const originalCleanup = window.cleanupMain;
  window.cleanupMain = () => {
    if ($.is(originalCleanup, 'function')) {
      originalCleanup();
      window.cleanupMain = () => {}; // Replace with no-op after cleanup
    }
  }

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
  : setTimeout(initMain, MainConfig.time.timeout); // Use a short timeout to ensure body is ready
