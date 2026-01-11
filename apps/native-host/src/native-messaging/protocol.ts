/**
 * Native Messaging Protocol Types
 */

export const PROTOCOL_VERSION = '1.0.0';

export interface Message {
  type: string;
  requestId?: string;
  payload: any;
  timestamp?: number;
  version?: string;
}

export interface ExecuteJobPayload {
  jobId: string;
  platform: 'twitter' | 'linkedin' | 'threads';
  action: 'post' | 'reply' | 'comment' | 'like' | 'follow';
  content?: string;
  targetUrl?: string;
  accountId: string;
  metadata?: {
    personaId?: string;
    generatedAt?: string;
    scheduledAt?: string;
    retryCount?: number;
  };
}

export interface JobStatusPayload {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  postUrl?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  completedAt?: string;
  executionTime?: number;
}

export interface Account {
  id: string;
  platform: 'twitter' | 'linkedin' | 'threads';
  username: string;
  displayName?: string;
  isActive: boolean;
  isLoggedIn: boolean;
  lastUsed?: string;
  avatar?: string;
}

export interface AddAccountPayload {
  platform: 'twitter' | 'linkedin' | 'threads';
  authMethod: 'credentials' | 'cookies';
  credentials?: {
    username: string;
    password: string;
    email?: string;
  };
  cookies?: any[];
}

export interface StatusReport {
  version: string;
  isRunning: boolean;
  queueSize: number;
  activeJobs: number;
  browserInstances: number;
  lastError?: {
    timestamp: string;
    message: string;
  };
  stats: {
    totalJobsToday: number;
    successfulJobsToday: number;
    failedJobsToday: number;
  };
}

export class Protocol {
  static validate(message: any): boolean {
    if (!message.type) {
      throw new Error('Message missing type field');
    }

    if (message.version && message.version !== PROTOCOL_VERSION) {
      throw new Error(`Protocol version mismatch: ${message.version} != ${PROTOCOL_VERSION}`);
    }

    // Check timestamp is recent (within 60 seconds)
    if (message.timestamp) {
      const now = Date.now();
      const age = now - message.timestamp;

      if (age > 60000 || age < -60000) {
        throw new Error('Message timestamp out of acceptable range');
      }
    }

    return true;
  }

  static createMessage(type: string, payload: any, requestId?: string): Message {
    return {
      type,
      requestId,
      payload,
      timestamp: Date.now(),
      version: PROTOCOL_VERSION
    };
  }
}
