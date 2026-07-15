export const spaceSetupEs = {
  aria: {
    contentPanel: "Configuración del espacio",
    storyPanel: "Inspiración para configurar el espacio",
  },
  actions: {
    back: "Atrás",
    continue: "Continuar",
    copyCode: "Copiar código",
    copied: "Copiado",
    creatingSpace: "Creando tu espacio...",
    completingSetup: "Completando configuración...",
    continueToDashboard: "Continuar al inicio",
    joinSpace: "Unirse al espacio",
    joiningSpace: "Uniéndote al espacio...",
    validatingInviteCode: "Verificando código...",
    startStory: "Empezar nuestra historia",
  },
  tabs: {
    label: "Opciones de configuración del espacio",
    create: "Crear un espacio",
    join: "Unirse con código",
  },
  stepMarker: {
    label: "Paso {{step}} de {{total}}",
  },
  validation: {
    displayNameRequired: "Ingresa tu nombre.",
    displayNameMin: "Usa al menos {{count}} caracteres.",
    displayNameMax: "Usa {{count}} caracteres o menos.",
    spaceNameRequired: "Ingresa un nombre para tu espacio.",
    spaceNameMin: "El nombre de tu espacio debe tener al menos {{count}} caracteres.",
    spaceNameMax: "El nombre de tu espacio debe tener {{count}} caracteres o menos.",
    firstDayRequired: "Elige el primer día de su historia.",
    firstDayFuture: "Elige hoy o una fecha pasada.",
    inviteCodeRequired: "Ingresa un código de invitación.",
    inviteCodeInvalid: "Usa un código como LNY-7KLP0.",
  },
  story: {
    "create-start": {
      imageAlt: "Pareja sosteniendo una pequeña foto instantánea",
      caption: "Toda gran historia tiene un comienzo.",
      captionDetail: "Empieza con el nombre con el que tu pareja te reconoce.",
    },
    "create-name": {
      imageAlt: "Pareja caminando junta cerca del océano al atardecer",
      caption: "Ponle nombre al lugar al que siempre van a volver.",
      captionDetail: "Tu espacio puede ser tierno, divertido, simple o completamente de ustedes.",
    },
    "create-date": {
      imageAlt: "Pareja caminando por un sendero costero cálido",
      caption: "Toda historia necesita un primer día.",
      captionDetail: "Usaremos esa fecha para ordenar sus recuerdos desde el principio.",
    },
    "create-invite": {
      imageAlt: "Pareja feliz sentada bajo una luz cálida",
      caption: "Tu espacio ya está listo.",
      captionDetail: "Invita a tu pareja con un código privado creado para este espacio.",
    },
    "join-code": {
      imageAlt: "Pareja tomada de la mano al aire libre",
      caption: "Entra en una historia que ya te espera.",
      captionDetail: "Usa el código privado que te compartió tu pareja.",
    },
    "join-name": {
      imageAlt: "Pareja sosteniendo una pequeña foto instantánea",
      caption: "Haz tuyo este espacio desde el primer momento.",
      captionDetail: "Elige el nombre que verá tu pareja cuando entres.",
    },
  },
  steps: {
    start: {
      heading: "Empieza tu historia",
      description:
        "Crea un espacio privado para sus recuerdos compartidos. Empieza con el nombre que verá tu pareja.",
      displayNameLabel: "Tu nombre visible",
      optional: "Opcional",
      displayNamePlaceholder: "p. ej. Leo",
    },
    name: {
      heading: "Ponle nombre a tu espacio",
      description: "Dale a su espacio compartido un nombre que se sienta de los dos.",
      spaceNameLabel: "Nombre del espacio",
      spaceNamePlaceholder: "p. ej. Nuestro pequeño mundo",
    },
    date: {
      heading: "¿Cuándo empezó su historia?",
      description:
        "Elige la fecha en la que empezó su historia para ordenar sus recuerdos desde ese día.",
      firstDayLabel: "Aniversario o primer encuentro",
      note: "Usaremos esta fecha para ordenar sus recuerdos desde el primer día.",
    },
    invite: {
      heading: "Tu espacio ya está listo.",
      description:
        "Comparte este código privado con tu pareja para invitarla a su espacio compartido.",
      codeLabel: "Código único de invitación",
      expiryNote: "Este código vence en 24 horas. Tu pareja lo usará mientras configura su cuenta.",
    },
    join: {
      heading: "Únete a su espacio compartido",
      description:
        "Ingresa el código de invitación de tu pareja para entrar al espacio que creó para ti.",
      inviteCodeLabel: "Código de invitación",
    },
    joinName: {
      heading: "Agrega tu nombre visible",
      description: "Elige el nombre que verá tu pareja cuando te unas a este espacio compartido.",
      displayNameLabel: "Tu nombre visible",
      optional: "Opcional",
      displayNamePlaceholder: "Usa tu nombre de Google si lo dejas vacío",
    },
  },
} as const;
