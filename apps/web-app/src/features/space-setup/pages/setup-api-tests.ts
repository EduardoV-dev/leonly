import { api } from "@/lib/axios/api";

api.defaults.baseURL = "https://api.example.com/api";

api.defaults.adapter = async (config) => {
  const headers = Object.fromEntries(
    Object.entries(config.headers.toJSON()).map(([name, value]) => [
      name.toLowerCase(),
      String(value),
    ]),
  );
  if (config.data === undefined || config.data instanceof FormData) delete headers["content-type"];
  const options: RequestInit = {
    credentials: config.withCredentials ? "include" : "same-origin",
    headers,
    method: config.method?.toUpperCase(),
  };
  if (config.data !== undefined) options.body = config.data;
  const response = await fetch(api.getUri(config), options);
  const data =
    response.status === 204 || typeof response.json !== "function"
      ? null
      : await response.json().catch(() => null);
  return {
    config,
    data,
    headers: response.headers ? Object.fromEntries(response.headers.entries()) : {},
    status: response.status ?? (response.ok ? 200 : 500),
    statusText: response.statusText ?? "",
  };
};
