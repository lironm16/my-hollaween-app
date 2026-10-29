/** Free-text fields checked for lobby / main-entrance wording. */
export type AccessibleHintTextFields = {
  arrival?: string;
  description?: string;
  notes?: string;
};

const ENTRANCE_PHRASE =
  /\b(?:main\s+entrance|building\s+entrance|lobby\s+entrance|entrance\s+lobby|front\s+entrance|ground\s?-?floor\s+entrance|entrance\s+hall)\b/i;

/** True when copy suggests meeting at a lobby or building entrance (not plain apartment directions). */
export function textMentionsLobbyOrMainEntrance(...fields: (string | undefined)[]): boolean {
  const blob = fields
    .map((field) => field?.trim())
    .filter(Boolean)
    .join("\n");
  if (!blob) return false;

  if (/לובי/u.test(blob) || /\blobby\b/i.test(blob)) return true;
  if (ENTRANCE_PHRASE.test(blob)) return true;
  if (/\bentrance\b/i.test(blob)) return true;

  if (/כניסה\s+ראשית/u.test(blob)) return true;
  if (/כניס[ahת]\s+(?:ל|ב)?\s*לובי/u.test(blob)) return true;
  if (/כניסה\s+לבניין/u.test(blob)) return true;
  if (/לובי[\s,]+כניסה/u.test(blob)) return true;
  if (/כניסה[\s,]+(?:של\s+)?(?:ה)?בניין/u.test(blob)) return true;

  return false;
}

export function lobbyOrEntranceMentionSnippet(fields: AccessibleHintTextFields): string | undefined {
  for (const field of [fields.arrival, fields.description, fields.notes]) {
    const trimmed = field?.trim();
    if (!trimmed) continue;
    if (textMentionsLobbyOrMainEntrance(trimmed)) return trimmed.slice(0, 120);
  }
  return undefined;
}

function textNegatesElevator(blob: string): boolean {
  if (/(?:^|[\s,.(—-])(?:אין|בלי|ללא)\s*מעלית/u.test(blob)) return true;
  if (/\bno\s+elevator\b/i.test(blob)) return true;
  if (/\bwithout\s+(?:an?\s+)?elevator\b/i.test(blob)) return true;
  return false;
}

/** True when copy mentions an elevator as part of directions (not “no elevator”). */
export function textMentionsElevator(...fields: (string | undefined)[]): boolean {
  const blob = fields
    .map((field) => field?.trim())
    .filter(Boolean)
    .join("\n");
  if (!blob || textNegatesElevator(blob)) return false;

  if (/מעלית/u.test(blob)) return true;
  if (/\b(?:elevators?|lifts?)\b/i.test(blob)) return true;
  return false;
}

export function elevatorMentionSnippet(fields: AccessibleHintTextFields): string | undefined {
  for (const field of [fields.arrival, fields.description, fields.notes]) {
    const trimmed = field?.trim();
    if (!trimmed) continue;
    if (textMentionsElevator(trimmed)) return trimmed.slice(0, 120);
  }
  return undefined;
}
