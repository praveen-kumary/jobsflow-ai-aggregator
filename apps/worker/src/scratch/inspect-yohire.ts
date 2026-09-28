import * as cheerio from "cheerio";
import { USER_AGENT } from "../utils/user-agent";

async function main() {
  const dRes = await fetch(
    "https://yohire.in/job/linkedin-software-engineering-intern-india-internship-2026",
    { headers: { "User-Agent": USER_AGENT } }
  );
  const dHtml = await dRes.text();
  const $ = cheerio.load(dHtml);

  // Print all links
  $("a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if (href.includes("http") && !href.includes("yohire")) {
      console.log("External link:", text, "->", href);
    }
  });

  // Extract structured text
  const title = $("h1").last().text().trim();
  console.log("\nTitle:", title);

  // Check script tags for JSON-LD schema
  $('script[type="application/ld+json"]').each((_, el) => {
    console.log("\nJSON-LD Schema:", $(el).html());
  });
}

main().catch(console.error);
