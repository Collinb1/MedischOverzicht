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
- 2025-01-10: Ambulancepost selectie toegevoegd - gebruiker kan kiezen tussen Post Hilversum en Post Blaricum
- 2025-01-10: Gescheiden inventaris per ambulancepost - elke post heeft eigen items en kasten indeling
- 2025-01-10: Kastenbeheer verplaatst naar Instellingen dropdown - gebruikers openen kastenbeheer via Instellingen knop in header
- 2025-01-10: Reset functionaliteit succesvol geïmplementeerd - items kunnen teruggezet worden naar "Op voorraad" status via Voorraad Overzicht in Instellingen
- 2025-01-10: Postenbeheer functionaliteit toegevoegd - gebruikers kunnen ambulanceposten toevoegen, bewerken en beheren via Instellingen → Posten Beheer
- 2025-01-10: Dynamische ambulancepost selectie - header dropdown toont nu werkelijke posten uit database in plaats van hardcoded opties
- 2025-01-10: Tabel layout geïmplementeerd voor locatie selectie - nieuw item formulier toont ambulancepost, kast en lade in overzichtelijke tabel format
- 2025-01-10: Locatie overzicht verwijderd uit instellingen menu en "Locatie Details" hernoemd naar "Locatie Item per post"
- 2025-08-11: Contactpersoon kolom toegevoegd aan itemLocations database schema en beide item dialogs (nieuw + bewerken)
- 2025-08-11: Contactpersoon selectie functionaliteit geïmplementeerd - gebruikers kunnen contactpersonen per ambulancepost selecteren voor voorraadbeheer
- 2025-08-11: Inventaris tabel herontwerp - beschrijving/vervaldatum kolommen verwijderd, status kolom toont alleen kleurtjes, aanvulverzoek en acties gescheiden
- 2025-08-11: Status iconen geoptimaliseerd - alleen kleurcirkels zonder tekst voor compacte weergave
- 2025-08-11: Email bevestiging toegevoegd aan aanvulverzoek kolom - toont datum en ontvanger na verzending
- 2025-08-11: Foto weergave volledig opgelost - gebruikt /objects/ route voor zowel detail view als inventaris tabel, fallback naar categorie icoon bij falen, werkende foto weergave in beide views
- 2025-08-11: Blauwe rand weggehaald van foto's in inventaris tabel voor schonere weergave
- 2025-08-11: RAV FL&GV logo toegevoegd aan dashboard header - officieel logo van de ambulance organisatie naast MedInventory titel
- 2025-08-11: Nieuw item formulier opgeschoond - voorraad status, bijna op markering en email velden weggehaald, categorie standaard leeg
- 2025-08-11: Automatische foto compressie geïmplementeerd - grote bestanden (tot 20MB) worden automatisch gecomprimeerd naar max 5MB, 1200px breed, voor snellere uploads en betere performance
- 2025-08-11: HEIC naar JPG conversie toegevoegd - iPhone foto's worden automatisch geconverteerd naar JPG formaat voor universele compatibiliteit
- 2025-08-11: Backup/export functionaliteit geïmplementeerd - gebruikers kunnen volledige JSON backups exporteren en importeren van alle medische items, locaties, posten en instellingen via Instellingen menu
- 2025-08-11: Edit item dialog volledig verfraaid met professionele Card-based layout, sectie-indeling met iconen, betere focus styling en hover effecten
- 2025-08-11: Email alert veld verwijderd uit item bewerken formulier - vervaldatum sectie vereenvoudigd naar alleen vervaldatum veld
- 2025-08-11: Email systeem volledig herwerkt van SendGrid-only naar flexible SMTP ondersteuning met nodemailer - ondersteunt nu Gmail, Outlook, Yahoo en andere SMTP providers
- 2025-08-11: Test email functionaliteit geïmplementeerd met POST /api/test-email route - gebruikers kunnen email configuratie testen
- 2025-08-11: Verbeterde error handling voor SMTP authenticatie met specifieke Gmail App-wachtwoord instructies
- 2025-08-11: Email instellingen pagina uitgebreid met Gmail App-wachtwoord waarschuwingen en SMTP provider richtlijnen
- 2025-08-11: SMTP connectiviteitstest toegevoegd voor debugging email server problemen
- 2025-08-11: Gmail authenticatie succesvol werkend - App-wachtwoord configuratie opgelost, test emails verzenden correct
- 2025-08-11: Supply request email functionaliteit geïmplementeerd - aanvulverzoeken versturen nu daadwerkelijk emails naar contactpersonen met professionele HTML templates
- 2025-08-11: Email systeem volledig werkend - zowel test emails als supply request emails worden succesvol verzonden via Gmail SMTP
- 2025-08-11: Email template aangepast naar vriendelijke, sobere versie - weggehaald: urgentie, icoontjes, waarschuwingen. Toegevoegd: vriendelijke begroeting, beleefd verzoek, professionele afsluiting
- 2025-08-12: Zoektermen veld toegevoegd aan database schema en beide item formulieren - gebruikers kunnen nu alternatieve benamingen invoeren voor betere vindbaarheid van medische items
- 2025-08-12: Auto-scroll functionaliteit geïmplementeerd - wanneer gebruiker Enter drukt in zoekbalk, scrollt pagina automatisch naar inventaris overzicht
- 2025-08-12: Zoekfunctionaliteit uitgebreid om ook door zoektermen te filteren - items worden nu gevonden via naam, beschrijving, categorie EN zoektermen
- 2025-08-12: Deployment performance optimalisaties geïmplementeerd - gzip compressie, database connection pooling, HTTP caching, React Query caching voor snellere production performance
- 2025-08-12: Uitgebreide performance optimalisaties toegevoegd - server-side caching, efficient data structures (Map lookups), database query optimalisatie, parallel data fetching
- 2025-08-11: Item bijwerken knop probleem opgelost - formulier schema opgeschoond en verouderde velden verwijderd, edit dialog werkt nu correct