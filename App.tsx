import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import HandTracker from './components/HandTracker';
import { TreeState, ParticleConfig, AppState } from './types';

// --- 部署配置 (DEPLOYMENT CONFIGURATION) ---
// 自定义您的初始资源：
// 1. 将音乐和图片放入项目的 'public' 文件夹中。
// 2. 在下方填入文件名 (例如 "/music.mp3", "/photo1.jpg")。
const DEPLOY_CONFIG = {
  // 1. 默认背景音乐
  // 留空则无音乐，或者填入 public 目录下的路径，例如: "/bgm.mp3"
  defaultBgm: "", 

  // 2. 默认照片列表
  // 在数组中填入 public 目录下的图片路径
  defaultPhotos: [
    // 例如:
    // "/photo1.jpg",
    // "/photo2.jpg",
    // "/photo3.jpg"
  ],

  // 3. 默认欢迎语
  defaultText: "MERRY CHRISTMAS"
};

const INITIAL_CONFIG: ParticleConfig = {
  count: 3500, // Increased count slightly for denser look
  size: 0.06,
  primaryColor: '#22d3ee', // Cyan/Teal (Magic Ice Body)
  secondaryColor: '#fbbf24', // Warm Gold (Ribbon/Lights)
  tertiaryColor: '#f43f5e', // Rose/Magenta (Ornaments)
  ambientColor: '#0f172a',
  brightness: 1.2, 
  starBrightness: 1.5, // Reduced from 3.5 to be less blinding
};

