# Medische Inventarisatie App

## Overzicht
Een Nederlandse medische inventarisatie applicatie die medische materialen en medicijnen toont verdeeld over 5 gelabelde kasten (A-E). Gebruikers kunnen items bekijken en email notificaties versturen voor aanvulling van voorraad.

## Architectuur
- **Frontend**: React met Vite, Wouter routing, shadcn/ui components
- **Backend**: Express.js API
- **Storage**: In-memory storage (MemStorage)
- **Styling**: Tailwind CSS met shadcn/ui
- **Email**: SendGrid voor email notificaties

## Functionaliteiten
- Overzicht van alle medische items per kast
- "Bijna op" status tracking (geen exacte aantallen)
- Nieuwe kasten aanmaken tijdens item toevoeging
- Email keuzemenu voor verschillende afdelingen
- Waarschuwing email functionaliteit voor items die bijna op zijn
- Nederlandse interface

## Data Model
- **Items**: naam, beschrijving, kast, vervaldatum, bijna op status (boolean)
- **Kasten**: ID, naam, beschrijving, locatie
- **Email notificaties**: item referentie, verzend timestamp

## User Preferences
- Taal: Nederlands
- Interface: Eenvoudig en overzichtelijk
- Email functionaliteit gewenst voor voorraad aanvulling

## Recent Changes
- 2025-01-10: Project initialisatie - Nederlandse medische inventarisatie app met 5 kasten systeem
- 2025-01-10: Uitgebreid met mogelijkheid om nieuwe kasten aan te maken tijdens item toevoeging
- 2025-01-10: Vereenvoudigd naar "bijna op" model - geen exacte voorraadaantallen, alleen status of items bijna op zijn
- 2025-01-10: Email keuzemenu toegevoegd met voorgedefinieerde afdelingen
- 2025-01-10: Waarschuwing email functionaliteit - speciale knop voor items die bijna op zijn
- 2025-01-10: Custom email persoon toevoegen - gebruikers kunnen nu eigen email adressen invoeren naast voorgedefinieerde opties
- 2025-01-10: Object storage en foto functionaliteit geïmplementeerd - gebruikers kunnen nu foto's uploaden bij medische items
- 2025-01-10: Foto upload prioriteit - foto sectie staat bovenaan in formulier en items met foto's verschijnen eerst in inventaris
- 2025-01-10: Ambulancepost selectie toegevoegd - Dr. Sarah Johnson kan kiezen tussen Post Hilversum en Post Blaricum