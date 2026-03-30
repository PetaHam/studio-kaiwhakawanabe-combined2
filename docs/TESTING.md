# Testing & Quality Assurance Guide

## Overview

This project includes comprehensive testing infrastructure covering:
- Unit tests
- Integration tests  
- E2E tests
- Performance testing
- Accessibility auditing
- Error tracking
- Analytics

---

## 📦 Installation

Install testing dependencies:

```bash
# Install all test dependencies
yarn add -D @testing-library/jest-dom @testing-library/react @testing-library/user-event
yarn add -D @playwright/test @lhci/cli
yarn add -D jest jest-environment-jsdom @types/jest
```

---

## 🧪 Unit Tests (Jest + React Testing Library)

### Running Tests

```bash
# Run tests in watch mode
yarn test

# Run tests once (CI mode)
yarn test:ci

# Run tests with coverage
yarn test:ci --coverage
```

### Writing Tests

Create test files next to components with `.test.tsx` extension:

```tsx
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

---

## 🎭 E2E Tests (Playwright)

### Running E2E Tests

```bash
# Run all E2E tests
yarn test:e2e

# Run tests with UI mode
yarn test:e2e:ui

# Run specific test file
yarn playwright test e2e/home.spec.ts

# Run tests in headed mode (see browser)
yarn playwright test --headed
```

### Writing E2E Tests

```tsx
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test'

test('user can complete workflow', async ({ page }) => {
  await page.goto('/')
  
  // Click a button
  await page.click('[data-testid="vote-button"]')
  
  // Wait for navigation
  await expect(page).toHaveURL('/vote')
  
  // Fill form
  await page.fill('input[name="score"]', '85')
  
  // Submit
  await page.click('[data-testid="submit"]')
  
  // Verify success
  await expect(page.locator('text=Success')).toBeVisible()
})
```

---

## ⚡ Performance Testing (Lighthouse CI)

### Running Lighthouse

```bash
# Run Lighthouse audit
yarn lighthouse

# View detailed report
npx lhci open
```

### Configuration

Edit `lighthouserc.js` to adjust performance thresholds:

```js
assertions: {
  'categories:performance': ['error', { minScore: 0.9 }],
  'categories:accessibility': ['error', { minScore: 0.9 }],
}
```

---

## ♿ Accessibility Auditing

### Audit Alt Text

```bash
# Run alt text audit
node scripts/audit-alt-text.js
```

This will scan all images and report:
- Total images found
- Images with alt text
- Images missing alt text
- Images with empty alt text
- Accessibility score

### Manual Accessibility Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Ensure focus is visible
   - Check tab order is logical

2. **Screen Reader Testing**
   - Use NVDA (Windows) or VoiceOver (Mac)
   - Verify all content is announced
   - Check ARIA labels

3. **Color Contrast**
   ```tsx
   import { getColorContrast, isWCAGCompliant } from '@/lib/accessibility'
   
   const contrast = getColorContrast('#FF4500', '#FFFFFF')
   const compliant = isWCAGCompliant(contrast, 'AA', 'normal')
   ```

---

## 🐛 Error Tracking

### Initialize Error Tracking

```tsx
// In your root layout or _app
import { initErrorTracking } from '@/lib/error-tracking'

useEffect(() => {
  initErrorTracking()
}, [])
```

### Track Errors Manually

```tsx
import { errorTracker } from '@/lib/error-tracking'

try {
  // Risky operation
} catch (error) {
  errorTracker.captureException(error, {
    context: 'voting',
    userId: user.id
  })
}
```

### Set User Context

```tsx
errorTracker.setUser({
  id: user.uid,
  email: user.email,
  username: user.displayName
})
```

---

## 📊 Analytics

### Initialize Analytics

```tsx
import { initAnalytics } from '@/lib/analytics'

useEffect(() => {
  initAnalytics()
}, [])
```

### Track Events

```tsx
import { analytics } from '@/lib/analytics'

// Track custom event
analytics.trackEvent({
  name: 'vote_submitted',
  properties: {
    performanceId: 'abc123',
    score: 85
  }
})

// Track page view
analytics.trackPageView('/vote')

// Track click
analytics.trackClick('vote-button', { location: 'hero' })

// Track purchase
analytics.trackPurchase(9.99, 'NZD', { product: 'mana-pack' })
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test:ci
      - run: yarn test:e2e
      - run: yarn lighthouse
```

---

## 📈 Coverage Reports

After running tests with coverage:

```bash
yarn test:ci --coverage
```

View coverage report:
- Open `coverage/lcov-report/index.html` in browser
- Check console output for summary

Target coverage goals:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

---

## 🎯 Best Practices

### Unit Tests
- Test user behavior, not implementation
- Use `data-testid` for test selectors
- Mock external dependencies
- Keep tests fast and isolated

### E2E Tests
- Test critical user journeys
- Use page objects for reusability
- Add proper waits (don't use fixed timeouts)
- Test on multiple browsers/devices

### Accessibility
- Run audits regularly
- Test with actual screen readers
- Ensure keyboard navigation works
- Check color contrast meets WCAG AA

### Performance
- Run Lighthouse on every deploy
- Monitor Core Web Vitals
- Optimize images and fonts
- Lazy load heavy components

---

## 🚨 Troubleshooting

### Tests Failing in CI

- Check Node version matches local
- Ensure all env variables are set
- Clear caches between runs

### Playwright Issues

```bash
# Install browsers
npx playwright install

# Update browsers
npx playwright install --with-deps
```

### Coverage Not Generating

```bash
# Clear Jest cache
yarn jest --clearCache

# Run with verbose
yarn test:ci --verbose
```

---

## 📚 Resources

- [Jest Docs](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
