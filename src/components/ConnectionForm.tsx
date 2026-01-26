import { useState, useEffect } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { fileMakerService } from '@/services/filemaker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Database, Server, X } from 'lucide-react'

const STORAGE_KEY = 'filemaker_hosts'

interface ConnectionFormProps {
  onClose?: () => void
}

export function ConnectionForm({ onClose }: ConnectionFormProps) {
  const { isConnected, connection, setConnection, disconnect } = useFileMaker()
  const [host, setHost] = useState('')
  const [hostHistory, setHostHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load host history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setHostHistory(JSON.parse(saved))
    }
  }, [])

  // Close dropdown when clicking outside
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

  // Save host to history
  const saveHostToHistory = (newHost: string) => {
    if (!newHost.trim()) return

    const updated = [newHost, ...hostHistory.filter((h) => h !== newHost)].slice(0, 10)
    setHostHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // Remove host from history
  const removeFromHistory = (hostToRemove: string) => {
    const updated = hostHistory.filter((h) => h !== hostToRemove)
    setHostHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const newConnection = { host, username, password }
      fileMakerService.setConnection(newConnection)

      await fileMakerService.testConnection()
      setConnection(newConnection)
      saveHostToHistory(host)
      setPassword('')
      setShowHistory(false)
      onClose?.()
    } catch (err) {
      console.error('Connection error:', err)
      setError(err instanceof Error ? err.message : 'Connection failed. Check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setHost('')
    setUsername('')
    setPassword('')
    setError(null)
  }

  if (isConnected && connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Connected to FileMaker Server
          </CardTitle>
          <CardDescription>
            {connection.username}@{connection.host}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Connect to FileMaker Server
        </CardTitle>
        <CardDescription>
          Enter your FileMaker Server host and database credentials. The username and password must be for an account that exists in your FileMaker database file(s) with the <strong>fmodata</strong> extended privilege enabled.
          <br />
          <span className="text-xs text-amber-700 mt-2 block">⚠️ Make sure the backend server is running: <code className="bg-amber-100 px-1 rounded">npm run backend</code></span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          <p className="font-medium mb-1">Authentication Note:</p>
          <p>These credentials will be used to access <strong>all databases</strong> on the server. Make sure the account exists in each database you want to manage, or use the same username/password across your databases.</p>
        </div>
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="host">Server Host</Label>
            <div className="relative" id="host-dropdown-container">
              <Input
                id="host"
                placeholder="server.example.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                onFocus={() => setShowHistory(true)}
                autoComplete="off"
                required
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
            {hostHistory.length > 0 && !showHistory && (
              <p className="text-xs text-slate-500">
                Click the field to see {hostHistory.length} saved host(s)
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Database Account Username</Label>
            <Input
              id="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              required
            />
            <p className="text-xs text-slate-500">
              Account that exists in your FileMaker database file(s)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Database Account Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              required
            />
            <p className="text-xs text-slate-500">
              Must have fmodata privilege enabled in the database
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              <p className="font-medium mb-2">Connection Error:</p>
              <p className="whitespace-pre-wrap mb-3">{error}</p>
              {error.includes('SSL') && (
                <div className="mt-3 pt-3 border-t border-red-200 text-xs">
                  <p className="font-medium mb-1">Quick Fix for SSL Certificate:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open <code className="bg-red-100 px-1 rounded">https://{host}/fmi/odata/v4</code> in your browser</li>
                    <li>Accept the certificate warning</li>
                    <li>Return here and try connecting again</li>
                  </ol>
                </div>
              )}
            </div>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
