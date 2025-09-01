/**
 * Carousel Component
 *
 * High-performance carousel with transform translate approach.
 * Supports navigation buttons, pagination dots, and auto-scroll with hover pause.
 *
 * @requires js-utils-core.js
 * @requires js-utils-minimal.js
 * @requires js-utils.js
 */

const CarouselConfig = {
  selector: {
    carousel: '.carousel',
    count: '.carousel__count',
    counter: '.carousel__counter',
    dot: '.carousel__dot',
    item: '.carousel__item',
    navigation: '.carousel__navigation',
    pagination: '.carousel__pagination',
    next: '.carousel__btn.next',
    prev: '.carousel__btn.prev',
    region: '.carousel__live-region',
    wrapper: '.carousel__wrapper',
    imageHidden: '.image-main.hidden',
    video: '[data-video-container]'
  },
  carouselTypes: {
    big: 'big',
    huge: 'huge',
    small: 'small'
  },
  classes: {
    active: 'active',
    edges: 'carousel__edges',
    fade: 'carousel__fade-effect',
    full: 'carousel__full-width',
    hide: 'hide',
    hidden: 'hidden',
    initialized: 'initialized',
    pause: 'carousel__pause',
    region: 'carousel__live-region',
    show: 'show',
    swiping: 'carousel__swiping'
  },
  attr: {
    ariaAtomic: 'aria-atomic',
    ariaLabel: 'aria-label',
    ariaLive: 'aria-live',
    defaultColor: 'data-default-color',
    overlayColor: 'data-overlay-color',
    tabIndex: 'tabindex',
    timer: 'data-carousel-timer'
  },
  cssProp: {
    overlay: '--overlay-color',
    overlay08: '--overlay-color-08',
    overlay45: '--overlay-color-45',
    widthDesktop: '--slide-width',
    widthMobile: '--slide-width-mobile'
  },
  viewport: {
    mobileBreakpoint: 992,
    intersectionThreshold: 0.1
  },
  touch: {
    resistance: 0.25,
    threshold: 50
  },
  cache: {
    maxSize: 50,
    ttl: 30000 // 30 seconds
  },
  accessibility: {
    announceDelay: 100
  },
  width: {
    desktop: 294,
    mobile: 298
  },
  time: {
    throttleTime: 150 // Basic throttling for carousel navigation
  },
  lifecycle: {
    poolSize: 10,
    idleTimeout: 2500, // 2.5 seconds before cleanup
    videoIdleTimeout: 1500 // 1.5 second for video carousels
  }
}

const CarouselCache = {
  data: new Map(),

  set (key, value) {
    try {
      // Clean up expired entries if cache is getting large
      if (this.data.size >= CarouselConfig.cache.maxSize) this.cleanup()

      this.data.set(key, {
        value,
        timestamp: Date.now()
      })
    } catch (error) {
      console.warn('CarouselCache: Failed to set cache entry', error)
    }
  },

  get (key) {
    try {
      const entry = this.data.get(key)
      if (!entry) return undefined

      // Check if entry is expired
      if (Date.now() - entry.timestamp > CarouselConfig.cache.ttl) {
        this.data.delete(key)
        return undefined
      }

      return entry.value
    } catch (error) {
      console.warn('CarouselCache: Failed to get cache entry', error)
      return undefined
    }
  },

  delete (key) {
    try {
      this.data.delete(key)
    } catch (error) {
      console.warn('CarouselCache: Failed to delete cache entry', error)
    }
  },

  cleanup () {
    try {
      const now = Date.now()
      for (const [key, entry] of this.data.entries()) {
        if (now - entry.timestamp > CarouselConfig.cache.ttl) {
          this.data.delete(key)
        }
      }
    } catch (error) {
      console.warn('CarouselCache: Failed to cleanup cache', error)
    }
  },

  clear () {
    try {
      this.data.clear()
    } catch (error) {
      console.warn('CarouselCache: Failed to clear cache', error)
    }
  }
}

