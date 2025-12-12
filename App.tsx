import React, { useState, useRef, useEffect } from 'react';
import LightLoom from './components/LightLoom';
import ControlPanel from './components/ControlPanel';
import { InteractionMode, InterpretationResult } from './types';
import { interpretPattern } from './services/geminiService';
import { Info, Volume2, X } from 'lucide-react';
import { audioService } from './services/audioService';
import { visionService } from './services/visionService';

const App: React.FC = () => {
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.PLAY);
  const [isWeaving, setIsWeaving] = useState(false);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleToggleMode = () => {
    const newMode = mode === InteractionMode.PLAY ? InteractionMode.WEAVE : InteractionMode.PLAY;
    setMode(newMode);
    setIsWeaving(newMode === InteractionMode.WEAVE);
  };

  const handleReset = () => {
    setIsWeaving(false); 
    setMode(InteractionMode.PLAY); 
    setInterpretation(null);
  };

  const handleInterpret = async () => {
    if (!canvasRef) return;
    setIsProcessing(true);
    try {
      const dataUrl = canvasRef.toDataURL('image/png', 1.0);
      const result = await interpretPattern(dataUrl);
      setInterpretation(result);
    } catch (error) {
      console.error(error);
      alert("The spirits are silent. Please ensure your API Key is configured.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStart = () => {
    setShowIntro(false);
    audioService.initialize();
  };
  
  const handleToggleCamera = async () => {
    if (isCameraActive) {
        visionService.stopCamera();
        setIsCameraActive(false);
    } else {
        if (videoRef.current) {
            try {
                await visionService.startCamera(videoRef.current);
                setIsCameraActive(true);
            } catch (e) {
                alert("Could not start camera. Please check permissions.");
            }
        }
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />
      
      {/* Hidden Video for processing */}
      <video ref={videoRef} id="webcam-feed" className="fixed top-0 left-0 opacity-0 pointer-events-none" autoPlay playsInline muted></video>

      {/* Main Canvas */}
      <LightLoom 
        mode={mode} 
        onCanvasRef={setCanvasRef} 
        isWeaving={isWeaving}
        isCameraActive={isCameraActive}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-purple-300 tracking-wider drop-shadow-lg">
            Lumina Weave
          </h1>
          <p className="text-white/40 text-sm font-light tracking-widest mt-1">DIGITAL GUQIN & LIGHT LOOM</p>
        </div>
      </div>

      {/* Controls */}
      <ControlPanel 
        mode={mode}
        onToggleMode={handleToggleMode}
        onReset={handleReset}
        onInterpret={handleInterpret}
        isProcessing={isProcessing}
        isCameraActive={isCameraActive}
        onToggleCamera={handleToggleCamera}
      />

      {/* Interpretation Modal */}
      {interpretation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-500">
          <div className="bg-slate-900/90 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
             
             <button 
               onClick={() => setInterpretation(null)}
               className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
             >
               <X className="w-5 h-5" />
             </button>

             <h2 className="font-cinzel text-2xl text-purple-200 text-center mb-6 border-b border-white/5 pb-4">
               {interpretation.title}
             </h2>
             
             <p className="font-serif text-lg text-white/80 leading-relaxed text-center italic">
               "{interpretation.poem}"
             </p>
             
             <div className="mt-8 flex justify-center">
               <button 
                 onClick={() => setInterpretation(null)}
                 className="px-8 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-full text-sm tracking-widest transition-colors uppercase"
               >
                 Accept Destiny
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Intro Overlay */}
      {showIntro && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center max-w-lg p-8">
            <h1 className="text-5xl font-cinzel text-white mb-6 tracking-widest">LUMINA</h1>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Weave light into fabric. Pluck strings to create sound.<br/>
              Use your hands via webcam or your mouse to interact.
            </p>
            <div className="grid grid-cols-2 gap-4 text-left text-sm text-gray-400 mb-8 bg-white/5 p-6 rounded-lg">
               <div>
                  <strong className="text-sky-300 block mb-1">Pluck Mode</strong>
                  Swipe with mouse or Index Finger.
               </div>
               <div>
                  <strong className="text-purple-300 block mb-1">Weave Mode</strong>
                  Drag with mouse or Pinch fingers to pull strings.
               </div>
            </div>
            <button 
              onClick={handleStart}
              className="px-10 py-4 bg-white text-black font-bold tracking-widest hover:scale-105 transition-transform rounded-sm"
            >
              ENTER THE VOID
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;