'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Connector, ConnectorCategory, ConnectorStatus, CategoryInfo } from '@/types/integrations';
import { mockConnectors, categories, mockLogs } from '@/lib/integrations/data';

// Fuzzy search implementation
const fuzzySearch = (query: string, items: Connector[]): Connector[] => {
  if (!query.trim()) return items;
  
  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/).filter(Boolean);
  
  return items.filter(connector => {
    const searchText = `${connector.name} ${connector.description} ${connector.tags.join(' ')}`.toLowerCase();
    
    return terms.every(term => {
      // Check for fuzzy matching (character-by-character with gaps allowed)
      let termIndex = 0;
      for (let i = 0; i < searchText.length && termIndex < term.length; i++) {
        if (searchText[i] === term[termIndex]) {
          termIndex++;
        }
      }
      return termIndex === term.length || searchText.includes(term);
    });
  });
};

// Status badge component
const StatusBadge = ({ status }: { status: ConnectorStatus }) => {
  const statusConfig = {
    connected: { label: 'Connected', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    available: { label: 'Available', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    needs_setup: { label: 'Needs Setup', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    error: { label: 'Error', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  };
  
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'connected' ? 'bg-emerald-400' :
        status === 'available' ? 'bg-blue-400' :
        status === 'needs_setup' ? 'bg-amber-400' : 'bg-red-400'
      }`} />
      {config.label}
    </span>
  );
};

// Connector card skeleton
const ConnectorCardSkeleton = () => (
  <div className="bg-[#171717] border border-[#262626] rounded-2xl p-5 animate-pulse">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-12 h-12 bg-[#262626] rounded-xl" />
      <div className="flex-1">
        <div className="h-5 bg-[#262626] rounded w-24 mb-2" />
        <div className="h-4 bg-[#262626] rounded w-16" />
      </div>
    </div>
    <div className="h-4 bg-[#262626] rounded w-full mb-2" />
    <div className="h-4 bg-[#262626] rounded w-3/4 mb-4" />
    <div className="flex gap-2">
      <div className="h-6 bg-[#262626] rounded-full w-16" />
      <div className="h-6 bg-[#262626] rounded-full w-20" />
    </div>
  </div>
);

// Connector card component
const ConnectorCard = ({ 
  connector, 
  onSelect,
  onConnect 
}: { 
  connector: Connector; 
  onSelect: () => void;
  onConnect: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`relative bg-[#171717] border rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
          isHovered ? 'border-[#404040] shadow-lg shadow-black/20 -translate-y-0.5' : 'border-[#262626]'
        }`}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        aria-label={`${connector.name} connector`}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center overflow-hidden flex-shrink-0">
            <img 
              src={connector.logo} 
              alt={connector.name}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#fafafa] truncate">{connector.name}</h3>
              {connector.version && (
                <span className="text-xs text-[#737373] font-mono">v{connector.version}</span>
              )}
            </div>
            <StatusBadge status={connector.status} />
          </div>
        </div>
        
        {/* Description */}
        <p className="text-sm text-[#a3a3a3] mb-4 line-clamp-2 leading-relaxed">
          {connector.description}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {connector.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="px-2 py-0.5 text-xs bg-[#1a1a1a] text-[#a3a3a3] rounded-md border border-[#262626]"
            >
              {tag}
            </span>
          ))}
          {connector.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-[#1a1a1a] text-[#737373] rounded-md border border-[#262626]">
              +{connector.tags.length - 3}
            </span>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
          <div className="text-xs text-[#737373]">
            {connector.lastSync ? (
              <span>Synced {formatTimeAgo(connector.lastSync)}</span>
            ) : (
              <span>Not synced</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="p-2 text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#262626] rounded-lg transition-colors"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-lg" data-icon="settings">settings</span>
            </button>
            {connector.status !== 'connected' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect();
                }}
                className="px-3 py-1.5 text-xs font-medium bg-[#fafafa] text-[#0a0a0a] rounded-lg hover:bg-[#e5e5e5] transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {connector.status === 'error' && connector.errorMessage && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-400">{connector.errorMessage}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Detail panel component
const DetailPanel = ({ 
  connector, 
  onClose,
  onDisconnect,
  onTest,
  isTesting
}: { 
  connector: Connector; 
  onClose: () => void;
  onDisconnect: () => void;
  onTest: () => void;
  isTesting: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'actions'>('config');
  const [configValues, setConfigValues] = useState<Record<string, string | boolean>>({});
  
  useEffect(() => {
    // Initialize config values
    const initial: Record<string, string | boolean> = {};
    connector.configFields?.forEach(field => {
      initial[field.key] = '';
    });
    setConfigValues(initial);
  }, [connector]);
  
  const tabs = [
    { id: 'config', label: 'Configuration', icon: 'tune' },
    { id: 'logs', label: 'Logs', icon: 'receipt_long' },
    { id: 'actions', label: 'Actions', icon: 'bolt' },
  ] as const;
  
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-[480px] bg-[#111111] border-l border-[#262626] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center">
            <img src={connector.logo} alt={connector.name} className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h2 className="font-semibold text-[#fafafa]">{connector.name}</h2>
            <StatusBadge status={connector.status} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-[#737373] hover:text-[#fafafa] hover:bg-[#262626] rounded-lg transition-colors"
          aria-label="Close panel"
        >
          <span className="material-symbols-outlined text-xl" data-icon="close">close</span>
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 p-3 border-b border-[#262626]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id 
                ? 'bg-[#262626] text-[#fafafa]' 
                : 'text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#1a1a1a]'
            }`}
          >
            <span className="material-symbols-outlined text-lg" data-icon={tab.icon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Authentication */}
            <section>
              <h3 className="text-sm font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" data-icon="key">key</span>
                Authentication
              </h3>
              <div className="bg-[#171717] border border-[#262626] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#a3a3a3]">Auth Type</span>
                  <span className="text-sm text-[#fafafa] font-medium capitalize">{connector.authType.replace('_', ' ')}</span>
                </div>
                {connector.webhookUrl && (
                  <div className="mt-3 pt-3 border-t border-[#262626]">
                    <span className="text-sm text-[#a3a3a3]">Webhook URL</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-xs bg-[#1a1a1a] text-[#a3a3a3] px-3 py-2 rounded-lg truncate">
                        {connector.webhookUrl}
                      </code>
                      <button className="p-2 text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#262626] rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-lg" data-icon="content_copy">content_copy</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
            
            {/* Configuration Fields */}
            {connector.configFields && connector.configFields.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" data-icon="edit">edit</span>
                  Environment Variables
                </h3>
                <div className="space-y-3">
                  {connector.configFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm text-[#a3a3a3] mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.type === 'toggle' ? (
                        <button
                          onClick={() => setConfigValues(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            configValues[field.key] ? 'bg-emerald-500' : 'bg-[#262626]'
                          }`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                            configValues[field.key] ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      ) : field.type === 'select' ? (
                        <select
                          value={configValues[field.key] as string || ''}
                          onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full bg-[#171717] border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-[#fafafa] focus:border-[#404040] focus:outline-none"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={configValues[field.key] as string || ''}
                          onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full bg-[#171717] border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-[#fafafa] placeholder:text-[#737373] focus:border-[#404040] focus:outline-none"
                        />
                      )}
                      {field.description && (
                        <p className="text-xs text-[#737373] mt-1">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* Permissions */}
            <section>
              <h3 className="text-sm font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" data-icon="shield">shield</span>
                Permissions
              </h3>
              <div className="bg-[#171717] border border-[#262626] rounded-xl p-4">
                <div className="space-y-2">
                  {connector.actions?.map((action) => (
                    <div key={action} className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-emerald-400 text-lg" data-icon="check_circle">check_circle</span>
                      <span className="text-[#a3a3a3]">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            
            {/* Rate Limits */}
            {connector.rateLimits && (
              <section>
                <h3 className="text-sm font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg" data-icon="speed">speed</span>
                  Rate Limits
                </h3>
                <div className="bg-[#171717] border border-[#262626] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#a3a3a3]">Requests</span>
                    <span className="text-sm text-[#fafafa] font-medium">
                      {connector.rateLimits.requests.toLocaleString()} / {connector.rateLimits.period}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div className="space-y-3">
            {mockLogs.map((log) => (
              <div 
                key={log.id}
                className={`p-3 rounded-lg border ${
                  log.level === 'error' ? 'bg-red-500/5 border-red-500/20' :
                  log.level === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-[#171717] border-[#262626]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warning' ? 'text-amber-400' :
                    'text-[#fafafa]'
                  }`}>
                    {log.message}
                  </span>
                  <span className="text-xs text-[#737373]">{formatTimeAgo(log.timestamp)}</span>
                </div>
                {log.details && (
                  <p className="text-xs text-[#a3a3a3]">{log.details}</p>
                )}
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'actions' && (
          <div className="space-y-6">
            {/* Available Actions */}
            <section>
              <h3 className="text-sm font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" data-icon="flash_on">flash_on</span>
                Available Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {connector.actions?.map((action) => (
                  <div 
                    key={action}
                    className="p-3 bg-[#171717] border border-[#262626] rounded-lg text-center"
                  >
                    <span className="text-sm text-[#fafafa]">{action}</span>
                  </div>
                ))}
              </div>
            </section>
            
            {/* Available Tools */}
            <section>
              <h3 className="text-sm font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" data-icon="build">build</span>
                Available Tools
              </h3>
              <div className="space-y-2">
                {connector.tools?.map((tool) => (
                  <div 
                    key={tool}
                    className="flex items-center gap-2 p-3 bg-[#171717] border border-[#262626] rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[#a3a3a3] text-lg" data-icon="code">code</span>
                    <code className="text-sm text-[#a3a3a3] font-mono">{tool}</code>
                  </div>
                ))}
              </div>
            </section>
            
            {/* Available Resources */}
            <section>
              <h3 className="text-sm font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" data-icon="folder">folder</span>
                Available Resources
              </h3>
              <div className="flex flex-wrap gap-2">
                {connector.resources?.map((resource) => (
                  <span 
                    key={resource}
                    className="px-3 py-1.5 bg-[#171717] border border-[#262626] rounded-lg text-sm text-[#a3a3a3]"
                  >
                    {resource}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-5 border-t border-[#262626] flex gap-3">
        <button
          onClick={onTest}
          disabled={isTesting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#262626] text-[#fafafa] rounded-xl hover:bg-[#333333] transition-colors disabled:opacity-50"
        >
          {isTesting ? (
            <>
              <div className="w-4 h-4 border-2 border-[#fafafa]/30 border-t-[#fafafa] rounded-full animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg" data-icon="play_arrow">play_arrow</span>
              Test Connection
            </>
          )}
        </button>
        {connector.status === 'connected' && (
          <button
            onClick={onDisconnect}
            className="px-4 py-2.5 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Empty state component
const EmptyState = ({ type, searchQuery }: { type: 'no_connectors' | 'no_results'; searchQuery?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 rounded-2xl bg-[#171717] border border-[#262626] flex items-center justify-center mb-6">
      <span className="material-symbols-outlined text-4xl text-[#737373]" data-icon={
        type === 'no_connectors' ? 'cloud_off' : 'search_off'
      }>
        {type === 'no_connectors' ? 'cloud_off' : 'search_off'}
      </span>
    </div>
    <h3 className="text-lg font-semibold text-[#fafafa] mb-2">
      {type === 'no_connectors' ? 'No connectors yet' : 'No results found'}
    </h3>
    <p className="text-sm text-[#a3a3a3] max-w-sm">
      {type === 'no_connectors' 
        ? 'Get started by connecting your first integration. Browse the catalog to find available connectors.'
        : `No connectors match "${searchQuery}". Try adjusting your search terms or browse different categories.`
      }
    </p>
  </div>
);

// Error state component
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
      <span className="material-symbols-outlined text-4xl text-red-400" data-icon="error">error</span>
    </div>
    <h3 className="text-lg font-semibold text-[#fafafa] mb-2">Connection Error</h3>
    <p className="text-sm text-[#a3a3a3] max-w-sm mb-6">{message}</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 text-sm font-medium bg-[#262626] text-[#fafafa] rounded-lg hover:bg-[#333333] transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// Main Integrations component
export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ConnectorCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'lastSync'>('name');
  const [filterStatus, setFilterStatus] = useState<ConnectorStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Load connectors
  useEffect(() => {
    const loadConnectors = async () => {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setConnectors(mockConnectors);
      setIsLoading(false);
    };
    
    loadConnectors();
  }, []);
  
  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && isDetailPanelOpen) {
        setIsDetailPanelOpen(false);
        setSelectedConnector(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailPanelOpen]);
  
  // Filter and sort connectors
  const filteredConnectors = useMemo(() => {
    let result = [...connectors];
    
    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(c => c.category === selectedCategory);
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }
    
    // Search
    result = fuzzySearch(searchQuery, result);
    
    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') {
        const statusOrder = { connected: 0, available: 1, needs_setup: 2, error: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (sortBy === 'lastSync') {
        if (!a.lastSync) return 1;
        if (!b.lastSync) return -1;
        return b.lastSync.getTime() - a.lastSync.getTime();
      }
      return 0;
    });
    
    return result;
  }, [connectors, selectedCategory, filterStatus, searchQuery, sortBy]);
  
  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: connectors.length };
    connectors.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [connectors]);
  
  // Handle connector selection
  const handleSelectConnector = useCallback((connector: Connector) => {
    setSelectedConnector(connector);
    setIsDetailPanelOpen(true);
  }, []);
  
  // Handle connect
  const handleConnect = useCallback((connector: Connector) => {
    setConnectors(prev => prev.map(c => 
      c.id === connector.id ? { ...c, status: 'connected' as ConnectorStatus, lastSync: new Date() } : c
    ));
  }, []);
  
  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    if (selectedConnector) {
      setConnectors(prev => prev.map(c => 
        c.id === selectedConnector.id ? { ...c, status: 'available' as ConnectorStatus, lastSync: undefined } : c
      ));
      setSelectedConnector(prev => prev ? { ...prev, status: 'available' } : null);
    }
  }, [selectedConnector]);
  
  // Handle test connection
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
  }, []);
  
  // Handle sync all
  const handleSyncAll = useCallback(async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setConnectors(prev => prev.map(c => 
      c.status === 'connected' ? { ...c, lastSync: new Date() } : c
    ));
    setIsSyncing(false);
  }, []);
  
  // Handle add custom connector
  const handleAddCustom = useCallback(() => {
    const customConnector: Connector = {
      id: `custom-${Date.now()}`,
      name: 'New Custom Connector',
      description: 'Configure your custom integration',
      logo: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
      category: 'custom',
      status: 'needs_setup',
      tags: ['Custom'],
      authType: 'custom',
      configFields: [
        { key: 'name', label: 'Connector Name', type: 'text', required: true },
        { key: 'base_url', label: 'Base URL', type: 'text', required: true },
      ],
    };
    setConnectors(prev => [...prev, customConnector]);
    handleSelectConnector(customConnector);
  }, [handleSelectConnector]);
  
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Top Toolbar */}
      <div className="flex-shrink-0 border-b border-[#262626] bg-[#111111]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title and sync */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold text-[#fafafa]">Integrations</h1>
                <p className="text-sm text-[#737373]">Connect AI models, APIs, and services</p>
              </div>
              <button
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#a3a3a3] bg-[#171717] border border-[#262626] rounded-lg hover:text-[#fafafa] hover:border-[#404040] transition-colors disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`} data-icon="sync">sync</span>
                {isSyncing ? 'Syncing...' : 'Sync All'}
              </button>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddCustom}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0a0a0a] bg-[#fafafa] rounded-lg hover:bg-[#e5e5e5] transition-colors"
              >
                <span className="material-symbols-outlined text-lg" data-icon="add">add</span>
                Add Custom
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#a3a3a3] bg-[#171717] border border-[#262626] rounded-lg hover:text-[#fafafa] hover:border-[#404040] transition-colors">
                <span className="material-symbols-outlined text-lg" data-icon="download">download</span>
                Import MCP
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#a3a3a3] bg-[#171717] border border-[#262626] rounded-lg hover:text-[#fafafa] hover:border-[#404040] transition-colors">
                <span className="material-symbols-outlined text-lg" data-icon="upload">upload</span>
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-[#262626] bg-[#111111] overflow-y-auto">
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" data-icon="search">search</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="w-full bg-[#171717] border border-[#262626] rounded-lg pl-10 pr-16 py-2.5 text-sm text-[#fafafa] placeholder:text-[#737373] focus:border-[#404040] focus:outline-none"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-[#737373] bg-[#262626] rounded">
                ⌘K
              </kbd>
            </div>
            
            {/* Categories */}
            <nav className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-[#262626] text-[#fafafa]'
                      : 'text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#171717]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg" data-icon={category.icon}>{category.icon}</span>
                    {category.label}
                  </span>
                  {categoryCounts[category.id] !== undefined && (
                    <span className="text-xs text-[#737373] bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                      {categoryCounts[category.id]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Filter/Sort Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#737373]">
                  {filteredConnectors.length} integration{filteredConnectors.length !== 1 ? 's' : ''}
                </span>
                
                {/* Filter dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowFilterMenu(!showFilterMenu);
                      setShowSortMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#a3a3a3] bg-[#171717] border border-[#262626] rounded-lg hover:text-[#fafafa] hover:border-[#404040] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg" data-icon="filter_list">filter_list</span>
                    Filter
                    {filterStatus !== 'all' && (
                      <span className="w-2 h-2 bg-blue-400 rounded-full" />
                    )}
                  </button>
                  {showFilterMenu && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-[#171717] border border-[#262626] rounded-lg shadow-xl z-10">
                      {(['all', 'connected', 'available', 'needs_setup', 'error'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setFilterStatus(status);
                            setShowFilterMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-[#262626] first:rounded-t-lg last:rounded-b-lg ${
                            filterStatus === status ? 'text-[#fafafa]' : 'text-[#a3a3a3]'
                          }`}
                        >
                          {status === 'all' ? 'All Status' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSortMenu(!showSortMenu);
                      setShowFilterMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#a3a3a3] bg-[#171717] border border-[#262626] rounded-lg hover:text-[#fafafa] hover:border-[#404040] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg" data-icon="sort">sort</span>
                    Sort
                  </button>
                  {showSortMenu && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-[#171717] border border-[#262626] rounded-lg shadow-xl z-10">
                      {(['name', 'status', 'lastSync'] as const).map((sort) => (
                        <button
                          key={sort}
                          onClick={() => {
                            setSortBy(sort);
                            setShowSortMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-[#262626] first:rounded-t-lg last:rounded-b-lg ${
                            sortBy === sort ? 'text-[#fafafa]' : 'text-[#a3a3a3]'
                          }`}
                        >
                          {sort === 'name' ? 'Name' : sort === 'status' ? 'Status' : 'Last Synced'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Content */}
            {error ? (
              <ErrorState message={error} onRetry={() => setError(null)} />
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ConnectorCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredConnectors.length === 0 ? (
              <EmptyState 
                type={searchQuery ? 'no_results' : 'no_connectors'} 
                searchQuery={searchQuery}
              />
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {filteredConnectors.map((connector) => (
                    <ConnectorCard
                      key={connector.id}
                      connector={connector}
                      onSelect={() => handleSelectConnector(connector)}
                      onConnect={() => handleConnect(connector)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </main>
      </div>
      
      {/* Detail Panel */}
      <AnimatePresence>
        {isDetailPanelOpen && selectedConnector && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                setIsDetailPanelOpen(false);
                setSelectedConnector(null);
              }}
            />
            <DetailPanel
              connector={selectedConnector}
              onClose={() => {
                setIsDetailPanelOpen(false);
                setSelectedConnector(null);
              }}
              onDisconnect={handleDisconnect}
              onTest={handleTestConnection}
              isTesting={isTesting}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}