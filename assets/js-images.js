const handleImageLoading = () => {
  const observerOptions = {
    attributes: {
      srcset: 'data-srcset',
      srcsetFallback: 'data-fallback-srcset'
    },
    classes: {
      main: 'image-main',
      placeholder: 'image-placeholder',
      wrapper: 'image-wrapper'
    },
    root: null,         // viewport
    rootMargin: '0px',  // no extra margin
    threshold: 0.01     // trigger as soon as 1% of the image is visible
  }

  const wrappers = document.querySelectorAll(`.${observerOptions.classes.wrapper}`);
  if (!wrappers.length) return false;

  const isInViewport = (el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  const sourcesDataLoad = (mainImage) => {
    const wrapper = mainImage.closest(`.${observerOptions.classes.wrapper}`),
          sources = wrapper.querySelectorAll(`source[${observerOptions.attributes.srcset}]`);

    if (!sources.length) return;

    sources.forEach(source => {
      const dataSrc = source.getAttribute(`${observerOptions.attributes.srcset}`);

      if (dataSrc) {
        source.setAttribute('srcset', dataSrc);
        source.removeAttribute(`${observerOptions.attributes.srcset}`);
      }
    })

    const fallbackSrcset = mainImage.getAttribute(`${observerOptions.attributes.srcsetFallback}`);

    if (fallbackSrcset) {
      mainImage.setAttribute('srcset', fallbackSrcset);
      mainImage.removeAttribute(`${observerOptions.attributes.srcsetFallback}`);
    }
  }

  const imageFadeIn = (mainImage, placeholder) => {
    sourcesDataLoad(mainImage);

    mainImage.style.opacity = '1';

    if (placeholder) {
      placeholder.style.opacity = '0'
      placeholder.addEventListener('transitionend', () => placeholder.remove(), { once: true })
    }
  }

  const loadMainImage = (mainImage) => {
    if (!mainImage.classList.contains(`${observerOptions.classes.main}`)) return;

    const wrapper = mainImage.closest(`.${observerOptions.classes.wrapper}`),
          placeholder = wrapper && wrapper.querySelector(`.${observerOptions.classes.placeholder}`);

    // Listen for when mainImage is really loaded (from network)
    (mainImage.complete)
      ? imageFadeIn(mainImage, placeholder)
      : mainImage.addEventListener('load', () => imageFadeIn(mainImage, placeholder), { once: true })
  }

  const handleIntersection = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // When the image enters the viewport, load it
        loadMainImage(entry.target);
        observer.unobserve(entry.target);
      }
    })
  }

  const observer = new IntersectionObserver(handleIntersection, observerOptions);

  wrappers.forEach(wrapper => {
    const mainImage = wrapper.querySelector(`.${observerOptions.classes.main}`),
          placeholder = wrapper.querySelector(`.${observerOptions.classes.placeholder}`);

    if (!mainImage || !placeholder) return;

    (isInViewport(mainImage))
      ? loadMainImage(mainImage)
      : observer.observe(mainImage)
  })

  window.addEventListener('load', () => {
    const notLoadedImages = document.querySelectorAll(`.${observerOptions.classes.main}`);

    notLoadedImages.forEach(img => {
      loadMainImage(img);
      observer.unobserve(img);
    })
  })
}

(document.readyState === 'loading')
  ? document.addEventListener('DOMContentLoaded', handleImageLoading)
  : handleImageLoading()
