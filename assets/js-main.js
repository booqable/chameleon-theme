/**
 * Main Component
 *
 * Handles core functionality for the site:
 * - Window resize handling
 * - Page loaded state management
 *
 * Uses utilities like ResizeObserver, Batches DOM, etc. for better performance
 *
 * @requires js-utils-core.js
 * @requires js-utils-minimal.js
 */

const MainConfig = {
  selector: {
    body: 'body'
  },
  modifier: {
    loaded: 'loaded',
    resize: 'resize-active'
  },
  time: {
    idleTimeout: 2000,
    resizeDelay: 150
  }
}

const MainDOM = {
  elements: {
    body: null
  },

  isResizing: false,
  resizeTimer: null,

  init () {
    this.elements.body = document.querySelector(MainConfig.selector.body)
    return this.elements.body !== null
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

    if (this.isResizing && this.elements.body) {
      $.toggleClass(this.elements.body, MainConfig.modifier.resize, false)
      this.isResizing = false
    }

    this.elements.body = null
  }
}


const MainResize = {
  resizeObserver: null,

  setupResizeHandlers () {
    const handleResize = () => {
      MainDOM.setClassResize()
    }

    const handleResizeSettings = {
      element: document.documentElement,
      debounceTime: 0
    }

    this.resizeObserver = $.resizeObserver(handleResize, handleResizeSettings)
  },

  cleanup () {
    this.resizeObserver.cleanup()
    this.resizeObserver = null
  }
}


const handleMainLoading = () => {
  const body = document.querySelector(MainConfig.selector.body),
    loaded = MainConfig.modifier.loaded
  if (body) $.toggleClass(body, loaded, true)
}

handleMainLoading()

const handleMain = () => {
  if (!MainDOM.init()) return null

  MainDOM.setClassLoaded()
  MainResize.setupResizeHandlers()

  if ($.initDatePicker) $.initDatePicker()

  const cleanup = () => {
    MainResize.cleanup()
    MainDOM.cleanup()
    return null
  }

  return cleanup
}

const initMain = () => {
  $.cleanup('cleanupMain', handleMain)
}

$.requestIdle(initMain, { timeout: MainConfig.time.idleTimeout })
