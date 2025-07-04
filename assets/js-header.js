/**
 * Header Component
 *
 * Handles header height calculations, CSS variable management,
 * modal closing functionality, and preview bar integration.
 *
 * @requires js-utils-core.js
 */

const HeaderConfig = {
  selector: {
    header: '.header',
    body: 'body',
    preview: '.preview-bar__container',
    search: '.header__search',
    searchOpener: '#header-search-opener',
    topBar: '.top-bar__wrapper'
  },
  classes: {
    sticky: 'header--sticky'
  },
  cssVar: {
    height: '--header-height',
    viewHeight: '--preview-height'
  },
  debounceTime: 150
}

const HeaderDOM = {
  elements: {
    body: null,
    doc: null,
    header: null,
    preview: null
  },

  cacheData: {
    headerHeight: 0,
    previewHeight: 0
  },

  init (element) {
    this.elements.body = document.querySelector(HeaderConfig.selector.body)
    this.elements.doc = document.documentElement
    this.elements.header = element
    this.elements.preview = document.querySelector(HeaderConfig.selector.preview)

    return this.elements.header !== null
  },

  cleanup () {
    this.elements = {
      body: null,
      doc: null,
      header: null,
      preview: null
    }
    this.cacheData = {
      headerHeight: 0,
      previewHeight: 0
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

    this.handlers.click = HeaderModals.closeSearch.bind(HeaderModals)
    this.handlers.resize = HeaderHeight.recalculate.bind(HeaderHeight)

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

$.headerBar = {
  removeOverflow: HeaderDestroyer.removeOverflow,
  closeMobileDrop: HeaderDestroyer.closeMobileDrop
}
window.headerBar = $.headerBar

const initWhenReady = () => {
  if (document.readyState === 'complete') {
    $.requestIdle(initHeader)
  } else {
    $.eventListener('add', document, 'readystatechange', (e) => {
      if (e.target.readyState === 'complete') {
        $.requestIdle(initHeader)
      }
    })
  }
}

initWhenReady()
