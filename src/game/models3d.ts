import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  createBuildingFacadeTextures,
  createLandmarkSignTexture,
  createNameplateTexture,
  createTerracottaRoofTexture,
} from './textures.ts';
import type { Building, CharacterId, Pickup, VehicleType, WeaponId } from './types.ts';

export const WORLD_SCALE = 0.1;

export type VehicleColorMaterial = THREE.Material & { color: THREE.Color };

export interface VehicleRig {
  group: THREE.Group;
  paintMat: VehicleColorMaterial;
  paintMaterials?: VehicleColorMaterial[];
  wheelAxis?: 'x' | 'z';
  taillightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  wheelRollers: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  sirenRed?: THREE.MeshStandardMaterial;
  sirenBlue?: THREE.MeshStandardMaterial;
  sirenLight?: THREE.PointLight;
  headlightBeam?: THREE.Mesh;
}

export interface CharacterRig {
  group: THREE.Group;
  bodyRoot: THREE.Group;
  headGroup: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  weaponMount: THREE.Group;
  equippedWeaponId: WeaponId;
  jacketMat: THREE.MeshPhysicalMaterial;
  nameplate?: THREE.Sprite;
}

export interface BuildingRig {
  group: THREE.Group;
  facadeMat: THREE.MeshStandardMaterial;
  windowGlowMats: THREE.MeshStandardMaterial[];
}

// Shared reusable PBR materials
const SHARED_TIRE_MAT = new THREE.MeshStandardMaterial({
  color: 0x15181e,
  roughness: 0.85,
  metalness: 0.06,
});

const SHARED_RIM_MAT = new THREE.MeshStandardMaterial({
  color: 0xdbe2ea,
  roughness: 0.22,
  metalness: 0.9,
});

const SHARED_ROTOR_MAT = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.35,
  metalness: 0.8,
});

const SHARED_TRIM_MAT = new THREE.MeshStandardMaterial({
  color: 0x111827,
  roughness: 0.58,
  metalness: 0.35,
});

const SHARED_CHROME_MAT = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.14,
  metalness: 0.96,
});

const SHARED_GLASS_MAT = new THREE.MeshPhysicalMaterial({
  color: 0x0b1320,
  roughness: 0.06,
  metalness: 0.15,
  clearcoat: 1.0,
  clearcoatRoughness: 0.06,
  transparent: true,
  opacity: 0.74,
});

const SHARED_GUN_METAL = new THREE.MeshStandardMaterial({
  color: 0x1f2937,
  roughness: 0.32,
  metalness: 0.82,
});

const SHARED_WOOD_MAT = new THREE.MeshStandardMaterial({
  color: 0x7c3f1d,
  roughness: 0.68,
  metalness: 0.05,
});

const SHARED_RPG_MAT = new THREE.MeshStandardMaterial({
  color: 0x3f6212,
  roughness: 0.52,
  metalness: 0.35,
});

const SHARED_GRANITE_MAT = new THREE.MeshStandardMaterial({
  color: 0xa8a29e,
  roughness: 0.86,
  metalness: 0.06,
});

const SHARED_DARK_GRANITE_MAT = new THREE.MeshStandardMaterial({
  color: 0x57534e,
  roughness: 0.88,
  metalness: 0.08,
});

const SHARED_SLATE_MAT = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.58,
  metalness: 0.24,
});

const SHARED_IRON_MAT = new THREE.MeshStandardMaterial({
  color: 0x334155,
  roughness: 0.42,
  metalness: 0.78,
});

const SHARED_WHITE_STONE_MAT = new THREE.MeshStandardMaterial({
  color: 0xe7e5e4,
  roughness: 0.72,
  metalness: 0.04,
});

export function createWeaponMesh(weaponId: WeaponId): THREE.Group {
  const g = new THREE.Group();

  if (weaponId === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.055), SHARED_GUN_METAL);
    slide.position.set(0.14, 0.02, 0);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.05), SHARED_TRIM_MAT);
    grip.position.set(0.03, -0.05, 0);
    grip.rotation.z = 0.2;
    g.add(slide, grip);
    return g;
  }

  if (weaponId === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.07), SHARED_GUN_METAL);
    body.position.set(0.14, 0.02, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), SHARED_CHROME_MAT);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.34, 0.03, 0);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.045), SHARED_TRIM_MAT);
    mag.position.set(0.16, -0.09, 0);
    g.add(body, barrel, mag);
    return g;
  }

  if (weaponId === 'shotgun') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.06), SHARED_WOOD_MAT);
    stock.position.set(-0.04, 0.0, 0);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.085, 0.068), SHARED_GUN_METAL);
    receiver.position.set(0.16, 0.02, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.44, 8), SHARED_GUN_METAL);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.45, 0.04, 0);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.18, 8), SHARED_WOOD_MAT);
    pump.rotation.z = Math.PI / 2;
    pump.position.set(0.38, 0.005, 0);
    g.add(stock, receiver, barrel, pump);
    return g;
  }

  if (weaponId === 'rifle') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.055), SHARED_TRIM_MAT);
    stock.position.set(-0.06, 0.01, 0);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.095, 0.068), SHARED_GUN_METAL);
    receiver.position.set(0.18, 0.025, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), SHARED_GUN_METAL);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.48, 0.035, 0);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.045), SHARED_TRIM_MAT);
    mag.position.set(0.22, -0.09, 0);
    mag.rotation.z = -0.18;
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.16, 8), SHARED_TRIM_MAT);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0.18, 0.095, 0);
    g.add(stock, receiver, barrel, mag, scope);
    return g;
  }

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.055, 0.96, 10), SHARED_RPG_MAT);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0.18, 0.1, 0);
  const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 10), SHARED_WOOD_MAT);
  warhead.rotation.z = -Math.PI / 2;
  warhead.position.set(0.74, 0.1, 0);
  g.add(tube, warhead);
  return g;
}

function createExtrudedCarShell(len: number, wid: number, isCoupe: boolean, isBuggy: boolean): THREE.BufferGeometry {
  const half = len * 0.5;
  const s = new THREE.Shape();
  if (isBuggy) {
    s.moveTo(-half, 0.08);
    s.lineTo(half * 0.96, 0.08);
    s.lineTo(half, 0.28);
    s.lineTo(half * 0.5, 0.48);
    s.lineTo(-half * 0.6, 0.52);
    s.lineTo(-half, 0.44);
    s.closePath();
  } else {
    s.moveTo(-half, 0.05);
    s.lineTo(half * 0.96, 0.04);
    s.lineTo(half, 0.28);
    s.lineTo(half * 0.85, 0.48);
    s.lineTo(half * (isCoupe ? 0.22 : 0.28), 0.58);
    s.lineTo(-half * 0.88, 0.62);
    s.lineTo(-half, 0.44);
    s.closePath();
  }

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: wid * 0.94,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -(wid * 0.94) / 2);
  return geo;
}

