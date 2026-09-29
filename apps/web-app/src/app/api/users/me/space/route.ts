import { proxyRequest } from "@/lib/axios/proxy-request";

export async function GET(request: Request): Promise<Response> {
  return proxyRequest(request, "/api/users/me/space");
}
