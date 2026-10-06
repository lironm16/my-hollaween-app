import type { ReactNode } from "react";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import { deviceHouseEditAllowed } from "@/lib/catalog-removed";
import type { PublicHouse } from "@/lib/types";
import type { ComponentProps } from "react";
import type { HouseActionBar } from "@/components/house-action-bar";
import type { HouseCard } from "@/components/house-card";

/** Shared handlers so list, map sheet, route, search, and /my use the same ⋮ menu. */
export type HouseCardActionContext = {
  admin?: boolean;
  catalogSource?: string | null;
  liked: (id: string) => boolean;
  visited: (id: string) => boolean;
  skipped: (id: string) => boolean;
  gemCollected?: (id: string) => boolean;
  onToggleLike?: (id: string) => void;
  onToggleVisited?: (id: string) => void;
  onToggleGem?: (house: PublicHouse) => void;
  onSkip?: (id: string) => void;
  onRestore?: (id: string) => void;
  onShowOnMap?: (id: string) => void;
  onShowInList?: (id: string) => void;
  onClusterVisitAll?: (houses: PublicHouse[]) => void;
  onClusterSkipAll?: (houses: PublicHouse[]) => void;
  onClusterLikeAll?: (houses: PublicHouse[]) => void;
  canEdit?: (id: string) => boolean;
  editCodeFor?: (id: string) => string | undefined;
  onEdit?: (house: PublicHouse) => void;
  skipMetaFor?: (id: string) => SkippedHouseMeta | undefined;
  editingId?: string | null;
};

export function houseCardPropsFor(
  house: PublicHouse,
  ctx: HouseCardActionContext,
  opts?: {
    index?: number;
    distanceM?: number;
    hideHoursBanner?: boolean;
    extra?: ReactNode;
    className?: string;
    expanded?: boolean;
    liveDetail?: boolean;
  },
): ComponentProps<typeof HouseCard> {
  const id = house.id;
  const isSkipped = ctx.skipped(id);
  const editAllowed = deviceHouseEditAllowed(id) && Boolean(ctx.canEdit?.(id));
  return {
    house,
    catalogSource: ctx.catalogSource,
    liked: ctx.liked(id),
    visited: ctx.visited(id),
    gemCollected: ctx.gemCollected?.(id),
    skipped: isSkipped,
    skipMeta: ctx.skipMetaFor?.(id),
    onToggleLike: ctx.onToggleLike ? () => ctx.onToggleLike!(id) : undefined,
    onToggleVisited: ctx.onToggleVisited ? () => ctx.onToggleVisited!(id) : undefined,
    onToggleGem: ctx.onToggleGem ? () => ctx.onToggleGem!(house) : undefined,
    onSkip: ctx.onSkip && !isSkipped ? () => ctx.onSkip!(id) : undefined,
    onRestoreRoute: ctx.onRestore && isSkipped ? () => ctx.onRestore!(id) : undefined,
    onShowOnMap: ctx.onShowOnMap ? () => ctx.onShowOnMap!(id) : undefined,
    onShowInList: ctx.onShowInList ? () => ctx.onShowInList!(id) : undefined,
    canEdit: editAllowed,
    editCode: editAllowed ? ctx.editCodeFor?.(id) : undefined,
    admin: ctx.admin,
    onToggleEdit: editAllowed && ctx.onEdit ? () => ctx.onEdit!(house) : undefined,
    editing: editAllowed && ctx.editingId === id,
    index: opts?.index,
    distanceM: opts?.distanceM,
    hideHoursBanner: opts?.hideHoursBanner,
    extra: opts?.extra,
    className: opts?.className,
    expanded: opts?.expanded,
    liveDetail: opts?.liveDetail,
  };
}

export function houseActionBarPropsFromCard(
  card: ComponentProps<typeof HouseCard>,
): ComponentProps<typeof HouseActionBar> {
  return {
    house: card.house,
    liked: card.liked,
    visited: card.visited,
    gemCollected: card.gemCollected,
    onToggleLike: card.onToggleLike,
    onToggleVisited: card.onToggleVisited,
    onToggleGem: card.onToggleGem,
    onSkip: card.onSkip,
    onRestoreRoute: card.onRestoreRoute,
    onShowOnMap: card.onShowOnMap,
    onShowInList: card.onShowInList,
    onToggleEdit: card.canEdit ? card.onToggleEdit : undefined,
    skipped: card.skipped,
    editing: card.editing,
    editCode: card.editCode,
    menuPlacement: "bottom",
  };
}

export function houseActionBarPropsFor(
  house: PublicHouse,
  ctx: HouseCardActionContext,
): ComponentProps<typeof HouseActionBar> {
  return houseActionBarPropsFromCard(houseCardPropsFor(house, ctx));
}
