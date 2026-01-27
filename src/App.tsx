import { FileMakerProvider } from './contexts/FileMakerContext'
import { MainLayout } from './components/MainLayout'
import { HeaderContent } from './components/HeaderContent'

function App() {
  return (
    <FileMakerProvider>
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-slate-200">
          <HeaderContent />
        </header>

        <main className="flex h-[calc(100vh-80px)]">
          <MainLayout />
        </main>
      </div>
    </FileMakerProvider>
  )
}

export default App
