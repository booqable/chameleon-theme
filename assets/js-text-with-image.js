class TextWithImageSpacer {
  constructor(section) {
    this.section = section;

    this.classes = {
      spacer: "text-image__spacer",
      one: "palette-one",
      two: "palette-two",
      three: "palette-three",
    }
  }

  init() {
    if (!this.section) return false;

    this.setColor();
  }

  setColor() {
    const children = [...this.section.children],
          classes = [this.classes.one, this.classes.two, this.classes.three];

    children.forEach(child => {
      if (!child.classList.contains(this.classes.spacer)) return false;

      const prevSection = this.section.previousElementSibling;

      if (!prevSection) return false;

      const prevChildren = [...prevSection.children];

      prevChildren.forEach(item => {
        const itemClasses = classes.filter(className => item.classList.contains(className)),
              childClasses = classes.filter(className => child.classList.contains(className));

        itemClasses.forEach(itemClass => {
          const replaceClass = childClasses.find(childClass => child.classList.contains(childClass));

          if (replaceClass) {
            child.classList.replace(replaceClass, itemClass);
          }
        })
      })
    })
  }
}

const initSpacerSection = (el = ".text-image") => {
  const nodes = document.querySelectorAll(el);

  if (!nodes.length) return false;

  nodes.forEach(node => {
    const spacer = new TextWithImageSpacer(node);
    spacer.init();
  })
}

document.addEventListener("readystatechange", (e) => {
  if (e.target.readyState === "complete") initSpacerSection();
})
