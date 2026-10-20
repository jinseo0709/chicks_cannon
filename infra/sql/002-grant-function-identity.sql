-- Run against the leaderboard database as its Microsoft Entra administrator,
-- after the Function App exists. Replace the principal name with its exact name.
CREATE USER [ccprod123-api] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [ccprod123-api];
ALTER ROLE db_datawriter ADD MEMBER [ccprod123-api];
