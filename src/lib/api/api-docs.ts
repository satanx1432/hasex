export interface APIEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  summary: string
  description: string
  parameters?: APIParameter[]
  requestBody?: APIRequestBody
  responses: APIResponse[]
  tags: string[]
  security?: string[]
}

export interface APIParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  description: string
  required: boolean
  schema: APISchema
  example?: any
}

export interface APIRequestBody {
  description: string
  required: boolean
  content: Record<string, APIMediaType>
}

export interface APIMediaType {
  schema: APISchema
  example?: any
}

export interface APISchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  $ref?: string
  format?: string
  description?: string
  properties?: Record<string, APISchema>
  items?: APISchema
  required?: string[]
  enum?: any[]
  default?: any
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

export interface APIResponse {
  code: string
  description: string
  content?: Record<string, APIMediaType>
}

export interface APIDocumentation {
  openapi: string
  info: {
    title: string
    version: string
    description: string
    contact?: {
      name: string
      email: string
    }
  }
  servers: Array<{
    url: string
    description: string
  }>
  tags: Array<{
    name: string
    description: string
  }>
  paths: Record<string, Record<string, APIEndpoint>>
  components: {
    schemas: Record<string, APISchema>
    securitySchemes: Record<string, any>
  }
}

export class APIDocumentationSystem {
  private docs: APIDocumentation

  constructor() {
    this.docs = this.generateDocumentation()
  }

  getDocumentation(): APIDocumentation {
    return this.docs
  }

