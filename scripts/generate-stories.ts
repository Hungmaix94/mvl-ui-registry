import fs from 'fs';
import path from 'path';

const UI_DIR = path.resolve(process.cwd(), 'registry/web-app/ui');

// Walk directory to find all .tsx files
function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (filePath.endsWith('.tsx') && !filePath.endsWith('.test.tsx') && !filePath.endsWith('.stories.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const componentRegex = /export (?:const|function|class) ([A-Z][a-zA-Z0-9_]+)/g;
const exportListRegex = /export\s*{\s*([^}]+)\s*}/g;

function generateStory(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let match;
  const components: string[] = [];

  while ((match = componentRegex.exec(content)) !== null) {
    components.push(match[1]);
  }

  while ((match = exportListRegex.exec(content)) !== null) {
    const exports = match[1].split(',').map(s => s.trim().split(' ')[0]);
    for (const exp of exports) {
      if (exp.match(/^[A-Z][a-zA-Z0-9_]+$/) && !components.includes(exp)) {
        components.push(exp);
      }
    }
  }

  if (components.length === 0) return;

  const mainComponent = components[0];
  const storyFilePath = filePath.replace(/\.tsx$/, '.stories.tsx');

  if (fs.existsSync(storyFilePath)) {
    console.log(`Story already exists: ${storyFilePath}`);
    return;
  }

  const relativePath = path.basename(filePath, '.tsx');
  const dirName = path.basename(path.dirname(filePath));
  const isNested = dirName !== 'ui';
  const groupName = isNested ? `Web App/${dirName}` : `Web App/${mainComponent}`;
  
  const storyContent = `import type { Meta, StoryObj } from '@storybook/react';
import { ${components.join(', ')} } from './${relativePath}';

const meta: Meta<typeof ${mainComponent}> = {
  title: '${groupName}/${mainComponent}',
  component: ${mainComponent},
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ${mainComponent}>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
`;

  fs.writeFileSync(storyFilePath, storyContent);
  console.log(`Generated story: ${storyFilePath}`);
}

const tsxFiles = walk(UI_DIR);
for (const file of tsxFiles) {
  generateStory(file);
}
