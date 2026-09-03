import os
import re

REG_BASE = '/mnt/D/Work/MVL/mvl-ui-registry/registry/web-app/ui'

def get_component_name(filename_or_dirname):
    # Convert kebab-case or snake_case to PascalCase
    parts = re.split(r'[-_]', filename_or_dirname)
    return ''.join(p.capitalize() for p in parts)

def generate_story(component_name, file_path, story_path, is_folder=False):
    # Determine the import path
    if is_folder:
        import_path = f'./{os.path.basename(file_path)}'
    else:
        import_path = f'./{os.path.basename(file_path).replace(".tsx", "")}'
        
    template = f"""import type {{ Meta, StoryObj }} from '@storybook/react';
import {{ {component_name} }} from '{import_path}';

const meta = {{
  title: 'web-app/ui/{component_name}',
  component: {component_name} as any,
  tags: ['autodocs'],
  argTypes: {{}},
}} satisfies Meta<typeof {component_name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {{
  args: {{}},
}};
"""
    with open(story_path, 'w', encoding='utf-8') as f:
        f.write(template)

def main():
    items = os.listdir(REG_BASE)
    for item in items:
        full_path = os.path.join(REG_BASE, item)
        
        # Skip if it's already a story file
        if item.endswith('.stories.tsx') or item.endswith('.test.tsx') or item == 'index.ts':
            continue
            
        # For a single file like dialog.tsx
        if os.path.isfile(full_path) and item.endswith('.tsx'):
            base_name = item.replace('.tsx', '')
            story_file = os.path.join(REG_BASE, f"{base_name}.stories.tsx")
            if not os.path.exists(story_file):
                comp_name = get_component_name(base_name)
                print(f"Generating story for {comp_name} ({story_file})")
                generate_story(comp_name, full_path, story_file, is_folder=False)
                
        # For a folder like checkbox/
        elif os.path.isdir(full_path):
            base_name = item
            story_file = os.path.join(REG_BASE, f"{base_name}.stories.tsx")
            if not os.path.exists(story_file):
                comp_name = get_component_name(base_name)
                print(f"Generating story for {comp_name} ({story_file})")
                generate_story(comp_name, full_path, story_file, is_folder=True)

if __name__ == '__main__':
    main()
