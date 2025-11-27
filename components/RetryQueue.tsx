import React from 'react';
import { ReplicationTask } from '../types';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface RetryQueueProps {
  queue: ReplicationTask[];
  onForceRetry: () => void;
}

const RetryQueue: React.FC<RetryQueueProps> = ({ queue, onForceRetry }) => {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-slate-300">
          <RefreshCw size={16} className={queue.length > 0 ? "animate-spin text-amber-500" : ""} />
          <h3 className="text-sm font-semibold uppercase">Retry Queue</h3>
        </div>
        {queue.length > 0 && (
          <button 
            onClick={onForceRetry}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
          >
            Force Sync
          </button>
        )}
      </div>

      <div className="space-y-2 min-h-[100px]">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm italic py-4">
            <span>No pending replications</span>
          </div>
        ) : (
          queue.map(task => (
            <div key={task.id} className="bg-slate-800/50 border border-amber-900/30 p-2 rounded flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="font-mono text-amber-200">{task.key}</span>
                <span className="text-slate-500 text-xs">→</span>
                <span className="font-mono text-slate-300">{task.value}</span>
              </div>
              <div className="text-xs text-slate-500">
                Attempt #{task.attempts}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RetryQueue;