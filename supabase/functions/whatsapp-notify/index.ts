import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Mensagens por status ──────────────────────────────────────────────────

function buildMessage(status: string, orderType: string, orderNumber: number): string | null {
  const num = orderNumber ? ` #${orderNumber}` : "";

  switch (status) {
    case "received":
      return `🍣 *Japa Nara*\nSeu pedido${num} foi recebido com sucesso ❤️`;

    case "preparing":
      return `👨‍🍳 Seu pedido${num} está sendo preparado com carinho 🍣`;

    case "out_for_delivery":
      if (orderType === "pickup") {
        return `🍣 Seu pedido${num} está pronto para retirada.\nPode vir buscar em nosso restaurante! 📍 Av. Paulo Siqueira, 2515 — Ortigueira/PR`;
      }
      return `🏍️💨 Seu pedido${num} saiu para entrega e logo chegará até você ❤️`;

    case "delivered":
      if (orderType === "pickup") {
        return `✅ Pedido${num} retirado com sucesso.\nAgradecemos pela preferência ❤️ Japa Nara`;
      }
      return `✅ Pedido${num} entregue.\nAgradecemos pela preferência ❤️ Japa Nara`;

    // Cancelado: sem mensagem automática
    default:
      return null;
  }
}

// ── Formatar número para E.164 (Brasil) ───────────────────────────────────

function formatPhone(raw: string): string {
  // Remove tudo que não é dígito
  let digits = raw.replace(/\D/g, "");

  // Se já começa com 55 (DDI Brasil) e tem 12-13 dígitos, mantém
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  // Se tem 10-11 dígitos (número local), adiciona 55
  if (digits.length >= 10 && digits.length <= 11) {
    return "55" + digits;
  }

  return digits;
}

// ── Envio via Z-API ───────────────────────────────────────────────────────

async function sendViaZAPI(phone: string, message: string): Promise<{ ok: boolean; detail: string }> {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token      = Deno.env.get("ZAPI_TOKEN");
  const clientToken= Deno.env.get("ZAPI_CLIENT_TOKEN");

  if (!instanceId || !token) {
    return { ok: false, detail: "ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados" };
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const body = {
    phone,
    message,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (clientToken) {
    headers["Client-Token"] = clientToken;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return { ok: res.ok, detail: text };
}

// ── Envio via WhatsApp Cloud API (Meta) ──────────────────────────────────

async function sendViaMetaCloud(phone: string, message: string): Promise<{ ok: boolean; detail: string }> {
  const token   = Deno.env.get("WA_CLOUD_TOKEN");
  const phoneId = Deno.env.get("WA_PHONE_NUMBER_ID");

  if (!token || !phoneId) {
    return { ok: false, detail: "WA_CLOUD_TOKEN ou WA_PHONE_NUMBER_ID não configurados" };
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: message },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return { ok: res.ok, detail: text };
}

// ── Handler principal ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone, status, order_type, order_number, customer_name } = await req.json();

    if (!phone || !status) {
      return new Response(
        JSON.stringify({ error: "phone e status são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = buildMessage(status, order_type ?? "delivery", order_number);

    // Sem mensagem para este status, retorna OK silenciosamente
    if (!message) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `Sem mensagem para status: ${status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhone(phone);

    // Detectar qual provedor usar
    const provider = Deno.env.get("WA_PROVIDER") ?? "zapi"; // "zapi" ou "meta"

    let result: { ok: boolean; detail: string };

    if (provider === "meta") {
      result = await sendViaMetaCloud(formattedPhone, message);
    } else {
      result = await sendViaZAPI(formattedPhone, message);
    }

    console.log(`WhatsApp [${provider}] → ${formattedPhone} (${status}): ${result.ok ? "OK" : "ERRO"} — ${result.detail}`);

    return new Response(
      JSON.stringify({
        sent: result.ok,
        provider,
        phone: formattedPhone,
        status,
        detail: result.detail,
      }),
      {
        status: result.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("whatsapp-notify error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
