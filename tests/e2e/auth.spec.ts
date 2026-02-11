import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login', () => {
    test('should display login form with email and password fields', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'not-an-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Email inválido')).toBeVisible();
    });

    test('should show error for password too short', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'user@example.com');
      await page.fill('input[type="password"]', '12345');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Senha deve ter no mínimo 6 caracteres')).toBeVisible();
    });

    test.skip('should successfully log in with valid credentials', async ({ page }) => {
      // TODO: Set up test user in Supabase before running
      // 1. Navigate to /login
      // 2. Fill in valid email and password
      // 3. Submit the form
      // 4. Verify redirect to dashboard
      // 5. Verify user profile is loaded in the header
    });

    test.skip('should show error for incorrect credentials', async ({ page }) => {
      // TODO: Test with non-existent user credentials
      // 1. Navigate to /login
      // 2. Fill in incorrect email/password
      // 3. Submit the form
      // 4. Verify error toast or message appears
    });

    test.skip('should redirect authenticated user away from login page', async ({ page }) => {
      // TODO: Login first, then navigate to /login
      // Verify redirect to dashboard
    });
  });

  test.describe('Logout', () => {
    test.skip('should log out and redirect to login page', async ({ page }) => {
      // TODO: Login first, then test logout
      // 1. Click user menu or logout button
      // 2. Confirm logout action
      // 3. Verify redirect to /login
      // 4. Verify protected routes are no longer accessible
    });
  });
});
