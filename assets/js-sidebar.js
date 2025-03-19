class Sidebar {
  constructor(block) {
    this.block = block;

    this.selector = {
      dropdown: ".js-sidebar-menu-dropdown",
      item: ".js-sidebar-menu-item",
      list: ".sidebar__menu-list",
      trigger: "[id*='side-menu-opener-']"
    }

    this.modifier = {
      expanded: "sidebar__menu-item--expanded"
    }

    this.classes = {
      opener: "sidebar__menu-opener"
    }

    this.cssProps = {
      maxHeight: 'max-height',
      duration: 'transition-duration'
    }
  }

  init() {
    if (!this.block) return false;

    this.events();
  }

  events() {
    document.addEventListener("click", this.setGradient.bind(this));
  }

  setGradient(e) {
    const target = e.target,
          parent = target.closest(this.selector.item),
          isOpener = target.classList.contains(this.classes.opener);

    if (!parent || !isOpener) return false;

    const trigger = parent.querySelector(this.selector.trigger),
          dropdown = parent.querySelector(this.selector.dropdown),
          list = dropdown.querySelector(this.selector.list);

    const toggleClass = () => {
      const dropdownStyles = window.getComputedStyle(dropdown),
            maxHeight = parseFloat(dropdownStyles.getPropertyValue(this.cssProps.maxHeight)),
            listHeight = list.getBoundingClientRect().height;

      (listHeight > maxHeight && trigger.checked)
        ? parent.classList.add(this.modifier.expanded)
        : parent.classList.remove(this.modifier.expanded)
    }

    dropdown.addEventListener('transitionend', (e) => {
      if (e.propertyName !== this.cssProps.maxHeight) return false;
      toggleClass();
    })
  }
}

const sidebar = new Sidebar(document.querySelector('.sidebar__nav'));

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "complete") sidebar.init();
})
