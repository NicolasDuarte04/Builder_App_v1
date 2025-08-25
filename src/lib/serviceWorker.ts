// Service Worker registration and management utilities

interface ServiceWorkerMessage {
  type: 'SKIP_WAITING' | 'CLEAR_CACHE' | 'GET_VERSION';
  data?: any;
}

class ServiceWorkerManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isUpdateAvailable = false;
  private updateCallbacks: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW] Service Worker not supported');
      return;
    }

    try {
      await this.register();
      this.setupEventListeners();
    } catch (error) {
      console.error('[SW] Failed to initialize service worker:', error);
    }
  }

  private async register(): Promise<void> {
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      console.log('[SW] Service Worker registered successfully:', this.swRegistration);

      // Check for updates immediately
      await this.checkForUpdates();
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.swRegistration) return;

    // Listen for service worker updates
    this.swRegistration.addEventListener('updatefound', () => {
      console.log('[SW] Update found');
      const newWorker = this.swRegistration!.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available');
            this.isUpdateAvailable = true;
            this.notifyUpdateCallbacks();
          }
        });
      }
    });

    // Listen for controller change (new service worker takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] New service worker activated');
      this.isUpdateAvailable = false;
      
      // Reload the page to use the new service worker
      if (this.shouldReloadForUpdate()) {
        window.location.reload();
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      await this.swRegistration.update();
    } catch (error) {
      console.error('[SW] Failed to check for updates:', error);
    }
  }

  private handleServiceWorkerMessage(message: ServiceWorkerMessage) {
    switch (message.type) {
      case 'GET_VERSION':
        // Service worker is asking for app version
        this.sendMessageToServiceWorker({
          type: 'GET_VERSION',
          data: {
            version: process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
            timestamp: Date.now(),
          },
        });
        break;
      default:
        console.log('[SW] Unknown message from service worker:', message);
    }
  }

  private sendMessageToServiceWorker(message: ServiceWorkerMessage) {
    if (this.swRegistration?.active) {
      this.swRegistration.active.postMessage(message);
    }
  }

  private shouldReloadForUpdate(): boolean {
    // Only reload if we're not in the middle of a form submission or important action
    const currentPath = window.location.pathname;
    const isImportantPage = currentPath.includes('/assistant') || 
                           currentPath.includes('/dashboard') ||
                           currentPath.includes('/api/');
    
    // Don't reload if we're on important pages or if there are unsaved changes
    if (isImportantPage) {
      console.log('[SW] Skipping reload for important page:', currentPath);
      return false;
    }

    return true;
  }

  // Public API methods

  /**
   * Check if a service worker update is available
   */
  public isUpdateReady(): boolean {
    return this.isUpdateAvailable;
  }

  /**
   * Apply the service worker update
   */
  public async applyUpdate(): Promise<void> {
    if (!this.isUpdateAvailable || !this.swRegistration?.waiting) {
      return;
    }

    try {
      // Send skip waiting message to the waiting service worker
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait a bit for the service worker to activate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('[SW] Failed to apply update:', error);
    }
  }

  /**
   * Clear all service worker caches
   */
  public async clearCaches(): Promise<void> {
    try {
      // Send clear cache message to service worker
      this.sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
      
      // Also clear caches directly
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('[SW] All caches cleared');
    } catch (error) {
      console.error('[SW] Failed to clear caches:', error);
    }
  }

  /**
   * Register a callback to be notified when updates are available
   */
  public onUpdateAvailable(callback: () => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Remove a previously registered update callback
   */
  public offUpdateAvailable(callback: () => void): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  private notifyUpdateCallbacks(): void {
    this.updateCallbacks.forEach(callback => callback());
  }

  /**
   * Get the current service worker registration
   */
  public getRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }

  /**
   * Force check for updates
   */
  public async forceUpdateCheck(): Promise<void> {
    await this.checkForUpdates();
  }
}

// Create and export a singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Export the class for testing or custom instances
export { ServiceWorkerManager };

// Utility functions for common operations
export const registerServiceWorker = () => serviceWorkerManager;
export const isServiceWorkerUpdateReady = () => serviceWorkerManager.isUpdateReady();
export const applyServiceWorkerUpdate = () => serviceWorkerManager.applyUpdate();
export const clearServiceWorkerCaches = () => serviceWorkerManager.clearCaches();
