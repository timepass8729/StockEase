
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Function to check if screen is mobile
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Set initial state
    checkIsMobile()
    
    // Add event listener
    window.addEventListener('resize', checkIsMobile)
    
    // Clean up listener on unmount
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

// New hook to handle swipe gestures
export function useSwipeGesture(onSwipeRight: () => void, onSwipeLeft?: () => void) {
  const touchStartX = React.useRef<number | null>(null)
  const touchEndX = React.useRef<number | null>(null)
  const minSwipeDistance = 50 // Minimum distance in pixels for a swipe

  const onTouchStart = React.useCallback((e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }, [])

  const onTouchEnd = React.useCallback((e: TouchEvent) => {
    if (touchStartX.current === null) return
    
    touchEndX.current = e.changedTouches[0].clientX
    
    const swipeDistance = touchEndX.current - touchStartX.current
    
    // If the swipe distance is greater than the minimum and it's a right swipe
    if (swipeDistance > minSwipeDistance) {
      onSwipeRight()
    } 
    // If the swipe distance is less than the negative minimum and it's a left swipe
    else if (swipeDistance < -minSwipeDistance && onSwipeLeft) {
      onSwipeLeft()
    }
    
    // Reset values
    touchStartX.current = null
    touchEndX.current = null
  }, [onSwipeRight, onSwipeLeft])

  React.useEffect(() => {
    document.addEventListener('touchstart', onTouchStart)
    document.addEventListener('touchend', onTouchEnd)
    
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onTouchStart, onTouchEnd])
}
