import React from 'react';
import { StoreItem } from '../types';
import { Database } from 'lucide-react';

interface StoreViewerProps {
  title: string;
  data: Record<string, StoreItem>;
  highlightKeys?: string[];
}

const StoreViewer: React.FC<StoreViewerProps> = ({ title, data, highlightKeys = [] }) => {
  const keys = Object.keys(data);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 h-full">
      <div className="flex items-center gap-2 mb-4 text-slate-300 border-b border-slate-800 pb-2">
        <Database size={16} />
        <h3 className="text-sm font-semibold uppercase">{title}</h3>
        <span className="ml-auto text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">
          {keys.length} Keys
        </span>
      </div>
      
      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm italic">
            Store is empty
          </div>
        ) : (
          keys.map(key => (
            <div 
              key={key} 
              className={`p-2 rounded border text-sm flex justify-between items-center transition-colors ${
                highlightKeys.includes(key) 
                  ? 'bg-amber-900/20 border-amber-700 text-amber-100' 
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <span className="font-mono font-bold text-sky-400">{key}</span>
              <div className="flex flex-col items-end">
                <span className="font-mono">{data[key].value}</span>
                <span className="text-[10px] text-slate-500">v{data[key].version}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StoreViewer;