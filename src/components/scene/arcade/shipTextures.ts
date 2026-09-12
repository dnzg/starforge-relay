import * as THREE from "three";

export interface ShipTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  dispose: () => void;
}

interface HullPaintOptions {
  base: [number, number, number];
  panel: [number, number, number];
  line: [number, number, number];
  accent: [number, number, number];
  glow: [number, number, number];
  stripe?: boolean;
}

function rgb(c: [number, number, number], a = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function paintNoise(
  data: Uint8ClampedArray,
  width: number,
  _height: number,
  amount: number,
): void {
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    const n = hash(x * 0.37, y * 0.41) * amount - amount * 0.5;
    data[i] = Math.max(0, Math.min(255, (data[i] ?? 0) + n));
    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] ?? 0) + n));
    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] ?? 0) + n));
  }
}

function createCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function toTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 4;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function paintHull(size: number, options: HullPaintOptions): HTMLCanvasElement {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = rgb(options.base);
  ctx.fillRect(0, 0, size, size);

  const cols = 4;
  const cell = size / cols;
  ctx.lineWidth = 3;
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      const inset = 4;
      ctx.fillStyle = rgb(options.panel, 0.55 + hash(x + 2, y) * 0.3);
      ctx.fillRect(x * cell + inset, y * cell + inset, cell - inset * 2, cell - inset * 2);
      ctx.strokeStyle = rgb(options.line, 0.85);
      ctx.strokeRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3);
      ctx.fillStyle = rgb(options.line, 0.8);
      ctx.beginPath();
      ctx.arc(x * cell + 10, y * cell + 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (options.stripe !== false) {
    ctx.fillStyle = rgb(options.accent, 1);
    ctx.fillRect(0, size * 0.38, size, size * 0.16);
    ctx.fillStyle = rgb(options.glow, 0.45);
    ctx.fillRect(0, size * 0.36, size, size * 0.2);
  }

  ctx.fillStyle = rgb(options.accent, 0.55);
  ctx.fillRect(size * 0.08, 0, 3, size);
  ctx.fillRect(size * 0.9, 0, 2, size);

  const image = ctx.getImageData(0, 0, size, size);
  paintNoise(image.data, size, size, 18);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function paintMask(
  size: number,
  roughness: number,
  metal: number,
  seams = 40,
): { rough: HTMLCanvasElement; metal: HTMLCanvasElement } {
  const rough = createCanvas(size);
  const metalCanvas = createCanvas(size);
  const rctx = rough.getContext("2d");
  const mctx = metalCanvas.getContext("2d");
  if (!rctx || !mctx) return { rough, metal: metalCanvas };

  rctx.fillStyle = `rgb(${roughness},${roughness},${roughness})`;
  rctx.fillRect(0, 0, size, size);
  mctx.fillStyle = `rgb(${metal},${metal},${metal})`;
  mctx.fillRect(0, 0, size, size);

  const cell = size / 8;
  rctx.strokeStyle = `rgb(${Math.min(255, roughness + seams)},${Math.min(255, roughness + seams)},${Math.min(255, roughness + seams)})`;
  mctx.strokeStyle = `rgb(${Math.max(0, metal - 30)},${Math.max(0, metal - 30)},${Math.max(0, metal - 30)})`;
  rctx.lineWidth = 1;
  mctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    rctx.beginPath();
    rctx.moveTo(i * cell, 0);
    rctx.lineTo(i * cell, size);
    rctx.stroke();
    rctx.beginPath();
    rctx.moveTo(0, i * cell);
    rctx.lineTo(size, i * cell);
    rctx.stroke();
    mctx.stroke();
  }

  return { rough, metal: metalCanvas };
}

