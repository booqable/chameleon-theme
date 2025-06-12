/**
 * Carousel Component
 *
 * High-performance carousel with transform translate approach.
 * Supports navigation buttons, pagination dots, and auto-scroll with hover pause.
 *
 * @requires js-utils-core.js
 */

const CarouselConfig = {
  selector: {
    carousel: '.carousel',
    wrapper: '.carousel__wrapper',
    item: '.carousel__item',
    navigation: '.carousel__navigation',
    pagination: '.carousel__pagination',
    prev: '.carousel__btn.prev',
    next: '.carousel__btn.next',
    dot: '.carousel__dot',
    counter: '.carousel__counter',
    count: '.carousel__count'
  },
  carouselTypes: {
    small: 'small',
    big: 'big',
    huge: 'huge'
  },
  classes: {
    hidden: 'hidden',
    active: 'active',
    initialized: 'initialized',
    paused: 'carousel__pause',
    swiping: 'carousel__swiping',
    reduced: 'carousel__reduced-motion',
    show: 'show',
    hide: 'hide'
  },
  attr: {
    timer: 'data-carousel-timer',
    ariaLabel: 'aria-label',
    ariaLive: 'aria-live',
    ariaAtomic: 'aria-atomic',
    tabIndex: 'tabindex',
    defaultColor: 'data-default-color',
    overlayColor: 'data-overlay-color'
  },
  viewport: {
    mobileBreakpoint: 992
  },
  animation: {
    reducedDuration: 150
  },
  touch: {
    threshold: 50,
    resistance: 0.25
  },
  cache: {
    maxSize: 50,
    ttl: 30000 // 30 seconds
  },
  accessibility: {
    announceDelay: 100
  }
}

