#!/usr/bin/env node
/**
 * Pulsar Native Messaging Host
 *
 * Chrome Native Messaging 使用 STDIO 通訊：
 * - STDIN: 接收來自 Extension 的訊息
 * - STDOUT: 發送訊息給 Extension
 * - STDERR: 錯誤日誌
 *
 * 訊息格式：
 * [4-byte length][JSON message]
 */

import { JobExecutor } from '../automation/job-executor.js';
import { AccountManager } from '../security/account-manager.js';
import { JobQueue } from '../queue/job-queue.js';
import { Protocol } from './protocol.js';

class NativeMessagingHost {
  private jobExecutor: JobExecutor;
  private accountManager: AccountManager;
  private jobQueue: JobQueue;
  private running = false;

  constructor() {
    this.jobExecutor = new JobExecutor();
    this.accountManager = new AccountManager();
    this.jobQueue = new JobQueue();

    this.setupErrorHandlers();
  }

  async start() {
    this.log('Native Messaging Host starting...');
    this.running = true;

    // Read from STDIN
    process.stdin.on('readable', () => {
      this.readMessage();
    });

    process.stdin.on('end', () => {
      this.log('Extension disconnected');
      this.stop();
    });

    this.log('Native Messaging Host ready');
  }

  stop() {
    this.running = false;
    this.log('Native Messaging Host stopped');
    process.exit(0);
  }

  private readMessage() {
    // Read 4-byte length prefix
    const lengthBuffer = process.stdin.read(4);
    if (!lengthBuffer) return;

    const messageLength = lengthBuffer.readUInt32LE(0);

    // Read message
    const messageBuffer = process.stdin.read(messageLength);
    if (!messageBuffer) return;

    try {
      const message = JSON.parse(messageBuffer.toString('utf-8'));
      this.handleMessage(message);
    } catch (error) {
      this.error('Failed to parse message:', error);
    }
  }

  private async handleMessage(message: any) {
    this.log(`Received: ${message.type}`);

    try {
      const response = await this.processMessage(message);
      if (response) {
        this.sendMessage(response);
      }
    } catch (error) {
      this.error(`Error handling ${message.type}:`, error);

      // Send error response
      this.sendMessage({
        type: 'error',
        requestId: message.requestId,
        payload: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  private async processMessage(message: any): Promise<any> {
    const { type, requestId, payload } = message;

    switch (type) {
      case 'execute_job':
        return await this.handleExecuteJob(requestId, payload);

      case 'cancel_job':
        return await this.handleCancelJob(requestId, payload);

      case 'get_accounts':
        return await this.handleGetAccounts(requestId, payload);

      case 'add_account':
        return await this.handleAddAccount(requestId, payload);

      case 'remove_account':
        return await this.handleRemoveAccount(requestId, payload);

      case 'get_status':
        return await this.handleGetStatus(requestId);

      case 'heartbeat':
        return this.handleHeartbeat(requestId);

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  private async handleExecuteJob(requestId: string, payload: any) {
    this.log(`Executing job: ${payload.jobId}`);

    // Send processing status
    this.sendMessage({
      type: 'job_status',
      requestId,
      payload: {
        jobId: payload.jobId,
        status: 'processing',
        message: 'Starting job execution...'
      }
    });

    // Execute job asynchronously
    this.jobExecutor.execute(payload)
      .then((result) => {
        this.sendMessage({
          type: 'job_status',
          requestId,
          payload: {
            jobId: payload.jobId,
            status: 'completed',
            postUrl: result.postUrl,
            completedAt: new Date().toISOString(),
            executionTime: result.executionTime
          }
        });
      })
      .catch((error) => {
        this.sendMessage({
          type: 'job_status',
          requestId,
          payload: {
            jobId: payload.jobId,
            status: 'failed',
            error: {
              code: error.code || 'EXECUTION_ERROR',
              message: error.message
            }
          }
        });
      });

    return null; // No immediate response
  }

  private async handleCancelJob(requestId: string, payload: any) {
    await this.jobExecutor.cancel(payload.jobId);
    return {
      type: 'job_cancelled',
      requestId,
      payload: {
        jobId: payload.jobId,
        success: true
      }
    };
  }

  private async handleGetAccounts(requestId: string, payload: any) {
    const accounts = await this.accountManager.listAccounts(payload.platform);
    return {
      type: 'accounts_list',
      requestId,
      payload: { accounts }
    };
  }

  private async handleAddAccount(requestId: string, payload: any) {
    try {
      const accountId = await this.accountManager.addAccount(payload);
      return {
        type: 'account_added',
        requestId,
        payload: {
          success: true,
          accountId
        }
      };
    } catch (error) {
      return {
        type: 'account_added',
        requestId,
        payload: {
          success: false,
          error: {
            code: 'ADD_ACCOUNT_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      };
    }
  }

  private async handleRemoveAccount(requestId: string, payload: any) {
    await this.accountManager.removeAccount(payload.accountId);
    return {
      type: 'account_removed',
      requestId,
      payload: {
        success: true
      }
    };
  }

  private async handleGetStatus(requestId: string) {
    const stats = await this.jobQueue.getStats();

    return {
      type: 'status_report',
      requestId,
      payload: {
        version: '2.0.0',
        isRunning: this.running,
        queueSize: stats.pending,
        activeJobs: stats.processing,
        browserInstances: await this.jobExecutor.getBrowserCount(),
        stats: {
          totalJobsToday: stats.totalToday,
          successfulJobsToday: stats.successToday,
          failedJobsToday: stats.failedToday
        }
      }
    };
  }

  private handleHeartbeat(requestId: string) {
    return {
      type: 'heartbeat_ack',
      requestId,
      payload: {
        timestamp: Date.now()
      }
    };
  }

  private sendMessage(message: any) {
    const json = JSON.stringify({
      ...message,
      timestamp: Date.now(),
      version: '1.0.0'
    });

    const buffer = Buffer.from(json, 'utf-8');
    const length = Buffer.alloc(4);
    length.writeUInt32LE(buffer.length, 0);

    // Write to STDOUT
    process.stdout.write(length);
    process.stdout.write(buffer);

    this.log(`Sent: ${message.type}`);
  }

  private setupErrorHandlers() {
    process.on('uncaughtException', (error) => {
      this.error('Uncaught exception:', error);
      this.stop();
    });

    process.on('unhandledRejection', (reason) => {
      this.error('Unhandled rejection:', reason);
    });
  }

  private log(message: string, ...args: any[]) {
    // STDERR for logging (STDOUT is reserved for native messaging)
    console.error(`[Native Host] ${message}`, ...args);
  }

  private error(message: string, error: any) {
    console.error(`[Native Host ERROR] ${message}`, error);
  }
}

// Start host
const host = new NativeMessagingHost();
host.start();
