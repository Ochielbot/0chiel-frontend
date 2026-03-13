# Ochiel - Thought Space

A dynamic, interactive thought space for exploring ideas, media, and connections with **dual-access architecture**: admin-only private space and public void contributions.

## 🎯 Concept

**Admin Experience**: Full access to mind, matter, and confluence spaces with complete control over content.

**Public Experience**: Anonymous users can contribute thoughts that automatically go to the "void" space - a collective consciousness where public ideas live.

## Modern 2026 Architecture

```
ochiel/
├── frontend/                 # React Native Web app
│   ├── src/
│   ├── public/
│   ├── webpack.config.js
│   └── package.json
├── backend/                  # Node.js API server
│   ├── src/
│   │   ├── routes/          # API endpoints (auth, thoughts, etc.)
│   │   ├── services/        # Business logic
│   │   ├── database/        # Database setup
│   │   └── scripts/         # Utilities
│   ├── data/               # SQLite database
│   └── package.json
├── Dockerfile              # Docker container
├── docker-compose.yml      # Docker orchestration
└── README.md
```

## Features

### 🔐 **Dual-Access System**
- **Public Access**: Can view ALL content (admin + void spaces) but contributions go to void
- **Admin Access**: Full control over all spaces, can view/edit everything
- **Automatic Routing**: Public users' content automatically goes to void space
- **Media Restrictions**: Public users cannot upload images/videos (admin only)
- **Content Moderation**: Comprehensive profanity filter and spam detection

### 🎨 **Dynamic Node System**
- **6 Node Categories**: Fragment, Essay, Note, Media, Collage, Project
- **Pin & Resize**: Nodes can be pinned and resized with database persistence
- **Multi-Space Navigation**: Mind, Matter, Confluence, and Void spaces
- **Real-time Updates**: Changes persist across sessions

### 🎵 **Rich Integrations**
- **Spotify Integration**: Shows currently playing from @0chiel
- **Google Books Integration**: Embed books you're reading
- **Media Support**: YouTube, TikTok, Spotify embeds
- **Collage Nodes**: Combine videos and images in resizable containers

### 🏗️ **Production Ready**
- **Docker Support**: Full containerization with docker-compose
- **Modern Backend**: Node.js with Express, SQLite, security middleware
- **Responsive Design**: Works on web and mobile
- **Health Monitoring**: Built-in health checks and monitoring

## Quick Setup

### 🐳 Docker (Recommended)

```bash
# Clone and setup
git clone <your-repo>
cd ochiel

# Start with Docker
docker-compose up --build

# Access at http://localhost:3001
# Default admin: admin / admin123
```

### 📦 Manual Setup

```bash
# Install everything and set up database
npm run setup

# Start both frontend and backend
npm run dev
```

## Manual Setup

### 1. Frontend Setup
```bash
npm install
```

### 2. Backend Setup
```bash
npm run backend:install
```

### 3. Environment Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with your API keys
```

### 4. Database Setup
```bash
npm run backend:init    # Create tables
npm run backend:seed    # Add sample data
```

### 5. Start Development
```bash
npm run dev            # Both frontend and backend
# OR separately:
npm run backend:dev    # Backend only (port 3001)
npm run start:web      # Frontend only (port 8080)
```

## API Endpoints

### Thoughts/Nodes
- `GET /api/thoughts` - Get all thoughts
- `POST /api/thoughts` - Create new thought
- `PUT /api/thoughts/:id` - Update thought
- `DELETE /api/thoughts/:id` - Delete thought

### Currently Playing/Reading
- `GET /api/currently` - Get active items
- `POST /api/currently` - Update currently data

### Spotify Integration
- `GET /api/spotify/status` - Check Spotify connection
- `GET /api/spotify/currently-playing` - Get current track
- `POST /api/spotify/sync` - Manual sync
- `GET /api/spotify/search?q=query` - Search tracks

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get specific setting
- `POST /api/settings/:key` - Update setting

## Environment Variables

Create `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:8080

# Database
DATABASE_URL=./data/ochiel.db

# Spotify API (get from https://developer.spotify.com/)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_USERNAME=0chiel

# Google Books API (get from Google Cloud Console)
GOOGLE_BOOKS_API_KEY=your_api_key

# Security
JWT_SECRET=your_random_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Node Types

- **Fragment**: Basic thought fragments
- **Essay**: Longer form writing  
- **Marginal**: Quick notes and annotations
- **Media**: Spotify, YouTube, and other embeds
- **Collage**: Combined video and image content
- **Artifact**: Project showcases
- **Riddle**: Interactive puzzles

## Spaces

- **Mind**: Ideas and thoughts (dark theme)
- **Matter**: Physical projects and making (light theme)  
- **Confluence**: Overview of all spaces (dark with yellow accents)
- **Void**: Hidden/private content

## Development

### Tech Stack
- **Frontend**: React Native Web, TypeScript, Reanimated
- **Backend**: Node.js, Express, SQLite
- **APIs**: Spotify Web API, Google Books API
- **Architecture**: Modern ES modules, proper separation of concerns

### Database Schema
- **thoughts**: All nodes/thoughts with metadata
- **currently**: Music, books, learning progress
- **settings**: User preferences and configuration

### Security Features
- Helmet.js for security headers
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention

### Performance
- Database indexing
- Compression middleware
- Efficient queries
- Proper error handling

## Production Deployment

1. **Build frontend**: `npm run build:web`
2. **Set environment**: `NODE_ENV=production`
3. **Use process manager**: PM2 or similar
4. **Database**: Consider PostgreSQL for production
5. **Reverse proxy**: Nginx recommended
6. **SSL**: Let's Encrypt or similar

## Color Scheme

- **Accent Color**: Soft yellow (`#f4e4a6`)
- **Mind Space**: Black background, white text
- **Matter Space**: Off-white background, dark text
- **Confluence**: Dark background with yellow accents  
- **Void**: Very dark, mysterious theme