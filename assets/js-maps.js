/**
 * Map Loading Component
 *
 * Initializes OpenStreetMap maps for location blocks with performance optimizations.
 * Uses lazy loading strategy to only render maps when they're needed.
 *
 * Performance optimizations:
 * - Uses async/await for data fetching
 * - Uses IntersectionObserver to only process maps as they enter viewport
 * - Uses requestIdle for non-critical operations
 * - Only initializes maps that are visible or will be visible soon
 * - Batches DOM operations for better performance
 * - Caches data for efficiency
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */
const handleLocationMaps = () => {
  const config = {
    selector: {
      wrapper: '.locations__wrapper',
      map: '.map',
      icon: '.map-icon__image',
      link: '.tabs__link',
      tabsInput: '.tabs__input',
      tabsContent: '.tabs__content'
    },
    attribute: {
      id: 'id',
      href: 'href',
      address: 'data-address',
      processed: 'data-map-processed'
    },
    class: {
      error: 'map__error',
      noImage: 'no-image'
    },
    defaultZoom: 18,
    errorMessage: 'We can\'t find this address, please check it again',
    observerRootMargin: '200px'
  }

  const cache = {
    iconDimensions: new Map(),
    mapLinks: []
  }

  const locationWrappers = document.querySelectorAll(config.selector.wrapper);

  let observer = null,
      observerSetup = false;

  if (!locationWrappers || !locationWrappers.length) return;

  const fetchLocationData = async (address) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`,
            response = await fetch(url);
      return await response.json()
    } catch (error) {
      console.error('Error fetching location data:', error);
      return [];
    }
  }

  const getIconDimensions = (iconSelector = config.selector.icon) => {
    // Check cache first for better performance
    if (cache.iconDimensions.has(iconSelector)) {
      return cache.iconDimensions.get(iconSelector);
    }

    const icon = document.querySelector(iconSelector);
    if (!icon) return [40, 55] // Default dimensions

    const dimensions = $.getDimensions(icon);
    const result = dimensions.width && dimensions.height
      ? [dimensions.width, dimensions.height]
      : [40, 55];

    cache.iconDimensions.set(iconSelector, result); // Cache the result for future use

    return result;
  }

  const createMap = async (mapElement, address) => {
    if (!mapElement || !address) return;

    if (mapElement.getAttribute(config.attribute.processed) === 'true') return;

    const mapId = mapElement.getAttribute(config.attribute.id),
          locationData = await fetchLocationData(address);

    if (!locationData || !locationData.length) {
      displayErrorMessage(mapElement, address);
      return;
    }

    renderMap(mapId, locationData);
    updateMapLinks(locationData);

    mapElement.setAttribute(config.attribute.processed, 'true'); // Mark as processed to prevent duplicate processing
  }

  const renderMap = (targetId, locationData) => {
    const [lon, lat] = [locationData[0].lon, locationData[0].lat];
    const iconDimensions = getIconDimensions(),
          icon = document.querySelector(config.selector.icon);

    // Use frameSequence to batch read/write operations for performance
    $.frameSequence(
      // Read phase - prepare map configuration
      () => ({
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          }),
          new ol.layer.Vector({
            source: new ol.source.Vector({
              features: [
                new ol.Feature({
                  geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
                })
              ]
            }),
            style: new ol.style.Style({
              image: new ol.style.Icon({
                anchor: [0.5, 60],
                anchorXUnits: 'fraction',
                anchorYUnits: 'pixels',
                imgSize: iconDimensions,
                img: icon
              })
            })
          })
        ],
        interaction: ol.interaction.defaults.defaults({
          mouseWheelZoom: false
        }),
        view: new ol.View({
          center: ol.proj.fromLonLat([lon, lat]),
          zoom: config.defaultZoom
        })
      }),
      // Write phase - create the map with prepared configuration
      (mapConfig) => {
        new ol.Map({
          target: targetId,
          layers: mapConfig.layers,
          interactions: mapConfig.interaction,
          view: mapConfig.view
        })
      }
    )
  }

  const displayErrorMessage = (mapElement, address) => {
    $.frameSequence(
      // Read phase - prepare elements
      () => {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add(config.class.error);
        errorDiv.innerHTML = `${address} - ${config.errorMessage}`;
        return {
          errorDiv,
          parentElement: mapElement.closest(config.selector.wrapper)
        }
      },
      // Write phase - append elements
      (data) => {
        mapElement.appendChild(data.errorDiv)
        if (data.parentElement) {
          $.toggleClass(data.parentElement, config.class.noImage, true);
        }
      }
    )
  }

  const updateMapLinks = (locationData) => {
    const links = document.querySelectorAll(config.selector.link);
    if (!links || !links.length) return;

    const [lat, lon] = [locationData[0].lat, locationData[0].lon],
          mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&amp;mlon=${lon}#map=${config.defaultZoom}/${lat}/${lon}`

    cache.mapLinks.push(mapUrl);

    // Batch DOM updates for performance
    $.batchDOM(() => {
      links.forEach((link, i) => {
        if (cache.mapLinks[i]) {
          link.setAttribute(config.attribute.href, cache.mapLinks[i]);
        }
      })
    })
  }

  const processMapElement = (mapElement) => {
    if (mapElement.getAttribute(config.attribute.processed) === 'true') return;

    const address = mapElement.getAttribute(config.attribute.address);
    if (address) createMap(mapElement, address);
  }

  const isElementVisible = (element) => {
    if (!element) return false;
    if ($.inViewport(element)) return true;

    const tabContent = element.closest(config.selector.tabsContent)
    if (tabContent && window.getComputedStyle(tabContent).display !== 'none') return true;

    return false;
  }

  const processLocationWrapper = (wrapper) => {
    const maps = wrapper.querySelectorAll(config.selector.map);
    if (!maps || !maps.length) return;

    const processLocationHandler = () => {
      maps.forEach(map => {
        // Only observe maps that haven't been processed yet
        if (map.getAttribute(config.attribute.processed) !== 'true') {
          observer.observe(map)
        }
      })
    }

    const mapElementFallback = () => {
      maps.forEach(map => {
        if (isElementVisible(map)) {
          processMapElement(map)
        }
      })
    }

    // Use IntersectionObserver for performance when available
    observer ? processLocationHandler() : mapElementFallback();
  }

  const setupIntersectionObserver = () => {
    if (observerSetup) return observer;

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          processMapElement(entry.target);
          observer.unobserve(entry.target);
        }
      })
    }

    observer = $.intersectionObserver(observerCallback);
    observerSetup = true;

    return observer;
  }

  const initMaps = () => {
    setupIntersectionObserver();

    $ || $.requestIdle() || $.is($.requestIdle(), 'function')
      ? ($.requestIdle(() => {
          locationWrappers.forEach(processLocationWrapper);
        }, { timeout: 2000 }))
      : initLocationMaps();
  }

  const runInitialization = () => {
    $.slowConnection()
      ? setTimeout(initMaps, 1000)
      : initMaps();
  }

  // Clean up resources when page is unloaded
  const cleanup = () => {
    // Clear caches
    cache.mapLinks.length = 0;
    cache.iconDimensions.clear();

    // Disconnect observer
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  runInitialization();
  return cleanup;
}

const initLocationMaps = () => {
  const cleanup = handleLocationMaps();

  window.cleanupMaps = () => {
    if ($.is(cleanup, 'function')) {
      cleanup();
      window.cleanupMaps = () => {}; // Replace with no-op after cleanup
    }
  }
}

window.addEventListener('load', () => initLocationMaps())
