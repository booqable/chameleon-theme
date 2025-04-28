/**
 * Tabs Component
 *
 * Handles tab switching functionality, including active states
 * for both tabs and their associated content panels.
 *
 * @requires js-utils.js
 */
const handleTabs = (tabsContainer) => {
  if (!tabsContainer) return null;

  const config = {
    attributes: {
      content: 'data-content',
      trigger: 'data-trigger'
    },
    classes: {
      tab: 'tabs__trigger'
    },
    modifiers: {
      active: 'active'
    },
    selectors: {
      tab: '.tabs__trigger',
      content: '.tabs__content',
      opener: '#tabs-select-opener'
    }
  }

  let clickHandler = null;

  const elements = {
    tabs: tabsContainer.querySelectorAll(config.selectors.tab),
    content: tabsContainer.querySelectorAll(config.selectors.content),
    opener: tabsContainer.querySelector(config.selectors.opener)
  }

  const updateActiveClasses = (options) => {
    const { arr, attr, val, mod } = options;

    if (!arr) return;

    // Use frameSequence utility to prevent layout thrashing
    $.frameSequence(
      // Read phase: collect elements and determine active state
      () => {
        const updates = [];

        arr.forEach(el => {
          if (!el) return;

          const id = el.getAttribute(attr);
          updates.push({
            element: el,
            shouldBeActive: val === id
          })
        })

        return updates;
      },
      // Write phase: apply class changes
      (updates) => {
        $.batchDOM(() => {
          updates.forEach(update => {
            update.element.classList.remove(mod);
            if (update.shouldBeActive) {
              update.element.classList.add(mod);
            }
          })
        })
      }
    )
  }

  const handleTabClick = (event) => {
    const target = event.target,
          isDirectTab = target.classList.contains(config.classes.tab),
          isChildOfTab = target.parentElement?.classList.contains(config.classes.tab);

    if (!isDirectTab && !isChildOfTab) return;

    // Use nextFrame utility to ensure DOM operations happen at the right time
    $.nextFrame(() => {
      // Get the actual tab element (could be parent if click was on child)
      const tabElement = isDirectTab ? target : target.parentElement;
      const tabId = tabElement.getAttribute(config.attributes.trigger);

      // Schedule tab updates
      updateActiveClasses({
        arr: elements.tabs,
        attr: config.attributes.trigger,
        val: tabId,
        mod: config.modifiers.active
      })

      // Update active content if it exists
      if (elements.content.length) {
        updateActiveClasses({
          arr: elements.content,
          attr: config.attributes.content,
          val: tabId,
          mod: config.modifiers.active
        });
      }

      // Toggle opener checkbox in the next frame
      if (elements.opener && target.classList.contains(config.classes.tab)) {
        $.nextFrame(() => {
          elements.opener.checked = false;
        })
      }
    })
  }

  const initialize = () => {
    if (!elements.tabs.length) return;

    // Store handler and use utility function if available
    clickHandler = handleTabClick;

    // Use eventListener utility
    $.eventListener('add', document, 'click', clickHandler);
  }

  const destroy = () => {
    // Clean up event listener
    if (clickHandler) {
      // Use utility function to remove event listener
      $.eventListener('remove', document, 'click', clickHandler);
      clickHandler = null;
    }
  }

  return {
    initialize,
    destroy
  }
}

const initTabs = (selector = '.tabs') => {
  const tabsContainers = document.querySelectorAll(selector),
        tabInstances = [];

  if (!tabsContainers.length) return tabInstances;

  tabsContainers.forEach(container => {
    const tabs = handleTabs(container);
    if (tabs) {
      tabs.initialize();
      tabInstances.push(tabs);
    }
  })

  return tabInstances;
}

const tabsInstances = initTabs();

// Add cleanup handler
window.cleanupTabs = () => {
  if (tabsInstances && tabsInstances.length) {
    tabsInstances.forEach(instance => {
      if (instance && $.is(instance.destroy, 'function')) {
        instance.destroy();
      }
    })

    tabsInstances.length = 0;
  }
}