function paintEmissive(size: number, glow: [number, number, number]): HTMLCanvasElement {
  const canvas = createCanvas(size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = rgb(glow, 0.95);
  ctx.fillRect(0, size * 0.38, size, size * 0.16);
  ctx.fillStyle = rgb(glow, 0.35);
  ctx.fillRect(size * 0.08, 0, 3, size);
  ctx.fillRect(0, size * 0.78, size, 4);
  return canvas;
}

function buildSet(
  albedo: HTMLCanvasElement,
  rough: HTMLCanvasElement,
  metal: HTMLCanvasElement,
  emissive: HTMLCanvasElement,
): ShipTextureSet {
  const map = toTexture(albedo, THREE.SRGBColorSpace);
  const roughnessMap = toTexture(rough);
  const metalnessMap = toTexture(metal);
  const emissiveMap = toTexture(emissive, THREE.SRGBColorSpace);
  return {
    map,
    roughnessMap,
    metalnessMap,
    emissiveMap,
    dispose() {
      map.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
      emissiveMap.dispose();
    },
  };
}

export function createPlayerHullTextures(): ShipTextureSet {
  const size = 256;
  const albedo = paintHull(size, {
    base: [186, 184, 194],
    panel: [226, 224, 232],
    line: [72, 70, 78],
    accent: [222, 41, 68],
    glow: [241, 105, 126],
  });
  const masks = paintMask(size, 92, 170);
  const emissive = paintEmissive(size, [222, 41, 68]);
  return buildSet(albedo, masks.rough, masks.metal, emissive);
}

export function createPlayerWingTextures(): ShipTextureSet {
  const size = 256;
  const albedo = paintHull(size, {
    base: [132, 130, 140],
    panel: [168, 166, 176],
    line: [48, 46, 54],
    accent: [240, 239, 243],
    glow: [222, 41, 68],
  });
  const masks = paintMask(size, 110, 150);
  const emissive = paintEmissive(size, [90, 20, 30]);
  return buildSet(albedo, masks.rough, masks.metal, emissive);
}

export function createHostileTextures(): ShipTextureSet {
  const size = 256;
  const albedo = paintHull(size, {
    base: [148, 36, 48],
    panel: [196, 58, 72],
    line: [72, 16, 22],
    accent: [255, 196, 204],
    glow: [241, 105, 126],
  });
  const masks = paintMask(size, 78, 140);
  const emissive = paintEmissive(size, [222, 41, 68]);
  return buildSet(albedo, masks.rough, masks.metal, emissive);
}

export function createCanopyTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = createCanvas(size);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#8ad4ff");
    gradient.addColorStop(0.45, "#163047");
    gradient.addColorStop(1, "#0b1018");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size * 0.2, 0);
    ctx.lineTo(size * 0.35, size);
    ctx.moveTo(size * 0.65, 0);
    ctx.lineTo(size * 0.8, size);
    ctx.stroke();
  }
  return toTexture(canvas, THREE.SRGBColorSpace);
}

export function applyHullMaps(
  material: THREE.MeshStandardMaterial,
  maps: ShipTextureSet,
  repeat = 1,
): void {
  maps.map.repeat.set(repeat, repeat);
  maps.roughnessMap.repeat.set(repeat, repeat);
  maps.metalnessMap.repeat.set(repeat, repeat);
  maps.emissiveMap.repeat.set(repeat, repeat);
  material.map = maps.map;
  material.roughnessMap = maps.roughnessMap;
  material.metalnessMap = maps.metalnessMap;
  material.emissiveMap = maps.emissiveMap;
  material.needsUpdate = true;
}

export function applyShipLiveryMap(
  materials: { hull: THREE.MeshStandardMaterial; wing: THREE.MeshStandardMaterial },
  map: THREE.Texture,
): void {
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = 4;
  map.needsUpdate = true;

  for (const material of [materials.hull, materials.wing]) {
    material.map = map;
    material.color.set("#ffffff");
    material.metalness = 0.18;
    material.roughness = 0.44;
    material.emissive.set("#000000");
    material.emissiveIntensity = 0;
    material.roughnessMap = null;
    material.metalnessMap = null;
    material.emissiveMap = null;
    material.needsUpdate = true;
  }
}
