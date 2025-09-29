import React from 'react'
import Mantenimientos from './pages/Mantenimientos'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 className="text-3xl font-bold text-center py-4 bg-blue-600 text-white">
          Mantenimiento de Cabezales
        </h1>
      </header>
      <main>
        <Mantenimientos />
      </main>
    </div>
  )
}