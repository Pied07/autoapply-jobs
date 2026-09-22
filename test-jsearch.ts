import * as fs from "fs";

function loadEnv() {
  const env = fs.readFileSync(".env.local", "utf8");
  for (let line of env.split("\\n")) {
    line = line.trim();
    if (line.startsWith("RAPIDAPI_KEY=")) {
      process.env.RAPIDAPI_KEY = line.split("=")[1];
    }
  }
}

async function run() {
  loadEnv();
  const apiKey = process.env.RAPIDAPI_KEY;
  console.log("Key starts with:", apiKey?.substring(0, 5));
  
  const url = "https://jsearch.p.rapidapi.com/search?query=Python%20developer%20in%20India&page=1&num_pages=1";
  
  const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey!,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      }
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body length:", text.length);
  console.log("Body:", text.substring(0, 200));
}

run();
