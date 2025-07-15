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
    idleTimeout: 2000,
    resizeDelay: 500,
    slowConnectionDelay: 1000
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

  init () {
    this.elements.body = document.querySelector(MainConfig.selector.body)
    this.elements.datePicker = document.querySelector(MainConfig.selector.datePicker)
    this.elements.datePickerBlock = document.querySelector(MainConfig.selector.datePickerBlock)
    return this.elements
  },

  setClassLoaded () {
    if (!this.elements.body) return
    $.toggleClass(this.elements.body, MainConfig.modifier.loaded, true)
  },

  setClassResize () {
    if (!this.elements.body) return

    const target = this.elements.body,
      mod = MainConfig.modifier.resize

    const addClassHandler = () => {
      this.isResizing = true
      const addClass = () => $.toggleClass(target, mod, true)
      $.batchDOM(addClass)
    }
    const removeClassHandler = () => {
      this.isResizing = false
      const removeClass = () => $.toggleClass(target, mod, false)
      $.batchDOM(removeClass)
    }

    if (!this.isResizing) addClassHandler()
    if (this.resizeTimer) clearTimeout(this.resizeTimer)

    this.resizeTimer = setTimeout(removeClassHandler, MainConfig.time.resizeDelay)
  },

  cleanup () {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = null
    }

    // Clean up state
    if (this.isResizing && this.elements.body) {
      $.toggleClass(this.elements.body, MainConfig.modifier.resize, false)
      this.isResizing = false
    }

    // Clear cached data
    this.cacheData = {
      datePickerHeight: 0,
      datePickerBlockHeight: 0
    }

    Object.keys(this.elements).forEach((key) => {
      this.elements[key] = null
    })
  }
}

const MainHeight = {
  height: MainConfig.cssVar.datePickerHeight,
  blockHeight: MainConfig.cssVar.datePickerBlockHeight,

  readDatePickerDimensions () {
    if (!MainDOM.elements.datePicker) return null

    const datePickerHeight = parseInt(MainDOM.elements.datePicker ?
      $.getDimensions(MainDOM.elements.datePicker).height :
      0) || 0

    const datePickerBlockHeight = parseInt(MainDOM.elements.datePickerBlock ?
      $.getDimensions(MainDOM.elements.datePickerBlock).height :
      0) || 0

    // Only return dimensions that have changed
    const result = {}

    if (datePickerHeight !== MainDOM.cacheData.datePickerHeight) {
      result.datePickerHeight = datePickerHeight
      MainDOM.cacheData.datePickerHeight = datePickerHeight
    }

    if (datePickerBlockHeight !== MainDOM.cacheData.datePickerBlockHeight) {
      result.datePickerBlockHeight = datePickerBlockHeight
      MainDOM.cacheData.datePickerBlockHeight = datePickerBlockHeight
    }

    return Object.keys(result).length ? result : null // If nothing changed, return null to skip write phase
  },

  writeDatePickerVariables (dimensions) {
    if (!dimensions) return
    const { datePickerHeight, datePickerBlockHeight } = dimensions
    const setDatePickerHeight = () => {
      $.setCssVar({ key: this.height, value: datePickerHeight, unit: 'px' })
    }
    const setDatePickerBlockHeight = () => {
      $.setCssVar({ key: this.blockHeight, value: datePickerBlockHeight, unit: 'px' })
    }

    if (datePickerHeight !== undefined) setDatePickerHeight()
    if (datePickerBlockHeight !== undefined) setDatePickerBlockHeight()
  },

  async calculateDatePickerHeight () {
    if (!MainDOM.elements.datePicker) return

    // Safety check for method existence before binding
    if (!$.is(this.readDatePickerDimensions, 'function') ||
      !$.is(this.writeDatePickerVariables, 'function')) {
      console.warn('DatePicker calculation methods not available yet')
      return
    }

    // Wait for next frame to ensure DOM is ready
    await new Promise((resolve) => $.nextFrame(resolve))

    // Bind the context to ensure 'this' references the MainHeight
    const read = this.readDatePickerDimensions.bind(this),
      write = this.writeDatePickerVariables.bind(this)

    $.frameSequence(read, write)
  },

  // Safe wrapper for calculateDatePickerHeight that handles errors
  safeCalculateHeight () {
    try {
      this.calculateDatePickerHeight()
    } catch (error) {
      console.warn('Error calculating date picker height:', error)
      // Retry after a short delay
      setTimeout(() => {
        if (!MainDOM.elements.datePicker && !$.is(this.readDatePickerDimensions, 'function')) return
        this.calculateDatePickerHeight()
      }, 100)
    }
  }
}

const MainResize = {
  resizeObserver: null,

  setupResizeHandlers () {
    const handleResize = () => {
      MainHeight.safeCalculateHeight()
      MainDOM.setClassResize()
    }

    const handleResizeSettings = {
      element: document.documentElement,
      debounceTime: 0
    }

    this.resizeObserver = $.resizeObserver(handleResize, handleResizeSettings)
  },

  cleanup () {
    if (!this.resizeObserver || !$.is(this.resizeObserver.cleanup, 'function')) return
    this.resizeObserver.cleanup()
    this.resizeObserver = null
  }
}

const MainVisibility = {
  observer: null,

  setupIntersectionObserver () {
    if (!MainDOM.elements.datePicker) return

    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        MainHeight.calculateDatePickerHeight()
      })
    }

    this.observer = $.intersectionObserver(handleIntersection)
    this.observer.observe(MainDOM.elements.datePicker)
  },

  cleanup () {
    if (!this.observer) return
    this.observer.disconnect()
    this.observer = null
  }
}

const handleMainLoading = () => {
  const body = document.querySelector(MainConfig.selector.body),
    loaded = MainConfig.modifier.loaded
  if (body) $.toggleClass(body, loaded, true)
}

handleMainLoading()

const handleMain = () => {
  MainDOM.init()

  const elements = MainDOM.elements

  if (!elements.body) return null

  MainDOM.setClassLoaded()

  // Initialize date picker height calculation
  if (elements.datePicker) {
    MainHeight.safeCalculateHeight()
  }

  MainResize.setupResizeHandlers()
  MainVisibility.setupIntersectionObserver()

  const cleanup = () => {
    MainResize.cleanup()
    MainVisibility.cleanup()
    MainDOM.cleanup()
    return null
  }

  return cleanup
}

const initMain = () => {
  $.cleanup('cleanupMain', handleMain)
}

$.is($.requestIdle, 'function') ?
  $.requestIdle(initMain, { timeout: MainConfig.time.idleTimeout }) :
  setTimeout(initMain, MainConfig.time.slowConnectionDelay) // Use a short timeout to ensure body is ready
