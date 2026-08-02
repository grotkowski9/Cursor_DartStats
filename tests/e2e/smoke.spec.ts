import { expect, test } from "@playwright/test";

test("landing loads", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator("body")).toBeVisible();
});

test("demo profile loads", async ({ page }) => {
  const res = await page.goto("/demo/profile");
  expect(res?.ok()).toBeTruthy();
  await expect(page.locator("body")).toBeVisible();
});

test("login page loads", async ({ page }) => {
  const res = await page.goto("/login");
  expect(res?.ok()).toBeTruthy();
});

test("profile without session redirects to login", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});

test("unknown share token shows not-found path", async ({ page }) => {
  const res = await page.goto("/m/deadbeefdeadbeef");
  expect(res?.status()).toBeGreaterThanOrEqual(400);
});

test("ingest without auth returns 401", async ({ request }) => {
  const res = await request.post("/api/ingest", {
    data: { url: "https://n01darts.com/n01/league/n01_view.html?tmid=x" },
  });
  expect(res.status()).toBe(401);
});

test("match delete without auth returns 401", async ({ request }) => {
  const res = await request.delete(
    "/api/matches/00000000-0000-4000-8000-000000000001",
  );
  expect(res.status()).toBe(401);
});

test("dev-upsert blocked in production build", async ({ request }) => {
  const res = await request.post("/api/auth/dev-upsert", {
    data: { email: "x@y.z", password: "longpassword1" },
  });
  expect(res.status()).toBe(403);
});

test("security headers present on landing", async ({ request }) => {
  const res = await request.get("/");
  const headers = res.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("default-src");
});
