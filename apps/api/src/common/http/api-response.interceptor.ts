import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs";
import { API_SUCCESS_MESSAGE, type ApiResponse, createApiError } from "./api-response";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown): ApiResponse<unknown> => {
        const { statusCode } = context.switchToHttp().getResponse<{ statusCode: number }>();
        if (statusCode >= 400) {
          const error = createApiError(statusCode);
          return {
            ok: false,
            data: data ?? null,
            error: [error],
            message: error.message,
          };
        }
        return { ok: true, data: data ?? null, error: [], message: API_SUCCESS_MESSAGE };
      }),
    );
  }
}
