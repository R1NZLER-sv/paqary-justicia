    // ======================================================
    // INICIALIZAR MAPA
    // ======================================================
    const map = L.map("map").setView([-16.43, -71.52], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    // ======================================================
    // PANEL LATERAL – MOSTRAR DETALLES
    // ======================================================
    const zoneDetailsDiv = document.getElementById("zone-details");

function showZoneDetails(props) {
  const nombreDistrito = props.zona || props.name || props["name:es"] || "Distrito";

  zoneDetailsDiv.innerHTML = `
    <h2>Juzgado de Paz de ${nombreDistrito}</h2>
    <span class="zone-pill">${nombreDistrito}</span>

    <div style="margin-top:12px; text-align:left; line-height:1.5;">
      <p><span class="field-label">Juez de Paz:</span><br>${props.juez_de_paz ?? "No registrado"}</p>
      <p><span class="field-label">Dirección:</span><br>${props.direccion ?? "No registrado"}</p>
      <p><span class="field-label">Horario de atención:</span><br>${props.horario ?? "No registrado"}</p>
      <p><span class="field-label">Teléfono:</span><br>${props.telefono ?? "No registrado"}</p>
      <p><span class="field-label">Correo:</span><br>${props.correo ?? "No registrado"}</p>

      <p><span class="field-label">Cómo llegar:</span><br>
        <a href="${props.mapsUrl ?? "#"}" target="_blank" style="color:#8b4513; font-weight:600;">
          Abrir en Google Maps
        </a>
      </p>
    </div>
  `;
}


    // ======================================================
    // ICONO ROJO PARA TODOS LOS JUZGADOS
    // ======================================================
    const redIcon = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Guardamos los marcadores por id_zona
    const markersById = {};

    // ======================================================
    // CARGAR GEOJSON EXTERNO + DIBUJAR CAPAS
    // ======================================================
    let zonasLayer; // referencia para fitBounds

function getDistrictColor(name) {
  const colors = [
    "#e63946",
    "#f1a208",
    "#2a9d8f",
    "#457b9d",
    "#9b5de5",
    "#ff6f91",
    "#43aa8b",
    "#f3722c",
    "#277da1",
    "#bc4749",
    "#6d597a",
    "#84a59d"
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

Promise.all([
  fetch("data/limites/arequipa_distritos.geojson").then(r => r.json()),
  fetch("data/jueces_por_distrito.json").then(r => r.json())
])
.then(([zonasGeoJson, juecesData]) => {

  // Mapa: "MIRAFLORES" -> {juez_de_paz, direccion, ...}
  const juecesMap = new Map(
    juecesData.map(j => [String(j.distrito || "").trim().toUpperCase(), j])
  );

  zonasLayer = L.geoJSON(zonasGeoJson, {
    // ✅ quita pines azules
    filter: function (feature) {
      const t = feature?.geometry?.type;
      return t === "Polygon" || t === "MultiPolygon";
    },

    style: function (feature) {
      const props = feature.properties || {};
      const nombreDistrito = (props.zona || props.name || props["name:es"] || "Distrito");
      return {
        color: "#5a3e2b",
        weight: 2,
        fillColor: getDistrictColor(nombreDistrito),
        fillOpacity: 0.6
      };
    },

    onEachFeature: function (feature, layer) {
      const props = feature.properties || {};
      const nombreDistrito = (props.zona || props.name || props["name:es"] || "Distrito");

      // ✅ “enriquecer” props con datos de jueces
      const key = String(nombreDistrito).trim().toUpperCase();
      const datosJuez = juecesMap.get(key) || {};

      const mergedProps = ListoMerge(props, datosJuez); // <- función abajo

      // tooltip con el nombre
      layer.bindTooltip(nombreDistrito, { sticky: true });

      layer.on("click", function () {
        showZoneDetails(mergedProps);
        map.fitBounds(layer.getBounds());
      });

      layer.on("mouseover", function () {
        layer.setStyle({ weight: 3, fillOpacity: 0.8 });
      });

      layer.on("mouseout", function () {
        zonasLayer.resetStyle(layer);
      });
    }
  }).addTo(map);


})
.catch((err) => {
  console.error(err);
  zoneDetailsDiv.innerHTML = `<p style="color:#b91c1c;font-weight:700;">Error cargando datos</p>`;
});

// Helper simple para merge
function ListoMerge(props, datosJuez) {
  return {
    ...props,
    juez_de_paz: datosJuez.juez_de_paz ?? props.juez_de_paz,
    direccion: datosJuez.direccion ?? props.direccion,
    telefono: datosJuez.telefono ?? props.telefono,
    correo: datosJuez.correo ?? props.correo,
    horario: datosJuez.horario ?? props.horario,
    mapsUrl: datosJuez.mapsUrl ?? props.mapsUrl
  };
}



