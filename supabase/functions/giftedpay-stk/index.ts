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

    const GIFTEDPAY_API_KEY = Deno.env.get('GIFTEDPAY_API_KEY');
    if (!GIFTEDPAY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, bundle_price, phone_number, payment_status')
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.payment_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Order is already ${order.payment_status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order to processing
    await supabase
      .from('orders')
      .update({ payment_status: 'processing' })
      .eq('id', order_id)
      .eq('payment_status', 'pending');

    // Initiate GiftedPay STK Push
    const stkPayload = {
      phone: order.phone_number,
      amount: Math.round(order.bundle_price),
      reference: order.order_number,
      description: `Infotech Bundle - ${order.order_number}`,
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/giftedpay-webhook`,
    };

    let giftedpayResponse: Response;
    let giftedpayData: Record<string, unknown> = {};

    try {
      giftedpayResponse = await fetch('https://api.giftedpay.com/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GIFTEDPAY_API_KEY}`,
          'x-api-key': GIFTEDPAY_API_KEY,
        },
        body: JSON.stringify(stkPayload),
      });
      giftedpayData = await giftedpayResponse.json();
    } catch (fetchErr) {
      console.error('GiftedPay API error:', fetchErr);
      await supabase.from('orders').update({ payment_status: 'pending' }).eq('id', order_id);
      await supabase.from('payment_logs').insert({
        order_id: order.id,
        event_type: 'stk_push_failed',
        payload: { error: String(fetchErr) },
      });
      return new Response(
        JSON.stringify({ error: 'Failed to initiate payment. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!giftedpayResponse.ok || !giftedpayData.success) {
      await supabase.from('orders').update({ payment_status: 'pending' }).eq('id', order_id);
      await supabase.from('payment_logs').insert({
        order_id: order.id,
        event_type: 'stk_push_failed',
        payload: giftedpayData,
      });
      return new Response(
        JSON.stringify({ error: (giftedpayData.message as string) || 'Payment initiation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store checkout request ID from GiftedPay
    const checkoutRequestId = (giftedpayData.checkout_request_id as string) || (giftedpayData.CheckoutRequestID as string) || '';
    const transactionId = (giftedpayData.transaction_id as string) || '';

    await supabase
      .from('orders')
      .update({
        checkout_request_id: checkoutRequestId,
        giftedpay_transaction_id: transactionId,
      })
      .eq('id', order_id);

    await supabase.from('payment_logs').insert({
      order_id: order.id,
      event_type: 'stk_push_initiated',
      payload: giftedpayData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        checkout_request_id: checkoutRequestId,
        message: 'Payment request sent to your phone. Please check your Safaricom M-Pesa prompt.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
