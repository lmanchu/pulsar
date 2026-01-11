/**
 * Account Manager - 安全地管理使用者帳號憑證
 */

import Database from 'better-sqlite3';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import path from 'path';
import os from 'os';

interface StoredAccount {
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  authMethod: 'credentials' | 'cookies';
  encryptedData: string;
  iv: string;
  authTag: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

export class AccountManager {
  private db: Database.Database;
  private encryptionKey: Buffer;

  constructor() {
    const dbPath = path.join(os.homedir(), '.pulsar', 'accounts.db');
    this.db = new Database(dbPath);
    this.initDatabase();

    // Derive encryption key from system
    // In production, use system keychain (keytar library)
    const password = process.env.PULSAR_MASTER_KEY || 'default-key-change-me';
    this.encryptionKey = scryptSync(password, 'pulsar-salt', 32);
  }

  private initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        displayName TEXT,
        authMethod TEXT NOT NULL,
        encryptedData TEXT NOT NULL,
        iv TEXT NOT NULL,
        authTag TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        lastUsed TEXT,
        UNIQUE(platform, username)
      )
    `);
  }

  async addAccount(payload: any): Promise<string> {
    const accountId = `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare data to encrypt
    const dataToEncrypt = payload.authMethod === 'credentials'
      ? payload.credentials
      : { cookies: payload.cookies };

    // Encrypt credentials/cookies
    const { encrypted, iv, authTag } = this.encrypt(dataToEncrypt);

    // Store in database
    const stmt = this.db.prepare(`
      INSERT INTO accounts (
        id, platform, username, displayName, authMethod,
        encryptedData, iv, authTag, isActive, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    stmt.run(
      accountId,
      payload.platform,
      payload.authMethod === 'credentials' ? payload.credentials.username : 'session',
      payload.displayName || payload.credentials?.username,
      payload.authMethod,
      encrypted,
      iv,
      authTag,
      new Date().toISOString()
    );

    return accountId;
  }

  async listAccounts(platform?: string): Promise<any[]> {
    const query = platform
      ? 'SELECT * FROM accounts WHERE platform = ? AND isActive = 1'
      : 'SELECT * FROM accounts WHERE isActive = 1';

    const stmt = platform
      ? this.db.prepare(query).bind(platform)
      : this.db.prepare(query);

    const rows = stmt.all() as StoredAccount[];

    return rows.map(row => ({
      id: row.id,
      platform: row.platform,
      username: row.username,
      displayName: row.displayName,
      isActive: Boolean(row.isActive),
      isLoggedIn: true, // Would check session validity
      lastUsed: row.lastUsed
    }));
  }

  async getAccount(accountId: string): Promise<{ authMethod: string; credentials?: any; cookies?: any }> {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE id = ?');
    const row = stmt.get(accountId) as StoredAccount | undefined;

    if (!row) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Decrypt data
    const decrypted = this.decrypt({
      encrypted: row.encryptedData,
      iv: row.iv,
      authTag: row.authTag
    });

    // Update last used
    this.db.prepare('UPDATE accounts SET lastUsed = ? WHERE id = ?')
      .run(new Date().toISOString(), accountId);

    if (row.authMethod === 'credentials') {
      return {
        authMethod: 'credentials',
        credentials: decrypted
      };
    } else {
      return {
        authMethod: 'cookies',
        cookies: decrypted.cookies
      };
    }
  }

  async removeAccount(accountId: string): Promise<void> {
    // Soft delete
    this.db.prepare('UPDATE accounts SET isActive = 0 WHERE id = ?')
      .run(accountId);
  }

  private encrypt(data: any): { encrypted: string; iv: string; authTag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  private decrypt(data: { encrypted: string; iv: string; authTag: string }): any {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(data.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  close() {
    this.db.close();
  }
}
