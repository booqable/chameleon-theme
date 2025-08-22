/**
 * Touch Device Notch Detection Component
 *
 * Detects touch devices and safe area insets (notches),
 * then applies appropriate CSS classes and data attributes.
 * Optimized for performance with throttling and minimal DOM updates.
 *
 * @requires js-utils-core.js
 * @requires js-utils-minimal.js
 * @requires js-utils.js
 */

const TouchConfig = {
  modifiers: {
    touch: 'touch'
  },
  orientations: {
    portrait: 'portrait',
    landscape: 'landscape'
  },
  attr: {
    orientation: 'data-orientation'
  },
  cssVars: {
    areaTop: '--safe-area-top',
    areaRight: '--safe-area-right',
    areaBottom: '--safe-area-bottom',
    areaLeft: '--safe-area-left'
  },
  time: {
    throttleThreshold: 150
  }
}

const TouchDOM = {
  elements: {
    doc: document.documentElement
  },

  cacheData: {
    currentOrientation: null,
    lastResizeTime: 0
  }
}

const TouchRenderer = {
  readNotchData () {
    if (!$.isTouchDevice()) return null

    // Apply throttling to avoid excessive calculations during resize
    const now = performance.now()
    if (now - TouchDOM.cacheData.lastResizeTime < TouchConfig.time.throttleThreshold) return null
    TouchDOM.cacheData.lastResizeTime = now

    const styles = window.getComputedStyle(TouchDOM.elements.doc)
    const safeAreas = {
      top: parseInt(styles.getPropertyValue(TouchConfig.cssVars.areaTop)) || 0,
      right: parseInt(styles.getPropertyValue(TouchConfig.cssVars.areaRight)) || 0,
      bottom: parseInt(styles.getPropertyValue(TouchConfig.cssVars.areaBottom)) || 0,
      left: parseInt(styles.getPropertyValue(TouchConfig.cssVars.areaLeft)) || 0
    }

    const hasNotch = Object.values(safeAreas).some((val) => val > 0),
      screen = $.viewportSize(),
      orientation = (hasNotch && screen.width > screen.height) ?
        TouchConfig.orientations.landscape :
        TouchConfig.orientations.portrait

    return { hasNotch, screen, orientation: orientation }
  },

  writeNotchData (data) {
    if (!data) return

    $.toggleClass(TouchDOM.elements.doc, TouchConfig.modifiers.touch, true)

    if (TouchDOM.cacheData.currentOrientation === data.orientation) return

    TouchDOM.elements.doc.setAttribute(
      TouchConfig.attr.orientation,
      data.orientation
    )
    TouchDOM.cacheData.currentOrientation = data.orientation
  },

  detectNotch () {
    // Bind the context to ensure 'this' references are maintained
    const read = this.readNotchData.bind(this),
      write = this.writeNotchData.bind(this)

    $.frameSequence(read, write)
  }
}

const TouchHandler = {
  resizeHandler: null,

  setupResizeHandler () {
    this.resizeHandler = TouchRenderer.detectNotch.bind(TouchRenderer)
    $.eventListener('add', window, 'resize', this.resizeHandler)
  },

  init () {
    TouchRenderer.detectNotch()
    this.setupResizeHandler()

    return {
      getOrientation: () => TouchDOM.cacheData.currentOrientation,
      cleanup: this.cleanup.bind(this)
    }
  },

  cleanup () {
    if (this.resizeHandler) {
      $.eventListener('remove', window, 'resize', this.resizeHandler)
      this.resizeHandler = null
    }

    TouchDOM.cacheData.currentOrientation = null
    TouchDOM.cacheData.lastResizeTime = 0

    return null
  }
}

const handleTouchDevice = () => {
  const instance = TouchHandler.init()
  return instance ? instance.cleanup : null
}

const initTouchDevice = () => {
  $.cleanup('cleanupTouchDevice', handleTouchDevice)
}

initTouchDevice()
