import { toast } from "sonner";

/** Navigate to /add or toast when the public window is closed. */
export function tryOpenAddHouse(open: boolean, navigate: () => void, closedMessage: string) {
  if (open) {
    navigate();
    return;
  }
  toast.message(closedMessage);
}
