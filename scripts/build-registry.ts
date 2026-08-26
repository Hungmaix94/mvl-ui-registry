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
const REGISTRY_PATH = path.join(ROOT_DIR, 'registry.json');
const PUBLIC_R_DIR = path.join(ROOT_DIR, 'public', 'r');

async function buildRegistry() {
  console.log('🚀 Đang biên dịch MVL Shadcn Custom Registry...');

  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ Không tìm thấy registry.json');
    process.exit(1);
  }

  if (!fs.existsSync(PUBLIC_R_DIR)) {
    fs.mkdirSync(PUBLIC_R_DIR, { recursive: true });
  }

  const manifestRaw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
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

    const outFilePath = path.join(PUBLIC_R_DIR, `${item.name}.json`);
    fs.writeFileSync(outFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(` ✅ Đã xuất component JSON: public/r/${item.name}.json`);

    indexItems.push({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
    });
  }

  // Xuất file index.json
  const indexPayload = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: manifest.name,
    items: indexItems,
  };
  fs.writeFileSync(path.join(PUBLIC_R_DIR, 'index.json'), JSON.stringify(indexPayload, null, 2), 'utf-8');
  console.log(' ✨ Đã xuất registry index: public/r/index.json');
  console.log(`🎉 Hoàn tất biên dịch ${manifest.items.length} components trong Registry!`);
}

buildRegistry().catch((err) => {
  console.error('❌ Lỗi khi biên dịch Registry:', err);
  process.exit(1);
});
