/**
 * Carousel Component
 *
 * Handles carousel functionality with slide/fade effects, pagination, and touch support.
 * Supports autorotation, responsive behavior, and overlay color management.
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */

const CarouselConfig = {
  selector: {
    carousel: '.carousel',
    wrapper: '.carousel__wrapper',
    item: '.carousel__item',
    navigation: '.carousel__navigation',
    button: '.carousel__btn',
    prev: '.carousel__btn.prev',
    next: '.carousel__btn.next',
    pagination: '.carousel__pagination',
    dot: '.carousel__dot',
    timer: '.carousel__timer',
    counter: '.carousel__count'
  },
  classes: {
    dot: 'carousel__dot',
    edges: 'carousel__edges',
    fade: 'carousel__fade-effect',
    full: 'carousel__full-width',
    init: 'initialized',
    next: 'next',
    pause: 'carousel__pause',
    prev: 'prev',
    show: 'show'
  },
  modifier: {
    active: 'active',
    hidden: 'hidden',
    hide: 'hide',
    show: 'show'
  },
  attr: {
    index: 'data-index',
    defaultColor: 'data-dafault-color',
    overlayColor: 'data-overlay-color'
  },
  cssVar: {
    gap: 'gap',
    overlay: '--overlay-color',
    overlay08: '--overlay-color-08',
    overlay45: '--overlay-color-45',
    slideWidth: '--slide-width',
    slideWidthMobile: '--slide-width-mobile'
  },
  event: {
    click: 'click',
    prev: 'click',
    next: 'click',
    start: 'touchstart',
    end: 'touchend',
    enter: 'mouseenter',
    leave: 'mouseleave'
  },
  time: {
    idleTimeout: 2000,
    slowConnectionDelay: 1000,
    wheelDebounce: 100
  },
  media: {
    mobile: 992 // Based on css media query breakpoint
  }
}

const CarouselDOM = {
  elements: {
    block: null,
    wrap: null,
    navi: null,
    pagi: null,
    item: null,
    items: null,
    btns: null,
    dots: null,
    count: null,
    timers: null
  },

  state: {
    infinite: true,
    interval: null,
    isWheeling: false,
    touchend: null,
    touchstart: null,
    wheelTimeout: null
  },

  init(el) {
    this.elements.block = el
    this.elements.wrap = el.querySelector(CarouselConfig.selector.wrapper)
    this.elements.navi = el.querySelector(CarouselConfig.selector.navigation)
    this.elements.pagi = el.querySelector(CarouselConfig.selector.pagination)
    this.elements.item = el.querySelector(CarouselConfig.selector.item)
    this.elements.items = el.querySelectorAll(CarouselConfig.selector.item)
    this.elements.btns = el.querySelectorAll(CarouselConfig.selector.button)
    this.elements.dots = el.querySelectorAll(CarouselConfig.selector.dot)
    this.elements.count = el.querySelector(CarouselConfig.selector.counter)
    this.elements.timers = el.querySelectorAll(CarouselConfig.selector.timer)
    if (this.elements.timers.length === 0 && el.dataset.carouselTimer) {
      this.elements.timers = [{ value: parseInt(el.dataset.carouselTimer) }]
    }

    return this.elements
  },

  initCarousel() {
    if (this.elements.items.length < 2) return false
    $.toggleClass(this.elements.block, CarouselConfig.classes.init, true)
  },

  getSiblingElement(element, selector, direction) {
    if (!element) return false

    const directionMap = {
      'prev': 'prev',
      'next': 'next'
    }

    return $.getSibling(element, selector, directionMap[direction])
  },

  trigger(element, eventType) {
    if (!element) return false
    $.triggerEvent(element, eventType)
  },

  scrollToPosition(options) {
    const { element, left, top } = options

    // Use $.batchDOM for scroll operations as they don't benefit from read/write separation
    const scrollHandler = () => {
      element.scrollTo({
        left: left,
        top: top,
        behavior: 'smooth'
      })
    }

    $.batchDOM(scrollHandler)
  },

  cleanup() {
    if (this.state.interval) {
      clearInterval(this.state.interval)
      this.state.interval = null
    }

    if (this.state.wheelTimeout) {
      clearTimeout(this.state.wheelTimeout)
      this.state.wheelTimeout = null
    }

    this.state = {
      interval: null,
      touchstart: null,
      touchend: null,
      wheelTimeout: null,
      isWheeling: false,
      infinite: true
    }

    Object.keys(this.elements).forEach(key => {
      this.elements[key] = null
    })
  }
}

