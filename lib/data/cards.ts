import type { PaymentCard } from '../pages/payment.page';

/**
 * Bogus card details for the payment form.
 *
 * The site does not validate or charge anything, so these values only need to
 * look like a card: the number is a well-known test Visa, and the expiry is in
 * the future. Kept in one place so payment specs cannot drift apart.
 */
export function createPaymentCard(overrides: Partial<PaymentCard> = {}): PaymentCard {
  return {
    nameOnCard: 'Bogus Tester',
    cardNumber: '4111111111111111',
    cvc: '123',
    expiryMonth: '12',
    expiryYear: '2030',
    ...overrides,
  };
}
