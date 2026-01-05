.PHONY: release check-version update-versions help

# Capture version argument if provided (e.g., make release 0.4.1)
VERSION ?= $(word 2,$(MAKECMDGOALS))

# Prevent make from interpreting version number as a target
%:
	@:

# Default target
help:
	@echo "Bouldy Release Automation"
	@echo ""
	@echo "Usage:"
	@echo "  make release 0.4.1        Create and push a new release"
	@echo "  make check-version        Show current versions in all files"
	@echo ""
	@echo "The release target will:"
	@echo "  1. Check that working directory is clean"
	@echo "  2. Update version in package.json, Cargo.toml, and tauri.conf.json"
	@echo "  3. Commit the version bump"
	@echo "  4. Create a git tag (v{VERSION})"
	@echo "  5. Push the commit and tag to origin"

# Check current versions
check-version:
	@echo "Current versions:"
	@echo -n "  package.json:      "
	@grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/'
	@echo -n "  Cargo.toml:        "
	@grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/'
	@echo -n "  tauri.conf.json:   "
	@grep '"version"' src-tauri/tauri.conf.json | sed 's/.*"version": "\(.*\)".*/\1/'

# Main release target
release:
ifndef VERSION
	$(error VERSION is required. Usage: make release 0.4.1)
endif
ifeq ($(VERSION),release)
	$(error VERSION is required. Usage: make release 0.4.1)
endif
	@echo "→ Preparing release v$(VERSION)"
	@echo ""

	@echo "→ Checking git status..."
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "Error: Working directory is not clean. Commit or stash changes first."; \
		exit 1; \
	fi
	@echo "  ✓ Working directory is clean"
	@echo ""

	@echo "→ Current versions:"
	@make check-version
	@echo ""

	@echo "→ Updating versions to $(VERSION)..."
	@# Update package.json
	@sed -i 's/"version": "[^"]*"/"version": "$(VERSION)"/' package.json
	@echo "  ✓ Updated package.json"

	@# Update Cargo.toml
	@sed -i '0,/^version = ".*"/{s/^version = ".*"/version = "$(VERSION)"/}' src-tauri/Cargo.toml
	@echo "  ✓ Updated Cargo.toml"

	@# Update tauri.conf.json
	@sed -i 's/"version": "[^"]*"/"version": "$(VERSION)"/' src-tauri/tauri.conf.json
	@echo "  ✓ Updated tauri.conf.json"
	@echo ""

	@echo "→ New versions:"
	@make check-version
	@echo ""

	@echo "→ Committing version bump..."
	@git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
	@git commit -m "chore: bump version to $(VERSION)"
	@echo "  ✓ Created commit"
	@echo ""

	@echo "→ Creating tag v$(VERSION)..."
	@git tag -a "v$(VERSION)" -m "Release v$(VERSION)"
	@echo "  ✓ Created tag"
	@echo ""

	@echo "→ Pushing to origin..."
	@git push origin main
	@git push origin "v$(VERSION)"
	@echo "  ✓ Pushed commit and tag"
	@echo ""

	@echo "✓ Release v$(VERSION) complete!"
	@echo "  Watch the build: https://github.com/LudeeD/bouldy/actions"