const CarouselPagination = {
  updateCounter(index) {
    const count = CarouselDOM.elements.count
    if (!count) return false
    if (index === 0 || typeof index === 'undefined') return false

    const readPhase = () => {
      let num = ''
      if (index < 10) num = 0
      return { num, index }
    }

    const writePhase = (data) => {
      if (!data) return
      const { num, index } = data
      count.innerHTML = `${num}${index}`
    }

    $.frameSequence(readPhase, writePhase)
  },

  getCurrentDot() {
    const dots = CarouselDOM.elements.dots
    let index = 1
    const visibleDots = [...dots].filter(dot =>
      !dot.classList.contains(CarouselConfig.modifier.hidden)
    )

    visibleDots.forEach(dot => {
      if (dot.classList.contains(CarouselConfig.modifier.active)) {
        index = parseInt(dot.getAttribute(CarouselConfig.attr.index))
      }
    })


    return { index, dots: visibleDots }
  },

  updatePagination(event, index) {
    const target = event?.target
    const isDot = target?.classList.contains(CarouselConfig.classes.dot)
    const dots = CarouselDOM.elements.dots

    if (!isDot && typeof index === 'undefined') return false

    let finalIndex = index
    if (typeof finalIndex === 'undefined' && isDot) {
      finalIndex = parseInt(target.getAttribute(CarouselConfig.attr.index))
    }

    const readPhase = () => {
      const dotData = []

      dots.forEach(dot => {
        const activeIndex = parseInt(dot.getAttribute(CarouselConfig.attr.index))
        dotData.push({ dot, activeIndex })
      })

      return { dotData, finalIndex, isDot, target }
    }

    const writePhase = (data) => {
      if (!data) return
      const { dotData, finalIndex, isDot, target } = data


      dotData.forEach(({ dot, activeIndex }) => {
        $.toggleClass(dot, CarouselConfig.modifier.active, false)

        if (isDot && dot === target) {
          $.toggleClass(target, CarouselConfig.modifier.active, true)
        }
        if (activeIndex === finalIndex) {
          $.toggleClass(dot, CarouselConfig.modifier.active, true)
        }
      })
    }

    $.frameSequence(readPhase, writePhase)
    this.updateCounter(finalIndex)
    return finalIndex
  },

  hidePaginationDots() {
    const elements = CarouselDOM.elements
    if (!elements.dots) return false

    const readPhase = () => {
      const client = elements.wrap.clientWidth
      const scroll = elements.wrap.scrollWidth
      const width = CarouselUtils.getSlideWidth(elements.block)
      const totalItems = elements.items.length
      const gap = CarouselUtils.getGapValue(elements.wrap)

      // Calculate total content width precisely (same logic as hideControls)
      const totalContentWidth = (totalItems * width) + ((totalItems - 1) * gap)
      const hasContentOverflow = totalContentWidth > client
      const shouldHideAllControls = !hasContentOverflow

      if (shouldHideAllControls) {
        return { hideAll: true }
      }

      const actualScrollDistance = scroll - client

      if (actualScrollDistance > 0) {
        // If there's scrollable content, calculate positions based on slide width
        const scrollPositions = Math.max(2, Math.ceil(actualScrollDistance / width) + 1)
        return { scrollPositions, totalItems, hideAll: false }
      } else {
        // No scrollable content
        return { scrollPositions: 1, totalItems, hideAll: false }
      }
    }

    const writePhase = (data) => {
      if (!data) return

      if (data.hideAll) {
        elements.dots.forEach(dot => {
          $.toggleClass(dot, CarouselConfig.modifier.hidden, true)
        })
        return
      }

      const { scrollPositions } = data

      elements.dots.forEach(dot => {
        const index = parseInt(dot.getAttribute(CarouselConfig.attr.index))

        // Show dots that correspond to valid scroll positions
        const shouldShow = index <= scrollPositions
        $.toggleClass(dot, CarouselConfig.modifier.hidden, !shouldShow)
      })
    }

    $.frameSequence(readPhase, writePhase)
  }
}

