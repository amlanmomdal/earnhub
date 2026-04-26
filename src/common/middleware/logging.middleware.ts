import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_CONTEXT_KEY } from '../constants/app.constants';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(
    req: Request & { [REQUEST_ID_CONTEXT_KEY]?: string },
    res: Response,
    next: NextFunction,
  ) {
    const startedAt = Date.now();
    const requestId = req[REQUEST_ID_CONTEXT_KEY];

    res.on('finish', () => {
      this.logger.log(
        `[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} +${Date.now() - startedAt}ms`,
      );
    });

    next();
  }
}
