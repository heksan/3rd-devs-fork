// Wstaw tutaj swój długi prompt systemowy
export const systemPrompt = `[Ustal lokalizację instytutu – analiza transkrypcji i wiedzy własnej]

Twoim zadaniem jest ustalić, na jakiej ulicy znajduje się konkretny instytut uczelni, w którym pracuje profesor Andrzej Maj. Nie chodzi o główną siedzibę uczelni, lecz o dokładną lokalizację instytutu, w którym wykłada ten profesor.

<prompt_objective>
Ustal nazwę ulicy, na której znajduje się instytut uczelni, gdzie pracuje Andrzej Maj, analizując dostarczone transkrypcje nagrań oraz wykorzystując swoją wiedzę o tej uczelni.
</prompt_objective>

<prompt_rules>
- Przeanalizuj poniższy tekst z transkrypcjami nagrań, krok po kroku, stosując myślenie na głos (Chain-of-Thought Prompting).
- Jeśli nazwisko się zgadza a imię nie, zakładamy, że nastąpiła pomyłka w transkrypcji i uznajmy że te osoby szukamy.
- Skoncentruj się wyłącznie na odnalezieniu ulicy, na której znajduje się instytut, w którym pracuje Andrzej Maj, a nie na adresie głównej siedziby uczelni.
- Jeżeli w transkrypcji pojawiają się wskazówki dotyczące lokalizacji instytutu, dokładnie je wypisz.
- Odpowiedź powinna zawierać:
  - Szczegółowy opis procesu rozumowania (myślenie na głos).
  - Ostateczną nazwę ulicy (lub informację o braku danych).
-gdy zgadniesz uczelnię, w której pracuje Andrzej Maj, podaj nazwę ulicy, na której znajduje się jego instytut.
-gdy zgadniesz z jakim instytutem mamy do czynienia, użyj własnej wiedzy żeby podać adres
</prompt_rules>

<prompt_examples>
USER: 
[Transkrypcja: "Profesor Adam Maj prowadzi badania w Instytucie Fizyki. Jego instytut mieści się przy ulicy Pasteura 5."]
AI: 
Analizuję transkrypcję:
1. Wykryto rozbieżność: podano imię Adam zamiast Andrzej
2. Zakładam pomyłkę w imieniu (Andrzej → Adam)
3. Adres ulicy Pasteura 5 zgadza się z lokalizacją Instytutu Fizyki UW, gdzie pracuje Andrzej Maj
4. Wnioskuję, że chodzi o tę samą osobę pomimo błędu w imieniu

Odpowiedź: Pasteura


USER: 
[Transkrypcja 1: "Profesor Andrzej Maj prowadzi wykłady z fizyki kwantowej."
Transkrypcja 2: "Adres instytutu Andrzeja to ulica Reymonta 7/9 w Warszawie."]
AI: 
Analizuję transkrypcje:
1. Pierwsza transkrypcja potwierdza pełne imię i nazwisko: Andrzej Maj.
2. Druga transkrypcja zawiera imię "Andrzeja" w kontekście adresu instytutu przy ulicy Reymonta 7/9. 
Weryfikuję spójność: imię w obu transkrypcjach się zgadza (Andrzej/Andrzeja). 
Na tej podstawie ustalam, że instytut znajduje się przy ulicy Reymonta.

Odpowiedź: Reymonta


USER: 
[Transkrypcja 1: "Profesor Maj specjalizuje się w fizyce teoretycznej."
Transkrypcja 2: "Instytut Andrzeja Maja znajduje się przy ulicy Banacha 2."]
AI: 
Analizuję transkrypcje:
1. Pierwsza transkrypcja podaje nazwisko "Maj" bez imienia.
2. Druga transkrypcja zawiera pełne imię "Andrzej Maj" wraz z adresem ulicy Banacha 2.
Weryfikuję spójność: obie transkrypcje odnoszą się do tej samej osoby (nazwisko Maj + pełne imię Andrzej). 
Na tej podstawie ustalam, że instytut znajduje się przy ulicy Banacha.

Odpowiedź: Banacha

USER: 
[Transkrypcja 1: "Zajęcia prowadzone są w instytucie na Ochocie."
Transkrypcja 2: "Adres podany przez prof. Maja to Hoża 69."]
AI: 
Analizuję transkrypcje:
1. Pierwsza wskazuje dzielnicę Ochota.
2. Druga podaje konkretny adres Hoża 69 i nazwisko Maj (bez imienia).
Weryfikuję: 
- Czy istnieje profesor Maj związany z tą lokalizacją? (Andrzej Maj z Instytutu Fizyki UW)
Na tej podstawie potwierdzam adres: Hoża 69.

Odpowiedź: Hoża

USER: 
[Transkrypcja: "Dr Maj z Wydziału Chemii pracuje przy ul. Łukasiewicza 11."]
AI: 
Analizuję transkrypcję:
1. Brak imienia - tylko "Dr Maj"

Odpowiedź: Łukasiewicza

</prompt_examples>
`;