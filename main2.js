const puppeteer = require("puppeteer");
const fs = require("fs").promises; // Use fs.promises for async fs operations
const prompt = require("prompt");

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

async function setCookies(page, cookies) {
  await page.setCookie(...cookies);
  await page.waitForTimeout(1000);
}

async function getSearchLinks() {
  return new Promise((resolve, reject) => {
    prompt.get(
      [
        {
          name: "Links",
          description: "Enter your search queries separated by commas",
          type: "string",
          required: true,
          message: "Queries are required",
        },
      ],
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          const links = result.Links.split(",").map((link) => link.trim());
          resolve(links);
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

async function launchBrowserAndSearch(link, duration) {
  const browser = await puppeteer.launch({ headless: false });
  const allHexSet = new Set();

  try {
    const page = await browser.newPage();

    // Check if auth.json file exists
    const authFile = "auth.json";
    try {
      await fs.access(authFile); // Use fs.access for existence check
    } catch (error) {
      throw new Error(
        "auth.json not found. Please log in manually to obtain cookies."
      );
    }

    // Read cookies from auth.json
    const cookies = JSON.parse(await fs.readFile(authFile, "utf8"));

    // Navigate to Twitter before setting cookies
    await page.goto(
      `https://twitter.com/search?q=${link}&src=typeahead_click&f=live`,
      { waitUntil: "domcontentloaded" }
    );

    // Set cookies
    await setCookies(page, cookies);

    console.log(`Search results for "${link}" displayed.`);

    const remainingTime = duration / 1000;
    let counter = remainingTime;
    let hexCounter = 0; // Counter for hexadecimal codes
    const hexSet = new Set();

    const tweets = await extractAllTweets(page, [
      "span.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0",
      'div[data-testid="tweetText"]',
    ]);

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
          hexCounter = Array.from(hexSet).length;
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(
            `Time remaining: ${counter} seconds | Codes Fetched: ${hexCounter} for "${link}"\r`
          );
        }
      }

      counter--;
    }, 1000); // Scroll every second

    // Wait for the specified duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Clear the interval to stop scrolling
    clearInterval(scrollInterval);
    allHexSet.add(...hexSet); // Add current set to the accumulated set

    console.log(`\nScrolling completed for "${link}".`);

    // Specify the folder path
    const folderPath = "./betcodes"; // Update this with your desired folder path

    // Ensure the folder exists, create it if it doesn't
    try {
      await fs.mkdir(folderPath);
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }

    const uniqueHexCodes = Array.from(hexSet);
    const hexCodesString = uniqueHexCodes.join("\n");

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
    const fileName = `${folderPath}/betcodes_${dateStamp}_${timestamp}_${link}.txt`;
    await fs.writeFile(fileName, hexCodesString);

    console.log(
      `\nScrolling completed. Hexadecimal codes saved to ${fileName}.`
    );
  } catch (error) {
    console.error("Error during login and search:", error);
  } finally {
    // Close the Puppeteer browser
    await browser.close();
  }
}

async function loginAndSearch() {
  try {
    const links = await getSearchLinks();
    const duration = await getScrollDuration();

    if (!links || links.length === 0) {
      throw new Error("Please provide at least one search query.");
    }

    // Now that you have the links, launch the browser and search
    const searches = links.map((link) =>
      launchBrowserAndSearch(link, duration)
    );

    await Promise.all(searches);
  } catch (error) {
    console.error("Error during login and search:", error);
  }
}

// Run the script
loginAndSearch();
