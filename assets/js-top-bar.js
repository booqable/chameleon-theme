/**
 * Top Bar Component
 *
 * Handles top bar scroll behavior and height calculations.
 * Manages sticky header transform animations and body scroll classes.
 *
 * @requires js-utils-core.js
 */

const TopBarConfig = {
  selector: {
    bar: '.top-bar',
    body: 'body',
    header: '.header'
  },
  modifier: {
    scroll: 'scrolled-down'
  },
  cssVar: {
    barHeight: '--top-bar-height',
    transform: '--header-transform'
  },
  minHeight: 180,
  debounceTime: 150
}

const TopBarDOM = {
  elements: {
    bar: null,
    body: null,
    doc: null,
    headerBlock: null
  },

  cacheData: {
    barHeight: 0,
    lastScroll: 0,
    shift: 0
  },

  init (headerBlock) {
    this.elements.headerBlock = headerBlock
    this.elements.doc = document.documentElement
    this.elements.body = document.querySelector(TopBarConfig.selector.body)
    this.elements.bar = headerBlock?.querySelector(TopBarConfig.selector.bar)

    return this.elements.bar !== null
  },

  cleanup () {
    this.elements = {
      bar: null,
      body: null,
      doc: null,
      headerBlock: null
    }
    this.cacheData = {
      barHeight: 0,
      lastScroll: 0,
      shift: 0
    }
  }
}

const TopBarHeight = {
  calculate () {
    const elements = TopBarDOM.elements,
      cache = TopBarDOM.cacheData,
      shiftProp = TopBarConfig.cssVar.transform,
      barHeightProp = TopBarConfig.cssVar.barHeight

    if (!elements.bar) return

    const read = () => {
      const dimensions = $.getDimensions(elements.bar),
        currentScroll = window.scrollY

      return {
        barHeight: Math.floor(dimensions.height),
        currentHeight: dimensions.height,
        currentScroll
      }
    }

    const write = (data) => {
      const { barHeight, currentHeight, currentScroll } = data,
            scrollClass = TopBarConfig.modifier.scroll

      cache.barHeight = barHeight
      $.setCssVar({ key: barHeightProp, value: barHeight, element: elements.doc, unit: 'px' })

      const threshold = Math.max(TopBarConfig.minHeight, currentHeight)

      if (currentScroll <= threshold) {
        $.toggleClass(elements.body, scrollClass, false)
        $.setCssVar({ key: shiftProp, value: 0, element: elements.doc, unit: 'px' })
        cache.shift = 0
      } else {
        $.toggleClass(elements.body, scrollClass, true)
        const newShift = -currentHeight
        $.setCssVar({ key: shiftProp, value: newShift, element: elements.doc, unit: 'px' })
        cache.shift = newShift
      }
    }

    $.frameSequence(read, write)
  },

  recalculate () {
    this.calculate()
  }
}

const TopBarScroll = {
  handleScroll () {
    const elements = TopBarDOM.elements,
      scrollClass = TopBarConfig.modifier.scroll,
      property = TopBarConfig.cssVar.transform,
      cache = TopBarDOM.cacheData

    if (!elements.bar || !elements.body) return false

    const read = () => {
      if (!elements.bar || !elements.body) return null

      const current = window.scrollY,
        isScroll = elements.body.classList.contains(scrollClass),
        dimensions = $.getDimensions(elements.bar)

      return {
        current,
        isScroll,
        height: dimensions.height,
        lastScroll: cache.lastScroll
      }
    }

    const write = (data) => {
      if (!data) return

      const { current, isScroll, height, lastScroll } = data

      const setCssVar = (value) => {
        $.setCssVar({ key: property, value: value, element: elements.doc, unit: 'px' })
      }

      const shiftHandler = () => {
        $.toggleClass(elements.body, scrollClass, true)
        setCssVar(-height)
        cache.shift = -height
      }

      const shiftDestroyer = () => {
        $.toggleClass(elements.body, scrollClass, false)
        setCssVar(0)
        cache.shift = 0
      }

      const threshold = Math.max(TopBarConfig.minHeight, height)

      if (current <= threshold) {
        shiftDestroyer()
        cache.lastScroll = current
        return
      }

      if (current > lastScroll && !isScroll) {
        shiftHandler()
      } else if (current < lastScroll - 10 && isScroll) {
        shiftDestroyer()
      }

      cache.lastScroll = current
    }

    $.frameSequence(read, write)
  }
}

const TopBarEvents = {
  handlers: {
    scroll: null,
    resize: null
  },

  init () {
    TopBarHeight.calculate()

    this.handlers.scroll = TopBarScroll.handleScroll.bind(TopBarScroll)
    this.handlers.resize = TopBarHeight.recalculate.bind(TopBarHeight)

    $.eventListener('add', window, 'scroll', this.handlers.scroll, { passive: true })
    $.eventListener('add', window, 'resize', this.handlers.resize, { passive: true })
  },

  destroy () {
    if (this.handlers.scroll) {
      $.eventListener('remove', window, 'scroll', this.handlers.scroll, { passive: true })
    }
    if (this.handlers.resize) {
      $.eventListener('remove', window, 'resize', this.handlers.resize, { passive: true })
    }

    this.handlers = {
      scroll: null,
      resize: null
    }
  }
}

const handleTopBar = () => {
  const header = document.querySelector(TopBarConfig.selector.header)
  if (!header) return null

  if (!TopBarDOM.init(header)) return null

  TopBarEvents.init()

  const cleanup = () => {
    TopBarEvents.destroy()
    TopBarDOM.cleanup()
    return null
  }

  return cleanup
}

const initTopBar = () => {
  $.cleanup('cleanupTopBar', handleTopBar)
}

initTopBar()
