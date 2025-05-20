
/**
 * ImageLoading Component
 *
 * Handles loading of images with placeholders.
 * Optimizes initial load and uses IntersectionObserver for lazy loading.
 *
 * @requires js-utils-core.js
 */

const ImageConfig = {
  attr: {
    sourceSrcset: 'data-source-srcset',
    mainSrcset: 'data-srcset'
  },
  classes: {
    hidden: 'hidden',
    loaded: 'loaded',
    main: 'image-main',
    placeholder: 'image-placeholder',
    wrapper: 'image-wrapper'
  },
  viewport: {
    mobileWidth: 992,
    defaultMultiplier: 2.5,
    mobileMultiplier: 2.0,
    lowMultiplier: 1.5,
    chunkSize: 5
  }
}

const ImageVisibility = {
  observer: null,
  observerSetup: false,

  setIntersectionObserver() {
    if (this.observerSetup) return this.observer;

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        ImageLoader.loadImage(entry.target);
        this.unobserve(entry.target);
      })
    }

    this.observer = $.intersectionObserver(observerCallback);
    this.observerSetup = true;

    return this.observer;
  },

  cleanup() {
    if (!this.observer) return;
    this.observer.disconnect();
    this.observer = null;
    this.observerSetup = false;
  },

  observe(element) {
    if (!this.observer) return;
    this.observer.observe(element);
  },

  unobserve(element) {
    if (!this.observer) return;
    this.observer.unobserve(element);
  },

  checkVisibility(img, multiplier) {
    if ($.inViewport(img)) return { visible: true, inViewport: true };

    const viewport = ImageDevice.getViewportSize(),
          rect = img.getBoundingClientRect(),
          isNearViewport = rect.top < viewport.height * multiplier;

    return { visible: isNearViewport, inViewport: false };
  }
}

const ImageDevice = {
  getViewportSize() { return $.viewportSize() },

  lowMemory() {
    return navigator.deviceMemory && navigator.deviceMemory < 4;
  },

  reducedData() {
    return navigator.connection && navigator.connection.saveData;
  },

  isMobile() {
    return this.getViewportSize().width < ImageConfig.viewport.mobileWidth;
  },

  getAdaptiveMultiplier() {
    if ($.slowConnection() || this.lowMemory()) {
      return ImageConfig.viewport.lowMultiplier;
    }
    return this.isMobile()
      ? ImageConfig.viewport.mobileMultiplier
      : ImageConfig.viewport.defaultMultiplier;
  }
}

const ImageLoader = {
  decodeImage(image) {
    if (!('decode' in image)) return;
    image.decode().catch(() => {
      // Silently fail - the image will still display normally
    })
  },

  loadSources(mainImage) {
    const wrapper = mainImage.closest(`.${ImageConfig.classes.wrapper}`);
    if (!wrapper) return;

    const sources = wrapper.querySelectorAll(`source[${ImageConfig.attr.sourceSrcset}]`),
          inViewport = $.inViewport(mainImage);

    sources.forEach(source => {
      const dataSrc = source.getAttribute(ImageConfig.attr.sourceSrcset);
      if (!dataSrc) return;

      source.setAttribute('srcset', dataSrc);
      source.removeAttribute(ImageConfig.attr.sourceSrcset);

      if ('importance' in source) {
        source.importance = (inViewport && !$.slowConnection()) ? 'high' : 'low';
      }
    })

    const mainSrcset = mainImage.getAttribute(ImageConfig.attr.mainSrcset);
    if (!mainSrcset) return;

    const setMainImage = () => {
      mainImage.setAttribute('srcset', mainSrcset);
      mainImage.removeAttribute(ImageConfig.attr.mainSrcset);
      mainImage.decoding = inViewport ? 'sync' : 'async';

      if ($.isFetchPriority()) {
        mainImage.fetchPriority = inViewport ? 'high' : 'low';
      }

      if ('importance' in mainImage) {
        mainImage.importance = inViewport ? 'high' : 'auto';
      }
    }

    $.batchDOM(setMainImage)

    if (!inViewport && !mainImage.complete) return;
    this.decodeImage(mainImage);
  },

  fadeInImage(mainImage, placeholder) {
    this.loadSources(mainImage);

    $.toggleClass(mainImage, ImageConfig.classes.hidden, false);
    $.toggleClass(mainImage, ImageConfig.classes.loaded, true);

    if (!placeholder) return;

    placeholder.style.opacity = '0';
    const removePlaceholder = () => placeholder.remove();
    $.eventListener('add', placeholder, 'transitionend', removePlaceholder, { once: true, passive: true });
  },

  loadImage(mainImage) {
    if (!mainImage.classList.contains(ImageConfig.classes.main)) return;
    if (!mainImage.classList.contains(ImageConfig.classes.hidden)) return;

    const wrapper = mainImage.closest(`.${ImageConfig.classes.wrapper}`),
          placeholder = wrapper && wrapper.querySelector(`.${ImageConfig.classes.placeholder}`),
          inViewport = $.inViewport(mainImage);

    if ($.slowConnection()) {
      mainImage.decoding = 'async';
      if ($.isFetchPriority()) mainImage.fetchPriority = 'low';
      mainImage.setAttribute('importance', 'low');
    } else if (inViewport && $.isFetchPriority()) {
      mainImage.fetchPriority = 'high';
    }

    if (mainImage.complete) {
      this.fadeInImage(mainImage, placeholder);
    } else {
      const handleLoad = () => this.fadeInImage(mainImage, placeholder);
      $.eventListener('add', mainImage, 'load', handleLoad, { once: true });
    }
  }
}

