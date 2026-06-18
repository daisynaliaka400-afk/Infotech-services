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

    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id');
    const orderNumber = url.searchParams.get('order_number');
    const phoneNumber = url.searchParams.get('phone_number');

    if (!orderId && !orderNumber && !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'order_id, order_number, or phone_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let query = supabase
      .from('orders')
      .select('id, order_number, bundle_name, bundle_price, phone_number, payment_status, payment_reference, checkout_request_id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (orderId) query = query.eq('id', orderId);
    else if (orderNumber) query = query.eq('order_number', orderNumber);
    else if (phoneNumber) {
      let normalized = phoneNumber.replace(/\s+/g, '');
      if (normalized.startsWith('+')) normalized = normalized.slice(1);
      if (normalized.startsWith('0')) normalized = '254' + normalized.slice(1);
      if (!normalized.startsWith('254')) normalized = '254' + normalized;
      query = query.eq('phone_number', normalized).order('created_at', { ascending: false });
    }

    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If still processing, try to verify with GiftedPay API
    if (order.payment_status === 'processing' && order.checkout_request_id && GIFTEDPAY_API_KEY) {
      try {
        const verifyResponse = await fetch(
          `https://api.giftedpay.com/transaction/${order.checkout_request_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${GIFTEDPAY_API_KEY}`,
              'x-api-key': GIFTEDPAY_API_KEY,
            },
          }
        );

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const isSuccess = verifyData.status === 'success' || verifyData.ResultCode === 0;
          const isFailed = verifyData.status === 'failed' || (verifyData.ResultCode !== undefined && verifyData.ResultCode !== 0);

          if (isSuccess || isFailed) {
            const newStatus = isSuccess ? 'success' : 'failed';
            await supabase
              .from('orders')
              .update({ payment_status: newStatus, payment_reference: verifyData.MpesaReceiptNumber || null })
              .eq('id', order.id)
              .in('payment_status', ['pending', 'processing']);

            await supabase.from('payment_logs').insert({
              order_id: order.id,
              event_type: `verify_${newStatus}`,
              payload: verifyData,
            });

            order.payment_status = newStatus;
          }
        }
      } catch (verifyErr) {
        console.error('Verification API error:', verifyErr);
        // Continue with current order status
      }
    }

    return new Response(
      JSON.stringify({ success: true, order }),
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
