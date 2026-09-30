#!/bin/bash
#
# Sprawdzenie produkcji: stan migracji, dostepnosc stron, zachowanie cronow
# i webhookow. Do uruchamiania po kazdym wdrozeniu.
#
# Powstal, bo zasada Z2 mowi, ze „ukonczone" znaczy miedzy innymi „wywolane na
# produkcji i wynik zapisany". Recznie sprawdza sie za kazdym razem inaczej
# i za kazdym razem czegos brakuje.
#
# Uruchomienie:
#   ./scripts/sprawdz-produkcje.sh
#
# Czyta .env.local z katalogu projektu. Nie zmienia niczego — same odczyty.

set -uo pipefail

KAT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KAT"

if [ ! -f .env.local ]; then
  echo "Brak .env.local w $KAT" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.local >/dev/null 2>&1
set +a

BAZA="${NEXT_PUBLIC_SUPABASE_URL:-}"
KLUCZ="${SUPABASE_SERVICE_ROLE_KEY:-}"
STRONA="${NEXT_PUBLIC_SITE_URL:-https://www.nobooking.eu}"

# Produkcja przekierowuje z golej domeny na www. Bez podazania za
# przekierowaniem kazde sprawdzenie zwracaloby 307 zamiast wlasciwego kodu.
STRONA=$(curl -s -o /dev/null -w '%{url_effective}' -L "$STRONA/" | sed 's:/$::')

ZIELONY=$'\033[32m'; CZERWONY=$'\033[31m'; ZOLTY=$'\033[33m'; KONIEC=$'\033[0m'
BLEDY=0

ok()    { printf '  %s✓%s %s\n' "$ZIELONY" "$KONIEC" "$1"; }
zle()   { printf '  %s✗%s %s\n' "$CZERWONY" "$KONIEC" "$1"; BLEDY=$((BLEDY+1)); }
uwaga() { printf '  %s!%s %s\n' "$ZOLTY" "$KONIEC" "$1"; }

naglowek() { printf '\n%s\n' "$1"; }

# ── Kolumny i tabele, czyli czy migracje poszly ───────────────────────────────
kolumna() {   # tabela, kolumna, nazwa migracji
  local kod
  kod=$(curl -s -o /dev/null -w '%{http_code}' \
    "$BAZA/rest/v1/$1?select=$2&limit=1" \
    -H "apikey: $KLUCZ" -H "Authorization: Bearer $KLUCZ")
  if [ "$kod" = "200" ]; then ok "$1.$2"; else zle "$1.$2 — brak (migracja: $3)"; fi
}

tabela() {    # tabela, nazwa migracji
  local kod
  kod=$(curl -s -o /dev/null -w '%{http_code}' \
    "$BAZA/rest/v1/$1?select=*&limit=1" \
    -H "apikey: $KLUCZ" -H "Authorization: Bearer $KLUCZ")
  if [ "$kod" = "200" ]; then ok "tabela $1"; else zle "tabela $1 — brak (migracja: $2)"; fi
}

naglowek "── Migracje"
kolumna orders utm_source           "2026-09-29-atrybucja.sql"
kolumna orders click_id             "2026-09-29-atrybucja.sql"
kolumna sites  sms_phone            "2026-09-29-sms.sql"
kolumna sites  sms_enabled          "2026-09-29-sms.sql"
tabela  sms_log                     "2026-09-29-sms.sql"
tabela  guest_notifications         "2026-09-29-powiadomienia-gosci.sql"
kolumna orders review_request_sent_at "2026-09-30-prosba-o-opinie-klienta.sql"
kolumna orders revision_token        "2026-09-30-poprawki.sql"
kolumna orders revision_count        "2026-09-30-poprawki.sql"
tabela  checkin_forms               "(w schemacie od poczatku)"

# ── Kazda tabela, do ktorej siega kod ─────────────────────────────────────────
#
# Cztery razy w tym projekcie zdarzylo sie, ze kod byl wdrozony, a migracja nie:
# odnowienia, poprawki klienta, prosba o opinie, bot Messengera. Za kazdym razem
# funkcja milczala zamiast krzyczec. To sprawdzenie zamyka cala klase: lista
# tabel bierze sie z kodu, wiec nie da sie dodac odwolania i zapomniec o migracji.
naglowek "── Tabele uzywane w kodzie"

# Tabele bota nalezą do etapu 4 i celowo jeszcze nie istnieja. Wymienione
# wprost, zeby ich brak nie zamienil sie w codzienny czerwony szum.
OCZEKIWANY_BRAK="bot_settings bot_knowledge bot_leads bot_conversations"

