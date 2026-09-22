// Pure Three.js init functions — zero React imports.
// Each returns a cleanup fn consumed via useEffect in App.tsx.
import * as THREE from "three";

// ── Particle field (hero) ─────────────────────────────────────────────────────
export function initParticleField(container: HTMLDivElement): () => void {
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
  camera.position.set(0, 0, 28);
  const COUNT = 110;
  const posArr = new Float32Array(COUNT * 3);
  const vel: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < COUNT; i++) {
    posArr[i * 3]     = (Math.random() - 0.5) * 40;
    posArr[i * 3 + 1] = (Math.random() - 0.5) * 30;
    posArr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    vel.push({ x: (Math.random() - 0.5) * 0.008, y: (Math.random() - 0.5) * 0.006, z: (Math.random() - 0.5) * 0.004 });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.5 });
  scene.add(new THREE.Points(pGeo, pMat));
  const lGeo = new THREE.BufferGeometry();
  const lSegs = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.11 }));
  scene.add(lSegs);
  let raf: number;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    for (let i = 0; i < COUNT; i++) {
      posArr[i*3]+=vel[i].x; posArr[i*3+1]+=vel[i].y; posArr[i*3+2]+=vel[i].z;
      if (Math.abs(posArr[i*3])>20) vel[i].x*=-1;
      if (Math.abs(posArr[i*3+1])>15) vel[i].y*=-1;
      if (Math.abs(posArr[i*3+2])>10) vel[i].z*=-1;
    }
    pGeo.attributes.position.needsUpdate = true;
    const lv: number[] = [];
    for (let i=0;i<COUNT;i++) for (let j=i+1;j<COUNT;j++) {
      const dx=posArr[i*3]-posArr[j*3], dy=posArr[i*3+1]-posArr[j*3+1], dz=posArr[i*3+2]-posArr[j*3+2];
      if (dx*dx+dy*dy+dz*dz<49) { lv.push(posArr[i*3],posArr[i*3+1],posArr[i*3+2],posArr[j*3],posArr[j*3+1],posArr[j*3+2]); }
    }
    lGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lv), 3));
    const t=Date.now()*0.0003;
    camera.position.x=Math.sin(t*0.4)*2; camera.position.y=Math.cos(t*0.3)*1.5; camera.lookAt(0,0,0);
    renderer.render(scene, camera);
  };
  tick();
  const resize = () => { const nw=container.clientWidth,nh=container.clientHeight; camera.aspect=nw/nh; camera.updateProjectionMatrix(); renderer.setSize(nw,nh); };
  window.addEventListener("resize", resize);
  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); pGeo.dispose(); pMat.dispose(); lGeo.dispose(); renderer.dispose(); if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement); };
}

// ── Projects cityscape — interactive, clickable buildings ─────────────────────
export type ProjectMeta = { id: string; name: string; neighborhood: string; units: number };

