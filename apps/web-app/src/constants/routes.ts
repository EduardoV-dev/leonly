export const APP_ROUTES = {
  HOME: "/",
  AUTH: "/auth",
  WELCOME: "/welcome",
  WELCOME_CREATE: "/welcome/create",
  WELCOME_JOIN: "/welcome/join",
  WELCOME_CREATE_STEP: (step: "name" | "date" | "invite") => `/welcome/create?step=${step}`,
  WELCOME_JOIN_STEP: (step: "name") => `/welcome/join?step=${step}`,
} as const;
