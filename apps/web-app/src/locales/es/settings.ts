export const settingsEs = {
  account: {
    description: "Su identidad de autenticación y la sesión actual.",
    email: "Correo electrónico",
    heading: "Cuenta",
    provider: "Proveedor de acceso",
    signOut: "Cerrar sesión en Leonly",
    signOutError: "No pudimos cerrar la sesión. Inténtelo de nuevo.",
    signingOut: "Cerrando sesión…",
    unavailable: "No disponible",
  },
  actions: {
    retry: "Intentar de nuevo",
  },
  error: {
    description: "Su configuración sigue segura. Simplemente no pudimos abrirla ahora mismo.",
    eyebrow: "Una pausa tranquila",
    heading: "No pudimos cargar la configuración",
  },
  hero: {
    description: "Los detalles que dan forma a su espacio compartido.",
    eyebrow: "Configuración del refugio",
    heading: "Configuración",
  },
  invite: {
    active: "La invitación para su pareja está activa",
    activeDescription: "Su pareja todavía puede usar la invitación actual para unirse.",
    joined: "Ambos están aquí",
    joinedDescription: "Los dos miembros activos ya se unieron a este espacio compartido.",
    unavailable: "La invitación para su pareja no está disponible",
    unavailableDescription:
      "Su pareja todavía no se unió y no hay una invitación activa disponible.",
  },
  loading: "Cargando la configuración",
  members: {
    active: "Activo",
    avatar: "Avatar de {{name}}",
    description: "Ambos miembros tienen los mismos permisos sobre el espacio compartido.",
    heading: "Miembros",
    joined: "Se unió el {{date}}",
    partner: "Pareja",
    you: "Usted",
  },
  preferences: {
    description: "Ajustes personales que pertenecen únicamente a su membresía.",
    displayName: "Nombre visible",
    displayNameHelp: "Se usa para identificarle en todo el espacio compartido.",
    heading: "Sus preferencias",
    language: "Idioma de la interfaz",
    languageHelp: "La selección de idioma estará aquí en una próxima mejora de configuración.",
    ownership: "Solo para usted",
  },
  shared: {
    description: "Estos detalles pertenecen por igual a ambos miembros activos.",
    heading: "Espacio compartido",
    name: "Nombre del espacio",
    ownership: "Compartido por ambos",
    startDate: "Nuestra historia comenzó",
  },
  summary: {
    date: "Nuestra historia comenzó el {{date}}",
    oneMember: "Un lugar privado que espera a su segundo miembro.",
    twoMembers: "Un hogar tranquilo para los recuerdos que comparten.",
  },
  vault: {
    action: "Explorar la bóveda privada",
    description:
      "Un archivo compartido para recuerdos fuera de la línea de tiempo, visible para ambos miembros activos.",
    heading: "Bóveda privada",
  },
} as const;
