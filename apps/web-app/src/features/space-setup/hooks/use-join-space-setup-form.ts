"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { JOIN_SPACE_STORAGE_KEY } from "../constants/local-storage";
import { createJoinSpaceSetupSchema } from "../constants/validation";

export type JoinSpaceSetupFormValues = {
  inviteCode: string;
  displayName: string;
};

const initialJoinFormValues: JoinSpaceSetupFormValues = {
  inviteCode: "",
  displayName: "",
};

type JoinSpaceSetupStore = {
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  values: JoinSpaceSetupFormValues;
  setValues: (values: JoinSpaceSetupFormValues) => void;
};

const sessionStorageFactory = () => sessionStorage;

export const useJoinSpaceSetupStore = create<JoinSpaceSetupStore>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      values: initialJoinFormValues,
      setValues: (values) => set({ values }),
    }),
    {
      name: JOIN_SPACE_STORAGE_KEY,
      storage: createJSONStorage(sessionStorageFactory),
      partialize: (state) => ({ values: state.values }),
      onRehydrateStorage: () => (state) => {
        state?.setValues({ ...initialJoinFormValues, ...state.values });
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function useJoinSpaceSetupForm() {
  const { t } = useTranslation("spaceSetup");
  const values = useJoinSpaceSetupStore((state) => state.values);
  const hasHydrated = useJoinSpaceSetupStore((state) => state.hasHydrated);
  const setValues = useJoinSpaceSetupStore((state) => state.setValues);
  const hasAppliedPersistedValues = useRef(false);
  const form = useForm<JoinSpaceSetupFormValues>({
    defaultValues: values,
    resolver: zodResolver(createJoinSpaceSetupSchema(t)),
  });

  useEffect(() => {
    if (!hasHydrated || hasAppliedPersistedValues.current) {
      return;
    }

    form.reset(values);
    hasAppliedPersistedValues.current = true;
  }, [form, hasHydrated, values]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const subscription = form.watch((nextValues) => {
      setValues({
        inviteCode: nextValues.inviteCode ?? "",
        displayName: nextValues.displayName ?? "",
      });
    });

    return () => subscription.unsubscribe();
  }, [form, hasHydrated, setValues]);

  return form;
}
