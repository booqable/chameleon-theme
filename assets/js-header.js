class Header {
  constructor(block) {
    this.block = block;

    this.selector = {
      body: "body",
      bar: ".top-bar",
      view: ".preview-bar__container",
      headerNav: ".header__nav-wrapper",
      menu: ".menu",
      menuItem: ".menu__list",
      menuDrop: ".has-dropdown",
      menuBottom: ".header-menu-bottom",
      menuOpener: "#mobile-menu-opener",
      search: ".header__search",
      searchOpener: "#header-search-opener",
      checkbox: "input[type=checkbox]"
    }

    this.classes = {
      sticky: "header--sticky",
      notSticky: "header--not-sticky",
      opened: "header--menu-opened",
    }

    this.modifier = {
      scroll: "scrolled-down",
      overflow: "overflow-hidden",
      active: "active"
    }

    this.cssVar = {
      height: '--header-height',
      barHeight: '--top-bar-height',
      viewHeight: '--preview-height',
      linkHeight: '--menu-position',
      transform: '--header-transform'
    }

    this.event = {
      mouseenter: 'mouseenter',
      mouseleave: 'mouseleave'
    }

    this.attr = {
      style: "style",
      action: "action"
    }

    this.minHeight = 180;
    this.mediaQuery = 1100;
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
    this.menu = this.block.querySelector(this.selector.menu);
    this.menuBottom = this.block.querySelector(this.selector.menuBottom);
    this.menuItem = this.menu?.querySelector(this.selector.menuItem);
    this.menuDrops = this.block.querySelectorAll(this.selector.menuDrop);
    this.menuOpener = this.block.querySelector(this.selector.menuOpener);
    this.checkboxes = this.menu?.querySelectorAll(this.selector.checkbox);
    this.sticky = this.block.classList.contains(this.classes.sticky);
    this.notSticky = this.block.classList.contains(this.classes.notSticky);
  }

  events() {
    this.headerHeight();
    this.menuPosition();
    this.hoverClose();
    document.addEventListener("click", this.menuOverflow.bind(this));
    document.addEventListener("click", this.closeModals.bind(this));
    window.addEventListener("scroll", this.scrollProps.bind(this));
    window.addEventListener("resize", this.headerHeight.bind(this));
    window.addEventListener("resize", this.menuPosition.bind(this));
    window.addEventListener("resize", this.closeMenuResize.bind(this));
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

  // add css variable when desktop menu is in bottom mode for menu positioning
  menuPosition() {
    if (!this.menuBottom) return false;

    const height = this.menuItem?.getBoundingClientRect().height;

    if (height) this.setCssVar(this.cssVar.linkHeight, height);
  }

  // adding overflow:hidden when menu opened while header is not sticky on mobile
  menuOverflow(e) {
    const target = e?.target.previousElementSibling;

    if (!target || target !== this.menuOpener) return false;

    if (!this.menuOpener.checked) {
      const searchOpener = document.querySelector(this.selector.searchOpener);
      if (searchOpener && searchOpener.checked) {
        searchOpener.checked = false;
      }
    }

    this.menuOpener && this.menuOpener.checked ? this.closeMenu() : this.addOverflow()
  }

  closeMenu() {
    this.removeOverflow();
    this.closeMobileDrop();
  }

  closeMenuResize() {
    if (window.innerWidth >= this.mediaQuery) {
      this.closeMenu();

      if (this.menuOpener) this.menuOpener.checked = false;
    }
  }

  // closing all dropdowns when mobile menu closed
  closeMobileDrop() {
    if (!this.checkboxes?.length) return false;

    this.checkboxes.forEach(checkbox => checkbox.checked = false);
  }

  // close search when clicking inside header
  closeModals(e) {
    const searchOpener = document.querySelector(this.selector.searchOpener);
    if (!searchOpener && !searchOpener.checked) return false;

    // Check if click is not on search elements
    const isSearch = e.target.closest(this.selector.search) ||
                     e.target.closest(this.selector.searchOpener) ||
                     e.target === searchOpener;

    if (isSearch) return false;
    searchOpener.checked = false;
  }

  // closing modal windows of header on hover and add class on menu items on desktop
  hoverClose() {
    if (!this.menuDrops.length) return false;

    const event = e => {
      const target = e.target,
            type = e.type,
            time = 500;

      switch (type) {
        case this.event.mouseenter:
          this.closeOtherModals();
          target.classList.add(this.modifier.active);

          break;

        case this.event.mouseleave:
          setTimeout(() => {
            target.classList.remove(this.modifier.active);
          }, time);

          break;
      }
    };

    this.menuDrops.forEach((item) => {
      item.addEventListener(this.event.mouseenter, event);
      item.addEventListener(this.event.mouseleave, event);
    });
  }

  // Close search when hovering menu items on desktop only
  closeOtherModals() {
    if (window.innerWidth < this.mediaQuery) return false;

    const searchOpener = document.querySelector(this.selector.searchOpener);
    if (!searchOpener && !searchOpener.checked) return false;
    searchOpener.checked = false;
  }


  addOverflow() {
    this.doc.classList.add(this.modifier.overflow);

    if (!this.notSticky) return false;

    this.block.classList.add(this.classes.opened);
    this.block.style.position = this.props.fixed;
  }

  removeOverflow() {
    this.doc.classList.remove(this.modifier.overflow);

    if (!this.notSticky) return false;

    this.block.classList.remove(this.classes.opened);
    window.scrollTo(0, 0);
    this.block.removeAttribute(this.attr.style);
  }


  setCssVar(key, val) {
    this.doc.style.setProperty(
      `${key}`,
      `${val}px`
    )
  }
}

const stickyHeader = new Header(document.querySelector('.header'));

// Make header instance globally accessible for modal manager
window.stickyHeader = stickyHeader;

document.addEventListener("readystatechange", (e) => {
  if (e.target.readyState === "complete") stickyHeader.init();
})
