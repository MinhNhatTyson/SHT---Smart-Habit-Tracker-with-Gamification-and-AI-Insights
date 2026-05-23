// src/renderer/lib/themeEngine.ts
// Applies theme CSS variable overrides to :root.
// Called on app load (from stored user.activeTheme) and when user switches theme.

export type ThemeKey = 'default' | 'theme_dark' | 'theme_book' | 'theme_nostalgia'

// Store the original :root values so we can restore them on theme reset
const originalVars: Record<string, string> = {}
let originalsCaptured = false

function captureOriginals(vars: string[]) {
  if (originalsCaptured) return
  const root = document.documentElement
  const computed = getComputedStyle(root)
  for (const v of vars) {
    originalVars[v] = computed.getPropertyValue(v).trim()
  }
  originalsCaptured = true
}

/**
 * Apply a theme by overriding CSS variables on :root.
 * Pass an empty vars object or 'default' to restore the original theme.
 */
export function applyTheme(themeKey: string, vars: Record<string, string> = {}): void {
  const root = document.documentElement

  const allVarKeys = Object.keys(vars)

  // Capture originals once (before first override)
  if (allVarKeys.length > 0) {
    captureOriginals(allVarKeys)
  }

  if (themeKey === 'default' || allVarKeys.length === 0) {
    // Restore all overridden vars to their original values
    for (const [key, val] of Object.entries(originalVars)) {
      root.style.setProperty(key, val)
    }
    root.setAttribute('data-theme', 'default')
    return
  }

  // Apply each CSS variable override
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val)
  }

  root.setAttribute('data-theme', themeKey)
}

/**
 * Apply theme from a StoreItem payload JSON string.
 * Called during store purchase and on app load.
 */
export function applyThemeFromPayload(themeKey: string, payloadJson: string): void {
  try {
    const payload = JSON.parse(payloadJson) as { vars?: Record<string, string> }
    applyTheme(themeKey, payload.vars ?? {})
  } catch {
    applyTheme('default', {})
  }
}

/**
 * Restore to the default HabitQuest cream canvas theme.
 */
export function resetTheme(): void {
  applyTheme('default', {})
}