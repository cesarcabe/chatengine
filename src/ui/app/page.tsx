/**
 * Home Page
 * 
 * Página inicial com link para o chat
 */

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Chat Engine</h1>
        <p className="text-gray-600 mb-8">
          Sistema de chat reutilizável inspirado no WhatsApp Web
        </p>
        <Link
          href="/chat"
          className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
        >
          Abrir Chat
        </Link>
      </div>
    </main>
  )
}