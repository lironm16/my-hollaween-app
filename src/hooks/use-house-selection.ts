"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clusterHousesByAddress } from "@/lib/house-clusters";
import type { PublicHouse } from "@/lib/types";

export type SelectedId = string | "closed" | null;

export function useHouseSelection({
  focusId = null,
  visible,
  houses,
}: {
  focusId?: string | null;
  visible: PublicHouse[];
  houses: PublicHouse[];
}) {
  const [selectedId, setSelectedId] = useState<SelectedId>(focusId);
  const [selectedListIndex, setSelectedListIndex] = useState<number | undefined>();
  const [focusSeen, setFocusSeen] = useState(focusId);
  const [clusterOverview, setClusterOverview] = useState(false);
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForId, setEditForId] = useState<SelectedId>(selectedId);

  useEffect(() => {
    if (!focusId || focusId === focusSeen) return;
    setFocusSeen(focusId);
    setSelectedId(focusId);
    setClusterOverview(false);
    setExpandedClusterKey(null);
  }, [focusId, focusSeen]);

  useEffect(() => {
    if (selectedId === editForId) return;
    setEditForId(selectedId);
    setEditing(false);
  }, [selectedId, editForId]);

  const activeId = selectedId === "closed" ? null : (selectedId ?? focusId);
  const editHouseId = activeId;

  const selected =
    visible.find((house) => house.id === activeId) ??
    houses.find((house) => house.id === activeId) ??
    null;

  const selectedCluster = useMemo(() => {
    if (!selected) return [];
    const cluster = clusterHousesByAddress(houses).find((item) =>
      item.houses.some((house) => house.id === selected.id),
    );
    return cluster?.houses ?? [selected];
  }, [selected, houses]);

  const clearCluster = useCallback(() => {
    setClusterOverview(false);
    setExpandedClusterKey(null);
  }, []);

  const closeSelection = useCallback(() => {
    setClusterOverview(false);
    setSelectedId("closed");
    setEditing(false);
  }, []);

  const dismissForOverlay = useCallback(() => {
    setEditing(false);
    setClusterOverview(false);
    setSelectedId("closed");
  }, []);

  const resetForNavigation = useCallback(() => {
    setSelectedId("closed");
    setClusterOverview(false);
    setExpandedClusterKey(null);
    setEditing(false);
  }, []);

  const selectOnMap = useCallback(
    (house: PublicHouse, opts?: { clusterOverview?: boolean }) => {
      const cluster = clusterHousesByAddress(houses).find((item) =>
        item.houses.some((itemHouse) => itemHouse.id === house.id),
      );
      const isMulti = (cluster?.houses.length ?? 0) > 1;
      if (opts?.clusterOverview) {
        setExpandedClusterKey(cluster?.key ?? null);
        setClusterOverview(true);
      } else if (isMulti) {
        setExpandedClusterKey(cluster?.key ?? null);
        setClusterOverview(false);
      } else {
        setExpandedClusterKey(null);
        setClusterOverview(false);
      }
      setSelectedListIndex(undefined);
      setSelectedId(house.id);
    },
    [houses],
  );

  const collapseCluster = useCallback(() => {
    setExpandedClusterKey(null);
    setClusterOverview(false);
    setSelectedId("closed");
  }, []);

  const showOnMap = useCallback((id: string) => {
    setClusterOverview(false);
    setExpandedClusterKey(null);
    setEditing(false);
    setSelectedListIndex(undefined);
    setSelectedId(id);
  }, []);

  const selectInList = useCallback((id: string, index: number) => {
    setClusterOverview(false);
    setSelectedListIndex(index);
    setSelectedId(id);
  }, []);

  const editInList = useCallback((id: string, index: number) => {
    setClusterOverview(false);
    setEditForId(id);
    setSelectedListIndex(index);
    setSelectedId(id);
    setEditing(true);
  }, []);

  const showInListFromMap = useCallback(
    (houseId: string) => {
      const index = visible.findIndex((house) => house.id === houseId);
      setClusterOverview(false);
      setExpandedClusterKey(null);
      setSelectedListIndex(index >= 0 ? index + 1 : undefined);
    },
    [visible],
  );

  return {
    selectedId,
    setSelectedId,
    selectedListIndex,
    clusterOverview,
    expandedClusterKey,
    editing,
    setEditing,
    editForId,
    activeId,
    editHouseId,
    selected,
    selectedCluster,
    clearCluster,
    closeSelection,
    dismissForOverlay,
    resetForNavigation,
    selectOnMap,
    collapseCluster,
    showOnMap,
    selectInList,
    editInList,
    showInListFromMap,
  };
}
