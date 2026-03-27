import { useState } from 'react'
import RampPanel from './RampPanel'
import './App.css'

const MONAD_TESTNET = {
  chainId: '0x279F',
  chainName: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
}

function App() {
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const switchToMonad = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET.chainId }],
      })
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MONAD_TESTNET],
        })
      } else {
        throw err
      }
    }
  }

  const fetchBalance = async (address) => {
    const hexBalance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    })
    const wei = BigInt(hexBalance)
    const mon = Number(wei) / 1e18
    setBalance(mon.toFixed(4))
  }

  const connectWallet = async () => {
    setError(null)
    if (!window.ethereum) {
      setError('MetaMask no está instalado. Instálalo desde metamask.io')
      return
    }
    try {
      setLoading(true)
      await switchToMonad()
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0])
      await fetchBalance(accounts[0])
    } catch (err) {
      if (err.code === 4001) {
        setError('Conexión rechazada por el usuario.')
      } else {
        setError('Error al conectar: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setBalance(null)
    setError(null)
  }

  const shortAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  return (
    <div className="app-connected">
      {/* ── Header ── */}
      <header className="wallet-header">
        <div className="header-brand">
          <span className="brand-dot" />
          <span className="brand-name">Zento</span>
          <span className="brand-tag">Monad Testnet</span>
        </div>

        <div className="header-right">
          {account ? (
            <div className="wallet-header-info">
              <span className="dot connected" />
              <span className="wallet-header-address">{shortAddress(account)}</span>
              <span className="wallet-header-balance">{balance ?? '...'} <strong>MON</strong></span>
              <button className="btn-disconnect" onClick={disconnectWallet}>Desconectar</button>
            </div>
          ) : (
            <button className="btn-connect-header" onClick={connectWallet} disabled={loading}>
              {loading ? 'Conectando...' : 'Conectar Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {account ? (
          /* ── Ramp panel cuando hay wallet conectada ── */
          <RampPanel account={account} />
        ) : (
          /* ── Landing / info cuando no hay wallet ── */
          <div className="landing">
            {/* Hero */}
            <section className="landing-hero">
              <h1 className="hero-title">
                Invierte en CETES<br />
                <span className="hero-accent">desde Monad Testnet</span>
              </h1>
              <p className="hero-sub">
                Convierte MXN a CETES tokenizados en segundos usando tu wallet de Monad.
                On-ramp y off-ramp directo, sin intermediarios, sin complicaciones.
              </p>
              <button className="btn-hero-cta" onClick={connectWallet} disabled={loading}>
                {loading ? 'Conectando...' : '🚀 Empezar ahora — Conecta tu Wallet'}
              </button>
              {error && <p className="wallet-error" style={{maxWidth: 420, marginTop: 12}}>{error}</p>}
            </section>

            {/* Features */}
            <section className="landing-features">
              <div className="feature-card">
                <div className="feature-icon">🏦</div>
                <h3>On-Ramp</h3>
                <p>Deposita MXN desde tu cuenta bancaria y recibe CETES en tu wallet de Monad en minutos.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💸</div>
                <h3>Off-Ramp</h3>
                <p>Convierte tus CETES de vuelta a MXN directo a tu CLABE bancaria cuando quieras.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h3>Rendimiento</h3>
                <p>CETES son instrumentos del gobierno mexicano. Tu capital genera rendimiento mientras esperas.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Monad Testnet</h3>
                <p>Rapidez y bajas comisiones. Prueba el flujo completo en testnet antes de ir a producción.</p>
              </div>
            </section>

            {/* How it works */}
            <section className="landing-steps">
              <h2 className="steps-title">¿Cómo funciona?</h2>
              <div className="steps-list">
                <div className="step">
                  <div className="step-num">1</div>
                  <div className="step-text">
                    <strong>Conecta tu wallet</strong>
                    <span>Vincula MetaMask con Monad Testnet</span>
                  </div>
                </div>
                <div className="step-arrow">→</div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div className="step-text">
                    <strong>Elige monto</strong>
                    <span>Ingresa cuántos MXN quieres invertir</span>
                  </div>
                </div>
                <div className="step-arrow">→</div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div className="step-text">
                    <strong>Obtén cotización</strong>
                    <span>Ve exactamente cuántos CETES recibirás</span>
                  </div>
                </div>
                <div className="step-arrow">→</div>
                <div className="step">
                  <div className="step-num">4</div>
                  <div className="step-text">
                    <strong>Confirma la orden</strong>
                    <span>Tu CLABE recibe los fondos en minutos</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Final CTA */}
            <section className="landing-cta">
              <p className="cta-text">Listo para empezar?</p>
              <button className="btn-hero-cta" onClick={connectWallet} disabled={loading}>
                {loading ? 'Conectando...' : 'Conectar Wallet y Comenzar'}
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
