export type PlanKey = "starter" | "pro" | "agency";

export const PLANS: Record<
  PlanKey,
  {
    name: string;
    priceMonthly: number;
    seats: number;
    leadsPerMonth: number | null; // null = unlimited
    aiFeatures: boolean;
    stripePriceEnvVar: string;
  }
> = {
  starter: {
    name: "Starter",
    priceMonthly: 29,
    seats: 3,
    leadsPerMonth: 200,
    aiFeatures: false,
    stripePriceEnvVar: "STRIPE_PRICE_STARTER",
  },
  pro: {
    name: "Pro",
    priceMonthly: 79,
    seats: 10,
    leadsPerMonth: 1000,
    aiFeatures: true,
    stripePriceEnvVar: "STRIPE_PRICE_PRO",
  },
  agency: {
    name: "Agency",
    priceMonthly: 199,
    seats: 50,
    leadsPerMonth: null,
    aiFeatures: true,
    stripePriceEnvVar: "STRIPE_PRICE_AGENCY",
  },
};

export function priceIdFor(plan: PlanKey): string {
  const envVar = PLANS[plan].stripePriceEnvVar;
  const id = process.env[envVar];
  if (!id) throw new Error(`Missing env var ${envVar} — set it to the Stripe Price ID for the ${plan} plan`);
  return id;
}

export function planFromPriceId(priceId: string): PlanKey | null {
  for (const key of Object.keys(PLANS) as PlanKey[]) {
    if (process.env[PLANS[key].stripePriceEnvVar] === priceId) return key;
  }
  return null;
}
