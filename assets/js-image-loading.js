/**
 * ImageLoading Component
 *
 * Handles loading of images with placeholders.
 * Optimizes initial load and uses IntersectionObserver for lazy loading.
 *
 * @requires js-utils-core.js
 * @requires js-utils-minimal.js
 * @requires js-utils.js
 */

const ImageConfig = {
  attr: {
    sourceSrcset: 'data-source-srcset',
    mainSrcset: 'data-srcset'
  },
  classes: {
    hidden: 'hidden',
    loaded: 'loaded',
    main: 'image-main',
    placeholder: 'image-placeholder',
    wrapper: 'image-wrapper'
  },
  viewport: {
    mobileWidth: 992,
    defaultMultiplier: 2.0,
    mobileMultiplier: 1.5,
    lowMultiplier: 1.0,
    chunkSize: 5
  }
}

const ImageVisibility = {
  observer: null,
  observerSetup: false,

  setIntersectionObserver () {
    if (this.observerSetup) return this.observer

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        ImageLoader.loadImage(entry.target)
        this.unobserve(entry.target)
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
  },

  observe (element) {
    this.observer.observe(element)
  },

  unobserve (element) {
    this.observer.unobserve(element)
  },

  checkVisibility (img, multiplier) {
    if ($.inViewport(img)) return { visible: true, inViewport: true }

    const viewport = ImageDevice.getViewportSize(),
      rect = $.getDimensions(img),
      isNearViewport = rect.top < viewport.height * multiplier

    return { visible: isNearViewport, inViewport: false }
  }
}

const ImageDevice = {
  cachedViewport: null,
  cachedIsMobile: null,
  cacheTime: 0,
  cacheTimeout: 200,

  getViewportSize () {
    const now = Date.now()
    if (this.cachedViewport && (now - this.cacheTime) < this.cacheTimeout) {
      return this.cachedViewport
    }

    this.cachedViewport = $.viewportSize()
    this.cacheTime = now
    this.cachedIsMobile = null
    return this.cachedViewport
  },

  isMobile () {
    if (this.cachedIsMobile !== null) {
      return this.cachedIsMobile
    }

    this.cachedIsMobile = this.getViewportSize().width < ImageConfig.viewport.mobileWidth
    return this.cachedIsMobile
  },

  getAdaptiveMultiplier () {
    if ($.slowConnection()) {
      return ImageConfig.viewport.lowMultiplier
    }
    return this.isMobile() ?
      ImageConfig.viewport.mobileMultiplier :
      ImageConfig.viewport.defaultMultiplier
  },

  clearCache () {
    this.cachedViewport = null
    this.cachedIsMobile = null
    this.cacheTime = 0
  }
}

const ImageLoader = {
  decodeImage (image) {
    if (!('decode' in image)) return
    image.decode().catch(() => {
      // Silently fail - the image will still display normally
    })
  },

  loadSources (mainImage) {
    const wrapper = mainImage.closest(`.${ImageConfig.classes.wrapper}`)
    if (!wrapper) return

    const sources = wrapper.querySelectorAll(`source[${ImageConfig.attr.sourceSrcset}]`),
      inViewport = $.inViewport(mainImage)

    sources.forEach((source) => {
      const dataSrc = source.getAttribute(ImageConfig.attr.sourceSrcset)
      if (!dataSrc) return

      source.setAttribute('srcset', dataSrc)
      source.removeAttribute(ImageConfig.attr.sourceSrcset)

      if ('importance' in source) {
        source.importance = (inViewport && !$.slowConnection()) ? 'high' : 'low'
      }
    })

    const mainSrcset = mainImage.getAttribute(ImageConfig.attr.mainSrcset)
    if (!mainSrcset) return

    const setMainImage = () => {
      mainImage.setAttribute('srcset', mainSrcset)
      mainImage.removeAttribute(ImageConfig.attr.mainSrcset)
      mainImage.decoding = inViewport ? 'sync' : 'async'

      if ($.isFetchPriority()) {
        mainImage.fetchPriority = inViewport ? 'high' : 'low'
      }

      if ('importance' in mainImage) {
        mainImage.importance = inViewport ? 'high' : 'auto'
      }
    }

    $.batchDOM(setMainImage)

    if (!inViewport && !mainImage.complete) return
    this.decodeImage(mainImage)
  },

  fadeInImage (mainImage, placeholder) {
    this.loadSources(mainImage)

    $.toggleClass(mainImage, ImageConfig.classes.hidden, false)
    $.toggleClass(mainImage, ImageConfig.classes.loaded, true)

    if (!placeholder) return
    placeholder.style.opacity = '0'
    const removePlaceholder = () => placeholder.remove()
    $.eventListener('add', placeholder, 'transitionend', removePlaceholder, { once: true, passive: true })
  },

  loadImage (mainImage) {
    if (!mainImage.classList.contains(ImageConfig.classes.main)) return
    if (!mainImage.classList.contains(ImageConfig.classes.hidden)) return

    const wrapper = mainImage.closest(`.${ImageConfig.classes.wrapper}`),
      placeholder = wrapper && wrapper.querySelector(`.${ImageConfig.classes.placeholder}`)

    if ($.slowConnection() && $.isFetchPriority()) {
      mainImage.fetchPriority = 'low'
    }

    const fadeInHandler = () => {
      this.fadeInImage(mainImage, placeholder)
    }

    const fadeInFallback = () => {
      const handleLoad = () => fadeInHandler()
      $.eventListener('add', mainImage, 'load', handleLoad, { once: true })
    }

    mainImage.complete ? fadeInHandler() : fadeInFallback()
  }
}

