import "server-only";
import type { AxiosRequestConfig } from "axios";
import { api } from "./api";

const REQUEST_HEADERS_TO_STRIP = new Set([
  "accept-encoding",
  "connection",
  "content-length",
  "host",
  "origin",
  "transfer-encoding",
]);
const RESPONSE_HEADERS_TO_STRIP = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

export async function proxyRequest(request: Request, endpoint: string): Promise<Response> {
  const requestHeaders = new Headers(request.headers);

  for (const header of REQUEST_HEADERS_TO_STRIP) {
    requestHeaders.delete(header);
  }

  const method = request.method.toUpperCase() as AxiosRequestConfig["method"];
  const response = await api.request<ArrayBuffer>({
    url: endpoint,
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

  const hasNoBody = method === "HEAD" || [204, 205, 304].includes(response.status);

  return new Response(hasNoBody ? null : response.data, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
