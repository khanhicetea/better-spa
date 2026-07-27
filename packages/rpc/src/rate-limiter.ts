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
    this.cleanupInterval.unref?.();
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

export class InMemoryRateLimitService {
  private limiters = {
    api: new RateLimiter(100, 60_000),
    admin: new RateLimiter(10, 60_000),
    upload: new RateLimiter(20, 60_000),
  };

  check(policy: keyof typeof this.limiters, identifier: string) {
    const result = this.limiters[policy].check(`${policy}:${identifier}`);
    return {
      allowed: result.allowed,
      retryAfter: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
    };
  }

  destroy(): void {
    Object.values(this.limiters).forEach((limiter) => limiter.destroy());
  }
}

export const ingressRateLimitService = {
  check() {
    return { allowed: true, retryAfter: 0 };
  },
};
