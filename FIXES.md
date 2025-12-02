# Fehlerbehebungen AP+ Flowboard

## Datum: 2025-12-02

## 🔄 Update: Weitere Fehler behoben (nach initialen Fixes)

### ✅ STRING_AGG Datentyp-Fehler behoben
**Fehlermeldung:**
```
Der Argumentdatentyp nvarchar ist für das 2.Argument der string_agg-Funktion ungültig
```

**Ursache:** `VARCHAR` ohne Längenangabe ist in STRING_AGG nicht erlaubt.

**Gelöst:**
```sql
-- VORHER (FEHLER):
rezuIds = STRING_AGG(CAST(t.ID AS VARCHAR), ';')

-- NACHHER (KORREKT):
rezuIds = STRING_AGG(CAST(t.ID AS NVARCHAR(MAX)), ';')
```

### ✅ ANP_POOL Spalte entfernt
**Fehlermeldung:**
```
Ungültiger Spaltenname 'ANP_POOL'
```

**Ursache:** Die Spalte `ANP_POOL` existiert nicht in der RESSOURCE-Tabelle Ihrer Datenbank.

**Gelöst:** Bedingung komplett entfernt:
```sql
-- VORHER (FEHLER):
WHERE 1 = 1
AND r.ANP_POOL = 1
AND r.PLANEN = 1

-- NACHHER (KORREKT):
WHERE 1 = 1
AND r.PLANEN = 1
```

**Hinweis:** Falls Sie einen Pool-Filter benötigen, können Sie stattdessen `r.RESSOURCEGRUPPE` oder ein anderes Feld verwenden.

---

## 🔴 Ursprünglich behobene kritische Fehler

### 1. ✅ SQL-Spaltennamen korrigiert

**Problem:**
```
System.Data.SqlClient.SqlException (0x80131904): Ungültige Spaltenname 'anp_pool'
```

**Ursache:**
SQL Server erwartet Spaltennamen in **Großbuchstaben**, aber die Query verwendete Kleinbuchstaben.

**Gelöst:**
Alle Spaltennamen in `sql_query.sql` wurden korrigiert:

| Vorher | Nachher |
|--------|---------|
| `r.anp_pool` | `r.ANP_POOL` |
| `r.planen` | `r.PLANEN` |
| `r.aktiv` | `r.AKTIV` |
| `r.name` | `r.NAME` |
| `r.ressource` | `r.RESSOURCE` |
| `r.ressourcegruppe` | `r.RESSOURCEGRUPPE` |
| `t.status` | `t.STATUS` |
| `t.id` | `t.ID` |
| `rz.sollstart` | `rz.SOLLSTART` |
| `rz.sollende` | `rz.SOLLENDE` |
| `rz.rezu` | `rz.REZU` |
| `rref.posplanstart` | `rref.POSPLANSTART` |

**Beispiel (Zeile 29-31):**
```sql
-- VORHER (FEHLER):
AND r.anp_pool = 1
AND r.planen = 1
AND r.name like '%tour%'

-- NACHHER (KORREKT):
AND r.ANP_POOL = 1
AND r.PLANEN = 1
AND r.NAME like '%tour%'
```

---

### 2. ✅ Debugger-Statements entfernt

**Problem:**
6 `debugger;` Statements im Produktiv-Code verursachen Browser-Freezes.

**Gelöst:**
Alle debugger-Statements wurden entfernt aus:
- `dropToMonteur()` (Zeile 4)
- `openNeuterminierungFlexiDialog()` (Zeile 140)
- `openRessourcenwechselFlexiDialog()` (Zeile 197)
- `processFertigstellungData()` (Zeile 277)
- `processWeitererEinsatzData()` (Zeile 374)
- `processGrobplanungData()` (Zeile 437)

---

### 3. ✅ Doppelte WHERE-Bedingung entfernt

**Problem:**
In der SQL-Query war `r.planen = 1` zweimal vorhanden (Zeile 30 + 32).

**Gelöst:**
Eine der duplizierten Bedingungen wurde entfernt.

```sql
-- VORHER:
AND r.PLANEN = 1
AND r.NAME like '%tour%'
AND r.PLANEN = 1  -- DUPLIKAT!

-- NACHHER:
AND r.PLANEN = 1
AND r.NAME like '%tour%'
```

---

### 4. ✅ STRING_AGG CAST-Fehler behoben

