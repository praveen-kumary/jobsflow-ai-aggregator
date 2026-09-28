/**
 * Instagram Poster
 * 
 * Uses Meta Graph API (two-step: create media container → publish).
 * Requires Instagram Business/Creator account + Meta App review.
 */

import { prisma } from "@repo/db";

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || "";
const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID || "";
const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Post an image to Instagram using the Graph API.
 * The image must be accessible via a public URL (not a local path).
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string
): Promise<{ ok: boolean; mediaId?: string; error?: string }> {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ID) {
    return { ok: false, error: "INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ID not configured" };
  }

  try {
    // Step 1: Create media container
    const createRes = await fetch(
      `${GRAPH_API_BASE}/${INSTAGRAM_BUSINESS_ID}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    );

    const createData = await createRes.json();
    if (createData.error) {
      return { ok: false, error: createData.error.message };
    }

    const creationId = createData.id;

    // Step 2: Wait for container to be ready (poll)
    let ready = false;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(
        `${GRAPH_API_BASE}/${creationId}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`
      );
      const statusData = await statusRes.json();
      if (statusData.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (statusData.status_code === "ERROR") {
        return { ok: false, error: "Instagram container processing failed" };
      }
    }

    if (!ready) {
      return { ok: false, error: "Instagram container processing timed out" };
    }

    // Step 3: Publish
    const publishRes = await fetch(
      `${GRAPH_API_BASE}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    );

    const publishData = await publishRes.json();
    if (publishData.error) {
      return { ok: false, error: publishData.error.message };
    }

    return { ok: true, mediaId: publishData.id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send a pending SocialPost to Instagram.
 */
export async function sendSocialPostToInstagram(
  socialPostId: string
): Promise<{ ok: boolean; error?: string }> {
  const post = await prisma.socialPost.findUnique({
    where: { id: socialPostId },
    include: { job: true },
  });

  if (!post) return { ok: false, error: "Social post not found" };
  if (post.platform !== "instagram") return { ok: false, error: "Not an Instagram post" };
  if (!post.imageUrl) return { ok: false, error: "No image URL — Instagram requires a public URL" };

  // Instagram needs the image hosted at a public URL (not a local path)
  // In production, you'd upload to Vercel Blob/R2 first
  if (post.imageUrl.startsWith("/") || post.imageUrl.startsWith("D:") || post.imageUrl.startsWith("C:")) {
    return { ok: false, error: "Image must be at a public URL for Instagram. Upload to blob storage first." };
  }

  console.log(`📸 Posting to Instagram: ${post.job.company} — ${post.job.role}`);

  const result = await postToInstagram(post.imageUrl, post.caption);

  if (result.ok) {
    await prisma.socialPost.update({
      where: { id: socialPostId },
      data: { status: "posted", postedAt: new Date() },
    });
    console.log(`  ✅ Posted! Media ID: ${result.mediaId}`);
  } else {
    await prisma.socialPost.update({
      where: { id: socialPostId },
      data: { status: "failed", errorMsg: result.error },
    });
    console.log(`  ❌ Failed: ${result.error}`);
  }

  return result;
}
