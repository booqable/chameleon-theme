class Header {
  constructor(block) {
    this.block = block;

    this.selector = {
      body: "body",
      bar: ".top-bar",
      view: ".preview-bar__container",
      search: ".header__search",
      searchOpener: "#header-search-opener"
    }

    this.classes = {
      sticky: "header--sticky",
      notSticky: "header--not-sticky"
    }

    this.modifier = {
      scroll: "scrolled-down"
    }

    this.cssVar = {
      height: '--header-height',
      barHeight: '--top-bar-height',
      viewHeight: '--preview-height',
      transform: '--header-transform'
    }


    this.minHeight = 180;
    this.last = 0;
  }

  init() {
    if (!this.block) return false;

    this.elements();
    this.events();
  }

  elements() {
    this.doc = document.documentElement;
    this.body = document.querySelector(this.selector.body);
    this.preview = document.querySelector(this.selector.view);
    this.bar = this.block.querySelector(this.selector.bar);
    this.sticky = this.block.classList.contains(this.classes.sticky);
    this.notSticky = this.block.classList.contains(this.classes.notSticky);
  }

  events() {
    this.headerHeight();
    document.addEventListener("click", this.closeModals.bind(this));
    window.addEventListener("scroll", this.scrollProps.bind(this));
    window.addEventListener("resize", this.headerHeight.bind(this));
  }

  // getting height of header and set css variables
  headerHeight() {
    let height = this.block.getBoundingClientRect().height,
        barHeight = 0,
        viewHeight = 0;

    if (this.bar) {
      barHeight = this.bar.getBoundingClientRect().height;
      this.setCssVar(this.cssVar.barHeight, Math.floor(barHeight));
    }

    if (this.preview) {
      viewHeight = this.preview.getBoundingClientRect().height;

      if (this.sticky) height += viewHeight;

      this.setCssVar(this.cssVar.viewHeight, Math.floor(viewHeight));
    }

    this.setCssVar(this.cssVar.height, Math.floor(height));
  }

  // setting properties when scroll page
  scrollProps() {
    if (!this.bar) return false;

    let isScroll = this.body.classList.contains(this.modifier.scroll),
        current = window.scrollY,
        height = this.bar.getBoundingClientRect().height;

    if (current <= this.minHeight) {
      this.body.classList.remove(this.modifier.scroll);
      this.setCssVar(this.cssVar.transform, 0);

      return;
    }

    if (current > this.last && !isScroll) { // down
      this.body.classList.add(this.modifier.scroll);
      this.setCssVar(this.cssVar.transform, -height);
    } else if (current < this.last - 10 && isScroll) { // up
      this.body.classList.remove(this.modifier.scroll);
      this.setCssVar(this.cssVar.transform, 0);
    }

    this.last = current;
  }


  // close search when clicking inside header
  closeModals(e) {
    const searchOpener = document.querySelector(this.selector.searchOpener);
    if (!searchOpener || !searchOpener.checked) return false;

    // Check if click is not on search elements
    const isSearch = e.target.closest(this.selector.search) ||
                     e.target.closest(this.selector.searchOpener) ||
                     e.target === searchOpener;

    if (isSearch) return false;

    if ($.HeaderComponents && $.HeaderComponents.api) {
      $.HeaderComponents.api.closeSearch();
    }
  }

  // Legacy methods for compatibility with menu component
  removeOverflow () {
    if ($.MegaMenu && $.MegaMenu.renderer) {
      $.MegaMenu.renderer.disableScrollPrevention()
    }
  }

  closeMobileDrop() {
    if ($.MegaMenu && $.MegaMenu.renderer) {
      $.MegaMenu.renderer.closeDropdowns()
    }
  }


  setCssVar(key, val) {
    this.doc.style.setProperty(
      `${key}`,
      `${val}px`
    )
  }
}

const stickyHeader = new Header(document.querySelector('.header'));

$.stickyHeader = stickyHeader;
window.stickyHeader = stickyHeader;

document.addEventListener("readystatechange", (e) => {
  if (e.target.readyState === "complete") stickyHeader.init();
})
