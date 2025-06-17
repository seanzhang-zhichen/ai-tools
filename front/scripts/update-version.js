/**
 * 版本同步脚本 - 将config.js中的版本号同步到manifest.json
 * 可在构建或发布前运行此脚本，确保版本一致性
 */

const fs = require('fs');
const path = require('path');

// 项目根目录路径
const rootDir = path.resolve(__dirname, '..');

// 读取配置文件
function readConfigVersion() {
  try {
    // 读取config.js文件内容
    const configPath = path.join(rootDir, 'utils', 'config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // 使用正则表达式匹配版本号
    // 在配置文件中查找类似 version: '1.0.0' 的模式
    const versionMatch = configContent.match(/version:\s*['"]([^'"]+)['"]/);
    
    if (versionMatch && versionMatch[1]) {
      return versionMatch[1];
    } else {
      console.error('无法在config.js中找到版本号');
      return null;
    }
  } catch (error) {
    console.error('读取config.js文件失败:', error);
    return null;
  }
}

// 更新manifest.json中的版本号
function updateManifestVersion(version) {
  if (!version) return false;
  
  try {
    // 读取manifest.json文件
    const manifestPath = path.join(rootDir, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // 更新版本信息
    manifest.versionName = version;
    
    // 将版本号转换为无点数字格式 (例如: 1.0.0 -> 100)
    const versionCode = version.replace(/\./g, '');
    manifest.versionCode = versionCode;
    
    // 写回文件
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4), 'utf8');
    
    console.log(`成功更新manifest.json版本号为: ${version} (versionCode: ${versionCode})`);
    return true;
  } catch (error) {
    console.error('更新manifest.json失败:', error);
    return false;
  }
}

// 执行主函数
function main() {
  console.log('开始同步版本号...');
  
  // 1. 读取config.js中的版本号
  const configVersion = readConfigVersion();
  
  if (configVersion) {
    console.log(`从config.js中读取的版本号: ${configVersion}`);
    
    // 2. 更新manifest.json中的版本号
    const updated = updateManifestVersion(configVersion);
    
    if (updated) {
      console.log('版本号同步完成!');
    } else {
      console.log('版本号同步失败!');
      process.exit(1);
    }
  } else {
    console.log('无法获取版本号，终止同步');
    process.exit(1);
  }
}

// 执行主函数
main(); 