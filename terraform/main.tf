terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "aws_db_instance" "main" {
  identifier = "dashboard-db"
  
  engine         = "postgres"
  engine_version = "14"
  instance_class = "db.t3.micro"
  
  allocated_storage = 20
  storage_type      = "gp2"
  
  db_name  = "dashboard"
  username = "postgres"
  password = random_password.db_password.result
  
  publicly_accessible = true
  skip_final_snapshot = true
}

