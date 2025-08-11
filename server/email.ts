import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import type { MedicalItem, EmailConfig } from '@shared/schema';
import { storage } from './storage';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  config?: EmailConfig;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Use provided config or get from database
  let emailConfig = params.config;
  if (!emailConfig) {
    try {
      emailConfig = await storage.getEmailConfig();
      console.log('Email config opgehaald uit database');
    } catch (error) {
      console.log('Geen email configuratie gevonden in database');
    }
  } else {
    console.log('Email config gebruikt uit request parameters');
  }

  // Use configured SMTP if available
  if (emailConfig && emailConfig.smtpHost && emailConfig.smtpPort && emailConfig.smtpUser && emailConfig.smtpPassword) {
    try {
      console.log(`Sending email via SMTP: ${emailConfig.smtpHost}:${emailConfig.smtpPort}`);
      console.log(`Using SMTP user: ${emailConfig.smtpUser}`);
      console.log(`SMTP secure mode: ${emailConfig.smtpPort === 465 ? 'SSL' : 'STARTTLS'}`);
      
      // Try different authentication methods for Exchange compatibility
      const transportConfig: any = {
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpPort === 465, // true for 465, false for other ports
        tls: {
          // Accept self-signed certificates and hostname mismatches (common for Exchange)
          rejectUnauthorized: false,
          ciphers: 'ALL',
          minVersion: 'TLSv1'
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000, // 5 seconds  
        socketTimeout: 10000, // 10 seconds
        debug: false, // Disable debug logging to prevent password leaks
        logger: false
      };

      // Force STARTTLS for port 587
      if (emailConfig.smtpPort === 587) {
        transportConfig.requireTLS = true;
      }

      // Try different auth methods for Exchange
      if (emailConfig.smtpUser && emailConfig.smtpPassword) {
        // For Exchange servers, try multiple authentication methods
        if (emailConfig.smtpHost && emailConfig.smtpHost.toLowerCase().includes('exchange')) {
          // Exchange specific auth
          transportConfig.auth = {
            user: emailConfig.smtpUser,
            pass: emailConfig.smtpPassword,
            type: 'login'
          };
        } else if (emailConfig.smtpHost && emailConfig.smtpHost.toLowerCase().includes('outlook')) {
          // Outlook specific auth
          transportConfig.auth = {
            user: emailConfig.smtpUser,
            pass: emailConfig.smtpPassword,
            type: 'oauth2'
          };
        } else {
          // Generic SMTP with multiple fallback methods
          transportConfig.auth = {
            user: emailConfig.smtpUser,
            pass: emailConfig.smtpPassword
          };
          // Try LOGIN first, then PLAIN
          transportConfig.authMethods = ['LOGIN', 'PLAIN', 'XOAUTH2'];
        }
      }

      const transporter = nodemailer.createTransport(transportConfig);

      const fromEmail = emailConfig.fromEmail || params.from;
      const fromName = emailConfig.fromName || 'Medische Inventaris';

      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email succesvol verzonden naar ${params.to} via SMTP`);
      return true;
    } catch (error: any) {
      console.error('SMTP email fout:', error);
      
      // Provide specific error messages for common issues
      if (error.code === 'EAUTH') {
        if (emailConfig.smtpHost && emailConfig.smtpHost.includes('gmail')) {
          console.error('SMTP Authenticatie gefaald. Voor Gmail gebruik een App-specifiek wachtwoord.');
          console.error('Zie: https://support.google.com/accounts/answer/185833');
        } else {
          console.error('SMTP Authenticatie gefaald. Controleer gebruikersnaam en wachtwoord.');
          console.error('Voor Exchange: gebruik je volledige email adres als gebruikersnaam.');
          console.error('Voor Exchange: controleer of SMTP auth is ingeschakeld.');
        }
      } else if (error.code === 'ECONNECTION') {
        console.error('Kan geen verbinding maken met SMTP server. Controleer host en poort.');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('SMTP verbinding time-out. Controleer internet verbinding en firewall.');
      } else if (error.code === 'ESOCKET' && error.reason && error.reason.includes('altnames')) {
        console.error('TLS certificaat hostname mismatch. Dit is normaal bij bedrijfsmail servers.');
        console.error('TLS verificatie is uitgeschakeld voor compatibiliteit.');
      }
      
      return false;
    }
  }

  // Fallback to SendGrid if configured
  if (process.env.SENDGRID_API_KEY) {
    try {
      await sgMail.send(params);
      console.log(`Email succesvol verzonden naar ${params.to} via SendGrid`);
      return true;
    } catch (error) {
      console.error('SendGrid email fout:', error);
      return false;
    }
  }

  // If no email configuration is available, log the attempt
  console.log('Geen email configuratie beschikbaar - email zou verzonden worden naar:', params.to);
  console.log('Onderwerp:', params.subject);
  console.log('Configureer SMTP instellingen in de Email Instellingen pagina of stel SENDGRID_API_KEY environment variable in');
  return false; // Return false to indicate email was not actually sent
}

interface EmailItemData {
  name: string;
  description?: string | null;
  category: string;
  expiryDate?: string | null;
  drawer?: string;
  ambulancePost?: string;
}

export function generateRestockEmailHTML(item: EmailItemData, cabinetName: string, status: string = "Bijna op"): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #4a90e2; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; max-width: 600px; }
        .item-details { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a90e2; }
        .footer { background-color: #f1f5f9; padding: 15px; text-align: center; color: #64748b; font-size: 14px; }
        .greeting { margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Medische Inventaris - Aanvulverzoek</h1>
      </div>
      
      <div class="content">
        <div class="greeting">
          <p>Beste collega,</p>
          <p>Het volgende medische item heeft aanvulling nodig:</p>
        </div>
        
        <div class="item-details">
          <h3>Item informatie</h3>
          <p><strong>Artikel:</strong> ${item.name}</p>
          ${item.description ? `<p><strong>Beschrijving:</strong> ${item.description}</p>` : ''}
          <p><strong>Categorie:</strong> ${item.category}</p>
          <p><strong>Locatie:</strong> ${cabinetName}</p>
          ${item.drawer ? `<p><strong>Lade:</strong> ${item.drawer}</p>` : ''}
          ${item.ambulancePost ? `<p><strong>Ambulancepost:</strong> ${item.ambulancePost}</p>` : ''}
          ${item.expiryDate ? `<p><strong>Vervaldatum:</strong> ${new Date(item.expiryDate).toLocaleDateString('nl-NL')}</p>` : ''}
        </div>
        
        <p>Zou je dit item kunnen aanvullen wanneer het uitkomt? Bedankt voor je medewerking!</p>
        
        <p>Met vriendelijke groet,<br>
        Het Medische Inventaris Systeem</p>
      </div>
      
      <div class="footer">
        <p>Automatisch bericht - ${new Date().toLocaleDateString('nl-NL')} om ${new Date().toLocaleTimeString('nl-NL')}</p>
      </div>
    </body>
    </html>
  `;
}