# Docker Setup Guide

Questo progetto può essere eseguito usando Docker Compose per avviare sia il database MongoDB che l'applicazione Node.js.

## Prerequisiti

- Docker installato
- Docker Compose installato

## Configurazione

1. Crea un file `.env` nella root del progetto (opzionale, i valori di default funzioneranno):

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/sarasota_automotive
JWT_SECRET=your-secret-key-change-this-in-production
```

## Avvio

Per avviare tutti i servizi (MongoDB e applicazione):

```bash
docker-compose up -d
```

Per vedere i log:

```bash
docker-compose logs -f
```

Per vedere solo i log dell'app:

```bash
docker-compose logs -f app
```

Per vedere solo i log di MongoDB:

```bash
docker-compose logs -f mongodb
```

## Inizializzazione Admin

Dopo il primo avvio, inizializza l'utente admin:

```bash
docker-compose exec app node init-admin.js
```

## Accesso

- Applicazione: http://localhost:3000
- MongoDB: localhost:27017

## Comandi Utili

### Fermare i servizi

```bash
docker-compose down
```

### Fermare e rimuovere i volumi (ATTENZIONE: cancella i dati del database)

```bash
docker-compose down -v
```

### Ricostruire l'immagine dell'app dopo modifiche al codice

```bash
docker-compose build app
docker-compose up -d
```

### Eseguire comandi nel container dell'app

```bash
docker-compose exec app <comando>
```

### Eseguire comandi nel container MongoDB

```bash
docker-compose exec mongodb mongosh sarasota_automotive
```

## Note

- I dati di MongoDB sono persistenti in un volume Docker chiamato `mongodb_data`
- Le immagini caricate sono salvate nella cartella `public/uploads` che è montata come volume
- I logi e le immagini sono preservati anche quando i container vengono fermati


