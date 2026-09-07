const stan = {
  gielda: "GPW",
  okres: "D",
  spolka: null,
};

const mapaInterwal = {
  5: "5",
  15: "15",
  D: "D",
  D3: "D",
  D6: "D",
  W: "W",
  M: "M",
  MMAX: "M",
};

const szukaj = document.getElementById("szukaj");
const podpowiedzi = document.getElementById("podpowiedzi");
const statusEl = document.getElementById("status");
const tytul = document.getElementById("tytul");
const podtytul = document.getElementById("podtytul");

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

function symbolTV(spolka) {
  if (spolka.tv) return spolka.tv;
  const czysty = spolka.symbol.toUpperCase().replace(".WA", "").replace(/^GPW:/, "");
  if (stan.gielda === "GPW" || spolka.gielda === "GPW") return "GPW:" + czysty;
  if (stan.gielda === "NYSE" || spolka.gielda === "NYSE") {
    if (czysty === "SPY") return "AMEX:SPY";
    return "NYSE:" + czysty;
  }
  if (czysty === "QQQ") return "NASDAQ:QQQ";
  return "NASDAQ:" + czysty;
}

function zbudujReczny(wpis) {
  const czysty = wpis.toUpperCase().replace(/\s+/g, "").replace(".WA", "");
  const gielda = stan.gielda;
  const symbol = gielda === "GPW" ? czysty + ".WA" : czysty;
  return { symbol, nazwa: czysty, gielda };
}

function pokazPodpowiedzi(fraza) {
  const wyniki = dopasuj(fraza);
  podpowiedzi.innerHTML = "";
  if (!wyniki.length && fraza.trim()) {
    const reczny = zbudujReczny(fraza.trim());
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.innerHTML = `<span>Użyj symbolu <strong>${reczny.nazwa}</strong></span><span>${stan.gielda}</span>`;
    btn.addEventListener("click", () => wybierz(reczny));
    li.append(btn);
    podpowiedzi.append(li);
  } else {
    wyniki.forEach((s) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.innerHTML = `<span>${s.nazwa}</span><span>${s.symbol.replace(".WA", "")}</span>`;
      btn.addEventListener("click", () => wybierz(s));
      li.append(btn);
      podpowiedzi.append(li);
    });
  }
  podpowiedzi.hidden = podpowiedzi.children.length === 0;
}

function rysuj() {
  if (!stan.spolka) return;
  if (typeof TradingView === "undefined") {
    statusEl.textContent = "Nie wczytał się silnik wykresu. Odśwież stronę.";
    return;
  }

  const symbol = symbolTV(stan.spolka);
  tytul.textContent = `${stan.spolka.nazwa} · ${stan.spolka.symbol.replace(".WA", "")}`;
  podtytul.textContent = `${stan.spolka.gielda} · ${symbol}`;
  statusEl.textContent = "";

  const box = document.getElementById("tv");
  box.innerHTML = "";
  const id = "tv_" + Date.now();
  const miejsce = document.createElement("div");
  miejsce.id = id;
  miejsce.style.width = "100%";
  miejsce.style.height = "100%";
  box.append(miejsce);

  // eslint-disable-next-line no-new
  new TradingView.widget({
    autosize: true,
    symbol,
    interval: mapaInterwal[stan.okres] || "D",
    timezone: "Europe/Warsaw",
    theme: "dark",
    style: "1",
    locale: "pl",
    hide_top_toolbar: false,
    hide_legend: false,
    allow_symbol_change: false,
    calendar: false,
    hide_side_toolbar: true,
    withdateranges: true,
    container_id: id,
  });
}

function wybierz(spolka) {
  stan.spolka = spolka;
  szukaj.value = `${spolka.nazwa}`;
  podpowiedzi.hidden = true;
  rysuj();
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
    rysuj();
  });
});

szukaj.addEventListener("focus", () => pokazPodpowiedzi(szukaj.value));
szukaj.addEventListener("input", () => pokazPodpowiedzi(szukaj.value));
szukaj.addEventListener("keydown", (zdarzenie) => {
  if (zdarzenie.key === "Enter") {
    zdarzenie.preventDefault();
    const pierwsze = dopasuj(szukaj.value)[0];
    if (pierwsze) wybierz(pierwsze);
    else if (szukaj.value.trim()) wybierz(zbudujReczny(szukaj.value.trim()));
  }
});

document.addEventListener("click", (zdarzenie) => {
  if (!zdarzenie.target.closest(".szukaj")) podpowiedzi.hidden = true;
});

function start() {
  pokazPodpowiedzi("");
  wybierz(listaDlaGieldy()[0]);
}

if (typeof TradingView !== "undefined") start();
else {
  const czekaj = setInterval(() => {
    if (typeof TradingView !== "undefined") {
      clearInterval(czekaj);
      start();
    }
  }, 200);
  setTimeout(() => {
    clearInterval(czekaj);
    if (!stan.spolka) start();
  }, 4000);
}
