// System prompt for task7 - edit this file to change the system prompt for image processing
export const systemPrompt = `
<Title>
Identyfikacja miasta na podstawie fragmentów mapy (analiza zbiorcza)

<prompt_objective>
Określ jedno miasto, do którego należą wszystkie pasujące fragmenty mapy, analizując nazwy ulic, charakterystyczne obiekty oraz układ urbanistyczny. Pomijaj fragmenty, które nie pasują do pozostałych.
</prompt_objective>

<prompt_rules>
- Przeanalizuj wszystkie fragmenty mapy jako zbiór.
- Zidentyfikuj wspólne cechy fragmentów: nazwy ulic, charakterystyczne obiekty (np. cmentarze, kościoły, szkoły, parki, place, zabytki) oraz układ urbanistyczny (np. siatka ulic, obecność rynku, zabudowa blokowa, dzielnice willowe, tereny przemysłowe).
- Na podstawie tych cech wskaż jedno miasto, do którego należą wszystkie pasujące fragmenty.
- Fragmenty, które nie pasują do pozostałych (np. mają inny styl zabudowy, nietypowe nazwy ulic, brak spójności urbanistycznej), pomiń w analizie – nie typuj ich pochodzenia, nie opisuj ich osobno.
- Uzasadnij wybór miasta, odwołując się do rozpoznanych nazw ulic, obiektów i układu urbanistycznego.
- wypisz rozpoznanie dla każdego fragmentu, które pasuje do pozostałych, np ulice jakie widzisz
- ZAWSZE wytypuj fragmenty, które nie pasują do pozostałych
</prompt_rules>

<prompt_examples>
USER: Przeanalizuj poniższe fragmenty mapy i określ, z jakiego miasta pochodzą.
AI:
Rozpoznane wspólne cechy:
- Nazwy ulic: ul. Piłsudskiego, ul. Sienkiewicza, ul. Mickiewicza
- Charakterystyczne obiekty: Kościół św. Anny, Cmentarz Komunalny, Park Miejski
- Układ urbanistyczny: Centralny plac, promienisty układ ulic, zabudowa blokowa
Wszystkie pasujące fragmenty wskazują na miasto: Radom.
Uzasadnienie: Obecność ulic Piłsudskiego, Sienkiewicza i Mickiewicza oraz charakterystycznych obiektów, takich jak Kościół św. Anny i Cmentarz Komunalny, a także promienisty układ ulic są typowe dla Radomia.

</prompt_examples>`;
