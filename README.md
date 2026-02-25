# Mastodon bot: heute_vor@mastodon.social

Ein Bot, der historische Ereignisse zum heutigen Datum von der deutschen Wikipedia-API abruft und als Mastodon-Toots postet.

## Setup

```sh
npm install
```

## Bauen & Ausführen

```sh
MASTODON_INSTANCE_URL="https://your.instance" MASTODON_ACCESS_TOKEN="your_secret" npx tsx heute-vor.ts
```

## Funktionsweise

1. Ruft "An diesem Tag"-Ereignisse von der Wikimedia-REST-API ab (`https://api.wikimedia.org/feed/v1/wikipedia/de/onthisday/selected/${mm}/${dd}`)
2. Sortiert die Ereignisse chronologisch
3. Formatiert jedes Ereignis als "Vor X Jahren: ..." mit einem Wikipedia-Link
4. Postet die Toots als Thread auf Mastodon [mithilfe der Mastodon Rest API](https://docs.joinmastodon.org/methods/statuses/#create)

## Lizenz
Die komplette Software steht unter [AGPL-3.0 license](/LICENSE).

## 54 Grad Software GmbH
Wir freuen uns immer über neue Kontakte und Projekt(ideen). Mehr Infos zu findest du auf unserer [Website](https://www.54gradsoftware.de/) oder schreib uns direkt an kontakt@54gradsoftware.de. Mann kann uns auch auf Mastodon folgen [54gradsoftware@norden.social](https://norden.social/@54gradsoftware).
