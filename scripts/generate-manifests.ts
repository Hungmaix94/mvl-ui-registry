import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const REGISTRY_DIR = path.join(ROOT_DIR, 'registry');

const PUBLIC_BLOCKS_DIR = path.join(REGISTRY_DIR, 'web-public', 'blocks');
const APP_UI_DIR = path.join(REGISTRY_DIR, 'web-app', 'ui');

function getDependencies(filePaths: string[]) {
  const deps = new Set<string>();
  const radixDeps = new Set<string>();
  
  for (const file of filePaths) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extract imports
    const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1];
      if (imp.startsWith('@radix-ui/')) {
        radixDeps.add(imp);
      } else if (['clsx', 'tailwind-merge', 'lucide-react', 'date-fns', 'react-day-picker', 'zod', 'react-hook-form', '@hookform/resolvers'].includes(imp)) {
        deps.add(imp);
      }
    }
  }
  return { deps: Array.from(deps), radixDeps: Array.from(radixDeps) };
}

function processDirectory(dir: string, type: string) {
  const items: any[] = [];
  if (!fs.existsSync(dir)) return items;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    let name = entry.name;
    let files: string[] = [];
    
    if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      name = entry.name.replace('.tsx', '');
      files.push(path.join(dir, entry.name));
    } else if (entry.isDirectory()) {
      const subFiles = fs.readdirSync(path.join(dir, entry.name)).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
      subFiles.forEach(f => files.push(path.join(dir, entry.name, f)));
    } else {
      continue;
    }

    if (files.length === 0) continue;

    const { deps, radixDeps } = getDependencies(files);
    const registryDependencies = radixDeps.map(dep => dep.replace('@radix-ui/react-', ''));

    items.push({
      name,
      type: `registry:${type}`,
      title: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '),
      description: `Auto-generated ${type} component for ${name}`,
      dependencies: deps,
      registryDependencies,
      files: files.map(f => ({
        path: path.relative(ROOT_DIR, f).replace(/\\/g, '/'),
        type: `registry:${type}`
      }))
    });
  }

  return items;
}

function generate() {
  console.log('Scanning web-public...');
  const publicItems = processDirectory(PUBLIC_BLOCKS_DIR, 'block');
  
  const publicManifest = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "web-public",
    items: publicItems
  };
  fs.writeFileSync(path.join(ROOT_DIR, 'registry-web-public.json'), JSON.stringify(publicManifest, null, 2));
  console.log(`Generated registry-web-public.json with ${publicItems.length} items`);

  console.log('Scanning web-app...');
  const appItems = processDirectory(APP_UI_DIR, 'ui');
  
  const appManifest = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "web-app",
    items: appItems
  };
  fs.writeFileSync(path.join(ROOT_DIR, 'registry-web-app.json'), JSON.stringify(appManifest, null, 2));
  console.log(`Generated registry-web-app.json with ${appItems.length} items`);
}

generate();
