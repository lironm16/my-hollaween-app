import { toast } from "sonner";
import { ADD_HOUSE_CLOSED_HE } from "@/lib/add-house-copy";

/** Navigate to /add or toast when the public window is closed. */
export function tryOpenAddHouse(open: boolean, navigate: () => void) {
  if (open) {
    navigate();
    return;
  }
  toast.message(ADD_HOUSE_CLOSED_HE);
}
