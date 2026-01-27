import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface LoginDialogProps {
  host: string
  onLogin: (username: string, password: string) => Promise<void>
  onClose: () => void
  isLoading?: boolean
  error?: string | null
}

export function LoginDialog({ host, onLogin, onClose, isLoading = false, error }: LoginDialogProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onLogin(username, password)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">FileMaker Server Login</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          <p className="font-medium mb-1">Connecting to:</p>
          <p className="font-mono text-xs">{host}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Database Account Username</Label>
            <Input
              id="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              disabled={isLoading}
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
              disabled={isLoading}
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
                    <li>
                      Open <code className="bg-red-100 px-1 rounded">https://{host}/fmi/odata/v4</code> in your browser
                    </li>
                    <li>Accept the certificate warning</li>
                    <li>Return here and try again</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
