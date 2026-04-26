import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    google: {
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      steps: [
        "1. Aller sur https://console.cloud.google.com/",
        "2. Créer un nouveau projet",
        "3. Activer l'API Gmail et Google Calendar",
        "4. Créer des identifiants OAuth 2.0",
        "5. Ajouter les scopes: openid, email, profile, gmail.readonly, gmail.send, calendar, calendar.events",
        "6. Définir l'URI de redirection: http://localhost:3000/api/auth/callback/google",
        "7. Copier Client ID et Client Secret dans .env",
      ],
    },
    microsoft: {
      configured: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
      steps: [
        "1. Aller sur https://portal.azure.com/",
        "2. Enregistrer une nouvelle application dans Azure Active Directory",
        "3. Configurer les permissions API: Mail.Read, Mail.Send, Calendars.ReadWrite",
        "4. Définir l'URI de redirection: http://localhost:3000/api/auth/callback/azure-ad",
        "5. Créer un secret client",
        "6. Copier Application ID et Secret dans .env",
      ],
    },
  })
}
