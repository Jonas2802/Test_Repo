/*+ SQLPARSERNEW */
SELECT
  cardKey = CONCAT(r.guid, '-', rg.ressource),
  ressource = r.ressource,
  rezu = NULL,
  ressourceName = r.name,
  rezus = rg.rezus,
  stage = CASE WHEN vz2.voraussetzung != 'Service' THEN 'touren' END,
  voraussetzung = vz2.voraussetzung,
  rezuIds = rg.rezuIds,
  start = NULL,
  ende = NULL,
  orderBy = rg.ressource
FROM (
  SELECT
    t.ressource,
    rezus = COUNT(*),
    rezuIds = STRING_AGG(t.id, ';')
  FROM REZU t
  JOIN REZU_REF t2 on t.GUID = t2.GUID
  WHERE t.status < 50
  AND (DATEPART(WEEK, t2.posplanstart) - DATEPART(WEEK, GETDATE())) IN ($P{WW})
  GROUP BY t.ressource
) rg
JOIN RESSOURCE r ON rg.ressource = r.ressource
LEFT JOIN VORAUSSETZUNGREF vz1 ON vz1.REFGUID = r.guid
LEFT JOIN VORAUSSETZUNG vz2 ON vz2.GUID = vz1.VORAUSSETZUNGGUID
WHERE 1 = 1
AND r.planen = 1
AND r.name like '%tour%'

UNION ALL

SELECT
  cardKey = rz.guid,
  ressource = rz.ressource,
  rezu = rz.rezu,
  ressourceName = rz.rezu,
  rezus = 1,
  stage = rz.ressource,
  voraussetzung = vz2.voraussetzung,
  rezuIds = NULL,
  start = FORMAT(rz.sollstart, 'd', culture.code),
  ende = FORMAT(rz.sollende, 'd', culture.code),
  orderBy = rz.rezu
FROM rezu rz
JOIN REZU_REF rref on rz.guid = rref.guid
JOIN RESSOURCE r ON rz.ressource = r.ressource
JOIN VORAUSSETZUNGREF vz1 ON vz1.REFGUID = r.guid
JOIN VORAUSSETZUNG vz2 ON vz2.GUID = vz1.VORAUSSETZUNGGUID
CROSS APPLY (SELECT code = CASE '$S{LNG}' WHEN 'DE' THEN 'de-DE' WHEN 'ES' THEN 'es-MX' WHEN 'IT' THEN 'it-IT' ELSE 'en-US' END) culture
WHERE 1 = 1
AND (DATEPART(WEEK, ISNULL(rref.posplanstart, rz.sollstart)) - DATEPART(WEEK, GETDATE())) IN ($P{WW})
AND vz2.voraussetzung = 'Service'
AND rz.status < 50
AND r.planen = 1
AND r.aktiv = 1
AND ISNULL(r.ressourcegruppe, '') = ''
