import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  useTexture,
  Html,
  Stars,
  Sparkles
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TreeState, ParticleConfig } from '../types';

// Extend JSX.IntrinsicElements to include React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      extrudeGeometry: any;
      meshBasicMaterial: any;
      pointLight: any;
      instancedMesh: any;
      octahedronGeometry: any;
      sphereGeometry: any;
      boxGeometry: any;
      planeGeometry: any;
      group: any;
      color: any;
      fog: any;
      hemisphereLight: any;
      ambientLight: any;
      spotLight: any;
    }
  }
}

interface SceneProps {
  treeState: TreeState;
  config: ParticleConfig;
  photos: string[];
  focusedPhotoIndex: number | null;
  handRotation: { x: number, y: number };
  isGestureActive?: boolean;
  onPhotoClick?: (index: number) => void;
  customText: string;
}

// 顶部星星组件
const TopStar = ({ treeState, config }: { treeState: TreeState, config: ParticleConfig }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  const { starShape, extrudeSettings } = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1.0; // Standard size
    const innerRadius = 0.4; 
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const settings = {
      steps: 1,
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
      bevelSegments: 3
    };
    
    return { starShape: shape, extrudeSettings: settings };
  }, []);

  useEffect(() => {
    if (meshRef.current) {
        meshRef.current.geometry.center();
    }
  }, [starShape]);

  const starColor = useMemo(() => {
    // Make the star slightly warmer/golden to stand out
    const c = new THREE.Color("#fff5cc"); 
    c.multiplyScalar(config.starBrightness);
    return c;
  }, [config.starBrightness]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Rotation
    meshRef.current.rotation.y = time * 1.5; 
    meshRef.current.rotation.z = Math.sin(time * 2.0) * 0.15;
    
    // Pulse Animation (Size Change)
    const baseScale = treeState === TreeState.GATHERED ? 1.0 : 0.4;
    
    // "Flashes and changes size, but not too much"
    // Amplitude of 0.1 means it goes from 0.9 to 1.1 (relative to base)
    const pulseIntensity = 0.1; 
    const pulse = Math.sin(time * 4.0) * pulseIntensity;
    
    const scale = baseScale + pulse;
    
    const targetPos = treeState === TreeState.GATHERED ? new THREE.Vector3(0, 8.0, 0) : new THREE.Vector3(0, -3.5, 0);
    meshRef.current.position.lerp(targetPos, 0.2); 
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef}>
      <extrudeGeometry args={[starShape, extrudeSettings]} />
      <meshBasicMaterial color={starColor} toneMapped={false} />
      <pointLight intensity={config.starBrightness * 2} distance={25} color="#ffd700" decay={2} />
    </mesh>
  );
}

