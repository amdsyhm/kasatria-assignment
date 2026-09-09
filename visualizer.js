import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { CSS3DRenderer, CSS3DObject } from "https://unpkg.com/three@0.160.0/examples/jsm/renderers/CSS3DRenderer.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const sceneElement = document.querySelector("#scene");
const panelElement = document.querySelector("#visualizer-panel");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
camera.position.set(0, 0, 1800);

const renderer = new CSS3DRenderer();
renderer.setSize(sceneElement.clientWidth || 900, 620);
sceneElement.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 500;
controls.maxDistance = 4000;

const tileGroup = new THREE.Group();
scene.add(tileGroup);
let objects = [];
let layouts = {};
let selectedTile = null;

function colorForNetWorth(netWorth) {
  if (netWorth < 100000) return "#b42318";
  if (netWorth <= 200000) return "#d97706";
  return "#16803c";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));
}

function makeTile(row) {
  const element = document.createElement("article");
  element.className = "person-tile";
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `Select ${row.name}`);
  element.style.borderColor = colorForNetWorth(row.netWorth);
  element.innerHTML = `
    <img src="${escapeHtml(row.photo)}" alt="" loading="lazy" onerror="this.style.display='none'" />
    <strong>${escapeHtml(row.name)}</strong>
    <span>${escapeHtml(row.country)} · ${row.age}</span>
    <span>${escapeHtml(row.interest)}</span>
    <small>$${Number(row.netWorth).toLocaleString("en-US")}</small>`;
  let pointerStart = null;
  let lastSelection = 0;
  const selectPerson = event => {
    if (performance.now() - lastSelection < 300) return;
    lastSelection = performance.now();
    event.stopPropagation();
    if (selectedTile) selectedTile.classList.remove("selected");
    selectedTile = element;
    selectedTile.classList.add("selected");
    window.dispatchEvent(new CustomEvent("person-selected", { detail: row }));
  };
  element.addEventListener("pointerdown", event => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  element.addEventListener("pointerup", event => {
    if (!pointerStart) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (moved < 8) selectPerson(event);
  });
  element.addEventListener("click", selectPerson);
  element.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") selectPerson(event);
  });
  return new CSS3DObject(element);
}

function buildLayouts(count) {
  const table = [], sphere = [], helix = [], grid = [];
  for (let i = 0; i < count; i += 1) {
    const col = i % 20;
    const row = Math.floor(i / 20);
    table.push(new THREE.Vector3((col - 9.5) * 105, (4.5 - row) * 135, 0));

    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    sphere.push(new THREE.Vector3(520 * Math.cos(theta) * Math.sin(phi), 520 * Math.cos(phi), 520 * Math.sin(theta) * Math.sin(phi)));

    const strand = i % 2;
    const step = Math.floor(i / 2);
    const angle = step * 0.34;
    helix.push(new THREE.Vector3(360 * Math.cos(angle + (strand ? Math.PI : 0)), 650 - step * 13, 360 * Math.sin(angle + (strand ? Math.PI : 0))));

    const gx = i % 5;
    const gy = Math.floor(i / 5) % 4;
    const gz = Math.floor(i / 20);
    grid.push(new THREE.Vector3((gx - 2) * 180, (1.5 - gy) * 180, (4.5 - gz) * 180));
  }
  return { table, sphere, helix, grid };
}

function transformTo(layoutName) {
  const targets = layouts[layoutName];
  objects.forEach((object, index) => {
    const target = targets[index];
    object.position.copy(target);
    object.rotation.set(0, 0, 0);
  });
}

function setup(rows) {
  objects.forEach(object => tileGroup.remove(object));
  objects = rows.map(makeTile);
  objects.forEach(object => tileGroup.add(object));
  layouts = buildLayouts(objects.length);
  panelElement.hidden = false;
  transformTo("table");
}

document.querySelectorAll("[data-layout]").forEach(button => button.addEventListener("click", () => transformTo(button.dataset.layout)));
window.addEventListener("sheet-data-loaded", event => setup(event.detail));
sceneElement.addEventListener("click", event => {
  if (event.target === renderer.domElement || event.target === sceneElement) {
    if (selectedTile) selectedTile.classList.remove("selected");
    selectedTile = null;
  }
});
window.addEventListener("resize", () => {
  const width = sceneElement.clientWidth || 900;
  renderer.setSize(width, 620);
  camera.aspect = width / 620;
  camera.updateProjectionMatrix();
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
