import json

with open('rds_data.json', 'r') as f:
    data = json.load(f)

for row in data:
    if "created_by" in row.get("fields", {}):
        row["fields"]["created_by"] = None
    if "updated_by" in row.get("fields", {}):
        row["fields"]["updated_by"] = None

with open('rds_data_fixed.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Data fixed!")
