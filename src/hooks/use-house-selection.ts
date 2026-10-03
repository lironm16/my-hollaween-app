"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clusterHousesByAddress, clusterMembersForHouse } from "@/lib/house-clusters";
import type { PublicHouse } from "@/lib/types";

export type SelectedId = string | "closed" | null;

export function useHouseSelection({
  focusId = null,
  visible,
  houses,
  clusterHouses,
}: {
  focusId?: string | null;
  visible: PublicHouse[];
  houses: PublicHouse[];
  /** Houses eligible for map clustering (e.g. real-only in visitor mode). */
  clusterHouses?: PublicHouse[];
}) {
  const clustersFor = clusterHouses ?? houses;
  const [selectedId, setSelectedId] = useState<SelectedId>(focusId);
  const [selectedListIndex, setSelectedListIndex] = useState<number | undefined>();
  const [listFocusId, setListFocusId] = useState<string | null>(null);
  const [focusSeen, setFocusSeen] = useState(focusId);
  const [clusterOverview, setClusterOverview] = useState(false);
  /** List picks a specific apartment — skip map-style cluster chrome in the overlay. */
  const [openedFromList, setOpenedFromList] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForId, setEditForId] = useState<SelectedId>(selectedId);

  useEffect(() => {
    if (!focusId || focusId === focusSeen) return;
    setFocusSeen(focusId);
    setSelectedId(focusId);
    setClusterOverview(false);
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
    return clusterMembersForHouse(clustersFor, selected.id);
  }, [selected, clustersFor]);

  const clearCluster = useCallback(() => {
    setClusterOverview(false);
  }, []);

  const closeSelection = useCallback(() => {
    setClusterOverview(false);
    setOpenedFromList(false);
    setSelectedId("closed");
    setListFocusId(null);
    setEditing(false);
  }, []);

  const dismissForOverlay = useCallback(() => {
    setEditing(false);
    setClusterOverview(false);
    setOpenedFromList(false);
    setListFocusId(null);
    setSelectedId("closed");
  }, []);

  const resetForNavigation = useCallback(() => {
    setSelectedId("closed");
    setClusterOverview(false);
    setListFocusId(null);
    setEditing(false);
  }, []);

  const selectOnMap = useCallback(
    (house: PublicHouse, opts?: { clusterOverview?: boolean }) => {
      setListFocusId(null);
      setOpenedFromList(false);
      const cluster = clusterHousesByAddress(clustersFor).find((item) =>
        item.houses.some((itemHouse) => itemHouse.id === house.id),
      );
      const isMulti = (cluster?.houses.length ?? 0) > 1;
      setClusterOverview(Boolean(opts?.clusterOverview && isMulti));
      setSelectedListIndex(undefined);
      setSelectedId(house.id);
    },
    [clustersFor],
  );

  const backToClusterOverview = useCallback(() => {
    setClusterOverview(true);
    setEditing(false);
  }, []);

  const selectAdjacentClusterHouse = useCallback(
    (delta: -1 | 1) => {
      if (!selected || selectedCluster.length <= 1) return;
      const index = selectedCluster.findIndex((item) => item.id === selected.id);
      if (index < 0) return;
      const next = selectedCluster[index + delta];
      if (!next) return;
      setClusterOverview(false);
      setEditing(false);
      setSelectedId(next.id);
    },
    [selected, selectedCluster],
  );

  const showOnMap = useCallback((id: string) => {
    setClusterOverview(false);
    setOpenedFromList(false);
    setEditing(false);
    setListFocusId(null);
    setSelectedListIndex(undefined);
    setSelectedId(id);
  }, []);

  const selectInList = useCallback((id: string, index: number) => {
    setClusterOverview(false);
    setOpenedFromList(true);
    setListFocusId(null);
    setSelectedListIndex(index);
    setSelectedId(id);
  }, []);

  const editInList = useCallback((id: string, index: number) => {
    setClusterOverview(false);
    setOpenedFromList(true);
    setListFocusId(null);
    setEditForId(id);
    setSelectedListIndex(index);
    setSelectedId(id);
    setEditing(true);
  }, []);

  const showInListFromMap = useCallback(
    (houseId: string) => {
      const index = visible.findIndex((house) => house.id === houseId);
      setClusterOverview(false);
      setSelectedListIndex(index >= 0 ? index + 1 : undefined);
      setListFocusId(houseId);
      setSelectedId("closed");
      setEditing(false);
    },
    [visible],
  );

  const clearListFocus = useCallback(() => {
    setListFocusId(null);
  }, []);

  return {
    selectedId,
    setSelectedId,
    selectedListIndex,
    clusterOverview,
    openedFromList,
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
    backToClusterOverview,
    selectAdjacentClusterHouse,
    showOnMap,
    selectInList,
    editInList,
    showInListFromMap,
    listFocusId,
    clearListFocus,
  };
}
