# Kinora

Kinora is an Expo SDK 58 / React Native app for organizing, uploading, accessing, and sharing family healthcare records.

## Features

- Supabase email/password authentication
- Home dashboard and category-filtered medical records
- Family groups, member relationships, and in-app invitations
- Medical result entry with one test per record and PDF/image attachments
- Record timeline, details, and swipe-to-remove confirmation
- Profile gender preference for reciprocal family relationship labels

## Run and validate

Install the exact dependencies from the lockfile, then start Expo:

```powershell
npm ci
npx expo start
```

Run the TypeScript check and export native JavaScript bundles:

```powershell
npm run typecheck
npx expo export --platform android --platform ios
```

For an Android release APK, generate the native project and build it:

```powershell
npx expo prebuild --platform android
.\android\gradlew.bat -p android assembleRelease
```

The APK is written to `android\app\build\outputs\apk\release\app-release.apk`.
An iOS device build requires Apple signing; local iOS builds require macOS and Xcode.

The installed app displays its version and platform build number at the bottom of the Profile tab. For each release, update `expo.version` and increment `expo.android.versionCode` and `expo.ios.buildNumber` in `app.json`; Android build numbers must always increase for store updates.

## Supabase

The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the local `.env`. Never put a Supabase `service_role` key in the app.

This recovered copy does not include the original `supabase\migrations` or `supabase\functions` source files. The app expects its existing Supabase schema and RPCs (including family group, invitation, medical record, and attachment operations) to already be deployed. Preserve any existing remote project data; recover or recreate those backend definitions before attempting a fresh Supabase setup.

Do not use real patient information until database permissions, attachment access, and backups have been reviewed for the intended deployment.
