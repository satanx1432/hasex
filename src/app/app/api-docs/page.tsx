'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APIDocumentationSystem, APIDocumentation, APIEndpoint } from '@/lib/api/api-docs'

export default function APIDocsPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<APIDocumentation | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const apiDocsSystem = new APIDocumentationSystem()

  useEffect(() => {
    loadDocs()
  }, [])

  const loadDocs = () => {
    setIsLoading(true)
    try {
      const documentation = apiDocsSystem.getDocumentation()
      setDocs(documentation)
      if (documentation.tags.length > 0) {
        setSelectedTag(documentation.tags[0].name)
      }
    } catch (error) {
      console.error('Failed to load API docs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-500/20 text-green-400 border-green-500'
      case 'POST':
        return 'bg-blue-500/20 text-blue-400 border-blue-500'
      case 'PUT':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'DELETE':
        return 'bg-red-500/20 text-red-400 border-red-500'
      case 'PATCH':
        return 'bg-purple-500/20 text-purple-400 border-purple-500'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500'
    }
  }

  const getFilteredEndpoints = () => {
    if (!docs || !selectedTag) return []

    const endpoints = Object.values(docs.paths)
      .flatMap(pathObject => Object.values(pathObject))
      .filter((endpoint): endpoint is APIEndpoint => 
        endpoint !== null && 
        typeof endpoint === 'object' && 
        'tags' in endpoint && 
        Array.isArray(endpoint.tags) && 
        endpoint.tags.includes(selectedTag)
      )

    if (searchQuery) {
      return endpoints.filter(endpoint =>
        endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endpoint.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return endpoints
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
          <span className="font-label-mono text-label-mono tracking-widest text-primary">API Docs</span>
          <div className="w-6" />
        </nav>
      </header>

      <main className="pt-24 pb-32 px-grid-margin min-h-screen">
        <div className="max-w-[640px] mx-auto">
          {/* API Info */}
          {docs && (
            <section className="mb-stack-lg">
              <div className="bg-surface border border-border p-6">
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
                  {docs.info.title}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  {docs.info.description}
                </p>
                <div className="flex items-center gap-4">
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                    Version: {docs.info.version}
                  </span>
                  <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                    OpenAPI: {docs.openapi}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Search */}
          <section className="mb-stack-lg">
            <div className="relative">
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border p-4 pl-12 font-body-md text-body-md text-primary rounded-xl"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" data-icon="search">
                search
              </span>
            </div>
          </section>

          {/* Tags */}
          {docs && (
            <section className="mb-stack-lg">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {docs.tags.map(tag => (
                  <button
                    key={tag.name}
                    onClick={() => setSelectedTag(tag.name)}
                    className={`px-4 py-2 font-label-mono text-label-mono whitespace-nowrap rounded-lg transition-all ${
                      selectedTag === tag.name
                        ? 'bg-primary text-background'
                        : 'bg-surface text-on-surface-variant border border-border'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Endpoints List */}
          <section className="mb-stack-lg">
            <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
              {selectedTag} Endpoints
            </h2>
            <div className="space-y-3">
              {getFilteredEndpoints().map((endpoint, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedEndpoint(endpoint)}
                  className="bg-surface border border-border p-4 cursor-pointer hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 font-label-mono text-label-mono text-xs rounded border ${getMethodColor(endpoint.method)}`}
                    >
                      {endpoint.method}
                    </span>
                    <span className="font-body-md text-body-md text-primary font-mono">
                      {endpoint.path}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {endpoint.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Servers */}
          {docs && (
            <section className="mb-stack-lg">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Servers
              </h2>
              <div className="space-y-2">
                {docs.servers.map((server, index) => (
                  <div key={index} className="bg-surface border border-border p-4">
                    <p className="font-label-mono text-label-mono text-primary font-mono text-sm">
                      {server.url}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      {server.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Endpoint Detail Modal */}
      {selectedEndpoint && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-border p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 font-label-mono text-label-mono text-xs rounded border ${getMethodColor(selectedEndpoint.method)}`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <span className="font-label-mono text-label-mono text-primary font-mono text-sm">
                    {selectedEndpoint.path}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEndpoint(null)}
                  className="material-symbols-outlined text-primary"
                  data-icon="close"
                >
                  close
                </button>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-headline-md text-headline-md text-primary mb-2">
                {selectedEndpoint.summary}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                {selectedEndpoint.description}
              </p>

              {/* Parameters */}
              {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
                    Parameters
                  </h4>
                  <div className="space-y-2">
                    {selectedEndpoint.parameters.map((param, index) => (
                      <div key={index} className="bg-surface-variant border border-border p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-label-mono text-label-mono text-primary">
                            {param.name}
                          </span>
                          <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                            {param.in}
                          </span>
                          {param.required && (
                            <span className="text-error text-xs">required</span>
                          )}
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {param.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body */}
              {selectedEndpoint.requestBody && (
                <div className="mb-6">
                  <h4 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
                    Request Body
                  </h4>
                  <div className="bg-surface-variant border border-border p-3 rounded-lg">
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
                      {selectedEndpoint.requestBody.description}
                    </p>
                    {selectedEndpoint.requestBody.required && (
                      <span className="text-error text-xs">required</span>
                    )}
                  </div>
                </div>
              )}

              {/* Responses */}
              <div className="mb-6">
                <h4 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
                  Responses
                </h4>
                <div className="space-y-2">
                  {selectedEndpoint.responses.map((response, index) => (
                    <div key={index} className="bg-surface-variant border border-border p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-label-mono text-label-mono text-primary">
                          {response.code}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {response.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security */}
              {selectedEndpoint.security && selectedEndpoint.security.length > 0 && (
                <div>
                  <h4 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
                    Security
                  </h4>
                  <div className="space-y-2">
                    {selectedEndpoint.security.map((scheme, index) => (
                      <div key={index} className="bg-surface-variant border border-border p-3 rounded-lg">
                        <span className="font-label-mono text-label-mono text-primary">
                          {scheme}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
