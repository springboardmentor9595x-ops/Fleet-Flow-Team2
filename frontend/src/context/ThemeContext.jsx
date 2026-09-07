import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // Initialize theme from localStorage, falling back to 'dark'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('fleetflow_theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    // Update class on HTML & body elements
    if (theme === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
      body.classList.remove('dark')
      body.classList.add('light')
      root.setAttribute('data-theme', 'light')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      body.classList.remove('light')
      body.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    }

    localStorage.setItem('fleetflow_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
