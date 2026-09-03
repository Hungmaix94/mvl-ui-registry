/**
 * Service Factory for lazy construction and dependency injection
 * Provides a simple DI container for API services
 */
export class ServiceFactory {
  private registry = new Map<string, () => any>()
  private cache = new Map<string, any>()

  /**
   * Register a service factory function
   */
  register<T>(key: string, factory: () => T): void {
    this.registry.set(key, factory)
  }

  /**
   * Get a service instance (lazy construction with caching)
   */
  get<T>(key: string): T {
    if (!this.cache.has(key)) {
      const factory = this.registry.get(key)
      if (!factory) {
        throw new Error(`Service ${key} not registered`)
      }
      this.cache.set(key, factory())
    }
    return this.cache.get(key)
  }

  /**
   * Clear cache (useful for testing)
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Check if service is registered
   */
  has(key: string): boolean {
    return this.registry.has(key)
  }
}

export const serviceFactory = new ServiceFactory()
