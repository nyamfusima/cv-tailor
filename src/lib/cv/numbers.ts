const NUMBER_RE = /(?:\d+(?:[.,]\d+)?%?)/g;

export function extractNumbers(text: string): string[] {
  return (text.match(NUMBER_RE) ?? []).map((n) => n.replace(/,/g, ""));
}

export function numberBag(text: string): Map<string, number> {
  const bag = new Map<string, number>();
  for (const n of extractNumbers(text)) {
    bag.set(n, (bag.get(n) ?? 0) + 1);
  }
  return bag;
}

/** True when `candidate` contains a numeric token that `source` does not. */
export function introducesNewNumbers(candidate: string, source: string): boolean {
  const sourceBag = numberBag(source);
  const candidateBag = numberBag(candidate);
  for (const [n, count] of candidateBag) {
    if ((sourceBag.get(n) ?? 0) < count) return true;
  }
  return false;
}

export function collectAllNumbers(texts: string[]): Set<string> {
  const set = new Set<string>();
  for (const text of texts) {
    for (const n of extractNumbers(text)) set.add(n);
  }
  return set;
}
