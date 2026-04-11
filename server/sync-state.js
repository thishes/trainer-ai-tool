// server/sync-state.js - MySQL 同步状态共享模块
// 解决原来 index.js 的 syncInProgress 变量无法被其他模块读取的问题
// （原来 system.js 通过读源码文件来检测同步状态，永远读到 false）

let syncInProgress = false;

function isInProgress() {
  return syncInProgress;
}

function setInProgress(value) {
  syncInProgress = Boolean(value);
}

module.exports = { isInProgress, setInProgress };
