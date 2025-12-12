import React from 'react';
import { InteractionMode } from '../types';
import { RefreshCw, Hand, Music, Sparkles, Camera, CameraOff } from 'lucide-react';

interface ControlPanelProps {
  mode: InteractionMode;
  onToggleMode: () => void;
  onReset: () => void;
  onInterpret: () => void;
  isProcessing: boolean;
  isCameraActive: boolean;
  onToggleCamera: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  mode, 
  onToggleMode, 
  onReset, 
  onInterpret,
  isProcessing,
  isCameraActive,
  onToggleCamera
}) => {
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 bg-black/40 backdrop-blur-md p-4 rounded-full border border-white/10 shadow-2xl z-10">
      <button 
        onClick={onReset}
        className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all group"
        title="Reset Loom"
      >
        <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
      </button>

      <button
        onClick={onToggleCamera}
        className={`p-3 rounded-full transition-all group ${
          isCameraActive ? 'text-green-400 bg-green-400/10' : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
        title="Toggle Hand Tracking"
      >
        {isCameraActive ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
      </button>
      
      <div className="w-px h-10 bg-white/20 my-auto mx-2" />
      
      <button 
        onClick={onToggleMode}
        className={`flex items-center gap-2 px-6 py-2 rounded-full font-cinzel transition-all ${
          mode === InteractionMode.WEAVE 
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' 
            : 'text-white/70 hover:bg-white/10'
        }`}
      >
        <Hand className="w-5 h-5" />
        <span>{mode === InteractionMode.WEAVE ? 'Weaving' : 'Plucking'}</span>
      </button>

      <button 
        onClick={onInterpret}
        disabled={isProcessing}
        className={`flex items-center gap-2 px-6 py-2 rounded-full font-cinzel transition-all ${
           isProcessing
           ? 'bg-purple-500/10 text-purple-300/50 cursor-not-allowed'
           : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
        }`}
      >
        <Sparkles className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
        <span>{isProcessing ? 'Divining...' : 'Divinate Pattern'}</span>
      </button>
    </div>
  );
};

export default ControlPanel;