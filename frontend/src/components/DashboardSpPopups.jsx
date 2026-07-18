import { useEffect, useState } from 'react'

import api from '../lib/api'

import { useAuthStore } from '../store/useAuthStore'



export default function DashboardSpPopups() {

  const { user, setUser } = useAuthStore()

  const [mode, setMode] = useState(null)

  const [amount, setAmount] = useState(0)

  const [closing, setClosing] = useState(false)

  const [busy, setBusy] = useState(false)



  useEffect(() => {

    if (!user) return

    let cancelled = false



    const run = async () => {

      if (user.has_seen_welcome_popup === false) {

        if (!cancelled) {

          setAmount(200)

          setMode('welcome')

        }

        return

      }

      try {

        const bonus = await api.claimDailyBonus()

        if (cancelled) return

        if (bonus?.claimed) {

          setAmount(bonus.amount || 100)

          setMode('daily')

          const current = useAuthStore.getState().user

          if (current) {

            setUser({

              ...current,

              points_balance: bonus.balance,

              streak: bonus.streak,

              last_daily_bonus_at: bonus.last_daily_bonus_at,

              last_daily_bonus_date: bonus.last_daily_bonus_date,

            })

          }

        }

      } catch { /* ignore */ }

    }

    run()

    return () => { cancelled = true }

  }, [user?.id, user?.has_seen_welcome_popup])



  if (!mode || !user) return null



  const isWelcome = mode === 'welcome'

  const title = isWelcome ? 'Welcome' : 'Daily reward'

  const message = isWelcome

    ? <>You&apos;ve earned <span className="font-semibold text-accent">200 SP</span></>

    : <>You received <span className="font-semibold text-accent">+{amount} SP</span></>



  const dismiss = async () => {

    if (busy) return

    setBusy(true)

    setClosing(true)



    if (isWelcome) {

      try { await api.markWelcomeSeen() } catch { /* ignore */ }

      const current = useAuthStore.getState().user

      if (current) setUser({ ...current, has_seen_welcome_popup: true })

      setTimeout(async () => {

        setClosing(false)

        setMode(null)

        setBusy(false)

        try {

          const bonus = await api.claimDailyBonus()

          if (bonus?.claimed) {

            setAmount(bonus.amount || 100)

            setMode('daily')

            const u = useAuthStore.getState().user

            if (u) {

              setUser({

                ...u,

                points_balance: bonus.balance,

                streak: bonus.streak,

                last_daily_bonus_at: bonus.last_daily_bonus_at,

                last_daily_bonus_date: bonus.last_daily_bonus_date,

                has_seen_welcome_popup: true,

              })

            }

          }

        } catch { /* ignore */ }

      }, 100)

      return

    }



    setTimeout(() => {

      setMode(null)

      setClosing(false)

      setBusy(false)

    }, 100)

  }



  return (

    <div

      className={`fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}

      role="dialog"

      aria-modal="true"

      aria-labelledby="dashboard-sp-title"

    >

      <div className={`card w-full max-w-sm rounded-2xl border border-accent/30 p-8 shadow-accent-glow transition-all duration-200 ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>

        <p className="font-mono text-xs uppercase tracking-widest text-mutedForeground">Skill Points</p>

        <h2 id="dashboard-sp-title" className="mt-3 font-display text-3xl font-bold text-foreground">{title}</h2>

        <p className="mt-3 text-lg text-foreground">{message}</p>

        <p className="mt-2 text-sm text-mutedForeground">

          {isWelcome ? 'Your signup gift — start teaching and learning.' : 'Return in 24 hours for another +100 SP.'}

        </p>

        <button type="button" onClick={dismiss} disabled={busy} className="btn-primary mt-8 w-full text-xs disabled:opacity-60">

          {isWelcome ? "Awesome, let's start →" : 'Continue →'}

        </button>

      </div>

    </div>

  )

}


