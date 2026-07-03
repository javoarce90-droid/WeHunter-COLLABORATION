/**
 * Prefijos de ruta por "reino" (recruiter vs candidato). Única fuente de verdad — la usan
 * `proxy.ts` (qué rutas exigen sesión) y los `safeRedirect` de cada lado (a qué reino NO
 * puede apuntar un redirect post-login, aunque venga por query param). Ver
 * candidate-real-auth-refactor / fix de tipo de cuenta real.
 */

export const RECRUITER_ROUTE_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/talent",
  "/interviews",
  "/reports",
  "/onboarding",
];

export const CANDIDATE_ROUTE_PREFIXES = ["/c/profile", "/c/onboarding", "/portal"];

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isRecruiterRoute(path: string): boolean {
  return matchesPrefix(path, RECRUITER_ROUTE_PREFIXES);
}

export function isCandidateRoute(path: string): boolean {
  return matchesPrefix(path, CANDIDATE_ROUTE_PREFIXES);
}
