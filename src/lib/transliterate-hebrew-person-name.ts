const HEBREW_LETTER = /[\u0590-\u05FF]/;

/** True when the string is mostly Hebrew letters (personal-name shaped). */
export function isMostlyHebrewText(text: string): boolean {
  const hebrew = (text.match(new RegExp(HEBREW_LETTER.source, "gu")) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = hebrew + latin;
  if (total === 0) return false;
  return hebrew / total >= 0.55;
}

function isConsonantLetter(char: string | undefined): boolean {
  if (!char) return false;
  return !"אוי".includes(char);
}

function mapHebrewLetter(char: string, index: number, word: string): string {
  const atStart = index === 0;
  const prev = word[index - 1];
  const next = word[index + 1];
  switch (char) {
    case "א":
      return "";
    case "ב":
      return atStart ? "b" : "v";
    case "ג":
      return "g";
    case "ד":
      return "d";
    case "ה":
      return index === 0 ? "h" : "";
    case "ו":
      if (isConsonantLetter(prev) && isConsonantLetter(next)) return "o";
      return "v";
    case "ז":
      return "z";
    case "ח":
      return "h";
    case "ט":
      return "t";
    case "י":
      return atStart ? "y" : "i";
    case "כ":
    case "ך":
      return "k";
    case "ל":
      return "l";
    case "מ":
    case "ם":
      return "m";
    case "נ":
    case "ן":
      return "n";
    case "ס":
      return "s";
    case "ע":
      return "";
    case "פ":
      return atStart ? "p" : "f";
    case "ף":
      return "f";
    case "צ":
    case "ץ":
      return "tz";
    case "ק":
      return "k";
    case "ר":
      return "r";
    case "ש":
      return "sh";
    case "ת":
      return "t";
    default:
      return "";
  }
}

function transliterateHebrewWord(word: string): string {
  const hebrewOnly = [...word].filter((ch) => HEBREW_LETTER.test(ch)).join("");
  if (!hebrewOnly) return word;

  let latin = "";
  let startIndex = 0;
  if (hebrewOnly.startsWith("או")) {
    latin = "o";
    startIndex = 2;
  } else {
    const second = hebrewOnly[1];
    if (hebrewOnly[0] === "י" && second && !"יוֹהא".includes(second)) {
      latin = "ya";
      startIndex = 1;
    }
  }
  for (let i = startIndex; i < hebrewOnly.length; i += 1) {
    latin += mapHebrewLetter(hebrewOnly[i]!, i, hebrewOnly);
  }
  latin = latin.replace(/(.)\1{2,}/gu, "$1$1");
  if (!latin) return word;
  return latin.charAt(0).toUpperCase() + latin.slice(1).toLowerCase();
}

/**
 * Romanize Hebrew submitter / family names for English UI — never word-for-word translation
 * (e.g. יריב → Yariv, not "rival").
 */
export function transliterateHebrewPersonName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return input;

  const mishpachat = trimmed.match(/^משפחת\s+(.+)$/u);
  if (mishpachat) {
    const family = transliterateHebrewPersonName(mishpachat[1]!.trim());
    return `${family} family`;
  }

  if (!isMostlyHebrewText(trimmed)) return trimmed;

  return trimmed
    .split(/\s+/u)
    .map((part) => {
      if (!isMostlyHebrewText(part)) return part;
      return transliterateHebrewWord(part);
    })
    .join(" ");
}
