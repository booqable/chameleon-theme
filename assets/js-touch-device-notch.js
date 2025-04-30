/**
 * Touch Device Notch Detection
 *
 * Detects touch devices and safe area insets (notches),
 * then applies appropriate CSS classes and data attributes.
 * Optimized for performance with throttling and minimal DOM updates.
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
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

  let resizeHandler = null,
      lastResizeTime = 0,
      currentOrientation = null,
      throttleThreshold = 150; // milliseconds

  const elements = {
    doc: document.documentElement
  }

  const detectNotch = () => {
    if (!$.isTouchDevice()) return;

    // Apply throttling to avoid excessive calculations during resize
    const now = performance.now();
    if (now - lastResizeTime < throttleThreshold) return;
    lastResizeTime = now;

    // Use frameSequence utility to prevent layout thrashing
    $.frameSequence(
      // Read phase: gather measurements
      () => {
        const styles = window.getComputedStyle(elements.doc);
        const safeAreas = {
          top: parseInt(styles.getPropertyValue(config.cssVars.areaTop)) || 0,
          right: parseInt(styles.getPropertyValue(config.cssVars.areaRight)) || 0,
          bottom: parseInt(styles.getPropertyValue(config.cssVars.areaBottom)) || 0,
          left: parseInt(styles.getPropertyValue(config.cssVars.areaLeft)) || 0
        }

        const hasNotch = Object.values(safeAreas).some(value => value > 0),
              screen = $.viewportSize();

        return {
          hasNotch,
          screen,
          orientation: (hasNotch && screen.width > screen.height)
            ? config.orientations.landscape
            : config.orientations.portrait
        }
      },
      // Write phase: update DOM
      (data) => {
        elements.doc.classList.add(config.modifiers.touch);

        if (currentOrientation === data.orientation) return;

        elements.doc.setAttribute(config.attributes.orientation, data.orientation);
        currentOrientation = data.orientation;
      }
    )
  }

  const initialize = () => {
    detectNotch();

    // Use a more efficient resize handler with built-in throttling
    // so we don't need to rely on external throttling mechanisms
    resizeHandler = () => detectNotch();

    // Attach event listener using utility function
    $.eventListener('add', window, 'resize', resizeHandler);

    // Expose our current orientation if needed externally
    return {
      getOrientation: () => currentOrientation
    }
  }

  const destroy = () => {
    if (resizeHandler) {
      $.eventListener('remove', window, 'resize', resizeHandler);
      resizeHandler = null;
    }

    currentOrientation = null;
    lastResizeTime = 0;
  }

  return {
    initialize,
    destroy
  }
}

// Create a more efficient initialization and cleanup system
let touchDeviceInstance = null,
    touchDeviceCleanup = null;

// Since this script is included in non-critical scripts, initialize immediately
// and store the cleanup function in a global handler
window.cleanupTouchDevice = () => {
  if (touchDeviceInstance && $.is(touchDeviceInstance.destroy, 'function')) {
    touchDeviceInstance.destroy()
    touchDeviceInstance = null
  }
}

touchDeviceInstance = handleTouchDevice();
if (touchDeviceInstance) touchDeviceInstance.initialize();
