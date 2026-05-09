import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
})

export const PLANS = {
  monthly: {
    daily:     { monthly: 'price_1TQLWqRmWEBJMGXdLPsZF7qh', annual: 'price_1TUz5NRmWEBJMGXd5OMtqmBo', price: 29.99, label: 'Diario' },
    weekly:    { monthly: 'price_1TQLY8RmWEBJMGXdsJo09MzL', annual: 'price_1TUz73RmWEBJMGXdaBTjdOrV', price: 25.00, label: 'Semanal' },
    biweekly:  { monthly: 'price_1TQLZ3RmWEBJMGXdSbnQMd4e', annual: 'price_1TUz8aRmWEBJMGXdeOvCsaYW', price: 22.00, label: 'Quincenal' },
    monthly:   { monthly: 'price_1TQLZWRmWEBJMGXdCTlq4DtZ', annual: 'price_1TUz9MRmWEBJMGXdRlPkchYV', price: 20.00, label: 'Mensual' },
  }
}

export const MXN_RATE = 17.50
