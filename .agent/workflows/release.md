---
description: Build, commit, push and create GitHub release with auto-updater files
---

# /release - Automated Release Workflow

This workflow handles the complete release process for VexCORE.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated via GH_TOKEN environment variable
- Git configured with push access to `dvo916-source/autocrminstall`

## Steps

### 1. Determine Version
Ask the user for the new version number (e.g., 1.1.20). If not provided, read current version from `package.json` and increment the patch number.

### 2. Update Version in package.json
Update the `"version"` field in `package.json` to the new version.

### 3. Run Vite Build (Verify Compilation)
// turbo
```powershell
npm run build
```
If this fails, STOP and fix the errors before proceeding.

### 4. Commit All Changes
```powershell
git add -A
git commit -m "Release v{VERSION} - {DESCRIPTION}"
```

### 5. Create Git Tag
```powershell
git tag v{VERSION}
```

### 6. Push to GitHub
```powershell
git push origin main --tags
```

### 7. Build Installer (NSIS)
```powershell
npm run build:installer
```
Wait for completion. The installer will be at `dist/VexCORE_Setup_{VERSION}.exe`.

### 8. Create GitHub Release with Assets
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); $env:GH_TOKEN = [System.Environment]::GetEnvironmentVariable("GH_TOKEN","User"); gh release create v{VERSION} "dist\VexCORE_Setup_{VERSION}.exe" "dist\latest.yml" --title "Release v{VERSION} - {DESCRIPTION}" --notes "{RELEASE_NOTES}" --repo dvo916-source/autocrminstall
```

### 9. Verify Release
// turbo
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); $env:GH_TOKEN = [System.Environment]::GetEnvironmentVariable("GH_TOKEN","User"); gh release view v{VERSION} --repo dvo916-source/autocrminstall
```

### 10. Report Success
Create an artifact with the release report including:
- Version number
- Commit hash
- Files changed
- Release URL
- Auto-updater status

## Variables
- `{VERSION}`: The semantic version (e.g., 1.1.20)
- `{DESCRIPTION}`: Short description for commit message
- `{RELEASE_NOTES}`: Detailed changelog in markdown