export function createVehicleRig(
  type: VehicleType,
  colorHex: string,
  shadowTex: THREE.Texture,
  enableShadows: boolean,
): VehicleRig {
  const group = new THREE.Group();

  const len = type === 'muscle' || type === 'police' ? 5.05 : type === 'buggy' ? 4.4 : 4.85;
  const wid = type === 'muscle' || type === 'police' ? 2.32 : 2.22;
  const wheelR = type === 'buggy' ? 0.44 : 0.37;
  const wheelW = type === 'buggy' ? 0.34 : 0.26;
  const bodyBaseY = wheelR * 0.72;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: type === 'buggy' ? 0.4 : 0.18,
    metalness: 0.52,
    clearcoat: type === 'buggy' ? 0.35 : 1.0,
    clearcoatRoughness: 0.08,
  });

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(len * 1.24, wid * 1.38),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.03;
  group.add(shadowPlane);

  const underbody = new THREE.Mesh(
    new THREE.BoxGeometry(len * 0.92, 0.22, wid * 0.86),
    SHARED_TRIM_MAT,
  );
  underbody.position.set(0, bodyBaseY + 0.09, 0);
  group.add(underbody);

  const shellGeo = createExtrudedCarShell(len, wid, type === 'coupe', type === 'buggy');
  const shell = new THREE.Mesh(shellGeo, paintMat);
  shell.position.set(0, bodyBaseY, 0);
  shell.castShadow = enableShadows;
  shell.receiveShadow = enableShadows;
  group.add(shell);

  const frontBumper = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.24, wid * 1.02),
    type === 'police' ? SHARED_TRIM_MAT : SHARED_CHROME_MAT,
  );
  frontBumper.position.set(len * 0.51, bodyBaseY + 0.2, 0);
  group.add(frontBumper);

  const rearBumper = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.22, wid * 1.01),
    SHARED_TRIM_MAT,
  );
  rearBumper.position.set(-len * 0.51, bodyBaseY + 0.22, 0);
  group.add(rearBumper);

  const mirrorGeo = new THREE.BoxGeometry(0.16, 0.11, 0.24);
  const mirL = new THREE.Mesh(mirrorGeo, paintMat);
  mirL.position.set(len * 0.14, bodyBaseY + 0.72, -wid * 0.55);
  const mirR = mirL.clone();
  mirR.position.z = wid * 0.55;
  group.add(mirL, mirR);

  if (type === 'buggy') {
    const cage = new THREE.Mesh(
      new THREE.BoxGeometry(len * 0.44, 0.52, wid * 0.72),
      SHARED_TRIM_MAT,
    );
    cage.position.set(-0.15, bodyBaseY + 0.78, 0);
    group.add(cage);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.42, wid * 0.74),
      SHARED_GLASS_MAT,
    );
    windshield.position.set(len * 0.14, bodyBaseY + 0.72, 0);
    windshield.rotation.z = 0.42;
    group.add(windshield);
  } else {
    const cabinLen = type === 'coupe' ? len * 0.48 : len * 0.54;
    const cabinH = type === 'coupe' ? 0.5 : 0.6;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(cabinLen, cabinH, wid * 0.84),
      SHARED_GLASS_MAT,
    );
    cabin.position.set(-len * 0.08, bodyBaseY + 0.54 + cabinH * 0.5, 0);
    cabin.castShadow = enableShadows;
    group.add(cabin);

    // Classic Porto black-and-sea-green taxi roof or PSP white-blue livery
    const roofCapMat =
      type === 'police'
        ? new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.25, metalness: 0.2 })
        : type === 'taxi'
          ? new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.15 })
          : paintMat;

    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(cabinLen * 0.76, 0.09, wid * 0.8),
      roofCapMat,
    );
    roofCap.position.set(-len * 0.1, bodyBaseY + 0.56 + cabinH, 0);
    group.add(roofCap);
  }

  // PSP Portugal blue stripe on police car
  if (type === 'police') {
    const doorBand = new THREE.Mesh(
      new THREE.BoxGeometry(len * 0.44, 0.48, wid + 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.28, metalness: 0.22 }),
    );
    doorBand.position.set(-0.06, bodyBaseY + 0.32, 0);
    group.add(doorBand);
  }

  if (type === 'coupe' || type === 'muscle') {
    const spoilerWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.06, wid * 0.98),
      SHARED_TRIM_MAT,
    );
    spoilerWing.position.set(-len * 0.46, bodyBaseY + 0.84, 0);
    group.add(spoilerWing);

    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.08), SHARED_TRIM_MAT);
    strutL.position.set(-len * 0.46, bodyBaseY + 0.7, -wid * 0.3);
    const strutR = strutL.clone();
    strutR.position.z = wid * 0.3;
    group.add(strutL, strutR);
  }

  const exhaustGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.25, 8);
  exhaustGeo.rotateZ(Math.PI / 2);
  const exL = new THREE.Mesh(exhaustGeo, SHARED_CHROME_MAT);
  exL.position.set(-len * 0.52, bodyBaseY + 0.14, -wid * 0.28);
  const exR = exL.clone();
  exR.position.z = wid * 0.28;
  group.add(exL, exR);

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.85,
    roughness: 0.15,
  });
  const hlGeo = new THREE.BoxGeometry(0.1, 0.15, 0.36);
  const hlL = new THREE.Mesh(hlGeo, headlightMat);
  hlL.position.set(len * 0.5 + 0.02, bodyBaseY + 0.38, -wid * 0.32);
  const hlR = hlL.clone();
  hlR.position.z = wid * 0.32;
  group.add(hlL, hlR);

  const beamGeo = new THREE.PlaneGeometry(8.5, wid * 2.1);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const headlightBeam = new THREE.Mesh(beamGeo, beamMat);
  headlightBeam.position.set(len * 0.5 + 4.2, 0.05, 0);
  group.add(headlightBeam);

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.78,
    roughness: 0.2,
  });
  const tlGeo = new THREE.BoxGeometry(0.09, 0.14, 0.4);
  const tlL = new THREE.Mesh(tlGeo, taillightMat);
  tlL.position.set(-len * 0.5 - 0.02, bodyBaseY + 0.42, -wid * 0.32);
  const tlR = tlL.clone();
  tlR.position.z = wid * 0.32;
  group.add(tlL, tlR);

  const wheelRollers: THREE.Object3D[] = [];
  const frontSteerPivots: THREE.Object3D[] = [];
  const tireGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 32);
  tireGeo.rotateX(Math.PI / 2);
  const rotorGeo = new THREE.CylinderGeometry(wheelR * 0.64, wheelR * 0.64, wheelW * 0.5, 24);
  rotorGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(wheelR * 1.12, 0.055, wheelW + 0.03);
  const rimRingGeo = new THREE.TorusGeometry(wheelR * 0.68, 0.045, 8, 28);

  const wheelPositions: [number, number, boolean][] = [
    [len * 0.31, -wid * 0.5 + wheelW * 0.15, true],
    [len * 0.31, wid * 0.5 - wheelW * 0.15, true],
    [-len * 0.31, -wid * 0.5 + wheelW * 0.15, false],
    [-len * 0.31, wid * 0.5 - wheelW * 0.15, false],
  ];

  for (const [wx, wz, isFront] of wheelPositions) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx, wheelR, wz);

    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, SHARED_TIRE_MAT);
    tire.castShadow = enableShadows;
    const rotor = new THREE.Mesh(rotorGeo, SHARED_ROTOR_MAT);
    const spokeA = new THREE.Mesh(spokeGeo, SHARED_RIM_MAT);
    const spokeB = new THREE.Mesh(spokeGeo, SHARED_RIM_MAT);
    spokeB.rotation.z = Math.PI * 0.4;
    const spokeC = new THREE.Mesh(spokeGeo, SHARED_RIM_MAT);
    spokeC.rotation.z = -Math.PI * 0.4;
    const spokeD = new THREE.Mesh(spokeGeo, SHARED_RIM_MAT);
    spokeD.rotation.z = Math.PI * 0.8;
    const spokeE = new THREE.Mesh(spokeGeo, SHARED_RIM_MAT);
    spokeE.rotation.z = -Math.PI * 0.8;
    const rimRing = new THREE.Mesh(rimRingGeo, SHARED_RIM_MAT);
    wheelGroup.add(tire, rotor, rimRing, spokeA, spokeB, spokeC, spokeD, spokeE);

    steerPivot.add(wheelGroup);
    group.add(steerPivot);

    wheelRollers.push(wheelGroup);
    if (isFront) frontSteerPivots.push(steerPivot);
  }

  let sirenRed: THREE.MeshStandardMaterial | undefined;
  let sirenBlue: THREE.MeshStandardMaterial | undefined;
  let sirenLight: THREE.PointLight | undefined;

  if (type === 'police') {
    const barY = bodyBaseY + 1.24;
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 1.32), SHARED_TRIM_MAT);
    barBase.position.set(-0.2, barY, 0);
    group.add(barBase);

    sirenRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.15,
    });
    sirenBlue = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 1.15,
    });

    const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.52), sirenRed);
    redPod.position.set(-0.2, barY + 0.04, -0.34);
    const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.52), sirenBlue);
    bluePod.position.set(-0.2, barY + 0.04, 0.34);
    group.add(redPod, bluePod);

    sirenLight = new THREE.PointLight(0x3b82f6, 0, 14, 2);
    sirenLight.position.set(-0.2, barY + 0.45, 0);
    group.add(sirenLight);
  } else if (type === 'taxi') {
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.74), signMat);
    sign.position.set(-0.2, bodyBaseY + 1.24, 0);
    group.add(sign);
  }

  const rig: VehicleRig = {
    group,
    paintMat,
    taillightMat,
    headlightMat,
    wheelRollers,
    frontSteerPivots,
    sirenRed,
    sirenBlue,
    sirenLight,
    headlightBeam,
    wheelAxis: 'z',
  };

  void loadRealisticVehicleModel(rig, type, colorHex);
  return rig;
}

