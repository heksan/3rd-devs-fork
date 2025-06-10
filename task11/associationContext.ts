export const ASSOCIATION_SYSTEM_PROMPT =
`Znajdź fakty powiązane z aktualnie przetwarzanym raportem na podstawie poniższego wejścia.

<prompt_objective>
Celem tego promptu jest identyfikacja numerów faktów z sekcji FAKTY, które są powiązane z informacjami zawartymi w sekcji KONTEKST, przy czym powiązania mogą występować przez osoby, lokalizacje, technologie lub inne elementy, a drobne różnice w pisowni (literówki) należy traktować jako zgodność.
</prompt_objective>

<prompt_rules>
- Analizuj wyłącznie treść w sekcji KONTEKST i FAKTY.
- Powiązania mogą dotyczyć osób, lokalizacji, technologii lub innych elementów wspólnych.
- Rozpoznawaj i traktuj jako zgodne drobne różnice w pisowni (np. literówki w nazwiskach, nazwach miejscowości, technologii).
- Odpowiedź ZAWSZE w formacie: lista numerów powiązanych faktów w nawiasach kwadratowych, np. [1,2,3].
- NIE dodawaj żadnych wyjaśnień, komentarzy, tekstu przed ani po liście.
- Jeśli nie znaleziono żadnych powiązań, odpowiedz pustą listą: [].
- ABSOLUTNIE ZABRONIONE jest generowanie numerów faktów nieobecnych w sekcji FAKTY.
- ZAWSZE stosuj się do wzorców z poniższych przykładów, ale IGNORUJ ich konkretną treść (stosuj tylko strukturę i sposób odpowiedzi).
- W przypadku braku sekcji KONTEKST lub FAKTY odpowiedz „NO DATA AVAILABLE”.
- Sektor należy uznać jako ten sam gdy zgadza się jego litera (np sektor B1 to to samo co sektor B)
</prompt_rules>

<prompt_examples>
USER:
KONTEKST:
 W dniu 12 listopada 2024 roku w sektorze A1 w Warszawie doszło do awarii systemu monitoringu. W zdarzeniu brał udział zespół IT.
FAKTY:
1:Sektor A to serce fabryki, gdzie odbywa się montaż zarówno zaawansowanych robotów.
AI: [1]

USER: 
KONTEKST:
Jan Kowalski z Warszawy przeprowadził test systemu X.
FAKTY:
1:Test systemu X wykonał Jan Kowaski w Warszawie,2:Serwer Y został uruchomiony w Krakowie,3:Anna Nowak wdrożyła system Z.
.
AI: [1]

USER:
KONTEKST:
W Gdańsku doszło do awarii systemu monitoringu.
FAKTY:
1:Awaria systemu monitoringu w Gdańsku,2:Test systemu Z w Poznaniu,3:Modernizacja infrastruktury w Gdańsku.
.
AI: [1,3]

USER:
KONTEKST:
Projekt dotyczył wdrożenia technologii ABC przez zespół IT.
FAKTY:
1:Wdrożenie technologii ABC,2:Zespół IT przeprowadził testy,3:Awaria systemu DEF.
.
AI: [1,2]

USER:
KONTEKST:
Anna Nowak przeprowadziła szkolenie z obsługi systemu DEF.
FAKTY:
1:Szkolenie prowadziła Anna Nowk,2:Test systemu DEF,3:Awaria w Warszawie.
.
AI: [1,2]

USER:
KONTEKST:
W Poznaniu wdrożono nowy system zarządzania.
FAKTY:
1:Nowy system zarządzania w Poznaniu,2:Usterka w Gdańsku,3:Testy systemu w Krakowie.
.
AI: [1]

USER:
KONTEKST:
Jan Kowalski przeprowadził test.
FAKTY:
1:Test wykonał Jan Kowalski,2:Test wykonał Anna Nowak.
.
AI: [1]
</prompt_examples>'`;