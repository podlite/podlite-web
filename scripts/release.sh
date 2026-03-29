#!/bin/bash
set -euo pipefail

# podlite-web release script
# Usage: yarn release [--dry-run]
#
# SYNC: forked from podlite/scripts/release.sh — simplified for single package
# (no workspaces, no aggregate, no switchLink)

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "=== DRY RUN MODE ==="
fi

# Step 1: Check prerequisites
echo "→ Checking prerequisites..."

if ! git diff --quiet; then
  echo "ERROR: Working tree has uncommitted changes. Commit or stash first."
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "ERROR: gh CLI not found. Install: brew install gh"
  exit 1
fi

# Step 2: Check changelog has Upcoming content
echo "→ Checking changelog..."
node scripts/extract-changelog.mjs --update --dry-run 2>/dev/null
HAS_UPDATES=$(node scripts/extract-changelog.mjs --update --dry-run 2>&1 | grep -c "Would update" || true)
if [[ "$HAS_UPDATES" == "0" ]]; then
  echo "ERROR: No Upcoming changelog entries. Write changelog first."
  exit 1
fi

if [[ -n "$DRY_RUN" ]]; then
  CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
  echo ""
  echo "=== DRY RUN: would do the following ==="
  echo "1. npm version patch (${CURRENT_VERSION} → next patch)"
  echo "2. Rename Upcoming → version in CHANGELOG"
  echo "3. yarn build && yarn test"
  echo "4. git commit + push"
  echo "5. gh release create → triggers Docker image build"
  echo ""
  echo "Run without --dry-run to execute."
  exit 0
fi

# Step 3: Bump version
echo "→ Bumping version..."
npm version patch --no-git-tag-version

# Step 4: Rename Upcoming → version in changelog
echo "→ Updating changelog..."
node scripts/extract-changelog.mjs --update

# Step 5: Build and test
# echo "→ Building..."
# yarn build

echo "→ Running tests..."
yarn test

# Step 6: Commit and push
echo "→ Committing..."
TAG="v$(node -e "console.log(require('./package.json').version)")"
git add -A
git commit -m "release: ${TAG}"
git push origin main

# Step 7: Generate release notes
echo "→ Generating release notes..."
PREV_TAG=$(gh release list --repo podlite/podlite-web --limit 1 --json tagName --jq '.[0].tagName' 2>/dev/null || echo "")
CHANGELOG=$(node scripts/extract-changelog.mjs --summary)
COMPARE=""
if [[ -n "$PREV_TAG" ]]; then
  COMPARE="**Full Changelog**: https://github.com/podlite/podlite-web/compare/${PREV_TAG}...${TAG}"
fi

NOTES_FILE=$(mktemp)
cat scripts/release-header.md > "$NOTES_FILE"
echo "" >> "$NOTES_FILE"
echo "## What's Changed" >> "$NOTES_FILE"
echo "" >> "$NOTES_FILE"
echo "$CHANGELOG" >> "$NOTES_FILE"
echo "" >> "$NOTES_FILE"
if [[ -n "$COMPARE" ]]; then
  echo "$COMPARE" >> "$NOTES_FILE"
fi

# Step 8: Create GitHub Release (triggers builder.yml → Docker image)
echo "→ Creating GitHub Release..."
gh release create "${TAG}" \
  --title "${TAG}" \
  --notes-file "$NOTES_FILE" \
  --target main

rm -f "$NOTES_FILE"

echo ""
echo "Release ${TAG} created!"
echo "GitHub Actions will build Docker image automatically."
echo "Monitor: gh run list --repo podlite/podlite-web"
