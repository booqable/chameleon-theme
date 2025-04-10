const handleImageLoading = () => {
  const imageOptions = {
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

  const wrappers = document.querySelectorAll(`.${imageOptions.classes.wrapper}`);
  if (!wrappers.length) return false;

  const sourcesDataLoad = (mainImage) => {
    const wrapper = mainImage.closest(`.${imageOptions.classes.wrapper}`),
          sources = wrapper.querySelectorAll(`source[${imageOptions.attributes.sourceSrcset}]`);

    if (sources.length) {
      sources.forEach(source => {
        const dataSrc = source.getAttribute(`${imageOptions.attributes.sourceSrcset}`);

        if (dataSrc) {
          source.setAttribute('srcset', dataSrc);
          source.removeAttribute(`${imageOptions.attributes.sourceSrcset}`);
        }
      })
    }

    const mainSrcset = mainImage.getAttribute(`${imageOptions.attributes.mainSrcset}`);

    if (mainSrcset) {
      mainImage.setAttribute('srcset', mainSrcset);
      mainImage.removeAttribute(`${imageOptions.attributes.mainSrcset}`);
    }
  }

  const imageFadeIn = (mainImage, placeholder) => {
    sourcesDataLoad(mainImage);

    mainImage.classList.replace(imageOptions.classes.hidden, imageOptions.classes.loaded);

    if (placeholder) {
      placeholder.style.opacity = '0'
      placeholder.addEventListener('transitionend', () => placeholder.remove(), { once: true })
    }
  }

  const loadMainImage = (mainImage) => {
    if (!mainImage.classList.contains(`${imageOptions.classes.main}`)) return;

    // Skip if the image doesn't have the hidden class (already loaded or eager)
    if (!mainImage.classList.contains(imageOptions.classes.hidden)) return;

    const wrapper = mainImage.closest(`.${imageOptions.classes.wrapper}`),
          placeholder = wrapper && wrapper.querySelector(`.${imageOptions.classes.placeholder}`);

    // Listen for when mainImage is really loaded (from network)
    mainImage.complete
      ? imageFadeIn(mainImage, placeholder)
      : mainImage.addEventListener('load', () => imageFadeIn(mainImage, placeholder), { once: true })
  }

  const handleIntersection = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadMainImage(entry.target);// When the image enters the viewport, load it
        const obs = getObserver();
        if (obs) obs.unobserve(entry.target);
      }
    })
  }

  // Instead of creating the observer immediately, create a function that gets or creates it on demand
  const utils = window.Utils;
  const isFunc = (obj) => typeof obj === 'function';
  let observer = null;

  const getObserver = () => {
    // Only create observer once and cache it
    if (observer === null) {
      // Safely check if Utils exists before using
      if (utils && isFunc(utils.createObserver)) {
        observer = utils.createObserver(handleIntersection);
      }
    }

    return observer;
  }

  wrappers.forEach(wrapper => {
    const mainImage = wrapper.querySelector(`.${imageOptions.classes.main}`),
          placeholder = wrapper.querySelector(`.${imageOptions.classes.placeholder}`);

    if (!mainImage || !placeholder) return;

    // Skip if the image doesn't have the hidden class (means it's eager loaded)
    if (!mainImage.classList.contains(imageOptions.classes.hidden)) return;

    // Safely check if Utils exists before using inViewport
    const isInView = utils && isFunc(utils.inViewport)
                    ? utils.inViewport(mainImage)
                    : false

    if (isInView) {
      loadMainImage(mainImage);
    } else {
      const obs = getObserver();
      if (obs) obs.observe(mainImage);
    }
  })

  // Add a function to prioritize visible images
  const prioritizeVisibleImages = () => {
    // Only select images with the hidden class (lazy-loaded images)
    const notLoadedImages = document.querySelectorAll(`.${imageOptions.classes.main}.${imageOptions.classes.hidden}`);

    notLoadedImages.forEach(img => {
      // Safely check if Utils exists before using inViewport
      const isInView = utils && isFunc(utils.inViewport)
                      ? utils.inViewport(img)
                      : false;

      if (isInView) {
        loadMainImage(img);
        const obs = getObserver();
        if (obs) obs.unobserve(img);
      }
    })
  }

  // Call on DOMContentLoaded for early loading of visible images
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', prioritizeVisibleImages)
    : prioritizeVisibleImages()

  // Also handle any remaining images on full load
  window.addEventListener('load', () => {
    // Only select images with the hidden class (lazy-loaded images)
    const notLoadedImages = document.querySelectorAll(`.${imageOptions.classes.main}.${imageOptions.classes.hidden}`);

    notLoadedImages.forEach(img => {
      loadMainImage(img);
      const obs = getObserver();
      if (obs) obs.unobserve(img);
    })
  })
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', handleImageLoading)
  : handleImageLoading()
