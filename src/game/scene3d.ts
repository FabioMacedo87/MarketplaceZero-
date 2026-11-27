import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import {
  BuildingRig,
  CharacterRig,
  VehicleRig,
  WORLD_SCALE,
  animateCharacterRig,
  createBuildingRig,
  createCharacterRig,
  createDomLuisBridgeMesh,
  createInfanteBridgeMesh,
  createPickupMesh,
  createPortoTramMesh,
  createRabeloBoatMesh,
  createVehicleRig,
  setCharacterRigWeapon,
} from './models3d.ts';
import {
  createAsphaltTextures,
  createContactShadowTexture,
  createSidewalkTexture,
  createWaterNormalTexture,
} from './textures.ts';
import { PROFESSIONS } from './professions.ts';
import { getOutdoorNpcSchedule } from './npcSchedules.ts';
import type { CameraMode, CharacterId, LifeLocation, ProfessionId, RemotePlayer } from './types.ts';
import type { LeonidaEngine } from './engine.ts';
import {
  BRIDGE_YS,
  BUILDINGS,
  CITY_TREES,
  HORIZONTAL_ROADS,
  LIFE_LOCATIONS,
  RIVER_END_X,
  RIVER_START_X,
  ROAD_WIDTH,
  SERVICE_ZONES,
  VERTICAL_ROADS,
  WORLD_H,
  WORLD_W,
} from './world.ts';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _col = new THREE.Color();
const _col2 = new THREE.Color();
const _ndc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.1);
const _hitPoint = new THREE.Vector3();

const MAX_BULLET_INSTANCES = 96;
const MAX_PARTICLE_INSTANCES = 240;
const MAX_SKID_INSTANCES = 360;

interface RemoteRenderEntry {
  charRig: CharacterRig;
  vehRig: VehicleRig | null;
  lastVehType: string | null;
  smoothX: number;
  smoothY: number;
  smoothAngle: number;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return /SwiftShader|llvmpipe|Software Rasterizer/i.test(rendererStr);
  } catch {
    return false;
  }
}

export class LeonidaScene3D {
  public readonly isSoftwareGl: boolean;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;

  private container: HTMLElement;
  private disposables: { dispose: () => void }[] = [];

  private composer: EffectComposer | null = null;
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private playerSpotLight: THREE.SpotLight | null = null;
  private fog: THREE.FogExp2;
  private skyUniforms: {
    uTopColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSunColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uTime: { value: number };
  };

  private waterNormalTex: THREE.CanvasTexture;
  private waterUniforms = { uTime: { value: 0 } };
  private rabelos: { mesh: THREE.Group; baseX: number; baseZ: number; phase: number }[] = [];
  private tramMesh!: THREE.Group;
  private trafficGreenMat!: THREE.MeshStandardMaterial;
  private trafficRedMat!: THREE.MeshStandardMaterial;
  private missionBeaconGroup!: THREE.Group;
  private missionRingMesh!: THREE.Mesh;
  private missionRingMat!: THREE.MeshBasicMaterial;
  private missionBeamMesh!: THREE.Mesh;
  private missionBeamMat!: THREE.MeshBasicMaterial;
  private gpsArrowMesh!: THREE.Mesh;
  private gpsArrowMat!: THREE.MeshStandardMaterial;
  private lampBulbMat!: THREE.MeshStandardMaterial;

  private shadowTex: THREE.CanvasTexture;
  private buildingRigs: BuildingRig[] = [];
  private vehicleRigs = new Map<string, VehicleRig>();
  private pedRigs = new Map<string, CharacterRig>();
  private guardRigs = new Map<string, CharacterRig>();
  private pickupMeshes = new Map<string, THREE.Group>();
  private lifeLocationMarkers = new Map<
    string,
    { group: THREE.Group; ring: THREE.Mesh; ringMaterial: THREE.MeshBasicMaterial; orb: THREE.Mesh }
  >();
  private lifeLocationNpcs = new Map<string, CharacterRig>();
  private remoteRigs = new Map<string, RemoteRenderEntry>();
  private playerRig: CharacterRig;
  private playerCharacter: CharacterId;

  private bulletMesh: THREE.InstancedMesh;
  private particleMesh: THREE.InstancedMesh;
  private skidMesh: THREE.InstancedMesh;

  private camPos = new THREE.Vector3(164, 10, 98);
  private camLook = new THREE.Vector3(164, 1.5, 88);
  private camYaw = -Math.PI * 0.5;
  private orbitYawOffset = 0;
  private orbitPitchOffset = 0;
  private zoomScale = 1.0;
  private orbitIdleTimer = 0;
  private lastTime = performance.now();
  private contextLost = false;
  private pendingTimerId: number | null = null;
  private pendingRafId: number | null = null;