const CarouselViewportManager = {
  activeCarousels: new Map(),
  carouselStates: new Map(), // Store individual carousel states
  currentlyInitializing: 0,
  idleTimers: new Map(),
  initializationQueue: [],
  isInitializing: false,
  maxConcurrentInit: 1, // Only allow 1 carousel to initialize at a time
  maxConcurrentMobile: 1, // Even more restrictive on mobile
  observer: null,
  pendingCarousels: new Set(),
  visibleCarousels: new Set(), // Track which carousels are currently visible

  init () {
    try {
      if (this.observer) return this.observer

      const handleIntersection = (entries) => {
        entries.forEach((entry) => {
          const carousel = entry.target,
            isVisible = entry.isIntersecting

          if (isVisible) {
            this.visibleCarousels.add(carousel)
            this.activateCarousel(carousel)
          } else {
            this.visibleCarousels.delete(carousel)
            this.scheduleDeactivation(carousel)
          }
        })
      }

      this.observer = $.intersectionObserver(handleIntersection, {
        threshold: CarouselConfig.viewport.intersectionThreshold
      })

      return this.observer
    } catch (error) {
      console.error('CarouselViewportManager: Failed to initialize', error)
      return null
    }
  },

  observe (carousel) {
    try {
      if (!this.observer) this.init()
      if (!this.observer) return false

      this.pendingCarousels.add(carousel)
      this.observer.observe(carousel)
      return true
    } catch (error) {
      console.error('CarouselViewportManager: Failed to observe carousel', error)
      return false
    }
  },

  unobserve (carousel) {
    try {
      if (this.observer) {
        this.observer.unobserve(carousel)
      }
      this.pendingCarousels.delete(carousel)
      this.clearIdleTimer(carousel)

      // Remove from initialization queue if present
      const queueIndex = this.initializationQueue.indexOf(carousel)
      if (queueIndex > -1) {
        this.initializationQueue.splice(queueIndex, 1)
      }

      // Remove from visible carousels
      this.visibleCarousels.delete(carousel)
    } catch (error) {
      console.error('CarouselViewportManager: Failed to unobserve carousel', error)
    }
  },

  observeLazy (carousel, delay) {
    try {
      // Create a one-time intersection observer
      const lazyObserver = $.intersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            lazyObserver.unobserve(carousel)
            this.observe(carousel)
          }
        })
      }, { threshold: CarouselConfig.viewport.intersectionThreshold })

      lazyObserver.observe(carousel)

      setTimeout(() => {
        if (!carousel.classList.contains(CarouselConfig.classes.initialized)) {
          lazyObserver.unobserve(carousel)
          this.observe(carousel)
        }
      }, delay)

      return true
    } catch (error) {
      console.error('CarouselViewportManager: Failed to observe lazy carousel', error)
      return false
    }
  },

  activateCarousel (carousel) {
    try {
      this.clearIdleTimer(carousel)

      if (this.activeCarousels.has(carousel)) return

      // Check if multiple carousels are visible simultaneously
      const multipleVisible = this.visibleCarousels.size > 1

      multipleVisible ?
        this.queueCarouselInitialization(carousel) :
        this.initializeCarousel(carousel)
    } catch (error) {
      console.error('CarouselViewportManager: Failed to activate carousel', error)
    }
  },

  queueCarouselInitialization (carousel) {
    // Already checked in activateCarousel(), only need to check queue
    if (this.initializationQueue.includes(carousel)) return

    this.initializationQueue.push(carousel)
    this.processInitializationQueue()
  },

  processInitializationQueue () {
    if (this.currentlyInitializing >= this.maxConcurrentInit || this.initializationQueue.length === 0) return

    const carousel = this.initializationQueue.shift()
    if (!carousel) return

    this.currentlyInitializing++

    const initWithDelay = () => {
      this.initializeCarousel(carousel)

      // Process next in queue after initialization completes
      $.requestIdle(() => {
        this.currentlyInitializing--
        this.processInitializationQueue()
      }, { timeout: 100 })
    }

    // Add delay for video carousels to prevent Safari crashes
    const isVideoCarousel = CarouselCalculator.hugeCarousel(carousel)
    const delay = isVideoCarousel ? 2000 : 1000

    setTimeout(initWithDelay, delay)
  },

  initializeCarousel (carousel) {
    try {
      const instance = CarouselInstancePool.getOrCreateInstance(carousel)
      if (instance) {
        this.restoreCarouselState(carousel, instance) // Restore the carousel's individual state if it exists
        this.activeCarousels.set(carousel, instance)
        instance.init()
      }
    } catch (error) {
      console.error('CarouselViewportManager: Failed to initialize carousel', error)
    }
  },

  saveCarouselState (carousel, instance) {
    try {
      const carouselId = carousel.dataset.carouselId
      if (!carouselId) return

      const state = {
        currentIndex: instance.currentIndex || 0,
        isPaused: instance.isPaused || false,
        timestamp: Date.now()
      }

      this.carouselStates.set(carouselId, state)
    } catch (error) {
      console.error('CarouselViewportManager: Failed to save carousel state', error)
    }
  },

  restoreCarouselState (carousel, instance) {
    try {
      const carouselId = carousel.dataset.carouselId
      if (!carouselId) return

      const savedState = this.carouselStates.get(carouselId)
      if (savedState) {
        // Restore the saved index, but ensure it's within bounds
        const targetIndex = Math.max(0, Math.min(savedState.currentIndex, instance.maxIndex))
        instance.currentIndex = targetIndex
        instance.isPaused = savedState.isPaused

        // Add a flag to indicate this carousel needs to restore its visual state after init
        instance.needsStateRestore = true
        instance.restoreTargetIndex = targetIndex
      }
    } catch (error) {
      console.error('CarouselViewportManager: Failed to restore carousel state', error)
    }
  },

  scheduleDeactivation (carousel) {
    try {
      this.clearIdleTimer(carousel)

      // Use more aggressive cleanup for video carousels to save memory
      const isVideoCarousel = CarouselCalculator.hugeCarousel(carousel)
      const timeout = isVideoCarousel ?
        CarouselConfig.lifecycle.videoIdleTimeout :
        CarouselConfig.lifecycle.idleTimeout

      const timer = setTimeout(() => {
        this.deactivateCarousel(carousel)
      }, timeout)

      this.idleTimers.set(carousel, timer)
    } catch (error) {
      console.error('CarouselViewportManager: Failed to schedule deactivation', error)
    }
  },

  deactivateCarousel (carousel) {
    try {
      const instance = this.activeCarousels.get(carousel)
      if (instance) {
        this.saveCarouselState(carousel, instance) // Save the carousel's current state before deactivating

        instance.cleanup()
        CarouselInstancePool.returnInstance(carousel, instance)
        this.activeCarousels.delete(carousel)

        // Clear cache entries for this specific carousel to free memory
        const carouselId = carousel.dataset.carouselId
        if (carouselId) {
          CarouselCache.delete(`slideWidth-${carouselId}-mobile`)
          CarouselCache.delete(`slideWidth-${carouselId}-desktop`)
          CarouselCache.delete(`gap-${carouselId}-mobile`)
          CarouselCache.delete(`gap-${carouselId}-desktop`)
        }
      }
      this.clearIdleTimer(carousel)
    } catch (error) {
      console.error('CarouselViewportManager: Failed to deactivate carousel', error)
    }
  },

  clearIdleTimer (carousel) {
    try {
      const timer = this.idleTimers.get(carousel)
      if (timer) {
        clearTimeout(timer)
        this.idleTimers.delete(carousel)
      }
    } catch (error) {
      console.error('CarouselViewportManager: Failed to clear idle timer', error)
    }
  },

  cleanup () {
    try {
      if (this.observer) {
        this.observer.disconnect()
        this.observer = null
      }

      this.idleTimers.forEach((timer) => clearTimeout(timer))
      this.idleTimers.clear()

      this.activeCarousels.forEach((instance) => {
        if (instance && instance.cleanup) instance.cleanup()
      })
      this.activeCarousels.clear()

      this.pendingCarousels.clear()

      this.carouselStates.clear()
      this.initializationQueue.length = 0
      this.currentlyInitializing = 0
      this.visibleCarousels.clear()
    } catch (error) {
      console.error('CarouselViewportManager: Failed to cleanup', error)
    }
  }
}

const CarouselInstancePool = {
  pool: [],
  activeInstances: new Map(),

  getOrCreateInstance (carousel) {
    try {
      let instance = this.pool.pop()

      if (!instance) {
        instance = CarouselController.createInstance(carousel)
        if (!instance) return null
      } else {
        instance = this.reinitializeInstance(instance, carousel)
      }

      this.activeInstances.set(carousel, instance)
      return instance
    } catch (error) {
      console.error('CarouselInstancePool: Failed to get or create instance', error)
      return null
    }
  },

  returnInstance (carousel, instance) {
    try {
      if (!instance) return

      instance.cleanup()
      this.activeInstances.delete(carousel)

      if (this.pool.length < CarouselConfig.lifecycle.poolSize) {
        this.resetInstanceState(instance)
        this.pool.push(instance)
      }
    } catch (error) {
      console.error('CarouselInstancePool: Failed to return instance', error)
    }
  },

  reinitializeInstance (instance, carousel) {
    try {
      const wrapper = carousel.querySelector(CarouselConfig.selector.wrapper),
        items = carousel.querySelectorAll(CarouselConfig.selector.item)

      if (!wrapper || !items.length) return null

      const prevBtn = carousel.querySelector(CarouselConfig.selector.prev),
        nextBtn = carousel.querySelector(CarouselConfig.selector.next),
        dots = carousel.querySelectorAll(CarouselConfig.selector.dot),
        timerVal = carousel.getAttribute(CarouselConfig.attr.timer),
        visibleSlides = CarouselCalculator.getVisibleSlidesCount(carousel),
        maxTranslateIndex = CarouselCalculator.getMaxTranslateIndex(carousel, items.length)

      instance.carousel = carousel
      instance.wrapper = wrapper
      instance.items = items
      instance.prevBtn = prevBtn
      instance.nextBtn = nextBtn
      instance.dots = dots
      instance.currentIndex = 0
      instance.maxIndex = maxTranslateIndex
      instance.totalSlides = items.length
      instance.visibleSlides = visibleSlides
      instance.timer = $.is(timerVal, 'string') && timerVal.length > 0 ? parseInt(timerVal) * 1000 : 0
      instance.hasVideos = carousel.querySelectorAll(CarouselConfig.selector.video).length > 0

      return instance
    } catch (error) {
      console.error('CarouselInstancePool: Failed to reinitialize instance', error)
      return null
    }
  },

  resetInstanceState (instance) {
    try {
      instance.currentIndex = 0
      instance.autoScrollTimer = null
      instance.isPaused = false
      instance.touch = null
      instance.wheelState = null
      instance.wheelResumeTimer = null
      instance.keyboardHandler = null
      instance.liveRegion = null
      instance.throttler = null

      Object.keys(instance.eventHandlers || {}).forEach((key) => {
        if (Array.isArray(instance.eventHandlers[key])) {
          instance.eventHandlers[key] = []
        } else {
          instance.eventHandlers[key] = null
        }
      })
    } catch (error) {
      console.error('CarouselInstancePool: Failed to reset instance state', error)
    }
  },

  cleanup () {
    try {
      this.activeInstances.forEach((instance) => {
        if (instance && instance.cleanup) instance.cleanup()
      })
      this.activeInstances.clear()

      this.pool.forEach((instance) => {
        if (instance && instance.cleanup) instance.cleanup()
      })
      this.pool = []
    } catch (error) {
      console.error('CarouselInstancePool: Failed to cleanup', error)
    }
  }
}

