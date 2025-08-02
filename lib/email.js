import { nodemailerService } from "./nodemailer-service.js"

// export async function sendEmail({ to, subject, content, templateData = {} }) {
//   try {
//     const emailData = {
//       to,
//       subject,
//       content,
//       templateData
//     }

//     const result = await nodemailerService.sendEmail(emailData)

//     if (result.success) {
//       return { success: true, messageId: result.messageId }
//     } else {
//       return { success: false, error: result.message }
//     }
//   } catch (error) {
//     console.error("Email send failed:", error)
//     return { success: false, error: error.message }
//   }
// }
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail", // or use SendGrid SMTP
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function sendEmail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  })
}

export async function sendEmailWithRetry(emailData, maxRetries = 3) {
  try {
    const result = await nodemailerService.sendEmailWithRetry(emailData, { maxRetries })

    if (result.success) {
      return { success: true, messageId: result.messageId }
    } else {
      return { success: false, error: result.message }
    }
  } catch (error) {
    console.error("Email send with retry failed:", error)
    return { success: false, error: error.message }
  }
}
