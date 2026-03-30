import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test('should not have automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper heading hierarchy
    const h1 = await page.locator('h1').count()
    expect(h1).toBeGreaterThan(0)
    
    // Check for alt text on images
    const images = await page.locator('img').all()
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement)
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/')
    
    // Check for buttons with aria-labels
    const buttons = await page.locator('button[aria-label]').all()
    expect(buttons.length).toBeGreaterThan(0)
  })
})
