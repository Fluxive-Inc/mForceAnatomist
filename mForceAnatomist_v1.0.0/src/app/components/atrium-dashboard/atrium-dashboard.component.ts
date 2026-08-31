import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as THREE from 'three';
import { RootSystemsService, BotanicalCategory, RootSystem } from '../../services/root-systems.service';

interface NodeData {
  mesh: THREE.Mesh;
  system: RootSystem;
  originalEmissive: THREE.Color;
}

@Component({
  selector: 'app-atrium-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atrium-dashboard.component.html',
  styleUrls: ['./atrium-dashboard.component.scss']
})
export class AtriumDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;
  @ViewChild('tooltip', { static: false }) tooltipEl!: ElementRef;

  private rootSystemsService = inject(RootSystemsService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number = 0;

  // Scroll variables
  private targetZ: number = 400;
  private minZ: number = 0;
  private maxZ: number = 400;

  // Raycaster and interaction
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private interactableNodes: NodeData[] = [];
  
  // Angular State for Tooltip
  public hoveredSystem: RootSystem | null = null;
  public mouseX: number = 0;
  public mouseY: number = 0;

  // Track textures to dispose
  private textures: THREE.Texture[] = [];

  ngOnInit() {}

  ngAfterViewInit() {
    this.initThreeJs();
    this.buildBotanicalGarden();
    this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    
    // Cleanup textures and materials to prevent memory leaks
    this.textures.forEach(t => t.dispose());
    this.interactableNodes.forEach(n => {
      (n.mesh.material as THREE.Material).dispose();
      n.mesh.geometry.dispose();
    });

    if (this.renderer) {
      this.renderer.dispose();
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.rendererContainer.nativeElement.removeEventListener('wheel', this.onScroll.bind(this));
    this.rendererContainer.nativeElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.rendererContainer.nativeElement.removeEventListener('click', this.onClick.bind(this));
  }

  private initThreeJs() {
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010101); // Pure dark
    this.scene.fog = new THREE.FogExp2(0x010101, 0.0025);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 1, 3000);
    this.camera.position.set(0, 25, this.maxZ);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    const container = this.rendererContainer.nativeElement;
    container.addEventListener('wheel', this.onScroll.bind(this), { passive: false });
    container.addEventListener('mousemove', this.onMouseMove.bind(this));
    container.addEventListener('click', this.onClick.bind(this));
  }

  private onScroll(event: WheelEvent) {
    event.preventDefault();
    this.targetZ += event.deltaY * 0.8;
    this.targetZ = Math.max(this.minZ, Math.min(this.maxZ, this.targetZ));
  }

  private onMouseMove(event: MouseEvent) {
    const rect = this.rendererContainer.nativeElement.getBoundingClientRect();
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onClick(event: MouseEvent) {
    if (this.hoveredSystem) {
      this.ngZone.run(() => {
        this.router.navigate(['/root-systems'], { queryParams: { system: this.hoveredSystem!.id } });
      });
    }
  }

  // Convert "devicon-angularjs-plain" -> "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/angularjs/angularjs-plain.svg"
  private getDeviconSvgUrl(deviconClass: string): string {
    const parts = deviconClass.split('-');
    if (parts.length >= 3) {
      const name = parts[1];
      const modifier = parts.slice(2).join('-');
      return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${name}/${name}-${modifier}.svg`;
    }
    // Fallback if class structure is different
    return '';
  }

  private buildBotanicalGarden() {
    const taxonomy = this.rootSystemsService.getTaxonomy();
    const textureLoader = new THREE.TextureLoader();
    
    let currentZ = 200; 
    const roomLength = 800; 
    
    this.maxZ = currentZ + 200;
    this.minZ = currentZ - (taxonomy.length * roomLength) + 400;

    // Highly reflective dark glass floor
    const floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050505, 
      emissive: 0x000000, 
      roughness: 0.1, 
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x10B981, 
      emissive: 0x052e16, 
      roughness: 0.3, 
      metalness: 0.8
    });

    taxonomy.forEach((category) => {
      const roomCenterZ = currentZ - (roomLength / 2);

      // Distinct Room Floor Plate
      const floorGeom = new THREE.PlaneGeometry(300, roomLength - 50);
      const floor = new THREE.Mesh(floorGeom, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -40, roomCenterZ);
      floor.receiveShadow = true;
      this.scene.add(floor);

      // Volumetric SpotLight for the room
      const spotLight = new THREE.SpotLight(0x2DD4BF, 500000);
      spotLight.position.set(0, 150, roomCenterZ);
      spotLight.target.position.set(0, -40, roomCenterZ);
      spotLight.angle = Math.PI / 3;
      spotLight.penumbra = 0.5;
      spotLight.distance = 800;
      spotLight.decay = 1.5;
      spotLight.castShadow = true;
      this.scene.add(spotLight);
      this.scene.add(spotLight.target);

      // Optional text sign using TextGeometry could go here, but for now we skip massive 3D text to focus on nodes
      
      const plantSpacing = roomLength / (category.systems.length + 1);
      
      category.systems.forEach((system, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const xPos = side * (40 + Math.random() * 30);
        const zPos = currentZ - (plantSpacing * (i + 1));
        
        // Cyber-Plant Stem
        const stemHeight = 40 + Math.random() * 40;
        const stemGeom = new THREE.CylinderGeometry(0.8, 2.5, stemHeight, 8);
        const stem = new THREE.Mesh(stemGeom, stemMaterial);
        stem.position.set(xPos, -40 + (stemHeight / 2), zPos);
        stem.rotation.z = side * (Math.random() * 0.15);
        stem.rotation.x = (Math.random() - 0.5) * 0.2;
        stem.castShadow = true;
        this.scene.add(stem);

        // The Bloom (Holographic Node)
        const bloomGeom = new THREE.CircleGeometry(12, 32);
        
        // Map SVG Logo
        const svgUrl = this.getDeviconSvgUrl(system.devicon);
        let bloomMat: THREE.MeshPhysicalMaterial;
        
        if (svgUrl) {
          const texture = textureLoader.load(svgUrl);
          this.textures.push(texture);
          // Set texture wrapping for proper centering if needed, but CircleGeometry naturally maps well
          texture.colorSpace = THREE.SRGBColorSpace;
          
          bloomMat = new THREE.MeshPhysicalMaterial({
            map: texture,
            color: 0xffffff,
            emissive: 0xffffff, // White emissive allows the texture's original colors to shine
            emissiveMap: texture,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.5,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
          });
        } else {
          // Fallback if no SVG
          bloomMat = new THREE.MeshPhysicalMaterial({
            color: 0x10B981, emissive: 0x10B981, roughness: 0.2, metalness: 0.8,
            emissiveIntensity: 0.8,
            transparent: true, opacity: 0.9, side: THREE.DoubleSide
          });
        }

        const bloom = new THREE.Mesh(bloomGeom, bloomMat);
        // Position at the tip of the stem. Note stem is rotated, so local translation is best
        bloom.position.set(0, stemHeight / 2 + 12, 0); 
        // Billboarding: make bloom always face camera in animate loop
        
        stem.add(bloom);

        // Store for raycaster
        this.interactableNodes.push({
          mesh: bloom,
          system: system,
          originalEmissive: bloomMat.emissive.clone()
        });
      });

      currentZ -= roomLength;
    });
  }

  private onWindowResize() {
    if (!this.rendererContainer) return;
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // 1. Camera Logic
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.targetZ, 0.05);
    this.camera.position.x = Math.sin(this.camera.position.z * 0.015) * 6;
    this.camera.position.y = 25 + Math.cos(this.camera.position.z * 0.02) * 4;

    // 2. Billboarding: Make blooms face camera
    this.interactableNodes.forEach(node => {
      // Get world position of the bloom
      const worldPos = new THREE.Vector3();
      node.mesh.getWorldPosition(worldPos);
      // Look at camera
      node.mesh.lookAt(this.camera.position);
    });

    // 3. Raycaster Logic
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.interactableNodes.map(n => n.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    let foundSystem: RootSystem | null = null;

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const nodeData = this.interactableNodes.find(n => n.mesh === intersectedMesh);
      if (nodeData) {
        foundSystem = nodeData.system;
        // Apply hover glow (mix with existing color)
        (intersectedMesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x2DD4BF); // Jade glow
        (intersectedMesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 3.0;
      }
    }

    // Reset others
    this.interactableNodes.forEach(node => {
      if (!foundSystem || node.system.id !== foundSystem.id) {
        (node.mesh.material as THREE.MeshPhysicalMaterial).emissive.copy(node.originalEmissive);
        (node.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.8;
      }
    });

    // Update Angular state (wrap in ngZone if needed, but careful about performance)
    if (this.hoveredSystem?.id !== foundSystem?.id) {
      this.ngZone.run(() => {
        this.hoveredSystem = foundSystem;
        // Change cursor
        this.rendererContainer.nativeElement.style.cursor = foundSystem ? 'pointer' : 'default';
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}
