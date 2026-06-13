# Orion-mallin Testilauseet (Test Sentences)

Tämä tiedosto sisältää esimerkkilauseita Orion-kielimallin ja sen kielioppivalidaattorin (`validator.js`) testaamiseen. Voit kopioida näitä lauseita ja syöttää niitä suoraan visualisoijan käyttöliittymään (esim. tekstigeneroinnin aloitukseksi tai tokenizer-testaajaan).

---

## 1. Oikeelliset lauseet (Valid Sentences)

Nämä lauseet noudattavat täydellisesti Orion-kielen syntaktisia ja semanttisia sääntöjä. Kaikki nämä lauseet saavat validaattorilta hyväksynnän: **"Logical sentence ✅"**.

### A. Jaettu subjekti (Subject Ellipsis)
*Toinen lauseke jakaa saman toimijan ilman toistoa.*
* `<bos> an astronaut carefully scans the unknown anomaly and repairs the engine <eos>`
* `<bos> the pilot flies the spaceship into the nebula safely but lands on the moon <eos>`
* `<bos> a robot activates the shield with a crystal quickly and transmits the data <eos>`
* `<bos> the scientist explores the planet quietly although reaches the station <eos>`

### B. Joustava adverbin sijoittelu (Adverb Placement)
*Adverbi joko verbin edessä tai lausekkeen lopussa (ennen tai jälkeen prepositiofraasin).*
* `<bos> the commander quietly observes the star near the galaxy and the robot repairs the engine <eos>`
* `<bos> the scientist analyzes the toxic radiation carefully while the pilot flies the spaceship <eos>`
* `<bos> the pilot flies the spaceship into the nebula safely but the engine needs repairs <eos>`
* `<bos> the alien harvests the star with a cyborg silently because the alien needs the star <eos>`

### C. Intransitiiviset verbit (Intransitive Verbs)
*Verbit `lands`, `flies`, `escapes`, `enters`, `orbits`, `reaches` ilman suoraa objektia.*
* `<bos> the pilot flies to the planet because a creature attacks the robot <eos>`
* `<bos> the commander lands on the moon safely but a creature enters into the void <eos>`
* `<bos> a scientist escapes from the spaceship while the robot activates the shield <eos>`
* `<bos> the astronaut enters into the station silently and repairs the engine <eos>`

### D. Luonnolliset verbikohtaiset prepositiot
* `repairs` + `with` (työkalu):
  * `<bos> the engineer repairs the engine with a laser safely because the drone controls the engine <eos>`
* `transmits` + `to` (suunta):
  * `<bos> the robot transmits the signal to the pilot quietly and the pilot reaches the station <eos>`
* `lands` + `on` (pinta):
  * `<bos> the rover lands the probe on the planet quickly and scans the crystal <eos>`

---

## 2. Virheelliset lauseet (Invalid Sentences)

Nämä lauseet sisältävät tietoisia kielioppi- tai logiikkavirheitä. Validaattori tunnistaa nämä ja hylkää ne antaen perustellun virheilmoituksen.

### A. Artikkelivirheet (`a` vs `an`)
* `* <bos> a astronaut scans the planet <eos>`
  *Virhe:* `a astronaut` &rarr; pitäisi olla **`an`** astronaut (vokaalialku).
* `* <bos> an pilot flies the spaceship <eos>`
  *Virhe:* `an pilot` &rarr; pitäisi olla **`a`** pilot (konsonanttialku).
* `* <bos> the pilot flies into a empty station <eos>`
  *Virhe:* `a empty` &rarr; pitäisi olla **`an`** empty station.

### B. Toimija-verbi-yhteensopimattomuus (Subject-Verb Mismatch)
* `* <bos> the robot harvests the crystal <eos>`
  *Virhe:* Robot (kone) ei voi suorittaa verbiä `harvests` (vain alienit/cyborgit voivat kerätä resursseja).
* `* <bos> the scientist destroys the asteroid <eos>`
  *Virhe:* Scientist (ihminen) ei koskaan tuhoa (`destroys`). Tuhoaminen on varattu muukalaisille ja kseno-olioille.
* `* <bos> the alien repairs the engine <eos>`
  *Virhe:* Alien (muukalainen) ei osaa korjata (`repairs`) ihmisten moottoreita.

### C. Verbi-objekti-yhteensopimattomuus (Verb-Object Mismatch)
* `* <bos> the scientist analyzes the spaceship <eos>`
  *Virhe:* `analyzes` ei voi kohdistua alukseen (`spaceship` &rarr; pitäisi olla esim. `data` tai `crystal`).
* `* <bos> the astronaut repairs the radiation <eos>`
  *Virhe:* Säteilyä (`radiation`) ei voi korjata. Moottorit ja suojakilvet voi.
* `* <bos> the robot transmits the spaceship <eos>`
  *Virhe:* Avaruusalusta ei voi lähettää (`transmits`). Vain signaalia ja dataa voi lähettää.

### D. Väärät tai epäloogiset prepositiot
* `* <bos> the commander repairs the engine into the moon <eos>`
  *Virhe:* Korjaaminen (`repairs`) ei voi kohdistua sijaintiin prepositiolla `into`. Oikea prepositio välineelle on `with`.
* `* <bos> the robot lands on the radiation <eos>`
  *Virhe:* Laskeutuminen (`lands`) ei voi tapahtua säteilyn (`radiation`) pinnalle, koska se ei ole kiinteä pinta.
* `* <bos> the astronaut escapes near the gravity <eos>`
  *Virhe:* Painovoiman (`gravity`) lähelle ei voi paeta (`near` ei sovi abstrakteille voimille).

### E. Liikaa adverbejä (Too many adverbs)
* `* <bos> the pilot quickly flies the spaceship safely <eos>`
  *Virhe:* Lausekkeessa on kaksi adverbiä (`quickly` ja `safely`). Vain yksi adverbi per lauseke on sallittu pituuden ja rakenteen pitämiseksi selkeänä.
