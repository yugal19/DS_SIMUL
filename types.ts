export interface StoreItem {
  key: string;
  value: string;
  timestamp: number;
  version: number;
}

export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

export enum LogType {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  WAL = 'WAL'
}

export interface LogEntry {
  id: string;
  timestamp: number;
  node: 'PRIMARY' | 'REPLICA' | 'CLIENT' | 'SYSTEM';
  type: LogType;
  message: string;
  details?: any;
}

export interface ReplicationTask {
  id: string;
  key: string;
  value: string;
  version: number;
  attempts: number;
  lastAttempt: number;
}

export interface WalEntry {
  id: string;
  key: string;
  value: string;
  version: number;
  timestamp: number;
}

export interface SystemState {
  primary: Record<string, StoreItem>;
  replica: Record<string, StoreItem>;
  replicaStatus: NodeStatus;
  retryQueue: ReplicationTask[];
  wal: LogEntry[];
  logs: LogEntry[];
}