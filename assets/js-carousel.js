const handleCarousel = (carousel) => {
  if (!carousel) return null;

  const config = {
    selector: {
      navi: ".carousel__navigation",
      pagination: ".carousel__pagination",
      btn: ".carousel__btn",
      prev: ".carousel__btn.prev",
      next: ".carousel__btn.next",
      dot: ".carousel__dot",
      wrapper: ".carousel__wrapper",
      item: ".carousel__item",
      count: ".carousel__count"
    },
    class: {
      show: "show",
      fade: "carousel__fade-effect",
      full: "carousel__full-width",
      edges: "carousel__edges",
      pause: "carousel__pause",
      dot: "carousel__dot",
      prev: "prev",
      next: "next",
      init: "initialized"
    },
    modifier: {
      active: "active",
      hidden: "hidden",
      show: "show",
      hide: "hide"
    },
    attr: {
      index: "data-index",
      overlayColor: "data-overlay-color",
      defaultColor: "data-dafault-color",
      timer: "data-carousel-timer"
    },
    var: {
      overlay: "--overlay-color",
      overlay08: "--overlay-color-08",
      overlay45: "--overlay-color-45"
    },
    event: {
      click: "click",
      prev: "prev",
      next: "next",
      start: "touchstart",
      end: "touchend",
      enter: "mouseenter",
      leave: "mouseleave"
    }
  }

  let interval = null,
      touchstart = null,
      touchend = null,
      wheelTimeout = null,
      isWheeling = false,
      infinite = true;

  const elements = {
    wrap: carousel.querySelector(config.selector.wrapper),
    navi: carousel.querySelector(config.selector.navi),
    pagi: carousel.querySelector(config.selector.pagination),
    item: carousel.querySelector(config.selector.item),
    items: carousel.querySelectorAll(config.selector.item),
    btns: carousel.querySelectorAll(config.selector.btn),
    dots: carousel.querySelectorAll(config.selector.dot),
    count: carousel.querySelector(config.selector.count)
  }

  const startTimer = () => {
    const timerValue = carousel.getAttribute(config.attr.timer);

    if (!timerValue) return;

    const time = parseInt(timerValue, 10) * 1000;

    if (!isNaN(time) && time > 0) autoRotate(time);
  }

  const autoRotate = (time) => {
    if (!time) return;

    interval = setInterval(() => handleNavigation(undefined, time), time);
  }

  const autoRotatePause = () => {
    const isPause = carousel.classList.contains(config.class.pause);
    if (!isPause || !elements.items.length) return;

    const handlePauseEvent = (event) => {
      if (event.type === config.event.enter || event.type === config.event.start) {
        clearInterval(interval);
      } else if (event.type === config.event.leave || event.type === config.event.end) {
        startTimer();
      }
    }

    carousel.addEventListener(config.event.enter, handlePauseEvent);
    carousel.addEventListener(config.event.leave, handlePauseEvent);
    carousel.addEventListener(config.event.start, handlePauseEvent);
    carousel.addEventListener(config.event.end, handlePauseEvent);
  }

  const handleNavigation = (event, time) => {
    const target = event?.target,
          isPrev = target?.classList.contains(config.class.prev),
          isNext = target?.classList.contains(config.class.next),
          isDot = target?.classList.contains(config.class.dot);

    if (!isPrev && !isNext && !isDot && !time) return;

    const isFade = carousel.classList.contains(config.class.fade),
          isFull = carousel.classList.contains(config.class.full),
          width = elements.item.getBoundingClientRect().width,
          index = parseInt(target?.getAttribute(config.attr.index));

    let element, valueLeft = 0;

    // Determine which element to scroll
    element = isDot || isPrev || isNext
      ? getSiblingElement(target?.parentElement, config.selector.wrapper, config.event.prev)
      : elements.wrap;

    if (!element) return;

    const left = element.scrollLeft,
          scrollX = element.scrollWidth,
          clientX = element.clientWidth,
          children = [...element.children];

    if (isPrev) {
      if (!isFade) {
        valueLeft = calculateSlidePosition({
          currentScroll: left,
          clientVal: clientX,
          scrollVal: isFull ? width * children.length : scrollX,
          size: width,
          trigger: config.event.prev
        })
      } else {
        handleFadeEffect({
          items: children,
          index: 0,
          last: elements.items.length
        })
      }
    }

    if (isNext || time) {
      if (!isFade) {
        valueLeft = calculateSlidePosition({
          currentScroll: left,
          clientVal: clientX,
          scrollVal: isFull ? width * children.length : scrollX,
          size: width,
          trigger: config.event.next
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

    if (isDot && !isFade) valueLeft = width * (index - 1);

    if (!isFade) smoothScrollTo(element, valueLeft, 0);
  }

  const calculateSlidePosition = (options) => {
    const { currentScroll, scrollVal, clientVal, size, trigger } = options;
    let condition, lastIndex, nextIndex, scrollToVal;

    if (trigger === config.event.prev) {
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
        const condition = itemIndex + nextNumber;
        const next = itemIndex + nextIndex;
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
    });
  }

  const handlePagination = (event, index) => {
    const target = event?.target;
    const isDot = target?.classList.contains(config.class.dot);

    if (!isDot && typeof index === 'undefined') return;
    if (!elements.dots.length) return;

    for (const dot of elements.dots) {
      const activeIndex = parseInt(dot.getAttribute(config.attr.index));
      dot.classList.remove(config.modifier.active);

      if (isDot && dot === target) {
        dot.classList.add(config.modifier.active);
      }

      if (activeIndex === index) {
        dot.classList.add(config.modifier.active);
      }
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
    if (!elements.dots.length || !elements.wrap) return;

    const client = elements.wrap.clientWidth;
    const scroll = elements.wrap.scrollWidth;
    const width = elements.item.getBoundingClientRect().width;

    if (scroll - client > 0) {
      const visibleDots = Math.ceil((scroll - client) / width) + 1;

      // First find currently active dot before making changes
      const currentDot = getCurrentDot();
      const activeIndex = currentDot.index;

      // Update visibility of dots
      elements.dots.forEach(dot => {
        dot.classList.add(config.modifier.hidden);
        const index = parseInt(dot.getAttribute(config.attr.index));

        if (index <= visibleDots) {
          dot.classList.remove(config.modifier.hidden);
        }
      });

      // Check if active dot is now hidden
      if (activeIndex > visibleDots) {
        // Activate first dot and scroll to first slide
        handlePagination(undefined, 1);

        // Also update carousel position
        const targetPos = 0; // First slide
        smoothScrollTo(elements.wrap, targetPos, 0);
      }
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
    const dots = getCurrentDot().dots;

    if (!dots.length && !wrap) return;

    if (event.type === config.event.start) {
      touchstart = event.changedTouches[0].screenX;
    } else if (event.type === config.event.end && touchstart !== null) {
      touchend = event.changedTouches[0].screenX;
      processTouchDirection(wrap);

      // Reset touch positions to prevent accidental processing
      touchstart = null;
      touchend = null;
    }
  }

  const processTouchDirection = (wrap) => {
    if (!wrap) return;

    const left = wrap.scrollLeft;
    const scroll = wrap.scrollWidth;
    const client = wrap.clientWidth;
    const next = wrap.parentElement.querySelector(config.selector.next);
    const prev = wrap.parentElement.querySelector(config.selector.prev);
    const isFade = wrap.parentElement.classList.contains(config.class.fade);

    // Only process significant swipes (minimum threshold to avoid accidental swipes)
    const swipeDistance = Math.abs(touchstart - touchend);
    const minSwipeThreshold = 20;

    if (swipeDistance < minSwipeThreshold) return;

    const leftSwipe = touchstart > touchend;
    const rightSwipe = touchend > touchstart;
    const { dots, index } = getCurrentDot();

    if (!isFade) {
      if (left >= 0 && left <= scroll - client) {
        infinite = false;

        if (leftSwipe) Utils.triggerEvent(next, config.event.click);
        if (rightSwipe) Utils.triggerEvent(prev, config.event.click);

        infinite = true;
      }
    } else {
      if (leftSwipe && index < dots.length) handlePagination(undefined, index + 1);
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
    if (!dots.length) return;

    isWheeling = true;

    // Use the direction of wheel movement, not the magnitude
    const delta = Math.sign(event.deltaX);

    if (delta === -1 && index > 1) {
      handlePagination(undefined, index - 1);
    } else if (delta === 1 && index < dots.length) {
      handlePagination(undefined, index + 1);
    }

    // Reset wheeling state after a delay
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      isWheeling = false;
    }, 100);
  }

  const getCurrentDot = () => {
    if (!elements.dots || !elements.dots.length) return { index: 1, dots: [] };

    // Use a more efficient approach to filter and find active dot
    const visibleDots = [];
    let activeIndex = 1;
    let foundActive = false;

    // Only loop through dots once
    for (const dot of elements.dots) {
      if (!dot.classList.contains(config.modifier.hidden)) {
        visibleDots.push(dot);

        if (!foundActive && dot.classList.contains(config.modifier.active)) {
          activeIndex = parseInt(dot.getAttribute(config.attr.index));
          foundActive = true;
        }
      }
    }

    return { index: activeIndex, dots: visibleDots };
  }

  const setOverlay = (index) => {
    if (!carousel.classList.contains(config.class.edges) ||
        !index ||
        index > elements.items.length) return;

    const defaultColor = carousel.getAttribute(config.attr.defaultColor);

    // Direct access to the specific item by index (more efficient)
    const itemIndex = index - 1;

    if (itemIndex >= 0 && itemIndex < elements.items.length) {
      const item = elements.items[itemIndex];
      const overlayColor = item.getAttribute(config.attr.overlayColor) || defaultColor;

      // Set all CSS variables at once
      const parentStyle = carousel.parentElement.style;
      parentStyle.setProperty(config.var.overlay, overlayColor);
      parentStyle.setProperty(config.var.overlay08, `${overlayColor}24`);
      parentStyle.setProperty(config.var.overlay45, `${overlayColor}73`);
    }
  }

  const smoothScrollTo = (element, left, top) => {
    element.scrollTo({
      left,
      top,
      behavior: "smooth",
    });
  }

  const getSiblingElement = (element, selector, direction) => {
    if (!element) return null;

    let sibling;

    if (direction === config.event.prev) {
      sibling = element.previousElementSibling;
      while (sibling) {
        if (sibling.matches(selector)) return sibling;
        sibling = sibling.previousElementSibling;
      }
    } else if (direction === config.event.next) {
      sibling = element.nextElementSibling;
      while (sibling) {
        if (sibling.matches(selector)) return sibling;
        sibling = sibling.nextElementSibling;
      }
    }

    return null;
  }

  const setupListeners = () => {
    // Button and dot click handlers using Utils from js-utils.js
    Utils.addEventListenerToNodes(elements.dots, 'click', handlePagination);
    Utils.addEventListenerToNodes(elements.dots, 'click', handleNavigation);
    Utils.addEventListenerToNodes(elements.btns, 'click', handleNavigation);

    // Touch and wheel events attached to the carousel element only (not document)
    // for better performance
    carousel.addEventListener('wheel', handleTouchpadMovement, { passive: false });
    carousel.addEventListener('touchstart', handleTouchscreenMovement, { passive: true });
    carousel.addEventListener('touchend', handleTouchscreenMovement, { passive: true });

    // Debounced resize handler for better performance
    const debouncedResize = Utils.debounce(() => {
      updateControls();
      updatePaginationDots();
    }, 150);

    window.addEventListener('resize', debouncedResize);
  }

  const initialize = () => {
    if (!elements.items || elements.items.length < 2) return;

    carousel.classList.add(config.class.init);

    // Check if auto-rotation is needed
    if (carousel.hasAttribute(config.attr.timer)) {
      startTimer();

      if (carousel.classList.contains(config.class.pause)) {
        autoRotatePause();
      }
    }

    updateControls();
    updatePaginationDots();

    // Set initial overlay if feature is enabled
    if (carousel.classList.contains(config.class.edges)) {
      setOverlay(1);
    }

    setupListeners();
  }

  // Public API
  return {
    initialize,
    updateControls,
    updatePaginationDots
  }
}

const initCarousel = (selector = ".carousel") => {
  const nodes = document.querySelectorAll(selector);
  if (!nodes.length) return;

  nodes.forEach(node => {
    const carousel = handleCarousel(node);
    if (carousel) carousel.initialize();
  })
}

initCarousel();
