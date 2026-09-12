import { useEffect, useRef } from "react";
import { arcadeUiRef } from "../../lib/combat/arcadeUiRef";
import { SECTOR_BOUNDS } from "../scene/arcade/enemyBehavior";

const RANGE = 15;
const GRID_STEP = 4;
const BEZEL = 11;

function project(
  dx: number,
  dz: number,
  heading: number,
  scale: number,
): { x: number; y: number; dist: number } {
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);
  const localX = dx * cos + dz * -sin;
  const localZ = dx * -sin + dz * -cos;
  return {
    x: localX * scale,
    y: -localZ * scale,
    dist: Math.hypot(localX, localZ),
  };
}

function clampToRim(
  x: number,
  y: number,
  max: number,
): { x: number; y: number; clipped: boolean } {
  const dist = Math.hypot(x, y);
  if (dist <= max || dist < 0.0001) {
    return { x, y, clipped: false };
  }
  const t = max / dist;
  return { x: x * t, y: y * t, clipped: true };
}

function drawRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const ui = arcadeUiRef;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const dpr = width / Math.max(1, ctx.canvas.clientWidth || width);
  const bezel = BEZEL * dpr;
  const radius = Math.max(8, Math.min(cx, cy) - 1);
  const inner = radius - bezel;
  const scale = inner / RANGE;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = "#100d12";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.clip();

  const fill = ctx.createRadialGradient(cx, cy, inner * 0.12, cx, cy, inner);
  fill.addColorStop(0, "#241820");
  fill.addColorStop(0.55, "#141016");
  fill.addColorStop(1, "#08060a");
  ctx.fillStyle = fill;
  ctx.fillRect(cx - inner, cy - inner, inner * 2, inner * 2);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = "rgba(240,239,243,0.11)";
  ctx.lineWidth = 1 * dpr;
  const extent = SECTOR_BOUNDS + GRID_STEP;
  for (let a = -extent; a <= extent; a += GRID_STEP) {
    const v0 = project(a - ui.playerX, -extent - ui.playerZ, ui.playerHeading, scale);
    const v1 = project(a - ui.playerX, extent - ui.playerZ, ui.playerHeading, scale);
    ctx.beginPath();
    ctx.moveTo(v0.x, v0.y);
    ctx.lineTo(v1.x, v1.y);
    ctx.stroke();

    const h0 = project(-extent - ui.playerX, a - ui.playerZ, ui.playerHeading, scale);
    const h1 = project(extent - ui.playerX, a - ui.playerZ, ui.playerHeading, scale);
    ctx.beginPath();
    ctx.moveTo(h0.x, h0.y);
    ctx.lineTo(h1.x, h1.y);
    ctx.stroke();
  }

  const corners = [
    project(-SECTOR_BOUNDS - ui.playerX, -SECTOR_BOUNDS - ui.playerZ, ui.playerHeading, scale),
    project(SECTOR_BOUNDS - ui.playerX, -SECTOR_BOUNDS - ui.playerZ, ui.playerHeading, scale),
    project(SECTOR_BOUNDS - ui.playerX, SECTOR_BOUNDS - ui.playerZ, ui.playerHeading, scale),
    project(-SECTOR_BOUNDS - ui.playerX, SECTOR_BOUNDS - ui.playerZ, ui.playerHeading, scale),
  ];
  ctx.strokeStyle = "rgba(222,41,68,0.28)";
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  ctx.moveTo(corners[0]!.x, corners[0]!.y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i]!.x, corners[i]!.y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "rgba(240,239,243,0.2)";
  ctx.lineWidth = 1.15 * dpr;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, inner * (i / 3), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(240,239,243,0.28)";
  ctx.lineWidth = 1.4 * dpr;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const tick = project(Math.cos(angle), Math.sin(angle), ui.playerHeading, 1);
    const len = Math.max(0.0001, Math.hypot(tick.x, tick.y));
    const nx = tick.x / len;
    const ny = tick.y / len;
    ctx.beginPath();
    ctx.moveTo(nx * (inner - 7 * dpr), ny * (inner - 7 * dpr));
    ctx.lineTo(nx * inner, ny * inner);
    ctx.stroke();
  }

  for (let i = 0; i < ui.blipCount; i++) {
    const blip = ui.blips[i]!;
    const mapped = project(
      blip.x - ui.playerX,
      blip.z - ui.playerZ,
      ui.playerHeading,
      scale,
    );
    const rim = clampToRim(mapped.x, mapped.y, inner - 5 * dpr);
    if (blip.kind === "gate") {
      drawGateBlip(ctx, rim.x, rim.y, dpr, rim.clipped);
    } else {
      drawEnemyBlip(ctx, rim.x, rim.y, dpr, rim.clipped);
    }
  }

  drawPlayer(ctx, dpr);
  ctx.restore();

  const vignette = ctx.createRadialGradient(cx, cy, inner * 0.45, cx, cy, inner);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1.2 * dpr, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(240,239,243,0.16)";
  ctx.lineWidth = 2.4 * dpr;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, inner + 1.5 * dpr, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 3 * dpr;
  ctx.stroke();

  const north = project(0, -1, ui.playerHeading, 1);
  const nLen = Math.max(0.0001, Math.hypot(north.x, north.y));
  const nx = cx + (north.x / nLen) * (inner + 1 * dpr);
  const ny = cy + (north.y / nLen) * (inner + 1 * dpr);
  ctx.font = `700 ${11 * dpr}px "Space Grotesk", "DM Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f0eff3";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillText("N", nx, ny);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, dpr: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -8.5 * dpr);
  ctx.lineTo(5.4 * dpr, 6.2 * dpr);
  ctx.lineTo(0, 3.4 * dpr);
  ctx.lineTo(-5.4 * dpr, 6.2 * dpr);
  ctx.closePath();
  ctx.fillStyle = "#f0eff3";
  ctx.strokeStyle = "#111114";
  ctx.lineWidth = 1.1 * dpr;
  ctx.fill();
  ctx.stroke();
}

function drawEnemyBlip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dpr: number,
  clipped: boolean,
): void {
  const size = (clipped ? 3.4 : 4.1) * dpr;
  ctx.fillStyle = "#de2944";
  ctx.shadowColor = "#de2944";
  ctx.shadowBlur = 5 * dpr;
  ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
  ctx.shadowBlur = 0;
}

function drawGateBlip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dpr: number,
  clipped: boolean,
): void {
  const size = (clipped ? 5.2 : 6.4) * dpr;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#67e8f9";
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 8 * dpr;
  ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
  ctx.restore();
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const syncSize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.max(1, Math.round(bounds.width * dpr));
      const nextH = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(canvas);

    let frame = 0;
    const tick = () => {
      syncSize();
      drawRadar(ctx, canvas.width, canvas.height);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="radar" role="img" aria-label="Sector radar">
      <canvas ref={canvasRef} />
    </div>
  );
}
