const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendEmail = async (options) => {
  // Setup a dummy transporter using Ethereal (or you can use SMTP settings from env if available)
  // For production, replace these with real SMTP credentials in your .env file
  
  let transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Generate test SMTP service account from ethereal.email if no .env variables
    // Only needed if we don't have real credentials
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    logger.info(`Using Ethereal Email for testing: ${testAccount.user}`);
  }

  const message = {
    from: `${process.env.FROM_NAME || 'KrushiStock Admin'} <${process.env.FROM_EMAIL || 'noreply@krushistock.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  const info = await transporter.sendMail(message);

  logger.info(`Message sent: ${info.messageId}`);
  
  if (!process.env.SMTP_HOST) {
    // Preview only available when sending through an Ethereal account
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
};

module.exports = sendEmail;
