const stan = {
  gielda: "GPW",
  okres: "1mo",
  spolka: null,
  wykres: null,
};

const mapaOkresow = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "15m" },
  "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
  max: { range: "max", interval: "1mo" },
};

const szukaj = document.getElementById("szukaj");
const podpowiedzi = document.getElementById("podpowiedzi");
const statusEl = document.getElementById("status");
const tytul = document.getElementById("tytul");
const podtytul = document.getElementById("podtytul");
const statystyki = document.getElementById("statystyki");
const ostatniEl = document.getElementById("ostatni");
const zmianaEl = document.getElementById("zmiana");

function normalizuj(tekst) {
  return tekst.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function listaDlaGieldy() {
  return SPOLKI.filter((s) => s.gielda === stan.gielda);
}

function dopasuj(fraza) {
  const q = normalizuj(fraza.trim());
  const baza = listaDlaGieldy();
  if (!q) return baza.slice(0, 12);
  return baza
    .filter((s) => normalizuj(s.symbol + " " + s.nazwa).includes(q))
    .slice(0, 12);
}

function pokazPodpowiedzi(fraza) {
  const wyniki = dopasuj(fraza);
  podpowiedzi.innerHTML = "";
  if (!wyniki.length && fraza.trim()) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    const reczny = zbudujRecznySymbol(fraza.trim());
    btn.innerHTML = `<span>Użyj symbolu <strong>${reczny}</strong></span><span>${stan.gielda}</span>`;
    btn.addEventListener("click", () => wybierz({ symbol: reczny, nazwa: reczny, gielda: stan.gielda }));
    li.append(btn);
    podpowiedzi.append(li);
  } else {
    wyniki.forEach((s) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.innerHTML = `<span>${s.nazwa}</span><span>${s.symbol}</span>`;
      btn.addEventListener("click", () => wybierz(s));
      li.append(btn);
      podpowiedzi.append(li);
    });
  }
  podpowiedzi.hidden = podpowiedzi.children.length === 0;
}

function zbudujRecznySymbol(wpis) {
  const czysty = wpis.toUpperCase().replace(/\s+/g, "");
  if (stan.gielda === "GPW") {
    return czysty.endsWith(".WA") ? czysty : czysty.replace(/\.WA$/, "") + ".WA";
  }
  return czysty.replace(/\.WA$/, "");
}

function ustawStatus(tekst) {
  statusEl.textContent = tekst || "";
}

