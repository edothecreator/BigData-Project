/**
 * Yelp business attribute values arrive as Python-ish strings, e.g.
 *   "'casual'", "u'none'", "True", "False", "None",
 *   "{'garage': False, 'street': True, ...}"
 *
 * These helpers normalize them into clean display strings WITHOUT inventing
 * data. If a value is empty, "None", or an empty nested dict, we drop it rather
 * than show a misleading placeholder.
 */

/** Convert an UpperCamel attribute key into spaced words: "GoodForKids" -> "Good For Kids". */
export function prettifyAttributeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

/** Strip Python string prefixes/quotes: "u'no'" -> "no", "'casual'" -> "casual". */
function unquote(value: string): string {
  let v = value.trim();
  // Leading u/b prefix on a quoted string.
  v = v.replace(/^[ub]?'(.*)'$/s, "$1");
  v = v.replace(/^[ub]?"(.*)"$/s, "$1");
  return v.trim();
}

/** Title-case a simple token for display. */
function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Normalize one attribute value to a readable string, or null if it carries no
 * meaningful information.
 */
export function normalizeAttributeValue(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "number") return String(raw);

  if (typeof raw !== "string") {
    // Nested object (rare after import, but handle defensively).
    try {
      const entries = Object.entries(raw as Record<string, unknown>)
        .map(([k, v]) => {
          const nv = normalizeAttributeValue(v);
          return nv === "Yes" ? prettifyAttributeKey(k) : null;
        })
        .filter(Boolean);
      return entries.length ? entries.join(", ") : null;
    } catch {
      return null;
    }
  }

  const s = unquote(raw);
  if (!s || /^(none|null)$/i.test(s)) return null;

  // Booleans encoded as strings.
  if (/^true$/i.test(s)) return "Yes";
  if (/^false$/i.test(s)) return "No";

  // Python-dict-ish string: pull out the keys whose value is True.
  if (s.startsWith("{") && s.endsWith("}")) {
    const trueKeys: string[] = [];
    const re = /'([^']+)'\s*:\s*(True|False)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(s)) !== null) {
      if (match[2] === "True") trueKeys.push(prettifyAttributeKey(match[1]!));
    }
    return trueKeys.length ? trueKeys.join(", ") : null;
  }

  // Plain token, e.g. a price range "2" or a value "beer_and_wine".
  return titleCase(s.replace(/_/g, " "));
}
