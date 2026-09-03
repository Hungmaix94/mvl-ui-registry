const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '../registry/web-app/ui');

if (!fs.existsSync(UI_DIR)) {
  console.error(`Directory not found: ${UI_DIR}`);
  process.exit(1);
}

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, '/', file));
      }
    }
  });
  return arrayOfFiles;
};

const replacements = [
  { regex: /font-sans/g, replace: 'font-inter' },
  { regex: /text-primary-foreground/g, replace: 'text-content-light-1' },
  { regex: /text-primary(?![-\w])/g, replace: 'text-action-primary-red-default' },
  { regex: /text-destructive-foreground/g, replace: 'text-content-light-1' },
  { regex: /text-destructive(?![-\w])/g, replace: 'text-data-red-default' },
  { regex: /text-secondary-foreground/g, replace: 'text-content-dark-1' },
  { regex: /text-secondary(?![-\w])/g, replace: 'text-content-dark-1' },
  { regex: /text-accent-foreground/g, replace: 'text-content-dark-1' },
  { regex: /text-accent(?![-\w])/g, replace: 'text-data-blue-default' },
  
  { regex: /bg-primary(?![-\w])/g, replace: 'bg-action-primary-red-default' },
  { regex: /hover:bg-primary\/90/g, replace: 'hover:bg-action-primary-red-hover' },
  { regex: /bg-destructive(?![-\w])/g, replace: 'bg-data-red-default' },
  { regex: /hover:bg-destructive\/90/g, replace: 'hover:bg-data-red-hover' },
  { regex: /bg-secondary(?![-\w])/g, replace: 'bg-action-secondary-grey-default' },
  { regex: /hover:bg-secondary\/80/g, replace: 'hover:bg-action-secondary-grey-hover' },
  { regex: /bg-accent(?![-\w])/g, replace: 'bg-data-light-grey-default' },
  { regex: /hover:bg-accent(?![-\w])/g, replace: 'hover:bg-data-light-grey-hover' },
  
  { regex: /bg-slate-900/g, replace: 'bg-content-dark-1' },
  { regex: /text-slate-50/g, replace: 'text-content-light-1' },
  { regex: /border-input/g, replace: 'border-slate-200' },
  { regex: /border-border/g, replace: 'border-slate-200' },

  { regex: /rounded-sm|rounded-md|rounded-lg|rounded-xl|rounded-2xl|rounded-3xl/g, replace: 'rounded' },

  { regex: /focus-visible:ring-ring|focus-visible:ring-2|focus:ring-2|focus:ring-ring/g, replace: 'focus:outline-none focus:ring-0' },
  { regex: /focus-visible:ring-offset-2|focus:ring-offset-2/g, replace: 'focus:ring-offset-0' },

  { regex: /bg-\[#B32B2F\]/g, replace: 'bg-action-primary-red-default' },
  { regex: /hover:bg-\[#870B0B\]/g, replace: 'hover:bg-action-primary-red-hover' },
  { regex: /text-\[#B32B2F\]/g, replace: 'text-action-primary-red-default' },

  { regex: /@peduarte/g, replace: 'Nguyễn Văn A' },
  { regex: /@radix-ui(?!\/)/g, replace: 'Hệ thống ERP' },
  { regex: /john\.doe@example\.com/gi, replace: 'nguyenvana@maivietland.vn' },
  { regex: /Acme Inc/gi, replace: 'Mai Việt Land' },
];

const files = getAllFiles(UI_DIR);
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  replacements.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Updated: ${path.basename(file)}`);
  }
});

console.log(`\nSuccessfully updated ${modifiedCount} files to use ERP styling.`);
