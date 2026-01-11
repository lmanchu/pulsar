/**
 * Job Queue - SQLite-based local job queue
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

interface Job {
  id: string;
  jobId: string;
  platform: string;
  action: string;
  status: string;
  payload: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export class JobQueue {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(os.homedir(), '.pulsar', 'jobs.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId TEXT UNIQUE NOT NULL,
        platform TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        completedAt TEXT,
        error TEXT
      )
    `);
  }

  async add(jobData: any): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (jobId, platform, action, status, payload, createdAt)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `);

    stmt.run(
      jobData.jobId,
      jobData.platform,
      jobData.action,
      JSON.stringify(jobData),
      new Date().toISOString()
    );
  }

  async updateStatus(jobId: string, status: string, error?: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE jobs
      SET status = ?, completedAt = ?, error = ?
      WHERE jobId = ?
    `);

    stmt.run(
      status,
      status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      error,
      jobId
    );
  }

  async getStats(): Promise<{
    pending: number;
    processing: number;
    totalToday: number;
    successToday: number;
    failedToday: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    const pending = this.db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'pending'")
      .get() as { count: number };

    const processing = this.db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'processing'")
      .get() as { count: number };

    const totalToday = this.db.prepare(`
      SELECT COUNT(*) as count FROM jobs
      WHERE DATE(createdAt) = ?
    `).get(today) as { count: number };

    const successToday = this.db.prepare(`
      SELECT COUNT(*) as count FROM jobs
      WHERE DATE(completedAt) = ? AND status = 'completed'
    `).get(today) as { count: number };

    const failedToday = this.db.prepare(`
      SELECT COUNT(*) as count FROM jobs
      WHERE DATE(completedAt) = ? AND status = 'failed'
    `).get(today) as { count: number };

    return {
      pending: pending.count,
      processing: processing.count,
      totalToday: totalToday.count,
      successToday: successToday.count,
      failedToday: failedToday.count
    };
  }

  close() {
    this.db.close();
  }
}
