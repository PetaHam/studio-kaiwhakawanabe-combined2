import os
import json

settings_dir = '.vscode'
settings_file = os.path.join(settings_dir, 'settings.json')

if not os.path.exists(settings_dir):
    os.makedirs(settings_dir)

data = {}
if os.path.exists(settings_file):
    try:
        with open(settings_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except:
        pass

data["python.useEnvironmentsExtension"] = True

with open(settings_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print("Workspace settings configured.")
