export type OrgAgent = {
  id: string
  role: string
  model: string
  task: string
  status: 'working' | 'done'
}

export type OrgMessage = { from: string; to: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    org: { agents: OrgAgent[]; messages: OrgMessage[] }
  }
}