const CarouselDOM = {
  elements: {
    carousels: null
  },

  init () {
    try {
      this.elements.carousels = document.querySelectorAll(CarouselConfig.selector.carousel)
      return this.elements.carousels && this.elements.carousels.length > 0
    } catch (error) {
      console.error('CarouselDOM: Failed to initialize', error)
      return false
    }
  },

  cleanup () {
    try {
      CarouselCache.clear()
      this.elements.carousels = null
    } catch (error) {
      console.warn('CarouselDOM: Failed to cleanup', error)
    }
  }
}

const CarouselCalculator = {
  getCarouselType (carousel) {
    try {
      if (carousel.classList.contains(CarouselConfig.classes.edges)) {
        return CarouselConfig.carouselTypes.huge
      }
      if (carousel.classList.contains(CarouselConfig.classes.full)) {
        return CarouselConfig.carouselTypes.big
      }
      return CarouselConfig.carouselTypes.small
    } catch (error) {
      console.error('CarouselCalculator: Failed to determine carousel type', error)
      return CarouselConfig.carouselTypes.small
    }
  },

  bigCarousel (carousel) {
    return this.getCarouselType(carousel) === CarouselConfig.carouselTypes.big
  },

  hugeCarousel (carousel) {
    return this.getCarouselType(carousel) === CarouselConfig.carouselTypes.huge
  },

  getSlideWidth (carousel) {
    const isMobile = $.viewportSize().width < CarouselConfig.viewport.mobileBreakpoint,
      widthDesktop = CarouselConfig.width.desktop,
      widthMobile = CarouselConfig.width.mobile

    try {
      if (!carousel) return widthDesktop

      const isBigCarousel = this.bigCarousel(carousel),
        isHugeCarousel = this.hugeCarousel(carousel)

      // Big and Huge carousels have fixed widths
      if (isBigCarousel || isHugeCarousel) return carousel.offsetWidth

      // Small carousel: calculate based on CSS variable
      const cacheKey = `slideWidth-${carousel.dataset.carouselId}-${isMobile ? 'mobile' : 'desktop'}`
      let cachedWidth = CarouselCache.get(cacheKey)

      if (cachedWidth) return cachedWidth

      const widthMobileProp = CarouselConfig.cssProp.widthMobile,
        widthDesktopProp = CarouselConfig.cssProp.widthDesktop,
        slideWidthVar = isMobile ? widthMobileProp : widthDesktopProp,
        computedStyle = getComputedStyle(carousel),
        slideWidthValue = computedStyle.getPropertyValue(slideWidthVar),
        defaultWidth = isMobile ? widthMobile : widthDesktop,
        slideWidth = parseInt(slideWidthValue) || defaultWidth

      if (slideWidth <= 0 || slideWidth > 2000) {
        console.warn('CarouselCalculator: Invalid slide width detected', slideWidth)
        return defaultWidth
      }

      CarouselCache.set(cacheKey, slideWidth)
      return slideWidth
    } catch (error) {
      console.error('CarouselCalculator: Failed to get slide width', error)
      return isMobile ? widthMobile : widthDesktop
    }
  },

  getGap (carousel) {
    const defaultGap = 16

    try {
      if (!carousel) return defaultGap // Safe fallback

      const isMobile = $.viewportSize().width < CarouselConfig.viewport.mobileBreakpoint,
        cacheKey = `gap-${carousel.dataset.carouselId}-${isMobile ? 'mobile' : 'desktop'}`
      let cachedGap = CarouselCache.get(cacheKey)

      if (cachedGap !== undefined) return cachedGap

      const wrapper = carousel.querySelector(CarouselConfig.selector.wrapper)
      if (!wrapper) return defaultGap

      const computedStyle = getComputedStyle(wrapper),
        gapValue = computedStyle.gap,
        gap = gapValue === '0px' ? 0 : parseInt(gapValue)

      // Validate the result
      if (gap < 0 || gap > 100) {
        console.warn('CarouselCalculator: Invalid gap detected', gap)
        return defaultGap
      }

      CarouselCache.set(cacheKey, gap)
      return gap
    } catch (error) {
      console.error('CarouselCalculator: Failed to get gap', error)
      return defaultGap
    }
  },

  getHorizontalPadding (carousel) {
    try {
      if (!carousel) return 0

      const wrapper = carousel.querySelector(CarouselConfig.selector.wrapper)
      if (!wrapper) return 0

      const computedStyle = getComputedStyle(wrapper),
        paddingLeft = parseInt(computedStyle.paddingLeft) || 0,
        paddingRight = parseInt(computedStyle.paddingRight) || 0,
        totalPadding = paddingLeft + paddingRight

      // Validate the result
      if (totalPadding < 0 || totalPadding > 200) {
        console.warn('CarouselCalculator: Invalid padding detected', totalPadding)
        return 0
      }

      return totalPadding
    } catch (error) {
      console.error('CarouselCalculator: Failed to get horizontal padding', error)
      return 0
    }
  },

  getVisibleSlidesCount (carousel) {
    try {
      const isBigCarousel = this.bigCarousel(carousel),
        isHugeCarousel = this.hugeCarousel(carousel)

      // Big and Huge carousels: always show 1 slide
      if (isBigCarousel || isHugeCarousel) return 1

      // Small carousel: calculate based on available width
      const carouselWidth = carousel.offsetWidth,
        slideWidth = this.getSlideWidth(carousel),
        gap = this.getGap(carousel),
        horizontalPadding = this.getHorizontalPadding(carousel),
        availableWidth = carouselWidth - horizontalPadding + gap,
        slideAndGapWidth = slideWidth + gap,
        visibleCount = Math.floor(availableWidth / slideAndGapWidth)

      // Ensure at least 1 slide is visible, but not more than total slides
      const items = carousel.querySelectorAll(CarouselConfig.selector.item)
      return Math.max(1, Math.min(visibleCount, items.length))
    } catch (error) {
      console.error('CarouselCalculator: Failed to get visible slides count', error)
      return 1
    }
  },

  getMaxTranslateIndex (carousel, totalSlides) {
    try {
      const isBigCarousel = this.bigCarousel(carousel),
        isHugeCarousel = this.hugeCarousel(carousel)

      // Big and Huge carousels: max index is totalSlides - 1 (can navigate to each slide)
      if (isBigCarousel || isHugeCarousel) return Math.max(0, totalSlides - 1)

      // Small carousel uses the original calculation
      const carouselWidth = carousel.offsetWidth,
        slideWidth = this.getSlideWidth(carousel),
        gap = this.getGap(carousel),
        horizontalPadding = this.getHorizontalPadding(carousel),
        availableWidth = carouselWidth - horizontalPadding,
        totalContentWidth = (slideWidth * totalSlides) + (gap * (totalSlides - 1))

      // If all content fits in the available space, no translation needed
      if (totalContentWidth <= availableWidth) return 0

      // Calculate how many slides can start a "viewport window"
      const slideAndGapWidth = slideWidth + gap

      // Find the last slide and pin it to the right side of the carousel
      const minLastSlidePosition = totalContentWidth - availableWidth,
        maxStartingSlideIndex = Math.ceil(minLastSlidePosition / slideAndGapWidth),
        maxIndex = Math.min(maxStartingSlideIndex, totalSlides - 1)

      return Math.max(0, maxIndex)
    } catch (error) {
      console.error('CarouselCalculator: Failed to calculate max translate index', error)
      return 0
    }
  },

  getTranslateValue (carousel, targetIndex) {
    try {
      const isBigCarousel = this.bigCarousel(carousel),
        isHugeCarousel = this.hugeCarousel(carousel),
        isFadeCarousel = carousel.classList.contains(CarouselConfig.classes.fade),
        isHugeFadeEffect = isHugeCarousel && isFadeCarousel

      // Huge carousel with fade effect: no translation needed
      if (isHugeFadeEffect) return 0

      // Big carousels and Huge carousels with slide effect: simple slide-by-slide translation
      if (isBigCarousel || isHugeCarousel) {
        const slideWidth = this.getSlideWidth(carousel),
          gap = this.getGap(carousel),
          slideAndGapWidth = slideWidth + gap

        // Simple slide-by-slide translation for 1-slide-visible carousels
        return -(slideAndGapWidth * targetIndex)
      }

      // Small carousel uses the original complex calculation
      const slideWidth = this.getSlideWidth(carousel),
        gap = this.getGap(carousel),
        carouselWidth = carousel.offsetWidth,
        horizontalPadding = this.getHorizontalPadding(carousel),
        items = carousel.querySelectorAll(CarouselConfig.selector.item),
        totalSlides = items.length

      if (targetIndex === 0) return 0

      // Available width inside the wrapper (accounting for padding)
      const availableWidth = carouselWidth - horizontalPadding,
        slideAndGapWidth = slideWidth + gap,
        totalContentWidth = (slideWidth * totalSlides) + (gap * (totalSlides - 1))

      // If all content fits, no translation needed
      if (totalContentWidth <= availableWidth) return 0

      // Standard translation (slide by slide)
      const standardTranslate = -(slideAndGapWidth * targetIndex)

      // Check if this would over-translate (leave empty space on the right)
      const contentEndPosition = totalContentWidth + standardTranslate

      if (contentEndPosition < availableWidth) {
        const rightAlignedTranslate = -(totalContentWidth - availableWidth)
        return rightAlignedTranslate
      }

      return standardTranslate
    } catch (error) {
      console.error('CarouselCalculator: Failed to calculate translate value', error)
      return 0
    }
  },

  shouldShowControls (carousel) {
    try {
      const items = carousel.querySelectorAll(CarouselConfig.selector.item)
      if (!items.length) return false

      const isBigCarousel = this.bigCarousel(carousel),
        isHugeCarousel = this.hugeCarousel(carousel)

      // Big and Huge carousels: show controls if there's more than 1 slide
      if (isBigCarousel || isHugeCarousel) return items.length > 1

      // Small carousel: detect if ANY content overflows (even 1px)
      const carouselWidth = $.getDimensions(carousel).width,
        slideWidth = this.getSlideWidth(carousel),
        gap = this.getGap(carousel),
        horizontalPadding = this.getHorizontalPadding(carousel),
        availableWidth = carouselWidth - horizontalPadding,
        totalContentWidth = (slideWidth * items.length) + (gap * (items.length - 1))

      // Show controls if ANY part of content doesn't fit (even 1px overflow)
      return totalContentWidth > availableWidth
    } catch (error) {
      console.error('CarouselCalculator: Failed to determine control visibility', error)
      return true // Default to showing controls on error
    }
  }
}

