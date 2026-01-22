Write-Host "Stopping conflicting processes on ports 8000, 3000, 5173, 6379..."
$ports = @(8000, 3000, 5173, 6379)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pid_to_kill = $conn.OwningProcess
            if ($pid_to_kill -ne 0) {
                Write-Host "Killing process $pid_to_kill on port $port"
                Stop-Process -Id $pid_to_kill -Force -ErrorAction SilentlyContinue
            }
        }
    }
}


Write-Host "Starting Backend (Uvicorn)..."
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd backend; .\.venv\Scripts\Activate.ps1; python -m uvicorn src.main:app --reload"

Write-Host "Starting Frontend (Vite)..."
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Project is starting locally!"
Write-Host "Backend: http://localhost:8000/docs"
Write-Host "Frontend: http://localhost:5173"
