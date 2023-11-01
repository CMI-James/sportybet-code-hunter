const puppeteer = require('puppeteer');
// const { KnownDevices } = require('puppeteer');
const fs = require('fs');
const prompts = require('prompts');
const spinner = require('simple-spinner');


async function extractTextFromElement(element) {
  const text = await element.evaluate((el) => el.textContent);
  return text.trim();
}

async function extractHexCodesFromText(text, regexPattern) {
  const matches = text.match(regexPattern);
  if (matches) {
    return matches.map((match) => match.trim());
  }
  return [];
}

async function extractAllHexCodesFromDivElements(page, selectors, regexPattern) {
  const extractedHexCodes = [];

  for (const selector of selectors) {
    const divElements = await page.$$(selector);

    for (const divElement of divElements) {
      const textContent = await extractTextFromElement(divElement);
      const hexCodes = await extractHexCodesFromText(textContent, regexPattern);
      extractedHexCodes.push(...hexCodes);
    }
  }

  return extractedHexCodes;
}

async function scrollAndExtractCodes(page, selectors, hexCodeRegex, scrollDuration) {
  const extractedHexCodes = [];
  let currentTime = 0;

  while (currentTime < scrollDuration) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(1000);
    const codes = await extractAllHexCodesFromDivElements(page, selectors, hexCodeRegex);
    extractedHexCodes.push(...codes);
    currentTime += 1000;
  }

  return extractedHexCodes;
}

(async () => {
  const response = await prompts([
    {
      type: 'number',
      name: 'Time',
      message: 'Enter your desired search time(In milliseconds)'
    }
  ]);
  spinner.start('Loading codes...');
  
  const { Time } = response;
  const browser = await puppeteer.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
  // const m = KnownDevices['iPhone X']
  const page = await browser.newPage();
  // await page.emulate(m)

  await page.setDefaultNavigationTimeout(0);
  const cookies = require('./auth.json');
  await page.setCookie(...cookies);
  await page.goto('https://twitter.com/search?q=sportybet&src=typed_query');

  const selectorA = 'span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0';
  const selectorB = 'div[data-testid="tweetText"]';

  await page.waitForSelector(selectorA);
  await page.waitForSelector(selectorB);

  const hexCodeRegex = /\b[0-9A-Fa-f]{7,8}\b/g;

  const scrollDuration = Time; //Time in milliseconds
  const selectors = [selectorA, selectorB];
  const extractedHexCodes = await scrollAndExtractCodes(page, selectors, hexCodeRegex, scrollDuration);

  const codes = [...new Set(extractedHexCodes)];
  console.log(codes);
  const arrayAsString = codes.join(',');
  const filePath = 'betcodes.txt';
  fs.writeFile(filePath, arrayAsString, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Codes saved to ' + filePath);
    }
  });
  await browser.close();
  setTimeout(() => {
    spinner.stop();
    console.log('');
  }, 500);
})();
