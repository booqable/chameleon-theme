/**
 * Header Menu Component
 *
 * Handles mobile menu functionality, dropdown management, overflow control,
 * and menu positioning. Works with checkbox-based menu state management.
 *
 * @requires js-utils-core.js
 */

const MegaMenuConfig = {
  selector: {
    body: 'body',
    header: '.header',
    menu: '.menu',
    menuDrop: '.has-dropdown',
    menuOpener: '#mobile-menu-opener',
    searchOpener: '#header-search-opener',
    checkbox: 'input[type=checkbox]'
  },
  classes: {
    opened: 'header--menu-opened',
    sticky: 'header--sticky',
    active: 'active'
  },
  modifier: {
    bodyLocked: 'body--scroll-locked',
    overflow: 'overflow-hidden'
  },
  event: {
    mouseenter: 'mouseenter',
    mouseleave: 'mouseleave'
  },
  attr: {
    style: 'style'
  },
  mediaQuery: 1100,
  hoverTimeout: 500
}

const MegaMenuDOM = {
  elements: {
    doc: null,
    body: null,
    header: null,
    menu: null,
    menuDrops: null,
    menuOpener: null,
    checkboxes: null
  },

  init (element) {
    if (!element) return false

    this.elements.doc = document.documentElement
    this.elements.body = document.querySelector(MegaMenuConfig.selector.body)
    this.elements.header = element
    this.elements.menu = element.querySelector(MegaMenuConfig.selector.menu)
    this.elements.menuDrops = element.querySelectorAll(MegaMenuConfig.selector.menuDrop)
    this.elements.menuOpener = element.querySelector(MegaMenuConfig.selector.menuOpener)
    this.elements.checkboxes = this.elements.menu?.querySelectorAll(MegaMenuConfig.selector.checkbox)

    return this.elements.menu && this.elements.menuOpener
  },

  cleanup () {
    Object.keys(this.elements).forEach((key) => {
      this.elements[key] = null
    })
  }
}

const MegaMenuState = {
  sticky: false,

  init (header) {
    if (!header) return
    this.sticky = header.classList.contains(MegaMenuConfig.classes.sticky)
  }
}

const MegaMenuRenderer = {

  preventBodyScroll (event) {
    // Only prevent touch/wheel events on body, not inside menu
    const menu = MegaMenuDOM.elements.menu
    if (menu && menu.contains(event.target)) return // Allow scrolling within menu

    event.preventDefault()
    event.stopPropagation()
  },

  enableScrollPrevention () {
    const doc = MegaMenuDOM.elements.doc,
      header = MegaMenuDOM.elements.header
    if (!doc || !header) return

    const read = () => ({
      doc: MegaMenuDOM.elements.doc,
      header: MegaMenuDOM.elements.header,
      body: MegaMenuDOM.elements.body,
      sticky: MegaMenuState.sticky
    })

    const write = (data) => {
      if (!data || !data.doc || !data.header) return

      // Fix body position to prevent scrolling
      $.toggleClass(data.doc, MegaMenuConfig.modifier.overflow, true)
      if (data.body) {
        $.toggleClass(data.body, MegaMenuConfig.modifier.bodyLocked, true)
      }

      $.eventListener('add', document, 'touchmove', this.preventBodyScroll, { passive: false })
      $.eventListener('add', document, 'wheel', this.preventBodyScroll, { passive: false })

      if (data.sticky) return
      $.toggleClass(data.header, MegaMenuConfig.classes.opened, true)
    }

    $.frameSequence(read, write)
  },

  disableScrollPrevention () {
    const doc = MegaMenuDOM.elements.doc,
      header = MegaMenuDOM.elements.header
    if (!doc || !header) return

    const read = () => ({
      doc: MegaMenuDOM.elements.doc,
      header: MegaMenuDOM.elements.header,
      body: MegaMenuDOM.elements.body,
      sticky: MegaMenuState.sticky
    })

    const write = (data) => {
      if (!data || !data.doc || !data.header) return

      $.toggleClass(data.doc, MegaMenuConfig.modifier.overflow, false)
      if (data.body) {
        $.toggleClass(data.body, MegaMenuConfig.modifier.bodyLocked, false)
      }

      $.eventListener('remove', document, 'touchmove', this.preventBodyScroll, { passive: false })
      $.eventListener('remove', document, 'wheel', this.preventBodyScroll, { passive: false })

      if (data.sticky) return
      $.toggleClass(data.header, MegaMenuConfig.classes.opened, false)
    }

    $.frameSequence(read, write)
  },

  closeDropdowns () {
    const checkboxes = MegaMenuDOM.elements.checkboxes
    if (!checkboxes?.length) return

    const read = () => ({
      checkboxes: Array.from(checkboxes)
    })

    const write = (data) => {
      if (!data || !data.checkboxes) return
      data.checkboxes.forEach((checkbox) => {
        checkbox.checked = false
      })
    }

    $.frameSequence(read, write)
  }
}