for T in $(grep -rho "from('[a-z_]*')" src/ | sed "s/from('//;s/')//" | sort -u); do
  KOD=$(curl -s -o /dev/null -w '%{http_code}' \
    "$BAZA/rest/v1/$T?select=*&limit=1" \
    -H "apikey: $KLUCZ" -H "Authorization: Bearer $KLUCZ")
  if [ "$KOD" = "200" ]; then
    ok "$T"
  elif echo "$OCZEKIWANY_BRAK" | grep -qw "$T"; then
    uwaga "$T — brak, ale to oczekiwane (bot, etap 4)"
  else
    zle "$T — TABELA NIE ISTNIEJE, a kod jej uzywa"
  fi
done

# ── Strony publiczne ──────────────────────────────────────────────────────────
naglowek "── Strony"
# Cennik jest kotwica na stronie glownej (#cennik), nie osobna podstrona.
for SC in "/" "/zamow?plan=basic&currency=pln"; do
  KOD=$(curl -sL -o /dev/null -w '%{http_code}' "$STRONA$SC")
  [ "$KOD" = "200" ] && ok "$SC" || zle "$SC → $KOD"
done

SLUG=$(curl -s "$BAZA/rest/v1/sites?select=slug&active=is.true&limit=1" \
  -H "apikey: $KLUCZ" -H "Authorization: Bearer $KLUCZ" \
  | sed -n 's/.*"slug":"\([^"]*\)".*/\1/p')

if [ -n "$SLUG" ]; then
  for SC in "/sites/$SLUG" "/api/sites/$SLUG/availability"; do
    KOD=$(curl -sL -o /dev/null -w '%{http_code}' "$STRONA$SC")
    [ "$KOD" = "200" ] && ok "$SC" || zle "$SC → $KOD"
  done
else
  uwaga "brak aktywnej strony w bazie — pomijam sprawdzenie strony apartamentu"
fi

# ── Crony: musza zawodzic na zamknieto ────────────────────────────────────────
naglowek "── Crony bez sekretu (oczekiwane 401)"
for C in provision-sites cleanup-pending-bookings review-requests \
         backup-bookings renewal-reminders health guest-reminders; do
  KOD=$(curl -sL -o /dev/null -w '%{http_code}' "$STRONA/api/cron/$C")
  [ "$KOD" = "401" ] && ok "$C" || zle "$C → $KOD (powinno byc 401)"
done

# ── Webhook Stripe: podpis musi rozstrzygac ───────────────────────────────────
naglowek "── Webhook Stripe"
KOD=$(curl -sL -o /dev/null -w '%{http_code}' -X POST "$STRONA/api/stripe/webhook" \
  -H "Content-Type: application/json" -H "Stripe-Signature: t=1,v1=zly" \
  -d '{"id":"evt_test","type":"ping"}')
[ "$KOD" = "400" ] && ok "zly podpis odrzucony" || zle "zly podpis → $KOD (powinno byc 400)"

# ── Kopia zapasowa ────────────────────────────────────────────────────────────
naglowek "── Kopia zapasowa"
WIEK=$(curl -s -X POST "$BAZA/storage/v1/object/list/app-data" \
  -H "apikey: $KLUCZ" -H "Authorization: Bearer $KLUCZ" -H "Content-Type: application/json" \
  -d '{"prefix":"backups","limit":1,"sortBy":{"column":"created_at","order":"desc"}}' \
  | python3 -c '
import sys, json, datetime
try:
    d = json.load(sys.stdin)
    if not d: print("brak"); raise SystemExit
    t = datetime.datetime.fromisoformat(d[0]["created_at"].replace("Z", "+00:00"))
    print(round((datetime.datetime.now(datetime.timezone.utc) - t).total_seconds() / 3600))
except Exception:
    print("blad")
' 2>/dev/null)

case "$WIEK" in
  brak|blad) zle "nie udalo sie ustalic wieku kopii" ;;
  *) if [ "$WIEK" -le 36 ] 2>/dev/null; then ok "ostatnia kopia sprzed ${WIEK} h"
     else zle "ostatnia kopia sprzed ${WIEK} h (prog: 36 h)"; fi ;;
esac

# ── Podsumowanie ──────────────────────────────────────────────────────────────
printf '\n'
if [ "$BLEDY" -eq 0 ]; then
  printf '%sWszystko w porzadku.%s\n' "$ZIELONY" "$KONIEC"
else
  printf '%sProblemow: %d%s\n' "$CZERWONY" "$BLEDY" "$KONIEC"
fi
exit $(( BLEDY > 0 ? 1 : 0 ))