const CarouselCache = {
  data: new Map(),

  set(key, value) {
    try {
      // Clean up expired entries if cache is getting large
      if (this.data.size >= CarouselConfig.cache.maxSize) {
        this.cleanup()
      }

      this.data.set(key, {
        value,
        timestamp: Date.now()
      })
    } catch (error) {
      console.warn('CarouselCache: Failed to set cache entry', error)
    }
  },

  get(key) {
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

  delete(key) {
    try {
      this.data.delete(key)
    } catch (error) {
      console.warn('CarouselCache: Failed to delete cache entry', error)
    }
  },

  cleanup() {
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

  clear() {
    try {
      this.data.clear()
    } catch (error) {
      console.warn('CarouselCache: Failed to clear cache', error)
    }
  }
}

const CarouselDOM = {
  elements: {
    carousels: null
  },

  init() {
    try {
      this.elements.carousels = document.querySelectorAll(CarouselConfig.selector.carousel)
      return this.elements.carousels && this.elements.carousels.length > 0
    } catch (error) {
      console.error('CarouselDOM: Failed to initialize', error)
      return false
    }
  },

  cleanup() {
    try {
      CarouselCache.clear()
      this.elements.carousels = null
    } catch (error) {
      console.warn('CarouselDOM: Failed to cleanup', error)
    }
  }
}

const CarouselCalculator = {
  getCarouselType(carousel) {
    try {
      if (carousel.classList.contains('carousel__edges')) {
        return CarouselConfig.carouselTypes.huge
      }
      if (carousel.classList.contains('carousel__full-width')) {
        return CarouselConfig.carouselTypes.big
      }
      return CarouselConfig.carouselTypes.small
    } catch (error) {
      console.error('CarouselCalculator: Failed to determine carousel type', error)
      return CarouselConfig.carouselTypes.small
    }
  },

  getSlideWidth(carousel) {
    try {
      if (!carousel) return 294 // Safe fallback

      const carouselType = this.getCarouselType(carousel)

      // Big and Huge carousels: use full container width
      if (carouselType === CarouselConfig.carouselTypes.big || carouselType === CarouselConfig.carouselTypes.huge) {
        return carousel.offsetWidth
      }

      // Small carousel: use CSS variables
      const isMobile = window.innerWidth < CarouselConfig.viewport.mobileBreakpoint
      const cacheKey = `slideWidth-${carousel.dataset.carouselId}-${isMobile ? 'mobile' : 'desktop'}`
      let cachedWidth = CarouselCache.get(cacheKey)

      if (cachedWidth) return cachedWidth

      const slideWidthVar = isMobile ? '--slide-width-mobile' : '--slide-width'
      const computedStyle = getComputedStyle(carousel)
      const slideWidthValue = computedStyle.getPropertyValue(slideWidthVar)
      const slideWidth = parseInt(slideWidthValue) || (isMobile ? 298 : 294)

      // Validate the result
      if (slideWidth <= 0 || slideWidth > 2000) {
        console.warn('CarouselCalculator: Invalid slide width detected', slideWidth)
        return isMobile ? 298 : 294
      }

      CarouselCache.set(cacheKey, slideWidth)
      return slideWidth
    } catch (error) {
      console.error('CarouselCalculator: Failed to get slide width', error)
      return window.innerWidth < CarouselConfig.viewport.mobileBreakpoint ? 298 : 294
    }
  },

  getGap(carousel) {
    try {
      if (!carousel) return 16 // Safe fallback

      const isMobile = window.innerWidth < CarouselConfig.viewport.mobileBreakpoint
      const cacheKey = `gap-${carousel.dataset.carouselId}-${isMobile ? 'mobile' : 'desktop'}`
      let cachedGap = CarouselCache.get(cacheKey)

      if (cachedGap !== undefined) return cachedGap

      const wrapper = carousel.querySelector(CarouselConfig.selector.wrapper)
      if (!wrapper) return 16

      const computedStyle = getComputedStyle(wrapper)
      const gapValue = computedStyle.gap
      const gap = gapValue === '0px' ? 0 : parseInt(gapValue)

      // Validate the result
      if (gap < 0 || gap > 200) {
        console.warn('CarouselCalculator: Invalid gap detected', gap)
        return 16
      }

      CarouselCache.set(cacheKey, gap)
      return gap
    } catch (error) {
      console.error('CarouselCalculator: Failed to get gap', error)
      return 16
    }
  },

  getHorizontalPadding(carousel) {
    try {
      if (!carousel) return 0

      const wrapper = carousel.querySelector(CarouselConfig.selector.wrapper)
      if (!wrapper) return 0

      const computedStyle = getComputedStyle(wrapper)
      const paddingLeft = parseInt(computedStyle.paddingLeft) || 0
      const paddingRight = parseInt(computedStyle.paddingRight) || 0
      const totalPadding = paddingLeft + paddingRight

      // Validate the result
      if (totalPadding < 0 || totalPadding > 500) {
        console.warn('CarouselCalculator: Invalid padding detected', totalPadding)
        return 0
      }

      return totalPadding
    } catch (error) {
      console.error('CarouselCalculator: Failed to get horizontal padding', error)
      return 0
    }
  },

  getVisibleSlidesCount(carousel) {
    try {
      const carouselType = this.getCarouselType(carousel)

      // Big and Huge carousels always show 1 slide
      if (carouselType === CarouselConfig.carouselTypes.big || carouselType === CarouselConfig.carouselTypes.huge) {
        return 1
      }

      // Small carousel uses the original calculation
      const carouselWidth = carousel.offsetWidth
      const slideWidth = this.getSlideWidth(carousel)
      const gap = this.getGap(carousel)
      const horizontalPadding = this.getHorizontalPadding(carousel)

      // Calculate available width inside the wrapper, accounting for padding
      const availableWidth = carouselWidth - horizontalPadding + gap
      const slideAndGapWidth = slideWidth + gap
      const visibleCount = Math.floor(availableWidth / slideAndGapWidth)

      // Ensure at least 1 slide is visible, but not more than total slides
      const items = carousel.querySelectorAll(CarouselConfig.selector.item)
      return Math.max(1, Math.min(visibleCount, items.length))
    } catch (error) {
      console.error('CarouselCalculator: Failed to get visible slides count', error)
      return 1
    }
  },

  getMaxTranslateIndex(carousel, totalSlides) {
    try {
      const carouselType = this.getCarouselType(carousel)

      // Big and Huge carousels: max index is totalSlides - 1 (can navigate to each slide)
      if (carouselType === CarouselConfig.carouselTypes.big || carouselType === CarouselConfig.carouselTypes.huge) {
        return Math.max(0, totalSlides - 1)
      }

      // Small carousel uses the original calculation
      const carouselWidth = carousel.offsetWidth
      const slideWidth = this.getSlideWidth(carousel)
      const gap = this.getGap(carousel)
      const horizontalPadding = this.getHorizontalPadding(carousel)

      // Available width inside the wrapper (accounting for padding)
      const availableWidth = carouselWidth - horizontalPadding

      // Total width needed for all slides including gaps
      const totalContentWidth = (slideWidth * totalSlides) + (gap * (totalSlides - 1))

      // If all content fits in the available space, no translation needed
      if (totalContentWidth <= availableWidth) {
        return 0
      }

      // Calculate how many slides can start a "viewport window"
      // A slide can start a viewport if there's enough content after it to fill the viewport
      const slideAndGapWidth = slideWidth + gap

      // Find the last slide that can be the "first visible slide" in a viewport
      // This happens when: slidePosition + availableWidth >= totalContentWidth
      // Solving for slidePosition: slidePosition >= totalContentWidth - availableWidth
      const minLastSlidePosition = totalContentWidth - availableWidth
      const maxStartingSlideIndex = Math.ceil(minLastSlidePosition / slideAndGapWidth)

      // Ensure we don't exceed the actual number of slides
      const maxIndex = Math.min(maxStartingSlideIndex, totalSlides - 1)

      return Math.max(0, maxIndex)
    } catch (error) {
      console.error('CarouselCalculator: Failed to calculate max translate index', error)
      return 0
    }
  },

  getTranslateValue(carousel, targetIndex) {
    try {
      const carouselType = this.getCarouselType(carousel)

      // Big and Huge carousels: simple slide-by-slide translation
      if (carouselType === CarouselConfig.carouselTypes.big || carouselType === CarouselConfig.carouselTypes.huge) {
        const slideWidth = this.getSlideWidth(carousel)
        const gap = this.getGap(carousel)
        const slideAndGapWidth = slideWidth + gap

        // Simple slide-by-slide translation for 1-slide-visible carousels
        return -(slideAndGapWidth * targetIndex)
      }

      // Small carousel uses the original complex calculation
      const slideWidth = this.getSlideWidth(carousel)
      const gap = this.getGap(carousel)
      const carouselWidth = carousel.offsetWidth
      const horizontalPadding = this.getHorizontalPadding(carousel)
      const items = carousel.querySelectorAll(CarouselConfig.selector.item)
      const totalSlides = items.length

      // If targetIndex is 0, always return 0 (no translation needed)
      if (targetIndex === 0) {
        return 0
      }

      // Available width inside the wrapper (accounting for padding)
      const availableWidth = carouselWidth - horizontalPadding
      const slideAndGapWidth = slideWidth + gap

      // Total width needed for all slides including gaps
      const totalContentWidth = (slideWidth * totalSlides) + (gap * (totalSlides - 1))

      // If all content fits, no translation needed
      if (totalContentWidth <= availableWidth) {
        return 0
      }

      // Standard translation (slide by slide)
      const standardTranslate = -(slideAndGapWidth * targetIndex)

      // Check if this would over-translate (leave empty space on the right)
      const contentEndPosition = totalContentWidth + standardTranslate

      if (contentEndPosition < availableWidth) {
        // We've translated too far - align content to the right edge instead
        const rightAlignedTranslate = -(totalContentWidth - availableWidth)
        return rightAlignedTranslate
      }

      return standardTranslate
    } catch (error) {
      console.error('CarouselCalculator: Failed to calculate translate value', error)
      return 0
    }
  },

  shouldShowControls(carousel) {
    try {
      const items = carousel.querySelectorAll(CarouselConfig.selector.item)
      if (!items.length) return false

      const carouselType = this.getCarouselType(carousel)

      // Big and Huge carousels: show controls if there's more than 1 slide
      if (carouselType === CarouselConfig.carouselTypes.big || carouselType === CarouselConfig.carouselTypes.huge) {
        return items.length > 1
      }

      // Small carousel: detect if ANY content overflows (even 1px)
      const carouselWidth = carousel.offsetWidth
      const slideWidth = this.getSlideWidth(carousel)
      const gap = this.getGap(carousel)
      const horizontalPadding = this.getHorizontalPadding(carousel)

      // Available width inside the wrapper
      const availableWidth = carouselWidth - horizontalPadding

      // Total width needed for all slides including gaps
      const totalContentWidth = (slideWidth * items.length) + (gap * (items.length - 1))

      // Show controls if ANY part of content doesn't fit (even 1px overflow)
      return totalContentWidth > availableWidth
    } catch (error) {
      console.error('CarouselCalculator: Failed to determine control visibility', error)
      return true // Default to showing controls on error
    }
  }
}

const CarouselRenderer = {
  setTransform(wrapper, translateX) {
    const applyTransform = () => {
      wrapper.style.transform = `translateX(${translateX}px)`
    }
    $.batchDOM(applyTransform)
  },

  updateSlideVisibility(carousel, activeIndex) {
    const read = () => {
      return carousel.querySelectorAll(CarouselConfig.selector.item)
    }

    const write = (items) => {
      if (!items.length) return

      // Apply show/hide classes for fade effect transitions
      items.forEach((item, index) => {
        if (index === activeIndex) {
          $.toggleClass(item, CarouselConfig.classes.show, true)
          $.toggleClass(item, CarouselConfig.classes.hide, false)
        } else {
          $.toggleClass(item, CarouselConfig.classes.show, false)
          $.toggleClass(item, CarouselConfig.classes.hide, true)
        }
      })
    }

    $.frameSequence(read, write)
  },

  updateDots(carousel, activeIndex) {
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

  updateCounter(carousel, activeIndex) {
    const read = () => {
      return {
        counter: carousel.querySelector(CarouselConfig.selector.counter),
        count: carousel.querySelector(CarouselConfig.selector.count)
      }
    }

    const write = (elements) => {
      const { counter, count } = elements
      if (!counter || !count) return

      const currentSlide = activeIndex + 1,
            formattedCurrent = currentSlide < 10 ? `0${currentSlide}` : `${currentSlide}`
      count.textContent = formattedCurrent
    }

    $.frameSequence(read, write)
  },

  updateOverlayColor(carousel, activeIndex) {
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
        elem.style.setProperty('--overlay-color', color)
        elem.style.setProperty('--overlay-color-08', `${color}24`)
        elem.style.setProperty('--overlay-color-45', `${color}73`)
      }

      if (!overlayColor) {
        setCss(carousel, defaultColor)
      } else {
        // Compare colors (case-insensitive, trim whitespace)
        const normalizedDefault = defaultColor.trim().toLowerCase(),
              normalizedOverlay = overlayColor.trim().toLowerCase()

        normalizedDefault === normalizedOverlay
          ? setCss(carousel, defaultColor)
          : setCss(carousel, overlayColor)
      }
    }

    $.frameSequence(read, write)
  },

  toggleControls(carousel, shouldHide) {
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
  handleWheelEvent(instance, event) {
    try {
      // Only handle horizontal scrolling or when shift is held for vertical trackpads
      const isHorizontalScroll = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      const isShiftVerticalScroll = event.shiftKey && Math.abs(event.deltaY) > 0

      if (!isHorizontalScroll && !isShiftVerticalScroll) return

      // Prevent default scrolling behavior
      event.preventDefault()

      // Determine scroll direction and amount
      let deltaX = isHorizontalScroll ? event.deltaX : event.deltaY

      // Normalize wheel delta (different browsers/devices have different scales)
      const normalizedDelta = Math.sign(deltaX) * Math.min(Math.abs(deltaX), 100)

      // Debounce rapid wheel events
      const now = Date.now()
      if (!instance.wheelState) {
        instance.wheelState = {
          lastWheelTime: 0,
          accumulatedDelta: 0,
          debounceTimer: null
        }
      }

      // Accumulate delta for smoother experience
      instance.wheelState.accumulatedDelta += normalizedDelta
      instance.wheelState.lastWheelTime = now

      // Clear existing debounce timer
      if (instance.wheelState.debounceTimer) {
        clearTimeout(instance.wheelState.debounceTimer)
      }

      // Set new debounce timer to process accumulated scroll
      instance.wheelState.debounceTimer = setTimeout(() => {
        const threshold = 50 // Minimum accumulated delta to trigger navigation

        if (Math.abs(instance.wheelState.accumulatedDelta) > threshold) {
          if (instance.wheelState.accumulatedDelta > 0) {
            // Scroll right/down - go to next slide
            if (instance.currentIndex < instance.maxIndex) {
              instance.goToNext()
            }
          } else {
            // Scroll left/up - go to previous slide
            if (instance.currentIndex > 0) {
              instance.goToPrev()
            }
          }
        }

        // Reset accumulated delta
        instance.wheelState.accumulatedDelta = 0
      }, 100) // Debounce delay

      // Pause auto-scroll during wheel interaction
      instance.pauseAutoScroll()

      // Resume auto-scroll after a delay
      if (instance.wheelResumeTimer) {
        clearTimeout(instance.wheelResumeTimer)
      }
      instance.wheelResumeTimer = setTimeout(() => {
        instance.resumeAutoScroll()
      }, 50) // Resume after 100ms of no wheel activity

    } catch (error) {
      console.error('CarouselTouch: Failed to handle wheel event', error)
    }
  },

  handleTouchStart(instance, event) {
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

      // Add swiping class for CSS transitions
      $.toggleClass(instance.carousel, CarouselConfig.classes.swiping, true)

      // Pause auto-scroll during touch
      instance.pauseAutoScroll()
    } catch (error) {
      console.error('CarouselTouch: Failed to handle touch start', error)
    }
  },

  handleTouchMove(instance, event) {
    try {
      if (!instance.touch) return

      const touch = event.touches[0]
      const deltaX = touch.clientX - instance.touch.startX
      const deltaY = touch.clientY - instance.touch.startY

      // Check if we're swiping horizontally (not vertically)
      if (!instance.touch.isDragging && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        instance.touch.isDragging = true
        event.preventDefault()
      }

      if (instance.touch.isDragging) {
        instance.touch.currentX = touch.clientX

        // Apply resistance at boundaries
        let resistance = 1
        const atStart = instance.currentIndex === 0 && deltaX > 0
        const atEnd = instance.currentIndex === instance.maxIndex && deltaX < 0

        if (atStart || atEnd) {
          resistance = CarouselConfig.touch.resistance
        }

        const constrainedDelta = deltaX * resistance
        const newTransform = instance.touch.initialTransform + constrainedDelta

        // Apply transform immediately for smooth tracking
        instance.wrapper.style.transform = `translateX(${newTransform}px)`
        instance.wrapper.style.transition = 'none'
      }
    } catch (error) {
      console.error('CarouselTouch: Failed to handle touch move', error)
    }
  },

  handleTouchEnd(instance, event) {
    try {
      if (!instance.touch) return

      const deltaX = instance.touch.currentX - instance.touch.startX
      const deltaTime = Date.now() - instance.touch.startTime
      const velocity = Math.abs(deltaX) / deltaTime

      // Remove swiping class
      $.toggleClass(instance.carousel, CarouselConfig.classes.swiping, false)

      // Restore transition
      instance.wrapper.style.transition = ''

      if (instance.touch.isDragging) {
        // Determine if we should change slides
        const threshold = CarouselConfig.touch.threshold
        const shouldChange = Math.abs(deltaX) > threshold || velocity > 0.5

        if (shouldChange) {
          if (deltaX > 0 && instance.currentIndex > 0) {
            instance.goToPrev()
          } else if (deltaX < 0 && instance.currentIndex < instance.maxIndex) {
            instance.goToNext()
          } else {
            // Snap back to current position
            instance.goToSlide(instance.currentIndex)
          }
        } else {
          // Snap back to current position
          instance.goToSlide(instance.currentIndex)
        }

        event.preventDefault()
      }

      // Resume auto-scroll
      instance.resumeAutoScroll()
      instance.touch = null
    } catch (error) {
      console.error('CarouselTouch: Failed to handle touch end', error)
    }
  }
}

const CarouselAccessibility = {
  setupAccessibility(instance) {
    try {
      // Check for reduced motion preference
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        $.toggleClass(instance.carousel, CarouselConfig.classes.reduced, true)
        // Reduce animation duration
        instance.wrapper.style.setProperty('--animation-duration', `${CarouselConfig.animation.reducedDuration}ms`)
      }

      // Setup live region for announcements
      this.setupLiveRegion(instance)

      // Setup keyboard navigation
      this.setupKeyboardNavigation(instance)

      // Setup focus management
      this.setupFocusManagement(instance)
    } catch (error) {
      console.error('CarouselAccessibility: Failed to setup accessibility', error)
    }
  },

  setupLiveRegion(instance) {
    try {
      // Create or find live region for announcements
      let liveRegion = instance.carousel.querySelector('.carousel__live-region')
      if (!liveRegion) {
        liveRegion = document.createElement('div')
        liveRegion.className = 'carousel__live-region'
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

  announceSlideChange(instance) {
    try {
      if (!instance.liveRegion) return

      const currentSlide = instance.currentIndex + 1
      const totalSlides = instance.totalSlides
      const message = `Slide ${currentSlide} of ${totalSlides}`

      // Delay announcement to avoid overwhelming screen readers
      setTimeout(() => {
        instance.liveRegion.textContent = message
      }, CarouselConfig.accessibility.announceDelay)
    } catch (error) {
      console.error('CarouselAccessibility: Failed to announce slide change', error)
    }
  },

  setupKeyboardNavigation(instance) {
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
            // Toggle auto-scroll
            if (instance.isPaused) {
              instance.resumeAutoScroll()
            } else {
              instance.pauseAutoScroll()
            }
            break
        }
      }

      $.eventListener('add', instance.carousel, 'keydown', instance.keyboardHandler)
    } catch (error) {
      console.error('CarouselAccessibility: Failed to setup keyboard navigation', error)
    }
  },

  setupFocusManagement(instance) {
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

  setResizeObserver() {
    if (this.observerSetup) return this.observer

    const handleResize = () => {
      // Clear all cached values on resize
      CarouselCache.clear()

      CarouselController.instances.forEach(instance => {
        instance.handleResize()
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

  cleanup() {
    if (this.resizeObserverCleanup) {
      this.resizeObserverCleanup()
    }

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

  createInstance(carousel) {
    const wrapper = carousel.querySelector(CarouselConfig.selector.wrapper)
    const items = carousel.querySelectorAll(CarouselConfig.selector.item)
    const prevBtn = carousel.querySelector(CarouselConfig.selector.prev)
    const nextBtn = carousel.querySelector(CarouselConfig.selector.next)
    const dots = carousel.querySelectorAll(CarouselConfig.selector.dot)
    const timerAttr = carousel.getAttribute(CarouselConfig.attr.timer)

    if (!wrapper || !items.length) return null

    const visibleSlides = CarouselCalculator.getVisibleSlidesCount(carousel)
    const maxTranslateIndex = CarouselCalculator.getMaxTranslateIndex(carousel, items.length)

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
      timer: timerAttr ? parseInt(timerAttr) * 1000 : 0,
      autoScrollTimer: null,
      isPaused: false,
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

      init() {
        try {
          this.setupEventHandlers()
          this.setupTouchHandlers()
          this.setupPagination()
          this.updateVisibility()
          this.startAutoScroll()
          CarouselAccessibility.setupAccessibility(this)

          // Initialize overlay color for Huge carousel
          const carouselType = CarouselCalculator.getCarouselType(this.carousel)
          if (carouselType === CarouselConfig.carouselTypes.huge) {
            CarouselRenderer.updateOverlayColor(this.carousel, this.currentIndex)
          }

          this.markInitialized()
        } catch (error) {
          console.error('Carousel: Failed to initialize', error)
        }
      },

      getCurrentTransform() {
        try {
          const transform = this.wrapper.style.transform
          if (!transform || transform === 'none') return 0

          const matrix = transform.match(/translateX?\(([^)]+)\)/)
          if (matrix && matrix[1]) {
            return parseFloat(matrix[1]) || 0
          }
          return 0
        } catch (error) {
          console.error('Carousel: Failed to get current transform', error)
          return 0
        }
      },

      setupTouchHandlers() {
        try {
          // Touch event handlers
          this.eventHandlers.touchstart = (event) => CarouselTouch.handleTouchStart(this, event)
          this.eventHandlers.touchmove = (event) => CarouselTouch.handleTouchMove(this, event)
          this.eventHandlers.touchend = (event) => CarouselTouch.handleTouchEnd(this, event)

          $.eventListener('add', this.wrapper, 'touchstart', this.eventHandlers.touchstart, { passive: false })
          $.eventListener('add', this.wrapper, 'touchmove', this.eventHandlers.touchmove, { passive: false })
          $.eventListener('add', this.wrapper, 'touchend', this.eventHandlers.touchend, { passive: false })

          // Wheel event handler for trackpad/mouse wheel
          this.eventHandlers.wheel = (event) => CarouselTouch.handleWheelEvent(this, event)
          $.eventListener('add', this.carousel, 'wheel', this.eventHandlers.wheel, { passive: false })
        } catch (error) {
          console.error('Carousel: Failed to setup touch handlers', error)
        }
      },

      setupEventHandlers() {
        if (this.prevBtn) {
          this.eventHandlers.prev = () => this.goToPrev()
          $.eventListener('add', this.prevBtn, 'click', this.eventHandlers.prev)
        }

        if (this.nextBtn) {
          this.eventHandlers.next = () => this.goToNext()
          $.eventListener('add', this.nextBtn, 'click', this.eventHandlers.next)
        }

        if (this.timer > 0 && this.carousel.classList.contains(CarouselConfig.classes.paused)) {
          this.eventHandlers.mouseenter = () => this.pauseAutoScroll()
          this.eventHandlers.mouseleave = () => this.resumeAutoScroll()
          this.eventHandlers.touchstart = () => this.pauseAutoScroll()
          this.eventHandlers.touchend = () => this.resumeAutoScroll()

          $.eventListener('add', this.carousel, 'mouseenter', this.eventHandlers.mouseenter)
          $.eventListener('add', this.carousel, 'mouseleave', this.eventHandlers.mouseleave)
          $.eventListener('add', this.carousel, 'touchstart', this.eventHandlers.touchstart, { passive: true })
          $.eventListener('add', this.carousel, 'touchend', this.eventHandlers.touchend, { passive: true })
        }
      },

      setupPagination() {
        // Read-then-write operation for pagination setup
        const readPagination = () => {
          // Calculate the current max index for this viewport
          const currentMaxIndex = CarouselCalculator.getMaxTranslateIndex(this.carousel, this.totalSlides)

          // Read DOM elements and current state
          return {
            dots: this.dots,
            maxIndex: currentMaxIndex,
            existingHandlers: [...this.eventHandlers.dots]
          }
        }

        const writePagination = (data) => {
          const { dots, maxIndex, existingHandlers } = data

          // Update instance maxIndex
          this.maxIndex = maxIndex

          // Remove existing dot event handlers first
          dots.forEach((dot, index) => {
            if (existingHandlers[index]) {
              $.eventListener('remove', dot, 'click', existingHandlers[index])
              this.eventHandlers.dots[index] = null
            }
          })

          // Setup new handlers for valid positions only
          dots.forEach((dot, index) => {
            if (index <= maxIndex) {
              const handler = () => this.goToSlide(index)
              this.eventHandlers.dots[index] = handler
              $.eventListener('add', dot, 'click', handler)
              $.toggleClass(dot, CarouselConfig.classes.hidden, false)
            } else {
              $.toggleClass(dot, CarouselConfig.classes.hidden, true)
            }
          })
        }

        $.frameSequence(readPagination, writePagination)
      },

      goToPrev() {
        this.goToSlide(this.currentIndex > 0 ? this.currentIndex - 1 : this.maxIndex)
      },

      goToNext() {
        this.goToSlide(this.currentIndex < this.maxIndex ? this.currentIndex + 1 : 0)
      },

      goToSlide(targetIndex) {
        try {
          if (targetIndex === this.currentIndex) return

          const newIndex = Math.max(0, Math.min(targetIndex, this.maxIndex))
          if (newIndex === this.currentIndex) return

          this.currentIndex = newIndex

          const carouselType = CarouselCalculator.getCarouselType(this.carousel)

          // Check if Huge carousel has fade effect
          const isHugeFadeEffect = carouselType === CarouselConfig.carouselTypes.huge && this.carousel.classList.contains('carousel__fade-effect')

          if (isHugeFadeEffect) {
            // Huge carousel with fade effect: use show/hide classes instead of translateX
            CarouselRenderer.updateSlideVisibility(this.carousel, this.currentIndex)
          } else {
            // All other carousels: use translateX for slide effect
            const translateX = CarouselCalculator.getTranslateValue(this.carousel, this.currentIndex)
            CarouselRenderer.setTransform(this.wrapper, translateX)
          }

          CarouselRenderer.updateDots(this.carousel, this.currentIndex)

          if (carouselType === CarouselConfig.carouselTypes.huge) {
            CarouselRenderer.updateCounter(this.carousel, this.currentIndex, this.totalSlides)
            CarouselRenderer.updateOverlayColor(this.carousel, this.currentIndex)
          }

          // Announce slide change for accessibility
          CarouselAccessibility.announceSlideChange(this)
        } catch (error) {
          console.error('Carousel: Failed to go to slide', error)
        }
      },

      startAutoScroll() {
        if (this.timer <= 0) return

        this.autoScrollTimer = setInterval(() => {
          if (!this.isPaused) {
            this.goToNext()
          }
        }, this.timer)
      },

      pauseAutoScroll() {
        this.isPaused = true
      },

      resumeAutoScroll() {
        this.isPaused = false
      },

      stopAutoScroll() {
        if (this.autoScrollTimer) {
          clearInterval(this.autoScrollTimer)
          this.autoScrollTimer = null
        }
      },

      updateVisibility() {
        // Read-then-write operation for visibility check
        const readVisibility = () => {
          return CarouselCalculator.shouldShowControls(this.carousel)
        }

        const writeVisibility = (shouldShow) => {
          CarouselRenderer.toggleControls(this.carousel, !shouldShow)
        }

        $.frameSequence(readVisibility, writeVisibility)
      },

      handleResize() {
        // Read-then-write operation for resize handling
        const readResize = () => {
          // Force cache invalidation for this specific carousel (both mobile and desktop)
          const carouselId = this.carousel.dataset.carouselId
          CarouselCache.delete(`slideWidth-${carouselId}-mobile`)
          CarouselCache.delete(`slideWidth-${carouselId}-desktop`)
          CarouselCache.delete(`gap-${carouselId}-mobile`)
          CarouselCache.delete(`gap-${carouselId}-desktop`)

          // Read current state and calculate new bounds
          const oldVisibleSlides = this.visibleSlides
          const oldMaxIndex = this.maxIndex
          const newVisibleSlides = CarouselCalculator.getVisibleSlidesCount(this.carousel)
          const newMaxIndex = CarouselCalculator.getMaxTranslateIndex(this.carousel, this.totalSlides)
          const boundsChanged = (oldVisibleSlides !== newVisibleSlides || oldMaxIndex !== newMaxIndex)

          return {
            newVisibleSlides,
            newMaxIndex,
            boundsChanged,
            currentIndex: this.currentIndex
          }
        }

        const writeResize = (data) => {
          const { newVisibleSlides, newMaxIndex, boundsChanged, currentIndex } = data

          // Update instance properties
          this.visibleSlides = newVisibleSlides
          this.maxIndex = newMaxIndex

          // If controls are no longer needed (all content fits), reset to beginning
          if (newMaxIndex === 0) {
            this.currentIndex = 0
            // Stop auto-scroll when no navigation is needed (performance optimization)
            this.stopAutoScroll()
          } else {
            // Ensure current index is within new bounds
            if (currentIndex > newMaxIndex) {
              this.currentIndex = newMaxIndex
            }
            // Restart auto-scroll if it was configured and we need navigation
            if (this.timer > 0 && !this.autoScrollTimer) {
              this.startAutoScroll()
            }
          }

          // Update pagination for new bounds (always update if bounds changed)
          if (boundsChanged) {
            this.setupPagination()
          }

          this.updateVisibility()

          const carouselType = CarouselCalculator.getCarouselType(this.carousel)
          const isHugeFadeEffect = carouselType === CarouselConfig.carouselTypes.huge && this.carousel.classList.contains('carousel__fade-effect')

          if (isHugeFadeEffect) {
            // Huge carousel with fade effect: use show/hide classes instead of translateX
            CarouselRenderer.updateSlideVisibility(this.carousel, this.currentIndex)
          } else {
            // All other carousels (Small, Big, Huge with slide effect): use translateX
            const translateX = CarouselCalculator.getTranslateValue(this.carousel, this.currentIndex)
            CarouselRenderer.setTransform(this.wrapper, translateX)
          }

          CarouselRenderer.updateDots(this.carousel, this.currentIndex)

          if (carouselType === CarouselConfig.carouselTypes.huge) {
            CarouselRenderer.updateCounter(this.carousel, this.currentIndex, this.totalSlides)
            CarouselRenderer.updateOverlayColor(this.carousel, this.currentIndex)
          }
        }

        $.frameSequence(readResize, writeResize)
      },

      markInitialized() {
        // Pure write operation - use batchDOM
        const applyInitialized = () => {
          $.toggleClass(this.carousel, CarouselConfig.classes.initialized, true)
        }

        $.batchDOM(applyInitialized)
      },

      cleanup() {
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
          if (this.timer > 0 && this.carousel.classList.contains(CarouselConfig.classes.paused)) {
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

  init() {
    if (!CarouselDOM.init()) return null

    CarouselDetection.setResizeObserver()

    const carousels = CarouselDOM.elements.carousels
    carousels.forEach((carousel, index) => {
      carousel.dataset.carouselId = `carousel-${index}`
      const instance = this.createInstance(carousel)
      if (instance) {
        this.instances.push(instance)
        instance.init()
      }
    })

    return this.cleanup.bind(this)
  },

  cleanup() {
    this.instances.forEach(instance => {
      if (instance.cleanup) instance.cleanup()
    })
    this.instances = []

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
