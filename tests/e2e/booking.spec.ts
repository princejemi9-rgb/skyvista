import { test, expect } from "@playwright/test";
test("homepage renders, search matches route, filters work and traveller reaches review", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Fly Further/ }),
  ).toBeVisible();
  await page.getByLabel("One way", { exact: true }).check();
  await page.getByRole("combobox", { name: "To", exact: true }).fill("London");
  await page.getByRole("option", { name: /London/ }).click();
  await page
    .getByRole("button", { name: "Search Flights", exact: true })
    .click();
  await expect(page).toHaveURL(/flights\?q=/);
  await expect(
    page.getByText("These flights use simulated inventory.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".flight-card")).toHaveCount(4);
  await page.getByLabel("Non-stop only").check();
  await expect(page.locator(".flight-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".flight-card")).toHaveCount(4);
  await page.getByLabel("Sort flights").selectOption("duration");
  await page.getByRole("button", { name: "Select flight" }).first().click();
  await expect(page).toHaveURL("/booking");
  await page.getByLabel("Traveller 1 First name").fill("Ada");
  await page.getByLabel("Traveller 1 Last name").fill("Test");
  await page.getByLabel("Traveller 1 Date of birth").fill("1990-03-10");
  await page.getByLabel("Traveller 1 Nationality").fill("Nigerian");
  await page
    .getByLabel("Traveller 1 Passport / national ID number")
    .fill("TEST001");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("test@example.com");
  await page.getByLabel("Phone number", { exact: true }).fill("+2348000000000");
  await page.getByRole("button", { name: "Choose seats & baggage" }).click();
  await expect(
    page.getByRole("heading", { name: "A seat with your name on it." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review your booking" }).click();
  await expect(page.getByRole("alert")).toContainText("select a seat");
  await page.locator(".seat-grid button:not([disabled])").first().click();
  await page.getByLabel("Extra baggage for traveller 1").selectOption("1");
  await page.getByRole("button", { name: "Review your booking" }).click();
  await expect(
    page.getByRole("heading", { name: "Your travellers" }),
  ).toBeVisible();
  await page.getByPlaceholder("Enter your code").fill("SKY30");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.getByText("30% off your flight fare applied."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save booking & continue" }),
  ).toBeDisabled();
});
test("round-trip and multi-city searches return the selected legs", async ({
  page,
}) => {
  await page.goto("/flights");
  await page
    .getByRole("button", { name: "Search Flights", exact: true })
    .click();
  await page.getByRole("button", { name: "Select flight" }).first().click();
  await expect(page.locator(".leg-tab.active")).toContainText("JFK → LOS");
  await page.goto("/flights");
  await page.getByLabel("Multi-city", { exact: true }).check();
  await page.getByRole("button", { name: "Add another flight" }).click();
  await expect(
    page.getByRole("combobox", { name: "From, flight 3", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove flight 3" }).click();
  await expect(
    page.getByRole("combobox", { name: "From, flight 3", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Search Flights", exact: true })
    .click();
  await expect(page.locator(".leg-tab")).toHaveCount(2);
});
test("support links work, mobile has no overflow and protected routes fail closed", async ({
  page,
  request,
}) => {
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Help centre", exact: true }).click();
  await page
    .getByText("Is this a real airline ticket?", { exact: true })
    .click();
  await expect(
    page.getByText("No. SkyVista currently operates a booking simulation.", {
      exact: false,
    }),
  ).toBeVisible();
  const admin = await request.get("/api/admin");
  expect([401, 503]).toContain(admin.status());
  const payment = await request.post("/api/payments/initialize", {
    data: { bookingId: "bad" },
    headers: { origin: "https://evil.example" },
  });
  expect(payment.status()).toBe(400);
  const hook = await request.post("/api/payments/webhook", {
    data: { event: "charge.success" },
  });
  expect(hook.status()).toBe(401);
});
