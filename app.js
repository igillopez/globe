const providerSelect = document.getElementById('provider-select');
const dropZone = document.getElementById('drop-zone');
const fileSelector = document.getElementById('file-selector');
const summaryBox = document.getElementById('summary');
const globeContainer = document.getElementById('globe');

let providersData = {};
let engine;
let scene;
let camera;
let globeMesh;
let markerMeshes = [];

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new BABYLON.Vector3(x, y, z);
}

function initGlobe() {
  const canvas = document.createElement('canvas');
  canvas.id = 'globe-canvas';
  globeContainer.appendChild(canvas);

  engine = new BABYLON.Engine(canvas, true);
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

  camera = new BABYLON.ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.2, 4.3, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.wheelDeltaPercentage = 0.01;
  camera.minZ = 0.1;

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 1.1;

  const globeMaterial = new BABYLON.StandardMaterial('globeMaterial', scene);
  globeMaterial.diffuseTexture = new BABYLON.Texture(
    'https://upload.wikimedia.org/wikipedia/commons/5/5f/Equirectangular-projection.jpg',
    scene,
    true,
    false,
    BABYLON.Texture.TRILINEAR_SAMPLINGMODE
  );
  globeMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

  globeMesh = BABYLON.MeshBuilder.CreateSphere('globe', { segments: 64, diameter: 3.5 }, scene);
  globeMesh.material = globeMaterial;

  engine.runRenderLoop(() => {
    globeMesh.rotation.y += 0.0008;
    scene.render();
  });

  window.addEventListener('resize', () => {
    engine.resize();
  });
}

function clearMarkers() {
  markerMeshes.forEach((marker) => marker.dispose());
  markerMeshes = [];
}

function renderCitiesOnGlobe(cities) {
  if (!globeMesh || !scene) return;
  clearMarkers();

  const radius = globeMesh.getBoundingInfo().boundingSphere.radius;
  const markerMaterial = new BABYLON.StandardMaterial('markerMaterial', scene);
  markerMaterial.diffuseColor = BABYLON.Color3.Red();
  markerMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);

  cities.forEach((city) => {
    const position = latLonToVector3(city.latitude, city.longitude, radius + 0.05);
    const marker = BABYLON.MeshBuilder.CreateSphere(`marker-${city.city}`, { diameter: 0.07 }, scene);
    marker.position = position;
    marker.material = markerMaterial;
    markerMeshes.push(marker);
  });
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return {};

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const providerIdx = headers.indexOf('provider');
  const cityIdx = headers.indexOf('city');
  const latIdx = headers.indexOf('latitude');
  const lngIdx = headers.indexOf('longitude');

  if ([providerIdx, cityIdx, latIdx, lngIdx].some((idx) => idx === -1)) {
    alert('El CSV debe contener las columnas provider, city, latitude y longitude.');
    return {};
  }

  const data = {};

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < headers.length) continue;

    const provider = cols[providerIdx];
    const city = cols[cityIdx];
    const latitude = Number(cols[latIdx]);
    const longitude = Number(cols[lngIdx]);

    if (!provider || !city || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      continue;
    }

    if (!data[provider]) data[provider] = [];
    data[provider].push({ city, latitude, longitude });
  }

  return data;
}

function updateProviderSelect() {
  providerSelect.innerHTML = '<option value="" disabled selected>Selecciona un proveedor</option>';
  const providers = Object.keys(providersData);

  providers.forEach((provider) => {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = provider;
    providerSelect.appendChild(option);
  });

  if (providers.length) {
    providerSelect.value = providers[0];
    onProviderChange();
  } else {
    renderCitiesOnGlobe([]);
    updateSummary();
  }
}

function updateSummary() {
  const provider = providerSelect.value;
  const count = provider && providersData[provider] ? providersData[provider].length : 0;
  const providerCounts = Object.entries(providersData)
    .map(([name, cities]) => `<li>${name}: ${cities.length} ciudades</li>`)
    .join('');

  summaryBox.innerHTML = `
    <p>Proveedor seleccionado: ${provider || 'ninguno'}</p>
    <p>Número de ciudades: ${count}</p>
    <p><strong>Ciudades cargadas por proveedor:</strong></p>
    <ul>${providerCounts || '<li>Sin datos cargados</li>'}</ul>
  `;
}

function onProviderChange() {
  const provider = providerSelect.value;
  const cities = providersData[provider] || [];
  renderCitiesOnGlobe(cities);
  updateSummary();
}

function handleFile(file) {
  if (!file) return;
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  if (!isCsv) {
    alert('Por favor, selecciona un archivo .csv');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    providersData = parseCsv(event.target.result);
    updateProviderSelect();
  };
  reader.readAsText(file);
}

function loadInitialData() {
  const exampleCsv = [
    'provider,city,latitude,longitude',
    'ProveedorA,Madrid,40.4168,-3.7038',
    'ProveedorA,Barcelona,41.3874,2.1686',
    'ProveedorB,Paris,48.8566,2.3522',
    'ProveedorB,Berlin,52.52,13.4050'
  ].join('\n');

  providersData = parseCsv(exampleCsv);
  updateProviderSelect();
}

function setupDragAndDrop() {
  ['dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => event.preventDefault());
  });

  dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (event) => {
    dropZone.classList.remove('dragover');
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  });
}

function setupFileInput() {
  fileSelector.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    handleFile(file);
  });
}

function bootstrap() {
  initGlobe();
  setupDragAndDrop();
  setupFileInput();
  providerSelect.addEventListener('change', onProviderChange);
  loadInitialData();
}

document.addEventListener('DOMContentLoaded', bootstrap);
