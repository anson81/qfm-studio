#!/usr/bin/env python3
"""
QFM Studio Deploy Script
Usage: python deploy_qfm_studio.py
Deploys the built dist/ folder to GitHub Pages at anson81.github.io/qfm-studio/
"""
import os, subprocess, urllib.request, json

os.chdir('/home/anson/qfm-studio/apps/web')

# Step 1: Build
print("Building...")
r = subprocess.run(['npm','run','build'], capture_output=True, text=True)
if r.returncode != 0:
    print("Build failed:")
    print(r.stderr[-500:])
    exit(1)
print("Build OK")

# Step 2: Prepare Pages branch
workdir = "/tmp/qfm-studio-pages-deploy"
os.system(f"rm -rf {workdir} && mkdir -p {workdir}")
os.system(f"cp -r /home/anson/qfm-studio/apps/web/dist/* {workdir}/")
os.chdir(workdir)
os.system("git init && git config user.email 'qfm@studio.ai' && git config user.name 'QFM Studio' 2>&1")
os.system("git add -A && git commit -m 'Deploy' 2>&1")

with open(os.path.expanduser('~/.qfm_gh_tmp')) as f:
    tok = f.read().strip()

os.system(f"git remote add origin https://{tok}@github.com/anson81/qfm-studio.git 2>&1 || true")
os.system("git branch -m gh-pages")
r = subprocess.run(['git','push','-u','origin','gh-pages','-f'], capture_output=True, text=True)
print(r.stdout)
print(r.stderr)

if r.returncode == 0:
    print("\n=== DEPLOYED ===")
    print("https://anson81.github.io/qfm-studio/")
else:
    print("Deploy failed")
