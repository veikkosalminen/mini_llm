# ORION-kielen Logiikka ja Semanttiset Säännöt

ORION on edistynyt synteettinen englanninkielinen kieli, joka on suunniteltu **Orion-kielimallin** (3 kerrosta, 4 attention-päätä, `d_model: 64`, `d_ff: 128`) koulutusta, testausta ja visualisointia varten. Sen tarkoituksena on tarjota avaruus- ja scifi-teemainen, säännönmukainen mutta erittäin luonnollista englantia jäljittelevä kieliympäristö.

Kielen sanasto koostuu **tasan 100 sanasta** (mukaan lukien erikoistokenit).

---

## 1. Sanasto (Vocabulary)

ORION-kielen 100 sanaa jakautuvat kieliopillisiin luokkiin seuraavasti:

### A. Erikoistokenit (3 kpl)
* `<pad>`: Täytesana lauseiden tasaamiseksi (ID: 0)
* `<bos>`: Lauseen alku (Beginning of Sentence, ID: 1)
* `<eos>`: Lauseen loppu (End of Sentence, ID: 2)

### B. Artikkelit ja Pronominit (3 kpl)
* `the`, `a`, `an`

### C. Toimijat / Subjektit (12 kpl)
* **Ihmismiehistö (Humans)**: `astronaut`, `commander`, `pilot`, `engineer`, `scientist`
* **Koneet ja Luotaimet (Machines)**: `robot`, `drone`, `rover`, `probe`
* **Muukalaiset ja Kseno-oliot (Aliens/Others)**: `alien`, `creature`, `cyborg`

### D. Kohteet / Avaruusesineet (18 kpl)
* `spaceship`, `station`, `planet`, `moon`, `star`, `galaxy`, `asteroid`, `crystal`, `signal`, `engine`, `shield`, `laser`, `data`, `anomaly`, `void`, `nebula`, `gravity`, `radiation`

### E. Adjektiivit (18 kpl)
* `large`, `small`, `distant`, `unknown`, `strange`, `ancient`, `broken`, `active`, `silent`, `bright`, `dark`, `dangerous`, `mysterious`, `frozen`, `toxic`, `magnetic`, `empty`, `hidden`

### F. Adverbit (10 kpl)
* `quickly`, `slowly`, `quietly`, `carefully`, `secretly`, `instantly`, `safely`, `constantly`, `bravely`, `silently`

### G. Konjunktiot (6 kpl)
* `and`, `but`, `because`, `although`, `if`, `while`

### H. Prepositiot (6 kpl)
* `on`, `near`, `to`, `with`, `from`, `into`

### I. Verbit (24 kpl)
* `scans`, `explores`, `analyzes`, `observes`, `detects`, `discovers`, `flies`, `orbits`, `lands`, `enters`, `repairs`, `activates`, `transmits`, `protects`, `attacks`, `destroys`, `harvests`, `fears`, `studies`, `controls`, `needs`, `escapes`, `ignores`, `reaches`

---

## 2. Lauseen Rakenne (Syntaksi)

Jokainen ORION-kielen lause alkaa merkillä `<bos>` ja päättyy merkkiin `<eos>`. Lauseen enimmäispituus on 20 tokenia.

Lause koostuu **kahdesta lausekkeesta (clause)**, jotka on yhdistetty yhdellä konjunktiolla:
```
<bos> {Lauseke 1} {Konjunktio} {Lauseke 2} <eos>
```

### A. Täysi Lausekerakenne (Transitiivinen)
Jokainen lauseke noudattaa seuraavaa kaavaa (jossa sulkeissa olevat osat ovat valinnaisia):
```
[Artikkeli] [Adjektiivi] {Subjekti} [Adverbi] {Verbi} [Artikkeli] [Adjektiivi] {Objekti} [Prepositiofraasi]
```
Missä prepositiofraasi on muotoa:
```
{Prepositio} [Artikkeli] [Adjektiivi] {Sijainti}
```

### B. Yksinkertaistettu Lausekerakenne (Intransitiivinen)
Jos lauseesta tulisi muuten liian pitkä (yli 18 sanaa ennen erikoismerkkejä), toisena lausekkeena käytetään lyhyttä muotoa:
* **Ihmisille/Muukalaisille**: `the {Subjekti} escapes`
* **Koneille/Mönkijöille**: `the {Subjekti} lands`

---

## 3. Oikea Englannin kielioppi: "a" vs "an"

 ORION-kieli toteuttaa aidon englannin kielen mukaisen artikkelivalinnan. Indefiniittisen artikkelin on täsmättävä seuraavan sanan (adjektiivin tai substantiivin) ensimmäisen kirjaimen mukaan:

* **`an`** valitaan, jos seuraava sana alkaa **vokaalilla** (`a`, `e`, `i`, `o`, `u`):
  * *Esimerkkejä:* **`an`** `astronaut`, **`an`** `alien`, **`an`** `engineer`, **`an`** `ancient spaceship`, **`an`** `active robot`, **`an`** `empty station`
* **`a`** valitaan, jos seuraava sana alkaa **konsonantilla**:
  * *Esimerkkejä:* **`a`** `pilot`, **`a`** `commander`, **`a`** `small asteroid`, **`a`** `mysterious signal`

*Tämän säännön rikkominen (esim. `a astronaut` tai `an pilot`) hylätään kielioppivalidaattorissa.*

