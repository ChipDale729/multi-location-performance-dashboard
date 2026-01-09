output "app_url" {
  value = "https://${aws_apprunner_service.app.service_url}"
}

output "database_url" {
  value     = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive = true
}
