# Twitter Scrapper with Puppeteer

This script utilizes Puppeteer, a Node library for controlling headless Chrome or Chromium, to extract tweets based on user-defined search queries from Twitter.

## Overview

The script uses Puppeteer to navigate to Twitter, log in using stored cookies, perform a user-defined search, and extract tweets matching the query. It scrolls through the search results for a specified duration, extracting unique hexadecimal codes from the tweets.

## Prerequisites

- **Node.js**: Ensure Node.js is installed.
- **npm Packages**: Install necessary packages using `npm install`.

## Setup

1. **Authentication**: Login to Twitter manually and save your session cookies in a file named `auth.json`.
2. **Install Dependencies**: Run `npm install` to install required packages.

## Usage

1. Run the script: `node script.js`
2. Enter the search query prompt when prompted.
3. Input the scrolling duration in minutes when prompted.
4. The script will open a browser, perform the search, scroll through results, and extract unique hexadecimal codes from tweets.
5. Extracted codes will be saved in a file within the `./betcodes` directory, named based on the date and time of extraction.

## Important Notes

- **Manual Authentication**: Ensure `auth.json` containing your Twitter session cookies is present in the script directory.
- **Headless Mode**: By default, the script launches a visible browser (`headless: false`). Modify this setting in `puppeteer.launch` to run in headless mode if required.
- **Further Actions**: Additional actions can be added within the script after the tweet extraction phase.

## Script Details

- `extractTextFromElement`: Function to extract text content from an HTML element.
- `extractAllTweets`: Function to extract all tweets based on provided selectors.
- `setCookies`: Function to set cookies in the Puppeteer page.
- `getSearchLink`: Prompt-based function to get the search query from the user.
- `getScrollDuration`: Prompt-based function to get the scrolling duration in minutes.
- `launchBrowserAndSearch`: Main function orchestrating the browser launch, authentication, search, scrolling, and code extraction.
- `loginAndSearch`: Wrapper function to execute the entire process.

## License

This script is licensed under [MIT License](LICENSE).
