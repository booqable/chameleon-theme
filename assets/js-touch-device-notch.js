/**
 * Touch Device Notch Detection
 *
 * Detects touch devices and safe area insets (notches),
 * then applies appropriate CSS classes and data attributes.
 *
 * @requires js-lazy-utils.js
 */
const handleTouchDevice = () => {
  const config = {
    attributes: {
      orientation: 'data-orientation'
    },
    cssVars: {
      areaTop: '--safe-area-top',
      areaRight: '--safe-area-right',
      areaBottom: '--safe-area-bottom',
      areaLeft: '--safe-area-left'
    },
    modifiers: {
      touch: 'touch'
    },
    orientations: {
      portrait: 'portrait',
      landscape: 'landscape'
    }
  }

  let resizeHandler = null;

  const elements = {
    doc: document.documentElement
  }

  const isTouchDevice = () => {
    return (
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)
    )
  }

  const detectNotch = () => {
    if (!isTouchDevice()) return;

    const styles = window.getComputedStyle(elements.doc);
    const safeAreas = {
      top: parseInt(styles.getPropertyValue(config.cssVars.areaTop)) || 0,
      right: parseInt(styles.getPropertyValue(config.cssVars.areaRight)) || 0,
      bottom: parseInt(styles.getPropertyValue(config.cssVars.areaBottom)) || 0,
      left: parseInt(styles.getPropertyValue(config.cssVars.areaLeft)) || 0
    }

    // Check if any safe area value is greater than 0
    const hasNotch = Object.values(safeAreas).some(value => value > 0);

    const screen = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    elements.doc.classList.add(config.modifiers.touch);

    const orientation = (hasNotch && screen.width > screen.height)
      ? config.orientations.landscape
      : config.orientations.portrait;

    elements.doc.setAttribute(config.attributes.orientation, orientation);
  }

  const initialize = () => {
    detectNotch();

    // Store handler and use utility function
    resizeHandler = detectNotch;
    LazyUtils.addEventListenerNode(window, 'resize', resizeHandler);
  }

  const destroy = () => {
    // Clean up event listener
    if (resizeHandler) {
      LazyUtils.removeEventListenerNode(window, 'resize', resizeHandler);
      resizeHandler = null;
    }
  }

  return {
    initialize,
    destroy
  }
}

const initTouchDevice = () => {
  const touchDevice = handleTouchDevice();
  if (touchDevice) touchDevice.initialize();
}

initTouchDevice()
