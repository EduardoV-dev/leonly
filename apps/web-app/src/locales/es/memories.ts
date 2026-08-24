export const memoriesEs = {
  create: {
    actions: {
      cancel: "Cancelar",
      preserve: "Conservar recuerdo",
    },
    backToTimeline: "Volver a la línea de tiempo",
    fields: {
      date: {
        label: "Fecha",
        placeholder: "Elige una fecha",
      },
      description: {
        label: "La historia",
        placeholder: "Todo empezó cuando...",
      },
      location: {
        label: "Ubicación",
        placeholder: "¿Dónde ocurrió?",
      },
      title: {
        label: "Título",
        placeholder: "Día lluvioso en París...",
      },
    },
    heading: "Conservar un momento",
    intro: "Captura los matices de hoy. ¿Qué hizo que valiera la pena guardar este momento?",
    optional: "Opcional",
    photos: {
      cover: "Portada",
      coverLegend: "Elige una foto de portada",
      count: "{{count}}/{{max}}",
      heading: "Enmarca el momento",
      makeCover: "Usar como portada",
      remove: "Eliminar {{name}}",
      uploadHelp: "Hasta {{count}} imágenes JPEG, PNG o WebP de {{size}} MB cada una.",
      uploadPrompt: "Arrastra y suelta tus fotos o búscalas en tu dispositivo",
    },
    placement: {
      legend: "¿Dónde debería aparecer?",
      timeline: {
        description: "Visible en su historia compartida",
        label: "Nuestra línea de tiempo",
      },
      vault: {
        description: "Fuera de la línea de tiempo",
        label: "Bóveda privada",
      },
    },
    required: "Obligatorio",
    sections: {
      details: "Detalles del recuerdo",
    },
    status: {
      saving: "Guardando tu recuerdo y tus fotos...",
    },
    validation: {
      photoCount: "Elige hasta {{count}} fotos.",
      photoSize: "Cada foto debe ocupar {{size}} MB o menos.",
      photoType: "Las fotos deben ser imágenes JPEG, PNG o WebP.",
      saveFailed: "No pudimos guardar este recuerdo. Inténtalo de nuevo.",
    },
  },
} as const;
