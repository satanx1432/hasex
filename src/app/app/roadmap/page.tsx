'use client'

import { useRouter } from 'next/navigation'

export default function Roadmap() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[640px] mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Roadmap</h1>
          <p className="text-on-surface-variant font-body-md">
            Roadmap generation requires AI configuration.
          </p>
        </div>

        <div className="bg-surface border border-border p-6 mb-6">
          <h3 className="font-headline-md text-headline-md text-primary mb-4">
            Coming Soon
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Roadmap generation uses AI to break down your goal into phases and stages. This feature requires the NVIDIA NIM API to be configured.
          </p>
          <div className="bg-surface-container-low border border-border p-4">
            <p className="font-label-mono text-label-mono text-on-surface-variant mb-2">To enable roadmaps:</p>
            <ol className="text-body-sm text-body-sm text-on-surface list-decimal list-inside space-y-1">
              <li>Add <code className="bg-background px-1">NVIDIA_NIM_API_KEY</code> to <code className="bg-background px-1">.env.local</code></li>
              <li>Restart the dev server</li>
              <li>Complete the destination interview during onboarding</li>
            </ol>
          </div>
        </div>

        <button
          onClick={() => router.push('/app')}
          className="w-full bg-surface border border-border text-primary font-headline-md font-bold uppercase tracking-widest h-[48px] hover:border-primary transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}