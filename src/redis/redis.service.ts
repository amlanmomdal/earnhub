import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private isReady = false;
  private hasLoggedUnavailable = false;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(this.configService.get<string>('redis.url') ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.hasLoggedUnavailable = false;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (error: Error) => {
      this.isReady = false;
      this.logUnavailable(error);
    });

    this.client.on('end', () => {
      this.isReady = false;
    });

    this.client.on('close', () => {
      this.isReady = false;
    });

    void this.connect();
  }

  getClient() {
    return this.client;
  }

  private logUnavailable(error: Error) {
    if (this.hasLoggedUnavailable) {
      return;
    }

    this.hasLoggedUnavailable = true;
    this.logger.warn(
      `Redis unavailable. Cache, blacklist, and rate limiting are running in degraded mode: ${error.message}`,
    );
  }

  private async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      this.isReady = false;
      this.logUnavailable(error as Error);
    }
  }

  private async ensureReady(): Promise<boolean> {
    if (this.isReady) {
      return true;
    }

    if (this.client.status === 'wait') {
      await this.connect();
    }

    return this.isReady;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!(await this.ensureReady())) {
      return null;
    }

    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!(await this.ensureReady())) {
      return;
    }

    const payload = JSON.stringify(value);
    if (ttl) {
      await this.client.set(key, payload, 'EX', ttl);
      return;
    }

    await this.client.set(key, payload);
  }

  async del(key: string): Promise<void> {
    if (!(await this.ensureReady())) {
      return;
    }

    await this.client.del(key);
  }

  async incrementWithExpiry(key: string, ttl: number): Promise<number | null> {
    if (!(await this.ensureReady())) {
      return null;
    }

    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, ttl);
    }

    return count;
  }

  async addToBlacklist(tokenId: string, ttl: number): Promise<void> {
    await this.set(`blacklist:${tokenId}`, { revoked: true }, ttl);
  }

  async isBlacklisted(tokenId: string): Promise<boolean> {
    return Boolean(await this.get(`blacklist:${tokenId}`));
  }

  async setIfNotExists(key: string, value: unknown, ttl: number): Promise<boolean> {
    if (!(await this.ensureReady())) {
      return false;
    }

    const payload = JSON.stringify(value);
    const result = await this.client.set(key, payload, 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async onModuleDestroy() {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
