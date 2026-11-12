/**
 * An error whose message is written for a volunteer, not a developer. The UI shows
 * `message` as-is, so keep it plain English and say what to do next.
 */
export class FriendlyError extends Error {
  override name = 'FriendlyError';
}
