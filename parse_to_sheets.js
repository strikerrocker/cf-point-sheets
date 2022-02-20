const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "./credentials/token.json";
function parseTextAndUpload() {
  fs.readFile("./data/curse_point.txt", "utf8", async (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    parseAndUpload(data);
  });
}
function parseAndUpload(data) {
  // Get credentials by creating new project and then adding google sheets api
  // with full drive scope and save credential in /credentials/credentials.json
  fs.readFile("./credentials/credentials.json", async (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), saveCFPoints, data);
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 */
function authorize(credentials, callback, data) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    var tokenJSON = JSON.parse(token);
    var dateDiff = new Date(tokenJSON.expiry_date) - new Date();
    if (err || dateDiff < 0) return getNewToken(oAuth2Client, callback, data);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, data);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * Dont forget to add your email id to test users in OAuth2 screen.
 */
function getNewToken(oAuth2Client, callback, data) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err)
        return console.error(
          "Error while trying to retrieve access token",
          err
        );
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client, data);
    });
  });
}

async function saveCFPoints(auth, data) {
  // Get the spreadsheet id from the URL when open
  const spreadsheet_id = "1HtQhR3bMqUcHnrgPXKnFR7EG8IFcAP3waY8Jehmxrew";
  const sheets = google.sheets({ version: "v4", auth });
  const sheet_id = 1866365031;
  var output = "";
  // Use this to get the sheet id you wish to enter your data into and enter it in the variable below
  sheets.spreadsheets.get(
    { spreadsheetId: spreadsheet_id, fields: "sheets.properties" },
    (err, res) => {
      var exists = false;
      console.table(
        res.data.sheets.map((data) => {
          return {
            Title: data.properties.title,
            "Sheet ID": data.properties.sheetId,
          };
        })
      );
      for (data of res.data.sheets)
        if (data.properties.sheetId == sheet_id) exists = true;
      if (!exists) {
        console.error("Sheet ID doesn't exists in the given spreadsheet");
        process.exit(0);
      }
    }
  );

  var dates = [];
  var projects = [];
  var total = new Map();
  var date;
  var temp = new Map();

  //Parses data
  data.split("\n").forEach((line) => {
    if (line != undefined) {
      var data = line.trim().replace(",", "");
      if (!data.includes("points")) {
        //Dates
        if (date != undefined && date != data) {
          total.set(date, temp);
          temp = new Map();
        }
        date = data;
        if (!dates.includes(data)) dates.push(data);
      } else {
        var name;
        var points;
        if (data.includes("project(s)")) {
          //Total points for the day
          var totalPoints = data.substring(
            data.indexOf("awarded") + 7,
            data.indexOf("points")
          );
          name = "Total";
          points = totalPoints;
        } else {
          //Point for specific project
          name = data.substring(data.indexOf("for") + 4);
          points = data.substring(0, data.indexOf("points") - 1);
        }
        if (!projects.includes(name)) projects.push(name);
        temp.set(name, points);
      }
    }
  });
  if (date != undefined) {
    total.set(date, temp);
    temp = new Map();
  }
  // Project Details
  output += "Date,";
  projects.forEach((p) => {
    output += p + ",";
  });
  output += "\n";

  //Data
  dates.forEach((d) => {
    output += d + ",";
    projects.forEach((pro) => {
      if (total.get(d) == undefined) console.log(d);
      var p = total.get(d).get(pro);
      if (p != undefined) output += p + ",";
      else output += "0,";
    });
    output += "\n";
  });
  var csvContents = output;
  fs.writeFile("./data/curse_point.csv", csvContents, (err) => {
    if (err) console.log(err);
  });
  body = {
    requests: [
      {
        pasteData: {
          coordinate: {
            sheetId: sheet_id,
            rowIndex: 0,
            columnIndex: 0,
          },
          data: csvContents,
          type: "PASTE_NORMAL",
          delimiter: ",",
        },
      },
    ],
  };
  sheets.spreadsheets.batchUpdate(
    { spreadsheetId: spreadsheet_id },
    { body: JSON.stringify(body) },
    (err, res) => {
      if (err) console.log(err);
      if (res.status == 200) console.log("Successfully inserted data");
    }
  );
}

module.exports = {
  parseAndUpload: function (data) {
    parseAndUpload(data);
  },
};
