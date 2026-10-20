import type { ReactNode } from "react";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import { deviceHouseEditAllowed } from "@/lib/catalog-removed";
import type { PublicHouse } from "@/lib/types";
import type { ComponentProps } from "react";
import type { HouseActionBar } from "@/components/house-action-bar";
import type { HouseCard } from "@/components/house-card";
import type { HouseCardQuickActions } from "@/components/house-card-quick-actions";

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
  onClusterUnvisitAll?: (houses: PublicHouse[]) => void;
  onClusterSkipAll?: (houses: PublicHouse[]) => void;
  onClusterRestoreAll?: (houses: PublicHouse[]) => void;
  onClusterLikeAll?: (houses: PublicHouse[]) => void;
  onClusterUnlikeAll?: (houses: PublicHouse[]) => void;
  /** Cluster ⋮ — sequential camera session for every inner house (not per-house «מצא שדון»). */
  onClusterFindAllGems?: (houses: PublicHouse[]) => void;
  onClusterResetAllGems?: (houses: PublicHouse[]) => void;
  /** When set, per-house gate for the card-top gem button (map/list still use full ctx.onToggleGem). */
  gemQuickActionEligible?: (house: PublicHouse) => boolean;
  /** Hunt-range glow on the card gem button (same range as map pin sparkle). */
  gemNearHunt?: (houseId: string) => boolean;
  canEdit?: (id: string) => boolean;
  editCodeFor?: (id: string) => string | undefined;
  onEdit?: (house: PublicHouse) => void;
  nightPassesEnabled?: boolean;
  /** This device's registered night pass is for this house id. */
  registeredNightPassOnHouse?: (id: string) => boolean;
  onNightPasses?: (house: PublicHouse) => void;
  /** Owner/admin ⋮ «מיקום השדון» — only shown on houses this device may edit. */
  onPlaceGem?: (house: PublicHouse) => void;
  skipMetaFor?: (id: string) => SkippedHouseMeta | undefined;
  onApproveSkipReturn?: (id: string) => void;
  onRevokeSkipReturn?: (id: string) => void;
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
    clusterBoothTag?: string | null;
  },
): ComponentProps<typeof HouseCard> {
  const id = house.id;
  const isSkipped = ctx.skipped(id);
  const editAllowed = deviceHouseEditAllowed(id) && Boolean(ctx.canEdit?.(id));
  const passOnHouse =
    Boolean(ctx.nightPassesEnabled) && Boolean(ctx.registeredNightPassOnHouse?.(id));
  const viewNightPassDevices = editAllowed || passOnHouse;
  const viewOnlyRemoved = !deviceHouseEditAllowed(id);
  return {
    house,
    catalogSource: ctx.catalogSource,
    liked: ctx.liked(id),
    visited: ctx.visited(id),
    gemCollected: ctx.gemCollected?.(id),
    skipped: isSkipped,
    skipMeta: ctx.skipMetaFor?.(id),
    onApproveSkipReturn: ctx.onApproveSkipReturn
      ? () => ctx.onApproveSkipReturn!(id)
      : undefined,
    onRevokeSkipReturn: ctx.onRevokeSkipReturn ? () => ctx.onRevokeSkipReturn!(id) : undefined,
    onToggleLike:
      viewOnlyRemoved || !ctx.onToggleLike ? undefined : () => ctx.onToggleLike!(id),
    onToggleVisited:
      viewOnlyRemoved || !ctx.onToggleVisited ? undefined : () => ctx.onToggleVisited!(id),
    onToggleGem:
      viewOnlyRemoved ||
      !ctx.onToggleGem ||
      !(ctx.gemQuickActionEligible?.(house) ?? true)
        ? undefined
        : () => ctx.onToggleGem!(house),
    gemNearHunt: Boolean(ctx.gemNearHunt?.(id) && !ctx.gemCollected?.(id)),
    onSkip:
      viewOnlyRemoved || !ctx.onSkip || isSkipped ? undefined : () => ctx.onSkip!(id),
    onRestoreRoute:
      viewOnlyRemoved || !ctx.onRestore || !isSkipped ? undefined : () => ctx.onRestore!(id),
    onShowOnMap:
      viewOnlyRemoved || !ctx.onShowOnMap ? undefined : () => ctx.onShowOnMap!(id),
    onShowInList:
      viewOnlyRemoved || !ctx.onShowInList ? undefined : () => ctx.onShowInList!(id),
    canEdit: editAllowed,
    editCode: editAllowed ? ctx.editCodeFor?.(id) : undefined,
    showVisitPoster: editAllowed,
    admin: ctx.admin,
    nightPassesEnabled: viewNightPassDevices && ctx.nightPassesEnabled,
    onToggleEdit: editAllowed && ctx.onEdit ? () => ctx.onEdit!(house) : undefined,
    onPlaceGem:
      editAllowed && ctx.onPlaceGem && (ctx.gemQuickActionEligible?.(house) ?? true)
        ? () => ctx.onPlaceGem!(house)
        : undefined,
    editing: editAllowed && ctx.editingId === id,
    index: opts?.index,
    distanceM: opts?.distanceM,
    hideHoursBanner: opts?.hideHoursBanner,
    extra: opts?.extra,
    className: opts?.className,
    expanded: opts?.expanded,
    liveDetail: opts?.liveDetail,
    clusterBoothTag: opts?.clusterBoothTag,
  };
}

export function houseQuickActionPropsFromCard(
  card: ComponentProps<typeof HouseCard>,
): ComponentProps<typeof HouseCardQuickActions> {
  return {
    liked: card.liked,
    visited: card.visited,
    gemCollected: card.gemCollected,
    gemNearHunt: card.gemNearHunt,
    onToggleLike: card.onToggleLike,
    onToggleVisited: card.onToggleVisited,
    onToggleGem: card.onToggleGem,
    onSkip: card.onSkip,
    onRestoreRoute: card.onRestoreRoute,
    skipped: card.skipped,
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
    onPlaceGem: card.onPlaceGem,
    skipped: card.skipped,
    editing: card.editing,
    editCode: card.editCode,
    admin: card.admin,
    nightPassesEnabled: card.nightPassesEnabled,
    showVisitPoster: card.showVisitPoster,
    menuPlacement: "bottom",
  };
}

export function houseActionBarPropsFor(
  house: PublicHouse,
  ctx: HouseCardActionContext,
): ComponentProps<typeof HouseActionBar> {
  return houseActionBarPropsFromCard(houseCardPropsFor(house, ctx));
}
