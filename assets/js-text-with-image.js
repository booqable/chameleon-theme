/**
 * Text With Image Spacer Component
 *
 * Ensures that spacer of text-with-image section gets
 * the correct color palette from the previous section.
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */

const TextImageConfig = {
  selector: {
    section: '.text-image',
    spacer: '.text-image__spacer'
  },
  palette: {
    one: 'palette-one',
    two: 'palette-two',
    three: 'palette-three'
  },
  palettes: ['palette-one', 'palette-two', 'palette-three']
}

const TextImageDOM = {
  elements: {
    sections: null
  },

  cache: {
    spacers: new Map(),
    prevSections: new Map()
  },

  init() {
    this.elements.sections = document.querySelectorAll(TextImageConfig.selector.section);
    return this.elements.sections && this.elements.sections.length > 0;
  },

  getPreviousSection(section) {
    if (!section) return null;

    if (this.cache.prevSections.has(section)) {
      return this.cache.prevSections.get(section);
    }

    const prevSection = $.getSibling(section, '*', 'prev');
    this.cache.prevSections.set(section, prevSection);

    return prevSection;
  },

  getSpacer(section) {
    if (!section) return null;
    if (this.cache.spacers.has(section)) {
      return this.cache.spacers.get(section);
    }

    // Since there's only one spacer per section, find it directly
    const spacer = section.querySelector('.' + TextImageConfig.selector.spacer.substring(1));

    this.cache.spacers.set(section, spacer);
    return spacer;
  },

  cleanup() {
    this.cache.spacers.clear();
    this.cache.prevSections.clear();

    Object.keys(this.elements).forEach(key => {
      this.elements[key] = null;
    })
  }
}

const TextImagePaletteDetector = {
  findPaletteInElement(el) {
    if (!el) return null;

    for (const palette of TextImageConfig.palettes) {
      if (el.classList.contains(palette)) return palette;
    }

    return null;
  },

  findSourceElement(prevSection) {
    if (!prevSection || !prevSection.children || prevSection.children.length === 0) {
      return null;
    }

    for (const child of prevSection.children) {
      const palette = this.findPaletteInElement(child);

      if (palette) return { element: child, palette };
    }

    return null;
  }
}

const TextImageRenderer = {
  // Read phase - gather palette information
  readPaletteData(spacer, sourceElement) {
    if (!spacer || !sourceElement) return null;

    const prevPalette = TextImagePaletteDetector.findPaletteInElement(sourceElement);
    const currentPalette = TextImagePaletteDetector.findPaletteInElement(spacer);

    if (!prevPalette) return null;

    return {
      currentPalette,
      prevPalette,
      needsUpdate: !currentPalette || currentPalette !== prevPalette
    }
  },

  // Write phase - apply palette changes
  writePaletteChanges(data) {
    if (!data || !data.spacer || !data.needsUpdate) return;

    if (data.currentPalette) {
      data.spacer.classList.remove(data.currentPalette);
    }

    data.spacer.classList.add(data.prevPalette);
  },

  // Apply palette to a single spacer
  applyPalette(spacer, sourceElement) {
    if (!spacer || !sourceElement) return;

    // Read phase
    const readPhase = () => {
      const paletteData = this.readPaletteData(spacer, sourceElement);
      if (!paletteData) return null;

      return { ...paletteData, spacer }
    }

    // Write phase
    const writePhase = (data) => {
      this.writePaletteChanges(data);
    }

    $.frameSequence(readPhase, writePhase);
  }
}

const TextImageProcessor = {
  // Read phase - gather information about section
  readSectionData(section) {
    if (!section) return null;

    const prevSection = TextImageDOM.getPreviousSection(section);
    if (!prevSection) return null;

    const spacer = TextImageDOM.getSpacer(section);
    if (!spacer) return null;

    const sourceInfo = TextImagePaletteDetector.findSourceElement(prevSection);
    if (!sourceInfo) return null;

    return {
      spacer,
      sourceElement: sourceInfo.element
    }
  },

  // Write phase - apply palette to the spacer
  writePaletteToSection(data) {
    if (!data || !data.spacer || !data.sourceElement) return;

    // Process the spacer with proper separation of reads and writes
    TextImageRenderer.applyPalette(data.spacer, data.sourceElement);
  },

  processSingleSection(section) {
    if (!section) return;

    // Bind the context to ensure 'this' references the TextImageProcessor
    const readPhase = this.readSectionData.bind(this),
          writePhase = this.writePaletteToSection.bind(this);

    $.frameSequence(readPhase, writePhase);
  },

  // Read phase - prepare all sections
  readAllSectionsData() {
    const sections = TextImageDOM.elements.sections;
    if (!sections || !sections.length) return null;

    return Array.from(sections);
  },

  // Write phase - process all sections
  writeAllSectionsData(sections) {
    if (!sections || !sections.length) return;

    sections.forEach(section => {
      this.processSingleSection(section);
    })
  },

  processAllSections() {
    // Bind the context to ensure 'this' references the TextImageProcessor
    const readPhase = this.readAllSectionsData.bind(this),
          writePhase = this.writeAllSectionsData.bind(this);

    $.frameSequence(readPhase, writePhase);
  }
}

const handleTextWithImage = () => {
  if (!TextImageDOM.init()) return null;

  TextImageProcessor.processAllSections();

  const cleanup = () => {
    TextImageDOM.cleanup();
    return null;
  }

  return cleanup;
}

const initTextWithImage = () => {
  window.cleanupImageSpacer = handleTextWithImage();

  // Ensure cleanup is idempotent
  const originalCleanup = window.cleanupImageSpacer;
  window.cleanupImageSpacer = () => {
    if (!$.is(originalCleanup, 'function')) return;
    originalCleanup();
    window.cleanupImageSpacer = () => {}; // Replace with no-op after cleanup
  }

  const themeCleanupHandler = () => {
    const originalThemeCleanup = window.themeCleanup;
    window.themeCleanup = () => {
      if (window.cleanupImageSpacer) window.cleanupImageSpacer();
      originalThemeCleanup();
    }
  }
  if (window.themeCleanup) themeCleanupHandler();
}

initTextWithImage();
