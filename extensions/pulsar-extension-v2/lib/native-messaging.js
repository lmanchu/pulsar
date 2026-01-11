/**
 * Native Messaging Helper
 * 封裝 Chrome Native Messaging API
 */

export class NativeMessaging {
  constructor(hostName) {
    this.hostName = hostName;
    this.port = null;
    this.messageHandlers = new Map();
    this.requestCallbacks = new Map();
  }

  connect() {
    if (this.port) {
      console.warn('[NativeMessaging] Already connected');
      return;
    }

    this.port = chrome.runtime.connectNative(this.hostName);

    this.port.onMessage.addListener((message) => {
      this.handleMessage(message);
    });

    this.port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      console.error('[NativeMessaging] Disconnected:', error);
      this.port = null;
      this.emit('disconnect', error);
    });

    console.log('[NativeMessaging] Connected to:', this.hostName);
  }

  disconnect() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
  }

  send(message) {
    if (!this.port) {
      throw new Error('Not connected to native host');
    }

    const fullMessage = {
      ...message,
      timestamp: Date.now(),
      version: '1.0.0'
    };

    this.port.postMessage(fullMessage);
  }

  async sendRequest(message, timeout = 10000) {
    const requestId = message.requestId || this.generateRequestId();
    message.requestId = requestId;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.requestCallbacks.delete(requestId);
        reject(new Error(`Request timeout: ${message.type}`));
      }, timeout);

      this.requestCallbacks.set(requestId, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      this.send(message);
    });
  }

  handleMessage(message) {
    // Handle request callbacks
    if (message.requestId && this.requestCallbacks.has(message.requestId)) {
      const callback = this.requestCallbacks.get(message.requestId);
      this.requestCallbacks.delete(message.requestId);
      callback(message.payload);
      return;
    }

    // Handle general messages
    this.emit(message.type, message.payload);
  }

  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);
  }

  off(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) return;

    const handlers = this.messageHandlers.get(messageType);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(messageType, payload) {
    if (!this.messageHandlers.has(messageType)) return;

    const handlers = this.messageHandlers.get(messageType);
    handlers.forEach(handler => handler(payload));
  }

  isConnected() {
    return this.port !== null;
  }

  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
