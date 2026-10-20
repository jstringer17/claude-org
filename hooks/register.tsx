import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { OrgAgent } from '../types'
import { OPERATING_RULES, ROLES } from './roles'

const PANE = 'org-board'
const TASKS_FILE = 'org/TASKS.md'
const CHIEF = 'chief of staff'
const agents = atom({ plugin: 'org', key: 'agents' } as const, [])
const messages = atom({ plugin: 'org', key: 'messages' } as const, [])

// Built-in agent types carry no model of their own: the cheapest that does the job, Opus only for planning.
const BUILT_IN_MODEL: Record<string, string> = {
  'general-purpose': 'sonnet',
  claude: 'sonnet',
  Plan: 'opus',
  Explore: 'haiku',
  'claude-code-guide': 'haiku',
  'statusline-setup': 'haiku',
}

const roleOf = (team: OrgAgent[], id?: string) =>
  id === undefined ? CHIEF : (team.find(one => one.id === id)?.role ?? 'an agent')

// Counts the status column of org/TASKS.md; undefined when there is no task board yet.
const countTasks = async ($: EngineInterface) => {
  const text = await $.fs.read(TASKS_FILE).catch(() => undefined)
  if (text === undefined) return undefined
  const rows = text
    .split('\n')
    .filter(line => line.trim().startsWith('|') && !/^\|\s*:?-/.test(line.trim()))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim().toLowerCase()))
  const column = rows[0]?.indexOf('status') ?? -1
  if (column < 0) return undefined
  const statuses = rows.slice(1).map(row => row[column] ?? '')

  return {
    waiting: statuses.filter(s => s.includes('waiting')).length,
    done: statuses.filter(s => s === 'done').length,
    open: statuses.filter(s => s !== 'done' && !s.includes('waiting')).length,
  }
}

const showStatus = async ($: EngineInterface) => {
  const working = (await read($, agents)).filter(one => one.status === 'working').length
  $.ui.status(working === 0 ? undefined : `org: ${working} working`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'org', description: 'Show the org board: tasks, team and messages' })
    const started = await next(e)
    for (const role of ROLES) await $.agent.register(role)

    return started
  })

  on('command.run', { command: 'org' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Org board' })

    return { text: 'Org board opened.' }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, { id: 'org:operating-rules', text: OPERATING_RULES, scope: 'session' }] }
  })

  on('agent.spawn', async ($, e, next) => {
    if (e.fork || e.resume || e.workflow) return next(e)
    // Fable is off for now: a request for it runs on Opus instead.
    const asked = e.model !== undefined && /fable/i.test(e.model) ? 'opus' : e.model
    const model = asked ?? BUILT_IN_MODEL[e.subagentType]
    const started = await next(model === undefined ? e : { ...e, model })
    if (started.agentId !== undefined) {
      const role = e.name ?? e.subagentType.replace(/^org:/, '')
      const row: OrgAgent = { id: started.agentId, role, model: started.model, task: e.description, status: 'working' }
      await update($, agents, list => [...list, row].slice(-50))
      await showStatus($)
    }

    return started
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      await update($, agents, list =>
        list.map(one => (one.id === e.agentId ? { ...one, status: 'done' } : one)),
      )
      await showStatus($)
    }

    return next(e)
  })

  on('session.send', async ($, e, next) => {
    const from = roleOf(await read($, agents), e.agentId)
    await update($, messages, list => [...list, { from, to: e.to, text: e.text }].slice(-100))

    return next(e)
  })

  on('session.receive', async ($, e, next) => {
    const kind = e.origin.kind
    if (kind === 'peer' || kind === 'coordinator' || kind === 'peer-send-message') {
      const to = roleOf(await read($, agents), e.agentId)
      await update($, messages, list => [...list, { from: 'another session', to, text: e.text }].slice(-100))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const team = await read($, agents)
    const feed = await read($, messages)
    const tasks = await countTasks($)
    const clip = (text: string) => (text.length > 80 ? `${text.slice(0, 79)}…` : text).replace(/\s+/g, ' ')

    return (
      <Box flexDirection="column">
        <Text bold>Tasks</Text>
        {tasks === undefined ? (
          <Text dimColor>No {TASKS_FILE} yet.</Text>
        ) : (
          <Text>
            {tasks.open} open · {tasks.waiting} waiting on you · {tasks.done} done
          </Text>
        )}
        <Text bold>Team</Text>
        {team.length === 0 && <Text dimColor>Nobody has been assigned work yet.</Text>}
        {team.slice(-8).map(one => (
          <Text dimColor={one.status === 'done'}>
            {one.status === 'working' ? '●' : '○'} {one.role} ({one.model}): {one.task}
          </Text>
        ))}
        <Text bold>Messages</Text>
        {feed.length === 0 && <Text dimColor>No messages yet.</Text>}
        {feed.slice(-6).map(one => (
          <Text>
            {one.from} → {one.to}: {clip(one.text)}
          </Text>
        ))}
      </Box>
    )
  })
}
