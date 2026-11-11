import { test, expect } from '@playwright/test';
import { SignupPage } from '../lib/pages/signup.page';

test.describe('SignupPage POM', () => {
  const name = 'Signup POM Verifier';
  const uniqueEmail = () => `signup.pom.${Date.now()}@example.com`;

  test('goto() reaches the account form with name and email pre-filled', async ({ page }) => {
    const signup = new SignupPage(page);
    const email = uniqueEmail();

    await signup.goto(name, email);

    await expect(page).toHaveURL(/\/signup$/);
    await expect(signup.accountInformationHeading).toBeVisible();
    await expect(signup.addressInformationHeading).toBeVisible();
    await expect(signup.nameInput).toHaveValue(name);
    await expect(signup.emailInput).toHaveValue(email);
    await expect(signup.emailInput).toBeDisabled();
  });

  test('every locator resolves to exactly one element', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.goto(name, uniqueEmail());

    for (const locator of [
      signup.titleMrRadio,
      signup.titleMrsRadio,
      signup.nameInput,
      signup.emailInput,
      signup.passwordInput,
      signup.daySelect,
      signup.monthSelect,
      signup.yearSelect,
      signup.newsletterCheckbox,
      signup.specialOffersCheckbox,
      signup.firstNameInput,
      signup.lastNameInput,
      signup.companyInput,
      signup.addressInput,
      signup.address2Input,
      signup.countrySelect,
      signup.stateInput,
      signup.cityInput,
      signup.zipcodeInput,
      signup.mobileNumberInput,
      signup.createAccountButton,
    ]) {
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();
    }
  });

  test('fillAccountInformation() and fillAddress() populate the form', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.goto(name, uniqueEmail());

    await signup.fillAccountInformation({
      title: 'Mrs.',
      password: 'bogus-password-123',
      day: '15',
      month: 'January',
      year: '1990',
      newsletter: true,
      specialOffers: true,
    });

    await signup.fillAddress({
      firstName: 'Bogus',
      lastName: 'Tester',
      company: 'Bogus Co',
      address: '1 Fake Street',
      address2: 'Suite 404',
      country: 'United States',
      state: 'California',
      city: 'Nowhere',
      zipcode: '90210',
      mobileNumber: '555-0100',
    });

    await expect(signup.titleMrsRadio).toBeChecked();
    await expect(signup.passwordInput).toHaveValue('bogus-password-123');
    await expect(signup.daySelect).toHaveValue('15');
    await expect(signup.monthSelect).toHaveValue('1');
    await expect(signup.yearSelect).toHaveValue('1990');
    await expect(signup.newsletterCheckbox).toBeChecked();
    await expect(signup.specialOffersCheckbox).toBeChecked();
    await expect(signup.firstNameInput).toHaveValue('Bogus');
    await expect(signup.lastNameInput).toHaveValue('Tester');
    await expect(signup.companyInput).toHaveValue('Bogus Co');
    await expect(signup.addressInput).toHaveValue('1 Fake Street');
    await expect(signup.address2Input).toHaveValue('Suite 404');
    await expect(signup.countrySelect).toHaveValue('United States');
    await expect(signup.stateInput).toHaveValue('California');
    await expect(signup.cityInput).toHaveValue('Nowhere');
    await expect(signup.zipcodeInput).toHaveValue('90210');
    await expect(signup.mobileNumberInput).toHaveValue('555-0100');

    // The form must not have been submitted.
    await expect(page).toHaveURL(/\/signup$/);
  });
});
