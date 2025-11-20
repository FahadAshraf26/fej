import type { NextApiRequest, NextApiResponse } from "next";
import { addDays } from "../../helpers/CommonFunctions";
import Stripe from "stripe";
import { supabase } from "@database/client.connection";
import { v4 as uuid } from "uuid";
import { sendMessage } from "@services/slackService";
import { supabaseServer } from "@database/server.connection";

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: "2022-11-15",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRequestBody(request: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", function (chunk: Buffer) {
      chunks.push(chunk);
    });

    request.on("end", function () {
      const bodyBuffer = Buffer.concat(chunks);
      resolve(bodyBuffer);
    });

    request.on("error", function (err) {
      reject(err);
    });
  });
}

const returnPhaseBasedOnPlan = (
  amount: number,
  paymentMethodId: string,
  trailTimestamp: number,
  nextBillingTimestamp: number
) => {
  switch (amount) {
    case 34900:
    case 39900:
      return [
        {
          items: [
            {
              price:
                amount === 34900 ? process.env.PRODUCT_PRICE_ID_2 : process.env.PRODUCT_PRICE_ID_3,
            },
          ],
          default_payment_method: paymentMethodId,
          trial_end: trailTimestamp,
        },
      ];
    default:
      return [
        {
          items: [
            {
              price: process.env.PRODUCT_PRICE_ID,
            },
          ],
          default_payment_method: paymentMethodId,
          trial_end: trailTimestamp,
          end_date: nextBillingTimestamp,
        },
        {
          items: [
            {
              price: process.env.PRODUCT_PRICE_ID,
            },
          ],
          billing_cycle_anchor: "phase_start",
          proration_behavior: "none",
        },
      ];
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    let event: Stripe.Event;
    const buf: any = await readRequestBody(req);
    try {
      const signature = req.headers["stripe-signature"];

      event = stripe.webhooks.constructEvent(
        buf,
        signature as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
      case "payment_intent.amount_capturable_updated": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.status === "requires_capture") {
          await stripe.paymentIntents.cancel(paymentIntent.id);
          const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentIntent.payment_method as string
          );
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("stripe_customer_id", paymentIntent.customer as string)
            .single();

          let nextBillingDate = addDays(28);
          let trailDate = addDays(
            paymentIntent.amount === 39900 ||
              paymentIntent.amount === 34900 ||
              paymentIntent.metadata.trialDays === "10"
              ? 10
              : 14
          );
          const nextBillingTimestamp = Math.floor(nextBillingDate.getTime() / 1000);
          const trailTimestamp = Math.floor(trailDate.getTime() / 1000);
          const phases: any = returnPhaseBasedOnPlan(
            paymentIntent.amount,
            paymentMethod.id,
            trailTimestamp,
            nextBillingTimestamp
          );

          if (profile !== null && profile.subscriptionActive !== true) {
            await stripe.subscriptionSchedules.create({
              customer: paymentIntent.customer as string,
              start_date: "now",
              end_behavior: "release",
              phases,
            });
            await supabase
              .from("profiles")
              .update({
                subscriptionActive: true,
              })
              .eq("stripe_customer_id", paymentIntent.customer as string);
          } else {
            await stripe.subscriptionSchedules.create({
              customer: paymentIntent.customer as string,
              start_date: "now",
              end_behavior: "release",
              phases,
            });
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        break;
      }
      case "customer.created": {
        const userId = uuid();
        const customer = event.data.object as Stripe.Customer;
        // not updating it here as we are not using this webhook anymore
        const { data: authUser, error: authError } = await supabaseServer.auth.admin.createUser({
          email: customer.email!,
          email_confirm: true,
          user_metadata: { sub: userId },
        });

        if (authError) {
          sendMessage(`Database Operation failed: ${authError}`);
        }

        if (authUser.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", authUser.user?.email)
            .single();
          if (profileData?.id) {
            const { data: restaurant, error: restaurantError } = await supabase
              .from("restaurants")
              .insert({
                name: customer.metadata.restaurantName,
                owner_id: profileData.id,
              })
              .select()
              .single();

            if (restaurantError) {
              sendMessage(`Database Operation failed: ${restaurantError}`);
            }

            if (restaurant?.id) {
              const { error: updateError } = await supabase
                .from("profiles")
                .update({
                  restaurant_id: restaurant.id,
                  email: authUser.user?.email,
                  stripe_customer_id: customer.id,
                  customer_name: customer.name,
                  subscriptionActive: false,
                  role: "owner",
                  phone: customer.phone,
                })
                .eq("email", authUser.user?.email);

              if (updateError) {
                sendMessage(`Database Operation failed: ${updateError}`);
              }
            }
          }
        }

        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    res.json({ received: true });
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end("Method Not Allowed");
  }
}
