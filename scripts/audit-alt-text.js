#!/usr/bin/env node

/**
 * Image Alt Text Auditor
 * Scans all image tags in the codebase and checks for missing alt attributes
 */

const fs = require('fs')
const path = require('path')

const results = {
  totalImages: 0,
  imagesWithAlt: 0,
  imagesMissingAlt: [],
  imagesWithEmptyAlt: []
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  
  // Match <img tags
  const imgRegex = /<img[^>]*>/gi
  const matches = content.match(imgRegex) || []
  
  matches.forEach(imgTag => {
    results.totalImages++
    
    // Check for alt attribute
    const altRegex = /alt=["']([^"']*)["']/i
    const altMatch = imgTag.match(altRegex)
    
    if (!altMatch) {
      results.imagesMissingAlt.push({
        file: filePath,
        tag: imgTag
      })
    } else if (altMatch[1].trim() === '') {
      results.imagesWithEmptyAlt.push({
        file: filePath,
        tag: imgTag
      })
    } else {
      results.imagesWithAlt++
    }
  })
  
  // Match Next.js Image components
  const nextImageRegex = /<Image[^/>]*(?:\/>|>[\s\S]*?<\/Image>)/gi
  const nextMatches = content.match(nextImageRegex) || []
  
  nextMatches.forEach(imgTag => {
    results.totalImages++
    
    const altRegex = /alt=["']([^"']*)["']/i
    const altMatch = imgTag.match(altRegex)
    
    if (!altMatch) {
      results.imagesMissingAlt.push({
        file: filePath,
        tag: imgTag.substring(0, 100) + '...'
      })
    } else if (altMatch[1].trim() === '') {
      results.imagesWithEmptyAlt.push({
        file: filePath,
        tag: imgTag.substring(0, 100) + '...'
      })
    } else {
      results.imagesWithAlt++
    }
  })
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath)
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      scanFile(filePath)
    }
  })
}

// Run the audit
console.log('🔍 Scanning for images without alt text...\n')

const srcDir = path.join(process.cwd(), 'src')
if (fs.existsSync(srcDir)) {
  scanDirectory(srcDir)
}

// Print results
console.log('📊 Alt Text Audit Results\n')
console.log('━'.repeat(50))
console.log(`Total images found: ${results.totalImages}`)
console.log(`Images with alt text: ${results.imagesWithAlt}`)
console.log(`Images missing alt: ${results.imagesMissingAlt.length}`)
console.log(`Images with empty alt: ${results.imagesWithEmptyAlt.length}`)
console.log('━'.repeat(50))

if (results.imagesMissingAlt.length > 0) {
  console.log('\n❌ Images missing alt attribute:\n')
  results.imagesMissingAlt.forEach(({ file, tag }, index) => {
    console.log(`${index + 1}. ${file}`)
    console.log(`   ${tag.substring(0, 80)}...`)
    console.log('')
  })
}

if (results.imagesWithEmptyAlt.length > 0) {
  console.log('\n⚠️  Images with empty alt attribute:\n')
  results.imagesWithEmptyAlt.forEach(({ file, tag }, index) => {
    console.log(`${index + 1}. ${file}`)
    console.log(`   ${tag.substring(0, 80)}...`)
    console.log('')
  })
}

const score = results.totalImages > 0
  ? Math.round((results.imagesWithAlt / results.totalImages) * 100)
  : 100

console.log(`\n✅ Accessibility Score: ${score}%\n`)

if (score < 100) {
  console.log('💡 Tip: All images should have descriptive alt text for screen readers.')
  console.log('   Use empty alt="" only for decorative images.\n')
  process.exit(1)
} else {
  console.log('🎉 All images have alt text! Great job!\n')
  process.exit(0)
}
