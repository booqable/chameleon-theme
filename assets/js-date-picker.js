/**
 * Date Picker Component
 *
 * Handles date picker height calculation and CSS variable management.
 * Uses ResizeObserver and IntersectionObserver for performance optimization.
 *
 * @requires js-utils-core.js
 * @requires js-utils-minimal.js
 * @requires js-utils.js
 */

const DatePickerConfig = {
  selector: {
    datePicker: 'bq-date-picker',
    datePickerBlock: '.date-picker-instance'
  },
  cssVar: {
    datePickerHeight: '--date-picker-height',
    datePickerBlockHeight: '--date-picker-block-height'
  }
}

const DatePickerDOM = {
  elements: {
    datePicker: null,
    datePickerBlock: null
  },

  cacheData: {
    datePickerHeight: 0,
    datePickerBlockHeight: 0
  },

  init () {
    this.elements.datePicker = document.querySelector(DatePickerConfig.selector.datePicker)
    this.elements.datePickerBlock = document.querySelector(DatePickerConfig.selector.datePickerBlock)
    return this.elements.datePicker !== null
  },

  cleanup () {
    this.cacheData = {
      datePickerHeight: 0,
      datePickerBlockHeight: 0
    }

    Object.keys(this.elements).forEach((key) => {
      this.elements[key] = null
    })
  }
}

const DatePickerHeight = {
  height: DatePickerConfig.cssVar.datePickerHeight,
  blockHeight: DatePickerConfig.cssVar.datePickerBlockHeight,

  readDatePickerDimensions () {
    if (!DatePickerDOM.elements.datePicker) return null

    const datePicker = DatePickerDOM.elements.datePicker,
      datePickerBlock = DatePickerDOM.elements.datePickerBlock

    const datePickerHeight = parseInt(datePicker ?
      $.getDimensions(datePicker).height :
      0) || 0

    const datePickerBlockHeight = parseInt(datePickerBlock ?
      $.getDimensions(datePickerBlock).height :
      0) || 0

    // Only return dimensions that have changed
    const result = {}

    if (datePickerHeight !== DatePickerDOM.cacheData.datePickerHeight) {
      result.datePickerHeight = datePickerHeight
      DatePickerDOM.cacheData.datePickerHeight = datePickerHeight
    }

    if (datePickerBlockHeight !== DatePickerDOM.cacheData.datePickerBlockHeight) {
      result.datePickerBlockHeight = datePickerBlockHeight
      DatePickerDOM.cacheData.datePickerBlockHeight = datePickerBlockHeight
    }

    return Object.keys(result).length ? result : null
  },

  writeDatePickerVariables (dimensions) {
    if (!dimensions) return
    const { datePickerHeight, datePickerBlockHeight } = dimensions
    const setDatePickerHeight = () => {
      $.setCssVar({ key: this.height, value: datePickerHeight, unit: 'px' })
    }
    const setDatePickerBlockHeight = () => {
      $.setCssVar({ key: this.blockHeight, value: datePickerBlockHeight, unit: 'px' })
    }

    if (datePickerHeight !== undefined) setDatePickerHeight()
    if (datePickerBlockHeight !== undefined) setDatePickerBlockHeight()
  },

  async calculateDatePickerHeight () {
    if (!DatePickerDOM.elements.datePicker) return

    if (!$.is(this.readDatePickerDimensions, 'function') ||
      !$.is(this.writeDatePickerVariables, 'function')) {
      console.warn('DatePicker calculation methods not available yet')
      return
    }

    await new Promise((resolve) => $.nextFrame(resolve))

    const read = this.readDatePickerDimensions.bind(this),
      write = this.writeDatePickerVariables.bind(this)

    $.frameSequence(read, write)
  },

  safeCalculateHeight () {
    try {
      this.calculateDatePickerHeight()
    } catch (error) {
      console.warn('Error calculating date picker height:', error)
      setTimeout(() => {
        if (!DatePickerDOM.elements.datePicker && !$.is(this.readDatePickerDimensions, 'function')) return
        this.calculateDatePickerHeight()
      }, 100)
    }
  }
}

const DatePickerResize = {
  resizeObserver: null,

  setupResizeHandlers () {
    const handleResize = () => {
      DatePickerHeight.safeCalculateHeight()
    }

    const handleResizeSettings = {
      element: document.documentElement,
      debounceTime: 0
    }

    this.resizeObserver = $.resizeObserver(handleResize, handleResizeSettings)
  },

  cleanup () {
    this.resizeObserver.cleanup()
    this.resizeObserver = null
  }
}

const DatePickerVisibility = {
  observer: null,

  setupIntersectionObserver () {
    if (!DatePickerDOM.elements.datePicker) return

    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        DatePickerHeight.calculateDatePickerHeight()
      })
    }

    this.observer = $.intersectionObserver(handleIntersection)
    this.observer.observe(DatePickerDOM.elements.datePicker)
  },

  cleanup () {
    this.observer.disconnect()
    this.observer = null
  }
}

const handleDatePicker = () => {
  if (!DatePickerDOM.init()) return null

  DatePickerHeight.safeCalculateHeight()
  DatePickerResize.setupResizeHandlers()
  DatePickerVisibility.setupIntersectionObserver()

  const cleanup = () => {
    DatePickerResize.cleanup()
    DatePickerVisibility.cleanup()
    DatePickerDOM.cleanup()
    return null
  }

  return cleanup
}

const initDatePicker = () => {
  $.cleanup('cleanupDatePicker', handleDatePicker)
}

$.initDatePicker = initDatePicker
window.initDatePicker = $.initDatePicker
