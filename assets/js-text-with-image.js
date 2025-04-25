/**
 * Text With Image Spacer
 *
 * Ensures that spacer elements in text-with-image sections
 * inherit the correct color palette from the previous section.
 * Optimized for performance with Utils library functions.
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */
const handleTextWithImageSpacer = (section) => {
  if (!section) return null;

  const config = {
    class: {
      spacer: 'text-image__spacer',
      palettes: ['palette-one', 'palette-two', 'palette-three']
    }
  }

  // Cache elements but get previous section on demand
  const getElements = () => ({
    section,
    prevSection: $.getSibling(section, '*', 'prev')
  })

  // Cache checking functions for better performance
  const hasPalette = (el, palette) => el.classList.contains(palette);
  const hasSpacerClass = (el) => el.classList.contains(config.class.spacer);

  const applyPaletteToSpacer = (spacer, prevChild) => {
    let foundPrevPalette = null,
        currentSpacerPalette = null;

    const findPalette = (el) => {
      for (let i = 0; i < config.class.palettes.length; i++) {
        const palette = config.class.palettes[i];

        if (hasPalette(el, palette)) return palette;
      }
      return null;
    }

    foundPrevPalette = findPalette(prevChild); // Find palettes in previous child and current spacer

    if (!foundPrevPalette) return;

    currentSpacerPalette = findPalette(spacer); // Find the current palette in the spacer

    // Apply palette class efficiently using Utils with frame sequencing
    const applyClasses = () => {
      if (currentSpacerPalette && currentSpacerPalette !== foundPrevPalette) {
        // Use frameSequence for better performance and transition handling
        $.frameSequence(
          // Read phase - no actual reads needed here, just prepare data
          () => ({
            remove: currentSpacerPalette,
            add: foundPrevPalette
          }),
          // Write phase - perform DOM updates with proper sequencing
          (data) => {
            $.toggleClass(spacer, data.remove, false);
            $.nextFrame(() => $.toggleClass(spacer, data.add, true));
          }
        )
      } else if (!currentSpacerPalette) {
        // No palette on the spacer, just add the one from the previous section
        $.nextFrame(() => $.toggleClass(spacer, foundPrevPalette, true));
      }
    }

    $.batchDOM(applyClasses);
  }

  const setSpacerColors = () => {
    const elements = getElements(),
          prevSection = elements.prevSection;

    if (!prevSection) return;

    const prevChildren = prevSection.children;
    if (!prevChildren || prevChildren.length === 0) return;

    const children = elements.section.children,
          spacers = [],
          prevWithPalettes = [];

    // Use a single function for the detection work
    const findElements = () => {
      for (let i = 0; i < children.length; i++) {
        if (hasSpacerClass(children[i])) {
          spacers.push(children[i]);
        }
      }

      if (spacers.length === 0) return false;

      // Find all previous children with palettes
      for (let i = 0; i < prevChildren.length; i++) {
        const prevChild = prevChildren[i];
        let hasPaletteClass = false;

        // Check if this previous child has any palette class
        for (let j = 0; j < config.class.palettes.length; j++) {
          if (hasPalette(prevChild, config.class.palettes[j])) {
            hasPaletteClass = true;
            break;
          }
        }

        if (hasPaletteClass) {
          prevWithPalettes.push(prevChild);
          break;
        }
      }

      // If no previous children with palettes, signal early exit
      return prevWithPalettes.length > 0;
    }

    if (!findElements()) return;

    // Use the first previous child with a palette for simplicity
    const sourcePalette = prevWithPalettes[0];
    const applyPalettes = () => {
      for (let i = 0; i < spacers.length; i++) {
        applyPaletteToSpacer(spacers[i], sourcePalette);
      }
    }

    // Use batch DOM operations for better performance
    $.batchDOM(applyPalettes);
  }

  const initialize = () => {
    setSpacerColors();
    return true;
  }

  return {
    initialize,
    updateColors: setSpacerColors // Allow manual updates if needed
  }
}

const initTextWithImageSpacer = (selector = '.text-image') => {
  const instances = [],
        sections = document.querySelectorAll(selector);
  if (!sections.length) return;

  const processSections = () => {
    sections.forEach(section => {
      const spacer = handleTextWithImageSpacer(section);
      if (spacer && spacer.initialize()) instances.push(spacer);
    })
  }

  $.batchDOM(processSections);

  return instances;
}

const textWithImageInstances = initTextWithImageSpacer();

// Add global cleanup handler if needed
window.cleanupImageSpacer = () => {
  if (textWithImageInstances && textWithImageInstances.length) {
    textWithImageInstances.length = 0;
  }
}
