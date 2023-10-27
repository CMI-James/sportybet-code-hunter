const puppeteer = require('puppeteer');

async function extractTextFromElement(element) {
  const text = await element.evaluate((el) => el.textContent);
  return text.trim(); // Trim any leading/trailing whitespace
}

async function extractWordsFromText(text, regexPattern) {
  const matches = text.match(regexPattern);
  if (matches) {
    return matches.map((match) => match.trim());
  }
  return [];
}

async function extractAllWordsFromDivElements(page, selector, regexPattern) {
  const divElements = await page.$$(selector);
  const extractedWords = [];

  for (const divElement of divElements) {
    const textContent = await extractTextFromElement(divElement);
    const words = await extractWordsFromText(textContent, regexPattern);
    extractedWords.push(...words);
  }

  return extractedWords;
}

async function extractAllTextFromDivElements(page, selector) {
  const divElements = await page.$$(selector);
  const extractedText = [];

  for (const divElement of divElements) {
    const allText = await divElement.$$eval('*', (elements) => {
      return elements.map((el) => el.textContent);
    });

    extractedText.push(allText.join(' '));
  }

  return extractedText;
}
async function scrollDownForDuration(page, duration) {
  const start = Date.now();
  while (Date.now() - start < duration) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(1000); // Adjust the delay to control scrolling speed
  }
}
(async () => {
  const browser = await puppeteer.launch({ headless: false, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
  const page = await browser.newPage();

  await page.setDefaultNavigationTimeout(0);
  const cookies = require('./auth.json');
  await page.setCookie(...cookies);
  await page.goto('https://twitter.com/AcedTips');

  
  const selector = 'div[class="css-1dbjc4n r-1iusvr4 r-16y2uox r-1777fci r-kzbkwu"]'; // Replace with your desired CSS selector
  await page.waitForSelector(selector)
  const allTextFromDivElements = await extractAllTextFromDivElements(page, selector);
  await scrollDownForDuration(page, 30000); // 30 seconds
  console.log(allTextFromDivElements)

  console.log(typeof(allTextFromDivElements))
  const regex = /\b(?=[A-Za-z]*\d)(?=\d*[A-Za-z])[\w\d]{5,9}\b/g;

  const text = allTextFromDivElements[0];

 const extractedData = text.match(regex);
 if (extractedData) {
  console.log("Extracted Data:", extractedData);
} else {
  console.log("No matches found.");
}

  // Extract and append new text content
  // const newContent = await extractAllWordsFromDivElements(page, selector, regex);
  // console.log(newContent);

  // // Scroll down for 30 seconds
  // await scrollDownForDuration(page,5000 ); // 30 seconds

  // // Extract and append new words
  // const newWords = await extractAllWordsFromDivElements(page, selector, regex);
  // console.log(newWords);
  
  // for (const str of allTextFromDivElements) {
  //   const matches = str.match(regex); // Use match to find all matches in the string
  //   if (matches) {
  //     console.log("Matches in string:", str);
  //     console.log(matches);
  //   }
  // }
  


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