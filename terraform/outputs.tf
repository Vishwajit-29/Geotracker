output "instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.geotracker.id
}

output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.geotracker.public_ip
}

output "public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.geotracker.public_dns
}

output "security_group_id" {
  description = "Security Group ID"
  value       = aws_security_group.geotracker_sg.id
}
