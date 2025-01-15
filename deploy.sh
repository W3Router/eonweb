#!/bin/bash
set -e

# 从 .env.production 加载环境变量
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# 打印当前工作目录和环境变量
echo "Current working directory: $(pwd)"
echo "Deploying with API_KEY: ${API_KEY}"

# 检查必要文件是否存在
echo "Verifying required files..."
required_files=(
    "app.yaml"
    "server.js"
    "package.json"
    "routes/proxy.js"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Error: Required file $file not found!"
        exit 1
    fi
done

# 完全清理并重建
echo "Performing complete cleanup..."
rm -rf node_modules package-lock.json
rm -rf .gcloud .npm .config .build .deploy
npm cache clean --force

# 清理 Git 未跟踪的文件，但保留必要文件
echo "Cleaning untracked files..."
git clean -fdx -e cloud_sql_proxy -e .env.production -e node_modules

# 从 GitHub 强制同步最新代码
echo "Force pulling latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

# 检查 server.js 内容
echo "Checking server.js content..."
echo "=== server.js content start ==="
cat server.js
echo "=== server.js content end ==="
echo "Line count: $(wc -l < server.js)"
echo "Searching for proxyModule reference..."
grep -n "proxyModule" server.js || echo "No proxyModule reference found"

# 安装依赖
echo "Installing dependencies..."
npm install
npm install --save-dev sequelize-cli

# 清理 GCP 缓存和构建文件
echo "Cleaning up GCP cache..."
rm -rf .gcloud .build .deploy
gcloud config set disable_file_logging true
gcloud config set pass_credentials_to_gsutil false

# 获取当前版本时间戳
TIMESTAMP=$(date +%Y%m%dt%H%M%S)
echo "Current serving version: $TIMESTAMP"

# 在部署前验证文件
echo "=== Verifying local files ==="
echo "Local server.js content:"
cat server.js
echo "Local server.js MD5:"
md5sum server.js

# 强制重新部署，不使用缓存
echo "Deploying new version..."
gcloud app deploy --quiet --version=$TIMESTAMP --promote --no-cache

# 确保新版本接管所有流量并完全迁移
echo "Setting traffic to new version..."
gcloud app services set-traffic default --splits=$TIMESTAMP=1 --migrate

# 删除所有旧版本
echo "Cleaning up old versions..."
OLD_VERSIONS=$(gcloud app versions list --sort-by=~version.id --filter="NOT version.id=$TIMESTAMP" --format="value(version.id)")
if [ ! -z "$OLD_VERSIONS" ]; then
    echo "Deleting old versions: $OLD_VERSIONS"
    gcloud app versions delete $OLD_VERSIONS --quiet
fi

# 部署后检查文件
echo "=== Checking deployed files ==="
gcloud app ssh --command="cat /workspace/server.js" || true
gcloud app ssh --command="md5sum /workspace/server.js" || true

echo "Deployment completed successfully"