export function initProjectsCityscape(
  container: HTMLDivElement,
  projects: ProjectMeta[],
  onHover: (id: string | null) => void,
  onClick: (id: string) => void
): () => void {
  const w = container.clientWidth || 900;
  const h = container.clientHeight || 520;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  renderer.setClearColor(0x0b1220, 1);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1220, 30, 80);

  const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
  camera.position.set(0, 18, 36);
  camera.lookAt(0, 0, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0x8eb4e3, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 20, 15);
  dirLight.castShadow = true;
  scene.add(dirLight);
  const rimLight = new THREE.DirectionalLight(0x3e8ef7, 0.4);
  rimLight.position.set(-10, 5, -10);
  scene.add(rimLight);

  // Ground grid
  const gridHelper = new THREE.GridHelper(60, 30, 0x1e3a5a, 0x162840);
  scene.add(gridHelper);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x0d1829 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Build city — arrange in a grid
  const group = new THREE.Group();
  scene.add(group);

  const maxUnits = Math.max(...projects.map(p => p.units));
  const cols = 3;
  const spacing = 7;

  const buildingMeshes: THREE.Mesh[] = [];
  const buildingIds: string[] = [];

  const matNormal = new THREE.MeshLambertMaterial({ color: 0x1a2e45 });
  const matHover  = new THREE.MeshLambertMaterial({ color: 0x1e5aa8 });
  const matEdge   = new THREE.LineBasicMaterial({ color: 0x3e8ef7, transparent: true, opacity: 0.55 });

  projects.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * spacing;
    const z = (row - Math.floor(projects.length / cols) / 2) * spacing;
    const height = 2.5 + (p.units / maxUnits) * 11;
    const bw = 3.2, bd = 3.2;

    const geo = new THREE.BoxGeometry(bw, height, bd);
    const mat = matNormal.clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    buildingMeshes.push(mesh);
    buildingIds.push(p.id);

    // Edge wireframe outline
    const edges = new THREE.EdgesGeometry(geo);
    const wireframe = new THREE.LineSegments(edges, matEdge.clone());
    wireframe.position.set(x, height / 2, z);
    group.add(wireframe);

    // Roof accent — thin lit slab on top
    const roofGeo = new THREE.BoxGeometry(bw + 0.1, 0.08, bd + 0.1);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x3e8ef7, emissive: 0x3e8ef7, emissiveIntensity: 0.4 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, height + 0.04, z);
    group.add(roof);
    geo.dispose(); roofGeo.dispose(); edges.dispose();
  });

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-10, -10);
  let hoveredIdx = -1;
  let autoRotate = true;

  const getIdx = (): number => {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(buildingMeshes);
    return hits.length > 0 ? buildingMeshes.indexOf(hits[0].object as THREE.Mesh) : -1;
  };

  const onMouseMove = (e: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
    const idx = getIdx();
    if (idx !== hoveredIdx) {
      if (hoveredIdx >= 0) (buildingMeshes[hoveredIdx].material as THREE.MeshLambertMaterial).color.set(0x1a2e45);
      hoveredIdx = idx;
      if (hoveredIdx >= 0) {
        (buildingMeshes[hoveredIdx].material as THREE.MeshLambertMaterial).color.set(0x1e5aa8);
        onHover(buildingIds[hoveredIdx]);
      } else {
        onHover(null);
      }
    }
  };

  const onMouseClick = () => {
    const idx = getIdx();
    if (idx >= 0) { autoRotate = false; onClick(buildingIds[idx]); }
  };

  const onMouseLeave = () => {
    mouse.set(-10, -10);
    if (hoveredIdx >= 0) { (buildingMeshes[hoveredIdx].material as THREE.MeshLambertMaterial).color.set(0x1a2e45); hoveredIdx = -1; onHover(null); }
    autoRotate = true;
  };

  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("click", onMouseClick);
  renderer.domElement.addEventListener("mouseleave", onMouseLeave);
  renderer.domElement.style.cursor = "default";

  let raf: number;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (autoRotate) group.rotation.y += 0.0018;
    // Cursor feedback
    renderer.domElement.style.cursor = getIdx() >= 0 ? "pointer" : "default";
    renderer.render(scene, camera);
  };
  tick();

  const resize = () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  };
  window.addEventListener("resize", resize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    renderer.domElement.removeEventListener("mousemove", onMouseMove);
    renderer.domElement.removeEventListener("click", onMouseClick);
    renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
    renderer.dispose();
    matNormal.dispose(); matHover.dispose(); matEdge.dispose();
    groundGeo.dispose(); groundMat.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}

// ── Service step 3-D models ───────────────────────────────────────────────────
// 0 = Concept & Urban Design  (blueprint site plan)
// 1 = Construction            (building assembling floor by floor)
// 2 = In-House Manufacturing  (factory/material elements)
// 3 = Presentation & Sales    (finished polished building)

