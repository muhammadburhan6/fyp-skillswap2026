import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import PointsCalendar from '../components/PointsCalendar'
import api from '../lib/api'
import { formatLocalDate } from '../lib/dateTime'
import { useAuthStore } from '../store/useAuthStore'

export default function Wallet() {
  const { user } = useAuthStore()
  const [wallet, setWallet] = useState(null)
  const [txns, setTxns] = useState([])
  const [earnings, setEarnings] = useState(null)

  useEffect(() => {
    if (!user) return
    api.getWallet(user.id).then(setWallet)
    api.getTransactions(user.id).then((d) => setTxns(d.transactions || []))
    api.getMyEarnings().then(setEarnings).catch(() => {})
  }, [user?.id])

  const balance = wallet?.balance ?? user?.points_balance ?? 0
  const streak = wallet?.streak ?? user?.streak ?? 0

  return (
    <AppShell title="Skill Points" subtitle="Earn by teaching · Spend to learn">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-inverted rounded-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Balance</p>
          <p className="mt-2 font-display text-6xl font-bold tracking-tight text-foreground">{balance} SP</p>
          <p className="mt-3 text-sm text-mutedForeground">
            Your skill point wallet
            {streak > 0 && <span className="ml-2 badge">· {streak}-day streak</span>}
          </p>
        </div>

        <div className="card">
          <h2 className="font-display text-xl font-semibold text-foreground">How points work</h2>
          <ul className="mt-4 space-y-3 text-sm text-mutedForeground">
            <li className="flex items-center gap-2"><span className="text-accent">+15</span> pts for completing a swap session</li>
            <li className="flex items-center gap-2"><span className="text-foreground">−10</span> pts to book a swap session</li>
            <li className="flex items-center gap-2"><span className="text-accent">+5</span> pts bonus for 5-star reviews</li>
            <li className="flex items-center gap-2"><span className="text-accent">+200</span> pts signup bonus</li>
            <li className="flex items-center gap-2"><span className="text-accent">+100</span> pts every 24 hours (Dashboard popup)</li>
          </ul>
        </div>
      </div>

      {earnings && (earnings.session_count > 0) && (
        <div className="mt-8 card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Teaching Earnings</h2>
              <p className="mt-1 text-sm text-mutedForeground">
                Revenue from paid sessions after the 10% platform fee
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Total earned</p>
              <p className="mt-1 font-display text-3xl font-bold text-emerald-300">
                ${earnings.total_earnings_usd.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-mutedForeground">
              Payouts are processed manually by the SkillSwap team. Contact support to request a payout.
            </p>
          </div>

          <div className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06]">
            {earnings.earnings.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{e.skill}</p>
                  <p className="text-xs text-mutedForeground">
                    {e.learner_name}
                    {e.scheduled_at ? ` · ${formatLocalDate(e.scheduled_at)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold text-emerald-300">+${e.earnings_usd.toFixed(2)}</p>
                  <p className="text-xs text-mutedForeground">of ${e.amount_usd.toFixed(2)} paid</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <PointsCalendar streak={streak} />
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold text-foreground">Transaction history</h2>
      <div className="card mt-4 divide-y divide-white/[0.06] overflow-hidden p-0">
        {txns.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-5 py-3">
            <span className="font-mono text-xs uppercase tracking-widest text-mutedForeground">{t.reason}</span>
            <span className={`font-display font-semibold ${t.amount > 0 ? 'text-accent' : 'text-foreground'}`}>
              {t.amount > 0 ? '+' : ''}{t.amount}
            </span>
          </div>
        ))}
        {!txns.length && <p className="px-5 py-8 text-center text-sm text-mutedForeground">No transactions yet</p>}
      </div>
    </AppShell>
  )
}
