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

## Sociale functies

- `/feed`: compacte tijdlijn, één like of dislike per account, reacties wisselen of verwijderen.
- `/bericht/[id]`: vaste openbare link met de volledige tekst; delen gebruikt het deelmenu van het apparaat of kopieert de link.
- `/account/profiel` en `/mensen`: publieke Vardena-profielen, zoeken en gebruikersnamen. Bestaande gedeelde accountprofielen worden niet openbaar gemaakt. Bestaande gebruikers activeren hun Vardena-profiel zelf; nieuwe registraties via Vardena krijgen dit profiel direct.
- `/inbox`: gesprekken met ongelezen aantallen. Een gesprek controleert elke 5 seconden op nieuwe berichten zolang het tabblad zichtbaar is. Oudere berichten zijn gepagineerd; de inbox ververst elke 15 seconden.

Voer na de berichtentabel ook `20260919160342_vardena_social_features.sql` uit. Deze migratie is toegepast op het gedeelde productieproject. `vardena_members`, `vardena_reactions` en `vardena_messages` gebruiken RLS. Beide leesviews gebruiken `security_invoker=true`.

Privéberichten zijn alleen leesbaar voor afzender en ontvanger. De afzender kan de inhoud na verzending niet wijzigen; alleen de ontvanger kan een bericht als gelezen markeren. De API gebruikt `Cache-Control: private, no-store`. Publieke profielen bevatten geen e-mailadressen. Nieuwe functies gebruiken de bestaande publishable key en gebruikerssessie, geen service-role-key.
# Organisaties

Organisaties melden zich aan via `/organisaties/nieuw` en worden vanuit een eigen
persoonlijk account beheerd. Het openbare profiel bevat missie, standpunten,
werkwijze en optioneel een manifest. In de besloten groep staan ledenbeheer,
aanmeldingen, groepschat, likes, publicaties en persoonlijke opdrachten met
checklists. De eigenaar benoemt beheerders; afvinken doet het toegewezen lid.

De startpagina opent nu de openbare populaire tijdlijn. De berekening en grenzen
staan op `/over`. Het moduleontwerp, uitbreidingsplan en rechten staan in
`docs/organizations.md`; Nuncius' originele manifest in `docs/nuncius-manifest.md`.

Voer `20260919171658_vardena_organizations.sql` na de eerdere Vardena-migraties uit.
`scripts/test-organizations.cjs` controleert de echte databaserechten met tijdelijke
accounts. Het script vereist expliciete testprojectvariabelen en laat alleen ids
van op te ruimen fixtures achter. Gebruik geen bestaande gebruikers als fixtures.

## Homepage, zoeken en gesprekken

De homepage gebruikt losse berichtkaarten met type- en onderwerpfilters, een live
activiteitsindicator en een blok met echte organisaties. De achtergrond blijft wit.
`20260919180136_vardena_home_feed_media.sql` voegt mededelingen en privé opgeslagen
foto-bestanden toe; openbare foto-posts geven tijdelijk leesbare afbeeldingslinks.

Voer daarna `20260919182628_vardena_discovery_bookmarks_comments.sql` uit:

- Zoeken (`/feed?q=...`) gebruikt Nederlandse full-text search in titel, onderwerp
  en inhoud. Zoeken, soort bijdrage, onderwerp, sortering en paginering werken samen.
- Bladwijzers staan in `vardena_bookmarks`. `/opgeslagen` vereist een sessie en toont
  uitsluitend de eigen leeslijst; RLS beschermt dit ook bij directe API-aanroepen.
- `vardena_comments` bevat echte openbare reacties van opt-in Vardena-profielen.
  Alleen de auteur mag een reactie verwijderen. Een verborgen bovenliggend bericht
  verbergt ook de reacties en tellingen. De status en datum zijn niet client-wijzigbaar.
- Reacties hebben maximaal 1200 tekens. De client maakt één id per concept aan,
  zodat een herhaalde serveractie geen dubbele reactie plaatst. Tekst wordt escaped.
- Alle nieuwe views zijn `security_invoker`. Er is geen service-key in de app.

Verificatie: `npm run lint`, `npm run build -- --webpack`, daarna optioneel
`ALLOW_LIVE_TESTS=1 node --env-file=.env.local scripts/test-discovery.cjs`.
Dit laatste script maakt expliciet herkenbare tijdelijke accounts en een bericht,
test echte serveracties, RLS en gerenderde pagina’s, verwijdert zijn content en trekt
de sessies in. Verwijder aansluitend uitsluitend de afgedrukte testaccount-ids via
het beheer. Draai bij voorkeur op een apart testproject; het script is standaard uit.

Uitbreiden kan per module: meldingen op basis van echte reacties, meldknoppen met
een besloten moderatiewachtrij, of opgeslagen zoekopdrachten. Voeg daarvoor eigen
tabellen met RLS en tests toe. Bewaarde berichten en privégesprekken mogen nooit in
publieke ranglijsten of activiteitsoverzichten terechtkomen. Er is geen kunstmatige
activiteit, nepaccounts voor engagement of gemanipuleerde publicatiedatum toegevoegd.
