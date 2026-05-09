import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
})

export const PLANS = {
  monthly: {
    daily:     { monthly: 'price_1TUzqgRmWEBJMGXdhWXTQFM9', annual: 'price_1TUzqjRmWEBJMGXdvziIFflY', price: 29.99, label: 'Diario' },
    weekly:    { monthly: 'price_1TUzqgRmWEBJMGXd126CDFtd', annual: 'price_1TUzqkRmWEBJMGXdVJa88pIE', price: 25.00, label: 'Semanal' },
    biweekly:  { monthly: 'price_1TUzqhRmWEBJMGXdSqv4IxKQ', annual: 'price_1TUzqlRmWEBJMGXdkIQKXZqq', price: 22.00, label: 'Quincenal' },
    monthly:   { monthly: 'price_1TUzqiRmWEBJMGXdssJJTmry', annual: 'price_1TUzqmRmWEBJMGXdeUrqvLpc', price: 20.00, label: 'Mensual' },
  }
}

export const MXN_RATE = 17.50
