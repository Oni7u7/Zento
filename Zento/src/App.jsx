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

  if (!account) {
    return (
      <div className="wallet-page">
        <div className="wallet-card">
          <div className="wallet-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#F6851B"/>
              <path d="M38 12L27.2 19.8L29.3 15.1L38 12Z" fill="#E2761B"/>
              <path d="M10 12L20.7 19.9L18.7 15.1L10 12Z" fill="#E4761B"/>
              <path d="M34.3 30.9L31.4 35.3L37.4 37L39.1 31L34.3 30.9Z" fill="#E4761B"/>
              <path d="M8.9 31L10.6 37L16.6 35.3L13.7 30.9L8.9 31Z" fill="#E4761B"/>
              <path d="M16.3 22.3L14.6 24.9L20.5 25.2L20.3 18.8L16.3 22.3Z" fill="#E4761B"/>
              <path d="M31.7 22.3L27.6 18.7L27.5 25.2L33.4 24.9L31.7 22.3Z" fill="#E4761B"/>
              <path d="M16.6 35.3L20.1 33.5L17.1 31L16.6 35.3Z" fill="#E4761B"/>
              <path d="M27.9 33.5L31.4 35.3L30.9 31L27.9 33.5Z" fill="#E4761B"/>
            </svg>
          </div>
          <h1>Conecta tu Wallet</h1>
          <p className="wallet-subtitle">Conecta MetaMask para continuar</p>
          <button className="btn-connect" onClick={connectWallet} disabled={loading}>
            {loading ? 'Conectando...' : 'Conectar MetaMask'}
          </button>
          {error && <p className="wallet-error">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="app-connected">
      {/* Header wallet */}
      <header className="wallet-header">
        <div className="wallet-header-info">
          <span className="dot connected" />
          <span className="wallet-header-address">{shortAddress(account)}</span>
          <span className="wallet-header-balance">{balance ?? '...'} <strong>MON</strong></span>
          <span className="wallet-header-network">Monad Testnet</span>
        </div>
        <button className="btn-disconnect" onClick={disconnectWallet}>Desconectar</button>
      </header>

      {/* Ramp Panel */}
      <main className="app-main">
        <RampPanel account={account} />
      </main>
    </div>
  )
}

export default App
