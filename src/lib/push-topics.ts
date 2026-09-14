import type { PushKind } from "@/lib/push-templates";

export const PUSH_TOPICS = ["newHouse", "houseStatus", "admin"] as const;
export type PushTopic = (typeof PUSH_TOPICS)[number];
export type PushTopicPrefs = Record<PushTopic, boolean>;

export const PUSH_TOPIC_ROWS: { id: PushTopic; title: string; hint: string }[] = [
  {
    id: "newHouse",
    title: "בית חדש נוסף",
    hint: "לפני ליל האלווין — כשבית חדש נרשם למפה",
  },
  { id: "admin", title: "הודעות מהמנהלים", hint: "מסרים מותאמים בלילה (וגם לפניו)" },
];

export const PUSH_TOPIC_LABELS: Record<PushTopic, string> = {
  newHouse: PUSH_TOPIC_ROWS[0]!.title,
  houseStatus: "עדכונים שוטפים בלילה",
  admin: PUSH_TOPIC_ROWS[1]!.title,
};

export const DEFAULT_PUSH_TOPIC_PREFS: PushTopicPrefs = {
  newHouse: true,
  houseStatus: false,
  admin: true,
};

export function topicsFromPrefs(prefs: PushTopicPrefs): PushTopic[] {
  return PUSH_TOPICS.filter((topic) => prefs[topic]);
}

export function anyPushTopicOn(prefs: PushTopicPrefs) {
  return PUSH_TOPICS.some((topic) => prefs[topic]);
}

export function normalizePushTopics(input: unknown): PushTopic[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const allowed = new Set<PushTopic>(PUSH_TOPICS);
  const seen = new Set<PushTopic>();
  for (const item of input) {
    if (typeof item === "string" && allowed.has(item as PushTopic)) {
      seen.add(item as PushTopic);
    }
  }
  return PUSH_TOPICS.filter((topic) => seen.has(topic));
}

export function topicForKind(kind: PushKind): PushTopic {
  return kind === "houseAdded" ? "newHouse" : "houseStatus";
}

/** Older records with no topics list still get every alert. */
export function subscriptionAllowsTopic(
  sub: { topics?: PushTopic[] },
  topic: PushTopic | undefined,
) {
  if (!topic) return true;
  if (!sub.topics || sub.topics.length === 0) return true;
  return sub.topics.includes(topic);
}
