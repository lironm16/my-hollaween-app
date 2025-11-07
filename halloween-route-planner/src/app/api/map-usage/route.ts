import { NextResponse } from "next/server";
import {
  DEFAULT_FALLBACK_MAP_URL,
  DEFAULT_MAPBOX_MONTHLY_LIMIT,
  DEFAULT_MAPBOX_THRESHOLD,
} from "@/lib/constants";

type MapboxUsageResponse = {
  usages?: {
    map_loads?: {
      month?: {
        usage?: number;
        limit?: number;
      };
    };
  };
};

export const dynamic = "force-dynamic";

export async function GET() {
  const fallbackUrl =
    process.env.NEXT_PUBLIC_CACHED_MAP_URL ?? DEFAULT_FALLBACK_MAP_URL;

  const configuredLimit = Number(
    process.env.MAPBOX_MONTHLY_LIMIT ?? DEFAULT_MAPBOX_MONTHLY_LIMIT,
  );
  const threshold = Number(
    process.env.MAPBOX_USAGE_THRESHOLD ?? DEFAULT_MAPBOX_THRESHOLD,
  );

  const secretToken = process.env.MAPBOX_SECRET_TOKEN;
  const usageTokenId = process.env.MAPBOX_USAGE_TOKEN_ID;

  if (!secretToken || !usageTokenId) {
    return NextResponse.json(
      {
        allowed: true,
        usage: 0,
        limit: configuredLimit,
        remaining: configuredLimit,
        threshold,
        fallbackUrl,
        reason: "missing_mapbox_admin_token",
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  }

  try {
    const url = new URL(
      `https://api.mapbox.com/usage/v2/tokens/${usageTokenId}`,
    );
    url.searchParams.set("access_token", secretToken);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Mapbox usage request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as MapboxUsageResponse;
    const usage =
      payload.usages?.map_loads?.month?.usage ??
      Number(process.env.MAPBOX_USAGE_OVERRIDE ?? 0);
    const limit =
      payload.usages?.map_loads?.month?.limit ?? configuredLimit ?? 0;

    const remaining = Math.max(limit - usage, 0);
    const ratio = limit > 0 ? usage / limit : 0;
    const allowed = ratio < threshold;

    return NextResponse.json(
      {
        allowed,
        usage,
        limit,
        remaining,
        threshold,
        fallbackUrl,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=180",
        },
      },
    );
  } catch (error) {
    console.error("[map-usage] failed to fetch usage", error);

    return NextResponse.json(
      {
        allowed: true,
        usage: 0,
        limit: configuredLimit,
        remaining: configuredLimit,
        threshold,
        fallbackUrl,
        reason: "usage_fetch_failed",
      },
      {
        headers: {
          "Cache-Control": "private, max-age=120",
        },
      },
    );
  }
}