const CarouselRenderer = {
  setSlideEffect (wrapper, translate) {
    const transform = () => {
      wrapper.style.transform = `translateX(${translate}px)`
    }
    $.batchDOM(transform)
  },

  setFadeEffect (carousel, activeIndex) {
    const read = () => {
      return carousel.querySelectorAll(CarouselConfig.selector.item)
    }

    const write = (items) => {
      if (!items.length) return

      // Apply show/hide classes for fade effect transitions
      items.forEach((item, index) => {
        const changeClass = (addShow, removeHide) => {
          $.toggleClass(item, CarouselConfig.classes.show, addShow)
          $.toggleClass(item, CarouselConfig.classes.hide, removeHide)
        }

        index === activeIndex ?
          changeClass(true, false) :
          changeClass(false, true)
      })
    }

    $.frameSequence(read, write)
  },

  updateDots (carousel, activeIndex) {
    const read = () => {
      return carousel.querySelectorAll(CarouselConfig.selector.dot)
    }

    const write = (dots) => {
      if (!dots.length) return
      dots.forEach((dot, index) => {
        $.toggleClass(dot, CarouselConfig.classes.active, index === activeIndex)
      })
    }

    $.frameSequence(read, write)
  },

  updateCounter (carousel, activeIndex) {
    const read = () => {
      return {
        counter: carousel.querySelector(CarouselConfig.selector.counter),
        count: carousel.querySelector(CarouselConfig.selector.count)
      }
    }

    const write = (elements) => {
      const { counter, count } = elements
      if (!counter || !count) return

      const currentIndex = activeIndex + 1,
        formattedIndex = currentIndex < 10 ? `0${currentIndex}` : `${currentIndex}`
      count.textContent = formattedIndex
    }

    $.frameSequence(read, write)
  },

  updateOverlayColor (carousel, activeIndex) {
    const read = () => {
      const carouselType = CarouselCalculator.getCarouselType(carousel)
      if (carouselType !== CarouselConfig.carouselTypes.huge) return null // Only apply to Huge carousels

      const defaultColor = carousel.getAttribute(CarouselConfig.attr.defaultColor),
        items = carousel.querySelectorAll(CarouselConfig.selector.item),
        currentSlide = items[activeIndex],
        attributeValue = currentSlide.getAttribute(CarouselConfig.attr.overlayColor),
        overlayColor = currentSlide ? attributeValue : null

      return { defaultColor, overlayColor, shouldUpdate: defaultColor !== null }
    }

    const write = (data) => {
      if (!data || !data.shouldUpdate) return

      const { defaultColor, overlayColor } = data
      const setCss = (elem, color) => {
        $.setCssVar({ key: CarouselConfig.cssProp.overlay, value: color, element: elem })
        $.setCssVar({ key: CarouselConfig.cssProp.overlay08, value: `${color}24`, element: elem })
        $.setCssVar({ key: CarouselConfig.cssProp.overlay45, value: `${color}73`, element: elem })
      }

      if (!overlayColor) {
        setCss(carousel, defaultColor)
      } else {
        // Compare colors (case-insensitive, trim whitespace)
        const normalizedDefault = defaultColor.trim().toLowerCase(),
          normalizedOverlay = overlayColor.trim().toLowerCase()

        normalizedDefault === normalizedOverlay ?
          setCss(carousel, defaultColor) :
          setCss(carousel, overlayColor)
      }
    }

    $.frameSequence(read, write)
  },

  toggleControls (carousel, shouldHide) {
    const read = () => {
      return {
        navigation: carousel.querySelector(CarouselConfig.selector.navigation),
        pagination: carousel.querySelector(CarouselConfig.selector.pagination)
      }
    }

    const write = (controls) => {
      if (controls.navigation) $.toggleClass(controls.navigation, CarouselConfig.classes.hidden, shouldHide)
      if (controls.pagination) $.toggleClass(controls.pagination, CarouselConfig.classes.hidden, shouldHide)
    }

    $.frameSequence(read, write)
  }
}

