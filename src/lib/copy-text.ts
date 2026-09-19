import { toast } from "sonner";

export async function copyText(text: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
    return true;
  } catch {
    toast.error("לא הצלחנו להעתיק. אפשר לסמן את הטקסט ידנית.");
    return false;
  }
}
