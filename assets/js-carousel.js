/**
  * Handle carousel functionality with optimized performance
  * @param {HTMLElement} carousel - The carousel DOM element
  * @returns {Object|null} - Public API for the carousel
*/

const handleCarousel = (carousel) => {
  if (!carousel) return null;

  const config = {
    selector: {
      btn: '.carousel__btn',
      dot: '.carousel__dot',
      count: '.carousel__count',
      item: '.carousel__item',
      next: '.carousel__btn.next',
      prev: '.carousel__btn.prev',
      navigation: '.carousel__navigation',
      pagination: '.carousel__pagination',
      wrapper: '.carousel__wrapper'
    },
    class: {
      show: 'show',
      fade: 'carousel__fade-effect',
      full: 'carousel__full-width',
      edges: 'carousel__edges',
      pause: 'carousel__pause',
      dot: 'carousel__dot',
      prev: 'prev',
      next: 'next',
      init: 'initialized'
    },
    modifier: {
      active: 'active',
      hidden: 'hidden',
      show: 'show',
      hide: 'hide'
    },
    attr: {
      index: 'data-index',
      defaultColor: 'data-dafault-color',
      overlayColor: 'data-overlay-color',
      timer: 'data-carousel-timer'
    },
    cssVar: {
      animation: '--animation-duration',
      overlay: '--overlay-color',
      overlay08: '--overlay-color-08',
      overlay45: '--overlay-color-45'
    }
  }

  let defaultDuration = 200, // Default animation duration
      infinite = true,
      interval = null,
      isWheeling = false,
      touchstart = null,
      touchend = null,
      lastWindowWidth = window.innerWidth, // Track window width for resize optimization
      slideWidth = 0, // Cache slide width to avoid recalculation
      wheelTimeout = null;

  const elements = {
    btns: carousel.querySelectorAll(config.selector.btn),
    count: carousel.querySelector(config.selector.count),
    dots: carousel.querySelectorAll(config.selector.dot),
    item: carousel.querySelector(config.selector.item),
    items: carousel.querySelectorAll(config.selector.item),
    navi: carousel.querySelector(config.selector.navigation),
    pagi: carousel.querySelector(config.selector.pagination),
    wrap: carousel.querySelector(config.selector.wrapper)
  }

  const startTimer = () => {
    const value = carousel.getAttribute(config.attr.timer);
    if (!value) return;

    const time = parseInt(value, 10) * 1000;

    autoRotate(time);
  }

  const autoRotate = (time) => {
    if (!time) return;

    interval = setInterval(() => handleNavigation(undefined, time), time);
  }

  const autoRotatePause = () => {
    const isPause = carousel.classList.contains(config.class.pause);
    if (!isPause || !elements.items.length) return;

    const handlePauseEvent = (e) => {
      if (e.type === 'mouseenter' || e.type === 'touchstart') {
        clearInterval(interval);
      } else if (e.type === 'mouseleave' || e.type === 'touchend') {
        startTimer();
      }
    }

    carousel.addEventListener('mouseenter', handlePauseEvent);
    carousel.addEventListener('mouseleave', handlePauseEvent);
    carousel.addEventListener('touchstart', handlePauseEvent);
    carousel.addEventListener('touchend', handlePauseEvent);
  }

  const handleNavigation = (event, time) => {
    const target = event?.target,
          isPrev = target?.classList.contains(config.class.prev),
          isNext = target?.classList.contains(config.class.next),
          isDot = target?.classList.contains(config.class.dot);

    if (!isPrev && !isNext && !isDot && !time) return;

    const isFade = carousel.classList.contains(config.class.fade),
          isFull = carousel.classList.contains(config.class.full),
          index = parseInt(target?.getAttribute(config.attr.index)),
          width = slideWidth || elements.item.getBoundingClientRect().width; // Use cached slideWidth instead of recalculating width if available

    if (!slideWidth) slideWidth = width; // Update cache if not set

    let element, valueLeft = 0;

    // Determine which element to scroll
    element = isDot || isPrev || isNext
      ? getSiblingElement(target?.parentElement, config.selector.wrapper, 'prev')
      : elements.wrap;

    if (!element) return;

    const left = element.scrollLeft,
          scrollX = element.scrollWidth,
          clientX = element.clientWidth,
          children = [...element.children];

    const handleSlidingLeft = () => {
      if (!isFade) {
        valueLeft = calculateSlidePosition({
          currentScroll: left,
          clientVal: clientX,
          scrollVal: isFull ? width * children.length : scrollX,
          size: width,
          trigger: 'prev'
        })
      } else {
        handleFadeEffect({
          items: children,
          index: 0,
          last: elements.items.length
        })
      }
    }

    const handleSlidingRight = () => {
      if (!isFade) {
        valueLeft = calculateSlidePosition({
          currentScroll: left,
          clientVal: clientX,
          scrollVal: isFull ? width * children.length : scrollX,
          size: width,
          trigger: 'next'
        })
      } else {
        handleFadeEffect({
          items: children,
          index: elements.items.length,
          last: 1,
          nextNumber: 1,
          nextIndex: 2
        })
      }
    }

    if (isPrev) handleSlidingLeft();

    if (isNext || time) handleSlidingRight();

    if (isDot && !isFade) valueLeft = width * (index - 1);

    if (!isFade) smoothScrollTo(element, valueLeft, 0);
  }

  const calculateSlidePosition = (options) => {
    const { currentScroll, scrollVal, clientVal, size, trigger } = options;
    let condition, lastIndex, nextIndex, scrollToVal;

    if (trigger === 'prev') {
      condition = currentScroll === 0;
      lastIndex = Math.ceil((scrollVal - clientVal) / size + 1);
      nextIndex = Math.ceil(currentScroll / size);
      scrollToVal = condition && infinite ? scrollVal : currentScroll - size;
    } else {
      condition = currentScroll >= scrollVal - clientVal - 16;
      lastIndex = 1;
      nextIndex = parseInt(currentScroll / size + 2);
      scrollToVal = condition && infinite ? 0 : currentScroll + size;
    }

    const i = condition && infinite ? lastIndex : nextIndex;

    handlePagination(undefined, i);
    return scrollToVal;
  }

  const handleFadeEffect = (options) => {
    const { items, index, last, nextNumber = 0, nextIndex = 0 } = options;
    let i;

    for (const [itemIndex, item] of items.entries()) {
      if (item.classList.contains(config.class.show)) {
        const condition = itemIndex + nextNumber,
              next = itemIndex + nextIndex;
        i = condition === index ? last : next;
        break;
      }
    }

    handlePagination(undefined, i);
    updateFadeClass(i);
  }

  const updateFadeClass = (index) => {
    if (!carousel.classList.contains(config.class.fade) || !index || index > elements.items.length) return;

    elements.items.forEach((item, itemIndex) => {
      item.classList.replace(config.modifier.show, config.modifier.hide);
      if (itemIndex + 1 === index) {
        item.classList.replace(config.modifier.hide, config.modifier.show);
      }
    })
  }

  const handlePagination = (event, index) => {
    const target = event?.target,
          isDot = target?.classList.contains(config.class.dot);

    if (!isDot && typeof index === 'undefined') return;
    if (!elements.dots.length) return;

    for (const dot of elements.dots) {
      const activeIndex = parseInt(dot.getAttribute(config.attr.index));
      dot.classList.remove(config.modifier.active);

      const addActiveClass = () => {
        dot.classList.add(config.modifier.active);
      }

      if (isDot && dot === target) addActiveClass();

      if (activeIndex === index) addActiveClass();
    }

    // If index is undefined, get it from the target
    if (typeof index === 'undefined' && target) {
      index = parseInt(target.getAttribute(config.attr.index));
    }

    updateCounter(index);
    updateFadeClass(index);
    setOverlay(index);
  }

  const updatePaginationDots = () => {
    if (!elements.dots.length || !elements.wrap || !getCurrentDot()) return;

    const { index: activeIndex, dots: visibleDots } = getCurrentDot(); // Get current dots state with max visible dots calculation
    if (visibleDots === 0) return;

    const width = slideWidth, // Cache slide width
          dotsToHide = [],
          dotsToShow = [];

    elements.dots.forEach(dot => {
      const index = parseInt(dot.getAttribute(config.attr.index)),
            isHidden = dot.classList.contains(config.modifier.hidden);

      if (index <= visibleDots && isHidden) {
        dotsToShow.push(dot);
      } else if (index > visibleDots && !isHidden) {
        dotsToHide.push(dot);
      }
    })

    // Batch DOM operations for better performance
    dotsToHide.forEach(dot => dot.classList.add(config.modifier.hidden));
    dotsToShow.forEach(dot => dot.classList.remove(config.modifier.hidden));

    // Check if active dot is now hidden
    if (activeIndex > visibleDots && visibleDots > 0) {
      const slidePosition = width * (visibleDots - 1); // Calculate position to scroll to (based on dot index)

      // Activate the dot and scroll to the related slide
      handlePagination(undefined, visibleDots);
      smoothScrollTo(elements.wrap, slidePosition, 0);
    }
  }

  const updateControls = () => {
    if (!elements.navi && !elements.pagi || !elements.wrap) return;

    const hasNoOverflow = elements.wrap.clientWidth === elements.wrap.scrollWidth &&
                         elements.wrap.clientHeight === elements.wrap.scrollHeight;

    if (hasNoOverflow) {
      elements.navi?.classList.add(config.modifier.hidden);
      elements.pagi?.classList.add(config.modifier.hidden);
    } else {
      elements.navi?.classList.remove(config.modifier.hidden);
      elements.pagi?.classList.remove(config.modifier.hidden);
    }
  }

  const updateCounter = (i) => {
    if (!elements.count || i === 0 || typeof i === 'undefined') return;

    elements.count.innerHTML = i < 10 ? `0${i}` : `${i}`;
  }

  const handleTouchscreenMovement = (event) => {
    event.stopPropagation();

    const wrap = event?.target.closest(config.selector.wrapper);
    const { dots } = getCurrentDot();

    if (dots < 1 && !wrap) return;

    if (event.type === 'touchstart') {
      touchstart = event.changedTouches[0].screenX;
    } else if (event.type === 'touchend' && touchstart !== null) {
      touchend = event.changedTouches[0].screenX;
      processTouchDirection(wrap);

      // Reset touch positions to prevent accidental processing
      touchstart = null;
      touchend = null;
    }
  }

  const processTouchDirection = (wrap) => {
    if (!wrap) return;

    const left = wrap.scrollLeft,
          scroll = wrap.scrollWidth,
          client = wrap.clientWidth,
          next = wrap.parentElement.querySelector(config.selector.next),
          prev = wrap.parentElement.querySelector(config.selector.prev),
          isFade = wrap.parentElement.classList.contains(config.class.fade),
          swipeDistance = Math.abs(touchstart - touchend),
          minSwipeThreshold = 20;

    // Only process significant swipes (minimum threshold to avoid accidental swipes)
    if (swipeDistance < minSwipeThreshold) return;

    const leftSwipe = touchstart > touchend,
          rightSwipe = touchend > touchstart;
    const { dots, index } = getCurrentDot();

    if (!isFade) {
      if (left >= 0 && left <= scroll - client) {
        infinite = false;

        if (leftSwipe) LazyUtils.triggerEvent(next, 'click');
        if (rightSwipe) LazyUtils.triggerEvent(prev, 'click');

        infinite = true;
      }
    } else {
      if (leftSwipe && index < dots) handlePagination(undefined, index + 1);
      if (rightSwipe && index > 1) handlePagination(undefined, index - 1);
    }
  }

  const handleTouchpadMovement = (event) => {
    if (isWheeling) return;

    const wrap = event?.target.closest(config.selector.wrapper);
    if (!wrap) return;

    // Only handle horizontal scrolling, let vertical scroll work normally
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) return;

    // Only process significant wheel events (minimum threshold)
    if (Math.abs(event.deltaX) < 5) return;

    // Prevent default to avoid page scrolling during carousel interaction
    event.preventDefault();

    const { dots, index } = getCurrentDot();
    if (dots < 1) return;

    isWheeling = true;

    // Use the direction of wheel movement, not the magnitude
    const delta = Math.sign(event.deltaX);

    if (delta === -1 && index > 1) {
      handlePagination(undefined, index - 1);
    } else if (delta === 1 && index < dots) {
      handlePagination(undefined, index + 1);
    }

    // Reset wheeling state after a delay
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      isWheeling = false;
    }, 100);
  }

  const getCurrentDot = () => {
    if (!elements.dots || !elements.dots.length) return { index: 1, dots: 0 };

    let visibleDots = 0;

    // Calculate max visible dots
    if (elements.item && elements.wrap) {
      const client = elements.wrap.clientWidth,
            scroll = elements.wrap.scrollWidth,
            width = slideWidth || elements.item.getBoundingClientRect().width,
            maxDots = Math.ceil((scroll - client) / width) + 1;

      if (!slideWidth) slideWidth = width; // Update cache if needed
      if (scroll - client > 0) visibleDots = maxDots; // Calculate max dots that can be visible based on carousel width
    }

    if (visibleDots === 0) return;

    // Use a more efficient approach to filter and find active dot
    let activeIndex = 1,
        foundActive = false;

    // Only loop through dots once
    for (const dot of elements.dots) {
      if (!dot.classList.contains(config.modifier.hidden)) {
        if (!foundActive && dot.classList.contains(config.modifier.active)) {
          activeIndex = parseInt(dot.getAttribute(config.attr.index));
          foundActive = true;
        }
      }
    }

    return { index: activeIndex, dots: visibleDots }
  }

  // Helper function to get animation duration in milliseconds
  const getAnimationDuration = () => {
    const transitionStyle = getComputedStyle(carousel),
          animationDuration = transitionStyle.getPropertyValue(config.cssVar.animation) || `${defaultDuration}ms`;

    let durationMs = parseInt(animationDuration.replace('ms', ''));
    if (isNaN(durationMs)) durationMs = defaultDuration;

    return durationMs + defaultDuration; // Add 200ms to the duration as specified in the CSS (transition: ... + 200ms)
  }

  // Track the last overlay timer to clear it if needed
  let overlayTimer = null;

  const setOverlay = (index) => {
    if (!carousel.classList.contains(config.class.edges) ||
        !index ||
        index > elements.items.length) return;

    const defaultColor = carousel.getAttribute(config.attr.defaultColor),
          itemIndex = index - 1; // Direct access to the specific item by index (more efficient)

    if (itemIndex >= 0 && itemIndex < elements.items.length) {
      const item = elements.items[itemIndex],
            overlayColor = item.getAttribute(config.attr.overlayColor) || defaultColor,
            durationMs = getAnimationDuration(), // Get animation duration
            halfDuration = Math.max(durationMs / 2, defaultDuration / 2); // // Calculate midpoint. Default is 100ms delay

      if (overlayTimer) clearTimeout(overlayTimer); // Clear any existing timer to avoid race conditions

      // Delay setting the overlay color until halfway through the transition
      overlayTimer = setTimeout(() => {
        const parentStyle = carousel.parentElement.style; // Set all CSS variables at once for better performance
        parentStyle.setProperty(config.cssVar.overlay, overlayColor);
        parentStyle.setProperty(config.cssVar.overlay08, `${overlayColor}24`);
        parentStyle.setProperty(config.cssVar.overlay45, `${overlayColor}73`);

        overlayTimer = null; // Clear the timer reference once executed
      }, halfDuration);
    }
  }

  // Track when a scroll transition is occurring
  let isScrolling = false;
  let currentScrollTarget = null;

  // Enhanced scroll with transition tracking
  const smoothScrollTo = (element, left, top) => {
    // Mark that we're starting a scroll transition
    isScrolling = true;
    currentScrollTarget = left;

    // Perform the smooth scroll
    element.scrollTo({
      left,
      top,
      behavior: 'smooth'
    })

    // Add a one-time scroll event listener to detect when scrolling ends
    const handleScrollEnd = () => {
      // Reset scrolling state when the transition is complete
      isScrolling = false;
      currentScrollTarget = null;

      // Remove the listener once fired
      element.removeEventListener('scrollend', handleScrollEnd);
    }

    // Use scrollend event if supported, otherwise fallback to timeout
    'onscrollend' in window
      ? element.addEventListener('scrollend', handleScrollEnd, { once: true })
      : setTimeout(handleScrollEnd, getAnimationDuration() + 50) // Get animation duration and add buffer time to ensure transition completes
  }

  const getSiblingElement = (element, selector, direction) => {
    if (!element) return null;

    let sibling;

    if (direction === 'prev') {
      sibling = element.previousElementSibling;
      while (sibling) {
        if (sibling.matches(selector)) return sibling;
        sibling = sibling.previousElementSibling;
      }
    } else if (direction === 'next') {
      sibling = element.nextElementSibling;
      while (sibling) {
        if (sibling.matches(selector)) return sibling;
        sibling = sibling.nextElementSibling;
      }
    }

    return null;
  }

  const setupListeners = () => {
    // Button and dot click handlers using LazyUtils from js-lazy-utils.js
    LazyUtils.addEventListenerToNodes(elements.dots, 'click', handlePagination);
    LazyUtils.addEventListenerToNodes(elements.dots, 'click', handleNavigation);
    LazyUtils.addEventListenerToNodes(elements.btns, 'click', handleNavigation);

    // Touch and wheel events attached to the carousel element only (not document)
    // for better performance - use passive listeners where possible
    carousel.addEventListener('wheel', handleTouchpadMovement, { passive: false });
    carousel.addEventListener('touchstart', handleTouchscreenMovement, { passive: true });
    carousel.addEventListener('touchend', handleTouchscreenMovement, { passive: true });

    // Optimized resize handler - only update when width actually changes
    const debouncedResize = LazyUtils.debounce(() => {
      const currentWidth = window.innerWidth;

      // Only process resize if width actually changed (skip height-only changes)
      if (currentWidth !== lastWindowWidth) {
        // Update cached width
        lastWindowWidth = currentWidth;

        // Recalculate slide width since viewport changed
        if (elements.item) slideWidth = elements.item.getBoundingClientRect().width;

        // Update UI elements
        updateControls();
        updatePaginationDots();
      }
    }, 150)

    window.addEventListener('resize', debouncedResize);
  }

  const initialize = () => {
    if (!elements.items || elements.items.length < 2) return;

    // Cache the slide width on initialization to avoid recalculating it multiple times
    if (elements.item) slideWidth = elements.item.getBoundingClientRect().width;

    carousel.classList.add(config.class.init);

    // Check if auto-rotation is needed - only run this code if necessary
    if (carousel.hasAttribute(config.attr.timer)) {
      startTimer();
      if (carousel.classList.contains(config.class.pause)) autoRotatePause();
    }

    // Run these functions in order - they depend on each other
    updateControls();
    updatePaginationDots();

    // Set initial overlay if feature is enabled (conditional execution)
    if (carousel.classList.contains(config.class.edges)) setOverlay(1);

    // Set up event listeners after all initialization is complete
    setupListeners();
  }

  // Public API
  return {
    initialize,
    updateControls,
    updatePaginationDots
  }
}

/**
 * Initialize carousels with intersection observer for performance
 * @param {string} selector - CSS selector for carousel elements
 */
const initCarousel = (selector = '.carousel') => {
  const nodes = document.querySelectorAll(selector);
  if (!nodes.length) return;

  // Handler for carousel intersection
  const handleCarouselIntersection = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const carousel = handleCarousel(entry.target);
        if (carousel) carousel.initialize(); // Initialize the carousel

        observer.unobserve(entry.target); // Stop observing after it's initialized
      }
    })
  }

  // Create observer using Utils directly
  const observer = Utils.createObserver(handleCarouselIntersection);

  nodes.forEach(node => {
    observer
      ? observer.observe(node) // If we have an observer, use it to lazy-initialize carousels
      : handleCarousel(node)?.initialize() // Fallback for browsers without IntersectionObserver
  })
}

initCarousel()