const CarouselUtils = {
  getGapValue(el) {
    const styles = window.getComputedStyle(el),
          gap = styles.getPropertyValue(CarouselConfig.cssVar.gap)
    return parseInt(gap) || 0
  },

  getSlideWidth(el) {
    const styles = window.getComputedStyle(el),
          isMobile = $.viewportSize().width < CarouselConfig.media.mobile,
          property = isMobile ? CarouselConfig.cssVar.slideWidthMobile : CarouselConfig.cssVar.slideWidth,
          slideWidth = styles.getPropertyValue(property)
    return parseInt(slideWidth)
  }
}

const CarouselEffects = {
  updateFadeClass(index) {
    const block = CarouselDOM.elements.block
    const items = CarouselDOM.elements.items
    const isFade = block.classList.contains(CarouselConfig.classes.fade)

    if (!isFade || !index || index > items.length) return false

    const readPhase = () => {
      const itemUpdates = []

      items.forEach((item, itemIndex) => {
        const isActive = itemIndex + 1 === index
        itemUpdates.push({ item, isActive })
      })

      return { itemUpdates }
    }

    const writePhase = (data) => {
      if (!data) return
      const { itemUpdates } = data

      itemUpdates.forEach(({ item, isActive }) => {
        $.toggleClass(item, CarouselConfig.modifier.show, isActive)
        $.toggleClass(item, CarouselConfig.modifier.hide, !isActive)
      })
    }

    $.frameSequence(readPhase, writePhase)
  },

  updateOverlay(index) {
    const block = CarouselDOM.elements.block
    const items = CarouselDOM.elements.items
    const isEdge = block.classList.contains(CarouselConfig.classes.edges)

    if (!isEdge || !index || index > items.length) return false

    const defaultColor = block.getAttribute(CarouselConfig.attr.defaultColor)

    items.forEach((item, itemIndex) => {
      const overlayColor = item.getAttribute(CarouselConfig.attr.overlayColor)

      if (itemIndex + 1 === index) {
        if (overlayColor) {
          $.setCssVar({ key: CarouselConfig.cssVar.overlay, value: overlayColor })
          $.setCssVar({ key: CarouselConfig.cssVar.overlay08, value: `${overlayColor}24` })
          $.setCssVar({ key: CarouselConfig.cssVar.overlay45, value: `${overlayColor}73` })
        } else {
          $.setCssVar({ key: CarouselConfig.cssVar.overlay, value: defaultColor })
          $.setCssVar({ key: CarouselConfig.cssVar.overlay08, value: `${defaultColor}24` })
          $.setCssVar({ key: CarouselConfig.cssVar.overlay45, value: `${defaultColor}73` })
        }
      }
    })
  },

  hideControls(elements) {
    if (!elements.navi && !elements.pagi) return false

    const readPhase = () => {
      const wrap = elements.wrap,
            clientX = wrap.clientWidth,
            clientY = wrap.clientHeight,
            scrollY = wrap.scrollHeight,
            totalItems = elements.items.length,
            itemWidth = CarouselUtils.getSlideWidth(elements.block)

      // Get dynamic gap value from CSS
      const gap = CarouselUtils.getGapValue(wrap)

      // Temporarily scroll to start to get accurate scrollWidth measurement
      const originalScrollLeft = wrap.scrollLeft
      wrap.scrollLeft = 0

      // Restore original scroll position
      wrap.scrollLeft = originalScrollLeft

      // Calculate total content width precisely
      // Total width = (number of items * item width) + (gaps between items)
      const totalContentWidth = (totalItems * itemWidth) + ((totalItems - 1) * gap)

      // Check if content exceeds viewport width (immediate overflow detection)
      const hasContentOverflow = totalContentWidth > clientX
      const hasVerticalScroll = scrollY > clientY + 1

      // Hide controls only when ALL content fits completely within viewport
      const shouldHide = !hasContentOverflow && !hasVerticalScroll


      return { shouldHide }
    }

    const writePhase = (data) => {
      if (!data) return

      const { shouldHide } = data

      // Hide/show navigation and pagination
      if (elements.navi) {
        $.toggleClass(elements.navi, CarouselConfig.modifier.hidden, shouldHide)
      }
      if (elements.pagi) {
        $.toggleClass(elements.pagi, CarouselConfig.modifier.hidden, shouldHide)
      }

      // If hiding controls, also reset all active dot states
      if (shouldHide && elements.dots) {
        elements.dots.forEach(dot => {
          $.toggleClass(dot, CarouselConfig.modifier.active, false)
        })
      }
    }

    $.frameSequence(readPhase, writePhase)
  }
}

