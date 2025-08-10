# Medische Inventarisatie App

## Overzicht
Een Nederlandse medische inventarisatie applicatie die medische materialen en medicijnen toont verdeeld over 5 gelabelde kasten (A-E). Gebruikers kunnen items bekijken en email notificaties versturen voor aanvulling van voorraad.

## Architectuur
- **Frontend**: React met Vite, Wouter routing, shadcn/ui components
- **Backend**: Express.js API
- **Storage**: In-memory storage (MemStorage)
- **Styling**: Tailwind CSS met shadcn/ui
- **Email**: Nodemailer voor email notificaties

## Functionaliteiten
- Overzicht van alle medische items per kast (A-E)
- Voorraad tracking met aantallen
- Email notificatie knop voor aanvulling
- Nederlandse interface

## Data Model
- **Items**: naam, beschrijving, kast (A-E), huidige voorraad, minimum voorraad
- **Email notificaties**: item referentie, verzend timestamp

## User Preferences
- Taal: Nederlands
- Interface: Eenvoudig en overzichtelijk
- Email functionaliteit gewenst voor voorraad aanvulling

## Recent Changes
- 2025-01-10: Project initialisatie - Nederlandse medische inventarisatie app met 5 kasten systeem