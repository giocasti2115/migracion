import subprocess, os, base64, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Generate AUTH_SECRET
secret = base64.b64encode(os.urandom(32)).decode()

# Generate RSA keys
subprocess.run(['openssl','genrsa','-out','/tmp/ziriuz_priv.pem','2048'], capture_output=True)
subprocess.run(['openssl','rsa','-in','/tmp/ziriuz_priv.pem','-pubout','-out','/tmp/ziriuz_pub.pem'], capture_output=True)

priv = open('/tmp/ziriuz_priv.pem').read().replace('\n','\\n')
pub  = open('/tmp/ziriuz_pub.pem').read().replace('\n','\\n')

env = (
    "# Generado automaticamente — desarrollo local\n"
    f"DATABASE_URL=mysql://ziriuz:ziriuz_dev@localhost:3307/ziriuz\n"
    f"AUTH_SECRET={secret}\n"
    f"AUTH_URL=http://localhost:3001\n"
    f"AUTH_PRIVATE_KEY={priv}\n"
    f"AUTH_PUBLIC_KEY={pub}\n"
    f"REDIS_URL=redis://localhost:6380\n"
    f"SMTP_HOST=localhost\n"
    f"SMTP_PORT=1025\n"
    f"SMTP_USER=\n"
    f"SMTP_PASS=\n"
    f"SMTP_FROM=Ziriuz Local <noreply@ziriuz.local>\n"
    f"NEXT_PUBLIC_APP_URL=http://localhost:3001\n"
    f"APP_NAME=Ziriuz\n"
    f"NODE_ENV=development\n"
)

with open('.env.local','w') as f:
    f.write(env)

print('.env.local creado OK — AUTH_SECRET length:', len(secret))
