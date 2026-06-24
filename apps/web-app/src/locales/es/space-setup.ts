export const spaceSetupEs = {
  aria: {
    contentPanel: "Configuracion del espacio",
    storyPanel: "Inspiracion para configurar el espacio",
  },
  actions: {
    back: "Atras",
    continue: "Continuar",
    copyCode: "Copiar codigo",
    copied: "Copiado",
    joinSpace: "Unirse al espacio",
    startStory: "Empezar nuestra historia",
  },
  tabs: {
    label: "Opciones de configuracion del espacio",
    create: "Crear un espacio",
    join: "Unirse con codigo",
  },
  stepMarker: {
    label: "Paso {{step}} de {{total}}",
  },
  validation: {
    displayNameMin: "Usa al menos {{count}} caracteres.",
    displayNameMax: "Usa {{count}} caracteres o menos.",
    spaceNameRequired: "Ingresa un nombre para el santuario.",
    spaceNameMin: "El nombre del santuario debe tener al menos {{count}} caracteres.",
    spaceNameMax: "El nombre del santuario debe tener {{count}} caracteres o menos.",
    firstDayRequired: "Elige su primer dia.",
    firstDayFuture: "Elige hoy o una fecha pasada.",
    inviteCodeRequired: "Ingresa un codigo de invitacion.",
    inviteCodeInvalid: "Usa un codigo como LNY-7KQ9M2.",
  },
  story: {
    "create-start": {
      imageAlt: "Pareja sosteniendo una pequena foto instantanea",
      caption: "Toda gran historia tiene un comienzo.",
      captionDetail: "Empieza con el nombre que tu pareja reconocera.",
    },
    "create-name": {
      imageAlt: "Pareja caminando junta cerca del oceano al atardecer",
      caption: "Nombra el lugar al que volveran.",
      captionDetail: "Su santuario puede ser tranquilo, divertido, poetico o solo suyo.",
    },
    "create-date": {
      imageAlt: "Pareja caminando por un sendero costero calido",
      caption: "Toda linea de tiempo necesita su primer dia.",
      captionDetail: "Lo usaremos para organizar sus recuerdos desde el primer dia.",
    },
    "create-invite": {
      imageAlt: "Pareja feliz sentada junta bajo una luz calida",
      caption: "Su santuario esta listo.",
      captionDetail: "Invita a tu pareja con un codigo privado creado para este espacio.",
    },
    "join-code": {
      imageAlt: "Pareja tomada de la mano al aire libre",
      caption: "Entra en una historia que ya te espera.",
      captionDetail: "Usa el codigo privado que compartio tu pareja.",
    },
    "join-name": {
      imageAlt: "Pareja sosteniendo una pequena foto instantanea",
      caption: "Haz que este espacio se sienta tuyo.",
      captionDetail: "Elige el nombre que vera tu pareja cuando llegues.",
    },
  },
  steps: {
    start: {
      heading: "Empieza tu historia",
      description:
        "Crea un santuario privado para recuerdos compartidos. Empieza con el nombre que vera tu pareja.",
      displayNameLabel: "Tu nombre visible",
      optional: "Opcional",
      displayNamePlaceholder: "Usa tu nombre de Google si lo dejas vacio",
    },
    name: {
      heading: "Nombra tu santuario",
      description: "Dale a su espacio compartido un nombre que se sienta de ambos.",
      spaceNameLabel: "Nombre del santuario",
      spaceNamePlaceholder: "p. ej. Nuestro pequeno mundo",
    },
    date: {
      heading: "Cuando empezo su historia?",
      description:
        "Selecciona la fecha en que empezaron su camino juntos para iniciar su linea de tiempo compartida.",
      firstDayLabel: "Aniversario o primer encuentro",
      note: "Usaremos esto para organizar sus recuerdos desde el primer dia.",
    },
    invite: {
      heading: "Su santuario esta listo.",
      description:
        "Comparte este codigo secreto con tu pareja para invitarla a su espacio compartido.",
      codeLabel: "Codigo unico de invitacion",
      expiryNote:
        "Este codigo expirara en 24 horas. Tu pareja lo usara durante la configuracion de su cuenta.",
    },
    join: {
      heading: "Unete a su espacio compartido",
      description:
        "Ingresa el codigo de invitacion de tu pareja para entrar al santuario que creo para ti.",
      inviteCodeLabel: "Codigo de invitacion",
    },
    joinName: {
      heading: "Agrega tu nombre visible",
      description: "Elige el nombre que vera tu pareja cuando te unas a este espacio compartido.",
      displayNameLabel: "Tu nombre visible",
      optional: "Opcional",
      displayNamePlaceholder: "Usa tu nombre de Google si lo dejas vacio",
    },
  },
} as const;
