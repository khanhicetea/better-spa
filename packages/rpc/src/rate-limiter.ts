/**
 * Simple in-memory rate limiter using sliding window algorithm
 * For production, consider using Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (IP address, user ID, etc.)
   * @returns { allowed: boolean, limit: number, remaining: number, resetAt: number }
   */
  check(identifier: string): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    let entry = this.store.get(identifier);

    // If no entry or expired, create new entry
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 1,
        resetAt: now + this.windowMs,
      };
      this.store.set(identifier, entry);

      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetAt: entry.resetAt,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clear all rate limit entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Default rate limiters for different scenarios
export const authRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute for auth
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute for API
export const strictRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute for sensitive operations
