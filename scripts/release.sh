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

# The build check below reads HEAD and the commit takes everything with git add -A,
# so a staged or untracked file would be released without being built.
# A separate assignment, so that a failing git status stops the script under set -e.
STATUS=$(git status --porcelain)
if [[ -n "$STATUS" ]]; then
  echo "ERROR: Working tree has uncommitted or untracked files. Commit or stash first."
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
  echo "1. Build examples/01-minimal from a copy of HEAD (yarn install && yarn export ./examples/01-minimal --preset everything)"
  echo "2. npm version patch (${CURRENT_VERSION} → next patch)"
  echo "3. Rename Upcoming → version in CHANGELOG"
  echo "4. yarn test"
  echo "5. git commit + push"
  echo "6. Generate release notes from CHANGELOG"
  echo "7. gh release create → triggers Docker image build"
  echo ""
  echo "Run without --dry-run to execute."
  exit 0
fi

# Step 3: Build a site from what the release will carry. The build runs in a copy of
# HEAD: in the working tree the export rewrites package.json, and git add -A below
# would commit that. It goes before the version bump, so a failed build leaves the
# repository as it was. It builds the minimal example only, on the local Node; the
# image is built in CI on its own Node and platforms.
echo "→ Building examples/01-minimal from HEAD..."
CHECK_DIR=$(mktemp -d)
if ! ( git archive HEAD | tar -x -C "$CHECK_DIR" && cd "$CHECK_DIR" && yarn install && yarn export ./examples/01-minimal --preset everything ) || [[ ! -d "$CHECK_DIR/out" ]]; then
  echo "ERROR: the example site does not build; its files are left in $CHECK_DIR"
  exit 1
fi
rm -rf "$CHECK_DIR"

# Step 4: Bump version
echo "→ Bumping version..."
npm version patch --no-git-tag-version

# Step 5: Rename Upcoming → version in changelog
echo "→ Updating changelog..."
node scripts/extract-changelog.mjs --update

# Step 6: Test
echo "→ Running tests..."
yarn test

# Step 7: Commit and push
echo "→ Committing..."
TAG="v$(node -e "console.log(require('./package.json').version)")"
git add -A
git commit -m "release: ${TAG}"
git push origin master

# Step 8: Generate release notes
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

# Step 9: Create GitHub Release (triggers builder.yml → Docker image)
echo "→ Creating GitHub Release..."
gh release create "${TAG}" \
  --title "${TAG}" \
  --notes-file "$NOTES_FILE" \
  --target master

rm -f "$NOTES_FILE"

echo ""
echo "Release ${TAG} created!"
echo "GitHub Actions will build Docker image automatically."
echo "Monitor: gh run list --repo podlite/podlite-web"