const TreeParticles: React.FC<{ treeState: TreeState, config: ParticleConfig }> = ({ treeState, config }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  
  const particles = useMemo(() => {
    const temp = [];
    const count = config.count;
    
    // Tree Physics
    const treeHeight = 15; 
    const baseRadius = 7.5; 
    
    // --- LAYOUT CONFIGURATION ---
    const numSpirals = 5;
    const loopsPerSpiral = 4.5;
    
    // Counts
    const coreCount = Math.floor(count * 0.15); 
    
    for (let i = 0; i < count; i++) {
      let gatheredPos = new THREE.Vector3();
      let sizeScale = 1;
      let brightness = 1;
      let type: 'ribbon' | 'core' | 'structure' | 'ornament' = 'structure';
      
      // Twinkle properties
      const twinkleSpeed = Math.random() * 5 + 1;
      const twinkleOffset = Math.random() * Math.PI * 2;

      if (i < coreCount) {
        // --- CORE (Central Filler - Icy body) ---
        type = 'core';
        const h = (Math.random() - 0.5) * treeHeight;
        const ratio = (h + treeHeight/2) / treeHeight;
        const coneR = (1 - ratio) * baseRadius;
        
        const r = Math.sqrt(Math.random()) * coneR * 0.4; // Tighter core
        const rTheta = Math.random() * Math.PI * 2;

        gatheredPos.set(Math.cos(rTheta) * r, h, Math.sin(rTheta) * r);
        sizeScale = 0.4 + Math.random() * 0.4;
        brightness = 0.4;

      } else {
        // --- SPIRAL & ORNAMENTS ---
        
        // Every 30th particle is a large ORNAMENT
        const isOrnament = (i % 30 === 0);
        // Every 6th particle (if not ornament) is a RIBBON
        const isRibbon = !isOrnament && (i % 6 === 0);

        if (isOrnament) type = 'ornament';
        else if (isRibbon) type = 'ribbon';
        else type = 'structure';

        const tBase = Math.random(); 
        const h = -treeHeight / 2 + tBase * treeHeight;
        const radiusRatio = 1 - tBase; 
        
        // Helix Calculation
        const spiralIndex = i % numSpirals;
        const spiralOffset = (spiralIndex / numSpirals) * Math.PI * 2;
        const theta = tBase * loopsPerSpiral * Math.PI * 2 + spiralOffset;
        
        if (isRibbon) {
            // Gold Ribbon - Tight spiral
            const r = radiusRatio * baseRadius + 0.1;
            gatheredPos.set(Math.cos(theta) * r, h, Math.sin(theta) * r);
            sizeScale = 1.2;
            brightness = 1.5;
        } else if (isOrnament) {
            // Ornaments - Randomly placed on the surface shell
            // Add some jitter to theta to detach from the ribbon lines
            const ornamentTheta = theta + (Math.random() - 0.5); 
            const r = radiusRatio * baseRadius + 0.4; // Stick out a bit
            gatheredPos.set(Math.cos(ornamentTheta) * r, h, Math.sin(ornamentTheta) * r);
            sizeScale = 2.5; // Big!
            brightness = 2.0; // Glowing
        } else {
            // Structure (Leaves/Needles) - Volumetric cloud around spiral
            const rBase = radiusRatio * baseRadius;
            const rJitter = (Math.random() - 0.5) * 1.8; 
            const hJitter = (Math.random() - 0.5) * 1.2;
            const thetaJitter = (Math.random() - 0.5) * 0.5;

            const r = Math.max(0.2, rBase + rJitter);
            gatheredPos.set(
                Math.cos(theta + thetaJitter) * r,
                h + hJitter,
                Math.sin(theta + thetaJitter) * r
            );
            sizeScale = 0.3 + Math.random() * 0.5;
            brightness = 0.7;
        }
      }

      // SCATTERED STATE (Explosion)
      // Heart Probability: 60% of particles form the heart
      const isHeart = Math.random() < 0.6;
      let scatteredPos = new THREE.Vector3();
      if (isHeart) {
         let done = false, attempts = 0, hx = 0, hy = 0, hz = 0;
         while (!done && attempts < 100) {
           hx = (Math.random() * 3) - 1.5; hy = (Math.random() * 3) - 1.5; hz = (Math.random() * 3) - 1.5;
           const x2 = hx*hx, y2 = hy*hy, z2 = hz*hz, y3 = y2*hy;
           if ((x2 + 2.25*z2 + y2 - 1)**3 - x2*y3 - 0.1125*z2*y3 < 0) done = true;
           attempts++;
         }
         if (!done) { hx=0; hy=0; hz=0; }
         scatteredPos.set(hx * 1.2, hy * 1.2 - 3.5, hz * 1.2);
      } else {
         const r = 8 + Math.random() * 42; 
         const theta = Math.random() * Math.PI * 2;
         scatteredPos.set(r * Math.cos(theta), (Math.random() - 0.5) * 30 + 5, r * Math.sin(theta));
         sizeScale *= 1.5; 
      }
      
      temp.push({ 
        gatheredPos, scatteredPos, lerpSpeed: 0.05 + Math.random() * 0.1, 
        phase: Math.random() * Math.PI * 2, sizeScale, brightness, type,
        twinkleSpeed, twinkleOffset,
        isHeart // Store this flag!
      });
    }
    return temp;
  }, [config.count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorPrimary = useMemo(() => new THREE.Color(config.primaryColor), [config.primaryColor]);
  const colorSecondary = useMemo(() => new THREE.Color(config.secondaryColor), [config.secondaryColor]);
  const colorTertiary = useMemo(() => new THREE.Color(config.tertiaryColor), [config.tertiaryColor]);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
        meshRef.current.rotation.y = treeState === TreeState.GATHERED ? time * 0.1 : Math.sin(time * 0.2) * 0.05;
    }

    particles.forEach((p, i) => {
      const target = treeState === TreeState.GATHERED ? p.gatheredPos : p.scatteredPos;
      
      meshRef.current.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      
      dummy.position.lerp(target, p.lerpSpeed);
      
      // Floating animation
      let hoverY = 0;
      if (treeState === TreeState.GATHERED) {
          hoverY = Math.sin(time * (p.type === 'ribbon' ? 2 : 0.5) + p.phase) * 0.05;
      }
      dummy.position.y += hoverY;
      
      // Twinkle Effect Calculation
      let twinkle = 0;
      if (treeState === TreeState.GATHERED) {
         if (p.type === 'ribbon') {
             // Ribbons pulsate gently
             twinkle = Math.sin(time * 2 + p.twinkleOffset) * 0.3;
         } else if (p.type === 'ornament') {
             // Ornaments sparkle sharply
             twinkle = Math.sin(time * p.twinkleSpeed + p.twinkleOffset) * 0.5;
         } else {
             // Core/Structure subtle shimmer
             twinkle = Math.sin(time * 0.5 + p.twinkleOffset) * 0.2;
         }
      } else {
         // In scattered mode, if it is a heart particle, it should glow/pulse
         if (p.isHeart) {
            twinkle = Math.sin(time * 2 + p.twinkleOffset) * 0.2;
         }
      }

      const stateScale = treeState === TreeState.GATHERED ? 1 : 0.7; 
      // Apply twinkle to scale slightly too for "pop" effect
      const finalScale = config.size * p.sizeScale * stateScale * (1 + twinkle * 0.2);
      dummy.scale.set(finalScale, finalScale, finalScale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      // --- COLOR LOGIC ---
      if (treeState === TreeState.SCATTERED && p.isHeart) {
          // HEART UNIFORM COLOR MODE
          // If scattered and part of the heart, force uniform color (Tertiary)
          tempColor.copy(colorTertiary);
          tempColor.multiplyScalar(config.brightness * (1.5 + twinkle));
      } else {
          // NORMAL TREE MODE (or background noise in scattered)
          if (p.type === 'ribbon') {
              tempColor.copy(colorSecondary);
              tempColor.multiplyScalar(config.brightness * (1.5 + twinkle));
          } else if (p.type === 'ornament') {
              tempColor.copy(colorTertiary);
              tempColor.multiplyScalar(config.brightness * (2.0 + twinkle));
          } else {
              // Tree Body / Background Noise
              tempColor.copy(colorPrimary);
              if (p.type === 'core') tempColor.multiplyScalar(0.8);
              else tempColor.multiplyScalar(config.brightness * (0.8 + twinkle));
          }
      }

      meshRef.current.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, config.count]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial 
        toneMapped={false} 
        transparent 
        opacity={0.9} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

const BackgroundSnow: React.FC = () => {
  const count = 800;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const points = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 60; 
      const theta = Math.random() * Math.PI * 2;
      temp.push({
        pos: new THREE.Vector3(r * Math.cos(theta), (Math.random() - 0.5) * 60 + 20, r * Math.sin(theta)),
        vel: Math.random() * 0.05 + 0.02,
        phase: Math.random() * Math.PI,
        swaySpeed: Math.random() * 0.5 + 0.1
      });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    points.forEach((p, i) => {
      p.pos.y -= p.vel;
      p.pos.x += Math.sin(time * p.swaySpeed + p.phase) * 0.03;
      p.pos.z += Math.cos(time * p.swaySpeed + p.phase) * 0.03;
      if (p.pos.y < -15) p.pos.y = 50; 
      
      dummy.position.copy(p.pos);
      const scale = Math.random() * 0.05 + 0.02;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#e0f2fe" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
};

const ShootingStars: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const count = 6;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Store state for each shooting star
  const stars = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      active: false,
      pos: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      speed: 0,
      life: 0,
      scale: 0,
      activationTime: Math.random() * 3 // random start delay
    }));
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    stars.forEach((star, i) => {
      if (!star.active) {
        if (time > star.activationTime) {
           // Spawn new star
           star.active = true;
           // Random position in upper hemisphere
           const r = 50 + Math.random() * 20;
           const theta = Math.random() * Math.PI * 2;
           const phi = Math.random() * Math.PI * 0.5; // Upper half
           
           star.pos.setFromSphericalCoords(r, phi, theta);
           
           // Random direction across the sky
           const targetTheta = theta + Math.PI + (Math.random() - 0.5);
           const target = new THREE.Vector3().setFromSphericalCoords(r, phi + 0.2, targetTheta);
           star.dir.subVectors(target, star.pos).normalize();
           
           star.speed = 40 + Math.random() * 30;
           star.life = 1.0;
           star.scale = 1.0 + Math.random();
           
           // Next activation
           star.activationTime = time + Math.random() * 1.5 + 0.5; 
        } else {
           // Hide
           dummy.position.set(0, -1000, 0);
           dummy.scale.set(0,0,0);
        }
      } else {
         // Update active star
         star.pos.addScaledVector(star.dir, star.speed * 0.016); // assume 60fps delta roughly
         star.life -= 0.02;
         
         if (star.life <= 0) {
             star.active = false;
         }

         dummy.position.copy(star.pos);
         // Rotate to face direction of travel
         dummy.lookAt(star.pos.clone().add(star.dir));
         
         const s = star.scale * Math.sin(star.life * Math.PI); // Fade in out
         dummy.scale.set(0.5 * s, 0.5 * s, 15 * s); // Long tail
      }
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
};

const PhotoPlane: React.FC<{ url: string, index: number, totalPhotos: number, treeState: TreeState, isFocused: boolean, onPhotoClick?: (index: number) => void }> = ({ url, index, totalPhotos, treeState, isFocused, onPhotoClick }) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const texture = useTexture(url);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Spiral Ribbon Layout for photos too, matching the gold ribbon
  const treeHeight = 15; 
  const baseRadius = 7.5;
  const loopsPerSpiral = 4.5; // Match tree
  
  const t = totalPhotos > 1 
      ? 0.1 + (index / (totalPhotos - 1)) * 0.8 
      : 0.5;

  const h = -treeHeight / 2 + t * treeHeight;
  const radiusRatio = 1 - t; 
  // Place photos slightly OUTSIDE the tree volume
  const r = radiusRatio * baseRadius + 2.0; 
  const theta = t * loopsPerSpiral * Math.PI * 2 + 0.5; // Offset slightly from ribbon start

  const gatheredPos = new THREE.Vector3(Math.cos(theta) * r, h, Math.sin(theta) * r);
  
  const galleryRadius = 14; 
  const angleStep = (Math.PI * 2) / Math.max(1, totalPhotos);
  const galleryTheta = index * angleStep;
  const galleryY = Math.sin(index * 0.5) * 2 + 2; 

  const scatteredPos = useMemo(() => new THREE.Vector3(
      Math.cos(galleryTheta) * galleryRadius,
      galleryY,
      Math.sin(galleryTheta) * galleryRadius
  ), [galleryTheta, galleryRadius, galleryY]);

  useFrame((state) => {
    let targetPos = treeState === TreeState.GATHERED ? gatheredPos : scatteredPos;
    let targetScale = treeState === TreeState.SCATTERED ? 2.5 : 1.5;

    if (isFocused) {
      const camDir = new THREE.Vector3();
      state.camera.getWorldDirection(camDir);
      targetPos = state.camera.position.clone().add(camDir.multiplyScalar(5));
      targetScale = 3.5;
    }

    mesh.current.position.lerp(targetPos, 0.2);
    const sVec = new THREE.Vector3(targetScale, targetScale, 1);
    mesh.current.scale.lerp(sVec, 0.2);
    
    if (isFocused) {
        mesh.current.lookAt(state.camera.position);
    } else {
        if (treeState === TreeState.GATHERED) {
            dummy.position.copy(mesh.current.position);
            dummy.lookAt(0, mesh.current.position.y, 0); 
            dummy.rotateY(Math.PI); 
            mesh.current.quaternion.slerp(dummy.quaternion, 0.1);
        } else {
            dummy.position.copy(mesh.current.position);
            dummy.lookAt(0, mesh.current.position.y, 0); 
            mesh.current.quaternion.slerp(dummy.quaternion, 0.1);
        }
    }
  });

  return (
    <mesh 
      ref={mesh}
      onClick={(e) => {
        e.stopPropagation();
        onPhotoClick?.(index);
      }}
      onPointerOver={() => {
        if (treeState === TreeState.SCATTERED) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
      <mesh position={[0,0,-0.02]} scale={[1.1, 1.1, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" opacity={0.3} transparent blending={THREE.AdditiveBlending} />
      </mesh>
    </mesh>
  );
};

const AnimatedStars = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
        // Slow, gentle rotation to make the sky feel alive
        groupRef.current.rotation.y = time * 0.03; 
        // Very subtle sway on Z to simulate a floating universe
        groupRef.current.rotation.z = Math.sin(time * 0.2) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
       {/* Increased speed for more pronounced twinkle */}
       <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade speed={3.0} />
    </group>
  )
}

const SceneContent: React.FC<SceneProps> = ({ treeState, config, photos, focusedPhotoIndex, handRotation, isGestureActive, onPhotoClick, customText }) => {
  const { camera } = useThree();
  const currentRadius = useRef(30);

  useFrame((state) => {
    if (!isGestureActive) {
        const dx = camera.position.x;
        const dz = camera.position.z;
        currentRadius.current = Math.max(Math.sqrt(dx * dx + dz * dz), 5); 
    }

    if (isGestureActive) {
        const radius = currentRadius.current; 
        const targetTheta = handRotation.x * 3.0; 
        const currentTheta = Math.atan2(camera.position.x, camera.position.z);
        let deltaTheta = targetTheta - currentTheta;
        while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
        while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;
        const newTheta = currentTheta + deltaTheta * 0.1;

        camera.position.x = Math.sin(newTheta) * radius;
        camera.position.z = Math.cos(newTheta) * radius;
        
        const targetY = (-handRotation.y * 15) + 6;
        camera.position.y += (targetY - camera.position.y) * 0.1;
        camera.lookAt(0, 0, 0); 
    }
  });

  return (
    <>
      <color attach="background" args={[config.ambientColor]} />
      <fog attach="fog" args={[config.ambientColor, 50, 150]} />
      
      {/* Sky Stars for Environment Reflection - Now Animated */}
      <AnimatedStars />
      
      <ShootingStars />

      {/* Lighting Setup */}
      <hemisphereLight intensity={0.5} color={config.primaryColor} groundColor={config.ambientColor} />
      <ambientLight intensity={0.2} color={config.primaryColor} />
      
      {/* Key Light for Tree */}
      <spotLight position={[20, 40, 20]} angle={0.4} penumbra={1} intensity={2} color={config.primaryColor} />
      
      {/* Back/Rim Light */}
      <pointLight position={[-20, 5, -20]} intensity={3.0} color="#3b82f6" distance={50} />
      
      <TreeParticles treeState={treeState} config={config} />
      <TopStar treeState={treeState} config={config} />
      <BackgroundSnow />
      
      {photos.map((url, i) => (
        <PhotoPlane 
          key={url + i} 
          url={url} 
          index={i} 
          totalPhotos={photos.length}
          treeState={treeState} 
          isFocused={focusedPhotoIndex === i} 
          onPhotoClick={onPhotoClick}
        />
      ))}

      {/* FIXED UI OVERLAY: Using fullscreen Html to ensure text does not move/rotate with camera */}
      {treeState === TreeState.GATHERED && (
        <Html fullscreen style={{ pointerEvents: 'none', display: 'flex', justifyContent: 'center', paddingTop: '10vh' }}>
           <div className="flex flex-col items-center opacity-90">
             <h1 className="text-transparent bg-clip-text bg-gradient-to-t from-cyan-100 via-white to-blue-200 text-4xl font-serif tracking-[0.3em] font-bold uppercase text-center px-4" style={{ filter: 'drop-shadow(0 0 20px rgba(186,230,253,0.6))' }}>
               {customText}
             </h1>
           </div>
        </Html>
      )}

      <OrbitControls 
        enabled={!isGestureActive} 
        enableZoom={true} 
        enablePan={false} 
        maxPolarAngle={Math.PI / 1.9} // Don't go below ground
        minPolarAngle={Math.PI / 6} 
        minDistance={10} 
        maxDistance={45} 
        autoRotate={true}
        autoRotateSpeed={0.8}
      />
      
      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={1.5} luminanceThreshold={0.7} luminanceSmoothing={0.9} mipmapBlur radius={0.4} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};

const LoadingIndicator = () => (
  <Html center>
    <div className="flex flex-col items-center p-6 bg-black/40 backdrop-blur-md rounded-2xl border border-blue-500/30">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      <p className="text-blue-400 mt-4 font-light tracking-widest animate-pulse">INITIALIZING MAGIC...</p>
    </div>
  </Html>
);

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-full bg-[#020617]">
      <Canvas dpr={[1, 2]} gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 2.0 }}>
        <PerspectiveCamera makeDefault position={[0, 6, 30]} fov={45} />
        <Suspense fallback={<LoadingIndicator />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Scene;