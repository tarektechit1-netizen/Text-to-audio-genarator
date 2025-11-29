
import React, { useState, useRef } from 'react';
import { Wand2, Split, Loader2, Volume2, Minus, Plus, Gauge } from 'lucide-react';
import { VOICES, STYLE_TAGS } from '../constants';
import { QueueItem } from '../types';
import { generateSpeech } from '../services/geminiService';
import { pcmToWavBlob } from '../utils/audioUtils';

interface InputPanelProps {
  onAddToQueue: (item: Omit<QueueItem, 'id' | 'status'>) => void;
}

// Safe character limit per segment. 
// 3000 characters is approximately 750 tokens, which is very safe for the 8192 token limit.
const MAX_CHAR_LIMIT = 3000;

const InputPanel: React.FC<InputPanelProps> = ({ onAddToQueue }) => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].name);
  const [styleInstructions, setStyleInstructions] = useState('');
  
  // Speed Control State (0.5x to 2.0x)
  const [speed, setSpeed] = useState(1.0);
  
  // Preview State
  const [isPreviewing, setIsPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAddStyle = (prompt: string) => {
    setStyleInstructions((prev) => {
      const separator = prev.length > 0 ? ' ' : '';
      return `${prev}${separator}${prompt}`;
    });
  };

  const handleSpeedChange = (val: number) => {
    // Clamp between 0.5 and 2.0
    const newSpeed = Math.min(Math.max(val, 0.5), 2.0);
    setSpeed(Number(newSpeed.toFixed(1)));
  };

  const handlePreview = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);

    try {
      // Short Bengali sample text
      const previewText = "হ্যালো, আমি আপনার নির্বাচিত ভয়েস।";
      
      const { pcmData } = await generateSpeech(previewText, selectedVoice, "Speak clearly and naturally.");
      const wavBlob = pcmToWavBlob(pcmData);
      const audioUrl = URL.createObjectURL(wavBlob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      
      audioRef.current.onended = () => {
        setIsPreviewing(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audioRef.current.onerror = () => {
        setIsPreviewing(false);
        console.error("Audio playback error");
      };

    } catch (error) {
      console.error("Preview failed:", error);
      setIsPreviewing(false);
    }
  };

  // Helper function to split text intelligently based on punctuation
  const splitTextIntoChunks = (fullText: string): string[] => {
    const chunks: string[] = [];
    let remainingText = fullText.trim();

    while (remainingText.length > 0) {
      // If text fits in one chunk, take it all
      if (remainingText.length <= MAX_CHAR_LIMIT) {
        chunks.push(remainingText);
        break;
      }

      // Take a slice up to the limit
      const slice = remainingText.slice(0, MAX_CHAR_LIMIT);
      
      // Attempt to find a natural break point (punctuation) near the end of the slice
      // Priorities: Newline -> Bengali Danda (।) -> English Punctuation (.!?) -> Space
      let splitIndex = -1;
      
      const punctuations = ['\n', '।', '.', '!', '?'];
      
      for (const p of punctuations) {
        const idx = slice.lastIndexOf(p);
        if (idx > splitIndex) { 
          splitIndex = idx;
        }
      }

      // If no punctuation found, try finding the last space to avoid cutting words in half
      if (splitIndex === -1) {
        splitIndex = slice.lastIndexOf(' ');
      }

      // If absolutely no break point found, hard cut at limit
      if (splitIndex === -1) {
        splitIndex = MAX_CHAR_LIMIT - 1;
      }

      // Cut the chunk including the punctuation/space
      const chunk = remainingText.slice(0, splitIndex + 1).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      // Update remaining text
      remainingText = remainingText.slice(splitIndex + 1).trim();
    }

    return chunks;
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    
    // Process text: Split into chunks if necessary
    const textChunks = splitTextIntoChunks(text);
    const paceString = `${speed.toFixed(1)}x`; // Convert number to string for queue

    // Add each chunk to the queue
    textChunks.forEach(chunkText => {
      onAddToQueue({
        text: chunkText,
        voiceName: selectedVoice,
        pace: paceString,
        instructions: styleInstructions
      });
    });
    
    setText('');
  };

  const isLongText = text.length > MAX_CHAR_LIMIT;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700 p-6 overflow-y-auto w-full lg:w-1/2 xl:w-5/12">
      
      {/* Voice & Pace Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Voice Selection</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-800 text-slate-200 border border-slate-600 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.name}>{v.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <button
              onClick={handlePreview}
              disabled={isPreviewing}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md px-3 text-blue-400 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[44px]"
              title="Preview Voice (Plays sample)"
            >
              {isPreviewing ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
            <Gauge size={12} />
            Speed Control (Simulated)
          </label>
          <div className="bg-slate-800 border border-slate-600 rounded-md p-2 flex items-center gap-2 h-[42px]">
             
             {/* Decrease Button */}
             <button 
               onClick={() => handleSpeedChange(speed - 0.1)}
               className="text-slate-400 hover:text-slate-200 p-1 rounded-sm hover:bg-slate-700 transition-colors"
             >
               <Minus size={14} />
             </button>

             {/* Slider */}
             <div className="flex-1 flex items-center">
               <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
               />
             </div>

             {/* Increase Button */}
             <button 
               onClick={() => handleSpeedChange(speed + 0.1)}
               className="text-slate-400 hover:text-slate-200 p-1 rounded-sm hover:bg-slate-700 transition-colors"
             >
               <Plus size={14} />
             </button>

             {/* Value Display */}
             <div className="bg-slate-900 px-2 py-0.5 rounded text-xs font-mono text-blue-400 min-w-[40px] text-center">
               {speed.toFixed(1)}x
             </div>
          </div>
        </div>
      </div>

      {/* Style Instructions */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Style Instructions (Optional)</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {STYLE_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleAddStyle(tag.prompt)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full text-xs text-slate-300 transition-colors"
            >
              {tag.label}
            </button>
          ))}
        </div>
        <textarea
          value={styleInstructions}
          onChange={(e) => setStyleInstructions(e.target.value)}
          placeholder="E.g. Say it romantically, pause after every sentence..."
          className="w-full h-20 bg-slate-950 text-slate-200 border border-slate-700 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Input Text */}
      <div className="flex-1 flex flex-col mb-4">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Input Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here..."
          className="flex-1 w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-md p-4 text-base leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
        />
        <div className="text-right text-xs text-slate-500 mt-2 flex justify-between">
           <span className={isLongText ? 'text-emerald-400' : ''}>
             {isLongText ? 'Auto-chunking enabled (Long text detected)' : ''}
           </span>
           <span>{text.length} characters</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-3 px-4 rounded-lg border border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {isLongText ? (
           <>
            <Split size={18} className="text-emerald-400 group-hover:rotate-90 transition-transform" />
            Analyze & Add Segments to Queue
           </>
        ) : (
           <>
            <Wand2 size={18} className="text-blue-400" />
            Analyze & Add to Queue
           </>
        )}
      </button>

    </div>
  );
};

export default InputPanel;
