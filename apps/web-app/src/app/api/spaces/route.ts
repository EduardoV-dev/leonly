import "server-only";
import { proxyRequest } from "@/lib/axios/proxy-request";

export async function POST(request: Request): Promise<Response> {
  return proxyRequest(request, "/api/spaces");
}
