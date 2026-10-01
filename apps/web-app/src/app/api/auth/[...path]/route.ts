import "server-only";
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";
import { createRequestLogger, logServerError } from "@/lib/server-logger";

const authApi = axios.create({
  baseURL: `${ENVIRONMENT_VARIABLES.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")}/api`,
  withCredentials: true,
  timeout: 5000,
  responseType: "arraybuffer",
  headers: { Accept: "application/json" },
  validateStatus: () => true,
});

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
  return `/auth/${authPath}${new URL(request.url).search}`;
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
  let response: AxiosResponse<ArrayBuffer>;
  try {
    response = await authApi.request<ArrayBuffer>({
      url: getApiPath(request, path),
      method,
      headers: Object.fromEntries(requestHeaders.entries()),
      data: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
      responseType: "arraybuffer",
      maxRedirects: 0,
      transformResponse: [],
    });
  } catch (error) {
    logServerError(
      { event: "auth_proxy_failed", operation: "proxy_auth_request" },
      error,
      createRequestLogger(request),
    );
    return Response.json({ message: "Authentication service is unavailable." }, { status: 502 });
  }
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
