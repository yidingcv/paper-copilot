'use client'

import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: '0.4em 0.8em',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: 'var(--bg-white)',
        color: 'var(--text)',
        cursor: 'pointer',
        fontSize: '0.9em',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4em',
      }}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <span style={{ fontSize: '1.1em' }}>🌙</span>
      ) : (
        <span style={{ fontSize: '1.1em' }}>☀️</span>
      )}
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  )
}