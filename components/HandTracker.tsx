
import React, { useEffect, useRef, useState } from 'react';

// Types for MediaPipe globals
declare global {
  interface Window {
    Hands: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

interface HandTrackerProps {
  enabled: boolean;
  onGestureUpdate: (gesture: string, rotation?: { x: number, y: number }) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ enabled, onGestureUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Logic Refs
  const handsRef = useRef<any>(null);
  const rafId = useRef<number>(0);
  const lastLandmarks = useRef<any[] | null>(null);
  const isProcessing = useRef<boolean>(false);
  const lastInferenceTime = useRef<number>(0);

  // Velocity Tracking Logic
  const lastHandPos = useRef<{x: number, y: number} | null>(null);
  const lastAnalysisTime = useRef<number>(0);
  
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    // Cleanup previous state if any
    lastLandmarks.current = null;
    isProcessing.current = false;
    lastHandPos.current = null;
    lastAnalysisTime.current = 0;
    
    if (!enabled) {
      setStatus('Disabled');
      return;
    }

    let active = true;
    let stream: MediaStream | null = null;

    const initializeMediaPipe = async () => {
      try {
        setStatus('Loading Model...');
        
        // 1. Wait for Global Scripts
        let attempts = 0;
        // Wait up to 5 seconds for scripts to load
        while (!window.Hands && attempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        
        if (!window.Hands) {
          throw new Error("MediaPipe script not loaded. Check internet connection.");
        }

        if (!active) return;

        // 2. Setup Hands
        // Ensure version matches index.html exactly to avoid version conflict or missing assets
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
          if (!active) return;
          
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            lastLandmarks.current = results.multiHandLandmarks;
            analyzeGesture(results.multiHandLandmarks[0]);
          } else {
            lastLandmarks.current = null;
            // Reset velocity tracking when hand is lost
            lastHandPos.current = null;
            onGestureUpdate('None');
          }
          // Mark processing as done immediately after getting results
          isProcessing.current = false;
        });

        handsRef.current = hands;

        // 3. Setup Camera
        setStatus('Starting Camera...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (!active) {
            if(stream) stream.getTracks().forEach(t => t.stop());
            return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready and HAVE DIMENSIONS
          await new Promise((resolve) => {
             if (videoRef.current) {
                 videoRef.current.onloadedmetadata = () => {
                    resolve(true);
                 };
             }
          });
          
          await videoRef.current.play();
          
          setStatus('Active');
          startLoop();
        }

      } catch (error) {
        console.error("HandTracker Error:", error);
        setStatus('Error');
      }
    };

    const analyzeGesture = (landmarks: any) => {
      // Current hand position (center/palm)
      // Using landmark 9 (Middle Finger MCP) as a stable center point
      const handX = landmarks[9].x;
      const handY = landmarks[9].y;
      const now = Date.now();

      // --- Velocity Check ---
      // Calculate speed of hand movement to prevent 'Pinch' while rotating (swiping)
      let speed = 0;
      if (lastHandPos.current && lastAnalysisTime.current > 0) {
          const dt = (now - lastAnalysisTime.current) / 1000; // seconds
          if (dt > 0) {
              const dx = handX - lastHandPos.current.x;
              const dy = handY - lastHandPos.current.y;
              speed = Math.sqrt(dx*dx + dy*dy) / dt; // units per second (screen space)
          }
      }

      lastHandPos.current = { x: handX, y: handY };
      lastAnalysisTime.current = now;

      // Threshold: 0.3 means moving across ~30% of screen width in 1 second.
      // INCREASED to 1.0 to make pinch more responsive even if hand is shaky or moving slightly
      const isMovingFast = speed > 1.0;

      // --- Finger State ---
      const isIndexOpen = landmarks[8].y < landmarks[6].y;
      const isMiddleOpen = landmarks[12].y < landmarks[10].y;
      const isRingOpen = landmarks[16].y < landmarks[14].y;
      const isPinkyOpen = landmarks[20].y < landmarks[18].y;

      const fingersOpenCount = [isIndexOpen, isMiddleOpen, isRingOpen, isPinkyOpen].filter(Boolean).length;

      // --- Gesture Detection ---
      // Pinch: Thumb Tip 4 to Index Tip 8
      // Use 3D distance to avoid false positives when hand is rotated (side view)
      const pinchDistance = Math.sqrt(
        Math.pow(landmarks[8].x - landmarks[4].x, 2) + 
        Math.pow(landmarks[8].y - landmarks[4].y, 2) +
        Math.pow(landmarks[8].z - landmarks[4].z, 2)
      );

      let gesture = 'None';
      
      // CRITICAL FIX: Relaxed pinch threshold (0.04 -> 0.06) and speed check
      if (pinchDistance < 0.06 && !isMovingFast) {
        gesture = 'Pinch';
      } else if (fingersOpenCount === 0) {
        gesture = 'Fist';
      } else if (fingersOpenCount >= 4) {
        gesture = 'Open';
      }

      // 3. Calculate Position for Rotation
      // Map 0..1 to -1..1
      // Mirroring: Camera X=0 is Screen Right. Camera X=1 is Screen Left.
      // We want Screen Left (-1) to Screen Right (1).
      // So X: (0.5 - landmarks[9].x) * 2
      const x = (0.5 - landmarks[9].x) * 2 * 1.5; 
      const y = (landmarks[9].y - 0.5) * 2 * 1.5;

      onGestureUpdate(gesture, { x, y });
    };

    const startLoop = () => {
      const loop = () => {
        if (!active) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState >= 2) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;

            // 1. Draw Video (Mirrored)
            ctx.save();
            ctx.clearRect(0, 0, width, height);
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                ctx.drawImage(video, 0, 0, width, height);
            }
            
            // 2. Draw Landmarks (on top of video, mirrored)
            if (lastLandmarks.current && window.drawConnectors && window.drawLandmarks) {
              for (const landmarks of lastLandmarks.current) {
                window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#00FFFF', lineWidth: 2 });
                window.drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });
              }
            }
            ctx.restore();

            // 3. Trigger Inference (Throttled)
            const now = Date.now();
            const timeSinceLast = now - lastInferenceTime.current;
            
            // Limit to ~15 FPS (66ms)
            // Critical check: video dimensions must be > 0 to prevent WASM memory crash
            if (timeSinceLast > 66 && !isProcessing.current && video.videoWidth > 0 && video.videoHeight > 0) {
              isProcessing.current = true;
              lastInferenceTime.current = now;
              
              handsRef.current.send({ image: video })
                .catch((e: any) => {
                   console.error("Inference Error:", e);
                   isProcessing.current = false; // Force reset on error
                   if (e.toString().includes('memory') || e.toString().includes('Aborted')) {
                        active = false;
                        setStatus('Crash');
                   }
                });
            }
          }
        }

        rafId.current = requestAnimationFrame(loop);
      };
      
      loop();
    };

    initializeMediaPipe();

    return () => {
      active = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (handsRef.current) {
          try {
              handsRef.current.close();
          } catch(e) {
              console.warn("Error closing MediaPipe hands:", e);
          }
      }
    };
  }, [enabled]);

  return (
    <div className={`fixed bottom-4 left-4 z-40 transition-all duration-500 transform ${enabled ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="relative w-48 h-36 bg-black/90 rounded-2xl overflow-hidden border border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />
        <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/80 to-transparent">
           <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
             <span className={`w-1.5 h-1.5 rounded-full ${status === 'Active' ? 'bg-green-500 animate-pulse' : (status === 'Error' || status === 'Crash') ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
             {status}
           </span>
        </div>
      </div>
    </div>
  );
};

export default HandTracker;
