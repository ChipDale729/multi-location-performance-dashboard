resource "aws_apprunner_service" "app" {
  service_name = "dashboard"

  source_configuration {
    auto_deployments_enabled = true
    
    code_repository {
      repository_url = "https://github.com/${var.github_repo}"
      
      source_code_version {
        type  = "BRANCH"
        value = "main"
      }
      
      code_configuration {
        configuration_source = "API"
        
        code_configuration_values {
          runtime       = "NODEJS_18"
          build_command = "npm install && npx prisma generate && npm run build"
          start_command = "npm start"
          port          = "3000"
          
          runtime_environment_variables = {
            NODE_ENV        = "production"
            DATABASE_URL    = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
            NEXTAUTH_SECRET = var.nextauth_secret
          }
        }
      }
    }
  }
}
