import React from 'react';
import { WalEntry } from '../types';
import { FileText, ArrowDown, HardDrive } from 'lucide-react';

interface WalViewerProps {
  entries: WalEntry[];
}

const WalViewer: React.FC<WalViewerProps> = ({ entries }) => {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 relative overflow-hidden">
      {/* Background decoration representing disk */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <HardDrive size={64} />
      </div>

      <div className="flex items-center gap-2 mb-4 text-slate-300 border-b border-slate-800 pb-2 relative z-10">
        <FileText size={16} className="text-purple-400" />
        <h3 className="text-sm font-semibold uppercase">Replica WAL (Disk)</h3>
        <span className="ml-auto text-xs bg-purple-900/30 text-purple-200 px-2 py-0.5 rounded border border-purple-500/30">
          {entries.length} Pending
        </span>
      </div>

      <div className="space-y-2 min-h-[80px] relative z-10">
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm italic py-4">
            <span>Disk Log Synced</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry, index) => (
              <div key={entry.id} className="relative group">
                <div className="bg-slate-950 border border-purple-500/30 p-2 rounded flex justify-between items-center text-sm shadow-sm relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-500">OP:SET</span>
                    <span className="font-mono text-slate-200 font-bold">{entry.key}</span>
                    <span className="text-slate-600 text-xs">=</span>
                    <span className="font-mono text-slate-400 truncate max-w-[80px]">{entry.value}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    v{entry.version}
                  </div>
                </div>
                {/* Visual connector line */}
                {index < entries.length - 1 && (
                  <div className="absolute left-1/2 -bottom-3 w-0.5 h-3 bg-slate-700 -translate-x-1/2 z-0"></div>
                )}
              </div>
            ))}
            <div className="flex justify-center mt-1">
               <div className="flex items-center gap-1 text-[10px] text-purple-400/70 animate-pulse">
                  <ArrowDown size={10} />
                  <span>Flushing to MemTable...</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalViewer;