import { proxyRequest } from "@/lib/axios/proxy-request";

export async function POST(request: Request) {
  return proxyRequest(request, "/api/spaces/memberships/onboarding");
}
