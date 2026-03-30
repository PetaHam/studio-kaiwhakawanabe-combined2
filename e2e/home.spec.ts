import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Kaiwhakawānabe/)
  })

  test('should display navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check for navigation items
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('should navigate to vote page', async ({ page }) => {
    await page.goto('/')
    
    // Click vote navigation
    await page.click('[href="/vote"]')
    await expect(page).toHaveURL('/vote')
  })
})

test.describe('Authentication', () => {
  test('should show guest mode', async ({ page }) => {
    await page.goto('/')
    
    // Check for guest indicators
    const guestBadge = page.locator('text=Guest')
    await expect(guestBadge).toBeVisible()
  })
})

test.describe('Mobile responsiveness', () => {
  test('should be mobile friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check that content is visible on mobile
    await expect(page.locator('main')).toBeVisible()
  })
})
