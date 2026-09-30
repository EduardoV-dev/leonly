import axios from "axios";

export const webAppApi = axios.create({
  baseURL: "/api",
  timeout: 5000,
  responseType: "json",
  headers: { Accept: "application/json" },
  validateStatus: () => true,
});
