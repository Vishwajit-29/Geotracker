variable "aws_region" {
  description = "AWS region to deploy in"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "m7i-flex.large"
}

variable "ami_id" {
  description = "AMI ID for the EC2 instance (Ubuntu 24.04 in ap-south-1)"
  type        = string
  default     = "ami-0dee22c13ea7a9a67"
}

variable "key_name" {
  description = "Name of the existing AWS key pair for SSH access"
  type        = string
}

variable "instance_name" {
  description = "Name tag for the EC2 instance"
  type        = string
  default     = "geotracker-server"
}
