const puppeteer = require("puppeteer");
const fs = require("fs");
const prompt = require("prompt");
const path = require("path");

prompt.start();

let counter; // Declare counter variable outside the function

// Function to extract text content from an element
async function extractTextFromElement(element) {
  const text = await element.evaluate((el) => el.textContent);
  return text.trim();
}

// Function to extract tweets from page using given selectors
async function extractAllTweets(page, selectors) {
  const tweets = [];

  for (const selector of selectors) {
    const tweetElements = await page.$$(selector);

    for (const tweetElement of tweetElements) {
      const tweetText = await extractTextFromElement(tweetElement);
      tweets.push(tweetText);
    }
  }

  return tweets;
}

// Function to set cookies for the page
async function setCookies(page, cookies) {
  await page.setCookie(...cookies);
  await page.waitForTimeout(1000); // Wait for cookies to be set
}

// Function to prompt user for search link
function getSearchLink() {
  return new Promise((resolve, reject) => {
    prompt.get(
      [
        {
          name: "Link",
          description: "Enter your search query",
          type: "string",
          required: true,
          message: "Query is required",
        },
      ],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.Link);
        }
      }
    );
  });
}

// Function to prompt user for scrolling duration
function getScrollDuration() {
  return new Promise((resolve, reject) => {
    prompt.get(
      [
        {
          name: "duration",
          description: "Enter scrolling duration in minutes",
          type: "integer",
          required: true,
          message: "Duration is required and must be a number",
        },
      ],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.duration * 60000); // Convert minutes to milliseconds
        }
      }
    );
  });
}

// Function to append bet codes to the general file
async function appendToGeneralFile(generalFilePath, hexCodesString) {
  try {
    // Check if the general file exists
    if (fs.existsSync(generalFilePath)) {
      const existingCodes = await fs.promises.readFile(generalFilePath, "utf8");
      const existingCodesSet = new Set(existingCodes.trim().split("\n"));

      const newCodes = hexCodesString
        .trim()
        .split("\n")
        .filter((code) => !existingCodesSet.has(code));

      if (newCodes.length > 0) {
        const updatedCodesString = `${existingCodes.trim()}\n\n\n\n${newCodes.join("\n")}`;
        await fs.promises.writeFile(generalFilePath, updatedCodesString);
        console.log(`Codes appended to ${generalFilePath}.`);
      } else {
        console.log("No new codes to append (duplicates detected).");
      }
    } else {
      await fs.promises.mkdir(path.dirname(generalFilePath), { recursive: true });
      await fs.promises.writeFile(generalFilePath, hexCodesString);
      console.log(`Codes written to ${generalFilePath}.`);
    }
  } catch (error) {
    console.error("Error appending codes to general file:", error);
  }
}

// Function to launch browser, search, and extract bet codes
async function launchBrowserAndSearch(Link, duration) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const dateStamp = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "_");
    
    const authFile = "auth.json";
    if (!fs.existsSync(authFile)) {
      throw new Error("auth.json not found. Please login manually to obtain cookies.");
    }

    const cookies = JSON.parse(fs.readFileSync(authFile, "utf8"));
    await page.goto("https://twitter.com", { waitUntil: "domcontentloaded" });
    await setCookies(page, cookies);

    await page.goto(`https://twitter.com/search?q=${Link}&src=typeahead_click&f=live`, { waitUntil: "domcontentloaded" });
    console.log(`Search results for "${Link}" displayed.`);

    counter = duration / 1000; // Initialize counter

    const generalFilePath = `./betcodes/betcodes_general_${dateStamp}.txt`;
    const existingGeneralCodes = fs.existsSync(generalFilePath) ? await fs.promises.readFile(generalFilePath, "utf8") : "";
    const generalCodesSet = new Set(existingGeneralCodes.trim().split("\n"));
    const tweets = await extractAllTweets(page, ['div[data-testid="tweetText"]']);
    const hexSet = new Set();

    const scrollInterval = setInterval(async () => {
      page.evaluate(() => { window.scrollBy(0, window.innerHeight); });

      const tweetElements = await page.$$('div[data-testid="tweetText"]');
      const tweetTexts = await Promise.all(tweetElements.map((element) => element.evaluate((node) => node.innerText)));

      for (const tweetText of tweetTexts) {
        const hexNumbers = tweetText.match(/\b(?:[0-9a-fA-F]{7,8})\b/g);
        if (hexNumbers) { hexSet.add(...hexNumbers); }
      }

      const hexCounter = Array.from(hexSet).length;
      hexSet.forEach((code) => generalCodesSet.add(code));

      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`Time remaining: ${counter} seconds | General Codes: ${generalCodesSet.size} | Codes Fetched: ${hexCounter}\r`);
      counter--;
    }, 1000);

    await new Promise((resolve) => setTimeout(resolve, duration));
    clearInterval(scrollInterval);

    const folderPath = "./betcodes";
    await fs.promises.mkdir(folderPath, { recursive: true });

    const uniqueHexCodes = Array.from(hexSet);
    const hexCodesString = uniqueHexCodes.join("\n");

    await appendToGeneralFile(generalFilePath, hexCodesString);
  } catch (error) {
    console.error("Error during login and search:", error);
  } finally {
    await browser.close();
  }
}

// Function to handle user input and initiate search
async function loginAndSearch() {
  try {
    const Link = await getSearchLink();
    const duration = await getScrollDuration();
    if (!Link) {
      throw new Error("Please provide a search link.");
    }

    await launchBrowserAndSearch(Link, duration);
  } catch (error) {
    console.error("Error during login and search:", error);
  }
}

// Run the script
loginAndSearch();