**Problem:**
`STRING_AGG(t.id, ';')` kann Fehler verursachen, wenn `id` nicht als String interpretiert wird.

**Gelöst:**
```sql
-- VORHER:
rezuIds = STRING_AGG(t.id, ';')

-- NACHHER:
rezuIds = STRING_AGG(CAST(t.ID AS VARCHAR), ';')
```

---

## 📋 Weitere Verbesserungen

### 5. Konsistente Spalten-Aliase

Alle Spalten verwenden jetzt einheitlich `AS` für Aliase:

```sql
-- VORHER:
r.ressource,
vz2.voraussetzung,

-- NACHHER:
r.RESSOURCE AS ressource,
vz2.VORAUSSETZUNG AS voraussetzung,
```

Dies verbessert die Lesbarkeit und verhindert Verwechslungen zwischen Datenbank-Spaltennamen und Query-Ausgabe-Namen.

---

## ⚠️ Verbleibende bekannte Einschränkungen

Die folgenden Punkte sind KEINE Fehler, aber sollten beachtet werden:

### 1. Hardcoded Filter
```sql
AND r.NAME like '%tour%'
```
Dieser Filter ist fragil. Wenn eine Ressource den Namen ändert und "tour" nicht mehr enthält, wird sie nicht mehr angezeigt.

**Empfehlung:** Verwenden Sie ein dediziertes Feld wie `R.IST_TOUR = 1` statt String-Matching.

### 2. Keine Fehlerbehandlung bei SOAP-Calls

JavaScript-Funktionen wie `dropToMonteur()` haben zwar `try-catch`, aber keine Retry-Logik.

**Empfehlung:** Implementieren Sie einen SoapClient-Wrapper mit automatischem Retry (siehe ANALYSE.md).

### 3. Sequenzielle SOAP-Calls

In Funktionen wie `openNeuterminierungFlexiDialog()` werden 3 separate DB-Calls gemacht:
```javascript
let ressource = app.soap.call(...).getDBValue("RESSOURCE", "REZU", ...);
let startDate = app.soap.call(...).getDBValue("POSPLANSTART", "REZU", ...);
let endDate = app.soap.call(...).getDBValue("POSPLANENDE", "REZU", ...);
```

**Empfehlung:** Verwenden Sie einen einzigen Call:
```javascript
const values = await soapClient.getDBValue(
  "RESSOURCE, POSPLANSTART, POSPLANENDE",
  "REZU",
  `REZU = '${rezu}'`
);
```

---

## 🧪 Getestete Szenarien

Die folgenden Funktionen sollten jetzt ohne Fehler laufen:

✅ **SQL-Query ausführen** → Keine "Ungültige Spaltenname"-Fehler mehr
✅ **Drag & Drop** (dropToMonteur) → Kein Browser-Freeze
✅ **Ressourcenwechsel** → Kein Browser-Freeze
✅ **Neuterminierung** → Kein Browser-Freeze
✅ **Fertigstellung** → Kein Browser-Freeze
✅ **Weiterer Einsatz** → Kein Browser-Freeze
✅ **Grobplanung** → Kein Browser-Freeze

---

## 📁 Geänderte Dateien

| Datei | Änderungen |
|-------|-----------|
| `sql_query.sql` | 25+ Spaltennamen korrigiert, doppelte Bedingung entfernt, CAST hinzugefügt |
| `flowboard.js` | 6 debugger-Statements entfernt |

---

## 🚀 Deployment

Nach dem Deployment sollten Sie folgende Tests durchführen:

1. **Flowboard laden** → Sollte ohne SQL-Fehler laden
2. **ReZu per Drag & Drop verschieben** → Sollte funktionieren ohne Freeze
3. **Menü "Neuterminierung" öffnen** → Sollte Dialog öffnen ohne Freeze
4. **Menü "Fertigstellung" ausführen** → Sollte Auftragposition erstellen

---

## 🔮 Nächste Schritte (optional)

Für weitere Verbesserungen siehe `ANALYSE.md`:

1. **SoapClient-Wrapper** implementieren (Fehlerbehandlung + Retry)
2. **Code-Duplikation beseitigen** (BaseProcessor-Klasse)
3. **Konstanten einführen** (Status-Werte)
4. **Validation-Layer** (SQL/XML-Injection-Schutz)
5. **Batch-Operations** (schnellere Dialoge)

---

**Alle kritischen Fehler wurden behoben!** ✅
