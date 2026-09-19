# Gebruikershomepage

`/` opent `/feed`. Iedereen kan openbare bijdragen lezen. Ingelogde leden krijgen een compacte composer, hun groepslinks en (indien beheerder) een keuze om namens een organisatie te publiceren.

## Berichten en filters

- `posts.kind`: `post`, `announcement` of `photo`; bestaande berichten blijven `post`.
- URL-filters `type`, `onderwerp`, `sort`, `pagina` zijn combineerbaar en blijven behouden bij pagineren. 30 bijdragen per pagina.
- Populair: likes minus dislikes, dan likes, datum en ID. Nieuwste: datum en ID. De filters werken vóór de paginering.
- Een post vereist een HTTPS-bron. Eigen mededelingen en fotobijschriften kunnen zonder externe bron. Claims over anderen horen altijd met bron; de UI maakt ontbrekende externe bronnen zichtbaar.
- De publicatiefunctie en DB-RLS controleren organisatiebeheerders onafhankelijk. De attributie kan niet achteraf door een client worden gewijzigd.

## Live gedrag

`/api/feed/status` geeft een no-store vingerafdruk van de eerste 30 zichtbare bijdragen: ID, wijzigingsdatum en reacties, plus het totale aantal. Er staan geen privégegevens of fototokens in. De homepage controleert elke 20 seconden wanneer de tab zichtbaar is, zonder overlappende requests. Bovenaan wordt automatisch vernieuwd. Tijdens schrijven of verderop lezen verschijnt een knop voor nieuwe activiteit. Oudere pagina's vernieuwen alleen handmatig. Een mislukte verbinding wordt gemeld en opnieuw geprobeerd.

## Foto's

Eén JPG, PNG of WebP per fotobijdrage, maximaal 3 MiB. MIME-type, bestandssignatuur, grootte en beschrijving worden server-side gecontroleerd; de bucket begrenst type en grootte ook. Geen SVG of willekeurige externe afbeelding-URL's.

De private bucket `vardena-post-photos` staat los van andere projectbuckets. Uploads krijgen `auth.uid()/randomUUID.ext`; alleen eigen uploads zijn toegestaan. Alleen de eigenaar of lezers van een gepubliceerde bijdrage kunnen een downloadlink aanvragen. Links verlopen na één uur; een al uitgegeven link blijft tot die tijd geldig na intrekken van een bijdrage. Niet publiceren wat geheim moet blijven. Gepubliceerde bestanden zijn niet overschrijfbaar of los verwijderbaar. Bij een mislukte publicatie wordt de upload opgeruimd; bij een harde procesonderbreking kan een ongekoppelde upload achterblijven.

Server Actions accepteren maximaal 4 MiB voor multipart overhead bij een foto van 3 MiB. Afbeeldingen worden zonder externe optimizer weergegeven, zodat ondertekende links niet langer in een optimizer-cache blijven hangen.

## Latere uitbreidingen

Meerdere foto's kunnen naar een aparte `post_media`-tabel met dezelfde eigenaarscontrole. Voeg moderatie/melden, correctiehistorie en periodieke opruiming van ongekoppelde uploads toe voordat het platform groot wordt. De eenvoudige statuspoll kan later worden vervangen door Realtime-notificaties zonder het feedmodel te veranderen.
