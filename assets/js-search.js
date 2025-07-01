/**
 * Search Component
 *
 * Handles search functionality with modal overlay, auto-focus,
 * clear button functionality, and URL parameter management.
 *
 * @requires js-utils-core.js
 */

const SearchConfig = {
  selector: {
    container: '.search',
    form: '#search',
    input: '.search__input',
    opener: '#header-search-opener',
    reset: '.search__reset'
  },
  class: {
    filled: 'filled'
  },
  attr: {
    action: 'action'
  },
  params: {
    q: 'q'
  },
  focusDelay: 50
}

const SearchDOM = {
  elements: {
    container: null,
    form: null,
    input: null,
    opener: null,
    reset: null
  },

  init () {
    this.elements.container = document.querySelector(SearchConfig.selector.container)
    this.elements.form = document.querySelector(SearchConfig.selector.form)
    this.elements.input = document.querySelector(SearchConfig.selector.input)
    this.elements.opener = document.querySelector(SearchConfig.selector.opener)
    this.elements.reset = document.querySelector(SearchConfig.selector.reset)

    return this.elements.form && this.elements.input
  },

  cleanup () {
    if (!$.is(this.elements, 'object')) return

    Object.keys(this.elements).forEach((key) => {
      this.elements[key] = null
    })
  }
}

const SearchState = {
  url: null,

  init () {
    if (!$.is(window.location.href, 'string')) return null
    this.url = new URL(window.location.href)
  },

  getQuery () {
    if (!this.url) return null
    return this.url.searchParams.get(SearchConfig.params.q)
  },

  buildSearchUrl (query) {
    if (!this.url || !SearchDOM.elements.form) return ''

    const route = SearchDOM.elements.form.getAttribute(SearchConfig.attr.action)
    if (!$.is(route, 'string')) return ''

    this.url.href = this.url.origin + route
    this.url.searchParams.set(SearchConfig.params.q, query)
    return this.url.href
  }
}

const SearchRenderer = {
  showClearButton () {
    const input = SearchDOM.elements.input
    if (!input) return

    const read = () => {
      const parent = input.parentElement
      if (!parent) return null

      return {
        parent,
        shouldShow: input.value.length !== 0
      }
    }

    const write = (data) => {
      if (!data) return
      $.toggleClass(data.parent, SearchConfig.class.filled, data.shouldShow)
    }

    $.frameSequence(read, write)
  },

  clearInput () {
    const input = SearchDOM.elements.input
    if (!input) return

    const read = () => ({
      input: input,
      parent: input.parentElement
    })

    const write = (data) => {
      if (!data || !data.input || !data.parent) return
      data.input.value = ''
      $.toggleClass(data.parent, SearchConfig.class.filled, false)
      data.input.focus()
    }

    $.frameSequence(read, write)
  },

  focusInput () {
    const input = SearchDOM.elements.input
    if (!input) return

    const read = () => ({ input: input })

    const write = (data) => {
      if (!data || !data.input) return
      data.input.focus()
      this.showClearButton()
    }

    setTimeout(() => {
      $.frameSequence(read, write)
    }, SearchConfig.focusDelay)
  },

  autoFillInput () {
    const input = SearchDOM.elements.input
    if (!input) return

    const query = SearchState.getQuery()
    if (!query || !$.is(query, 'string')) return

    const read = () => ({
      input: input,
      query
    })

    const write = (data) => {
      if (!data || !data.input || !$.is(data.query, 'string')) return
      data.input.value = data.query
    }

    $.frameSequence(read, write)
  }
}

const SearchProcessor = {
  handleFocus (event) {
    const target = event?.target

    if (target !== SearchDOM.elements.opener) return

    if ($.HeaderComponents && $.HeaderComponents.api) {
      $.HeaderComponents.api.closeMenuForSearch()
    }

    SearchRenderer.focusInput()
  },

  handleClear (event) {
    const target = event?.target

    if (target !== SearchDOM.elements.reset) return

    SearchRenderer.clearInput()
  },

  handleKeyup () {
    SearchRenderer.showClearButton()
  },

  handleSubmit (event) {
    const target = event.target

    if (target !== SearchDOM.elements.form) return

    event.preventDefault()

    if (!$.is(SearchDOM.elements.input.value, 'string')) return

    const value = SearchDOM.elements.input.value,
      searchUrl = SearchState.buildSearchUrl(value),
      isString = $.is(searchUrl, 'string'),
      notEmpty = searchUrl.length > 0

    if (isString && notEmpty) window.location.href = searchUrl
  }
}

const SearchEvents = {
  bindEvents () {
    $.eventListener('add', document, 'click', SearchProcessor.handleFocus.bind(SearchProcessor))
    $.eventListener('add', document, 'click', SearchProcessor.handleClear.bind(SearchProcessor))
    $.eventListener('add', document, 'keyup', SearchProcessor.handleKeyup.bind(SearchProcessor))
    $.eventListener('add', document, 'submit', SearchProcessor.handleSubmit.bind(SearchProcessor))
  }
}

const handleSearch = () => {
  if (!SearchDOM.init()) return null

  if (!$.is(SearchState.init, 'function') || !$.is(SearchEvents.bindEvents, 'function')) {
    return null
  }

  SearchState.init()
  SearchRenderer.autoFillInput()
  SearchEvents.bindEvents()

  const cleanup = () => {
    if ($.is(SearchDOM.cleanup, 'function')) SearchDOM.cleanup()
    return null
  }

  return cleanup
}

const initSearch = () => {
  if (!$ || !$.is($.cleanup, 'function')) {
    handleSearch()
    return
  }

  $.cleanup('cleanupSearch', handleSearch)
}

initSearch()