const ImageLoadingStrategy = {
  cachedNotLoaded: null,
  cacheTime: 0,
  cacheTimeout: 100,

  getNotLoadedImages () {
    const now = Date.now()
    if (this.cachedNotLoaded && (now - this.cacheTime) < this.cacheTimeout) {
      return this.cachedNotLoaded
    }

    this.cachedNotLoaded = document.querySelectorAll(`.${ImageConfig.classes.main}.${ImageConfig.classes.hidden}`)
    this.cacheTime = now
    return this.cachedNotLoaded
  },

  prioritizeVisible () {
    const notLoaded = this.getNotLoadedImages()
    if (!notLoaded.length) return

    const multiplier = ImageDevice.getAdaptiveMultiplier()

    const loadingImages = () => {
      const visibilityResults = []

      notLoaded.forEach((img) => {
        const result = ImageVisibility.checkVisibility(img, multiplier)
        if (!result.visible) return
        visibilityResults.push({ img, inViewport: result.inViewport })
      })

      visibilityResults.forEach(({ img, inViewport }) => {
        if ($.isFetchPriority()) {
          img.fetchPriority = inViewport ? 'high' : 'auto'
        }

        ImageLoader.loadImage(img)
        ImageVisibility.unobserve(img)
      })
    }

    $.batchDOM(loadingImages)
  },

  readVisible (images) {
    const multiplier = $.slowConnection() ? 1.5 : 3,
      viewport = ImageDevice.getViewportSize(),
      visibleImages = []

    images.forEach((img) => {
      const rect = $.getDimensions(img)
      if (rect.top >= viewport.height * multiplier) return
      visibleImages.push(img)
    })

    return visibleImages
  },

  writeVisible (visibleImages) {
    if (!visibleImages || !visibleImages.length) return

    const loadingImages = () => {
      visibleImages.forEach((img) => {
        ImageLoader.loadImage(img)
        ImageVisibility.unobserve(img)
      })
    }

    $.batchDOM(loadingImages)
  },

  loadLimited (images) {
    // Bind the context to ensure 'this' references the ImageLoadingStrategy
    const read = this.readVisible.bind(this, images),
      write = this.writeVisible.bind(this)

    $.frameSequence(read, write)
  },

  loadInChunks (images) {
    const chunkSize = ImageConfig.viewport.chunkSize,
      totalImages = images.length

    const loadChunk = (startIndex) => {
      const endIndex = Math.min(startIndex + chunkSize, totalImages)

      const loadingImages = () => {
        for (let i = startIndex; i < endIndex; i++) {
          const img = images[i]
          ImageLoader.loadImage(img)
          ImageVisibility.unobserve(img)
        }
      }

      $.batchDOM(loadingImages)

      if (endIndex >= totalImages) return

      $.requestIdle(() => loadChunk(endIndex), { timeout: 100 })
    }

    loadChunk(0)
  },

  handleWindowLoad () {
    const notLoaded = this.getNotLoadedImages()
    if (!notLoaded.length) return

    $.slowConnection() ?
      this.loadLimited(notLoaded) :
      this.loadInChunks(notLoaded)
  },

  clearCache () {
    this.cachedNotLoaded = null
    this.cacheTime = 0
  }
}

const ImageHandler = {
  windowLoadHandler: null,
  resizeHandler: null,

  init () {
    const wrappers = document.querySelectorAll(`.${ImageConfig.classes.wrapper}`)
    if (!wrappers.length) return false

    ImageVisibility.setIntersectionObserver()
    this.processImages(wrappers)
    this.setWindowLoad()
    this.setResizeHandler()

    return this.cleanup.bind(this)
  },

  processImages (wrappers) {
    wrappers.forEach((wrapper) => {
      const mainImage = wrapper.querySelector(`.${ImageConfig.classes.main}`),
        placeholder = wrapper.querySelector(`.${ImageConfig.classes.placeholder}`)

      if (!mainImage || !placeholder) return
      if (!mainImage.classList.contains(ImageConfig.classes.hidden)) return

      $.inViewport(mainImage) ?
        ImageLoader.loadImage(mainImage) :
        ImageVisibility.observe(mainImage)
    })

    // Process any visible images that weren't covered above
    ImageLoadingStrategy.prioritizeVisible()
  },

  setWindowLoad () {
    this.windowLoadHandler = () => ImageLoadingStrategy.handleWindowLoad()
    $.eventListener('add', window, 'load', this.windowLoadHandler, { passive: true })
  },

  setResizeHandler () {
    this.resizeHandler = $.debounce(() => {
      ImageDevice.clearCache()
      ImageLoadingStrategy.clearCache()
    }, 200)
    $.eventListener('add', window, 'resize', this.resizeHandler, { passive: true })
  },

  cleanup () {
    if (this.windowLoadHandler) {
      $.eventListener('remove', window, 'load', this.windowLoadHandler, { passive: true })
      this.windowLoadHandler = null
    }
    if (this.resizeHandler) {
      $.eventListener('remove', window, 'resize', this.resizeHandler, { passive: true })
      this.resizeHandler = null
    }

    ImageDevice.clearCache()
    ImageLoadingStrategy.clearCache()
    ImageVisibility.cleanup()
    return null
  }
}

const initImageLoading = () => {
  $.cleanup('cleanupImageLoading', () => ImageHandler.init())
}

initImageLoading()

$.imageLoader = {
  loadImage: ImageLoader.loadImage.bind(ImageLoader)
}
