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

    const { bundle_id, phone_number, order_reference } = await req.json();

    if (!bundle_id || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'bundle_id and phone_number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8}|1[0-9]{8})$/;
    if (!phoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Safaricom phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let normalizedPhone = phone_number.replace(/\s+/g, '');
    if (normalizedPhone.startsWith('+')) normalizedPhone = normalizedPhone.slice(1);
    if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
    if (!normalizedPhone.startsWith('254')) normalizedPhone = '254' + normalizedPhone;

    const { data: bundle, error: bundleError } = await supabase
      .from('bundles')
      .select('id, name, price, is_active')
      .eq('id', bundle_id)
      .maybeSingle();

    if (bundleError || !bundle) {
      return new Response(
        JSON.stringify({ error: 'Bundle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bundle.is_active) {
      return new Response(
        JSON.stringify({ error: 'Bundle is not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const insertPayload: Record<string, unknown> = {
      bundle_id: bundle.id,
      bundle_name: bundle.name,
      bundle_price: bundle.price,
      phone_number: normalizedPhone,
      payment_status: 'pending',
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(insertPayload)
      .select('id, order_number, bundle_name, bundle_price, phone_number, payment_status, created_at')
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Best-effort: store the client-generated reference (requires order_reference column).
    // Silently ignored if the column does not exist in the current schema.
    if (order_reference) {
      await supabase
        .from('orders')
        .update({ order_reference })
        .eq('id', order.id);
    }

    await supabase.from('payment_logs').insert({
      order_id: order.id,
      event_type: 'order_created',
      payload: { bundle_id, phone_number: normalizedPhone, amount: bundle.price },
    });

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
