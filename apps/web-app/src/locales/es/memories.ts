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
        placeholder: "Todo empezó cuando…",
      },
      location: {
        label: "Ubicación",
        placeholder: "¿Dónde ocurrió?",
      },
      title: {
        label: "Título",
        placeholder: "Día lluvioso en París…",
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
      saving: "Guardando tu recuerdo y tus fotos…",
    },
    validation: {
      photoCount: "Elige hasta {{count}} fotos.",
      photoSize: "Cada foto debe ocupar {{size}} MB o menos.",
      photoType: "Las fotos deben ser imágenes JPEG, PNG o WebP.",
      saveFailed: "No pudimos guardar este recuerdo. Inténtalo de nuevo.",
    },
  },
  edit: {
    actions: {
      save: "Guardar cambios",
    },
    backToDetail: "Volver al recuerdo",
    conflict: {
      description:
        "Recarga el recuerdo actual para proteger los cambios más recientes de tu pareja. Tu borrador no los sobrescribirá.",
      heading: "Este recuerdo cambió mientras lo editabas.",
      reload: "Recargar recuerdo actual",
      return: "Volver al detalle",
    },
    error: {
      description: "Tu recuerdo no cambió. Intenta abrir el editor de nuevo.",
      eyebrow: "Una pausa en la historia",
      heading: "No pudimos abrir el editor del recuerdo",
    },
    eyebrow: "Editor de recuerdos",
    heading: "Refina este recuerdo",
    intro: "Los cambios actualizan este recuerdo compartido para ambos.",
    photos: {
      empty: "Este recuerdo usará su presentación sin fotos.",
      new: "Foto nueva",
      previewAlt: "Foto {{position}} del recuerdo",
      saved: "Foto guardada",
      unavailable: "Vista previa de la foto no disponible",
    },
    status: {
      saving: "Guardando cambios…",
    },
    success: "Recuerdo actualizado.",
    validation: {
      photoCount: "Elige hasta {{count}} fotos para el recuerdo final.",
      saveFailed: "No pudimos actualizar este recuerdo. Inténtalo de nuevo.",
    },
  },
  detail: {
    actions: {
      backToTimeline: "Volver a la línea de tiempo",
      edit: "Editar",
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
    lightbox: {
      close: "Cerrar visor de fotos",
      hideDetails: "Ocultar detalles del recuerdo",
      label: "Visor de fotos de {{title}}",
      open: "Abrir la foto {{position}} en pantalla completa",
      pagination: "Elegir una foto",
      position: "{{position}} / {{total}}",
      showDetails: "Mostrar detalles del recuerdo",
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
  vault: {
    actions: {
      create: "Conservar un recuerdo",
      loadMore: "Cargar recuerdos anteriores",
      loadingMore: "Cargando más…",
      retry: "Intentar de nuevo",
      retryLoadMore: "Intentar cargar más",
    },
    empty: {
      description:
        "Los recuerdos fuera de la línea de tiempo descansarán aquí, disponibles para ambos.",
      heading: "Su bóveda compartida está esperando",
    },
    error: {
      description:
        "Sus recuerdos siguen conservados. Simplemente no pudimos abrir la bóveda ahora mismo.",
      heading: "No pudimos abrir la bóveda privada",
      loadMore: "No pudimos cargar más recuerdos de la bóveda.",
    },
    hero: {
      description:
        "Un archivo tranquilo compartido por ambos. Estos recuerdos quedan fuera de la línea de tiempo, nunca fuera de su alcance.",
      eyebrow: "Archivo compartido",
      heading: "Bóveda privada",
      shared: "Visible para ambos miembros activos",
    },
    loading: {
      label: "Cargando la bóveda privada",
      slow: "Esto está tardando un poco más de lo habitual.",
      standard: "Abriendo su archivo compartido…",
    },
    detail: {
      actions: {
        backToVault: "Volver a la bóveda privada",
      },
      related: {
        empty: "Aquí aparecerán más recuerdos de su bóveda compartida.",
        eyebrow: "Desde el archivo",
        heading: "Más de la bóveda",
      },
    },
  },
} as const;