export function initServiceStepModel(container: HTMLDivElement, stepIndex: number): () => void {
  const w = container.clientWidth || 200;
  const h = container.clientHeight || 200;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);

  let raf: number;
  let tick: () => void = () => {};

  if (stepIndex === 0) {
    // Blueprint site plan — top-down view of city blocks
    camera.position.set(0, 14, 6);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    scene.add(group);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e5aa8, transparent: true, opacity: 0.8 });
    const gridMat = new THREE.LineBasicMaterial({ color: 0x3e8ef7, transparent: true, opacity: 0.18 });
    // Grid
    const gridHelper = new THREE.GridHelper(12, 12, 0x3e8ef7, 0x3e8ef7);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.18;
    group.add(gridHelper);
    // Building footprints
    const footprints: [number, number, number, number][] = [
      [-3, -3, 2.2, 3.5], [0.5, -3, 3.8, 2.2],
      [-3, 0.5, 1.8, 2.8], [0.5, 0.5, 2.8, 2.8],
      [3.5, -1, 1.8, 4.5],
    ];
    footprints.forEach(([x, z, fw, fd]) => {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(fw, 0.05, fd));
      const mesh = new THREE.LineSegments(geo, lineMat);
      mesh.position.set(x + fw/2, 0.1, z + fd/2);
      group.add(mesh);
      geo.dispose();
      // Filled footprint (very subtle)
      const fillGeo = new THREE.BoxGeometry(fw, 0.02, fd);
      const fillMat = new THREE.MeshBasicMaterial({ color: 0x1e5aa8, transparent: true, opacity: 0.1 });
      const fill = new THREE.Mesh(fillGeo, fillMat);
      fill.position.set(x + fw/2, 0.05, z + fd/2);
      group.add(fill);
      fillGeo.dispose(); fillMat.dispose();
    });
    tick = () => { raf = requestAnimationFrame(tick); group.rotation.y += 0.005; renderer.render(scene, camera); };

  } else if (stepIndex === 1) {
    // Construction — floors animate in bottom to top, loop
    camera.position.set(8, 8, 12);
    camera.lookAt(0, 3, 0);
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(5, 10, 5);
    scene.add(dl);

    const FLOORS = 8;
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xc8d4e0 });
    const columnMat = new THREE.MeshLambertMaterial({ color: 0x8aa0b4 });
    const floors: THREE.Mesh[] = [];
    for (let i = 0; i < FLOORS; i++) {
      const geo = new THREE.BoxGeometry(3.8, 0.22, 2.8);
      const mesh = new THREE.Mesh(geo, floorMat);
      mesh.position.set(0, i * 1.0, 0);
      mesh.scale.y = 0;
      group.add(mesh);
      floors.push(mesh);
      geo.dispose();
    }
    // Columns
    [[-1.8, -1.3], [1.8, -1.3], [-1.8, 1.3], [1.8, 1.3]].forEach(([cx, cz]) => {
      const cGeo = new THREE.BoxGeometry(0.22, FLOORS * 1.0, 0.22);
      const col = new THREE.Mesh(cGeo, columnMat);
      col.position.set(cx, (FLOORS * 1.0) / 2, cz);
      group.add(col);
      cGeo.dispose();
    });

    let t = 0;
    tick = () => {
      raf = requestAnimationFrame(tick);
      t += 0.018;
      const progress = (Math.sin(t * 0.5) + 1) / 2; // 0→1→0
      floors.forEach((f, i) => {
        const threshold = i / FLOORS;
        const s = Math.max(0, Math.min(1, (progress - threshold) * FLOORS * 0.8));
        f.scale.y = s;
        f.position.y = i * 1.0 - (1 - s) * 0.5;
      });
      group.rotation.y += 0.006;
      renderer.render(scene, camera);
    };
    floorMat.dispose(); columnMat.dispose();

  } else if (stepIndex === 2) {
    // Manufacturing — PVC window frame + precast panels in assembly
    camera.position.set(7, 5, 10);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(8, 12, 8);
    scene.add(dl);
    const group = new THREE.Group();
    scene.add(group);

    // PVC window frame
    const frameMat = new THREE.MeshLambertMaterial({ color: 0xe8eef5 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x8ec5e8, transparent: true, opacity: 0.45 });
    const frameThick = 0.18;
    const fw = 2.8, fh = 2.2;
    const frameGeo = new THREE.BoxGeometry(fw, frameThick, 0.14);
    const addFrame = (x: number, y: number, w: number, h: number) => {
      const g = new THREE.BoxGeometry(w, h, 0.14);
      const m = new THREE.Mesh(g, frameMat);
      m.position.set(x, y, 0);
      group.add(m);
      g.dispose();
    };
    addFrame(0, fh/2, fw, frameThick);
    addFrame(0, -fh/2, fw, frameThick);
    addFrame(-fw/2, 0, frameThick, fh);
    addFrame(fw/2, 0, frameThick, fh);
    addFrame(0, 0, frameThick, fh);
    const glassGeo = new THREE.BoxGeometry(fw/2 - frameThick - 0.05, fh - frameThick*2 - 0.05, 0.04);
    for (const ox of [-fw/4, fw/4]) {
      const g = new THREE.Mesh(glassGeo, glassMat);
      g.position.set(ox, 0, 0.05);
      group.add(g);
    }
    glassGeo.dispose(); frameGeo.dispose(); frameMat.dispose(); glassMat.dispose();

    // Precast panel stack to the right
    const panelMat = new THREE.MeshLambertMaterial({ color: 0xb8c8d8 });
    for (let i = 0; i < 4; i++) {
      const pg = new THREE.BoxGeometry(1.6, 0.22, 0.9);
      const pm = new THREE.Mesh(pg, panelMat);
      pm.position.set(2.4, -0.8 + i * 0.36, -0.2);
      pm.rotation.y = 0.2;
      group.add(pm);
      pg.dispose();
    }
    panelMat.dispose();

    tick = () => {
      raf = requestAnimationFrame(tick);
      group.rotation.y += 0.007;
      renderer.render(scene, camera);
    };

  } else {
    // Presentation — clean finished building, solid surfaces, nice shading
    camera.position.set(9, 9, 13);
    camera.lookAt(0, 3, 0);
    scene.add(new THREE.AmbientLight(0xf0f4ff, 0.7));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.1);
    sun.position.set(12, 18, 10);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.35);
    fill.position.set(-8, 4, -6);
    scene.add(fill);
    const group = new THREE.Group();
    scene.add(group);

    // Main building body
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xdce8f4 });
    const bodyGeo = new THREE.BoxGeometry(3.6, 8, 3);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 4, 0);
    group.add(body);
    bodyGeo.dispose();

    // Window grid
    const winMat = new THREE.MeshLambertMaterial({ color: 0x7ab5d8, transparent: true, opacity: 0.75 });
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 2; col++) {
        const wg = new THREE.BoxGeometry(0.55, 0.65, 0.05);
        const wm = new THREE.Mesh(wg, winMat);
        wm.position.set(-0.5 + col * 1.0, 1.2 + row * 1.1, 1.53);
        group.add(wm);
        wg.dispose();
      }
    }
    winMat.dispose();

    // Balcony slabs
    const balcMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let row = 0; row < 6; row++) {
      const bg = new THREE.BoxGeometry(4.0, 0.1, 0.6);
      const bm = new THREE.Mesh(bg, balcMat);
      bm.position.set(0, 0.85 + row * 1.1, 1.7);
      group.add(bm);
      bg.dispose();
    }
    balcMat.dispose();

    // Roof
    const roofGeo = new THREE.BoxGeometry(3.8, 0.18, 3.2);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e5aa8 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 8.09, 0);
    group.add(roof);
    roofGeo.dispose(); roofMat.dispose();

    // Ground
    const gGeo = new THREE.BoxGeometry(8, 0.12, 6);
    const gMat = new THREE.MeshLambertMaterial({ color: 0x8aa8c0 });
    const gnd = new THREE.Mesh(gGeo, gMat);
    gnd.position.set(0, -0.06, 0);
    group.add(gnd);
    gGeo.dispose(); gMat.dispose(); bodyMat.dispose();

    tick = () => {
      raf = requestAnimationFrame(tick);
      group.rotation.y += 0.006;
      renderer.render(scene, camera);
    };
  }

  tick();

  const resize = () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  };
  window.addEventListener("resize", resize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    renderer.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}

