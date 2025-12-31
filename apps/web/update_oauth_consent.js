import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting browser automation to update Google OAuth consent screen...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();

    // Navigate to OAuth consent screen
    console.log('Navigating to OAuth consent screen...');
    await page.goto('https://console.cloud.google.com/apis/credentials/consent', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for user to log in if needed
    console.log('Waiting for page to load (please log in if prompted)...');
    await page.waitForTimeout(5000);

    // Wait for and click the "EDIT APP" button
    console.log('Looking for EDIT APP button...');
    await page.waitForSelector('button', { timeout: 30000 });

    // Find and click the EDIT APP button
    const editAppButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(button =>
        button.textContent.trim().toUpperCase().includes('EDIT APP')
      );
    });

    if (editAppButton) {
      console.log('Clicking EDIT APP button...');
      await editAppButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('EDIT APP button not found. Trying alternative selectors...');
      // Try clicking any button that contains "EDIT" text
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const editButton = buttons.find(btn =>
          btn.textContent.includes('EDIT') ||
          btn.textContent.includes('Edit')
        );
        if (editButton) editButton.click();
      });
      await page.waitForTimeout(3000);
    }

    // Wait for the form to load
    console.log('Waiting for form to load...');
    await page.waitForTimeout(2000);

    // Find and update the App name field
    console.log('Looking for App name field...');

    // Try multiple strategies to find the input field
    const appNameUpdated = await page.evaluate(() => {
      // Strategy 1: Look for input with label "App name"
      const labels = Array.from(document.querySelectorAll('label'));
      const appNameLabel = labels.find(label =>
        label.textContent.trim().toLowerCase().includes('app name')
      );

      if (appNameLabel) {
        // Find associated input
        const inputId = appNameLabel.getAttribute('for');
        const input = inputId ? document.getElementById(inputId) :
                      appNameLabel.parentElement.querySelector('input');

        if (input) {
          const currentValue = input.value;
          console.log('Current app name:', currentValue);
          input.value = 'Pulsar';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }

      // Strategy 2: Look for input with aria-label or placeholder
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      const appNameInput = inputs.find(input =>
        input.getAttribute('aria-label')?.toLowerCase().includes('app name') ||
        input.getAttribute('placeholder')?.toLowerCase().includes('app name')
      );

      if (appNameInput) {
        const currentValue = appNameInput.value;
        console.log('Current app name:', currentValue);
        appNameInput.value = 'Pulsar';
        appNameInput.dispatchEvent(new Event('input', { bubbles: true }));
        appNameInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      return false;
    });

    if (appNameUpdated) {
      console.log('App name updated to "Pulsar"');
      await page.waitForTimeout(1000);

      // Look for and click Save button
      console.log('Looking for Save button...');
      const saved = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const saveButton = buttons.find(button =>
          button.textContent.trim().toUpperCase().includes('SAVE') ||
          button.textContent.trim().toUpperCase().includes('SUBMIT')
        );

        if (saveButton) {
          saveButton.click();
          return true;
        }
        return false;
      });

      if (saved) {
        console.log('Save button clicked! Waiting for changes to be saved...');
        await page.waitForTimeout(5000);
        console.log('Changes should be saved. Please verify in the browser.');
      } else {
        console.log('Could not find Save button. Please save manually.');
      }
    } else {
      console.log('Could not find App name field. Browser will remain open for manual update.');
      console.log('Please update the field manually and save.');
    }

    console.log('\nBrowser will remain open for you to verify the changes.');
    console.log('Press Ctrl+C to close when done.');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('Error during automation:', error.message);
    console.log('Browser will remain open for manual completion.');
    await new Promise(() => {});
  }
})();