const CarouselTouch = {
  handleWheelEvent (instance, event) {
    try {
      // Only handle horizontal scrolling or when shift is held for vertical trackpads
      const horizontalScroll = Math.abs(event.deltaX) > Math.abs(event.deltaY),
        verticalScroll = event.shiftKey && Math.abs(event.deltaY) > 0

      if (!horizontalScroll && !verticalScroll) return

      event.preventDefault()

      let deltaX = horizontalScroll ? event.deltaX : event.deltaY

      // Normalize wheel delta (different browsers/devices have different scales)
      const normalizedDelta = Math.sign(deltaX) * Math.min(Math.abs(deltaX), 100)

      const now = Date.now()
      if (!instance.wheelState) {
        instance.wheelState = {
          lastWheelTime: 0,
          accumulatedDelta: 0,
          debounceTimer: null
        }
      }

      instance.wheelState.accumulatedDelta += normalizedDelta
      instance.wheelState.lastWheelTime = now

      if (instance.wheelState.debounceTimer) {
        clearTimeout(instance.wheelState.debounceTimer)
      }

      // Set new debounce timer to process accumulated scroll
      instance.wheelState.debounceTimer = setTimeout(() => {
        const threshold = 50 // Minimum accumulated delta to trigger navigation

        if (Math.abs(instance.wheelState.accumulatedDelta) > threshold) {
          const scrollToLeft = () => {
            if (instance.currentIndex > 0) instance.goToPrev() // Scroll left/up - go to previous slide
          }
          const scrollToRight = () => {
            if (instance.currentIndex < instance.maxIndex) instance.goToNext() // Scroll right/down - go to next slide
          }

          instance.wheelState.accumulatedDelta > 0 ? scrollToRight() : scrollToLeft()
        }

        instance.wheelState.accumulatedDelta = 0
      }, 50) // Debounce delay

      instance.pauseAutoScroll()
      if (instance.wheelResumeTimer) {
        clearTimeout(instance.wheelResumeTimer)
      }
      instance.wheelResumeTimer = setTimeout(() => {
        instance.resumeAutoScroll()
      }, 250)
    } catch (error) {
      console.error('CarouselTouch: Failed to handle wheel event', error)
    }
  },

  handleTouchStart (instance, event) {
    try {
      const touch = event.touches[0]
      instance.touch = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        startTime: Date.now(),
        isDragging: false,
        initialTransform: instance.getCurrentTransform()
      }

      $.toggleClass(instance.carousel, CarouselConfig.classes.swiping, true)

      instance.pauseAutoScroll()
    } catch (error) {
      console.error('CarouselTouch: Failed to handle touch start', error)
    }
  },

  handleTouchMove (instance, event) {
    try {
      if (!instance.touch) return

      const touch = event.touches[0],
        deltaX = touch.clientX - instance.touch.startX,
        deltaY = touch.clientY - instance.touch.startY

      // Check horizontally swiping
      if (!instance.touch.isDragging && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        instance.touch.isDragging = true
        event.preventDefault()
      }

      if (instance.touch.isDragging) {
        instance.touch.currentX = touch.clientX

        // Apply resistance at boundaries
        let resistance = 1
        const start = instance.currentIndex === 0 && deltaX > 0,
          end = instance.currentIndex === instance.maxIndex && deltaX < 0

        if (start || end) {
          resistance = CarouselConfig.touch.resistance
        }

        const constrainedDelta = deltaX * resistance,
          newTransform = instance.touch.initialTransform + constrainedDelta

        const applyTransform = () => {
          instance.wrapper.style.transform = `translateX(${newTransform}px)`
          instance.wrapper.style.transition = 'none'
        }
        $.batchDOM(applyTransform)
      }
    } catch (error) {
      console.error('CarouselTouch: Failed to handle touch move', error)
    }
  },

  handleTouchEnd (instance, event) {
    try {
      if (!instance.touch) return

      const deltaX = instance.touch.currentX - instance.touch.startX,
        deltaTime = Date.now() - instance.touch.startTime,
        velocity = Math.abs(deltaX) / deltaTime

      $.toggleClass(instance.carousel, CarouselConfig.classes.swiping, false)

      const resetTransition = () => {
        instance.wrapper.style.transition = ''
      }
      $.batchDOM(resetTransition)

      if (instance.touch.isDragging) {
        // Determine if we should change slides
        const threshold = CarouselConfig.touch.threshold,
          shouldChange = Math.abs(deltaX) > threshold || velocity > 0.5

        const transformHandler = () => {
          if (deltaX > 0 && instance.currentIndex > 0) {
            instance.goToPrev()
          } else if (deltaX < 0 && instance.currentIndex < instance.maxIndex) {
            instance.goToNext()
          } else {
            instance.goToSlide(instance.currentIndex)
          }
        }

        shouldChange ? transformHandler() : instance.goToSlide(instance.currentIndex)

        event.preventDefault()
      }

      instance.resumeAutoScroll()
      instance.touch = null
    } catch (error) {
      console.error('CarouselTouch: Failed to handle touch end', error)
    }
  }
}

const CarouselAccessibility = {
  setupAccessibility (instance) {
    try {
      this.setupLiveRegion(instance) // Setup live region for announcements
      this.setupKeyboardNavigation(instance) // Setup keyboard navigation
      this.setupFocusManagement(instance) // Setup focus management
    } catch (error) {
      console.error('CarouselAccessibility: Failed to setup accessibility', error)
    }
  },

  setupLiveRegion (instance) {
    try {
      let liveRegion = instance.carousel.querySelector(CarouselConfig.selector.region)
      if (!liveRegion) {
        liveRegion = document.createElement('div')
        liveRegion.className = CarouselConfig.classes.region
        liveRegion.setAttribute(CarouselConfig.attr.ariaLive, 'polite')
        liveRegion.setAttribute(CarouselConfig.attr.ariaAtomic, 'true')
        liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
        instance.carousel.appendChild(liveRegion)
      }
      instance.liveRegion = liveRegion
    } catch (error) {
      console.error('CarouselAccessibility: Failed to setup live region', error)
    }
  },

  announceSlideChange (instance) {
    try {
      if (!instance.liveRegion) return

      const currentSlide = instance.currentIndex + 1,
        totalSlides = instance.totalSlides,
        message = `Slide ${currentSlide} of ${totalSlides}`

      setTimeout(() => {
        instance.liveRegion.textContent = message // Delay announcement to avoid overwhelming screen readers
      }, CarouselConfig.accessibility.announceDelay)
    } catch (error) {
      console.error('CarouselAccessibility: Failed to announce slide change', error)
    }
  },

  setupKeyboardNavigation (instance) {
    try {
      instance.carousel.setAttribute(CarouselConfig.attr.tabIndex, '0')

      instance.keyboardHandler = (event) => {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            instance.goToPrev()
            break
          case 'ArrowRight':
            event.preventDefault()
            instance.goToNext()
            break
          case 'Home':
            event.preventDefault()
            instance.goToSlide(0)
            break
          case 'End':
            event.preventDefault()
            instance.goToSlide(instance.maxIndex)
            break
          case ' ':
          case 'Enter':
            event.preventDefault()
            instance.isPaused ?
              instance.resumeAutoScroll() :
              instance.pauseAutoScroll()
            break
        }
      }

      $.eventListener('add', instance.carousel, 'keydown', instance.keyboardHandler)
    } catch (error) {
      console.error('CarouselAccessibility: Failed to setup keyboard navigation', error)
    }
  },

  setupFocusManagement (instance) {
    try {
      // Ensure navigation buttons are properly focusable
      if (instance.prevBtn) {
        instance.prevBtn.setAttribute(CarouselConfig.attr.tabIndex, '0')
      }
      if (instance.nextBtn) {
        instance.nextBtn.setAttribute(CarouselConfig.attr.tabIndex, '0')
      }

      // Setup focus on dots
      instance.dots.forEach((dot, index) => {
        dot.setAttribute(CarouselConfig.attr.tabIndex, '0')
        dot.setAttribute(CarouselConfig.attr.ariaLabel, `Go to slide ${index + 1}`)
      })
    } catch (error) {
      console.error('CarouselAccessibility: Failed to setup focus management', error)
    }
  }
}

