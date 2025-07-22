/**
 * Focal Image Component
 *
 * Converts Booqable focal point coordinates to CSS object-position.
 * Uses IntersectionObserver for lazy processing and performance optimization.
 *
 * @requires js-utils-core.js
 */

const FocalConfig = {
  selector: {
    image: '.focal-image'
  },
  attr: {
    focalX: 'data-focal-x',
    focalY: 'data-focal-y',
    processed: 'data-focal-processed'
  },
  defaultPosition: '50% 50%'
}

const FocalDOM = {
  elements: {
    images: null
  },

  cache: {
    positions: new Map()
  },

  init () {
    this.elements.images = document.querySelectorAll(FocalConfig.selector.image)
    return this.elements.images && this.elements.images.length > 0
  },

  cleanup () {
    this.cache.positions.clear()
    this.elements.images = null
  }
}

const FocalCalculator = {
  convertToPercentage (coordinate) {
    const value = parseFloat(coordinate) || 0

    // Convert from (-1 to 1) range to (0% to 100%) range
    // The formula is: percentage = (coordinate + 1) * 50
    const percentage = (value + 1) * 50

    // Ensure the value stays within 0-100% range
    const clampedPercentage = Math.max(0, Math.min(100, percentage))

    return `${clampedPercentage}%`
  },

  calculatePosition (focalX, focalY) {
    if (focalX === null || focalY === null) return FocalConfig.defaultPosition // Skip invalid coordinates

    const positionKey = `${focalX}_${focalY}` // Create a unique key for caching

    let position = FocalDOM.cache.positions.get(positionKey) // Check if position's already calculated

    // If not found in cache, calculate and store it
    if (!position) {
      const objectPositionX = this.convertToPercentage(focalX),
        objectPositionY = this.convertToPercentage(focalY)
      position = `${objectPositionX} ${objectPositionY}`

      FocalDOM.cache.positions.set(positionKey, position) // Cache the result
    }

    return position
  }
}

const FocalProcessor = {
  processImage (image) {
    if (image.getAttribute(FocalConfig.attr.processed) === 'true') return

    const focalX = image.getAttribute(FocalConfig.attr.focalX),
      focalY = image.getAttribute(FocalConfig.attr.focalY)

    if (focalX === null || focalY === null) return

    const position = FocalCalculator.calculatePosition(focalX, focalY)

    const applyFocalPoint = () => {
      image.style.objectPosition = position
      image.style.opacity = 1
      image.setAttribute(FocalConfig.attr.processed, 'true')
    }

    $.batchDOM(applyFocalPoint)
  }
}

const FocalVisibility = {
  observer: null,
  observerSetup: false,

  setIntersectionObserver () {
    if (this.observerSetup) return this.observer

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        FocalProcessor.processImage(entry.target)
        this.observer.unobserve(entry.target)
      })
    }

    this.observer = $.intersectionObserver(observerCallback)
    this.observerSetup = true

    return this.observer
  },

  cleanup () {
    this.observer.disconnect()
    this.observer = null
    this.observerSetup = false
  }
}

const handleFocalImages = () => {
  if (!FocalDOM.init()) return null

  FocalVisibility.setIntersectionObserver()

  const processImages = () => {
    const images = FocalDOM.elements.images
    images.forEach((image) => {
      FocalVisibility.observer.observe(image)
    })
  }

  processImages()

  const cleanup = () => {
    FocalVisibility.cleanup()
    FocalDOM.cleanup()
    return null
  }

  return cleanup
}

const initFocalImages = () => {
  $.cleanup('cleanupFocalImages', handleFocalImages)
}

initFocalImages()
