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

  test.describe('Password Change (First Login)', () => {
    test.skip('should show password change form for users with default password', async ({ page }) => {
      // TODO: Login with user that has password_changed=false
      // 1. Login with default password
      // 2. Verify redirect to /alterar-senha or password change modal
      // 3. Verify form has password and confirmPassword fields
    });

    test.skip('should validate password minimum length (8 chars)', async ({ page }) => {
      // TODO: Navigate to password change form
      // 1. Enter password shorter than 8 characters
      // 2. Submit form
      // 3. Verify validation error message
    });

    test.skip('should validate passwords match', async ({ page }) => {
      // TODO: Navigate to password change form
      // 1. Enter different passwords in password and confirm fields
      // 2. Submit form
      // 3. Verify "Senhas não conferem" error appears
    });

    test.skip('should successfully change password and redirect', async ({ page }) => {
      // TODO: Complete password change flow
      // 1. Enter matching valid passwords
      // 2. Submit form
      // 3. Verify success message
      // 4. Verify redirect to onboarding or dashboard
    });
  });

  test.describe('Onboarding', () => {
    test.skip('should display onboarding form for new users', async ({ page }) => {
      // TODO: Login with user that has onboarding_completed=false
      // 1. Verify onboarding page/modal is shown
      // 2. Verify niche, difficulty, and tone fields are present
    });

    test.skip('should require niche and difficulty fields', async ({ page }) => {
      // TODO: Attempt to submit onboarding without filling required fields
      // 1. Submit empty form
      // 2. Verify validation errors for niche and difficulty
    });

    test.skip('should allow selecting preferred tone', async ({ page }) => {
      // TODO: Test tone selection UI
      // 1. Verify three tone options: formal, casual, direct
      // 2. Select each and verify selection state
    });

    test.skip('should complete onboarding and redirect to dashboard', async ({ page }) => {
      // TODO: Complete full onboarding flow
      // 1. Fill in niche, difficulty, and tone
      // 2. Submit form
      // 3. Verify redirect to main dashboard
      // 4. Verify onboarding_completed is set to true
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
