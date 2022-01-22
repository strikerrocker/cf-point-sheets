const puppeteer = require("puppeteer");
const edgePaths = require("edge-paths");
const fs = require("fs").promises;
const sheets = require("./parse_to_sheets");
const { file } = require("googleapis/build/src/apis/file");

const EDGE_PATH = edgePaths.getEdgePath();

async function launch() {
  var data = "";
  var urls = [
    "https://authors.curseforge.com/store/transactions-ajax/0-1000-2",
    "https://authors.curseforge.com/store/transactions-ajax/1000-2000-2",
    // "https://authors.curseforge.com/store/transactions-ajax/2000-3000-2",
    // "https://authors.curseforge.com/store/transactions-ajax/3000-4000-2",
  ];
  const browser = await puppeteer.launch({
    headless: false,
    //executablePath:EDGE_PATH
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
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    for (var url of urls) {
      console.log("Visiting URL : "+url)
      await page.goto(url);
      // await page.waitForNavigation()
      //await page.screenshot({path:"test.png"})
      const extractedText = await page.$eval("*", (el) => el.innerText);
      if (extractedText && data != "") data += "\n";
      data += extractedText;
    }
    fs.writeFile("./data/curse_point.txt", data);
    browser.close();
    sheets.parseAndUpload(data);
  } else {
    await page.goto(urls[0]);
    await page.waitForSelector(".ec-featured-sites", { timeout: 300000 });
    const cookies = await page.cookies();
    await fs.writeFile(cookie_path, JSON.stringify(cookies, null, 2));
    browser.close();
  }
}
launch();