const ImageLoadingStrategy = {
  prioritizeVisible() {
    const notLoaded = document.querySelectorAll(
      `.${ImageConfig.classes.main}.${ImageConfig.classes.hidden}`
    )

    if (!notLoaded.length) return;

    const multiplier = ImageDevice.getAdaptiveMultiplier();

    const loadingImages = () => {
      const visibilityResults = [];

      notLoaded.forEach(img => {
        const result = ImageVisibility.checkVisibility(img, multiplier);
        if (!result.visible) return;
        visibilityResults.push({ img, inViewport: result.inViewport });
      })

      visibilityResults.forEach(({ img, inViewport }) => {
        if ($.isFetchPriority()) {
          img.fetchPriority = inViewport ? 'high' : 'auto';
        }

        ImageLoader.loadImage(img);
        ImageVisibility.unobserve(img);
      })
    }

    $.batchDOM(loadingImages)
  },

  // Read phase: identify visible images
  readVisible(images) {
    const multiplier = $.slowConnection() ? 2 : (ImageDevice.lowMemory() ? 3 : 4),
          viewport = ImageDevice.getViewportSize(),
          visibleImages = [];

    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.top >= viewport.height * multiplier) return;
      visibleImages.push(img);
    })

    return visibleImages;
  },

  // Write phase: load identified images
  writeVisible(visibleImages) {
    if (!visibleImages || !visibleImages.length) return;

    const loadingImages = () => {
      visibleImages.forEach(img => {
        ImageLoader.loadImage(img);
        ImageVisibility.unobserve(img);
      })
    }

    $.batchDOM(loadingImages)
  },

  loadLimited(images) {
    // Bind the context to ensure 'this' references the ImageLoadingStrategy
    const readPhase = this.readVisible.bind(this, images),
          writePhase = this.writeVisible.bind(this);

    $.frameSequence(readPhase, writePhase);
  },

  loadInChunks(images) {
    const chunkSize = ImageConfig.viewport.chunkSize,
          totalImages = images.length;

    const loadChunk = (startIndex) => {
      const endIndex = Math.min(startIndex + chunkSize, totalImages);

      const loadingImages = () => {
        for (let i = startIndex; i < endIndex; i++) {
          const img = images[i];
          ImageLoader.loadImage(img);
          ImageVisibility.unobserve(img);
        }
      }

      $.batchDOM(loadingImages)

      if (endIndex >= totalImages) return;

      $.is($.requestIdle, 'function')
        ? $.requestIdle(() => loadChunk(endIndex), { timeout: 100 })
        : setTimeout(() => loadChunk(endIndex), 100);
    }

    loadChunk(0);
  },

  handleWindowLoad() {
    const notLoaded = document.querySelectorAll(
      `.${ImageConfig.classes.main}.${ImageConfig.classes.hidden}`
    )

    if (!notLoaded.length) return;
    const laggy = $.slowConnection() && $.is($.slowConnection, 'function'),
          starved = ImageDevice.lowMemory(),
          trimmed = ImageDevice.reducedData();

    laggy || starved || trimmed
      ? this.loadLimited(notLoaded)
      : this.loadInChunks(notLoaded);
  }
}

const ImageHandler = {
  windowLoadHandler: null,

  init() {
    const wrappers = document.querySelectorAll(`.${ImageConfig.classes.wrapper}`);
    if (!wrappers.length) return false;

    ImageVisibility.setIntersectionObserver();
    this.processImages(wrappers);
    this.setWindowLoad();

    return this.cleanup.bind(this);
  },

  processImages(wrappers) {
    wrappers.forEach(wrapper => {
      const mainImage = wrapper.querySelector(`.${ImageConfig.classes.main}`),
            placeholder = wrapper.querySelector(`.${ImageConfig.classes.placeholder}`);

      if (!mainImage || !placeholder) return;
      if (!mainImage.classList.contains(ImageConfig.classes.hidden)) return;

      $.inViewport(mainImage)
        ? ImageLoader.loadImage(mainImage)
        : ImageVisibility.observe(mainImage);
    })

    // Process any visible images that weren't covered above
    ImageLoadingStrategy.prioritizeVisible();
  },

  setWindowLoad() {
    this.windowLoadHandler = () => ImageLoadingStrategy.handleWindowLoad();
    $.eventListener('add', window, 'load', this.windowLoadHandler, { passive: true });
  },

  cleanup() {
    if (this.windowLoadHandler) {
      $.eventListener('remove', window, 'load', this.windowLoadHandler, { passive: true });
      this.windowLoadHandler = null;
    }

    ImageVisibility.cleanup();
    return null;
  }
}

const initImageLoading = () => {
  window.cleanupImageLoading = ImageHandler.init();

  // Ensure cleanup is idempotent
  const originalCleanup = window.cleanupImageLoading;
  window.cleanupImageLoading = () => {
    if (!$.is(originalCleanup, 'function')) return;
    originalCleanup();
    window.cleanupImageLoading = () => {}; // Replace with no-op after cleanup
  }
}

initImageLoading();
