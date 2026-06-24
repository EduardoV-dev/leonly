export const spaceSetupEn = {
  aria: {
    contentPanel: "Space setup",
    storyPanel: "Space setup inspiration",
  },
  actions: {
    back: "Back",
    continue: "Continue",
    copyCode: "Copy Code",
    copied: "Copied",
    joinSpace: "Join Space",
    startStory: "Start Our Story",
  },
  tabs: {
    label: "Space setup options",
    create: "Create a Space",
    join: "Join with Code",
  },
  stepMarker: {
    label: "Step {{step}} of {{total}}",
  },
  validation: {
    displayNameMin: "Use at least {{count}} characters.",
    displayNameMax: "Use {{count}} characters or fewer.",
    spaceNameRequired: "Enter a sanctuary name.",
    spaceNameMin: "Sanctuary name must be at least {{count}} characters.",
    spaceNameMax: "Sanctuary name must be {{count}} characters or fewer.",
    firstDayRequired: "Choose your first day.",
    firstDayFuture: "Choose today or a past date.",
    inviteCodeRequired: "Enter an invite code.",
    inviteCodeInvalid: "Use a code like LNY-7KQ9M2.",
  },
  story: {
    "create-start": {
      imageAlt: "A couple holding a small instant photo together",
      caption: "Every great story has a beginning.",
      captionDetail: "Start with the name your partner will know you by.",
    },
    "create-name": {
      imageAlt: "A couple walking together near the ocean at sunset",
      caption: "Name the place you will return to.",
      captionDetail: "Your sanctuary can be quiet, silly, poetic, or entirely yours.",
    },
    "create-date": {
      imageAlt: "A couple walking through a warm coastal path",
      caption: "Every timeline needs its first day.",
      captionDetail: "We will use it to organize your memories from day one.",
    },
    "create-invite": {
      imageAlt: "A happy couple sitting together in warm light",
      caption: "Your sanctuary is ready.",
      captionDetail: "Invite your partner with a private code made just for this space.",
    },
    "join-code": {
      imageAlt: "A couple holding hands outdoors",
      caption: "Step into a story already waiting.",
      captionDetail: "Use the private code your partner shared with you.",
    },
    "join-name": {
      imageAlt: "A couple holding a small instant photo together",
      caption: "Make this space feel like yours.",
      captionDetail: "Choose the name your partner will see when you arrive.",
    },
  },
  steps: {
    start: {
      heading: "Begin Your Story",
      description:
        "Create a private sanctuary for shared memories. Start with the name your partner will see.",
      displayNameLabel: "Your display name",
      optional: "Optional",
      displayNamePlaceholder: "Use your Google name if left blank",
    },
    name: {
      heading: "Name your sanctuary",
      description: "Give your shared space a name that feels like both of you.",
      spaceNameLabel: "Sanctuary name",
      spaceNamePlaceholder: "e.g. Our Little World",
    },
    date: {
      heading: "When did your story begin?",
      description:
        "Select the date you started your journey together to begin your shared timeline.",
      firstDayLabel: "Anniversary or first meeting",
      note: "We'll use this to organize your memories from day one.",
    },
    invite: {
      heading: "Your sanctuary is ready.",
      description:
        "Share this secret code with your partner to invite them into your shared space.",
      codeLabel: "Unique invite code",
      expiryNote:
        "This code will expire in 24 hours. Your partner will use it during their own account setup.",
    },
    join: {
      heading: "Join your shared space",
      description:
        "Enter the invite code from your partner to step into the sanctuary they created for you.",
      inviteCodeLabel: "Invite code",
    },
    joinName: {
      heading: "Add your display name",
      description: "Choose the name your partner will see when you join this shared space.",
      displayNameLabel: "Your display name",
      optional: "Optional",
      displayNamePlaceholder: "Use your Google name if left blank",
    },
  },
} as const;
