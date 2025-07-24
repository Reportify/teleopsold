# Teleops Developer Setup Guide

## Quick Start

Get your development environment running in under 30 minutes.

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Git
- Docker (optional but recommended)

### Clone and Setup

```bash
# Clone repository
git clone https://github.com/yourorg/teleops.git
cd teleops

# Backend setup
cd VervelandProject
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../vltwebapp
npm install

# Database setup
createdb teleops_dev
python manage.py migrate
python manage.py loaddata fixtures/initial_data.json
```

### Environment Configuration

```bash
# Backend (.env)
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost/teleops_dev
REDIS_URL=redis://localhost:6379
AZURE_ACCOUNT_NAME=your-storage-account
AZURE_ACCOUNT_KEY=your-storage-key

# Frontend (.env)
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WEBSOCKET_URL=ws://localhost:8000/ws
```

### Running Development Servers

```bash
# Terminal 1: Backend
cd VervelandProject
python manage.py runserver

# Terminal 2: Frontend
cd vltwebapp
npm start

# Terminal 3: Redis (if not using Docker)
redis-server

# Access at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/v1
# Admin Panel: http://localhost:8000/admin
```

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/warehouse-management
git push -u origin feature/warehouse-management

# Regular commits
git add .
git commit -m "feat: add warehouse receiving API endpoint"

# Push changes
git push origin feature/warehouse-management

# Create Pull Request via GitHub/GitLab
```

### Code Quality Standards

```bash
# Python code formatting
black .
isort .
flake8 .

# JavaScript/TypeScript formatting
npm run lint
npm run format

# Run tests
python manage.py test
npm test
```

### Database Management

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset database (development only)
python manage.py flush
python manage.py migrate
python manage.py loaddata fixtures/initial_data.json
```

---

**For complete setup instructions, see the full Developer Guide.**
