import * as THREE from "three";

export function createHudLabelTexture(
  text: string,
  fill: string,
  stroke: string,
  textColor = "#ffffff",
): THREE.CanvasTexture {
  const width = 384;
  const height = 96;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.roundRect(10, 10, width - 20, height - 20, 18);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = textColor;
    ctx.font = "800 46px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2 + 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createHudLabelSprite(
  texture: THREE.CanvasTexture,
  scaleX: number,
  scaleY: number,
): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 40;
  sprite.visible = false;
  return sprite;
}
