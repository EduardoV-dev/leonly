import { AxiosError, AxiosHeaders } from "axios";
import { api } from "@/lib/axios/api";

api.defaults.baseURL = "https://api.example.com/api";

api.defaults.adapter = async (config) => {
  const requestHeaders = Object.fromEntries(
    Object.entries(config.headers.toJSON()).map(([name, value]) => [
      name.toLowerCase(),
      String(value),
    ]),
  );
  if (config.data === undefined || config.data instanceof FormData) {
    delete requestHeaders["content-type"];
  }
  const options: RequestInit = {
    credentials: config.withCredentials ? "include" : "same-origin",
    headers: requestHeaders,
    method: config.method?.toUpperCase(),
  };
  if (config.data !== undefined) options.body = config.data;
  const response = await fetch(api.getUri(config), options);
  const data =
    response.status === 204 || typeof response.json !== "function"
      ? null
      : await response.json().catch(() => null);
  const status = response.status ?? (response.ok ? 200 : 500);
  const responseHeaders = AxiosHeaders.from(
    response.headers ? Object.fromEntries(response.headers.entries()) : undefined,
  );
  const validateStatus = config.validateStatus;
  if (validateStatus && !validateStatus(status)) {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      {
        config,
        data,
        headers: responseHeaders,
        status,
        statusText: response.statusText,
      },
    );
  }

  return {
    config,
    data,
    headers: responseHeaders,
    status,
    statusText: response.statusText ?? "",
  };
};
