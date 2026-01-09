# Deploy to AWS

Automated: creates database + deploys app from GitHub.

## Steps

1. **Create `terraform.tfvars`:**
   ```hcl
   github_repo     = "yourname/yourrepo"
   nextauth_secret = "paste-output-of-openssl-rand-base64-32"
   ```

2. **Deploy:**
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

3. **Update NEXTAUTH_URL:**
   ```bash
   # Get app URL
   terraform output app_url
   
   # AWS Console → App Runner → dashboard → Configuration
   # Add: NEXTAUTH_URL = <your app url>
   # Click Deploy
   ```

4. **Run migrations:**
   ```bash
   export DATABASE_URL=$(terraform output -raw database_url)
   npx prisma migrate deploy
   ```

5. **Seed data:**
   ```bash
   curl -X POST $(terraform output -raw app_url)/api/seed/run
   ```

6. **Login:** `admin@org.com` / `password`

**Logs:** CloudWatch  
**Delete:** `terraform destroy`
