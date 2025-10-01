# HorseRace Sepolia 部署脚本
# 使用方法: 先设置环境变量，然后运行此脚本

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "HorseRace - Sepolia 测试网部署脚本" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查必需的环境变量
Write-Host "检查环境变量..." -ForegroundColor Yellow

if (-not $env:MNEMONIC) {
    Write-Host "错误: 未设置 MNEMONIC 环境变量" -ForegroundColor Red
    Write-Host "请使用以下命令设置:" -ForegroundColor Yellow
    Write-Host '  $env:MNEMONIC = "your twelve word mnemonic phrase here"' -ForegroundColor White
    exit 1
}

if (-not $env:SEPOLIA_RPC_URL) {
    Write-Host "错误: 未设置 SEPOLIA_RPC_URL 环境变量" -ForegroundColor Red
    Write-Host "请使用以下命令设置:" -ForegroundColor Yellow
    Write-Host '  $env:SEPOLIA_RPC_URL = "https://your-rpc-endpoint.com"' -ForegroundColor White
    exit 1
}

Write-Host "✓ MNEMONIC: 已设置 (前5个字符: $($env:MNEMONIC.Substring(0, [Math]::Min(5, $env:MNEMONIC.Length)))...)" -ForegroundColor Green
Write-Host "✓ SEPOLIA_RPC_URL: $env:SEPOLIA_RPC_URL" -ForegroundColor Green

if ($env:ETHERSCAN_API_KEY) {
    Write-Host "✓ ETHERSCAN_API_KEY: 已设置 (用于合约验证)" -ForegroundColor Green
} else {
    Write-Host "! ETHERSCAN_API_KEY: 未设置 (部署后将无法自动验证合约)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "开始部署流程" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 编译合约
Write-Host "[1/3] 编译合约..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 合约编译失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 合约编译完成" -ForegroundColor Green
Write-Host ""

# 步骤 2: 部署合约
Write-Host "[2/3] 部署到 Sepolia 测试网..." -ForegroundColor Yellow
npm run deploy:sepolia
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 合约部署失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 合约部署完成" -ForegroundColor Green
Write-Host ""

# 步骤 3: 导出前端配置
Write-Host "[3/3] 导出合约配置到前端..." -ForegroundColor Yellow
npm run export:frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "警告: 导出前端配置失败" -ForegroundColor Yellow
} else {
    Write-Host "✓ 前端配置导出完成" -ForegroundColor Green
}
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "部署完成!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 可选：验证合约
if ($env:ETHERSCAN_API_KEY) {
    Write-Host "是否要验证合约? (Y/N): " -ForegroundColor Yellow -NoNewline
    $verify = Read-Host
    if ($verify -eq "Y" -or $verify -eq "y") {
        Write-Host "验证合约中..." -ForegroundColor Yellow
        npm run verify:sepolia
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ 合约验证完成" -ForegroundColor Green
        } else {
            Write-Host "警告: 合约验证失败，请稍后手动验证" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "部署信息已保存在: backend/deployments/sepolia/" -ForegroundColor Cyan
Write-Host ""

