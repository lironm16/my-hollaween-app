/** Isolated E2E / integration test houses — never shown in visitor "real" mode. */

export const E2E_HOUSE_ADDRESS = "העמל 99";

const TEST_NAME =
  /(?:^בית אינטגרציה$|בית (?:בדיקה(?:\s*[—–-]\s*.+)?|תור E2E|batch5|poll E2E|בדיקה E2E|אינטגרציה)|(?:אינטגרציה|סטאב E2E)(?:\s*[—–-]\s*.+)?)/;
const TEST_DESCRIPTION = /בדיק(?:ה|ת)\s+(?:E2E|batch5|תור offline|API)/i;

export function isE2eTestHouse(house: {
  name?: string;
  description?: string;
  address?: string;
}) {
  const name = house.name ?? "";
  const description = house.description ?? "";
  const address = house.address ?? "";
  return (
    TEST_NAME.test(name) ||
    TEST_DESCRIPTION.test(description) ||
    address === E2E_HOUSE_ADDRESS ||
    (address === "חרוזים 8" && TEST_DESCRIPTION.test(description))
  );
}
