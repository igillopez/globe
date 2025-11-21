const providerSelect = document.getElementById('provider-select');
const dropZone = document.getElementById('drop-zone');
const fileSelector = document.getElementById('file-selector');
const summaryBox = document.getElementById('summary');
const globeContainer = document.getElementById('globe');

let providersData = {};
let globe;
let scene;
let camera;
let renderer;
let controls;

function initGlobe() {
  const width = globeContainer.clientWidth;
  const height = globeContainer.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 350;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  globeContainer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  globe = new ThreeGlobe()
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .showAtmosphere(true)
    .atmosphereColor('#5e81f4')
    .atmosphereAltitude(0.15)
    .pointAltitude(() => 0.04)
    .pointColor(() => 'red')
    .pointRadius(0.6);

  scene.add(globe);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;

  window.addEventListener('resize', onWindowResize);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  globe.rotation.y += 0.0008;
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  const width = globeContainer.clientWidth;
  const height = globeContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
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

function renderCitiesOnGlobe(cities) {
  if (!globe) return;
  globe.pointsData(cities);
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
