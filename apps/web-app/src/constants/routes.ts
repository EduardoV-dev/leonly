export const APP_ROUTES = {
  HOME: "/",
  AUTH: "/auth",
  TIMELINE: "/timeline",
  TIMELINE_NEW: "/timeline/new",
  MEMORY_DETAIL: (memoryId: string) => `/memories/${memoryId}`,
  WELCOME_CREATE_STEP: (step: "start" | "name" | "date" | "invite") => `/welcome/create/${step}`,
  WELCOME_JOIN_STEP: (step: "code" | "name") => `/welcome/join/${step}`,
} as const;
