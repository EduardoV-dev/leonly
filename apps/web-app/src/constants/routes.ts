export const APP_ROUTES = {
  HOME: "/",
  AUTH: "/auth",
  WELCOME_CREATE_STEP: (step: "start" | "name" | "date" | "invite") => `/welcome/create/${step}`,
  WELCOME_JOIN_STEP: (step: "code" | "name") => `/welcome/join/${step}`,
} as const;
