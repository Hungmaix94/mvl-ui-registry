import os
import shutil
import re

ERP_BASE = '/mnt/D/Work/MVL/erp-repo/web/src'
REG_BASE = '/mnt/D/Work/MVL/mvl-ui-registry/registry/web-app'

EXCLUDE_COMPS = {
    'avatar', 'badge', 'breadcrumb', 'button', 'chip', 'collapsible', 
    'confirm-modal', 'custom-select', 'data-table', 'date-range-picker', 
    'development-in-progress', 'dot', 'dynamic-zone-builder', 'grid', 
    'input', 'modal', 'page-title', 'rich-text', 'select', 'summary-card', 
    'textarea', 'tree-select', 'index.ts', 'badge.stories.tsx', 'button.stories.tsx',
    'collapsible.stories.tsx', 'confirm-modal.stories.tsx', 'custom-select.stories.tsx',
    'data-table.stories.tsx', 'dynamic-zone-builder.stories.tsx', 'input.stories.tsx',
    'modal.stories.tsx', 'rich-text-editor.stories.tsx', 'select.stories.tsx',
    'textarea.stories.tsx', 'rich-text-editor.tsx'
}

def copy_and_transform():
    # Ensure dirs exist
    os.makedirs(os.path.join(REG_BASE, 'ui'), exist_ok=True)
    os.makedirs(os.path.join(REG_BASE, 'icons'), exist_ok=True)
    os.makedirs(os.path.join(REG_BASE, 'hooks'), exist_ok=True)
    os.makedirs(os.path.join(REG_BASE, 'lib'), exist_ok=True)
    os.makedirs(os.path.join(REG_BASE, 'constants'), exist_ok=True)

    # 1. Copy Icons
    print("Copying icons...")
    erp_icons = os.path.join(ERP_BASE, 'assets', 'icons')
    if os.path.exists(erp_icons):
        for item in os.listdir(erp_icons):
            src = os.path.join(erp_icons, item)
            dst = os.path.join(REG_BASE, 'icons', item)
            if os.path.isdir(src):
                if not os.path.exists(dst): shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
                
    # 2. Copy Hooks
    print("Copying hooks...")
    erp_hooks = os.path.join(ERP_BASE, 'hooks')
    if os.path.exists(erp_hooks):
        for item in os.listdir(erp_hooks):
            src = os.path.join(erp_hooks, item)
            dst = os.path.join(REG_BASE, 'hooks', item)
            if os.path.isdir(src):
                if not os.path.exists(dst): shutil.copytree(src, dst)
            else:
                if not os.path.exists(dst): shutil.copy2(src, dst)
                
    # 3. Copy Lib
    print("Copying lib...")
    erp_lib = os.path.join(ERP_BASE, 'lib')
    if os.path.exists(erp_lib):
        for item in os.listdir(erp_lib):
            src = os.path.join(erp_lib, item)
            dst = os.path.join(REG_BASE, 'lib', item)
            if os.path.isdir(src):
                if not os.path.exists(dst): shutil.copytree(src, dst)
            else:
                if not os.path.exists(dst): shutil.copy2(src, dst)
                
    # 3.5 Copy Constants
    print("Copying constants...")
    erp_const = os.path.join(ERP_BASE, 'constants')
    if os.path.exists(erp_const):
        for item in os.listdir(erp_const):
            src = os.path.join(erp_const, item)
            dst = os.path.join(REG_BASE, 'constants', item)
            if os.path.isdir(src):
                if not os.path.exists(dst): shutil.copytree(src, dst)
            else:
                if not os.path.exists(dst): shutil.copy2(src, dst)

    # 4. Copy UI Components
    print("Copying UI components...")
    erp_ui = os.path.join(ERP_BASE, 'components', 'ui')
    reg_ui = os.path.join(REG_BASE, 'ui')
    
    for item in os.listdir(erp_ui):
        base_name = item.split('.')[0]
        if base_name in EXCLUDE_COMPS or item in EXCLUDE_COMPS:
            continue
            
        src = os.path.join(erp_ui, item)
        dst = os.path.join(reg_ui, item)
        
        if os.path.isdir(src):
            if not os.path.exists(dst): shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
            
    # 5. Transform files in registry/web-app/ui, registry/web-app/icons, registry/web-app/hooks
    print("Transforming imports...")
    
    # We will traverse all TS/TSX files in web-app and fix imports
    for root, dirs, files in os.walk(REG_BASE):
        for f in files:
            if not f.endswith(('.ts', '.tsx')):
                continue
                
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8') as file:
                content = file.read()
                
            # Calculate depth relative to REG_BASE
            rel_path = os.path.relpath(root, REG_BASE)
            depth = 0 if rel_path == '.' else len(rel_path.split(os.sep))
            
            # Construct prefix to reach REG_BASE (where ui, icons, hooks, lib are)
            if depth == 0:
                base_prefix = './'
            else:
                base_prefix = '../' * depth
                
            # Replacements
            # @/components/ui -> {base_prefix}ui
            content = re.sub(r'@/components/ui/(\w)', f'{base_prefix}ui/\\1', content)
            # Sometimes they just import from @/components/ui
            content = re.sub(r'@/components/ui([\'"])', f'{base_prefix}ui\\1', content)
            
            # @/assets/icons -> {base_prefix}icons
            content = re.sub(r'@/assets/icons/(\w)', f'{base_prefix}icons/\\1', content)
            content = re.sub(r'@/assets/icons([\'"])', f'{base_prefix}icons\\1', content)
            
            # @/hooks -> {base_prefix}hooks
            content = re.sub(r'@/hooks/(\w)', f'{base_prefix}hooks/\\1', content)
            content = re.sub(r'@/hooks([\'"])', f'{base_prefix}hooks\\1', content)
            
            # @/lib -> {base_prefix}lib
            content = re.sub(r'@/lib/(\w)', f'{base_prefix}lib/\\1', content)
            content = re.sub(r'@/lib([\'"])', f'{base_prefix}lib\\1', content)
            
            # @/constants/table.ts -> we should also copy constants?
            # Actually, let's just do a rough replace for table constants
            content = re.sub(r'@/constants/(\w)', f'{base_prefix}constants/\\1', content)
            
            # Replace style tokens
            content = re.sub(r'#B32B2F', 'action-primary-red-default', content)
            content = re.sub(r'#DE350B', 'data-red-default', content)
            content = re.sub(r'#870B0B', 'action-primary-red-hover', content)
            
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(content)

if __name__ == '__main__':
    copy_and_transform()
    print("Migration complete.")
