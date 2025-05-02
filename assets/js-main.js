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
    if (this.isFunc($.resizeObserver)) {
      // Handle resize for date picker height
      this.resizeObserverHeight = $.resizeObserver(() => {
        this.getDatePickerHeight();
      }, {
        element: document.documentElement,
        debounceTime: 150
      })

      // Handle resize for adding resize class
      this.resizeObserverClass = $.resizeObserver(() => {
        this.setResizeClass();
      }, {
        element: document.documentElement,
        debounceTime: 50
      })
    } else {
      // Fallback to window resize event
      this.heightResizeHandler = this.getDatePickerHeight.bind(this);
      this.classResizeHandler = this.setResizeClass.bind(this);

      $.eventListener('add', window, 'resize', this.heightResizeHandler);
      $.eventListener('add', window, 'resize', this.classResizeHandler);
    }
  }

  isFunc(obj) {
    return $.is(obj, 'function');
  }

  getDatePickerHeight() {
    if (!this.datePicker) return false;

    // Use frameSequence utility to prevent layout thrashing
    $.frameSequence(
      // Read phase: measure dimensions
      () => {
        return {
          datePickerHeight: parseInt(this.datePicker?.getBoundingClientRect().height),
          datePickerBlockHeight: parseInt(this.datePickerBlock?.getBoundingClientRect().height)
        };
      },
      // Write phase: update CSS variables
      (dimensions) => {
        if (dimensions.datePickerHeight) {
          this.setCssVar(this.cssVar.datePickerHeight, dimensions.datePickerHeight);
        }
        if (dimensions.datePickerBlockHeight) {
          this.setCssVar(this.cssVar.datePickerBlockHeight, dimensions.datePickerBlockHeight);
        }
      }
    );
  }

  setCssVar(key, val) {
    document.documentElement.style.setProperty(
      `${key}`,
      `${val}px`
    )
  }

  // adding class while resizing window
  setResizeClass() {
    // Use utility for smoother class transitions
    $.nextFrame(() => {
      this.block.classList.add(this.modifier.resize);
      clearTimeout(this.timer);

      this.timer = setTimeout(() => {
        $.nextFrame(() => {
          this.block.classList.remove(this.modifier.resize);
        });
      }, this.time);
    });
  }

  // adding class after loading content
  setLoadedClass() {
    // Use utility for smoother class application
    $.nextFrame(() => {
      this.block.classList.add(this.modifier.loaded);
    });
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
    if (!$ || !this.isFunc($.resizeObserver)) {
      if (this.heightResizeHandler) {
        $.eventListener('remove', window, 'resize', this.heightResizeHandler);
        this.heightResizeHandler = null;
      }

      if (this.classResizeHandler) {
        $.eventListener('remove', window, 'resize', this.classResizeHandler);
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

// Use beforeunload event instead of deprecated unload event
// Create a global cleanup function that can be called manually during navigation
window.cleanupMain = () => {
  if (main) main.destroy();
};

// Add the event listener only if the browser doesn't support the Navigation API
if (!('navigation' in window)) {
  $.eventListener('add', window, 'beforeunload', window.cleanupMain);
}
