import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      map((data) => {
        const payload = data as Record<string, unknown> | null;
        const isPaginated =
          payload && typeof payload === 'object' && 'items' in payload && 'meta' in payload;

        return {
          success: true,
          message: response.statusCode && response.statusCode >= 201 ? 'Created' : 'Success',
          data: (isPaginated ? payload.items : data) as T,
          meta: isPaginated ? (payload.meta as Record<string, unknown>) : undefined,
        } as ApiResponse<T>;
      }),
    );
  }
}
