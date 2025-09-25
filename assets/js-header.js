/**
 * Header Component
 *
 * Handles header height calculations, CSS variable management,
 * modal closing functionality, and preview bar integration.
 *
 * @requires js-utils-core.js
 * @requires js-utils-minimal.js
 * @requires js-utils.js
 */

const HeaderConfig = {
  selector: {
    header: '.header',
    body: 'body',
    preview: '.preview-bar__container',
    search: '.header__search',
    searchOpener: '#header-search-opener',
    topBar: '.top-bar__wrapper',
    menuBottom: '.header-menu-bottom',
    menuList: '.header__nav-list'
  },
  classes: {
    sticky: 'header--sticky'
  },
  cssVar: {
    height: '--header-height',
    viewHeight: '--preview-height',
    menuHeight: '--menu-height'
  },
  debounceTime: 150
}

const HeaderDOM = {
  elements: {
    body: null,
    doc: null,
    header: null,
    preview: null,
    menuBottom: null,
    menuList: null
  },

  cacheData: {
    headerHeight: 0,
    previewHeight: 0,
    menuListHeight: 0
  },

  init (element) {
    this.elements.body = document.querySelector(HeaderConfig.selector.body)
    this.elements.doc = document.documentElement
    this.elements.header = element
    this.elements.preview = document.querySelector(HeaderConfig.selector.preview)

    const menuBottom = element?.querySelector(HeaderConfig.selector.menuBottom)

    if (menuBottom) {
      const menuList = menuBottom.querySelector(HeaderConfig.selector.menuList)
      this.elements.menuBottom = menuBottom
      this.elements.menuList = menuList
    }

    return this.elements.header !== null
  },

  cleanup () {
    this.elements = {
      body: null,
      doc: null,
      header: null,
      preview: null,
      menuBottom: null,
      menuList: null
    }
    this.cacheData = {
      headerHeight: 0,
      previewHeight: 0,
      menuListHeight: 0
    }
  }
}

const HeaderHeight = {
  calculate () {
    const elements = HeaderDOM.elements,
      cache = HeaderDOM.cacheData,
      heightProp = HeaderConfig.cssVar.height,
      viewHeightProp = HeaderConfig.cssVar.viewHeight

    if (!elements.header) return

    const read = () => {
      const headerDimensions = $.getDimensions(elements.header)
      let previewDimensions = { height: 0 }

      if (elements.preview) {
        previewDimensions = $.getDimensions(elements.preview)
      }

      const isSticky = elements.header.classList.contains(HeaderConfig.classes.sticky)

      return {
        headerHeight: headerDimensions.height,
        previewHeight: previewDimensions.height,
        isSticky
      }
    }

    const write = (data) => {
      const { headerHeight, previewHeight, isSticky } = data

      let totalHeight = headerHeight

      const setCssVar = (key, val) => {
        $.setCssVar({ key: key, value: val, element: elements.doc, unit: 'px' })
      }

      if (elements.preview && previewHeight > 0) {
        if (isSticky) totalHeight += previewHeight

        setCssVar(viewHeightProp, Math.floor(previewHeight))
        cache.previewHeight = Math.floor(previewHeight)
      }

      setCssVar(heightProp, Math.floor(totalHeight))
      cache.headerHeight = Math.floor(totalHeight)
    }

    $.frameSequence(read, write)
  },

  recalculate () {
    this.calculate()
  }
}

const MenuBottomHeight = {
  calculate () {
    const elements = HeaderDOM.elements,
      cache = HeaderDOM.cacheData,
      menuHeightProp = HeaderConfig.cssVar.menuHeight

    if (!elements.menuBottom || !elements.menuList) return

    const read = () => {
      const menuListDimensions = $.getDimensions(elements.menuList)

      return {
        menuListHeight: menuListDimensions.height
      }
    }

    const write = (data) => {
      const { menuListHeight } = data

      if (menuListHeight > 0) {
        $.setCssVar({
          key: menuHeightProp,
          value: Math.floor(menuListHeight),
          element: elements.doc,
          unit: 'px'
        })
        cache.menuListHeight = Math.floor(menuListHeight)
      }
    }

    $.frameSequence(read, write)
  },

  recalculate () {
    this.calculate()
  }
}

const HeaderModals = {
  closeSearch (event) {
    const searchOpener = document.querySelector(HeaderConfig.selector.searchOpener)
    if (!searchOpener || !searchOpener.checked) return false

    const isSearch = event.target.closest(HeaderConfig.selector.search) ||
      event.target.closest(HeaderConfig.selector.searchOpener) ||
      event.target === searchOpener

    if (isSearch) return false

    if ($.HeaderComponents && $.HeaderComponents.api) {
      $.HeaderComponents.api.closeSearch()
    }
  }
}

const HeaderDestroyer = {
  removeOverflow () {
    if (!$.is($.MegaMenu, 'object') || !$.is($.MegaMenu.renderer, 'object')) return
    $.MegaMenu.renderer.disableScrollPrevention()
  },

  closeMobileDrop () {
    if (!$.is($.MegaMenu, 'object') || !$.is($.MegaMenu.renderer, 'object')) return
    $.MegaMenu.renderer.closeDropdowns()
  }
}

const HeaderEvents = {
  handlers: {
    click: null,
    resize: null
  },

  init () {
    HeaderHeight.calculate()
    MenuBottomHeight.calculate()

    this.handlers.click = HeaderModals.closeSearch.bind(HeaderModals)
    this.handlers.resize = () => {
      HeaderHeight.recalculate()
      MenuBottomHeight.recalculate()
    }

    $.eventListener('add', document, 'click', this.handlers.click)
    $.eventListener('add', window, 'resize', this.handlers.resize, { passive: true })

    const topBar = HeaderDOM.elements.header?.querySelector(HeaderConfig.selector.topBar)
    if (topBar) $.initTopBar()
  },

  destroy () {
    if (this.handlers.click) {
      $.eventListener('remove', document, 'click', this.handlers.click)
    }
    if (this.handlers.resize) {
      $.eventListener('remove', window, 'resize', this.handlers.resize, { passive: true })
    }

    this.handlers = {
      click: null,
      resize: null
    }
  }
}

const handleHeader = () => {
  const header = document.querySelector(HeaderConfig.selector.header)
  if (!header) return null

  if (!HeaderDOM.init(header)) return null

  HeaderEvents.init()

  const cleanup = () => {
    HeaderEvents.destroy()
    HeaderDOM.cleanup()
    return null
  }

  return cleanup
}

const initHeader = () => {
  $.cleanup('cleanupHeader', handleHeader)
}

if (document.readyState === 'complete') {
  $.requestIdle(initHeader)
} else {
  $.eventListener('add', document, 'readystatechange', (e) => {
    if (e.target.readyState === 'complete') {
      $.requestIdle(initHeader)
    }
  })
}

$.headerBar = {
  removeOverflow: HeaderDestroyer.removeOverflow,
  closeMobileDrop: HeaderDestroyer.closeMobileDrop
}
window.headerBar = $.headerBar