// ── Hero skyline — wireframe skyscraper city ──────────────────────────────────
export function initHeroSkyline(container: HTMLDivElement): () => void {
  const w = container.clientWidth || 1200;
  const h = container.clientHeight || 700;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 800);
  camera.position.set(0, 14, 55);
  camera.lookAt(0, 8, 0);

  const BRAND = 0x1E5AA8;
  const ELECTRIC = 0x3E8EF7;

  // Building definitions [x, z, width, depth, height, floors]
  const BLDGS: [number, number, number, number, number, number][] = [
    [-28, 0,  6, 5, 28, 7],
    [-20, 2,  5, 4, 18, 5],
    [-13, -1, 7, 6, 38, 10],
    [-5,  1,  6, 5, 48, 12],
    [4,   0,  8, 6, 56, 14],
    [14,  2,  5, 4, 34, 9],
    [21,  -1, 6, 5, 22, 6],
    [29,  0,  7, 5, 40, 10],
    [-8,  -5, 4, 3, 20, 5],
    [10,  -4, 5, 4, 30, 8],
    [-34, -2, 4, 3, 14, 4],
    [36,  -2, 4, 3, 16, 4],
  ];

  const group = new THREE.Group();
  scene.add(group);

  // Wireframe edges material
  const wireMat = new THREE.LineBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.45 });
  const accentMat = new THREE.LineBasicMaterial({ color: BRAND, transparent: true, opacity: 0.7 });
  const dotGeo = new THREE.SphereGeometry(0.12, 4, 4);
  const dotMat = new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.8 });

  BLDGS.forEach(([bx, bz, bw, bd, bh, floors]) => {
    const bGeo = new THREE.BoxGeometry(bw, bh, bd);
    const edges = new THREE.EdgesGeometry(bGeo);
    const line = new THREE.LineSegments(edges, bx === 4 ? accentMat.clone() : wireMat.clone());
    line.position.set(bx, bh / 2, bz);
    group.add(line);
    bGeo.dispose(); edges.dispose();

    // Floor lines
    for (let f = 1; f < floors; f++) {
      const y = (bh / floors) * f;
      const floorPoints = [
        new THREE.Vector3(bx - bw / 2, y, bz - bd / 2),
        new THREE.Vector3(bx + bw / 2, y, bz - bd / 2),
        new THREE.Vector3(bx + bw / 2, y, bz + bd / 2),
        new THREE.Vector3(bx - bw / 2, y, bz + bd / 2),
        new THREE.Vector3(bx - bw / 2, y, bz - bd / 2),
      ];
      const fGeo = new THREE.BufferGeometry().setFromPoints(floorPoints);
      const fLine = new THREE.Line(fGeo, wireMat.clone());
      (fLine.material as THREE.LineBasicMaterial).opacity = 0.18;
      group.add(fLine);
      fGeo.dispose();
    }

    // Rooftop dot
    const dot = new THREE.Mesh(dotGeo, dotMat.clone());
    dot.position.set(bx, bh + 0.15, bz);
    group.add(dot);
  });

  // Ground grid
  const gridHelper = new THREE.GridHelper(120, 30, 0x1E5AA8, 0x0d2a4d);
  (gridHelper.material as THREE.LineBasicMaterial).opacity = 0.25;
  (gridHelper.material as THREE.LineBasicMaterial).transparent = true;
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // Horizon glow lines
  for (let i = 0; i < 5; i++) {
    const y = i * 2.5;
    const pts = [new THREE.Vector3(-70, y, -30), new THREE.Vector3(70, y, -30)];
    const lg = new THREE.BufferGeometry().setFromPoints(pts);
    const lm = new THREE.LineBasicMaterial({ color: BRAND, transparent: true, opacity: 0.04 + i * 0.025 });
    scene.add(new THREE.Line(lg, lm));
    lg.dispose();
  }

  // Floating connection dots between buildings
  const connDots: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const d = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.5 }));
    d.position.set((Math.random() - 0.5) * 60, 8 + Math.random() * 24, (Math.random() - 0.5) * 8);
    d.userData.phase = Math.random() * Math.PI * 2;
    scene.add(d);
    connDots.push(d);
  }

  let raf: number;
  let t = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    t += 0.008;
    group.rotation.y = Math.sin(t * 0.18) * 0.08;
    camera.position.x = Math.sin(t * 0.12) * 3;
    camera.position.y = 14 + Math.sin(t * 0.09) * 1.5;
    camera.lookAt(0, 8, 0);
    connDots.forEach((d) => {
      const ph = d.userData.phase as number;
      d.position.y += Math.sin(t + ph) * 0.012;
      (d.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 1.5 + ph) * 0.25;
    });
    renderer.render(scene, camera);
  };
  tick();

  const resize = () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  };
  window.addEventListener("resize", resize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    renderer.dispose();
    dotGeo.dispose(); dotMat.dispose(); wireMat.dispose(); accentMat.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}

