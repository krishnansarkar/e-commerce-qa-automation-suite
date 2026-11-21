import { type Locator, type Page } from '@playwright/test';

/** Bogus card details accepted by the site's payment form. */
export interface PaymentCard {
  /** Name printed on the card. */
  nameOnCard: string;
  cardNumber: string;
  /** Card verification code, e.g. "123". */
  cvc: string;
  /** Two-digit month, e.g. "12". */
  expiryMonth: string;
  /** Four-digit year, e.g. "2030". */
  expiryYear: string;
}

/**
 * Page object for https://automationexercise.com/payment
 *
 * The card form shown after placing an order. Nothing is charged: the site
 * only records the order and accepts any well-formed values.
 *
 * Notes on the site's markup:
 * - The card inputs have no labels, ids or placeholders for the name and card
 *   number, so the site's `data-qa` hooks (accessed with `getByTestId()`) are
 *   the only stable handle (as on the signup form).
 *   CVC/month/year do have placeholders ("ex. 311", "MM", "YYYY").
 * - Expiry is two plain text inputs, not a date picker, and the values are not
 *   validated client-side.
 * - "Pay and Confirm Order" is a `<button type="submit">` (`getByTestId('pay-button')`)
 *   inside `#payment-form`, which POSTs back to /payment.
 * - The submit may be covered by an AdSense vignette overlay, so the click goes
 *   through `clickAndNavigate()`.
 */
export class PaymentPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly paymentForm: Locator;
  readonly nameOnCardInput: Locator;
  readonly cardNumberInput: Locator;
  readonly cvcInput: Locator;
  readonly expiryMonthInput: Locator;
  readonly expiryYearInput: Locator;
  readonly payAndConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Payment' });
    this.paymentForm = page.locator('#payment-form');
    this.nameOnCardInput = page.getByTestId('name-on-card');
    this.cardNumberInput = page.getByTestId('card-number');
    this.cvcInput = page.getByTestId('cvc');
    this.expiryMonthInput = page.getByTestId('expiry-month');
    this.expiryYearInput = page.getByTestId('expiry-year');
    this.payAndConfirmButton = page.getByTestId('pay-button');
  }

  /**
   * Fill the card form. Reached from `CheckoutPage.placeOrder()`, so there is no
   * `goto()`: /payment is a POST target, not a page a user can open directly.
   */
  async fillCard(card: PaymentCard): Promise<void> {
    await this.nameOnCardInput.fill(card.nameOnCard);
    await this.cardNumberInput.fill(card.cardNumber);
    await this.cvcInput.fill(card.cvc);
    await this.expiryMonthInput.fill(card.expiryMonth);
    await this.expiryYearInput.fill(card.expiryYear);
  }

  async payAndConfirm(card: PaymentCard): Promise<void> {
    await this.fillCard(card);
    await this.payAndConfirmButton.click();
  }
}
