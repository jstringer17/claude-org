import { expect, test } from 'claude-code/testing'

const SPAWN = {
  tool_use_id: 'toolu_1',
  prompt: 'do it',
  description: 'a job',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'sonnet',
  background: false,
  fork: false,
} as const

test('built-in agents without a model go to the cheapest that fits', async ($, on) => {
  // Stands for the engine: it starts the agent on whatever model the plugin passed down.
  on('agent.spawn', (_, e) => ({ model: e.model ?? 'inherit', agentId: `a-${e.subagentType}` }))

  expect((await $.agent.spawn({ ...SPAWN, subagentType: 'general-purpose' })).model).toBe('sonnet')
  expect((await $.agent.spawn({ ...SPAWN, subagentType: 'Explore' })).model).toBe('haiku')
  expect((await $.agent.spawn({ ...SPAWN, subagentType: 'Plan' })).model).toBe('opus')
})

test('a model the caller chose, or an agent with its own, is left alone', async ($, on) => {
  on('agent.spawn', (_, e) => ({ model: e.model ?? 'own', agentId: 'a-1' }))

  expect((await $.agent.spawn({ ...SPAWN, subagentType: 'general-purpose', model: 'opus' })).model).toBe('opus')
  expect((await $.agent.spawn({ ...SPAWN, subagentType: 'org:builder' })).model).toBe('own')
})
