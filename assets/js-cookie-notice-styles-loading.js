/**
 * Cookie Notice Styles Component
 *
 * Loads cookie consent styling immediately when the cookie element
 * appears in the DOM using MutationObserver for optimal performance.
 *
 * @requires js-utils-core.js
 * @requires js-utils-minimal.js
 */

const CookieConfig = {
  selector: {
    container: 'cc-main'
  },
  modifier: {
    paletteOne: 'palette-one',
    paletteTwo: 'palette-two',
    paletteThree: 'palette-three'
  },
  event: {
    initialized: 'cookie-consent-ui-initialized'
  },
  defaults: {
    palette: 'one',
    interval: 1500,
    maxAttempts: 3
  }
}

const CookieDOM = {
  elements: {
    container: null
  },

  cache: {
    currentPalette: '',
    appliedStyles: false
  },

  init () {
    this.elements.container = document.querySelector(`#${CookieConfig.selector.container}`)
    return !!this.elements.container
  },

  getContainer () {
    if (this.elements.container) return this.elements.container

    this.elements.container = document.querySelector(`#${CookieConfig.selector.container}`)
    return this.elements.container
  },

  cleanup () {
    this.elements.container = null
  }
}

const CookieStyler = {
  applyStyles (container = null) {
    const ccMain = container || CookieDOM.getContainer()
    if (!ccMain) return false

    const ccPalette = window?.cookieSettings?.cookiePalette || CookieConfig.defaults.palette

    if (ccPalette === CookieDOM.cache.currentPalette && CookieDOM.cache.appliedStyles) return true

    const read = () => {
      return {
        palette: ccPalette,
        styleMap: window?.cookieSettings?.cookieStyleMap || {}
      }
    }

    const write = (data) => {
      ccMain.classList.remove(
        CookieConfig.modifier.paletteOne,
        CookieConfig.modifier.paletteTwo,
        CookieConfig.modifier.paletteThree
      )
      ccMain.classList.add(`palette-${data.palette}`)

      for (const [prop, val] of Object.entries(data.styleMap)) {
        ccMain.style.setProperty(prop, val)
      }

      CookieDOM.cache.currentPalette = data.palette
      CookieDOM.cache.appliedStyles = true
      ccMain.style.opacity = '1'
    }

    $.frameSequence(read, write)
    return true
  }
}

const CookieObserver = {
  observer: null,

  setup () {
    if (this.observer) return this.observer

    const handleElement = (el) => {
      if (!el) return false

      CookieStyler.applyStyles(el)

      if (this.observer) this.observer.disconnect()

      return true
    }

    const observerCallback = (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue
        const target = CookieConfig.selector.container

        for (const node of mutation.addedNodes) {
          if (!node || node.nodeType !== Node.ELEMENT_NODE) continue

          if (node.id === target) {
            if (handleElement(node)) return
          }

          if (node.querySelector) {
            const container = node.querySelector(`#${target}`)
            if (handleElement(container)) return
          }
        }
      }
    }

    this.observer = $.mutationObserver(observerCallback)
    return this.observer
  },

  cleanup () {
    this.observer.disconnect()
    this.observer = null
  }
}

const CookieInterval = {
  intervalId: null,

  start () {
    let attempts = 0
    const interval = CookieConfig.defaults.interval

    const applyStyles = () => {
      attempts++

      const applyStylesHandler = () => {
        CookieStyler.applyStyles()
        this.stop()
        return
      }
      if (CookieDOM.init()) applyStylesHandler()

      // Stop checking after max attempts
      if (attempts >= CookieConfig.defaults.maxAttempts) this.stop()
    }

    this.intervalId = setInterval(applyStyles, interval)

    return this.intervalId
  },

  stop () {
    if (!this.intervalId) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }
}

const CookieHandler = {
  initHandler: null,

  init () {
    CookieStyler.applyStyles()
    CookieObserver.setup()
    CookieInterval.start()
    this.setupEventListener()

    return this.cleanup.bind(this)
  },

  setupEventListener () {
    this.initHandler = () => $.batchDOM(CookieStyler.applyStyles)
    $.eventListener('add', window, CookieConfig.event.initialized, this.initHandler)
  },

  cleanup () {
    if (this.initHandler) {
      $.eventListener('remove', window, CookieConfig.event.initialized, this.initHandler)
      this.initHandler = null
    }

    CookieObserver.cleanup()
    CookieInterval.stop()
    CookieDOM.cleanup()

    return null
  }
}

const initCookieStyles = () => {
  $.cleanup('cleanupCookiesListeners', () => CookieHandler.init())
}

initCookieStyles()
