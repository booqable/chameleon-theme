// Focal Images Handler
// Handles positioning of images based on focal point coordinates

const handleFocalImages = () => {
  const focalImages = document.querySelectorAll('.focal-image');
  const attributes = {
    focalX: 'data-focal-x',
    focalY: 'data-focal-y'
  };

  if (!focalImages || !focalImages.length) return;

  let focalImageTimeout;

  const initFocalPoints = () => {
    // Check if image focus library is loaded
    if (!window.imageFocus) {
      // Wait for library to load and retry
      if (focalImageTimeout) clearTimeout(focalImageTimeout)
      focalImageTimeout = setTimeout(initFocalPoints, 50);
      return;
    }

    // Clear any pending retries
    clearTimeout(focalImageTimeout);

    focalImages.forEach(image => {
      const x = image.getAttribute(attributes.focalX);
      const y = image.getAttribute(attributes.focalY);

      // Apply focal point using the library
      new window.imageFocus(image, {
        focus: {
          x: parseFloat(x) || 0,
          y: parseFloat(y) || 0
        }
      })

      // Make image visible
      image.style.opacity = 1;
    })
  }

  // Use requestAnimationFrame for better performance
  requestAnimationFrame(initFocalPoints)
}

handleFocalImages()
