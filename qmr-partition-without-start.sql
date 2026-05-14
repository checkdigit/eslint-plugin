with
  parameters AS (
    SELECT
      '2025-06-01T00:00:00.000Z' AS p_from,
      '2025-07-01T00:00:00.000Z' AS p_to,
      '55542700' AS p_bin,
      'US' AS p_domestic_country
      /* example:
       '2023-03-01T00:00:00.000Z' AS p_from,
       '2023-04-01T00:00:00.000Z' AS p_to,
       '55542700' AS p_bin,
       'US' AS p_domestic_country
       */
  ),
  /* schema version */
  version AS (
    SELECT
      CAST('1.0' AS VARCHAR) AS version
  ),
  /* general information */
  general AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['startDate',
          'endDate',
          'businessIdentifier',
          'bin',
          'productType'],
          ARRAY [CAST(p.p_from AS JSON),
          CAST(p.p_to AS JSON),
          CAST('TeamPay' AS JSON),
          CAST(p.p_bin AS JSON),
          CAST('CORPORATE CREDIT' AS JSON)]
        ) AS JSON
      ) AS general
    FROM
      parameters AS p
  ),
  /* Data related to transactions section - Read all the cards */
  PaymentCards AS (
    SELECT
      split(pc.url, '/') [7] AS CardId,
      p.p_bin AS Bin
    FROM
      "payment-card" AS pc,
      parameters AS p
    WHERE
      cardinality(split(pc.url, '/')) = 7
      AND split(pc.url, '/') [6] = 'card'
      AND split(pc.url, '/') [3] = 'v2'
      AND json_extract_scalar(pc.requestbody, '$.newCard.bin') = p.p_bin
      AND pc.responsestatus = '200'
      AND pc.method = 'PUT'
      and pc.partition_date >= '2021/01/01'
    UNION ALL
    SELECT
      split(pc.url, '/') [5] AS CardId,
      p.p_bin AS Bin
    FROM
      "payment-card" AS pc,
      parameters AS p
    WHERE
      cardinality(split(pc.url, '/')) = 5
      AND split(pc.url, '/') [4] = 'card'
      AND split(pc.url, '/') [3] = 'v1'
      AND json_extract_scalar(pc.requestbody, '$.newCard.bin') = p.p_bin
      AND pc.responsestatus = '200'
      AND pc.method = 'PUT'
      and pc.partition_date >= '2021/01/01'
  ),
  /* Read all the unique cardIds */
  UniquePaymentCards AS (
    SELECT
      DISTINCT CardId,
      Bin
    FROM
      PaymentCards
  ),
  /* Read all the transactions for all the queried cards with in the specified period */
  FinancialData AS (
    SELECT
      distinct json_extract_scalar(ta.requestbody, '$.messageId') AS MessageId,
      upc.Bin AS Bin,
      json_extract_scalar(ta.requestbody, '$.acquirerNetwork') AS Network,
      json_extract_scalar(ta.requestbody, '$.merchant.country') AS Country,
      IF(
        json_extract_scalar(ta.requestbody, '$.merchant.country') = p.p_domestic_country,
        'Domestic',
        'International'
      ) AS Domestic,
      IF(
        json_extract_scalar(ta.requestbody, '$.categorization.messageType') = 'FINANCIAL'
        AND json_extract_scalar(tar.requestbody, '$.categorization.messageType') = 'REVERSAL'
        AND json_extract_scalar(ta.requestbody, '$.categorization.debitCredit') = 'DEBIT',
        CAST(
          CAST(
            json_extract_scalar(tar.requestbody, '$.settlementAmount.amount') AS Bigint
          ) - CAST(
            json_extract_scalar(ta.responsebody, '$.approvedTotal.amount') AS Bigint
          ) AS varchar
        ),
        IF(
          json_extract_scalar(ta.requestbody, '$.categorization.messageType') = 'FINANCIAL'
          AND json_extract_scalar(tar.requestbody, '$.categorization.messageType') = 'REVERSAL'
          AND json_extract_scalar(ta.requestbody, '$.categorization.debitCredit') = 'CREDIT',
          CAST(
            CAST(
              json_extract_scalar(ta.responsebody, '$.approvedTotal.amount') AS Bigint
            ) - CAST(
              json_extract_scalar(tar.requestbody, '$.settlementAmount.amount') AS Bigint
            ) AS varchar
          ),
          json_extract_scalar(ta.responsebody, '$.approvedTotal.amount')
        )
      ) AS Amount,
      json_extract_scalar(ta.requestbody, '$.categorization.debitCredit') AS DebitCredit,
      json_extract_scalar(ta.requestbody, '$.categorization.category') AS Category,
      IF(
        json_extract_scalar(ta.requestbody, '$.categorization.debitCredit') = 'DEBIT',
        'Purchase',
        'Return'
      ) AS Type,
      IF(
        json_extract_scalar(ta.requestbody, '$.merchant.type') = '6011'
        or json_extract_scalar(ta.requestbody, '$.merchant.type') = '6010',
        'Cash',
        'Purchase'
      ) AS Cash
    FROM
      UniquePaymentCards AS upc,
      parameters AS p,
      "teampay-approval" AS ta
      LEFT OUTER JOIN "teampay-approval" AS tar ON json_extract_scalar(tar.requestbody, '$.matchedMessageId') = json_extract_scalar(ta.requestbody, '$.messageId')
    WHERE
      json_extract_scalar(ta.requestbody, '$.receivedDateTime') >= p.p_from
      AND json_extract_scalar(ta.requestbody, '$.receivedDateTime') < p.p_to
      AND json_extract_scalar(ta.requestbody, '$.categorization.messageType') = 'FINANCIAL'
      AND json_extract_scalar(ta.responsebody, '$.entryId') IS NOT NULL
      AND ta.responsestatus = '201'
      AND ta.method = 'PUT'
      AND json_extract_scalar(ta.requestbody, '$.cardId') = upc.CardId
      AND upc.Bin = p.p_bin
      and ta.partition_date >= '2025/06/01'
      and ta.partition_date < '2025/07/01'
  ),
  /* Read all the domestic Purchases transactions with in the specified period */
  domesticPurchases AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'Domestic'
      AND c.Type = 'Purchase'
      AND c.Cash = 'Purchase'
  ),
  /* Read all the international Purchases transactions with in the specified period */
  internationalPurchases AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'International'
      AND c.Type = 'Purchase'
      AND c.Cash = 'Purchase'
  ),
  /* Read all the domestic Signature Purchases transactions with in the specified period */
  domesticSignaturePurchases AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      c.Network = 'CREDIT MASTERCARD'
      AND c.Domestic = 'Domestic'
      AND c.Type = 'Purchase'
      AND c.Cash = 'Purchase'
  ),
  /* Read all the domestic PIN Purchases transactions with in the specified period */
  domesticPINPurchases AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'Domestic'
      AND c.Type = 'Purchase'
      AND c.Cash = 'Purchase'
  ),
  /* Read all the domestic Cash transactions with in the specified period */
  domesticCash AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'Domestic'
      AND c.Type = 'Cash'
      AND c.Cash = 'Purchase'
  ),
  /* Read all the international Cash transactions with in the specified period */
  internationalCash AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'International'
      AND c.Type = 'Cash'
      AND c.Cash = 'Purchase'
  ),
  /* Read all the domestic ATM Cash transactions with in the specified period */
  domesticATMCash AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'Domestic'
      AND c.Category = 'ATM'
      AND c.Type = 'Purchase'
      AND c.Cash = 'Cash'
  ),
  /* Read all the domestic OTC Cash transactions with in the specified period */
  domesticOTCCash AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'Domestic'
      AND c.Category = 'OTC'
      AND c.Type = 'Purchase'
      AND c.Cash = 'Cash'
  ),
  /* Read all the domestic Returns with in the specified period */
  domesticReturns AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'Domestic'
      AND c.Type = 'Return'
      AND c.Cash = 'Purchase'
  ),
  /* Read all the international Returns  with in the specified period */
  internationalReturns AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      (
        c.Network = 'CREDIT MASTERCARD'
        OR c.Network = 'MAESTRO'
        OR c.Network = 'DEBIT MASTERCARD'
      )
      AND c.Domestic = 'International'
      AND c.Type = 'Return'
      AND c.Cash = 'Purchase'
  ),
  /* Data related to Accounts, Cards Section - Read all the created cards information */
  card_creation AS (
    SELECT
      split(url, '/') [5] AS cardId,
      json_extract(responsebody, '$.card') AS card,
      json_extract_scalar(responsebody, '$.storageKeyId') AS keyId,
      json_extract_scalar(responseheaders, '$["created-on"]') AS createdOn,
      json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
    FROM
      "payment-card",
      parameters AS p
    WHERE
      method = 'PUT'
      AND responsestatus = '200'
      AND split(url, '/') [3] = 'v1'
      AND (
        (
          split(url, '/') [4] = 'card'
          AND cardinality(split(url, '/')) = 5
        )
        OR (
          split(url, '/') [4] = 'card'
          AND split(url, '/') [6] = 'number'
          AND cardinality(split(url, '/')) = 6
        )
      )
      AND json_extract_scalar(requestbody, '$.newCard.bin') = p.p_bin
      and p.partition_date >= '2022/01/01'
    UNION ALL
    SELECT
      split(url, '/') [7] AS cardId,
      json_extract(responsebody, '$.card') AS card,
      json_extract_scalar(responsebody, '$.storageKeyId') AS keyId,
      json_extract_scalar(responseheaders, '$["created-on"]') AS createdOn,
      json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
    FROM
      "payment-card",
      parameters AS p
    WHERE
      method = 'PUT'
      AND responsestatus = '200'
      AND split(url, '/') [3] = 'v2'
      AND (
        (
          split(url, '/') [6] = 'card'
          AND cardinality(split(url, '/')) = 7
        )
        OR (
          split(url, '/') [6] = 'card'
          AND split(url, '/') [8] = 'number'
          AND cardinality(split(url, '/')) = 8
        )
      )
      AND json_extract_scalar(requestbody, '$.newCard.bin') = p.p_bin
      and p.partition_date >= '2022/01/01'
  ),
  /* Read all the card update information */
  card_update AS (
    SELECT
      split(url, '/') [5] AS cardId,
      split(url, '/') [6] AS fieldKey,
      split(url, '/') [7] AS fieldValue,
      json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
    FROM
      "payment-card",
      UniquePaymentCards AS upc,
      parameters AS p
    WHERE
      method = 'PUT'
      AND responsestatus = '204'
      AND split(url, '/') [3] = 'v1'
      AND split(url, '/') [4] = 'card'
      AND cardinality(split(url, '/')) = 7
      AND split(url, '/') [5] = upc.CardId
      AND upc.Bin = p.p_bin
      and partition_date >= '2022/01/01'
    UNION ALL
    SELECT
      split(url, '/') [7] AS cardId,
      split(url, '/') [8] AS fieldKey,
      split(url, '/') [9] AS fieldValue,
      json_extract_scalar(responseheaders, '$["updated-on"]') AS updatedOn
    FROM
      "payment-card",
      UniquePaymentCards AS upc,
      parameters AS p
    WHERE
      method = 'PUT'
      AND responsestatus = '204'
      AND split(url, '/') [3] = 'v2'
      AND split(url, '/') [6] = 'card'
      AND cardinality(split(url, '/')) = 9
      AND split(url, '/') [7] = upc.CardId
      AND upc.Bin = p.p_bin
      and partition_date >= '2022/01/01'
  ),
  /* Read all the card created and updated information */
  combined_card_history AS (
    SELECT
      cardId,
      createdOn,
      updatedOn,
      keyId,
      json_extract_scalar(card, '$.expirationDate') AS expirationDate,
      json_extract_scalar(card, '$.serviceCode') AS serviceCode,
      json_extract_scalar(card, '$.sequenceNumber') AS sequenceNumber,
      json_extract_scalar(card, '$.last4') AS last4,
      json_extract_scalar(card, '$.bin') AS bin,
      updatedOn || '|' || json_extract_scalar(card, '$.active') AS active,
      updatedOn || '|' || json_extract_scalar(card, '$.block') AS block,
      updatedOn || '|' || json_extract_scalar(card, '$.lock') AS lock,
      updatedOn || '|' || json_extract_scalar(card, '$.state') AS state,
      updatedOn || '|' || json_extract_scalar(card, '$.capture') AS capture
    FROM
      card_creation
    UNION ALL
    SELECT
      cardId,
      '' AS createdOn,
      updatedOn,
      '' AS keyId,
      '' AS expirationDate,
      '' AS sequenceNumber,
      '' AS last4,
      '' AS bin,
      '' AS serviceCode,
      IF(
        fieldKey = 'active',
        updatedOn || '|' || fieldValue,
        '1|1'
      ) AS active,
      IF(
        fieldKey = 'block',
        updatedOn || '|' || fieldValue,
        '1|1'
      ) AS block,
      IF(fieldKey = 'lock', updatedOn || '|' || fieldValue, '1|1') AS lock,
      IF(
        fieldKey = 'state',
        updatedOn || '|' || fieldValue,
        '1|1'
      ) AS state,
      IF(
        fieldKey = 'capture',
        updatedOn || '|' || fieldValue,
        '1|1'
      ) AS capture
    FROM
      card_update
  ),
  /* Read all the card information at the beginning period */
  matching_period_start_cards AS (
    SELECT
      cardId || '|' || updatedOn AS cardIdAndUpdatedOn
    FROM
      card_creation,
      parameters AS p
    WHERE
      updatedOn < p.p_from
    UNION ALL
    SELECT
      cardId || '|' || updatedOn AS cardIdAndUpdatedOn
    FROM
      card_update,
      parameters AS p
    WHERE
      updatedOn < p.p_from
  ),
  /* merge all the card history for all the cards at the beginning period */
  merged_card_period_start_data AS (
    SELECT
      split(m.cardIdAndUpdatedOn, '|') [1] AS cardId,
      split(m.cardIdAndUpdatedOn, '|') [2] AS updatedOn,
      MAX(h.createdOn) AS createdOn,
      MAX(h.keyId) AS keyId,
      MAX(h.expirationDate) AS expirationDate,
      MAX(h.serviceCode) AS serviceCode,
      MAX(h.sequenceNumber) AS sequenceNumber,
      MAX(h.last4) AS last4,
      MAX(h.bin) AS bin,
      split(MAX(h.active), '|') [2] AS active,
      split(MAX(h.block), '|') [2] AS block,
      split(MAX(h.lock), '|') [2] AS lock,
      split(MAX(h.state), '|') [2] AS state,
      split(MAX(h.capture), '|') [2] AS capture
    FROM
      matching_period_start_cards m,
      combined_card_history h
    WHERE
      h.cardId = split(m.cardIdAndUpdatedOn, '|') [1]
      AND h.updatedOn <= split(m.cardIdAndUpdatedOn, '|') [2]
    GROUP BY
      m.cardIdAndUpdatedOn
  ),
  /* Read all the card information for all the cards that are updated recently at the beginning period */
  last_update_period_start AS (
    SELECT
      cardId AS cardId,
      MAX(updatedOn) AS updatedOn
    FROM
      merged_card_period_start_data
    GROUP BY
      cardId
  ),
  /* Read all the card information at the end of the period */
  matching_period_end_cards AS (
    SELECT
      cardId || '|' || updatedOn AS cardIdAndUpdatedOn
    FROM
      card_creation,
      parameters AS p
    WHERE
      updatedOn < p.p_to
    UNION ALL
    SELECT
      cardId || '|' || updatedOn AS cardIdAndUpdatedOn
    FROM
      card_update,
      parameters AS p
    WHERE
      updatedOn < p.p_to
  ),
  /* merge all the card history for all the cards at the end of the period */
  merged_card_period_end_data AS (
    SELECT
      split(m.cardIdAndUpdatedOn, '|') [1] AS cardId,
      split(m.cardIdAndUpdatedOn, '|') [2] AS updatedOn,
      MAX(h.createdOn) AS createdOn,
      MAX(h.keyId) AS keyId,
      MAX(h.expirationDate) AS expirationDate,
      MAX(h.serviceCode) AS serviceCode,
      MAX(h.sequenceNumber) AS sequenceNumber,
      MAX(h.last4) AS last4,
      MAX(h.bin) AS bin,
      split(MAX(h.active), '|') [2] AS active,
      split(MAX(h.block), '|') [2] AS block,
      split(MAX(h.lock), '|') [2] AS lock,
      split(MAX(h.state), '|') [2] AS state,
      split(MAX(h.capture), '|') [2] AS capture
    FROM
      matching_period_end_cards m,
      combined_card_history h
    WHERE
      h.cardId = split(m.cardIdAndUpdatedOn, '|') [1]
      AND h.updatedOn <= split(m.cardIdAndUpdatedOn, '|') [2]
    GROUP BY
      m.cardIdAndUpdatedOn
  ),
  /* Read all the card information for all the cards that are updated recently at the end of the period */
  last_update_period_end AS (
    SELECT
      cardId AS cardId,
      MAX(updatedOn) AS updatedOn
    FROM
      merged_card_period_end_data
    GROUP BY
      cardId
  ),
  /* Read all the information of the cards that are in open state at the beginning period */
  openAtStartAccounts AS (
    SELECT
      COALESCE(CAST(COUNT(*) AS varchar), '0') AS openAtStart
    FROM
      merged_card_period_start_data AS md,
      last_update_period_start AS lu
    WHERE
      md.cardId = lu.cardId
      AND md.updatedOn = lu.updatedOn
      AND md.active = 'ACTIVE'
      AND md.block = 'OPEN'
      AND md.lock = 'UNLOCKED'
      AND md.state = 'CURRENT'
  ),
  /* Read all the information of the cards that are in blocked state at the beginning period */
  blockedAtStartAccounts AS (
    SELECT
      COALESCE(CAST(COUNT(*) AS varchar), '0') AS blockedAtStart
    FROM
      merged_card_period_start_data AS md,
      last_update_period_start AS lu
    WHERE
      md.cardId = lu.cardId
      AND md.updatedOn = lu.updatedOn
      AND (
        (
          md.active = 'ACTIVE'
          AND md.block = 'OPEN'
          AND md.lock = 'LOCKED'
          AND md.state = 'CURRENT'
        )
        OR (
          md.active = 'INACTIVE'
          AND md.block = 'OPEN'
          AND md.lock = 'UNLOCKED'
          AND md.state = 'CURRENT'
        )
      )
  ),
  /* Read all the information of the cards that are in open state at the end of the period */
  openAtEndAccounts AS (
    SELECT
      COALESCE(CAST(COUNT(*) AS varchar), '0') AS openAtEnd
    FROM
      merged_card_period_end_data AS md,
      last_update_period_end AS lu
    WHERE
      md.cardId = lu.cardId
      AND md.updatedOn = lu.updatedOn
      AND md.active = 'ACTIVE'
      AND md.block = 'OPEN'
      AND md.lock = 'UNLOCKED'
      AND md.state = 'CURRENT'
  ),
  /* Read all the information of the cards that are in blocked state at the end of the period */
  blockedAtEndAccounts AS (
    SELECT
      COALESCE(CAST(COUNT(*) AS varchar), '0') AS blockedAtEnd
    FROM
      merged_card_period_end_data AS md,
      last_update_period_end AS lu
    WHERE
      md.cardId = lu.cardId
      AND md.updatedOn = lu.updatedOn
      AND (
        (
          md.active = 'ACTIVE'
          AND md.block = 'OPEN'
          AND md.lock = 'LOCKED'
          AND md.state = 'CURRENT'
        )
        OR (
          md.active = 'INACTIVE'
          AND md.block = 'OPEN'
          AND md.lock = 'UNLOCKED'
          AND md.state = 'CURRENT'
        )
      )
  ),
  /* Read all the cards that are created between given start and end period */
  created_card_ids AS (
    SELECT
      distinct split(tcm.url, '/') [5] AS cardId
    FROM
      "teampay-card-management" AS tcm,
      parameters AS p
    WHERE
      tcm.method = 'PUT'
      AND cardinality(split(tcm.url, '/')) = 5
      AND split(tcm.url, '/') [4] = 'card'
      AND tcm.responsestatus = '200'
      AND json_extract_scalar(tcm.responsebody, '$.card.bin') = p.p_bin
      AND json_extract_scalar(tcm.responseheaders, '$["created-on"]') >= p.p_from
      AND json_extract_scalar(tcm.responseheaders, '$["created-on"]') < p.p_to
  ),
  /* Count cards that are created between given start and end period */
  newAccountsInPeriod AS (
    SELECT
      COALESCE(CAST(COUNT(*) AS varchar), '0') AS created
    FROM
      created_card_ids
  ),
  /* Read cards that are retired before start of the period*/
  prior_card_ids AS (
    SELECT
      distinct split(tcm.url, '/') [5] AS cardId
    FROM
      "teampay-card-management" AS tcm,
      parameters AS p
    WHERE
      tcm.method = 'PUT'
      AND cardinality(split(tcm.url, '/')) = 7
      AND split(tcm.url, '/') [4] = 'card'
      AND split(tcm.url, '/') [6] = 'state'
      AND split(tcm.url, '/') [7] = 'RETIRED'
      AND tcm.responsestatus = '204'
      AND json_extract_scalar(tcm.responseheaders, '$["updated-on"]') < p.p_from
      and tcm.partition_date >= '2022/01/01'
  ),
  /* Read cards that are retired with in the specified period */
  retired_card_ids AS (
    SELECT
      distinct uc.CardId AS cardId
    FROM
      parameters AS p,
      UniquePaymentCards AS uc
      LEFT OUTER JOIN "teampay-card-management" AS tcm ON split(tcm.url, '/') [5] = uc.CardId
    WHERE
      tcm.method = 'PUT'
      AND cardinality(split(tcm.url, '/')) = 7
      AND split(tcm.url, '/') [4] = 'card'
      AND split(tcm.url, '/') [6] = 'state'
      AND split(tcm.url, '/') [7] = 'RETIRED'
      AND tcm.responsestatus = '204'
      AND json_extract_scalar(tcm.responseheaders, '$["updated-on"]') >= p.p_from
      AND json_extract_scalar(tcm.responseheaders, '$["updated-on"]') < p.p_to
      AND split(tcm.url, '/') [5] not in (
        SELECT
          *
        FROM
          prior_card_ids
      )
      and tcm.partition_date >= '2022/01/01'
  ),
  /* Count cards that are retired with in the specified period */
  retiredAccountsInPeriod AS (
    SELECT
      COALESCE(CAST(COUNT(*) AS varchar), '0') AS lost
    FROM
      retired_card_ids
  ),
  /* Read cards with transactions with in the specified period for the provided bin */
  financialDataMinTransaction AS (
    SELECT
      json_extract_scalar(ta.requestbody, '$.cardId') AS CardId,
      ta.*
    FROM
      "teampay-approval" AS ta,
      parameters AS p
    WHERE
      json_extract_scalar(ta.requestbody, '$.receivedDateTime') >= p.p_from
      AND json_extract_scalar(ta.requestbody, '$.receivedDateTime') < p.p_to
      AND json_extract_scalar(ta.requestbody, '$.categorization.messageType') = 'FINANCIAL'
      AND json_extract_scalar(ta.responsebody, '$.entryId') IS NOT NULL
      AND ta.responsestatus = '201'
      AND ta.method = 'PUT'
      and ta.partition_date >= '2025/06/01'
      and ta.partition_date < '2025/07/01'
  ),
  /* Read cards, Count cards with transactions with in the specified period */
  financialTotalsMinTransaction AS (
    SELECT
      fd.CardId AS CardId,
      COALESCE(CAST(COUNT(*) AS varchar), '0') AS minimumTransactionsCount
    FROM
      financialDataMinTransaction AS fd
    GROUP BY
      fd.CardId
  ),
  /* Filter cards with transactions based on provided bin */
  financialTotalsMinTransactionByBin AS (
    SELECT
      fd.minimumTransactionsCount AS minimumTransactionsCount
    FROM
      UniquePaymentCards AS upc,
      financialTotalsMinTransaction AS fd,
      parameters AS p
    WHERE
      upc.CardId = fd.CardId
      AND upc.Bin = p.p_bin
  ),
  /* Count cards with transactions with in the specified period */
  accountsMinimumTransaction AS (
    SELECT
      COALESCE(
        CAST(COUNT(minimumTransactionsCount) AS varchar),
        '0'
      ) AS minimumTransactionsCount
    FROM
      financialTotalsMinTransactionByBin
  ),
  /* Read cards to check for emv contactless transactions with in the specified period in the next step */
  cardManagementData AS (
    SELECT
      SPLIT(tcm.url, '/') [5] AS CardId,
      json_extract_scalar(tcm.requestbody, '$.product') AS Product
    FROM
      "teampay-card-management" AS tcm,
      "teampay-card-management" AS tcmch,
      parameters AS p
    WHERE
      SPLIT(tcm.url, '/') [4] = 'card'
      AND cardinality(SPLIT(tcm.url, '/')) = 5
      AND tcm.responsestatus = '200'
      AND tcm.method = 'PUT'
      AND json_extract_scalar(tcm.responsebody, '$.card.bin') = p.p_bin
      AND SPLIT(tcmch.url, '/') [4] = 'cardholder'
      AND cardinality(SPLIT(tcmch.url, '/')) = 5
      AND tcmch.responsestatus = '200'
      AND tcmch.method = 'PUT'
      AND json_extract_scalar(tcm.requestbody, '$.cardholderId') = SPLIT(tcmch.url, '/') [5]
      and tcm.partition_date >= '2022/01/01'
      and tcmch.partition_date >= '2022/01/01'
  ),
  /* Read  emv contactless transactions with in the specified period */
  cardApprovalData AS (
    SELECT
      json_extract_scalar(ta.requestbody, '$.cardId') AS CardId,
      json_extract_scalar(ta.responsebody, '$.approvedTotal.amount') AS Amount
    FROM
      "teampay-approval" AS ta,
      "teampay-approval" AS matched_ta,
      parameters AS p
    WHERE
      json_extract_scalar(ta.requestbody, '$.receivedDateTime') >= p.p_from
      AND json_extract_scalar(ta.requestbody, '$.receivedDateTime') < p.p_to
      AND json_extract_scalar(ta.requestbody, '$.categorization.messageType') = 'FINANCIAL'
      AND json_extract_scalar(ta.responsebody, '$.entryId') IS NOT NULL
      AND ta.responsestatus = '201'
      AND ta.method = 'PUT'
      AND json_extract_scalar(ta.requestbody, '$.matchedMessageId') = json_extract_scalar(matched_ta.requestbody, '$.messageId')
      AND json_extract_scalar(
        matched_ta.requestbody,
        '$.merchant.panEntryMethod'
      ) = 'CONTACTLESS EMV RULES'
      and ta.partition_date >= '2025/06/01'
      and ta.partition_date < '2025/07/01'
  ),
  /* Read cards with  EMV contactless transactions with in the specified period */
  emvContactlessData AS (
    SELECT
      cmd.Product AS Product,
      cad.Amount AS Amount
    FROM
      cardManagementData AS cmd,
      cardApprovalData AS cad
    WHERE
      cad.CardId = cmd.CardId
  ),
  /* Read cards with ATM access transactions with in the specified period */
  atmAccess AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      c.Network = 'CIRRUS'
      AND c.Category = 'ATM'
      AND c.Cash = 'Cash'
  ),
  /* Read cards with PIN Pos transactions with in the specified period */
  pinPos AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      FinancialData AS c
    WHERE
      c.Network = 'MAESTRO'
      AND c.Category = 'PIN'
      AND c.Cash = 'Purchase'
  ),
  /* Read cards with EMV contactless transactions with in the specified period */
  emv AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      emvContactlessData AS c
    WHERE
      c.Product <> 'VIRTUAL'
  ),
  /* Read cards with contactless transactions with in the specified period */
  contactless AS (
    SELECT
      COALESCE(CAST(COUNT(c.Amount) AS varchar), '0') AS transactions,
      COALESCE(CAST(SUM(CAST(c.Amount AS BIGINT)) AS varchar), '0') AS volume
    FROM
      emvContactlessData AS c
    WHERE
      c.Product <> 'VIRTUAL'
  ),
  /* Organize and aggregate different categories i.e domesticPurchases, internationalPurchases, domesticCash, internationalCash, domesticATMCash, domesticOTCCash of transaction data */
  transactionsAggregation AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(CAST(domesticPurchases.transactions AS BIGINT)) AS varchar
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(
                  SUM(CAST(domesticPurchases.volume AS BIGINT)) AS varchar
                ),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS domesticPurchases,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(
                  CAST(internationalPurchases.transactions AS BIGINT)
                ) AS varchar
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(
                  SUM(CAST(internationalPurchases.volume AS BIGINT)) AS varchar
                ),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS internationalPurchases,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(CAST(domesticCash.transactions AS BIGINT)) AS varchar
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(SUM(CAST(domesticCash.volume AS BIGINT)) AS varchar),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS domesticCash,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(CAST(internationalCash.transactions AS BIGINT)) AS varchar
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(
                  SUM(CAST(internationalCash.volume AS BIGINT)) AS varchar
                ),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS internationalCash,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(CAST(domesticATMCash.transactions AS BIGINT)) AS varchar
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(
                  SUM(CAST(domesticATMCash.volume AS BIGINT)) AS varchar
                ),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS domesticATMCash,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(CAST(domesticOTCCash.transactions AS BIGINT)) AS varchar
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(
                  SUM(CAST(domesticOTCCash.volume AS BIGINT)) AS varchar
                ),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS domesticOTCCash
    FROM
      domesticPurchases,
      internationalPurchases,
      domesticCash,
      internationalCash,
      domesticATMCash,
      domesticOTCCash
  ),
  /* Read all the transactional data for different categories and convert AS JSON */
  transactions AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['domesticPurchases',
          'internationalPurchases',
          'domesticSignaturePurchases',
          'domesticPINPurchases',
          'domesticCash',
          'internationalCash',
          'domesticATMCash',
          'domesticOTCCash',
          'domesticReturns',
          'internationalReturns',
          'domesticLoads',
          'internationalLoads'],
          ARRAY [CAST(t.domesticPurchases AS JSON),
          CAST(t.internationalPurchases AS JSON),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST(dsp.transactions AS JSON),
              CAST(
                MAP(
                  ARRAY ['amount',
                  'currency'],
                  ARRAY [dsp.volume,
                  'USD']
                ) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST(dpp.transactions AS JSON),
              CAST(
                MAP(
                  ARRAY ['amount',
                  'currency'],
                  ARRAY [dpp.volume,
                  'USD']
                ) AS JSON
              )]
            ) AS JSON
          ),
          CAST(t.domesticCash AS JSON),
          CAST(t.internationalCash AS JSON),
          CAST(t.domesticATMCash AS JSON),
          CAST(t.domesticOTCCash AS JSON),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST(dr.transactions AS JSON),
              CAST(
                MAP(
                  ARRAY ['amount',
                  'currency'],
                  ARRAY [dr.volume,
                  'USD']
                ) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST(ir.transactions AS JSON),
              CAST(
                MAP(
                  ARRAY ['amount',
                  'currency'],
                  ARRAY [ir.volume,
                  'USD']
                ) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          )]
        ) AS JSON
      ) AS transactions
    FROM
      transactionsAggregation AS t,
      domesticSignaturePurchases AS dsp,
      domesticPINPurchases AS dpp,
      domesticReturns AS dr,
      internationalReturns AS ir
  ),
  /* Read all the accounts data and convert AS JSON */
  accounts AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['openAtStart',
          'blockedAtStart',
          'created',
          'lost',
          'minimumOneTransaction',
          'openAtEnd',
          'blockedAtEnd'],
          ARRAY [CAST(osa.openAtStart AS JSON),
          CAST(bsa.blockedAtStart AS JSON),
          CAST(nap.created AS JSON),
          CAST(raip.lost AS JSON),
          CAST(amt.minimumTransactionsCount AS JSON),
          CAST(oea.openAtEnd AS JSON),
          CAST(bea.blockedAtEnd AS JSON)]
        ) AS JSON
      ) AS accounts
    FROM
      openAtStartAccounts AS osa,
      blockedAtStartAccounts AS bsa,
      newAccountsInPeriod AS nap,
      retiredAccountsInPeriod AS raip,
      accountsMinimumTransaction AS amt,
      openAtEndAccounts AS oea,
      blockedAtEndAccounts AS bea
  ),
  /* Organize and aggregate different card data that includes ATMAccess, PINPos, domesticCash, contactless, emv */
  cardsAggregation AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(CAST(atmAccess.transactions AS BIGINT)) AS VARCHAR
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(SUM(CAST(atmAccess.volume AS BIGINT)) AS VARCHAR),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS atmAccess,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(SUM(CAST(pinPos.transactions AS BIGINT)) AS VARCHAR),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(SUM(CAST(pinPos.volume AS BIGINT)) AS VARCHAR),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS pinPos,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(SUM(CAST(emv.transactions AS BIGINT)) AS VARCHAR),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(CAST(SUM(CAST(emv.volume AS BIGINT)) AS VARCHAR), '0'),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS emv,
      CAST(
        MAP(
          ARRAY ['transactions',
          'volume'],
          ARRAY [CAST(
            COALESCE(
              CAST(
                SUM(CAST(contactless.transactions AS BIGINT)) AS VARCHAR
              ),
              '0'
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['amount',
              'currency'],
              ARRAY [COALESCE(
                CAST(SUM(CAST(contactless.volume AS BIGINT)) AS VARCHAR),
                '0'
              ),
              'USD']
            ) AS JSON
          )]
        ) AS JSON
      ) AS contactless
    FROM
      atmAccess,
      pinPos,
      emv,
      contactless
  ),
  /* Read all the physical cards - emv,contactless */
  physicalCards AS (
    SELECT
      COUNT(distinct split(tcm.url, '/') [5]) AS cards
    FROM
      "teampay-card-management" AS tcm,
      parameters AS p
    WHERE
      tcm.method = 'PUT'
      AND cardinality(split(tcm.url, '/')) = 5
      AND split(tcm.url, '/') [4] = 'card'
      AND tcm.responsestatus = '200'
      AND json_extract_scalar(tcm.responsebody, '$.card.bin') = p.p_bin
      AND json_extract_scalar(tcm.requestbody, '$.product') <> 'VIRTUAL'
      AND json_extract_scalar(tcm.responseheaders, '$["created-on"]') < p.p_to
  ),
  /* Total emv, contactless cards */
  emvContactlessCards AS (
    SELECT
      COALESCE(CAST(cards AS VARCHAR), '0') AS cards
    FROM
      physicalCards
  ),
  /* Read all the cards data and convert AS JSON */
  cards AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['openAtStart',
          'blockedAtStart',
          'created',
          'lost',
          'openAtEnd',
          'blockedAtEnd',
          'emvCards',
          'contactlessCards',
          'minimumOneTransaction',
          'atmAccess',
          'pinPos',
          'emv',
          'contactless'],
          ARRAY [CAST(osa.openAtStart AS JSON),
          CAST(bsa.blockedAtStart AS JSON),
          CAST(nap.created AS JSON),
          CAST(raip.lost AS JSON),
          CAST(oea.openAtEnd AS JSON),
          CAST(bea.blockedAtEnd AS JSON),
          CAST(ecc.cards AS JSON),
          CAST(ecc.cards AS JSON),
          CAST(amt.minimumTransactionsCount AS JSON),
          CAST(ca.atmAccess AS JSON),
          CAST(ca.pinPos AS JSON),
          CAST(ca.emv AS JSON),
          CAST(ca.contactless AS JSON)]
        ) AS JSON
      ) AS cards
    FROM
      openAtStartAccounts AS osa,
      blockedAtStartAccounts AS bsa,
      newAccountsInPeriod AS nap,
      retiredAccountsInPeriod AS raip,
      accountsMinimumTransaction AS amt,
      cardsAggregation AS ca,
      openAtEndAccounts AS oea,
      blockedAtEndAccounts AS bea,
      emvContactlessCards AS ecc
  ),
  /* Data related to Disputes Section with in the specified period -  Everything would be zeros for now and will revisit to capture in future */
  disputes AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['domesticLoadLoses',
          'internationalLoadLoses',
          'domesticChargeOff',
          'internationalChargeOff',
          'domesticFraud',
          'internationalFraud',
          'domesticOther',
          'internationalOther'],
          ARRAY [CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          ),
          CAST(
            MAP(
              ARRAY ['transactions',
              'volume'],
              ARRAY [CAST('0' AS JSON),
              CAST(
                MAP(ARRAY ['amount', 'currency'], ARRAY ['0', 'USD']) AS JSON
              )]
            ) AS JSON
          )]
        ) AS JSON
      ) AS disputes
  ),
  /* CAST  all the categories - General, transactions, Accounts, Cards, Disputes AS JSON and map to PeriodicReport */
  QMR AS (
    SELECT
      CAST(
        MAP(
          ARRAY ['version',
          'general',
          'transactions',
          'accounts',
          'cards',
          'disputes'],
          ARRAY [CAST(v.version AS JSON),
          CAST(g.general AS JSON),
          CAST(t.transactions AS JSON),
          CAST(a.accounts AS JSON),
          CAST(c.cards AS JSON),
          CAST(d.disputes AS JSON)]
        ) AS JSON
      ) AS qmr
    FROM
      version AS v,
      general AS g,
      transactions AS t,
      accounts AS a,
      cards AS c,
      disputes AS d
  )
  /* final periodic report to include all the categories - General, transactions, Accounts, Cards, Disputes in JSON format */
SELECT
  DISTINCT CAST(qmr AS JSON) AS PeriodicReport
FROM
  QMR