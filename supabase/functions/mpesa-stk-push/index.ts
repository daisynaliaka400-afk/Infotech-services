import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ============================================================================
// CORS Configuration
// ============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// Type Definitions
// ============================================================================
interface STKPushRequest {
  phone: string
  amount: number
  description: string
  orderId?: string
  customerEmail?: string
  metadata?: Record<string, string>
}

interface GiftedPayResponse {
  success: boolean
  checkout_url?: string
  url?: string
  stk_push_id?: string
  request_id?: string
  message?: string
  error?: string
  code?: string
}

interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: string
}

interface SuccessResponse {
  success: true
  checkoutUrl: string
  stkPushId?: string
  requestId?: string
  orderId?: string
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates Kenyan phone number format
 * Accepts: 254XXXXXXXXX, +254XXXXXXXXX, 0XXXXXXXXX, 07XXXXXXXXX
 */
function validatePhoneNumber(phone: string): { valid: boolean; formatted: string } {
  let cleanPhone = phone.replace(/\s+/g, '')

  // Convert various formats to international format
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '254' + cleanPhone.slice(1)
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.slice(1)
  } else if (!cleanPhone.startsWith('254')) {
    return { valid: false, formatted: '' }
  }

  // Validate length: should be 254 (3) + 9 digits
  if (cleanPhone.length !== 12 || !cleanPhone.match(/^254\d{9}$/)) {
    return { valid: false, formatted: '' }
  }

  return { valid: true, formatted: cleanPhone }
}

/**
 * Validates amount in Kenyan Shillings
 * M-Pesa minimum: 1 KES, Maximum: 150,000 KES
 */
function validateAmount(amount: number): { valid: boolean; message: string } {
  const MIN_AMOUNT = 1
  const MAX_AMOUNT = 150000

  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, message: 'Amount must be a valid number' }
  }

  if (amount < MIN_AMOUNT) {
    return { valid: false, message: `Amount must be at least KES ${MIN_AMOUNT}` }
  }

  if (amount > MAX_AMOUNT) {
    return { valid: false, message: `Amount cannot exceed KES ${MAX_AMOUNT}` }
  }

  // Ensure it's an integer (M-Pesa works with whole shillings)
  if (amount !== Math.floor(amount)) {
    return { valid: false, message: 'Amount must be a whole number (shillings)' }
  }

  return { valid: true, message: '' }
}

/**
 * Validates request payload
 */
function validateRequest(payload: STKPushRequest): { valid: boolean; error?: string } {
  // Validate phone
  const phoneValidation = validatePhoneNumber(payload.phone || '')
  if (!phoneValidation.valid) {
    return { valid: false, error: 'Invalid phone number. Use Kenyan format (254XXXXXXXXX, +254XXXXXXXXX, or 0XXXXXXXXX)' }
  }

  // Validate amount
  const amountValidation = validateAmount(payload.amount)
  if (!amountValidation.valid) {
    return { valid: false, error: amountValidation.message }
  }

  // Validate description
  if (!payload.description || typeof payload.description !== 'string' || payload.description.trim().length === 0) {
    return { valid: false, error: 'Description is required' }
  }

  if (payload.description.length > 100) {
    return { valid: false, error: 'Description must not exceed 100 characters' }
  }

  return { valid: true }
}

// ============================================================================
// GiftedPay Integration
// ============================================================================

/**
 * Sends STK Push request to GiftedPay API
 */
async function sendGiftedPaySTKPush(
  phone: string,
  amount: number,
  description: string,
  apiKey: string,
  orderId?: string
): Promise<GiftedPayResponse> {
  const phoneValidation = validatePhoneNumber(phone)
  const formattedPhone = phoneValidation.formatted

  const payload = {
    phone_number: formattedPhone,
    amount: amount,
    remarks: description,
    ...(orderId && { reference: orderId }),
  }

  console.log('Sending STK Push to GiftedPay:', {
    phone: formattedPhone,
    amount,
    hasApiKey: !!apiKey,
  })

  try {
    const response = await fetch('https://api.giftedpay.com/v1/stk/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`GiftedPay API error (${response.status}):`, errorText)

      return {
        success: false,
        error: `GiftedPay API returned ${response.status}`,
        code: response.status.toString(),
      }
    }

    const data = await response.json() as GiftedPayResponse
    console.log('GiftedPay response:', {
      success: data.success,
      hasCheckoutUrl: !!data.checkout_url || !!data.url,
      hasPushId: !!data.stk_push_id,
    })

    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error calling GiftedPay API:', errorMessage)

    return {
      success: false,
      error: `Failed to connect to GiftedPay: ${errorMessage}`,
      code: 'CONNECTION_ERROR',
    }
  }
}

// ============================================================================
// Response Handlers
// ============================================================================

function createErrorResponse(code: string, message: string, status: number = 400): Response {
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    code,
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function createSuccessResponse(data: SuccessResponse): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // 1. Handle CORS Preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 2. Only accept POST requests
  if (req.method !== 'POST') {
    return createErrorResponse(
      'METHOD_NOT_ALLOWED',
      'Only POST requests are supported',
      405
    )
  }

  try {
    // 3. Parse incoming request payload from frontend CheckoutModal
    let requestData: STKPushRequest
    try {
      requestData = await req.json()
    } catch (e) {
      return createErrorResponse('INVALID_JSON', 'Request body must be valid JSON', 400)
    }

    // 4. Validate request payload
    const validation = validateRequest(requestData)
    if (!validation.valid) {
      return createErrorResponse('VALIDATION_ERROR', validation.error || 'Invalid request', 400)
    }

    // 5. Retrieve GiftedPay API Key from environment
    const GIFTEDPAY_API_KEY = Deno.env.get('GIFTEDPAY_API_KEY')
    if (!GIFTEDPAY_API_KEY) {
      console.error('GIFTEDPAY_API_KEY environment variable not configured')
      return createErrorResponse(
        'CONFIG_ERROR',
        'Payment service is not properly configured',
        500
      )
    }

    // 6. Generate or use provided order ID for tracking
    const orderId = requestData.orderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 7. Send request to GiftedPay API endpoint for STK Push
    const giftedPayResponse = await sendGiftedPaySTKPush(
      requestData.phone,
      requestData.amount,
      requestData.description,
      GIFTEDPAY_API_KEY,
      orderId
    )

    // 8. Handle GiftedPay errors
    if (!giftedPayResponse.success) {
      console.error('GiftedPay request failed:', giftedPayResponse)
      return createErrorResponse(
        giftedPayResponse.code || 'GIFTEDPAY_ERROR',
        giftedPayResponse.error || 'Failed to initiate M-Pesa payment',
        400
      )
    }

    // 9. Extract checkout URL from response
    const checkoutUrl = giftedPayResponse.checkout_url || giftedPayResponse.url
    if (!checkoutUrl) {
      console.error('No checkout URL in GiftedPay response:', giftedPayResponse)
      return createErrorResponse(
        'NO_CHECKOUT_URL',
        'Payment URL generation failed',
        500
      )
    }

    // 10. Return the checkout payment URL back to our frontend
    const successResponse: SuccessResponse = {
      success: true,
      checkoutUrl,
      stkPushId: giftedPayResponse.stk_push_id,
      requestId: giftedPayResponse.request_id,
      orderId,
    }

    console.log('STK Push initiated successfully:', { orderId, amount: requestData.amount })
    return createSuccessResponse(successResponse)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Unhandled error in STK Push handler:', errorMessage, error)

    return createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    )
  }
})
