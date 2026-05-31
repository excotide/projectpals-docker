/**
 * Toggle an item in a preference selection where one option ("flexible") is
 * mutually exclusive with the rest:
 *
 * - Selecting `flex` clears everything else (and selecting it again clears all).
 * - Selecting a real option removes `flex` first (they can't coexist).
 * - Selecting all real options collapses the selection to just `[flex]`.
 *
 * This naturally caps the result at 2 real options (picking the 3rd collapses
 * to flexible) or flexible alone — satisfying the backend `max:2` rule.
 */
export function toggleFlexible(
  current: string[],
  item: string,
  opts: { flex: string; reals: string[] },
): string[] {
  const { flex, reals } = opts;

  if (item === flex) {
    return current.length === 1 && current[0] === flex ? [] : [flex];
  }

  let next = current.filter((x) => x !== flex);
  next = next.includes(item) ? next.filter((x) => x !== item) : [...next, item];

  if (reals.every((r) => next.includes(r))) {
    return [flex];
  }

  return next;
}
