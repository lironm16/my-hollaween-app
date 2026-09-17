"use client";

import { useCallback, useState } from "react";
import { HouseEditOverlay } from "@/components/house-edit-overlay";
import { QuickUpdateOverlay } from "@/components/quick-update-overlay";
import { useAppNow } from "@/hooks/use-app-clock";
import { quickUpdateAvailable } from "@/lib/quick-update";
import type { PublicHouse } from "@/lib/types";

type EditStep = "quick" | "full";

export type HouseEditFlowState = {
  house: PublicHouse;
  step: EditStep;
  editCode?: string;
  admin?: boolean;
  allowDelete?: boolean;
};

export function useHouseEditFlow() {
  const now = useAppNow();
  const [flow, setFlow] = useState<HouseEditFlowState | null>(null);

  const close = useCallback(() => setFlow(null), []);

  const openEdit = useCallback(
    (
      house: PublicHouse,
      options?: { editCode?: string; admin?: boolean; allowDelete?: boolean; forceFull?: boolean },
    ) => {
      const canQuick = !options?.forceFull && quickUpdateAvailable(house, now);
      setFlow({
        house,
        step: canQuick ? "quick" : "full",
        editCode: options?.editCode,
        admin: options?.admin,
        allowDelete: options?.allowDelete,
      });
    },
    [now],
  );

  const openQuick = useCallback(
    (
      house: PublicHouse,
      options?: { editCode?: string; admin?: boolean },
    ) => {
      setFlow({
        house,
        step: "quick",
        editCode: options?.editCode,
        admin: options?.admin,
      });
    },
    [],
  );

  return { flow, openEdit, openQuick, close, setFlow };
}

export function HouseEditFlowPanels({
  flow,
  onClose,
  onUpdated,
  onDeleted,
  setFlow,
}: {
  flow: HouseEditFlowState | null;
  onClose: () => void;
  onUpdated: (house: PublicHouse) => void;
  onDeleted?: (houseId: string) => void;
  setFlow: React.Dispatch<React.SetStateAction<HouseEditFlowState | null>>;
}) {
  if (!flow) return null;

  const { house, editCode, admin, allowDelete } = flow;
  const now = useAppNow();
  const quickAvailable = quickUpdateAvailable(house, now);

  return (
    <>
      <QuickUpdateOverlay
        house={house}
        editCode={editCode}
        admin={admin}
        open={flow.step === "quick"}
        onClose={onClose}
        onUpdated={onUpdated}
        onOpenFull={() => setFlow((current) => (current ? { ...current, step: "full" } : current))}
      />
      {flow.step === "full" ? (
        <HouseEditOverlay
          house={house}
          editCode={editCode}
          admin={admin}
          allowDelete={allowDelete}
          quickAvailable={quickAvailable}
          onClose={onClose}
          onOpenQuick={() => setFlow((current) => (current ? { ...current, step: "quick" } : current))}
          onUpdated={onUpdated}
          onDeleted={onDeleted ? () => onDeleted(house.id) : undefined}
        />
      ) : null}
    </>
  );
}
