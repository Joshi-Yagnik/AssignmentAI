const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer.
 * If SMTP credentials are provided in the environment variables, it uses them.
 * Otherwise, it creates a test account via Ethereal Email (great for local testing).
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
async function sendMail({ to, subject, text, html }) {
  let transporter;

  // Check if we have real SMTP credentials configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development mode: Create a fake Ethereal account
    console.log('✉️ No SMTP credentials found. Creating a test Ethereal email account...');
    let testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const mailOptions = {
    from: `"AssignmentAI" <${process.env.SMTP_FROM_EMAIL || 'noreply@assignmentai.edu'}>`,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);

  console.log(`\n[MailService] Message sent: ${info.messageId}`);
  
  // If we used the test account, provide a link to view the email in the browser!
  if (!process.env.SMTP_HOST) {
    console.log(`[MailService] 🌐 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`(Click the link above to view the email in your browser!)\n`);
  }

  return info;
}

module.exports = {
  sendMail,
};
