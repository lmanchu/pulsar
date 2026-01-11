/**
 * Job Executor - Puppeteer Automation
 */

import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import { TwitterAutomation } from './twitter.js';
import { LinkedInAutomation } from './linkedin.js';
import { ThreadsAutomation } from './threads.js';

const puppeteer = puppeteerExtra as any;
puppeteer.use(StealthPlugin());

interface BrowserInstance {
  browser: Browser;
  page: Page;
  inUse: boolean;
  createdAt: Date;
}

export class JobExecutor {
  private browserPool: BrowserInstance[] = [];
  private maxPoolSize = 3;
  private runningJobs: Map<string, Promise<any>> = new Map();

  async execute(jobData: any): Promise<{ postUrl: string; executionTime: number }> {
    const startTime = Date.now();

    try {
      const { browser, page, release } = await this.acquireBrowser();

      try {
        let postUrl = '';

        // Execute based on platform
        switch (jobData.platform) {
          case 'twitter':
            postUrl = await this.executeTwitter(page, jobData);
            break;

          case 'linkedin':
            postUrl = await this.executeLinkedIn(page, jobData);
            break;

          case 'threads':
            postUrl = await this.executeThreads(page, jobData);
            break;

          default:
            throw new Error(`Unsupported platform: ${jobData.platform}`);
        }

        const executionTime = Date.now() - startTime;
        return { postUrl, executionTime };

      } finally {
        release();
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Job execution failed:`, error);
      throw error;
    }
  }

  private async executeTwitter(page: Page, jobData: any): Promise<string> {
    const twitter = new TwitterAutomation(page);

    // Login (using credentials or session cookies from AccountManager)
    const account = await this.getAccountCredentials(jobData.accountId);

    if (account.authMethod === 'cookies') {
      await twitter.loginWithCookies(account.cookies);
    } else {
      await twitter.login(account.credentials);
    }

    // Execute action
    switch (jobData.action) {
      case 'post':
        return await twitter.post(jobData.content);

      case 'reply':
        return await twitter.reply(jobData.targetUrl, jobData.content);

      default:
        throw new Error(`Unsupported Twitter action: ${jobData.action}`);
    }
  }

  private async executeLinkedIn(page: Page, jobData: any): Promise<string> {
    const linkedin = new LinkedInAutomation(page);
    const account = await this.getAccountCredentials(jobData.accountId);

    if (account.authMethod === 'cookies') {
      await linkedin.loginWithCookies(account.cookies);
    } else {
      await linkedin.login(account.credentials);
    }

    switch (jobData.action) {
      case 'post':
        return await linkedin.post(jobData.content);

      case 'comment':
        return await linkedin.comment(jobData.targetUrl, jobData.content);

      default:
        throw new Error(`Unsupported LinkedIn action: ${jobData.action}`);
    }
  }

  private async executeThreads(page: Page, jobData: any): Promise<string> {
    const threads = new ThreadsAutomation(page);
    const account = await this.getAccountCredentials(jobData.accountId);

    if (account.authMethod === 'cookies') {
      await threads.loginWithCookies(account.cookies);
    } else {
      await threads.login(account.credentials);
    }

    switch (jobData.action) {
      case 'post':
        return await threads.post(jobData.content);

      case 'reply':
        return await threads.reply(jobData.targetUrl, jobData.content);

      default:
        throw new Error(`Unsupported Threads action: ${jobData.action}`);
    }
  }

  private async acquireBrowser(): Promise<{ browser: Browser; page: Page; release: () => void }> {
    // Find available instance
    const available = this.browserPool.find(inst => !inst.inUse);

    if (available) {
      available.inUse = true;
      return {
        browser: available.browser,
        page: available.page,
        release: () => { available.inUse = false; }
      };
    }

    // Create new instance if pool not full
    if (this.browserPool.length < this.maxPoolSize) {
      const instance = await this.createBrowserInstance();
      this.browserPool.push(instance);
      return {
        browser: instance.browser,
        page: instance.page,
        release: () => { instance.inUse = false; }
      };
    }

    // Wait for available instance
    return new Promise((resolve) => {
      const check = setInterval(() => {
        const available = this.browserPool.find(inst => !inst.inUse);
        if (available) {
          clearInterval(check);
          available.inUse = true;
          resolve({
            browser: available.browser,
            page: available.page,
            release: () => { available.inUse = false; }
          });
        }
      }, 1000);
    });
  }

  private async createBrowserInstance(): Promise<BrowserInstance> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    return {
      browser,
      page,
      inUse: true,
      createdAt: new Date()
    };
  }

  private async getAccountCredentials(accountId: string): Promise<any> {
    // This would fetch from AccountManager
    // For now, return mock data
    throw new Error('getAccountCredentials not implemented - integrate with AccountManager');
  }

  async cancel(jobId: string): Promise<void> {
    // Cancel running job
    console.log(`Cancelling job: ${jobId}`);
    // Implementation depends on how jobs are tracked
  }

  async getBrowserCount(): Promise<number> {
    return this.browserPool.length;
  }

  async cleanup(): Promise<void> {
    for (const instance of this.browserPool) {
      await instance.browser.close();
    }
    this.browserPool = [];
  }
}

// Placeholder classes - would import from @pulsar/browser
class TwitterAutomation {
  constructor(private page: Page) {}
  async loginWithCookies(cookies: any[]) {}
  async login(credentials: any) {}
  async post(content: string): Promise<string> { return ''; }
  async reply(url: string, content: string): Promise<string> { return ''; }
}

class LinkedInAutomation {
  constructor(private page: Page) {}
  async loginWithCookies(cookies: any[]) {}
  async login(credentials: any) {}
  async post(content: string): Promise<string> { return ''; }
  async comment(url: string, content: string): Promise<string> { return ''; }
}

class ThreadsAutomation {
  constructor(private page: Page) {}
  async loginWithCookies(cookies: any[]) {}
  async login(credentials: any) {}
  async post(content: string): Promise<string> { return ''; }
  async reply(url: string, content: string): Promise<string> { return ''; }
}