const VEHICLE_ASSET_FILES: Record<VehicleType, string> = {
  coupe: 'rear-engine-sports-coupe.glb',
  muscle: 'muscle-coupe.glb',
  buggy: 'boxy-off-roader.glb',
  police: 'sport-sedan.glb',
  taxi: 'retro-city-car.glb',
};

const vehicleAssetLoader = new GLTFLoader();
const vehicleAssetCache = new Map<string, Promise<THREE.Group>>();

function getVehicleAssetTemplate(fileName: string): Promise<THREE.Group> {
  const cached = vehicleAssetCache.get(fileName);
  if (cached) return cached;

  const promise = vehicleAssetLoader
    .loadAsync(`/models/cars/${fileName}`)
    .then((gltf) => gltf.scene);
  vehicleAssetCache.set(fileName, promise);
  return promise;
}

async function loadRealisticVehicleModel(
  rig: VehicleRig,
  type: VehicleType,
  colorHex: string,
) {
  const fileName = VEHICLE_ASSET_FILES[type];
  try {
    const template = await getVehicleAssetTemplate(fileName);
    if (!rig.group.parent) return;

    const model = template.clone(true);
    model.rotation.y = Math.PI / 2;
    const paintMaterials: VehicleColorMaterial[] = [];

    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;

      const cloneMaterial = (source: THREE.Material): THREE.Material => {
        const material = source.clone();
        if (material.name.toLowerCase().startsWith('paint') && 'color' in material) {
          const colorMaterial = material as VehicleColorMaterial;
          colorMaterial.color.set(colorHex);
          paintMaterials.push(colorMaterial);
        }
        return material;
      };

      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(cloneMaterial)
        : cloneMaterial(mesh.material);
    });

    // Vinish GLB cars use separate, named wheels so steering and rotation remain functional.
    const wheelNames = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'];
    const wheels = wheelNames
      .map((name) => model.getObjectByName(name))
      .filter((wheel): wheel is THREE.Object3D => Boolean(wheel));
    rig.group.clear();
    rig.group.add(model);

    if (wheels.length === 4) {
      wheels.forEach((wheel) => wheel.rotation.reorder('YXZ'));
      rig.wheelRollers = wheels;
      rig.frontSteerPivots = wheels.slice(0, 2);
      rig.wheelAxis = 'x';
    }

    if (paintMaterials.length > 0) {
      rig.paintMaterials = paintMaterials;
      rig.paintMat = paintMaterials[0];
    }

    rig.headlightBeam = undefined;

    if (type === 'police' && rig.sirenRed && rig.sirenBlue) {
      const lightBarBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.09, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.52, metalness: 0.35 }),
      );
      lightBarBase.position.set(0, 1.55, 0);
      const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.13, 0.23), rig.sirenRed);
      redPod.position.set(-0.28, 1.66, 0);
      const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.13, 0.23), rig.sirenBlue);
      bluePod.position.set(0.28, 1.66, 0);
      model.add(lightBarBase, redPod, bluePod);
      if (rig.sirenLight) {
        rig.sirenLight.position.set(0, 2.0, 0);
        model.add(rig.sirenLight);
      }
    }

    if (type === 'taxi') {
      const taxiSignMaterial = new THREE.MeshStandardMaterial({
        color: 0x6ee7b7,
        emissive: 0x10b981,
        emissiveIntensity: 0.8,
        roughness: 0.25,
      });
      const taxiSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.16, 0.28),
        taxiSignMaterial,
      );
      taxiSign.position.set(0, 1.62, 0);
      model.add(taxiSign);
    }

    console.info('[PORTUGAL LIFE] Veículo realista carregado:', fileName);
  } catch (error) {
    console.warn(`[PORTUGAL LIFE] Não foi possível carregar ${fileName}; a usar o veículo de reserva.`, error);
  }
}

