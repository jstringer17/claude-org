# org

Runs every Claude Code session like an organization. The main session is the chief of staff: it talks with you, plans, delegates and keeps the record. A small core team does the work, each role on the cheapest model that can do it:

| Role | Model | Use |
| --- | --- | --- |
| org:builder | Opus | hard builds and changes |
| org:qa-reviewer | Opus | independent check before anything is marked done |
| org:researcher | Sonnet | primary-source research |
| org:analyst | Sonnet | judging results against rules set in advance |
| org:runner | Haiku | small jobs |

Built-in agent types that carry no model are routed too: general-purpose to Sonnet, Plan to Opus, Explore to Haiku.

The shared record lives in `org/` in each project (BRIEF, TASKS, DECISIONS, SCORECARD, HANDOFF, playbooks/), so any new session picks up where the last one stopped. Projects add their own department leads as agent files in `.claude/agents/`.

Type `/org` to open the board: task counts from `org/TASKS.md`, who is working on what, and the messages agents send each other.

Nothing that spends money, publishes, changes anything live or deletes happens without your approval.

## Install

Once, at the prompt of a Claude Code terminal session (answer `y` to add the marketplace, then pick the user scope so it works in every project):

```
/plugin install org --marketplace jstringer17/claude-org
```

From a shell:

```
claude plugin install org --marketplace jstringer17/claude-org
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `jstringer17/claude-org`, then Add plugin.

The repository is private, so installing needs GitHub access to it on that computer.
