import sgMail from '@sendgrid/mail';
import type { MedicalItem } from '@shared/schema';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid API key niet geconfigureerd - email zou normaal verzonden worden naar:', params.to);
    console.log('Onderwerp:', params.subject);
    return true; // Simuleer succes voor ontwikkeling
  }

  try {
    await sgMail.send(params);
    return true;
  } catch (error) {
    console.error('SendGrid email fout:', error);
    return false;
  }
}

export function generateRestockEmailHTML(item: MedicalItem, cabinetName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .item-details { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .warning { background-color: #fef3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { background-color: #f1f5f9; padding: 15px; text-align: center; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 Medische Inventaris Waarschuwing</h1>
      </div>
      
      <div class="content">
        <h2>Voorraad Aanvulling Vereist</h2>
        
        <div class="warning">
          <strong>⚠️ Let op:</strong> Het volgende item is bijna uitgeput en heeft dringende aanvulling nodig.
        </div>
        
        <div class="item-details">
          <h3>Item Details:</h3>
          <p><strong>Naam:</strong> ${item.name}</p>
          <p><strong>Beschrijving:</strong> ${item.description || 'Geen beschrijving'}</p>
          <p><strong>Categorie:</strong> ${item.category}</p>
          <p><strong>Locatie:</strong> ${cabinetName} (Kast ${item.cabinet})</p>
          <p><strong>Vervaldatum:</strong> ${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('nl-NL') : 'Geen'}</p>
        </div>
        
        <p>Gelieve zo spoedig mogelijk actie te ondernemen om de voorraad aan te vullen.</p>
        
        <p><strong>Aanbevolen acties:</strong></p>
        <ul>
          <li>Controleer huidige voorraad ter plaatse</li>
          <li>Plaats bestelling bij leverancier</li>
          <li>Update inventaris systeem na aanvulling</li>
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