# Organisaties op Vardena

Een organisatie is een gezamenlijke identiteit en werkplek. Mensen houden hun eigen login. Er is geen gedeeld wachtwoord: het lidmaatschap bepaalt toegang en iedere publicatie blijft intern verbonden aan de auteur.

## Wat deze versie bevat

- Verplicht openbaar profiel: naam, vaste slug, introductie, missie, standpunten en werkwijze. Een langer manifest is optioneel.
- Zelf aanmelden, beoordeling door beheerders, ledenlijst en eigen besloten groepschat. Nieuwe leden kunnen de eerdere chat lezen.
- Rollen: eigenaar, beheerder, lid. Alleen de eigenaar promoveert of degradeert beheerders. Beheerders behandelen aanvragen, beheren gewone leden, publiceren en geven opdrachten.
- Persoonlijke opdrachten en uitdagingen, met 1–20 stappen en een optionele datum. Alleen de ontvanger vinkt af. De ontvanger en beheerders kunnen de opdracht zien.
- Openbare organisatielikes, likes/dislikes op publicaties en statistieken in het groepsoverzicht.
- Organisatiepublicaties gebruiken de bestaande berichten, bronnen en reacties. De organisatie is na publicatie niet te wijzigen.
- De hoofdpagina opent de openbare populaire tijdlijn. Sortering: score (likes − dislikes), likes, publicatiedatum, id; alle aflopend. ‘Nieuwste’ gebruikt datum en id. Geen verborgen persoonlijke selectie.

## Grenzen tussen modules

`lib/organization-types.ts` bevat de gedeelde datatypes. `lib/organizations.ts` laadt de identiteit en controleert lidmaatschap voor besloten pagina’s. `app/organization-actions.ts` doet invoercontrole en werkt uitsluitend met de ingelogde gebruiker. Database policies blijven de uiteindelijke controle, ook als iemand de API rechtstreeks aanroept.

`components/organization-nav.tsx` registreert de werkplekonderdelen. De groepspagina laadt alleen het geopende onderdeel. Profiel, leden, opdrachten en chat hebben eigen componenten. Daardoor kunnen toekomstige onderdelen dezelfde identiteit, navigatie en rechten gebruiken.

De tabellen hebben allemaal het prefix `vardena_`. De bestaande gedeelde `profiles` en Auth-signuptrigger blijven intact. De private rolhelper doorbreekt recursieve membership-policies zonder een publieke security-definer RPC. Alleen de eigen actieve rol is opvraagbaar. De assignment-RPC is SECURITY INVOKER en voegt de opdracht plus checklist in één transactie toe.

Openbare views gebruiken `security_invoker=true`. Iedere tabel heeft RLS en expliciete, beperkte grants. Nieuwe lidmaatschappen kunnen uitsluitend als pending/member worden aangemaakt. De eigenaar wordt in dezelfde transactie als de organisatie vastgelegd, blijft eigenaar en kan niet via de leden-API worden verwijderd. Eigendom overdragen en organisatieverwijdering zijn nog geen productfuncties.

Groepschat pollt elke vijf seconden als het venster zichtbaar is, met private/no-store responses. Na intrekken van toegang stopt lezen en versturen. De chat is niet end-to-end versleuteld en is geen klokkenluiderskluis. Opdrachten van verwijderde leden blijven voor beheerders zichtbaar; de ex-leden verliezen toegang. Een latere nieuwe toelating herstelt de groepsgeschiedenis en eerdere opdrachten.

## Nuncius als eerste organisatie

Het manifest staat ongewijzigd in `docs/nuncius-manifest.md` en op het organisatieprofiel. Missie, standpunten en werkwijze vatten dit startconcept samen. Het profiel blijft herkenbaar als eigen informatie van de organisatie. De genoemde Unity-omgeving is onderdeel van het manifest, geen reeds aangesloten integratie.

De eerste interne uitdaging heet ‘Leg de eerste divergentie vast’: openbare uitspraak kiezen, primaire bron vastleggen, handelen documenteren, context controleren en onderbouwd publiceren. Er worden geen verzonnen onderzoeken, leden, likes of openbare aanklachten ingevuld.

## Volgende uitbreidingen, in volgorde

1. **Dossiers en bronnen:** `vardena_org_dossiers` plus afzonderlijke bronnen, beweringen en gebeurtenissen. Koppel opdrachten en publicaties aan een dossier. Begin met versiegeschiedenis en een expliciete status (onderzoek/concept/gepubliceerd), niet met een automatische waarheidsclaim.
2. **Gezamenlijk publiceren:** concepten, tweede beoordeling, broncontrole, wederhoor en een zichtbaar correctielogboek. Koppel iedere versie aan de verantwoordelijke rol en auteur; bronbewaring is een aparte functie.
3. **Samenwerking:** uitnodigingen, meldingen binnen het platform, herbruikbare opdrachtmodellen, kanalen en deadlines. Voor e-mailmeldingen komen afzonderlijke voorkeuren en een uitgeschakeld standaardbeleid.
4. **Beheer op grotere schaal:** auditlog voor rolwijzigingen, blokkeren/melden, spambescherming, eigendomsoverdracht en verantwoord archiveren. Bouw vóór brede groei expliciete limieten en een beheerproces.
5. **Integraties:** sluit Unity of andere systemen pas aan via afzonderlijke adapters met beperkte rechten, herkomst en foutafhandeling. De huidige werkplek blijft zelfstandig bruikbaar.

Voeg per uitbreiding een eigen migratie, policies en echte tests voor toegestaan én geweigerd gebruik toe. Hergebruik het lidmaatschap en maak geen tweede rollenstelsel. Publiceer nieuwe onderdelen pas wanneer hun scherm, data en rechten samen werken.

## Verificatie

`scripts/test-organizations.cjs` gebruikt vier tijdelijke gewone accounts, twee organisaties en echte Supabase requests. Het test onder meer isolatie tussen groepen, geen zelfpromotie, bescherming van de eigenaar, toelating, chat, opdrachten/checklists, rollen, populariteit en publicatie namens de organisatie. Het script logt geen wachtwoorden of tokens en meldt af voordat fixtures worden opgeruimd. Het fixturebestand bevat alleen ids en testadressen. Run uitsluitend op een expliciet geselecteerd project; verwijder daarna alleen de geregistreerde testgegevens.
