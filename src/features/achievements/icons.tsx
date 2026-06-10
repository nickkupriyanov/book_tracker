/**
 * Lucide icon resolver for the v1 achievement catalog. One
 * icon per `AchievementIconKey` so the catalog stays decoupled
 * from the visual library.
 */

import {
  Award,
  BookOpen,
  CalendarDays,
  Quote,
  Star,
  Trophy,
} from "lucide-react";
import type { AchievementIconKey } from "@/types/achievement";

interface IconDescriptor {
  Icon: typeof Award;
  label: string;
}

const ICON_MAP: Record<AchievementIconKey, IconDescriptor> = {
  "first-book": { Icon: BookOpen, label: "First book" },
  "five-books": { Icon: Trophy, label: "Five books" },
  "long-read": { Icon: BookOpen, label: "Long read" },
  "first-quote": { Icon: Quote, label: "First quote" },
  "first-review": { Icon: Quote, label: "First review" },
  "five-rated": { Icon: Star, label: "Five rated" },
  streak: { Icon: CalendarDays, label: "Reading streak" },
  "thousand-pages": { Icon: Award, label: "Thousand pages" },
};

export function getAchievementIcon(key: AchievementIconKey): IconDescriptor {
  return ICON_MAP[key];
}
