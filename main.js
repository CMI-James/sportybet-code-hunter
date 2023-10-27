const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
  const page = await browser.newPage();

  await page.setDefaultNavigationTimeout(0);

  await page.goto('https://twitter.com/search?q=sportybet&src=typed_query&f=live');

  
  {
    const targetPage = page;
    const element = await waitForSelectors([["aria/Login"],["#j_page_header > div.m-top-wrapper > div > div.m-logo-bar > div.m-login-bar > div.m-opt > div.m-psd-wrapper > div.m-psd > button"]], targetPage, { timeout, visible: true });
    await scrollIntoViewIfNeeded(element, timeout);
    await element.click({
      offset: {
        x: 33.5,
        y: 13,
      },
    });
  }
  console.log("Logged in");

  for (let i = 0; i < values.length; i++) {
    const betCode = values[i];

    await page.waitForSelector('#j_betslip > div.m-betslips > div.m-betslip-search > div.m-opt-wrapper > div.m-input-wrapper > span > input');

    await page.type('#j_betslip > div.m-betslips > div.m-betslip-search > div.m-opt-wrapper > div.m-input-wrapper > span > input', betCode);
    // console.log("Typed code");

    await page.click('#j_betslip > div.m-betslips > div.m-betslip-search > div.m-opt-wrapper > button');
    // console.log("Loaded code");

    
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('#j_stake_0 > span > input', stake);
      // console.log("Input stake");

      await page.waitForTimeout(3000);
    {
        const targetPage = page;
        const element = await waitForSelectors([["#j_betslip > div.m-betslips > div:nth-child(2) > div > div.m-stake > div > div.m-btn-wrapper > button"]], targetPage, { timeout, visible: true });
        await scrollIntoViewIfNeeded(element, timeout);
        await element.click({
          offset: {
            x: 32,
            y: 5,
          },
        });
    }
    // console.log("Accept/Place Bet 1")
    await page.waitForTimeout(2000);
    {
        const targetPage = page;
        const element = await waitForSelectors([["#j_betslip > div.m-betslips > div:nth-child(2) > div > div.m-stake > div > div.m-btn-wrapper > button"]], targetPage, { timeout2, visible: true });
        await scrollIntoViewIfNeeded(element, 2000);
        await element.click({
          offset: {
            x: 32,
            y: 5,
          },
        });
    }
    // console.log("Accept/Place Bet 2")

    {
        const targetPage = page;
        const element = await waitForSelectors([["#j_betslip > div.m-betslips > div:nth-child(2) > div > div.m-stake > div > div.m-comfirm-wrapper > div > div.m-btn-wrapper > button.af-button.af-button--primary"]], targetPage, { timeout2, visible: true });
        await scrollIntoViewIfNeeded(element, 2000);
        await element.click({
          offset: {
            x: 32,
            y: 5,
          },
        });
    }
    // console.log("Confirm")

    await page.waitForTimeout(3000);

    {
        const targetPage = page;
        const element = await waitForSelectors([["aria/OK"],["#esDialog0 > div.es-dialog.m-dialog > div > div > div > div.m-pop-main > div.m-btn-wrapper.m-ok-wrap > button"]], targetPage, { timeout2, visible: true });
        await scrollIntoViewIfNeeded(element, 4000);
        await element.click({
          offset: {
            x: 141.5,
            y: 21,
          },
        });
    }
    // console.log("Okay Dialog")

    console.log(`Staked ${betCode}`);

  }

  await browser.close();
})();

async function waitForSelectors(selectors, frame, options) {
  for (const selector of selectors) {
    try {
      return await waitForSelector(selector, frame, options);
    } catch (err) {
      console.error(err);
    }
  }
  throw new Error('Could not find element for selectors: ' + JSON.stringify(selectors));
}

async function scrollIntoViewIfNeeded(element, timeout) {
  await waitForConnected(element, timeout);
  const isInViewport = await element.isIntersectingViewport({threshold: 0});
  if (isInViewport) {
    return;
  }
  await element.evaluate(element => {
    element.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'auto',
    });
  });
  await waitForInViewport(element, timeout);
}

async function waitForConnected(element, timeout) {
  await waitForFunction(async () => {
    return await element.getProperty('isConnected');
  }, timeout);
}

async function waitForInViewport(element, timeout) {
  await waitForFunction(async () => {
    return await element.isIntersectingViewport({threshold: 0});
  }, timeout);
}

async function waitForSelector(selector, frame, options) {
  if (!Array.isArray(selector)) {
    selector = [selector];
  }
  if (!selector.length) {
    throw new Error('Empty selector provided to waitForSelector');
  }
  let element = null;
  for (let i = 0; i < selector.length; i++) {
    const part = selector[i];
    if (element) {
      element = await element.waitForSelector(part, options);
    } else {
      element = await frame.waitForSelector(part, options);
    }
    if (!element) {
      throw new Error('Could not find element: ' + selector.join('>>'));
    }
    if (i < selector.length - 1) {
      element = (await element.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
    }
  }
  if (!element) {
    throw new Error('Could not find element: ' + selector.join('|'));
  }
  return element;
}

async function waitForElement(step, frame, timeout) {
  const count = step.count || 1;
  const operator = step.operator || '>=';
  const comp = {
    '==': (a, b) => a === b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
  };
  const compFn = comp[operator];
  await waitForFunction(async () => {
    const elements = await querySelectorsAll(step.selectors, frame);
    return compFn(elements.length, count);
  }, timeout);
}

async function querySelectorsAll(selectors, frame) {
  for (const selector of selectors) {
    const result = await querySelectorAll(selector, frame);
    if (result.length) {
      return result;
    }
  }
  return [];
}

async function querySelectorAll(selector, frame) {
  if (!Array.isArray(selector)) {
    selector = [selector];
  }
  if (!selector.length) {
    throw new Error('Empty selector provided to querySelectorAll');
  }
  let elements = [];
  for (let i = 0; i < selector.length; i++) {
    const part = selector[i];
    if (i === 0) {
      elements = await frame.$$(part);
    } else {
      const tmpElements = elements;
      elements = [];
      for (const el of tmpElements) {
        elements.push(...(await el.$$(part)));
      }
    }
    if (elements.length === 0) {
      return [];
    }
    if (i < selector.length - 1) {
      const tmpElements = [];
      for (const el of elements) {
        const newEl = (await el.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
        if (newEl) {
          tmpElements.push(newEl);
        }
      }
      elements = tmpElements;
    }
  }
  return elements;
}

async function waitForFunction(fn, timeout) {
  let isActive = true;
  setTimeout(() => {
    isActive = false;
  }, timeout);
  while (isActive) {
    const result = await fn();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out');
}