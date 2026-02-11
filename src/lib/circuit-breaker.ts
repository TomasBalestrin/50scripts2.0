/**
 * Circuit breaker pattern for external API calls.
 * Stops calling APIs that are repeatedly failing.
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private failures = 0;
  private lastFailure: number | null = null;
  private state: CircuitState = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.lastFailure && Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN — service temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailure = null;
  }
}

// Singleton instances for different services
export const aiCircuitBreaker = new CircuitBreaker(3, 60000);
