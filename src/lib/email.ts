// src/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${token}`
  
  try {
    const data = await resend.emails.send({
      from: 'Hostel Mart <onboarding@resend.dev>', // Change this to your verified domain
      to: [email],
      subject: 'Verify your email - Hostel Mart',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🍕 Hostel Mart</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
              
              <p>Hi there! 👋</p>
              
              <p>Thank you for signing up with Hostel Mart. To start listing items for rent, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #667eea;">
                ${verificationUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  This link will expire in 24 hours. If you didn't create an account with Hostel Mart, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Hostel Mart. All rights reserved.</p>
            </div>
          </body>
        </html>
      `
    })

    console.log('✅ Verification email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending verification email:', error)
    return { success: false, error }
  }
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderDetails: {
    orderNumber: string
    totalAmount: number
    items: Array<{ name: string; quantity: number; price: number }>
  }
) {
  try {
    const itemsHtml = orderDetails.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('')

    const data = await resend.emails.send({
      from: 'Hostel Mart <onboarding@resend.dev>',
      to: [email],
      subject: `Order Confirmed - ${orderDetails.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Order Confirmation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🍕 Order Confirmed!</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Order #${orderDetails.orderNumber}</h2>
              
              <p>Thank you for your order! Your snacks are being prepared.</p>
              
              <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                <thead>
                  <tr style="background: #667eea; color: white;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: #f0f0f0; font-weight: bold;">
                    <td colspan="2" style="padding: 10px;">Total</td>
                    <td style="padding: 10px; text-align: right;">₹${orderDetails.totalAmount}</td>
                  </tr>
                </tfoot>
              </table>
              
              <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="margin: 0; color: #0066cc;">
                  <strong>📦 What's Next?</strong><br>
                  Your order will be ready for pickup/delivery soon. You'll receive updates on your order status.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2024 Hostel Mart. All rights reserved.</p>
            </div>
          </body>
        </html>
      `
    })

    console.log('✅ Order confirmation email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending order confirmation:', error)
    return { success: false, error }
  }
}