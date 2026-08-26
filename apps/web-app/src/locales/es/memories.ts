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
  detail: {
    actions: {
      backToTimeline: "Volver a la línea de tiempo",
      nextPhoto: "Foto siguiente",
      previousPhoto: "Foto anterior",
      retry: "Intentar de nuevo",
    },
    creator: "Conservado por {{name}}",
    error: {
      description: "La historia sigue aquí. Simplemente no pudimos abrirla en este momento.",
      eyebrow: "Una pausa en la historia",
      heading: "No pudimos cargar este recuerdo",
    },
    gallery: {
      label: "Fotos de {{title}}",
      noPhotoDescription: "Esta historia fue conservada sin fotografías.",
      noPhotoTitle: "Un recuerdo guardado en palabras",
      photoAlt: "Foto {{position}} de {{total}} de {{title}}",
      photoUnavailable: "La foto {{position}} no está disponible",
      position: "{{position}} de {{total}}",
      selectPhoto: "Mostrar la foto {{position}} de {{total}}",
    },
    loading: "Cargando recuerdo…",
    notFound: {
      description: "Puede que este recuerdo ya no esté disponible o que pertenezca a otro lugar.",
      eyebrow: "Recuerdo no disponible",
      heading: "Esta historia no se puede abrir",
    },
    related: {
      empty: "Más momentos compartidos aparecerán aquí a medida que crezca su línea de tiempo.",
      eyebrow: "Otros recuerdos",
      heading: "Más de nuestra historia",
    },
    visibility: {
      timeline: "Recuerdo compartido",
      vault: "Bóveda privada",
    },
  },
} as const;
