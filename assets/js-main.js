class Main {
  constructor(block) {
    this.block = block;

    this.selector = {
      datePicker: "bq-date-picker",
      datePickerBlock: ".date-picker-instance"
    }

    this.modifier = {
      loaded: "loaded",
      resize: "resize-active"
    }

    this.cssVar = {
      datePickerHeight: '--date-picker-height',
      datePickerBlockHeight: '--date-picker-block-height'
    }

    this.time = 500;
    this.timer = undefined;
  }

  init() {
    if (!this.block) return false;

    this.elements();
    this.events();
  }

  elements() {
    this.datePicker = document.querySelector(this.selector.datePicker);
    this.datePickerBlock = document.querySelector(this.selector.datePickerBlock);
  }

  events() {
    this.setLoadedClass();
    setTimeout(() => this.getDatePickerHeight(), 1000);

    // Use ResizeObserver utility if available
    if (window.Utils && this.isFunc(window.Utils.createResizeObserver)) {
      // Handle resize for date picker height
      this.resizeObserverHeight = window.Utils.createResizeObserver(() => {
        this.getDatePickerHeight();
      }, {
        element: document.documentElement,
        debounceTime: 150
      })

      // Handle resize for adding resize class
      this.resizeObserverClass = window.Utils.createResizeObserver(() => {
        this.setResizeClass();
      }, {
        element: document.documentElement,
        debounceTime: 50
      })
    } else {
      // Fallback to window resize event
      this.heightResizeHandler = this.getDatePickerHeight.bind(this);
      this.classResizeHandler = this.setResizeClass.bind(this);

      LazyUtils.addEventListenerNode(window, 'resize', this.heightResizeHandler);
      LazyUtils.addEventListenerNode(window, 'resize', this.classResizeHandler);
    }
  }

  isFunc(obj) {
    return typeof obj === 'function';
  }

  getDatePickerHeight() {
    if (!this.datePicker) return false;

    const datePickerHeight = parseInt(this.datePicker?.getBoundingClientRect().height);
    const datePickerBlockHeight = parseInt(this.datePickerBlock?.getBoundingClientRect().height);

    if (datePickerHeight) this.setCssVar(this.cssVar.datePickerHeight, datePickerHeight);
    if (datePickerBlockHeight) this.setCssVar(this.cssVar.datePickerBlockHeight, datePickerBlockHeight);
  }

  setCssVar(key, val) {
    document.documentElement.style.setProperty(
      `${key}`,
      `${val}px`
    )
  }

  // adding class while resizing window
  setResizeClass() {
    this.block.classList.add(this.modifier.resize);
    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.block.classList.remove(this.modifier.resize);
    }, this.time);
  }

  // adding class after loading content
  setLoadedClass() {
    this.block.classList.add(this.modifier.loaded);
  }

  // Cleanup method to properly remove observers and event listeners
  destroy() {
    // Clean up ResizeObserver instances if they exist
    if (this.resizeObserverHeight && this.isFunc(this.resizeObserverHeight.cleanup)) {
      this.resizeObserverHeight.cleanup();
      this.resizeObserverHeight = null;
    }

    if (this.resizeObserverClass && this.isFunc(this.resizeObserverClass.cleanup)) {
      this.resizeObserverClass.cleanup();
      this.resizeObserverClass = null;
    }

    // Clean up window event listeners if fallback was used
    if (!window.Utils || !this.isFunc(window.Utils.createResizeObserver)) {
      if (this.heightResizeHandler) {
        LazyUtils.removeEventListenerNode(window, 'resize', this.heightResizeHandler);
        this.heightResizeHandler = null;
      }

      if (this.classResizeHandler) {
        LazyUtils.removeEventListenerNode(window, 'resize', this.classResizeHandler);
        this.classResizeHandler = null;
      }
    }

    // Clear any timers
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}

const main = new Main(document.querySelector('body'));

main.init();

// Handle cleanup on page unload or navigation if needed
const unloadHandler = () => {
  if (main) main.destroy();
}

LazyUtils.addEventListenerNode(window, 'unload', unloadHandler);
