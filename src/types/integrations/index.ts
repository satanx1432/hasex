// Integration types for the Integrations page

export type ConnectorStatus = 'connected' | 'available' | 'needs_setup' | 'error';

export type ConnectorCategory = 
  | 'ai_models'
  | 'mcp_servers'
  | 'databases'
  | 'cloud'
  | 'storage'
  | 'communication'
  | 'productivity'
  | 'finance'
  | 'search'
  | 'developer_tools'
  | 'custom';

export interface Connector {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: ConnectorCategory;
  status: ConnectorStatus;
  lastSync?: Date;
  version?: string;
  tags: string[];
  authType: 'api_key' | 'oauth' | 'basic' | 'bearer' | 'custom';
  configFields?: ConfigField[];
  actions?: string[];
  tools?: string[];
  resources?: string[];
  rateLimits?: RateLimit;
  webhookUrl?: string;
  errorMessage?: string;
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'toggle';
  required: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

export interface RateLimit {
  requests: number;
  period: 'second' | 'minute' | 'hour' | 'day';
}

export interface ConnectorLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface IntegrationState {
  connectors: Connector[];
  selectedConnector: Connector | null;
  isDetailPanelOpen: boolean;
  searchQuery: string;
  selectedCategory: ConnectorCategory | 'all';
  sortBy: 'name' | 'status' | 'lastSync';
  filterStatus: ConnectorStatus | 'all';
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
}

export interface CategoryInfo {
  id: ConnectorCategory | 'all';
  label: string;
  icon: string;
  count?: number;
}