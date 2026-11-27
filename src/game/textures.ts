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

// Procedural PBR asphalt for Porto and Gaia road surfaces.
// Lane paint is added as geometry in scene3d.ts, never baked into the texture.
export function createAsphaltTextures(anisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const [colorCanvas, colorCtx] = createCanvas(size, size);
  const [roughCanvas, roughCtx] = createCanvas(size, size);
  const [normalCanvas, normalCtx] = createCanvas(size, size);

  const colorPixels = colorCtx.createImageData(size, size);
  const roughPixels = roughCtx.createImageData(size, size);
  const normalPixels = normalCtx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const broad =
        Math.sin((x / size) * Math.PI * 8 + Math.sin((y / size) * Math.PI * 4)) * 0.5 +
        Math.cos((y / size) * Math.PI * 10 - (x / size) * Math.PI * 3) * 0.35;
      const grain = Math.abs(Math.sin((x * 127.1 + y * 311.7) * 0.017) * 43758.5453) % 1;
      const fine = Math.abs(Math.sin((x * 269.5 + y * 183.3) * 0.071) * 24634.6345) % 1;
      const tone = 43 + broad * 4.5 + (grain - 0.5) * 12 + (fine - 0.5) * 8;
      const value = Math.max(27, Math.min(68, Math.round(tone)));

      colorPixels.data[index] = value;
      colorPixels.data[index + 1] = value + 1;
      colorPixels.data[index + 2] = value + 4;
      colorPixels.data[index + 3] = 255;

      const rough = Math.max(150, Math.min(245, Math.round(212 + broad * 10 + (grain - 0.5) * 28)));
      roughPixels.data[index] = rough;
      roughPixels.data[index + 1] = rough;
      roughPixels.data[index + 2] = rough;
      roughPixels.data[index + 3] = 255;

      const nx = Math.max(0, Math.min(255, Math.round(128 + (grain - 0.5) * 14 + broad * 4)));
      const ny = Math.max(0, Math.min(255, Math.round(128 + (fine - 0.5) * 14 - broad * 3)));
      normalPixels.data[index] = nx;
      normalPixels.data[index + 1] = ny;
      normalPixels.data[index + 2] = 250;
      normalPixels.data[index + 3] = 255;
    }
  }

  colorCtx.putImageData(colorPixels, 0, 0);
  roughCtx.putImageData(roughPixels, 0, 0);
  normalCtx.putImageData(normalPixels, 0, 0);

  // Faded wheel paths and small tar repairs add scale without making roads look dirty.
  colorCtx.save();
  colorCtx.globalAlpha = 0.12;
  colorCtx.strokeStyle = '#15181d';
  colorCtx.lineWidth = 34;
  colorCtx.beginPath();
  colorCtx.moveTo(size * 0.31, 0);
  colorCtx.bezierCurveTo(size * 0.28, size * 0.32, size * 0.34, size * 0.68, size * 0.31, size);
  colorCtx.moveTo(size * 0.68, 0);
  colorCtx.bezierCurveTo(size * 0.65, size * 0.3, size * 0.72, size * 0.72, size * 0.69, size);
  colorCtx.stroke();

  for (let i = 0; i < 13; i += 1) {
    const x = (i * 173 + 91) % size;
    const y = (i * 257 + 47) % size;
    const w = 34 + (i % 4) * 22;
    const h = 18 + (i % 3) * 13;
    colorCtx.fillStyle = i % 2 === 0 ? '#24272c' : '#62656a';
    colorCtx.globalAlpha = 0.13;
    colorCtx.beginPath();
    colorCtx.roundRect(x, y, w, h, 5);
    colorCtx.fill();
  }
  colorCtx.restore();

  // Subtle wet patches catch highlights without making every road glossy.
  roughCtx.save();
  for (let i = 0; i < 7; i += 1) {
    const x = (i * 149 + 76) % size;
    const y = (i * 223 + 118) % size;
    const radius = 28 + (i % 3) * 18;
    const gradient = roughCtx.createRadialGradient(x, y, 4, x, y, radius);
    gradient.addColorStop(0, 'rgba(95,95,95,0.46)');
    gradient.addColorStop(1, 'rgba(205,205,205,0)');
    roughCtx.fillStyle = gradient;
    roughCtx.beginPath();
    roughCtx.ellipse(x, y, radius * 1.4, radius * 0.72, 0.18, 0, Math.PI * 2);
    roughCtx.fill();
  }
  roughCtx.restore();

  const map = configureTexture(colorCanvas, true, anisotropy);
  const roughnessMap = configureTexture(roughCanvas, false, anisotropy);
  const normalMap = configureTexture(normalCanvas, false, anisotropy);
  return { map, roughnessMap, normalMap };
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
        ctx.fillStyle = 'rgb(' + g + ',' + (g + 2) + ',' + (g + 6) + ')';
      } else {
        const g = Math.round(184 + hash * 24);
        ctx.fillStyle = 'rgb(' + g + ',' + (g - 5) + ',' + (g - 12) + ')';
      }
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  const texture = configureTexture(canvas, true, anisotropy, 22, 18);
  loadCachedImage(portoCobblePhotoUrl)
    .then((img) => {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();
      texture.needsUpdate = true;
    })
    .catch(() => {});
  return texture;
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