function yahooUrl(symbol, range, interval) {
  const params = new URLSearchParams({
    range,
    interval,
    events: "div,splits",
    includeAdjustedClose: "true",
  });
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`;
}

async function pobierzTekst(url) {
  const proby = [
    url,
    "https://corsproxy.io/?" + encodeURIComponent(url),
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(url),
  ];
  let ostatniBlad = null;
  for (const adres of proby) {
    try {
      const odp = await fetch(adres);
      if (!odp.ok) throw new Error("HTTP " + odp.status);
      return await odp.text();
    } catch (blad) {
      ostatniBlad = blad;
    }
  }
  throw ostatniBlad || new Error("Nie udało się pobrać danych");
}

function parsujYahoo(tekst) {
  const json = JSON.parse(tekst);
  const wynik = json.chart && json.chart.result && json.chart.result[0];
  if (!wynik) {
    const opis = json.chart && json.chart.error && json.chart.error.description;
    throw new Error(opis || "Brak danych dla tego symbolu");
  }
  const znaczniki = wynik.timestamp || [];
  const kwoty = (wynik.indicators.quote && wynik.indicators.quote[0]) || {};
  const zamkniecia = kwoty.close || [];
  const punkty = [];
  for (let i = 0; i < znaczniki.length; i += 1) {
    const cena = zamkniecia[i];
    if (cena == null || Number.isNaN(cena)) continue;
    const data = new Date(znaczniki[i] * 1000);
    punkty.push({ data, cena });
  }
  if (!punkty.length) throw new Error("Pusta seria notowań");
  const meta = wynik.meta || {};
  return { punkty, waluta: meta.currency || "", nazwa: meta.shortName || "", gielda: meta.exchangeName || "" };
}

function formatCena(wartosc, waluta) {
  const liczba = wartosc.toLocaleString("pl-PL", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return waluta ? `${liczba} ${waluta}` : liczba;
}

function formatEtykieta(data, okres) {
  if (okres === "1d" || okres === "5d") {
    return data.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  return data.toLocaleDateString("pl-PL");
}

function rysuj(punkty, waluta) {
  const etykiety = punkty.map((p) => formatEtykieta(p.data, stan.okres));
  const wartosci = punkty.map((p) => p.cena);
  const pierwszy = wartosci[0];
  const ostatni = wartosci[wartosci.length - 1];
  const wzrost = ostatni >= pierwszy;
  const kolor = wzrost ? "#3dd6c6" : "#ff6b7a";

  if (stan.wykres) stan.wykres.destroy();
  const ctx = document.getElementById("wykres");
  stan.wykres = new Chart(ctx, {
    type: "line",
    data: {
      labels: etykiety,
      datasets: [{
        data: wartosci,
        borderColor: kolor,
        backgroundColor: wzrost ? "rgba(61, 214, 198, 0.12)" : "rgba(255, 107, 122, 0.12)",
        fill: true,
        tension: 0.15,
        pointRadius: 0,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (el) => formatCena(el.parsed.y, waluta),
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#93a0b3", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          ticks: { color: "#93a0b3" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });

  const zmiana = ostatni - pierwszy;
  const proc = (zmiana / pierwszy) * 100;
  ostatniEl.textContent = formatCena(ostatni, waluta);
  zmianaEl.textContent = `${zmiana >= 0 ? "+" : ""}${zmiana.toFixed(2)} (${proc >= 0 ? "+" : ""}${proc.toFixed(2)}%)`;
  zmianaEl.className = zmiana >= 0 ? "plus" : "minus";
  statystyki.hidden = false;
}

async function laduj() {
  if (!stan.spolka) return;
  const { range, interval } = mapaOkresow[stan.okres];
  ustawStatus("Pobieram notowania…");
  try {
    const tekst = await pobierzTekst(yahooUrl(stan.spolka.symbol, range, interval));
    const dane = parsujYahoo(tekst);
    rysuj(dane.punkty, dane.waluta);
    tytul.textContent = `${stan.spolka.nazwa} · ${stan.spolka.symbol}`;
    podtytul.textContent = `${stan.spolka.gielda}${dane.gielda ? " · " + dane.gielda : ""}`;
    ustawStatus("");
  } catch (blad) {
    ustawStatus("Nie udało się wczytać wykresu: " + (blad.message || blad));
  }
}

function wybierz(spolka) {
  stan.spolka = spolka;
  szukaj.value = `${spolka.nazwa} (${spolka.symbol})`;
  podpowiedzi.hidden = true;
  laduj();
}

document.querySelectorAll(".gieldy button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".gieldy button").forEach((b) => b.classList.remove("aktywna"));
    btn.classList.add("aktywna");
    stan.gielda = btn.dataset.gielda;
    szukaj.value = "";
    pokazPodpowiedzi("");
  });
});

document.querySelectorAll(".okresy button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".okresy button").forEach((b) => b.classList.remove("aktywna"));
    btn.classList.add("aktywna");
    stan.okres = btn.dataset.okres;
    laduj();
  });
});

szukaj.addEventListener("focus", () => pokazPodpowiedzi(szukaj.value));
szukaj.addEventListener("input", () => pokazPodpowiedzi(szukaj.value));
szukaj.addEventListener("keydown", (zdarzenie) => {
  if (zdarzenie.key === "Enter") {
    zdarzenie.preventDefault();
    const pierwsze = dopasuj(szukaj.value)[0];
    if (pierwsze) wybierz(pierwsze);
    else if (szukaj.value.trim()) {
      const symbol = zbudujRecznySymbol(szukaj.value.trim());
      wybierz({ symbol, nazwa: symbol, gielda: stan.gielda });
    }
  }
});

document.addEventListener("click", (zdarzenie) => {
  if (!zdarzenie.target.closest(".szukaj")) podpowiedzi.hidden = true;
});

pokazPodpowiedzi("");
wybierz(listaDlaGieldy()[0]);
