# AWS deployment

The site is served at https://mapofnod.com from a private S3 bucket (`mapofnod-frontend`) through CloudFront.
Everything is defined in `mapofnod.yaml`, the CloudFormation stack `mapofnod` in us-east-1, account
402673111584. **Change AWS resources only by editing the template and running `just infra`, never in the
console.** Otherwise the stack and reality drift apart.

What the stack creates:
- an ACM certificate for `mapofnod.com` and `www.mapofnod.com`, validated through the Route 53 zone
- the private bucket, readable only by the distribution through Origin Access Control. The bucket is retained if
  the stack is deleted.
- a CloudFront Function that redirects `www` to the apex and serves `index.html` for directory URLs (`/gm/`)
- the distribution, with Route 53 alias records for the apex and `www`
- an IAM group `mapofnod-deployers`, allowed only to upload to the bucket and invalidate the distribution

The justfile uses two AWS CLI profiles:
- `power-user` (admin) for `just infra`
- `mapofnod-deploy` for `just deploy`

## One-time setup

1. Create the stack. The first run takes about 5–15 minutes, mostly waiting for the certificate and the
   CloudFront rollout.
   ```
   just infra
   ```
2. Create the deployer user and its CLI profile. Keys are made by hand so they never pass through
   CloudFormation.
   ```
   aws iam create-user --user-name mapofnod-deployer --profile power-user
   aws iam add-user-to-group --user-name mapofnod-deployer --group-name mapofnod-deployers --profile power-user
   aws iam create-access-key --user-name mapofnod-deployer --profile power-user
   aws configure --profile mapofnod-deploy    # paste the key pair; region us-east-1
   ```
3. Deploy the site.
   ```
   just deploy
   ```

## Everyday use

- `just deploy`:
  - builds the site
  - syncs `build/` to the bucket, removing files that no longer exist locally, with `Cache-Control: no-cache`
    so browsers revalidate
  - invalidates `/*` on the distribution, which counts as one of the 1,000 free invalidation paths a month
- `just infra`: after editing `mapofnod.yaml`, applies the changes. It does nothing if nothing changed.
