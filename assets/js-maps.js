class LocationMap {
  constructor(block) {
    this.block = block;

    this.selector = {
      map: ".map",
      icon: ".map-icon__image",
      link: ".tabs__link"
    }

    this.attr = {
      id: "id",
      href: "href",
      address: "data-address"
    }

    this.elem = {
      div: "div"
    }

    this.classes = {
      error: "map__error",
      noImage: "no-image"
    }

    this.addressErrorMessage = `we can't find this address, please check it again`;
    this.linkArr = [];
    this.zoom = 18;
  }

  init() {
    if (!this.block) return false;

    this.elements();
    this.events();
  }

  elements() {
    this.maps = this.block.querySelectorAll(this.selector.map);
    this.links = this.block.querySelectorAll(this.selector.link);
  }

  events() {
    this.createMap();
  }

  createMap() {
    if (!this.maps.length) return false;

    this.maps.forEach(map => {
      const id = map.getAttribute(this.attr.id),
            address = map.getAttribute(this.attr.address),
            url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`;

      const getData = async () => {
        try {
          const res = await fetch(url);
          return await res.json();
        } catch (error) {
          console.error(error);
        }
      };

      const renderMap = (obj) => {
        const icon = document.querySelector(this.selector.icon),
              iconWidth = icon?.getBoundingClientRect().width,
              iconHeight = icon?.getBoundingClientRect().height,
              iconSize = iconWidth && iconHeight ? [iconWidth, iconHeight] : [40, 55],
              lon = obj[0]?.lon,
              lat = obj[0]?.lat;

        const layers = [
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
                imgSize: iconSize,
                img: icon
              })
            })
          })
        ];

        const interaction = ol.interaction.defaults.defaults({
          mouseWheelZoom: false
        });

        const view = new ol.View({
          center: ol.proj.fromLonLat([lon, lat]),
          zoom: this.zoom
        });

        const options = {
          target: id,
          layers: layers,
          interactions: interaction,
          view: view
        };

        new ol.Map(options);
      }

      const errorMessage = () => {
        const div = document.createElement(this.elem.div);
        div.classList.add(this.classes.error);
        div.innerHTML = `${address} - ${this.addressErrorMessage}`;
        this.block.parentElement.classList.add(this.classes.noImage);
        return map.appendChild(div);
      };

      getData().then(data => {
        data.length ? (renderMap(data), this.setUrl(data)) : errorMessage()
      });
    })
  }

  setUrl(data) {
    if (!this.links.length) return false;

    const link = `https://www.openstreetmap.org/?mlat=${data[0].lat}&amp;mlon=${data[0].lon}#map=${this.zoom}/${data[0].lat}/${data[0].lon}`;
    this.linkArr.push(link);

    this.links.forEach((link, i) => {
      link.setAttribute(this.attr.href, this.linkArr[i]);
    })
  }
}

const initMap = (el = ".locations__wrapper") => {
  const nodes = document.querySelectorAll(el);

  if (!nodes.length) return false;

  nodes.forEach(node => {
    const maps = new LocationMap(node);
    maps.init();
  })
}

document.addEventListener("readystatechange", (e) => {
  if (e.target.readyState === "complete") initMap();
})
