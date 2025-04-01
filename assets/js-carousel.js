class Carousel {
  constructor(block) {
    this.block = block;

    this.selector = {
      navi: ".carousel__navigation",
      pagination: ".carousel__pagination",
      btn: ".carousel__btn",
      prev: ".carousel__btn.prev",
      next: ".carousel__btn.next",
      dot: ".carousel__dot",
      wrapper: ".carousel__wrapper",
      item: ".carousel__item",
      timer: ".carousel__timer",
      count: ".carousel__count"
    }

    this.classes = {
      show: "show",
      fade: "carousel__fade-effect",
      full: "carousel__full-width",
      edges: "carousel__edges",
      pause: "carousel__pause",
      dot: "carousel__dot",
      prev: "prev",
      next: "next",
      init: "initialized"
    }

    this.modifiers = {
      active: "active",
      hidden: "hidden",
      show: "show",
      hide: "hide"
    }

    this.data = {
      index: "data-index",
      overlayColor: "data-overlay-color",
      defaultColor: "data-dafault-color"
    }

    this.cssVar = {
      overlay: "--overlay-color",
      overlay08: "--overlay-color-08",
      overlay45: "--overlay-color-45"
    }

    this.event = {
      click: "click",
      prev: "prev",
      next: "next",
      start: "touchstart",
      end: "touchend",
      enter: "mouseenter",
      leave: "mouseleave"
    }

    this.interval;
    this.touchstart = null;
    this.touchend = null;
    this.wheelTimeout;
    this.isWheeling = false;
    this.infinite = true;
  }

  init() {
    if (!this.block) return false;

    this.elements();
    this.events();
  }

  elements() {
    this.wrap = this.block.querySelector(this.selector.wrapper);
    this.navi = this.block.querySelector(this.selector.navi);
    this.pagi = this.block.querySelector(this.selector.pagination);
    this.item = this.block.querySelector(this.selector.item);
    this.items = this.block.querySelectorAll(this.selector.item);
    this.btns = this.block.querySelectorAll(this.selector.btn);
    this.dots = this.block.querySelectorAll(this.selector.dot);
    this.count = this.block.querySelector(this.selector.count);
    this.timers = this.block.querySelectorAll(this.selector.timer);
  }

  events() {
    this.carouselInit();
    this.startTimer();
    this.pauseAutoRotate();
    this.hideControls();
    this.hidePaginationDots();
    this.setOverlay(1);

    this.listener(this.dots, 'click', this.pagination);
    this.listener(this.dots, 'click', this.navigation);
    this.listener(this.btns, 'click', this.navigation);
    document.addEventListener('wheel', this.touchpadPoints.bind(this));
    document.addEventListener('touchstart', this.touchscreenPoints.bind(this));
    document.addEventListener('touchend', this.touchscreenPoints.bind(this));
    window.addEventListener('resize', this.hideControls.bind(this));
    window.addEventListener('resize', this.hidePaginationDots.bind(this));
  }

  carouselInit() {
    if (this.items.length < 2) return false;

    this.block.classList.add(this.classes.init);
  }

  startTimer() {
    this.timers.forEach(timer => this.autoRotate(timer.value * 1000));
  }

  // autorotate slides of carousel
  autoRotate(time) {
    if (!time) return false;

    this.interval = setInterval(() => this.navigation(undefined, time), time);

    return () => clearInterval(this.interval);
  }

  // pause autorotate slides on hover and touch devices
  pauseAutoRotate() {
    const isPause = this.block.classList.contains(this.classes.pause);

    if (!isPause) return false;
    if (!this.items.length) return false;

    const func = event => {
      if (event.type === this.event.enter || event.type === this.event.start) clearInterval(this.interval);
      if (event.type === this.event.leave || event.type === this.event.end) this.startTimer();
    }

    this.block.addEventListener(this.event.enter, func);
    this.block.addEventListener(this.event.leave, func);
    this.block.addEventListener(this.event.start, func);
    this.block.addEventListener(this.event.end, func);
  }

  // slide the carousel left/right or top/bottom and change the index of the active dot of the pagination
  navigation(event, time) {
    const target = event?.target,
          isPrev = target?.classList.contains(this.classes.prev),
          isNext = target?.classList.contains(this.classes.next),
          isDot = target?.classList.contains(this.classes.dot);

    if (!isPrev && !isNext && !isDot && !time) return false;

    const isFade = this.block.classList.contains(this.classes.fade),
          isFull = this.block.classList.contains(this.classes.full),
          width = this.item.getBoundingClientRect().width,
          index = parseInt(target?.getAttribute(this.data.index)),
          prev = this.event.prev,
          next = this.event.next;

    let element, left, scrollX, clientX, children, valueLeft = 0;

    element = isDot || isPrev || isNext
      ? this.getSiblingElement(target?.parentElement, this.selector.wrapper, this.event.prev)
      : this.wrap

    left = element.scrollLeft;
    scrollX = element.scrollWidth;
    clientX = element.clientWidth;
    children = [...element.children];

    if (isFull) scrollX = width * children.length;

    if (isPrev) {
      if (!isFade) {
        const options = {
          currentScroll: left,
          clientVal: clientX,
          scrollVal: scrollX,
          scrollToVal: valueLeft,
          size: width,
          trigger: prev
        }

        valueLeft = this.slideEfect(event, options);

      } else {
        const options = {
          items: children,
          index: 0,
          last: this.items.length
        }

        this.fadeEffect(event, options);
      }
    }

    if (isNext || time) {
      if (!isFade) {
        const options = {
          currentScroll: left,
          clientVal: clientX,
          scrollVal: scrollX,
          scrollToVal: valueLeft,
          size: width,
          trigger: next
        }

        valueLeft = this.slideEfect(event, options);

      } else {
        const options = {
          items: children,
          index: this.items.length,
          last: 1,
          nextNumber: 1,
          nextIndex: 2
        }

        this.fadeEffect(event, options);
      }
    }

    if (isDot && !isFade) valueLeft = width * (index - 1);

    if (!isFade) {
      const options = {
        element: element,
        left: valueLeft,
        top: 0
      }

      this.scrollTo(options);
    }
  }

  // logic of Carousel's Prev and Next buttons (including vertical carousel)
  slideEfect(event, options) {
    const { currentScroll, scrollVal, clientVal, size, trigger } = options;
    let i, condition, lastIndex, nextIndex, scrollToLast, scrollToNext, scrollToVal;

    switch (trigger) {
      case this.event.prev:
        condition = currentScroll === 0;
        lastIndex = Math.ceil((scrollVal - clientVal) / size + 1);
        nextIndex = Math.ceil(currentScroll / size);
        scrollToLast = scrollVal;
        scrollToNext = currentScroll - size;

        break;

      case this.event.next:
        condition = currentScroll >= scrollVal - clientVal - 16;
        lastIndex = 1;
        nextIndex = parseInt(currentScroll / size + 2);
        scrollToLast = 0;
        scrollToNext = currentScroll + size;

        break;
    }

    i = condition && this.infinite ? lastIndex : nextIndex;
    scrollToVal = condition && this.infinite ? scrollToLast : scrollToNext;

    this.pagination(event, i);

    return scrollToVal;
  }

  // search new index for active slide on Fade carousel mode
  fadeEffect(event, options) {
    const { items, index, last, nextNumber, nextIndex } = options;
    let i;

    items.forEach((item, itemIndex) => {
      if (item.classList.contains(this.classes.show)) {
        const condition = itemIndex + (nextNumber ?? 0),
              next = itemIndex + (nextIndex ?? 0);

        i = condition === index ? last : next
      }
    })

    this.pagination(event, i);
    this.fadeClass(i);
  }

  // change slides in Fade effect mode
  fadeClass(index) {
    const isFade = this.block.classList.contains(this.classes.fade);

    if (!isFade || !index || index > this.items.length) return false;

    this.items.forEach((item, itemIndex) => {
      item.classList.replace(this.modifiers.show, this.modifiers.hide);
      if (itemIndex + 1 === index) item.classList.replace(this.modifiers.hide, this.modifiers.show);
    })
  }

  // change active dot of the pagination
  pagination(event, index) {
    const target = event?.target,
          isDot = target?.classList.contains(this.classes.dot);

    if (!isDot && typeof index === 'undefined') return false;

    this.dots.forEach(dot => {
      const activeIndex = parseInt(dot.getAttribute(this.data.index));

      dot.classList.remove(this.modifiers.active);

      if (isDot) target.classList.add(this.modifiers.active);
      if (activeIndex === index) dot.classList.add(this.modifiers.active);
      if (typeof index === 'undefined') index = parseInt(target.getAttribute(this.data.index));
    })

    this.counter(index);
    this.fadeClass(index);
    this.setOverlay(index);
  }

  // hide not used dots of the pagination
  hidePaginationDots() {
    if (!this.dots) return false;

    const client = this.wrap.clientWidth,
          scroll = this.wrap.scrollWidth,
          width = this.item.getBoundingClientRect().width;

    if (scroll - client > 0) {
      const numberDots = Math.ceil((scroll - client) / width);

      this.dots.forEach(dot => {
        dot.classList.add(this.modifiers.hidden);

        const index = parseInt(dot.getAttribute(this.data.index));

        if (index <= numberDots + 1) dot.classList.remove(this.modifiers.hidden);
      })
    }
  }

  // hide all controls if viewport is bigger than the width of all slides
  hideControls() {
    if (!this.navi && !this.pagi) return false;

    const clientX = this.wrap.clientWidth,
          scrollX = this.wrap.scrollWidth,
          clientY = this.wrap.clientHeight,
          scrollY = this.wrap.scrollHeight;

    clientX === scrollX && clientY === scrollY
      ? (this.navi?.classList.add(this.modifiers.hidden),
         this.pagi?.classList.add(this.modifiers.hidden))
      : (this.navi?.classList.remove(this.modifiers.hidden),
         this.pagi?.classList.remove(this.modifiers.hidden))
  }

  // change index of counter of slides
  counter(i) {
    if (!this.count) return false;

    if (i === 0 || typeof i === 'undefined') return false;

    let num = "";

    if (i < 10) num = 0;

    this.count.innerHTML = `${num}${i}`;
  }

  // touchpoints detection on touch screens
  touchscreenPoints(event) {
    const wrap = event?.target.closest(this.selector.wrapper),
          dots = this.getCurrentDot().dots;

    if (!dots.length && !wrap) return false;

    if (event.type === this.event.start) this.touchstart = event.changedTouches[0].screenX;

    if (event.type === this.event.end) {
      this.touchend = event.changedTouches[0].screenX;
      this.touchscreenDirection(wrap);
    }
  }

  touchscreenDirection(wrap) {
    const left = wrap?.scrollLeft,
          scroll = wrap?.scrollWidth,
          client = wrap?.clientWidth,
          next = wrap?.parentElement.querySelector(this.selector.next),
          prev = wrap?.parentElement.querySelector(this.selector.prev),
          isFade = wrap?.parentElement.classList.contains(this.classes.fade),
          leftSwipe = this.touchstart > this.touchend,
          rightSwipe = this.touchend > this.touchstart,
          dots = this.getCurrentDot().dots,
          index = this.getCurrentDot().index;

    if (!isFade) {
      if (left >= 0 && left <= scroll - client) {
        this.infinite = false;

        if (leftSwipe) this.trigger(next, this.event.click);
        if (rightSwipe) this.trigger(prev, this.event.click);

        this.infinite = true;
      }
    } else {
      if (leftSwipe && index < dots.length) this.pagination(undefined, index + 1);
      if (rightSwipe && index > 1) this.pagination(undefined, index - 1);
    }
  }

  // touchpad touchpoints detection
  touchpadPoints(event) {
    const wrap = event?.target.closest(this.selector.wrapper),
          dots = this.getCurrentDot().dots;

    if (!dots.length && !wrap) return false;

    let index = this.getCurrentDot().index;
    const delta = event.deltaX; // Get the scroll direction (+1 for scroll right, -1 for scroll left)

    if (!this.isWheeling) {
      this.isWheeling = true;

      if (delta === -1 && index > 1) index = index - 1;
      if (delta === 1 && index < dots.length) index = index + 1;

      this.pagination(undefined, index);
    }

    clearTimeout(this.wheelTimeout);

    this.wheelTimeout = setTimeout(() => this.isWheeling = false, 100);
  }

  // get the active dot index
  getCurrentDot() {
    let index = 1,
        dots = [...this.dots];

    dots = dots.filter(dot => !dot.classList.contains(this.modifiers.hidden));

    dots.forEach(dot => {
      if (dot.classList.contains(this.modifiers.active))
        index = parseInt(dot.getAttribute(this.data.index));
    })

    return { index, dots };
  }

  // add/change overlay class to change colors of navigation/pagination buttons of images carousel with overlay
  setOverlay(index) {
    const isEdge = this.block.classList.contains(this.classes.edges);

    if (!isEdge || !index || index > this.items.length) return false;

    const defaultColor = this.block.getAttribute(this.data.defaultColor);

    this.items.forEach((item, itemIndex) => {
      const overlayColor = item.getAttribute(this.data.overlayColor);

      if (itemIndex + 1 === index) {
        if (overlayColor) {
          this.setCssVar(this.cssVar.overlay, overlayColor);
          this.setCssVar(this.cssVar.overlay08, `${overlayColor}24`);
          this.setCssVar(this.cssVar.overlay45, `${overlayColor}73`);
        } else {
          this.setCssVar(this.cssVar.overlay, defaultColor);
          this.setCssVar(this.cssVar.overlay08, `${defaultColor}24`);
          this.setCssVar(this.cssVar.overlay45, `${defaultColor}73`);
        }
      }
    })
  }

  setCssVar(key, val) {
    this.block.parentElement.style.setProperty(
      `${key}`,
      `${val}`
    )
  }

  scrollTo(options) {
    const { element, left, top } = options;

    element.scrollTo({
      left: left,
      top: top,
      behavior: "smooth",
    })
  }

  trigger(element, eventType) {
    if (!element) return false;

    if (typeof eventType === 'string' && typeof element[eventType] === 'function') {
      element[eventType]();
    } else {
      const event =
        typeof eventType === 'string'
          ? new Event(eventType, {bubbles: true})
          : eventType
      element.dispatchEvent(event);
    }
  }

  getSiblingElement(element, selector, direction) {
    if (!element) return false;

    let sibling;

    switch (direction) {
      case this.event.prev:
        sibling = element.previousElementSibling;

        while (sibling) {
          if (sibling.matches(selector)) return sibling;
          sibling = sibling.previousElementSibling;
        }

        break;

      case this.event.next:
        sibling = element.nextElementSibling;

        while (sibling) {
          if (sibling.matches(selector)) return sibling;
          sibling = sibling.nextElementSibling;
        }

        break;
    }
  }

  listener(nodes, event, func) {
    nodes.forEach(node => {
      node.addEventListener(`${event}`, func.bind(this));
    })
  }
}

const initCarousel = (el = ".carousel") => {
  const nodes = document.querySelectorAll(el);

  if (!nodes.length) return false;

  nodes.forEach(node => {
    const carousel = new Carousel(node);
    carousel.init();
  })
}

document.addEventListener("readystatechange", (e) => {
  if (e.target.readyState === "complete") initCarousel();
})
