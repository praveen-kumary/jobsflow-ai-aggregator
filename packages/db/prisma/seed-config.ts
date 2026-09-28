import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const defaults: [string, string][] = [
  ["ads_enabled", "false"],
  ["auto_ads_enabled", "false"],
  ["adsense_pub_id", ""],
  ["ad_slot_top", ""],
  ["ad_slot_inline1", ""],
  ["ad_slot_inline2", ""],
  ["ad_slot_sidebar", ""],
  ["ad_slot_sidebar2", ""],
  ["ad_slot_anchor", ""],
  ["telegram_url", ""],
  ["whatsapp_url", ""],
];

async function main() {
  for (const [key, value] of defaults) {
    await p.siteConfig.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
  console.log(`✅ Seeded ${defaults.length} config keys`);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
