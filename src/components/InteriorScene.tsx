import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DoorOpen, CheckCircle2, CircleDot, X } from 'lucide-react';
import { animateCharacterRig, createCharacterRig } from '../game/models3d.ts';
import { INTERIOR_TASKS, type InteriorTaskDefinition } from '../game/interiorTasks.ts';
import type { CharacterId, LifeJobId, LifeLocation } from '../game/types.ts';

interface InteriorSceneProps {
  location: LifeLocation;
  character: CharacterId;
  job: LifeJobId;
  isMobile: boolean;
  completedTaskIds: string[];
  onClose: () => void;
  onCompleteTask: (taskId: string) => { ok: boolean; message: string };
}

type ActiveTask = { id: string; step: number };
type MoveKey = 'up' | 'down' | 'left' | 'right';

function makeCanvasTexture(text: string, background: string, foreground: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = background;
    context.fillRect(12, 12, 488, 104);
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = foreground;
    context.font = 'bold 38px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 65, 450);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(0,0,0,0.38)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

export const InteriorScene: React.FC<InteriorSceneProps> = ({
  location,
  character,
  job,
  isMobile,
  completedTaskIds,
  onClose,
  onCompleteTask,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Record<MoveKey, boolean>>({ up: false, down: false, left: false, right: false });
  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 5.15));
  const activeTaskRef = useRef<ActiveTask | null>(null);
  const nearTaskRef = useRef<string | null>(null);
  const advanceStepRef = useRef<() => void>(() => {});
  const startTaskRef = useRef<(id: string) => void>(() => {});
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [nearTaskId, setNearTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState('Explora o espaço e aproxima-te de uma estação de trabalho.');
  const [error, setError] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState<string[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const completedRef = useRef<string[]>([]);

  activeTaskRef.current = activeTask;
  completedRef.current = [...completedTaskIds, ...localCompleted];
  nearTaskRef.current = nearTaskId;
  const tasks = INTERIOR_TASKS[location.kind];
  const completed = new Set([...completedTaskIds, ...localCompleted]);
  const activeDefinition = activeTask ? tasks.find((task) => task.id === activeTask.id) ?? null : null;
  const nearestDefinition = nearTaskId ? tasks.find((task) => task.id === nearTaskId) ?? null : null;

  const startTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (completed.has(task.id)) {
      setNotice('Esta tarefa já foi concluída hoje. Volta amanhã.');
      return;
    }
    if (task.requiredJob && task.requiredJob !== job) {
      const jobNames: Record<LifeJobId, string> = {
        barista: 'empregado de café',
        retail: 'comércio',
        courier: 'estafeta',
        gardener: 'jardinagem',
        construction: 'construção',
      };
      setNotice('Esta tarefa exige a profissão de ' + jobNames[task.requiredJob] + '.');
      return;
    }
    setActiveTask({ id: task.id, step: 0 });
    setNotice(task.steps[0]);
  };
  startTaskRef.current = startTask;

  const advanceStep = () => {
    const current = activeTaskRef.current;
    if (!current) {
      if (nearTaskRef.current) startTaskRef.current(nearTaskRef.current);
      return;
    }
    const task = tasks.find((item) => item.id === current.id);
    if (!task) {
      setActiveTask(null);
      return;
    }
    if (current.step < task.steps.length - 1) {
      const next = { ...current, step: current.step + 1 };
      activeTaskRef.current = next;
      setActiveTask(next);
      setNotice(task.steps[next.step]);
      return;
    }
    const result = onCompleteTask(task.id);
    setNotice(result.message);
    if (result.ok) {
      setLocalCompleted((previous) => previous.includes(task.id) ? previous : [...previous, task.id]);
    }
    activeTaskRef.current = null;
    setActiveTask(null);
  };
  advanceStepRef.current = advanceStep;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer | null = null;
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let promptAccumulator = 0;
    const ownedMaterials: THREE.Material[] = [];
    const ownedGeometries: THREE.BufferGeometry[] = [];
    const ownedTextures: THREE.Texture[] = [];
    let playerRig: ReturnType<typeof createCharacterRig> | null = null;
    let workerRig: ReturnType<typeof createCharacterRig> | null = null;

    const addBox = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      color: number | string,
      roughness = 0.78,
      metalness = 0.02,
    ) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      ownedGeometries.push(geometry);
      ownedMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = !isMobile;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const addCylinder = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      radiusTop: number,
      radiusBottom: number,
      height: number,
      color: number | string,
    ) => {
      const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
      ownedGeometries.push(geometry);
      ownedMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = !isMobile;
      parent.add(mesh);
      return mesh;
    };

    const addLabel = (parent: THREE.Object3D, text: string, x: number, y: number, z: number, background: string) => {
      const texture = makeCanvasTexture(text, background, '#FFFFFF');
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
      ownedTextures.push(texture);
      ownedMaterials.push(material);
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      sprite.scale.set(3.1, 0.78, 1);
      parent.add(sprite);
      return sprite;
    };

    const addWall = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      material: THREE.Material,
    ) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      ownedGeometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      parent.add(mesh);
    };

    const buildRoom = (scene: THREE.Scene) => {
      const palette: Record<string, { floor: number; wall: number; accent: number }> = {
        home: { floor: 0x9a7553, wall: 0xe8dfd1, accent: 0x2d8b74 },
        cafe: { floor: 0x5a4638, wall: 0xe9dfcd, accent: 0xc47a32 },
        market: { floor: 0x777d83, wall: 0xe6e5df, accent: 0x3b82a0 },
        depot: { floor: 0x555f69, wall: 0xcbd1d6, accent: 0x8b6cc2 },
        garden: { floor: 0x496c45, wall: 0xd8e0d1, accent: 0x4e9b58 },
        construction: { floor: 0x77736b, wall: 0xcfc9bd, accent: 0xd47b37 },
      };
      const colors = palette[location.kind];
      const floorGeometry = new THREE.PlaneGeometry(18, 14);
      floorGeometry.rotateX(-Math.PI / 2);
      const floorMaterial = new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.92 });
      ownedGeometries.push(floorGeometry);
      ownedMaterials.push(floorMaterial);
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.position.y = -0.08;
      floor.receiveShadow = true;
      scene.add(floor);

      const wallMaterial = new THREE.MeshStandardMaterial({ color: colors.wall, roughness: 0.88 });
      const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x8c8174, roughness: 0.8 });
      const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x8fc4d8, roughness: 0.12, metalness: 0.05, transmission: 0.12, transparent: true, opacity: 0.72 });
      ownedMaterials.push(wallMaterial, trimMaterial, glassMaterial);
      addWall(-9, 2.25, 0, 0.35, 4.5, 14, wallMaterial);
      addWall(9, 2.25, 0, 0.35, 4.5, 14, wallMaterial);
      addWall(0, 2.25, -7, 18, 4.5, 0.35, wallMaterial);
      addWall(-7.4, 2.25, 7, 3.2, 4.5, 0.35, wallMaterial);
      addWall(7.4, 2.25, 7, 3.2, 4.5, 0.35, wallMaterial);

      // The front cutaway keeps the interior readable while preserving a clear entrance.
      addBox(scene, -1.8, 2.1, 6.95, 0.16, 4.2, 0.18, 0x6b4b32);
      addBox(scene, 1.8, 2.1, 6.95, 0.16, 4.2, 0.18, 0x6b4b32);
      addBox(scene, 0, 4.1, 6.95, 3.75, 0.18, 0.18, 0x6b4b32);
      addBox(scene, 0, 0.12, 6.82, 3.2, 0.16, 0.2, colors.accent);

      // Back windows, frames and a simple sill.
      addBox(scene, -4.4, 2.55, -6.78, 3.7, 2.15, 0.06, 0x5b514a);
      const windowGeometry = new THREE.PlaneGeometry(3.35, 1.82);
      const windowPane = new THREE.Mesh(windowGeometry, glassMaterial);
      windowPane.position.set(-4.4, 2.55, -6.72);
      ownedGeometries.push(windowGeometry);
      scene.add(windowPane);
      addBox(scene, -4.4, 2.55, -6.65, 0.08, 1.9, 0.08, 0xe7e2d9);
      addBox(scene, -4.4, 2.55, -6.65, 3.5, 0.08, 0.08, 0xe7e2d9);
      addBox(scene, -6.1, 2.55, -6.65, 0.07, 1.9, 0.08, 0xe7e2d9);
      addBox(scene, -2.7, 2.55, -6.65, 0.07, 1.9, 0.08, 0xe7e2d9);

      addBox(scene, -9, 4.28, 0, 0.28, 0.12, 14, trimMaterial);
      addBox(scene, 9, 4.28, 0, 0.28, 0.12, 14, trimMaterial);
      addLabel(scene, location.label, 0, 4.55, -6.72, 'rgba(12,23,37,0.90)');

      // Room-specific furniture and work surfaces.
      if (location.kind === 'home') {
        addBox(scene, -5.2, 0.55, -2.4, 4.8, 0.92, 1.35, 0x6b4a30);
        addBox(scene, -5.2, 1.08, -2.4, 4.9, 0.12, 1.42, 0xd8d0bf);
        addBox(scene, -7.2, 1.55, -4.7, 1.4, 2.8, 1.2, 0xe8e5df);
        addBox(scene, -7.2, 1.55, -4.02, 1.1, 1.7, 0x9bc6da);
        addBox(scene, 5.1, 0.45, -3.5, 3.7, 0.72, 2.1, 0x70503b);
        addBox(scene, 5.1, 0.92, -3.5, 3.75, 0.18, 2.15, 0xe7e1d5);
        addBox(scene, 5.1, 1.08, -3.5, 2.8, 0.15, 1.35, 0xc9a88c);
        addBox(scene, 0, 0.42, 0.5, 2.1, 0.84, 1.2, 0x79563c);
        addBox(scene, 0, 0.9, 0.5, 2.2, 0.12, 1.3, 0xe8dfd1);
      } else if (location.kind === 'cafe') {
        addBox(scene, -4.8, 0.62, -2.7, 5.2, 1.15, 1.45, 0x63452f);
        addBox(scene, -4.8, 1.25, -2.7, 5.3, 0.18, 1.5, 0xb68b62);
        addBox(scene, -5.6, 1.65, -2.7, 1.0, 0.72, 0x343c44);
        addBox(scene, -5.6, 2.08, -2.7, 0.42, 0.18, 0xa9b8c4, 0.2, 0.55);
        addCylinder(scene, -5.4, 2.24, -2.7, 0.08, 0.08, 0.28, 0xe0e7ed);
        addBox(scene, 4.8, 0.48, 1.65, 2.15, 0.12, 1.2, 0x704a34);
        addCylinder(scene, 3.9, 0.39, 1.25, 0.09, 0.09, 0.78, 0x413a34);
        addCylinder(scene, 5.7, 0.39, 1.25, 0.09, 0.09, 0.78, 0x413a34);
        addBox(scene, 4.8, 0.48, -0.15, 2.15, 0.12, 1.2, 0x704a34);
        addCylinder(scene, 3.9, 0.39, -0.55, 0.09, 0.09, 0.78, 0x413a34);
        addCylinder(scene, 5.7, 0.39, -0.55, 0.09, 0.09, 0.78, 0x413a34);
      } else if (location.kind === 'market') {
        for (let row = 0; row < 3; row += 1) {
          const z = -3 + row * 2.1;
          addBox(scene, -5.8, 1.2, z, 1.15, 2.4, 4.5, 0x715640);
          for (let shelf = 0; shelf < 3; shelf += 1) {
            addBox(scene, -5.05, 0.62 + shelf * 0.68, z, 0.34, 0.08, 4.1, 0xd8c7ae);
          }
        }
        addBox(scene, 0, 0.58, -3.2, 3.4, 1.1, 1.35, 0x5a4031);
        addBox(scene, 0, 1.18, -3.2, 3.5, 0.14, 1.4, 0x9da6a3);
        addBox(scene, 0.9, 1.38, -3.2, 0.52, 0.4, 0.08, 0x18212a, 0.35);
        for (let i = 0; i < 8; i += 1) {
          addBox(scene, 5.3 + (i % 4) * 0.55, 0.42 + Math.floor(i / 4) * 0.38, 1.2, 0.42, 0.36, 0.42, [0xdd6b42, 0x70a65a, 0xe3bc58, 0xb85a45][i % 4]);
        }
      } else if (location.kind === 'depot') {
        for (let row = 0; row < 3; row += 1) {
          const z = -3.6 + row * 2.5;
          addBox(scene, -5.8, 1.8, z, 0.22, 3.6, 2.0, 0x475569);
          addBox(scene, -4.0, 1.8, z, 0.22, 3.6, 2.0, 0x475569);
          for (let shelf = 0; shelf < 3; shelf += 1) {
            addBox(scene, -4.9, 0.65 + shelf * 1.0, z, 1.8, 0.1, 1.9, 0x9ca3af);
            addBox(scene, -4.9, 0.95 + shelf * 1.0, z, 0.8, 0.55, 0.7, 0xb98755);
          }
        }
        addBox(scene, 5.2, 0.22, 1.0, 3.1, 0.42, 2.0, 0x8b6b45);
        addBox(scene, 4.8, 0.62, 1.0, 1.2, 0.72, 0xc28f58);
        addBox(scene, 5.8, 0.62, 1.0, 1.0, 0.72, 0xb77d4b);
      } else if (location.kind === 'garden') {
        addBox(scene, -5.5, 0.34, -2.2, 3.0, 0.58, 1.5, 0x79553b);
        for (let i = 0; i < 8; i += 1) {
          addCylinder(scene, -6.5 + i * 0.28, 0.78 + (i % 2) * 0.12, -2.2, 0.09, 0.12, 0.85, [0x4d8b48, 0x6da85b, 0x9aaf54][i % 3]);
        }
        addBox(scene, 1.0, 0.55, -4.4, 5.4, 1.1, 0.72, 0x356b3d);
        for (let i = 0; i < 7; i += 1) {
          addCylinder(scene, 1.0 + (i - 3) * 0.7, 1.25, -4.4, 0.26, 0.24, 0.55, 0x397b42);
        }
        addBox(scene, 5.4, 0.22, 1.3, 2.2, 0.24, 1.2, 0x9a805d);
      } else if (location.kind === 'construction') {
        addBox(scene, 0.4, 1.7, -5.6, 0.25, 3.4, 5.4, 0x7c7265);
        for (let row = 0; row < 5; row += 1) {
          for (let col = 0; col < 6; col += 1) {
            addBox(scene, -5.8 + col * 0.58, 0.34 + row * 0.28, -2.3, 0.54, 0.25, 0.28, 0xb75e3d);
          }
        }
        addBox(scene, 5.2, 1.55, -2.8, 0.18, 3.1, 4.2, 0x475569);
        addBox(scene, 5.2, 3.0, -2.8, 0.18, 0.14, 4.2, 0x475569);
        addBox(scene, 5.2, 0.8, -2.8, 0.18, 0.12, 4.2, 0x475569);
        addBox(scene, 6.5, 0.35, 1.2, 2.2, 0.55, 1.25, 0xb75e3d);
      }

      // A simple local resident/colleague uses the project's existing articulated character rig.
      const shadow = createShadowTexture();
      ownedTextures.push(shadow);
      workerRig = createCharacterRig(
        false,
        location.npcShirtColor,
        shadow,
        !isMobile,
        'pistol',
        location.npcName,
        location.npcColor,
      );
      workerRig.group.position.set(3.4, 0, -2.2);
      workerRig.group.rotation.y = Math.PI * 0.72;
      workerRig.group.scale.setScalar(0.9);
      scene.add(workerRig.group);

      playerRig = createCharacterRig(false, character, shadow, !isMobile, 'pistol');
      playerRig.group.position.copy(playerPositionRef.current);
      playerRig.group.scale.setScalar(0.94);
      scene.add(playerRig.group);

      // Work stations are marked in-world and carry a readable floating label.
      for (const task of tasks) {
        const color = completedTaskIds.includes(task.id) ? 0x64748b : colors.accent;
        const ringGeometry = new THREE.TorusGeometry(0.78, 0.07, 8, 28);
        const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 });
        ringGeometry.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.userData.taskRing = true;
        ring.userData.taskId = task.id;
        ring.position.set(task.x, 0.12, task.z);
        scene.add(ring);
        ownedGeometries.push(ringGeometry);
        ownedMaterials.push(ringMaterial);
        addLabel(scene, task.stationLabel, task.x, 2.25, task.z, 'rgba(11,22,35,0.88)');
      }

      addLabel(scene, 'SAÍDA · PORTO', 0, 2.2, 6.3, 'rgba(19,75,61,0.93)');
    };

    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.75));
      renderer.setSize(mount.clientWidth || window.innerWidth, mount.clientHeight || window.innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = !isMobile;
      if (!isMobile) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'none';
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(location.kind === 'garden' ? 0xbed0b0 : 0x9bb8c8);
      scene.fog = new THREE.Fog(0x9bb8c8, 21, 48);
      const camera = new THREE.PerspectiveCamera(52, Math.max(0.5, mount.clientWidth / Math.max(1, mount.clientHeight)), 0.1, 90);
      camera.position.set(0, 6.2, 12.2);

      const hemi = new THREE.HemisphereLight(0xf4f5ff, 0x55483b, 1.65);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xffe3bd, 2.3);
      sun.position.set(-5, 10, 7);
      sun.castShadow = !isMobile;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -12;
      sun.shadow.camera.right = 12;
      sun.shadow.camera.top = 12;
      sun.shadow.camera.bottom = -12;
      scene.add(sun);
      scene.add(sun.target);

      buildRoom(scene);

      const updatePrompt = (id: string | null) => {
        nearTaskRef.current = id;
        setNearTaskId(id);
      };

      const onResize = () => {
        if (!renderer) return;
        const width = mount.clientWidth || window.innerWidth;
        const height = mount.clientHeight || window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.code === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }
        const keyMap: Record<string, MoveKey> = {
          KeyW: 'up', ArrowUp: 'up',
          KeyS: 'down', ArrowDown: 'down',
          KeyA: 'left', ArrowLeft: 'left',
          KeyD: 'right', ArrowRight: 'right',
        };
        const moveKey = keyMap[event.code];
        if (moveKey) {
          event.preventDefault();
          keysRef.current[moveKey] = true;
        }
        if (!event.repeat && (event.code === 'KeyE' || event.code === 'Enter')) {
          event.preventDefault();
          advanceStepRef.current();
        }
      };
      const onKeyUp = (event: KeyboardEvent) => {
        const keyMap: Record<string, MoveKey> = {
          KeyW: 'up', ArrowUp: 'up',
          KeyS: 'down', ArrowDown: 'down',
          KeyA: 'left', ArrowLeft: 'left',
          KeyD: 'right', ArrowRight: 'right',
        };
        const moveKey = keyMap[event.code];
        if (moveKey) keysRef.current[moveKey] = false;
      };
      const resetKeys = () => {
        keysRef.current = { up: false, down: false, left: false, right: false };
      };
      const onBlur = () => resetKeys();
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('resize', onResize);
      window.addEventListener('blur', onBlur);

      const clock = new THREE.Clock();
      const cameraTarget = new THREE.Vector3();
      const cameraDesired = new THREE.Vector3();
      const movement = new THREE.Vector3();
      const frame = () => {
        if (disposed || !renderer || !playerRig) return;
        frameId = window.requestAnimationFrame(frame);
        const delta = Math.min(clock.getDelta(), 0.045);
        const elapsed = clock.elapsedTime;
        const position = playerPositionRef.current;
        const currentTask = activeTaskRef.current;

        if (!currentTask) {
          movement.set(
            Number(keysRef.current.right) - Number(keysRef.current.left),
            0,
            Number(keysRef.current.down) - Number(keysRef.current.up),
          );
          if (movement.lengthSq() > 1) movement.normalize();
          const speed = 4.2;
          position.x = THREE.MathUtils.clamp(position.x + movement.x * speed * delta, -8.0, 8.0);
          position.z = THREE.MathUtils.clamp(position.z + movement.z * speed * delta, -5.9, 5.6);
          if (movement.lengthSq() > 0.001) {
            playerRig.group.rotation.y = Math.atan2(movement.x, movement.z);
          }
          playerRig.group.position.copy(position);
          animateCharacterRig(playerRig, movement.lengthSq() > 0.001 ? 24 : 0, false, false, elapsed, 0);
        } else {
          animateCharacterRig(playerRig, 0, false, false, elapsed, 0);
        }
        if (workerRig) animateCharacterRig(workerRig, 0, false, false, elapsed, 1.5);

        cameraDesired.set(position.x + 0.2, 5.8, position.z + 8.8);
        cameraTarget.set(position.x, 1.15, position.z - 0.35);
        camera.position.lerp(cameraDesired, Math.min(1, delta * 4.2));
        camera.lookAt(cameraTarget);

        for (const child of scene.children) {
          if (child.userData.taskRing && child instanceof THREE.Mesh) {
            child.rotation.y += delta * 0.45;
            const material = child.material as THREE.MeshBasicMaterial;
            material.opacity = 0.65 + Math.sin(elapsed * 2.1) * 0.2;
            material.color.setHex(completedRef.current.includes(String(child.userData.taskId)) ? 0x64748b : 0xfbbf24);
          }
        }

        promptAccumulator += delta;
        if (promptAccumulator >= 0.12) {
          promptAccumulator = 0;
          let nearest: InteriorTaskDefinition | null = null;
          let nearestDistance = 1.85;
          for (const task of tasks) {
            if (completedRef.current.includes(task.id)) continue;
            const distance = Math.hypot(position.x - task.x, position.z - task.z);
            if (distance < nearestDistance) {
              nearest = task;
              nearestDistance = distance;
            }
          }
          updatePrompt(nearest ? nearest.id : null);
        }
        renderer.render(scene, camera);
      };
      const clockReset = () => {
        clock.start();
        frameId = window.requestAnimationFrame(frame);
      };
      setSceneReady(true);
      clockReset();

      return () => {
        disposed = true;
        window.cancelAnimationFrame(frameId);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('blur', onBlur);
        resetKeys();
        for (const geometry of ownedGeometries) geometry.dispose();
        for (const material of ownedMaterials) material.dispose();
        for (const texture of ownedTextures) texture.dispose();
        if (playerRig) {
          playerRig.group.traverse((object) => {
            if (object instanceof THREE.Mesh && object.geometry) object.geometry.dispose();
          });
        }
        if (workerRig) {
          workerRig.group.traverse((object) => {
            if (object instanceof THREE.Mesh && object.geometry) object.geometry.dispose();
          });
        }
        renderer?.dispose();
        if (renderer?.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o interior 3D neste dispositivo.');
      setSceneReady(false);
    }

    return () => {
      disposed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      if (renderer?.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      renderer?.dispose();
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
      for (const texture of ownedTextures) texture.dispose();
    };
  }, [location.id, location.kind, character, isMobile]);

  const bindMove = (key: MoveKey, pressed: boolean) => {
    keysRef.current[key] = pressed;
  };
  const activeStepLabel = activeDefinition ? activeDefinition.steps[activeTask!.step] : null;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 text-white">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-slate-950/90 to-transparent px-4 pb-8 pt-4 sm:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Portugal Life · Interior explorável</p>
          <h2 className="truncate text-lg font-bold sm:text-2xl">{location.label}</h2>
          <p className="text-[11px] text-slate-300">{location.npcName} · {location.npcRole}</p>
        </div>
        <button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 bg-slate-900/80 hover:bg-slate-800" aria-label="Sair do interior">
          <DoorOpen className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute left-3 top-28 z-10 w-[min(280px,72vw)] rounded-xl border border-white/15 bg-slate-950/75 p-3 backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atividades deste local</p>
        <div className="mt-2 space-y-2">
          {tasks.map((task) => {
            const isDone = completed.has(task.id);
            const locked = Boolean(task.requiredJob && task.requiredJob !== job);
            return (
              <div key={task.id} className="flex items-start gap-2 text-xs">
                {isDone ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
                <div className="min-w-0">
                  <p className={isDone ? 'text-emerald-200 line-through' : 'font-semibold text-white'}>{task.title}</p>
                  <p className="text-[10px] text-slate-400">{isDone ? 'Concluída hoje' : locked ? 'Profissão necessária: ' + task.requiredJob : task.stationLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-4 z-20 flex items-end justify-between gap-3 sm:inset-x-7">
        {isMobile ? (
          <div className="grid h-32 w-32 grid-cols-3 grid-rows-3 gap-1">
            <span />
            <MoveButton label="Avançar" onDown={() => bindMove('up', true)} onUp={() => bindMove('up', false)}>▲</MoveButton>
            <span />
            <MoveButton label="Esquerda" onDown={() => bindMove('left', true)} onUp={() => bindMove('left', false)}>◀</MoveButton>
            <span className="rounded-xl bg-slate-900/50" />
            <MoveButton label="Direita" onDown={() => bindMove('right', true)} onUp={() => bindMove('right', false)}>▶</MoveButton>
            <span />
            <MoveButton label="Recuar" onDown={() => bindMove('down', true)} onUp={() => bindMove('down', false)}>▼</MoveButton>
            <span />
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-slate-950/65 px-3 py-2 text-[11px] text-slate-300">
            Movimento: <strong>WASD / setas</strong> · Interagir: <strong>E</strong> · Sair: <strong>Esc</strong>
          </div>
        )}

        <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/85 p-3 shadow-xl backdrop-blur-md">
          {activeTask && activeDefinition ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Tarefa em execução</p>
              <h3 className="mt-1 text-sm font-bold">{activeDefinition.title}</h3>
              <p className="mt-1 text-xs text-slate-300">{activeStepLabel}</p>
              <div className="mt-3 flex gap-1">
                {activeDefinition.steps.map((step, index) => (
                  <div key={step} className={'h-1.5 flex-1 rounded-full ' + (index <= activeTask.step ? 'bg-emerald-400' : 'bg-white/15')} />
                ))}
              </div>
              <button type="button" onClick={advanceStep} className="mt-3 min-h-10 w-full rounded-xl bg-emerald-400 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-300">
                {activeTask.step === activeDefinition.steps.length - 1 ? 'Concluir tarefa' : 'Concluir etapa'}
              </button>
            </>
          ) : nearestDefinition ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Estação próxima</p>
              <h3 className="mt-1 text-sm font-bold">{nearestDefinition.title}</h3>
              <p className="mt-1 text-xs text-slate-300">{nearestDefinition.description}</p>
              <button type="button" onClick={() => startTask(nearestDefinition.id)} className="mt-3 min-h-10 w-full rounded-xl bg-amber-300 px-4 text-sm font-bold text-slate-950 hover:bg-amber-200">
                Interagir
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-white">{sceneReady ? 'Explora o interior' : 'A preparar o espaço 3D'}</p>
              <p className="mt-1 text-xs text-slate-300">{notice}</p>
            </>
          )}
          {notice && <p className="mt-2 text-[10px] text-slate-400">{notice}</p>}
          {error && <p className="mt-2 text-xs text-rose-300">3D indisponível: {error}</p>}
        </div>
      </div>
    </div>
  );
};

function MoveButton({
  label,
  onDown,
  onUp,
  children,
}: {
  label: string;
  onDown: () => void;
  onUp: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onDown();
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        onUp();
      }}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
      className="flex touch-none items-center justify-center rounded-xl border border-white/20 bg-slate-800/90 text-lg font-bold text-white active:bg-emerald-400 active:text-slate-950"
    >
      {children}
    </button>
  );
}
