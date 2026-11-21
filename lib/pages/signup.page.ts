import { type Locator, type Page } from '@playwright/test';
import { Title } from '../data/user';

export interface SignupPersonalDetails {
  title?: Title;
  password: string;
  /** Day of birth, 1-31. */
  day?: string;
  /** Full month name, e.g. "January". */
  month?: string;
  /** Four-digit year of birth, 1900-2021. */
  year?: string;
  newsletter?: boolean;
  specialOffers?: boolean;
}

export interface SignupAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  address2?: string;
  /** Country option label, e.g. "United States". */
  country?: string;
  state: string;
  city: string;
  zipcode: string;
  mobileNumber: string;
}

/**
 * Page object for https://automationexercise.com/signup
 *
 * This is the "Enter Account Information" page reached after submitting the
 * "New User Signup!" form on /login. It cannot be opened by URL alone because
 * the form is pre-populated from the name/email POSTed by the login page, so it
 * is reached through `LoginPage.signup()`.
 *
 * Notes on the site's markup:
 * - Required fields are labelled with a trailing " *", and Playwright's
 *   `getByLabel()` is substring-based by default, so exact matching keeps
 *   "Name *" from also matching "First name *" and "Last name *".
 * - The date-of-birth <select> elements have no accessible name; the site's
 *   `data-qa` hooks (via `getByTestId()`) are the only stable handle on them.
 * - The "Zipcode *" label's `for` attribute incorrectly points at the city
 *   input, so `getByLabel('Zipcode *')` resolves to the city field. The
 *   zipcode input is addressed via `getByTestId('zipcode')` instead.
 */
export class SignupPage {
  readonly page: Page;

  // Page-level landmarks
  readonly accountInformationHeading: Locator;
  readonly addressInformationHeading: Locator;

  // Account information
  readonly titleMrRadio: Locator;
  readonly titleMrsRadio: Locator;
  readonly nameInput: Locator;
  /** Disabled input, pre-filled from the signup form on /login. */
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly daySelect: Locator;
  readonly monthSelect: Locator;
  readonly yearSelect: Locator;
  readonly newsletterCheckbox: Locator;
  readonly specialOffersCheckbox: Locator;

  // Address information
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly companyInput: Locator;
  readonly addressInput: Locator;
  readonly address2Input: Locator;
  readonly countrySelect: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;
  readonly zipcodeInput: Locator;
  readonly mobileNumberInput: Locator;

  readonly createAccountButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.accountInformationHeading = page.getByRole('heading', { name: 'Enter Account Information' });
    this.addressInformationHeading = page.getByRole('heading', { name: 'Address Information' });

    this.titleMrRadio = page.getByRole('radio', { name: 'Mr.' });
    this.titleMrsRadio = page.getByRole('radio', { name: 'Mrs.' });
    this.nameInput = page.getByLabel('Name *', { exact: true });
    this.emailInput = page.getByLabel('Email *', { exact: true });
    this.passwordInput = page.getByLabel('Password *', { exact: true });
    this.daySelect = page.getByTestId('days');
    this.monthSelect = page.getByTestId('months');
    this.yearSelect = page.getByTestId('years');
    this.newsletterCheckbox = page.getByRole('checkbox', { name: 'Sign up for our newsletter!' });
    this.specialOffersCheckbox = page.getByRole('checkbox', {
      name: 'Receive special offers from our partners!',
    });

    this.firstNameInput = page.getByLabel('First name *', { exact: true });
    this.lastNameInput = page.getByLabel('Last name *', { exact: true });
    this.companyInput = page.getByLabel('Company', { exact: true });
    // The address label also contains hint text, so match only its prefix.
    this.addressInput = page.getByLabel(/^Address \*/);
    this.address2Input = page.getByLabel('Address 2', { exact: true });
    this.countrySelect = page.getByLabel('Country *', { exact: true });
    this.stateInput = page.getByLabel('State *', { exact: true });
    this.cityInput = page.getByLabel('City *', { exact: true });
    this.zipcodeInput = page.getByTestId('zipcode');
    this.mobileNumberInput = page.getByLabel('Mobile Number *', { exact: true });

    this.createAccountButton = page.getByRole('button', { name: 'Create Account' });
  }

  /** Select the title radio ("Mr." or "Mrs."). */
  async selectTitle(title: Title): Promise<void> {
    const radio = title === 'Mr.' ? this.titleMrRadio : this.titleMrsRadio;
    await radio.check();
  }

  /** Fill the account section: title, password, date of birth and opt-ins. */
  async fillAccountInformation(details: SignupPersonalDetails): Promise<void> {

    if (details.title) {
      await this.selectTitle(details.title);
    }
    await this.passwordInput.fill(details.password);

    if (details.day) {
      await this.daySelect.selectOption(details.day);
    }
    if (details.month) {
      await this.monthSelect.selectOption(details.month);
    }
    if (details.year) {
      await this.yearSelect.selectOption(details.year);
    }

    if (details.newsletter !== undefined) {
      await this.newsletterCheckbox.setChecked(details.newsletter);
    }
    if (details.specialOffers !== undefined) {
      await this.specialOffersCheckbox.setChecked(details.specialOffers);
    }
  }

  /** Fill the address section of the form. */
  async fillAddress(address: SignupAddress): Promise<void> {
    await this.firstNameInput.fill(address.firstName);
    await this.lastNameInput.fill(address.lastName);

    if (address.company !== undefined) {
      await this.companyInput.fill(address.company);
    }
    await this.addressInput.fill(address.address);

    if (address.address2 !== undefined) {
      await this.address2Input.fill(address.address2);
    }
    if (address.country !== undefined) {
      await this.countrySelect.selectOption(address.country);
    }

    await this.stateInput.fill(address.state);
    await this.cityInput.fill(address.city);
    await this.zipcodeInput.fill(address.zipcode);
    await this.mobileNumberInput.fill(address.mobileNumber);
  }

  /** Submit the form. Creates a real account on the site. */
  async createAccount(): Promise<void> {
    await this.createAccountButton.click();
  }
}
