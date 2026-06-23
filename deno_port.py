import os
import shutil
import re

SOURCE_LIB = "src/lib"
TARGET_SHARED = "supabase/functions/_shared"

def copy_and_patch(src, dest_root):
    if os.path.exists(dest_root):
        shutil.rmtree(dest_root)
    
    os.makedirs(dest_root, exist_ok=True)
    
    folders_to_copy = [
        "shared",
        "i18n",
        "server/challenge",
        "server/scoring",
        "server/sessions",
        "server/errors.ts",
        "server/db/schema.ts"
    ]
    
    for f_rel in folders_to_copy:
        f_src = os.path.join(SOURCE_LIB, f_rel)
        f_dst = os.path.join(dest_root, f_rel)
        
        if os.path.isdir(f_src):
            shutil.copytree(f_src, f_dst)
        elif os.path.isfile(f_src):
            os.makedirs(os.path.dirname(f_dst), exist_ok=True)
            shutil.copy2(f_src, f_dst)

    for root, dirs, files in os.walk(dest_root):
        for file in files:
            if file.endswith(".ts"):
                path = os.path.join(root, file)
                patch_file(path, dest_root)

def patch_file(filepath, dest_root):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    rel_path = os.path.relpath(filepath, dest_root)
    depth = len(rel_path.split(os.sep)) - 1
    up = "../" * depth if depth > 0 else "./"
    
    def replace_lib(match):
        path = match.group(2) # e.g. i18n
        orig_src_path = os.path.join(SOURCE_LIB, path)
        
        # If it points to a directory, it actually imports index.ts
        if os.path.isdir(orig_src_path):
            path = path + "/index.ts"
        elif not path.endswith('.ts'):
            path += '.ts'
            
        new_path = up + path
        return f"{match.group(1)}{new_path}{match.group(3)}"
        
    content = re.sub(r'(from\s+[\'"])\$lib/(.*?)([\'"])', replace_lib, content)
    
    def replace_rel(match):
        path = match.group(2)
        
        # Determine actual file path being referenced
        dir_of_current_file = os.path.dirname(filepath)
        referenced_file = os.path.normpath(os.path.join(dir_of_current_file, path))
        
        if os.path.isdir(referenced_file):
            path = path + "/index.ts"
        elif not path.endswith('.ts'):
            path += '.ts'
            
        return f"{match.group(1)}{path}{match.group(3)}"
        
    content = re.sub(r'(from\s+[\'"])(\.[^\'"]*)([\'"])', replace_rel, content)
    
    content = content.replace("'@supabase/supabase-js'", "'npm:@supabase/supabase-js'")
    content = content.replace('"@supabase/supabase-js"', '"npm:@supabase/supabase-js"')

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

copy_and_patch(SOURCE_LIB, TARGET_SHARED)
print("Deno porting completed successfully!")
