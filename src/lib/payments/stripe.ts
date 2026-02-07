// Stripe payment integration
// Requires: npm install stripe
// This module gracefully handles the case where stripe is not installed

let StripeConstructor: any = null;

try {
  StripeConstructor = require('stripe').default || require('stripe');
} catch {
  // Stripe not installed - payment features will be disabled
}

function getStripeClient() {
  if (!StripeConstructor || !process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new StripeConstructor(process.env.STRIPE_SECRET_KEY, {
    typescript: true,
  });
}

export const stripe = getStripeClient();

export const PLAN_PRICES: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO || '',
  premium: process.env.STRIPE_PRICE_PREMIUM || '',
  copilot: process.env.STRIPE_PRICE_COPILOT || '',
};

export const PLAN_FROM_PRICE: Record<string, string> = {};
Object.entries(PLAN_PRICES).forEach(([plan, price]) => {
  if (price) PLAN_FROM_PRICE[price] = plan;
});

export function isStripeConfigured(): boolean {
  return stripe !== null && !!process.env.STRIPE_SECRET_KEY;
}
