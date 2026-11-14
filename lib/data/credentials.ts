/**
 * Test data factory for user credentials.
 *
 * Emails must be unique per run because automationexercise.com rejects
 * sign-ups with an address that already has an account. The generated email
 * combines a timestamp with random/counter values so parallel workers cannot
 * collide.
 */

export interface UserCredentials {
  /** Display name shown in the header after signing up. */
  name: string;
  email: string;
  password: string;
}

let sequence = 0;

/** Create a set of unique, bogus credentials, with optional overrides. */
export function createUserCredentials(overrides: Partial<UserCredentials> = {}): UserCredentials {
  const unique = `${Date.now()}.${sequence++}.${Math.random().toString(36).slice(2, 8)}`;

  return {
    name: 'Bogus Signup User',
    email: `bogus.signup.${unique}@example.com`,
    password: 'bogus-password-123',
    ...overrides,
  };
}
