
const { test, expect } = require('@playwright/test');

test('Homepage loads with main navigation', async ({ page }) => {
  const errors = [];

  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('body')).not.toBeEmpty();

  await expect(
    page.getByText('Browse Surplus', { exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText('Recovery Board', { exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText('Impact Ledger', { exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText('Sign In', { exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText('Register', { exact: true }).first()
  ).toBeVisible();

  expect(errors).toEqual([]);
});

const navigationItems = [
  'Browse Surplus',
  'Recovery Board',
  'Impact Ledger',
  'Sign In',
  'Register',
];

for (const item of navigationItems) {
  test(`${item} opens without a browser crash`, async ({ page }) => {
    const errors = [];

    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/');

    await page.getByText(item, { exact: true }).first().click();

    // Wait for navigation or client-side rendering to settle.
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).not.toBeEmpty();

    expect(errors).toEqual([]);
  });
}


test('Homepage renders at mobile size', async ({ page }) => {
  await page.setViewportSize({
    width: 390,
    height: 844,
  });

  await page.goto('/');

  await expect(page.locator('body')).not.toBeEmpty();

  await expect(
    page.getByRole('heading', { name: /good food/i }).first()
  ).toBeVisible();

  // Check that the page does not overflow horizontally.
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth >
      document.documentElement.clientWidth;
  });

  expect(hasHorizontalOverflow).toBe(false);
});

test('Sign In opens the authentication form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByText('Email Address')).toBeVisible();
  await expect(page.getByText('Password')).toBeVisible();
});

test('Register opens the registration form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Register', exact: true }).click();

  await expect(page.getByText('Email Address')).toBeVisible();
  await expect(page.getByText('Password')).toBeVisible();
});

test('Browse Surplus displays the recipient page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse Surplus' }).click();

  await expect(
    page.getByRole('heading', { name: 'Available Surplus Food Batches' })
  ).toBeVisible();
});

test('Recipient filters are available', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse Surplus' }).click();

  await expect(
    page.getByPlaceholder('Search surplus by keyword, location...')
  ).toBeVisible();

  await expect(page.getByText('Vegetarian Only')).toBeVisible();
});

test('Search field accepts a food keyword', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse Surplus' }).click();

  const search = page.getByPlaceholder(
    'Search surplus by keyword, location...'
  );

  await search.fill('rice');
  await expect(search).toHaveValue('rice');
});

test('Vegetarian filter can be selected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse Surplus' }).click();

  const vegetarianFilter = page.getByLabel('Vegetarian Only');
  await vegetarianFilter.check();

  await expect(vegetarianFilter).toBeChecked();
});


test('Login form displays email and password fields', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  await expect(page.getByText('Email Address')).toBeVisible();
  await expect(page.getByText('Password')).toBeVisible();

  const email = page.locator('input[type="email"]');
  const password = page.locator('input[type="password"]');

  await expect(email.first()).toBeVisible();
  await expect(password.first()).toBeVisible();
});


test('Registration form displays email and password fields', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Register', exact: true }).click();

  await expect(page.getByText('Email Address')).toBeVisible();
  await expect(page.getByText('Password')).toBeVisible();

  const email = page.locator('input[type="email"]');
  const password = page.locator('input[type="password"]');

  await expect(email.first()).toBeVisible();
  await expect(password.first()).toBeVisible();
});
