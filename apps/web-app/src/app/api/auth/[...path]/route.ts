import "server-only";
import type { AxiosRequestConfig } from "axios";
import { api } from "@/lib/axios/api";

const REQUEST_HEADERS_TO_STRIP = new Set([
  "accept-encoding",
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const RESPONSE_HEADERS_TO_STRIP = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "set-cookie",
  "transfer-encoding",
  "upgrade",
]);

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

function getApiPath(request: Request, path: string[]): string {
  const authPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `/api/auth/${authPath}${new URL(request.url).search}`;
}

function getSetCookies(headers: Record<string, unknown>): string[] {
  const setCookie = headers["set-cookie"];

  if (Array.isArray(setCookie)) {
    return setCookie.filter((value): value is string => typeof value === "string");
  }

  return typeof setCookie === "string" ? [setCookie] : [];
}

async function proxyAuthRequest(request: Request, context: AuthRouteContext): Promise<Response> {
  const { path } = await context.params;
  const requestHeaders = new Headers(request.headers);

  for (const header of REQUEST_HEADERS_TO_STRIP) {
    requestHeaders.delete(header);
  }

  const method = request.method.toUpperCase() as AxiosRequestConfig["method"];
  const response = await api.request<ArrayBuffer>({
    url: getApiPath(request, path),
    method,
    headers: Object.fromEntries(requestHeaders.entries()),
    data: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
    responseType: "arraybuffer",
    maxRedirects: 0,
    validateStatus: () => true,
    transformResponse: [],
  });
  const responseHeaders = new Headers();

  for (const [header, value] of Object.entries(response.headers)) {
    if (RESPONSE_HEADERS_TO_STRIP.has(header.toLowerCase()) || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        responseHeaders.append(header, String(item));
      }
    } else {
      responseHeaders.set(header, String(value));
    }
  }

  for (const setCookie of getSetCookies(response.headers)) {
    responseHeaders.append("set-cookie", setCookie);
  }

  return new Response(response.data, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: AuthRouteContext): Promise<Response> {
  return await proxyAuthRequest(request, context);
}

export async function POST(request: Request, context: AuthRouteContext): Promise<Response> {
  return await proxyAuthRequest(request, context);
}

export async function OPTIONS(request: Request, context: AuthRouteContext): Promise<Response> {
  return await proxyAuthRequest(request, context);
}
