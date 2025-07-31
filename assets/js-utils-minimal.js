/**
 * Utilities minimal (load as needed, and for layouts like minimal and checkout)
 * Depends on js-utils-core.js being loaded first
 */

// Ensure Utils exists even if core wasn't loaded (defensive coding)
window.Utils = window.Utils || {}
window.$ = window.Utils

// Batches DOM operations to prevent layout thrashing
Utils.batchDOM = (callback) => {
  return $.nextFrame(() => callback())
}

// Separates DOM reads and writes to optimize performance
Utils.frameSequence = (readCallback, writeCallback) => {
  return $.nextFrame(() => {
    const result = readCallback()
    $.nextFrame(() => {
      writeCallback(result)
    })
  })
}

// Observer utility - critical for modern performance patterns
Utils.mutationObserver = (callback, targetNode = document.body, customOptions = {}) => {
  const defaultOptions = {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  }
  const options = { ...defaultOptions, ...customOptions }

  const observer = new MutationObserver(callback)
  observer.observe(targetNode, options)

  return observer
}

// Event management - most widely used utility
Utils.eventListener = (method, nodes, event, handler, options) => {
  if (!nodes) return

  // Handle single object case
  if (nodes === window ||
    nodes === document ||
    nodes instanceof HTMLElement ||
    (typeof nodes === 'object' &&
      ($.is(nodes.addEventListener, 'function')))) {
    if (method === 'add') nodes.addEventListener(event, handler, options)
    if (method === 'remove') nodes.removeEventListener(event, handler, options)
    return
  }

  if (!nodes.length) return

  Array.from(nodes).forEach((node) => {
    if (!node || $.is(node.addEventListener, 'function')) return
    if (method === 'add') node.addEventListener(event, handler, options)
    if (method === 'remove') node.removeEventListener(event, handler, options)
  })
}
