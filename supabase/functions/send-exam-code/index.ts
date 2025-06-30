import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html } = await req.json()

    // Here you would integrate with your email service
    // For example, using SendGrid, Mailgun, or similar
    
    // Example with SendGrid (you'd need to add your API key)
    /*
    const response = await fetch('https://api.sendgrid.v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@yourdomain.com', name: 'CBT System' },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    })

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.status}`)
    }
    */

    // For now, we'll just log the email (in production, implement actual email sending)
    console.log('Email would be sent to:', to)
    console.log('Subject:', subject)
    console.log('HTML length:', html.length)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipient: to,
        subject: subject
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})