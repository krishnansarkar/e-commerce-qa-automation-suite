/**
 * Test data factory for users: account details plus login credentials.
 *
 * Emails must be unique per run because automationexercise.com rejects
 * sign-ups with an address that already has an account. The generated email
 * combines a timestamp with random/counter values so parallel workers cannot
 * collide.
 */

/** Valid title options **/
export type Title = 'Mr' | 'Mrs';

/**
 * Form body accepted by POST /api/createAccount.
 *
 * The API expects every field as a form value; dates are plain strings and
 * the country is sent by name (e.g. "United States").
 *
 * Declared as a type alias rather than an interface so it is assignable to
 * Playwright's `form` option (`{ [key: string]: string | number | boolean }`):
 * interfaces have no implicit index signature, type aliases do.
 */
export type AccountInfo = {
  name: string;
  title: Title;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  firstname: string;
  lastname: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  zipcode: string;
  state: string;
  city: string;
  mobile_number: string;
};

/** Build a complete create-account body. */
export function createAccountInfo(): AccountInfo {
  return {
    name: 'Bogus Tester',
    title: 'Mrs',
    birth_day: '15',
    birth_month: '1',
    birth_year: '1990',
    firstname: 'Bogus',
    lastname: 'Tester',
    company: 'Bogus Co',
    address1: '1 Fake Street',
    address2: 'Suite 404',
    country: 'United States',
    zipcode: '90210',
    state: 'California',
    city: 'Nowhere',
    mobile_number: '555-0100',
  };
}

export type UserCredentials = {
  email: string;
  password: string;
}

export type GeneratedUser = UserCredentials & AccountInfo;

let sequence = 0;

function createCredentials(): UserCredentials {
  return {
    email: `bogus.signup.${Date.now()}.${sequence++}.${Math.random()
      .toString(36)
      .slice(2, 8)}@example.com`,
    password: 'bogus-password-123',
  };
}

export function createUser(overrides: Partial<GeneratedUser> = {}): GeneratedUser {
  const account: GeneratedUser = {
    ...createCredentials(),
    ...createAccountInfo(),
    ...overrides,
  };

  return account;
}
