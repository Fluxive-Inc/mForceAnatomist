import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { gsap } from 'gsap';
import { RootSystemsService } from './services/root-systems.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('webglContainer', { static: true }) webglContainer!: ElementRef;
  @ViewChild('cssContainer', { static: true }) cssContainer!: ElementRef;

  private rootSystemsService = inject(RootSystemsService);
  private ngZone = inject(NgZone);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private cssRenderer!: CSS3DRenderer;
  private orbitControls!: OrbitControls;
  
  // Post-Processing
  private composer!: EffectComposer;
  private bokehPass!: BokehPass;
  private bloomPass!: UnrealBloomPass;
  
  // Track all logo objects to face the camera
  private logoObjects: CSS3DObject[] = [];

  private animationFrameId: number = 0;
  private clock = new THREE.Clock();

  public isActivated = false;

  // Dome elements
  private leftDoor!: THREE.Mesh;
  private rightDoor!: THREE.Mesh;
  
  // Cinematic exterior pan state
  private cameraPanAngle: number = Math.PI / 2;
  
  // Botanical & Environment Elements
  private windShader: any;
  private pollenSystem!: THREE.Points;
  private interactableNodes: { mesh: THREE.Mesh, system: any, plaqueObj: CSS3DObject | null }[] = [];
  
  // Minimap
  public mapX: number = 50;
  public mapY: number = 50;
  public zoomLevel: number = 0;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private targetFocusDistance: number = 400.0;
  
  // Phase 6 Immersion State
  private causticsMap!: THREE.Texture;
  private prevCameraPos = new THREE.Vector3();
  private headBobTimer: number = 0;
  private audioListener!: THREE.AudioListener;

  ngOnInit(): void {
    // VisionSync: The Handshake Protocol
    window.addEventListener('mforce-auth-changed', (event: any) => {
      const user = event?.detail?.user;
      if (user) {
        console.log(`[FluxiveOS] Connected: ${user.email}`);
        if (!this.isActivated) {
          this.activateViewer();
        }
      } else {
        console.log('[FluxiveOS] Guest Mode / Disconnected');
      }
    });

    // VisionSync: Ledger Reconciliation Protocol
    fetch('https://machineforce.fluxive.ai/api/ledger/reconcile', { method: 'POST' })
      .then(() => console.log('[Ledger] Sync Complete'))
  }

  ngAfterViewInit() {
    this.initThreeJs();
    this.buildGeodesicDome();
    this.buildCoreArchitecture();
    
    // Botanical Libraries
    this.populateTallFlora();
    this.populateFanPalms();
    this.populatePhilodendrons();
    this.populateVines();
    this.populateGroundCover();
    
    this.setupAudio();
    this.populateFloraNodes();
    this.setupAmbientEffects();
    this.setupGodRays();
    this.setupExteriorView();
    this.applyPerformanceOptimizations();
    this.animate();
  }

  private applyPerformanceOptimizations() {
    this.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.frustumCulled = true;
      }
    });
    console.log('[ArchViz] Frustum Culling Enforced Globally');
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    if (this.renderer) this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.cssContainer.nativeElement.removeEventListener('click', this.onClick.bind(this));
  }

  private initThreeJs() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky Blue Daylight
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.00015); // Matching fog

    this.camera = new THREE.PerspectiveCamera(70, width / height, 1, 4000);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); // Antialias TRUE for crisp lines
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.webglContainer.nativeElement.appendChild(this.renderer.domElement);

    // PMREM Generator for physically correct reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    // IBL: HDRI Environment Map
    new RGBELoader().load(
      'assets/textures/botanical_garden.hdr',
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        this.scene.environment = envMap;
        this.scene.background = envMap;
        texture.dispose();
        pmremGenerator.dispose();
      },
      undefined,
      (err) => console.warn('[IBL] HDRI missing. Using default lighting.', err)
    );

    // Post-Processing with Multisampling (MSAA) for crisp antialiasing
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      samples: 4
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Soft Bloom for holographic vibe
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    this.bloomPass.threshold = 0.5; // Higher threshold so only very bright things glow
    this.bloomPass.strength = 0.08; // Extremely subtle tight bloom
    this.bloomPass.radius = 0.05; // Very tight radius for crispness
    this.composer.addPass(this.bloomPass);

    // SSAO Pass for ArchViz Contact Shadows
    const ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
    ssaoPass.kernelRadius = 16;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.1;
    this.composer.addPass(ssaoPass);

    // Bokeh Pass (Depth of Field)
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 400.0,
      aperture: 0.00005,
      maxblur: 0.01
    });
    this.composer.addPass(this.bokehPass);

    // CSS3D Renderer
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(width, height);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0px';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    this.cssContainer.nativeElement.appendChild(this.cssRenderer.domElement);

    // Zonal Lights (Daylight)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 1000, -200);
    this.scene.add(dirLight);

    this.orbitControls = new OrbitControls(this.camera, this.cssRenderer.domElement);
    this.orbitControls.enabled = false;
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;

    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add click event for Raycasting tech nodes
    this.cssContainer.nativeElement.addEventListener('click', this.onClick.bind(this));
    this.cssContainer.nativeElement.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Dynamic Cinematic Bokeh Raycast
    if (this.isActivated && this.camera && this.interactableNodes.length > 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactableNodes.map(n => n.mesh), false);
      if (intersects.length > 0) {
        this.targetFocusDistance = intersects[0].distance;
      } else {
        this.targetFocusDistance = 400.0; // Fall back to distant focus
      }
    }
  }

  private onClick(event: MouseEvent) {
    if (!this.orbitControls.enabled) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactableNodes.map(n => n.mesh), false);

    if (intersects.length > 0) {
      const targetMesh = intersects[0].object as THREE.Mesh;
      const targetPos = new THREE.Vector3();
      targetMesh.getWorldPosition(targetPos);

      // Lock-on Cinematic Logic
      const dist = 100;
      const offset = new THREE.Vector3(dist, dist / 2, dist);
      const camPos = targetPos.clone().add(offset);

      const timeline = gsap.timeline();
      
      // Move camera
      timeline.to(this.camera.position, {
        x: camPos.x, y: camPos.y, z: camPos.z,
        duration: 2, ease: "power3.inOut"
      }, 0);
      
      // Look at target
      timeline.to(this.orbitControls.target, {
        x: targetPos.x, y: targetPos.y, z: targetPos.z,
        duration: 2, ease: "power3.inOut"
      }, 0);

      // Animate Plaque unfolding
      const nodeData = this.interactableNodes.find(n => n.mesh === targetMesh);
      if (nodeData && nodeData.plaqueObj) {
        // Reset scale and animate up
        nodeData.plaqueObj.scale.set(0.01, 0.01, 0.01);
        timeline.to(nodeData.plaqueObj.scale, {
          x: 0.2, y: 0.2, z: 0.2,
          duration: 1.5, ease: "elastic.out(1, 0.5)"
        }, 1.0); // Trigger after cam starts moving
      }
    } else {
      // Clicked empty space - nothing to reset for now
    }
  }

  private buildGeodesicDome() {
    const textureLoader = new THREE.TextureLoader();
    const steelNormalMap = textureLoader.load('assets/textures/steel_normal.png');
    steelNormalMap.wrapS = THREE.RepeatWrapping;
    steelNormalMap.wrapT = THREE.RepeatWrapping;
    steelNormalMap.repeat.set(10, 10);

    // USBG Aspect Ratio: Wider (1800), Squatter (400)
    const wallGeom = new THREE.CylinderGeometry(1800, 1800, 400, 64, 1, true);
    // Flattened roof dome
    const roofGeom = new THREE.SphereGeometry(1800, 64, 16, 0, Math.PI * 2, 0, Math.PI / 4);
    
    const glassMat = new THREE.MeshPhysicalMaterial({ 
      color: 0xcce6ff,
      transparent: true,
      transmission: 1.0, // Fully transmissive glass
      opacity: 1.0,
      metalness: 0.1,
      roughness: 0.05,
      ior: 1.52, // Real world index of refraction for glass
      clearcoat: 1.0, // Extra sharp reflection layer
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });
    
    const walls = new THREE.Mesh(wallGeom, glassMat);
    walls.position.y = 200; // Center of 400 cylinder
    this.scene.add(walls);

    const roof = new THREE.Mesh(roofGeom, glassMat);
    roof.position.y = 400;
    this.scene.add(roof);

    // Steel Frame
    const wallWireGeom = new THREE.WireframeGeometry(wallGeom);
    const roofWireGeom = new THREE.WireframeGeometry(roofGeom);
    
    // PBR Steel Material for structural framing
    const steelMat = new THREE.LineBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.95 });
    
    const wallFrame = new THREE.LineSegments(wallWireGeom, steelMat);
    wallFrame.position.y = 200;
    this.scene.add(wallFrame);

    const roofFrame = new THREE.LineSegments(roofWireGeom, steelMat);
    roofFrame.position.y = 400;
    this.scene.add(roofFrame);

    // Entrance Doors
    const doorGeom = new THREE.BoxGeometry(100, 150, 10);
    const doorMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x0f766e, 
      emissive: 0x0f766e,
      emissiveIntensity: 0.4,
      transparent: true, 
      opacity: 0.9,
      roughness: 0.2, 
      metalness: 0.9,
      normalMap: steelNormalMap
    });
    
    this.leftDoor = new THREE.Mesh(doorGeom, doorMat);
    this.leftDoor.position.set(-50, 75, 1750); // Moved to edge of 1800 radius
    this.scene.add(this.leftDoor);

    this.rightDoor = new THREE.Mesh(doorGeom, doorMat);
    this.rightDoor.position.set(50, 75, 1750);
    this.scene.add(this.rightDoor);
  }

  private buildCoreArchitecture() {
    const textureLoader = new THREE.TextureLoader();
    const soilNormalMap = textureLoader.load('assets/textures/soil_normal.png');
    soilNormalMap.wrapS = THREE.RepeatWrapping;
    soilNormalMap.wrapT = THREE.RepeatWrapping;
    soilNormalMap.repeat.set(100, 100);

    // Module 6: Caustics
    this.causticsMap = textureLoader.load('assets/textures/caustics.png');
    this.causticsMap.wrapS = THREE.RepeatWrapping;
    this.causticsMap.wrapT = THREE.RepeatWrapping;
    this.causticsMap.repeat.set(50, 50);

    // Massive Soil/Earth Level to cover horizon
    const soilGeom = new THREE.PlaneGeometry(20000, 20000);
    const soilMat = new THREE.MeshStandardMaterial({ 
      color: 0x2e1b12, 
      roughness: 0.95, 
      metalness: 0.0,
      normalMap: soilNormalMap,
      emissiveMap: this.causticsMap,
      emissive: 0x2DD4BF,
      emissiveIntensity: 0.15 // Subtle glowing caustics
    });
    const soil = new THREE.Mesh(soilGeom, soilMat);
    soil.rotation.x = -Math.PI / 2;
    this.scene.add(soil);

    // Brick Walkway leading up to the dome
    const pathGeom = new THREE.PlaneGeometry(300, 4000);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, metalness: 0.1 });
    const path = new THREE.Mesh(pathGeom, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.5, 2000); // 0.5 to prevent z-fighting with soil
    this.scene.add(path);

    // Exterior Landscaping (Trees)
    const treeTrunkGeom = new THREE.CylinderGeometry(15, 20, 150, 8);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const treeCanopyGeom = new THREE.DodecahedronGeometry(100, 1);
    const treeCanopyMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.8 });

    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1300 + Math.random() * 3000; // Scattered outside the dome
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Keep walkway clear
      if (Math.abs(x) < 200 && z > 1000) continue;

      const trunk = new THREE.Mesh(treeTrunkGeom, treeTrunkMat);
      trunk.position.set(x, 75, z);
      this.scene.add(trunk);

      const canopy = new THREE.Mesh(treeCanopyGeom, treeCanopyMat);
      canopy.position.set(x, 150 + Math.random() * 40, z);
      canopy.rotation.y = Math.random() * Math.PI;
      canopy.rotation.z = Math.random() * 0.2;
      this.scene.add(canopy);
    }

    // Physical Structural Pillars
    const pillarGeom = new THREE.CylinderGeometry(15, 15, 300, 16);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.5 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 350; // Inner edge of catwalks
      const z = Math.sin(angle) * 350;
      const pillar = new THREE.Mesh(pillarGeom, pillarMat);
      pillar.position.set(x, 150, z); // 300 tall, rests on 0
      this.scene.add(pillar);
    }

    // Canopy Catwalks (Mezzanine)
    const catwalkGeom = new THREE.RingGeometry(350, 400, 32);
    const metalMat = new THREE.MeshStandardMaterial({ 
      color: 0x334155, 
      roughness: 0.3, 
      metalness: 0.9, 
      side: THREE.DoubleSide 
    });
    const catwalk = new THREE.Mesh(catwalkGeom, metalMat);
    catwalk.rotation.x = -Math.PI / 2;
    catwalk.position.y = 300;
    this.scene.add(catwalk);

    // Railings
    const railGeom = new THREE.TorusGeometry(350, 2, 8, 32);
    const railGeomOuter = new THREE.TorusGeometry(400, 2, 8, 32);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const innerRail = new THREE.Mesh(railGeom, railMat);
    innerRail.position.y = 315;
    innerRail.rotation.x = Math.PI / 2;
    this.scene.add(innerRail);
    const outerRail = new THREE.Mesh(railGeomOuter, railMat);
    outerRail.position.y = 315;
    outerRail.rotation.x = Math.PI / 2;
    this.scene.add(outerRail);

    // Pathfinding Signs (Simple 3D text replacement with Planes)
    const createSign = (x: number, y: number, z: number, r: number, color: number) => {
      const geom = new THREE.PlaneGeometry(60, 20);
      const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = r;
      this.scene.add(mesh);
    };
    
    // Muted indications of signage
    createSign(150, 160, 0, Math.PI / 2, 0x10B981);
    createSign(0, 310, 150, 0, 0x2DD4BF);
  }

  private populateFanPalms() {
    const palmGroup = new THREE.Group();
    const trunkGeom = new THREE.CylinderGeometry(4, 6, 120, 8);
    trunkGeom.translate(0, 60, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 1.0 });
    
    // Module 5: Subsurface Scattering (SSS) approximation via Physical transmission
    const leafGeom = new THREE.PlaneGeometry(40, 15);
    leafGeom.translate(20, 0, 0);
    const leafMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x2e7d32, 
      side: THREE.DoubleSide, 
      roughness: 0.6,
      transmission: 0.6, // Let light pass through
      thickness: 0.5, // Physical thickness for internal scattering
      attenuationColor: new THREE.Color(0x1b5e20),
      attenuationDistance: 2.0
    });

    for (let i = 0; i < 150; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      tree.add(trunk);
      
      for (let j = 0; j < 10; j++) {
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.y = 110;
        leaf.rotation.y = (j / 10) * Math.PI * 2;
        leaf.rotation.z = Math.PI / 4 + Math.random() * 0.2;
        tree.add(leaf);
      }
      
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1600; // Scatter inside the dome
      tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      tree.scale.setScalar(0.6 + Math.random() * 1.5);
      tree.rotation.y = Math.random() * Math.PI;
      palmGroup.add(tree);
    }
    this.scene.add(palmGroup);
  }

  private populatePhilodendrons() {
    const philoGroup = new THREE.Group();
    const leafGeom = new THREE.PlaneGeometry(25, 35);
    leafGeom.translate(0, 17.5, 0);
    
    // Module 5: SSS Broadleaf Material
    const leafMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x1b5e20, 
      side: THREE.DoubleSide, 
      roughness: 0.2, 
      metalness: 0.1,
      transmission: 0.8, 
      thickness: 1.5, 
      attenuationColor: new THREE.Color(0x064e3b),
      attenuationDistance: 1.5
    });

    for (let i = 0; i < 300; i++) {
      const cluster = new THREE.Group();
      for (let j = 0; j < 6; j++) {
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.rotation.y = Math.random() * Math.PI * 2;
        leaf.rotation.x = Math.PI / 6 + Math.random() * 0.5;
        cluster.add(leaf);
      }
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1750;
      cluster.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      cluster.scale.setScalar(0.8 + Math.random() * 1.5);
      philoGroup.add(cluster);
    }
    this.scene.add(philoGroup);
  }

  private populateVines() {
    // Wrap vines around the 8 structural pillars
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const px = Math.cos(angle) * 350;
      const pz = Math.sin(angle) * 350;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(px + 15, 0, pz),
        new THREE.Vector3(px, 100, pz + 15),
        new THREE.Vector3(px - 15, 200, pz),
        new THREE.Vector3(px, 300, pz - 15)
      ]);
      const tubeGeom = new THREE.TubeGeometry(curve, 64, 4, 8, false);
      const vine = new THREE.Mesh(tubeGeom, vineMat);
      this.scene.add(vine);
    }
  }

  private populateGroundCover() {
    const fernCount = 10000;
    const fernGeom = new THREE.PlaneGeometry(3, 8);
    fernGeom.translate(0, 4, 0);
    const fernMat = new THREE.MeshStandardMaterial({ 
      color: 0x064e3b, 
      side: THREE.DoubleSide, 
      roughness: 0.8 
    });

    // Sensory Immersion: Custom GLSL Wind Shader
    fernMat.onBeforeCompile = (shader) => {
      shader.uniforms['time'] = { value: 0 };
      this.windShader = shader; // Save reference to update in animate()
      
      shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3( position );
        
        // Convert instance matrix position to world coordinates to calculate localized wind phase
        vec4 worldPos = instanceMatrix * vec4( position, 1.0 );
        
        // Simplex noise approximation using overlapping sine waves for organic swaying
        float speed = 1.5;
        float windSwayX = sin(time * speed + worldPos.x * 0.05 + worldPos.z * 0.05) * 0.5;
        float windSwayZ = cos(time * speed * 0.8 + worldPos.x * 0.06 - worldPos.z * 0.04) * 0.5;
        
        // Sway intensity increases geometrically towards the tip of the leaf (position.y)
        float intensity = pow(position.y * 0.15, 1.5);
        transformed.x += windSwayX * intensity;
        transformed.z += windSwayZ * intensity;
        `
      );
    };

    const instancedFerns = new THREE.InstancedMesh(fernGeom, fernMat, fernCount);
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < fernCount; i++) {
      const radius = Math.random() * 1900;
      const angle = Math.random() * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const s = 0.5 + Math.random() * 1.0;
      dummy.scale.setScalar(s);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.rotation.x = (Math.random() - 0.5) * 0.4;
      dummy.updateMatrix();
      instancedFerns.setMatrixAt(i, dummy.matrix);
    }
    
    instancedFerns.frustumCulled = true;
    this.scene.add(instancedFerns);
  }

  private populateFloraNodes() {
    const taxonomy = this.rootSystemsService.getTaxonomy();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x10B981, emissive: 0x064e3b, roughness: 0.4, metalness: 0.9 });

    taxonomy.forEach(category => {
      let yLevel = 0;
      let radius = 0;
      
      if (category.id === 'db') {
        yLevel = 0;
        radius = 200;
      } else if (category.id === 'backend' || category.id === 'desktop') {
        yLevel = 300;
        radius = 320; // Inner edge of catwalk
      } else {
        yLevel = 300;
        radius = 430; // Outer edge of catwalk
      }

      category.systems.forEach((system, i) => {
        const angle = (i / category.systems.length) * Math.PI * 2 + (Math.random() * 0.5);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Stem
        const height = 100 + Math.random() * 120; // Taller stems to stand out
        const stemGeom = new THREE.CylinderGeometry(4, 10, height, 8); 
        const stemMatPhysical = new THREE.MeshPhysicalMaterial({ 
          color: 0x0f766e, transmission: 0.8, roughness: 0.2 
        });
        const stem = new THREE.Mesh(stemGeom, stemMatPhysical);
        stem.position.set(x, yLevel + height / 2, z);
        this.scene.add(stem);

        // Memory Management: LOD System for the Complex Pedestal
        const lod = new THREE.LOD();

        // High Poly Base (Distance < 50)
        const highPolyGeom = new THREE.CylinderGeometry(20, 15, 10, 32);
        const highPoly = new THREE.Mesh(highPolyGeom, stemMatPhysical);
        highPoly.frustumCulled = true;
        lod.addLevel(highPoly, 10);

        // Mid Poly Base (Distance < 150)
        const midPolyGeom = new THREE.CylinderGeometry(20, 15, 10, 16);
        const midPoly = new THREE.Mesh(midPolyGeom, stemMatPhysical);
        midPoly.frustumCulled = true;
        lod.addLevel(midPoly, 50);

        // Low Poly Billboard Base (Distance > 150)
        const lowPolyGeom = new THREE.CylinderGeometry(20, 15, 10, 6);
        const lowPoly = new THREE.Mesh(lowPolyGeom, stemMatPhysical);
        lowPoly.frustumCulled = true;
        lod.addLevel(lowPoly, 150);

        // Module 8: Positional Data Thrumming
        if (this.audioListener) {
          const positionalSound = new THREE.PositionalAudio(this.audioListener);
          const audioLoader = new THREE.AudioLoader();
          audioLoader.load('assets/audio/data_thrum.mp3', (buffer) => {
            positionalSound.setBuffer(buffer);
            positionalSound.setRefDistance(50);
            positionalSound.setLoop(true);
            positionalSound.setVolume(0.8);
            window.addEventListener('click', () => { if(!positionalSound.isPlaying) positionalSound.play(); }, {once:true});
          }, undefined, () => console.warn('[Audio] Positional track missing'));
          lod.add(positionalSound);
        }

        lod.position.set(x, yLevel + height, z);
        this.scene.add(lod);

        // Emissive Ring
        const ringGeom = new THREE.TorusGeometry(20, 2, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x2DD4BF });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set(x, yLevel + height + 5, z);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);

        // Invisible Hitbox for Raycasting (since CSS3DSprite isn't WebGL)
        const hitBoxGeom = new THREE.SphereGeometry(30, 8, 8);
        const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
        const node = new THREE.Mesh(hitBoxGeom, hitBoxMat);
        node.position.set(x, yLevel + height + 40, z);
        this.scene.add(node);

        // CSS3DObject Holographic Logo (Using CSS3DObject instead of Sprite for better positioning)
        const iconDiv = document.createElement('div');
        iconDiv.className = 'tech-logo-sprite';
        iconDiv.style.width = '120px';
        iconDiv.style.height = '120px';
        iconDiv.style.display = 'flex';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.alignItems = 'center';
        iconDiv.innerHTML = `<i class="${system.devicon} colored"></i>`;
        
        const logoObj = new CSS3DObject(iconDiv);
        logoObj.position.set(x, yLevel + height + 50, z); // Shift slightly higher
        logoObj.scale.set(0.5, 0.5, 0.5); // Ensure scale is correct
        this.scene.add(logoObj);
        this.logoObjects.push(logoObj);

        let plaqueObj: CSS3DObject | null = null;
        if (system.id === 'angular' || system.id === 'flutter') {
          plaqueObj = this.createCelebratoryPlaque(system, x, yLevel + height + 100, z);
          // Start scale at 0 (unfolds on lock-on)
          plaqueObj.scale.set(0.001, 0.001, 0.001);
        }

        this.interactableNodes.push({ mesh: node, system, plaqueObj });
      });
    });
  }

  private createCelebratoryPlaque(system: any, x: number, y: number, z: number): CSS3DObject {
    const div = document.createElement('div');
    div.className = 'tech-plaque';
    div.style.pointerEvents = 'auto'; 

    let strength = '';
    let fact1 = '';
    let fact2 = '';

    if (system.id === 'angular') {
      strength = "The Architect's Framework";
      fact1 = "Pioneered dependency injection in the browser for scalable, enterprise-grade architecture.";
      fact2 = "Utilizes powerful RxJS streams for handling complex, asynchronous data flows effortlessly.";
    } else if (system.id === 'flutter') {
      strength = "The Cross-Platform Canopy";
      fact1 = "A declarative, widget-based UI toolkit powered by Dart.";
      fact2 = "Renders directly to the canvas for extremely high-performance cross-platform canopies.";
    }

    div.innerHTML = `
      <div class="plaque-content">
        <h2 class="plaque-title">${system.name.toUpperCase()}</h2>
        <div class="plaque-strength">${strength}</div>
        <ul class="plaque-facts">
          <li>${fact1}</li>
          <li>${fact2}</li>
        </ul>
        <div class="plaque-status">STATUS: Preserved by mForceAnatomist for cross-framework dissection.</div>
        <button class="plaque-btn" onclick="alert('Routing to Grafting Chamber...')">ENTER THE GRAFTING CHAMBER</button>
      </div>
    `;

    const cssObject = new CSS3DObject(div);
    cssObject.position.set(x, y, z);
    // Billboard logic happens in render loop if desired, but looking at center is fine for stationary
    cssObject.lookAt(0, y, 0);
    // Expected target scale is 0.2
    
    this.scene.add(cssObject);

    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y - 50, z),
      new THREE.Vector3(x, y, z)
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(lineGeom, lineMat);
    this.scene.add(line);

    return cssObject;
  }

  private populateTallFlora() {
    const treeCount = 24;
    const trunkGeom = new THREE.CylinderGeometry(8, 12, 350, 8);
    trunkGeom.translate(0, 175, 0); // pivot at bottom
    
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    
    // Simple planar leaf cluster
    const leafGeom = new THREE.PlaneGeometry(100, 30);
    leafGeom.translate(50, 0, 0); // pivot at stem
    const leafMat = new THREE.MeshStandardMaterial({ 
      color: 0x10B981, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      roughness: 0.4
    });

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 250 + Math.random() * 200; // Between db and catwalks
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.set(x, 0, z);
      
      // Slight bend
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      trunk.rotation.x = (Math.random() - 0.5) * 0.2;
      
      this.scene.add(trunk);

      // Add leaves at the top
      for(let j = 0; j < 5; j++) {
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.set(x, 340 + Math.random() * 20, z);
        leaf.rotation.y = (j / 5) * Math.PI * 2;
        leaf.rotation.z = Math.PI / 6 + Math.random() * 0.2; // Angle outwards
        this.scene.add(leaf);
      }
    }
  }

  private setupAmbientEffects() {
    // Digital Pollen
    const pollenCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pollenCount * 3);
    for (let i = 0; i < pollenCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2000;
      positions[i+1] = Math.random() * 800;
      positions[i+2] = (Math.random() - 0.5) * 2000;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x2DD4BF, size: 3, transparent: true, opacity: 0.4 });
    this.pollenSystem = new THREE.Points(geometry, material);
    this.scene.add(this.pollenSystem);
  }

  // Module 6: Volumetric God Rays
  private setupGodRays() {
    const rayGeom = new THREE.ConeGeometry(400, 1800, 32, 1, true);
    rayGeom.translate(0, -900, 0); // Pivot at the top
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xcce6ff,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    for(let i=0; i<6; i++) {
      const ray = new THREE.Mesh(rayGeom, rayMat);
      ray.position.set((Math.random() - 0.5) * 1200, 800, (Math.random() - 0.5) * 1200);
      ray.rotation.x = (Math.random() - 0.5) * 0.3;
      ray.rotation.z = (Math.random() - 0.5) * 0.3;
      this.scene.add(ray);
    }
  }

  // Module 8: Spatial Web Audio Setup
  private setupAudio() {
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);

    const ambientSound = new THREE.Audio(this.audioListener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('assets/audio/greenhouse_ambient.mp3', (buffer) => {
      ambientSound.setBuffer(buffer);
      ambientSound.setLoop(true);
      ambientSound.setVolume(0.2);
      window.addEventListener('click', () => { if(!ambientSound.isPlaying) ambientSound.play(); }, {once:true});
    }, undefined, () => console.warn('[Audio] Ambient track missing'));
  }

  private setupExteriorView() {
    this.cameraPanAngle = Math.PI / 2; // Start directly in front
    this.camera.position.set(0, 150, 2600); // Zoomed out and slightly higher
    this.camera.lookAt(0, 100, 0); // Look at center of dome to keep it framed
  }

  public activateViewer() {
    this.isActivated = true;
    const tl = gsap.timeline();

    // Phase 1: Swing camera back to face doors
    tl.to(this.camera.position, {
      x: 0,
      y: 75,
      z: 1400,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera.lookAt(0, 75, 0);
      }
    }, 0);

    // Phase 2: Slide doors open
    tl.to(this.leftDoor.position, { x: -200, duration: 2.5, ease: "power2.inOut" }, 1.0);
    tl.to(this.rightDoor.position, { x: 200, duration: 2.5, ease: "power2.inOut" }, 1.0);

    // Phase 3: Swoop inside
    tl.to(this.camera.position, {
      z: 400, // Ground level human view
      y: 10, // Standing on the soil
      x: 100,
      duration: 6,
      ease: "power3.inOut",
      onUpdate: () => {
        this.camera.lookAt(0, 100, 0); // Look up at the catwalks and trees
      }
    }, 2.5);

    tl.call(() => {
      this.orbitControls.enabled = true;
      this.orbitControls.target.set(0, 200, 0);
      this.cssRenderer.domElement.style.pointerEvents = 'auto';
    });
  }

  public teleportToZone(zone: 'soil' | 'middle' | 'canopy') {
    if (!this.orbitControls.enabled) return;
    
    let y = 10;
    let radius = 400;
    if (zone === 'soil') { y = 10; radius = 250; }
    if (zone === 'middle') { y = 150; radius = 300; }
    if (zone === 'canopy') { y = 310; radius = 375; }

    const angle = Math.atan2(this.camera.position.z, this.camera.position.x);
    
    gsap.to(this.camera.position, {
      x: Math.cos(angle) * radius,
      y: y,
      z: Math.sin(angle) * radius,
      duration: 2,
      ease: "power2.inOut"
    });
    
    gsap.to(this.orbitControls.target, {
      x: 0, y: y, z: 0,
      duration: 2, ease: "power2.inOut"
    });
  }

  private onWindowResize() {
    if (!this.webglContainer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.cssRenderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    const time = this.clock.getElapsedTime();

    if (this.orbitControls.enabled) {
      this.orbitControls.update();
    }

    // Cinematic exterior slow orbit pan
    if (!this.isActivated) {
      this.cameraPanAngle -= 0.001; // Slow rightward orbit
      this.camera.position.x = Math.cos(this.cameraPanAngle) * 2600;
      this.camera.position.z = Math.sin(this.cameraPanAngle) * 2600;
      this.camera.lookAt(0, 100, 0);
    }

    // Update shaders and particles
    if (this.windShader && this.windShader.uniforms['time']) {
      this.windShader.uniforms['time'].value = time;
    }
    if (this.pollenSystem) {
      this.pollenSystem.rotation.y = time * 0.05;
    }

    // Update Minimap Dot (scale dome 1200 radius to 100% of 2D minimap)
    if (this.isActivated) {
      this.ngZone.run(() => {
        // Map X/Z to percentage (radius 1200 -> map is 2400 across)
        this.mapX = ((this.camera.position.x + 1200) / 2400) * 100;
        this.mapY = ((this.camera.position.z + 1200) / 2400) * 100;
        // Clamp visually
        this.mapX = Math.max(0, Math.min(100, this.mapX));
        this.mapY = Math.max(0, Math.min(100, this.mapY));
        
        if (this.camera && this.orbitControls) {
          this.zoomLevel = Math.round(this.camera.position.distanceTo(this.orbitControls.target));
        }
      });
    }

    // Use Composer instead of standard renderer
    // Make logos always face the camera
    this.logoObjects.forEach(logo => {
      logo.quaternion.copy(this.camera.quaternion);
    });

    // Smoothly interpolate Bokeh focus tied to Raycaster
    if (this.bokehPass && this.bokehPass.uniforms['focus']) {
      const currentFocus = this.bokehPass.uniforms['focus'].value;
      this.bokehPass.uniforms['focus'].value += (this.targetFocusDistance - currentFocus) * 0.1;
    }

    // Module 6: Scrolling Caustics
    if (this.causticsMap) {
      this.causticsMap.offset.x -= 0.0005;
      this.causticsMap.offset.y += 0.0002;
    }

    // Module 7: Somatic Camera Physics & Collision
    if (this.isActivated && this.orbitControls.enabled) {
      // 1. Calculate Velocity for Head Bobbing
      const speed = this.camera.position.distanceTo(this.prevCameraPos);
      if (speed > 0.05 && this.camera.position.y < 100) { // Only bob if moving and near ground
        this.headBobTimer += speed * 0.15;
        this.camera.position.y += Math.sin(this.headBobTimer) * 0.3;
      }
      this.prevCameraPos.copy(this.camera.position);

      // 2. Hard Collision Boundaries
      if (this.camera.position.y < 10) this.camera.position.y = 10; // Floor collision
      
      const distFromCenter = Math.sqrt(Math.pow(this.camera.position.x, 2) + Math.pow(this.camera.position.z, 2));
      if (distFromCenter > 1700) { // Wall collision
        const angle = Math.atan2(this.camera.position.z, this.camera.position.x);
        this.camera.position.x = Math.cos(angle) * 1700;
        this.camera.position.z = Math.sin(angle) * 1700;
      }
    }

    this.composer.render();
    this.cssRenderer.render(this.scene, this.camera);
  }
}
