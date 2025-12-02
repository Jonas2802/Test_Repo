/*+ SQLPARSERNEW */
SELECT
  cardKey = CONCAT(r.guid, '-', rg.RESSOURCE),
  r.RESSOURCE AS ressource,
  rezu = NULL,
  ressourceName = r.NAME,
  rg.rezus,
  stage = CASE WHEN vz2.VORAUSSETZUNG != 'Service' THEN 'touren' END,
  vz2.VORAUSSETZUNG AS voraussetzung,
  rg.rezuIds,
  start = NULL,
  ende = NULL,
  orderBy = rg.RESSOURCE
FROM (
  SELECT
    t.RESSOURCE,
    rezus = COUNT(*),
    rezuIds = STRING_AGG(CAST(t.ID AS NVARCHAR(MAX)), ';')
  FROM REZU t
  JOIN REZU_REF t2 on t.guid = t2.guid
  WHERE t.STATUS < 50
  AND (DATEPART(WEEK, t2.POSPLANSTART) - DATEPART(WEEK, GETDATE())) IN ($P{WW})
  GROUP BY t.RESSOURCE
) rg
JOIN RESSOURCE r ON rg.RESSOURCE = r.RESSOURCE
LEFT JOIN VORAUSSETZUNGREF vz1 ON vz1.refguid = r.guid
LEFT JOIN VORAUSSETZUNG vz2 ON vz2.guid = vz1.voraussetzungguid
WHERE 1 = 1
AND r.PLANEN = 1
AND r.NAME like '%tour%'

UNION ALL

SELECT
  cardKey = rz.guid,
  rz.RESSOURCE AS ressource,
  rezu = rz.REZU,
  ressourceName = rz.REZU,
  rezus = 1,
  stage = rz.RESSOURCE,
  vz2.VORAUSSETZUNG AS voraussetzung,
  rezuIds = NULL,
  start = FORMAT(rz.SOLLSTART, 'd', culture.code),
  ende = FORMAT(rz.SOLLENDE, 'd', culture.code),
  orderBy = rz.REZU
FROM REZU rz
JOIN REZU_REF rref on rz.guid = rref.guid
JOIN RESSOURCE r ON rz.RESSOURCE = r.RESSOURCE
JOIN VORAUSSETZUNGREF vz1 ON vz1.refguid = r.guid
JOIN VORAUSSETZUNG vz2 ON vz2.guid = vz1.voraussetzungguid
CROSS APPLY (SELECT code = CASE '$S{LNG}' WHEN 'DE' THEN 'de-DE' WHEN 'ES' THEN 'es-MX' WHEN 'IT' THEN 'it-IT' ELSE 'en-US' END) culture
WHERE 1 = 1
AND (DATEPART(WEEK, ISNULL(rref.POSPLANSTART, rz.SOLLSTART)) - DATEPART(WEEK, GETDATE())) IN ($P{WW})
AND vz2.VORAUSSETZUNG = 'Service'
AND rz.STATUS < 50
AND r.PLANEN = 1
AND r.AKTIV = 1
AND ISNULL(r.RESSOURCEGRUPPE, '') = ''
