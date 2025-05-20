/**
 * Map Loading Component
 *
 * Initializes OpenStreetMap maps for location blocks with performance optimizations.
 * Uses lazy loading strategy to only render maps when they're needed.
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */

const MapConfig = {
  selector: {
    wrapper: '.locations__wrapper',
    map: '.map',
    icon: '.map-icon__image',
    link: '.tabs__link',
    tabsInput: '.tabs__input',
    tabsContent: '.tabs__content'
  },
  attr: {
    id: 'id',
    href: 'href',
    address: 'data-address',
    error: 'data-error',
    processed: 'data-map-processed'
  },
  class: {
    error: 'map__error',
    noImage: 'no-image'
  },
  defaultZoom: 18,
  errorMessage: 'We can\'t find this address, please check it again',
  iconWidth: 40,
  iconHeight: 55,
  idleTimeout: 2000,
  observerRootMargin: '200px',
  slowConnectionDelay: 1000
}

const MapDOM = {
  elements: {
    locationWrappers: null,
    mapElements: null
  },

  cache: {
    iconDimensions: new Map(),
    mapLinks: []
  },

  init() {
    this.elements.locationWrappers = document.querySelectorAll(MapConfig.selector.wrapper);
    return this.elements.locationWrappers && this.elements.locationWrappers.length > 0;
  },

  getPinDimensions(iconSelector = MapConfig.selector.icon) {
    if (this.cache.iconDimensions.has(iconSelector)) {
      return this.cache.iconDimensions.get(iconSelector);
    }

    const icon = document.querySelector(iconSelector);
    if (!icon) return [MapConfig.iconWidth, MapConfig.iconHeight];

    const dimensions = $.getDimensions(icon);
    const result = dimensions.width && dimensions.height
      ? [dimensions.width, dimensions.height]
      : [MapConfig.iconWidth, MapConfig.iconHeight];

    this.cache.iconDimensions.set(iconSelector, result); // Cache the result for future use

    return result;
  },

  updateMapLinks(locationData) {
    const links = document.querySelectorAll(MapConfig.selector.link);
    if (!links || !links.length) return;

    const [lat, lon] = [locationData[0].lat, locationData[0].lon],
          mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&amp;mlon=${lon}#map=${MapConfig.defaultZoom}/${lat}/${lon}`;

    this.cache.mapLinks.push(mapUrl);

    const mapLinksHandler = () => {
      links.forEach((link, i) => {
        if (this.cache.mapLinks[i]) {
          link.setAttribute(MapConfig.attr.href, this.cache.mapLinks[i]);
        }
      })
    }

    $.batchDOM(mapLinksHandler)
  },

  isVisible(element) {
    if (!element) return false;
    if ($.inViewport(element)) return true;

    const tabContent = element.closest(MapConfig.selector.tabsContent),
          tabContentStyles = window.getComputedStyle(tabContent);
    return tabContent && tabContentStyles.display !== 'none';
  },

  cleanup() {
    this.cache.mapLinks.length = 0;
    this.cache.iconDimensions.clear();

    Object.keys(this.elements).forEach(key => {
      this.elements[key] = null; // Clear element references
    })
  }
}

const MapRenderer = {
  // Read phase for map configuration
  readMapConfiguration(lon, lat) {
    const iconDimensions = MapDOM.getPinDimensions(),
          icon = document.querySelector(MapConfig.selector.icon);

    return {
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
        zoom: MapConfig.defaultZoom
      })
    }
  },

  // Write phase for creating the map
  writeMapObject(targetId, mapConfig) {
    new ol.Map({
      target: targetId,
      layers: mapConfig.layers,
      interactions: mapConfig.interaction,
      view: mapConfig.view
    })
  },

  renderMap(targetId, locationData) {
    const [lon, lat] = [locationData[0].lon, locationData[0].lat];

    // Bind the context to ensure 'this' references are maintained
    const readPhase = this.readMapConfiguration.bind(this, lon, lat),
          writePhase = (mapConfig) => this.writeMapObject(targetId, mapConfig);

    $.frameSequence(readPhase, writePhase);
  },

  // Read phase for error message preparation
  readErrorElements(mapElement, address) {
    const errorDiv = document.createElement('div');
    errorDiv.classList.add(MapConfig.class.error);
    errorDiv.innerHTML = `${address} - ${MapConfig.errorMessage}`;

    return {
      errorDiv,
      parentElement: mapElement.closest(MapConfig.selector.wrapper)
    }
  },

  // Write phase for error message display
  writeErrorElements(data) {
    data.mapElement.appendChild(data.errorDiv);

    if (!data.parentElement) return;
    $.toggleClass(data.parentElement, MapConfig.class.noImage, true);
  },

  displayErrorMessage(mapElement, address) {
    // Bind the context to ensure 'this' references are maintained
    const readPhase = () => this.readErrorElements(mapElement, address);
    const writePhase = (data) => {
      if (!data) return;
      // Add the mapElement to the data object for use in the write phase
      data.mapElement = mapElement;
      this.writeErrorElements(data);
    }

    $.frameSequence(readPhase, writePhase);
  }
}

