"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEY } from "../../components/space-setup-container/constants";

export type SpaceSetupFormState = {
  displayName: string;
  spaceName: string;
  firstDay: string;
  inviteCode: string;
};

const initialFormState: SpaceSetupFormState = {
  displayName: "",
  spaceName: "",
  firstDay: "",
  inviteCode: "",
};

function readStoredState(): SpaceSetupFormState {
  if (typeof window === "undefined") {
    return initialFormState;
  }

  const storedValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return initialFormState;
  }

  try {
    return {
      ...initialFormState,
      ...(JSON.parse(storedValue) as Partial<SpaceSetupFormState>),
    };
  } catch {
    return initialFormState;
  }
}

export function useSpaceSetupState() {
  const [formState, setFormState] = useState<SpaceSetupFormState>(readStoredState);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formState));
  }, [formState]);

  const updateField = (field: keyof SpaceSetupFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  return { formState, updateField };
}
