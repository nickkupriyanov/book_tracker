"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAchievements } from "@/state/achievements";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements";

/**
 * Renders a single Sonner toast per non-silent achievement
 * notification payload (spec 024 FR-10, §5.3). The bridge
 * acknowledges the payload once the toast is shown so the
 * same batch never re-renders a second toast.
 *
 * - One unlock  -> the achievement title, with a `View`
 *                  action that routes to `/achievements`.
 * - Many unlocks -> a calm aggregate toast with the same
 *                  routing action.
 *
 * Mounted only inside `RootClient`/`HttpLibrary`, both of
 * which run in the Next app-router context.
 */
export function AchievementToastBridge() {
  const notification = useAchievements((s) => s.notification);
  const acknowledge = useAchievements((s) => s.acknowledgeNotification);
  const lastIdRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (notification === null) return;
    const key = `${notification.unlockedAt}::${notification.ids.join(",")}`;
    if (lastIdRef.current === key) return;
    lastIdRef.current = key;
    if (notification.ids.length === 1) {
      const id = notification.ids[0];
      const def = ACHIEVEMENT_CATALOG.find((entry) => entry.id === id);
      toast.success(def?.title ?? "Achievement unlocked", {
        description: def?.description,
        action: {
          label: "View",
          onClick: () => router.push("/achievements"),
        },
      });
    } else {
      toast.success(`${notification.ids.length} achievements unlocked`, {
        action: {
          label: "View",
          onClick: () => router.push("/achievements"),
        },
      });
    }
    acknowledge();
  }, [notification, acknowledge, router]);

  return null;
}
