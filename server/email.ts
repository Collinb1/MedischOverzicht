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

export function generateRestockEmailHTML(item: MedicalItem, cabinetName: string, status: string = "Bijna op"): string {
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
          <p><strong>Ambulancepost:</strong> ${item.ambulancePost}</p>
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