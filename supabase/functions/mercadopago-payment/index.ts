import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getAccessToken(): string {
  // Secret registrado como MERCADO_PAGO_ACCESS_TOKEN
  return (
    Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") ||
    Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ||
    ""
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url  = new URL(req.url);
  const path = url.pathname;

  console.log(`[MP] ${req.method} ${path}`);

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // WEBHOOK — notificações do Mercado Pago
    // ═══════════════════════════════════════════════════════════════════════
    if (path.endsWith("/webhook")) {
      const body = await req.json().catch(() => ({}));
      console.log("[MP] Webhook received:", JSON.stringify(body));

      const supabase    = getSupabaseClient();
      const accessToken = getAccessToken();

      const paymentId = body.data?.id;
      const eventType = body.action || body.type || "";

      // Ignorar eventos que não são de pagamento
      if ((!eventType.includes("payment") && body.type !== "payment") || !paymentId) {
        console.log("[MP] Webhook: ignoring non-payment event:", eventType);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!accessToken) {
        console.error("[MP] Webhook: MERCADO_PAGO_ACCESS_TOKEN not set");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Buscar detalhes do pagamento na API do MP
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const mpPayment = await mpRes.json();

      if (!mpRes.ok) {
        console.error("[MP] Webhook: MP API error:", JSON.stringify(mpPayment));
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mpStatus       = mpPayment.status as string;
      const mpStatusDetail = mpPayment.status_detail ?? "";
      const txAmount       = Number(mpPayment.transaction_amount ?? 0);

      console.log(`[MP] Webhook: payment ${paymentId} status=${mpStatus} amount=${txAmount}`);

      const { data: paymentRecord } = await supabase
        .from("payments")
        .select("id, order_id, status, amount")
        .eq("external_id", paymentId.toString())
        .maybeSingle();

      if (!paymentRecord) {
        console.error("[MP] Webhook: no payment record for external_id:", paymentId);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newStatus =
        mpStatus === "approved"                              ? "paid"
        : mpStatus === "rejected" || mpStatus === "cancelled" ? "failed"
        : mpStatus === "refunded"                            ? "refunded"
        : "pending";

      await supabase
        .from("payments")
        .update({ status: newStatus, amount: txAmount, raw_response: mpPayment })
        .eq("id", paymentRecord.id);

      console.log(`[MP] Webhook: updated payment ${paymentRecord.id} → ${newStatus}`);

      if (mpStatus === "approved" && paymentRecord.status !== "paid") {
        const { data: updatedOrder } = await supabase
          .from("orders")
          .update({ payment_status: "paid", payment_id: paymentId.toString() })
          .eq("id", paymentRecord.order_id)
          .select("id, order_number, customer_name, total")
          .maybeSingle();

        if (updatedOrder) {
          await supabase.from("admin_notifications").insert({
            type:     "payment_approved",
            title:    "Pagamento Aprovado",
            message:  `Pedido #${updatedOrder.order_number} — ${updatedOrder.customer_name} — R$ ${txAmount.toFixed(2).replace(".", ",")} via PIX`,
            order_id: paymentRecord.order_id,
            read:     false,
          });
        }
      } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", paymentRecord.order_id);

        await supabase.from("admin_notifications").insert({
          type:     "payment_failed",
          title:    "Pagamento Recusado",
          message:  `Pedido — Pagamento recusado (${mpStatusDetail})`,
          order_id: paymentRecord.order_id,
          read:     false,
        });
      } else if (mpStatus === "refunded") {
        await supabase
          .from("orders")
          .update({ payment_status: "refunded", status: "cancelled" })
          .eq("id", paymentRecord.order_id);

        await supabase.from("admin_notifications").insert({
          type:     "payment_refunded",
          title:    "Pagamento Estornado",
          message:  `Pedido — Estorno processado`,
          order_id: paymentRecord.order_id,
          read:     false,
        });
      }

      return new Response(JSON.stringify({ ok: true, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHECK STATUS — polling do frontend (GET /check-status?order_id=...)
    // ═══════════════════════════════════════════════════════════════════════
    if (path.endsWith("/check-status") && req.method === "GET") {
      const orderId = url.searchParams.get("order_id");
      if (!orderId) {
        return new Response(JSON.stringify({ error: "order_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = getSupabaseClient();

      const { data: payment } = await supabase
        .from("payments")
        .select("status, external_id, amount")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!payment) {
        return new Response(JSON.stringify({ status: "not_found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Se já pago no BD, retorna imediatamente
      if (payment.status === "paid") {
        return new Response(JSON.stringify({ status: "paid", amount: payment.amount }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Consultar MP diretamente para obter status atualizado
      if (payment.external_id) {
        const accessToken = getAccessToken();
        if (accessToken) {
          try {
            const mpRes     = await fetch(
              `https://api.mercadopago.com/v1/payments/${payment.external_id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const mpPayment = await mpRes.json();
            console.log(`[MP] check-status response for ${payment.external_id}:`, mpPayment.status);

            if (mpRes.ok && mpPayment.status === "approved") {
              await supabase
                .from("payments")
                .update({ status: "paid", amount: mpPayment.transaction_amount, raw_response: mpPayment })
                .eq("external_id", payment.external_id);

              await supabase
                .from("orders")
                .update({ payment_status: "paid", payment_id: payment.external_id })
                .eq("id", orderId);

              return new Response(
                JSON.stringify({ status: "paid", amount: mpPayment.transaction_amount }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            if (mpRes.ok && (mpPayment.status === "rejected" || mpPayment.status === "cancelled")) {
              await supabase
                .from("payments")
                .update({ status: "failed", raw_response: mpPayment })
                .eq("external_id", payment.external_id);

              return new Response(
                JSON.stringify({ status: "failed" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } catch (e) {
            console.error("[MP] check-status fetch error:", e);
          }
        }
      }

      return new Response(
        JSON.stringify({ status: payment.status, amount: payment.amount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CRIAR PAGAMENTO PIX (POST /)
    // ═══════════════════════════════════════════════════════════════════════
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, amount, customer_name, customer_email, customer_phone } = body;

    if (!order_id || !amount) {
      return new Response(
        JSON.stringify({ error: "order_id and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      console.error("[MP] MERCADO_PAGO_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Mercado Pago não configurado. Contate o suporte." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase      = getSupabaseClient();
    const supabaseUrl   = Deno.env.get("SUPABASE_URL") ?? "";
    const idempotencyKey = crypto.randomUUID(); // UUID único por tentativa

    const payerEmail = (customer_email || "").trim() || "cliente@japanara.com";
    const nameParts  = (customer_name  || "Cliente").trim().split(/\s+/);
    const firstName  = nameParts[0] ?? "Cliente";
    const lastName   = nameParts.slice(1).join(" ") || "Cliente";

    const paymentPayload = {
      transaction_amount: Number(amount),
      description:        `Pedido Japa Nara #${String(order_id).slice(0, 8)}`,
      payment_method_id:  "pix",
      payer: {
        email:      payerEmail,
        first_name: firstName,
        last_name:  lastName,
      },
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-payment/webhook`,
    };

    console.log("[MP] Creating PIX payment:", JSON.stringify({
      amount:    paymentPayload.transaction_amount,
      order_id,
      payer:     payerEmail,
      token_set: !!accessToken,
    }));

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization":    `Bearer ${accessToken}`,
        "Content-Type":     "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpPayment = await mpRes.json();

    console.log("[MP] MP API response status:", mpRes.status);
    console.log("[MP] MP payment status:", mpPayment.status, "id:", mpPayment.id);

    if (!mpRes.ok) {
      console.error("[MP] MP API error:", JSON.stringify(mpPayment));
      const mpMessage =
        mpPayment?.message ||
        mpPayment?.cause?.[0]?.description ||
        `Erro ${mpRes.status} ao criar pagamento`;
      return new Response(
        JSON.stringify({ error: mpMessage, details: mpPayment }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txData       = mpPayment.point_of_interaction?.transaction_data;
    const qrCode       = txData?.qr_code        ?? "";
    const qrCodeBase64 = txData?.qr_code_base64  ?? "";
    const ticketUrl    = txData?.ticket_url       ?? "";

    if (!qrCode) {
      console.error("[MP] No qr_code in response:", JSON.stringify(mpPayment));
    }

    console.log("[MP] PIX created:", {
      mp_id:       mpPayment.id,
      status:      mpPayment.status,
      has_qr_code: !!qrCode,
      has_base64:  !!qrCodeBase64,
    });

    // Salvar registro de pagamento
    const { error: insertErr } = await supabase.from("payments").insert({
      order_id,
      external_id:    mpPayment.id.toString(),
      method:         "pix",
      status:         mpPayment.status === "approved" ? "paid" : "pending",
      amount:         mpPayment.transaction_amount,
      qr_code:        qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url:     ticketUrl,
      raw_response:   mpPayment,
    });

    if (insertErr) {
      console.error("[MP] payment insert error:", insertErr);
    }

    // Atualizar pedido (apenas payment fields)
    await supabase
      .from("orders")
      .update({
        payment_id:     mpPayment.id.toString(),
        payment_status: mpPayment.status === "approved" ? "paid" : "pending",
      })
      .eq("id", order_id);

    if (mpPayment.status === "approved") {
      await supabase.from("admin_notifications").insert({
        type:     "payment_approved",
        title:    "Pagamento Aprovado",
        message:  `Pedido — Pagamento PIX aprovado imediatamente`,
        order_id,
        read:     false,
      });
    }

    return new Response(
      JSON.stringify({
        id:                 mpPayment.id,
        status:             mpPayment.status,
        qr_code:            qrCode,
        qr_code_base64:     qrCodeBase64,
        ticket_url:         ticketUrl,
        transaction_amount: mpPayment.transaction_amount,
        expires_at:         mpPayment.date_of_expiration ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[MP] Unhandled error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
