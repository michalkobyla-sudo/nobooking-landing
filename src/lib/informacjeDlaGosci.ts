import type { Lang } from '@/lib/apartmentTypes'
import { DNI_RETENCJI } from '@/lib/checkin'

/**
 * Informacja dla gości: kto przetwarza ich dane, warunki rezerwacji i skąd
 * pochodzą opinie. Strona `/sites/[slug]/informacje` każdego apartamentu.
 *
 * **Dlaczego to nasz problem, choć administratorem jest właściciel.**
 * Formularz rezerwacji i online check-in zbierają dane gości, a art. 13 RODO
 * każe poinformować o tym w chwili zbierania. Właściciel tego nie napisze —
 * nie wie nawet, jakie dane zbiera nasz formularz i komu je przekazujemy.
 * Do 2026-11-09 strony apartamentów nie miały żadnej takiej informacji.
 *
 * Treść musi zgadzać się z kodem — każde zdanie o działaniu systemu ma
 * pokrycie: retencja dokumentów (`DNI_RETENCJI`), zasady opinii
 * (`guest/[bookingId]/opinia/route.ts`: tylko po wyjeździe, jedna na
 * rezerwację, publikacja przez właściciela), płatności (direct charges Stripe).
 */

export interface DaneInformacji {
  nazwaObiektu: string
  /** Imię i nazwisko albo firma właściciela z zamówienia. Pusty = nieznany. */
  administrator: string
  email: string
  telefon?: string
  /** Online check-in — pakiet Pro. */
  checkin: boolean
  /** Czy właściciel ukończył Stripe; bez tego rezerwacja idzie przez kontakt. */
  platnosciOnline: boolean
  /** Bezwzględny adres polityki prywatności Nobooking. */
  politykaNobooking: string
}

export interface Sekcja {
  tytul: string
  akapity: string[]
  punkty?: string[]
  /** Odnośnik do polityki prywatności Nobooking zaraz po pierwszym akapicie. */
  polityka?: true
}

export interface Informacje {
  tytul: string
  sekcje: Sekcja[]
  powrot: string
  /** Etykieta odnośnika do polityki Nobooking (wstawianego w sekcji 3). */
  politykaEtykieta: string
}

/** Krótkie teksty do strony apartamentu — stopka, formularz, opinie. */
export const ETYKIETY: Record<Lang, { link: string; przedRezerwacja: string; opinie: string; jakToDziala: string }> = {
  pl: {
    link: 'Prywatność i warunki rezerwacji',
    przedRezerwacja: 'Przed rezerwacją przeczytaj:',
    opinie: 'Opinie wyłącznie od gości po pobycie, zatwierdzane przez właściciela.',
    jakToDziala: 'Jak to działa',
  },
  en: {
    link: 'Privacy & booking terms',
    przedRezerwacja: 'Before booking, please read:',
    opinie: 'Reviews only from guests after their stay, approved by the owner.',
    jakToDziala: 'How it works',
  },
  es: {
    link: 'Privacidad y condiciones de reserva',
    przedRezerwacja: 'Antes de reservar, consulta:',
    opinie: 'Opiniones solo de huéspedes tras su estancia, aprobadas por el propietario.',
    jakToDziala: 'Cómo funciona',
  },
  de: {
    link: 'Datenschutz & Buchungsbedingungen',
    przedRezerwacja: 'Bitte vor der Buchung lesen:',
    opinie: 'Bewertungen nur von Gästen nach ihrem Aufenthalt, vom Eigentümer freigegeben.',
    jakToDziala: 'So funktioniert es',
  },
}

const kontakt = (d: DaneInformacji, tel: string) => d.email + (d.telefon ? `, ${tel} ${d.telefon}` : '')

export function informacjeDlaGosci(lang: Lang, d: DaneInformacji): Informacje {
  return TRESC[lang](d)
}

