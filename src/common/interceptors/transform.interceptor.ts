import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  path: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // If the response already has the correct structure, return it as-is
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'message' in data &&
          'data' in data &&
          'path' in data &&
          'timestamp' in data
        ) {
          return data;
        }

        // If data has a 'message' field, extract it
        let message = 'Success';
        let responseData = data;

        if (data && typeof data === 'object' && 'message' in data) {
          message = data.message;
          // Remove message from data and use the rest as data
          const { message: _, ...rest } = data;
          responseData = Object.keys(rest).length > 0 ? rest : null;
        }

        return {
          statusCode: response.statusCode,
          message,
          data: responseData,
          path: request.url,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