// Deterministic pseudo-random helper (must match Scene.tsx)
const pseudoRandom = (seed: number) => ((seed * 9301 + 49297) % 233280) / 233280;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    treeState: TreeState.GATHERED,
    useGestures: false,
    currentGesture: 'None',
    photos: DEPLOY_CONFIG.defaultPhotos, // Use config
    bgmUrl: DEPLOY_CONFIG.defaultBgm,    // Use config
    focusedPhotoIndex: null,
    customText: DEPLOY_CONFIG.defaultText // Use config
  });

  const [config, setConfig] = useState<ParticleConfig>(INITIAL_CONFIG);
  const [handRotation, setHandRotation] = useState({ x: 0, y: 0 });

  const handleGestureUpdate = useCallback((gesture: string, rotation?: {x: number, y: number}) => {
    if (!appState.useGestures) return;

    setAppState(prev => {
      let newState = prev.treeState;
      let newFocusedIndex = prev.focusedPhotoIndex;
      const currentRotation = rotation || { x: 0, y: 0 }; // Use latest rotation from callback

      if (gesture === 'Fist') {
        newState = TreeState.GATHERED;
        newFocusedIndex = null; // Ensure photos return to original position when gathering
      } else if (gesture === 'Open') {
        newState = TreeState.SCATTERED;
        newFocusedIndex = null; 
      } else if (gesture === 'Pinch') {
        // Pinch Logic
        // STRICT REQUIREMENT: Only allow pinch selection if in SCATTERED mode
        // AND only if this is a new pinch event (rising edge)
        if (prev.currentGesture !== 'Pinch' && prev.treeState === TreeState.SCATTERED) {
          if (prev.photos.length > 0) {
               // Intelligent Selection (Scattered Mode - Cylindrical Gallery)
               
               // 1. Get Camera Angle from Hand Rotation (Matches Scene.tsx logic)
               const camTheta = currentRotation.x * 3.0;
               
               // 2. Calculate Camera Position Vector 
               // In Scene.tsx, camera uses: x = sin(theta), z = cos(theta)
               const camX = Math.sin(camTheta);
               const camZ = Math.cos(camTheta);
               
               // 3. Find the Target Angle for Photos
               // We want the photo NEAREST to the camera (blocking the view).
               // The camera is at (camX, camZ).
               // The photo closest to the camera is at the same angle in the circle.
               
               const targetDirX = camX;
               const targetDirZ = camZ;

               // 4. Convert Vector to Angle in Photo Coordinate System
               // In Scene.tsx, photos use: x = cos(pTheta), z = sin(pTheta)
               // Math.atan2(y, x) -> here Z is Y, X is X.
               let targetAngle = Math.atan2(targetDirZ, targetDirX);
               
               // Normalize to 0...2PI
               if (targetAngle < 0) targetAngle += Math.PI * 2;

               let closestIndex = -1;
               let minDiff = Infinity;

               // Calculate angular step (matches Scene.tsx Cylindrical Layout)
               const angleStep = (Math.PI * 2) / Math.max(1, prev.photos.length);

               prev.photos.forEach((_, i) => {
                  // Photo Angle
                  let pTheta = i * angleStep;
                  pTheta = pTheta % (Math.PI * 2);
                  
                  // Smallest angular difference
                  let diff = Math.abs(targetAngle - pTheta);
                  if (diff > Math.PI) diff = (Math.PI * 2) - diff;

                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = i;
                  }
               });

               newFocusedIndex = closestIndex;
          }
        }
      }
      
      return {
        ...prev,
        treeState: newState,
        currentGesture: gesture,
        focusedPhotoIndex: newFocusedIndex,
      };
    });

    if (rotation) {
      setHandRotation(rotation);
    }
  }, [appState.useGestures]);

  const addPhoto = (url: string) => {
    setAppState(prev => ({ ...prev, photos: [...prev.photos, url] }));
  };

  const removePhoto = (index: number) => {
    setAppState(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const toggleGesture = () => {
    setAppState(prev => ({ ...prev, useGestures: !prev.useGestures }));
  };

  const setBgm = (url: string) => {
    setAppState(prev => ({ ...prev, bgmUrl: url }));
  };

  const setCustomText = (text: string) => {
    setAppState(prev => ({ ...prev, customText: text }));
  };

  const toggleTreeState = () => {
    setAppState(prev => ({
      ...prev,
      treeState: prev.treeState === TreeState.GATHERED ? TreeState.SCATTERED : TreeState.GATHERED,
      focusedPhotoIndex: null // Reset focus when manually toggling
    }));
  };

  // Handler for mouse clicking photos
  const handlePhotoClick = (index: number) => {
    // Only allow mouse selection if gestures are disabled AND we are in SCATTERED mode
    if (!appState.useGestures && appState.treeState === TreeState.SCATTERED) {
      setAppState(prev => ({
        ...prev,
        // Toggle: if clicking the same photo, deselect it. If a different one, select it.
        focusedPhotoIndex: prev.focusedPhotoIndex === index ? null : index
      }));
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* 3D Scene Layer */}
      <Scene 
        treeState={appState.treeState} 
        config={config} 
        photos={appState.photos}
        focusedPhotoIndex={appState.focusedPhotoIndex}
        handRotation={handRotation}
        isGestureActive={appState.useGestures && appState.currentGesture !== 'None'}
        onPhotoClick={handlePhotoClick}
        customText={appState.customText}
      />

      {/* Hand Tracking Layer (Hidden/Overlaid) */}
      <HandTracker 
        enabled={appState.useGestures} 
        onGestureUpdate={handleGestureUpdate} 
      />

      {/* UI Overlay */}
      <Sidebar 
        appState={appState} 
        config={config}
        setConfig={setConfig}
        onToggleGesture={toggleGesture}
        onAddPhoto={addPhoto}
        onRemovePhoto={removePhoto}
        onSetBgm={setBgm}
        onSetCustomText={setCustomText}
      />

      {/* Floating Gesture Tip */}
      {appState.useGestures && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-light tracking-widest text-sm pointer-events-none transition-all">
          CURRENT GESTURE: <span className="font-bold text-blue-400 ml-2 uppercase">{appState.currentGesture}</span>
        </div>
      )}
      
      {/* Manual Controls (Only Visible when Gestures are OFF) */}
      {!appState.useGestures && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-10">
          <button
            onClick={toggleTreeState}
            className="group relative px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full overflow-hidden transition-all hover:bg-white/20 hover:scale-105 active:scale-95 hover:border-blue-400/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="relative text-white font-light tracking-[0.2em] text-sm uppercase flex items-center gap-3">
              {appState.treeState === TreeState.GATHERED ? (
                <>
                  <span>Scatter Stars</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <span>Gather Tree</span>
                </>
              )}
            </span>
          </button>
          
          <div className="px-4 py-2 bg-black/40 backdrop-blur-sm rounded-lg text-white/50 text-xs italic pointer-events-none whitespace-nowrap">
            Click the hand icon in the menu to enable gesture control
          </div>
        </div>
      )}
    </div>
  );
};

export default App;