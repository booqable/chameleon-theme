/**
 * Text With Image Spacer
 *
 * Ensures that spacer elements in text-with-image sections
 * inherit the correct color palette from the previous section.
 */
const handleTextWithImageSpacer = (section) => {
  if (!section) return null;

  const config = {
    classes: {
      spacer: 'text-image__spacer',
      palettes: ['palette-one', 'palette-two', 'palette-three']
    },
    selectors: {
      spacer: '.text-image__spacer'
    }
  }

  const elements = {
    children: [...section.children],
    prevSection: section.previousElementSibling
  }

  const applyPaletteToSpacer = (spacer, prevChild) => {
    const prevChildPalettes = config.classes.palettes.filter(
      paletteClass => prevChild.classList.contains(paletteClass)
    )

    const currentSpacerPalettes = config.classes.palettes.filter(
      paletteClass => spacer.classList.contains(paletteClass)
    )

    // Apply palette classes from the previous section to the spacer
    prevChildPalettes.forEach(palette => {
      const currentPalette = currentSpacerPalettes[0]; // Take the first palette if multiple exist

      if (currentPalette && currentPalette !== palette) {
        // Replace the current palette with the one from the previous section
        spacer.classList.replace(currentPalette, palette);
      } else if (!currentPalette) {
        // No palette on the spacer, just add the one from the previous section
        spacer.classList.add(palette);
      }
    })
  }

  const setSpacerColors = () => {
    if (!elements.prevSection) return;

    const prevChildren = [...elements.prevSection.children];
    if (!prevChildren.length) return;

    elements.children.forEach(child => {
      if (!child.classList.contains(config.classes.spacer)) return;

      // Apply palette from each element in previous section
      prevChildren.forEach(prevChild => {
        applyPaletteToSpacer(child, prevChild);
      })
    })
  }

  const initialize = () => setSpacerColors();

  return {
    initialize
  }
}

const initTextWithImageSpacer = (selector = '.text-image') => {
  const sections = document.querySelectorAll(selector);
  if (!sections.length) return;

  sections.forEach(section => {
    const spacer = handleTextWithImageSpacer(section);
    if (spacer) spacer.initialize();
  })
}

initTextWithImageSpacer();
