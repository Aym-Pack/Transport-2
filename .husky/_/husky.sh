#!/usr/bin/env sh
# husky

# Hook script
hook_name="$(basename "$0")"
git_params="$*"

# Husky path
husky_path="${HUSKY_GIT_PARAMS:-.husky}"

# debug
# echo "husky: \$hook_name" >&2
# echo "husky: \$git_params" >&2
# echo "husky: \$husky_path" >&2

# If HUSKY_SKIP_HOOKS is set to 1, skip hook
if [ "${HUSKY_SKIP_HOOKS:-0}" = "1" ]; then
  echo "husky: HUSKY_SKIP_HOOKS is set to 1, skipping hook" >&2
  exit 0
fi

# If hook script is not found, skip hook
if [ ! -f "$husky_path/$hook_name" ]; then
  echo "husky: $husky_path/$hook_name not found. Skipping hook or using Git default." >&2
  exit 0
fi

# Check if hook script is executable
if [ ! -x "$husky_path/$hook_name" ]; then
  echo "husky: $husky_path/$hook_name is not executable. Please run 'chmod +x $husky_path/$hook_name'." >&2
  exit 1 # Exit with error
fi

# Run hook script
sh -e "$husky_path/$hook_name" "$git_params"
exit_code="$?"

if [ "$exit_code" != "0" ]; then
  echo "husky: hook script failed (exit code $exit_code)" >&2
fi

# Husky post-hook tasks (if any)
# ...

exit "$exit_code"
