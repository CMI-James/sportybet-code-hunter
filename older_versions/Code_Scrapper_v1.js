const puppeteer = require("puppeteer");
const fs = require("fs");
const prompts = require("prompts");
const spinner = require("simple-spinner");

function linkify(input) {
  return input.replace(/ /g, "%20");
}

function countdownTimer(milliseconds) {
  let remainingTime = milliseconds;
  let startTime = Date.now();

  const intervalId = setInterval(function () {
    const elapsedTime = Date.now() - startTime;
    const remainingMilliseconds = remainingTime - elapsedTime;

    if (remainingMilliseconds <= 0) {
      clearInterval(intervalId);
      process.stdout.write("\r \n");
    } else {
      const seconds = Math.floor(remainingMilliseconds / 1000);
      const milliseconds = remainingMilliseconds % 1000;
      process.stdout.write(`\r${seconds}.${milliseconds} seconds  `);
    }
  }, 10);
}

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

async function extractAllHexCodesFromDivElements(
  page,
  selectors,
  regexPattern
) {
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

async function scrollAndExtractCodes(
  page,
  selectors,
  hexCodeRegex,
  scrollDuration
) {
  const extractedHexCodes = [];
  let currentTime = 0;

  while (currentTime < scrollDuration) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(125);
    const codes = await extractAllHexCodesFromDivElements(
      page,
      selectors,
      hexCodeRegex
    );
    extractedHexCodes.push(...codes);
    currentTime += 1000;
  }

  return extractedHexCodes;
}

let extractedHexCodes = []; // Define it here

(async () => {
  let browser;

  try {
    const response = await prompts([
      {
        type: "number",
        name: "Time",
        message: "Enter your desired search time (In milliseconds)",
      },
      {
        type: "text",
        name: "Linkk",
        message: "Enter your search query ",
        validate: (value) => (value.trim() !== "" ? true : "Query is required"),
      },
    ]);
    spinner.start("Loading codes...");

    const { Time, Linkk } = response;
    const Link = linkify(Linkk);
    browser = await puppeteer.launch({
      headless: false,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    });
    const page = await browser.newPage();

    await page.setDefaultNavigationTimeout(0);
    const cookies = require("../auth.json");
    await page.setCookie(...cookies);
    
    await page.goto(
      `https://twitter.com/search?q=${Link}&src=typeahead_click&f=live`
    );
    // const selectorA =
    //   "span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0";
    const selectorB = 'div[data-testid="tweetText"]';

    // await page.waitForSelector(selectorA);
    await page.waitForSelector(selectorB);

    const hexCodeRegex = /\b[0-9A-Fa-f]{7,8}\b/g;

    const scrollDuration = Time;
    const selectors = [ selectorB];
    countdownTimer(Time);
    extractedHexCodes = await scrollAndExtractCodes(
      page,
      selectors,
      hexCodeRegex,
      scrollDuration
    );

    const codes = [...new Set(extractedHexCodes)];
    console.log(codes);
    console.log(`Number of codes generated: ${codes.length}`);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const timestamp = `${day}-${month}-${year}_${hours}-${minutes}`;
    const folderName = "betcodes";
    const filePath = `${folderName}/betcodes_${timestamp}.txt`;

    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName);
    }
    fs.writeFile(filePath, codes.join("\n"), (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log("Codes saved to " + filePath);
      }
    });

    await browser.close();
    setTimeout(() => {
      spinner.stop();
      console.log("");
    }, 500);
  } catch (error) {
    console.error("An error occurred:", error);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const timestamp = `${day}-${month}-${year}_${hours}-${minutes}`;
    const folderName = "betcodes";
    const errorFilePath = `${folderName}/betcodes_error_${timestamp}.txt`;

    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName);
    }
    fs.writeFile(errorFilePath, extractedHexCodes.join("\n"), (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log("Codes up to the error saved to " + errorFilePath);
      }
    });

    if (browser) {
      await browser.close();
    }

    setTimeout(() => {
      spinner.stop();
      console.log("");
    }, 500);
  }
})();
