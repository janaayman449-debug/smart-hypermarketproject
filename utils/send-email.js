import nodemailer from "nodemailer";

export async function sendResetPasswordEmail(toEmail, resetLink) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Smart Hypermarket" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "إعادة تعيين كلمة المرور - Smart Hypermarket",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>وصلنا طلب لإعادة تعيين كلمة المرور بتاعت حسابك.</p>
        <p>اضغط على الرابط ده عشان تختار كلمة مرور جديدة (صالح لمدة 15 دقيقة):</p>
        <a href="${resetLink}" style="display:inline-block; background:#183b2b; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; margin:10px 0;">
          إعادة تعيين كلمة المرور
        </a>
        <p style="color:#888; font-size:12px;">لو ماطلبتش الرسالة دي، تجاهلها ببساطة.</p>
      </div>
    `,
  });
}