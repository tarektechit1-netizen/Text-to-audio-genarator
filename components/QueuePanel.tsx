
import React from 'react';
import { Download, Trash2, Loader2, Play, AlertCircle, FileAudio, Merge, Square } from 'lucide-react';
import { QueueItem, TTSStatus } from '../types';

interface QueuePanelProps {
  queue: QueueItem[];
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onGenerateAll: () => void;
  onStop: () => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onDownloadItem: (item: QueueItem) => void;
  onMergeDownload: () => void;
  isProcessing: boolean;
  isStopping?: boolean;
}

const QueuePanel: React.FC<QueuePanelProps> = ({
  queue,
  projectName,
  onProjectNameChange,
  onGenerateAll,
  onStop,
  onRemoveItem,
  onClearQueue,
  onDownloadItem,
  onMergeDownload,
  isProcessing,
  isStopping = false,
}) => {
  const hasItems = queue.length > 0;
  const hasCompletedItems = queue.some(item => item.status === TTSStatus.COMPLETED);

  return (
    <div className="flex flex-col h-full bg-slate-950 w-full lg:w-1/2 xl:w-7/12 border-l border-slate-800">
      
      {/* Header Actions */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950">
        
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider whitespace-nowrap">Audio Queue</h2>
          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono border border-slate-700">
            {queue.length}
          </span>
        </div>

        {/* Project Name Input */}
        <div className="flex-1 sm:max-w-xs">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Project Name"
            className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500 transition-all focus:border-blue-500/50"
          />
        </div>
        
        <div className="flex gap-2 self-end sm:self-auto">
           {/* Clear All Button */}
           <button
            onClick={onClearQueue}
            disabled={!hasItems || isProcessing}
            className="flex items-center justify-center w-8 h-8 bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded border border-slate-700 hover:border-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Clear All"
          >
            <Trash2 size={16} />
          </button>

           <button
            onClick={onMergeDownload}
            disabled={!hasCompletedItems}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-700/20 hover:bg-emerald-700/40 text-emerald-400 text-xs font-semibold rounded border border-emerald-800/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            title="Download merged file"
          >
            <Merge size={14} />
            Merge & Download
          </button>

          {isProcessing ? (
             <button
              onClick={onStop}
              disabled={isStopping}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                isStopping 
                ? 'bg-red-900/20 text-red-500 border-red-900/50 cursor-not-allowed'
                : 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border-red-800/50 animate-pulse'
              }`}
            >
              {isStopping ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} className="fill-current" />}
              {isStopping ? 'Stopping...' : 'Stop'}
            </button>
          ) : (
             <button
              onClick={onGenerateAll}
              disabled={!hasItems}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold rounded border border-blue-800/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Play size={14} />
              Generate All
            </button>
          )}
         
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
        {queue.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
            <FileAudio size={48} className="opacity-20" />
            <p className="text-sm">Queue is empty. Add text from the left panel.</p>
          </div>
        )}

        {queue.map((item, index) => (
          <div 
            key={item.id} 
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 transition-all hover:border-slate-700 group relative"
          >
            {/* Header: ID and Status */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                 <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                 {item.status === TTSStatus.COMPLETED && (
                    <span className="text-[10px] bg-green-900/30 text-green-400 border border-green-900 px-1.5 rounded">DONE</span>
                 )}
                 {item.status === TTSStatus.GENERATING && (
                    <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-900 px-1.5 rounded flex items-center gap-1">
                      <Loader2 size={8} className="animate-spin" /> PROCESSING
                    </span>
                 )}
                  {item.status === TTSStatus.ERROR && (
                    <span className="text-[10px] bg-red-900/30 text-red-400 border border-red-900 px-1.5 rounded">ERROR</span>
                 )}
              </div>
              <div className="flex gap-1">
                 {item.status === TTSStatus.COMPLETED && (
                   <button 
                     onClick={() => onDownloadItem(item)}
                     className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                     title="Download Segment"
                   >
                     <Download size={16} />
                   </button>
                 )}
                 <button 
                   onClick={() => onRemoveItem(item.id)}
                   className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                   title="Remove"
                 >
                   <Trash2 size={16} />
                 </button>
              </div>
            </div>

            {/* Content Preview */}
            <p className="text-slate-300 text-sm leading-relaxed mb-4 line-clamp-3 font-serif pl-1 border-l-2 border-slate-800">
              {item.text}
            </p>

            {/* Error Message */}
            {item.status === TTSStatus.ERROR && item.errorMessage && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/30 p-2 rounded border border-red-900/50 mb-3">
                <AlertCircle size={14} />
                {item.errorMessage}
              </div>
            )}

            {/* Audio Player */}
            {item.status === TTSStatus.COMPLETED && item.audioUrl && (
              <div className="bg-slate-950 rounded p-2 border border-slate-800">
                <audio 
                  controls 
                  src={item.audioUrl} 
                  className="w-full h-8 block custom-audio" 
                />
              </div>
            )}
            
            {/* Meta Info */}
            <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-wide">
               <span>Voice: <span className="text-slate-400">{item.voiceName}</span></span>
               <span>Pace: <span className="text-slate-400">{item.pace}</span></span>
               {item.instructions && (
                 <span className="truncate max-w-[150px]" title={item.instructions}>Style: <span className="text-slate-400">{item.instructions}</span></span>
               )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default QueuePanel;
