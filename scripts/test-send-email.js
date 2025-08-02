// scripts/test-send-email.js
import { sendEmail } from "../lib/email-service.js";

async function run() {
  console.log("📧 Testing email send...");

  const to = "pradeep2420pradeep@gmail.com";
  const subject = "Test Email from Productly";
  const content = "Hello, this is a test email from Productly backend.";

  try {
    const result = await sendEmail({ to, subject, content });
    console.log("✅ Email result:", result);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    process.exit(1);
  }
}

run();
