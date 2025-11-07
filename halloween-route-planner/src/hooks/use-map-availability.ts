"use client";

import { useQuery } from "@tanstack/react-query";

type MapAvailabilityResponse = {
  allowed: boolean;
  usage: number;
  limit: number;
  remaining: number;
  threshold: number;
  fallbackUrl: string;
  reason?: string;
};

async function fetchMapAvailability(): Promise<MapAvailabilityResponse> {
  const response = await fetch("/api/map-usage", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("failed_to_fetch_map_availability");
  }

  return (await response.json()) as MapAvailabilityResponse;
}

export function useMapAvailability(enabled: boolean) {
  return useQuery({
    queryKey: ["map-availability"],
    queryFn: fetchMapAvailability,
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchInterval: enabled ? 1000 * 60 : false,
    retry: 1,
  });
}
