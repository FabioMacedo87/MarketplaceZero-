import * as THREE from 'three';
import portoCobblePhotoUrl from '../assets/images/porto_cobblestone_street_1795724213261.jpg';
import portoFacadePhotoUrl from '../assets/images/porto_granite_facade_1795724213215.jpg';
import type { FacadeStyle } from './types.ts';

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadCachedImage(url: string): Promise<HTMLImageElement> {
  let promise = imageCache.get(url);
  if (!promise) {
    promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
    imageCache.set(url, promise);
  }
  return promise;
}

function drawRoadMarkingsAndPuddles(
  ctx: CanvasRenderingContext2D,
  rCtx: CanvasRenderingContext2D,
  size: number,
) {
  // Wet Atlantic rain puddles across the granite paving
  for (let i = 0; i < 6; i++) {
    const px = ((85 + i * 89) % 340) * (size / 512);
    const py = ((55 + i * 131) % 400) * (size / 512);
    const rx = (44 + (i % 3) * 24) * (size / 512);
    const ry = (68 + (i % 2) * 32) * (size / 512);
    const rGrad = rCtx.createRadialGradient(px, py, 6, px, py, Math.max(rx, ry));
    rGrad.addColorStop(0, '#141414');
    rGrad.addColorStop(0.55, '#4A4A4A');
    rGrad.addColorStop(1, 'rgba(184,184,184,0)');
    rCtx.fillStyle = rGrad;
    rCtx.beginPath();
    rCtx.ellipse(px, py, rx, ry, 0.2, 0, Math.PI * 2);
    rCtx.fill();

    const cGrad = ctx.createRadialGradient(px, py, 6, px, py, Math.max(rx, ry));
    cGrad.addColorStop(0, 'rgba(8, 13, 22, 0.34)');
    cGrad.addColorStop(1, 'rgba(8, 13, 22, 0)');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    cGrad && ctx.ellipse(px, py, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp European white edge lines & center dashed road divider + tram rail hint
  const s = size / 512;
  ctx.fillStyle = 'rgba(241, 245, 249, 0.86)';
  ctx.fillRect(14 * s, 0, 7 * s, size);
  ctx.fillRect(size - 21 * s, 0, 7 * s, size);

  ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
  for (let y = 18 * s; y < size; y += 96 * s) {
    ctx.fillRect(size / 2 - 4 * s, y, 8 * s, 48 * s);
  }
}

// Photorealistic Porto Granite Cobblestones (Paralelo do Porto) + Wet Specular Puddles
export function createAsphaltTextures(anisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const [cColor, ctx] = createCanvas(size, size);
  const [cRough, rCtx] = createCanvas(size, size);
  const [cNorm, nCtx] = createCanvas(size, size);

  ctx.fillStyle = '#2A303B';
  ctx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#B8B8B8';
  rCtx.fillRect(0, 0, size, size);

  nCtx.fillStyle = 'rgb(128,128,255)';
  nCtx.fillRect(0, 0, size, size);

  // Instant procedural granite under-layer while real photo decodes
  const rowH = 32;
  const stoneW = 56;
  for (let row = 0; row < size / rowH; row++) {
    const y = row * rowH;
    const offset = (row % 2) * (stoneW * 0.5);
    for (let col = -1; col < size / stoneW + 1; col++) {
      const x = col * stoneW + offset;
      const hash = Math.abs(Math.sin((row * 29 + col * 17) * 12.9898) * 43758.5453) % 1;
      const shade = Math.round(48 + hash * 24);
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 9})`;
      ctx.fillRect(x + 2, y + 2, stoneW - 4, rowH - 4);

      const nx = Math.round(120 + hash * 16);
      const ny = Math.round(120 + (row % 3) * 5);
      nCtx.fillStyle = `rgb(${nx},${ny},248)`;
      nCtx.fillRect(x + 3, y + 3, stoneW - 6, rowH - 6);
      nCtx.fillStyle = 'rgb(96,96,216)';
      nCtx.fillRect(x, y, stoneW, 3);
    }
  }
  drawRoadMarkingsAndPuddles(ctx, rCtx, size);

  const mapTex = configureTexture(cColor, true, anisotropy);
  const roughTex = configureTexture(cRough, false, anisotropy);
  const normTex = configureTexture(cNorm, false, anisotropy);

  // Upgrade street texture seamlessly to real photographic Porto cobblestone
  loadCachedImage(portoCobblePhotoUrl)
    .then((img) => {
      // Tile 2x2 so cobblestone scale stays natural and crisp
      const half = size / 2;
      ctx.drawImage(img, 0, 0, half, half);
      ctx.drawImage(img, half, 0, half, half);
      ctx.drawImage(img, 0, half, half, half);
      ctx.drawImage(img, half, half, half, half);

      // Subtle atmospheric road darkening for strong contrast with white lane paint
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(0, 0, size, size);

      drawRoadMarkingsAndPuddles(ctx, rCtx, size);
      mapTex.needsUpdate = true;
      roughTex.needsUpdate = true;
    })
    .catch(() => {});

  return {
    map: mapTex,
    roughnessMap: roughTex,
    normalMap: normTex,
  };
}

// Traditional Calçada Portuguesa (Wave mosaic sidewalk pattern)
export function createSidewalkTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size, size);

  ctx.fillStyle = '#D6D1C7';
  ctx.fillRect(0, 0, size, size);

  const tile = 16;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      const wave = Math.sin((x / size) * Math.PI * 4) * 32;
      const band = Math.abs(((y + wave + size) % 128) - 64) < 16;
      const hash = Math.abs(Math.sin((x * 13 + y * 37) * 12.9898) * 43758.5453) % 1;
      if (band) {
        const g = Math.round(42 + hash * 18);
        ctx.fillStyle = `rgb(${g},${g + 2},${g + 6})`;
      } else {
        const g = Math.round(184 + hash * 24);
        ctx.fillStyle = `rgb(${g},${g - 5},${g - 12})`;
      }
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  return configureTexture(canvas, true, anisotropy, 22, 18);
}

// Portuguese Terracotta Roof Tiles (Telha Lusa)
export function createTerracottaRoofTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size);

  ctx.fillStyle = '#9A3412';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 14) {
      const hash = Math.abs(Math.sin((x * 11 + y * 23) * 12.9898) * 43758.5453) % 1;
      const r = Math.round(145 + hash * 42);
      const g = Math.round(58 + hash * 22);
      const b = Math.round(28 + hash * 12);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 1, y + 1, 12, 14);
    }
    ctx.fillStyle = 'rgba(45, 16, 6, 0.4)';
    ctx.fillRect(0, y, size, 2);
  }

  return configureTexture(canvas, true, anisotropy, 3, 3);
}

export function createWoodDeckTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size);

  ctx.fillStyle = '#6B4226';
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 24) {
    const tone = (x / 24) % 3;
    ctx.fillStyle = tone === 0 ? '#74482A' : tone === 1 ? '#5F391F' : '#80502F';
    ctx.fillRect(x + 2, 0, 20, size);
    ctx.fillStyle = '#3B200E';
    ctx.fillRect(x, 0, 2, size);
  }

  return configureTexture(canvas, true, anisotropy, 4, 2);
}

export function createWaterNormalTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const dx =
        Math.cos(u * 3 + Math.sin(v * 2)) * 0.45 +
        Math.cos(u * 7 - v * 4) * 0.25 +
        Math.sin(u * 11 + v * 9) * 0.12;
      const dy =
        Math.sin(v * 4 + Math.cos(u * 2)) * 0.45 +
        Math.sin(v * 6 + u * 5) * 0.25 +
        Math.cos(v * 13 - u * 8) * 0.12;

      const nx = Math.max(0, Math.min(255, Math.round((dx * 0.35 + 0.5) * 255)));
      const ny = Math.max(0, Math.min(255, Math.round((dy * 0.35 + 0.5) * 255)));
      const idx = (y * size + x) * 4;
      data[idx] = nx;
      data[idx + 1] = ny;
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return configureTexture(canvas, false, anisotropy, 12, 22);
}

export function createBuildingFacadeTextures(
  baseColor: string,
  accentColor: string,
  floors: number,
  seed: number,
  anisotropy: number,
  facadeStyle: FacadeStyle = 'granite',
): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 1024;
  const [cMap, ctx] = createCanvas(w, h);
  const [cEmis, eCtx] = createCanvas(w, h);
  const [cRough, rCtx] = createCanvas(w, h);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, w, h);

  rCtx.fillStyle = facadeStyle === 'azulejo' ? '#424242' : '#B8B8B8';
  rCtx.fillRect(0, 0, w, h);

  if (facadeStyle === 'azulejo') {
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 0, w, h);
    const tileSz = 32;
    for (let y = 0; y < h; y += tileSz) {
      for (let x = 0; x < w; x += tileSz) {
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.32)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSz, tileSz);
        if ((x / tileSz + y / tileSz) % 2 === 0) {
          ctx.fillStyle = 'rgba(30, 64, 175, 0.22)';
          ctx.fillRect(x + 6, y + 6, tileSz - 12, tileSz - 12);
        }
      }
    }
  } else if (facadeStyle === 'white_concrete') {
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.24)';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // Window bays for emissive night lighting & glossy glass roughness
  const cols = facadeStyle === 'white_concrete' ? 6 : 5;
  const rows = facadeStyle === 'white_concrete' ? Math.max(3, Math.min(8, floors)) : 3;
  const cellW = w / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    const isGroundFloor = r === rows - 1;
    for (let c = 0; c < cols; c++) {
      const padX = isGroundFloor ? 28 : 34;
      const padY = isGroundFloor ? 28 : 32;
      const wx = c * cellW + padX;
      const wy = r * cellH + padY;
      const ww = cellW - padX * 2;
      const wh = cellH - padY * 2;

      ctx.fillStyle = facadeStyle === 'white_concrete' ? '#334155' : '#64748B';
      ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
      const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, wy, ww, wh);

      rCtx.fillStyle = '#181818';
      rCtx.fillRect(wx, wy, ww, wh);

      const hash = Math.abs(Math.sin((r * 31 + c * 17 + seed * 7) * 12.9898) * 43758.5453) % 1;
      if (isGroundFloor || hash > 0.34) {
        const warm = hash > 0.5;
        eCtx.fillStyle = isGroundFloor ? '#FDE68A' : warm ? '#FEF08A' : accentColor;
        eCtx.globalAlpha = isGroundFloor ? 0.72 : 0.38 + hash * 0.42;
        eCtx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
        eCtx.globalAlpha = 1;
      }
    }
  }

  const mapTex = configureTexture(cMap, true, anisotropy);
  const emisTex = configureTexture(cEmis, true, anisotropy);
  const roughTex = configureTexture(cRough, false, anisotropy);

  // Composite real architectural photography of Porto granite, azulejos & Juliet balconies
  if (facadeStyle !== 'white_concrete') {
    loadCachedImage(portoFacadePhotoUrl)
      .then((img) => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        if (facadeStyle === 'ochre') {
          ctx.fillStyle = baseColor;
          ctx.globalAlpha = 0.28;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
        } else if (facadeStyle === 'azulejo') {
          ctx.fillStyle = '#1D4ED8';
          ctx.globalAlpha = 0.16;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = baseColor;
          ctx.globalAlpha = 0.14;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
        }

        mapTex.needsUpdate = true;
      })
      .catch(() => {});
  }

  return {
    map: mapTex,
    emissiveMap: emisTex,
    roughnessMap: roughTex,
  };
}

// Traditional Portuguese Azulejo Monument / Street Plaque
export function createLandmarkSignTexture(title: string, subtitle?: string): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(512, 128);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 476, 92);

  ctx.fillStyle = '#1E3A8A';
  ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.slice(0, 28), 256, subtitle ? 50 : 64);

  if (subtitle) {
    ctx.fillStyle = '#334155';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle.slice(0, 36), 256, 86);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [canvas, ctx] = createCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createNameplateTexture(label: string, accentHex = '#38BDF8'): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas(256, 64);
  ctx.clearRect(0, 0, 256, 64);

  ctx.fillStyle = 'rgba(9, 13, 22, 0.84)';
  ctx.beginPath();
  ctx.roundRect(12, 10, 232, 44, 12);
  ctx.fill();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.slice(0, 18), 128, 33);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
