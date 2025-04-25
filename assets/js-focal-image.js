
/**
 * Focal Images Handler
 * Converts Booqable focal point coordinates to CSS object-position
 *
 * Booqable uses a coordinate system between -1 and 1 where:
 * - X: -1 (far left) to 1 (far right) with 0 being center
 * - Y: -1 (top) to 1 (bottom) with 0 being center
 *
 * CSS object-position uses percentages where:
 * - X: 0% (far left) to 100% (far right) with 50% being center
 * - Y: 0% (top) to 100% (bottom) with 50% being center
 *
 * Performance optimizations:
 * - Uses IntersectionObserver to only process images as they enter viewport
 * - Uses batchDOM to batch style changes
 * - Caches computed values for efficiency
 */
const handleFocalImages = () => {
  const focalImages = document.querySelectorAll('.focal-image');

  if (!focalImages || !focalImages.length) return;

  // Map to cache computed values
  const computedPositions = new Map();

  /**
   * Convert coordinates (-1 to 1) to CSS percentages (0% to 100%)
   * @param {number} coordinate - Value between -1 and 1
   * @returns {string} - CSS percentage value
   */
  const convertCoordinateToPercentage = (coordinate) => {
    const value = parseFloat(coordinate) || 0;

    // Convert from (-1 to 1) range to (0% to 100%) range
    // The formula is: percentage = (coordinate + 1) * 50
    const percentage = (value + 1) * 50;

    // Ensure the value stays within 0-100% range
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    return `${clampedPercentage}%`;
  }

  const processFocalImage = (image) => {
    if (image.dataset.focalProcessed === 'true') return;

    const focalX = image.getAttribute('data-focal-x');
    const focalY = image.getAttribute('data-focal-y');

    if (focalX !== null && focalY !== null) {
      const positionKey = `${focalX}_${focalY}`;

      let position = computedPositions.get(positionKey);

      if (!position) {
        const objectPositionX = convertCoordinateToPercentage(focalX);
        const objectPositionY = convertCoordinateToPercentage(focalY);
        position = `${objectPositionX} ${objectPositionY}`;

        computedPositions.set(positionKey, position);
      }

      $.batchDOM(() => {
        image.style.objectPosition = position;
        image.style.opacity = 1;
        image.dataset.focalProcessed = 'true';
      })
    }
  }

  // Use our Utils.intersectionObserver instead of creating one directly
  const observerCallback = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        processFocalImage(entry.target);
        observer.unobserve(entry.target); // Stop observing this image once processed
      }
    })
  }

  // Check if Utils is available for intersection observer
  const observer = $.intersectionObserver(observerCallback);

  const focalImageCleanup = () => {
    window.cleanupFocalImages = () => {
      if (observer) observer.disconnect();
      computedPositions.clear();
    }
  }

  const focalImageHandler = () => {
    focalImages.forEach(image => {
      observer.observe(image);
    })
    focalImageCleanup();
  }

  observer
    ? focalImageHandler()
    : focalImages.forEach(processFocalImage);
}

handleFocalImages();
