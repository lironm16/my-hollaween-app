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

/** Strip “no / broken elevator” phrases before checking for usable-elevator directions. */
export function scrubNonUsableElevatorMentions(text: string): string {
  let scrubbed = text;
  scrubbed = scrubbed.replace(
    /(?:^|[\s,.(—\-]|^)(?:אין|בלי|ללא)\s+מעלית/giu,
    " ",
  );
  scrubbed = scrubbed.replace(
    /ה?מעלית\s+לא\s+(?:עובד(?:ת)?|תקינ(?:ה)?|פעיל(?:ה)?|פועל(?:ת)?)/giu,
    " ",
  );
  scrubbed = scrubbed.replace(/\b(?:no|without)\s+(?:an?\s+)?(?:elevator|lift)s?\b/giu, " ");
  scrubbed = scrubbed.replace(
    /\b(?:elevator|lift)s?\s+(?:not\s+working|broken|out\s+of\s+order|doesn'?t\s+work)\b/giu,
    " ",
  );
  return scrubbed;
}

/** True when copy mentions an elevator as part of directions (not “no / broken elevator”). */
export function textMentionsElevator(...fields: (string | undefined)[]): boolean {
  const blob = fields
    .map((field) => field?.trim())
    .filter(Boolean)
    .join("\n");
  if (!blob) return false;

  const scrubbed = scrubNonUsableElevatorMentions(blob);
  if (/מעלית/u.test(scrubbed)) return true;
  if (/\b(?:elevators?|lifts?)\b/i.test(scrubbed)) return true;
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
