# Vardena

Een Next.js-platform voor openbare, controleerbare berichten over publieke macht en invloed.

## Ingebouwd

- Responsive landingspagina en openbare feed
- E-mailregistratie en login via Supabase Auth
- Beveiligde cookie-sessies via de Next.js Proxy
- Berichten plaatsen met een verplichte openbare bron
- Row Level Security: gebruikers beheren alleen hun eigen bijdragen
- Redactionele statussen voor publicatie, verbergen en controle

## Lokaal starten

1. Voer npm install uit.
2. Kopieer .env.example naar .env.local.
3. Vul de Supabase URL, publishable key en site-URL in.
4. Kies de juiste databasemigratie hieronder.
5. Voer npm run dev uit.

Gebruik nooit een Supabase secret- of service-role-key in een NEXT_PUBLIC variabele.

## Database installeren

- **Nieuw, leeg Supabase-project:** voer eerst `202609190001_vardena_core.sql` uit en daarna `20260919154811_vardena_posts_shared_project.sql`.
- **Gedeeld project met bestaande `public.profiles`:** voer alleen `20260919154811_vardena_posts_shared_project.sql` uit. De oude bootstrap maakt zelf profielen en een signup-trigger aan en mag niet op een bestaand gedeeld project worden uitgevoerd.

De tweede migratie is toegepast op project `frvkibbrbxiqrlmlfnxc`. Zij voegt `public.posts` toe, activeert RLS, geeft bezoekers leesrechten op gepubliceerde berichten en laat leden alleen hun eigen berichten plaatsen en beheren. Alleen de beheerder kan de publicatiestatus wijzigen. Bestaande profielrechten blijven behouden: bij een afgeschermd profiel staat publiek ‘Vardena-lid’ als auteur.

De website meldt leesfouten apart van een lege berichtenlijst. Technische opslagfouten worden alleen met hun foutcode in serverlogs vastgelegd; bezoekers krijgen een Nederlandse melding.
