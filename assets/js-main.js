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

    // Use requestIdleCallback for non-critical operations if available
    'requestIdleCallback' in window
      ? requestIdleCallback(() => this.getDatePickerHeight(), { timeout: 2000 })
      : setTimeout(() => this.getDatePickerHeight(), 1000)

    window.addEventListener("resize", this.getDatePickerHeight.bind(this), { passive: true });
    window.addEventListener("resize", this.setResizeClass.bind(this), { passive: true });
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
}

const main = new Main(document.querySelector('body'));

main.init();
