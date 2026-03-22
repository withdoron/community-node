// Shared invite code generator — used by Team and PM workspace onboarding/settings.
// 6 uppercase alphanumeric chars, excluding ambiguous characters (I, O, L, 0, 1).

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
