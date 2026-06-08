"use client";

import { LeonlyLogo } from "@/components/leonly-logo";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Copy, KeyRound, Sparkles } from "lucide-react";
import { AnimatePresence, type Variants, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./space-setup.module.css";

const INVITE_CODE = "LEO-LOVE-2024";
const STORAGE_KEY = "leonly-space-setup";

type WelcomeTab = "create" | "join";

export type SpaceSetupScreen = "start" | "create-name" | "create-date" | "create-invite" | "join";

type SetupFormState = {
  displayName: string;
  spaceName: string;
  firstDay: string;
  inviteCode: string;
};

const initialFormState: SetupFormState = {
  displayName: "",
  spaceName: "",
  firstDay: "",
  inviteCode: "",
};

const screenContent: Record<
  SpaceSetupScreen,
  {
    image: string;
    imageAlt: string;
    caption: string;
    captionDetail: string;
  }
> = {
  start: {
    image:
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "A couple holding a small instant photo together",
    caption: "Every great story has a beginning.",
    captionDetail: "Start with the name your partner will know you by.",
  },
  "create-name": {
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "A couple walking together near the ocean at sunset",
    caption: "Name the place you will return to.",
    captionDetail: "Your sanctuary can be quiet, silly, poetic, or entirely yours.",
  },
  "create-date": {
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "A couple walking through a warm coastal path",
    caption: "Every timeline needs its first day.",
    captionDetail: "We will use it to organize your memories from day one.",
  },
  "create-invite": {
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "A happy couple sitting together in warm light",
    caption: "Your sanctuary is ready.",
    captionDetail: "Invite your partner with a private code made just for this space.",
  },
  join: {
    image:
      "https://images.unsplash.com/photo-1501901609772-df0848060b33?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "A couple holding hands outdoors",
    caption: "Step into a story already waiting.",
    captionDetail: "Use the private code your partner shared with you.",
  },
};

function readStoredState(): SetupFormState {
  if (typeof window === "undefined") {
    return initialFormState;
  }

  const storedValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return initialFormState;
  }

  try {
    return { ...initialFormState, ...(JSON.parse(storedValue) as Partial<SetupFormState>) };
  } catch {
    return initialFormState;
  }
}

function useSpaceSetupState() {
  const [formState, setFormState] = useState<SetupFormState>(readStoredState);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formState));
  }, [formState]);

  const updateField = (field: keyof SetupFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  return { formState, updateField };
}

const storyPanelVariants: Variants = {
  enter: {
    opacity: 0,
    x: -34,
    scale: 1.01,
  },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: 34,
    scale: 1.01,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
};

const contentPanelVariants: Variants = {
  enter: {
    opacity: 0,
    x: 34,
  },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: -34,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
};

const reducedMotionVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

type SpaceSetupPageProps = {
  screen: SpaceSetupScreen;
};