const CarouselNavigation = {
  calculateSlideEffect(options) {
    const { currentScroll, clientVal, gap, maxScrollPositions, size, totalItems, trigger } = options
    const currentPosition = Math.round(currentScroll / size) + 1

    let i, condition, lastIndex, nextIndex, scrollToLast, scrollToNext, scrollToVal

    switch (trigger) {
      case 'prev':
        condition = currentScroll <= 0
        lastIndex = maxScrollPositions
        nextIndex = Math.max(1, currentPosition - 1)
        scrollToLast = (maxScrollPositions - 1) * size
        scrollToNext = Math.max(0, currentScroll - size)
        break

      case 'next':
        const maxScrollDistance = maxScrollPositions * size + gap * (totalItems - 1)
        const tolerance = size * 0.1

        console.log("maxScrollPositions ", maxScrollPositions)
        console.log("maxScrollDistance ", maxScrollDistance)

        condition = currentScroll >= maxScrollDistance
        lastIndex = 1
        nextIndex = Math.min(maxScrollPositions, currentPosition + 1)
        scrollToLast = 0
        scrollToNext = Math.min(maxScrollDistance, currentScroll + size)
        break
    }

    i = condition && CarouselDOM.state.infinite ? lastIndex : nextIndex
    scrollToVal = condition && CarouselDOM.state.infinite ? scrollToLast : scrollToNext

    return { index: i, scrollTo: scrollToVal }
  },

  calculateFadeEffect(options) {
    const { items, index, last, nextNumber, nextIndex } = options
    let i

    items.forEach((item, itemIndex) => {
      if (item.classList.contains(CarouselConfig.classes.show)) {
        const condition = itemIndex + (nextNumber ?? 0),
              next = itemIndex + (nextIndex ?? 0)

        i = condition === index ? last : next
      }
    })

    return i
  },

  handleNavigation(event, time) {
    const target = event?.target,
          isPrev = target?.classList.contains(CarouselConfig.classes.prev),
          isNext = target?.classList.contains(CarouselConfig.classes.next),
          isDot = target?.classList.contains(CarouselConfig.classes.dot)

    if (!isPrev && !isNext && !isDot && !time) return false

    const readPhase = () => {
      const elements = CarouselDOM.elements,
            wrap = elements.wrap

      const element = isDot || isPrev || isNext
            ? $.getSibling(target?.parentElement, CarouselConfig.selector.wrapper, 'prev')
            : wrap

      const clientX = element.clientWidth,
            scrollX = element.scrollWidth,
            gap = CarouselUtils.getGapValue(element),
            left = element.scrollLeft,
            isFade = block.classList.contains(CarouselConfig.classes.fade),
            isFull = block.classList.contains(CarouselConfig.classes.full),
            itemWidth = CarouselUtils.getSlideWidth(elements.block),
            totalItems = elements.items.length,
            contentWidth = (totalItems * itemWidth) + ((totalItems - 1) * gap),
            index = parseInt(target?.getAttribute(CarouselConfig.attr.index))

      return {
        contentWidth,
        clientX,
        element,
        index,
        isFade,
        isFull,
        itemWidth,
        gap,
        left,
        scrollX,
        totalItems
      }
    }

    const writePhase = (data) => {
      if (!data) return

      const { contentWidth, clientX, element, index, isFade, isFull, itemWidth, gap, left, scrollX, totalItems } = data
      const children = element.children,
            inView = Math.floor(clientX / itemWidth),
            inView1 = Math.floor(clientX / (itemWidth + gap)),
            visibleItems = inView > 1 ? inView1 : inView,
            maxScrollPositions = totalItems - visibleItems + 1

      let calculatedIndex, valueLeft = 0;

      if (isFull) scrollX = contentWidth

      if (isPrev) {
        if (!isFade) {
          const options = {
            currentScroll: left,
            // clientVal: clientX,
            // scrollVal: scrollX,
            // scrollToVal: valueLeft,
            maxScrollPositions: maxScrollPositions,
            size: itemWidth,
            totalItems: totalItems,
            trigger: 'prev'
          }

          const result = this.calculateSlideEffect(options)
          valueLeft = result.scrollTo
          calculatedIndex = result.index
        } else {
          const options = {
            items: children,
            index: 0,
            last: totalItems
          }

          calculatedIndex = this.calculateFadeEffect(options)
        }
      }

      if (isNext || time) {
        if (!isFade) {
          const options = {
            currentScroll: left,
            // clientVal: clientX,
            gap: gap,
            maxScrollPositions: maxScrollPositions,
            size: itemWidth,
            totalItems: totalItems,
            trigger: 'next'
          }

          const result = this.calculateSlideEffect(options)
          valueLeft = result.scrollTo
          calculatedIndex = result.index

          // Mobile fallback: if we're at or near the end, force infinite loop
          // const nearEnd = left >= scrollX - clientX - (itemWidth * 0.5)
          // if (nearEnd && CarouselDOM.state.infinite) {
          //   valueLeft = 0
          //   calculatedIndex = 1
          // }
        } else {
          const options = {
            items: children,
            index: totalItems,
            last: 1,
            nextNumber: 1,
            nextIndex: 2
          }

          calculatedIndex = this.calculateFadeEffect(options)
        }
      }

      if (isDot && !isFade) {
        valueLeft = itemWidth * (index - 1)
        calculatedIndex = index
      }

      console.log(
        {
          clientX: clientX,
          itemWidth: itemWidth,
          totalItems: totalItems,
          calculatedIndex: calculatedIndex,
          visibleItems: visibleItems,
          maxScrollPositions: maxScrollPositions
        }
      )

      if (calculatedIndex < 1) calculatedIndex = 1
      if (calculatedIndex > maxScrollPositions) calculatedIndex = maxScrollPositions

      const finalIndex = CarouselPagination.updatePagination(event, calculatedIndex)
      CarouselEffects.updateFadeClass(finalIndex)
      CarouselEffects.updateOverlay(finalIndex)

      if (!isFade) {
        CarouselDOM.scrollToPosition({
          element: element,
          left: valueLeft,
          top: 0
        })
      }
    }

    $.frameSequence(readPhase, writePhase)

    // const elements = CarouselDOM.elements,
    //       block = elements.block,
    //       isFade = block.classList.contains(CarouselConfig.classes.fade),
    //       isFull = block.classList.contains(CarouselConfig.classes.full),
    //       width = CarouselUtils.getSlideWidth(block),
    //       index = parseInt(target?.getAttribute(CarouselConfig.attr.index))

    //       // console.log('Carousel Navigation Init:', { elements, block, isFade, isFull, width, index });


    // let element, left, scrollX, clientX, children, valueLeft = 0

    // element = isDot || isPrev || isNext
    //   ? $.getSibling(target?.parentElement, CarouselConfig.selector.wrapper, 'prev')
    //   : this.wrap

    // left = element.scrollLeft
    // scrollX = element.scrollWidth
    // clientX = element.clientWidth
    // children = [...element.children]

    // console.log('Carousel Navigation Calculations:', { element, left, scrollX, clientX, children });


    // if (isFull) scrollX = width * children.length

    let calculatedIndex

    // if (isPrev) {
    //   if (!isFade) {
    //     const options = {
    //       currentScroll: left,
    //       clientVal: clientX,
    //       size: width,
    //       trigger: 'prev'
    //     }

    //     const result = this.calculateSlideEffect(options)
    //     valueLeft = result.scrollTo
    //     calculatedIndex = result.index
    //   } else {
    //     const options = {
    //       items: children,
    //       index: 0,
    //       last: elements.items.length
    //     }

    //     calculatedIndex = this.calculateFadeEffect(options)
    //   }
    // }

    // if (isNext || time) {
    //   if (!isFade) {
    //     const options = {
    //       currentScroll: left,
    //       clientVal: clientX,
    //       size: width,
    //       trigger: 'next'
    //     }

    //     const result = this.calculateSlideEffect(options)
    //     valueLeft = result.scrollTo
    //     calculatedIndex = result.index

    //     // Mobile fallback: if we're at or near the end, force infinite loop
    //     const nearEnd = left >= scrollX - clientX - (width * 0.5)
    //     if (nearEnd && CarouselDOM.state.infinite) {
    //       valueLeft = 0
    //       calculatedIndex = 1
    //     }
    //   } else {
    //     const options = {
    //       items: children,
    //       index: elements.items.length,
    //       last: 1,
    //       nextNumber: 1,
    //       nextIndex: 2
    //     }

    //     calculatedIndex = this.calculateFadeEffect(options)
    //   }
    // }

    // if (isDot && !isFade) {
    //   valueLeft = width * (index - 1)
    //   calculatedIndex = index
    // }

    // Validate calculated index is within bounds
    // const totalItems = elements.items.length
    // const visibleItems = Math.floor(clientX / width)
    // const maxScrollPositions = totalItems - visibleItems + 1

    // Ensure calculatedIndex is within valid range
    // if (calculatedIndex < 1) calculatedIndex = 1
    // if (calculatedIndex > maxScrollPositions) calculatedIndex = maxScrollPositions

    // const finalIndex = CarouselPagination.updatePagination(event, calculatedIndex)

    // CarouselEffects.updateFadeClass(finalIndex)
    // CarouselEffects.updateOverlay(finalIndex)

    // if (!isFade) {
    //   CarouselDOM.scrollToPosition({
    //     element: element,
    //     left: valueLeft,
    //     top: 0
    //   })
    // }
  }
}