const MapData = {
  async fetchLocationData(address) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`,
            response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching location data:', error);
      return [];
    }
  }
}

const MapProcessor = {
  async processMapElement(mapElement) {
    const processed = mapElement.getAttribute(MapConfig.attr.processed);
    if (!mapElement || processed === 'true') return;

    const address = mapElement.getAttribute(MapConfig.attr.address);
    if (!address) return;

    const mapId = mapElement.getAttribute(MapConfig.attr.id),
          locationData = await MapData.fetchLocationData(address);

    if (!locationData || !locationData.length) {
      MapRenderer.displayErrorMessage(mapElement, address);
      return;
    }

    MapRenderer.renderMap(mapId, locationData);
    MapDOM.updateMapLinks(locationData);

    mapElement.setAttribute(MapConfig.attr.processed, 'true'); // Mark as processed to prevent duplicate processing
  },

  processLocationWrapper(wrapper) {
    const maps = wrapper.querySelectorAll(MapConfig.selector.map);
    if (!maps || !maps.length) return;

    maps.forEach(map => {
      const attribute = map.getAttribute(MapConfig.attr.processed);
      const mapObserver = () => {
        if (attribute !== 'true') MapVisibility.observer.observe(map);
      }

      if (MapDOM.isVisible(map)) {
        this.processMapElement(map)
      } else if (MapVisibility.observer) {
        mapObserver() // Only observe maps that haven't been processed yet
      }
    })
  }
}

const MapVisibility = {
  observer: null,
  observerSetup: false,

  setIntersectionObserver() {
    if (this.observerSetup) return this.observer;

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        MapProcessor.processMapElement(entry.target);
        this.observer.unobserve(entry.target);
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
  }
}

const handleLocation = () => {
  if (!MapDOM.init()) return null;

  MapVisibility.setIntersectionObserver();

  const wrappersWithDelay = () => {
    const mapWrappers = MapDOM.elements.locationWrappers;
    if (!mapWrappers || !mapWrappers.length) return;

    const handleWrappers = () => {
      MapDOM.elements.locationWrappers.forEach(wrapper => {
        MapProcessor.processLocationWrapper(wrapper);
      })
    }

    $.is($.requestIdle, 'function')
      ? $.requestIdle(() => { handleWrappers() }, { timeout: MapConfig.idleTimeout })
      : handleWrappers();
  }

  // Initialize with connection-aware delay
  $.slowConnection() && $.is($.slowConnection, 'function')
    ? setTimeout(wrappersWithDelay, MapConfig.slowConnectionDelay)
    : wrappersWithDelay();

  const cleanup = () => {
    MapVisibility.cleanup();
    MapDOM.cleanup();
    return null;
  }

  return cleanup;
}

const initMaps = () => {
  window.cleanupMaps = handleLocation();

  // Ensure cleanup is idempotent
  const originalCleanup = window.cleanupMaps;
  window.cleanupMaps = () => {
    if (!$.is(originalCleanup, 'function')) return;
    originalCleanup();
    window.cleanupMaps = () => {}; // Replace with no-op after cleanup
  }

  const themeCleanupHandler = () => {
    const originalThemeCleanup = window.themeCleanup;
    window.themeCleanup = () => {
      if (window.cleanupMaps) window.cleanupMaps();
      originalThemeCleanup();
    }
  }
  if (window.themeCleanup) themeCleanupHandler();
}

window.addEventListener('load', initMaps);
