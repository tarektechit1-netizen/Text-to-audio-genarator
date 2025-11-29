
import React, { useState, useCallback, useRef } from 'react';
import { Mic2, MessageCircle } from 'lucide-react';
import InputPanel from './components/InputPanel';
import QueuePanel from './components/QueuePanel';
import { QueueItem, TTSStatus } from './types';
import { generateSpeech } from './services/geminiService';
import { pcmToWavBlob, mergePcmData } from './utils/audioUtils';

const App: React.FC = () => {
  // State for single project
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Ref to access current state inside async loops without stale closures
  const queueRef = useRef<QueueItem[]>(queue);
  queueRef.current = queue;

  // Run ID to manage processing sessions. 
  // Incrementing this invalidates any running background tasks from previous runs.
  const runIdRef = useRef<number>(0);

  // --- Queue Management ---

  const handleAddToQueue = (itemData: Omit<QueueItem, 'id' | 'status'>) => {
    const newItem: QueueItem = {
      ...itemData,
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      status: TTSStatus.IDLE,
    };
    setQueue(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item?.audioUrl) {
        URL.revokeObjectURL(item.audioUrl);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const handleClearQueue = () => {
    if (queue.length === 0) return;
    
    // Cleanup URLs
    queue.forEach(item => {
      if (item.audioUrl) {
        URL.revokeObjectURL(item.audioUrl);
      }
    });
    setQueue([]);
  };

  const updateItemStatus = (itemId: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
  };

  // --- Processing ---

  const handleStop = () => {
    if (isProcessing) {
      // 1. Invalidate current run immediately
      runIdRef.current += 1;
      
      // 2. Visual Feedback: Show "Stopping" state briefly
      setIsStopping(true);

      // 3. Reset UI status for all items
      setQueue(prev => prev.map(item => 
        item.status === TTSStatus.GENERATING 
          ? { ...item, status: TTSStatus.IDLE } 
          : item
      ));

      // 4. Force reset of main processing state almost immediately
      setTimeout(() => {
        setIsProcessing(false);
        setIsStopping(false);
      }, 300); 
    }
  };

  // Helper to map numeric speed (string "1.5x") to prompt instructions
  const getSpeedPrompt = (paceStr: string): string => {
    // Handle legacy values just in case
    if (paceStr === 'Normal') return '';
    if (paceStr === 'Slow') return 'Speak slowly.';
    if (paceStr === 'Fast') return 'Speak quickly.';

    const speed = parseFloat(paceStr.replace('x', ''));
    if (isNaN(speed) || speed === 1.0) return '';
    
    if (speed <= 0.6) return 'Speak very slowly.';
    if (speed <= 0.8) return 'Speak slowly.';
    if (speed <= 1.1) return 'Speak at a normal natural pace.'; // 0.9 - 1.1 buffer
    if (speed <= 1.5) return 'Speak quickly.';
    return 'Speak very fast.'; // 1.6 - 2.0
  };

  const processQueue = useCallback(async () => {
    if (isProcessing) return;
    
    // Start new run
    const currentRunId = runIdRef.current + 1;
    runIdRef.current = currentRunId;

    setIsProcessing(true);
    setIsStopping(false);

    // Find items that need processing
    const itemsToProcess = queueRef.current.filter(
      (item) => item.status === TTSStatus.IDLE || item.status === TTSStatus.ERROR
    );

    if (itemsToProcess.length === 0) {
      setIsProcessing(false);
      return;
    }

    // VISUAL UPDATE: Mark ALL valid items as GENERATING immediately.
    const idsToProcess = new Set(itemsToProcess.map(i => i.id));
    setQueue(prev => prev.map(item => 
      idsToProcess.has(item.id) 
        ? { ...item, status: TTSStatus.GENERATING, errorMessage: undefined } 
        : item
    ));

    // Helper function to process a single item
    const processItem = async (item: QueueItem) => {
      // Check Run ID: If it changed, we should stop (user clicked Stop)
      if (runIdRef.current !== currentRunId) return;

      // Check if item still exists in the latest state
      if (!queueRef.current.find(i => i.id === item.id)) return;

      try {
        // Map UI speed to prompt
        const speedPrompt = getSpeedPrompt(item.pace);
        
        // Combine styles and speed. Ensure instructions is treated as string.
        const currentInstructions = item.instructions || '';
        const combinedInstructions = [currentInstructions, speedPrompt].filter(Boolean).join('. ');

        const { pcmData } = await generateSpeech(item.text, item.voiceName, combinedInstructions);
        
        // Check Run ID again after generation
        if (runIdRef.current !== currentRunId) return;

        const wavBlob = pcmToWavBlob(pcmData);
        const audioUrl = URL.createObjectURL(wavBlob);

        updateItemStatus(item.id, {
          status: TTSStatus.COMPLETED,
          audioUrl,
          audioBlob: wavBlob,
          pcmData: pcmData
        });

      } catch (err: any) {
        console.error(err);
        // Only update error if this run is still active
        if (runIdRef.current === currentRunId) {
            updateItemStatus(item.id, {
              status: TTSStatus.ERROR,
              errorMessage: err.message || "Failed to generate audio"
            });
        }
      }
    };

    // Parallel Processing Logic
    const CONCURRENCY_LIMIT = 4; 
    const iterator = itemsToProcess.entries();
    
    const workers = new Array(Math.min(CONCURRENCY_LIMIT, itemsToProcess.length))
      .fill(null)
      .map(async () => {
        for (const [_, item] of iterator) {
          if (runIdRef.current !== currentRunId) break; 
          await processItem(item);
        }
      });

    await Promise.all(workers);

    // Only update state if we are still the active run
    if (runIdRef.current === currentRunId) {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // --- Downloads ---

  const handleDownloadItem = (item: QueueItem) => {
    if (!item.audioUrl) return;
    
    const a = document.createElement('a');
    a.href = item.audioUrl;
    a.download = `segment_${item.id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleMergeDownload = () => {
    const completedItems = queue.filter(item => item.status === TTSStatus.COMPLETED && item.pcmData);
    if (completedItems.length === 0) return;

    const allPcmData = completedItems.map(item => item.pcmData!);
    const mergedBlob = mergePcmData(allPcmData);
    const url = URL.createObjectURL(mergedBlob);
    
    // Use project name for filename
    const safeName = projectName.trim().replace(/[^a-z0-9_\- ]/gi, '').trim() || `project_${Date.now()}`;
    const fileName = `${safeName}.wav`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* App Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Mic2 className="text-blue-500" size={24} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              BanglaNarrator
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Long-form Text-to-Speech Tool (1-2 Hours support)</p>
        </div>

        <div className="flex flex-col items-end text-xs">
           <span className="text-slate-400 font-medium">Developed by <span className="text-blue-400 font-bold">MUSTAFHIJUR RAHMAN TAREK</span></span>
           <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
              <MessageCircle size={12} className="text-emerald-500" />
              <span>WhatsApp: <span className="font-mono text-emerald-400 font-semibold tracking-wide">01313739094</span></span>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <InputPanel onAddToQueue={handleAddToQueue} />
        
        <QueuePanel 
          queue={queue}
          projectName={projectName}
          onProjectNameChange={setProjectName}
          onGenerateAll={processQueue}
          onStop={handleStop}
          onRemoveItem={handleRemoveItem}
          onClearQueue={handleClearQueue}
          onDownloadItem={handleDownloadItem}
          onMergeDownload={handleMergeDownload}
          isProcessing={isProcessing}
          isStopping={isStopping}
        />
      </main>
    </div>
  );
};

export default App;
