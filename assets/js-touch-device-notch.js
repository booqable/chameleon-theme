class TouchDevice {
  constructor(block) {
    this.block = block;

    this.modifier = {
      touch: "touch"
    }

    this.props = {
      portrait: "portrait",
      landscape: "landscape"
    }

    this.cssVars = {
      areaTop: "--safe-area-top",
      areaRight: "--safe-area-right",
      areaBottom: "--safe-area-bottom",
      areaLeft: "--safe-area-left"
    }

    this.data = {
      orientation: "data-orientation"
    }
  }

  init() {
    if (!this.block) return false;

    this.elements();
    this.events();
  }

  elements() {
    this.doc = document.documentElement;
  }

  events() {
    this.notchDetection();

    window.addEventListener("resize", this.notchDetection.bind(this));
  }

  isTouchDevice() {
    return (('ontouchstart' in window) ||
       (navigator.maxTouchPoints > 0) ||
       (navigator.msMaxTouchPoints > 0));
  }

  notchDetection() {
    const isTouch = this.isTouchDevice();

    if (!isTouch) return false;

    const styles = window.getComputedStyle(this.doc),
          paddingTop = parseInt(styles.getPropertyValue(this.cssVars.areaTop)),
          paddingRight = parseInt(styles.getPropertyValue(this.cssVars.areaRight)),
          paddingBottom = parseInt(styles.getPropertyValue(this.cssVars.areaBottom)),
          paddingLeft = parseInt(styles.getPropertyValue(this.cssVars.areaLeft)),
          paddings = [paddingTop, paddingRight, paddingBottom, paddingLeft],
          hasPositive = paddings.some(value => value > 0),
          screen = {
            width : window.innerWidth,
            height : window.innerHeight
          };

    this.doc.classList.add(this.modifier.touch);

    hasPositive && screen.width > screen.height
      ? this.doc.setAttribute(this.data.orientation, this.props.landscape)
      : this.doc.setAttribute(this.data.orientation, this.props.portrait)
  }
}

const touchDevice = new TouchDevice(document.querySelector('html'));

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "complete") touchDevice.init();
})
