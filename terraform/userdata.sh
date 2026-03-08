#!/bin/bash
set -e

yum update -y

yum install docker -y
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

yum install nginx -y
systemctl start nginx
systemctl enable nginx

yum install certbot python3-certbot-nginx -y

mkdir -p /home/ec2-user/geotracker
chown ec2-user:ec2-user /home/ec2-user/geotracker

echo "GeoTracker EC2 Bootstrap Complete - Docker, Compose, Nginx installed."
