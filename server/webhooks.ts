import express from "express";
import { getDb } from "./db";
import { users, automations, dmLogs } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const DM_MONTHLY_LIMIT_FREE = 100;

/**
 * Register webhook routes on the Express app.
 * All webhook routes start with /api/ so the gateway can route correctly.
 */
export function registerWebhookRoutes(app: express.Express) {
  // ── Instagram Webhook Verification (GET) ──
  app.get("/api/webhooks/instagram", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.IG_WEBHOOK_VERIFY_TOKEN || "sellmate_verify";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[Instagram Webhook] Verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  });

  // ── Instagram Webhook Events (POST) ──
  app.post("/api/webhooks/instagram", async (req, res) => {
    try {
      const body = req.body;
      console.log("[Instagram Webhook] Received:", JSON.stringify(body).slice(0, 500));

      if (body.object === "instagram") {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === "comments") {
              await handleCommentWebhook(change.value);
            }
          }
        }
      }

      res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("[Instagram Webhook] Error:", error);
      res.status(200).send("EVENT_RECEIVED"); // Always 200 to prevent retries
    }
  });

  // ── Polar Webhook (POST) ──
  app.post("/api/webhooks/polar", async (req, res) => {
    try {
      const event = req.body;
      console.log("[Polar Webhook] Received:", event.type);

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      switch (event.type) {
        case "subscription.created":
        case "subscription.updated": {
          const subscription = event.data;
          const polarSubId = subscription.id;
          const status = subscription.status; // "active", "canceled", etc.
          const customerEmail = subscription.customer?.email;

          if (customerEmail) {
            const newStatus = status === "active" ? "pro" : "free";
            await db
              .update(users)
              .set({
                subscriptionStatus: newStatus as "free" | "pro",
                polarSubscriptionId: polarSubId,
              })
              .where(eq(users.email, customerEmail));
            console.log(`[Polar Webhook] Updated user ${customerEmail} to ${newStatus}`);
          }
          break;
        }

        case "subscription.canceled":
        case "subscription.revoked": {
          const subscription = event.data;
          const customerEmail = subscription.customer?.email;
          if (customerEmail) {
            await db
              .update(users)
              .set({ subscriptionStatus: "free", polarSubscriptionId: null })
              .where(eq(users.email, customerEmail));
            console.log(`[Polar Webhook] Downgraded user ${customerEmail} to free`);
          }
          break;
        }

        default:
          console.log(`[Polar Webhook] Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[Polar Webhook] Error:", error);
      res.status(200).json({ received: true });
    }
  });
}

/**
 * Handle an Instagram comment webhook event.
 * Matches comment text against automation trigger keywords and sends DMs.
 */
async function handleCommentWebhook(commentData: any) {
  const db = await getDb();
  if (!db) return;

  const {
    id: commentId,
    text: commentText,
    from: { id: senderId, username: senderName },
    media: { id: mediaId },
  } = commentData;

  if (!commentText || !senderId) return;

  const lowerText = commentText.toLowerCase().trim();

  // Find all active automations
  const allAutomations = await db
    .select()
    .from(automations)
    .where(eq(automations.isActive, true));

  for (const auto of allAutomations) {
    // Check if this automation applies to this media (or all media)
    if (auto.igMediaId && auto.igMediaId !== mediaId) continue;

    // Check keyword match
    const keywords = auto.triggerKeywords as string[];
    const matched = keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
    if (!matched) continue;

    // Check if we already sent a DM for this comment + automation
    const existingLog = await db
      .select()
      .from(dmLogs)
      .where(and(eq(dmLogs.igCommentId, commentId), eq(dmLogs.automationId, auto.id)))
      .limit(1);

    if (existingLog.length > 0) continue; // Already processed

    // Get the user who owns this automation
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, auto.userId))
      .limit(1);

    const user = userResult[0];
    if (!user) continue;

    // Check monthly DM limit for free users
    if (user.subscriptionStatus === "free") {
      // Reset monthly count if needed
      const now = new Date();
      const lastReset = user.lastDmResetAt;
      if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
        await db.update(users).set({ monthlyDmCount: 0, lastDmResetAt: now }).where(eq(users.id, user.id));
        user.monthlyDmCount = 0;
      }

      if (user.monthlyDmCount >= DM_MONTHLY_LIMIT_FREE) {
        await db.insert(dmLogs).values({
          userId: user.id,
          automationId: auto.id,
          igCommentId: commentId,
          igSenderId: senderId,
          status: "rate_limited",
          errorMessage: "Monthly DM limit reached (100/100). Upgrade to Pro.",
        });
        continue;
      }
    }

    // Build DM message
    let message = auto.dmTemplate;
    message = message.replace(/\{\{name\}\}/g, senderName || "there");

    // If linked to a product, insert the checkout URL
    if (auto.productId) {
      const productResult = await db
        .select()
        .from(await import("../drizzle/schema").then((m) => m.products))
        .where(eq((await import("../drizzle/schema").then((m) => m.products)).id, auto.productId))
        .limit(1);

      const product = productResult[0];
      if (product) {
        const link = product.externalCheckoutUrl || product.fileUrl || "";
        message = message.replace(/\{\{link\}\}/g, link);
      }
    }

    // Send DM via Instagram Graph API
    try {
      if (!user.igPageAccessToken) {
        await db.insert(dmLogs).values({
          userId: user.id,
          automationId: auto.id,
          igCommentId: commentId,
          igSenderId: senderId,
          status: "failed",
          errorMessage: "No Instagram access token configured",
        });
        continue;
      }

      const response = await fetch(
        `https://graph.instagram.com/v21.0/me/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.igPageAccessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: message },
          }),
        }
      );

      if (response.ok) {
        await db.insert(dmLogs).values({
          userId: user.id,
          automationId: auto.id,
          igCommentId: commentId,
          igSenderId: senderId,
          status: "success",
        });

        // Increment monthly count
        await db
          .update(users)
          .set({ monthlyDmCount: sql`${users.monthlyDmCount} + 1` })
          .where(eq(users.id, user.id));
      } else {
        const errorBody = await response.text();
        await db.insert(dmLogs).values({
          userId: user.id,
          automationId: auto.id,
          igCommentId: commentId,
          igSenderId: senderId,
          status: "failed",
          errorMessage: `Instagram API error: ${response.status} - ${errorBody.slice(0, 200)}`,
        });
      }
    } catch (error: any) {
      await db.insert(dmLogs).values({
        userId: user.id,
        automationId: auto.id,
        igCommentId: commentId,
        igSenderId: senderId,
        status: "failed",
        errorMessage: error.message?.slice(0, 200) || "Unknown error",
      });
    }
  }
}
