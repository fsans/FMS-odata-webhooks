import { useState } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { fileMakerService } from '@/services/filemaker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Database, Server } from 'lucide-react'

export function ConnectionForm() {
  const { isConnected, connection, setConnection, disconnect } = useFileMaker()
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const newConnection = { host, username, password }
      fileMakerService.setConnection(newConnection)

      await fileMakerService.testConnection()
      setConnection(newConnection)
      setPassword('')
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
          Enter your FileMaker Server host and database credentials. The username and password must be for an account that exists in your FileMaker database file(s) with the <strong>fmrest</strong> extended privilege enabled.
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
            <Input
              id="host"
              placeholder="server.example.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Database Account Username</Label>
            <Input
              id="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              required
            />
            <p className="text-xs text-slate-500">
              Must have fmrest privilege enabled in the database
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
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