const CarouselTouch = {
  handleTouchscreenPoints(event) {
    const wrap = event?.target.closest(CarouselConfig.selector.wrapper)
    const { dots } = CarouselPagination.getCurrentDot()

    if (!dots.length && !wrap) return false

    if (event.type === CarouselConfig.event.start) {
      CarouselDOM.state.touchstart = event.changedTouches[0].screenX
    }

    if (event.type === CarouselConfig.event.end) {
      CarouselDOM.state.touchend = event.changedTouches[0].screenX
      this.handleTouchscreenDirection(wrap)
    }
  },

  handleTouchscreenDirection(wrap) {
    const readPhase = () => {
      const left = wrap?.scrollLeft
      const scroll = wrap?.scrollWidth
      const client = wrap?.clientWidth
      const next = wrap?.parentElement.querySelector(CarouselConfig.selector.next)
      const prev = wrap?.parentElement.querySelector(CarouselConfig.selector.prev)
      const isFade = wrap?.parentElement.classList.contains(CarouselConfig.classes.fade)
      const leftSwipe = CarouselDOM.state.touchstart > CarouselDOM.state.touchend
      const rightSwipe = CarouselDOM.state.touchend > CarouselDOM.state.touchstart
      const { dots, index } = CarouselPagination.getCurrentDot()

      return { left, scroll, client, next, prev, isFade, leftSwipe, rightSwipe, dots, index }
    }

    const writePhase = (data) => {
      if (!data) return

      const { left, scroll, client, next, prev, isFade, leftSwipe, rightSwipe, dots, index } = data

      if (!isFade) {
        if (left >= 0 && left <= scroll - client) {
          CarouselDOM.state.infinite = false

          if (leftSwipe) $.triggerEvent(next, 'click')
          if (rightSwipe) $.triggerEvent(prev, 'click')

          CarouselDOM.state.infinite = true
        }
      } else {
        if (leftSwipe && index < dots.length) {
          const newIndex = CarouselPagination.updatePagination(undefined, index + 1)
          CarouselEffects.updateFadeClass(newIndex)
          CarouselEffects.updateOverlay(newIndex)
        }
        if (rightSwipe && index > 1) {
          const newIndex = CarouselPagination.updatePagination(undefined, index - 1)
          CarouselEffects.updateFadeClass(newIndex)
          CarouselEffects.updateOverlay(newIndex)
        }
      }
    }

    $.frameSequence(readPhase, writePhase)
  },

  handleTouchpadPoints: $.debounce(function(event) {
    const wrap = event?.target.closest(CarouselConfig.selector.wrapper)
    const { dots } = CarouselPagination.getCurrentDot()

    if (!dots.length && !wrap) return false

    const readPhase = () => {
      let { index } = CarouselPagination.getCurrentDot()
      const delta = event.deltaX

      if (delta === -1 && index > 1) index = index - 1
      if (delta === 1 && index < dots.length) index = index + 1

      return { index }
    }

    const writePhase = (data) => {
      if (!data) return

      const { index } = data
      const newIndex = CarouselPagination.updatePagination(undefined, index)
      CarouselEffects.updateFadeClass(newIndex)
      CarouselEffects.updateOverlay(newIndex)
    }

    $.frameSequence(readPhase, writePhase)
  }, (() => {
    // Adjust debounce time based on connection speed with Safari fallback
    const laggy = $.slowConnection() && $.is($.slowConnection, 'function')
    return laggy ? CarouselConfig.time.wheelDebounce * 2 : CarouselConfig.time.wheelDebounce
  })())
}

