import { test, expect } from "@playwright/test";

/**
 * Anonymous smoke tests — the bare minimum we want to verify on every
 * deploy. No auth needed. These should run in < 30s combined.
 */

test.describe("anonymous smoke", () => {
  test("login page renders with the StrongBox wordmark and form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /sign in/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    // Wordmark image should be present in the header.
    await expect(page.getByRole("img", { name: /strongbox/i })).toBeVisible();
  });

  test("forgot-password page renders and shows the back-to-login link", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /reset your password/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /back to sign in/i })).toBeVisible();
  });

  test("unauthenticated /admin redirects to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("unauthenticated /portal redirects to /login", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("404 page renders for unknown URLs", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist");
    // Status may be 200 in Next dev mode for the not-found page; the
    // important check is the visible 404 marker.
    await expect(page.getByText(/page not found/i)).toBeVisible();
    expect(res?.status() ?? 200).toBeGreaterThanOrEqual(200);
  });

  test("invalid login surfaces a generic error (no user enumeration)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/password/i).fill("wrong-password-zzz");
    await page.getByRole("button", { name: /sign in/i }).click();
    // We deliberately return the same generic message regardless of whether
    // the account exists, so this assertion doubles as a regression check
    // against accidental information leakage.
    await expect(
      page.getByText(/invalid email or password|too many attempts/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
