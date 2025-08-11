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
        debug: true, // Enable debug logging
        logger: true
      };

      // Force STARTTLS for port 587
      if (emailConfig.smtpPort === 587) {
        transportConfig.requireTLS = true;
      }

      // Try different auth methods for Exchange
      if (emailConfig.smtpUser && emailConfig.smtpPassword) {
        transportConfig.auth = {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPassword,
          type: 'login' // Force LOGIN method instead of PLAIN for Exchange
        };
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
  const isUrgent = status === "OP";
  const backgroundColor = isUrgent ? "#dc2626" : "#2563eb";
  const warningBackground = isUrgent ? "#fee2e2" : "#fef3cd";
  const warningBorder = isUrgent ? "#dc2626" : "#f59e0b";
  const warningIcon = isUrgent ? "🚨" : "⚠️";
  const urgencyText = isUrgent ? "is OP en heeft DIRECTE aanvulling nodig" : "is bijna uitgeput en heeft dringende aanvulling nodig";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: ${backgroundColor}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .item-details { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .warning { background-color: ${warningBackground}; border-left: 4px solid ${warningBorder}; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f1f5f9; padding: 15px; text-align: center; color: #64748b; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; color: white; background-color: ${backgroundColor}; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 Medische Inventaris Waarschuwing</h1>
        <div class="status-badge">${status.toUpperCase()}</div>
      </div>
      
      <div class="content">
        <h2>Voorraad Aanvulling ${isUrgent ? 'URGENT' : 'Vereist'}</h2>
        
        <div class="warning">
          <strong>${warningIcon} ${isUrgent ? 'URGENT' : 'Let op'}:</strong> Het volgende item ${urgencyText}.
        </div>
        
        <div class="item-details">
          <h3>Item Details:</h3>
          <p><strong>Naam:</strong> ${item.name}</p>
          <p><strong>Beschrijving:</strong> ${item.description || 'Geen beschrijving'}</p>
          <p><strong>Categorie:</strong> ${item.category}</p>
          <p><strong>Locatie:</strong> ${cabinetName}</p>
          ${item.drawer ? `<p><strong>Lade:</strong> ${item.drawer}</p>` : ''}
          ${item.ambulancePost ? `<p><strong>Ambulancepost:</strong> ${item.ambulancePost}</p>` : ''}
          <p><strong>Vervaldatum:</strong> ${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('nl-NL') : 'Geen'}</p>
          <p><strong>Status:</strong> <span class="status-badge">${status}</span></p>
        </div>
        
        <p>Gelieve ${isUrgent ? 'ONMIDDELLIJK' : 'zo spoedig mogelijk'} actie te ondernemen om de voorraad aan te vullen.</p>
        
        <p><strong>Aanbevolen acties:</strong></p>
        <ul>
          <li>Controleer huidige voorraad ter plaatse</li>
          <li>${isUrgent ? 'SPOED: Plaats directe bestelling bij leverancier' : 'Plaats bestelling bij leverancier'}</li>
          <li>Update inventaris systeem na aanvulling</li>
          ${isUrgent ? '<li>Zoek tijdelijke vervanging indien mogelijk</li>' : ''}
        </ul>
      </div>
      
      <div class="footer">
        <p>Deze email is automatisch gegenereerd door het Medische Inventaris Systeem</p>
        <p>Datum: ${new Date().toLocaleDateString('nl-NL')} om ${new Date().toLocaleTimeString('nl-NL')}</p>
      </div>
    </body>
    </html>
  `;
}