import { Activity } from 'lucide-react'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <Activity size={20} strokeWidth={2.25} />
        </div>
        <span>HEMM</span>
      </header>
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <p className="eyebrow">Gestão de engenharia clínica</p>
        <h1 id="welcome-title">Base do sistema pronta</h1>
        <p className="welcome-copy">
          A estrutura do HEMM está inicializada. As próximas funcionalidades
          devem seguir as especificações em <code>docs/</code>.
        </p>
      </section>
    </main>
  )
}

export default App
