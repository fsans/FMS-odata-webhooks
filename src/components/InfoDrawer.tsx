import { X, Info } from 'lucide-react'

interface InfoDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoDrawer({ isOpen, onClose }: InfoDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-900" />
              <h2 className="text-lg font-bold text-slate-900">Help & Information</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            <section className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">⚠️ Disclaimer</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                This is an experimental application and cannot be used in production. nBCN Software offers no support, warranties, or guarantees of any kind. The company is not responsible for any issues, data loss, or damages resulting from the use of this application or any part of the system.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Database Account Credentials</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-900 mb-1">Username</p>
                  <p className="text-xs">Account that exists in your FileMaker database file(s)</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900 mb-1">Password</p>
                  <p className="text-xs">Must have fmodata privilege enabled in the database</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">SSL Certificate Issues</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>If you encounter SSL certificate errors:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Open <code className="bg-slate-100 px-1 rounded">https://[host]/fmi/odata/v4</code> in your browser</li>
                  <li>Accept the certificate warning</li>
                  <li>Return here and try connecting again</li>
                </ol>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">FileMaker OData API</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>This application uses the FileMaker OData API to manage webhooks and access database metadata.</p>
                <p className="text-xs">Ensure your FileMaker Server supports OData v4 and that your account has the necessary privileges.</p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">About</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">FileMaker OData Webhooks Manager</span></p>
                <p className="text-xs">Version 1.0.2</p>
                <p className="text-xs">Copyright © nBCN Software 2005 Barcelona</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
