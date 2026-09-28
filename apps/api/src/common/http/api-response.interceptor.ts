import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs";
import type { ApiResponse } from "./api-response";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => ({
        ok: true as const,
        data: data ?? null,
        error: [],
        message: "Request completed successfully",
      })),
    );
  }
}
