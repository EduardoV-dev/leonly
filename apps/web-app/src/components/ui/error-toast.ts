import { toast } from 'sonner';

export function showErrorToast(message: string, description?: string) {
  toast.error(message, {
    description,
  });
}
