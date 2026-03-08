#!/bin/bash
set -e

apt-get update -y

apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu

apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

apt-get install -y certbot python3-certbot-nginx

mkdir -p /home/ubuntu/geotracker
chown ubuntu:ubuntu /home/ubuntu/geotracker

echo "GeoTracker EC2 Bootstrap Complete - Docker, Compose, Nginx installed."
