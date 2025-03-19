const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const prompt = require("prompt");

prompt.start();

async function extractTextFromElement(element) {
  const text = await element.evaluate((el) => el.textContent);
  return text.trim();
}

async function extractAllTweets(page, selector) {
  const tweets = [];

  const tweetElements = await page.$$(selector);

  for (const tweetElement of tweetElements) {
    const tweetText = await extractTextFromElement(tweetElement);
    tweets.push(tweetText);
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

    const authFile = "auth.json";
    try {
      await fs.access(authFile);
    } catch (error) {
      throw new Error(
        "auth.json not found. Please login manually to obtain cookies."
      );
    }

    const cookies = JSON.parse(await fs.readFile(authFile, "utf8"));

    await page.goto(
      `https://twitter.com/search?q=${link}&src=typed_query&f=live`,
      { waitUntil: "domcontentloaded" }
    );

    await setCookies(page, cookies);

    console.log(`Search results for "${link}" displayed.`);

    const remainingTime = duration / 1000;
    let counter = remainingTime;
    let hexCounter = 0;
    const hexSet = new Set();

    const scrollInterval = setInterval(async () => {
      await page.waitForTimeout(5000); // Wait for 5 seconds

      page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      const tweetElements = await page.$$('div[data-testid="tweetText"]');
      const tweetTexts = await Promise.all(
        tweetElements.map((element) =>
          element.evaluate((node) => node.innerText)
        )
      );

      for (const tweetText of tweetTexts) {
        const hexNumbers = tweetText.match(/\b(?:[0-9a-fA-F]{7,8})\b/g);

        if (hexNumbers) {
          hexSet.add(...hexNumbers);
        }
      }

      hexCounter = Array.from(hexSet).length;
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(
        `Time remaining: ${counter} seconds | Codes Fetched: ${hexCounter}\r`
      );

      counter--;
    }, 1000);

    await new Promise((resolve) => setTimeout(resolve, duration));

    clearInterval(scrollInterval);
    allHexSet.add(...hexSet);

    console.log(`\nScrolling completed for "${link}".`);

    const folderPath = "./betcodes";
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
    const fileName = `${folderPath}/betcodes_${dateStamp}_${timestamp}.txt`;
    await fs.writeFile(fileName, hexCodesString);

    console.log(
      `\nScrolling completed. Hexadecimal codes saved to ${fileName}.`
    );
  } catch (error) {
    console.error("Error during login and search:", error);
  } finally {
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

    const searches = links.map((link) =>
      launchBrowserAndSearch(link, duration)
    );

    await Promise.all(searches);
  } catch (error) {
    console.error("Error during login and search:", error);
  }
}

loginAndSearch();
