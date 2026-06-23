'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WebhookSystem, Webhook, WebhookTemplate } from '@/lib/webhooks/webhook-system'

export default function WebhooksPage() {
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [templates, setTemplates] = useState<WebhookTemplate[]>([])
  const [availableEvents, setAvailableEvents] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [showTestResult, setShowTestResult] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
  })

  const webhookSystem = new WebhookSystem()

  useEffect(() => {
    loadWebhooks()
    loadTemplates()
    setAvailableEvents(webhookSystem.getAvailableEvents())
  }, [])

  const loadWebhooks = async () => {
    setIsLoading(true)
    try {
      const data = await webhookSystem.getUserWebhooks('user_123')
      setWebhooks(data)
    } catch (error) {
      console.error('Failed to load webhooks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTemplates = () => {
    setTemplates(webhookSystem.getWebhookTemplates())
  }

  const handleCreateWebhook = async () => {
    try {
      await webhookSystem.createWebhook('user_123', newWebhook)
      setShowCreateModal(false)
      setNewWebhook({ name: '', url: '', events: [], secret: '' })
      loadWebhooks()
    } catch (error) {
      console.error('Failed to create webhook:', error)
      alert('Failed to create webhook. Please check your URL and try again.')
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      await webhookSystem.deleteWebhook(webhookId)
      loadWebhooks()
    } catch (error) {
      console.error('Failed to delete webhook:', error)
    }
  }

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await webhookSystem.updateWebhook('user_123', webhook.id, { active: !webhook.active })
      loadWebhooks()
    } catch (error) {
      console.error('Failed to update webhook:', error)
    }
  }

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const result = await webhookSystem.testWebhook('user_123', webhookId)
      setTestResult(result)
      setShowTestResult(true)
    } catch (error) {
      console.error('Failed to test webhook:', error)
      setTestResult({ success: false, error: 'Failed to test webhook' })
      setShowTestResult(true)
    }
  }

  const handleUseTemplate = (template: WebhookTemplate) => {
    setNewWebhook({
      name: template.name,
      url: '',
      events: template.events,
      secret: '',
    })
    setShowCreateModal(true)
  }

  const toggleEventSelection = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }))
  }

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="fixed top-0 left-0 w-full z-50 bg-background border-b border-border">
        <nav className="flex justify-between items-center w-full px-grid-margin py-stack-sm max-w-[640px] mx-auto">
          <button
            onClick={() => router.back()}
            className="material-symbols-outlined text-primary"
            data-icon="arrow_back"
          >
            arrow_back
          </button>
          <span className="font-label-mono text-label-mono tracking-widest text-primary">Webhooks</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="material-symbols-outlined text-primary"
            data-icon="add"
          >
            add
          </button>
        </nav>
      </header>

      <main className="pt-24 pb-32 px-grid-margin min-h-screen">
        <div className="max-w-[640px] mx-auto">
          {/* Webhooks List */}
          <section className="mb-stack-lg">
            <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
              Your Webhooks
            </h2>
            {webhooks.length === 0 ? (
              <div className="bg-surface border border-border p-6 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2" data-icon="webhook">
                  webhook
                </span>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  No webhooks configured yet
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-primary underline font-label-mono text-label-mono"
                >
                  Create your first webhook
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map(webhook => (
                  <div key={webhook.id} className="bg-surface border border-border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-headline-md text-headline-md text-primary">{webhook.name}</h3>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              webhook.active ? 'bg-primary' : 'bg-on-surface-variant'
                            }`}
                          />
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant font-mono">
                          {webhook.url}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleActive(webhook)}
                        className={`material-symbols-outlined ${
                          webhook.active ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                        data-icon={webhook.active ? 'toggle_on' : 'toggle_off'}
                      >
                        {webhook.active ? 'toggle_on' : 'toggle_off'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {webhook.events.map(event => (
                        <span
                          key={event}
                          className="bg-surface-variant px-2 py-1 rounded-full font-label-mono text-label-mono text-xs text-on-surface-variant"
                        >
                          {event}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-label-mono text-label-mono text-on-surface-variant">
                          {webhook.success_rate.toFixed(0)}% success
                        </span>
                        <span className="font-label-mono text-label-mono text-on-surface-variant">
                          {webhook.total_triggers} triggers
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestWebhook(webhook.id)}
                          className="material-symbols-outlined text-primary text-sm"
                          data-icon="science"
                        >
                          science
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          className="material-symbols-outlined text-error text-sm"
                          data-icon="delete"
                        >
                          delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Templates */}
          <section className="mb-stack-lg">
            <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
              Quick Templates
            </h2>
            <div className="space-y-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-surface border border-border p-4 cursor-pointer hover:border-primary transition-all"
                  onClick={() => handleUseTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-headline-md text-headline-md text-primary">{template.name}</h3>
                    <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">
                      arrow_forward
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {template.events.map(event => (
                      <span
                        key={event}
                        className="bg-primary-container px-2 py-1 rounded-full font-label-mono text-label-mono text-xs text-on-primary-container"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Available Events */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Available Events
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {availableEvents.map(event => (
                  <span
                    key={event}
                    className="bg-surface-variant px-3 py-2 rounded-lg font-label-mono text-label-mono text-sm text-on-surface-variant"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Documentation */}
          <section>
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Webhook Documentation
              </h2>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-body-md text-body-md text-primary mb-2">Payload Format</h3>
                  <pre className="bg-surface-variant p-3 rounded-lg overflow-x-auto">
                    <code className="font-label-mono text-label-mono text-on-surface">
                      {`{
  "id": "evt_1234567890",
  "event": "task.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "task_id": "task_123",
    "task_title": "Complete task",
    "user_id": "user_456"
  }
}`}
                    </code>
                  </pre>
                </div>
                <div>
                  <h3 className="font-body-md text-body-md text-primary mb-2">Security</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    All webhooks include a signature in the <code className="font-label-mono text-label-mono">
                      X-Webhook-Signature
                    </code>{' '}
                    header. Use your webhook secret to verify the signature.
                  </p>
                </div>
                <div>
                  <h3 className="font-body-md text-body-md text-primary mb-2">Retry Policy</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Failed webhooks are retried up to 3 times with exponential backoff (1s, 2s, 4s).
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline-lg text-headline-lg text-primary">Create Webhook</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="material-symbols-outlined text-primary"
                data-icon="close"
              >
                close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  className="w-full bg-surface-variant border border-border rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface"
                  placeholder="My Webhook"
                />
              </div>

              <div>
                <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  className="w-full bg-surface-variant border border-border rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface"
                  placeholder="https://your-server.com/webhook"
                />
              </div>

              <div>
                <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                  Events
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableEvents.map(event => (
                    <button
                      key={event}
                      onClick={() => toggleEventSelection(event)}
                      className={`text-left px-3 py-2 rounded-lg font-label-mono text-label-mono text-sm transition-all ${
                        newWebhook.events.includes(event)
                          ? 'bg-primary text-background'
                          : 'bg-surface-variant text-on-surface-variant'
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-label-mono text-label-mono text-on-surface-variant block mb-2">
                  Secret (optional)
                </label>
                <input
                  type="text"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                  className="w-full bg-surface-variant border border-border rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface"
                  placeholder="Auto-generated if empty"
                />
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Used to verify webhook signatures
                </p>
              </div>

              <button
                onClick={handleCreateWebhook}
                disabled={!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                className="w-full bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[64px] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer rounded-2xl"
              >
                Create Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {showTestResult && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline-lg text-headline-lg text-primary">Test Result</h3>
              <button
                onClick={() => setShowTestResult(false)}
                className="material-symbols-outlined text-primary"
                data-icon="close"
              >
                close
              </button>
            </div>

            <div
              className={`p-4 rounded-lg mb-4 ${
                testResult.success ? 'bg-primary-container' : 'bg-error-container'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`material-symbols-outlined ${
                    testResult.success ? 'text-on-primary-container' : 'text-on-error-container'
                  }`}
                  data-icon={testResult.success ? 'check_circle' : 'error'}
                >
                  {testResult.success ? 'check_circle' : 'error'}
                </span>
                <span
                  className={`font-headline-md text-headline-md ${
                    testResult.success ? 'text-on-primary-container' : 'text-on-error-container'
                  }`}
                >
                  {testResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
              {testResult.response && (
                <div className="mt-2">
                  <p className="font-label-mono text-label-mono text-on-surface-variant mb-1">
                    Status: {testResult.response.status}
                  </p>
                  <pre className="text-sm overflow-x-auto">
                    <code className="font-label-mono text-label-mono text-on-surface">
                      {testResult.response.body}
                    </code>
                  </pre>
                </div>
              )}
              {testResult.error && (
                <p className="font-body-md text-body-md text-on-error-container">{testResult.error}</p>
              )}
            </div>

            <button
              onClick={() => setShowTestResult(false)}
              className="w-full bg-surface-variant text-on-surface-variant font-label-mono text-label-mono py-3 rounded-lg border border-border"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
