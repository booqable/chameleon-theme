/**
 * ImageLoading Component
 *
 * Handles loading of images with placeholders.
 * Optimizes initial load and uses IntersectionObserver for lazy loading.
 *
 * @requires js-utils-core.js
 */
const handleImageLoading = () => {
  const config = {
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
    }
  }

  const wrappers = document.querySelectorAll(`.${config.classes.wrapper}`),
        mobileWidth = 992;

  if (!wrappers.length) return false;

  let observer = null;

  // Helper function to decode lazy-loaded images
  // Only used for images that are lazy-loaded but become visible
  const decodeImage = (image) => {
    if (!('decode' in image)) return;

    image.decode().catch(() => {
      // Silently fail - the image will still display normally
    })
  }

  const sourcesDataLoad = (mainImage) => {
    const wrapper = mainImage.closest(`.${config.classes.wrapper}`),
          sources = wrapper.querySelectorAll(`source[${config.attributes.sourceSrcset}]`),
          inViewport = $.is($.inViewport, 'function') ? $.inViewport(mainImage) : false,
          slowConnection = $.slowConnection();

    const setAttributeHandle = () => {
      sources.forEach(source => {
        const dataSrc = source.getAttribute(config.attributes.sourceSrcset);

        if (dataSrc) {
          source.setAttribute('srcset', dataSrc);
          source.removeAttribute(config.attributes.sourceSrcset);

          // Use Priority Hints if available (experimental)
          if ('importance' in source && !slowConnection && inViewport) {
            source.importance = 'high';
          } else if ('importance' in source && slowConnection) {
            source.importance = 'low';
          }
        }
      })
    }

    if (sources.length) setAttributeHandle();

    const mainSrcset = mainImage.getAttribute(config.attributes.mainSrcset);

    if (mainSrcset) {
      mainImage.setAttribute('srcset', mainSrcset);
      mainImage.removeAttribute(config.attributes.mainSrcset);
      mainImage.decoding = inViewport ? 'sync' : 'async';

      // Try to use more modern image decoding methods if available
      if (inViewport && mainImage.complete) decodeImage(mainImage);

      // Set high priority for images in viewport
      if ($.isFetchPriority()) {
        mainImage.fetchPriority = inViewport ? 'high' : 'low';
      }

      if ('importance' in mainImage) {
        mainImage.importance = inViewport ? 'high' : 'auto';
      }
    }
  }

  const imageFadeIn = (mainImage, placeholder) => {
    sourcesDataLoad(mainImage);

    mainImage.classList.replace(config.classes.hidden, config.classes.loaded);

    if (placeholder) {
      placeholder.style.opacity = '0'

      const placeholderRemove = () => placeholder.remove();
      $.eventListener('add', placeholder, 'transitionend', placeholderRemove, { once: true });
    }
  }

  const loadMainImg = (mainImage) => {
    if (!mainImage.classList.contains(config.classes.main)) return;
    if (!mainImage.classList.contains(config.classes.hidden)) return;

    const wrapper = mainImage.closest(`.${config.classes.wrapper}`),
          placeholder = wrapper && wrapper.querySelector(`.${config.classes.placeholder}`);

    const imagePriorityLow = () => {
      mainImage.decoding = 'async';
      if ($.isFetchPriority()) mainImage.fetchPriority = 'low';
      mainImage.setAttribute('importance', 'low');
    }

    const imagePriorityHigh = () => {
      const inView = $.is($.inViewport, 'function') ? $.inViewport(mainImage) : false;
      if (inView && $.isFetchPriority()) mainImage.fetchPriority = 'high';
    }

    // Apply connection-aware optimizations
    $.slowConnection()
      ? imagePriorityLow()
      : imagePriorityHigh();

    // Listen for when mainImage is really loaded (from network)
    const imageLoadHandler = () => imageFadeIn(mainImage, placeholder);

    mainImage.complete
      ? imageFadeIn(mainImage, placeholder)
      : $.eventListener('add', mainImage, 'load', imageLoadHandler, { once: true })
  }

  const handleIntersection = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadMainImg(entry.target); // When the image enters the viewport, load it
        const obs = getObserver();
        if (obs) obs.unobserve(entry.target);
      }
    })
  }

  const getObserver = () => {
    if (observer === null) {
      if ($.is($.intersectionObserver, 'function')) {
        observer = $.intersectionObserver(handleIntersection);
      }
    }

    return observer;
  }

  wrappers.forEach(wrapper => {
    const mainImage = wrapper.querySelector(`.${config.classes.main}`),
          placeholder = wrapper.querySelector(`.${config.classes.placeholder}`);

    if (!mainImage || !placeholder) return;
    if (!mainImage.classList.contains(config.classes.hidden)) return;

    const inView = $.is($.inViewport, 'function') ? $.inViewport(mainImage) : false

    if (inView) {
      loadMainImg(mainImage)
    } else {
      const obs = getObserver();
      if (obs) obs.observe(mainImage);
    }
  })

  const viewportSizeFallback = () => ({
    height: window.innerHeight,
    width: window.innerWidth
  })

  const viewportSize = $.viewportSize && $.is($.viewportSize, 'function')
    ? $.viewportSize
    : viewportSizeFallback

  // Add a function to prioritize visible images with adaptive loading strategy
  const prioritizeVisibleImages = () => {
    const notLoadedImages = document.querySelectorAll(`.${config.classes.main}.${config.classes.hidden}`);
    if (!notLoadedImages.length) return;

    const viewport = viewportSize(),
          slowConnection = $.slowConnection(),
          lowMemory = navigator.deviceMemory && navigator.deviceMemory < 4,
          isMobile = viewport.width < mobileWidth;

    // Create adaptive loading ranges based on device capabilities
    // More conservative thresholds for low-end devices or slow connections
    const viewportMultiplier = slowConnection || lowMemory
      ? 1.5  // Conservative loading for low-end devices
      : isMobile
        ? 2.0  // Moderate preloading for mobile
        : 3.0; // Aggressive preloading for desktop

    const checkVisibility = (img) => {
      if ($.is($.inViewport, 'function') && $.inViewport(img)) {
        return { visible: true, inViewport: true };
      }

      const rect = img.getBoundingClientRect(),
            viewportHeight = viewport.height,
            isNearViewport = rect.top < viewportHeight * viewportMultiplier;

      return { visible: isNearViewport, inViewport: false };
    }

    const processImageByVisibility = (img) => {
      const { visible, inViewport } = checkVisibility(img);

      if (!visible) return;

      if ($.isFetchPriority()) {
        img.fetchPriority = inViewport ? 'high' : 'auto';
      }

      loadMainImg(img);
      const obs = getObserver();
      if (obs) obs.unobserve(img);
    }

    $.batchDOM(() => {
      notLoadedImages.forEach(processImageByVisibility);
    })
  }

  // Store handlers for proper cleanup
  const windowLoadHandler = () => {
    const notLoadedImages = document.querySelectorAll(`.${config.classes.main}.${config.classes.hidden}`);
    if (!notLoadedImages.length) return;

    // Detect device capabilities
    const viewport = viewportSize(),
          slowConnection = $.slowConnection(),
          lowMemory = navigator.deviceMemory && navigator.deviceMemory < 4,
          hasReducedData = navigator.connection && navigator.connection.saveData;

    // Helper function to process images by their distance from viewport
    const processImagesByDistance = (images, multiplier) => {
      images.forEach(img => {
        const rect = img.getBoundingClientRect(),
              viewportHeight = viewport.height;

        // Only load images within calculated distance of viewport
        if (rect.top < viewportHeight * multiplier) {
          loadMainImg(img);
          const obs = getObserver();
          if (obs) obs.unobserve(img);
        }
      })
    }

    const limitedLoadingHandler = () => {
      // Use a more conservative loading strategy for limited devices
      // Batch operations for better performance
      const viewportMultiplier = slowConnection ? 2 : (lowMemory ? 3 : 4);

      $.batchDOM(() => {
        processImagesByDistance(notLoadedImages, viewportMultiplier);
      })
    }

    const defineImageChunk = (start, end) => {
      for (let i = start; i < end; i++) {
        const img = notLoadedImages[i];
        loadMainImg(img);
        const obs = getObserver();
        if (obs) obs.unobserve(img);
      }
    }

    const imageChunkHandler = () => {
      // On fast connections with good devices, load all remaining images
      // Split loading into chunks for better performance
      const chunkSize = 5,
            totalImages = notLoadedImages.length;

      const loadImageChunk = (startIndex) => {
        const endIndex = Math.min(startIndex + chunkSize, totalImages);

        $.batchDOM(() => {
          defineImageChunk(startIndex, endIndex);
        })

        // Load next chunk if there are more images
        if (endIndex < totalImages) {
          $.requestIdle(() => loadImageChunk(endIndex), { timeout: 100 });
        }
      }

      loadImageChunk(0);
    }

    // Determine loading strategy based on device capabilities and preferences
    slowConnection || lowMemory || hasReducedData
      ? limitedLoadingHandler()
      : imageChunkHandler();
  }

  prioritizeVisibleImages();

  // Also handle any remaining images on full load
  $.eventListener('add', window, 'load', windowLoadHandler);

  // Provide a cleanup function for proper memory management
  const cleanup = () => {
    $.eventListener('remove', window, 'load', windowLoadHandler);

    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  return cleanup;
}

// Initialize file immediately because it's included in non_critical scripts
window.cleanupImageLoading = handleImageLoading();

const originalCleanup = window.cleanupImageLoading;
window.cleanupImageLoading = () => {
  if ($.is(originalCleanup, 'function')) {
    originalCleanup();
    window.cleanupImageLoading = () => {}; // Replace with no-op after cleanup
  }
}
