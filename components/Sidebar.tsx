import React, { useState } from 'react';
import { AppState, ParticleConfig } from '../types';

interface SidebarProps {
  appState: AppState;
  config: ParticleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
  onToggleGesture: () => void;
  onAddPhoto: (url: string) => void;
  onRemovePhoto: (index: number) => void;
  onSetBgm: (url: string) => void;
  onSetCustomText: (text: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  appState, config, setConfig, onToggleGesture, onAddPhoto, onRemovePhoto, onSetBgm, onSetCustomText 
}) => {
  const [activeTab, setActiveTab] = useState<'music' | 'gesture' | 'custom'>('custom');
  const [isOpen, setIsOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'music') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'photo') onAddPhoto(url);
    else onSetBgm(url);
  };

  const toggleTab = (tab: 'music' | 'gesture' | 'custom') => {
    if (activeTab === tab && isOpen) {
        setIsOpen(false);
    } else {
        setActiveTab(tab);
        setIsOpen(true);
    }
  };

  return (
    <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {/* Navigation Buttons (Pointer events enabled) */}
      <div className="flex gap-2 p-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl pointer-events-auto">
        <button 
          onClick={() => toggleTab('music')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'music' && isOpen ? 'bg-blue-500/50 text-white shadow-lg' : 'text-blue-200/50 hover:text-white'}`}
          title="Music"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
        </button>
        <button 
          onClick={() => toggleTab('gesture')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'gesture' && isOpen ? 'bg-blue-500/50 text-white shadow-lg' : 'text-blue-200/50 hover:text-white'}`}
          title="Gestures"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 013 0v5.5m0-1.3V14" /></svg>
        </button>
        <button 
          onClick={() => toggleTab('custom')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'custom' && isOpen ? 'bg-blue-500/50 text-white shadow-lg' : 'text-blue-200/50 hover:text-white'}`}
          title="Customize"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m12 4a2 2 0 100-4m0 4a2 2 0 110-4m-6 0a2 2 0 100-4m0 4a2 2 0 110-4m-6 0v2m0-6V4m6 6v10m6-2v2m0-6v-4" /></svg>
        </button>
        {isOpen && (
          <button 
            onClick={() => setIsOpen(false)}
            className="p-3 text-red-400 hover:text-red-300"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Content Panel (Always rendered in DOM, toggled via CSS to persist audio state) */}
      <div className={`w-80 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl transition-all duration-300 ease-out origin-top-right pointer-events-auto ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-4 pointer-events-none'}`}>
        
        {/* MUSIC TAB */}
        <div className={activeTab === 'music' ? 'block' : 'hidden'}>
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Background Music</h3>
              <div className="flex flex-col gap-4">
                <label className="group relative flex flex-col items-center justify-center h-32 w-full border-2 border-dashed border-white/20 rounded-2xl hover:border-blue-400/50 transition-colors cursor-pointer bg-white/5">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-sm text-blue-200">Upload MP3/MP4</p>
                  </div>
                  <input type="file" className="hidden" accept="audio/*,video/*" onChange={(e) => handleFileUpload(e, 'music')} />
                </label>
              </div>
            </div>
        </div>
        
        {/* Audio Player */}
        {appState.bgmUrl && (
             <div className={activeTab === 'music' ? 'block mt-4' : 'hidden'}>
                <audio controls autoPlay loop className="w-full" src={appState.bgmUrl} />
             </div>
        )}

        {/* GESTURE TAB */}
        <div className={activeTab === 'gesture' ? 'block' : 'hidden'}>
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Hand Gestures</h3>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <span className="text-blue-100">Enable Tracker</span>
                <button 
                  onClick={onToggleGesture}
                  className={`w-12 h-6 rounded-full transition-colors relative ${appState.useGestures ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${appState.useGestures ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="text-xs text-blue-300/60 leading-relaxed italic">
                <p>• Fist: Gather Tree</p>
                <p>• Open Palm: Scatter Particles</p>
                <p>• Movement: Rotate Camera</p>
                <p>• Pinch: Focus Random Photo</p>
              </div>
            </div>
        </div>

        {/* CUSTOM TAB */}
        <div className={activeTab === 'custom' ? 'block' : 'hidden'}>
            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
              <h3 className="text-xl font-bold text-white">Customization</h3>
              
              <div className="space-y-4">
                
                {/* Greeting Text Input */}
                <div className="space-y-2">
                   <label className="text-xs text-blue-200/50 uppercase tracking-widest">Greeting Text</label>
                   <input 
                     type="text"
                     value={appState.customText}
                     onChange={(e) => onSetCustomText(e.target.value)}
                     maxLength={25}
                     className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-400 transition-colors font-serif tracking-wider"
                     placeholder="MERRY CHRISTMAS"
                   />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-blue-200/50 uppercase tracking-widest">Particle Count: {config.count}</label>
                  <input 
                    type="range" min="500" max="10000" step="100" 
                    value={config.count} 
                    onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-blue-200/50 uppercase tracking-widest">Particle Size: {config.size}</label>
                  <input 
                    type="range" min="0.01" max="0.2" step="0.01" 
                    value={config.size} 
                    onChange={(e) => setConfig({ ...config, size: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400"
                  />
                </div>

                 <div className="space-y-2">
                  <label className="text-xs text-blue-200/50 uppercase tracking-widest">Particle Brightness: {config.brightness}</label>
                  <input 
                    type="range" min="0.5" max="3.0" step="0.1" 
                    value={config.brightness} 
                    onChange={(e) => setConfig({ ...config, brightness: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-blue-200/50 uppercase tracking-widest">Star Brightness: {config.starBrightness}</label>
                  <input 
                    type="range" min="0.5" max="10.0" step="0.5" 
                    value={config.starBrightness} 
                    onChange={(e) => setConfig({ ...config, starBrightness: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400"
                  />
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <label className="text-xs text-blue-200/50 uppercase tracking-widest">Manual Colors</label>
                  <div className="flex gap-2">
                    <input type="color" value={config.primaryColor} onChange={(e) => setConfig({...config, primaryColor: e.target.value})} className="w-8 h-8 rounded-full border-0 p-0 overflow-hidden cursor-pointer" />
                    <input type="color" value={config.secondaryColor} onChange={(e) => setConfig({...config, secondaryColor: e.target.value})} className="w-8 h-8 rounded-full border-0 p-0 overflow-hidden cursor-pointer" />
                    <input type="color" value={config.tertiaryColor} onChange={(e) => setConfig({...config, tertiaryColor: e.target.value})} className="w-8 h-8 rounded-full border-0 p-0 overflow-hidden cursor-pointer" />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                   <h4 className="text-sm font-bold text-white mb-2">My Photos ({appState.photos.length})</h4>
                   <label className="flex items-center justify-center w-full p-2 border border-dashed border-white/20 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                      <span className="text-xs text-blue-300">+ Add Photo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} />
                   </label>
                   
                   <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto mt-2">
                      {appState.photos.map((photo, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-white/10">
                           <img src={photo} className="w-full h-full object-cover" alt={`memory-${i}`} />
                           <button 
                             onClick={() => onRemovePhoto(i)}
                             className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;