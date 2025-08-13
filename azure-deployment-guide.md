
# Azure Deployment Handleiding - Medische Inventaris App

## Vereisten
- Azure account
- Azure CLI geïnstalleerd
- Node.js 20+ lokaal
- PostgreSQL database (Azure Database for PostgreSQL)

## Stap 1: Azure Resources Aanmaken

### 1.1 Resource Group
```bash
az group create --name medische-inventaris-rg --location westeurope
```

### 1.2 PostgreSQL Database
```bash
az postgres flexible-server create \
  --resource-group medische-inventaris-rg \
  --name medische-inventaris-db \
  --location westeurope \
  --admin-user dbadmin \
  --admin-password "JouwSterkWachtwoord123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --public-access 0.0.0.0 \
  --storage-size 32 \
  --version 16
```

### 1.3 App Service Plan
```bash
az appservice plan create \
  --name medische-inventaris-plan \
  --resource-group medische-inventaris-rg \
  --location westeurope \
  --is-linux \
  --sku B1
```

### 1.4 Web App
```bash
az webapp create \
  --resource-group medische-inventaris-rg \
  --plan medische-inventaris-plan \
  --name medische-inventaris-app \
  --runtime "NODE:20-lts" \
  --deployment-local-git
```

## Stap 2: Database Setup

### 2.1 Database Connectie String
```bash
# Krijg de connectie string
az postgres flexible-server show-connection-string \
  --server-name medische-inventaris-db \
  --database-name postgres \
  --admin-user dbadmin \
  --admin-password "JouwSterkWachtwoord123!"
```

### 2.2 Database Schema Deployen
```bash
# Lokaal, met Azure database URL
export DATABASE_URL="postgresql://dbadmin:JouwSterkWachtwoord123!@medische-inventaris-db.postgres.database.azure.com:5432/postgres?sslmode=require"
npm run db:push
```

## Stap 3: Environment Variables Instellen

```bash
az webapp config appsettings set \
  --resource-group medische-inventaris-rg \
  --name medische-inventaris-app \
  --settings \
    NODE_ENV=production \
    PORT=8000 \
    DATABASE_URL="postgresql://dbadmin:JouwSterkWachtwoord123!@medische-inventaris-db.postgres.database.azure.com:5432/postgres?sslmode=require" \
    SMTP_HOST="smtp.gmail.com" \
    SMTP_PORT=587 \
    SMTP_SECURE=true \
    SMTP_USER="jouw-email@gmail.com" \
    SMTP_PASSWORD="jouw-app-wachtwoord" \
    FROM_EMAIL="jouw-email@gmail.com" \
    FROM_NAME="Medische Inventaris"
```

## Stap 4: Code Aanpassingen voor Azure

### 4.1 Package.json scripts updaten
```json
{
  "scripts": {
    "azure:build": "npm run build",
    "azure:start": "node dist/index.js"
  }
}
```

### 4.2 Azure startup configuratie
```bash
az webapp config set \
  --resource-group medische-inventaris-rg \
  --name medische-inventaris-app \
  --startup-file "npm run azure:start"
```

## Stap 5: Deployment

### 5.1 Git Repository Setup
```bash
# In je project directory
git init
git add .
git commit -m "Initial commit for Azure deployment"

# Git remote toevoegen (krijg je van Azure)
az webapp deployment source config-local-git \
  --name medische-inventaris-app \
  --resource-group medische-inventaris-rg
```

### 5.2 Deploy naar Azure
```bash
# Krijg deployment credentials
az webapp deployment list-publishing-credentials \
  --name medische-inventaris-app \
  --resource-group medische-inventaris-rg

# Push naar Azure
git remote add azure [GIT_URL_FROM_AZURE]
git push azure main
```

## Stap 6: SSL & Custom Domain (Optioneel)

### 6.1 Custom Domain
```bash
az webapp config hostname add \
  --webapp-name medische-inventaris-app \
  --resource-group medische-inventaris-rg \
  --hostname jouw-domein.nl
```

### 6.2 SSL Certificaat
```bash
az webapp config ssl bind \
  --certificate-thumbprint [CERT_THUMBPRINT] \
  --ssl-type SNI \
  --name medische-inventaris-app \
  --resource-group medische-inventaris-rg
```

## Stap 7: Monitoring & Logging

### 7.1 Application Insights
```bash
az monitor app-insights component create \
  --app medische-inventaris-insights \
  --location westeurope \
  --resource-group medische-inventaris-rg
```

### 7.2 Log Stream
```bash
az webapp log tail \
  --name medische-inventaris-app \
  --resource-group medische-inventaris-rg
```

## Kosten Schatting (Per Maand)
- App Service B1: €13,43
- PostgreSQL B1ms: €23,74  
- Storage: €2-5
- **Totaal: ~€40-45/maand**

## Troubleshooting

### Database connectie problemen:
```bash
# Test database connectie
az postgres flexible-server connect \
  --name medische-inventaris-db \
  --admin-user dbadmin
```

### App logs bekijken:
```bash
az webapp log download \
  --name medische-inventaris-app \
  --resource-group medische-inventaris-rg
```

### Deployment status:
```bash
az webapp deployment list \
  --name medische-inventaris-app \
  --resource-group medische-inventaris-rg
```

## Production Checklist
- [ ] Database schema deployed (`npm run db:push`)
- [ ] Environment variables ingesteld
- [ ] App Service plan geschaald naar productie
- [ ] SSL certificaat actief
- [ ] Database backups ingeschakeld
- [ ] Monitoring setup
- [ ] Custom domain geconfigureerd
- [ ] Firewall regels ingesteld

Je app draait nu op: `https://medische-inventaris-app.azurewebsites.net`
