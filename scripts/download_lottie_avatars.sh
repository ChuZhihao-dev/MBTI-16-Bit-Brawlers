#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pairs=(
  "intj:architect"
  "intp:logician"
  "entj:commander"
  "entp:debater"
  "infj:advocate"
  "infp:mediator"
  "enfj:protagonist"
  "enfp:campaigner"
  "istj:logistician"
  "isfj:defender"
  "estj:executive"
  "esfj:consul"
  "istp:virtuoso"
  "isfp:adventurer"
  "estp:entrepreneur"
  "esfp:entertainer"
)

for pair in "${pairs[@]}"; do
  id="${pair%%:*}"
  role="${pair##*:}"
  url="https://www.16personalities.com/static/animations/avatars/defaults/${role}.json"
  out="assets/fighters/${id}/concept/avatar.json"
  mkdir -p "$(dirname "$out")"
  echo "Downloading ${id} (${role}) -> ${out}"
  curl -fsSL "$url" -o "$out"
done

echo "Done! All 16 official Lottie JSON avatars downloaded."
