const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const client = axios.create({
  baseURL: process.env.ETHERFUSE_BASE_URL,
  headers: {
    'Authorization': process.env.ETHERFUSE_API_KEY,
    'Content-Type': 'application/json'
  }
});

async function getQuote(amount, currency, asset) {
  const body = {
    quoteId: uuidv4(),
    customerId: uuidv4(),
    blockchain: 'monad',
    sourceAmount: String(amount),
    quoteAssets: {
      type: 'onramp',
      sourceAsset: currency,
      targetAsset: asset
    }
  };
  console.log('[etherfuse] POST /ramp/quote', JSON.stringify(body));
  try {
    const res = await client.post('/ramp/quote', body);
    console.log('[etherfuse] quote response:', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('[etherfuse] quote error:', msg);
    throw new Error(msg);
  }
}

async function createOrder(quoteId, walletAddress, bankAccountId) {
  const body = {
    orderId: uuidv4(),
    quoteId,
    publicKey: walletAddress,
    bankAccountId
  };
  console.log('[etherfuse] POST /ramp/order', JSON.stringify(body));
  try {
    const res = await client.post('/ramp/order', body);
    console.log('[etherfuse] order response:', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('[etherfuse] order error:', msg);
    throw new Error(msg);
  }
}

async function createSwap(from, to, amount, walletAddress) {
  const body = {
    swapId: uuidv4(),
    sourceAsset: from,
    targetAsset: to,
    amount: String(amount),
    publicKey: walletAddress
  };
  console.log('[etherfuse] POST /ramp/swap', JSON.stringify(body));
  try {
    const res = await client.post('/ramp/swap', body);
    console.log('[etherfuse] swap response:', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('[etherfuse] swap error:', msg);
    throw new Error(msg);
  }
}

async function getOnboardingUrl(customerId, bankAccountId, publicKey) {
  const body = { customerId, bankAccountId, publicKey, blockchain: 'monad' };
  console.log('[etherfuse] POST /ramp/onboarding-url', JSON.stringify(body));
  try {
    const res = await client.post('/ramp/onboarding-url', body);
    console.log('[etherfuse] onboarding response:', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('[etherfuse] onboarding error:', msg);
    throw new Error(msg);
  }
}

async function getStablebonds() {
  console.log('[etherfuse] GET /lookup/stablebonds');
  try {
    const res = await client.get('/lookup/stablebonds');
    console.log('[etherfuse] stablebonds response:', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('[etherfuse] stablebonds error:', msg);
    throw new Error(msg);
  }
}

module.exports = { getQuote, createOrder, createSwap, getOnboardingUrl, getStablebonds };
