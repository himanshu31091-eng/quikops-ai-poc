/**
 * What a mutation tells its caller.
 *
 * Its own module because a `"use server"` file may only export async
 * functions, and both sides of the boundary need this shape: the actions
 * return it, and the client that called them reads it.
 *
 * A failure carries a sentence a person can act on, not a stack trace. The
 * caller shows it and re-reads the server record, so a write that did not
 * happen never leaves an optimistic change on screen looking saved.
 */
export type MutationResult = { ok: true } | { ok: false; error: string };

/**
 * Creating a case returns the number the server assigned.
 *
 * The client cannot compute it: the sequence belongs to the tenant, and a
 * number chosen in the browser would collide the moment two people raised a
 * case at once. The caller needs it to route to the case it just created.
 */
export type CreateCaseResult = { ok: true; caseNo: string } | { ok: false; error: string };