export function createCharacterRig(
  isCombatant: boolean,
  characterOrShirt: CharacterId | string,
  shadowTex: THREE.Texture,
  enableShadows: boolean,
  weaponId: WeaponId = 'pistol',
  nameplateLabel?: string,
  nameplateColor?: string,
): CharacterRig {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);

  const isLucia = characterOrShirt === 'lucia';
  const isJason = characterOrShirt === 'jason';

  const jacketColor = isLucia
    ? 0xe11d48
    : isJason
      ? 0x0284c7
      : new THREE.Color(characterOrShirt).getHex();
  const pantsColor = isLucia ? 0x1e293b : isJason ? 0x334155 : 0x1f2937;
  const skinColor = isLucia ? 0xd99b78 : isJason ? 0xe6b595 : 0xd49a76;

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: skinColor,
    roughness: 0.56,
    metalness: 0.0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.65,
    sheen: 0.22,
    sheenColor: new THREE.Color(0xffb4a2),
  });

  const jacketMat = new THREE.MeshPhysicalMaterial({
    color: jacketColor,
    roughness: 0.76,
    metalness: 0.04,
    sheen: 0.65,
    sheenRoughness: 0.55,
  });

  const pantsMat = new THREE.MeshPhysicalMaterial({
    color: pantsColor,
    roughness: 0.85,
    sheen: 0.35,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.55,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: isJason ? 0x6b3e26 : 0x18181b,
    roughness: 0.68,
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 1.35),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.14, 10, 16), pantsMat);
  pelvis.rotation.x = Math.PI / 2;
  pelvis.position.set(0, 0.9, 0);
  bodyRoot.add(pelvis);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), SHARED_TRIM_MAT);
  belt.scale.set(0.75, 1, 1.12);
  belt.position.set(0, 0.96, 0);
  bodyRoot.add(belt);

  const chest = new THREE.Mesh(
    new THREE.CapsuleGeometry(isLucia ? 0.175 : 0.2, 0.34, 12, 18),
    jacketMat,
  );
  chest.scale.set(0.72, 1, isLucia ? 1.04 : 1.16);
  chest.position.set(0, 1.22, 0);
  chest.castShadow = enableShadows;
  bodyRoot.add(chest);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.14, 10), skinMat);
  neck.position.set(0, 1.52, 0);
  bodyRoot.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.68, 0);
  bodyRoot.add(headGroup);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.145, 24, 18), skinMat);
  cranium.scale.set(0.95, 1.12, 0.88);
  cranium.castShadow = enableShadows;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), skinMat);
  jaw.scale.set(0.92, 0.85, 0.78);
  jaw.position.set(0.03, -0.065, 0);
  headGroup.add(jaw);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 6), skinMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(0.145, -0.01, 0);
  headGroup.add(nose);

  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.152, 22, 16), hairMat);
  hairCrown.scale.set(0.98, 0.95, 0.92);
  hairCrown.position.set(-0.02, 0.045, 0);
  headGroup.add(hairCrown);

  if (isLucia) {
    const ponytail = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 8), hairMat);
    ponytail.position.set(-0.14, -0.04, 0);
    ponytail.rotation.z = 0.55;
    headGroup.add(ponytail);
  }

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.21), SHARED_TRIM_MAT);
  shades.position.set(0.125, 0.025, 0);
  headGroup.add(shades);

  const thighGeo = new THREE.CapsuleGeometry(0.078, 0.28, 10, 14);
  thighGeo.translate(0, -0.2, 0);
  const calfGeo = new THREE.CapsuleGeometry(0.064, 0.28, 10, 14);
  calfGeo.translate(0, -0.2, 0);
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.09, 0.12);
  shoeGeo.translate(0.04, -0.42, 0);

  const makeLeg = (zOffset: number) => {
    const hip = new THREE.Group();
    hip.position.set(0, 0.88, zOffset);
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.castShadow = enableShadows;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    const calf = new THREE.Mesh(calfGeo, pantsMat);
    calf.castShadow = enableShadows;
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    knee.add(calf, shoe);
    hip.add(knee);
    bodyRoot.add(hip);
    return { hip, knee };
  };

  const leftLeg = makeLeg(-0.12);
  const rightLeg = makeLeg(0.12);

  const upperArmGeo = new THREE.CapsuleGeometry(0.056, 0.2, 10, 12);
  upperArmGeo.translate(0, -0.14, 0);
  const foreArmGeo = new THREE.CapsuleGeometry(0.046, 0.19, 10, 12);
  foreArmGeo.translate(0, -0.13, 0);
  const handGeo = new THREE.SphereGeometry(0.05, 8, 8);

  const makeArm = (zOffset: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 1.4, zOffset);
    const upper = new THREE.Mesh(upperArmGeo, jacketMat);
    upper.castShadow = enableShadows;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.27, 0);
    const forearm = new THREE.Mesh(foreArmGeo, skinMat);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(0, -0.26, 0);
    elbow.add(forearm, hand);
    shoulder.add(elbow);
    bodyRoot.add(shoulder);
    return { shoulder, elbow };
  };

  const leftArm = makeArm(-0.25);
  const rightArm = makeArm(0.25);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.02, -0.26, 0);
  rightArm.elbow.add(weaponMount);

  if (isCombatant) {
    weaponMount.add(createWeaponMesh(weaponId));
  }

  let nameplate: THREE.Sprite | undefined;
  if (nameplateLabel) {
    const tex = createNameplateTexture(nameplateLabel, nameplateColor ?? '#38BDF8');
    const spMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    nameplate = new THREE.Sprite(spMat);
    nameplate.position.set(0, 2.35, 0);
    nameplate.scale.set(2.4, 0.6, 1);
    group.add(nameplate);
  }

  return {
    group,
    bodyRoot,
    headGroup,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    weaponMount,
    equippedWeaponId: weaponId,
    jacketMat,
    nameplate,
  };
}

export function setCharacterRigWeapon(rig: CharacterRig, weaponId: WeaponId) {
  if (rig.equippedWeaponId === weaponId) return;
  rig.equippedWeaponId = weaponId;
  while (rig.weaponMount.children.length > 0) {
    rig.weaponMount.remove(rig.weaponMount.children[0]);
  }
  rig.weaponMount.add(createWeaponMesh(weaponId));
}

export function animateCharacterRig(
  rig: CharacterRig,
  speed: number,
  isCombatant: boolean,
  isPanicking: boolean,
  nowSec: number,
  phaseOffset: number,
) {
  const isMoving = speed > 10;
  const freq = speed > 240 ? 13 : isPanicking ? 12 : 8.2;
  const phase = nowSec * freq + phaseOffset;

  if (isMoving) {
    const stride = Math.sin(phase) * (speed > 240 ? 0.72 : 0.54);
    const kneeLeft = Math.max(0, -Math.sin(phase) * 0.75);
    const kneeRight = Math.max(0, Math.sin(phase) * 0.75);

    rig.leftHip.rotation.z = stride;
    rig.rightHip.rotation.z = -stride;
    rig.leftKnee.rotation.z = -kneeLeft;
    rig.rightKnee.rotation.z = -kneeRight;

    rig.bodyRoot.position.y = Math.abs(Math.cos(phase)) * 0.055;
    rig.bodyRoot.rotation.z = speed > 240 ? -0.14 : -0.06;

    rig.leftShoulder.rotation.z = isPanicking ? 2.4 + Math.sin(phase) * 0.3 : -stride * 0.75;
    rig.leftElbow.rotation.z = isPanicking ? 0.5 : 0.35;

    if (isCombatant) {
      rig.rightShoulder.rotation.z = 1.25;
      rig.rightElbow.rotation.z = 0.25;
    } else {
      rig.rightShoulder.rotation.z = isPanicking ? 2.4 - Math.sin(phase) * 0.3 : stride * 0.75;
      rig.rightElbow.rotation.z = isPanicking ? 0.5 : 0.35;
    }
  } else {
    const breathe = Math.sin(nowSec * 2.4 + phaseOffset);
    rig.bodyRoot.position.y = breathe * 0.014;
    rig.bodyRoot.rotation.z = 0;
    rig.headGroup.rotation.y = Math.sin(nowSec * 0.8 + phaseOffset) * 0.14;
    rig.leftHip.rotation.z = 0.03;
    rig.rightHip.rotation.z = -0.03;
    rig.leftKnee.rotation.z = 0;
    rig.rightKnee.rotation.z = 0;
    rig.leftShoulder.rotation.z = 0;
    rig.leftElbow.rotation.z = 0.12;

    if (isCombatant) {
      rig.rightShoulder.rotation.z = 0.95 + breathe * 0.03;
      rig.rightElbow.rotation.z = 0.45;
    } else {
      rig.rightShoulder.rotation.z = 0;
      rig.rightElbow.rotation.z = 0.12;
    }
  }
}

function addAzulejoPlaque(
  group: THREE.Group,
  title: string,
  subtitle: string,
  x: number,
  y: number,
  z: number,
  rotY: number,
) {
  const tex = createLandmarkSignTexture(title, subtitle);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.8),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  plaque.position.set(x, y, z);
  plaque.rotation.y = rotY;
  group.add(plaque);
}

