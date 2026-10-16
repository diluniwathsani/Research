# Research System Project

This folder contains the complete, self-contained source code for the Research System, including:
1. **Express Backend** (`backend/server.js`) - Running on Port `3000`
2. **Flask API** (`backend/api.py`) - Running on Port `5001`
3. **Flask ML Service** (`ml-service/app.py`) - Running on Port `5002`
4. **React Frontend** (`frontend/`) - Running on Port `5173`

---

## 📋 Prerequisites for New Laptop

Before running on another laptop, make sure the following software is installed:
1. **Node.js** (v18 or higher) — [Download Node.js](https://nodejs.org/)
2. **Python** (v3.9 or higher) — [Download Python](https://www.python.org/)

---

## 🚀 Quick Setup Instructions

### Step 1: Install Dependencies

Open a terminal inside the project directory and run:

```bash
# 1. Install root dependencies
npm install

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Install Python ML service dependencies
pip install -r ml-service/requirements.txt
```

---

## ⚡ How to Run the Entire System

### Option A: Using Node (Cross-Platform / Recommended)
Run the following command in the project root folder:
```bash
npm dev
# OR
node run_all.js
```

### Option B: Windows Batch File
Double click `run_all.bat` or run:
```cmd
run_all.bat
```

---

## 🌐 Service Endpoints

- **Frontend Application**: `http://localhost:5173`
- **Express Backend API**: `http://localhost:3000`
- **Flask Python API**: `http://localhost:5001`
- **Flask ML Service**: `http://localhost:5002`
