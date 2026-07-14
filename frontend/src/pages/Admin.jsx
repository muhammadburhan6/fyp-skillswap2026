import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])

  useEffect(() => {
    api.adminStats().then(setStats)
    api.adminUsers().then((d) => setUsers(d.users))
  }, [])

  return (
    <AppShell title="Admin" subtitle="Platform moderation and user overview">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card text-center">
            <p className="stat-value">{stats.total_users}</p>
            <p className="text-sm text-slate-400">Total users</p>
          </div>
          <div className="card text-center">
            <p className="stat-value">{stats.active_users}</p>
            <p className="text-sm text-slate-400">Active</p>
          </div>
          <div className="card text-center">
            <p className="stat-value">{stats.platform_health}</p>
            <p className="text-sm text-slate-400">Health</p>
          </div>
        </div>
      )}
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Points</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.points_balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
