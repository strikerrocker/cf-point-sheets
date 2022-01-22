const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const sheets = require("./parse_to_sheets");

async function launch() {
  var data = "";
  // If you have more transaction history then read uncomment the below lines
  var urls = [
    "https://authors.curseforge.com/store/transactions-ajax/0-1000-2",
    "https://authors.curseforge.com/store/transactions-ajax/1000-2000-2",
    // "https://authors.curseforge.com/store/transactions-ajax/2000-3000-2",
    // "https://authors.curseforge.com/store/transactions-ajax/3000-4000-2",
  ];
  // Not launching chromium in headless as cloudfare is triggered in headless
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  var login = false;
  var cookie_path = "./credentials/cookies.json";
  try {
    await fs.access(cookie_path);
  } catch (err) {
    login = true;
  }
  if (!login) {
    const cookiesString = await fs.readFile(cookie_path);
    await page.setCookie(...JSON.parse(cookiesString));
    for (var url of urls) {
      console.log("Visiting URL : "+url)
      await page.goto(url);
      const extractedText = await page.$eval("*", (el) => el.innerText);
      if (extractedText && data != "") data += "\n";
      data += extractedText;
    }
    // Save the data and also upload to google sheets
    fs.writeFile("./data/curse_point.txt", data);
    browser.close();
    sheets.parseAndUpload(data);
  } else {
    // If cookie not found then prompt the user to login to twitch and save the cookies.
    await page.goto(urls[0]);
    await page.waitForSelector(".ec-featured-sites", { timeout: 300000 });
    const cookies = await page.cookies();
    await fs.writeFile(cookie_path, JSON.stringify(cookies, null, 2));
    browser.close();
  }
}
launch();
