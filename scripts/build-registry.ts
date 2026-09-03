import fs from 'fs';
import path from 'path';

interface RegistryFile {
  path: string;
  type: string;
  target?: string;
}

interface RegistryItem {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
}

interface RegistryManifest {
  name: string;
  items: RegistryItem[];
}

const ROOT_DIR = path.resolve(process.cwd());

const REGISTRIES = [
  { file: 'registry-web-public.json', outDir: 'public/web-public/r' },
  { file: 'registry-web-app.json', outDir: 'public/web-app/r' }
];

async function buildRegistry() {
  console.log('🚀 Đang biên dịch MVL Shadcn Custom Registry...');

  for (const registry of REGISTRIES) {
    const registryPath = path.join(ROOT_DIR, registry.file);
    const publicRDir = path.join(ROOT_DIR, registry.outDir);

    if (!fs.existsSync(registryPath)) {
      console.warn(`⚠️ Không tìm thấy ${registry.file}, bỏ qua...`);
      continue;
    }

    if (!fs.existsSync(publicRDir)) {
      fs.mkdirSync(publicRDir, { recursive: true });
    }

    const manifestRaw = fs.readFileSync(registryPath, 'utf-8');
    const manifest: RegistryManifest = JSON.parse(manifestRaw);
    const indexItems: any[] = [];

    for (const item of manifest.items) {
      const compiledFiles: Array<{ path: string; content: string; type: string; target?: string }> = [];

      for (const file of item.files) {
        const filePath = path.join(ROOT_DIR, file.path);
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️ File không tồn tại: ${file.path}`);
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        compiledFiles.push({
          path: file.path,
          content,
          type: file.type,
          target: file.target,
        });
      }

      const payload = {
        $schema: 'https://ui.shadcn.com/schema/registry-item.json',
        name: item.name,
        type: item.type,
        title: item.title,
        description: item.description,
        dependencies: item.dependencies || [],
        devDependencies: item.devDependencies || [],
        registryDependencies: item.registryDependencies || [],
        files: compiledFiles,
      };

      const outFilePath = path.join(publicRDir, `${item.name}.json`);
      fs.writeFileSync(outFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      
      indexItems.push({
        name: item.name,
        type: item.type,
        title: item.title,
        description: item.description,
      });
    }

    const indexPayload = {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: manifest.name,
      items: indexItems,
    };
    fs.writeFileSync(path.join(publicRDir, 'index.json'), JSON.stringify(indexPayload, null, 2), 'utf-8');
    console.log(` ✨ Đã xuất registry index: ${registry.outDir}/index.json`);
    console.log(`🎉 Hoàn tất biên dịch ${manifest.items.length} components cho ${manifest.name}!`);
  }
}

buildRegistry().catch((err) => {
  console.error('❌ Lỗi khi biên dịch Registry:', err);
  process.exit(1);
});
