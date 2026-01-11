/**
 * Local Job Queue Manager
 * 使用 chrome.storage.local 儲存待執行的 jobs
 */

export class JobQueue {
  constructor() {
    this.STORAGE_KEY = 'jobQueue';
  }

  async add(job) {
    const queue = await this.getAll();
    queue.push({
      ...job,
      addedAt: new Date().toISOString(),
      status: 'pending'
    });
    await this.save(queue);
    console.log(`[JobQueue] Added job: ${job.jobId}`);
  }

  async get(jobId) {
    const queue = await this.getAll();
    return queue.find(job => job.jobId === jobId);
  }

  async getAll() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || [];
  }

  async updateStatus(jobId, statusData) {
    const queue = await this.getAll();
    const job = queue.find(j => j.jobId === jobId);

    if (job) {
      Object.assign(job, {
        status: statusData.status,
        postUrl: statusData.postUrl,
        error: statusData.error,
        completedAt: statusData.completedAt,
        executionTime: statusData.executionTime
      });
      await this.save(queue);
      console.log(`[JobQueue] Updated job ${jobId}: ${statusData.status}`);
    }
  }

  async remove(jobId) {
    const queue = await this.getAll();
    const filtered = queue.filter(job => job.jobId !== jobId);
    await this.save(filtered);
    console.log(`[JobQueue] Removed job: ${jobId}`);
  }

  async clear() {
    await this.save([]);
    console.log('[JobQueue] Cleared all jobs');
  }

  async size() {
    const queue = await this.getAll();
    return queue.length;
  }

  async getPending() {
    const queue = await this.getAll();
    return queue.filter(job => job.status === 'pending');
  }

  async getCompleted() {
    const queue = await this.getAll();
    return queue.filter(job => job.status === 'completed');
  }

  async getFailed() {
    const queue = await this.getAll();
    return queue.filter(job => job.status === 'failed');
  }

  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) {
    // 清除超過 maxAge 的已完成/失敗任務
    const queue = await this.getAll();
    const now = Date.now();

    const filtered = queue.filter(job => {
      if (job.status === 'pending') return true;

      const completedAt = new Date(job.completedAt || job.addedAt).getTime();
      return (now - completedAt) < maxAge;
    });

    if (filtered.length < queue.length) {
      await this.save(filtered);
      console.log(`[JobQueue] Cleaned up ${queue.length - filtered.length} old jobs`);
    }
  }

  async save(queue) {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: queue });
  }
}
