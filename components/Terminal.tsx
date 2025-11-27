import React, { useEffect, useRef } from 'react';
import { LogEntry, LogType } from '../types';
import { Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  title: string;
  logs: LogEntry[];
  heightClass?: string;
  nodeColor?: string;
}

const Terminal: React.FC<TerminalProps> = ({ title, logs, heightClass = "h-64", nodeColor = "text-blue-400" }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogType) => {
    switch (type) {
      case LogType.ERROR: return 'text-red-500';
      case LogType.WARN: return 'text-yellow-500';
      case LogType.SUCCESS: return 'text-green-500';
      case LogType.WAL: return 'text-purple-400';
      default: return 'text-slate-300';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString([], { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <div className={`bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col ${heightClass} shadow-xl`}>
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
        <TerminalIcon size={16} className={nodeColor} />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        <div className="flex-1" />
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-1 terminal-scroll"
      >
        {logs.length === 0 && <div className="text-slate-600 italic opacity-50">Waiting for input...</div>}
        {logs.map((log) => (
          <div key={log.id} className="break-all">
            <span className="text-slate-600 mr-2">
              [{formatTime(log.timestamp)}]
            </span>
            <span className={`font-medium ${getLogColor(log.type)}`}>
              {log.type === LogType.WAL ? '[WAL] ' : ''}
              {log.type === LogType.ERROR ? 'ERR ' : ''}
              &gt; {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal;