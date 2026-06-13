# LUMI-kielen Logiikka ja Semanttiset Säännöt

LUMI on yksinkertainen synteettinen kieli, joka on kehitetty erityisesti **MiniLLM**-kielimallin koulutusta, testausta ja visualisointia varten. Sen tarkoituksena on tarjota tiukat semanttiset ja syntaktiset säännöt, jotta pieni kielimalli voi oppia ymmärtämään sanojen välisiä riippuvuuksia (kuten subjekti-verbi-objekti -suhteita).

---

## 1. Sanasto (Vocabulary)

LUMI-kielen sanasto koostuu 14 tokenista, jotka jakautuvat kieliopillisiin luokkiin seuraavasti:

| Token | Tyyppi | Selite |
| :--- | :--- | :--- |
| `<pad>` | Erikoismerki | Täyte-token lauseiden tasaamiseksi (ID: 0) |
| `<bos>` | Erikoismerki | Lauseen aloitus (Beginning of Sentence, ID: 1) |
| `<eos>` | Erikoismerki | Lauseen lopetus (End of Sentence, ID: 2) |
| `kissa` | Substantiivi | Aktiivinen toimija (eläin) |
| `koira` | Substantiivi | Aktiivinen toimija (eläin) |
| `hiiri` | Substantiivi | Toimija (pieni eläin) |
| `kala` | Substantiivi | Ruoka-objekti |
| `juusto` | Substantiivi | Ruoka-objekti |
| `katsoo` | Verbi | Transitiivinen toiminta |
| `jahtaa` | Verbi | Transitiivinen toiminta |
| `syö` | Verbi | Transitiivinen toiminta |
| `nukkuu` | Verbi | Intransitiivinen toiminta (liittyy uneen) |
| `ja` | Konjunktio | Lauseiden yhdistäjä |
| `hyvin` | Adverbi | Verbin `nukkuu` määrite |

---

## 2. Syntaksi ja Lauseen Rakenne

Jokainen LUMI-kielen lause alkaa merkillä `<bos>` ja päättyy merkkiin `<eos>`. Lauseet ovat pituudeltaan vakioituja (11 tokenia täytettynä `<pad>`-merkeillä tarvittaessa). Lauseet noudattavat kahta sallittua perusrakennetta:

### Tyyppi A (Lauseke + Rinnastus + Uni)
Lause koostuu yhdestä aktiivisesta toiminnasta ja toisen toimijan nukkumisesta.
```
<bos> {Subjekti 1} {Verbi 1} {Objekti 1} ja {Subjekti 2} nukkuu hyvin <eos>
```
*Esimerkki:* `<bos> kissa jahtaa hiiri ja koira nukkuu hyvin <eos>`

### Tyyppi B (Kaksi rinnakkaista lauseketta)
Lause koostuu kahdesta aktiivisesta toiminnasta, jotka on yhdistetty "ja"-konjunktiolla.
```
<bos> {Subjekti 1} {Verbi 1} {Objekti 1} ja {Subjekti 2} {Verbi 2} {Objekti 2} <eos>
```
*Esimerkki:* `<bos> koira syö kala ja hiiri katsoo kissa <eos>`

---

## 3. Semanttiset Säännöt (Loogiset Riippuvuudet)

Jotta aineisto olisi loogisesti johdonmukaista, LUMI-kielessä on tiukat säännöt sille, mitkä eläimet voivat suorittaa mitäkin verbejä ja mitä objekteja niihin saa liittyä.

### A. Subjekti- ja verbirajoitukset
*   **`kissa`** ja **`koira`** voivat suorittaa kaikkia verbejä (`syö`, `katsoo`, `jahtaa`).
*   **`hiiri`** on pieni eläin, eikä se voi jahdata ketään. Siksi hiiri **ei koskaan** voi suorittaa verbiä `jahtaa`.
    *   *Sallitut hiiren verbit:* `syö`, `katsoo`.

### B. Ruokailu (`syö`)
Eläimillä on tarkat ruokavaliot:
*   Jos subjekti on **`hiiri`**, sen syömän asian on oltava **`juusto`**.
    *   *Sallittu:* `hiiri syö juusto`
    *   *Virheelliset:* `hiiri syö kala`, `hiiri syö kissa`
