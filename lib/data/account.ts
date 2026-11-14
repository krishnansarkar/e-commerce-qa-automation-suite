import type { UserCredentials } from './credentials';

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
export type CreateAccountForm = {
  name: string;
  email: string;
  password: string;
  title: string;
  birth_date: string;
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

/** Build a complete create-account body from generated credentials. */
export function createAccountForm(account: UserCredentials): CreateAccountForm {
  return {
    name: account.name,
    email: account.email,
    password: account.password,
    title: 'Mrs',
    birth_date: '15',
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