export function SpaceSetupPage({ screen }: SpaceSetupPageProps) {
  const { formState, updateField } = useSpaceSetupState();
  const [copied, setCopied] = useState(false);
  const content = screenContent[screen];
  const shouldReduceMotion = useReducedMotion();
  const panelTransitionKey = screen;
  const activeStoryPanelVariants = shouldReduceMotion ? reducedMotionVariants : storyPanelVariants;
  const activeContentPanelVariants = shouldReduceMotion
    ? reducedMotionVariants
    : contentPanelVariants;

  const copyInviteCode = async () => {
    await navigator.clipboard.writeText(INVITE_CODE);
    setCopied(true);
  };

  return (
    <main className="min-h-screen bg-auth-canvas px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className={styles.shell}>
        <aside className={styles.storyPanel} aria-label="Space setup inspiration">
          <LeonlyLogo className={styles.brand} />
          <AnimatePresence mode="wait" propagate>
            <motion.div
              key={panelTransitionKey}
              className={styles.storyMotion}
              variants={activeStoryPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <img src={content.image} alt={content.imageAlt} className={styles.storyImage} />
              <div className={styles.storyShade} />
              <div className={styles.storyCaption}>
                <p>{content.caption}</p>
                <span>{content.captionDetail}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </aside>

        <section className={styles.contentPanel} aria-label="Space setup">
          <AnimatePresence mode="wait" propagate>
            <motion.div
              key={panelTransitionKey}
              className={styles.contentInner}
              variants={activeContentPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {screen === "start" ? (
                <StartPanel
                  displayName={formState.displayName}
                  onDisplayNameChange={(value) => updateField("displayName", value)}
                />
              ) : null}

              {screen === "create-name" ? (
                <NameStep
                  spaceName={formState.spaceName}
                  onSpaceNameChange={(value) => updateField("spaceName", value)}
                />
              ) : null}

              {screen === "create-date" ? (
                <DateStep
                  firstDay={formState.firstDay}
                  onFirstDayChange={(value) => updateField("firstDay", value)}
                />
              ) : null}

              {screen === "create-invite" ? (
                <InviteStep copied={copied} onCopy={copyInviteCode} />
              ) : null}

              {screen === "join" ? (
                <JoinPanel
                  inviteCode={formState.inviteCode}
                  onInviteCodeChange={(value) => updateField("inviteCode", value)}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </section>
      </section>
    </main>
  );
}

type StartPanelProps = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
};

function StartPanel({ displayName, onDisplayNameChange }: StartPanelProps) {
  return (
    <div>
      <SetupTabs activeTab="create" />

      <h1 className={styles.heading}>Begin Your Story</h1>
      <p className={styles.copy}>
        Create a private sanctuary for shared memories. Start with the name your partner will see.
      </p>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="display-name">
          Your display name
          <span className={styles.optional}>Optional</span>
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="Use your Google name if left blank"
          className={styles.input}
        />
      </div>

      <Link href="/welcome/create?step=1" className={styles.linkButton}>
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

type NameStepProps = {
  spaceName: string;
  onSpaceNameChange: (value: string) => void;
};

function NameStep({ spaceName, onSpaceNameChange }: NameStepProps) {
  return (
    <div>
      <StepMarker step={1} />
      <h1 className={styles.heading}>Name your sanctuary</h1>
      <p className={styles.copy}>Give your shared space a name that feels like both of you.</p>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="space-name">
          Sanctuary name
        </label>
        <input
          id="space-name"
          type="text"
          value={spaceName}
          onChange={(event) => onSpaceNameChange(event.target.value)}
          placeholder="e.g. Our Little World"
          className={styles.input}
        />
      </div>

      <Link
        href="/welcome/create?step=2"
        className={`${styles.linkButton} ${styles.primaryButton}`}
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <BackLink href="/welcome" />
    </div>
  );
}

type DateStepProps = {
  firstDay: string;
  onFirstDayChange: (value: string) => void;
};

function DateStep({ firstDay, onFirstDayChange }: DateStepProps) {
  return (
    <div>
      <StepMarker step={2} />
      <h1 className={styles.heading}>When did your story begin?</h1>
      <p className={styles.copy}>
        Select the date you started your journey together to begin your shared timeline.
      </p>

      <div className={styles.dateCard}>
        <label className={styles.label} htmlFor="first-day">
          Anniversary or first meeting
        </label>
        <div className={styles.inputWithIcon}>
          <input
            id="first-day"
            type="date"
            value={firstDay}
            onChange={(event) => onFirstDayChange(event.target.value)}
            className={styles.input}
          />
          <CalendarDays className={styles.inputIcon} aria-hidden="true" />
        </div>

        <Link
          href="/welcome/create?step=3"
          className={`${styles.linkButton} ${styles.primaryButton}`}
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <BackLink href="/welcome/create?step=1" />
      </div>

      <p className={styles.note}>"We'll use this to organize your memories from day one."</p>
    </div>
  );
}

type InviteStepProps = {
  copied: boolean;
  onCopy: () => void;
};

function InviteStep({ copied, onCopy }: InviteStepProps) {
  return (
    <div>
      <StepMarker step={3} />
      <div className={styles.iconBadge}>
        <KeyRound className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className={styles.heading}>Your sanctuary is ready.</h1>
      <p className={styles.copy}>
        Share this secret code with your partner to invite them into your shared space.
      </p>

      <div className={styles.inviteCodeBox}>
        <div>
          <p className={styles.label}>Unique invite code</p>
          <strong>{INVITE_CODE}</strong>
        </div>
        <button type="button" className={styles.copyButton} onClick={onCopy}>
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy Code"}
        </button>
      </div>

      <p className={styles.expiryNote}>
        This code will expire in 24 hours. Your partner will use it during their own account setup.
      </p>

      <Link href="/" className={styles.linkButton}>
        Start Our Story
      </Link>
      <BackLink href="/welcome/create?step=2" />
    </div>
  );
}

type JoinPanelProps = {
  inviteCode: string;
  onInviteCodeChange: (value: string) => void;
};

function JoinPanel({ inviteCode, onInviteCodeChange }: JoinPanelProps) {
  return (
    <div>
      <SetupTabs activeTab="join" />

      <div className={styles.iconBadge}>
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className={styles.heading}>Join your shared space</h1>
      <p className={styles.copy}>
        Enter the invite code from your partner to step into the sanctuary they created for you.
      </p>

      <div className={styles.dateCard}>
        <label className={styles.label} htmlFor="invite-code">
          Invite code
        </label>
        <input
          id="invite-code"
          type="text"
          value={inviteCode}
          onChange={(event) => onInviteCodeChange(event.target.value)}
          placeholder="LEO-LOVE-2024"
          className={styles.input}
        />
        <Link href="/" className={styles.linkButton}>
          Join Space
        </Link>
        <BackLink href="/welcome" />
      </div>
    </div>
  );
}

type SetupTabsProps = {
  activeTab: WelcomeTab;
};

function SetupTabs({ activeTab }: SetupTabsProps) {
  return (
    <div className={styles.tabs} aria-label="Space setup options">
      {activeTab === "create" ? (
        <button type="button" className={`${styles.tab} ${styles.activeTab}`}>
          Create a Space
        </button>
      ) : (
        <Link href="/welcome" className={styles.tab}>
          Create a Space
        </Link>
      )}

      {activeTab === "join" ? (
        <button type="button" className={`${styles.tab} ${styles.activeTab}`}>
          Join with Code
        </button>
      ) : (
        <Link href="/welcome?tab=join" className={styles.tab}>
          Join with Code
        </Link>
      )}
    </div>
  );
}

type StepMarkerProps = {
  step: number;
};

function StepMarker({ step }: StepMarkerProps) {
  return (
    <div className={styles.stepMarker} aria-label={`Step ${step} of 3`}>
      <span>Step {step} of 3</span>
      <div className={styles.progressTrack}>
        <div className={styles.progressValue} style={{ width: `${(step / 3) * 100}%` }} />
      </div>
    </div>
  );
}

type BackLinkProps = {
  href: string;
};

function BackLink({ href }: BackLinkProps) {
  return (
    <Link href={href} className={styles.backButton}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </Link>
  );
}
