import { toNodeHandler } from "better-auth/node";
import type { AuthService } from "./auth.service";

export function createAuthHandler(authService: AuthService) {
  return toNodeHandler(authService.auth);
}
