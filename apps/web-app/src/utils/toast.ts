import { type ExternalToast, toast as toaster } from 'sonner';

export const toast = {
  success: (message: string, options?: ExternalToast) => toaster.success(message, options),
  error: (message: string, options?: ExternalToast) => toaster.error(message, options),
  warning: (message: string, options?: ExternalToast) => toaster.warning(message, options),
  info: (message: string, options?: ExternalToast) => toaster.info(message, options),
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: (data: T) => string;
      error: (error: unknown) => string;
    },
  ) => toaster.promise(promise, messages),
};
