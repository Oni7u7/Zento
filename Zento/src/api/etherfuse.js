const API_KEY = import.meta.env.VITE_ETHERFUSE_API_KEY
const BASE = '/etherfuse'

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: API_KEY,
})

const handleRes = async (res) => {
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`HTTP ${res.status} — respuesta no-JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error(data?.message || data?.error || `Error ${res.status}`)
  return data
}

export const getOrgIdentity = () =>
  fetch(`${BASE}/ramp/me`, { headers: headers() }).then(handleRes)

export const registerWallet = (publicKey, blockchain = 'monad') =>
  fetch(`${BASE}/ramp/wallet`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ publicKey, blockchain, claimOwnership: true }),
  }).then(handleRes)

export const getAssets = (blockchain, currency, wallet) => {
  const params = new URLSearchParams({ blockchain, currency, wallet })
  return fetch(`${BASE}/ramp/assets?${params}`, { headers: headers() }).then(handleRes)
}

export const getBankAccounts = () =>
  fetch(`${BASE}/ramp/bank-accounts`, { headers: headers() }).then(handleRes)

export const getQuote = (body) =>
  fetch(`${BASE}/ramp/quote`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  }).then(handleRes)

export const createOrder = (body) =>
  fetch(`${BASE}/ramp/order`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  }).then(handleRes)

export const getOrderDetails = (orderId) =>
  fetch(`${BASE}/ramp/order/${orderId}`, { headers: headers() }).then(handleRes)

export const getOnboardingUrl = (customerId, bankAccountId, publicKey, blockchain = 'monad') =>
  fetch(`${BASE}/ramp/onboarding-url`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ customerId, bankAccountId, publicKey, blockchain }),
  }).then(handleRes)

const acceptAgreement = (path, presignedUrl) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ presignedUrl }),
  }).then(handleRes)

export const acceptAllAgreements = (presignedUrl) =>
  Promise.all([
    acceptAgreement('/ramp/agreements/terms-and-conditions', presignedUrl),
    acceptAgreement('/ramp/agreements/customer-agreement', presignedUrl),
    acceptAgreement('/ramp/agreements/electronic-signature', presignedUrl),
  ])
