import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StringEntity, Particle, InteractionMode } from '../types';
import { STRING_COUNT, SCALE_FREQUENCIES, STRING_COLOR_BASE, STRING_COLOR_ACTIVE, PARTICLE_COUNT_PER_PLUCK } from '../constants';
import { audioService } from '../services/audioService';
import { visionService, HandData } from '../services/visionService';

interface LightLoomProps {
  mode: InteractionMode;
  onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  isWeaving: boolean;
  isCameraActive: boolean;
}

const LightLoom: React.FC<LightLoomProps> = ({ mode, onCanvasRef, isWeaving, isCameraActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stringsRef = useRef<StringEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0, isDown: false });
  const handsRef = useRef<HandData[]>([]);
  // Store previous hand positions for velocity calculation
  const prevHandsRef = useRef<Map<string, {x: number, y: number}>>(new Map());
  
  const requestRef = useRef<number>();
  
  // Initialize strings
  const initStrings = useCallback((width: number, height: number) => {
    const newStrings: StringEntity[] = [];
    const spacing = width / (STRING_COUNT + 1);
    
    for (let i = 0; i < STRING_COUNT; i++) {
      newStrings.push({
        id: i,
        x: spacing * (i + 1),
        y1: 0,
        y2: height,
        vibration: 0,
        velocity: 0,
        frequency: SCALE_FREQUENCIES[i % SCALE_FREQUENCIES.length],
        color: STRING_COLOR_BASE,
        isHeld: false,
        controlPoint: { x: spacing * (i + 1), y: height / 2 }
      });
    }
    stringsRef.current = newStrings;
  }, []);

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < PARTICLE_COUNT_PER_PLUCK; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: color,
        size: Math.random() * 2 + 1
      });
    }
  };

  const updatePhysics = (width: number, height: number) => {
    // String Physics
    stringsRef.current.forEach(str => {
      // Logic handled in checkInteractions mainly for holding
      if (!str.isHeld) {
        // Spring physics when released
        const k = 0.1; // Spring constant
        const damping = 0.95;
        
        const acceleration = -k * str.vibration;
        str.velocity += acceleration;
        str.velocity *= damping;
        str.vibration += str.velocity;
        
        const restX = str.x;
        const restY = height / 2;
        
        if (!isWeaving) {
            // Stronger restoring force when not weaving mode
            str.controlPoint.x += (restX - str.controlPoint.x) * 0.05;
            str.controlPoint.y += (restY - str.controlPoint.y) * 0.05;
        } else {
             // Very weak restoring force to allow patterns to "hang" in the air
            str.controlPoint.x += (restX - str.controlPoint.x) * 0.005;
            str.controlPoint.y += (restY - str.controlPoint.y) * 0.005;
        }
      } else {
         str.vibration = Math.sin(Date.now() * 0.02) * 2;
      }
    });

    // Particle Physics
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
      }
    }
  };

  const processInteractionPoint = (x: number, y: number, px: number, py: number, isGrabbing: boolean, id: string) => {
      stringsRef.current.forEach(str => {
        // Hit detection tolerance
        const hitWidth = 30; 
        
        // Calculate approximate X of string at Interaction Y
        const t = y / (str.y2 - str.y1 || 1); // 0 to 1
        const stringXAtY = Math.pow(1 - t, 2) * str.x + 2 * (1 - t) * t * str.controlPoint.x + Math.pow(t, 2) * str.x;
        
        const dx = x - stringXAtY;
        const dist = Math.abs(dx);
        
        // PLUCK LOGIC (Velocity crossing)
        // If we moved across the string or are just moving fast near it
        if (!str.isHeld && dist < hitWidth) {
          const speed = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));
          
          if (speed > 5) { // Fast movement = Pluck
               // Avoid double triggering
               if (Math.abs(str.vibration) < 5) {
                  str.vibration = (x - px) * 2; // Impulse
                  audioService.playString(str.frequency);
                  spawnParticles(stringXAtY, y, str.color);
               }
          }
        }
        
        // GRAB/WEAVE LOGIC
        // If 'isGrabbing' is true (mouse down or pinch)
        if (mode === InteractionMode.WEAVE && isGrabbing) {
           if (!str.isHeld && dist < 40) {
              // Pick up the string
              // IMPORTANT: Only one controller can hold a string at a time? 
              // For simplicity, last one wins.
              str.isHeld = true;
              str.color = STRING_COLOR_ACTIVE;
              
              // Attach metadata to string to know WHO holds it (Mouse or Hand ID)
              // We'll just update position directly here for now as a simplification
              (str as any).heldBy = id;
           }
           
           if (str.isHeld && (str as any).heldBy === id) {
              // Move control point
              str.controlPoint.x += (x - str.controlPoint.x) * 0.2;
              str.controlPoint.y += (y - str.controlPoint.y) * 0.2;
           }
        }
        
        // RELEASE LOGIC
        if (!isGrabbing && str.isHeld && (str as any).heldBy === id) {
          str.isHeld = false;
          str.color = STRING_COLOR_BASE;
          (str as any).heldBy = null;
          // Pluck on release
          str.vibration = 20;
          audioService.playString(str.frequency);
        }
      });
  }

  const checkInteractions = (width: number, height: number) => {
    // 1. Mouse Interaction
    const mouse = mouseRef.current;
    processInteractionPoint(mouse.x, mouse.y, mouse.px, mouse.py, mouse.isDown, 'mouse');
    
    // 2. Hand Interaction
    handsRef.current.forEach((hand, index) => {
        // Index finger tip is index 8
        const indexTip = hand.landmarks[8];
        const thumbTip = hand.landmarks[4];
        
        // MediaPipe coords are 0-1 normalized. Flip X because webcam is mirrored usually.
        // Actually, we should check if we mirrored the video element or not. 
        // Usually we mirror video CSS, so landmarks match visual.
        // If we mirror the video element with CSS transform: scaleX(-1), landmarks from mediapipe are still raw (unmirrored).
        // So we need to calculate X as (1 - x) * width to match a mirrored video.
        const ix = (1 - indexTip.x) * width;
        const iy = indexTip.y * height;
        
        const tx = (1 - thumbTip.x) * width;
        const ty = thumbTip.y * height;
        
        // Calculate pinch distance (in screen pixels approx)
        const pinchDist = Math.sqrt(Math.pow(ix - tx, 2) + Math.pow(iy - ty, 2));
        const isPinching = pinchDist < 60; // Threshold for pinch
        
        // Get previous position for velocity
        const handId = `hand-${index}`;
        const prev = prevHandsRef.current.get(handId) || { x: ix, y: iy };
        
        processInteractionPoint(ix, iy, prev.x, prev.y, isPinching, handId);
        
        // Store current as prev for next frame
        prevHandsRef.current.set(handId, { x: ix, y: iy });
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Composite operation for glowing effect
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw Strings
    stringsRef.current.forEach(str => {
      ctx.beginPath();
      ctx.strokeStyle = str.color;
      ctx.lineWidth = 2 + Math.abs(str.vibration) * 0.2;
      ctx.shadowBlur = 10 + Math.abs(str.vibration);
      ctx.shadowColor = str.color;
      
      // Draw as Quadratic Bezier
      ctx.moveTo(str.x, str.y1);
      
      const vibX = str.vibration; 
      const cpX = str.controlPoint.x + (str.isHeld ? 0 : vibX);
      const cpY = str.controlPoint.y;
      
      ctx.quadraticCurveTo(cpX, cpY, str.x, str.y2);
      ctx.stroke();
      
      // Draw Node if weaving/held
      if (str.isHeld || Math.abs(str.controlPoint.x - str.x) > 10) {
          ctx.beginPath();
          ctx.fillStyle = '#fff';
          ctx.arc(cpX, cpY, 4, 0, Math.PI * 2);
          ctx.fill();
      }
    });
    
    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw Hand Indicators (Magic Light Points)
    if (isCameraActive) {
        handsRef.current.forEach((hand) => {
            const indexTip = hand.landmarks[8];
            const x = (1 - indexTip.x) * width;
            const y = indexTip.y * height;
            
            // Index Finger Glow
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 200, 100, 0.8)';
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'orange';
            ctx.fill();
            
            // Thumb for pinch reference (fainter)
            const thumbTip = hand.landmarks[4];
            const tx = (1 - thumbTip.x) * width;
            const ty = thumbTip.y * height;
            
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
            ctx.arc(tx, ty, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
  };

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    checkInteractions(width, height);
    updatePhysics(width, height);
    draw(ctx, width, height);

    // Update previous mouse position
    mouseRef.current.px = mouseRef.current.x;
    mouseRef.current.py = mouseRef.current.y;

    requestRef.current = requestAnimationFrame(loop);
  }, [mode, isWeaving, isCameraActive]);

  useEffect(() => {
    // Subscribe to vision updates
    visionService.onResults = (hands) => {
        handsRef.current = hands;
    };
    
    // Handle resize
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        
        if (stringsRef.current.length === 0) {
            initStrings(width, height);
        } else {
            const spacing = width / (STRING_COUNT + 1);
            stringsRef.current.forEach((str, i) => {
                str.x = spacing * (i + 1);
                str.y2 = height;
                if (!isWeaving) {
                   str.controlPoint.x = str.x;
                   str.controlPoint.y = height / 2;
                }
            });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      visionService.onResults = null;
    };
  }, [initStrings, loop, isWeaving]);
  
  useEffect(() => {
    onCanvasRef(canvasRef.current);
  }, [onCanvasRef]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    mouseRef.current.x = clientX - rect.left;
    mouseRef.current.y = clientY - rect.top;
  };

  const handleMouseDown = () => {
    mouseRef.current.isDown = true;
    if (audioService) audioService.initialize();
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair touch-none">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      />
    </div>
  );
};

export default LightLoom;