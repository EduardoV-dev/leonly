import "server-only";
import axios from "axios";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";

export const api = axios.create({
  baseURL: ENVIRONMENT_VARIABLES.API_BASE_URL || "http://localhost:3001",
});