// ── Services 3D — animated process steps orbit ───────────────────────────────
export function initServicesScene(container: HTMLDivElement): () => void {
  const w = container.clientWidth || 600;
  const h = container.clientHeight || 500;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
  camera.position.set(0, 5, 22);
  camera.lookAt(0, 0, 0);

  const BRAND = 0x1E5AA8;
  const ELECTRIC = 0x3E8EF7;

  // Central building
  const cGeo = new THREE.BoxGeometry(3, 8, 3);
  const cEdge = new THREE.EdgesGeometry(cGeo);
  const cLine = new THREE.LineSegments(cEdge, new THREE.LineBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.9 }));
  scene.add(cLine);
  cGeo.dispose(); cEdge.dispose();

  // Floor lines on central building
  for (let f = 1; f < 8; f++) {
    const y = -4 + f;
    const pts = [
      new THREE.Vector3(-1.5, y, -1.5), new THREE.Vector3(1.5, y, -1.5),
      new THREE.Vector3(1.5, y, 1.5), new THREE.Vector3(-1.5, y, 1.5),
      new THREE.Vector3(-1.5, y, -1.5),
    ];
    const fg = new THREE.BufferGeometry().setFromPoints(pts);
    const fl = new THREE.Line(fg, new THREE.LineBasicMaterial({ color: BRAND, transparent: true, opacity: 0.3 }));
    scene.add(fl);
    fg.dispose();
  }

  // 4 orbiting elements — one per process step
  const ORBIT_COLORS = [0x3E8EF7, 0x1E5AA8, 0x5aa8e8, 0x2468BC];
  const ORBIT_R = [7, 8.5, 6.5, 10];
  const ORBIT_Y = [3, -1, 1, -2.5];
  const ORBIT_SPEED = [0.4, -0.3, 0.55, -0.25];
  const orbitMeshes: THREE.LineSegments[] = [];

  ORBIT_COLORS.forEach((col, i) => {
    // Small building per step
    const h2 = 2 + i * 0.8;
    const og = new THREE.BoxGeometry(1.4, h2, 1.4);
    const oe = new THREE.EdgesGeometry(og);
    const om = new THREE.LineSegments(oe, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.75 }));
    om.userData = { r: ORBIT_R[i], y: ORBIT_Y[i], speed: ORBIT_SPEED[i], phase: (Math.PI / 2) * i };
    scene.add(om);
    orbitMeshes.push(om);
    og.dispose(); oe.dispose();

    // Connecting dashed line to center (as thin line)
    const connGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(ORBIT_R[i], ORBIT_Y[i], 0)]);
    const connLine = new THREE.Line(connGeo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.15 }));
    connLine.userData.orbitIndex = i;
    scene.add(connLine);
    connGeo.dispose();
  });

  // Orbit rings
  ORBIT_R.forEach((r, i) => {
    const pts: THREE.Vector3[] = [];
    for (let a = 0; a <= 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(ang) * r, ORBIT_Y[i], Math.sin(ang) * r));
    }
    const rg = new THREE.BufferGeometry().setFromPoints(pts);
    const rl = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: ORBIT_COLORS[i], transparent: true, opacity: 0.12 }));
    scene.add(rl);
    rg.dispose();
  });

  // Ground grid
  const grid = new THREE.GridHelper(40, 20, BRAND, 0x0d2a4d);
  (grid.material as THREE.LineBasicMaterial).opacity = 0.2;
  (grid.material as THREE.LineBasicMaterial).transparent = true;
  grid.position.y = -4.1;
  scene.add(grid);

  // Floating particles
  const pGeo = new THREE.SphereGeometry(0.08, 4, 4);
  const particles: THREE.Mesh[] = [];
  for (let i = 0; i < 30; i++) {
    const pm = new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: Math.random() * 0.5 + 0.2 });
    const p = new THREE.Mesh(pGeo, pm);
    p.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    p.userData.phase = Math.random() * Math.PI * 2;
    scene.add(p);
    particles.push(p);
  }

  let raf: number;
  let t = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    t += 0.007;
    cLine.rotation.y = t * 0.15;

    orbitMeshes.forEach((om) => {
      const { r, y, speed, phase } = om.userData;
      const ang = t * speed + phase;
      om.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
      om.rotation.y = t * 0.8;
    });

    particles.forEach((p) => {
      p.position.y += Math.sin(t + p.userData.phase) * 0.008;
      (p.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 1.2 + p.userData.phase) * 0.2;
    });

    camera.position.x = Math.sin(t * 0.1) * 2.5;
    camera.position.y = 5 + Math.sin(t * 0.07) * 1;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  tick();

  const resize = () => {
    const nw = container.clientWidth, nh = container.clientHeight;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  };
  window.addEventListener("resize", resize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    renderer.dispose();
    pGeo.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}