const CarouselDetection = {
  observer: null,
  observerSetup: false,
  resizeHandler: null,

  setResizeObserver () {
    if (this.observerSetup) return this.observer

    const handleResize = () => {
      CarouselCache.clear()

      // Handle traditional instances
      CarouselController.instances.forEach((instance) => {
        instance.handleResize()
      })

      // Handle viewport-managed instances
      CarouselViewportManager.activeCarousels.forEach((instance) => {
        if (instance && instance.handleResize) {
          instance.handleResize()
        }
      })
    }

    // Use both ResizeObserver and window resize for better mobile support
    const { observer, cleanup: resizeObserverCleanup } = $.resizeObserver(handleResize, {
      debounceTime: 100
    })

    this.resizeHandler = $.debounce(handleResize, 150)
    $.eventListener('add', window, 'resize', this.resizeHandler, { passive: true })

    this.observer = observer
    this.observerSetup = true
    this.resizeObserverCleanup = resizeObserverCleanup

    return this.observer
  },

  cleanup () {
    if (this.resizeObserverCleanup) this.resizeObserverCleanup()

    if (this.resizeHandler) {
      $.eventListener('remove', window, 'resize', this.resizeHandler, { passive: true })
      this.resizeHandler = null
    }

    this.observer = null
    this.observerSetup = false
  }
}

