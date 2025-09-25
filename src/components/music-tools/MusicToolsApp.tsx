import { AuthProvider } from '../../contexts/AuthContext';
import { AuthGuard } from '../shared/AuthGuard';

export function MusicToolsApp() {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <header className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-wide text-purple-600">Music Tools</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Creative utilities for your music practice</h1>
              <p className="text-base sm:text-lg text-gray-600">
                This space is dedicated to building and experimenting with music-focused helpers. Expect rapid
                iteration, concept wireframes, and early prototypes as new ideas come to life.
              </p>
            </header>

            <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900">What&apos;s planned</h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Upcoming ideas may include tuning aids, rhythmic practice helpers, chord reference tools, and more.
                  Share feedback or feature requests to help prioritize the roadmap.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-dashed border-purple-200 p-5 bg-purple-50/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">Now</p>
                  <p className="text-sm sm:text-base text-gray-700">Laying groundwork and exploring UI concepts</p>
                </div>
                <div className="rounded-xl border border-dashed border-indigo-200 p-5 bg-indigo-50/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Next</p>
                  <p className="text-sm sm:text-base text-gray-700">Prototype practice timers and scale reference tools</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-purple-100 bg-white/70 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Stay tuned</h2>
              <p className="text-sm sm:text-base text-gray-600">
                As utilities graduate from experiments to production-ready tools, this app will grow with dedicated
                flows, data services, and integrations. For now, enjoy the preview of what&apos;s coming.
              </p>
            </section>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

