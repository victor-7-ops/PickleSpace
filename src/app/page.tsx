import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-xl font-bold text-green-600">PickleSpace</span>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link href="/register" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Get started
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Book pickleball courts<br />in Cebu, instantly.
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          Real-time availability · GCash & card payments · Player matchmaking
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/courts" className="bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-700">
            Find a court
          </Link>
          <Link href="/games" className="border border-gray-200 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50">
            Join a game
          </Link>
        </div>
      </section>
    </main>
  )
}
