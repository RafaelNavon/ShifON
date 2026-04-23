const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendPasswordResetEmail(toEmail, resetLink) {
  await transporter.sendMail({
    from: `"ShifON" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "ShifON - Password Reset",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
        <h2 style="margin: 0 0 8px; font-size: 22px; color: #111;">Reset your password</h2>
        <p style="margin: 0 0 24px; color: #555; font-size: 15px;">
          You requested a password reset for your ShifON account. Click the button below to set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
          Reset Password
        </a>
        <p style="margin: 24px 0 0; color: #888; font-size: 13px;">
          If you didn't request this, you can safely ignore this email.<br/>
          Or paste this link into your browser: <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
