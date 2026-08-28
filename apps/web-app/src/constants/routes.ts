export const APP_ROUTES = {
  HOME: "/",
  AUTH: "/auth",
  TIMELINE: "/timeline",
  TIMELINE_NEW: "/timeline/new",
  VAULT: "/vault",
  MEMORY_DETAIL: (memoryId: string) => `/memories/${memoryId}`,
  VAULT_MEMORY_DETAIL: (memoryId: string) => `/vault/${memoryId}`,
  WELCOME_CREATE_STEP: (step: "start" | "name" | "date" | "invite") => `/welcome/create/${step}`,
  WELCOME_JOIN_STEP: (step: "code" | "name") => `/welcome/join/${step}`,
} as const;
