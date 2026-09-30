import { proxyRequest } from "@/lib/axios/proxy-request";

export function POST(request: Request): Promise<Response> {
  return proxyRequest(request, "/api/spaces/invite-validations");
}
