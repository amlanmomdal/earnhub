import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  REQUEST_ID_CONTEXT_KEY,
  REQUEST_ID_HEADER,
} from '../constants/app.constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request & { [REQUEST_ID_CONTEXT_KEY]?: string },
    res: Response,
    next: NextFunction,
  ) {
    const requestId = (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? uuid();
    req[REQUEST_ID_CONTEXT_KEY] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
