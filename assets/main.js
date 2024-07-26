class Main {
  constructor(block) {
    this.block = block;

    this.selector = {
      datePicker: "bq-date-picker",
      datePickerBlock: ".date-picker-instance",
      image: ".focal-image",
      excerpt: ".product-card__description"
    }

    this.modifier = {
      loaded: "loaded",
      resize: "resize-active",
      truncated: "truncated"
    }

    this.data = {
      focalX: "data-focal-x",
      focalY: "data-focal-y"
    }

    this.cssVar = {
      datePickerHeight: '--date-picker-height',
      datePickerBlockHeight: '--date-picker-block-height'
    }

    this.cssProp = {
      maxHeight: 'max-height',
      paddingTop: 'padding-top',
      paddingBottom: 'padding-bottom'
    }

    this.time = 500;
    this.timer = undefined;
    this.focalImageTimeout;
  }

  init() {
    if (!this.block) return false;

    this.elements();
    this.events();
  }

  elements() {
    this.datePicker = document.querySelector(this.selector.datePicker);
    this.datePickerBlock = document.querySelector(this.selector.datePickerBlock);
    this.excerpts = document.querySelectorAll(this.selector.excerpt);
  }

  events() {
    this.setLoadedClass();
    this.focalImages();
    this.setTruncationClass();
    setTimeout(() => this.getDatePickerHeight(), 1000);

    window.addEventListener("resize", this.getDatePickerHeight.bind(this));
    window.addEventListener("resize", this.setResizeClass.bind(this));
    window.addEventListener("resize", this.setTruncationClass.bind(this));
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

  // set class for truncation product card description
  setTruncationClass() {
    if (!this.excerpts.length) return false;

    const styles = window.getComputedStyle(this.excerpts[0]),
          paddingTop = parseInt(styles.getPropertyValue(this.cssProp.paddingTop)),
          paddingBottom = parseInt(styles.getPropertyValue(this.cssProp.paddingBottom)),
          maxHeight = parseInt(styles.getPropertyValue(this.cssProp.maxHeight)),
          minHeight = maxHeight / 2 + paddingBottom + paddingTop;

    this.excerpts.forEach(excerpt => {
      const height = excerpt.getBoundingClientRect().height

      height > minHeight
        ? excerpt.classList.add(this.modifier.truncated)
        : excerpt.classList.remove(this.modifier.truncated)
    })
  }

  // change focus positioning of image
  focalImages() {
    if (!window.imageFocus) {
      if (this.focalImageTimeout) clearTimeout(this.focalImageTimeout);

      this.focalImageTimeout = setTimeout(() => initFocalImages(), 10);

      return;
    }

    clearTimeout(this.focalImageTimeout);

    const images = document.querySelectorAll(this.selector.image);

    images.forEach(image => {
      const x = image.getAttribute(this.data.focalX),
            y = image.getAttribute(this.data.focalY);

      new window.imageFocus(image, {
        focus: {
          x: parseFloat(x) || 0,
          y: parseFloat(y) || 0,
        }
      });

      image.style.opacity = 1;
    })
  }
}

const main = new Main(document.querySelector('body'));

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "complete") main.init();
})
