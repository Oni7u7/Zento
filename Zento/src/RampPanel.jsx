import { useState, useEffect } from 'react'
import * as api from './api/etherfuse'

const QUOTE_TTL = 120 // segundos
const BLOCKCHAIN = 'monad'

export default function RampPanel({ account }) {
  const [tab, setTab] = useState('onramp')
  const [assets, setAssets] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [orgId, setOrgId] = useState(null)
  const [amount, setAmount] = useState('')
  const [selectedAsset, setSelectedAsset] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [quote, setQuote] = useState(null)
  const [quoteTimer, setQuoteTimer] = useState(0)
  const [order, setOrder] = useState(null)
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [loadingTnc, setLoadingTnc] = useState(false)
  const [walletStatus, setWalletStatus] = useState(null) // 'ok' | 'pending' | 'error' | null
  const [tncCustomerId, setTncCustomerId] = useState(null)
  const [tncBankId, setTncBankId] = useState(null)
  const [error, setError] = useState(null)

  // Función reutilizable para aceptar T&C
  const acceptTnC = async (customerId, bankAccountId) => {
    console.log('[T&C] Iniciando aceptación | customerId:', customerId, '| bankAccountId:', bankAccountId)
    const onboardingRes = await api.getOnboardingUrl(customerId, bankAccountId, account, BLOCKCHAIN)
    console.log('[T&C] onboarding response completo:', JSON.stringify(onboardingRes))
    const presignedUrl = onboardingRes?.presigned_url ?? onboardingRes?.presignedUrl ?? onboardingRes?.url
    if (!presignedUrl) {
      throw new Error('No se obtuvo presignedUrl. Respuesta: ' + JSON.stringify(onboardingRes))
    }
    const results = await api.acceptAllAgreements(presignedUrl)
    console.log('[T&C] Acuerdos aceptados:', results)
    return results
  }

  // Cargar assets, cuentas bancarias e identidad org al montar
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Registrar wallet y cargar datos en paralelo
        const [walletData, assetsData, banksData, identityData] = await Promise.all([
          api.registerWallet(account, BLOCKCHAIN).catch((e) => { console.warn('registerWallet:', e.message); return null }),
          api.getAssets(BLOCKCHAIN, 'mxn', account),
          api.getBankAccounts(),
          api.getOrgIdentity(),
        ])

        console.log('[Init] walletData completo:', JSON.stringify(walletData))

        const list = assetsData?.assets ?? []
        const banks = banksData?.items ?? []
        const customerId = walletData?.customerId ?? walletData?.customer_id ?? null
        const firstBankId = banks[0]?.bankAccountId ?? null

        setAssets(list)
        setBankAccounts(banks)
        setOrgId(identityData?.id ?? null)
        if (list.length) setSelectedAsset(list[0].identifier ?? list[0].id)
        if (firstBankId) setSelectedBank(firstBankId)
        // Usar orgId para T&C (customerId de registerWallet no pertenece a la org)
        const orgIdForTnC = identityData?.id ?? null
        if (orgIdForTnC) setTncCustomerId(orgIdForTnC)
        if (firstBankId) setTncBankId(firstBankId)

        // 2. Si claimOwnership fue exitoso → wallet ya es compliant (org KYB aprobado)
        if (walletData?.claimedOwnership === true) {
          console.log('[Init] claimedOwnership=true → wallet compliant, sin necesidad de T&C')
          setWalletStatus('ok')
        } else {
          // org sin KYB aprobado en Etherfuse dashboard → T&C no se pueden aceptar por API
          console.warn('[Init] claimedOwnership=false o null. Requiere KYB aprobado en devnet.etherfuse.com')
          console.log('[Init] walletData completo:', JSON.stringify(walletData))
          setWalletStatus('kyb_required')
        }
      } catch (err) {
        setError('Error cargando datos: ' + err.message)
      } finally {
        setLoadingAssets(false)
      }
    }
    load()
  }, [account])

  // Countdown del quote
  useEffect(() => {
    if (!quote || quoteTimer <= 0) return
    const interval = setInterval(() => {
      setQuoteTimer((t) => {
        if (t <= 1) { clearInterval(interval); setQuote(null); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [quote, quoteTimer])

  // Reset al cambiar tab
  useEffect(() => {
    setQuote(null)
    setOrder(null)
    setError(null)
    setAmount('')
  }, [tab])

  const handleGetQuote = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setError(null)
    setQuote(null)
    setOrder(null)
    try {
      setLoadingQuote(true)
      const body = {
        quoteId: crypto.randomUUID(),
        customerId: orgId,
        blockchain: BLOCKCHAIN,
        sourceAmount: String(parseFloat(amount)),
        quoteAssets: tab === 'onramp'
          ? { type: 'onramp', sourceAsset: 'MXN', targetAsset: selectedAsset }
          : { type: 'offramp', sourceAsset: selectedAsset, targetAsset: 'MXN' },
      }
      const data = await api.getQuote(body)
      setQuote(data)
      setQuoteTimer(QUOTE_TTL)
    } catch (err) {
      setError('Error al cotizar: ' + err.message)
    } finally {
      setLoadingQuote(false)
    }
  }

  const handleRetryTnC = async () => {
    if (!tncCustomerId || !tncBankId) {
      setError('No se tienen datos suficientes para aceptar T&C. Recarga la página.')
      return
    }
    setError(null)
    setLoadingTnc(true)
    try {
      await acceptTnC(tncCustomerId, tncBankId)
      setWalletStatus('ok')
    } catch (e) {
      console.error('[T&C retry] Error:', e.message)
      setError('Error al aceptar T&C: ' + e.message)
    } finally {
      setLoadingTnc(false)
    }
  }

  const handleCreateOrder = async () => {
    if (walletStatus !== 'ok') {
      setError('Tu organización debe completar KYB en devnet.etherfuse.com antes de crear órdenes.')
      return
    }
    if (!selectedBank) {
      setError('Se requiere una cuenta bancaria registrada para crear la orden.')
      return
    }
    setError(null)
    try {
      setLoadingOrder(true)
      const body = {
        orderId: crypto.randomUUID(),
        quoteId: quote?.quoteId ?? quote?.id,
        publicKey: account,
        bankAccountId: selectedBank,
      }
      console.log('Order body:', JSON.stringify(body))
      console.log('Quote keys:', Object.keys(quote ?? {}))
      const data = await api.createOrder(body)
      setOrder(data)
      setQuote(null)
    } catch (err) {
      setError('Error al crear orden: ' + err.message)
    } finally {
      setLoadingOrder(false)
    }
  }

  const assetLabel = (a) => `${a.symbol ?? a.identifier} (${a.network ?? a.blockchain ?? ''})`
  const bankLabel = (b) => `${b.label ?? 'Cuenta'} — ${b.abbrClabe ?? b.bankAccountId?.slice(0, 8)}`

  if (loadingAssets) {
    return <div className="ramp-loading">Cargando assets...</div>
  }

  return (
    <div className="ramp-panel">
      {/* Tabs */}
      <div className="ramp-tabs">
        <button
          className={`ramp-tab ${tab === 'onramp' ? 'active' : ''}`}
          onClick={() => setTab('onramp')}
        >
          On-Ramp
          <span className="ramp-tab-sub">MXN → Crypto</span>
        </button>
        <button
          className={`ramp-tab ${tab === 'offramp' ? 'active' : ''}`}
          onClick={() => setTab('offramp')}
        >
          Off-Ramp
          <span className="ramp-tab-sub">Crypto → MXN</span>
        </button>
      </div>

      <div className="ramp-body">
        {walletStatus === 'error' && (
          <p className="wallet-error">Wallet no pudo registrarse en Etherfuse. Revisa la consola.</p>
        )}
        {(walletStatus === 'pending' || walletStatus === 'kyb_required') && (
          <div style={{textAlign:'center', marginBottom: 12, padding: '10px', background: '#fff3cd', borderRadius: 8, border: '1px solid #ffc107'}}>
            <p style={{margin: 0, fontWeight: 600, color: '#856404'}}>⚠ KYB pendiente en Etherfuse</p>
            <p style={{margin: '6px 0 0', fontSize: 13, color: '#856404'}}>
              Para crear órdenes, tu organización debe completar la verificación KYB en el dashboard de Etherfuse sandbox.
            </p>
            <a
              href="https://devnet.etherfuse.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-connect"
              style={{display: 'inline-block', marginTop: 10, fontSize: 13, textDecoration: 'none'}}
            >
              🔗 Completar KYB en devnet.etherfuse.com
            </a>
          </div>
        )}
        {/* Orden completada */}
        {order ? (
          <OrderResult order={order} tab={tab} onReset={() => { setOrder(null); setAmount('') }} />
        ) : (
          <>
            {/* Input amount */}
            <div className="ramp-field">
              <label>{tab === 'onramp' ? 'Monto en MXN' : 'Monto de crypto'}</label>
              <div className="ramp-input-row">
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setQuote(null) }}
                />
                <span className="ramp-currency">
                  {tab === 'onramp' ? 'MXN' : (assets.find(a => (a.identifier ?? a.id) === selectedAsset)?.symbol ?? 'TOKEN')}
                </span>
              </div>
            </div>

            {/* Asset selector */}
            <div className="ramp-field">
              <label>{tab === 'onramp' ? 'Recibirás' : 'Token a vender'}</label>
              {assets.length > 0 ? (
                <select value={selectedAsset} onChange={(e) => { setSelectedAsset(e.target.value); setQuote(null) }}>
                  {assets.map((a) => (
                    <option key={a.identifier ?? a.id} value={a.identifier ?? a.id}>
                      {assetLabel(a)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="ramp-hint">No se encontraron assets</p>
              )}
            </div>

            {/* Bank account selector (ambos tabs) */}
            <div className="ramp-field">
              <label>{tab === 'onramp' ? 'Cuenta bancaria (depósito)' : 'Cuenta bancaria (recibir MXN)'}</label>
              {bankAccounts.length > 0 ? (
                <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                  {bankAccounts.map((b) => (
                    <option key={b.bankAccountId} value={b.bankAccountId}>{bankLabel(b)}</option>
                  ))}
                </select>
              ) : (
                <p className="ramp-hint">No hay cuentas bancarias registradas en tu org</p>
              )}
            </div>

            {/* Quote resultado */}
            {quote && (
              <div className="ramp-quote">
                <div className="ramp-quote-row">
                  <span>Recibirás</span>
                  <strong>
                    {tab === 'onramp'
                      ? `${quote.targetAmount ?? quote.estimatedAmount ?? '—'} ${assets.find(a => (a.identifier ?? a.id) === selectedAsset)?.symbol ?? ''}`
                      : `$${quote.targetAmount ?? quote.estimatedAmount ?? '—'} MXN`}
                  </strong>
                </div>
                {quote.exchangeRate && (
                  <div className="ramp-quote-row">
                    <span>Tipo de cambio</span>
                    <strong>{quote.exchangeRate}</strong>
                  </div>
                )}
                {quote.fee && (
                  <div className="ramp-quote-row">
                    <span>Fee</span>
                    <strong>{quote.fee}</strong>
                  </div>
                )}
                <div className="ramp-quote-timer">
                  Cotización válida por <span>{quoteTimer}s</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && <p className="wallet-error">{error}</p>}

            {/* Acciones */}
            {!quote ? (
              <button className="btn-connect" onClick={handleGetQuote} disabled={loadingQuote || !amount}>
                {loadingQuote ? 'Cotizando...' : 'Obtener cotización'}
              </button>
            ) : (
              <button className="btn-connect" onClick={handleCreateOrder} disabled={loadingOrder}>
                {loadingOrder ? 'Creando orden...' : 'Confirmar orden'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function OrderResult({ order, tab, onReset }) {
  return (
    <div className="ramp-order">
      <div className="ramp-order-icon">✓</div>
      <h3>Orden creada</h3>
      <p className="ramp-order-id">ID: <code>{order.orderId ?? order.id}</code></p>

      {tab === 'onramp' && order.depositInstructions && (
        <div className="ramp-order-detail">
          <label>Deposita a esta CLABE</label>
          <code>{order.depositInstructions?.clabe ?? order.depositInstructions?.bankAccount ?? JSON.stringify(order.depositInstructions)}</code>
        </div>
      )}

      {tab === 'offramp' && order.depositAddress && (
        <div className="ramp-order-detail">
          <label>Envía crypto a esta dirección</label>
          <code>{order.depositAddress}</code>
        </div>
      )}

      <div className="ramp-order-status">
        Estado: <span className={`status-badge status-${order.status}`}>{order.status ?? 'created'}</span>
      </div>

      <button className="btn-disconnect" onClick={onReset} style={{ marginTop: 16 }}>
        Nueva operación
      </button>
    </div>
  )
}
