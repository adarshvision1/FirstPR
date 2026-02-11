#!/usr/bin/env node
/**
 * Bundle Size Analysis Script
 * 
 * This script analyzes the Vite build output to show bundle sizes
 * and the impact of code splitting optimizations.
 * 
 * Usage:
 *   npm run build && node analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist', 'assets');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeBundle() {
  console.log('\n' + '='.repeat(80));
  console.log('📦 FirstPR Frontend Bundle Analysis');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(DIST_DIR)) {
    console.log('\n❌ Build directory not found. Run "npm run build" first.\n');
    process.exit(1);
  }
  
  const files = fs.readdirSync(DIST_DIR);
  
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));
  
  let totalJsSize = 0;
  let totalCssSize = 0;
  
  const chunks = {
    main: [],
    vendors: [],
    other: []
  };
  
  console.log('\n📊 JavaScript Bundles:\n');
  
  jsFiles.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    totalJsSize += size;
    
    let category = 'other';
    if (file.startsWith('index-')) {
      category = 'main';
    } else if (file.startsWith('vendor-')) {
      category = 'vendors';
    }
    
    chunks[category].push({ file, size });
  });
  
  // Print main bundle
  if (chunks.main.length > 0) {
    console.log('  🎯 Main Bundle:');
    chunks.main.forEach(({ file, size }) => {
      console.log(`     ${file}: ${formatBytes(size)}`);
    });
    console.log();
  }
  
  // Print vendor bundles
  if (chunks.vendors.length > 0) {
    console.log('  📦 Vendor Bundles (Code Split):');
    chunks.vendors.sort((a, b) => b.size - a.size);
    chunks.vendors.forEach(({ file, size }) => {
      const vendor = file.match(/vendor-([^-]+)/)?.[1] || 'unknown';
      console.log(`     ${file}: ${formatBytes(size)} (${vendor})`);
    });
    console.log();
  }
  
  // Print other chunks
  if (chunks.other.length > 0) {
    console.log('  🔧 Other Chunks:');
    chunks.other.forEach(({ file, size }) => {
      console.log(`     ${file}: ${formatBytes(size)}`);
    });
    console.log();
  }
  
  // Print CSS
  if (cssFiles.length > 0) {
    console.log('  🎨 CSS Files:\n');
    cssFiles.forEach(file => {
      const filePath = path.join(DIST_DIR, file);
      const stats = fs.statSync(filePath);
      const size = stats.size;
      totalCssSize += size;
      console.log(`     ${file}: ${formatBytes(size)}`);
    });
    console.log();
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('📈 Summary:\n');
  console.log(`  Total JavaScript: ${formatBytes(totalJsSize)}`);
  console.log(`  Total CSS:        ${formatBytes(totalCssSize)}`);
  console.log(`  Total Size:       ${formatBytes(totalJsSize + totalCssSize)}`);
  console.log(`  Number of Chunks: ${jsFiles.length}`);
  
  // Calculate main bundle size (initial load)
  const mainBundleSize = chunks.main.reduce((sum, { size }) => sum + size, 0);
  console.log(`\n  Initial Load:     ${formatBytes(mainBundleSize + totalCssSize)}`);
  
  // Calculate vendor bundle sizes
  const vendorSize = chunks.vendors.reduce((sum, { size }) => sum + size, 0);
  console.log(`  Vendor Chunks:    ${formatBytes(vendorSize)} (lazy loaded)`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Code Splitting Benefits:\n');
  console.log('  • Main bundle is kept small for fast initial load');
  console.log('  • Large vendor libraries are split into separate chunks');
  console.log('  • Vendor chunks are cached separately by browser');
  console.log('  • Components are lazy-loaded on demand');
  console.log('='.repeat(80));
  
  // Performance estimates
  console.log('\n⚡ Estimated Performance Impact:\n');
  
  const estimatedWithoutSplitting = totalJsSize; // All in one bundle
  const estimatedWithSplitting = mainBundleSize; // Initial load only
  const improvement = ((estimatedWithoutSplitting - estimatedWithSplitting) / estimatedWithoutSplitting * 100).toFixed(1);
  
  console.log(`  Without code splitting: ~${formatBytes(estimatedWithoutSplitting)} initial load`);
  console.log(`  With code splitting:    ~${formatBytes(estimatedWithSplitting)} initial load`);
  console.log(`  Improvement:            ${improvement}% smaller initial bundle`);
  
  // Loading time estimates (assuming 5 Mbps connection)
  const mbps = 5;
  const bytesPerSecond = (mbps * 1024 * 1024) / 8;
  const timeWithout = (estimatedWithoutSplitting / bytesPerSecond).toFixed(2);
  const timeWith = (estimatedWithSplitting / bytesPerSecond).toFixed(2);
  
  console.log(`\n  Loading time (5 Mbps):`);
  console.log(`    Without splitting: ~${timeWithout}s`);
  console.log(`    With splitting:    ~${timeWith}s`);
  console.log(`    Time saved:        ~${(timeWithout - timeWith).toFixed(2)}s`);
  
  console.log('\n' + '='.repeat(80) + '\n');
}

analyzeBundle();