  constructor(container: HTMLElement, initialCharacter: CharacterId) {
    this.container = container;
    this.playerCharacter = initialCharacter;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0xb9c7d4, 0.00175);
    this.scene.fog = this.fog;

    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.5, 980);
    this.camera.position.copy(this.camPos);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    this.scene.environment = envTex;
    this.scene.environmentIntensity = 0.58;
    roomEnv.dispose();
    pmrem.dispose();
    this.disposables.push(envTex);

    this.skyUniforms = {
      uTopColor: { value: new THREE.Color('#38689a') },
      uHorizonColor: { value: new THREE.Color('#d9c8b8') },
      uSunColor: { value: new THREE.Color('#fff0d6') },
      uSunDir: { value: new THREE.Vector3(-0.7, 0.3, -0.5).normalize() },
      uTime: { value: 0 },
    };
    this.buildSkyDome();

    this.hemiLight = new THREE.HemisphereLight(0xd8e6f4, 0x34302b, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffecd4, 1.78);
    this.sunLight.position.set(-80, 52, -60);
    this.sunLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.near = 5;
      this.sunLight.shadow.camera.far = 260;
      const d = 88;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0004;
      this.sunLight.shadow.normalBias = 0.025;

      this.playerSpotLight = new THREE.SpotLight(0xfef3c7, 0, 52, 0.55, 0.55, 1.5);
      this.scene.add(this.playerSpotLight);
      this.scene.add(this.playerSpotLight.target);
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.shadowTex = createContactShadowTexture();
    this.waterNormalTex = createWaterNormalTexture(maxAniso);
    this.disposables.push(this.shadowTex, this.waterNormalTex);

    this.buildPortoTerrainAndDouro(maxAniso);
    this.buildBuildings(maxAniso);
    this.buildDistantPortoHills();
    this.buildCityTreesAndStreetLamps();
    this.buildRabeloBoatsAndTram();
    this.buildServiceAndMissionMarkers();
    this.buildLifeLocationMarkers();
    this.buildLifeLocationNpcs();

    this.playerRig = createCharacterRig(
      true,
      initialCharacter,
      this.shadowTex,
      !this.isSoftwareGl,
      'pistol',
    );
    this.scene.add(this.playerRig.group);

    const bulletGeo = new THREE.SphereGeometry(0.18, 6, 6);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.bulletMesh = new THREE.InstancedMesh(bulletGeo, bulletMat, MAX_BULLET_INSTANCES);
    this.bulletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bulletMesh.count = 0;
    this.bulletMesh.frustumCulled = false;
    this.scene.add(this.bulletMesh);
    this.disposables.push(bulletGeo, bulletMat);

    const partGeo = new THREE.SphereGeometry(0.32, 6, 6);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLE_INSTANCES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.count = 0;
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    this.disposables.push(partGeo, partMat);

    const skidGeo = new THREE.PlaneGeometry(0.45, 1);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x0b0d12,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    this.skidMesh = new THREE.InstancedMesh(skidGeo, skidMat, MAX_SKID_INSTANCES);
    this.skidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skidMesh.count = 0;
    this.skidMesh.frustumCulled = false;
    this.scene.add(this.skidMesh);
    this.disposables.push(skidGeo, skidMat);

    // Hardware GPU Post-Processing Pipeline (Bloom, Subtle Vignette, ACES Output, FXAA)
    if (!this.isSoftwareGl) {
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      this.composer = new EffectComposer(this.renderer);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.composer.setSize(w, h);

      const renderPass = new RenderPass(this.scene, this.camera);
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.075, 0.28, 0.94);
      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms['offset'].value = 0.88;
      vignettePass.uniforms['darkness'].value = 0.24;
      const outputPass = new OutputPass();
      const fxaaPass = new FXAAPass();

      this.composer.addPass(renderPass);
      this.composer.addPass(bloomPass);
      this.composer.addPass(vignettePass);
      this.composer.addPass(outputPass);
      this.composer.addPass(fxaaPass);
      this.disposables.push(this.composer);
    }
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
  };

  private handleContextRestored = () => {
    this.contextLost = false;
  };

  private buildSkyDome() {
    const skyGeo = new THREE.SphereGeometry(560, 28, 18);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        uniform float uTime;
        varying vec3 vWorldDir;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise2(p);
            p *= 2.04;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.52));

          // Atlantic cloud layer drifting across Porto skyline
          if (dir.y > 0.04) {
            vec2 cloudUv = dir.xz / (dir.y + 0.18) * 1.45 + vec2(uTime * 0.009, uTime * 0.004);
            float n = fbm(cloudUv);
            float cloudMask = smoothstep(0.52, 0.8, n) * smoothstep(0.04, 0.28, dir.y);
            vec3 cloudCol = mix(uHorizonColor * 1.15 + vec3(0.18), uSunColor * 1.1, 0.42);
            col = mix(col, cloudCol, cloudMask * 0.28);
          }

          float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
          col += uSunColor * pow(sunAmt, 44.0) * 0.58;
          col += uSunColor * pow(sunAmt, 7.0) * 0.13;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.disposables.push(skyGeo, skyMat);
  }

  private buildPortoTerrainAndDouro(anisotropy: number) {
    const portoBankX = RIVER_START_X * WORLD_SCALE;
    const gaiaStartX = RIVER_END_X * WORLD_SCALE;
    const riverW = (RIVER_END_X - RIVER_START_X) * WORLD_SCALE;
    const worldH = WORLD_H * WORLD_SCALE;

    // 1. Calçada Portuguesa Ground for Porto (West) & Vila Nova de Gaia (East)
    const calcadaTex = createSidewalkTexture(anisotropy);
    const groundMat = new THREE.MeshStandardMaterial({
      map: calcadaTex,
      roughness: 0.78,
      metalness: 0.06,
    });
    this.disposables.push(calcadaTex, groundMat);

    const portoGroundGeo = new THREE.PlaneGeometry(1400, 1400);
    portoGroundGeo.rotateX(-Math.PI / 2);
    const portoGround = new THREE.Mesh(portoGroundGeo, groundMat);
    portoGround.position.set(portoBankX - 700, 0.08, worldH * 0.5);
    portoGround.receiveShadow = !this.isSoftwareGl;
    this.scene.add(portoGround);
    this.disposables.push(portoGroundGeo);

    const gaiaGroundGeo = new THREE.PlaneGeometry(900, 1400);
    gaiaGroundGeo.rotateX(-Math.PI / 2);
    const gaiaGround = new THREE.Mesh(gaiaGroundGeo, groundMat);
    gaiaGround.position.set(gaiaStartX + 450, 0.08, worldH * 0.5);
    gaiaGround.receiveShadow = !this.isSoftwareGl;
    this.scene.add(gaiaGround);
    this.disposables.push(gaiaGroundGeo);

    // Granite Stone Quay Walls along Cais da Ribeira (West) & Cais de Gaia (East)
    const quayGeo = new THREE.BoxGeometry(2.6, 2.8, 1200);
    const quayMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ribeiraQuay = new THREE.Mesh(quayGeo, quayMat);
    ribeiraQuay.position.set(portoBankX - 1.2, -1.2, worldH * 0.5);
    const gaiaQuay = new THREE.Mesh(quayGeo, quayMat);
    gaiaQuay.position.set(gaiaStartX + 1.2, -1.2, worldH * 0.5);
    this.scene.add(ribeiraQuay, gaiaQuay);
    this.disposables.push(quayGeo, quayMat);

    // Raised 3D Curb Blocks under every Porto & Gaia landmark block
    const curbMat = new THREE.MeshStandardMaterial({
      map: calcadaTex,
      roughness: 0.8,
      metalness: 0.05,
    });
    for (const b of BUILDINGS) {
      const cw = (b.w + 32) * WORLD_SCALE;
      const cd = (b.h + 32) * WORLD_SCALE;
      const curbGeo = new THREE.BoxGeometry(cw, 0.16, cd);
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set((b.x + b.w * 0.5) * WORLD_SCALE, 0.08, (b.y + b.h * 0.5) * WORLD_SCALE);
      curb.receiveShadow = !this.isSoftwareGl;
      this.scene.add(curb);
      this.disposables.push(curbGeo);
    }
    this.disposables.push(curbMat);

    // 2. Rio Douro River Channel (with animated normal ripples & Atlantic sky reflections)
    const riverGeo = new THREE.PlaneGeometry(riverW + 2, 1600, 20, 48);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0c5468'),
      normalMap: this.waterNormalTex,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.12,
      metalness: 0.58,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
    });
    riverMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.waterUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          transformed.y += sin(transformed.x * 0.35 + uTime * 1.9) * 0.1
                         + cos(transformed.z * 0.25 + uTime * 1.4) * 0.09;
          `,
        );
    };
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set((portoBankX + gaiaStartX) * 0.5, -1.65, worldH * 0.5);
    this.scene.add(river);
    this.disposables.push(riverGeo, riverMat);

    // 3. Porto Cobblestone Granite Streets (Paralelo do Porto)
    const {
      map: streetMap,
      roughnessMap: streetRough,
      normalMap: streetNorm,
    } = createAsphaltTextures(anisotropy);
    const roadW = ROAD_WIDTH * WORLD_SCALE;
    this.disposables.push(streetMap, streetRough, streetNorm);

    for (const rx of VERTICAL_ROADS) {
      const roadLen = worldH + 140;
      const texClone = streetMap.clone();
      texClone.needsUpdate = true;
      texClone.repeat.set(1, roadLen / 20);
      const rMat = new THREE.MeshStandardMaterial({
        map: texClone,
        roughnessMap: streetRough,
        normalMap: streetNorm,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughness: 0.66,
        metalness: 0.12,
      });
      const rGeo = new THREE.PlaneGeometry(roadW, roadLen);
      rGeo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(rGeo, rMat);
      mesh.position.set(rx * WORLD_SCALE, 0.09, worldH * 0.5);
      mesh.receiveShadow = !this.isSoftwareGl;
      this.scene.add(mesh);
      this.disposables.push(texClone, rGeo, rMat);
    }

    for (const ry of HORIZONTAL_ROADS) {
      const isBridgeRow = BRIDGE_YS.includes(ry);
      const roadStart = 0;
      const roadEnd = isBridgeRow ? WORLD_W * WORLD_SCALE + 60 : portoBankX;
      const roadLen = roadEnd - roadStart;
      const texClone = streetMap.clone();
      texClone.needsUpdate = true;
      texClone.repeat.set(1, roadLen / 20);
      const rMat = new THREE.MeshStandardMaterial({
        map: texClone,
        roughnessMap: streetRough,
        normalMap: streetNorm,
        normalScale: new THREE.Vector2(0.85, 0.85),
        roughness: 0.66,
        metalness: 0.12,
      });
      const rGeo = new THREE.PlaneGeometry(roadW, roadLen);
      rGeo.rotateX(-Math.PI / 2);
      rGeo.rotateY(Math.PI / 2);
      const mesh = new THREE.Mesh(rGeo, rMat);
      mesh.position.set(roadLen * 0.5, 0.095, ry * WORLD_SCALE);
      mesh.receiveShadow = !this.isSoftwareGl;
      this.scene.add(mesh);
      this.disposables.push(texClone, rGeo, rMat);

      if (!isBridgeRow) {
        // Also draw Gaia horizontal street segment
        const gLen = WORLD_W * WORLD_SCALE - gaiaStartX + 40;
        const gGeo = new THREE.PlaneGeometry(roadW, gLen);
        gGeo.rotateX(-Math.PI / 2);
        gGeo.rotateY(Math.PI / 2);
        const gMesh = new THREE.Mesh(gGeo, rMat);
        gMesh.position.set(gaiaStartX + gLen * 0.5, 0.095, ry * WORLD_SCALE);
        gMesh.receiveShadow = !this.isSoftwareGl;
        this.scene.add(gMesh);
        this.disposables.push(gGeo);
      }
    }

    // 4. Ponte Dom Luís I (y=1520) & Ponte do Infante (y=260) crossing Rio Douro
    const bridgeCenterX = (portoBankX + gaiaStartX) * 0.5;
    const domLuis = createDomLuisBridgeMesh(riverW + 4, !this.isSoftwareGl);
    domLuis.position.set(bridgeCenterX, 0, 1520 * WORLD_SCALE);
    this.scene.add(domLuis);

    const infante = createInfanteBridgeMesh(riverW + 4, !this.isSoftwareGl);
    infante.position.set(bridgeCenterX, 0, 260 * WORLD_SCALE);
    this.scene.add(infante);

    // 5. Intersection patches + European Crosswalks
    const interGeo = new THREE.PlaneGeometry(roadW * 0.92, roadW * 0.92);
    interGeo.rotateX(-Math.PI / 2);
    const interMat = new THREE.MeshStandardMaterial({
      color: 0x242933,
      roughness: 0.72,
      metalness: 0.1,
    });
    const stripeGeo = new THREE.PlaneGeometry(2.2, 0.55);
    stripeGeo.rotateX(-Math.PI / 2);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.85 });

    for (const rx of VERTICAL_ROADS) {
      for (const ry of HORIZONTAL_ROADS) {
        const ix = rx * WORLD_SCALE;
        const iz = ry * WORLD_SCALE;
        const patch = new THREE.Mesh(interGeo, interMat);
        patch.position.set(ix, 0.1, iz);
        patch.receiveShadow = !this.isSoftwareGl;
        this.scene.add(patch);

        for (let s = -5; s <= 5; s += 2) {
          const stN = new THREE.Mesh(stripeGeo, stripeMat);
          stN.rotation.y = Math.PI / 2;
          stN.position.set(ix + s * 1.15, 0.105, iz - roadW * 0.48);
          this.scene.add(stN);

          const stW = new THREE.Mesh(stripeGeo, stripeMat);
          stW.position.set(ix - roadW * 0.48, 0.105, iz + s * 1.15);
          this.scene.add(stW);
        }
      }
    }
    this.disposables.push(interGeo, interMat, stripeGeo, stripeMat);
  }

  private buildBuildings(anisotropy: number) {
    BUILDINGS.forEach((b, idx) => {
      const rig = createBuildingRig(b, idx + 1, anisotropy, !this.isSoftwareGl);
      this.scene.add(rig.group);
      this.buildingRigs.push(rig);
    });
  }

  private buildDistantPortoHills() {
    // Terracotta-roofed background cityscape & Gaia hillside villas
    const count = 48;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e,
      roughness: 0.85,
      metalness: 0.08,
    });
    const skyline = new THREE.InstancedMesh(geo, mat, count);
    const hillPalette = [0xc2410c, 0xd97706, 0x94a3b8, 0xd6d3d1];
    for (let i = 0; i < count; i++) {
      const side = i % 4;
      let x = -40;
      let z = (i / count) * 280 - 20;
      if (side === 1) {
        x = (i / count) * 320 - 10;
        z = -42 - (i % 3) * 16;
      } else if (side === 2) {
        x = (i / count) * 320 - 10;
        z = WORLD_H * WORLD_SCALE + 42 + (i % 3) * 16;
      } else if (side === 3) {
        x = WORLD_W * WORLD_SCALE + 26 + (i % 4) * 16;
      } else {
        x = -42 - (i % 4) * 18;
      }
      const w = 12 + (i % 5) * 3;
      const h = 8 + ((i * 11) % 18);
      const d = 12 + ((i * 7) % 10);
      _v1.set(x, 0, z);
      _quat.identity();
      _scale.set(w, h, d);
      _mat4.compose(_v1, _quat, _scale);
      skyline.setMatrixAt(i, _mat4);
      _col.setHex(hillPalette[i % hillPalette.length]);
      skyline.setColorAt(i, _col);
    }
    skyline.instanceMatrix.needsUpdate = true;
    if (skyline.instanceColor) skyline.instanceColor.needsUpdate = true;
    skyline.computeBoundingSphere();
    this.scene.add(skyline);
    this.disposables.push(geo, mat);
  }

  private buildCityTreesAndStreetLamps() {
    // 1. Porto Plane Trees & Cypresses (Instanced with natural tint variation)
    const planeTrees = CITY_TREES.filter((t) => t.variant === 'plane');
    const cypressTrees = CITY_TREES.filter((t) => t.variant === 'cypress');

    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 3.8, 12);
    trunkGeo.translate(0, 1.9, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, CITY_TREES.length);
    trunks.castShadow = !this.isSoftwareGl;

    const planeCrownGeo = new THREE.SphereGeometry(2.05, 20, 14);
    const crownPositions = planeCrownGeo.attributes.position;
    for (let vertex = 0; vertex < crownPositions.count; vertex += 1) {
      const x = crownPositions.getX(vertex);
      const y = crownPositions.getY(vertex);
      const z = crownPositions.getZ(vertex);
      const organic = 1
        + 0.035 * Math.sin(x * 2.7 + z * 1.9) * Math.cos(y * 2.4 - x * 1.3)
        + 0.018 * Math.sin(y * 5.2 + z * 3.6);
      crownPositions.setXYZ(vertex, x * organic, y * organic, z * organic);
    }
    planeCrownGeo.computeVertexNormals();
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 });
    const planeCrowns = new THREE.InstancedMesh(planeCrownGeo, leafMat, planeTrees.length * 3);
    planeCrowns.castShadow = !this.isSoftwareGl;

    const cypGeo = new THREE.ConeGeometry(1.15, 5.4, 16, 5);
    cypGeo.translate(0, 2.7, 0);
    const cypCrowns = new THREE.InstancedMesh(cypGeo, leafMat, cypressTrees.length);
    cypCrowns.castShadow = !this.isSoftwareGl;

    let pIdx = 0;
    let cIdx = 0;
    CITY_TREES.forEach((t, idx) => {
      const tx = t.x * WORLD_SCALE;
      const tz = t.y * WORLD_SCALE;
      const s = t.scale;

      _v1.set(tx, 0, tz);
      _euler.set(0, t.angle, 0);
      _quat.setFromEuler(_euler);
      _scale.set(s, s, s);
      _mat4.compose(_v1, _quat, _scale);
      trunks.setMatrixAt(idx, _mat4);

      if (t.variant === 'plane') {
        // Three overlapping, organically shaped canopy clusters create a fuller plane tree.
        const canopyParts = [
          { x: 0, y: 4.28, z: 0, sx: 1.0, sy: 0.82, sz: 1.0 },
          { x: -0.72, y: 4.04, z: 0.16, sx: 0.68, sy: 0.66, sz: 0.72 },
          { x: 0.7, y: 4.18, z: -0.18, sx: 0.72, sy: 0.68, sz: 0.74 },
        ];
        for (let partIndex = 0; partIndex < canopyParts.length; partIndex += 1) {
          const part = canopyParts[partIndex];
          _v1.set(tx + part.x * s, part.y * s, tz + part.z * s);
          _scale.set(s * part.sx, s * part.sy, s * part.sz);
          _mat4.compose(_v1, _quat, _scale);
          planeCrowns.setMatrixAt(pIdx, _mat4);
          const canopyColors = [0x356b48, 0x3f784c, 0x477f50];
          _col.setHex(canopyColors[(idx + partIndex) % canopyColors.length]);
          planeCrowns.setColorAt(pIdx, _col);
          pIdx += 1;
        }
      } else {
        _v1.set(tx, 1.5 * s, tz);
        _scale.set(s, s, s);
        _mat4.compose(_v1, _quat, _scale);
        cypCrowns.setMatrixAt(cIdx, _mat4);
        _col.setHex(0x1f5f3b);
        cypCrowns.setColorAt(cIdx, _col);
        cIdx += 1;
      }
    });

    trunks.instanceMatrix.needsUpdate = true;
    trunks.computeBoundingSphere();
    planeCrowns.instanceMatrix.needsUpdate = true;
    if (planeCrowns.instanceColor) planeCrowns.instanceColor.needsUpdate = true;
    planeCrowns.computeBoundingSphere();
    cypCrowns.instanceMatrix.needsUpdate = true;
    if (cypCrowns.instanceColor) cypCrowns.instanceColor.needsUpdate = true;
    cypCrowns.computeBoundingSphere();

    this.scene.add(trunks, planeCrowns, cypCrowns);
    this.disposables.push(trunkGeo, trunkMat, planeCrownGeo, cypGeo, leafMat);

    // 2. Wrought-Iron Porto Street Lamps (Lampiões do Porto)
    const lampCoords: [number, number, number][] = [];
    for (let z = 180; z <= 2200; z += 260) {
      lampCoords.push([2410 * WORLD_SCALE, z * WORLD_SCALE, Math.PI]);
      lampCoords.push([1560 * WORLD_SCALE, z * WORLD_SCALE, 0]);
      lampCoords.push([1720 * WORLD_SCALE, z * WORLD_SCALE, Math.PI]);
      lampCoords.push([840 * WORLD_SCALE, z * WORLD_SCALE, 0]);
    }
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.14, 5.0, 6);
    poleGeo.translate(0, 2.5, 0);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.78,
      roughness: 0.35,
    });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampCoords.length);

    const bulbGeo = new THREE.SphereGeometry(0.28, 8, 8);
    this.lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const bulbs = new THREE.InstancedMesh(bulbGeo, this.lampBulbMat, lampCoords.length);

    lampCoords.forEach(([lx, lz, rot], idx) => {
      _v1.set(lx, 0, lz);
      _euler.set(0, rot, 0);
      _quat.setFromEuler(_euler);
      _scale.set(1, 1, 1);
      _mat4.compose(_v1, _quat, _scale);
      poles.setMatrixAt(idx, _mat4);

      _v1.set(lx, 5.15, lz);
      _mat4.compose(_v1, _quat, _scale);
      bulbs.setMatrixAt(idx, _mat4);
    });

    poles.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    bulbs.instanceMatrix.needsUpdate = true;
    bulbs.computeBoundingSphere();
    this.scene.add(poles, bulbs);
    this.disposables.push(poleGeo, poleMat, bulbGeo, this.lampBulbMat);

    // 3. Intersection Traffic Lights
    this.trafficGreenMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.8,
    });
    this.trafficRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.8,
    });
    const tlPoleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.4, 6);
    tlPoleGeo.translate(0, 2.2, 0);
    const tlHeadGeo = new THREE.BoxGeometry(0.32, 0.9, 0.32);
    const tlLensGeo = new THREE.SphereGeometry(0.14, 8, 8);

    const tlCoords: [number, number][] = [];
    for (const rx of VERTICAL_ROADS) {
      for (const ry of HORIZONTAL_ROADS) {
        tlCoords.push([(rx + 92) * WORLD_SCALE, (ry + 92) * WORLD_SCALE]);
      }
    }
    const tlPoles = new THREE.InstancedMesh(tlPoleGeo, poleMat, tlCoords.length);
    const tlHeads = new THREE.InstancedMesh(tlHeadGeo, poleMat, tlCoords.length);
    const tlGreen = new THREE.InstancedMesh(tlLensGeo, this.trafficGreenMat, tlCoords.length);
    const tlRed = new THREE.InstancedMesh(tlLensGeo, this.trafficRedMat, tlCoords.length);

    tlCoords.forEach(([tx, tz], idx) => {
      _quat.identity();
      _scale.set(1, 1, 1);
      _v1.set(tx, 0, tz);
      _mat4.compose(_v1, _quat, _scale);
      tlPoles.setMatrixAt(idx, _mat4);
      _v1.set(tx, 4.4, tz);
      _mat4.compose(_v1, _quat, _scale);
      tlHeads.setMatrixAt(idx, _mat4);
      _v1.set(tx, 4.18, tz);
      _mat4.compose(_v1, _quat, _scale);
      tlGreen.setMatrixAt(idx, _mat4);
      _v1.set(tx, 4.62, tz);
      _mat4.compose(_v1, _quat, _scale);
      tlRed.setMatrixAt(idx, _mat4);
    });

    tlPoles.instanceMatrix.needsUpdate = true;
    tlPoles.computeBoundingSphere();
    tlHeads.instanceMatrix.needsUpdate = true;
    tlHeads.computeBoundingSphere();
    tlGreen.instanceMatrix.needsUpdate = true;
    tlGreen.computeBoundingSphere();
    tlRed.instanceMatrix.needsUpdate = true;
    tlRed.computeBoundingSphere();
    this.scene.add(tlPoles, tlHeads, tlGreen, tlRed);
    this.disposables.push(tlPoleGeo, tlHeadGeo, tlLensGeo, this.trafficGreenMat, this.trafficRedMat);

    // 4. Ribeira Café Esplanadas (Terrace Umbrellas) & Aliados Tram Catenary Arches
    const umbStandGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6);
    umbStandGeo.translate(0, 1.25, 0);
    const umbCanopyGeo = new THREE.ConeGeometry(1.55, 0.65, 8);
    umbCanopyGeo.translate(0, 2.65, 0);
    const umbCanopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const umbCoords: [number, number, number][] = [
      [224, 171, 0xf8fafc],
      [224, 178, 0xe11d48],
      [224, 185, 0xf8fafc],
      [224, 192, 0x0284c7],
      [154, 62, 0xf8fafc],
      [154, 72, 0xd97706],
      [174, 118, 0xf8fafc],
      [174, 128, 0x0284c7],
    ];
    const umbStands = new THREE.InstancedMesh(umbStandGeo, poleMat, umbCoords.length);
    const umbCanopies = new THREE.InstancedMesh(umbCanopyGeo, umbCanopyMat, umbCoords.length);
    umbCanopies.castShadow = !this.isSoftwareGl;
    umbCoords.forEach(([ux, uz, uHex], idx) => {
      _quat.identity();
      _scale.set(1, 1, 1);
      _v1.set(ux, 0, uz);
      _mat4.compose(_v1, _quat, _scale);
      umbStands.setMatrixAt(idx, _mat4);
      umbCanopies.setMatrixAt(idx, _mat4);
      _col.setHex(uHex);
      umbCanopies.setColorAt(idx, _col);
    });
    umbStands.instanceMatrix.needsUpdate = true;
    umbCanopies.instanceMatrix.needsUpdate = true;
    if (umbCanopies.instanceColor) umbCanopies.instanceColor.needsUpdate = true;
    this.scene.add(umbStands, umbCanopies);
    this.disposables.push(umbStandGeo, umbCanopyGeo, umbCanopyMat);

    // Overhead Tram Catenary Wires & Gleaming Steel Tram Rails along Avenida dos Aliados
    const wireGeo = new THREE.CylinderGeometry(0.03, 0.03, 190, 6);
    wireGeo.rotateX(Math.PI / 2);
    const wire = new THREE.Mesh(wireGeo, poleMat);
    wire.position.set(164, 5.2, 120);
    this.scene.add(wire);

    const railGeo = new THREE.BoxGeometry(0.09, 0.05, 196);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.24,
    });
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(163.35, 0.11, 120);
    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(164.65, 0.11, 120);
    this.scene.add(railL, railR);

    // Granite Sidewalk Bollards (Pilaretes) & Cais da Ribeira Iron Balustrades
    const bollardGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.78, 8);
    bollardGeo.translate(0, 0.39, 0);
    const bollardMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.72,
      metalness: 0.2,
    });
    const bollardCoords: [number, number][] = [];
    for (let z = 35; z <= 215; z += 18) {
      bollardCoords.push([156.5, z]);
      bollardCoords.push([171.5, z]);
      bollardCoords.push([246.5, z]);
    }
    const bollards = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardCoords.length);
    bollardCoords.forEach(([bx, bz], idx) => {
      _quat.identity();
      _scale.set(1, 1, 1);
      _v1.set(bx, 0.08, bz);
      _mat4.compose(_v1, _quat, _scale);
      bollards.setMatrixAt(idx, _mat4);
    });
    bollards.instanceMatrix.needsUpdate = true;
    bollards.computeBoundingSphere();

    const ribeiraRailGeo = new THREE.BoxGeometry(0.12, 0.08, 220);
    const ribeiraRail = new THREE.Mesh(ribeiraRailGeo, poleMat);
    ribeiraRail.position.set(246.5, 0.92, 120);
    this.scene.add(bollards, ribeiraRail);

    this.disposables.push(wireGeo, railGeo, railMat, bollardGeo, bollardMat, ribeiraRailGeo);
  }

  private buildRabeloBoatsAndTram() {
    // Traditional Barcos Rabelos gently moored on the Rio Douro between Ribeira & Gaia
    const rabeloCoords: [number, number, number][] = [
      [263, 72, 0.2],
      [269, 118, 1.5],
      [259, 192, 2.7],
      [272, 212, 0.9],
    ];
    for (const [rx, rz, phase] of rabeloCoords) {
      const boat = createRabeloBoatMesh(!this.isSoftwareGl);
      boat.position.set(rx, -1.45, rz);
      boat.rotation.y = Math.PI * 0.45 + (phase % 0.4);
      this.scene.add(boat);
      this.rabelos.push({ mesh: boat, baseX: rx, baseZ: rz, phase });
    }

    // Classic Yellow Elétrico do Porto gliding smoothly along Avenida dos Aliados
    this.tramMesh = createPortoTramMesh(!this.isSoftwareGl);
    this.tramMesh.position.set(164, 0.12, 100);
    this.scene.add(this.tramMesh);
  }

  private buildServiceAndMissionMarkers() {
    for (const z of SERVICE_ZONES) {
      const col = z.id === 'pay-n-spray' ? 0x06b6d4 : 0xf59e0b;
      const ringGeo = new THREE.RingGeometry(
        z.radius * WORLD_SCALE * 0.8,
        z.radius * WORLD_SCALE,
        36,
      );
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(z.x * WORLD_SCALE, 0.14, z.y * WORLD_SCALE);
      this.scene.add(ring);
      this.disposables.push(ringGeo, ringMat);
    }

    // Real-Building Mission Simulation Portal Beacon
    this.missionBeaconGroup = new THREE.Group();
    const mRingGeo = new THREE.RingGeometry(2.8, 4.0, 36);
    mRingGeo.rotateX(-Math.PI / 2);
    this.missionRingMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.missionRingMesh = new THREE.Mesh(mRingGeo, this.missionRingMat);
    this.missionRingMesh.position.y = 0.18;

    const mBeamGeo = new THREE.CylinderGeometry(1.2, 2.0, 42, 16, 1, true);
    mBeamGeo.translate(0, 21, 0);
    this.missionBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.missionBeamMesh = new THREE.Mesh(mBeamGeo, this.missionBeamMat);
    this.missionBeaconGroup.add(this.missionRingMesh, this.missionBeamMesh);
    this.scene.add(this.missionBeaconGroup);

    // 3D Floating GPS Chevron guiding player toward current Porto objective
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(0.85, 0);
    chevronShape.lineTo(-0.55, 0.52);
    chevronShape.lineTo(-0.22, 0);
    chevronShape.lineTo(-0.55, -0.52);
    chevronShape.closePath();
    const arrowGeo = new THREE.ExtrudeGeometry(chevronShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 1,
    });
    arrowGeo.rotateX(-Math.PI / 2);
    arrowGeo.translate(0, -0.08, 0);
    this.gpsArrowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.25,
      metalness: 0.5,
    });
    this.gpsArrowMesh = new THREE.Mesh(arrowGeo, this.gpsArrowMat);
    this.scene.add(this.gpsArrowMesh);

    this.disposables.push(
      mRingGeo,
      this.missionRingMat,
      mBeamGeo,
      this.missionBeamMat,
      arrowGeo,
      this.gpsArrowMat,
    );
  }

  private buildLifeLocationMarkers() {
    for (const location of LIFE_LOCATIONS) {
      const group = new THREE.Group();
      const markerColor = new THREE.Color(location.markerColor);

      const ringGeo = new THREE.RingGeometry(1.45, 1.9, 36);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: markerColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.66,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMaterial);
      ring.position.y = 0.15;
      group.add(ring);

      const baseGeo = new THREE.CylinderGeometry(0.34, 0.46, 0.24, 12);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x172033,
        metalness: 0.72,
        roughness: 0.32,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.23;
      group.add(base);

      const postGeo = new THREE.CylinderGeometry(0.07, 0.1, 1.3, 8);
      const postMat = new THREE.MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: 0.32,
        metalness: 0.45,
        roughness: 0.34,
      });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.98;
      group.add(post);

      const orbGeo = new THREE.SphereGeometry(0.42, 16, 12);
      const orbMat = new THREE.MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: 1.25,
        roughness: 0.2,
        metalness: 0.12,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.y = 1.78;
      group.add(orb);

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(8, 13, 24, 0.88)';
        ctx.beginPath();
        ctx.moveTo(30, 8);
        ctx.lineTo(482, 8);
        ctx.arcTo(504, 8, 504, 30, 22);
        ctx.lineTo(504, 98);
        ctx.arcTo(504, 120, 482, 120, 22);
        ctx.lineTo(30, 120);
        ctx.arcTo(8, 120, 8, 98, 22);
        ctx.lineTo(8, 30);
        ctx.arcTo(8, 8, 30, 8, 22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = location.markerColor;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 42px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${location.icon}  ${location.label.toUpperCase()}`, 256, 66, 462);
      }
      const labelTexture = new THREE.CanvasTexture(canvas);
      labelTexture.colorSpace = THREE.SRGBColorSpace;
      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const label = new THREE.Sprite(labelMaterial);
      label.position.set(0, 3.35, 0);
      label.scale.set(5.2, 1.3, 1);
      group.add(label);

      group.position.set(location.x * WORLD_SCALE, 0, location.y * WORLD_SCALE);
      this.scene.add(group);
      this.lifeLocationMarkers.set(location.id, { group, ring, ringMaterial, orb });

      this.disposables.push(
        ringGeo,
        ringMaterial,
        baseGeo,
        baseMat,
        postGeo,
        postMat,
        orbGeo,
        orbMat,
        labelTexture,
        labelMaterial,
      );
    }
  }

  private buildLifeLocationNpcs() {
    for (const location of LIFE_LOCATIONS) {
      const rig = createCharacterRig(
        false,
        location.npcShirtColor,
        this.shadowTex,
        !this.isSoftwareGl,
        'pistol',
        location.npcName,
        location.npcColor,
      );
      const initialRoutine = getOutdoorNpcSchedule(location.kind, 450);
      rig.group.position.set((location.x + initialRoutine.x) * WORLD_SCALE, 0, (location.y + initialRoutine.y) * WORLD_SCALE);
      this.lifeLocationNpcs.set(location.id, rig);
      this.scene.add(rig.group);
    }
  }

  private syncLifeLocationMarkers(engine: LeonidaEngine, nowSec: number) {
    for (const location of LIFE_LOCATIONS) {
      const marker = this.lifeLocationMarkers.get(location.id);
      if (!marker) continue;
      const distance = Math.hypot(
        engine.player.x - location.x,
        engine.player.y - location.y,
      );
      const active = distance <= location.radius;
      const pulse = 1 + Math.sin(nowSec * 3.2) * 0.08;
      marker.ring.scale.setScalar(active ? pulse * 1.18 : pulse);
      marker.ringMaterial.opacity = active ? 0.96 : 0.58;
      marker.orb.scale.setScalar(active ? 1.22 : 1);
    }
  }

  private syncLifeLocationNpcs(engine: LeonidaEngine, nowSec: number, dt: number) {
    const safeDt = Math.min(Math.max(dt, 0), 0.05);
    LIFE_LOCATIONS.forEach((location, index) => {
      const rig = this.lifeLocationNpcs.get(location.id);
      if (!rig) return;
      const routine = getOutdoorNpcSchedule(location.kind, engine.life.minuteOfDay);
      const targetX = (location.x + routine.x) * WORLD_SCALE;
      const targetZ = (location.y + routine.y) * WORLD_SCALE;
      const dx = targetX - rig.group.position.x;
      const dz = targetZ - rig.group.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0.035) {
        const travel = Math.min(distance, safeDt * 0.72);
        rig.group.position.x += (dx / distance) * travel;
        rig.group.position.z += (dz / distance) * travel;
        rig.group.rotation.y = Math.atan2(dx, dz);
      } else {
        const faceX = engine.player.x * WORLD_SCALE - rig.group.position.x;
        const faceZ = engine.player.y * WORLD_SCALE - rig.group.position.z;
        rig.group.rotation.y = Math.atan2(faceX, faceZ);
      }
      animateCharacterRig(rig, distance > 0.035 ? 22 : 0, false, false, nowSec, index * 1.65);
    });
  }

  public syncCharacterModel(character: CharacterId, profession: ProfessionId = 'taxi') {
    if (this.playerCharacter !== character) {
      this.playerCharacter = character;
      const prevWeapon = this.playerRig.equippedWeaponId;
      this.scene.remove(this.playerRig.group);
      this.playerRig = createCharacterRig(
        true,
        character,
        this.shadowTex,
        !this.isSoftwareGl,
        prevWeapon,
      );
      this.scene.add(this.playerRig.group);
    }
    this.playerRig.jacketMat.color.set(PROFESSIONS[profession].uniformHex);
  }

  public getCameraYawXZ(): number {
    return this.camYaw + this.orbitYawOffset;
  }

  public adjustOrbit(deltaYawRad: number, deltaPitchRad: number) {
    this.orbitYawOffset = normalizeAngleRad(this.orbitYawOffset + deltaYawRad);
    this.orbitPitchOffset = THREE.MathUtils.clamp(this.orbitPitchOffset + deltaPitchRad, -0.24, 0.48);
    this.orbitIdleTimer = 0;
  }

  public adjustZoom(delta: number) {
    this.zoomScale = THREE.MathUtils.clamp(this.zoomScale + delta, 0.72, 1.58);
  }

  public screenToWorld2D(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    _ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    _raycaster.setFromCamera(_ndc, this.camera);
    if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
      return {
        x: _hitPoint.x / WORLD_SCALE,
        y: _hitPoint.z / WORLD_SCALE,
      };
    }
    return null;
  }

  public resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  }

  public updateAndRender(
    engine: LeonidaEngine,
    remotePlayers: Map<string, RemotePlayer>,
    dt: number,
    cameraMode: CameraMode,
  ) {
    if (this.contextLost) return;

    const nowSec = performance.now() * 0.001;
    this.skyUniforms.uTime.value = nowSec;
    this.waterUniforms.uTime.value = nowSec;
    this.waterNormalTex.offset.set(nowSec * 0.014, nowSec * 0.01);

    // Bobbing Barcos Rabelos on Rio Douro
    for (const b of this.rabelos) {
      b.mesh.position.y = -1.48 + Math.sin(nowSec * 1.3 + b.phase) * 0.14;
      b.mesh.rotation.z = Math.sin(nowSec * 1.1 + b.phase) * 0.025;
    }

    // Gliding Elétrico do Porto along Avenida dos Aliados
    if (this.tramMesh) {
      const tramZ = 120 + Math.sin(nowSec * 0.16) * 85;
      this.tramMesh.position.z = tramZ;
    }

    const greenPhase = Math.floor(nowSec / 6) % 2 === 0;
    this.trafficGreenMat.emissiveIntensity = greenPhase ? 2.4 : 0.15;
    this.trafficRedMat.emissiveIntensity = greenPhase ? 0.15 : 2.4;

    this.updateAtmosphere(engine.dayTime);
    this.syncVehicles(engine, dt);
    this.syncPlayer(engine, nowSec);
    this.syncPedestrians(engine, nowSec);
    this.syncLifeLocationMarkers(engine, nowSec);
    this.syncLifeLocationNpcs(engine, nowSec, dt);
    this.syncGuards(engine, nowSec);
    this.syncRemotePlayers(remotePlayers, dt, nowSec);
    this.syncPickups(engine, nowSec);
    this.syncInstancedEffects(engine);
    this.updateMissionBeacon(engine, nowSec);
    this.updateCamera(engine, dt, cameraMode);

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private updateAtmosphere(dayTime: number) {
    let topHex = '#101830';
    let horizHex = '#2e2b5f';
    let sunHex = '#ffd27d';
    let fogDensity = 0.0021;
    let sunElev = 0.25;
    let sunIntensity = 1.6;
    let hemiIntensity = 0.75;
    let nightFactor = 0.5;

    if (dayTime < 0.25) {
      const t = dayTime / 0.25;
      topHex = '#0a1228';
      horizHex = '#1f2847';
      sunHex = '#a5b4fc';
      sunElev = 0.15 + t * 0.1;
      sunIntensity = 0.85;
      hemiIntensity = 0.6;
      nightFactor = 1.0;
      fogDensity = 0.0024;
    } else if (dayTime < 0.62) {
      const t = (dayTime - 0.25) / 0.37;
      _col.set('#2268b8').lerp(_col2.set('#2f89d8'), Math.sin(t * Math.PI));
      topHex = `#${_col.getHexString()}`;
      horizHex = '#b8deff';
      sunHex = '#fff4d4';
      sunElev = 0.45 + Math.sin(t * Math.PI) * 0.4;
      sunIntensity = 2.65;
      hemiIntensity = 0.98;
      nightFactor = 0.12;
      fogDensity = 0.0014;
    } else {
      const t = (dayTime - 0.62) / 0.38;
      _col.set('#275296').lerp(_col2.set('#181938'), t);
      topHex = `#${_col.getHexString()}`;
      _col.set('#f6ad7b').lerp(_col2.set('#6b3054'), t);
      horizHex = `#${_col.getHexString()}`;
      sunHex = '#ffae62';
      sunElev = 0.3 - t * 0.22;
      sunIntensity = 2.2 - t * 1.1;
      hemiIntensity = 0.82 - t * 0.2;
      nightFactor = 0.42 + t * 0.58;
      fogDensity = 0.0019 + t * 0.0005;
    }

    this.skyUniforms.uTopColor.value.set(topHex);
    this.skyUniforms.uHorizonColor.value.set(horizHex);
    this.skyUniforms.uSunColor.value.set(sunHex);
    this.skyUniforms.uSunDir.value.set(-0.7, sunElev, -0.5).normalize();

    this.fog.color.set(horizHex);
    this.fog.density = fogDensity;

    this.sunLight.color.set(sunHex);
    this.sunLight.intensity = sunIntensity;
    this.hemiLight.color.set(horizHex);
    this.hemiLight.intensity = hemiIntensity;

    const px = this.camLook.x;
    const pz = this.camLook.z;
    this.sunLight.position.set(
      px + this.skyUniforms.uSunDir.value.x * 110,
      Math.max(18, this.skyUniforms.uSunDir.value.y * 110),
      pz + this.skyUniforms.uSunDir.value.z * 110,
    );
    this.sunLight.target.position.set(px, 0, pz);

    const windowGlow = 0.22 + nightFactor * 1.05;
    for (let i = 0; i < this.buildingRigs.length; i++) {
      this.buildingRigs[i].facadeMat.emissiveIntensity = windowGlow;
    }
    this.lampBulbMat.emissiveIntensity = 0.65 + nightFactor * 1.85;
  }

  private syncVehicles(engine: LeonidaEngine, dt: number) {
    const activeIds = new Set<string>();
    const isNight = engine.dayTime < 0.28 || engine.dayTime > 0.68;
    let playerDrivenVeh = null;

    for (const v of engine.vehicles) {
      activeIds.add(v.id);
      let rig = this.vehicleRigs.get(v.id);
      if (!rig) {
        rig = createVehicleRig(v.type, v.color, this.shadowTex, !this.isSoftwareGl);
        this.vehicleRigs.set(v.id, rig);
        this.scene.add(rig.group);
      }

      if (v.id === engine.player.vehicleId) {
        playerDrivenVeh = v;
      }

      rig.paintMat.color.set(v.color);
      rig.group.position.set(v.x * WORLD_SCALE, 0, v.y * WORLD_SCALE);
      rig.group.rotation.y = -v.angle;

      const spinDelta = -(v.speed * WORLD_SCALE * dt) / 0.38;
      for (const w of rig.wheelRollers) {
        w.rotation.z += spinDelta;
      }

      const targetSteer = v.id === engine.player.vehicleId ? clampSteerVisual(v) : 0;
      for (const p of rig.frontSteerPivots) {
        p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, targetSteer, Math.min(1, dt * 12));
      }

      if (rig.headlightBeam) {
        const isPlayerVeh = v.id === engine.player.vehicleId;
        rig.headlightBeam.visible = isPlayerVeh ? engine.headlightsOn : isNight;
      }
      rig.taillightMat.emissiveIntensity = v.speed < -5 ? 2.4 : 1.0;

      if (v.isPolice && rig.sirenRed && rig.sirenBlue && rig.sirenLight) {
        if (v.sirenActive) {
          const redOn = Math.sin(v.sirenPhase) > 0;
          rig.sirenRed.emissiveIntensity = redOn ? 3.2 : 0.25;
          rig.sirenBlue.emissiveIntensity = redOn ? 0.25 : 3.2;
          rig.sirenLight.color.setHex(redOn ? 0xef4444 : 0x3b82f6);
          rig.sirenLight.intensity = 2.6;
        } else {
          rig.sirenRed.emissiveIntensity = 0.45;
          rig.sirenBlue.emissiveIntensity = 0.45;
          rig.sirenLight.intensity = 0;
        }
      }
    }

    if (this.playerSpotLight) {
      if (playerDrivenVeh && engine.headlightsOn) {
        const fx = Math.cos(playerDrivenVeh.angle);
        const fz = Math.sin(playerDrivenVeh.angle);
        this.playerSpotLight.intensity = isNight || engine.dayTime > 0.6 ? 52 : 24;
        this.playerSpotLight.position.set(
          playerDrivenVeh.x * WORLD_SCALE + fx * 2.2,
          1.2,
          playerDrivenVeh.y * WORLD_SCALE + fz * 2.2,
        );
        this.playerSpotLight.target.position.set(
          playerDrivenVeh.x * WORLD_SCALE + fx * 18,
          0.1,
          playerDrivenVeh.y * WORLD_SCALE + fz * 18,
        );
      } else {
        this.playerSpotLight.intensity = 0;
      }
    }

    for (const [id, rig] of this.vehicleRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.group);
        this.vehicleRigs.delete(id);
      }
    }
  }

  private syncPlayer(engine: LeonidaEngine, nowSec: number) {
    if (engine.player.vehicleId) {
      this.playerRig.group.visible = false;
      return;
    }
    this.playerRig.group.visible = true;
    this.playerRig.jacketMat.color.set(PROFESSIONS[engine.player.profession].uniformHex);
    setCharacterRigWeapon(this.playerRig, engine.player.currentWeapon);
    this.playerRig.group.position.set(
      engine.player.x * WORLD_SCALE,
      0,
      engine.player.y * WORLD_SCALE,
    );
    this.playerRig.group.rotation.y = -engine.player.angle;

    const spd = Math.hypot(engine.player.vx, engine.player.vy);
    animateCharacterRig(this.playerRig, spd, true, false, nowSec, 0);
  }

  private syncPedestrians(engine: LeonidaEngine, nowSec: number) {
    const activeIds = new Set<string>();
    for (let i = 0; i < engine.pedestrians.length; i++) {
      const p = engine.pedestrians[i];
      activeIds.add(p.id);
      let rig = this.pedRigs.get(p.id);
      if (!rig) {
        rig = createCharacterRig(false, p.shirtColor, this.shadowTex, false);
        this.pedRigs.set(p.id, rig);
        this.scene.add(rig.group);
      }
      rig.group.position.set(p.x * WORLD_SCALE, 0, p.y * WORLD_SCALE);
      rig.group.rotation.y = -p.angle;

      const spd = p.panicTimer > 0 ? p.speed * 2.2 : p.speed;
      animateCharacterRig(rig, spd, false, p.panicTimer > 0, nowSec, i * 1.3);
    }

    for (const [id, rig] of this.pedRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.group);
        this.pedRigs.delete(id);
      }
    }
  }

  private syncGuards(engine: LeonidaEngine, nowSec: number) {
    const activeIds = new Set<string>();
    for (let i = 0; i < engine.guards.length; i++) {
      const g = engine.guards[i];
      activeIds.add(g.id);
      let rig = this.guardRigs.get(g.id);
      if (!rig) {
        rig = createCharacterRig(
          true,
          g.shirtColor,
          this.shadowTex,
          !this.isSoftwareGl,
          'smg',
          'Sindicato',
          '#EF4444',
        );
        this.guardRigs.set(g.id, rig);
        this.scene.add(rig.group);
      }
      rig.group.position.set(g.x * WORLD_SCALE, 0, g.y * WORLD_SCALE);
      rig.group.rotation.y = -g.angle;
      const d = Math.hypot(engine.player.x - g.x, engine.player.y - g.y);
      animateCharacterRig(rig, d > 140 ? g.speed : 0, true, false, nowSec, i * 1.7);
    }

    for (const [id, rig] of this.guardRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.group);
        this.guardRigs.delete(id);
      }
    }
  }

  private syncRemotePlayers(
    remotePlayers: Map<string, RemotePlayer>,
    dt: number,
    nowSec: number,
  ) {
    const activeIds = new Set<string>();
    const safeDt = Math.min(dt, 0.05);

    for (const [id, rp] of remotePlayers.entries()) {
      activeIds.add(id);
      const profDef = PROFESSIONS[rp.profession] ?? PROFESSIONS.taxi;
      let entry = this.remoteRigs.get(id);
      if (!entry) {
        const charRig = createCharacterRig(
          true,
          rp.character,
          this.shadowTex,
          !this.isSoftwareGl,
          rp.weaponId,
          `${rp.name} · ${profDef.shortTitle}`,
          profDef.colorHex,
        );
        charRig.jacketMat.color.set(profDef.uniformHex);
        this.scene.add(charRig.group);
        entry = {
          charRig,
          vehRig: null,
          lastVehType: null,
          smoothX: rp.x,
          smoothY: rp.y,
          smoothAngle: rp.angle,
        };
        this.remoteRigs.set(id, entry);
      } else {
        entry.charRig.jacketMat.color.set(profDef.uniformHex);
      }

      entry.smoothX += (rp.x - entry.smoothX) * Math.min(1, safeDt * 12);
      entry.smoothY += (rp.y - entry.smoothY) * Math.min(1, safeDt * 12);
      entry.smoothAngle = lerpAngle(entry.smoothAngle, rp.angle, Math.min(1, safeDt * 12));

      if (rp.vehicleType) {
        entry.charRig.group.visible = false;
        if (!entry.vehRig || entry.lastVehType !== rp.vehicleType) {
          if (entry.vehRig) this.scene.remove(entry.vehRig.group);
          entry.vehRig = createVehicleRig(
            rp.vehicleType,
            rp.vehicleColor,
            this.shadowTex,
            !this.isSoftwareGl,
          );
          entry.lastVehType = rp.vehicleType;
          this.scene.add(entry.vehRig.group);
        }
        entry.vehRig.paintMat.color.set(rp.vehicleColor);
        entry.vehRig.group.visible = true;
        entry.vehRig.group.position.set(
          entry.smoothX * WORLD_SCALE,
          0,
          entry.smoothY * WORLD_SCALE,
        );
        entry.vehRig.group.rotation.y = -entry.smoothAngle;
        const spinDelta = -(rp.speed * WORLD_SCALE * safeDt) / 0.38;
        for (const w of entry.vehRig.wheelRollers) {
          w.rotation.z += spinDelta;
        }
        if (entry.vehRig.sirenRed && entry.vehRig.sirenBlue && entry.vehRig.sirenLight) {
          if (rp.sirenActive) {
            const redOn = Math.sin(nowSec * 10) > 0;
            entry.vehRig.sirenRed.emissiveIntensity = redOn ? 3.2 : 0.25;
            entry.vehRig.sirenBlue.emissiveIntensity = redOn ? 0.25 : 3.2;
            entry.vehRig.sirenLight.color.setHex(redOn ? 0xef4444 : 0x3b82f6);
            entry.vehRig.sirenLight.intensity = 2.4;
          } else {
            entry.vehRig.sirenRed.emissiveIntensity = 0.45;
            entry.vehRig.sirenBlue.emissiveIntensity = 0.45;
            entry.vehRig.sirenLight.intensity = 0;
          }
        }
      } else {
        if (entry.vehRig) entry.vehRig.group.visible = false;
        entry.charRig.group.visible = true;
        setCharacterRigWeapon(entry.charRig, rp.weaponId);
        entry.charRig.group.position.set(
          entry.smoothX * WORLD_SCALE,
          0,
          entry.smoothY * WORLD_SCALE,
        );
        entry.charRig.group.rotation.y = -entry.smoothAngle;
        const spd = Math.hypot(rp.vx, rp.vy);
        animateCharacterRig(entry.charRig, spd, true, false, nowSec, 2.5);
      }
    }

    for (const [id, entry] of this.remoteRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.charRig.group);
        if (entry.vehRig) this.scene.remove(entry.vehRig.group);
        this.remoteRigs.delete(id);
      }
    }
  }

  private syncPickups(engine: LeonidaEngine, nowSec: number) {
    const activeIds = new Set<string>();
    for (const pk of engine.pickups) {
      activeIds.add(pk.id);
      let mesh = this.pickupMeshes.get(pk.id);
      if (!mesh) {
        mesh = createPickupMesh(pk.kind);
        this.pickupMeshes.set(pk.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(pk.x * WORLD_SCALE, Math.sin(pk.bobPhase) * 0.18, pk.y * WORLD_SCALE);
      mesh.children[0].rotation.y = nowSec * 2.2;
    }

    for (const [id, mesh] of this.pickupMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.pickupMeshes.delete(id);
      }
    }
  }

  private syncInstancedEffects(engine: LeonidaEngine) {
    const bCount = Math.min(engine.bullets.length, MAX_BULLET_INSTANCES);
    this.bulletMesh.count = bCount;
    for (let i = 0; i < bCount; i++) {
      const b = engine.bullets[i];
      _v1.set(b.x * WORLD_SCALE, 1.15, b.y * WORLD_SCALE);
      _quat.identity();
      const s = b.isExplosive ? 2.4 : 1.15;
      _scale.set(s, s, s);
      _mat4.compose(_v1, _quat, _scale);
      this.bulletMesh.setMatrixAt(i, _mat4);
      _col.setHex(b.isExplosive ? 0xf97316 : b.fromPolice ? 0xef4444 : 0xfde047);
      this.bulletMesh.setColorAt(i, _col);
    }
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    if (this.bulletMesh.instanceColor) this.bulletMesh.instanceColor.needsUpdate = true;

    const pCount = Math.min(engine.particles.length, MAX_PARTICLE_INSTANCES);
    this.particleMesh.count = pCount;
    for (let i = 0; i < pCount; i++) {
      const p = engine.particles[i];
      const lifeRatio = Math.max(0.1, p.life / p.maxLife);
      const r = p.size * WORLD_SCALE * 1.45 * lifeRatio;
      _v1.set(p.x * WORLD_SCALE, p.z, p.y * WORLD_SCALE);
      _quat.identity();
      _scale.set(r, r, r);
      _mat4.compose(_v1, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      _col.set(p.color);
      this.particleMesh.setColorAt(i, _col);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;

    const sCount = Math.min(engine.skidMarks.length, MAX_SKID_INSTANCES);
    this.skidMesh.count = sCount;
    for (let i = 0; i < sCount; i++) {
      const s = engine.skidMarks[i];
      const mx = (s.x1 + s.x2) * 0.5 * WORLD_SCALE;
      const mz = (s.y1 + s.y2) * 0.5 * WORLD_SCALE;
      const dx = (s.x2 - s.x1) * WORLD_SCALE;
      const dz = (s.y2 - s.y1) * WORLD_SCALE;
      const len = Math.max(0.3, Math.hypot(dx, dz));
      const ang = Math.atan2(dx, dz);
      _v1.set(mx, 0.105, mz);
      _euler.set(0, ang, 0);
      _quat.setFromEuler(_euler);
      _scale.set(1, 1, len);
      _mat4.compose(_v1, _quat, _scale);
      this.skidMesh.setMatrixAt(i, _mat4);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  private updateMissionBeacon(engine: LeonidaEngine, nowSec: number) {
    this.missionBeaconGroup.position.set(
      engine.mission.targetX * WORLD_SCALE,
      0,
      engine.mission.targetY * WORLD_SCALE,
    );
    const sim = engine.mission.stage === 'simulate_interior';
    const pulse = 1 + Math.sin(nowSec * (sim ? 8.0 : 4.2)) * 0.16;
    this.missionRingMesh.scale.set(pulse, 1, pulse);
    this.missionBeamMesh.rotation.y = nowSec * (sim ? 2.8 : 1.2);
    const beaconColor = sim ? 0x10b981 : engine.mission.stage === 'deliver' ? 0x38bdf8 : 0xf59e0b;
    this.missionRingMat.color.setHex(beaconColor);
    this.missionBeamMat.color.setHex(beaconColor);

    const dx = engine.mission.targetX - engine.player.x;
    const dy = engine.mission.targetY - engine.player.y;
    const d = Math.hypot(dx, dy);
    if (d < 55) {
      this.gpsArrowMesh.visible = false;
    } else {
      this.gpsArrowMesh.visible = true;
      const dirX = dx / d;
      const dirY = dy / d;
      const anchorDist = engine.player.vehicleId ? 4.2 : 2.6;
      const baseY = (engine.player.vehicleId ? 2.75 : 2.85) + Math.sin(nowSec * 4.5) * 0.12;
      this.gpsArrowMesh.position.set(
        engine.player.x * WORLD_SCALE + dirX * anchorDist,
        baseY,
        engine.player.y * WORLD_SCALE + dirY * anchorDist,
      );
      this.gpsArrowMesh.rotation.y = -Math.atan2(dy, dx);
      this.gpsArrowMat.color.setHex(beaconColor);
      this.gpsArrowMat.emissive.setHex(beaconColor);
    }
  }

  private updateCamera(engine: LeonidaEngine, dt: number, cameraMode: CameraMode) {
    const safeDt = Math.min(dt, 0.05);
    const px = engine.player.x * WORLD_SCALE;
    const pz = engine.player.y * WORLD_SCALE;
    const veh = engine.player.vehicleId
      ? engine.vehicles.find((v) => v.id === engine.player.vehicleId) ?? null
      : null;

    this.orbitIdleTimer += safeDt;
    if (this.orbitIdleTimer > 1.8) {
      this.orbitYawOffset = lerpAngle(this.orbitYawOffset, 0, Math.min(1, safeDt * 2.4));
      this.orbitPitchOffset = THREE.MathUtils.damp(this.orbitPitchOffset, 0, 2.2, safeDt);
    }

    const fwdX = Math.cos(engine.player.angle);
    const fwdZ = Math.sin(engine.player.angle);

    if (cameraMode === 'overhead') {
      const ovH = 34 * this.zoomScale;
      _v1.set(px, ovH, pz + 16 * this.zoomScale);
      _v2.set(px, 0.8, pz);
      this.camYaw = -Math.PI / 2;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 50, 6, safeDt);
    } else if (veh) {
      const backDist = (cameraMode === 'cinematic' ? 9.5 : 13.5) * this.zoomScale;
      const baseHeight = cameraMode === 'cinematic' ? 3.8 : 6.2;
      const height = Math.max(2.2, (baseHeight + this.orbitPitchOffset * 7.5) * this.zoomScale);
      const lookAhead = cameraMode === 'cinematic' ? 9.0 : 7.5;

      this.camYaw = lerpAngle(this.camYaw, engine.player.angle, Math.min(1, safeDt * 5.2));
      const effYaw = this.camYaw + this.orbitYawOffset;
      const cFwdX = Math.cos(effYaw);
      const cFwdZ = Math.sin(effYaw);

      _v1.set(px - cFwdX * backDist, height, pz - cFwdZ * backDist);
      _v2.set(px + cFwdX * lookAhead, 1.4, pz + cFwdZ * lookAhead);

      const speedRatio = Math.min(1, Math.abs(veh.speed) / 600);
      const targetFov = (cameraMode === 'cinematic' ? 62 : 56) + speedRatio * 12;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, safeDt);
    } else {
      const backDist = (cameraMode === 'cinematic' ? 6.8 : 9.2) * this.zoomScale;
      const baseHeight = cameraMode === 'cinematic' ? 3.4 : 4.8;
      const height = Math.max(2.0, (baseHeight + this.orbitPitchOffset * 5.5) * this.zoomScale);
      this.camYaw = lerpAngle(this.camYaw, engine.player.angle, Math.min(1, safeDt * 3.8));
      const effYaw = this.camYaw + this.orbitYawOffset;
      const cFwdX = Math.cos(effYaw);
      const cFwdZ = Math.sin(effYaw);

      _v1.set(px - cFwdX * backDist, height, pz - cFwdZ * backDist);
      _v2.set(px + fwdX * 4.2, 1.5, pz + fwdZ * 4.2);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 56, 6, safeDt);
    }

    this.camera.updateProjectionMatrix();

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _v1.x, 8, safeDt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, Math.max(2.2, _v1.y), 8, safeDt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _v1.z, 8, safeDt);

    this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _v2.x, 10, safeDt);
    this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _v2.y, 10, safeDt);
    this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _v2.z, 10, safeDt);

    const shake = engine.screenShake > 0 ? engine.screenShake * 0.035 : 0;
    _v3.set(
      this.camPos.x + (Math.random() - 0.5) * shake,
      this.camPos.y + (Math.random() - 0.5) * shake,
      this.camPos.z + (Math.random() - 0.5) * shake,
    );

    this.camera.position.copy(_v3);
    this.camera.lookAt(this.camLook);
  }

  public startLoop(onTick: (dt: number) => void) {
    this.stopLoop();
    this.lastTime = performance.now();

    if (this.isSoftwareGl) {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const tick = () => {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.08);
        this.lastTime = now;
        onTick(dt);

        if (typeof gl.fenceSync === 'function') {
          const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (!fence) return;
            const status = gl.clientWaitSync(fence, 0, 0);
            if (status === gl.TIMEOUT_EXPIRED) {
              this.pendingTimerId = window.setTimeout(poll, 80);
            } else {
              gl.deleteSync(fence);
              this.pendingRafId = requestAnimationFrame(tick);
            }
          };
          this.pendingTimerId = window.setTimeout(poll, 80);
        } else {
          this.pendingRafId = requestAnimationFrame(tick);
        }
      };
      this.pendingRafId = requestAnimationFrame(tick);
    } else {
      const tick = (now: number) => {
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        onTick(dt);
        this.pendingRafId = requestAnimationFrame(tick);
      };
      this.pendingRafId = requestAnimationFrame(tick);
    }
  }

  public stopLoop() {
    if (this.pendingRafId !== null) {
      cancelAnimationFrame(this.pendingRafId);
      this.pendingRafId = null;
    }
    if (this.pendingTimerId !== null) {
      clearTimeout(this.pendingTimerId);
      this.pendingTimerId = null;
    }
  }

  public dispose() {
    this.stopLoop();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    for (const d of this.disposables) {
      d.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

function normalizeAngleRad(a: number): number {
  let out = a;
  while (out > Math.PI) out -= Math.PI * 2;
  while (out < -Math.PI) out += Math.PI * 2;
  return out;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function clampSteerVisual(v: { speed: number; angle: number; vx: number; vy: number }): number {
  if (Math.abs(v.speed) < 8) return 0;
  const fwdX = Math.cos(v.angle);
  const fwdY = Math.sin(v.angle);
  const lateral = fwdX * v.vy - fwdY * v.vx;
  return Math.max(-0.38, Math.min(0.38, -lateral * 0.0028));
}

export function drawMinimapCanvas(
  ctx: CanvasRenderingContext2D,
  engine: LeonidaEngine,
  remotePlayers: Map<string, RemotePlayer>,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, width, height);

  const sx = width / WORLD_W;
  const sy = height / WORLD_H;

  // Rio Douro channel
  ctx.fillStyle = '#0c5468';
  ctx.fillRect(RIVER_START_X * sx, 0, (RIVER_END_X - RIVER_START_X) * sx, height);

  // Porto & Gaia granite avenues
  ctx.fillStyle = '#374151';
  for (const rx of VERTICAL_ROADS) {
    ctx.fillRect((rx - ROAD_WIDTH / 2) * sx, 0, ROAD_WIDTH * sx, height);
  }
  for (const ry of HORIZONTAL_ROADS) {
    const isBridge = BRIDGE_YS.includes(ry);
    if (isBridge) {
      ctx.fillRect(0, (ry - ROAD_WIDTH / 2) * sy, width, ROAD_WIDTH * sy);
    } else {
      ctx.fillRect(0, (ry - ROAD_WIDTH / 2) * sy, RIVER_START_X * sx, ROAD_WIDTH * sy);
      ctx.fillRect(RIVER_END_X * sx, (ry - ROAD_WIDTH / 2) * sy, (WORLD_W - RIVER_END_X) * sx, ROAD_WIDTH * sy);
    }
  }

  // Real Porto Landmarks
  ctx.fillStyle = '#64748b';
  for (const b of BUILDINGS) {
    ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
  }

  for (const z of SERVICE_ZONES) {
    ctx.fillStyle = z.id === 'pay-n-spray' ? '#06b6d4' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(z.x * sx, z.y * sy, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Live Multiplayer Players colored by profession
  for (const rp of remotePlayers.values()) {
    const profCol = PROFESSIONS[rp.profession]?.colorHex ?? '#10b981';
    ctx.fillStyle = profCol;
    ctx.beginPath();
    ctx.arc(rp.x * sx, rp.y * sy, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 112 / Speed Radar Emergency Pings
  for (const em of engine.emergencyPings) {
    ctx.strokeStyle = em.kind === '112' ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(em.x * sx, em.y * sy, 5.0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // GPS Dashed Route to Active Objective
  ctx.save();
  ctx.strokeStyle = engine.mission.stage === 'deliver' ? '#38bdf8' : '#f59e0b';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(engine.player.x * sx, engine.player.y * sy);
  ctx.lineTo(engine.mission.targetX * sx, engine.mission.targetY * sy);
  ctx.stroke();
  ctx.restore();

  // Active Real-Building Simulation Marker
  ctx.fillStyle = engine.mission.stage === 'simulate_interior' ? '#10b981' : '#f59e0b';
  ctx.beginPath();
  ctx.arc(engine.mission.targetX * sx, engine.mission.targetY * sy, 4.4, 0, Math.PI * 2);
  ctx.fill();

  // Local Player Arrow
  ctx.save();
  ctx.translate(engine.player.x * sx, engine.player.y * sy);
  ctx.rotate(engine.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(5.5, 0);
  ctx.lineTo(-3.5, -3.5);
  ctx.lineTo(-3.5, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
