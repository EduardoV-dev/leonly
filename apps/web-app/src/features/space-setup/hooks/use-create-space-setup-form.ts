"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CREATE_SPACE_STORAGE_KEY } from "../constants/local-storage";
import { createCreateSpaceSetupSchema } from "../constants/validation";

export type CreateSpaceSetupFormValues = {
  displayName: string;
  spaceName: string;
  firstDay: string;
};

const initialCreateFormValues: CreateSpaceSetupFormValues = {
  displayName: "",
  spaceName: "",
  firstDay: "",
};

type CreateSpaceSetupStore = {
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  values: CreateSpaceSetupFormValues;
  setValues: (values: CreateSpaceSetupFormValues) => void;
};

const sessionStorageFactory = () => sessionStorage;

export const useCreateSpaceSetupStore = create<CreateSpaceSetupStore>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      values: initialCreateFormValues,
      setValues: (values) => set({ values }),
    }),
    {
      name: CREATE_SPACE_STORAGE_KEY,
      storage: createJSONStorage(sessionStorageFactory),
      partialize: (state) => ({ values: state.values }),
      onRehydrateStorage: () => (state) => {
        state?.setValues({ ...initialCreateFormValues, ...state.values });
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function useCreateSpaceSetupForm() {
  const { t } = useTranslation("spaceSetup");
  const values = useCreateSpaceSetupStore((state) => state.values);
  const hasHydrated = useCreateSpaceSetupStore((state) => state.hasHydrated);
  const setValues = useCreateSpaceSetupStore((state) => state.setValues);
  const hasAppliedPersistedValues = useRef(false);
  const form = useForm<CreateSpaceSetupFormValues>({
    defaultValues: values,
    resolver: zodResolver(createCreateSpaceSetupSchema(t)),
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
        displayName: nextValues.displayName ?? "",
        spaceName: nextValues.spaceName ?? "",
        firstDay: nextValues.firstDay ?? "",
      });
    });

    return () => subscription.unsubscribe();
  }, [form, hasHydrated, setValues]);

  return form;
}
