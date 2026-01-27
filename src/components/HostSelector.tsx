import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const STORAGE_KEY = 'filemaker_hosts'

interface HostSelectorProps {
  onConnect: (host: string) => void
  isLoading?: boolean
  currentHost?: string
}

export function HostSelector({ onConnect, isLoading = false, currentHost }: HostSelectorProps) {
  const [host, setHost] = useState(currentHost || '')
  const [hostHistory, setHostHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setHostHistory(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (!showHistory) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#host-dropdown-container')) {
        setShowHistory(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHistory])

  const saveHostToHistory = (newHost: string) => {
    if (!newHost.trim()) return
    const updated = [newHost, ...hostHistory.filter((h) => h !== newHost)].slice(0, 10)
    setHostHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const removeFromHistory = (hostToRemove: string) => {
    const updated = hostHistory.filter((h) => h !== hostToRemove)
    setHostHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    if (host.trim()) {
      saveHostToHistory(host)
      onConnect(host)
    }
  }

  return (
    <form onSubmit={handleConnect} className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Label htmlFor="host" className="text-xs font-medium text-slate-700">
          Server Host
        </Label>
        <div className="relative" id="host-dropdown-container">
          <Input
            id="host"
            placeholder="server.example.com or 192.168.0.24"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onFocus={() => setShowHistory(true)}
            autoComplete="off"
            disabled={isLoading}
            className="text-sm"
          />
          {showHistory && hostHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {hostHistory.map((h) => (
                <div
                  key={h}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer group"
                  onClick={() => {
                    setHost(h)
                    setShowHistory(false)
                  }}
                >
                  <span className="text-sm">{h}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromHistory(h)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Button
        type="submit"
        disabled={isLoading || !host.trim()}
        size="sm"
        className="text-sm"
      >
        {isLoading ? 'Connecting...' : 'Connect'}
      </Button>
    </form>
  )
}
