# Giełda — wykresy (moja pierwsza apka)

Aplikacja w przeglądarce: wybierasz giełdę (**GPW**, **NYSE**, **Nasdaq**), ticker i okres, a potem oglądasz wykres kursu.

Dane historyczne pochodzą z [Yahoo Finance](https://finance.yahoo.com) (spółki z GPW mają symbol z końcówką `.WA`, np. `PKO.WA`).

To narzędzie edukacyjne. Notowania mogą być opóźnione. To nie jest porada inwestycyjna.

## Uruchomienie

```bash
git clone https://github.com/dariuszkuzel-blip/gielda-wykresy.git
cd gielda-wykresy
```

Otwórz `index.html` w przeglądarce.

Jeśli wykres się nie ładuje (blokada CORS), aplikacja próbuje zapasowego proxy. Możesz też odpalić lokalny serwer:

```bash
python3 -m http.server 8080
```

i wejść na `http://localhost:8080`.

## Pliki

| Plik | Rola |
|---|---|
| `index.html` | Układ strony |
| `styles.css` | Wygląd |
| `tickers.js` | Lista popularnych spółek |
| `app.js` | Wyszukiwanie, pobieranie danych, wykres |

## Jak dodać spółkę

Dopisz wpis w `tickers.js` albo wpisz symbol ręcznie w polu wyszukiwania (GPW: `CDR.WA`, USA: `AAPL`).