---

## 4. Semanttiset Säännöt (Loogiset Rajoitukset)

Jotta kieli kuulostaisi järkevältä, kielessä on tiukat semanttiset säännöt toimijoille, verbeille ja paikoille.

### A. Subjekti- ja verbirajoitukset
* **Ihmismiehistö** tekee tiedustelua ja huoltoa, eivätkä koskaan hyökkää tai pelkää (koulutettu miehistö):
  * *Sallitut verbit:* `scans`, `explores`, `analyzes`, `observes`, `detects`, `discovers`, `flies`, `orbits`, `lands`, `enters`, `repairs`, `activates`, `transmits`, `protects`, `studies`, `controls`, `needs`, `escapes`, `ignores`, `reaches`
* **Koneet/Luotaimet** suorittavat automatisoituja mittauksia ja huoltoja. Ne eivät tee vapaata tutkimusta (`explores`/`discovers`) eivätkä hyökkää tai pelkää:
  * *Sallitut verbit:* `scans`, `analyzes`, `observes`, `detects`, `flies`, `orbits`, `lands`, `enters`, `repairs`, `activates`, `transmits`, `protects`, `controls`
* **Muukalaiset/Kseno-oliot** voivat hyökätä, pelätä ja tuhota, mutta he eivät korjaa ihmisten laitteita:
  * *Sallitut verbit:* `observes`, `detects`, `orbits`, `enters`, `attacks`, `destroys`, `harvests`, `fears`, `ignores`, `reaches`

### B. Verbi- ja objektirajoitukset
* **Tutkimusverbit** (`scans`, `analyzes`, `observes`, `detects`, `studies`): kohdistuvat luonnonilmiöihin tai havaintoihin.
* **Navigointiverbit** (`flies`, `orbits`, `lands`, `enters`, `reaches`, `escapes`): kohdistuvat paikkoihin tai suuriin kohteisiin.
* **Huoltoverbit** (`repairs`, `activates`): kohdistuvat teknisiin järjestelmiin (`spaceship`, `station`, `engine`, `shield`, `laser`).
* **Viestintä** (`transmits`): kohdistuu vain tietoon (`signal`, `data`).
* **Vuorovaikutus toimijoiden välillä** (`protects`, `attacks`, `destroys`): kohdistuvat toiseen toimijaan (eri kuin itse).
* **Kerääminen** (`harvests`): kohdistuu resursseihin (`crystal`, `data`, `star`).
* **Hallinta** (`controls`): kohdistuu laitteisiin, aluksiin tai moottoriin.
* **Tarpeet** (`needs`): kohdistuu resursseihin tai suojiin.
* **Pelko** (`fears`): kohdistuu uhkiin tai tyhjyyteen (`anomaly`, `void`, `radiation`, `alien`, `creature`).

### C. Prepositiot ja Sijainnit (Loogiset suhteet)
Prepositiot eivät voi liittyä satunnaisiin sanoihin, vaan niiden on muodostettava järkeviä avaruusteemaisia ilmauksia:
* **`into`** (sisäänmeneminen): sijainnin on oltava suljettu tila tai säiliö:
  * *Sallitut:* `spaceship`, `station`, `planet`, `moon`, `star`, `galaxy`, `asteroid`, `void`, `nebula`, `anomaly`
* **`on`** (pinnalla olo): sijainnin on oltava fyysinen taso/pinta:
  * *Sallitut:* `spaceship`, `station`, `planet`, `moon`, `asteroid`
* **`to`** / **`from`** (liike johonkin/jostakin): sijainti voi olla avaruuskohde tai toinen henkilö:
  * *Sallitut:* kaikki suuret avaruuskohteet sekä kaikki toimijat (ihmiset/koneet/alienit)
* **`with`** (seurassa/avulla): sijainnin on oltava toinen toimija tai kannettava esine/työkalu:
  * *Sallitut:* kaikki toimijat sekä `crystal`, `data`, `signal`, `laser`, `shield`
* **`near`** (läheisyys): sijainti voi olla mikä tahansa fyysinen esine, paikka tai toimija:
  * *Sallitut:* kaikki kohteet ja toimijat paitsi abstraktit ilmiöt (kuten säteily tai painovoima)

---

## 5. Esimerkkejä

### Oikeelliset lauseet (Sallittu opetusdata)
* `<bos> an astronaut carefully scans the unknown anomaly and a robot transmits the data <eos>`
  *(Huomaa artikkeli: **an** astronaut ja **an** unknown anomaly. Täysin sallittua englantia.)*
* `<bos> the smart scientist enters into the empty spaceship while an alien lands on the moon <eos>`
  *(Huomaa prepositiot: enters **into** ... lands **on**.)*

### Virheelliset lauseet (Hylätään validoinnissa)
* `* <bos> a astronaut scans the planet <eos>`
  *Syy:* Syntaktinen virhe (**a** astronaut vokaalialkuisen sanan edessä — odotettiin **an**).
* `* <bos> the commander enters into an astronaut <eos>`
  *Syy:* Semanttinen virhe (ihmisen sisään ei voi mennä `into`-prepositiolla).
* `* <bos> the robot lands on the radiation <eos>`
  *Syy:* Säteilyn pinnalle ei voi laskeutua (`radiation` ei ole sallittu sijainti `on`-prepositiolle).
