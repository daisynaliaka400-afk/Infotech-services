import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    console.log('GiftedPay webhook received:', JSON.stringify(payload));

    // Extract key fields from the webhook payload
    const resultCode = payload.ResultCode ?? payload.result_code ?? payload.Body?.stkCallback?.ResultCode;
    const checkoutRequestId = payload.CheckoutRequestID ?? payload.checkout_request_id ?? payload.Body?.stkCallback?.CheckoutRequestID;
    const reference = payload.reference ?? payload.MerchantRequestID ?? payload.Body?.stkCallback?.MerchantRequestID;

    if (!checkoutRequestId && !reference) {
      console.error('Missing checkout_request_id and reference in webhook');
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the order
    let order = null;
    if (checkoutRequestId) {
      const { data } = await supabase
        .from('orders')
        .select('id, payment_status, order_number')
        .eq('checkout_request_id', checkoutRequestId)
        .maybeSingle();
      order = data;
    }

    if (!order && reference) {
      const { data } = await supabase
        .from('orders')
        .select('id, payment_status, order_number')
        .eq('order_number', reference)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.error('Order not found for webhook:', { checkoutRequestId, reference });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency: skip if already finalized
    if (order.payment_status === 'success' || order.payment_status === 'failed') {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSuccess = resultCode === 0 || resultCode === '0' || payload.status === 'success';
    const newStatus = isSuccess ? 'success' : 'failed';
    const paymentReference = payload.MpesaReceiptNumber ?? payload.mpesa_receipt_number ??
      payload.Body?.stkCallback?.CallbackMetadata?.Item?.find((i: { Name: string }) => i.Name === 'MpesaReceiptNumber')?.Value ?? '';

    // Update order status (optimistic locking — only if still processing/pending)
    const { count } = await supabase
      .from('orders')
      .update({
        payment_status: newStatus,
        payment_reference: paymentReference || null,
      })
      .eq('id', order.id)
      .in('payment_status', ['pending', 'processing'])
      .select('id', { count: 'exact', head: true });

    if ((count ?? 0) > 0) {
      await supabase.from('payment_logs').insert({
        order_id: order.id,
        event_type: isSuccess ? 'payment_success' : 'payment_failed',
        payload,
      });
      console.log(`Order ${order.order_number} updated to ${newStatus}`);
    }

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ received: true, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
