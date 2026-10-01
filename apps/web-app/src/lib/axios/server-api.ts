import "server-only";
import axios from "axios";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";

const baseURL = `${ENVIRONMENT_VARIABLES.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")}/api`;

export const serverApi = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 5000,
  responseType: "json",
  headers: { Accept: "application/json" },
  validateStatus: () => true,
});
