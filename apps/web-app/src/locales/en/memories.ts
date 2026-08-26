export const memoriesEn = {
  create: {
    actions: {
      cancel: "Cancel",
      preserve: "Preserve Memory",
    },
    backToTimeline: "Go back to timeline",
    fields: {
      date: {
        label: "Date",
        placeholder: "Choose a date",
      },
      description: {
        label: "The story",
        placeholder: "It started when...",
      },
      location: {
        label: "Location",
        placeholder: "Where did it happen?",
      },
      title: {
        label: "Title",
        placeholder: "Rainy day in Paris...",
      },
    },
    heading: "Preserve a Moment",
    intro: "Capture the nuances of today. What made this moment worth holding onto?",
    optional: "Optional",
    photos: {
      cover: "Cover",
      coverLegend: "Choose a cover photo",
      count: "{{count}}/{{max}}",
      heading: "Frame the moment",
      makeCover: "Make cover",
      remove: "Remove {{name}}",
      uploadHelp: "Up to {{count}} JPEG, PNG, or WebP images, {{size}} MB each.",
      uploadPrompt: "Drag and drop your photos, or browse",
    },
    placement: {
      legend: "Where should it live?",
      timeline: {
        description: "Visible in your shared story",
        label: "Our timeline",
      },
      vault: {
        description: "Kept out of the timeline",
        label: "Private vault",
      },
    },
    required: "Required",
    sections: {
      details: "Memory details",
    },
    status: {
      saving: "Saving your memory and photos...",
    },
    validation: {
      photoCount: "Choose up to {{count}} photos.",
      photoSize: "Each photo must be {{size}} MB or smaller.",
      photoType: "Photos must be JPEG, PNG, or WebP images.",
      saveFailed: "We could not save this memory. Please try again.",
    },
  },
  detail: {
    actions: {
      backToTimeline: "Back to timeline",
      nextPhoto: "Next photo",
      previousPhoto: "Previous photo",
      retry: "Try again",
    },
    creator: "Preserved by {{name}}",
    error: {
      description: "The story is still here. We just could not open it right now.",
      eyebrow: "A pause in the story",
      heading: "We could not load this memory",
    },
    gallery: {
      label: "Photos from {{title}}",
      noPhotoDescription: "This story was preserved without photographs.",
      noPhotoTitle: "A memory held in words",
      photoAlt: "Photo {{position}} of {{total}} from {{title}}",
      photoUnavailable: "Photo {{position}} is unavailable",
      position: "{{position}} of {{total}}",
      selectPhoto: "Show photo {{position}} of {{total}}",
    },
    loading: "Loading memory…",
    notFound: {
      description: "This memory may no longer be available, or it may belong somewhere else.",
      eyebrow: "Memory unavailable",
      heading: "This story cannot be opened",
    },
    related: {
      empty: "More shared moments will appear here as your timeline grows.",
      eyebrow: "Other memories",
      heading: "More from our story",
    },
    visibility: {
      timeline: "Shared memory",
      vault: "Private vault",
    },
  },
} as const;