// Bespoke Multi-Part 3D Architectural Replicas of Real Porto Landmarks
export function createBuildingRig(
  b: Building,
  seed: number,
  anisotropy: number,
  enableShadows: boolean,
): BuildingRig {
  const group = new THREE.Group();
  const w = b.w * WORLD_SCALE;
  const d = b.h * WORLD_SCALE;
  const cx = (b.x + b.w * 0.5) * WORLD_SCALE;
  const cz = (b.y + b.h * 0.5) * WORLD_SCALE;
  group.position.set(cx, 0, cz);

  const { map, emissiveMap, roughnessMap } = createBuildingFacadeTextures(
    b.color,
    b.accentColor,
    b.floors,
    seed,
    anisotropy,
    b.facadeStyle,
  );

  const facadeMat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.16,
    roughnessMap,
    roughness: 0.72,
    metalness: 0.12,
  });

  const roofTex = createTerracottaRoofTexture(anisotropy);
  const terracottaMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    roughness: 0.82,
    metalness: 0.05,
  });

  const warmLobbyMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  const windowGlowMats: THREE.MeshStandardMaterial[] = [warmLobbyMat];

  const makeBox = (bw: number, bh: number, bd: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
    m.position.set(x, y, z);
    m.castShadow = enableShadows;
    m.receiveShadow = enableShadows;
    group.add(m);
    return m;
  };

  // Orient entrance plaque toward the building's entrance side
  const dxEnt = b.entranceX * WORLD_SCALE - cx;
  const dzEnt = b.entranceY * WORLD_SCALE - cz;
  let plaqueX = 0;
  let plaqueZ = d * 0.49;
  let plaqueRot = 0;
  if (Math.abs(dxEnt) > Math.abs(dzEnt)) {
    plaqueX = dxEnt > 0 ? w * 0.49 : -w * 0.49;
    plaqueZ = 0;
    plaqueRot = dxEnt > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else if (dzEnt < 0) {
    plaqueZ = -d * 0.49;
    plaqueRot = Math.PI;
  }

  const kind = b.landmark;

  if (kind === 'clerigos') {
    // Baroque Igreja dos Clérigos Nave + Soaring 76m Bell Tower
    makeBox(w * 0.62, 13.5, d * 0.84, facadeMat, w * 0.14, 6.75, 0);
    const naveRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, 5.5, 4), terracottaMat);
    naveRoof.rotation.y = Math.PI / 4;
    naveRoof.position.set(w * 0.14, 16.2, 0);
    naveRoof.scale.set(1.1, 1, 1.35);
    group.add(naveRoof);

    // Granite Torre dos Clérigos Plinth & Shaft
    makeBox(7.8, 12, 7.8, SHARED_GRANITE_MAT, -w * 0.28, 6, 0);
    makeBox(6.4, 24, 6.4, facadeMat, -w * 0.28, 22, 0);
    makeBox(7.4, 1.1, 7.4, SHARED_DARK_GRANITE_MAT, -w * 0.28, 34.2, 0);
    // Belfry arches tier & observation balustrade
    makeBox(5.6, 8.5, 5.6, SHARED_GRANITE_MAT, -w * 0.28, 38.8, 0);
    makeBox(6.6, 1.0, 6.6, SHARED_WHITE_STONE_MAT, -w * 0.28, 43.2, 0);
    // Clock & bell lantern glow
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 5.2, 8), warmLobbyMat);
    lantern.position.set(-w * 0.28, 46.2, 0);
    group.add(lantern);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7.5, 8), SHARED_DARK_GRANITE_MAT);
    spire.position.set(-w * 0.28, 52.5, 0);
    group.add(spire);

    makeBox(4.8, 4.8, 1.4, warmLobbyMat, 0, 2.4, -d * 0.43);
  } else if (kind === 'camara') {
    // Câmara Municipal do Porto: symmetrical neoclassical wings + central 70m clock tower
    makeBox(w * 0.96, 15.5, d * 0.86, facadeMat, 0, 7.75, 0);
    makeBox(w * 0.98, 4.5, d * 0.88, SHARED_SLATE_MAT, 0, 17.5, 0);
    // Central grand portico with 6 columns facing South (Av. dos Aliados)
    makeBox(14, 12, 3.2, SHARED_GRANITE_MAT, 0, 6, d * 0.45);
    for (let c = -5; c <= 5; c += 2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 10.5, 10), SHARED_WHITE_STONE_MAT);
      col.position.set(c * 1.1, 5.25, d * 0.49);
      group.add(col);
    }
    makeBox(9.5, 4.5, 1.2, warmLobbyMat, 0, 2.25, d * 0.46);
    // Central Belfry Clock Tower
    makeBox(8.2, 18, 8.2, SHARED_GRANITE_MAT, 0, 26, 0);
    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.5, 16), warmLobbyMat);
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 29, 4.2);
    group.add(clockFace);
    const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 8, 4), SHARED_SLATE_MAT);
    towerRoof.rotation.y = Math.PI / 4;
    towerRoof.position.set(0, 39, 0);
    group.add(towerRoof);
  } else if (kind === 'saobento') {
    // Estação de São Bento: Beaux-Arts U-shape + 3 arched portals + mansard roofs + Azulejo Hall glow
    makeBox(w * 0.95, 13.5, d * 0.78, facadeMat, 0, 6.75, 0.8);
    // Left & Right corner pavilions
    makeBox(10.5, 16.5, d * 0.88, facadeMat, -w * 0.36, 8.25, 0);
    makeBox(10.5, 16.5, d * 0.88, facadeMat, w * 0.36, 8.25, 0);
    // Slate mansard roofs
    const mansL = new THREE.Mesh(new THREE.ConeGeometry(7.6, 4.8, 4), SHARED_SLATE_MAT);
    mansL.rotation.y = Math.PI / 4;
    mansL.position.set(-w * 0.36, 18.8, 0);
    const mansR = mansL.clone();
    mansR.position.x = w * 0.36;
    group.add(mansL, mansR);
    makeBox(w * 0.62, 3.6, d * 0.76, SHARED_SLATE_MAT, 0, 15.2, 0.8);
    // 3 Grand Beaux-Arts Arched Portals facing North (Praça Almeida Garrett)
    for (let i = -1; i <= 1; i++) {
      makeBox(4.8, 7.2, 1.5, warmLobbyMat, i * 6.4, 3.6, -d * 0.38);
    }
    // Central Clock Pediment
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 1.2, 16), warmLobbyMat);
    ped.rotation.x = Math.PI / 2;
    ped.position.set(0, 15.6, -d * 0.39);
    group.add(ped);
  } else if (kind === 'casadamusica') {
    // Casa da Música: Iconic slanted faceted white concrete polyhedron + angled glass curtain walls
    const shape = new THREE.Shape();
    shape.moveTo(-14, 0);
    shape.lineTo(14.5, 0);
    shape.lineTo(17.5, 14);
    shape.lineTo(7, 25);
    shape.lineTo(-11, 22);
    shape.lineTo(-16.5, 10);
    shape.closePath();

    const polyGeo = new THREE.ExtrudeGeometry(shape, {
      depth: d * 0.78,
      bevelEnabled: true,
      bevelThickness: 0.7,
      bevelSize: 0.6,
      bevelSegments: 2,
    });
    polyGeo.translate(0, 0, -(d * 0.78) / 2);
    const polyMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.45,
      metalness: 0.12,
    });
    const shell = new THREE.Mesh(polyGeo, polyMat);
    shell.position.set(0, 1.8, 0);
    shell.castShadow = enableShadows;
    shell.receiveShadow = enableShadows;
    group.add(shell);

    // Travertine plaza plinth
    makeBox(w * 0.96, 1.8, d * 0.94, SHARED_WHITE_STONE_MAT, 0, 0.9, 0);
    // Iconic undulating corrugated glass facade openings
    const glassCurtain = new THREE.Mesh(new THREE.BoxGeometry(11, 13, d * 0.81), SHARED_GLASS_MAT);
    glassCurtain.position.set(1.5, 12.5, 0);
    group.add(glassCurtain);
    makeBox(6.5, 4.2, 1.2, warmLobbyMat, 0, 3.8, -d * 0.4);
  } else if (kind === 'lello') {
    // Livraria Lello: Neo-Gothic limestone facade with twin pinnacles & glowing crimson interior
    makeBox(w * 0.88, 15.5, d * 0.86, facadeMat, 0, 7.75, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.56, 5.2, 4), terracottaMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 18.1, 0);
    group.add(roof);
    // Twin Neo-Gothic spires on the Carmelitas facade
    for (const sx of [-9, 9]) {
      makeBox(2.8, 19.5, 2.8, SHARED_WHITE_STONE_MAT, sx, 9.75, -d * 0.42);
      const pin = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5.5, 4), SHARED_WHITE_STONE_MAT);
      pin.rotation.y = Math.PI / 4;
      pin.position.set(sx, 22.2, -d * 0.42);
      group.add(pin);
    }
    const crimsonMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0xfb7185,
      emissiveIntensity: 0.7,
    });
    windowGlowMats.push(crimsonMat);
    makeBox(8.5, 6.2, 1.4, crimsonMat, 0, 3.4, -d * 0.44);
  } else if (kind === 'bolsa') {
    // Palácio da Bolsa: Grand Neoclassical Colonnade + Central Glass Skylight Dome (Pátio das Nações)
    makeBox(w * 0.94, 15.0, d * 0.88, facadeMat, 0, 7.5, 0);
    // Neoclassical portico with 6 columns & triangular pediment
    for (let c = -5; c <= 5; c += 2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 11.5, 10), SHARED_WHITE_STONE_MAT);
      col.position.set(c * 1.4, 5.75, -d * 0.46);
      group.add(col);
    }
    const pediment = new THREE.Mesh(new THREE.ConeGeometry(9.5, 3.4, 3), SHARED_GRANITE_MAT);
    pediment.rotation.y = Math.PI / 2;
    pediment.scale.set(0.3, 1, 1.8);
    pediment.position.set(0, 13.5, -d * 0.45);
    group.add(pediment);
    // Central Pátio das Nações glowing glass dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(8.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      SHARED_GLASS_MAT,
    );
    dome.position.set(0, 15.0, 0);
    group.add(dome);
    makeBox(7.2, 4.8, 1.4, warmLobbyMat, 0, 2.4, -d * 0.45);
  } else if (kind === 'se') {
    // Sé do Porto: Romanesque Fortress Cathedral with twin crenellated bell towers & rose window
    makeBox(w * 0.86, 17, d * 0.82, SHARED_GRANITE_MAT, 0, 8.5, 0);
    // Twin Crenellated Fortress Towers
    for (const sx of [-11.5, 11.5]) {
      makeBox(8.2, 26.5, 8.2, facadeMat, sx, 13.25, -d * 0.25);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), SHARED_DARK_GRANITE_MAT);
      cap.position.set(sx, 26.5, -d * 0.25);
      group.add(cap);
    }
    // Central Rose Window (Rosácea)
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.7, 16), warmLobbyMat);
    rose.rotation.x = Math.PI / 2;
    rose.position.set(0, 13.5, -d * 0.42);
    group.add(rose);
    makeBox(6.2, 5.2, 1.6, warmLobbyMat, 0, 2.6, -d * 0.42);
  } else if (kind === 'bolhao') {
    // Mercado do Bolhão: 4-wing perimeter market with terracotta roofs & colorful open market stalls
    const wingW = 7.2;
    makeBox(w * 0.94, 9.5, wingW, facadeMat, 0, 4.75, -d * 0.36);
    makeBox(w * 0.94, 9.5, wingW, facadeMat, 0, 4.75, d * 0.36);
    makeBox(wingW, 9.5, d * 0.82, facadeMat, -w * 0.38, 4.75, 0);
    makeBox(wingW, 9.5, d * 0.82, facadeMat, w * 0.38, 4.75, 0);
    makeBox(w * 0.96, 1.8, wingW + 0.6, terracottaMat, 0, 10.4, -d * 0.36);
    makeBox(w * 0.96, 1.8, wingW + 0.6, terracottaMat, 0, 10.4, d * 0.36);
    // Courtyard market stalls with awnings
    const stallColors = [0x10b981, 0xf59e0b, 0xef4444, 0x0ea5e9];
    for (let i = 0; i < 4; i++) {
      const stMat = new THREE.MeshStandardMaterial({ color: stallColors[i], roughness: 0.6 });
      makeBox(5.2, 2.4, 3.4, stMat, (i - 1.5) * 6.0, 1.2, 0);
    }
    makeBox(6.4, 4.6, 1.4, warmLobbyMat, 0, 2.3, d * 0.45);
  } else if (kind === 'ribeira') {
    // Colorful narrow Casario da Ribeira townhouses with terracotta roofs & waterfront esplanada awnings
    const houseColors = [0xd97706, 0xb91c1c, 0x1d4ed8, 0x047857];
    const houseCount = 4;
    const segD = (d * 0.92) / houseCount;
    for (let i = 0; i < houseCount; i++) {
      const hFloors = 4 + (i % 3);
      const hh = hFloors * 3.1;
      const hz = -d * 0.36 + i * segD;
      const houseMat = new THREE.MeshStandardMaterial({
        color: houseColors[i],
        roughness: 0.78,
        emissiveMap,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.45,
      });
      makeBox(w * 0.92, hh, segD * 0.94, houseMat, 0, hh * 0.5, hz);
      const rRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.56, 3.5, 4), terracottaMat);
      rRoof.rotation.y = Math.PI / 4;
      rRoof.scale.set(1.2, 1, 0.55);
      rRoof.position.set(0, hh + 1.75, hz);
      group.add(rRoof);
    }
    // Ground-floor café/esplanada awnings along Cais da Ribeira (east side)
    makeBox(2.4, 0.5, d * 0.85, SHARED_WHITE_STONE_MAT, w * 0.49, 3.6, 0);
    makeBox(1.4, 3.8, 7.5, warmLobbyMat, w * 0.47, 1.9, 0);
  } else if (kind === 'caves_gaia') {
    // Port Wine Cellars (Caves Sandeman / Taylor's) with pitched terracotta roof & oak barrel stacks
    makeBox(w * 0.92, 10.5, d * 0.9, facadeMat, 0, 5.25, 0);
    const cellRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.68, 4.4, 4), terracottaMat);
    cellRoof.rotation.y = Math.PI / 4;
    cellRoof.scale.set(0.95, 1, 1.45);
    cellRoof.position.set(0, 12.7, 0);
    group.add(cellRoof);
    // Stacked Port Wine Oak Barrels (Pipas) near entrance
    const barrelGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.5, 10);
    barrelGeo.rotateZ(Math.PI / 2);
    for (let k = -2; k <= 2; k++) {
      const barrel = new THREE.Mesh(barrelGeo, SHARED_WOOD_MAT);
      barrel.position.set(-w * 0.52, 0.75, k * 2.2);
      group.add(barrel);
    }
    // Glowing Caves signage band
    const neonMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(b.accentColor),
      emissive: new THREE.Color(b.accentColor),
      emissiveIntensity: 0.75,
    });
    windowGlowMats.push(neonMat);
    makeBox(1.2, 1.8, d * 0.56, neonMat, -w * 0.46, 8.2, 0);
  } else {
    // Mosteiro da Serra do Pilar: Iconic circular church rotunda + dome + cloister wing
    makeBox(w * 0.84, 9.5, d * 0.55, facadeMat, 0, 4.75, d * 0.18);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.6, 13.5, 20), SHARED_WHITE_STONE_MAT);
    drum.position.set(0, 6.75, -d * 0.16);
    drum.castShadow = enableShadows;
    group.add(drum);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(7.3, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      terracottaMat,
    );
    dome.position.set(0, 13.5, -d * 0.16);
    group.add(dome);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 3.2, 12), warmLobbyMat);
    cup.position.set(0, 21.4, -d * 0.16);
    group.add(cup);
  }

  // Detailed street facades: recessed glazing, stone frames, wrought-iron balconies and cornices.
  const windowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x263746,
    roughness: 0.2,
    metalness: 0.18,
    clearcoat: 0.55,
    clearcoatRoughness: 0.16,
  });
  const windowFrameMat = new THREE.MeshStandardMaterial({
    color: b.facadeStyle === 'ochre' ? 0xcbb89d : 0xb9b2a5,
    roughness: 0.78,
    metalness: 0.04,
  });
  const balconyMetalMat = new THREE.MeshStandardMaterial({
    color: 0x20262b,
    roughness: 0.48,
    metalness: 0.72,
  });
  const balconyStoneMat = new THREE.MeshStandardMaterial({
    color: 0x8c877f,
    roughness: 0.9,
    metalness: 0.02,
  });

  const paneWidth = 0.96;
  const paneHeight = 1.38;
  const paneGeometry = new THREE.BoxGeometry(paneWidth, paneHeight, 0.1);
  const frameHorizontalGeometry = new THREE.BoxGeometry(paneWidth + 0.2, 0.09, 0.18);
  const frameVerticalGeometry = new THREE.BoxGeometry(0.09, paneHeight + 0.16, 0.18);
  const sillGeometry = new THREE.BoxGeometry(paneWidth + 0.28, 0.13, 0.34);
  const balconySlabGeometry = new THREE.BoxGeometry(paneWidth + 0.52, 0.12, 0.72);
  const balconyRailGeometry = new THREE.BoxGeometry(paneWidth + 0.52, 0.07, 0.07);
  const balconyPostGeometry = new THREE.BoxGeometry(0.07, 0.58, 0.07);

  const paneInstances: THREE.Object3D[] = [];
  const horizontalFrameInstances: THREE.Object3D[] = [];
  const verticalFrameInstances: THREE.Object3D[] = [];
  const sillInstances: THREE.Object3D[] = [];
  const balconySlabInstances: THREE.Object3D[] = [];
  const balconyRailInstances: THREE.Object3D[] = [];
  const balconyPostInstances: THREE.Object3D[] = [];

  const addInstancePose = (
    target: THREE.Object3D[],
    x: number,
    y: number,
    z: number,
    rotationY: number,
  ) => {
    const pose = new THREE.Object3D();
    pose.position.set(x, y, z);
    pose.rotation.y = rotationY;
    pose.updateMatrix();
    target.push(pose);
  };

  const windowRows = Math.min(5, Math.max(2, b.floors - 1));
  const addWindowFace = (
    axis: 'x' | 'z',
    sign: number,
    faceLength: number,
    faceDepth: number,
    isFront: boolean,
  ) => {
    const columns = Math.max(2, Math.min(7, Math.floor(faceLength / 5.2)));
    const spacing = faceLength / (columns + 1);
    const rotationY = axis === 'x' ? Math.PI / 2 : 0;
    const surfaceOffset = faceDepth * 0.5 + 0.12;

    for (let row = 0; row < windowRows; row += 1) {
      const windowY = 2.35 + row * 2.7;
      if (windowY + paneHeight * 0.5 > Math.min(18.5, b.floors * 2.8)) continue;

      for (let column = 0; column < columns; column += 1) {
        const along = -faceLength * 0.5 + spacing * (column + 1);
        const x = axis === 'z' ? along : sign * surfaceOffset;
        const z = axis === 'z' ? sign * surfaceOffset : along;

        addInstancePose(paneInstances, x, windowY, z, rotationY);
        addInstancePose(horizontalFrameInstances, x, windowY - paneHeight * 0.5, z, rotationY);
        addInstancePose(horizontalFrameInstances, x, windowY + paneHeight * 0.5, z, rotationY);
        addInstancePose(verticalFrameInstances, x - Math.cos(rotationY) * (paneWidth * 0.5), windowY, z + Math.sin(rotationY) * (paneWidth * 0.5), rotationY);
        addInstancePose(verticalFrameInstances, x + Math.cos(rotationY) * (paneWidth * 0.5), windowY, z - Math.sin(rotationY) * (paneWidth * 0.5), rotationY);
        addInstancePose(sillInstances, x, windowY - paneHeight * 0.5 - 0.12, z, rotationY);

        // A small number of windows become proper Juliet balconies on the public-facing facade.
        if (isFront && row > 0 && column % 2 === 0 && b.facadeStyle !== 'white_concrete') {
          const outward = sign * 0.34;
          const balconyX = axis === 'z' ? x : x + outward;
          const balconyZ = axis === 'z' ? z + outward : z;
          const railX = axis === 'z' ? x : x + sign * 0.72;
          const railZ = axis === 'z' ? z + sign * 0.72 : z;
          addInstancePose(balconySlabInstances, balconyX, windowY - 0.82, balconyZ, rotationY);
          addInstancePose(balconyRailInstances, railX, windowY - 0.48, railZ, rotationY);

          const postOffset = (paneWidth + 0.44) * 0.5;
          const post1X = axis === 'z' ? x - postOffset : x + sign * 0.72;
          const post1Z = axis === 'z' ? z + sign * 0.72 : z - postOffset;
          const post2X = axis === 'z' ? x + postOffset : x + sign * 0.72;
          const post2Z = axis === 'z' ? z + sign * 0.72 : z + postOffset;
          addInstancePose(balconyPostInstances, post1X, windowY - 0.77, post1Z, rotationY);
          addInstancePose(balconyPostInstances, post2X, windowY - 0.77, post2Z, rotationY);
        }
      }
    }
  };

  const frontAxis: 'x' | 'z' = Math.abs(dxEnt) > Math.abs(dzEnt) ? 'x' : 'z';
  const frontSign = frontAxis === 'x' ? (dxEnt > 0 ? 1 : -1) : (dzEnt > 0 ? 1 : -1);
  addWindowFace('z', -1, w * 0.9, d, frontAxis === 'z' && frontSign === -1);
  addWindowFace('z', 1, w * 0.9, d, frontAxis === 'z' && frontSign === 1);
  addWindowFace('x', -1, d * 0.84, w, frontAxis === 'x' && frontSign === -1);
  addWindowFace('x', 1, d * 0.84, w, frontAxis === 'x' && frontSign === 1);

  const addInstancedDetails = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    poses: THREE.Object3D[],
  ) => {
    if (poses.length === 0) return;
    const instances = new THREE.InstancedMesh(geometry, material, poses.length);
    poses.forEach((pose, index) => instances.setMatrixAt(index, pose.matrix));
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
    instances.castShadow = enableShadows;
    instances.receiveShadow = enableShadows;
    group.add(instances);
  };

  addInstancedDetails(paneGeometry, windowGlassMat, paneInstances);
  addInstancedDetails(frameHorizontalGeometry, windowFrameMat, horizontalFrameInstances);
  addInstancedDetails(frameVerticalGeometry, windowFrameMat, verticalFrameInstances);
  addInstancedDetails(sillGeometry, windowFrameMat, sillInstances);
  addInstancedDetails(balconySlabGeometry, balconyStoneMat, balconySlabInstances);
  addInstancedDetails(balconyRailGeometry, balconyMetalMat, balconyRailInstances);
  addInstancedDetails(balconyPostGeometry, balconyMetalMat, balconyPostInstances);

  // Continuous stone cornice breaks up the single-box silhouette and casts a fine shadow.
  const corniceY = Math.min(19.2, b.floors * 2.8) + 0.28;
  const corniceMaterial = SHARED_WHITE_STONE_MAT;
  const corniceFront = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.28, 0.32), corniceMaterial);
  corniceFront.position.set(0, corniceY, d * 0.5 + 0.02);
  const corniceBack = corniceFront.clone();
  corniceBack.position.z = -d * 0.5 - 0.02;
  const corniceSide = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, d + 0.9), corniceMaterial);
  corniceSide.position.set(w * 0.5 + 0.02, corniceY, 0);
  const corniceOtherSide = corniceSide.clone();
  corniceOtherSide.position.x = -w * 0.5 - 0.02;
  group.add(corniceFront, corniceBack, corniceSide, corniceOtherSide);
  corniceFront.castShadow = corniceBack.castShadow = corniceSide.castShadow = corniceOtherSide.castShadow = enableShadows;

  // Terracotta chimney stacks and small roof service housings add believable roof silhouettes.
  if (b.facadeStyle !== 'white_concrete' && kind !== 'clerigos' && kind !== 'serra_pilar') {
    const chimneyGeometry = new THREE.BoxGeometry(0.72, 1.5, 0.72);
    const chimneyCapGeometry = new THREE.BoxGeometry(0.92, 0.16, 0.92);
    const chimneyMat = new THREE.MeshStandardMaterial({
      color: 0x9a4930,
      roughness: 0.88,
      metalness: 0.02,
    });
    for (let chimney = 0; chimney < 2; chimney += 1) {
      const x = chimney === 0 ? -w * 0.28 : w * 0.3;
      const base = corniceY + 0.25;
      const stack = new THREE.Mesh(chimneyGeometry, chimneyMat);
      stack.position.set(x, base + 0.75, -d * 0.16);
      const cap = new THREE.Mesh(chimneyCapGeometry, chimneyMat);
      cap.position.set(x, base + 1.55, -d * 0.16);
      stack.castShadow = cap.castShadow = enableShadows;
      group.add(stack, cap);
    }
    const roofHatch = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(1.2, w * 0.16), 0.82, Math.max(1.0, d * 0.14)),
      SHARED_SLATE_MAT,
    );
    roofHatch.position.set(w * 0.12, corniceY + 0.42, d * 0.18);
    roofHatch.castShadow = enableShadows;
    group.add(roofHatch);
  }

    // Azulejo Portuguese monument plaque on entrance facade
  addAzulejoPlaque(group, b.label, b.district, plaqueX, 6.8, plaqueZ, plaqueRot);

  return { group, facadeMat, windowGlowMats };
}

