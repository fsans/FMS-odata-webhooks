import { useState } from 'react'
import { useFileMaker } from '@/contexts/FileMakerContext'
import { HostSelector } from './HostSelector'
import { LoginDialog } from './LoginDialog'
import { Button } from '@/components/ui/button'

interface HeaderContentProps {}

export function HeaderContent({}: HeaderContentProps) {
  const { isConnected, connection, disconnect, setConnection } = useFileMaker()
  const [selectedHost, setSelectedHost] = useState('')
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleHostConnect = (host: string) => {
    setSelectedHost(host)
    setLoginError(null)
    setShowLoginDialog(true)
  }

  const handleLogin = async (username: string, password: string) => {
    setLoginError(null)
    setIsConnecting(true)

    try {
      const { fileMakerService } = await import('@/services/filemaker')
      const newConnection = { host: selectedHost, username, password }
      fileMakerService.setConnection(newConnection)
      await fileMakerService.testConnection()
      setConnection(newConnection)
      setShowLoginDialog(false)
      setSelectedHost('')
      setIsConnecting(false)
    } catch (err) {
      setIsConnecting(false)
      setLoginError(err instanceof Error ? err.message : 'Connection failed. Check console for details.')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setSelectedHost('')
    setLoginError(null)
  }

  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          FileMaker OData Webhooks Manager
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Manage FileMaker Server webhooks via OData API
        </p>
      </div>
      <div className="flex items-center gap-4">
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-slate-500">Connected to:</p>
              <p className="text-sm font-medium text-slate-900">{connection?.host}</p>
            </div>
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <HostSelector
            onConnect={handleHostConnect}
            isLoading={isConnecting}
          />
        )}
      </div>

      {showLoginDialog && (
        <LoginDialog
          host={selectedHost}
          onLogin={handleLogin}
          onClose={() => setShowLoginDialog(false)}
          isLoading={isConnecting}
          error={loginError}
        />
      )}
    </div>
  )
}
