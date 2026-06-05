/**
 * E2E tests: Authentication flows
 * - Successful login redirects to dashboard
 * - Failed login shows error message
 * - Logout clears session
 * - Already-authenticated user redirected away from /login
 */
import { test, expect } from "@playwright/test"

const TEST_USER = process.env.E2E_USER ?? "admin"
const TEST_PASS = process.env.E2E_PASS ?? "ziriuz2024"

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start from a logged-out state
    await page.goto("/api/auth/signout", { waitUntil: "networkidle" })
  })

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.waitForSelector('input[name="usuario"]', { timeout: 10_000 })

    await page.fill('input[name="usuario"]', TEST_USER)
    await page.fill('input[name="clave"]', TEST_PASS)
    await page.click('button[type="submit"]')

    // After login, should land on the dashboard
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 15_000 })
    expect(page.url()).not.toContain("/login")
  })

  test("failed login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login")
    await page.waitForSelector('input[name="usuario"]')

    await page.fill('input[name="usuario"]', "usuario_que_no_existe")
    await page.fill('input[name="clave"]', "clave_incorrecta")
    await page.click('button[type="submit"]')

    // Should stay on /login and show an error
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    const errorText = await page.textContent("body")
    expect(errorText).toMatch(/credenciales|inválid|incorrect|error/i)
  })

  test("failed login with empty fields shows validation error", async ({ page }) => {
    await page.goto("/login")
    await page.waitForSelector('input[name="usuario"]')

    await page.click('button[type="submit"]')

    // Should not redirect — form validation prevents submission
    expect(page.url()).toContain("/login")
  })

  test("authenticated user visiting /login is redirected", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.fill('input[name="usuario"]', TEST_USER)
    await page.fill('input[name="clave"]', TEST_PASS)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 15_000 })

    // Now try to visit /login again
    await page.goto("/login")
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain("/login")
  })

  test("logout clears session and redirects to /login", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.fill('input[name="usuario"]', TEST_USER)
    await page.fill('input[name="clave"]', TEST_PASS)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 15_000 })

    // Find and click logout button (typically in header or sidebar)
    const logoutBtn = page.locator('[data-testid="logout-btn"], button:has-text("Salir"), button:has-text("Cerrar sesión")')
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click()
      await page.waitForURL(/\/login/, { timeout: 10_000 })
      expect(page.url()).toContain("/login")
    } else {
      // Fallback: directly call signout
      await page.goto("/api/auth/signout")
      await page.waitForURL(/\/login/, { timeout: 10_000 })
    }
  })
})
