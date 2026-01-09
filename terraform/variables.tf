variable "github_repo" {
  description = "Your GitHub repo (e.g., username/repo)"
  type        = string
}

variable "nextauth_secret" {
  description = "Run: openssl rand -base64 32"
  type        = string
  sensitive   = true
}
