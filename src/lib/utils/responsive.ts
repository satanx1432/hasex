import { useState, useEffect } from 'react'

// Responsive utility functions and breakpoints for mobile-first design

export const breakpoints = {
  xs: '375px',   // Small phones
  sm: '640px',   // Large phones, small tablets
  md: '768px',   // Tablets
  lg: '1024px',  // Small laptops
  xl: '1280px',  // Desktops
  '2xl': '1536px', // Large screens
} as const

export type Breakpoint = keyof typeof breakpoints

export const responsive = {
  // Text sizes
  text: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  },
  
  // Spacing
  spacing: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  
  // Grid columns
  grid: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    },
  },
  
  // Container widths
  container: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  },
}

// Mobile-first responsive class generator
export function responsiveClasses(base: string, breakpoints: Partial<Record<Breakpoint, string>>): string {
  const classes = [base]
  
  Object.entries(breakpoints).forEach(([bp, className]) => {
    classes.push(`${bp}:${className}`)
  })
  
  return classes.join(' ')
}

// Touch-friendly sizing
export const touch = {
  minTouchTarget: 'min-h-[44px] min-w-[44px]', // iOS recommendation
  button: 'min-h-[48px] min-w-[48px]', // Better touch target
  icon: 'min-h-[40px] min-w-[40px]',
}

// Safe area insets for notched devices
export const safeArea = {
  top: 'pt-safe-top',
  bottom: 'pb-safe-bottom',
  left: 'pl-safe-left',
  right: 'pr-safe-right',
  all: 'p-safe',
}

// Orientation-specific utilities
export const orientation = {
  portrait: 'orientation-portrait',
  landscape: 'orientation-landscape',
}

// Device detection utilities
export const device = {
  isMobile: () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  },
  
  isTablet: () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 768 && window.innerWidth < 1024
  },
  
  isDesktop: () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 1024
  },
  
  isTouch: () => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },
}

// Responsive hook
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    width: windowSize.width,
    height: windowSize.height,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
    isTouch: device.isTouch(),
  }
}

// Keyboard detection for mobile devices
export function useKeyboard() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight
      const initialHeight = window.screen.height
      const heightDiff = initialHeight - currentHeight
      
      if (heightDiff > 150) {
        setIsKeyboardVisible(true)
        setKeyboardHeight(heightDiff)
      } else {
        setIsKeyboardVisible(false)
        setKeyboardHeight(0)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
      window.visualViewport?.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.visualViewport?.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  return { isKeyboardVisible, keyboardHeight }
}

// Swipe gesture hook
export function useSwipe() {
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    return { isLeftSwipe, isRightSwipe }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}

// Viewport meta tag manager
export function setViewportMeta() {
  if (typeof document !== 'undefined') {
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      )
    }
  }
}

// Prevent zoom on input focus (iOS)
export function preventZoomOnFocus() {
  if (typeof document !== 'undefined') {
    const inputs = document.querySelectorAll('input, select, textarea')
    inputs.forEach(input => {
      input.addEventListener('touchstart', () => {
        (input as HTMLElement).style.fontSize = '16px'
      })
    })
  }
}

// Haptic feedback (if supported)
export function hapticFeedback(pattern: 'light' | 'medium' | 'heavy') {
  if ('vibrate' in navigator) {
    switch (pattern) {
      case 'light':
        navigator.vibrate(10)
        break
      case 'medium':
        navigator.vibrate(20)
        break
      case 'heavy':
        navigator.vibrate(30)
        break
    }
  }
}

// Status bar height detection
export function getStatusBarHeight() {
  if (typeof window === 'undefined') return 0
  
  // Check for safe area inset support
  const style = getComputedStyle(document.documentElement)
  const paddingTop = parseInt(style.getPropertyValue('--safe-area-inset-top') || '0')
  
  if (paddingTop > 0) return paddingTop
  
  // Fallback for different platforms
  const userAgent = navigator.userAgent
  if (/iPhone/.test(userAgent)) return 44
  if (/iPad/.test(userAgent)) return 24
  if (/Android/.test(userAgent)) return 24
  
  return 0
}
