/**
 * Header Modal Manager
 *
 * Centralized cross-modal communication and management for header components.
 * Handles mobile menu/search interactions and modal state coordination.
 *
 * @requires js-utils-core.js
 */

const HeaderComponents = {
  config: {
    selectors: {
      header: '.header',
      modalOpener: '[data-modal-opener]',
      menuOpener: '#mobile-menu-opener',
      menuHasDropdown: '.has-dropdown',
      searchOpener: '#header-search-opener'
    },
    mediaQuery: 1100
  },

  init () {
    if (!$.is(this.handleClick, 'function')) return

    $.eventListener('add', document, 'click', this.handleClick.bind(this))
  },

  handleClick (event) {
    const element = document.querySelector(this.config.selectors.header)
    if (!element) return

    const clickInside = element.contains(event.target),
      clickOnOpener = this.isModalOpener(event.target)

    if (!clickInside && !clickOnOpener) this.closeSearchModal()
  },

  closeMobileMenuWhenSearchOpens () {
    const menuOpener = document.querySelector(this.config.selectors.menuOpener)
    if (!menuOpener || !menuOpener.checked) return

    menuOpener.checked = false

    if (!$.MegaMenu || !$.MegaMenu.processor) return
    $.MegaMenu.processor.closeMenu()
  },

  closeSearchWhenMenuOpens () {
    const searchOpener = document.querySelector(this.config.selectors.searchOpener)
    if (!searchOpener || !searchOpener.checked) return

    searchOpener.checked = false
  },

  closeSearchOnDesktopMenuHover () {
    const viewport = $.viewportSize()
    if (viewport.width < this.config.mediaQuery) return

    const searchOpener = document.querySelector(this.config.selectors.searchOpener)
    if (!searchOpener || !searchOpener.checked) return
    searchOpener.checked = false
  },

  closeSearchModal () {
    const searchOpener = document.querySelector(this.config.selectors.searchOpener)
    if (!searchOpener || !searchOpener.checked) return

    searchOpener.checked = false
  },

  isModalOpener (element) {
    if (!element || !$.is(element.matches, 'function')) return false

    const modalOpeners = [
      this.config.selectors.searchOpener,
      this.config.selectors.menuOpener,
      this.config.selectors.menuHasDropdown,
      this.config.selectors.modalOpener
    ]

    return modalOpeners.some((selector) => {
      try {
        return element.matches(selector)
      } catch {
        return false
      }
    })
  },

  api: {
    closeMenuForSearch: () => HeaderComponents.closeMobileMenuWhenSearchOpens(),
    closeSearchForMenu: () => HeaderComponents.closeSearchWhenMenuOpens(),
    closeSearchForHover: () => HeaderComponents.closeSearchOnDesktopMenuHover(),
    closeSearch: () => HeaderComponents.closeSearchModal()
  }
}

const handleHeaderComponents = () => {
  HeaderComponents.init()

  const cleanup = () => {
    // Cleanup would go here if needed for event listeners
    return null
  }

  return cleanup
}

const initHeaderComponents = () => {
  $.cleanup('cleanupHeaderComponents', handleHeaderComponents)
}

if (document.readyState === 'loading') {
  $.eventListener('add', document, 'DOMContentLoaded', initHeaderComponents)
} else {
  initHeaderComponents()
}

$.HeaderComponents = HeaderComponents
window.HeaderComponents = HeaderComponents
