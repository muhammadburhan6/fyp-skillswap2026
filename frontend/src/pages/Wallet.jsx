import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'

export default function Wallet() {
  const { user } = useAuthStore()
  const [wallet, setWallet] = useState(null)
  const [txns, setTxns] = useState([])

  useEffect(() => {
    if (!user) return
    api.getWallet(user.id).then(setWallet)
    api.getTransactions(user.id).then((d) => setTxns(d.transactions))
  }, [user])

  const balance = wallet?.balance ?? user?.points_balance ?? 0

  return (
    <AppShell title="Skill Points" subtitle="Earn by teaching · Spend to learn">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card border-sky-400/20 bg-gradient-to-br from-sky-400/20 to-blue-600/10">
          <p className="text-slate-400">Balance</p>
          <p className="text-5xl font-bold text-white">{balance} SP</p>
          <p className="mt-2 text-sm text-slate-400">Your skill point wallet</p>
        </div>
        <div className="card">
          <h2 className="font-semibold text-white">How points work</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>✅ +15 pts for completing a teaching session</li>
            <li>📚 -10 pts to book a learning session</li>
            <li>⭐ +5 pts bonus for 5-star reviews</li>
            <li>🎁 +200 pts signup bonus</li>
          </ul>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white">Transaction history</h2>
      <div className="mt-4 space-y-2">
        {txns.map((t) => (
          <div key={t.id} className="card flex items-center justify-between py-4">
            <span className="text-sm text-slate-400">{t.reason}</span>
            <span className={`font-semibold ${t.amount > 0 ? 'text-sky-300' : 'text-orange-400'}`}>
              {t.amount > 0 ? '+' : ''}{t.amount}
            </span>
          </div>
        ))}
        {!txns.length && <p className="text-slate-500">No transactions yet</p>}
      </div>
    </AppShell>
  )
}