const CarouselController = {
  instances: [],

  createInstance (carousel) {
    const wrapper = carousel.querySelector(CarouselConfig.selector.wrapper),
      items = carousel.querySelectorAll(CarouselConfig.selector.item)

    if (!wrapper || !items.length) return null

    const prevBtn = carousel.querySelector(CarouselConfig.selector.prev),
      nextBtn = carousel.querySelector(CarouselConfig.selector.next),
      dots = carousel.querySelectorAll(CarouselConfig.selector.dot),
      timerVal = carousel.getAttribute(CarouselConfig.attr.timer),
      visibleSlides = CarouselCalculator.getVisibleSlidesCount(carousel),
      maxTranslateIndex = CarouselCalculator.getMaxTranslateIndex(carousel, items.length)

    const instance = {
      carousel,
      wrapper,
      items,
      prevBtn,
      nextBtn,
      dots,
      currentIndex: 0,
      maxIndex: maxTranslateIndex,
      totalSlides: items.length,
      visibleSlides,
      timer: $.is(timerVal, 'string') && timerVal.length > 0 ? parseInt(timerVal) * 1000 : 0,
      autoScrollTimer: null,
      isPaused: false,
      hasVideos: carousel.querySelectorAll(CarouselConfig.selector.video).length > 0,
      throttler: null,
      eventHandlers: {
        prev: null,
        next: null,
        dots: [],
        mouseenter: null,
        mouseleave: null,
        touchstart: null,
        touchmove: null,
        touchend: null,
        wheel: null
      },
      touch: null,
      wheelState: null,
      wheelResumeTimer: null,
      keyboardHandler: null,
      liveRegion: null,

      init () {
        try {
          this.setupEventHandlers()
          this.setupTouchHandlers()
          this.setupPagination()
          this.updateControlsVisibility()
          this.startAutoScroll()
          CarouselAccessibility.setupAccessibility(this)

          const carouselType = CarouselCalculator.getCarouselType(this.carousel)
          if (carouselType === CarouselConfig.carouselTypes.huge) {
            CarouselRenderer.updateOverlayColor(this.carousel, this.currentIndex)
          }

          this.preloadCarouselImages()

          // Handle state restoration after initialization is complete
          if (this.needsStateRestore && this.restoreTargetIndex !== undefined) {
            // Restore to the saved slide position
            this.goToSlide(this.restoreTargetIndex)
            this.needsStateRestore = false
            this.restoreTargetIndex = undefined
          }

          this.markInitialized()
        } catch (error) {
          console.error('Carousel: Failed to initialize', error)
        }
      },

      preloadCarouselImages () {
        try {
          const images = this.carousel.querySelectorAll(CarouselConfig.selector.imageHidden)
          if (!images.length || !$.imageLoader) return

          images.forEach((img) => $.imageLoader.loadImage(img))
        } catch (error) {
          console.error('Carousel: Failed to preload images', error)
        }
      },

      getCurrentTransform () {
        try {
          const transform = this.wrapper.style.transform
          if (!transform || transform === 'none') return 0

          const matrix = transform.match(/translateX?\(([^)]+)\)/)
          if (matrix && matrix[1]) return parseFloat(matrix[1]) || 0

          return 0
        } catch (error) {
          console.error('Carousel: Failed to get current transform', error)
          return 0
        }
      },

      setupTouchHandlers () {
        try {
          this.eventHandlers.touchstart = (event) => CarouselTouch.handleTouchStart(this, event)
          this.eventHandlers.touchmove = (event) => CarouselTouch.handleTouchMove(this, event)
          this.eventHandlers.touchend = (event) => CarouselTouch.handleTouchEnd(this, event)
          this.eventHandlers.wheel = (event) => CarouselTouch.handleWheelEvent(this, event)

          $.eventListener('add', this.wrapper, 'touchstart', this.eventHandlers.touchstart, { passive: false })
          $.eventListener('add', this.wrapper, 'touchmove', this.eventHandlers.touchmove, { passive: false })
          $.eventListener('add', this.wrapper, 'touchend', this.eventHandlers.touchend, { passive: false })
          $.eventListener('add', this.carousel, 'wheel', this.eventHandlers.wheel, { passive: false })
        } catch (error) {
          console.error('Carousel: Failed to setup touch handlers', error)
        }
      },

      setupEventHandlers () {
        const hasPause = this.carousel.classList.contains(CarouselConfig.classes.pause)
        const eventPrevClick = () => {
          this.eventHandlers.prev = () => this.goToPrev()
          $.eventListener('add', this.prevBtn, 'click', this.eventHandlers.prev)
        }
        const eventNextClick = () => {
          this.eventHandlers.next = () => this.goToNext()
          $.eventListener('add', this.nextBtn, 'click', this.eventHandlers.next)
        }
        const eventPause = () => {
          this.eventHandlers.mouseenter = () => this.pauseAutoScroll()
          this.eventHandlers.mouseleave = () => this.resumeAutoScroll()
          this.eventHandlers.touchstart = () => this.pauseAutoScroll()
          this.eventHandlers.touchend = () => this.resumeAutoScroll()

          $.eventListener('add', this.carousel, 'mouseenter', this.eventHandlers.mouseenter)
          $.eventListener('add', this.carousel, 'mouseleave', this.eventHandlers.mouseleave)
          $.eventListener('add', this.carousel, 'touchstart', this.eventHandlers.touchstart, { passive: true })
          $.eventListener('add', this.carousel, 'touchend', this.eventHandlers.touchend, { passive: true })
        }

        if (this.prevBtn) eventPrevClick()
        if (this.nextBtn) eventNextClick()
        if (this.timer > 0 && hasPause) eventPause()
      },

      setupPagination () {
        const read = () => {
          const currentMaxIndex = CarouselCalculator.getMaxTranslateIndex(this.carousel, this.totalSlides)

          return {
            dots: this.dots,
            maxIndex: currentMaxIndex,
            existingHandlers: [...this.eventHandlers.dots]
          }
        }

        const write = (data) => {
          const { dots, maxIndex, existingHandlers } = data

          this.maxIndex = maxIndex

          dots.forEach((dot, index) => {
            if (existingHandlers[index]) {
              $.eventListener('remove', dot, 'click', existingHandlers[index])
              this.eventHandlers.dots[index] = null
            }
          })

          dots.forEach((dot, index) => {
            if (index <= maxIndex) {
              const handler = () => {
                if (!this.throttleNavigation()) {
                  this.goToSlide(index)
                }
              }
              this.eventHandlers.dots[index] = handler
              $.eventListener('add', dot, 'click', handler)
              $.toggleClass(dot, CarouselConfig.classes.hidden, false)
            } else {
              $.toggleClass(dot, CarouselConfig.classes.hidden, true)
            }
          })
        }

        $.frameSequence(read, write)
      },

      throttleNavigation () {
        try {
          // Only apply throttling to carousels with videos
          const isVideoCarousel = CarouselCalculator.hugeCarousel(this.carousel)
          if (!isVideoCarousel) return false

          const video = window.videoLoadingInstance
          if (video && video.throttlingNavigation) {
            if (video.throttlingNavigation()) return true
          }

          if (!this.throttler) {
            const throttleHandler = () => {
              this.throttler = $.videoHelper.createThrottler(CarouselConfig.time.throttleTime)
            }

            // Fallback if VideoHelper not available
            const throttleFallback = () => {
              this.lastNavigationTime = this.lastNavigationTime || 0
              this.throttler = () => {
                const now = Date.now(),
                  timeSinceLastNavigation = now - this.lastNavigationTime
                if (timeSinceLastNavigation < CarouselConfig.time.throttleTime) return true
                this.lastNavigationTime = now
                return false
              }
            }

            $.videoHelper && $.videoHelper.createThrottler ?
              throttleHandler() :
              throttleFallback()
          }

          return this.throttler()
        } catch (error) {
          console.warn('Carousel: Failed to check navigation throttling', error)
          return false
        }
      },

      goToPrev () {
        if (this.throttleNavigation()) return
        const prevIndex = ($.videoHelper && $.videoHelper.getPrevIndex) ?
          $.videoHelper.getPrevIndex(this.currentIndex, this.maxIndex, true) :
          (this.currentIndex > 0 ? this.currentIndex - 1 : this.maxIndex)
        this.goToSlide(prevIndex)
      },

      goToNext () {
        if (this.throttleNavigation()) return
        const nextIndex = ($.videoHelper && $.videoHelper.getNextIndex) ?
          $.videoHelper.getNextIndex(this.currentIndex, this.maxIndex, true) :
          (this.currentIndex < this.maxIndex ? this.currentIndex + 1 : 0)
        this.goToSlide(nextIndex)
      },

      goToSlide (targetIndex) {
        try {
          if (targetIndex === this.currentIndex) return

          const newIndex = ($.videoHelper && $.videoHelper.clampIndex) ?
            $.videoHelper.clampIndex(targetIndex, this.maxIndex) :
            Math.max(0, Math.min(targetIndex, this.maxIndex))
          if (newIndex === this.currentIndex) return

          this.currentIndex = newIndex

          const carouselType = CarouselCalculator.getCarouselType(this.carousel),
            isHuge = carouselType === CarouselConfig.carouselTypes.huge,
            isFade = this.carousel.classList.contains('carousel__fade-effect'),
            isHugeFadeEffect = isHuge && isFade

          const slideEffectHandler = () => {
            const translateX = CarouselCalculator.getTranslateValue(this.carousel, this.currentIndex)
            CarouselRenderer.setSlideEffect(this.wrapper, translateX)
          }

          const fadeEffectHandler = () => {
            CarouselRenderer.setFadeEffect(this.carousel, this.currentIndex)
          }

          isHugeFadeEffect ? fadeEffectHandler() : slideEffectHandler()

          CarouselRenderer.updateDots(this.carousel, this.currentIndex)

          if (isHuge) {
            CarouselRenderer.updateCounter(this.carousel, this.currentIndex, this.totalSlides)
            CarouselRenderer.updateOverlayColor(this.carousel, this.currentIndex)
          }

          // Announce slide change for accessibility
          CarouselAccessibility.announceSlideChange(this)

          // Integrate with video system if available
          this.handleVideoIntegration(this.currentIndex)
        } catch (error) {
          console.error('Carousel: Failed to go to slide', error)
        }
      },

      handleVideoIntegration (slideIndex) {
        try {
          const video = window.videoLoadingInstance
          if (video && video.onSlideChange && this.hasVideos) {
            const isAutoRotating = this.autoScrollTimer !== null
            const videoSlideIndex = ($.videoHelper && $.videoHelper.containerIndexToSlideIndex) ?
              $.videoHelper.containerIndexToSlideIndex(slideIndex) :
              (slideIndex + 1)
            video.onSlideChange(videoSlideIndex, isAutoRotating)
          }
        } catch (error) {
          console.warn('Carousel: Failed to integrate with video system', error)
        }
      },

      startAutoScroll () {
        if (this.timer <= 0) return

        this.autoScrollTimer = setInterval(() => {
          if (!this.isPaused) this.goToNext()
        }, this.timer)
      },

      pauseAutoScroll () {
        this.isPaused = true
      },

      resumeAutoScroll () {
        this.isPaused = false
      },

      stopAutoScroll () {
        if (!this.autoScrollTimer) return null
        clearInterval(this.autoScrollTimer)
        this.autoScrollTimer = null
      },

      updateControlsVisibility () {
        const read = () => {
          return CarouselCalculator.shouldShowControls(this.carousel)
        }

        const write = (shouldShow) => {
          CarouselRenderer.toggleControls(this.carousel, !shouldShow)
        }

        $.frameSequence(read, write)
      },

      handleResize () {
        const read = () => {
          // Force cache invalidation for this specific carousel (both mobile and desktop)
          const carouselId = this.carousel.dataset.carouselId
          CarouselCache.delete(`slideWidth-${carouselId}-mobile`)
          CarouselCache.delete(`slideWidth-${carouselId}-desktop`)
          CarouselCache.delete(`gap-${carouselId}-mobile`)
          CarouselCache.delete(`gap-${carouselId}-desktop`)

          // Read current state and calculate new bounds
          const oldVisibleSlides = this.visibleSlides,
            oldMaxIndex = this.maxIndex,
            newVisibleSlides = CarouselCalculator.getVisibleSlidesCount(this.carousel),
            newMaxIndex = CarouselCalculator.getMaxTranslateIndex(this.carousel, this.totalSlides),
            boundsChanged = (oldVisibleSlides !== newVisibleSlides || oldMaxIndex !== newMaxIndex)

          return {
            newVisibleSlides,
            newMaxIndex,
            boundsChanged,
            currentIndex: this.currentIndex
          }
        }

        const write = (data) => {
          const { newVisibleSlides, newMaxIndex, boundsChanged, currentIndex } = data

          // Update instance properties
          this.visibleSlides = newVisibleSlides
          this.maxIndex = newMaxIndex

          // If controls are no longer needed, reset to beginning
          const resetHandler = () => {
            this.currentIndex = 0
            this.stopAutoScroll() // Stop auto-scroll when no navigation is needed
          }

          const resumeHandler = () => {
            // Ensure current index is within new bounds
            if (currentIndex > newMaxIndex) this.currentIndex = newMaxIndex

            // Restart auto-scroll if it was configured and we need navigation
            if (this.timer > 0 && !this.autoScrollTimer) this.startAutoScroll()
          }

          newMaxIndex === 0 ? resetHandler() : resumeHandler()

          // Update pagination for new bounds (always update if bounds changed)
          if (boundsChanged) this.setupPagination()

          this.updateControlsVisibility()

          const carouselType = CarouselCalculator.getCarouselType(this.carousel),
            isHugeCarousel = carouselType === CarouselConfig.carouselTypes.huge,
            isFadeCarousel = this.carousel.classList.contains(CarouselConfig.classes.fade),
            isHugeFadeEffect = isHugeCarousel && isFadeCarousel

          const fadeEffectHandler = () => {
            CarouselRenderer.setFadeEffect(this.carousel, this.currentIndex)
          }
          const slideEffectHandler = () => {
            const translateX = CarouselCalculator.getTranslateValue(this.carousel, this.currentIndex)
            CarouselRenderer.setSlideEffect(this.wrapper, translateX)
          }

          isHugeFadeEffect ? fadeEffectHandler() : slideEffectHandler()

          CarouselRenderer.updateDots(this.carousel, this.currentIndex)

          if (isHugeCarousel) {
            CarouselRenderer.updateCounter(this.carousel, this.currentIndex, this.totalSlides)
            CarouselRenderer.updateOverlayColor(this.carousel, this.currentIndex)
          }
        }

        $.frameSequence(read, write)
      },

      markInitialized () {
        const initialized = () => {
          $.toggleClass(this.carousel, CarouselConfig.classes.initialized, true)
        }

        $.batchDOM(initialized)
      },

      cleanup () {
        try {
          this.stopAutoScroll()

          // Remove navigation event handlers
          if (this.eventHandlers.prev && this.prevBtn) {
            $.eventListener('remove', this.prevBtn, 'click', this.eventHandlers.prev)
          }
          if (this.eventHandlers.next && this.nextBtn) {
            $.eventListener('remove', this.nextBtn, 'click', this.eventHandlers.next)
          }

          // Remove dot event handlers
          this.dots.forEach((dot, index) => {
            if (this.eventHandlers.dots[index]) {
              $.eventListener('remove', dot, 'click', this.eventHandlers.dots[index])
            }
          })

          // Remove hover/touch handlers for auto-scroll
          if (this.timer > 0 && this.carousel.classList.contains(CarouselConfig.classes.pause)) {
            if (this.eventHandlers.mouseenter) {
              $.eventListener('remove', this.carousel, 'mouseenter', this.eventHandlers.mouseenter)
            }
            if (this.eventHandlers.mouseleave) {
              $.eventListener('remove', this.carousel, 'mouseleave', this.eventHandlers.mouseleave)
            }
          }

          // Remove touch gesture handlers
          if (this.eventHandlers.touchstart) {
            $.eventListener('remove', this.wrapper, 'touchstart', this.eventHandlers.touchstart, { passive: false })
          }
          if (this.eventHandlers.touchmove) {
            $.eventListener('remove', this.wrapper, 'touchmove', this.eventHandlers.touchmove, { passive: false })
          }
          if (this.eventHandlers.touchend) {
            $.eventListener('remove', this.wrapper, 'touchend', this.eventHandlers.touchend, { passive: false })
          }

          // Remove wheel event handler
          if (this.eventHandlers.wheel) {
            $.eventListener('remove', this.carousel, 'wheel', this.eventHandlers.wheel, { passive: false })
          }

          // Clean up wheel timers
          if (this.wheelState && this.wheelState.debounceTimer) {
            clearTimeout(this.wheelState.debounceTimer)
          }
          if (this.wheelResumeTimer) {
            clearTimeout(this.wheelResumeTimer)
          }

          // Remove keyboard handler
          if (this.keyboardHandler) {
            $.eventListener('remove', this.carousel, 'keydown', this.keyboardHandler)
          }

          // Remove live region
          if (this.liveRegion && this.liveRegion.parentNode) {
            this.liveRegion.parentNode.removeChild(this.liveRegion)
          }

          return null
        } catch (error) {
          console.error('Carousel: Failed to cleanup', error)
          return null
        }
      }
    }

    return instance
  },

  init () {
    if (!CarouselDOM.init()) return null

    CarouselDetection.setResizeObserver()
    CarouselViewportManager.init()

    const carousels = CarouselDOM.elements.carousels,
      isMobile = $.viewportSize().width < 992,
      hasVideoCarousels = this.detectVideoCarousels(carousels)

    if (isMobile && hasVideoCarousels) {
      // Mobile: Only initialize first 2 carousels immediately, lazy-load the rest
      const immediateCarousels = 2

      carousels.forEach((carousel, index) => {
        carousel.dataset.carouselId = `carousel-${index}`

        index < immediateCarousels ?
          // Initialize first 2 carousels immediately
          CarouselViewportManager.observe(carousel) :
          // Lazy-load remaining carousels with viewport detection and delays
          this.setupLazyCarousel(carousel, index, immediateCarousels)
      })
    } else {
      // Normal initialization: Desktop or mobile without video carousels
      carousels.forEach((carousel, index) => {
        carousel.dataset.carouselId = `carousel-${index}`
        CarouselViewportManager.observe(carousel)
      })
    }

    return this.cleanup.bind(this)
  },

  detectVideoCarousels (carousels) {
    return Array.from(carousels).some((carousel) => {
      const isHugeCarousel = carousel.classList.contains(CarouselConfig.classes.edges)
      if (!isHugeCarousel) return false

      const hasVideoContainers = carousel.querySelectorAll(CarouselConfig.selector.video).length > 0
      return hasVideoContainers
    })
  },

  setupLazyCarousel (carousel, index, immediateCarousels) {
    const delay = (index - immediateCarousels + 1) * 8000
    CarouselViewportManager.observeLazy(carousel, delay)
  },

  cleanup () {
    this.instances.forEach((instance) => {
      if (instance.cleanup) instance.cleanup()
    })
    this.instances = []

    CarouselViewportManager.cleanup()
    CarouselInstancePool.cleanup()
    CarouselDetection.cleanup()
    CarouselDOM.cleanup()
    return null
  }
}

const handleCarousels = () => {
  return CarouselController.init()
}

const initCarousels = () => {
  $.cleanup('cleanupCarousels', handleCarousels)
}

initCarousels()