const CarouselTimer = {
  startTimer() {
    const elements = CarouselDOM.elements

    if (!elements.timers || elements.timers.length === 0) {
      return false
    }

    elements.timers.forEach(timer => {
      let time = timer.value * 1000

      if (!time) {
        return false
      }

      // Adjust timing based on connection speed for better UX
      const laggy = $.slowConnection() && $.is($.slowConnection, 'function')
      if (laggy) {
        time = time * 1.5 // Increase interval on slow connections
      }

      CarouselDOM.state.interval = setInterval(() => {
        CarouselNavigation.handleNavigation(undefined, time)
      }, time)
    })
  },

  setupPauseAutoRotate() {
    const block = CarouselDOM.elements.block
    const isPause = block.classList.contains(CarouselConfig.classes.pause)

    if (!isPause) {
      return false
    }
    if (!CarouselDOM.elements.items.length) {
      return false
    }

    const eventHandler = (event) => {
      if (event.type === 'mouseenter' || event.type === 'touchstart') {
        if (CarouselDOM.state.interval) {
          clearInterval(CarouselDOM.state.interval)
          CarouselDOM.state.interval = null
        }
      }
      if (event.type === 'mouseleave' || event.type === 'touchend') {
        this.startTimer()
      }
    }

    $.eventListener('add', block, 'mouseenter', eventHandler, { passive: true })
    $.eventListener('add', block, 'mouseleave', eventHandler, { passive: true })
    $.eventListener('add', block, 'touchstart', eventHandler, { passive: true })
    $.eventListener('add', block, 'touchend', eventHandler, { passive: true })
  }
}

