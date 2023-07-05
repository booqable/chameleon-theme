class Carousel {
  constructor(block) {
    this.block = block;

    this.selector = {
      navi: ".carousel__navigation",
      pagination: ".carousel__pagination",
      btn: ".carousel__btn",
      dot: ".carousel__dot",
      wrapper: ".carousel__wrapper",
      item: ".carousel__item",
      timer: ".carousel__timer",
      count: ".carousel__count"
    }

    this.classes = {
      show: "show",
      full: "carousel__fluid",
      fade: "carousel__fade-effect",
      pause: "carousel__pause",
      dot: "carousel__dot",
      thumb: "carousel__thumb",
      thumbNav: "carousel__navigation-thumbs",
      prev: "prev",
      next: "next",
      init: "initialized"
    }

    this.modifiers = {
      active: "active",
      indent: "indent",
      hidden: "hidden",
      show: "show",
      hide: "hide"
    }

    this.data = {
      index: "data-index",
      prev: "prev",
      next: "next"
    };

    this.tablet = 992;
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
    this.interval;
    this.index;
    this.start = 0;
    this.end = 0;
    this.touchstart = 0;
    this.touchend = 0;
  }

  events(e) {
    this.carouselInit();
    this.startTimer(e);
    this.pauseAutoRotate();
    this.controls();
    this.hidePaginationDots();

    this.listener(this.dots, 'click', this.pagination);
    this.listener(this.dots, 'click', this.navigation);
    this.listener(this.btns, 'click', this.navigation);
    document.addEventListener('wheel', this.touchpadScroll.bind(this));
    document.addEventListener('touchstart', this.touchEvent.bind(this));
    document.addEventListener('touchend', this.touchEvent.bind(this));
    window.addEventListener('resize', this.hidePaginationDots.bind(this));
    window.addEventListener('resize', this.controls.bind(this));
  }

  listener(arr, event, func) {
    arr.forEach(el => {
      el.addEventListener(`${event}`, func.bind(this));
    })
  }

  debounce(callback, time = 500) {
    let timer = null;

    return (...args) => {
      window.clearTimeout(timer);

      timer = window.setTimeout(() => callback.apply(null, args), time);
    };
  }

  startTimer(e) {
    this.timers.forEach(timer => {
      const time = timer.value * 1000;

      this.autoRotate(e, time);
    })
  }

  carouselInit() {
    if (this.items.length < 2) return false;

    this.block.classList.add(this.classes.init);
  }

  getPrevSibling(element, selector) {
    if (element) {
      let sibling = element.previousElementSibling;

      while (sibling) {
        if (sibling.matches(selector)) return sibling;
        sibling = sibling.previousElementSibling;
      }
    }
  };

  // change slides in Fade effect mode
  fadeClass(value) {
    const isEl = this.block.classList.contains(this.classes.fade);

    if (!isEl) return false;
    if (typeof value === 'undefined') return false;

    this.items.forEach((el, i) => {
      el.classList.replace(this.modifiers.show, this.modifiers.hide);
      if (i + 1 === value) el.classList.replace(this.modifiers.hide, this.modifiers.show);
    })
  }

  // autorotate slides of carousel
  autoRotate(e, time) {
    if (!time) return false;

    this.interval = setInterval(() => {
      this.navigation(e, time);
    }, time);

    return () => {
      clearInterval(this.interval);
    }
  }

  // pause autorotate slides on hover and touch devices
  pauseAutoRotate() {
    const isEl = this.block.classList.contains(this.classes.pause);

    if (!isEl) return false;
    if (!this.items.length) return false;

    const func = e => {
      if(e.type === "mouseenter" || e.type === "touchstart") clearInterval(this.interval);
      if(e.type === "mouseleave" || e.type === "touchend") this.startTimer(e);
    }

    this.block.addEventListener('mouseenter', func);
    this.block.addEventListener('mouseleave', func);
    this.block.addEventListener('touchstart', func);
    this.block.addEventListener('touchend', func);
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

  // change active dot of the pagination
  pagination(e, i) {
    const target = e?.target,
          isEl = target?.classList.contains(this.classes.dot);

    if (!isEl && typeof i === 'undefined') return false;

    this.dots.forEach(el => {
      const value = parseInt(el.getAttribute(this.data.index));

      el.classList.remove(this.modifiers.active);

      if (isEl) target.classList.add(this.modifiers.active);
      if (value === i) el.classList.add(this.modifiers.active);
      if (typeof i === 'undefined') i = parseInt(target.getAttribute(this.data.index));
    })

    this.counter(e, i);
    this.fadeClass(i);
  }

  // slide the carousel left/right and change the index of the active dot of the pagination
  navigation(e, time) {
    const target = e?.target,
          isPrev = target?.classList.contains(this.classes.prev),
          isNext = target?.classList.contains(this.classes.next),
          isDot = target?.classList.contains(this.classes.dot);

    if (!isPrev && !isNext && !isDot && !time && time === 0) return false;

    const isFade = this.block.classList.contains(this.classes.fade),
          fullWidth = this.block.classList.contains(this.classes.full),
          isThumb = target?.classList.contains(this.classes.thumb),
          isThumbs = target?.parentElement.classList.contains(this.classes.thumbNav),
          index = parseInt(target?.getAttribute(this.data.index)),
          prev = this.data.prev,
          next = this.data.next;

    let parent, element, left, top, scrollX, scrollY, clientX, clientY, children;

    let width = this.item.getBoundingClientRect().width,
        height = this.item.getBoundingClientRect().height,
        valueLeft = 0,
        valueTop = 0;

    if (isDot || isPrev || isNext) {
      if (isThumb) {
        parent = target?.closest(this.selector.pagination);

        const item = this.getPrevSibling(parent, this.selector.wrapper).querySelector(this.selector.item);
        width = item.getBoundingClientRect().width;

      } else {
        parent = target?.parentElement
      }

      element = this.getPrevSibling(parent, this.selector.wrapper);
    } else {
      element = this.wrap;
    }

    top = element.scrollTop;
    left = element.scrollLeft;
    scrollX = element.scrollWidth;
    scrollY = element.scrollHeight;
    clientX = element.clientWidth;
    clientY = element.clientHeight;
    children = [...element.children];

    if (isPrev) {
      if (!isFade) {
        if (scrollY > scrollX) {
          const options = {
            unit: top,
            clientVal: clientY,
            scrollVal: scrollY,
            scrollToVal: valueTop,
            size: height,
            button: prev,
            thumbsNav: isThumbs
          }

          valueTop = this.slideEfect(e, options);

        } else {
          const options = {
            unit: left,
            clientVal: clientX,
            scrollVal: scrollX,
            scrollToVal: valueLeft,
            size: width,
            button: prev,
            thumbsNav: isThumbs,
            fullWidth: fullWidth
          }

          valueLeft = this.slideEfect(e, options);

        }

      } else {
        const options = {
          arr: children,
          equal: 0,
          last: this.items.length
        }

        this.fadeEffect(e, options);
      }
    }

    if (isNext || time && time !== 0) {
      if (!isFade) {
        if (scrollY > scrollX) {
          const options = {
            unit: top,
            clientVal: clientY,
            scrollVal: scrollY,
            scrollToVal: valueTop,
            size: height,
            button: next,
            thumbsNav: isThumbs
          }

          valueTop = this.slideEfect(e, options);

        } else {
          const options = {
            unit: left,
            clientVal: clientX,
            scrollVal: scrollX,
            scrollToVal: valueLeft,
            size: width,
            button: next,
            thumbsNav: isThumbs
          }

          valueLeft = this.slideEfect(e, options);

        }

      } else {
        const options = {
          arr: children,
          equal: this.items.length,
          last: 1,
          nextNumber: 1,
          nextIndex: 2
        }

        this.fadeEffect(e, options);
      }
    }

    if (isDot && !isFade) valueLeft = width * (index - 1);

    if (!isFade) {
      const options = {
        el: element,
        left: valueLeft,
        top: valueTop,
        behavior: "smooth"
      }

      this.scrollTo(options);
    }
  }

  // logic of Carousel's Prev and Next buttons (including vertical carousel)
  slideEfect(e, options) {
    const {unit, scrollVal, clientVal, size, button, thumbsNav, fullWidth} = options;
    let i, condition, lastIndex, nextIndex, scrollToLast, scrollToNext, scrollToVal;

    switch (button) {
      case this.data.prev:
        condition = unit === 0;
        lastIndex = Math.ceil((scrollVal - clientVal) / size + 1);
        nextIndex = Math.ceil(unit / size);
        scrollToLast = scrollVal;
        scrollToNext = unit - size;

        break;

      case this.data.next:
        condition = unit >= scrollVal - clientVal - 16;
        lastIndex = 1;
        nextIndex = parseInt(unit / size + 2);
        scrollToLast = 0;
        scrollToNext = unit + size;

        break;
    }

    if (condition) {
      i = lastIndex;
      if (fullWidth && clientVal < this.tablet) i -= 1;
      scrollToVal = scrollToLast;
    } else {
      i = nextIndex;
      scrollToVal = scrollToNext;
    }

    if (!thumbsNav) {
      this.pagination(e, i);
    }

    return scrollToVal
  }

  // search new index for active slide on Fade carousel mode
  fadeEffect(e, options) {
    const {arr, equal, last, nextNumber, nextIndex} = options;
    let i;

    arr.forEach((el, index) => {
      if (el.classList.contains(this.classes.show)) {
        const condition = index + (nextNumber ?? 0);
        const next = index + (nextIndex ?? 0);

        condition === equal ? i = last : i = next
      }
    })

    this.pagination(e, i);
    this.fadeClass(i);
  }

  // change index of counter of slides
  counter(e, i) {
    if (!this.count) return false;

    if (i === 0 || typeof i === 'undefined') return false;

    let num = "";

    if (i < 10) num = 0;

    this.count.innerHTML = `${num}${i}`;
  }

  scrollTo(options) {
    const {el, left, top, behavior} = options;

    el.scrollTo({
      left: left,
      top: top,
      behavior: behavior,
    });
  }

  controls() {
    if (!this.navi && !this.pagi) return false;

    const clientX = this.wrap.clientWidth,
          scrollX = this.wrap.scrollWidth,
          clientY = this.wrap.clientHeight,
          scrollY = this.wrap.scrollHeight;

    if (clientX === scrollX && clientY === scrollY) {
      this.navi?.classList.add(this.modifiers.hidden);
      this.pagi?.classList.add(this.modifiers.hidden);
      if (this.navi?.classList.contains(this.classes.thumbNav)) {
        this.navi?.parentElement.classList.remove(this.modifiers.indent);
      }
    } else {
      this.navi?.classList.remove(this.modifiers.hidden);
      this.pagi?.classList.remove(this.modifiers.hidden);
      if (this.navi?.classList.contains(this.classes.thumbNav)) {
        this.navi?.parentElement.classList.add(this.modifiers.indent);
      }
    }
  }

  touchEvent(e) {
    const target = e?.target.closest(this.selector.wrapper);

    if (!target) return false;

    const width = this.item.getBoundingClientRect().width,
          left = this.wrap.scrollLeft,
          client = this.wrap.clientWidth,
          isFade = this.block.classList.contains(this.classes.fade),
          fullWidth = this.block.classList.contains(this.classes.full);



    switch (e.type) {
      case "touchstart":
        this.touchstart = e.changedTouches[0].screenX;
        this.start = left

        break;

      case "touchend":
        this.touchend = e.changedTouches[0].screenX;
        this.end = left

        this.handleGesture();
        break;
    }

    // let startX, startY, x;

    // switch (e.type) {
    //   case "touchstart":
    //     (() => {
    //       return startX = e?.changedTouches[0].screenX;
    //     })()
    //     console.log(startX);

    //     break;

    //   case "touchend":
    //     const diffX = e?.changedTouches[0].screenX - startX;

    //     // Ignore small movements.
    //     // if (absDiff < 30) {
    //     //   return;
    //     // }
    //     console.log(startX);

    //     // if (ratioX > ratioY) {

    //     // } else {
    //     //   if (diffY >= 0) {
    //     //     console.log('down swipe');
    //     //   } else {
    //     //     console.log('up swipe');
    //     //   }
    //     // }
    //     break;

    // }

    // if (diffX >= 0) {
    //   console.log('right swipe');
    // } else {
    //   console.log('left swipe');
    // }




    // let start, end, , x

    // switch (e.type) {
    //   case "touchstart":
    //     start = e?.changedTouches[0].screenX;
    //     break;

    //   case "touchend":
    //     end = e?.changedTouches[0].screenX;
    //     break;

    // }

    // if (start) {

    //   console.log(start);
    // }

    // if (end) {
    //   console.log(end);
    // }

    // if (start > end) {
    //   x = "left"
    //   console.log(start);
    //   console.log(end);
    // } else {
    //   x = "right"
    // }


    // return x;
  }

  handleGesture() {
    let index = this.getCurrentDot().index,
        dots = this.getCurrentDot().dots,
        left = this.wrap.scrollLeft,
        width = this.item.getBoundingClientRect().width,
        leftMove = this.touchend < this.touchstart,
        rightMove = this.touchend > this.touchstart,
        tap = this.touchend === this.touchstart,
        leftIndex = this.end - this.start > 0,
        rightIndex = this.start - this.end > 0;

    if (leftMove && leftIndex) {
      // index === dots.length ? index = dots.length : index = index + 1
      // console.log(this.end - this.start);
      // console.log(this.touchend);
      this.index = Math.ceil(left / width) + 1;
      console.log('Swiped left');
      const options = {
        el: this.wrap,
        left: this.end,
        behavior: "instant"
      }

      this.scrollTo(options);
    }

    if (rightMove && rightIndex) {
      // index === 1 ? index = 1 : index = index - 1

      this.index = Math.ceil(left / width);

      // console.log(this.start - this.end);
      // console.log(this.touchstart);
      // console.log(this.touchend);
      console.log('Swiped right');
      const options = {
        el: this.wrap,
        left: this.start,
        behavior: "instant"
      }

      this.scrollTo(options);
    }

    if (tap) {
       console.log('Tap');
    }

    this.pagination(undefined, this.index);
  }

  touchpadScroll(e) {
    const target = e?.target.closest(this.selector.wrapper),
          dots = this.getCurrentDot().dots;

    let index = this.getCurrentDot().index;

    if (!dots.length && !target && !index) return false;

    // if (e.type == "wheel") {
    //   console.log("wheel");
    // } else {
    //   if (e.type == "touchstart" || e.type == "touchend") {

    //     console.log(e.changedTouches[0].screenX);
    //   }
    // }


    // console.log(e.target);

    // const processChanges = this.debounce(() => {
      const delta = e.deltaX; // Get the scroll direction (+1 for scroll right, -1 for scroll left)
      //       currentIndex = this.getCurrentDot().index;

      if (delta < 0) {
        console.log("left");
      } else if (delta > 0) {
        console.log("right");
      }

      const width = this.item.getBoundingClientRect().width,
            left = this.wrap.scrollLeft,
            client = this.wrap.clientWidth,
            isFade = this.block.classList.contains(this.classes.fade),
            fullWidth = this.block.classList.contains(this.classes.full);

      // let index;

      if (!isFade) {
        index = Math.ceil(left / width) + 1;

        // if (fullWidth && client < this.tablet) {
          // if (index !== 1) index -= 1;
        // }
      } else {

      }

      // if (reminder == 0) {
      //   console.log("0");
      // } else {
      //   console.log(reminder);
      //   console.log(width)
      //   console.log(left)
      //   console.log(Math.ceil(index))
      // }

      // if (delta === 1) {
      //   // Scrolled right
      //   currentIndex >= this.getCurrentDot().dots.length
      //     ? nextIndex = currentIndex
      //     : nextIndex = currentIndex + 1

      //   // nextIndex = currentIndex + 1
      // } else if (delta === -1) {
      //   // Scrolled left
      //   console.log(delta);

      //   currentIndex <= 1
      //   ? nextIndex = currentIndex
      //   : nextIndex = currentIndex - 1
      // }

      // this.pagination(undefined, index);

    // });
    // processChanges();

  }

  // get the current active dot index
  getCurrentDot() {
    let index = 1,
        dots = [...this.dots];

    dots = dots.filter(dot => {
      return !dot.classList.contains(this.modifiers.hidden);
    })

    dots.forEach(dot => {
      if (dot.classList.contains(this.modifiers.active))
        index = parseInt(dot.getAttribute(this.data.index));
    })

    return {index, dots};
  }
}

const initCarousel = (el = ".carousel") => {
  const nodes = document.querySelectorAll(el);

  if (!nodes.length) return false;

  nodes.forEach(node => {
    const carousel = new Carousel(node);
    carousel.init();
  });
};

document.addEventListener("readystatechange", (e) => {
  if (e.target.readyState === "complete") initCarousel();
});
