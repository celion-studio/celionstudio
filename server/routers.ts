import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getProductsByUserId,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  countProductsByUserId,
  getAutomationsByUserId,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  countActiveAutomationsByUserId,
  getDmLogsByUserId,
  getDmStatsByUserId,
  getUserMonthlyDmCount,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { marked } from "marked";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Dashboard ──
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const [productCount, activeAutomationCount, dmStats, dmUsage] = await Promise.all([
        countProductsByUserId(userId),
        countActiveAutomationsByUserId(userId),
        getDmStatsByUserId(userId),
        getUserMonthlyDmCount(userId),
      ]);

      return {
        productCount,
        activeAutomationCount,
        monthlyDmCount: dmUsage.monthlyDmCount,
        totalDmCount: dmStats.total,
        successDmCount: dmStats.success,
        failedDmCount: dmStats.failed,
        subscriptionStatus: ctx.user.subscriptionStatus ?? "free",
      };
    }),
  }),

  // ── Products ──
  products: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getProductsByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const product = await getProductById(input.id, ctx.user.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        return product;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          contentMarkdown: z.string().optional(),
          externalCheckoutUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Free plan: max 3 products
        if (ctx.user.subscriptionStatus !== "pro") {
          const count = await countProductsByUserId(ctx.user.id);
          if (count >= 3) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Free plan allows up to 3 products. Upgrade to Pro for unlimited products.",
            });
          }
        }
        return createProduct({
          userId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          contentMarkdown: input.contentMarkdown ?? null,
          externalCheckoutUrl: input.externalCheckoutUrl ?? null,
          fileUrl: null,
          status: "draft",
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          contentMarkdown: z.string().optional(),
          externalCheckoutUrl: z.string().optional(),
          status: z.enum(["draft", "published"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateProduct(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteProduct(input.id, ctx.user.id);
        return { success: true };
      }),

    uploadPdf: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileBase64: z.string(),
          productId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `products/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, "application/pdf");

        if (input.productId) {
          await updateProduct(input.productId, ctx.user.id, { fileUrl: url });
        }

        return { fileUrl: url };
      }),

    convertToPdf: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const product = await getProductById(input.id, ctx.user.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        if (!product.contentMarkdown) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No markdown content to convert" });
        }

        // Convert markdown to HTML using marked
        const markdownHtml = await marked(product.contentMarkdown);

        // Build a well-styled HTML document for PDF-like viewing
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${product.title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 60px 40px; line-height: 1.8; color: #1a1a1a; background: #fff; }
h1 { font-size: 2.2em; font-weight: 700; margin-bottom: 0.5em; color: #111; border-bottom: 3px solid #7c3aed; padding-bottom: 0.3em; }
h2 { font-size: 1.6em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; color: #222; }
h3 { font-size: 1.3em; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.4em; color: #333; }
p { margin-bottom: 1em; }
ul, ol { margin-bottom: 1em; padding-left: 1.5em; }
li { margin-bottom: 0.3em; }
blockquote { border-left: 4px solid #7c3aed; padding: 0.5em 1em; margin: 1em 0; background: #f9f5ff; color: #4a4a4a; }
code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
pre { background: #1e1e2e; color: #cdd6f4; padding: 1em; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
pre code { background: none; color: inherit; padding: 0; }
img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
a { color: #7c3aed; text-decoration: none; }
a:hover { text-decoration: underline; }
.footer { margin-top: 3em; padding-top: 1em; border-top: 1px solid #e5e5e5; text-align: center; font-size: 0.85em; color: #888; }
</style>
</head>
<body>
<h1>${product.title}</h1>
${markdownHtml}
<div class="footer">Created with SellMate</div>
</body>
</html>`;

        const fileKey = `products/${ctx.user.id}/${nanoid()}-${product.title.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
        const { url } = await storagePut(fileKey, Buffer.from(htmlContent), "text/html");

        await updateProduct(input.id, ctx.user.id, { fileUrl: url, status: "published" });
        return { fileUrl: url };
      }),
  }),

  // ── Automations ──
  automations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAutomationsByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const automation = await getAutomationById(input.id, ctx.user.id);
        if (!automation) throw new TRPCError({ code: "NOT_FOUND", message: "Automation not found" });
        return automation;
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          igMediaId: z.string().nullable().optional(),
          triggerKeywords: z.array(z.string()),
          dmTemplate: z.string().min(1),
          productId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Free plan: max 3 automations
        if (ctx.user.subscriptionStatus !== "pro") {
          const count = await countActiveAutomationsByUserId(ctx.user.id);
          if (count >= 3) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Free plan allows up to 3 automations. Upgrade to Pro for unlimited.",
            });
          }
        }
        return createAutomation({
          userId: ctx.user.id,
          name: input.name,
          igMediaId: input.igMediaId ?? null,
          triggerKeywords: input.triggerKeywords,
          dmTemplate: input.dmTemplate,
          productId: input.productId ?? null,
          isActive: true,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          igMediaId: z.string().nullable().optional(),
          triggerKeywords: z.array(z.string()).optional(),
          dmTemplate: z.string().min(1).optional(),
          productId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateAutomation(id, ctx.user.id, data);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await updateAutomation(input.id, ctx.user.id, { isActive: input.isActive });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAutomation(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── DM Logs ──
  dmLogs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getDmLogsByUserId(ctx.user.id);
    }),
  }),

  // ── Billing (Polar) ──
  billing: router({
    createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
      const polarApiKey = process.env.POLAR_API_KEY;
      const polarProductId = process.env.POLAR_PRO_PRODUCT_ID;

      if (!polarApiKey || !polarProductId) {
        return {
          checkoutUrl: null,
          message: "Polar checkout integration requires POLAR_API_KEY and POLAR_PRO_PRODUCT_ID environment variables. Set them in Settings > Secrets.",
        };
      }

      try {
        const response = await fetch("https://api.polar.sh/v1/checkouts/custom", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${polarApiKey}`,
          },
          body: JSON.stringify({
            product_id: polarProductId,
            customer_email: ctx.user.email,
            success_url: `${process.env.APP_URL || ""}/dashboard?checkout=success`,
            metadata: {
              user_id: String(ctx.user.id),
              open_id: ctx.user.openId,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Polar] Checkout creation failed:", errorText);
          return {
            checkoutUrl: null,
            message: `Polar API error: ${response.status}`,
          };
        }

        const data = await response.json() as any;
        return {
          checkoutUrl: data.url || null,
          message: data.url ? "Checkout created" : "No checkout URL returned",
        };
      } catch (error: any) {
        console.error("[Polar] Checkout error:", error);
        return {
          checkoutUrl: null,
          message: `Failed to create checkout: ${error.message}`,
        };
      }
    }),

    manageSubscription: protectedProcedure.mutation(async ({ ctx }) => {
      const polarApiKey = process.env.POLAR_API_KEY;

      if (!polarApiKey) {
        return {
          portalUrl: null,
          message: "Polar customer portal requires POLAR_API_KEY. Set it in Settings > Secrets.",
        };
      }

      try {
        const response = await fetch("https://api.polar.sh/v1/customer-sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${polarApiKey}`,
          },
          body: JSON.stringify({
            customer_email: ctx.user.email,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Polar] Customer session error:", errorText);
          return {
            portalUrl: null,
            message: `Polar API error: ${response.status}`,
          };
        }

        const data = await response.json() as any;
        return {
          portalUrl: data.customer_portal_url || null,
          message: data.customer_portal_url ? "Portal session created" : "No portal URL returned",
        };
      } catch (error: any) {
        console.error("[Polar] Portal error:", error);
        return {
          portalUrl: null,
          message: `Failed to create portal session: ${error.message}`,
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