// Monumental 3D Replica of Ponte Dom Luís I (Double-Deck Iron Arch Bridge over Rio Douro)
export function createDomLuisBridgeMesh(spanMeters: number, enableShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  const halfSpan = spanMeters * 0.5;

  // Granite abutment piers on Porto & Gaia riverbanks
  for (const px of [-halfSpan + 1.5, halfSpan - 1.5]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(5.5, 24, 15), SHARED_GRANITE_MAT);
    pier.position.set(px, 11.5, 0);
    pier.castShadow = enableShadows;
    pier.receiveShadow = enableShadows;
    g.add(pier);
  }

  // Lower Roadway Deck (drivable deck connecting Cais da Ribeira <-> Cais de Gaia)
  const lowerDeck = new THREE.Mesh(new THREE.BoxGeometry(spanMeters, 0.9, 13.4), SHARED_IRON_MAT);
  lowerDeck.position.set(0, -0.32, 0);
  lowerDeck.receiveShadow = enableShadows;
  g.add(lowerDeck);

  // Lower deck railings & golden street lamps
  const railMat = SHARED_IRON_MAT;
  for (const rz of [-6.4, 6.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spanMeters, 0.9, 0.25), railMat);
    rail.position.set(0, 0.55, rz);
    g.add(rail);
  }

  // Upper Metro Deck (iconic soaring iron truss deck at Y = 17.5m)
  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(spanMeters + 12, 1.2, 9.6), SHARED_IRON_MAT);
  upperDeck.position.set(0, 17.5, 0);
  upperDeck.castShadow = enableShadows;
  g.add(upperDeck);

  // Twin Parabolic Iron Truss Arches (spanning from -halfSpan to +halfSpan)
  const archSegments = 18;
  const archSpan = spanMeters - 4;
  for (const az of [-4.6, 4.6]) {
    for (let i = 0; i < archSegments; i++) {
      const t0 = i / archSegments;
      const t1 = (i + 1) / archSegments;
      const x0 = (t0 - 0.5) * archSpan;
      const x1 = (t1 - 0.5) * archSpan;
      const y0 = Math.sin(t0 * Math.PI) * 16.4;
      const y1 = Math.sin(t1 * Math.PI) * 16.4;
      const segLen = Math.hypot(x1 - x0, y1 - y0);
      const segAngle = Math.atan2(y1 - y0, x1 - x0);

      const chord = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.3, 1.15, 0.65), SHARED_IRON_MAT);
      chord.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, az);
      chord.rotation.z = segAngle;
      chord.castShadow = enableShadows;
      g.add(chord);

      // Vertical steel truss struts tying arch to upper & lower decks
      if (i > 0 && i % 2 === 0) {
        const strutH = Math.max(1.2, 17.5 - y0);
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.45, strutH, 0.45), SHARED_IRON_MAT);
        strut.position.set(x0, y0 + strutH * 0.5, az);
        g.add(strut);
      }
    }
  }

  // Warm golden bridge deck lanterns
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.9,
  });
  for (let lx = -halfSpan + 6; lx <= halfSpan - 6; lx += 8) {
    for (const lz of [-6.2, 6.2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), SHARED_IRON_MAT);
      pole.position.set(lx, 1.6, lz);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), lampMat);
      bulb.position.set(lx, 3.2, lz);
      g.add(pole, bulb);
    }
  }

  return g;
}

