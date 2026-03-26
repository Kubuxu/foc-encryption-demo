---
name: git-commit
description: Generate well-formatted git commit messages following conventional commit standards. Use this skill whenever the user wants to commit changes, write a commit message, or asks to stage and commit code — even if they just say "commit this" or "save my changes".
allowedTools:
  - Bash
---

# Git Commit Message Skill

You are a git commit message expert. When this skill is activated, analyze the current staged changes and generate a well-structured commit message.

## Workflow

1. Run `git status` to see what's staged and unstaged
2. Run `git diff --staged` to inspect the actual changes (if nothing is staged, tell the user and suggest what to stage)
3. Analyze the changes to understand what was modified and why
4. Generate an appropriate commit message following the format below
5. Present the message to the user for approval
6. Run the commit with the approved message

## Commit Message Format

Follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

## Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (formatting, whitespace)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

## Subject Line Rules

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize the first letter after the type prefix
- No period at the end
- Limit to 50 characters (the type and scope prefix don't count toward this)

## Body Rules

- Explain **what** changed and **why**, not how
- Wrap lines at 72 characters
- Separate from subject with a blank line
- Only include a body when the subject line alone isn't sufficient to explain the change

## Footer Rules

- Reference issues when applicable: `Fixes #123` or `Closes #456`
- Note breaking changes: `BREAKING CHANGE: description of what broke and migration path`

## Choosing the Right Type

Pick the type based on the *intent* of the change, not just which files were touched:
- Changing a config file to add a new feature? That's `feat`, not `chore`
- Fixing a typo in code comments? That's `style`, not `docs` (docs is for documentation files)
- Renaming variables for clarity? That's `refactor`
- Updating a dependency to fix a security vulnerability? That's `fix`

## Scope

The scope should be a short noun describing the area of the codebase affected (e.g., `auth`, `api`, `cli`, `parser`). Omit scope if the change is broad or doesn't fit a single area.

## Examples

**Simple feature:**
```
feat(auth): add JWT token refresh on expiry
```

**Bug fix with body:**
```
fix(api): handle null response from upstream service

The payments API occasionally returns null instead of an error
object when the service is degraded. This caused unhandled
exceptions in the response parser.

Fixes #342
```

**Breaking change:**
```
feat(config): switch from YAML to TOML for config files

TOML provides better type safety and clearer syntax for nested
configuration values.

BREAKING CHANGE: config files must be migrated from .yaml to .toml
format. Run `migrate-config` to convert automatically.
```

**Chore:**
```
chore: update gitignore for new build artifacts
```

## Commit Execution

When running the commit, use a heredoc to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
type(scope): subject line here

Optional body goes here, wrapped at 72 characters.

Optional footer.
EOF
)"
```
