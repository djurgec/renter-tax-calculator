#!/usr/bin/env bash
# PreToolUse hook (see .claude/settings.json): stop Claude from starting the local web
# servers that two design skills use. This project chose not to run them.
#
#   impeccable:  live, live-server, live-* helpers, serve-question (preview/decision pages)
#   taste-skill: scripts/inspect.mjs, scripts/scenes.mjs (serve a page for screenshots)
#
# Reads the tool call as JSON on stdin; exit 2 blocks it and shows the reason to Claude.
# Plain grep on the raw JSON, so it needs no jq or Python. It matches only when the
# command is run (by path, or as the first word of a command), not when text such as a
# grep pattern or commit message merely mentions it.
input=$(cat)

verbs='(live|live-[a-z-]+|serve-question)([^a-z-]|$)'
run_by_path='[/\\]+impeccable(\.cmd)?\\?"?[[:space:]]+'
run_bare='("command":"|&&|;|\||=[^[:space:]]*)[[:space:]]*impeccable(\.cmd)?[[:space:]]+'
run_node='(node|bun|deno)(\.exe)?[[:space:]]+[^[:space:]]*scripts[/\\]+(inspect|scenes)\.mjs'

if grep -qE "($run_by_path|$run_bare)$verbs" <<<"$input"; then
  cat >&2 <<'EOF'
Blocked by this project's settings: impeccable's live preview and decision-page servers
(live, live-*, serve-question) are not used in this repository. Continue without them:
review from the source files, present design options as text in the conversation, and
skip browser overlays. Do not try another way to start these servers.
EOF
  exit 2
fi

if grep -qE "$run_node" <<<"$input"; then
  cat >&2 <<'EOF'
Blocked by this project's settings: taste-skill's screenshot inspector (inspect.mjs,
scenes.mjs) starts a local web server and is not used in this repository. Skip the
screenshot and inspection steps; check the page against the skill's house rules by
reading the code instead, and tell the user that visual inspection was skipped.
Do not try another way to start a server.
EOF
  exit 2
fi

exit 0
