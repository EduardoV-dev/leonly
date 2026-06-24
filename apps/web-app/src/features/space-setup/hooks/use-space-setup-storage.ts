"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StoredSetupState<TValues, TStep extends string> = {
  completedSteps: TStep[];
  values: TValues;
};

type UseSpaceSetupStorageOptions<TValues, TStep extends string> = {
  initialValues: TValues;
  storageKey: string;
  steps: readonly TStep[];
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function readStoredState<TValues, TStep extends string>(
  storageKey: string,
  initialValues: TValues,
  steps: readonly TStep[],
): StoredSetupState<TValues, TStep> {
  if (!canUseSessionStorage()) {
    return { completedSteps: [], values: initialValues };
  }

  const rawState = window.sessionStorage.getItem(storageKey);

  if (!rawState) {
    return { completedSteps: [], values: initialValues };
  }

  try {
    const parsedState = JSON.parse(rawState) as Partial<StoredSetupState<Partial<TValues>, TStep>>;
    const completedSteps = Array.isArray(parsedState.completedSteps)
      ? parsedState.completedSteps.filter((step): step is TStep => steps.includes(step))
      : [];

    return {
      completedSteps,
      values: { ...initialValues, ...parsedState.values },
    };
  } catch {
    return { completedSteps: [], values: initialValues };
  }
}

export function useSpaceSetupStorage<TValues, TStep extends string>({
  initialValues,
  storageKey,
  steps,
}: UseSpaceSetupStorageOptions<TValues, TStep>) {
  const [state, setState] = useState<StoredSetupState<TValues, TStep>>({
    completedSteps: [],
    values: initialValues,
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const stepSet = useMemo(() => new Set(steps), [steps]);

  useEffect(() => {
    setState(readStoredState(storageKey, initialValues, steps));
    setHasLoaded(true);
  }, [initialValues, steps, storageKey]);

  const writeStoredState = useCallback(
    (nextState: StoredSetupState<TValues, TStep>) => {
      if (canUseSessionStorage()) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(nextState));
      }
    },
    [storageKey],
  );

  const setValues = useCallback(
    (values: TValues) => {
      setState((currentState) => {
        const nextState = { ...currentState, values };
        writeStoredState(nextState);

        return nextState;
      });
    },
    [writeStoredState],
  );

  const completeStep = useCallback(
    (step: TStep, values: TValues) => {
      setState((currentState) => {
        const completedSteps = currentState.completedSteps.includes(step)
          ? currentState.completedSteps
          : [...currentState.completedSteps, step].filter((completedStep) =>
              stepSet.has(completedStep),
            );
        const nextState = { completedSteps, values };
        writeStoredState(nextState);

        return nextState;
      });
    },
    [stepSet, writeStoredState],
  );

  const clearState = useCallback(() => {
    setState({ completedSteps: [], values: initialValues });

    if (canUseSessionStorage()) {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [initialValues, storageKey]);

  return {
    clearState,
    completeStep,
    completedSteps: state.completedSteps,
    hasLoaded,
    setValues,
    values: state.values,
  };
}
