-- Apply once to the target Azure SQL database. The caller's Entra identity needs
-- CREATE TABLE/INDEX permissions during migration; runtime only needs data access.
CREATE TABLE dbo.LeaderboardEntry (
    ParticipantId uniqueidentifier NOT NULL CONSTRAINT PK_LeaderboardEntry PRIMARY KEY,
    Nickname nvarchar(16) NOT NULL,
    BestScore int NOT NULL CONSTRAINT CK_LeaderboardEntry_BestScore CHECK (BestScore BETWEEN 0 AND 50000),
    AchievedAt datetime2(3) NOT NULL,
    CreatedAt datetime2(3) NOT NULL,
    UpdatedAt datetime2(3) NOT NULL
);

CREATE INDEX IX_LeaderboardEntry_Ranking
    ON dbo.LeaderboardEntry(BestScore DESC, AchievedAt ASC, ParticipantId ASC);

CREATE TABLE dbo.SubmissionAttempt (
    Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_SubmissionAttempt PRIMARY KEY,
    ParticipantId uniqueidentifier NOT NULL,
    AttemptedAt datetime2(3) NOT NULL
);

CREATE INDEX IX_SubmissionAttempt_Participant_Time
    ON dbo.SubmissionAttempt(ParticipantId, AttemptedAt ASC);
