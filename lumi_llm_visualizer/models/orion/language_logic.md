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

### A. Lausekerakenne ja Adverbin paikka (Adverb Placement)
Jokainen täysi lauseke noudattaa peruskaavaa, mutta adverbi voi sijoittua kahdella tavalla luonnollisen englannin mukaisesti:
1. **Verbin edessä**: `[Artikkeli] [Adjektiivi] {Subjekti} {Adverbi} {Verbi} [Artikkeli] [Adjektiivi] {Objekti} [Prepositiofraasi]`
   * *Esimerkki:* `the pilot quietly flies the spaceship to the planet`
2. **Lausekkeen lopussa**: `[Artikkeli] [Adjektiivi] {Subjekti} {Verbi} [Artikkeli] [Adjektiivi] {Objekti} [Prepositiofraasi] {Adverbi}`
   * *Esimerkki:* `the pilot flies the spaceship to the planet quietly`
   * *Huom:* Adverbi voi olla myös heti objektin jälkeen ennen prepositiofraasia: `the pilot flies the spaceship quietly to the planet`.

Prepositiofraasi on muotoa: `{Prepositio} [Artikkeli] [Adjektiivi] {Sijainti}`.

### B. Jaettu Subjekti (Subject Ellipsis)
Jos lausekkeella 1 ja lausekkeella 2 on **sama subjekti** ja niitä yhdistää konjunktio **`and`** tai **`but`**, toisen lausekkeen subjekti (ja siihen liittyvät artikkelit/adjektiivit) voidaan jättää kokonaan pois.
* *Luonnollinen muoto (jaettu subjekti):* `<bos> the engineer repairs the engine and activates the shield <eos>`
* *Toistava muoto (täysi):* `<bos> the engineer repairs the engine and the engineer activates the shield <eos>`
*Molemmat muodot ovat kieliopillisesti valideja.*

### C. Yksinkertaistettu Lausekerakenne (Intransitiivinen)
Pituuden rajoittamiseksi toisena lausekkeena voidaan käyttää lyhyttä intransitiivista muotoa:
* **Ihmisille/Muukalaisille**: `[Artikkeli] [Adjektiivi] {Subjekti} [Adverbi] escapes` (tai adverbilla lopussa)
* **Koneille/Mönkijöille**: `[Artikkeli] [Adjektiivi] {Subjekti} [Adverbi] lands` (tai adverbilla lopussa)

---

## 3. Oikea Englannin kielioppi: "a" vs "an"

ORION-kieli toteuttaa aitoa englannin kieltä vastaavan artikkelivalinnan. Indefiniittisen artikkelin on täsmättävä seuraavan sanan (adjektiivin tai substantiivin) ensimmäisen kirjaimen mukaan:

* **`an`** valitaan, jos seuraava sana alkaa **vokaalilla** (`a`, `e`, `i`, `o`, `u`):
  * *Esimerkkejä:* **`an`** `astronaut`, **`an`** `alien`, **`an`** `engineer`, **`an`** `ancient spaceship`, **`an`** `active robot`, **`an`** `empty station`
* **`a`** valitaan, jos seuraava sana alkaa **konsonantilla**:
  * *Esimerkkejä:* **`a`** `pilot`, **`a`** `commander`, **`a`** `small asteroid`, **`a`** `mysterious signal`

*Tämän säännön rikkominen (esim. `a astronaut` tai `an pilot`) hylätään validaattorissa.*

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

### C. Verbikohtainen prepositioiden valinta
Prepositiot ja niiden sijainnit/kohteet valitaan loogisesti verbin mukaan, jotta vältetään järjettömät rakenteet (esim. *"repairs the engine into the moon"*):

1. **`with` (Väline/Instrumentti)**:
   * Sallittu vain toiminta- ja tutkimusverbeille: `repairs`, `activates`, `attacks`, `protects`, `controls`, `harvests`, `scans`, `studies`.
   * Vastaavan kohteen on oltava työkalu tai resurssi: `laser`, `shield`, `crystal`, `data`, `signal` (tai toinen toimija kumppanina).
   * *Esimerkki:* `repairs the engine with a laser`, `attacks the alien with a shield`.
2. **`to` / `from` (Suunta/Alkuperä)**:
   * Sallittu vain siirto-, viestintä- ja liikeverbeille: `transmits`, `flies`, `escapes`, `reaches`, `lands`.
   * Kohteen on oltava avaruuskohde tai toimija (vastaanottaja).
   * *Esimerkki:* `transmits the signal to the commander`, `escapes from the alien`.
3. **`into` (Sisäänmeno)**:
   * Sallittu vain verbeille, jotka kuvaavat menemistä, liikkumista tai kohdistamista tilaan: `enters`, `flies`, `escapes`, `reaches`, `scans`, `observes`, `detects`.
   * Kohteen on oltava suljettu tila tai alue: `spaceship`, `station`, `void`, `nebula`, `anomaly`.
   * *Esimerkki:* `enters the spaceship into the nebula`.
4. **`on` (Pinnalla olo / Laskeutuminen)**:
   * Sallittu vain laskeutumiselle ja havainnoinnille: `lands`, `observes`, `detects`, `scans`, `explores`.
   * Kohteen on oltava fyysinen taso/pinta: `planet`, `moon`, `asteroid`, `spaceship`, `station`.
   * *Esimerkki:* `lands the rover on the moon`.
5. **`near` (Läheisyys)**:
   * Sallittu laajasti useimmille verbeille kuvaamaan fyysistä sijaintia. Ei kuitenkaan abstrakteille ilmiöille (kuten `gravity` tai `radiation`).
   * *Esimerkki:* `observes the star near the galaxy`.

---

## 5. Esimerkkejä

### Oikeelliset lauseet (Sallittu opetusdata)
* `<bos> an astronaut carefully scans the unknown anomaly and transmits the data <eos>`
  *(Jaettu subjekti `an astronaut` molemmissa lausekkeissa, toinen verbi ilman turhaa toistoa.)*
* `<bos> the engineer repairs the engine with a laser while a robot activates the shield <eos>`
  *(Välineprepositio: repairs ... with a laser.)*
* `<bos> the pilot flies the spaceship to the station safely but the drone lands on the planet <eos>`
  *(Adverbi `safely` lausekkeen lopussa prep-fraasin jälkeen.)*

### Virheelliset lauseet (Hylätään validoinnissa)
* `* <bos> a astronaut scans the planet <eos>`
  *Syy:* Artikkelivirhe (a astronaut -> pitäisi olla *an*).
* `* <bos> the commander repairs the engine into the moon <eos>`
  *Syy:* Väärä prepositio (repairs ... into -> pitäisi olla *with*).
* `* <bos> the robot lands on the radiation <eos>`
  *Syy:* Laskeutuminen säteilyn päälle ei ole fyysisesti mahdollista (`radiation` ei ole pinta).
