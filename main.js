const puppeteer = require('puppeteer');
const { KnownDevices } = require('puppeteer');
const fs = require('fs');

async function extractTextFromElement(element) {
  const text = await element.evaluate((el) => el.textContent);
  return text.trim(); // Trim any leading/trailing whitespace
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
      // console.log(textContent)
      const hexCodes = await extractHexCodesFromText(textContent, regexPattern);
      extractedHexCodes.push(...hexCodes);
    }
  }

  return extractedHexCodes;
}

async function scrollDownForDuration(page, duration) {
  const start = Date.now();
  while (Date.now()-start<duration){
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(1000); 
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: false, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
  const m = KnownDevices['iPhone X']
//emulate iPhoneX
  const page = await browser.newPage();
  await page.emulate(m)

  await page.setDefaultNavigationTimeout(0);
  const cookies = require('./auth.json');
  await page.setCookie(...cookies);
  await page.goto('https://twitter.com/search?q=sportybet&src=typed_query&f=live');
  await scrollDownForDuration(page, 60000); 

  const selectorA = 'div[class="css-1dbjc4n"]'; // Replace with your CSS selector A
  const selectorB = 'div[data-testid="tweetText"]'; 


  await page.waitForSelector(selectorA);
  await page.waitForSelector(selectorB);

  const hexCodeRegex = /\b[0-9A-Fa-f]{7,8}\b/g;


  const allHexCodesFromDivElements = await extractAllHexCodesFromDivElements(page, [selectorA, selectorB], hexCodeRegex);
  const codes = [...new Set(allHexCodesFromDivElements)];
  console.log(codes);
  const arrayAsString = codes.join(',');
  const filePath = 'betcodes.txt';
fs.writeFile(filePath, arrayAsString, (err) => {
  if (err) {
    console.error( err);
  } else {
    console.log('Codes saved to ' + filePath);
  }
});
await browser.close();
})();
