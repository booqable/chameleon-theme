/**
 * ImageLoading Component
 *
 * Handles loading of images with placeholders.
 * Optimizes initial load and uses IntersectionObserver for lazy loading.
 *
 * @requires js-utils-core.js
 */

const ImageConfig = {
  attributes: {
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
    lowEndMultiplier: 1.5,
    chunkSize: 5
  }
}

const VisibilityManager = {
  observer: null,

  createObserver(callback) {
    if (this.observer !== null) return this.observer;
    if (!$.is($.intersectionObserver, 'function')) return null;

    this.observer = $.intersectionObserver(callback);
    return this.observer;
  },

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
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
    if ($.is($.inViewport, 'function') && $.inViewport(img)) {
      return { visible: true, inViewport: true };
    }

    const viewport = DeviceManager.getViewportSize(),
          rect = img.getBoundingClientRect(),
          isNearViewport = rect.top < viewport.height * multiplier;

    return { visible: isNearViewport, inViewport: false };
  }
}

const DeviceManager = {
  getViewportSize() {
    return $.viewportSize && $.is($.viewportSize, 'function')
      ? $.viewportSize()
      : { width: window.innerWidth, height: window.innerHeight };
  },

  hasLowMemory() {
    return navigator.deviceMemory && navigator.deviceMemory < 4;
  },

  hasReducedData() {
    return navigator.connection && navigator.connection.saveData;
  },

  isMobile() {
    return this.getViewportSize().width < ImageConfig.viewport.mobileWidth;
  },

  getAdaptiveMultiplier() {
    if ($.slowConnection() || this.hasLowMemory()) {
      return ImageConfig.viewport.lowEndMultiplier;
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

    const sources = wrapper.querySelectorAll(`source[${ImageConfig.attributes.sourceSrcset}]`),
          inViewport = $.is($.inViewport, 'function') ? $.inViewport(mainImage) : false;

    sources.forEach(source => {
      const dataSrc = source.getAttribute(ImageConfig.attributes.sourceSrcset);
      if (!dataSrc) return;

      source.setAttribute('srcset', dataSrc);
      source.removeAttribute(ImageConfig.attributes.sourceSrcset);

      if ('importance' in source) {
        source.importance = (inViewport && !$.slowConnection()) ? 'high' : 'low';
      }
    })

    const mainSrcset = mainImage.getAttribute(ImageConfig.attributes.mainSrcset);
    if (!mainSrcset) return;

    $.batchDOM(() => {
      mainImage.setAttribute('srcset', mainSrcset);
      mainImage.removeAttribute(ImageConfig.attributes.mainSrcset);
      mainImage.decoding = inViewport ? 'sync' : 'async';

      if ($.isFetchPriority()) {
        mainImage.fetchPriority = inViewport ? 'high' : 'low';
      }

      if ('importance' in mainImage) {
        mainImage.importance = inViewport ? 'high' : 'auto';
      }
    })

    if (inViewport && mainImage.complete) {
      this.decodeImage(mainImage);
    }
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
          inViewport = $.is($.inViewport, 'function') ? $.inViewport(mainImage) : false;

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

const LoadingStrategy = {
  prioritizeVisible() {
    const notLoadedImages = document.querySelectorAll(
      `.${ImageConfig.classes.main}.${ImageConfig.classes.hidden}`
    )

    if (!notLoadedImages.length) return;

    const multiplier = DeviceManager.getAdaptiveMultiplier();

    $.batchDOM(() => {
      const visibilityResults = [];

      notLoadedImages.forEach(img => {
        const result = VisibilityManager.checkVisibility(img, multiplier);
        if (result.visible) {
          visibilityResults.push({ img, inViewport: result.inViewport });
        }
      })

      visibilityResults.forEach(({ img, inViewport }) => {
        if ($.is($.isFetchPriority, 'function') && $.isFetchPriority()) {
          img.fetchPriority = inViewport ? 'high' : 'auto';
        }

        ImageLoader.loadImage(img);
        VisibilityManager.unobserve(img);
      })
    })
  },

  loadLimited(images) {
    const multiplier = $.slowConnection() ? 2 : (DeviceManager.hasLowMemory() ? 3 : 4),
          viewport = DeviceManager.getViewportSize();

    $.frameSequence(
      // Read phase - gather images that need loading
      () => {
        const visibleImages = [];
        images.forEach(img => {
          const rect = img.getBoundingClientRect();
          if (rect.top < viewport.height * multiplier) {
            visibleImages.push(img);
          }
        })
        return visibleImages;
      },
      // Write phase - load the images
      (visibleImages) => {
        $.batchDOM(() => {
          visibleImages.forEach(img => {
            ImageLoader.loadImage(img);
            VisibilityManager.unobserve(img);
          })
        })
      }
    )
  },

  loadInChunks(images) {
    const chunkSize = ImageConfig.viewport.chunkSize,
          totalImages = images.length;

    const loadChunk = (startIndex) => {
      const endIndex = Math.min(startIndex + chunkSize, totalImages);

      $.batchDOM(() => {
        for (let i = startIndex; i < endIndex; i++) {
          const img = images[i];
          ImageLoader.loadImage(img);
          VisibilityManager.unobserve(img);
        }
      })

      if (endIndex < totalImages) {
        $.requestIdle(() => loadChunk(endIndex), { timeout: 100 });
      }
    }

    loadChunk(0);
  },

  handleWindowLoad() {
    const notLoadedImages = document.querySelectorAll(
      `.${ImageConfig.classes.main}.${ImageConfig.classes.hidden}`
    )

    if (!notLoadedImages.length) return;

    const useConservativeStrategy =
      $.slowConnection() ||
      DeviceManager.hasLowMemory() ||
      DeviceManager.hasReducedData();

    useConservativeStrategy
      ? this.loadLimited(notLoadedImages)
      : this.loadInChunks(notLoadedImages);
  }
}

const handleImageLoading = () => {
  const wrappers = document.querySelectorAll(`.${ImageConfig.classes.wrapper}`);
  if (!wrappers.length) return false;

  VisibilityManager.createObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        ImageLoader.loadImage(entry.target);
        VisibilityManager.unobserve(entry.target);
      }
    })
  })

  wrappers.forEach(wrapper => {
    const mainImage = wrapper.querySelector(`.${ImageConfig.classes.main}`),
          placeholder = wrapper.querySelector(`.${ImageConfig.classes.placeholder}`);

    if (!mainImage || !placeholder) return;
    if (!mainImage.classList.contains(ImageConfig.classes.hidden)) return;

    $.is($.inViewport, 'function') && $.inViewport(mainImage)
      ? ImageLoader.loadImage(mainImage)
      : VisibilityManager.observe(mainImage);
  })

  LoadingStrategy.prioritizeVisible();

  // Handle remaining images on window load
  const windowLoadHandler = () => LoadingStrategy.handleWindowLoad();
  $.eventListener('add', window, 'load', windowLoadHandler, { passive: true });

  const cleanup = () => {
    $.eventListener('remove', window, 'load', windowLoadHandler, { passive: true });
    VisibilityManager.cleanup();
  }

  return cleanup;
}

window.cleanupImageLoading = handleImageLoading();

// Ensure cleanup is idempotent
const originalCleanup = window.cleanupImageLoading;
window.cleanupImageLoading = () => {
  if ($.is(originalCleanup, 'function')) {
    originalCleanup();
    window.cleanupImageLoading = () => {}; // Replace with no-op after cleanup
  }
}
