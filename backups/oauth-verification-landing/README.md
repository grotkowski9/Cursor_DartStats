# Backup landingu przed weryfikacją Google OAuth

Data: 2026-08-07

Pliki w tym folderze to kopia stanu **przed** tymczasowymi zmianami pod weryfikację OAuth (jednolity H1, opis celu, akapit Google, title/OG).

## Przywrócenie poprzedniej wersji

```bash
cp backups/oauth-verification-landing/page.tsx app/page.tsx
cp backups/oauth-verification-landing/page-metadata.ts lib/page-metadata.ts
```

Następnie commit + deploy na produkcję.

## Google OAuth — homepage URL

Podczas weryfikacji OAuth ustaw w GCP **Application home page** na:

`https://dart.sylveoncompany.pl/app-info`

Po weryfikacji możesz zostawić ten URL (zalecane) lub wrócić do `/` — patrz sekcja przywracania powyżej.
