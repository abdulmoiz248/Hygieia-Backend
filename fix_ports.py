import os

target_dir = r'c:\Users\Admin\Desktop\Hygieia-Backend'

replacements = {
    '4002': "process.env.AUTH_MS_PORT ? parseInt(process.env.AUTH_MS_PORT) : 4002",
    '4003': "process.env.LAB_MS_PORT ? parseInt(process.env.LAB_MS_PORT) : 4003",
    '4005': "process.env.FITNESS_MS_PORT ? parseInt(process.env.FITNESS_MS_PORT) : 4005",
    '4006': "process.env.APPOINTMENTS_MS_PORT ? parseInt(process.env.APPOINTMENTS_MS_PORT) : 4006",
    '4009': "process.env.SCHEDULER_PORT ? parseInt(process.env.SCHEDULER_PORT) : 4009",
    '4011': "process.env.ADMIN_MS_PORT ? parseInt(process.env.ADMIN_MS_PORT) : 4011",
}

for root, _, files in os.walk(target_dir):
    if 'node_modules' in root or '.venv' in root or '.git' in root or 'dist' in root:
        continue
    for f in files:
        if f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            changed = False
            for port, port_repl in replacements.items():
                target1 = f"port: {port},"
                target2 = f"port: {port}"
                if target1 in content:
                    content = content.replace(target1, f"port: {port_repl},")
                    changed = True
                elif target2 in content and "import" not in content.split(target2)[0][-10:]:
                    content = content.replace(target2, f"port: {port_repl}")
                    changed = True

            if changed:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f'Updated {path}')
