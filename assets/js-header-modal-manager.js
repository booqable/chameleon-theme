/**
 * Header Modal Manager
 *
 * Simple click-outside handler for header modals.
 *
 * @requires js-utils-core.js
 */

const HeaderModalManager = {
  config: {
    selectors: {
      header: '.header',
      searchOpener: '#header-search-opener'
    },
    modalOpeners: [
      '#header-search-opener',
      '#mobile-menu-opener',
      '.has-dropdown',
      '[data-modal-opener]'
    ]
  },

  init() {
    if (!$.is(this.handleClick, 'function')) return

    $.eventListener('add', document, 'click', this.handleClick.bind(this))
  },

  handleClick(event) {
    const element = document.querySelector(this.config.selectors.header)
    if (!element) return

    const clickInside = element.contains(event.target),
          clickOnOpener = this.isModalOpener(event.target)

    if (!clickInside && !clickOnOpener) this.closeSearchModal()
  },

  closeSearchModal() {
    const searchOpener = document.querySelector(this.config.selectors.searchOpener)
    if (!searchOpener && !searchOpener.checked) return false

    const closeSearch = () => searchOpener.checked = false
    $.frameSequence(() => ({ searchOpener }), closeSearch)
  },

  isModalOpener(element) {
    if (!element || !$.is(element.matches, 'function')) return false

    return this.config.modalOpeners.some(selector => {
      try {
        return element.matches(selector)
      } catch (e) {
        return false
      }
    })
  }
}

if (document.readyState === 'loading') {
  $.eventListener('add', document, 'DOMContentLoaded', () => HeaderModalManager.init())
} else {
  HeaderModalManager.init()
}

window.HeaderModalManager = HeaderModalManager
