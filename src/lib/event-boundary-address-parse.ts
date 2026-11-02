/** Parse free-text Hebrew address queries like "נחליאלי 4 רמת גן". */
export function parsePointAddressQuery(q: string): {
  houseNumber: string;
  street: string;
  city: string;
} | null {
  const trimmed = q.trim().replace(/\s+/g, " ");
  const numMatch = trimmed.match(/(\d+[א-ת]?)/);
  if (!numMatch) return null;
  const houseNumber = numMatch[1];
  let withoutNum = trimmed.replace(houseNumber, " ").replace(/\s+/g, " ").trim();
  withoutNum = withoutNum.replace(/^[,،\s]+|[,،\s]+$/g, "");
  if (!withoutNum) return null;

  const commaParts = withoutNum.split(/[,،]/).map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    return {
      houseNumber,
      street: commaParts[0]!,
      city: commaParts.slice(1).join(", "),
    };
  }

  const words = withoutNum.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  if (words.length >= 3) {
    const city = words.slice(-2).join(" ");
    const street = words.slice(0, -2).join(" ");
    if (street.length >= 2) return { houseNumber, street, city };
  }

  const city = words[words.length - 1]!;
  const street = words.slice(0, -1).join(" ");
  if (street.length < 2) return null;
  return { houseNumber, street, city };
}