  private generateDocumentation(): APIDocumentation {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Behavioral OS API',
        version: '1.0.0',
        description: 'API for the Behavioral Operating System - a goal achievement and habit formation platform',
        contact: {
          name: 'Behavioral OS Team',
          email: 'api@behavioral-os.com',
        },
      },
      servers: [
        {
          url: 'https://api.behavioral-os.com/v1',
          description: 'Production server',
        },
        {
          url: 'https://staging-api.behavioral-os.com/v1',
          description: 'Staging server',
        },
        {
          url: 'http://localhost:3000/api/v1',
          description: 'Local development',
        },
      ],
      tags: [
        {
          name: 'Goals',
          description: 'Goal management endpoints',
        },
        {
          name: 'Tasks',
          description: 'Task and micro-action endpoints',
        },
        {
          name: 'User',
          description: 'User profile and preferences',
        },
        {
          name: 'Analytics',
          description: 'Analytics and reporting endpoints',
        },
        {
          name: 'Gamification',
          description: 'Achievements and progress endpoints',
        },
        {
          name: 'Cognitive',
          description: 'Cognitive load assessment endpoints',
        },
        {
          name: 'Notifications',
          description: 'Notification management endpoints',
        },
        {
          name: 'Webhooks',
          description: 'Webhook configuration and management',
        },
      ],
      paths: {
        '/goals': {
          get: {
            path: '/goals',
            method: 'GET',
            summary: 'List all goals',
            description: 'Retrieve a paginated list of goals for the authenticated user',
            parameters: [
              {
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: { type: 'integer', default: 1 },
              },
              {
                name: 'limit',
                in: 'query',
                description: 'Number of items per page',
                required: false,
                schema: { type: 'integer', default: 20 },
              },
              {
                name: 'status',
                in: 'query',
                description: 'Filter by goal status',
                required: false,
                schema: { type: 'string', enum: ['active', 'completed', 'paused'] },
              },
            ],
            responses: [
              {
                code: '200',
                description: 'Goals retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Goal' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer' },
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            totalPages: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              {
                code: '401',
                description: 'Unauthorized - invalid or missing authentication',
              },
            ],
            tags: ['Goals'],
          },
          post: {
            path: '/goals',
            method: 'POST',
            summary: 'Create a new goal',
            description: 'Create a new goal for the authenticated user',
            requestBody: {
              description: 'Goal object to create',
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GoalCreate' },
                  example: {
                    title: 'Learn TypeScript',
                    description: 'Master TypeScript fundamentals and advanced types',
                    target_completion_date: '2024-12-31',
                  },
                },
              },
            },
            responses: [
              {
                code: '201',
                description: 'Goal created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Goal' },
                  },
                },
              },
              {
                code: '400',
                description: 'Invalid request body',
              },
              {
                code: '401',
                description: 'Unauthorized',
              },
            ],
            tags: ['Goals'],
          },
        },
        '/goals/{goalId}': {
          get: {
            path: '/goals/{goalId}',
            method: 'GET',
            summary: 'Get a specific goal',
            description: 'Retrieve details of a specific goal by ID',
            parameters: [
              {
                name: 'goalId',
                in: 'path',
                description: 'ID of the goal to retrieve',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: [
              {
                code: '200',
                description: 'Goal retrieved successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Goal' },
                  },
                },
              },
              {
                code: '404',
                description: 'Goal not found',
              },
            ],
            tags: ['Goals'],
          },
          put: {
            path: '/goals/{goalId}',
            method: 'PUT',
            summary: 'Update a goal',
            description: 'Update an existing goal',
            parameters: [
              {
                name: 'goalId',
                in: 'path',
                description: 'ID of the goal to update',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              description: 'Updated goal object',
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GoalUpdate' },
                },
              },
            },
            responses: [
              {
                code: '200',
                description: 'Goal updated successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Goal' },
                  },
                },
              },
              {
                code: '404',
                description: 'Goal not found',
              },
            ],
            tags: ['Goals'],
          },
          delete: {
            path: '/goals/{goalId}',
            method: 'DELETE',
            summary: 'Delete a goal',
            description: 'Delete a goal by ID',
            parameters: [
              {
                name: 'goalId',
                in: 'path',
                description: 'ID of the goal to delete',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: [
              {
                code: '204',
                description: 'Goal deleted successfully',
              },
              {
                code: '404',
                description: 'Goal not found',
              },
            ],
            tags: ['Goals'],
          },
        },
        '/tasks': {
          get: {
            path: '/tasks',
            method: 'GET',
            summary: 'List tasks',
            description: 'Retrieve a paginated list of tasks',
            parameters: [
              {
                name: 'goal_id',
                in: 'query',
                description: 'Filter tasks by goal ID',
                required: false,
                schema: { type: 'string' },
              },
              {
                name: 'status',
                in: 'query',
                description: 'Filter by task status',
                required: false,
                schema: { type: 'string', enum: ['pending', 'selected', 'completed', 'skipped'] },
              },
            ],
            responses: [
              {
                code: '200',
                description: 'Tasks retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Task' },
                        },
                      },
                    },
                  },
                },
              },
            ],
            tags: ['Tasks'],
          },
          post: {
            path: '/tasks',
            method: 'POST',
            summary: 'Create a task',
            description: 'Create a new task',
            requestBody: {
              description: 'Task object to create',
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TaskCreate' },
                },
              },
            },
            responses: [
              {
                code: '201',
                description: 'Task created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Task' },
                  },
                },
              },
            ],
            tags: ['Tasks'],
          },
        },
        '/tasks/{taskId}/complete': {
          post: {
            path: '/tasks/{taskId}/complete',
            method: 'POST',
            summary: 'Complete a task',
            description: 'Mark a task as completed',
            parameters: [
              {
                name: 'taskId',
                in: 'path',
                description: 'ID of the task to complete',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              description: 'Completion data',
              required: false,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      confidence_score: { type: 'number', minimum: 0, maximum: 1 },
                      effort_rating: { type: 'integer', minimum: 1, maximum: 5 },
                      emotional_state: { type: 'string' },
                      barriers: { type: 'string' },
                      facilitators: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: [
              {
                code: '200',
                description: 'Task completed successfully',
              },
              {
                code: '404',
                description: 'Task not found',
              },
            ],
            tags: ['Tasks'],
          },
        },
        '/analytics/dashboard': {
          get: {
            path: '/analytics/dashboard',
            method: 'GET',
            summary: 'Get analytics dashboard',
            description: 'Retrieve comprehensive analytics data for the user',
            parameters: [
              {
                name: 'period',
                in: 'query',
                description: 'Time period for analytics',
                required: false,
                schema: { type: 'string', enum: ['week', 'month', 'quarter', 'year'], default: 'month' },
              },
            ],
            responses: [
              {
                code: '200',
                description: 'Analytics data retrieved successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/AnalyticsDashboard' },
                  },
                },
              },
            ],
            tags: ['Analytics'],
          },
        },
        '/gamification/achievements': {
          get: {
            path: '/gamification/achievements',
            method: 'GET',
            summary: 'List achievements',
            description: 'Retrieve available and unlocked achievements',
            responses: [
              {
                code: '200',
                description: 'Achievements retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        achievements: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Achievement' },
                        },
                      },
                    },
                  },
                },
              },
            ],
            tags: ['Gamification'],
          },
        },
        '/cognitive/assess': {
          post: {
            path: '/cognitive/assess',
            method: 'POST',
            summary: 'Initiate cognitive assessment',
            description: 'Start a cognitive load assessment',
            requestBody: {
              description: 'Assessment trigger',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      trigger_reason: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: [
              {
                code: '200',
                description: 'Assessment initiated successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        assessment_id: { type: 'string' },
                        questions: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Question' },
                        },
                      },
                    },
                  },
                },
              },
            ],
            tags: ['Cognitive'],
          },
        },
        '/notifications': {
          get: {
            path: '/notifications',
            method: 'GET',
            summary: 'List notifications',
            description: 'Retrieve user notifications',
            parameters: [
              {
                name: 'unread_only',
                in: 'query',
                description: 'Filter to only unread notifications',
                required: false,
                schema: { type: 'boolean' },
              },
            ],
            responses: [
              {
                code: '200',
                description: 'Notifications retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        notifications: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Notification' },
                        },
                      },
                    },
                  },
                },
              },
            ],
            tags: ['Notifications'],
          },
        },
        '/webhooks': {
          get: {
            path: '/webhooks',
            method: 'GET',
            summary: 'List webhooks',
            description: 'Retrieve user webhooks',
            responses: [
              {
                code: '200',
                description: 'Webhooks retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        webhooks: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Webhook' },
                        },
                      },
                    },
                  },
                },
              },
            ],
            tags: ['Webhooks'],
          },
          post: {
            path: '/webhooks',
            method: 'POST',
            summary: 'Create webhook',
            description: 'Create a new webhook',
            requestBody: {
              description: 'Webhook configuration',
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/WebhookCreate' },
                },
              },
            },
            responses: [
              {
                code: '201',
                description: 'Webhook created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Webhook' },
                  },
                },
              },
            ],
            tags: ['Webhooks'],
          },
        },
      },
      components: {
        schemas: {
          Goal: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: ['active', 'completed', 'paused'] },
              progress: { type: 'number' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              target_completion_date: { type: 'string', format: 'date' },
            },
            required: ['id', 'user_id', 'title', 'status'],
          },
          GoalCreate: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              target_completion_date: { type: 'string', format: 'date' },
            },
            required: ['title'],
          },
          GoalUpdate: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: ['active', 'completed', 'paused'] },
              target_completion_date: { type: 'string', format: 'date' },
            },
          },
          Task: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              goal_id: { type: 'string' },
              user_id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              if_then_plan: { type: 'string' },
              difficulty_score: { type: 'number' },
              estimated_time_minutes: { type: 'number' },
              status: { type: 'string', enum: ['pending', 'selected', 'completed', 'skipped'] },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          TaskCreate: {
            type: 'object',
            properties: {
              goal_id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              if_then_plan: { type: 'string' },
              difficulty_score: { type: 'number' },
              estimated_time_minutes: { type: 'number' },
            },
            required: ['goal_id', 'title'],
          },
          Achievement: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string' },
              category: { type: 'string' },
              rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'] },
              points: { type: 'number' },
              unlocked_at: { type: 'string', format: 'date-time' },
              progress: { type: 'number' },
              max_progress: { type: 'number' },
            },
          },
          Notification: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              type: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              created_at: { type: 'string', format: 'date-time' },
              read: { type: 'boolean' },
            },
          },
          Webhook: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              name: { type: 'string' },
              url: { type: 'string' },
              events: { type: 'array', items: { type: 'string' } },
              active: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              success_rate: { type: 'number' },
            },
          },
          WebhookCreate: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
              events: { type: 'array', items: { type: 'string' } },
              secret: { type: 'string' },
            },
            required: ['name', 'url', 'events'],
          },
          Question: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question_text: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
            },
          },
          AnalyticsDashboard: {
            type: 'object',
            properties: {
              overview_metrics: { type: 'array' },
              completion_trends: { type: 'array' },
              productivity_patterns: { type: 'object' },
              goal_performance: { type: 'object' },
              task_analytics: { type: 'object' },
            },
          },
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    }
  }

  getOpenAPISpec(): string {
    return JSON.stringify(this.docs, null, 2)
  }

  getEndpointsByTag(tag: string): APIEndpoint[] {
    const endpoints: APIEndpoint[] = []
    for (const path in this.docs.paths) {
      for (const method in this.docs.paths[path]) {
        const endpoint = this.docs.paths[path][method]
        if (endpoint.tags.includes(tag)) {
          endpoints.push(endpoint)
        }
      }
    }
    return endpoints
  }

  getEndpoint(path: string, method: string): APIEndpoint | null {
    return this.docs.paths[path]?.[method] || null
  }

  searchEndpoints(query: string): APIEndpoint[] {
    const results: APIEndpoint[] = []
    const lowerQuery = query.toLowerCase()

    for (const path in this.docs.paths) {
      for (const method in this.docs.paths[path]) {
        const endpoint = this.docs.paths[path][method]
        if (
          endpoint.summary.toLowerCase().includes(lowerQuery) ||
          endpoint.description.toLowerCase().includes(lowerQuery) ||
          path.toLowerCase().includes(lowerQuery)
        ) {
          results.push(endpoint)
        }
      }
    }

    return results
  }
}