// Concrete Arch Bridge (Ponte do Infante Dom Henrique)
export function createInfanteBridgeMesh(spanMeters: number, enableShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(spanMeters, 0.9, 13.4), SHARED_WHITE_STONE_MAT);
  deck.position.set(0, -0.32, 0);
  deck.receiveShadow = enableShadows;
  g.add(deck);

  for (const rz of [-6.4, 6.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spanMeters, 0.85, 0.3), SHARED_GRANITE_MAT);
    rail.position.set(0, 0.5, rz);
    g.add(rail);
  }
  return g;
}

// Traditional Douro Rabelo Wine Boat (Barco Rabelo com Pipas de Vinho do Porto)
export function createRabeloBoatMesh(enableShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  const darkOakMat = new THREE.MeshStandardMaterial({ color: 0x452613, roughness: 0.78 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.65 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85, side: THREE.DoubleSide });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.2, 2.8), darkOakMat);
  hull.position.y = 0.35;
  hull.castShadow = enableShadows;

  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.2, 4), darkOakMat);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.x = Math.PI / 4;
  bow.position.set(6.2, 0.65, 0);

  // Stacked Port Wine Barrels (Pipas) on deck
  const barrelGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.05, 10);
  barrelGeo.rotateZ(Math.PI / 2);
  for (let i = -2; i <= 1; i++) {
    for (const bz of [-0.65, 0.65]) {
      const b = new THREE.Mesh(barrelGeo, barrelMat);
      b.position.set(i * 1.35, 1.2, bz);
      g.add(b);
    }
  }

  // Mast & furled square sail
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.8, 8), SHARED_WOOD_MAT);
  mast.position.set(0.5, 3.8, 0);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 8), SHARED_WOOD_MAT);
  yard.rotation.x = Math.PI / 2;
  yard.position.set(0.5, 6.2, 0);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.8), sailMat);
  sail.rotation.y = Math.PI / 2;
  sail.position.set(0.6, 4.7, 0);

  // Long stern rudder oar (espadela)
  const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.4, 6), SHARED_WOOD_MAT);
  oar.rotation.z = 1.2;
  oar.position.set(-6.0, 1.4, 0);

  g.add(hull, bow, mast, yard, sail, oar);
  return g;
}

// Classic Yellow Historic Porto Tram (Elétrico do Porto)
export function createPortoTramMesh(enableShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  const yellowMat = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    roughness: 0.28,
    metalness: 0.15,
    clearcoat: 0.7,
  });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 6.6), yellowMat);
  body.position.y = 1.1;
  body.castShadow = enableShadows;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 6.3), SHARED_GLASS_MAT);
  upper.position.y = 2.35;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.35, 6.7), creamMat);
  roof.position.y = 3.05;
  const pantograph = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.2), SHARED_IRON_MAT);
  pantograph.position.y = 3.6;

  g.add(body, upper, roof, pantograph);
  return g;
}

export function createPickupMesh(kind: Pickup['kind']): THREE.Group {
  const group = new THREE.Group();
  const color =
    kind === 'cash'
      ? 0x10b981
      : kind === 'medkit'
        ? 0xef4444
        : kind === 'armor'
          ? 0x3b82f6
          : 0x06b6d4;

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.4,
  });

  const core =
    kind === 'cash'
      ? new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.55), mat)
      : kind === 'armor'
        ? new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), mat)
        : new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.5), mat);

  core.position.y = 1.1;
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.2, 24),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);

  return group;
}