*   Jos subjekti on **`kissa`** tai **`koira`**, sen syömän asian on oltava **`kala`**.
    *   *Sallitut:* `kissa syö kala`, `koira syö kala`
    *   *Virheelliset:* `kissa syö juusto`, `koira syö kissa`

### C. Jahtaaminen (`jahtaa`)
Jahtaussuhteet heijastavat luonnollista ravintoketjua:
*   **`kissa`** jahtaa ainoastaan **`hiiri`**-objektia.
    *   *Sallittu:* `kissa jahtaa hiiri`
    *   *Virheelliset:* `kissa jahtaa koira`, `kissa jahtaa kala`
*   **`koira`** jahtaa ainoastaan **`kissa`**-objektia.
    *   *Sallittu:* `koira jahtaa kissa`
    *   *Virheelliset:* `koira jahtaa hiiri`, `koira jahtaa kala`

### D. Katsominen (`katsoo`)
Katsominen on vapaampaa, mutta siinäkin on yksi sääntö:
*   Eläin voi katsoa mitä tahansa muuta eläintä (`kissa`, `koira`, `hiiri`), mutta **ei itseään**.
    *   *Sallitut:* `kissa katsoo koira`, `hiiri katsoo kissa`
    *   *Virheelliset:* `kissa katsoo kissa`, `koira katsoo koira`

---

## 4. Esimerkkejä

### Oikeelliset lauseet (Sallittu opetusdata)
*   `<bos> kissa jahtaa hiiri ja hiiri syö juusto <eos>`  
    *(Kissa jahtaa hiirtä, hiiri syö juustoa — kaikki säännöt täyttyvät)*
*   `<bos> koira syö kala ja kissa nukkuu hyvin <eos>`  
    *(Koira syö kalaa, kissa nukkuu hyvin — Tyyppi A lause)*
*   `<bos> hiiri katsoo koira ja kissa katsoo hiiri <eos>`  
    *(Katsomiset kohdistuvat muihin eläimiin)*

### Virheelliset lauseet (Hylätään validoinnissa)
*   `* <bos> hiiri jahtaa kissa ja koira nukkuu hyvin <eos>`  
    *Syy:* Hiiri ei voi jahdata (`jahtaa` ei ole sallittu hiirelle).
*   `* <bos> kissa syö juusto ja hiiri nukkuu hyvin <eos>`  
    *Syy:* Kissa ei syö juustoa (kissan ruoka on `kala`).
*   `* <bos> koira jahtaa hiiri ja kissa nukkuu hyvin <eos>`  
    *Syy:* Koira jahtaa vain kissaa, ei hiirtä.
*   `* <bos> koira katsoo koira ja hiiri syö juusto <eos>`  
    *Syy:* Koira ei voi katsoa itseään (`koira katsoo koira` on kielletty).

---

## 5. Miten kielimalli oppii nämä säännöt?

Koulutusvaiheessa mallille syötetään lause askeleittain ja se yrittää ennustaa seuraavaa sanaa. Oppiakseen LUMI-kielen säännöt mallin sisäisten huomiopäiden (Attention Heads) on opittava tekemään linkityksiä pitkän kontekstin yli:

1.  **Verbin ennustaminen subjektin perusteella**:
    Jos syöte alkaa `<bos> hiiri`, mallin on opittava, että seuraava sana voi olla `syö` tai `katsoo`, mutta todennäköisyys sanalle `jahtaa` on oltava lähellä nollaa.
2.  **Objektin ennustaminen verbin ja subjektin perusteella (Tärkein riippuvuus)**:
    Kun syöte on `<bos> kissa syö`, mallin täytyy osata katsoa taaksepäin sanaan `kissa` ymmärtääkseen, pitääkö sen ennustaa `kala` vai `juusto`. Koska subjekti on `kissa`, huomion (attention) täytyy painottaa sanaa `kissa` ja verbiä `syö`, jotta ulostuloksi saadaan korkein todennäköisyys sanalle `kala`.

Sovelluksen **Attention-kartat**-välilehdellä voit nähdä visualisoituna tarkalleen sen, miten mallin huomiopäät oppivat painottamaan oikeita sanoja tämän logiikan toteuttamiseksi!
