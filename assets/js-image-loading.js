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
        mobileWidth = 992; // Define mobile width for responsive design

  if (!wrappers.length) return false;

  let observer = null;

  // Detect modern image format support (the results may be cached in Utils.imageFormats)
  // This object holds browser format support information
  const formatSupport = {
    webp: false,
    avif: false
  }

  // Initialize format detection with minimal overhead
  // Only needed to determine which <source> elements to load for performance
  const initFormatSupport = async () => {
    try {
      // Utils.imageFormats already implements efficient caching,
      // so we don't need to worry about duplicate checks
      const formats = await $.imageFormats();
      formatSupport.webp = formats.webp;
      formatSupport.avif = formats.avif;

      // We could optionally store this in localStorage to avoid
      // even the minimal detection overhead on repeat visits, but
      // the existing checks are already very efficient
    } catch (err) {
      // Fail gracefully - browser will load appropriate formats
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Format detection failed, loading all formats');
      }
    }
  }

  initFormatSupport();

  // Helper function to decode images using the most appropriate method
  const decodeImage = (image) => {
    if ('decode' in image) {
      image.decode().catch(() => {}) // Use .decode() first as it's more widely supported
    } else if ('createImageBitmap' in window) {
      createImageBitmap(image).catch(() => {}) // Fallback to createImageBitmap for older browsers that support it
    }
  }

  const sourcesDataLoad = (mainImage) => {
    const wrapper = mainImage.closest(`.${config.classes.wrapper}`),
          sources = wrapper.querySelectorAll(`source[${config.attributes.sourceSrcset}]`),
          inViewport = $.is($.inViewport, 'function') ? $.inViewport(mainImage) : false,
          slowConnection = $.slowConnection();

    if (sources.length) {
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

    const mainSrcset = mainImage.getAttribute(config.attributes.mainSrcset);

    if (mainSrcset) {
      mainImage.setAttribute('srcset', mainSrcset);
      mainImage.removeAttribute(config.attributes.mainSrcset);
      mainImage.decoding = inViewport ? 'sync' : 'async'; // Set decoding attribute for better performance

      // Try to use more modern image decoding methods if available
      if (inViewport && mainImage.complete) decodeImage(mainImage);

      // Set high priority for images in viewport
      if ($.isFetchPriority()) {
        mainImage.fetchPriority = inViewport ? 'high' : 'low';
      }

      // Also use the experimental importance attribute if available
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

      const placeholderRemove = () => placeholder.remove(); // Use Utils for event listener
      $.eventListener('add', placeholder, 'transitionend', placeholderRemove, { once: true });
    }
  }

  const loadMainImg = (mainImage) => {
    if (!mainImage.classList.contains(config.classes.main)) return;
    if (!mainImage.classList.contains(config.classes.hidden)) return; // Skip if the image doesn't have the hidden class (already loaded or eager)

    const wrapper = mainImage.closest(`.${config.classes.wrapper}`),
          placeholder = wrapper && wrapper.querySelector(`.${config.classes.placeholder}`);

    const imagePriorityLow = () => {
      mainImage.decoding = 'async'; // For slow connections, use async decoding and lower priority

      if ($.isFetchPriority()) mainImage.fetchPriority = 'low';

      mainImage.setAttribute('importance', 'low'); // On slow connections, set importance attribute if supported
    }

    const imagePriorityHigh = () => {
      // For faster connections, check if in viewport and optimize accordingly
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

  // Initialize and return the observer when needed
  const getObserver = () => {
    // Only create observer once and cache it
    if (observer === null) {
      // Safely check if Utils exists before using
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

    // Safely check if Utils exists before using inViewport
    const inView = $.is($.inViewport, 'function') ? $.inViewport(mainImage) : false

    if (inView) {
      loadMainImg(mainImage)
    } else {
      const obs = getObserver();
      if (obs) obs.observe(mainImage);
    }
  })

  // Use Utils.viewportSize if available, otherwise fallback to local implementation
  const viewportSize = ($.viewportSize && $.is($.viewportSize, 'function'))
    ? $.viewportSize
    : () => ({
        height: window.innerHeight,
        width: window.innerWidth
      })

  // Add a function to prioritize visible images with adaptive loading strategy
  const prioritizeVisibleImages = () => {
    // Only select images with the hidden class (lazy-loaded images)
    const notLoadedImages = document.querySelectorAll(`.${config.classes.main}.${config.classes.hidden}`);
    if (!notLoadedImages.length) return;

    // Detect device capabilities for adaptive loading
    const viewport = viewportSize(),
          slowConnection = $.slowConnection(),
          lowMemory = navigator.deviceMemory && navigator.deviceMemory < 4,
          isMobile = viewport.width < mobileWidth;

    // Create adaptive loading ranges based on device capabilities
    // More conservative thresholds for low-end devices or slow connections
    const viewportMultiplier = (slowConnection || lowMemory)
      ? 1.5  // Conservative loading for low-end devices
      : isMobile
        ? 2.0  // Moderate preloading for mobile
        : 3.0; // Aggressive preloading for desktop

    // Optimized visibility check function
    const checkVisibility = (img) => {
      // Always load if directly in viewport
      if ($.is($.inViewport, 'function') && $.inViewport(img)) {
        return { visible: true, inViewport: true };
      }

      // Check if near viewport for preloading
      const rect = img.getBoundingClientRect(),
            viewportHeight = viewport.height,
            isNearViewport = rect.top < viewportHeight * viewportMultiplier;

      return { visible: isNearViewport, inViewport: false };
    }

    // Process a single image based on its visibility status
    const processImageByVisibility = (img) => {
      const { visible, inViewport } = checkVisibility(img);

      if (!visible) return;

      // Set proper priority based on visibility
      if ($.isFetchPriority()) {
        img.fetchPriority = inViewport ? 'high' : 'auto';
      }

      // Load the image and remove it from observation
      loadMainImg(img);
      const obs = getObserver();
      if (obs) obs.unobserve(img);
    }

    $.batchDOM(() => {
      notLoadedImages.forEach(processImageByVisibility);
    })
  }

  // Store handlers for proper cleanup
  const domContentLoadedHandler = prioritizeVisibleImages;
  const windowLoadHandler = () => {
    // Only select images with the hidden class (lazy-loaded images)
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

    const defineImageChunk = (s, e) => {
      for (let i = s; i < e; i++) {
        // No need for distance check in this case - we want to load all images
        const img = notLoadedImages[i];
        loadMainImg(img);
        const obs = getObserver();
        if (obs) obs.unobserve(img);
      }
    }

    const imageChunkHandler = () => {
      // On fast connections with good devices, load all remaining images
      // Split loading into chunks for better performance
      const chunkSize = 10,
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

      // Start loading the first chunk
      loadImageChunk(0);
    }

    // Determine loading strategy based on device capabilities and preferences
    slowConnection || lowMemory || hasReducedData
      ? limitedLoadingHandler()
      : imageChunkHandler();
  }

  // Since this file is loaded as non-critical, we load it immediately
  prioritizeVisibleImages();

  // Also handle any remaining images on full load
  $.eventListener('add', window, 'load', windowLoadHandler);

  // Provide a cleanup function for proper memory management
  const cleanup = () => {
    // Remove event listeners - only window.load since we don't use DOMContentLoaded anymore
    $.eventListener('remove', window, 'load', windowLoadHandler);

    // Disconnect observer if it exists
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  return cleanup;
}

// Since this file is included in non-critical scripts that load after
// the initial page render, we can initialize it immediately
window.cleanupImageLoading = handleImageLoading();

// Wrap the original cleanup function to ensure it's only called once
const originalCleanup = window.cleanupImageLoading;
window.cleanupImageLoading = () => {
  if ($.is(originalCleanup, 'function')) {
    originalCleanup();
    window.cleanupImageLoading = () => {}; // Replace with no-op after cleanup
  }
}
