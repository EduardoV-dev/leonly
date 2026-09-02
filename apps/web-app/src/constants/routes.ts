export const APP_ROUTES = {
  HOME: "/",
  AUTH: "/auth",
  TIMELINE: "/timeline",
  MEMORIES_NEW: "/memories/new",
  VAULT: "/vault",
  MEMORY_DETAIL: (memoryId: string) => `/memories/${memoryId}`,
  MEMORY_EDIT: (memoryId: string) => `/memories/${memoryId}/edit`,
  VAULT_MEMORY_DETAIL: (memoryId: string) => `/vault/${memoryId}`,
  WELCOME_CREATE_STEP: (step: "start" | "name" | "date" | "invite") => `/welcome/create/${step}`,
  WELCOME_JOIN_STEP: (step: "code" | "name") => `/welcome/join/${step}`,
} as const;
