import { useEffect, useState } from 'react'

import AppShell from '../components/layout/AppShell'

import PointsCalendar from '../components/PointsCalendar'

import api from '../lib/api'

import { useAuthStore } from '../store/useAuthStore'



export default function Wallet() {

  const { user } = useAuthStore()

  const [wallet, setWallet] = useState(null)

  const [txns, setTxns] = useState([])



  useEffect(() => {

    if (!user) return

    api.getWallet(user.id).then(setWallet)

    api.getTransactions(user.id).then((d) => setTxns(d.transactions || []))

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

            <li className="flex items-center gap-2"><span className="text-accent">+15</span> pts for completing a teaching session</li>

            <li className="flex items-center gap-2"><span className="text-foreground">−10</span> pts to book a learning session</li>

            <li className="flex items-center gap-2"><span className="text-accent">+5</span> pts bonus for 5-star reviews</li>

            <li className="flex items-center gap-2"><span className="text-accent">+200</span> pts signup bonus</li>

            <li className="flex items-center gap-2"><span className="text-accent">+100</span> pts every 24 hours (Dashboard popup)</li>

          </ul>

        </div>

      </div>



      <div className="mt-8">

        <PointsCalendar streak={streak} />

      </div>



      <h2 className="mt-12 font-display text-xl font-semibold text-foreground">Transaction history</h2>

      <div className="card mt-4 divide-y divide-white/[0.06] p-0 overflow-hidden">

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


