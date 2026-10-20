# Azure SQL leaderboard smoke check

Run this checklist only against a disposable or explicitly selected Azure SQL database.
It creates no cloud resources. The migration is a one-time operation and intentionally
fails if either table already exists; inspect the schema before applying it again.

1. Sign in to the database with an Entra administrator and apply `001-leaderboard.sql`.
2. Create a database user for the Function managed identity and grant only the runtime roles:

   ```sql
   CREATE USER [<function-managed-identity-name>] FROM EXTERNAL PROVIDER;
   ALTER ROLE db_datareader ADD MEMBER [<function-managed-identity-name>];
   ALTER ROLE db_datawriter ADD MEMBER [<function-managed-identity-name>];
   ```

3. Set `LEADERBOARD_STORE=sql`, `AZURE_SQL_SERVER`, and `AZURE_SQL_DATABASE` for the
   local Functions process. Run `az login` first. In Azure, enable the Function App
   managed identity and create its database user as above.
4. Submit one completed campaign record, then submit a higher score for the same
   participant. Confirm one row remains and `BestScore`/`AchievedAt` reflect the higher
   score while `CreatedAt` stays unchanged.
5. Submit a lower score and a valid tied score for a second participant. Confirm the
   first participant's score does not decrease and the ranking endpoint gives tied
   scores the same rank with the next rank skipped.
6. Submit six requests for one participant inside ten minutes. Confirm the sixth gets
   HTTP 429 and a `Retry-After` header. Confirm rows in `SubmissionAttempt` are shared
   across Function instances and old attempts are pruned by later requests.

Never put SQL passwords, tokens, or real credentials in `.env.example` or source control.
