"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ArrowLeft, Share2, Globe, Trash2, Plus, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

type Member = { id: string; userId: string; role: string; user: { userName: string; email: string } }
type UserSuggestion = { id: string; userName: string; email: string }
type Dashboard = { id: string; name: string; isPublic: boolean }

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [users, setUsers] = useState<UserSuggestion[]>([])
  const [selectedUser, setSelectedUser] = useState("")
  const [copied, setCopied] = useState(false)
  const [id, setId] = useState("")

  useEffect(() => { params.then((p) => { setId(p.id); loadData(p.id) }) }, [])

  async function loadData(dashboardId: string) {
    const [{ data: d }, { data: u }] = await Promise.all([
      axios.get(`/api/dashboards/${dashboardId}`),
      axios.get("/api/users"),
    ])
    setDashboard(d)
    setUsers(u)
    setMembers([]) // ponytail: members not returned from dashboard API yet
  }

  async function togglePublic() {
    if (!dashboard) return
    const { data } = await axios.put(`/api/dashboards/${id}/public`, { isPublic: !dashboard.isPublic })
    setDashboard(data)
  }

  async function addMember() {
    if (!selectedUser) return
    const { data } = await axios.post(`/api/dashboards/${id}/members`, { userId: selectedUser, role: "VIEWER" })
    setMembers((p) => [...p, data])
    setSelectedUser("")
  }

  async function removeMember(userId: string) {
    await axios.delete(`/api/dashboards/${id}/members`, { data: { userId } })
    setMembers((p) => p.filter((m) => m.userId !== userId))
  }

  function copyLink() {
    const url = `${window.location.origin}/public/${id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!dashboard) return <div className="p-6 text-muted-foreground">Loading...</div>

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <h1 className="text-xl font-bold">Share: {dashboard.name}</h1>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Public access</span>
            </div>
            <Button variant={dashboard.isPublic ? "default" : "outline"} size="sm" onClick={togglePublic}>
              {dashboard.isPublic ? "Public" : "Private"}
            </Button>
          </div>
          {dashboard.isPublic && (
            <div className="mt-3 flex items-center gap-2">
              <input value={`${window.location.origin}/public/${id}`} readOnly className="input flex-1 text-xs" />
              <Button size="xs" variant="outline" onClick={copyLink}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Members</h3>
          <div className="flex gap-2 mb-3">
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="input flex-1 text-xs">
              <option value="">Select user...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.userName} ({u.email})</option>)}
            </select>
            <Button size="xs" onClick={addMember} disabled={!selectedUser}><Plus className="size-3.5" /> Add</Button>
          </div>
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">No members added</p>
          ) : (
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-1.5 text-xs">
                  <span>{m.user.userName} <span className="text-muted-foreground">({m.user.email})</span></span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{m.role}</span>
                    <button onClick={() => removeMember(m.userId)}><Trash2 className="size-3 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-medium">Embed</h3>
          <input value={`<iframe src="${window.location.origin}/embed/${id}" width="100%" height="600" frameborder="0"></iframe>`} readOnly className="input w-full text-xs" />
          <p className="mt-1 text-[10px] text-muted-foreground">Copy this iframe code to embed the dashboard in any page</p>
        </div>
      </div>
    </div>
  )
}
