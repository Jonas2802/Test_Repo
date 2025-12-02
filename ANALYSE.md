# AP+ Flowboard - Vollständige Code-Analyse

## 📋 Inhaltsverzeichnis
1. [Überblick](#überblick)
2. [Architektur & Kommunikationsfluss](#architektur--kommunikationsfluss)
3. [SQL-Query Analyse](#sql-query-analyse)
4. [XML-Definition Analyse](#xml-definition-analyse)
5. [JavaScript-Code Analyse](#javascript-code-analyse)
6. [Identifizierte Probleme](#identifizierte-probleme)
7. [Refactoring-Vorschläge](#refactoring-vorschläge)

---

## Überblick

Das AP+ Flowboard ist eine Kanban-ähnliche Oberfläche zur Verwaltung von Service-Ressourcen und Touren.

**Hauptkomponenten:**
- **SQL Query** (sql_query.sql): Liefert Daten für Karten
- **XML Definition** (flowboard_board.xml): Definiert Layout, Lanes und Menüs
- **JavaScript** (flowboard.js): Enthält Business-Logik und Dialoge

---

## Architektur & Kommunikationsfluss

```
┌─────────────────────────────────────────────────────────────┐
│                    AP+ Flowboard Architektur                │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   Browser    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐         ┌─────────────────┐
    │ flowboard.js │◄────────┤ flowboard_board │
    │  (Logik)     │         │     .xml        │
    └──────┬───────┘         │   (Layout)      │
           │                 └────────▲────────┘
           │                          │
           │                   ┌──────┴────────┐
           │                   │  sql_query    │
           │                   │     .sql      │
           │                   │   (Daten)     │
           │                   └───────────────┘
           │
           ▼
    ┌──────────────────┐
    │  AP+ SOAP API    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐
    │  AP+ Datenbank   │
    │  (SQL Server)    │
    └──────────────────┘

Flow:
1. SQL-Query wird von AP+ ausgeführt → liefert Datensätze
2. XML definiert, wie Datensätze als Karten dargestellt werden
3. XML definiert Menüpunkte und welche JS-Funktionen aufgerufen werden
4. JavaScript führt Business-Logik aus
5. JavaScript ruft SOAP-API auf für DB-Updates
6. Board wird refresht
```

---

## SQL-Query Analyse

**Datei:** `sql_query.sql`

### Struktur
Die Query besteht aus **2 UNION-Teilen**:

#### Teil 1: Touren-Karten (Gruppierte ReZus)
```sql
SELECT ... FROM (
  SELECT ressource, COUNT(*) as rezus, STRING_AGG(id, ';') as rezuIds
  FROM REZU
  WHERE status < 50
  AND (DATEPART(WEEK, posplanstart) - DATEPART(WEEK, GETDATE())) IN ($P{WW})
  GROUP BY ressource
)
```

**Zweck:** Gruppiert alle ReZus pro Ressource (Tour-Karten)

**Spalten:**
- `cardKey`: Eindeutiger Schlüssel (CONCAT(guid, ressource))
- `ressource`: Ressourcen-ID
- `ressourceName`: Name der Ressource
- `rezus`: Anzahl der ReZus
- `rezuIds`: Komma-separierte IDs (für Multi-Select)
- `stage`: Wird auf 'touren' gesetzt (für Lane-Zuordnung)

#### Teil 2: Einzelne ReZu-Karten (Service-Monteure)
```sql
SELECT ... FROM rezu
WHERE voraussetzung = 'Service'
AND status < 50
AND aktiv = 1
```

**Zweck:** Zeigt einzelne ReZus bei Service-Monteuren

**Spalten:**
- `stage`: Wird auf `rz.ressource` gesetzt (für dynamische Lane-Zuordnung)
- `start`, `ende`: Formatierte Datumswerte

### Parameter
- **$P{WW}**: Kalenderwoche-Filter (0 = aktuelle Woche)

### Datenmodell
```
REZU (Ressourcen-Zuordnung)
├─ ID
├─ REZU (Bezeichnung)
├─ RESSOURCE (FK → RESSOURCE)
├─ STATUS (<50 = aktiv)
├─ SOLLSTART, SOLLENDE
├─ ANP_PROJEKT (FK → PROJEKT)
└─ ANP_PROJEKTPOS

REZU_REF (Referenzen)
├─ GUID
├─ BELEG (FK → AUFTRAG)
├─ BELEGPOSITION
└─ REFOBJEKT ('auftragpos', 'projektpos')

RESSOURCE
├─ RESSOURCE (PK)
├─ NAME
├─ AKTIV (1/0)
├─ PLANEN (1/0)
├─ ANP_POOL (1/0)
└─ RESSOURCEGRUPPE

VORAUSSETZUNG (Kategorien)
└─ VORAUSSETZUNG ('Service', 'Touren')
```

### Kritische Punkte
1. ⚠️ **Duplikat-Bedingung**: `r.planen = 1` kommt 2x vor (Zeile 18 + 20)
2. ⚠️ **Hardcoded Filter**: `r.name like '%tour%'` ist sehr fragil
3. ⚠️ **Performance**: `STRING_AGG` könnte bei großen Datenmengen langsam werden

---

## XML-Definition Analyse

**Datei:** `flowboard_board.xml`

### Struktur

#### 1. Parameter
```xml
<Parameter>
  <Name>WW</Name>
  <DefaultValue>0</DefaultValue>
</Parameter>
```
**Bedeutung:** Wochenfilter (0 = aktuelle Woche)

#### 2. Lanes (Spalten)

##### Lane 1: Touren (Statisch)
```xml
<Lane>
  <Title>Touren</Title>
  <Where>STAGE = 'touren'</Where>
  ...
</Lane>
```
**Zweck:** Zeigt gruppierte Tour-Karten
**Filter:** Alle Datensätze mit `stage = 'touren'`

##### Lane 2: Service-Monteure (Dynamisch)
```xml
<DynamicLane>
  <DynamicSQL>SELECT ressource, name FROM RESSOURCE WHERE ...</DynamicSQL>
  <Where>stage = '${dynamic.ressource}'</Where>
  <OnDrop>dropToMonteur(...)</OnDrop>
  ...
</DynamicLane>
```
**Zweck:** Erstellt für jeden Service-Monteur eine eigene Lane
**Filter:** `stage` muss der Ressourcen-ID entsprechen

#### 3. Card Templates

**Touren-Karte:**
```xml
<Title>ressourceName</Title>
<MenuItems>
  <MenuItem>Tourenplanung</MenuItem>
</MenuItems>
```

**Service-Karte:**
```xml
<Title>ressourceName</Title>
<MenuItems>
  <MenuItem>Ressourcenwechsel</MenuItem>
  <MenuItem>Neuterminierung</MenuItem>
  <MenuItem>Fertigstellung</MenuItem>
  <MenuItem>Weiterer Einsatz</MenuItem>
  <MenuItem>Grobplanung</MenuItem>
</MenuItems>
```

#### 4. Menü → JavaScript Mapping

| Menüpunkt | JavaScript-Funktion | Parameter |
|-----------|---------------------|-----------|
| Tourenplanung | `menuItemTourenplanung()` | ressource, rezuIds |
| Ressourcenwechsel | `menuItemRessourcenwechsel()` | rezu, ressource |
| Neuterminierung | `menuItemNeuterminierung()` | rezu |
| Fertigstellung | `menuItemFertigstellung()` | rezu, ressource |
| Weiterer Einsatz | `menuItemWeitererEinsatz()` | rezu, ressource |
| Grobplanung | `menuItemGrobplanung()` | rezu, ressource |
| **Drag & Drop** | `dropToMonteur()` | fromRessource, rezuIds, toRessource |

---

## JavaScript-Code Analyse

**Datei:** `flowboard.js`

### Struktur-Übersicht

```
flowboard.js
├─ FlexiDialog (Objekt)
│  ├─ Skript-Verwaltung
│  ├─ Dialog-Erstellung
│  └─ HTML-Editor-Integration
│
├─ Menü-Handler (7 Funktionen)
│  ├─ menuItemTourenplanung()
│  ├─ menuItemRessourcenwechsel()
│  ├─ menuItemNeuterminierung()
│  ├─ menuItemFertigstellung()
│  ├─ menuItemWeitererEinsatz()
│  └─ menuItemGrobplanung()
│
├─ Dialog-Logik (6 Funktionen)
│  ├─ openNeuterminierungFlexiDialog()
│  ├─ processNeuterminierungData()
│  ├─ openRessourcenwechselFlexiDialog()
│  ├─ processRessourcenwechselData()
│  ├─ askRessourcenauswahl()
│  └─ neueReZuFromServicePos()
│
├─ Prozess-Funktionen (3 Funktionen)
│  ├─ processFertigstellungData()
│  ├─ processWeitererEinsatzData()
│  └─ processGrobplanungData()
│
├─ Utility-Funktionen (4 Funktionen)
│  ├─ dropToMonteur()
│  ├─ openDialogView()
│  ├─ refreshBoard()
│  └─ closeReZu()
│
└─ Datenbank-Funktionen (2 Funktionen)
   ├─ dbInsert()
   └─ dbUpdate()
```

### Detailanalyse der Hauptfunktionen

#### 1. FlexiDialog (Minified Code)
```javascript
var FlexiDialog = {
  scriptsLoaded: false,
  escDisabled: false,
  htmlEditorFields: [],
  // ... (minifiziert, schwer lesbar)
}
```

**Probleme:**
- ❌ **Minifiziert**: Code ist schwer zu lesen/debuggen
- ❌ **Keine Kommentare**
- ❌ **Keine Fehlerbehandlung** in vielen Stellen

#### 2. dropToMonteur() - Drag & Drop Handler
```javascript
async function dropToMonteur(fromRessource, rezuIds, toRessource) {
  let rezuIdList = rezuIds.split(";");

  rezuIdList.forEach((rezuId) => {
    rezuTs = app.soap.call("webobjects/webparts").getDBValue("TIMESTAMP", "REZU", "ID = " + rezuId);
    xmlData = "<row>"
            + `<ID>${rezuId}</ID>`
            + `<TIMESTAMP>${rezuTs}</TIMESTAMP>`
            + `<RESSOURCE>${toRessource}</RESSOURCE>`
            + "</row>";
    app.soap.call("webobjects/navbar").dbUpdate("REZU", xmlData);
  });

  refreshBoard();
  return true;
}
```

**Funktionsweise:**
1. Teilt `rezuIds` in Array
2. Für jede ID: Holt Timestamp, baut XML, führt Update aus
3. Refresht das Board

**Probleme:**
- ⚠️ **Sequenziell**: Updates werden nacheinander ausgeführt (langsam)
- ⚠️ **Keine Transaktion**: Bei Fehler bleibt alles inkonsistent
- ⚠️ **SQL-Injection**: `"ID = " + rezuId` ist unsicher
- ⚠️ **Keine Rückmeldung**: User sieht nicht, ob es funktioniert hat

#### 3. menuItemRessourcenwechsel()
```javascript
async function menuItemRessourcenwechsel(rezu, ressource) {
  let rezuId = app.soap.call("webobjects/webparts").getDBValue("ID", "REZU", "REZU = '" + rezu + "'");
  let result = await openRessourcenwechselFlexiDialog(rezuId, ressource);

  if (result) {
    refreshBoard();
    return true;
  }
  return;
}
```

**Funktionsweise:**
1. Holt ReZu-ID anhand des Namens
2. Öffnet Dialog
3. Bei Erfolg: Refresh

**Probleme:**
- ⚠️ **Doppelte DB-Abfrage**: ReZu-ID könnte direkt übergeben werden
- ⚠️ **Inkonsistenter Return**: Manchmal `true`, manchmal `undefined`

#### 4. processFertigstellungData() - Komplexe Business-Logik
```javascript
async function processFertigstellungData(rezuId) {
  // 1. Projekttyp ermitteln
  let projekt = app.soap.call(...).getDBValue("ANP_PROJEKT", "REZU", ...);
  let projektTyp = app.soap.call(...).getDBValue("PROJEKTTYP", "PROJEKT", ...);

  // 2. Fertigstellungs-Artikel aus Sysconf laden
  let projektArt = app.soap.call("admin/sysconf/sysconf").getString("PROJEKT", "PROJEKTTYP");
  let sysNachProjektArt = app.soap.call("admin/sysconf/sysconf").getString("CUSTOM", "ARTIKEL_NACH_PROJEKTART");

  // 3. Artikel parsen (z.B. "Aufzug:SRV0003,Homelift:HL001,...")
  let fertigstellungArtikel = ...;

  // 4. Auftragposition kopieren
  await app.job.startJob("sales/auftrag", "Auftragposition kopieren", ...);

  // 5. Artikel in neuer Position setzen
  await dbUpdate("AUFTRAGPOS", newAuftragPosId, { ARTIKEL: fertigstellungArtikel }, ...);

  // 6. Neue ReZu erstellen
  let newRezuId = await neueReZuFromServicePos(newAuftragPosId);

  // 7. Status auf "disponiert" (4) setzen
  await dbUpdate("AUFTRAGPOS", newAuftragPosId, { STATUS: 4 }, ...);

  // 8. Original-ReZu schließen (Status 50)
  await closeReZu(rezuId);

  return true;
}
```

**Funktionsweise:**
1. **Projekttyp** ermitteln (Aufzug, Homelift, Treppenlift)
2. **Fertigstellungs-Artikel** aus Systemkonfiguration laden
3. **Auftragposition duplizieren**
4. Artikel in neuer Position ändern
5. Neue ReZu erstellen
6. Status auf "disponiert" setzen
7. Original-ReZu schließen

**Probleme:**
- ❌ **12 sequenzielle SOAP-Calls**: Sehr langsam
- ❌ **String-Parsing**: `projektArt.split(",")` ist fehleranfällig
- ❌ **Keine Transaktion**: Bei Fehler bleiben Datenmüll
- ❌ **Hardcoded Status-Werte**: 3, 4, 50 sind "Magic Numbers"
- ⚠️ **Null-Check fehlt**: `sysNachProjektItem` kann `undefined` sein

#### 5. processWeitererEinsatzData()
```javascript
async function processWeitererEinsatzData(rezuId) {
  // Fast identisch zu processFertigstellungData(), aber OHNE Artikel-Änderung
  // 1. Auftragposition kopieren
  // 2. Neue ReZu erstellen
  // 3. Status auf "disponiert" setzen
  // 4. Original-ReZu schließen
}
```

**Probleme:**
- ❌ **Code-Duplikation**: 90% identisch zu `processFertigstellungData()`

#### 6. dbUpdate() - Zentrale Update-Funktion
```javascript
async function dbUpdate(table, id, values, splitted = false, catchError = true) {
  let xmlData = "<row>";

  // ID hinzufügen
  if (!values.hasOwnProperty("ID")) {
    xmlData += `<ID>${id}</ID>`;
  }

  // Werte hinzufügen
  Object.entries(values).forEach(([key, value]) => {
    xmlData += `<${key}>${value}</${key}>`;
  });

  // Timestamp hinzufügen (automatisch)
  if (xmlData.indexOf("<TIMESTAMP>") < 0) {
    timestamp = app.soap.call("webobjects/webparts").getDBValue("TIMESTAMP", table, `ID=${id}`);
    xmlData += `<TIMESTAMP>${timestamp}</TIMESTAMP>`;
  }

  xmlData += "</row>";
  app.soap.call("webobjects/navbar").dbUpdate(table, xmlData);
  return true;
}
```

**Funktionsweise:**
1. Baut XML-String aus Objekt
2. Holt automatisch den Timestamp
3. Ruft AP+ SOAP dbUpdate auf

**Probleme:**
- ⚠️ **XML-Injection möglich**: Werte werden nicht escaped
- ⚠️ **Extra DB-Call**: Timestamp wird separat geholt
- ⚠️ **Kein Return-Wert**: SOAP-Call gibt nichts zurück

---

## Identifizierte Probleme

### 🔴 Kritische Probleme

#### 1. **Keine Fehlerbehandlung bei SOAP-Calls**
```javascript
// AKTUELL:
rezuTs = app.soap.call("webobjects/webparts").getDBValue("TIMESTAMP", "REZU", "ID = " + rezuId);

// PROBLEM: Wenn SOAP-Call fehlschlägt → JavaScript-Error → ganzer Dialog bricht ab
```

**Auswirkung:** User verliert alle eingegebenen Daten

#### 2. **SQL-Injection-Risiko**
```javascript
// AKTUELL:
"ID = " + rezuId
"REZU = '" + rezu + "'"

// GEFAHR: Wenn rezuId = "1 OR 1=1", werden alle Datensätze betroffen
```

**Auswirkung:** Sicherheitsrisiko, Datenverlust möglich

#### 3. **XML-Injection-Risiko**
```javascript
// AKTUELL:
xmlData += `<${key}>${value}</${key}>`;

// GEFAHR: Wenn value = "<TIMESTAMP>123</TIMESTAMP><STATUS>50", wird Datensatz manipuliert
```

**Auswirkung:** Datenintegrität gefährdet

#### 4. **Keine Transaktionen**
```javascript
// AKTUELL:
await dbUpdate("AUFTRAGPOS", newAuftragPosId, { ARTIKEL: fertigstellungArtikel });
await dbUpdate("AUFTRAGPOS", newAuftragPosId, { STATUS: 4 });
await closeReZu(rezuId);

// PROBLEM: Wenn Schritt 2 fehlschlägt, ist Schritt 1 trotzdem durchgeführt
```

**Auswirkung:** Inkonsistente Daten, manueller Cleanup nötig

#### 5. **Debugger-Statements im Produktiv-Code**
```javascript
debugger; // Zeile 1157, 1238, 1289, 1358, 1457, 1493
```

**Auswirkung:** Performance-Probleme, Browser friert ein

### 🟡 Mittlere Probleme

#### 6. **Code-Duplikation**
- `processFertigstellungData()` und `processWeitererEinsatzData()` sind zu 90% identisch
- Alle `menuItem*()` Funktionen haben dieselbe Struktur

**Auswirkung:** Wartbarkeit, Fehler werden mehrfach reproduziert

#### 7. **Sequenzielle SOAP-Calls**
```javascript
// AKTUELL:
let ressource = app.soap.call(...).getDBValue("RESSOURCE", "REZU", ...);
let startDate = app.soap.call(...).getDBValue("POSPLANSTART", "REZU", ...);
let endDate = app.soap.call(...).getDBValue("POSPLANENDE", "REZU", ...);

// PROBLEM: 3 separate Calls → 3x Netzwerk-Latenz
```

**Auswirkung:** Langsame Dialoge (3 Sekunden statt 1 Sekunde)

#### 8. **Magic Numbers**
```javascript
if (currentStatus < 4) { ... }
if (currentStatus < 3) { ... }
await dbUpdate("REZU", rezuId, { STATUS: statusConstants.ReZuObject.STATUS_ABGESCHLOSSEN });
```

**Problem:** Mischung aus Magic Numbers und Konstanten

#### 9. **Inkonsistente Rückgabewerte**
```javascript
return true;  // manchmal
return;       // manchmal
return false; // manchmal
```

**Auswirkung:** Schwer zu testen, unklare Semantik

### 🟢 Kleinere Probleme

#### 10. **Minified FlexiDialog-Code**
**Auswirkung:** Debugging unmöglich, Erweiterungen schwierig

#### 11. **Fehlende Kommentare**
**Auswirkung:** Einarbeitung dauert lange

#### 12. **Hardcoded Strings**
```javascript
r.name like '%tour%'  // SQL
"~/Resource/RessourceTab.aspx?view=pickressgruppe&aktiv=1&ANP_POOL=1"  // URLs
```

**Auswirkung:** Fehleranfällig bei Änderungen

---

## Refactoring-Vorschläge

### 1. **Code-Struktur verbessern**

#### Aktuell (Monolith):
```
flowboard.js (1800 Zeilen)
```

#### Vorschlag (Modular):
```
src/
├── core/
│   ├── FlexiDialog.js (de-minified)
│   ├── SoapClient.js (Wrapper)
│   └── ErrorHandler.js
├── services/
│   ├── RezuService.js
│   ├── AuftragService.js
│   └── RessourceService.js
├── handlers/
│   ├── MenuHandlers.js
│   ├── DropHandler.js
│   └── DialogHandlers.js
├── utils/
│   ├── XmlBuilder.js
│   ├── Validator.js
│   └── Constants.js
└── flowboard.js (Entry-Point)
```

### 2. **Fehlerbehandlung verbessern**

#### Vorschlag: SoapClient Wrapper
```javascript
// SoapClient.js
class SoapClient {
  constructor() {
    this.retryCount = 3;
    this.timeout = 5000;
  }

  async call(service, method, ...params) {
    for (let i = 0; i < this.retryCount; i++) {
      try {
        const result = await app.soap.call(service)[method](...params);
        return { success: true, data: result };
      } catch (error) {
        console.error(`SOAP Call failed (attempt ${i+1}):`, error);
        if (i === this.retryCount - 1) {
          return { success: false, error: error };
        }
        await this.delay(1000 * (i + 1)); // Exponential Backoff
      }
    }
  }

  async getDBValue(columns, table, where) {
    // SQL-Injection Prevention
    where = this.sanitizeWhere(where);

    const result = await this.call("webobjects/webparts", "getDBValue", columns, table, where);
    if (!result.success) {
      throw new Error(`DB Query failed: ${result.error}`);
    }
    return result.data;
  }

  sanitizeWhere(where) {
    // Verhindert SQL-Injection
    return where.replace(/[;'"\\]/g, '');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const soapClient = new SoapClient();
```

**Verwendung:**
```javascript
// VORHER:
let rezuTs = app.soap.call("webobjects/webparts").getDBValue("TIMESTAMP", "REZU", "ID = " + rezuId);

// NACHHER:
const result = await soapClient.getDBValue("TIMESTAMP", "REZU", `ID = ${rezuId}`);
if (!result.success) {
  await utils.askInfo("Fehler beim Laden der Daten: " + result.error);
  return false;
}
let rezuTs = result.data;
```

### 3. **Code-Duplikation beseitigen**

#### Vorschlag: BaseProcessor
```javascript
// processors/BaseProcessor.js
class AuftragPosProcessor {
  constructor(rezuId) {
    this.rezuId = rezuId;
    this.soapClient = new SoapClient();
  }

  async copyAuftragPos() {
    // 1. Auftrag & Position laden
    const auftrag = await this.soapClient.getDBValue("rr.BELEG",
      "REZU r JOIN REZU_REF rr ON r.guid = rr.guid",
      `r.ID = ${this.rezuId} AND rr.refobjekt = 'auftragpos'`);

    const position = await this.soapClient.getDBValue("rr.BELEGPOSITION",
      "REZU r JOIN REZU_REF rr ON r.guid = rr.guid",
      `r.ID = ${this.rezuId} AND rr.refobjekt = 'auftragpos'`);

    if (!auftrag || !position) {
      throw new Error("Auftrag oder Position nicht gefunden.");
    }

    // 2. Kopieren
    const menge = await this.soapClient.getDBValue("MENGE", "AUFTRAGPOS",
      `AUFTRAG = '${auftrag}' AND POSITION = '${position}'`);

    const xmlstring = `<Auswahl><pos nr='${position}' menge='${menge}' /></Auswahl>`;

    await app.job.startJob("sales/auftrag", "Auftragposition kopieren",
      "convertReceipt", auftrag, xmlstring, "Auftrag", auftrag,
      "<xml><copyPos/></xml>", null);

    const newAuftragPosId = await this.soapClient.call("sales/auftrag", "getLastPosID", auftrag);

    if (!newAuftragPosId) {
      throw new Error("Auftragposition nicht erstellt.");
    }

    return newAuftragPosId;
  }

  async createReZuFromPos(auftragPosId) {
    const newRezuId = await neueReZuFromServicePos(auftragPosId);
    if (!newRezuId) {
      throw new Error("ReZu konnte nicht erstellt werden.");
    }

    // Projekt übernehmen
    const projekt = await this.soapClient.getDBValue("ANP_PROJEKT", "REZU", `ID = ${this.rezuId}`);
    const projektPos = await this.soapClient.getDBValue("ANP_PROJEKTPOS", "REZU", `ID = ${this.rezuId}`);

    if (projekt || projektPos) {
      await dbUpdate("REZU", newRezuId, {
        ANP_PROJEKT: projekt,
        ANP_PROJEKTPOS: projektPos
      });
    }

    return newRezuId;
  }

  async setStatusDisponiert(auftragPosId) {
    const currentStatus = await this.soapClient.getDBValue("STATUS", "AUFTRAGPOS", `ID = ${auftragPosId}`);

    if (currentStatus < Status.AUFTRAGPOS_DISPONIERT) {
      if (currentStatus < Status.AUFTRAGPOS_FREIGEGEBEN) {
        await dbUpdate("AUFTRAGPOS", auftragPosId, { STATUS: Status.AUFTRAGPOS_FREIGEGEBEN });
      }
      await dbUpdate("AUFTRAGPOS", auftragPosId, { STATUS: Status.AUFTRAGPOS_DISPONIERT });
    }
  }
}
```

**Verwendung:**
```javascript
// FERTIGSTELLUNG
async function processFertigstellungData(rezuId) {
  try {
    const processor = new AuftragPosProcessor(rezuId);

    // 1. Fertigstellungs-Artikel ermitteln
    const fertigstellungArtikel = await processor.getFertigstellungArtikel();

    // 2. Auftragposition kopieren
    const newAuftragPosId = await processor.copyAuftragPos();

    // 3. Artikel ändern
    await dbUpdate("AUFTRAGPOS", newAuftragPosId, { ARTIKEL: fertigstellungArtikel });

    // 4. ReZu erstellen
    const newRezuId = await processor.createReZuFromPos(newAuftragPosId);

    // 5. Status setzen
    await processor.setStatusDisponiert(newAuftragPosId);

    // 6. Original schließen
    await closeReZu(rezuId);

    return true;
  } catch (error) {
    console.error("Error in processFertigstellungData:", error);
    await utils.askException(error);
    return false;
  }
}

// WEITERER EINSATZ (gleicher Code, nur ohne Schritt 3)
async function processWeitererEinsatzData(rezuId) {
  try {
    const processor = new AuftragPosProcessor(rezuId);

    const newAuftragPosId = await processor.copyAuftragPos();
    const newRezuId = await processor.createReZuFromPos(newAuftragPosId);
    await processor.setStatusDisponiert(newAuftragPosId);
    await closeReZu(rezuId);

    return true;
  } catch (error) {
    console.error("Error in processWeitererEinsatzData:", error);
    await utils.askException(error);
    return false;
  }
}
```

### 4. **Konstanten einführen**

```javascript
// utils/Constants.js
const Status = {
  REZU: {
    NEU: 10,
    GEPLANT: 20,
    DISPONIERT: 30,
    IN_BEARBEITUNG: 40,
    ABGESCHLOSSEN: 50,
    STORNIERT: 99
  },
  AUFTRAGPOS: {
    NEU: 1,
    IN_BEARBEITUNG: 2,
    FREIGEGEBEN: 3,
    DISPONIERT: 4,
    ABGESCHLOSSEN: 5
  }
};

const ReZuRefObjekt = {
  AUFTRAGPOS: 'auftragpos',
  PROJEKTPOS: 'projektpos'
};

const Picklists = {
  RESSOURCE_POOL: "~/Resource/RessourceTab.aspx?view=pickressgruppe&aktiv=1&ANP_POOL=1",
  RESSOURCE_MONTAGE_TL: "~/Resource/RessourceTab.aspx?view=pickressgruppe&aktiv=1&ressourcegruppe=Montage_TL"
};
```

### 5. **Batch-Operations für SOAP-Calls**

```javascript
// VORHER (3 Calls):
let ressource = app.soap.call(...).getDBValue("RESSOURCE", "REZU", `REZU = '${rezu}'`);
let startDate = app.soap.call(...).getDBValue("POSPLANSTART", "REZU", `REZU = '${rezu}'`);
let endDate = app.soap.call(...).getDBValue("POSPLANENDE", "REZU", `REZU = '${rezu}'`);

// NACHHER (1 Call):
const columns = "RESSOURCE, POSPLANSTART, POSPLANENDE";
const values = await soapClient.getDBValue(columns, "REZU", `REZU = '${rezu}'`);
const [ressource, startDate, endDate] = values.split(',');
```

### 6. **Validation Layer**

```javascript
// utils/Validator.js
class Validator {
  static isValidRezuId(rezuId) {
    return !isNaN(rezuId) && rezuId > 0;
  }

  static isValidRessource(ressource) {
    return typeof ressource === 'string' && ressource.length > 0;
  }

  static isValidDate(date) {
    return date instanceof Date && !isNaN(date);
  }

  static sanitizeForSQL(value) {
    if (typeof value === 'number') return value;
    return String(value).replace(/['"\\;]/g, '');
  }

  static sanitizeForXML(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
```

### 7. **XML-Builder (statt String-Concat)**

```javascript
// utils/XmlBuilder.js
class XmlBuilder {
  constructor() {
    this.elements = [];
  }

  addElement(key, value) {
    const sanitizedKey = Validator.sanitizeForXML(key);
    const sanitizedValue = Validator.sanitizeForXML(value);
    this.elements.push(`<${sanitizedKey}>${sanitizedValue}</${sanitizedKey}>`);
    return this;
  }

  build() {
    return `<row>${this.elements.join('')}</row>`;
  }
}

// VERWENDUNG:
const xmlData = new XmlBuilder()
  .addElement("ID", rezuId)
  .addElement("TIMESTAMP", rezuTs)
  .addElement("RESSOURCE", toRessource)
  .build();
```

### 8. **FlexiDialog entschlüsseln**

Der minifizierte FlexiDialog-Code sollte dekompiliert oder neu geschrieben werden. Falls das nicht möglich ist, sollte zumindest ein Wrapper erstellt werden:

```javascript
// core/DialogHelper.js
class DialogHelper {
  static async openDialog(config) {
    try {
      const result = await FlexiDialog.open(config);
      return { success: true, data: result };
    } catch (error) {
      console.error("Dialog error:", error);
      return { success: false, error: error };
    }
  }

  static async openRessourceDialog(title, currentRessource, required = true) {
    return await this.openDialog({
      title: title,
      width: 400,
      okLabel: "Ok",
      cancelLabel: "Abbrechen",
      fields: [
        {
          tag: "RESSOURCE",
          name: "Ressource",
          type: "I",
          required: required,
          value: currentRessource || "",
          picklist: Picklists.RESSOURCE_POOL
        }
      ]
    });
  }

  static async openDateRangeDialog(title, startDate, endDate) {
    return await this.openDialog({
      title: title,
      width: 400,
      okLabel: "Ok",
      cancelLabel: "Abbrechen",
      fields: [
        { tag: "STARTDATE", name: "Startdatum", type: "A", required: true, value: startDate || "" },
        { tag: "ENDDATE", name: "Enddatum", type: "A", required: true, value: endDate || "" }
      ]
    });
  }
}
```

---

## Zusammenfassung

### ✅ Was gut funktioniert:
- Grundlegende Flowboard-Funktionalität
- Menüstruktur ist klar definiert
- FlexiDialog ermöglicht schnelle Dialoge

### ❌ Was verbessert werden muss:
1. **Fehlerbehandlung** (kritisch)
2. **SQL/XML-Injection** (kritisch)
3. **Code-Duplikation** (hoch)
4. **Performance** (hoch)
5. **Wartbarkeit** (mittel)

### 🎯 Nächste Schritte:
1. FlexiDialog de-minifizieren
2. SoapClient-Wrapper implementieren
3. Konstanten-Datei erstellen
4. Code modularisieren
5. Tests schreiben
6. Debugger-Statements entfernen

---

Möchten Sie, dass ich mit einem der Refactorings beginne?
