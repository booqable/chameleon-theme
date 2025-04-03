/**
 * Tabs Component
 *
 * Handles tab switching functionality, including active states
 * for both tabs and their associated content panels.
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

  const elements = {
    tabs: tabsContainer.querySelectorAll(config.selectors.tab),
    content: tabsContainer.querySelectorAll(config.selectors.content),
    opener: tabsContainer.querySelector(config.selectors.opener)
  }

  const updateActiveClasses = (options) => {
    const { arr, attr, val, mod } = options;

    if (!arr) return;

    arr.forEach(el => {
      if (!el) return;

      const id = el.getAttribute(attr);

      el.classList.remove(mod);

      if (val === id) el.classList.add(mod);
    })
  }

  const handleTabClick = (event) => {
    const target = event.target,
          isDirectTab = target.classList.contains(config.classes.tab),
          isChildOfTab = target.parentElement?.classList.contains(config.classes.tab);

    if (!isDirectTab && !isChildOfTab) return;

    // Get the actual tab element (could be parent if click was on child)
    const tabElement = isDirectTab ? target : target.parentElement;

    const tabId = tabElement.getAttribute(config.attributes.trigger);

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
      })
    }

    if (elements.opener && target.classList.contains(config.classes.tab)) {
      elements.opener.checked = false;
    }
  }

  const initialize = () => {
    if (!elements.tabs.length) return;

    document.addEventListener('click', handleTabClick);
  }

  return {
    initialize
  }
}

const initTabs = (selector = '.tabs') => {
  const tabsContainers = document.querySelectorAll(selector);

  if (!tabsContainers.length) return;

  tabsContainers.forEach(container => {
    const tabs = handleTabs(container);
    if (tabs) tabs.initialize();
  })
}

initTabs();
