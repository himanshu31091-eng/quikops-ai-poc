/**
 * Application routes, as functions.
 *
 * Lives here rather than in a feature because more than one module links to a
 * case: the Work Manager, the Executive Dashboard's activity feed, bottlenecks
 * table and today's work list, and the global search in the app shell. When
 * each of those built its own path by hand, four of them built the wrong one
 * and every link 404'd. One definition makes that class of bug impossible.
 */

/**
 * Case detail route. The case number is the identifier operators quote to each
 * other, so it is what appears in the URL.
 */
export function caseHref(caseNo: string): string {
  return `/work/${encodeURIComponent(caseNo)}`;
}