const MegaMenuProcessor = {
  handleMenuOverflow (event) {
    const target = $.getSibling(event?.target, MegaMenuConfig.selector.menuOpener, 'prev'),
      menuOpener = MegaMenuDOM.elements.menuOpener

    if (!target || target !== menuOpener) {
      // Check if search opener was clicked - close menu and restore scroll
      const searchOpener = document.querySelector(MegaMenuConfig.selector.searchOpener),
        isSearchOpener = event?.target === searchOpener,
        menuIsOpened = menuOpener?.checked

      if (isSearchOpener && menuIsOpened) {
        menuOpener.checked = false
        this.closeMenu()
      }
      return
    }

    // Close search when opening mobile menu
    if (!menuOpener.checked) {
      if (!$.HeaderComponents || !$.HeaderComponents.api) return
      $.HeaderComponents.api.closeSearchForMenu()
    }

    const menuOpened = menuOpener && menuOpener.checked
    menuOpened ? this.closeMenu() : MegaMenuRenderer.enableScrollPrevention()
  },

  handleMenuResize: (() => {
    const resizeHandler = () => {
      const viewport = $.viewportSize()
      if (viewport.width < MegaMenuConfig.mediaQuery) return
      this.closeMenu()

      if (!MegaMenuDOM.elements.menuOpener) return
      MegaMenuDOM.elements.menuOpener.checked = false
    }
    return $.debounce ? $.debounce(resizeHandler, 150) : resizeHandler
  })(),

  handleDropdownHover (event) {
    const target = event.target,
      type = event.type,
      viewport = $.viewportSize()

    // Only apply .active class on desktop (≥1100px)
    if (viewport.width < MegaMenuConfig.mediaQuery) return

    switch (type) {
      case MegaMenuConfig.event.mouseenter:
        if ($.HeaderComponents && $.HeaderComponents.api) {
          $.HeaderComponents.api.closeSearchForHover()
        }
        $.toggleClass(target, MegaMenuConfig.classes.active, true)
        break

      case MegaMenuConfig.event.mouseleave:
        setTimeout(() => {
          $.toggleClass(target, MegaMenuConfig.classes.active, false)
        }, MegaMenuConfig.hoverTimeout)
        break
    }
  },

  closeMenu () {
    MegaMenuRenderer.closeDropdowns()
    MegaMenuRenderer.disableScrollPrevention()
  },

  closeSearchModal () {
    if ($.HeaderComponents && $.HeaderComponents.api) {
      $.HeaderComponents.api.closeSearch()
    }

    // If hamburger menu is open when search is clicked, close it and restore scroll
    const menuOpener = MegaMenuDOM.elements.menuOpener
    if (!menuOpener?.checked) return

    menuOpener.checked = false
    this.closeMenu()
  },

  closeHeaderModals () {
    if (!$.HeaderComponents || !$.HeaderComponents.api) return
    $.HeaderComponents.api.closeSearchForHover()
  }
}

const MegaMenuEvents = {
  boundlers: {},

  bindEvents () {
    if (!$.is(MegaMenuProcessor.handleMenuOverflow, 'function')) return

    this.boundlers.menuOverflow = MegaMenuProcessor.handleMenuOverflow.bind(MegaMenuProcessor)
    this.boundlers.menuResize = MegaMenuProcessor.handleMenuResize.bind(MegaMenuProcessor)

    $.eventListener('add', document, 'click', this.boundlers.menuOverflow)
    $.eventListener('add', window, 'resize', this.boundlers.menuResize)

    this.bindDropdownEvents()
  },

  bindDropdownEvents () {
    if (!MegaMenuDOM.elements.menuDrops?.length) return

    this.boundlers.dropdownHover = MegaMenuProcessor.handleDropdownHover.bind(MegaMenuProcessor)

    MegaMenuDOM.elements.menuDrops.forEach((item) => {
      $.eventListener('add', item, MegaMenuConfig.event.mouseenter, this.boundlers.dropdownHover)
      $.eventListener('add', item, MegaMenuConfig.event.mouseleave, this.boundlers.dropdownHover)
    })
  },

  cleanup () {
    if (this.boundlers.menuOverflow) {
      $.eventListener('remove', document, 'click', this.boundlers.menuOverflow)
    }
    if (this.boundlers.menuResize) {
      $.eventListener('remove', window, 'resize', this.boundlers.menuResize)
    }
    if (this.boundlers.dropdownHover && MegaMenuDOM.elements.menuDrops?.length) {
      MegaMenuDOM.elements.menuDrops.forEach((item) => {
        $.eventListener('remove', item, MegaMenuConfig.event.mouseenter, this.boundlers.dropdownHover)
        $.eventListener('remove', item, MegaMenuConfig.event.mouseleave, this.boundlers.dropdownHover)
      })
    }
    this.boundlers = {}
  }
}

const handleMegaMenu = () => {
  const header = document.querySelector(MegaMenuConfig.selector.header)

  if (!MegaMenuDOM.init(header)) return null

  MegaMenuState.init(header)

  // Use requestIdle for non-critical initialization with Safari fallback
  const bindEvents = () => MegaMenuEvents.bindEvents()
  const fallbackHandler = () => setTimeout(bindEvents, 50)
  const idleHandler = () => {
    $.requestIdle ? $.requestIdle(bindEvents) : fallbackHandler()
  }

  $.slowConnection() ? bindEvents() : idleHandler()

  const cleanup = () => {
    MegaMenuEvents.cleanup()
    MegaMenuDOM.cleanup()
    return null
  }

  return cleanup
}

const initMegaMenu = () => {
  if (!$ || !$.is($.cleanup, 'function')) {
    console.warn('MegaMenu: Utils not available, falling back to manual initialization')
    handleMegaMenu()
    return
  }

  $.cleanup('cleanupMegaMenu', handleMegaMenu)
}

$.MegaMenu = {
  init: initMegaMenu,
  processor: MegaMenuProcessor,
  renderer: MegaMenuRenderer
}
window.MegaMenu = $.MegaMenu

initMegaMenu()
