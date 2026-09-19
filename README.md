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
4. Voer de migratie in supabase/migrations uit.
5. Voer npm run dev uit.

Gebruik nooit een Supabase secret- of service-role-key in een NEXT_PUBLIC variabele.
