# tinytown
An AI driven game

## 🚀 **Starting the Service**
This project includes **Bash** (`bin/start.sh`) and **PowerShell** (`bin/start.ps1`) scripts to start the service in **Debug Mode** or **Release Mode**.

### **1️⃣ Prerequisites**
Before running the service, ensure you have:
- **Node.js (16+)** installed → [Download](https://nodejs.org/)
- **Dependencies installed** → Run:
  ```sh
  npm install
  ```

### **2️⃣ Running the Service**
You can start the service in **Debug Mode** (for development) or **Release Mode** (for production).

### **🔧 Debug Mode (Development)**
In **Debug Mode**, the service runs directly using **`ts-node`** (without compilation).
- **Bash (Linux/macOS)**
  ```sh
  bin/start.sh
  ```
- **PowerShell (Windows)**
  ```powershell
  bin\start.ps1
  ```
- **Using npm**
  ```sh
  npm run debug
  ```

### **🚀 Release Mode (Production)**
In **Release Mode**, the service is first **compiled to JavaScript** and then executed.
- **Bash (Linux/macOS)**
  ```sh
  bin/start.sh release
  ```
- **PowerShell (Windows)**
  ```powershell
  bin\start.ps1 release
  ```
- **Using npm**
  ```sh
  npm run release
  ```

### **3️⃣ Additional Steps**
#### 🔹 **Give Execution Permissions (Linux/macOS)**
Before running the Bash script, make it executable:
```sh
chmod +x bin/start.sh
```

#### 🔹 **Allow PowerShell Script Execution (Windows)**
If you get an execution policy error, run this **once** in PowerShell:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 🔹 **Script Execution from Any Directory**
The `bin/start.sh` and `bin/start.ps1` scripts are designed to be executed from **any directory**.
- Running from the **project root**:
  ```sh
  bin/start.sh
  ```
  ```powershell
  bin\start.ps1
  ```
- Running from inside `bin/`:
  ```sh
  ./start.sh
  ```
  ```powershell
  .\start.ps1
  ```

#### 🔹 **Environment Variables**
Ensure your **`.env`** file is properly configured with:
```
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

### **4️⃣ Alternative: Running the Server Manually**
If you prefer, you can manually run the service without the scripts:
```sh
# Debug Mode
npx ts-node src/server.ts

# Release Mode
npm run build
node dist/server.js
```