const TRESC: Record<Lang, (d: DaneInformacji) => Informacje> = {
  pl: d => ({
    tytul: 'Prywatność i warunki rezerwacji',
    powrot: `← ${d.nazwaObiektu}`,
    politykaEtykieta: 'polityka prywatności Nobooking',
    sekcje: [
      {
        tytul: 'Kto odpowiada za Twoje dane',
        akapity: [
          d.administrator
            ? `Administratorem Twoich danych osobowych jest ${d.administrator} — właściciel obiektu ${d.nazwaObiektu}. Kontakt: ${kontakt(d, 'tel.')}.`
            : `Administratorem Twoich danych osobowych jest właściciel obiektu ${d.nazwaObiektu}. Kontakt: ${kontakt(d, 'tel.')}.`,
          'Stronę i system rezerwacji dostarcza Nobooking (KobylinskiStudio.pl Michał Kobyliński), który przetwarza dane wyłącznie w imieniu właściciela.',
        ],
      },
      {
        tytul: 'Jakie dane i po co',
        akapity: ['Podanie danych jest dobrowolne, ale bez danych rezerwacji nie da się jej przyjąć.'],
        punkty: [
          'Rezerwacja — imię i nazwisko, e-mail, telefon, daty pobytu, liczba osób i uwagi: żeby przyjąć i zrealizować rezerwację (art. 6 ust. 1 lit. b RODO).',
          ...(d.platnosciOnline ? ['Płatność — obsługuje ją Stripe. Dane karty trafiają bezpośrednio do Stripe; ani właściciel, ani Nobooking ich nie widzą.'] : []),
          ...(d.checkin ? ['Online check-in — imiona i nazwiska gości, numery dokumentów, obywatelstwo i godzina przyjazdu: gdy rejestracji gości wymagają przepisy kraju, w którym leży obiekt (art. 6 ust. 1 lit. c RODO).'] : []),
          'Opinia — imię, ocena i treść: publikowane na stronie po zatwierdzeniu przez właściciela, za Twoją zgodą wyrażoną przez wysłanie opinii (art. 6 ust. 1 lit. a RODO). Zgodę możesz w każdej chwili wycofać.',
          'Wiadomości — potwierdzenie rezerwacji, przypomnienie przed przyjazdem i prośba o opinię po pobycie, wysyłane na Twój e-mail.',
        ],
      },
      {
        tytul: 'Kto jeszcze ma dostęp do danych',
        polityka: true,
        akapity: [
          'Nobooking i jego dostawcy usług — hosting, baza danych, wysyłka e-maili i SMS-ów' + (d.platnosciOnline ? ' — oraz Stripe przy płatnościach' : '') + '. Część z nich ma siedzibę w USA; dane są wtedy chronione decyzją Komisji Europejskiej albo standardowymi klauzulami umownymi. Pełna lista:',
          'Dane nie są sprzedawane ani wykorzystywane do reklam.',
        ],
      },
      {
        tytul: 'Jak długo przechowujemy dane',
        akapity: [],
        punkty: [
          'Dane rezerwacji — przez czas działania tej strony oraz okres, przez który przepisy podatkowe wymagają przechowywania dokumentów rozliczeniowych.',
          ...(d.checkin ? [`Numery dokumentów z check-inu — ${DNI_RETENCJI} dni od wyjazdu, potem są usuwane automatycznie.`] : []),
          'Opinie — do wycofania zgody albo usunięcia przez właściciela.',
        ],
      },
      {
        tytul: 'Twoje prawa',
        akapity: [
          `Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia i sprzeciwu, a także prawo wycofania zgody na publikację opinii. Napisz do właściciela: ${d.email}.`,
          'Możesz też złożyć skargę do organu ochrony danych — w Polsce jest to Prezes Urzędu Ochrony Danych Osobowych — albo do organu w kraju, w którym mieszkasz.',
        ],
      },
      {
        tytul: 'Warunki rezerwacji',
        akapity: [],
        punkty: [
          'Umowę o pobyt zawierasz z właścicielem obiektu. Nobooking dostarcza wyłącznie stronę i system rezerwacji i nie jest stroną tej umowy.',
          'Cena pobytu to suma cen za noce według sezonu oraz opłata za sprzątanie. Pełną kwotę widzisz przed złożeniem rezerwacji.',
          d.platnosciOnline
            ? 'Płacisz przy rezerwacji, kartą lub inną metodą dostępną w oknie płatności Stripe. Pieniądze trafiają bezpośrednio do właściciela. Potwierdzenie dostajesz mailem.'
            : `Rezerwację ustalasz bezpośrednio z właścicielem: ${kontakt(d, 'tel.')}.`,
          'Zasady anulowania i zwrotu pieniędzy ustala właściciel — zapytaj o nie przed rezerwacją.',
          'Rezerwacja noclegu na konkretne daty nie podlega 14-dniowemu prawu odstąpienia od umowy zawartej na odległość (art. 16 lit. l dyrektywy 2011/83/UE; w Polsce art. 38 ust. 1 pkt 12 ustawy o prawach konsumenta).',
        ],
      },
      {
        tytul: 'Skąd pochodzą opinie',
        akapity: [
          'O opinię prosimy wyłącznie gości, którzy zakończyli pobyt — przez osobisty link wysłany mailem po wyjeździe albo dostępny w portalu gościa. Z jednej rezerwacji można dodać jedną opinię. Właściciel zatwierdza opinie przed publikacją. Średnia ocena jest liczona wyłącznie z opublikowanych opinii.',
        ],
      },
    ],
  }),

  en: d => ({
    tytul: 'Privacy & booking terms',
    powrot: `← ${d.nazwaObiektu}`,
    politykaEtykieta: 'Nobooking privacy policy (in Polish)',
    sekcje: [
      {
        tytul: 'Who is responsible for your data',
        akapity: [
          d.administrator
            ? `The controller of your personal data is ${d.administrator}, the owner of ${d.nazwaObiektu}. Contact: ${kontakt(d, 'phone')}.`
            : `The controller of your personal data is the owner of ${d.nazwaObiektu}. Contact: ${kontakt(d, 'phone')}.`,
          'The website and booking system are provided by Nobooking (KobylinskiStudio.pl Michał Kobyliński), which processes data solely on behalf of the owner.',
        ],
      },
      {
        tytul: 'What data and why',
        akapity: ['Providing data is voluntary, but a booking cannot be accepted without it.'],
        punkty: [
          'Booking — name, email, phone, dates, number of guests and notes: to accept and carry out your booking (Art. 6(1)(b) GDPR).',
          ...(d.platnosciOnline ? ['Payment — handled by Stripe. Card details go directly to Stripe; neither the owner nor Nobooking can see them.'] : []),
          ...(d.checkin ? ['Online check-in — guest names, ID document numbers, nationality and arrival time: where guest registration is required by the law of the country where the property is located (Art. 6(1)(c) GDPR).'] : []),
          'Review — name, rating and text: published on the website after approval by the owner, based on your consent given by submitting the review (Art. 6(1)(a) GDPR). You can withdraw it at any time.',
          'Messages — booking confirmation, a reminder before arrival and a request for a review after your stay, sent to your email.',
        ],
      },
      {
        tytul: 'Who else has access',
        polityka: true,
        akapity: [
          'Nobooking and its service providers — hosting, database, email and SMS delivery' + (d.platnosciOnline ? ' — and Stripe for payments' : '') + '. Some are based in the USA; in that case data is protected by a European Commission adequacy decision or standard contractual clauses. Full list:',
          'Data is never sold or used for advertising.',
        ],
      },
      {
        tytul: 'How long we keep data',
        akapity: [],
        punkty: [
          'Booking data — for as long as this website operates and for the period tax law requires accounting records to be kept.',
          ...(d.checkin ? [`ID document numbers from check-in — ${DNI_RETENCJI} days after departure, then deleted automatically.`] : []),
          'Reviews — until you withdraw consent or the owner removes them.',
        ],
      },
      {
        tytul: 'Your rights',
        akapity: [
          `You have the right to access, rectify and erase your data, to restrict processing, to data portability and to object, and the right to withdraw consent to publishing your review. Write to the owner: ${d.email}.`,
          'You may also lodge a complaint with a data protection authority — in Poland, the President of the Personal Data Protection Office — or with the authority in your country of residence.',
        ],
      },
      {
        tytul: 'Booking terms',
        akapity: [],
        punkty: [
          'Your accommodation contract is with the owner of the property. Nobooking only provides the website and booking system and is not a party to that contract.',
          'The price is the sum of the nightly rates for the season plus the cleaning fee. You see the full amount before booking.',
          d.platnosciOnline
            ? 'You pay when booking, by card or another method offered in the Stripe payment window. The money goes directly to the owner. You receive a confirmation by email.'
            : `You arrange the booking directly with the owner: ${kontakt(d, 'phone')}.`,
          'Cancellation and refund rules are set by the owner — please ask about them before booking.',
          'Bookings of accommodation for specific dates are not subject to the 14-day right of withdrawal for distance contracts (Art. 16(l) of Directive 2011/83/EU).',
        ],
      },
      {
        tytul: 'Where reviews come from',
        akapity: [
          'Only guests who have completed their stay are asked for a review — through a personal link sent by email after departure or available in the guest portal. Each booking can add one review. The owner approves reviews before publication. The average rating is calculated only from published reviews.',
        ],
      },
    ],
  }),

  es: d => ({
    tytul: 'Privacidad y condiciones de reserva',
    powrot: `← ${d.nazwaObiektu}`,
    politykaEtykieta: 'política de privacidad de Nobooking (en polaco)',
    sekcje: [
      {
        tytul: 'Quién es responsable de tus datos',
        akapity: [
          d.administrator
            ? `El responsable del tratamiento de tus datos personales es ${d.administrator}, propietario de ${d.nazwaObiektu}. Contacto: ${kontakt(d, 'tel.')}.`
            : `El responsable del tratamiento de tus datos personales es el propietario de ${d.nazwaObiektu}. Contacto: ${kontakt(d, 'tel.')}.`,
          'La web y el sistema de reservas los proporciona Nobooking (KobylinskiStudio.pl Michał Kobyliński), que trata los datos únicamente por cuenta del propietario.',
        ],
      },
      {
        tytul: 'Qué datos y para qué',
        akapity: ['Facilitar los datos es voluntario, pero sin ellos no es posible aceptar la reserva.'],
        punkty: [
          'Reserva — nombre y apellidos, email, teléfono, fechas, número de personas y observaciones: para aceptar y gestionar tu reserva (art. 6.1.b RGPD).',
          ...(d.platnosciOnline ? ['Pago — lo gestiona Stripe. Los datos de la tarjeta van directamente a Stripe; ni el propietario ni Nobooking pueden verlos.'] : []),
          ...(d.checkin ? ['Check-in online — nombres de los huéspedes, números de documento, nacionalidad y hora de llegada: cuando el registro de viajeros lo exige la ley del país donde se encuentra el alojamiento (art. 6.1.c RGPD).'] : []),
          'Opinión — nombre, puntuación y texto: se publican en la web tras la aprobación del propietario, con tu consentimiento expresado al enviarla (art. 6.1.a RGPD). Puedes retirarlo en cualquier momento.',
          'Mensajes — confirmación de la reserva, recordatorio antes de la llegada y solicitud de opinión tras la estancia, enviados a tu email.',
        ],
      },
      {
        tytul: 'Quién más tiene acceso',
        polityka: true,
        akapity: [
          'Nobooking y sus proveedores — alojamiento web, base de datos, envío de emails y SMS' + (d.platnosciOnline ? ' — y Stripe para los pagos' : '') + '. Algunos tienen sede en EE. UU.; en ese caso los datos están protegidos por una decisión de adecuación de la Comisión Europea o por cláusulas contractuales tipo. Lista completa:',
          'Los datos nunca se venden ni se usan con fines publicitarios.',
        ],
      },
      {
        tytul: 'Cuánto tiempo conservamos los datos',
        akapity: [],
        punkty: [
          'Datos de la reserva — mientras funcione esta web y durante el plazo que la normativa fiscal exige conservar la documentación contable.',
          ...(d.checkin ? [`Números de documento del check-in — ${DNI_RETENCJI} días desde la salida; después se eliminan automáticamente.`] : []),
          'Opiniones — hasta que retires tu consentimiento o el propietario las elimine.',
        ],
      },
      {
        tytul: 'Tus derechos',
        akapity: [
          `Tienes derecho de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición, así como a retirar el consentimiento para publicar tu opinión. Escribe al propietario: ${d.email}.`,
          'También puedes presentar una reclamación ante una autoridad de protección de datos — en España, la Agencia Española de Protección de Datos — o ante la autoridad de tu país de residencia.',
        ],
      },
      {
        tytul: 'Condiciones de reserva',
        akapity: [],
        punkty: [
          'El contrato de alojamiento lo celebras con el propietario. Nobooking solo proporciona la web y el sistema de reservas y no es parte de ese contrato.',
          'El precio es la suma de las tarifas por noche según la temporada más la tarifa de limpieza. Ves el importe total antes de reservar.',
          d.platnosciOnline
            ? 'Pagas al reservar, con tarjeta u otro método disponible en la ventana de pago de Stripe. El dinero va directamente al propietario. Recibes la confirmación por email.'
            : `La reserva se acuerda directamente con el propietario: ${kontakt(d, 'tel.')}.`,
          'Las condiciones de cancelación y reembolso las fija el propietario — pregunta por ellas antes de reservar.',
          'Las reservas de alojamiento para fechas concretas no están sujetas al derecho de desistimiento de 14 días de los contratos a distancia (art. 16.l de la Directiva 2011/83/UE).',
        ],
      },
      {
        tytul: 'De dónde vienen las opiniones',
        akapity: [
          'Solo pedimos opinión a huéspedes que han terminado su estancia — mediante un enlace personal enviado por email tras la salida o disponible en el portal del huésped. Cada reserva puede añadir una opinión. El propietario aprueba las opiniones antes de publicarlas. La puntuación media se calcula solo con las opiniones publicadas.',
        ],
      },
    ],
  }),

  de: d => ({
    tytul: 'Datenschutz & Buchungsbedingungen',
    powrot: `← ${d.nazwaObiektu}`,
    politykaEtykieta: 'Datenschutzerklärung von Nobooking (auf Polnisch)',
    sekcje: [
      {
        tytul: 'Wer für Ihre Daten verantwortlich ist',
        akapity: [
          d.administrator
            ? `Verantwortlicher für Ihre personenbezogenen Daten ist ${d.administrator}, Eigentümer von ${d.nazwaObiektu}. Kontakt: ${kontakt(d, 'Tel.')}.`
            : `Verantwortlicher für Ihre personenbezogenen Daten ist der Eigentümer von ${d.nazwaObiektu}. Kontakt: ${kontakt(d, 'Tel.')}.`,
          'Website und Buchungssystem stellt Nobooking (KobylinskiStudio.pl Michał Kobyliński) bereit, das die Daten ausschließlich im Auftrag des Eigentümers verarbeitet.',
        ],
      },
      {
        tytul: 'Welche Daten und wozu',
        akapity: ['Die Angabe der Daten ist freiwillig, ohne sie kann die Buchung jedoch nicht angenommen werden.'],
        punkty: [
          'Buchung — Name, E-Mail, Telefon, Reisedaten, Personenzahl und Anmerkungen: zur Annahme und Durchführung Ihrer Buchung (Art. 6 Abs. 1 lit. b DSGVO).',
          ...(d.platnosciOnline ? ['Zahlung — wird von Stripe abgewickelt. Kartendaten gehen direkt an Stripe; weder der Eigentümer noch Nobooking können sie sehen.'] : []),
          ...(d.checkin ? ['Online-Check-in — Namen der Gäste, Ausweisnummern, Staatsangehörigkeit und Ankunftszeit: soweit die Gästeregistrierung nach dem Recht des Landes vorgeschrieben ist, in dem die Unterkunft liegt (Art. 6 Abs. 1 lit. c DSGVO).'] : []),
          'Bewertung — Name, Note und Text: werden nach Freigabe durch den Eigentümer auf der Website veröffentlicht, auf Grundlage Ihrer mit dem Absenden erteilten Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können sie jederzeit widerrufen.',
          'Nachrichten — Buchungsbestätigung, Erinnerung vor der Anreise und Bitte um eine Bewertung nach dem Aufenthalt, an Ihre E-Mail-Adresse.',
        ],
      },
      {
        tytul: 'Wer noch Zugriff hat',
        polityka: true,
        akapity: [
          'Nobooking und seine Dienstleister — Hosting, Datenbank, Versand von E-Mails und SMS' + (d.platnosciOnline ? ' — sowie Stripe für Zahlungen' : '') + '. Einige haben ihren Sitz in den USA; die Daten sind dann durch einen Angemessenheitsbeschluss der Europäischen Kommission oder durch Standardvertragsklauseln geschützt. Vollständige Liste:',
          'Daten werden nie verkauft oder für Werbung genutzt.',
        ],
      },
      {
        tytul: 'Wie lange wir Daten speichern',
        akapity: [],
        punkty: [
          'Buchungsdaten — solange diese Website betrieben wird und so lange, wie das Steuerrecht die Aufbewahrung von Buchhaltungsunterlagen verlangt.',
          ...(d.checkin ? [`Ausweisnummern aus dem Check-in — ${DNI_RETENCJI} Tage nach der Abreise, danach automatische Löschung.`] : []),
          'Bewertungen — bis zum Widerruf Ihrer Einwilligung oder bis zur Löschung durch den Eigentümer.',
        ],
      },
      {
        tytul: 'Ihre Rechte',
        akapity: [
          `Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, die Einwilligung zur Veröffentlichung Ihrer Bewertung zu widerrufen. Schreiben Sie an den Eigentümer: ${d.email}.`,
          'Sie können sich außerdem bei einer Datenschutzaufsichtsbehörde beschweren — in Polen beim Präsidenten des Amtes für den Schutz personenbezogener Daten — oder bei der Behörde in Ihrem Wohnsitzland.',
        ],
      },
      {
        tytul: 'Buchungsbedingungen',
        akapity: [],
        punkty: [
          'Den Beherbergungsvertrag schließen Sie mit dem Eigentümer der Unterkunft. Nobooking stellt nur die Website und das Buchungssystem bereit und ist nicht Partei dieses Vertrags.',
          'Der Preis setzt sich aus den Übernachtungspreisen der jeweiligen Saison und der Reinigungsgebühr zusammen. Den Gesamtbetrag sehen Sie vor der Buchung.',
          d.platnosciOnline
            ? 'Sie zahlen bei der Buchung, per Karte oder mit einer anderen im Stripe-Zahlungsfenster angebotenen Methode. Das Geld geht direkt an den Eigentümer. Die Bestätigung erhalten Sie per E-Mail.'
            : `Die Buchung vereinbaren Sie direkt mit dem Eigentümer: ${kontakt(d, 'Tel.')}.`,
          'Stornierungs- und Erstattungsbedingungen legt der Eigentümer fest — bitte fragen Sie vor der Buchung danach.',
          'Buchungen von Unterkünften für bestimmte Termine unterliegen nicht dem 14-tägigen Widerrufsrecht bei Fernabsatzverträgen (Art. 16 Buchst. l der Richtlinie 2011/83/EU).',
        ],
      },
      {
        tytul: 'Woher die Bewertungen stammen',
        akapity: [
          'Um eine Bewertung bitten wir nur Gäste, die ihren Aufenthalt beendet haben — über einen persönlichen Link, der nach der Abreise per E-Mail gesendet wird oder im Gästeportal verfügbar ist. Pro Buchung ist eine Bewertung möglich. Der Eigentümer gibt Bewertungen vor der Veröffentlichung frei. Die Durchschnittsnote wird nur aus veröffentlichten Bewertungen berechnet.',
        ],
      },
    ],
  }),
}
