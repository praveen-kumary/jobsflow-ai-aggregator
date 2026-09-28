/**
 * Telegram Poster
 * 
 * Sends job images + captions to a Telegram channel via Bot API.
 * No library dependency — uses raw HTTP fetch to keep it simple.
 */

import fs from "fs";
import { prisma } from "@repo/db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "";

/**
 * Send a photo with caption to the configured Telegram channel.
 */
export async function sendTelegramPhoto(
  imagePath: string,
  caption: string,
  parseMode: "Markdown" | "HTML" = "Markdown"
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured" };
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

  // Build multipart form data
  const formData = new FormData();
  formData.append("chat_id", TELEGRAM_CHANNEL_ID);
  formData.append("caption", caption);
  formData.append("parse_mode", parseMode);

  // Read image file and append as blob
  const imageBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([imageBuffer], { type: "image/png" });
  formData.append("photo", blob, "job-image.png");

  try {
    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json();

    if (data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    } else {
      return { ok: false, error: data.description || "Unknown Telegram error" };
    }
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send a pending SocialPost to Telegram.
 */
export async function sendSocialPostToTelegram(
  socialPostId: string
): Promise<{ ok: boolean; error?: string }> {
  const post = await prisma.socialPost.findUnique({
    where: { id: socialPostId },
    include: { job: true },
  });

  if (!post) return { ok: false, error: "Social post not found" };
  if (post.platform !== "telegram") return { ok: false, error: "Not a Telegram post" };
  if (!post.imageUrl) return { ok: false, error: "No image URL" };

  console.log(`📨 Sending to Telegram: ${post.job.company} — ${post.job.role}`);

  const result = await sendTelegramPhoto(post.imageUrl, post.caption);

  if (result.ok) {
    await prisma.socialPost.update({
      where: { id: socialPostId },
      data: { status: "posted", postedAt: new Date() },
    });
    console.log(`  ✅ Posted! Message ID: ${result.messageId}`);
  } else {
    await prisma.socialPost.update({
      where: { id: socialPostId },
      data: { status: "failed", errorMsg: result.error },
    });
    console.log(`  ❌ Failed: ${result.error}`);
  }

  return result;
}