const handleCarousel = el => {
  if (!el) return null

  const elements = CarouselDOM.init(el)
  if (!elements.block) return null

  CarouselDOM.initCarousel()

  const navigationHandler = e => {
    CarouselNavigation.handleNavigation(e, undefined)
  }

  const touchscreenHandler = e => {
    CarouselTouch.handleTouchscreenPoints(e)
  }

  const touchpadHandler = e => {
    CarouselTouch.handleTouchpadPoints(e)
  }

  const handleResponsiveChanges = () => {
    CarouselEffects.hideControls(elements)
    CarouselPagination.hidePaginationDots()

    // Check if all controls should be hidden after the above calls
    const element = elements.wrap
    const clientX = element.clientWidth
    const totalItems = elements.items.length
    // Use CSS-defined slide width instead of computed width to avoid fractional issues
    const itemWidth = CarouselUtils.getSlideWidth(elements.block)
    const gap = CarouselUtils.getGapValue(element)

    // Calculate total content width precisely (consistent with hideControls)
    const totalContentWidth = (totalItems * itemWidth) + ((totalItems - 1) * gap)
    const hasContentOverflow = totalContentWidth > clientX
    const shouldHideAllControls = !hasContentOverflow


    // If controls should be hidden, reset pagination state and return
    if (shouldHideAllControls) {

      // Reset all dots to inactive state when controls are hidden
      elements.dots.forEach(dot => {
        $.toggleClass(dot, CarouselConfig.modifier.active, false)
      })

      return
    }

    // Only do responsive recalculation if controls should be visible
    const currentScroll = element.scrollLeft
    const currentPosition = Math.round(currentScroll / itemWidth) + 1

    // Update pagination to reflect current scroll position
    const visibleDots = [...elements.dots].filter(dot =>
      !dot.classList.contains(CarouselConfig.modifier.hidden)
    )
    const maxValidPosition = visibleDots.length
    const validPosition = Math.min(currentPosition, maxValidPosition)

    CarouselPagination.updatePagination(null, validPosition)
  }

  CarouselTimer.startTimer()
  CarouselTimer.setupPauseAutoRotate()
  handleResponsiveChanges()
  CarouselEffects.updateOverlay(1)

  elements.dots.forEach(dot => {
    $.eventListener('add', dot, 'click', navigationHandler)
  })

  elements.btns.forEach(btn => {
    $.eventListener('add', btn, 'click', navigationHandler)
  })
  $.eventListener('add', document, 'wheel', touchpadHandler, { passive: true })
  $.eventListener('add', document, 'touchstart', touchscreenHandler, { passive: true })
  $.eventListener('add', document, 'touchend', touchscreenHandler, { passive: true })
  // Use ResizeObserver for better performance with connection-aware settings
  const laggy = $.slowConnection() && $.is($.slowConnection, 'function')
  const resizeObserver = $.resizeObserver(() => {
    handleResponsiveChanges()
  }, {
    element: elements.wrap,
    debounceTime: laggy ? 300 : 150 // Longer debounce on slow connections
  })

  const cleanup = () => {
    elements.dots.forEach(dot => {
      $.eventListener('remove', dot, 'click', navigationHandler)
    })

    elements.btns.forEach(btn => {
      $.eventListener('remove', btn, 'click', navigationHandler)
    })
    $.eventListener('remove', document, 'wheel', touchpadHandler, { passive: true })
    $.eventListener('remove', document, 'touchstart', touchscreenHandler, { passive: true })
    $.eventListener('remove', document, 'touchend', touchscreenHandler, { passive: true })

    if (resizeObserver && $.is(resizeObserver.cleanup, 'function')) {
      resizeObserver.cleanup()
    }

    CarouselDOM.cleanup()
    return null
  }

  return cleanup
}

const initAllCarousels = () => {
  const nodes = document.querySelectorAll(CarouselConfig.selector.carousel)
  if (!nodes.length) return null

  const cleanupHandlers = []

  nodes.forEach(node => {
    const cleanup = handleCarousel(node)
    if (!cleanup) return null
    cleanupHandlers.push(cleanup)
  })

  const handleCleanup = () => {
    cleanupHandlers.forEach(cleanup => {
      if ($.is(cleanup, 'function')) cleanup()
    })
    cleanupHandlers.length = 0
    return null
  }

  return handleCleanup
}

const handleCarousels = () => {
  $.cleanup('cleanupCarousels', initAllCarousels)
}

const initCarousel = () => {
  const delay = CarouselConfig.time.slowConnectionDelay,
        laggy = $.slowConnection() && $.is($.slowConnection, 'function'),
        setDelay = laggy ? delay * 2 : delay

  $.is($.requestIdle, 'function')
    ? $.requestIdle(handleCarousels, { timeout: CarouselConfig.time.idleTimeout })
    : setTimeout(handleCarousels, setDelay)
}

initCarousel()
