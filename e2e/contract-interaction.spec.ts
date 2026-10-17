import { test, expect } from '@playwright/test'
import { DEFAULT_FREIGHTER_MOCK, installFreighterMock } from './freighter-mock'

const CONNECTED_MOCK = { ...DEFAULT_FREIGHTER_MOCK, connected: true }
const TEST_CONTRACT = {
  id: 'e2e-contract',
  label: 'E2E Contract',
  contract_id: 'CDSO4GGZH7KBUQYKOIQDCMCFSRYEPOVDUX7Z4IB5TWNTLT2GDRKDQOYR',
  network: 'testnet',
  rules: [{ type: 'FunctionCalled', function_name: 'transfer' }],
  webhook_url: 'https://example.com/webhook',
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_000_000,
}

async function openTestContract(page: import('@playwright/test').Page) {
  await page.goto(`/contracts/${TEST_CONTRACT.id}`)
  await expect(
    page.getByRole('heading', { name: TEST_CONTRACT.label })
  ).toBeVisible()
}

test.describe('Contract Interaction and Rules', () => {
  test.beforeEach(async ({ context }) => {
    // Mock Freighter (accessed via @stellar/freighter-api) as connected
    await context.addInitScript(installFreighterMock, CONNECTED_MOCK)
    await context.addInitScript((contract: typeof TEST_CONTRACT) => {
      localStorage.setItem('txwatch_contracts', JSON.stringify([contract]))
    }, TEST_CONTRACT)
  })

  test('should display contract list page', async ({ page }) => {
    await page.goto('/contracts')
    await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible()
    await expect(page.getByRole('link', { name: /E2E Contract/ })).toBeVisible()
  })

  test('should allow importing a contract', async ({ page }) => {
    await page.goto('/settings')
    const snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: 1,
      contracts: [
        {
          ...TEST_CONTRACT,
          id: 'e2e-imported-contract',
          label: 'Imported E2E Contract',
          contract_id:
            'CCSHRYACRNVSLC5NP3V2DL6LGID57TQT2TJXVUVXBBZX6SED6N3F7X6J',
          rules: [{ type: 'AnyTransaction' }],
        },
      ],
    }

    const importFile = page.getByLabel('Import contracts')
    await expect(importFile).toBeVisible()
    await importFile.setInputFiles({
      name: 'contracts.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(snapshot)),
    })
    await expect(page.getByTestId('import-preview')).toBeVisible()
    const applyImportButton = page.getByRole('button', { name: 'Apply import' })
    await expect(applyImportButton).toBeVisible()
    await applyImportButton.click()
    await expect(page.getByRole('status')).toHaveText('Imported 1 contract(s).')
  })

  test('should display contract details', async ({ page }) => {
    await openTestContract(page)
    await expect(
      page.getByRole('heading', { name: 'Alert Rules' })
    ).toBeVisible()
    await expect(page.getByText('transfer')).toBeVisible()
  })
})

test.describe('Alert Rules Management', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(installFreighterMock, CONNECTED_MOCK)
    await context.addInitScript((contract: typeof TEST_CONTRACT) => {
      localStorage.setItem('txwatch_contracts', JSON.stringify([contract]))
    }, TEST_CONTRACT)
  })

  test('should add a new alert rule', async ({ page }) => {
    await openTestContract(page)
    const editRulesButton = page.getByRole('button', { name: 'Edit Rules' })
    await expect(editRulesButton).toBeVisible()
    await editRulesButton.click()
    const ruleType = page.locator('select').first()
    await expect(ruleType).toBeVisible()
    await ruleType.selectOption('AnyTransaction')
    const addRuleButton = page.getByRole('button', { name: 'Add Rule' })
    await expect(addRuleButton).toBeVisible()
    await addRuleButton.click()
    await expect(page.getByText('Any Transaction')).toBeVisible()
    const saveButton = page.getByRole('button', { name: 'Save', exact: true })
    await expect(saveButton).toBeVisible()
    await saveButton.click()
    await expect(page.getByText('Any Transaction')).toBeVisible()
  })

  test('should edit an existing alert rule', async ({ page }) => {
    await openTestContract(page)
    const editRulesButton = page.getByRole('button', { name: 'Edit Rules' })
    await expect(editRulesButton).toBeVisible()
    await editRulesButton.click()
    const editButton = page.getByRole('button', { name: 'Edit', exact: true })
    await expect(editButton).toBeVisible()
    await editButton.click()
    await page.getByPlaceholder('e.g. transfer').fill('approve')
    const saveRuleButton = page.getByRole('button', { name: 'Save Rule' })
    await expect(saveRuleButton).toBeVisible()
    await saveRuleButton.click()
    const saveButton = page.getByRole('button', { name: 'Save', exact: true })
    await expect(saveButton).toBeVisible()
    await saveButton.click()
    await expect(page.getByText('approve')).toBeVisible()
  })

  test('should remove an alert rule', async ({ page }) => {
    await openTestContract(page)
    const editRulesButton = page.getByRole('button', { name: 'Edit Rules' })
    await expect(editRulesButton).toBeVisible()
    await editRulesButton.click()
    const ruleType = page.locator('select').first()
    await expect(ruleType).toBeVisible()
    await ruleType.selectOption('AnyTransaction')
    const addRuleButton = page.getByRole('button', { name: 'Add Rule' })
    await expect(addRuleButton).toBeVisible()
    await addRuleButton.click()
    const removeButton = page
      .locator('li')
      .filter({ hasText: 'transfer' })
      .getByRole('button', { name: 'Remove' })
    await expect(removeButton).toBeVisible()
    await removeButton.click()
    const saveButton = page.getByRole('button', { name: 'Save', exact: true })
    await expect(saveButton).toBeVisible()
    await saveButton.click()
    await expect(page.getByText('Any Transaction')).toBeVisible()
    await expect(page.getByText('transfer')).toHaveCount(0)
  })

  test('should apply rule presets', async ({ page }) => {
    await openTestContract(page)
    const editRulesButton = page.getByRole('button', { name: 'Edit Rules' })
    await expect(editRulesButton).toBeVisible()
    await editRulesButton.click()
    const presetsButton = page.getByRole('button', { name: 'Presets' })
    await expect(presetsButton).toBeVisible()
    await presetsButton.click()
    const presetOption = page.getByRole('menuitem', { name: 'All failures' })
    await expect(presetOption).toBeVisible()
    await presetOption.click()
    await expect(page.getByText('Tx Failed')).toBeVisible()
    const saveButton = page.getByRole('button', { name: 'Save', exact: true })
    await expect(saveButton).toBeVisible()
    await saveButton.click()
    await expect(page.getByText('Tx Failed')).toBeVisible()
  })
})
