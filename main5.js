const puppeteer = require("puppeteer");
const fs = require("fs");
const prompt = require("prompt");
const path = require("path");

prompt.start();

async function extractTextFromElement(element) {
  const text = await element.evaluate((el) => el.textContent);
  return text.trim();
}

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

// Function to set cookies
async function setCookies(page, cookies) {
  await page.setCookie(...cookies);
  // Wait for a short period to ensure cookies are set
  await page.waitForTimeout(1000);
}

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

async function appendToGeneralFile(generalFilePath, hexCodesString) {
  try {
    // Check if the general file exists
    if (fs.existsSync(generalFilePath)) {
      // Read existing codes from the general file
      const existingCodes = await fs.promises.readFile(generalFilePath, "utf8");

      // Convert existing codes to a Set
      const existingCodesSet = new Set(existingCodes.trim().split("\n"));

      // Remove duplicates from the new bet codes
      const newCodes = hexCodesString
        .trim()
        .split("\n")
        .filter((code) => !existingCodesSet.has(code));

      if (newCodes.length > 0) {
        // Append three lines spacing before adding new codes
        const updatedCodesString = `${existingCodes.trim()}\n\n\n\n${newCodes.join(
          "\n"
        )}`;

        // Write the updated codes back to the general file
        await fs.promises.writeFile(generalFilePath, updatedCodesString);

        console.log(`Codes appended to ${generalFilePath}.`);
      } else {
        console.log("No new codes to append (duplicates detected).");
      }
    } else {
      // If the general file doesn't exist, create a new one
      await fs.promises.mkdir(path.dirname(generalFilePath), {
        recursive: true,
      });
      await fs.promises.writeFile(generalFilePath, hexCodesString);

      console.log(`Codes written to ${generalFilePath}.`);
    }
  } catch (error) {
    console.error("Error appending codes to general file:", error);
  }
}

async function saveDataBeforeExit(browser, generalFilePath, hexSet) {
  try {
    const existingGeneralCodes = fs.existsSync(generalFilePath)
      ? await fs.promises.readFile(generalFilePath, "utf8")
      : "";

    const generalCodesSet = new Set(existingGeneralCodes.trim().split("\n"));

    hexSet.forEach((code) => generalCodesSet.add(code));

    const updatedCodesString = Array.from(generalCodesSet).join("\n");

    await fs.promises.writeFile(generalFilePath, updatedCodesString);

    console.log(`Codes saved to ${generalFilePath}.`);
  } catch (error) {
    console.error("Error saving codes before exit:", error);
  } finally {
    // Close the Puppeteer browser
    await browser.close();
  }
}

async function launchBrowserAndSearch(Link, duration) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  let hexSet = new Set();

  const timestamp = new Date()
    .toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/:/g, "_");
  const dateStamp = new Date()
    .toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "_");

  try {
    // Check if auth.json file exists
    const authFile = "auth.json";
    if (!fs.existsSync(authFile)) {
      throw new Error(
        "auth.json not found. Please login manually to obtain cookies."
      );
    }

    // Read cookies from auth.json
    const cookies = JSON.parse(fs.readFileSync(authFile, "utf8"));

    // Navigate to Twitter before setting cookies
    await page.goto("https://twitter.com", { waitUntil: "domcontentloaded" });

    // Set cookies
    await setCookies(page, cookies);

    // Navigate directly to the Twitter search page with the user input link
    await page.goto(
      `https://twitter.com/search?q=${Link}&src=typeahead_click&f=live`,
      { waitUntil: "domcontentloaded" }
    );

    console.log(`Search results for "${Link}" displayed.`);

    const remainingTime = duration / 1000;
    let counter = remainingTime;
    let hexCounter = 0;
    const generalFilePath = `./betcodes/betcodes_general_${dateStamp}.txt`;

    // Load existing codes from the general file into generalCodesSet
    const existingGeneralCodes = fs.existsSync(generalFilePath)
      ? await fs.promises.readFile(generalFilePath, "utf8")
      : "";

    const generalCodesSet = new Set(existingGeneralCodes.trim().split("\n"));

    const tweets = await extractAllTweets(page, [
      "span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0",
      'div[data-testid="tweetText"]',
    ]);
    const hexSet = new Set();

    // Scroll down for the specified duration
    const scrollInterval = setInterval(async () => {
      page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      // Extract tweets and add them to the array
      const tweetElements = await page.$$('div[data-testid="tweetText"]');
      const tweetTexts = await Promise.all(
        tweetElements.map((element) =>
          element.evaluate((node) => node.innerText)
        )
      );
      for (const tweetText of tweetTexts) {
        // Use a regular expression to find hexadecimal numbers
        const hexNumbers = tweetText.match(/\b(?:[0-9a-fA-F]{7,8})\b/g);

        if (hexNumbers) {
          // Add the found hexadecimal numbers to the Set
          hexSet.add(...hexNumbers);
        }
      }

      hexCounter = Array.from(hexSet).length;

      hexSet.forEach((code) => generalCodesSet.add(code));
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(
        `Time remaining: ${counter} seconds | General Codes: ${generalCodesSet.size} | Codes Fetched: ${hexCounter}\r`
      );

      counter--;
    }, 1000); // Scroll every second

    // Wait for the specified duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Clear the interval to stop scrolling
    clearInterval(scrollInterval);

    const folderPath = "./betcodes";
    try {
      await fs.promises.mkdir(folderPath, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }

    const uniqueHexCodes = Array.from(hexSet);
    const hexCodesString = uniqueHexCodes.join("\n");

    const fileName = `${folderPath}/betcodes_${dateStamp}_${timestamp}.txt`;
    await fs.promises.writeFile(fileName, hexCodesString);
    console.log(
      `Unique Hexadecimal codes successfully written to ${fileName}.`
    );

    // Append codes to the general file
    await appendToGeneralFile(generalFilePath, hexCodesString);

    // You can perform further actions with the search results here
  } catch (error) {
    console.error("Error during login and search:", error);
  } finally {
    // Save data before exiting
    await saveDataBeforeExit(browser, generalFilePath, hexSet);
  }
}

async function loginAndSearch() {
  try {
    const Link = await getSearchLink();
    const duration = await getScrollDuration();

    if (!Link) {
      throw new Error("Please provide a search link.");
    }

    // Now that you have the link, launch the browser and search
    await launchBrowserAndSearch(Link, duration);
  } catch (error) {
    console.error("Error during login and search:", error);
  }
}

// Run the script
loginAndSearch();
