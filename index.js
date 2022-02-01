const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const sheets = require("./parse_to_sheets");

async function launch() {
  var data = "";
  var baseUrl = "https://authors.curseforge.com/store/transactions-ajax/";
  // Not launching in headless as cloudfare is triggered in headless
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  var loggedIn = false;
  var cookie_path = "./credentials/cookies.json";
  // If cookie not found then prompt the user to login to twitch and save the cookies.
  while (!loggedIn) {
    try {
      await fs.access(cookie_path);
      loggedIn = true;
    } catch (e) {}
    if (!loggedIn) {
      await page.goto(baseUrl + "0-1000-2");
      await page.waitForSelector(".ec-featured-sites", { timeout: 300000 });
      const cookies = await page.cookies();
      await fs.writeFile(cookie_path, JSON.stringify(cookies, null, 2));
    }
  }
  const cookiesString = await fs.readFile(cookie_path);
  await page.setCookie(...JSON.parse(cookiesString));
  for (var i = 0; ; i = i + 1000) {
    var url = baseUrl + i + "-" + (i + 1000) + "-2";
    console.log("Visiting URL : " + url);
    await page.goto(url);
    const extractedText = await page.$eval("*", (el) => el.innerText);
    if (extractedText && data != "") data += "\n";
    data += extractedText;
    if (extractedText == "") break;
  }
  // Save the data and also upload to google sheets
  fs.writeFile("./data/curse_point.txt", data);
  browser.close();
  sheets.parseAndUpload(data);
}
launch();
