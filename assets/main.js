class Main {
  constructor(container) {
    this.container = container;

    this.selector = {
      datePicker: ".date-picker__component",
      datePickerParent: ".images__datepicker",
      footer: "footer",
      search: "#search",
      image: ".focal-image",
      focus: "[data-focus]"
    };

    this.modifier = {
      loaded: "loaded",
      resize: "resize-active"
    };

    this.params = {
      out: "out",
      true: "true",
      block: "block",
      footer: "footer",
      type: "message",
      section: "section"
    };

    this.props = {
      behavior: "smooth",
      block: "center"
    };

    this.data = {
      focalX: "data-focal-x",
      focalY: "data-focal-y",
      focus: "data-focus"
    };

    this.cssVar = {
      height: '--datepicker-height',
      parentHeight: '--datepicker-block-height',
    };

    this.time = 500;
    this.timeScroll = 300;
    this.timer = undefined;
    this.focalImageTimeout;
  }

  init() {
    if (!this.container) return false;

    this.elements();
    this.events();
  }

  elements() {
    this.footer = document.querySelector(this.selector.footer);
    this.search = document.querySelector(this.selector.search);
    this.datePicker = document.querySelector(this.selector.datePicker);
    this.datePickerParent = document.querySelector(this.selector.datePickerParent);
  }

  events() {
    this.setLoadedClass();
    this.focalImages();

    setTimeout(() => this.datepickerHeight(), 100);

    window.addEventListener("resize", this.datepickerHeight.bind(this));
    window.addEventListener("resize", this.setResizeClass.bind(this));
    window.addEventListener("message", this.messagesListener.bind(this));
  }

  datepickerHeight() {
    if (!this.datePicker) return false;

    const height = parseInt(this.datePicker.getBoundingClientRect().height);
    const parentHeight = parseInt(this.datePickerParent.getBoundingClientRect().height);

    this.setCssVar(this.cssVar.height, height)
    this.setCssVar(this.cssVar.parentHeight, parentHeight)
  }

  setCssVar(key, val) {
    document.documentElement.style.setProperty(
      `${key}`,
      `${val}px`
    );
  }

  // adding class while resizing window
  setResizeClass() {
    this.container.classList.add(this.modifier.resize);
    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.container.classList.remove(this.modifier.resize);
    }, this.time);
  }

  // adding class after loading content
  setLoadedClass() {
    this.container.classList.add(this.modifier.loaded);
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
        },
      });

      image.style.opacity = 1;
    });
  };

  // scroll page to the focused element on the sidebar in the theme editor
  scrollToFocus(target) {
    target?.setAttribute(this.data.focus, this.params.true);

    setTimeout(() => {
      target?.scrollIntoView({ behavior: this.props.behavior, block: this.props.block });
    }, this.timeScroll);
  };

  // remove focus from element in the theme editor
  removeFocus() {
    const focuses = document.querySelectorAll(this.selector.focus);

    focuses?.forEach((node) => node.removeAttribute(this.data.focus));
  };

  messagesListener({ type, data, isTrusted }) {
    if (type !== this.params.type) return false;

    if (!!data && isTrusted) {
      this.removeFocus();

      let target;

      switch (data.type) {
        case this.params.out:
          this.removeFocus();
          break;

        case this.params.section:
          target = document.querySelector(`#${this.params.section}-${data.id}`);

          this.scrollToFocus(target);
          break;

        case this.params.block:
          target = document.querySelector(`#${this.params.section}-${data.sectionId} #${data.id}`);

          this.scrollToFocus(target);
          break;

        case this.params.footer:
          target = this.footer;

          this.scrollToFocus(target);
          break;
      }
    }
  };
}

const main = new Main(document.querySelector('body'));

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "complete") main.init();
});
