#!/usr/bin/env bash
# Scan every Claude skill in .claude/skills/ with NVIDIA SkillSpector (static, no LLM).
#
#   scripts/scan-skills.sh                 scan; fail on any finding not in a baseline
#   scripts/scan-skills.sh --accept NAME   after reviewing NAME's findings, record them
#                                          as accepted in .skillspector/NAME.yaml
#
# Each skill may have a baseline in .skillspector/<skill>.yaml listing findings a person
# has reviewed and accepted. A skill without one must scan clean. Baselines are tied to
# the exact source, so updating a skill brings its findings back for another review.
# Needs the CLI, same version as CI (.github/workflows/skills.yml):
#   uv tool install "git+https://github.com/NVIDIA/skillspector.git@v2.13.2"
set -euo pipefail

cd "$(dirname "$0")/.."
SKILLS=.claude/skills
BASELINES=.skillspector
REPORTS=${SKILLSPECTOR_REPORTS:-skillspector-reports}

if [[ ${1:-} == --accept ]]; then
  name=${2:?usage: scripts/scan-skills.sh --accept SKILL_NAME}
  mkdir -p "$BASELINES"
  skillspector baseline "$SKILLS/$name" --no-llm -o "$BASELINES/$name.yaml" \
    --reason "${REASON:-Reviewed by hand: no malicious or unexplained behaviour}"
  echo "Wrote $BASELINES/$name.yaml. Commit it with a note on what you reviewed."
  exit 0
fi

mkdir -p "$REPORTS"
failed=()
for dir in "$SKILLS"/*/; do
  name=$(basename "$dir")
  args=(scan "$dir" --no-llm --fail-on-findings --format markdown -o "$REPORTS/$name.md")
  [[ -f $BASELINES/$name.yaml ]] && args+=(--baseline "$BASELINES/$name.yaml")
  echo "Scanning $name ..."
  if skillspector "${args[@]}"; then
    echo "  $name: no new findings"
  else
    failed+=("$name")
    echo "  $name: NEW FINDINGS, report: $REPORTS/$name.md"
    # on GitHub Actions, show the report on the run's summary page
    [[ -n ${GITHUB_STEP_SUMMARY:-} ]] && cat "$REPORTS/$name.md" >> "$GITHUB_STEP_SUMMARY"
  fi
done

if ((${#failed[@]})); then
  echo "New SkillSpector findings in: ${failed[*]}" >&2
  echo "Review them; if they are fine, run: scripts/scan-skills.sh --accept <skill>" >&2
  exit 1
fi
echo "All skills passed."
