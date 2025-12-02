/*+ SQLPARSERNEW */
SELECT
  cardKey = r.guid,
  ressource = r.ressource,
  rezu = NULL,
  ressourceName = r.name,
  rezus = 0,
  stage = 'touren',
  voraussetzung = NULL,
  rezuIds = NULL,
  start = NULL,
  ende = NULL,
  orderBy = r.ressource
FROM RESSOURCE r
WHERE r.planen = 1
AND r.name like '%tour%'
